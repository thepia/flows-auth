# Multi-framework packaging plan (Svelte + React)

Status: **proposal — no code changed yet.**

Goal: restructure `@thepia/flows-auth` into a **framework-agnostic core** plus
**per-framework UI targets** (Svelte now, React next), built the canonical way
(`@sveltejs/package` for the Svelte target). This also fixes the current defect where
the library ships un-preprocessed TS `.svelte` source and breaks consumer builds.

## Guiding model

Follow the **Zag.js** shape: shared agnostic core + thin per-framework UI. flows-auth is
already ~80% there — `stores/`, `api/`, `utils/`, `types/`, `constants/`, `server/` are
framework-neutral, and there's an adapter seam (`stores/adapters/{svelte,astro,vanilla}`).
Only the 19 `.svelte` UI components are framework-bound. React is therefore **additive**
(new bindings over the same core), not a rewrite.

Canonical references: [SvelteKit Packaging](https://svelte.dev/docs/kit/packaging),
[Zag.js](https://github.com/chakra-ui/zag) (agnostic core + adapters),
[Shoelace](https://shoelace.style/frameworks/react) (web-component alternative).

## Current state (baseline)

- Build: single `vite build` (lib mode, ES+CJS) + `vite-plugin-dts` + a hand-rolled
  `copySourceFiles()` that copies `src/` → `dist/src/` **verbatim** → ships raw TS `.svelte`.
- Root `.` export **mixes UI + logic** (`index.ts` re-exports 6 components + 28 logic
  symbols) and carries a `svelte` condition pointing at raw TS → any svelte-aware bundler
  drags in un-preprocessed source (the demo build failure).
- Logic subpaths (`./stores`, `./stores/core`, …) point at **raw `src/*.ts`**, not built output.
- CSS is extracted by Vite to `dist/flows-auth.css`, consumed via `./style.css`.
- No React anything.

## Target architecture

**Per-target builders, one subdir per target.** The key constraint: `svelte-package`
takes a single `-i` input and processes *every* file under it (`.ts`→`.js`, `.svelte`
preprocessed, `.d.ts` emitted) with no exclude. So it cannot be run over a tree that also
contains React/Angular source. Rather than nest everything under one `svelte-package`
input, give **each framework subdir its own builder** pointed at that subdir (the Zag.js
model). Each top-level `src/` dir then maps 1:1 to a build target and an export path.

```
src/
  core/                      # tsup           -> dist/index.js   => "."      (framework-agnostic)
    index.ts                 #   CORE barrel: stores, api, utils, types, constants, paraglide
    stores/ api/ utils/      #   framework-neutral logic
    types/ constants/ paraglide/
  svelte/                    # svelte-package -> dist/svelte/    => "./svelte"
    index.ts                 #   Svelte UI barrel (re-exports the 19 components)
    components/ …            #   all .svelte moved here
  react/                     # tsup           -> dist/react/     => "./react"  (Phase 3)
    index.ts
    components/ …            #   React components binding to the same core stores
  ng/                        # ng-packagr     -> dist/ng/        => "./ng"     (later phase)
    …
  server/                    # Deno-native    (no bundler)      => "./server" (separate target)
    …                        #   server-only source, run under Deno; imports only *some* of
                             #   core (relative ../core/*.ts), NOT part of the `.` barrel.
```

**`src/server` is deliberately outside `core/`.** It is standalone, Deno-compatible
server code — nothing to do with the component libraries — that consumes only a subset of
core. It is not compiled by `tsup`/`svelte-package`, is not re-exported from the `.` barrel,
and (when it has source) is published/consumed as its own `./server` target.

No `src/lib/` wrapper: it only existed to match `svelte-package`'s default input. Since
each builder is pointed at its own subdir explicitly (`-i src/svelte`), the default is moot,
and `$lib` is a SvelteKit *app* alias that doesn't exist in a packaged library. Flatter and
unambiguous.

**Cross-target imports:** framework dirs import the core via the **package's own name**
(`import { createAuthStore } from '@thepia/flows-auth'`), resolved through the `exports`
map, not via relative `../core` paths — src-vs-dist relative depth differs, and the
self-reference fully decouples the targets (again, the Zag pattern).

### Export surface: minimal, flat, ESM-only

The current map has ~15 paths, incl. **7 store subpaths up to 3 levels deep**
(`./stores/adapters/svelte`, `./stores/core`, …). Every path is a public contract and deep
paths leak internal structure. Principles:

- **No `./stores` subpath at all.** The framework-agnostic stores/core ARE the root
  (`.` = default, for web-components / plain JS / non-Svelte). Framework-specific store
  bindings + context/i18n helpers live in their framework export (`./svelte`, `./react`).
- **ESM-only.** Every consumer (SvelteKit, Vite, React) is ESM; nothing uses `require`.
  Drop the CJS (`require` / `dist/index.cjs`) condition — no dual-format build.
- **One level max**, and only for framework targets.

This lands the public surface at **four paths**: `.`, `./svelte`, `./react`, `./style.css`.

### Target `exports` map

```jsonc
{
  "type": "module",
  "exports": {
    ".": {                                  // framework-agnostic CORE — ESM, no svelte cond.
      "types":   "./dist/index.d.ts",       // stores(core/vanilla/auth-methods), api, utils, types
      "default": "./dist/index.js"
    },
    "./svelte": {                           // Svelte components + Svelte store/context/i18n helpers
      "types":  "./dist/svelte/index.d.ts", //   svelte-package output
      "svelte": "./dist/svelte/index.js",
      "default":"./dist/svelte/index.js"
    },
    "./react": {                            // React components + React store binding (Phase 3)
      "types":  "./dist/react/index.d.ts",
      "default":"./dist/react/index.js"
    },
    "./style.css": "./dist/flows-auth.css",  // transitional alias; or fold into ./svelte
    "./package.json": "./package.json"
  }
}
```

### What moves where (classification verified against source)

| Symbol / module | Imports `svelte`? | Home |
|---|---|---|
| `createAuthStore`, core stores, `stores/adapters/vanilla`, api, utils, types, `context-keys`, paraglide runtime | no | **`.` (root, agnostic)** |
| `src/server` (Deno server code) | no | **`./server` (separate target — not in `.` barrel)** |
| all 19 `.svelte` components | — | **`./svelte`** |
| `makeSvelteCompatible` (`stores/adapters/svelte.ts`) | yes | **`./svelte`** |
| `getAuthStoreFromContext`, `setupAuthContext` (`utils/auth-context.ts`) | yes (Svelte context) | **`./svelte`** |
| `setI18nMessages` etc. (`utils/paraglide-i18n.ts`) | yes | **`./svelte`** |

**Dropped entirely:** `./stores` + all its sub-paths, `./dev`, `./src`, raw
`./src/paraglide/*` aliases, and the `require`/CJS condition.

Key moves: **(a)** root `.` = agnostic ESM core, no `svelte` condition; **(b)** everything
that touches the Svelte runtime (components + context/store/i18n helpers) moves to
`./svelte`; **(c)** no `./stores`; **(d)** ESM-only; **(e)** `./react` added later.

## Consumer import-path impact (breaking)

Audited across the workspace — this **does** affect production consumers, not just demos:

Anything that touches the Svelte runtime moves to `./svelte`: **components AND the Svelte
store/context/i18n helpers** (`makeSvelteCompatible`, `getAuthStoreFromContext`,
`setupAuthContext`, `setI18nMessages`). Only truly agnostic symbols (`createAuthStore`, api,
types) stay at root.

| Repo | Current import | Must become |
|---|---|---|
| flows.thepia.net, thepia.com | `import { SignInForm, createAuthStore } from '@thepia/flows-auth'` | split: `SignInForm` → `/svelte`, `createAuthStore` stays at root |
| flows.thepia.net, thepia.com | `import { …, ErrorReportingStatus } from '@thepia/flows-auth'` | `ErrorReportingStatus` → `/svelte` |
| thepia.com | `import { createAuthStore, makeSvelteCompatible, setI18nMessages, setupAuthContext, ErrorReportingStatus } from '@thepia/flows-auth'` | `createAuthStore` → root; **`makeSvelteCompatible`, `setI18nMessages`, `setupAuthContext`, `ErrorReportingStatus` → `/svelte`** |
| flows.thepia.net | `import { getAuthStoreFromContext } from '@thepia/flows-auth'` | → `/svelte` |
| flows.thepia.net | `import { makeSvelteCompatible } from '@thepia/flows-auth/stores/adapters/svelte'` | → `/svelte` |
| — | `import type { User } from '@thepia/flows-auth/types'` | fold into root: `from '@thepia/flows-auth'` |
| flows-app-demo | `import SignInForm from '../../../../../src/components/SignInForm.svelte'` | `import { SignInForm } from '@thepia/flows-auth/svelte'` |

The awkward bit: today apps import **agnostic logic + Svelte helpers/components in the same
statement**. The split means most `@thepia/flows-auth` imports fan out into a root import
(agnostic) + a `/svelte` import. Blast radius is small (~10 files) but it is production code.

**Migration aids:**
- Ship a **codemod** (jscodeshift) with an explicit symbol → target map (agnostic set → root;
  Svelte set = components + `makeSvelteCompatible`/`getAuthStoreFromContext`/`setupAuthContext`/
  `setI18nMessages` → `/svelte`). It splits each `@thepia/flows-auth` import accordingly and
  rewrites the deprecated deep `/stores/...` and `/types` paths.
- Optional one-minor **deprecation shim**: a `./svelte`-less compatibility export is NOT
  possible without re-adding the `svelte` condition to root (which reintroduces the React
  problem). So instead, publish the change as a clean MAJOR with the codemod + changelog,
  and update the three first-party consumers (demos, flows.thepia.net, thepia.com) in the
  same PR train.

> Semver note: removing/moving an existing export path or condition is technically a
> breaking change (would normally be MAJOR). **Decision: ship as `1.2.0`** — first-party
> consumers are updated in the same PR train (via the codemod), so the coordinated rollout
> absorbs the break without a MAJOR bump. Treat the codemod + changelog as the migration
> contract rather than the version number.

## Build pipeline

Replace the verbatim copy with **per-target builders**, each pointed at its own `src/` subdir.

- **Core (`.`):** `tsup src/core/index.ts --format esm --dts -d dist` → `dist/index.js`
  (+ `dist/index.d.ts`). Framework-agnostic; no Svelte anything.
- **Svelte target (`./svelte`):** `svelte-package -i src/svelte -o dist/svelte` —
  preprocesses every `.svelte` (strips `lang="ts"` via existing `svelte-preprocess`),
  transpiles `.ts`→`.js`, and emits `.d.ts` / `.svelte.d.ts` next to each file. Fixes the
  raw-TS bug and gives per-file types. Narrowed to `src/svelte` so it never touches
  react/ng source.
- **React target (`./react`, Phase 3):** `tsup src/react/index.ts -o dist/react --dts --format esm`.
- **Angular target (`./ng`, later phase):** `ng-packagr` — Angular components need the
  Angular compiler (partial-Ivy output) and `@angular/core` peer deps; `tsup` will not
  suffice. Treat as its own phase after React proves the pattern.
- **ESM-only:** no CJS/`require` build. Every consumer (SvelteKit, Vite, React) is ESM;
  dropping the `require` condition is itself a breaking change (see packaging docs) folded
  into this MAJOR.
- **Cross-target resolution:** svelte/react/ng import core via `@thepia/flows-auth`
  (self-reference through the `exports` map), so each target builds independently against
  the published core surface rather than relative source paths.
- **Paraglide:** keep the existing copy step for `dist/paraglide/*`.
- **Deno .d.ts import fix:** keep the existing `fix-dts-imports` post-step if still needed.

## CSS decision (must resolve)

Today Vite extracts one `dist/flows-auth.css`. `svelte-package` does **not** bundle CSS —
Svelte scoped styles stay compiled inside each component (injected at runtime). Options:

1. **Inline (recommended for Svelte target):** let component styles ride inside the
   compiled `.svelte` (no separate import needed). Drop `./style.css` for the Svelte target.
2. **Keep a bundled CSS:** run a small Vite pass to emit `dist/svelte/style.css` and keep a
   `./svelte/style.css` export for consumers who prefer a single stylesheet.

Recommendation: (1) for correctness/simplicity, keep `./style.css` as a temporary alias so
existing demo imports (`@thepia/flows-auth/style.css`) don't break mid-transition.

## Phases

### Phase 0 — Stopgap (unblocks demos immediately, ~30 min)
Add preprocessing to the existing `copySourceFiles()` so shipped `dist/src/*.svelte` are
TS-stripped. No source reorg, no export changes. Demos (workspace dist) build. Buys time.

### Phase 1 — Split core + Svelte target with per-target builders (~half day)
1. Move logic (`stores/ api/ utils/ types/ constants/ paraglide/`) → `src/core/`; add
   `src/core/index.ts` agnostic barrel. **`src/server` stays at the top level** (separate
   Deno target, not part of core; imports only the slice of core it needs via relative
   `../core/*.ts`).
2. Move `src/components/**` → `src/svelte/`; add `src/svelte/index.ts` barrel (re-exports the
   19 components + the Svelte store/context/i18n helpers).
3. Update internal imports: relative within a target; **cross-target (svelte→core) via the
   package name `@thepia/flows-auth`**, not relative `../core` (mechanical codemod).
4. Add `svelte.config.js` with `vitePreprocess()` (aliases must live here, not vite config).
5. Swap build to per-target builders: `tsup src/core/index.ts --format esm --dts -d dist`
   **and** `svelte-package -i src/svelte -o dist/svelte` (+ paraglide step). No CJS pass.
6. Rewrite `exports` to the minimal ESM map: root = agnostic core only; move components +
   Svelte store/context/i18n helpers to `./svelte`; **drop `./stores` (and all sub-paths),
   `./dev`, `./src`, raw paraglide-src aliases, and the `require`/CJS condition**.
7. Ship the import codemod and update the three first-party consumers (demos,
   flows.thepia.net, thepia.com) in the same PR train.
8. Resolve CSS per decision above.

### Phase 2 — Verify & release
- Build; confirm `dist/svelte/*.svelte` have plain-JS `<script>` and `.svelte.d.ts` exist.
- Build all five demos (Svelte 5) against workspace dist.
- `svelte-check` / `tsc` on a sample consumer to confirm types resolve via the `svelte`/
  `types` conditions (may require documenting `moduleResolution: bundler` for consumers).
- Version `1.2.0`; changelog notes the root→`/svelte` move (breaking, absorbed by the
  coordinated codemod rollout — see semver note above).

### Phase 3 — Add the React target
1. `src/react/` with React components (`useSyncExternalStore` over the vanilla store
   adapter — add `src/core/stores/adapters/react.ts` alongside `svelte.ts`/`vanilla.ts`).
   React imports core via `@thepia/flows-auth` (self-reference), not relative paths.
2. `tsup src/react/index.ts -o dist/react`; add `./react` export; add `react`/`react-dom` as
   `peerDependencies`.
3. A React demo under `examples/` to exercise it.

## Risks / watch-items

- **Source reorg churn:** moving `src/**` into `src/core/` + `src/svelte/` touches every
  internal import and all test import paths. Do it as one mechanical commit. Cross-target
  imports (svelte→core) must become package-name self-references, not relative paths.
- **`$app/*` usage:** `svelte-package` best-practice warns against SvelteKit-only imports in
  a library. Audit for `$app/environment` etc.; replace with `esm-env` or props.
- **CJS consumers:** confirm whether any consumer needs `require`; dropping it is breaking.
- **`./dev` and `./src` exports:** currently expose raw source; decide keep (dev-only) or drop.
- **Type resolution for subpaths:** non-root `types` conditions need consumers on
  `moduleResolution: bundler|node16|nodenext`, or add `typesVersions` (packaging docs).
- **Effort:** Phases 1–2 ≈ half a day to a day incl. demo verification; Phase 3 is a
  separate, larger effort (writing the React UI).

## Svelte 5 migration — status & remaining tail

Supersedes `docs/SVELTE_5_MIGRATION_PLAN.md` (a Sept-2025 pre-migration plan, now stale —
says "READY TO PROCEED", 15 components; actual is 19 and migrated). Fold the live items
here and delete that doc.

**Functionally complete (verified against source):** library on `svelte@^5`,
`@sveltejs/vite-plugin-svelte@^6`, `svelte-check@4`; all 4 demos on Svelte 5; builds green.
**Zero** `export let` / `$:` / `<slot>` / `<svelte:component>` remain — converted to runes
(`$props` in 18/19, `$state` in 10, `$derived` in 13). Not a blocker for the packaging
work; this is cleanup.

`svelte-check` = 82 errors / 15 warnings. Remaining items, prioritized:

| Item | Count | Notes | Priority |
|---|---|---|---|
| Add `svelte` to `peerDependencies` (`^5`) | 1 | Only `@xyflow/svelte`/`d3`/`phosphor-svelte` declared today; a Svelte component lib must declare svelte as a peer. Do as part of the `exports`/packaging rewrite (Phase 1). | **High** |
| Upgrade `@xyflow/svelte` `0.1.30` → `^1` | 4 errors | 0.1.x is Svelte-4-era; `Background`/`Controls` no longer exported → real v5 incompatibility in `SessionStateMachineFlow` + `SignInStateMachineFlow` (flow-viz/debug components). | **High** |
| `state_referenced_locally` warnings | 14 | Not active bugs — see resolution below. Clear them so the next *real* reactivity warning isn't buried. | **High (hygiene)** |
| `.js` extensions on relative imports (TS `node16`/`nodenext`) | 36 errors | Not Svelte syntax — ESM hygiene. **Required anyway** for the `svelte-package` output (see Caveats). Fix alongside Phase 1. | **Medium** |
| `svelte/legacy` `run()` shims (migration-tool inserted for `$:`) | 9 files | Valid in v5, not idiomatic → convert to `$derived`/`$effect`, drop the `svelte/legacy` import. | **Medium** |
| `on:` directives → `onclick` etc. | 14 files | Deprecated in v5 (not flagged by svelte-check); **breaks in Svelte 6**. | **Low (pre-v6)** |
| `createEventDispatcher` → callback props | 14 files | Deprecated in v5; breaks in Svelte 6. | **Low (pre-v6)** |
| Implicit-`any` / type errors in StateMachineFlow + ErrorReportingStatus | ~40 errors | Pre-existing TS strictness, not v5. | **Low** |

### `state_referenced_locally` — resolution by pattern (do NOT blanket-convert to `$derived`)

- **A. Store singleton capture** (`const authStore = store || getAuthStoreFromContext()`;
  SignInForm/AccountCreationForm/SignInCore/PolicyViewer/ErrorReportingStatus) — **benign**:
  the auth store is a singleton set once and never reassigned; derivations off it already use
  `$derived`. → `// svelte-ignore state_referenced_locally` with a rationale.
- **B. Seeding editable `$state` from props** (`let email = $state(invitationTokenData?.email
  || initialEmail)`; AccountCreationForm, SignInCore) — **intended one-time seed**; converting
  to `$derived` would make fields uneditable. → ignore, UNLESS `invitationTokenData` can arrive
  async, in which case add an `$effect` re-seed. (Verify the prop's source first.)
- **C. Array sized from a prop** (`let digits = $state(Array(maxlength).fill(''))`; CodeInput)
  — only latent bug: won't resize if `maxlength` changes (fixed at 6 in practice). → fix with
  `$derived`/`$effect`, or ignore after confirming `maxlength` is constant.

### Consumer coordination (from the old plan, still relevant)
`flows.thepia.net` and the `thepia-all` monorepo consume flows-auth and must update alongside
the packaging/exports changes (see "Consumer import-path impact" above).

## Recommendation

Do **Phase 0** now to unblock the demos, then schedule **Phases 1–2** as the real fix
(canonical Svelte packaging + core/UI split) — folding in the **High** Svelte-5 tail items
(`svelte` peerDep, `@xyflow/svelte@^1`, `.js` extensions, `state_referenced_locally`) since
they overlap the same edits. Treat the deprecation cleanup (`svelte/legacy`, `on:`,
`createEventDispatcher`) as a pre-Svelte-6 pass, and **Phase 3 (React)** as its own project
once the split is in place.
