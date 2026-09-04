# QAKit

Internal TypeScript QA platform. Small core, consumed by independent teams. Playwright stays native.

## Status

Phase 1 is complete. CLI init, version, upgrade, and the publish pipeline are in place. Next: first-team pilot.

- `@qakit/contracts` — types, Zod schemas, error classes
- `@qakit/core` — config, context, lifecycle, logging, artifacts, results
- `@qakit/playwright` — native Playwright on the service registry (no action wrappers)
- `@qakit/api` — generic HTTP client on the service registry (no domain clients)
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

A team repo looks like `reference-consumer/`: `qakit.config.ts`, tests that import `@qakit/core` (and `@qakit/playwright` / `@qakit/api` as needed).

`qakit.config.ts`:

```ts
import { defineConfig } from '@qakit/core';

export default defineConfig({
  project: 'example-project',
  environment: 'development',
});
```

`project` is required and must be lowercase kebab-case.

A run without a browser:

```ts
import {
  loadConfig,
  createLoggerFromConfig,
  FileSystemArtifactStore,
  createExecutionContext,
  createTestContext,
  LifecycleManager,
  createTestResult,
  createExecutionSummary,
} from '@qakit/core';

const config = await loadConfig(); // defaults → file → QAKIT_* → overrides
const logger = createLoggerFromConfig(config);
const store = new FileSystemArtifactStore({ outputDir: config.artifacts.outputDir });
const execution = createExecutionContext({ config, logger, artifacts: store });

const manager = new LifecycleManager();
manager.registerExtensions(config.extensions);

const test = createTestContext(execution, {
  testId: 't1',
  testName: 'example',
  testFile: 'example.test.ts',
});

await manager.runBeforeTest(test);
const result = createTestResult({ ctx: test, status: 'passed', duration: 1, store });
const summary = createExecutionSummary({ ctx: execution, results: [result] });
```

Invalid config throws `ConfigurationError` with a stable `code`. Native throws become `ExecutionError` via `wrapError`; existing `QakitError`s pass through.

UI (native Playwright — no wrappers):

```ts
import { ServiceKeys } from '@qakit/core';
import { registerPlaywright, type Page } from '@qakit/playwright';

registerPlaywright(manager, { headless: true, screenshotOnFailure: true });
await manager.runBeforeExecution(execution);
await manager.runBeforeTest(test);
const page = test.services.get<Page>(ServiceKeys.PlaywrightPage);
await page.goto('about:blank');
```

HTTP (generic client — no domain wrappers):

```ts
import { ServiceKeys } from '@qakit/core';
import { registerApi, type ApiClient } from '@qakit/api';

registerApi(manager, { saveArtifacts: true });
await manager.runBeforeTest(test);
const client = test.services.get<ApiClient>(ServiceKeys.ApiClient);
const response = await client.request({ method: 'GET', url: '/health' });
```

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
