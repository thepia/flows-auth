# Bug Prevention Patterns

Short trigger → action rules for drift and consistency bugs that have
recurred in this repo. Each rule points at the canonical doc rather than
restating it — see [Keeping this file lean](#keeping-this-file-lean).

## Trigger-Action Rules

### WHEN editing any `.svelte` file

```
Before returning the change to the user:
  → Run svelte-autofixer (mcp__svelte) on it and apply its fixes.
  → Required by root flows-auth/CLAUDE.md — this rule just makes it a
    trigger instead of a passive reminder.
```

### WHEN changing the public API surface

```
Did you add/change/remove a store method, component prop, exported
type, or config option in src/?
  → YES: Update the matching usage in examples/* (auth-demo,
    flows-app-demo, tasks-app-demo, astro-demo, angular-demo).

Why this matters: CI's validate-examples job only checks that examples
still BUILD (pnpm --filter ... build). A stale example that calls an
old API signature, ignores a new required prop, or never demonstrates
the new feature will build green and rot silently — nothing catches it
until a developer copies the stale pattern.

  → Also run `pnpm build` first (examples use the local dist output,
    not src/ directly) and restart/spot-check the demo you touched.
```

### WHEN adding or changing an auth state or transition

```
Does the change add/remove a state, transition, or AuthContext field in
the state machine implementation?
  → YES: Update docs/auth/authentication-state-machine.md (mermaid
    diagram) and docs/development/state-machine.md (TypeScript types)
    in the SAME commit. These are the source of truth other repos and
    future sessions read — a code-only change makes them silently wrong
    rather than absent.

Is the new state reachable from every scenario that should support it
(individual registration AND invitation-based access)?
  → NO: Incomplete — both scenarios are first-class per
    docs/auth/README.md; don't add a state that only one path can reach
    without an explicit, documented reason.
```

### WHEN a change touches or assumes API server behavior

```
Are you inferring server behavior instead of reading it from thepia.com?
  → DON'T. thepia.com/docs/auth/ is the single source of truth for API
    contracts (see AI_DEVELOPMENT_GUIDE.md → "API Contract
    Requirements"). If the contract doesn't cover it, that's a
    thepia.com change first — see docs/testing/cross-repo-coordination.md
    for the coordination workflow.

Does the change require mocking fetch/HTTP in an integration test to
pass?
  → DON'T merge it that way. NO-MOCKING is a hard policy for
    integration tests here — see
    docs/testing/API_CONTRACT_TESTING_POLICY.md. A mock-only-passing
    integration test usually means the API contract itself needs
    updating in thepia.com first.
```

### WHEN you're about to write a new markdown doc

```
Search docs/ for an existing doc on this topic first
  (`find docs -iname '*<keyword>*'`, grep for the concept).
  → Found one: extend/correct it instead of creating a parallel doc.
    Two docs on the same topic drift apart silently — only one can be
    the source of truth.
  → Genuinely new topic: add it under docs/, then link it from the
    relevant README.md or CLAUDE.md — don't leave it undiscoverable.

Is this content critical-path (a rule the agent must never violate) or
reference (detail someone/something looks up occasionally)?
  → Critical-path: keep it short and put it in CLAUDE.md or a
    .claude/rules/*.md trigger.
  → Reference: put the detail in docs/ and leave only a pointer where
    the trigger would otherwise go — this is why
    docs/development/AI_DEVELOPMENT_GUIDE.md exists (moved out of
    CLAUDE.md to cut token usage while keeping the content).
```

## Keeping this file lean

This file only earns new entries for patterns that have actually caused
drift or a repeat bug — not hypothetical ones. When adding a rule:

- Point at the canonical doc; don't copy its content here.
- If the underlying doc doesn't exist yet, that's the real fix — write
  the doc, then add a one-line trigger here.
- Prefer editing an existing entry over adding a new top-level section
  for a closely related trigger.
