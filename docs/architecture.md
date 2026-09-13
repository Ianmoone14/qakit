# Architecture

Rules for anyone changing QAKit. A team starting from an empty folder: [team-start.md](team-start.md). Writing a test: [first-test.md](first-test.md). Plan and hours: [plan.xlsx](plan.xlsx).

## Boundaries

| Package | May depend on | Must not contain |
| --- | --- | --- |
| `@qakit/contracts` | Zod | I/O, Playwright, HTTP |
| `@qakit/core` | contracts | Browser APIs, domain clients, `if project X` |
| `@qakit/playwright` | core + Playwright | Action wrappers, POM, project-specific pages |
| `@qakit/api` | core | Domain HTTP clients (SAP, finance, …) |
| `@qakit/cli` | core + adapters | Team test code, domain clients |

Public API is `package.json` `exports` and `src/index.ts`. Deep imports are unsupported.

**Semver:** public API break = major; new optional API = minor; fix = patch. Publishable packages version together via Changesets. Registry: **GitLab npm** (SixSentix), restricted `@qakit` scope. The registry URL is set in CI / `.npmrc`, not hardcoded in package names.

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

`loadConfig` reads `qakit.config.ts` from `cwd` or an explicit `path`. `retry` is stored and not applied yet. `Reporter` exists on the contract and is not invoked yet.

Playwright launch defaults are **not** in this file. They live in `qakit.playwright.json` and are read by `@qakit/playwright`.

## Execution context (runtime in `@qakit/core`)

`createExecutionContext` builds a run from `ResolvedConfig`. Pass `createLogger` / `createLoggerFromConfig` as `logger`. Artifacts use `FileSystemArtifactStore` (`artifacts.outputDir`). `services` is a `MemoryServiceRegistry` (no Playwright types on the context). `createTestContext` adds `TestInfo`. CI: GitLab / GitHub / generic.

## Logging and errors (runtime in `@qakit/core`)

`createLogger` honours `logging.level` and `logging.format` (pretty or json). `child()` copies context (e.g. `executionId`, `testId`) without mutating the parent. `wrapError` returns existing `QakitError`s unchanged and wraps native throws as `ExecutionError` with `cause`.

## Lifecycle (runtime in `@qakit/core`)

`LifecycleManager` runs the six phases. Lower `priority` runs first (default 100). `cleanup` / `testCleanup` run LIFO and always attempt every hook. `critical: true` stops the rest of a `before*` phase. Hook timeout (default 30s) throws `TimeoutError`. `registerExtensions` attaches hooks from `ResolvedConfig.extensions`.

## Artifacts and results (runtime in `@qakit/core`)

`FileSystemArtifactStore` copies files into `artifacts.outputDir` and assigns `id` + `timestamp`. `createTestResult` attaches `store.getByTest` (or an explicit list). `createExecutionSummary` uses vendor-neutral statuses only; `timedOut` tests count as `failed` in `counts` and fail the run unless status is set to `cancelled`.

## Driver (runtime in `@qakit/core`, helpers in adapters)

`runQakitTest` is the only orchestration: one test = one execution, all six lifecycle phases, then `ExecutionSummary`. Core still has no Playwright or HTTP types. Adapters register in the `register` callback.

| Helper | Package | Callback | Vitest wrap |
| --- | --- | --- | --- |
| `runQakitTest` | `@qakit/core` | `ctx` | none |
| `runUiTest` | `@qakit/playwright` | `{ page, api?, ctx }` | none — returns summary |
| `uiTest` | `@qakit/playwright/test` | same | `it()`; throws on failure |
| `runApiTest` | `@qakit/api` | `{ api, ctx }` | none — returns summary |
| `apiTest` | `@qakit/api/test` | same | `it()`; throws on failure |

`uiTest` / `apiTest` import Vitest. `registerPlaywright` / `registerApi` do not — keep using those (or the long consumer examples) when you are not on Vitest.

