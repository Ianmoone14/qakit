# QAKit — team guide

Do not clone this repository. Create **your** project and install packages from GitLab npm.

You need Node 20+, pnpm (`corepack enable`), and a GitLab token with `read_api` + `read_registry`.

There is no HTML report. Appium is not available. `retry` in config is stored and unused.

## 1. Registry

In an empty folder, create `.npmrc` with exactly three lines. Line 2 **starts with** `//` — no `https://`. Paste the token. Do not commit it.

```
@qakit:registry=https://gitlab.sixsentix.com/api/v4/projects/420/packages/npm/
//gitlab.sixsentix.com/api/v4/projects/420/packages/npm/:_authToken=glpat-XXXX
always-auth=true
```

Check from the folder that contains `.npmrc`:

```bash
pnpm view @qakit/cli version
```

Expect `0.2.0` or newer. `401` = bad token. `https://https//` = extra `https` on line 2. `registry.npmjs.org/@qakit` = you are not in the folder with `.npmrc`.

## 2. Init

Do **not** use `pnpm dlx @qakit/cli` — `dlx` ignores the folder `.npmrc` and hits public npm.

```bash
pnpm add -D @qakit/cli
pnpm exec qakit init checkout-web --playwright --api
cd checkout-web
cp ../.npmrc .
pnpm install
pnpm dlx playwright install chromium
```

Windows PowerShell: `Copy-Item ..\.npmrc .` instead of `cp`.

No flags = Playwright + API. `--api` only = no browser. Project name must be kebab-case.

`pnpm exec qakit` inside `checkout-web` does not exist — the generated project does not depend on the CLI. `pnpm exec playwright` also does not exist — install Chromium with `dlx`.

Init does **not** create `pages/` or `tests/`. Smoke tests are in `src/`. Chromium is not downloaded by `pnpm install`.

## 3. Folder layout

In `checkout-web` add `pages/` (page objects) and `tests/` (tests). Update:

`vitest.config.ts`:

```ts
include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
```

`tsconfig.json`:

```json
"include": ["src/**/*.ts", "pages/**/*.ts", "tests/**/*.ts", "qakit.config.ts"]
```

## 4. Config

`qakit.config.ts`:

```ts
import { defineConfig } from '@qakit/core';

export default defineConfig({
  project: 'checkout-web',
  environment: 'development',
  baseUrl: 'https://example.com',
});
```

Playwright defaults live in `qakit.playwright.json` (`headless`, `screenshotOnFailure`, `traceOnFailure`), not in this file.

## 5. Tests

`page` is Playwright. `api.request` is HTTP. Body is a **string**. 4xx/5xx throw `IntegrationError`. There is no `qakit.click`. Page objects stay in your repo.

```ts
import type { Page } from '@qakit/playwright';

export class HomePage {
  constructor(private readonly page: Page) {}
  async open(): Promise<void> {
    await this.page.goto('https://example.com');
  }
}
```

```ts
import { expect } from 'vitest';
import { uiTest } from '@qakit/playwright/test';
import { apiTest } from '@qakit/api/test';
import { HomePage } from '../pages/home.js';

uiTest('home loads', async ({ page }) => {
  const home = new HomePage(page);
  await home.open();
  expect(page.url()).toContain('example.com');
});

apiTest('health', async ({ api }) => {
  const response = await api.request({ method: 'GET', url: '/health' });
  expect(response.status).toBe(200);
});

uiTest('after setup', async ({ page, api }) => {
  if (api === undefined) {
    throw new Error('@qakit/api must be installed');
  }
  await api.request({
    method: 'POST',
    url: '/setup',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cart: 'demo' }),
  });
  await new HomePage(page).open();
});
```

```bash
pnpm test
```

The terminal is the report.

## 6. After a failure

Passes write nothing unless you enable API `saveArtifacts`.

- UI screenshot / trace: `qakit.playwright.json` or an option on `uiTest`
- Folder: `artifacts/`

`uiTest` / `apiTest` do not return the summary. For JSON, call `runUiTest` / `runApiTest` and log **after** the callback.

## 7. Upgrade and CI

New platform version: in the folder that has the CLI, `pnpm exec qakit upgrade`, then `pnpm install` in the project. That rewrites `@qakit/*` pins only.

Team CI: check out **your** repo → `pnpm install` (`.npmrc` + token) → `pnpm dlx playwright install chromium` if you have UI tests → `pnpm test`. Do not clone QAKit.

## Do not

- Put product tests in `packages/` or `reference-consumer/`
- Add `driver` / `db` onto `{ page, api }`
- Expect Allure / Xray / video in 0.2.0
