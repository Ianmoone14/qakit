# Team start — empty folder to a green run

This is the path for a **team repo**, not a clone of QAKit. You install `@qakit/*` packages. You do not fork the framework.

How a test is written (native `page`, generic `api.request`, artifacts, JSON summary): [first-test.md](first-test.md). Why the packages are split: [architecture.md](architecture.md).

There is no HTML report. `retry` in config is stored and unused. Appium is not available yet.

## 0. Can you install yet?

Published GitLab pins are still **0.1.0**. That release does **not** have `uiTest` / `apiTest` or `qakit init --playwright`. Those land in **0.2.0** after Changesets + the GitLab publish job.

Until 0.2.0 is on the registry, do not start a team project from npm. Use this guide when `pnpm view @qakit/cli version --registry <gitlab>` shows `0.2.0` or higher (or your platform contact says it is published).

## 1. Machine

- Node 20+
- [pnpm](https://pnpm.io) 9 (`corepack enable` or a local install)
- A GitLab token that can **read** the SixSentix npm package registry (`read_api` / `read_package_registry`, or a Deploy Token with `read_package_registry`)

QAKit is **not** on public npm. Do not run `npm i @qakit/cli` without a GitLab `.npmrc`.

## 2. Point npm at GitLab

In the folder that will become the team repo (or in your user npm config), copy [`.npmrc.example`](../.npmrc.example) to `.npmrc`.

Replace the host / group id with the SixSentix registry URL your platform contact gives you. Group-level is preferred:

```
@qakit:registry=https://HOST/api/v4/groups/<GROUP_ID>/-/packages/npm/
//HOST/api/v4/groups/<GROUP_ID>/-/packages/npm/:_authToken=${GITLAB_TOKEN}
```

Export the token in the same shell (do not commit the token):

```bash
# Windows PowerShell
$env:GITLAB_TOKEN = "…"

# macOS / Linux
export GITLAB_TOKEN=…
```

## 3. Create the project

Install the CLI once (global or `pnpm dlx` — either is fine), then init **outside** the QAKit monorepo:

```bash
pnpm add -g @qakit/cli
qakit init checkout-web --playwright --api
cd checkout-web
```

Flags:

| Command | What you get |
| --- | --- |
| `qakit init name` (no flags) | Playwright **and** API (same as both flags) |
| `--playwright` only | Browser tests + `qakit.playwright.json` |
| `--api` only | HTTP tests. No Chromium. |
| `--force` | Overwrite QAKit files in a non-empty directory |

There is no `--appium` flag. Core is always pinned.

Init writes smoke tests (`about:blank`, “is `api.request` a function”, config load). It does **not** invent `pages/` or a POM.

## 4. Install and (if UI) Chromium

```bash
pnpm install
pnpm exec qakit version
```

`qakit version` should print matching `@qakit/*` versions (0.2.0+).

Browsers are **not** downloaded with `pnpm install`. If you chose Playwright:

```bash
pnpm exec playwright install chromium
```

The generated UI example is skipped until Chromium is on the machine.

## 5. Point config at your app

`qakit.config.ts` — `project` is required (lowercase kebab-case). Set `baseUrl` to the app or API you are testing. Relative `api.request({ url: '/health' })` uses that origin.

```ts
import { defineConfig } from '@qakit/core';

export default defineConfig({
  project: 'checkout-web',
  environment: 'development',
  baseUrl: 'https://example.com',
});
```

Playwright launch defaults live in `qakit.playwright.json` (`headless`, `screenshotOnFailure`, `traceOnFailure`). They are **not** in `qakit.config.ts`. A test option such as `uiTest(..., { headless: false })` wins over the file.

## 6. Write a real test

Keep or delete the smoke files. `page` is native Playwright. `api.request` is generic HTTP (body is a string). No `qakit.click`. Page objects stay in **this** repo if you want them.

```ts
import { uiTest } from '@qakit/playwright/test';
import { apiTest } from '@qakit/api/test';

uiTest('home loads', async ({ page }) => {
  await page.goto('https://example.com');
});

apiTest('health', async ({ api }) => {
  await api.request({ method: 'GET', url: '/health' });
});
```

More examples (combined `{ page, api }`, artifacts, printing `ExecutionSummary`): [first-test.md](first-test.md).

## 7. Run

```bash
pnpm test
```

That is `vitest run`. Green/red in the terminal is the report.

Optional:

```bash
pnpm typecheck
```

## 8. After a failure

Nothing is written on a pass unless you turn request saving on.

- UI screenshot / Playwright trace: only on failure, only if enabled in `qakit.playwright.json` or on that test (`screenshotOnFailure`, `traceOnFailure`).
- API request/response JSON: `{ saveArtifacts: true }` on `apiTest`.

Open `artifacts/<executionId>/`. There is no HTML dashboard.

`uiTest` / `apiTest` do not return the JSON summary (they wrap Vitest `it()`). To print or assert it, call `runUiTest` / `runApiTest` and log **after** the callback — see [first-test.md](first-test.md#5-print-executionsummary).

## 9. Day two — your product, not the platform

- Add locators, API paths, tokens, and assertions in this repo.
- Put page objects under `pages/` here if your team uses POM. Do not ask QAKit for a shared login page.
- Commit `.npmrc` **without** a hardcoded token (`${GITLAB_TOKEN}` only).
- When the platform ships a new version: `qakit upgrade`, then `pnpm install`. That rewrites `@qakit/*` pins only. It does not touch your tests.

## 10. CI (thin)

Same commands as local, plus the token as a masked variable:

1. Checkout the **team** repo.
2. `pnpm install` (`.npmrc` + `GITLAB_TOKEN`).
3. `pnpm exec playwright install chromium` if you have UI tests.
4. `pnpm test`.
5. Archive `artifacts/` as a job artifact if you want screenshots after the job.

Do not clone the QAKit monorepo in team CI.

## What you should not do

- Do not `git clone` QAKit and write product tests inside `packages/` or `reference-consumer/`.
- Do not add `driver` / `db` onto `{ page, api }`. A later Appium package is `mobileTest({ driver })`.
- Do not expect Allure, Xray, video, or suite-level browser reuse. Those wait for a named team request.
- Do not copy `registerPlaywright` + `ServiceKeys` wiring into every test. That long form still works; new tests use `uiTest` / `apiTest`.

## If something fails

| Symptom | Likely cause |
| --- | --- |
| Cannot install `@qakit/*` | Missing `.npmrc`, wrong registry URL, or `GITLAB_TOKEN` not in the environment |
| `uiTest` is not exported | You are on registry **0.1.0**. Need 0.2.0+ |
| UI example skipped | Chromium not installed (`pnpm exec playwright install chromium`) |
| API 4xx/5xx | Expected: `@qakit/api` throws `IntegrationError`. Point `baseUrl` at a live origin or assert the status you want |
| Empty `artifacts/` | Passes write nothing. Turn on screenshot/trace/saveArtifacts |

Questions about the platform: the QAKit maintainers. Questions about locators and product URLs: your team.
