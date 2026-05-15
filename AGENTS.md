# AGENTS.md — lorcana-schemas

## Pre-commit checklist (run before every commit/push)

CI runs these exact commands. Skipping them locally means
shipping red commits to `main`. **Always run all three before
`git commit`:**

```bash
pnpm lint        # eslint . && prettier --check .
pnpm typecheck   # tsc --noEmit
pnpm test        # vitest run
```

If lint fails on formatting:

```bash
pnpm format      # prettier --write .
```

Then re-run `pnpm lint` to confirm.

## Why this matters

- `.github/workflows/ci.yml` runs `pnpm lint` then `pnpm test`.
  Either failing fails the build.
- A red CI on `main` blocks downstream consumers
  (`lorcana-scraper`, `lorcana-training`, `lorcana-web`) from
  picking up the new package version cleanly.

## Schema-version bump

When touching `src/*.ts` types, also run:

```bash
pnpm check:bump   # asserts package.json was bumped if types changed
pnpm build:schemas
```

The release workflow expects regenerated JSON Schemas to be
committed alongside the version bump.
