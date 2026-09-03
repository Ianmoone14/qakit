# QAKit backlog

Copy into Jira / GitLab / Azure Boards. One epic ≈ one delivery slice. Capacity is **8 hours per week**.

**Status:** 1.0–1.5 done. Next epic: **1.6 Logging and errors**.

Do not start Phase 2 until Phase 1.10 is done. Do not pull Icebox items into the current board.

Suggested Jira fields: Epic name, Description (goal + done when), child Tasks/Stories. Label `qakit`. Mark 1.0–1.2 as **Done** so history exists.

---

## Epic map

| Epic | Phase | Status |
| --- | --- | --- |
| 1.0 Alignment | 1 | Done |
| 1.1 Monorepo | 1 | Done |
| 1.2 Contracts | 1 | Done |
| 1.3 Config | 1 | Done |
| 1.4 Execution and test context | 1 | Done |
| 1.5 Lifecycle, extensions, fixtures | 1 | Done |
| 1.6 Logging and errors | 1 | To do |
| 1.7 Artifacts and results | 1 | To do |
| 1.8 Core tests and reference consumer | 1 | To do |
| 1.9 Thin Playwright | 1 | To do |
| 1.10 Thin API | 1 | To do |
| 2.1 CLI init and version | 2 | Later |
| 2.2 Release and publish | 2 | Later |
| 2.3 Upgrade command | 2 | Later |
| 3.1 First-team pilot | 3 | Later |
| Icebox | — | Not now |

Critical path: 1.2 → 1.3 → 1.4 → 1.5 → (1.6 in parallel with 1.7) → 1.8 → 1.9 → 1.10.

---

## Epic 1.0 — Alignment

**Status:** Done  
**Goal:** Agree what QAKit is, package boundaries, and Phase 1 sequence.  
**Done when:** Architecture notes exist; core must not contain project-specific logic; teams consume packages, not forks.

### Tasks (done)

- [x] Write product rules: small shared core, 30+ teams, no fork, no `if SAP` / `if finance` in core
- [x] Decide packages: `@qakit/contracts`, `@qakit/core`, later playwright / api / cli
- [x] Decide config merge order: defaults → `qakit.config.ts` → `QAKIT_*` env → runtime
- [x] Decide ServiceRegistry instead of `ctx.page` on core
- [x] Decide vendor-neutral results (no Allure/Xray fields in core)
- [x] Publish `docs/architecture.md` in the repo

---

## Epic 1.1 — Monorepo

**Status:** Done  
**Goal:** One repo that builds and tests multiple packages.  
**Done when:** `pnpm install`, `pnpm build`, `pnpm test`, `pnpm typecheck` work from root.

### Tasks (done)

