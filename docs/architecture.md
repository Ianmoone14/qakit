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

## Config (runtime will implement)

Precedence, weakest to strongest: framework defaults → `qakit.config.ts` → `QAKIT_PROJECT` / `QAKIT_ENVIRONMENT` / `QAKIT_LOG_LEVEL` → runtime overrides. Validate the merged object.

## TypeScript

`tsconfig.base.json` is strict (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`). `module` / `moduleResolution`: `NodeNext`.
