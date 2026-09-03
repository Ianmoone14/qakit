# Architecture

Rules for anyone changing QAKit. Plan and hours: [plan.xlsx](plan.xlsx).

## Boundaries

| Package | May depend on | Must not contain |
| --- | --- | --- |
| `@qakit/contracts` | Zod | I/O, Playwright, HTTP |
| `@qakit/core` | contracts | Browser APIs, domain clients, `if project X` |

Public API is `package.json` `exports` and `src/index.ts`. Deep imports are unsupported.

## Contracts (`@qakit/contracts`)

- **Config:** `qakitConfigSchema`, `QakitConfig`, `ResolvedConfig`, `DEFAULT_CONFIG`. Project names: lowercase kebab-case.
- **Run:** `ExecutionContext`, `TestContext`, `CIContext`, `FrameworkVersion`.
- **Lifecycle:** six phases (`beforeExecution` … `testCleanup`), `LifecycleHookOptions` (priority, critical, timeout).
- **Extensions:** `Extension`, `AuthProvider`, `Reporter`.
- **Resources:** `ServiceRegistry` + `ServiceKeys` — adapters attach page/auth/client here so core has no Playwright types.
- **Logging:** `Logger` interface (implementation in core).
- **Errors:** `QakitError` with `code` and optional `cause`; subclasses for configuration, framework, execution, integration, timeout.
- **Artifacts:** `Artifact`, `ArtifactStore`. Types include screenshot, trace, request, custom, …
- **Results:** `TestResult` / `ExecutionSummary` — vendor-neutral statuses only.

## Config (runtime in `@qakit/core`)

Public API: `defineConfig`, `loadConfig`, `resolveConfig`, `validateConfig`.

Precedence, weakest to strongest: framework defaults → `qakit.config.ts` → `QAKIT_PROJECT` / `QAKIT_ENVIRONMENT` / `QAKIT_LOG_LEVEL` → runtime overrides. Validate the merged object (`ConfigurationError` with a stable `code`).

`loadConfig` reads `qakit.config.ts` from `cwd` or an explicit `path`.

## Execution context (runtime in `@qakit/core`)

`createExecutionContext` builds a run from `ResolvedConfig`. Logger is injected (implementation in 1.6). Artifacts use `FileSystemArtifactStore` (`artifacts.outputDir`). `services` is a `MemoryServiceRegistry` (no Playwright types on the context). `createTestContext` adds `TestInfo`. CI: GitLab / GitHub / generic.

## Lifecycle (runtime in `@qakit/core`)

`LifecycleManager` runs the six phases. Lower `priority` runs first (default 100). `cleanup` / `testCleanup` run LIFO and always attempt every hook. `critical: true` stops the rest of a `before*` phase. Hook timeout (default 30s) throws `TimeoutError`. `registerExtensions` attaches hooks from `ResolvedConfig.extensions`.

## Artifacts and results (runtime in `@qakit/core`)

`FileSystemArtifactStore` copies files into `artifacts.outputDir` and assigns `id` + `timestamp`. `createTestResult` attaches `store.getByTest` (or an explicit list). `createExecutionSummary` uses vendor-neutral statuses only; `timedOut` tests count as `failed` in `counts` and fail the run unless status is set to `cancelled`.

## TypeScript

`tsconfig.base.json` is strict (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`). `module` / `moduleResolution`: `NodeNext`.
