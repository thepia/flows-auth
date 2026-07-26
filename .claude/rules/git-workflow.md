# Git & PR Workflow

## Trigger-Action Rules

### BEFORE every commit

The husky `pre-commit` hook already runs this automatically:

```
1. pnpm test contracts/api-response-contracts.test.ts   (CRITICAL)
2. pnpm test integration/api-response-format.test.ts     (CRITICAL)
3. pnpm test stores/auth-store.test.ts
4. pnpm test utils/sessionManager.test.ts
5. pnpm tsc --noEmit
6. pnpm lint
7. pnpm build
```

To run the full equivalent manually (e.g. before pushing a WIP branch):

```
pnpm validate        # typecheck + biome check + full test suite
pnpm pre-push        # comprehensive: lint, typecheck, tests, build
pnpm pre-push:quick  # skips build verification
pnpm pre-push:fast   # skips tests and build (lint/typecheck only)
```

Never bypass the hook with `git commit --no-verify` to get past a failing
critical/auth test — fix the failure or ask before overriding.

The hook's `tsc --noEmit` and `pnpm lint` are narrower than what CI gates
on — CI runs `pnpm run check` (Biome, read-only) and `pnpm run typecheck`
(`tsc --noEmit` against **both** `tsconfig.json` and `tests/tsconfig.json`).
Run the wider versions regularly, not just when the hook complains, so
lint/format/type drift doesn't pile up and surface as a CI-only failure:

```
pnpm check:fix   # auto-fix Biome lint + format issues
pnpm typecheck   # full type check, same scope CI enforces
```

Run both periodically while iterating on a branch, not just right before
committing — catching drift early keeps the build clean and avoids a
last-minute pile of unrelated fixes in one commit.

### WHEN touching auth-critical files

```
Does the change touch any of:
  - src/core/stores/**
  - src/core/utils/sessionManager.ts
  - src/core/api/auth-api.ts
  - src/core/types/index.ts
  - tests/**
  → YES: The "🔒 Protect Authentication Patterns" CI workflow runs
    test:critical + related suites on push/PR. Run `pnpm verify-auth-patterns`
    or `pnpm protect-auth` locally first to catch failures before pushing.

Are you about to create an authStore instance inside a component?
  → DON'T. NEVER create the auth store singleton in a component — always
    consume the shared instance from context/parent (see root and repo
    CLAUDE.md). This is the #1 anti-pattern in this codebase.

Are you about to mock the API layer in an integration test?
  → DON'T. See docs/testing/API_CONTRACT_TESTING_POLICY.md — integration
    tests must exercise the real API, not mocks.
```

### WHEN creating a commit message

There's no CI-enforced commit message format in this repo (history is a mix
of free-form and `type(scope): summary`), but prefer a clear, scoped style
when the change fits one:

```
Does the subject describe WHAT changed in <72 chars, imperative mood?
  → NO: Rewrite, e.g. "Fix session refresh race in sessionManager"

Is there a natural type/scope prefix (feat, fix, docs, refactor, test,
build, ci, chore)?
  → Use it when it adds clarity (e.g. "fix(session): ..."), skip it for
    small or exploratory commits where it adds noise.

Does the body explain WHY, not WHAT?
  → NO: Add reasoning if the change isn't self-evident from the diff.
```

### BEFORE opening a PR

```
Does it touch package.json exports, dist/ output shape, or publish config?
  → Run `pnpm publish:pnpm:dry` locally — CI's "Publish dry run" step in
    ci.yml will catch a broken exports/files map, but catching it locally
    is faster.

Does it bundle more than one logical change?
  → Split it if the changes aren't related. Easier to review, easier to
    revert independently.

Can a reviewer understand the reasoning from the PR description alone?
  → NO: Add context — explain the key tradeoff, note what was tested.
```

### WHAT CI actually checks (ci.yml)

```
1. pnpm run check          (Biome lint + format)
2. pnpm run build
3. pnpm run typecheck      (must run AFTER build — some tests/types
                             resolve dist/** and the package.json
                             `exports` map)
4. Verify dist/ artifacts exist (index.js, index.d.ts, svelte/index.js,
                                  svelte/index.d.ts, flows-auth.css)
5. pnpm publish --dry-run --no-git-checks
6. pnpm run test:unit
7. pnpm run test:package    (reads from dist/, runs after build)
8. pnpm run test:coverage:ci
9. validate-examples job: builds examples/flows-app-demo and
   examples/tasks-app-demo via the pnpm workspace filter

Integration tests (tests/integration/**) require a live API at
dev.thepia.com:8443 and do NOT run in CI — run them locally with
`pnpm test:integration` or the full `pnpm test`.
```

### WHEN a test starts failing

```
DO NOT:
  ✗ Delete the test
  ✗ Comment it out
  ✗ Skip without documentation

Is the test broken or flaky?
  DO:
    ✓ Use it.skip / describe.skip (not a deleted block)
    ✓ Add a comment: // Skipped: [reason], see #<issue-number>
    ✓ File a tracking issue immediately

Is the test superseded by a semantic change?
  DO:
    ✓ Use it.skip with a comment explaining the change and the PR that
      caused it
    ✓ Or delete it outright if the replacement test fully covers the old
      behavior and the old test adds no historical value — git history
      already preserves it.
```

Example (broken/flaky test):
```ts
// Skipped: flaky under parallel execution, see #1234
it.skip('handles concurrent session refresh', () => { ... })
```

Example (superseded test):
```ts
// Superseded by 'excludes hosted-only contracts' below, see #3363
it.skip('renews hosted-only contracts', () => { ... })
```

### WHEN reviewing code

```
Does the PR explain WHY the change was made?
  → NO: Ask for explanation before approving.

Does the diff touch an auth-critical file (see list above) without a
corresponding test change?
  → YES: Request test coverage — these paths are protected by
    protect-auth-patterns.yml for a reason.

Are there new .skip()'d tests?
  → YES: Verify a tracking issue or PR reference exists in the skip comment.

Does the PR rebuild the library and re-run svelte-autofixer on any
Svelte component changes?
  → NO: Ask for it — stale dist/ output is a recurring source of
    "works locally, broken in the demo" bugs in this repo.
```

### WHEN publishing a release

```
Publishing is tag/release-triggered (publish.yml), not manual:
  1. Bump version in package.json.
  2. Push a `v*` tag or publish a GitHub Release.
  3. CI builds, typechecks, runs test:unit + test:package, verifies
     dist/ artifacts, creates a GitHub Release with the tarball, then
     `pnpm publish --no-git-checks` to GitHub Packages.

Always use the global ~/.npmrc for GitHub Packages auth — never commit a
local .npmrc with $NODE_AUTH_TOKEN (see root CLAUDE.md).
```
