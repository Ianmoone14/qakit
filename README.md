# QAKit

Internal TypeScript QA platform. Small core, consumed by independent teams. Playwright stays native.

## Status

Phase 1–2 are complete, including the test driver (`runQakitTest` / `uiTest` / `apiTest`). Next: first-team pilot.

- `@qakit/contracts` — types, Zod schemas, error classes
- `@qakit/core` — config, context, lifecycle, logging, artifacts, results, `runQakitTest`
- `@qakit/playwright` — native Playwright + `runUiTest` / `uiTest` (no action wrappers)
- `@qakit/api` — generic HTTP client + `runApiTest` / `apiTest` (no domain clients)
- `@qakit/cli` — `qakit init [--playwright] [--api]`, `qakit version`, `qakit upgrade`
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
| `@qakit/cli` | `qakit init [--playwright] [--api]` / `version` / `upgrade`. |

UI tests need a Chromium binary once per machine:

```bash
pnpm --filter @qakit/playwright exec playwright install chromium
```

Teams must import package names (`@qakit/core`), never `packages/*/src` internals.

**Team start (empty folder → GitLab npm → `pnpm test`):** [docs/team-start.md](docs/team-start.md). Writing the first `uiTest` / `apiTest`: [docs/first-test.md](docs/first-test.md).

Package rules: [docs/architecture.md](docs/architecture.md). Plan: [docs/plan.xlsx](docs/plan.xlsx). Epics: [docs/BACKLOG.md](docs/BACKLOG.md).

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

Published pins are still **0.1.0**. The driver and init flags are in git; they become 0.2.0 only after Changesets (see below).

Platform versions move together. Semver: public API break = major; new optional API = minor; fix = patch.

A **changeset** (`.changeset/*.md`) is a ticket for the next publish: which packages to bump and the changelog sentence. It is not the new version by itself.

```bash
pnpm changeset           # add a ticket after a user-facing change
pnpm version-packages    # bump package.json + CHANGELOG, delete used tickets
```

Then run the GitLab **publish** job on the default branch. Details: [docs/architecture.md](docs/architecture.md#release-changesets).

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
docs/team-start.md    # team: empty folder → green run
docs/first-test.md    # team: write uiTest / apiTest
docs/architecture.md  # package boundaries
docs/plan.xlsx        # plan + hours log (Excel)
docs/BACKLOG.md       # epics and tasks
```
