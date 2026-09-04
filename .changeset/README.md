# Changesets

Platform packages version together. Add a changeset for every user-facing change:

```bash
pnpm changeset
```

Semver: public API break = major; new optional API = minor; fix = patch.

After merge, run `pnpm version-packages` and land that commit, then run the GitLab **publish** job. That publishes `@qakit/*` to the SixSentix GitLab npm registry.

