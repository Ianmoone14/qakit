# QAKit

Internal QA automation platform for independent teams. Core stays small and generic. Projects own domain logic.

## Packages

| Package | Role |
| --- | --- |
| `@qakit/contracts` | Types, Zod schemas, error classes |
| `@qakit/core` | Config, execution context, lifecycle, logging, artifacts |
| `@qakit/playwright` | Thin Playwright session + artifact hooks |
| `@qakit/api` | Generic HTTP client with auth and logging |
| `@qakit/cli` | `qakit init` and `qakit version` |

## Consume

```ts
import { defineConfig } from '@qakit/core';
import { playwrightExtension } from '@qakit/playwright';
import { apiExtension } from '@qakit/api';

export default defineConfig({
  project: 'example-project',
  environment: 'development',
  baseUrl: 'https://example.com',
  extensions: [
    playwrightExtension({ headless: true }),
    apiExtension({ timeout: 30_000 }),
  ],
});
```

See `reference-consumer/` for a project that depends on these packages the same way a team would.

## Config precedence

1. Framework defaults
2. `qakit.config.ts`
3. `QAKIT_PROJECT`, `QAKIT_ENVIRONMENT`, `QAKIT_LOG_LEVEL`
4. Runtime overrides

## Scripts

```bash
pnpm install
pnpm build
pnpm test
pnpm typecheck
```

Requires Node.js 20+ and pnpm 9.

## Versioning

Use Changesets. Teams upgrade independently. `qakit upgrade` is not in this foundation.
