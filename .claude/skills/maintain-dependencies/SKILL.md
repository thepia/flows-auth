---
name: maintain-dependencies
description: Use when updating dependencies, bumping package versions, running `pnpm outdated`/`pnpm update`, fixing Biome formatting/lint errors, or resolving phantom typecheck failures in flows-auth. Encodes the Svelte-4 compatibility matrix, the safe-update procedure, and the browser-vs-Node code boundary.
---

# Maintaining flows-auth dependencies & formatting

flows-auth is a **client-side Svelte library pinned to Svelte 4**. Most dependency
and formatting mistakes come from (a) bumping a package whose new major requires
Svelte 5, (b) leaving the install out of sync with `package.json`, or (c) treating
the whole repo as one environment. This skill prevents all three.

## Golden rules

1. **Do NOT move off Svelte 4** without an explicit, planned migration. Many dev
   dependencies have a hard Svelte-5 boundary (see matrix). A "bump everything to
   latest" will silently pull the toolchain to Svelte 5 and break the build.
2. **Always `pnpm install` after editing `package.json`.** A stale `node_modules`
   (lockfile resolved against different ranges) produces *phantom* errors — e.g.
   vitest 4 being installed while `package.json` says vitest 1 makes `tsc` report
   missing Node globals. If typecheck/lint errors look bizarre, first confirm the
   installed versions match `package.json` (`cat node_modules/<pkg>/package.json | grep version`).
3. **`src/` is browser-only. Tests and `*.config.ts` are the Node side.** Never
   add Node usage to `src/` (see "Code environment boundaries").
4. **Never change the Biome *rule set*** — `biome.json` rules are a synchronized
   cross-repo standard. Only `files.ignore` (paths) is repo-local and safe to edit.

## Svelte-4 dependency compatibility matrix

The constraint chain that forces most of these:
`Svelte 4 → vite-plugin-svelte 3 → Vite 5 → vitest ≤ 3`.

| Package | Pin (Svelte 4) | Why — what the next major requires |
|---|---|---|
| `svelte` | `^4.0.0` | v5 is the migration; do not bump casually |
| `@sveltejs/vite-plugin-svelte` | `^3.1.2` | v4+ requires Svelte 5 + Vite 6/7 |
| `vite` | `^5.0.0` | Vite 6 needs plugin 5 → Svelte 5 |
| `vite-plugin-dts` | `^4.5.4` | v5 wants Vite 6+ |
| `@testing-library/svelte` | `^4.0.0` | v5 is Svelte-5 only |
| `svelte-check` | `^3.0.0` | v4 targets Svelte 5 |
| `vitest` / `@vitest/coverage-v8` / `@vitest/ui` | same major, **≤ `^3`** | vitest 4 needs Vite 6+. **All three move together.** |
| `svelte-preprocess` | `^6.0.3` | fine on Svelte 4/5 |
| `@xyflow/svelte` (peerDep) | `0.1.30` (pinned) | v1 requires Svelte 5 |
| `typescript` | `^5.0.0` | TS 6 unsupported by the svelte-check 3 toolchain |
| `@biomejs/biome` | `^1.9.4` | Biome 2 = config migration + cross-repo coordination; do separately |
| `zod`, `zustand`, `@simplewebauthn/browser`, `@inlang/paraglide-js`, `@dagrejs/dagre`, `jsdom`, `cross-env`, `dotenv-cli`, `sharp` | latest within range | Not Svelte-coupled — safe to bump |

**`@simplewebauthn/browser`**: keep its major in sync with the server's
`@simplewebauthn/server` (in thepia.com's API) so attestation/assertion formats match.

**Node floor = 22** (CI `NODE_VERSION`, all workflows, and `engines.node`). Some "safe"
deps are coupled to the Node major: `jsdom` ≥24 needs Node 20+, and `@types/node`'s major
should track the Node floor (currently `^22`). When bumping either, confirm CI's Node
version still satisfies it — a `jsdom` bump on a too-old CI Node breaks `pnpm install --frozen-lockfile`.
`engines.node` is consumer-facing: only raise it if all consuming thepia repos are on that floor.

## Dependency-update procedure

1. `pnpm outdated` to list candidates.
2. For each, check the matrix. **Reject** any bump whose new major is Svelte-5-coupled.
3. Keep the three `@vitest/*` packages on a single major (≤ 3).
4. Edit ranges in `package.json`.
5. **`pnpm install`** — resync lockfile + `node_modules` to the new ranges.
6. `pnpm validate` (= `typecheck && check && test`) and `pnpm build`.
7. Removing/locking a public API or requiring new config is a **breaking change** —
   bump the major version and add a CHANGELOG note.

## Formatting & lint workflow

- Fix: `pnpm check:fix` (Biome `check --write`). Verify: `pnpm check`.
- `biome.json` `files.ignore` excludes framework-scaffold examples
  (`examples/angular-demo`, `examples/astro-demo`) and generated `.beads/**`.
  The Svelte examples stay linted. Add new non-conforming example workspaces here
  rather than fighting their conventions.
- Specs import vitest functions explicitly (`import { describe, it, expect } from 'vitest'`),
  so Biome lints them fine — do not add vitest names as global declarations.

## Code environment boundaries

`src/` ships to browsers — it must contain **zero** Node usage:

| Don't (Node) | Do (browser-safe) |
|---|---|
| `NodeJS.Timeout` | `ReturnType<typeof setTimeout>` |
| `process.env.NODE_ENV` | `import.meta.env?.PROD` / `import.meta.env.MODE` |
| `require('./x')` | static `import` (or `await import('./x')`) |
| `fs` / `path` / `Buffer` / `__dirname` | not allowed in `src/` |

Tests (`tests/**`) and config (`*.config.ts`) are the **Node** side: Node globals are
fine, and Node builtins must use the `node:` import protocol (`import { resolve } from 'node:path'`).

Note: `tsconfig.json` currently *excludes* `tests` and doesn't include `*.config.ts`,
so those are **not type-checked**. To check them with Node types without polluting
`src/`, add a `tsconfig.node.json` (`extends` base, `types: ["node","vitest/globals"]`,
`include: ["tests/**/*","*.config.ts"]`) and run `tsc -p` on it as a second typecheck step.
