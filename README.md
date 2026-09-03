# QAKit

Internal TypeScript QA platform. Small core, consumed by independent teams. Playwright stays native.

## Status

Phase 1 — config and execution context:

- `@qakit/contracts` — types, Zod schemas, error classes
- `@qakit/core` — config, execution/test context, lifecycle/extensions, filesystem artifacts, results
- `reference-consumer` — imports public packages only

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
| `@qakit/core` | Runtime (config, context, lifecycle). Depends on contracts only. |

Later packages (`@qakit/playwright`, `@qakit/api`, `@qakit/cli`) are not in the workspace yet.

Teams must import package names (`@qakit/core`), never `packages/*/src` internals. See [docs/architecture.md](docs/architecture.md). Plan and hours: [docs/plan.xlsx](docs/plan.xlsx). Epics and tasks: [docs/BACKLOG.md](docs/BACKLOG.md).

## Consume

`qakit.config.ts`:

```ts
import { defineConfig } from '@qakit/core';

export default defineConfig({
  project: 'example-project',
  environment: 'development',
});
```

`project` is required and must be lowercase kebab-case.

Load and merge (defaults → file → `QAKIT_PROJECT` / `QAKIT_ENVIRONMENT` / `QAKIT_LOG_LEVEL` → runtime overrides):

```ts
import { loadConfig, resolveConfig } from '@qakit/core';

const fromFile = await loadConfig();
const fromObject = resolveConfig({
  file: { project: 'example-project' },
  overrides: { environment: 'staging' },
});
```

Invalid config throws `ConfigurationError` with a stable `code` (`INVALID_PROJECT`, `INVALID_BASE_URL`, `CONFIG_FILE_NOT_FOUND`, …).

## Layout

```
packages/contracts/   # public contract
packages/core/        # runtime
reference-consumer/   # example consumer
docs/architecture.md  # package boundaries
docs/plan.xlsx        # plan + hours log (Excel)
docs/BACKLOG.md       # epics and tasks
```
