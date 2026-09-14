# Changesets

A changeset is a short markdown **ticket** in this folder. It is not a release.

After a user-facing change, add one:

```bash
pnpm changeset
```

The file says: bump these `@qakit/*` packages (major / minor / patch) and use this sentence in the changelog.

`fixed` in `config.json` means all publishable packages share one version. One minor ticket → everyone goes `0.1.0` → `0.2.0`.

`format: false` — this repo has no Prettier. Changesets 3 would otherwise run `pnpm exec prettier` on CHANGELOGs and fail.

To actually cut the version (does not publish):

```bash
pnpm version-packages
```

That rewrites `package.json` versions, writes `CHANGELOG.md`, and deletes the consumed tickets. Commit that result. GitLab **publish** then runs `changeset publish` to the SixSentix GitLab npm registry.

Semver: public API break = major; new optional API = minor; fix = patch.

Pending tickets now are for the **test driver**, **init adapter flags**, and **`qakit.playwright.json`**. Until `version-packages` runs, installs of `0.1.0` do not include those APIs.