- [x] pnpm workspace + Turborepo + Node 20
- [x] Strict TypeScript base (`NodeNext`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`)
- [x] Package shells: `packages/contracts`, `packages/core`, `reference-consumer`
- [x] Public exports only (`package.json` `exports` + `src/index.ts`)
- [x] Push private GitHub repo

---

## Epic 1.2 — Contracts

**Status:** Done  
**Goal:** Shared types, Zod schemas, and error classes with no I/O.  
**Done when:** `@qakit/contracts` is tested and `@qakit/core` depends on it through the public package name.

### Tasks (done)

- [x] Config schema (kebab-case `project`, optional env/URL/retry/logging/artifacts/extensions)
- [x] Execution / test context types, CI types, framework version types
- [x] Lifecycle types (6 phases, priority, critical, timeout)
- [x] Extension, AuthProvider, Reporter types
- [x] ServiceRegistry + namespaced ServiceKeys
- [x] Logger interface
- [x] `QakitError` and subclasses (configuration, framework, execution, integration, timeout)
- [x] Artifact types + `ArtifactStore` interface
- [x] Vendor-neutral `TestResult` / `ExecutionSummary`
- [x] Tests for config validation, errors, statuses, service keys, package identity (10 tests)
- [x] Core shell re-exports contracts; consumer imports `@qakit/core` only (2 wiring tests)

---

## Epic 1.3 — Config

**Status:** Done  
**Package:** `@qakit/core`  
**Goal:** A team can write `qakit.config.ts` and get a validated resolved config.  
**Done when:** `defineConfig`, `loadConfig`, `resolveConfig`, and `validateConfig` are public on `@qakit/core`, with tests for merge order and `ConfigurationError`.

### Tasks (done)

- [x] **defineConfig** — typed helper; returns the same object; usable as `export default defineConfig({ project: 'checkout-api' })`
- [x] **validateConfig** — run Zod from contracts; throw `ConfigurationError` with a stable code (invalid project, invalid URL, etc.)
- [x] **resolveConfig** — merge: `DEFAULT_CONFIG` → file config → env → runtime overrides; `project` required after merge
- [x] **Env overlay** — `QAKIT_PROJECT`, `QAKIT_ENVIRONMENT`, `QAKIT_LOG_LEVEL` beat the file; runtime/CLI overrides beat env
- [x] **loadConfig** — load `qakit.config.ts` from cwd or given path; missing/invalid file → `ConfigurationError`
- [x] **Public exports** — only these four (plus existing package constants) from `@qakit/core`; no deep imports
- [x] **Tests** — valid minimal config; uppercase project rejected; env overrides file; runtime overrides env; bad URL; missing file
- [x] **README** — show a real `defineConfig` example that matches the implementation

---

## Epic 1.4 — Execution and test context

**Status:** Done  
**Depends on:** 1.3  
**Goal:** One run has a stable identity, resolved config, logger/artifacts slots, CI info, and framework version.  
**Done when:** Core can build `ExecutionContext` and `TestContext` without Playwright types on the context.

### Tasks (done)

- [x] Generate `executionId` (ULID or equivalent, unique per run)
- [x] Build `ExecutionContext` from `ResolvedConfig` (project, environment, startTime, config, services)
- [x] Detect `CIContext` from GitLab/GitHub env; fallback `generic` + raw env map
- [x] Attach `FrameworkVersion` (name, version, package versions) on every run
- [x] Build `TestContext` from execution context + `TestInfo` (testId, name, file, attempt, tags)
- [x] Leave `logger` and `artifacts` as injected dependencies (real implementations in 1.6 / 1.7)
- [x] Tests — id uniqueness; CI detection; test context inherits execution fields; no Playwright types in core

---

## Epic 1.5 — Lifecycle, extensions, fixtures

**Status:** Done  
**Depends on:** 1.4  
**Goal:** Extensions register hooks and services; core runs phases in order; cleanup always runs.  
**Done when:** A sample extension can hook `beforeTest` and `register` a service; core still has no Playwright imports.

### Tasks (done)

- [x] Implement `ServiceRegistry` (`register`, `get`, `tryGet`, `has`)
- [x] Implement `LifecycleManager` for the six phases
- [x] Hook options: priority (lower first), timeout (default 30s), `critical` (failure stops the phase)
- [x] Cleanup / testCleanup always run, LIFO, even after a failure
- [x] Register extensions from resolved config; run their hooks
- [x] Timeout on a hook → `TimeoutError`; critical failure stops `before*`
- [x] Tests — order, priority, LIFO cleanup, non-critical failure continues, critical failure stops, timeout, service get/missing

---

## Epic 1.6 — Logging and errors

**Status:** To do  
**Depends on:** 1.4 (can proceed in parallel with 1.7 after 1.5)  
**Goal:** Real logger on the context; thrown errors become `QakitError` with codes.  
**Done when:** Pretty and JSON logs work; child loggers carry run/test ids; unknown throws are wrapped.

### Tasks

- [ ] Implement `Logger` (debug/info/warn/error, pretty + json)
- [ ] Honour `logging.level` and `logging.format` from resolved config
- [ ] `logger.child` adds executionId / testId without mutating the parent
- [ ] Map native errors to `QakitError` subclasses; keep `cause`
- [ ] Tests — level filtering, json shape, child metadata, wrap vs pass-through of `QakitError`

---

## Epic 1.7 — Artifacts and results

**Status:** To do  
**Depends on:** 1.4 (parallel with 1.6)  
**Goal:** Save files for a run and emit a vendor-neutral summary.  
**Done when:** Screenshots/traces/custom files land under the configured directory; `ExecutionSummary` has counts and statuses only from the contract.

### Tasks

- [ ] Implement `ArtifactStore` on the filesystem (`artifacts.outputDir`)
- [ ] Save / getAll / getByTest; id + timestamp assigned by the store
- [ ] Build `TestResult` and `ExecutionSummary` (passed/failed/skipped/timedOut; run passed/failed/cancelled)
- [ ] Attach artifact list onto the test result
- [ ] Tests — file written, list by test, summary counts, no Allure/Xray fields

---

## Epic 1.8 — Core tests and reference consumer

**Status:** To do  
**Depends on:** 1.5, 1.6, 1.7  
**Goal:** Core behaviour is covered; the consumer looks like a real team.  
**Done when:** Reference consumer has `qakit.config.ts` and a fake test that loads config, runs hooks, writes a log and an artifact, and fails with a coded error.

### Tasks

- [ ] Expand `@qakit/core` unit tests for the public runtime API
- [ ] Reference consumer: `qakit.config.ts` via `defineConfig`
- [ ] Reference consumer: one passing and one failing example (no Playwright)
- [ ] Consumer still imports `@qakit/core` only (no `packages/*/src`)
- [ ] README: how a team uses core today (config + run context, still no UI)

---

## Epic 1.9 — Thin Playwright

**Status:** To do  
**Depends on:** 1.8  
**Package:** new `@qakit/playwright`  
**Goal:** Attach native Playwright to the service registry. No click/fill/locator wrappers.  
**Done when:** A consumer test can `services.get(ServiceKeys.PlaywrightPage)` and use native Playwright; core still does not import Playwright.

### Tasks

- [ ] New workspace package `@qakit/playwright` depending on core + `playwright-core` / playwright
- [ ] Extension starts browser/context/page and registers ServiceKeys
- [ ] Close browser in cleanup (LIFO)
- [ ] Optional trace/screenshot on failure via ArtifactStore (native PW APIs)
- [ ] Reference consumer (or a small example) runs one native `page.goto` test
- [ ] Tests — keys registered; cleanup closes browser; core package has no playwright dependency
- [ ] Explicit non-goal: no `qakit.click`, no custom expect, no page-object library

---

## Epic 1.10 — Thin API

**Status:** To do  
**Depends on:** 1.8  
**Package:** new `@qakit/api`  
**Goal:** Generic HTTP client as an extension.  
**Done when:** A consumer can get a client from the registry, call HTTP, and store request/response artifacts; no domain clients in core.

### Tasks

- [ ] New workspace package `@qakit/api`
- [ ] Generic client (method, url, headers, body, timeout) registered on `ServiceKeys.ApiClient`
- [ ] Auth via `AuthProvider.getHeaders` (interface already in contracts)
- [ ] Map HTTP/network failures to `IntegrationError` / `TimeoutError`
- [ ] Optional request/response artifacts
- [ ] Tests — success, 4xx/5xx, timeout, headers from auth provider
- [ ] Explicit non-goal: no SAP/finance client in this package

**Phase 1 exit:** a consumer can run one UI test and one API test on QAKit, with logs, artifacts, coded errors, and a normalized result.

---

## Epic 2.1 — CLI init and version

**Status:** Later (Phase 2)  
**Package:** new `@qakit/cli`, binary name `qakit` (not `qa`)  
**Goal:** A team can scaffold a project and see which platform version they have.  
**Done when:** `qakit init` writes a consumer folder that installs and loads config; `qakit version` prints core (and adapter) versions.

### Tasks

- [ ] Package `@qakit/cli` with `qakit` bin
- [ ] `qakit init <name>` — package.json, `qakit.config.ts`, sample test, gitignore
- [ ] Init pins current `@qakit/core` (and playwright/api when present)
- [ ] `qakit version` — reads installed package versions
- [ ] Tests — generated project typechecks; init is idempotent enough to not trash an existing repo without a flag

---

## Epic 2.2 — Release and publish

**Status:** Later (Phase 2)  
**Goal:** Version and publish packages so teams install them; they do not clone the platform repo.  
**Done when:** A changeset produces a new `@qakit/core` version on the agreed registry.

### Tasks

- [ ] Decide registry: GitLab npm / GitHub Packages / other internal npm (**open**)
- [ ] Add Changesets
- [ ] Semver rule: public API break = major; new optional API = minor; fix = patch
- [ ] Publish pipeline for `@qakit/contracts`, `@qakit/core`, adapters, cli
- [ ] Document how a team adds `"@qakit/core": "x.y.z"` in their own repo

---

## Epic 2.3 — Upgrade command

**Status:** Later (Phase 2)  
**Depends on:** 2.1, 2.2  
**Goal:** Teams bump QAKit packages without hand-editing every dependency.  
**Done when:** `qakit upgrade` updates pinned `@qakit/*` versions in a consumer repo within semver policy.

### Tasks

- [ ] Detect installed `@qakit/*` versions in the current project
- [ ] Upgrade within range (flag for major)
- [ ] Report what changed; do not rewrite the team’s tests
- [ ] Tests on a fixture consumer repo

---

## Epic 3.1 — First-team pilot

**Status:** Later (Phase 3)  
**Depends on:** Phase 1 complete; Phase 2 init/version ideally available  
**Goal:** One real team runs on QAKit. Add core code only if they hit a real hole.  
**Done when:** That team’s CI runs their tests against published (or agreed) QAKit packages; their domain code stays in their repo.

### Tasks

- [ ] Pick the first team and a thin slice (one UI flow and/or one API flow)
- [ ] Kickoff: what stays in their repo vs what is platform
- [ ] Their `qakit.config.ts`, CI job, artifacts path
- [ ] Pairing on first real run
- [ ] Bugfix in core **only** if the hole is generic
- [ ] Short retro: what to change in core vs what they keep

---

## Icebox — do not build now

Create these epics only when a pilot asks for them. Not Phase 1.

| Later epic | Why it waits |
| --- | --- |
| Test data helpers | Large; team-specific data stays in team repos first |
| Python workers (Excel/CSV/ERP) | Not a second Playwright framework; after core is used |
| DB adapters | Contract + per-DB work; not needed to run UI/API |
| Mocks / service virtualisation | Easy to overbuild before a real team needs it |
| Allure reporter | Reporter interface exists; vendor adapter is optional |
| Xray reporter | Same; must not leak Xray fields into core results |
| Central reporting dashboard | Separate product (~350h), not a core feature |
| Page-object library | After 3+ teams share real patterns; not a guess |

---

## Open decisions (block 2.2, not 1.3)

- First consuming team and date
- GitLab CI on day one vs local first
- Xray/Allure in the v1 *story* vs later adapters
- Package publish: internal registry vs git dependency
