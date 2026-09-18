# Publish QAKit to GitLab npm

This repository only. Packages publish to the **project npm** registry (id `420`):

`https://gitlab.sixsentix.com/api/v4/projects/420/packages/npm/`

CI (`.gitlab-ci.yml`): `test` on every push; `publish` is **manual** on the default branch.

## Before merge

```bash
pnpm install
pnpm --filter @qakit/playwright exec playwright install chromium --with-deps
pnpm test
pnpm typecheck
```

After a user-facing change, add a ticket (this is not a version bump):

```bash
pnpm changeset
```

`fixed` in `.changeset/config.json` means all publishable packages (`contracts`, `core`, `playwright`, `api`, `cli`) share one version. `reference-consumer` is ignored.

Semver: public API break = major; new optional API = minor; fix = patch.

Keep `format: false` — Changesets 3 otherwise runs Prettier and fails.

## Version (once)

When the tickets are on the default branch:

```bash
pnpm version-packages
```

That bumps `package.json`, writes `CHANGELOG.md`, and deletes consumed tickets. **Commit** that diff. Do not run it again on the same commit — you will double-bump (for example 0.2.0 → 0.3.0).

Until you do this, git can contain a feature while the published pin stays old.

## Publish

GitLab → CI/CD → pipeline on the default branch → **publish** job (manual).

The job appends `.npmrc` with `CI_JOB_TOKEN` and runs `pnpm release` (`pnpm build` + `changeset publish`).

Teams then run `pnpm view @qakit/cli version` and `qakit upgrade`.

## Do not

- Publish from GitHub or public npm
- Run `version-packages` twice in a row
- Commit a token in `.npmrc`
- `pnpm add -g` from public npm — `@qakit` is not there
