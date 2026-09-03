# QAKit

Internal TypeScript QA platform. Small core, consumed by independent teams. Playwright stays native.

## Status

Phase 1 runtime is in place (config through results). Next: thin Playwright, then thin API.

- `@qakit/contracts` — types, Zod schemas, error classes
- `@qakit/core` — config, context, lifecycle, logging, artifacts, results
- `reference-consumer` — example team project (public imports only, no UI)

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

Later packages (`@qakit/playwright`, `@qakit/api`, `@qakit/cli`) are not in the workspace yet.

Teams must import package names (`@qakit/core`), never `packages/*/src` internals. See [docs/architecture.md](docs/architecture.md). Plan and hours: [docs/plan.xlsx](docs/plan.xlsx). Epics and tasks: [docs/BACKLOG.md](docs/BACKLOG.md).

## Consume (core today — no browser yet)

A team repo looks like `reference-consumer/`: `qakit.config.ts`, tests that import `@qakit/core` only.

`qakit.config.ts`:

```ts
import { defineConfig } from '@qakit/core';

export default defineConfig({
  project: 'example-project',
  environment: 'development',
});
```

`project` is required and must be lowercase kebab-case.

A run (still no Playwright — UI is epic 1.9):

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

## Layout

```
packages/contracts/   # public contract
packages/core/        # runtime
reference-consumer/   # example consumer
docs/architecture.md  # package boundaries
docs/plan.xlsx        # plan + hours log (Excel)
docs/BACKLOG.md       # epics and tasks
```
