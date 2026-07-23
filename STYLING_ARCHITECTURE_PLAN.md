# Flows-Auth Styling Architecture

Last rewritten: 2026-07-21, replacing an earlier plan whose recommended strategy
(bundle Tailwind + branding into flows-auth's own build) was superseded by the
decision below. This doc now reflects the actual architecture and tracks the
real, verified state of every example — not a hypothetical ecosystem audit.

## Architecture Decision: `@thepia/branding` is a peer dependency

flows-auth does **not** bundle `@thepia/branding`'s CSS into its own build
output. Instead:

- `@thepia/branding` is an **optional peerDependency** (`^1.5.5`) of
  `@thepia/flows-auth` (see `package.json`).
- Every component references branding's CSS custom properties directly —
  `var(--color-brand-primary, #988ACA)` — with a **hardcoded hex fallback**,
  so components render sensibly even if a consumer never loads branding's CSS
  at all.
- The consuming app is responsible for importing branding's stylesheets
  itself:
  ```css
  @import "@thepia/branding/css";            /* design tokens (custom properties) */
  @import "@thepia/branding/css/components"; /* .btn-brand, .input-brand, etc. */
  ```
- Rejected alternative: bundling Tailwind + branding tokens into flows-auth's
  own build (the old plan's "Strategy 1"). This would make the library
  opinionated about the consumer's CSS tooling and duplicate branding's
  output across every consumer's bundle. Peer-dependency + fallback chains
  keeps the library framework-and-tooling-agnostic.

### Why fallback chains, not a hard requirement

A component author writes:
```css
color: var(--color-brand-primary, #988ACA);
```
If the consumer has loaded branding's `tokens.css`, the real token wins. If
not, the component still renders with a reasonable default instead of
`unset`/transparent. This is why `getRequiredCssOrThrow()`-style runtime
validation (proposed in the old plan) isn't needed — the fallback chain *is*
the validation-free safety net.

## Real branding tokens (verified against `@thepia/branding` v1.5.5 source)

Do not invent token names — cross-check against
`node_modules/@thepia/branding/dist/css/tokens.css` before using one. Names
that come up most often in this codebase:

| Concept | Token |
|---|---|
| Primary brand color (+ hover/active/subtle/muted) | `--color-brand-primary`, `--color-brand-primaryHover`, `--color-brand-primaryActive`, `--color-brand-primarySubtle`, `--color-brand-primaryMuted` |
| Accent color (+ hover/active) | `--color-accent`, `--color-accent-hover`, `--color-accent-active` |
| Text | `--color-text-primary`, `--color-text-secondary`, `--color-text-inverse`, `--color-text-error`, `--color-text-success`, `--color-text-warning`, `--color-text-info`, `--color-disabled-text` |
| Backgrounds | `--color-bg-primary`, `--color-bg-secondary`, `--color-bg-muted`, `--color-bg-secondary-hover`, `--color-bg-disabled-input`, `--color-bg-disabled-primary` |
| Borders | `--color-border-default`, `--color-border-subtle`, `--color-border-brand`, `--color-border-error` |
| Neutral palette scale | `--color-palette-neutral-1` … `-12` (and `-50`…`-950` Tailwind-style aliases) |
| Radius scale | `--size-radius-0/1/2/3/4/6/8/12/full` (note: `--size-radius-*`, **not** `--radius-*`) |
| Shadows | `--shadow-input-focus`, `--shadow-error` (no generic elevation/`shadow-lg` scale exists yet — a real gap, see below) |
| Typography | `--font-fontFamily-brand-body`, `--font-fontFamily-brand-lead`, `--font-fontFamily-brand-mono` |
| Component classes (from `@thepia/branding/css/components`) | `.btn-brand`, `.btn-brand-outline`, `.btn-secondary`, `.card-brand` (+`-body`/`-header`/`-footer`), `.alert-brand-{error,info,success,warning}`, `.input-brand`, `.form-error`, `.dialog-brand`, `.popover-brand` |

**Known gaps in branding** (confirmed absent, not just unused): no elevation
shadow scale (`shadow-sm/md/lg`), no solid "danger/destructive" action token
(only `--color-text-error`/`--color-border-error`/`--color-bg-error`, all
subtle/alert-style, not a solid button fill). Where an example needs these,
use a documented literal value with a comment, don't invent a token name.

## `--auth-*` legacy variable migration

### Background

Every flows-auth component historically wrote three-tier fallback chains:
```css
color: var(--color-brand-primary, var(--auth-primary-color, #988ACA));
```
with a hand-written `@media (prefers-color-scheme: dark)` block per component
resolving a `-dark` sibling (`--auth-primary-color-dark`, etc.).

### Verified findings

- **51 distinct `--auth-*` names, ~137 references**, across 11 component
  files (`AccountCreationForm`, `SignInForm`, `UserManagement`, `AuthButton`,
  `AuthExplainer`, `AuthNewUserInfo`, `AuthStateMessage`, `CodeInput`,
  `EmailInput`, `PolicyViewer`) plus `PolicyViewer.example.md`.
- **Zero real consumers set any `--auth-*` variable**, anywhere in the
  Thepia workspace (`thepia.com`, `flows.thepia.net`, `flows-client` all
  grepped clean). The middle tier of every fallback chain has always been
  dead code.
- Branding's own dark-mode mechanism (`tokens.css`, `.dark, .dark-theme,
  [data-theme="dark"]` selectors) is **class/attribute-driven only** — it
  never has `@media (prefers-color-scheme: dark)` anywhere. This differs
  from flows-auth's current per-component media queries, which respond to OS
  preference automatically with no app cooperation needed.

### Decisions (made 2026-07-21)

1. **Drop the `--auth-*` middle tier entirely.** New shape:
   `var(--branding-token, #hex-fallback)` — two tiers, not three.
2. **Drop the manual `@media (prefers-color-scheme: dark)` blocks per
   component.** Accepted behavior change: dark mode will only activate going
   forward when the consuming app explicitly sets `.dark`/`data-theme="dark"`
   on an ancestor, matching branding's own mechanism — not automatically from
   OS preference. (Status: **decided, not yet executed** — see Remaining
   Work.)

### Mapping table

| `--auth-*` name(s) | Real branding token |
|---|---|
| `-primary-color`, `-primary-hover`, `-primary-active`, `-primary-dark`, `-primary-light` | `--color-brand-primary`, `--color-brand-primaryHover`, `--color-brand-primaryActive`, `--color-brand-primaryMuted`/`Subtle` |
| `-accent-color`, `-accent-hover` | `--color-accent`, `--color-accent-hover` |
| `-text-primary/-secondary/-tertiary/-text`, `-label-text(-dark)`, `-input-text(-dark)`, `-input-disabled-text(-dark)` | `--color-text-primary`/`-secondary`/`-3`, `--color-disabled-text` |
| `-error/-success/-warning/-info-text(-dark)` | `--color-text-error`/`-success`/`-warning`/`-info` |
| `-background`, `-background-muted`, `-hover-background`, `-card-bg`, `-input-bg(-dark)`, `-input-disabled-bg(-dark)` | `--color-bg-primary`/`-muted`/`-secondary-hover`, `--color-bg-disabled-input` |
| `-border-color`, `-border`, `-border-subtle`, `-input-border(-dark)`, `-input-focus-border(-dark)`, `-error-border(-dark)` | `--color-border-default`/`-subtle`, `--color-border-brand`, `--color-border-error` |
| `-button-secondary-{bg,text,border,hover-bg,hover-border}` | `--color-bg-primary`, `--color-text-secondary`, `--color-border-default`, `--color-bg-secondary-hover` |
| `-input-focus-shadow(-dark)`, `-error-shadow(-dark)` | `--shadow-input-focus`, `--shadow-error` (exact existing matches) |
| `-font-family` | `--font-fontFamily-brand-body` |

### Rollout order (by reference count, not yet executed)

`AccountCreationForm.svelte` → `SignInForm.svelte`/`UserManagement.svelte` →
`core/` components (`AuthButton`, `AuthNewUserInfo`, `AuthStateMessage`,
`AuthExplainer`, `CodeInput`, `EmailInput`, `PolicyViewer`) → update
`PolicyViewer.example.md` to stop telling consumers to override `--auth-*`.
Verify with `pnpm build` after each file, plus a full `pnpm build` +
`pnpm test:unit` + manual visual check in `examples/auth-demo` at the end.

## Per-example status (verified 2026-07-21, not a hypothetical audit)

| Example | Branding CSS wired? | Uses real tokens? | Other status |
|---|---|---|---|
| `auth-demo` | Yes, via Tailwind `@theme` mapping to real tokens | Yes | Was importing Svelte components from the wrong (bare) package path on 4 routes — silently rendered nothing; a nonexistent `getGlobalAuthStore()` call; a phantom `config` prop; a phantom `stepChange` listener on `SignInCore`. **All fixed and verified** (`pnpm build` passes). Also had unnecessary dynamic imports of SSR-safe components — **converted to static**, except the one page whose whole purpose is smoke-testing the dynamic import path (kept, with a comment explaining why). |
| `astro-demo` | Yes, via Tailwind `@theme` | Yes | Clean — imports/props/events all correct. Thin: only exercises `SignInForm` (without wiring its events) and `ErrorReportingStatus`. No fixes needed. |
| `flows-app-demo` | Yes (`@import "@thepia/branding/css"` + `/css/components`, added this session — previously had the dependency but never imported it) | **Fixed this session** — `.btn`/`.card` utility classes referenced `var(--primary)`, `var(--white)`, `var(--gray-700)`, `var(--radius-md)`, `var(--shadow-lg)`, none of which exist in branding; now reference `--color-brand-primary`, `--color-text-inverse`, `--color-text-secondary`, `--size-radius-4`/`-6`, `--color-border-default`/`-subtle` | A `config` prop threaded from a dev sidebar down to a wrapper that never actually passes it to `SignInForm` (misleading, not yet fixed). Its own `README-MOCK-AUTH.md` shows the wrong prop name (`authStore` instead of `store`, not yet fixed). Had 2 unnecessary dynamic imports — **converted to static**; 4 dev-gated console-bridge dynamic imports confirmed legitimate, left as-is. |
| `tasks-app-demo` | Yes (added this session, same gap as flows-app-demo) | **Not yet fixed** — `app.css` has zero `var(--...)` usages, 100% hardcoded hex. Concrete mapping identified (body bg/text, input/button colors and radii, focus ring → `--shadow-input-focus` exact match, `.card` → real tokens, disabled/secondary/danger button grays → `--color-palette-neutral-8/9` and branding's danger-token gap) but not yet applied. | `EmailVerificationBanner`/`EmailVerificationPrompt` were stubbed out as placeholder `<div>`s since the file's original commit — **fixed**, now real components. Had 14 unnecessary dynamic imports (error-reporting helpers, a stale duplicate `ErrorReportingStatus.svelte`) — **all converted to static**. A phantom `on:stateChange` listener (real event is `stepChange`) — **fixed**. |
| `angular-demo` | No | N/A | No working `@thepia/flows-auth` integration at all — the one auth import is commented out, references `useAuthStore` (never existed; real export is `createAuthStore`), and the "sign-in" is a hardcoded `setTimeout` fake. **Explicitly deferred** — fixing it means building a real Angular integration, not a quick fix; revisit separately. |

## Library-internal build correctness (found & fixed this session)

Two issues unrelated to CSS but discovered while auditing "why does this
component need a dynamic import" — worth tracking here since they affect
every consumer:

- **9 of 10 dynamic `await import(...)` calls in `src/core`/`src/svelte`
  were unnecessary** and have been converted to static imports (verified
  safe: none had top-level side effects, several were re-importing a module
  the same file already statically imports elsewhere). Only the
  Paraglide-generated `async_hooks` import (edge-runtime compatibility) is
  genuine and was left alone.
- **`biome.json`'s file-exclusion glob was stale**: `!**/src/paraglide`
  referred to the pre-split path; the generated Paraglide output actually
  lives at `src/core/paraglide` since the core/svelte packaging split. This
  meant `pnpm check:fix` was linting and reformatting auto-generated,
  committed source (regenerated via `pnpm build:paraglide`, never
  hand-edited) — including flagging intentional empty `catch {}` blocks in
  generated code as errors, which blocked `check:fix` from succeeding at
  all. **Fixed**: glob updated to `!**/src/core/paraglide`.

## Remaining work

1. Execute the `--auth-*` → branding-token migration (mapping table above),
   file by file, dropping the manual dark-mode media queries.
2. Wire `tasks-app-demo/src/app.css` to real branding tokens (mapping
   identified above, not yet applied).
3. Fix `flows-app-demo`'s dead `config` prop threading and its
   `README-MOCK-AUTH.md`'s wrong `store` prop name.
4. Decide `angular-demo`'s fate (build a real integration, or remove it).
5. Confirm whether to revert the 7 `src/core/paraglide/*` files that got
   cosmetically reformatted by a `check:fix` run before the biome exclusion
   fix landed (pending — paused for user confirmation before any `git
   checkout`).
