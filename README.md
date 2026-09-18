# QAKit

Internal TypeScript QA platform. Teams **install** `@qakit/*` from the GitLab npm registry. Do not fork this repo. Do not write product tests here.

Current release: **0.2.0**. Not on public npm.

- **Teams:** [docs/team.md](docs/team.md)
- **Publish:** [docs/deploy.md](docs/deploy.md)

## Overview

QAKit is a small shared engine plus adapters. One test run always goes through the same core: load config → lifecycle hooks → body → results / artifacts → cleanup.

What it has today:

- `uiTest` / `apiTest` (Vitest) and `runUiTest` / `runApiTest` (same run, returns `ExecutionSummary`)
- Native Playwright `page` — locators, `goto`, clicks stay in the team repo
- Generic HTTP client — `api.request({ method, url, body })`; body is a string; 4xx/5xx throw
- Combined UI + API in one `uiTest({ page, api })`
- `qakit init [--playwright] [--api]`, `qakit version`, `qakit upgrade`
- Team Playwright defaults in `qakit.playwright.json` (headless, screenshot/trace on failure)
- File artifacts under `artifacts/` (no HTML report)
- GitLab npm publish

What it does not have: `qakit.click`, a shared POM, Appium, Allure/Xray, video, HTML dashboard. `retry` is stored in config and unused.

## Packages

All five publishable packages version together.

### `@qakit/contracts`

Shared types only. No Node I/O, no Playwright, no HTTP.

- Config schema (`qakit.config.ts` shape, kebab-case project names)
- `ExecutionContext` / `TestContext`, lifecycle phases, `ServiceKeys`
- `ExecutionSummary` / `TestResult`, artifact types
- Error classes (`QakitError`, `ConfigurationError`, `IntegrationError`, `TimeoutError`, …)
- `Logger`, `Extension`, `AuthProvider`, `Reporter` (reporter is not invoked yet)

### `@qakit/core`

Runtime. Depends on contracts only. Does not import Playwright or fetch.

- `defineConfig` / `loadConfig` (file → env → overrides)
- `runQakitTest` — six phases: `beforeExecution` → `beforeTest` → run → `afterTest` → `testCleanup` → `afterExecution` / `cleanup`
- `LifecycleManager`, logger, `FileSystemArtifactStore`
- `createExecutionSummary` / `createTestResult`

### `@qakit/playwright`

Chromium + native Playwright. No action wrappers, no page-object library.

- `registerPlaywright` — browser / context / page on `ServiceKeys`, closed LIFO
- `runUiTest` / `uiTest` — fixtures `{ page, api?, ctx }`
- `qakit.playwright.json` — team defaults; test options override the file
- `isChromiumInstalled` — UI smoke tests skip if the browser binary is missing

Browsers are not downloaded on `pnpm install`. Install Chromium separately.

### `@qakit/api`

Generic HTTP. No SAP/finance/domain clients.

- `registerApi` — client on `ServiceKeys.ApiClient`
- `runApiTest` / `apiTest` — fixtures `{ api, ctx }`
- Relative URLs use `baseUrl` from config
- Optional `AuthProvider` headers
- Optional request/response files via `saveArtifacts`

### `@qakit/cli`

Binary: `qakit`.

- `qakit init <name> [--playwright] [--api] [--force]` — scaffolds a consumer (core always pinned)
- `qakit version` — CLI + installed `@qakit/*` versions
- `qakit upgrade` — rewrites `@qakit/*` pins in `package.json` only (not tests)

## This repo

Node 20+, pnpm 9. `reference-consumer` is an example team import, not a product suite.

```bash
pnpm install
pnpm --filter @qakit/playwright exec playwright install chromium
pnpm test
pnpm typecheck
```