`api` on `runUiTest` is optional: registered when `@qakit/api` can be imported, unless `api: false`. Do not grow that fixtures object for Appium / DB / mocks — those are another `register` + `ServiceKeys` entry. Future `mobileTest({ driver })` is the same pattern.

`ExecutionSummary` is created after the callback. Print it from the `runUiTest` / `runApiTest` return value, not inside `async ({ page }) => …`. There is no HTML report; `artifacts/` only gets files that adapters save (screenshot/trace on failure, request/response when enabled). `Reporter` is still not invoked automatically — Allure/Xray later attach to `afterTest` / `afterExecution`.

## Playwright (`@qakit/playwright`)

`registerPlaywright` launches Chromium, registers `ServiceKeys.PlaywrightBrowser` / `Context` / `Page`, and closes them in `testCleanup` / `cleanup` (LIFO). Teams use native `page.goto` and locators. Optional `screenshotOnFailure` / `traceOnFailure` write files then `ArtifactStore.save`. Team defaults: `qakit.playwright.json` in the consumer cwd (`headless`, `screenshotOnFailure`, `traceOnFailure`). Explicit `registerPlaywright` / `runUiTest` options override that file. Core never reads it. Browsers are not downloaded on install — run `pnpm --filter @qakit/playwright exec playwright install chromium` (or `pnpm exec playwright install chromium` in the team repo).

## API (`@qakit/api`)

`registerApi` registers a generic `fetch` client on `ServiceKeys.ApiClient`. `request({ method, url, headers, body, timeout })` merges `AuthProvider.getHeaders` (option or `ServiceKeys.Auth`). Relative URLs use `config.baseUrl`. 4xx/5xx → `IntegrationError`; abort → `TimeoutError`; network → `IntegrationError`. Optional `saveArtifacts` writes request/response files through `ArtifactStore`. No SAP/finance clients.

## CLI (`@qakit/cli`)

Binary name is `qakit` (not `qa`). `qakit init <name>` writes a consumer folder. `--playwright` / `--api` choose adapters (neither flag = both). Core is always pinned. Playwright also writes `qakit.playwright.json` (read by `@qakit/playwright`, not core). Sample tests match the chosen adapters. Non-empty directories require `--force`. `qakit version` prints the CLI version plus `@qakit/*` packages resolved from the current project. `qakit upgrade` rewrites only those pins in `package.json` to the running CLI’s platform version (patch/minor by default, `--major` for a major). It does not touch team tests or run install.

## Release (Changesets)

A **changeset** is a small markdown file in `.changeset/`. It is not a package and not a Git commit. It is a ticket that says: “next publish, bump these packages (major / minor / patch) and write this changelog line.”

```bash
pnpm changeset              # create a ticket after a user-facing change
pnpm version-packages       # consume tickets: bump package.json versions, write CHANGELOG, delete the tickets
```

Then the GitLab **publish** job runs `changeset publish` to the SixSentix GitLab npm registry. Teams install `"@qakit/core": "x.y.z"` with `.npmrc` from `.npmrc.example`.

Packages in `fixed` version together: one minor ticket bumps contracts, core, playwright, api, and cli to the same number. Until you run `version-packages`, `package.json` stays `0.1.0` even if the driver is already in git.

## Reference consumer

`reference-consumer` is the stand-in team: `qakit.config.ts` + `runExample` import `@qakit/core`. It loads config, runs hooks, writes a log and an artifact, and can fail with `CHECKOUT_FAILED`.

Two UI/API styles are kept on purpose:

- No driver: `runPlaywrightExample` / `runApiExample` — full `loadConfig` + `LifecycleManager` + `ServiceKeys`.
- Driver: `runUiTestExample` / `runApiTestExample` / `runUiApiTestExample` — same run via `runUiTest` / `runApiTest`.

## TypeScript

`tsconfig.base.json` is strict (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`). `module` / `moduleResolution`: `NodeNext`.
