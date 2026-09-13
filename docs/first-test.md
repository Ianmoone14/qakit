# First test

Empty folder → install → `pnpm test`: [team-start.md](team-start.md). This page is the test itself. Platform internals: [architecture.md](architecture.md).

There is no HTML report. `retry` in config is stored and not used yet.

## 1. New project (outside this repo)

Install `@qakit/cli` from the SixSentix GitLab npm registry (`.npmrc` from [`.npmrc.example`](../.npmrc.example), `GITLAB_TOKEN`). Pin **0.2.0+** (driver + init flags). `0.1.0` on the registry does not have `uiTest`. Until 0.2.0 is published (`pnpm version-packages` + GitLab publish), use this monorepo only as the platform, not as the team repo.

```bash
pnpm exec qakit init checkout-web --playwright --api
cd checkout-web
pnpm install
pnpm exec playwright install chromium
```

No adapter flags = both Playwright and API (same as `--playwright --api`). `--playwright` or `--api` alone installs only that adapter. Appium is not available yet.

`qakit init` always writes `qakit.config.ts` and a config smoke test. Playwright also writes `qakit.playwright.json` and `src/ui.example.test.ts`. API writes `src/api.example.test.ts`.

## 2. Config

`project` is required (lowercase kebab-case). Set `baseUrl` to the app or API you are testing. Relative `api.request({ url: '/health' })` uses that origin.

```ts
import { defineConfig } from '@qakit/core';

export default defineConfig({
  project: 'checkout-web',
  environment: 'development',
  baseUrl: 'https://example.com',
});
```

Artifact files go under `artifacts/` (or `artifacts.outputDir` if you change it). Playwright launch defaults live in `qakit.playwright.json` (not in `qakit.config.ts`). `uiTest(..., { headless: false })` overrides that file.

## 3. Write a test

`page` is native Playwright. `api.request` is a generic HTTP call (body is a string). No `qakit.click`, no POM in QAKit.

```ts
import { uiTest } from '@qakit/playwright/test';
import { apiTest } from '@qakit/api/test';

uiTest('home loads', async ({ page }) => {
  await page.goto('https://example.com');
});

apiTest('health', async ({ api }) => {
  const response = await api.request({ method: 'GET', url: '/health' });
});

uiTest('checkout after seed', async ({ page, api }) => {
  await api?.request({ method: 'POST', url: '/setup', body: '{"cart":"demo"}' });
  await page.goto('https://example.com/checkout');
});
```

The generated UI example is skipped if Chromium is not installed.

```bash
pnpm test
```

Green/red is the Vitest terminal. That is the report.

## 4. Files after a failure (`artifacts/`)

Nothing is written on a pass unless you turn request saving on.

UI screenshot / Playwright trace — only on failure, only if enabled in `qakit.playwright.json` or on the test:

```ts
uiTest('home loads', async ({ page }) => {
  await page.goto('https://example.com');
}, { screenshotOnFailure: true, traceOnFailure: true });
```

API request/response files:

```ts
apiTest('health', async ({ api }) => {
  await api.request({ method: 'GET', url: '/health' });
}, { saveArtifacts: true });
```

Open `artifacts/<executionId>/`.

## 5. Print `ExecutionSummary`

The object is created **after** `async ({ page }) => { … }`. `uiTest` / `apiTest` do not return it (they wrap Vitest `it()`). Use `runUiTest` / `runApiTest`:

```ts
import { it, expect } from 'vitest';
import { runUiTest } from '@qakit/playwright';

it('home loads', async () => {
  const summary = await runUiTest('home loads', async ({ page }) => {
    await page.goto('https://example.com');
  });
  console.log(JSON.stringify(summary, null, 2));
  expect(summary.status).toBe('passed');
});
```

`summary.status`, `summary.results[0].error`, and artifact paths are the JSON dump. Same run as `uiTest`.

## If you need the wiring without the driver

`reference-consumer/src/run-playwright-example.ts` and `run-api-example.ts` show `loadConfig` + `LifecycleManager` + `ServiceKeys` by hand. New tests should use the helpers above.
