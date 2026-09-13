# QAKit

Internal TypeScript QA platform. Small core, consumed by independent teams. Playwright stays native.

## Status

Phase 1–2 are complete, including the test driver (`runQakitTest` / `uiTest` / `apiTest`). Next: first-team pilot.

- `@qakit/contracts` — types, Zod schemas, error classes
- `@qakit/core` — config, context, lifecycle, logging, artifacts, results, `runQakitTest`
- `@qakit/playwright` — native Playwright + `runUiTest` / `uiTest` (no action wrappers)
- `@qakit/api` — generic HTTP client + `runApiTest` / `apiTest` (no domain clients)
- `@qakit/cli` — `qakit init`, `qakit version`, `qakit upgrade`
- `reference-consumer` — example team project (public imports only)

```bash
pnpm install
pnpm build
pnpm test
pnpm typecheck
```

Requires Node 20+ and [pnpm](https://pnpm.io) 9 (`corepack enable` or a local pnpm).

## Packages

| Package | Role |
| --- | --- |
| `@qakit/contracts` | Shared types, config schema, errors. No I/O. |
| `@qakit/core` | Runtime. Depends on contracts only. No Playwright. |
| `@qakit/playwright` | Chromium + native `page`. No `qakit.click` / POM. |
| `@qakit/api` | Generic HTTP `request`. No SAP/finance clients. |
| `@qakit/cli` | `qakit init` / `qakit version` / `qakit upgrade`. |

UI tests need a Chromium binary once per machine:

```bash
pnpm --filter @qakit/playwright exec playwright install chromium
```

Teams must import package names (`@qakit/core`), never `packages/*/src` internals. See [docs/architecture.md](docs/architecture.md). Plan and hours: [docs/plan.xlsx](docs/plan.xlsx). Epics and tasks: [docs/BACKLOG.md](docs/BACKLOG.md).

## Consume

A team repo looks like `reference-consumer/`: `qakit.config.ts`, tests that import `@qakit/playwright/test` or `@qakit/api/test` (or the long lifecycle if you need it).

`qakit.config.ts`:

```ts
import { defineConfig } from '@qakit/core';

export default defineConfig({
  project: 'example-project',
  environment: 'development',
});
```

`project` is required and must be lowercase kebab-case.

### Tests (driver)

Vitest wrap — no `ExecutionSummary` in the callback:

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

Print the summary — use `runUiTest` / `runApiTest` (same run, no Vitest wrap):

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

There is no HTML report. Failed UI runs can write screenshot/trace into `artifacts/` when those options are on. Request/response files need `saveArtifacts: true`.

Full lifecycle without the driver is still valid: `reference-consumer/src/run-playwright-example.ts` and `run-api-example.ts`.

Invalid config throws `ConfigurationError` with a stable `code`. Native throws become `ExecutionError` via `wrapError`; existing `QakitError`s pass through.

Scaffold a new team repo:

```bash
pnpm --filter @qakit/cli exec qakit init checkout-api
cd checkout-api
pnpm install
qakit version
qakit upgrade
pnpm install
```

## Install from the registry

Packages publish to the **SixSentix GitLab npm registry**, not public npm. Copy `.npmrc.example` into the team repo as `.npmrc`, point `@qakit` at the GitLab group/project registry, and set `GITLAB_TOKEN`. Then pin versions:

```json
{
  "dependencies": {
    "@qakit/core": "0.1.0",
    "@qakit/playwright": "0.1.0",
    "@qakit/api": "0.1.0",
    "@qakit/cli": "0.1.0"
  }
}
```

Package names stay `@qakit/*` (the GitLab group is sixsentix; that does not need to match the npm scope).

Platform versions move together. Semver: public API break = major; new optional API = minor; fix = patch.

```bash
pnpm changeset
pnpm version-packages
```

Then run the GitLab **publish** job on the default branch.

## Layout

```
packages/contracts/   # public contract
packages/core/        # runtime
packages/playwright/  # native Playwright extension
packages/api/         # generic HTTP client
packages/cli/         # qakit init / version / upgrade
reference-consumer/   # example consumer
.changeset/           # versioning
.gitlab-ci.yml        # test + publish
.github/workflows/    # CI while the repo is still on GitHub
docs/architecture.md  # package boundaries
docs/plan.xlsx        # plan + hours log (Excel)
docs/BACKLOG.md       # epics and tasks
```
