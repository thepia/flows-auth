#!/usr/bin/env node
/**
 * Per-target build orchestrator (see docs/MULTI_FRAMEWORK_PACKAGING_PLAN.md).
 *
 *   core   -> tsup           -> dist/index.js (+ .d.ts)     => "."
 *   svelte -> svelte-package -> dist/svelte/**              => "./svelte"
 *   react  -> tsup           -> dist/react/** (+ .d.ts)     => "./react"
 *   server -> tsc (no bundler)-> dist/server/** (+ .d.ts)    => "./server"
 *   css    -> vite (css-only)-> dist/flows-auth.css         => "./style.css" (transitional)
 *
 * Paraglide output under src/core/paraglide is COMMITTED source (regenerate with
 * `pnpm build:paraglide` when messages change); it is bundled into core by tsup
 * and also copied verbatim to dist/paraglide for backward-compatible subpaths.
 *
 * src/server is deliberately outside src/core/ and not part of the "." barrel
 * (see docs/MULTI_FRAMEWORK_PACKAGING_PLAN.md) - it's Deno-native server code
 * with no UI framework dependency, built by plain tsc (no tsup/bundler) so
 * each file's .js/.d.ts pair mirrors its own source path directly.
 */
import { execSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { rollup } from 'rollup';
import dts from 'rollup-plugin-dts';

const ROOT = resolve(import.meta.dirname, '..');
const DIST = resolve(ROOT, 'dist');
// Build into a scratch directory and atomically swap it into place as the
// final step (below), so `dist/` is never observably in a half-wiped state.
// Without this, any concurrent consumer resolving `@thepia/flows-auth/svelte`
// through a pnpm workspace symlink (e.g. an example's dev server running
// alongside `pnpm build:watch`) can hit the multi-second window between the
// old clean-then-rebuild's `rmSync(DIST)` and `dist/svelte/**` reappearing.
const DIST_BUILD = resolve(ROOT, 'dist.build');
const DIST_OLD = resolve(ROOT, 'dist.old');
const run = (cmd) => {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
};

// 1. Clean the scratch dir only — never touch the live `dist/` until the swap.
rmSync(DIST_BUILD, { recursive: true, force: true });
rmSync(DIST_OLD, { recursive: true, force: true });

// 2. Core JS bundle (esbuild via tsup) + core .d.ts tree (tsc). tsc, not tsup's
//    dts engine, because Paraglide's committed output uses string-literal exports.
//    Core first: svelte-package resolves `@thepia/flows-auth` types against it.
run(`tsup --out-dir ${DIST_BUILD}`);
run(`tsc -p tsconfig.build.json --outDir ${DIST_BUILD}`);

// 2b. Work around a tsc declaration-emit bug: re-exporting a string-named binding
//     (Paraglide emits `export { email_label as "email.label" }`) gets its quotes
//     dropped when tsc aggregates it into a barrel .d.ts, producing invalid syntax
//     like `export { email_label as email.label }`. Patch it back in place.
const paraglideMessagesDts = resolve(DIST_BUILD, 'paraglide/messages/_index.d.ts');
if (existsSync(paraglideMessagesDts)) {
  const before = readFileSync(paraglideMessagesDts, 'utf8');
  const after = before.replace(/\bas ([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+)\b/g, 'as "$1"');
  if (after !== before) writeFileSync(paraglideMessagesDts, after);
}

// 2c. Bundle core's per-file .d.ts tree (just emitted by tsc above) into
//     self-contained per-entry declaration files, so the shipped declarations
//     structurally match tsup's single-file-per-entry JS bundle (step 2).
//     Without this, dist/index.d.ts (etc.) contains relative specifiers like
//     `from './utils/i18n.js'` pointing at files that were never emitted as
//     JS (only as .d.ts, by tsc) - harmless for plain `import` (which loads
//     the bundled dist/index.js and never walks the .d.ts graph) but fatal
//     for tools that resolve modules structurally (e.g. Deno's node_modules
//     resolution), which see a missing-file error.
//
//     tsup's own dts:true (used for react, step 3c) can't be reused here: it
//     re-parses the *source* .ts/.js from scratch, and rollup-plugin-dts
//     (tsup's dts engine) can't parse the committed Paraglide output's ES2022
//     string-literal exports (`export { x as "email.label" }`) embedded in
//     executable JS. Bundling tsc's *already-emitted* .d.ts (after the 2b
//     patch) sidesteps that: by that point the string-literal exports are
//     plain declaration-file syntax, which rollup-plugin-dts parses fine.
//     Each entry is bundled in its own `rollup()` call (not one multi-entry
//     call) so entries that share types (e.g. index.d.ts and telemetry.d.ts
//     both use AuthStateEvent) don't get a shared chunk file - that would
//     reintroduce the exact cross-file relative-reference problem this step
//     exists to eliminate, just one level up.
const CORE_ENTRIES = ['index', 'vite-preset', 'telemetry', 'telemetry-otlp'];
const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));
const externalNames = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.peerDependencies ?? {}),
  'svelte' // tsup.config.ts also externalizes svelte/store, svelte/internal
];
const isExternal = (id) => externalNames.some((name) => id === name || id.startsWith(`${name}/`));

for (const entryName of CORE_ENTRIES) {
  const entryPath = resolve(DIST_BUILD, `${entryName}.d.ts`);
  const bundle = await rollup({ input: entryPath, plugins: [dts()], external: isExternal });
  await bundle.write({ file: entryPath, format: 'es' });
  await bundle.close();
}

// 2c-2. The bundled .d.ts above is now self-contained (no cross-file specifiers
//     for rollup-plugin-dts to mis-resolve), but consumers still need to be told
//     it exists at all. Plain `tsc`/Node discover a same-basename .d.ts next to
//     a .js file via `package.json`'s `exports["."].types` - but Deno consumers
//     with `"nodeModulesDir": "none"` (e.g. thepia.com's deno.json) resolve
//     `@thepia/flows-auth` through a raw import-map file path straight to the
//     .js, bypassing package.json entirely, so that pairing never happens and
//     every named type import 404s (TS2305) even though the type is genuinely
//     exported. The `@ts-self-types` pragma is Deno's documented escape hatch
//     for exactly this: an explicit, in-file pointer from the .js to its .d.ts
//     that doesn't depend on package.json-mediated resolution at all.
for (const entryName of CORE_ENTRIES) {
  const entryJs = resolve(DIST_BUILD, `${entryName}.js`);
  if (!existsSync(entryJs)) continue;
  const before = readFileSync(entryJs, 'utf8');
  const pragma = `// @ts-self-types="./${entryName}.d.ts"\n`;
  if (!before.startsWith(pragma)) writeFileSync(entryJs, pragma + before);
}

// Delete the now-orphaned per-file .d.ts tree tsc emitted above - everything
// reachable from the 4 entries was just inlined into them by rollup-plugin-dts.
for (const orphan of ['api', 'constants', 'paraglide', 'stores', 'telemetry', 'types', 'utils']) {
  rmSync(resolve(DIST_BUILD, orphan), { recursive: true, force: true });
}

// 2d. Server target: real JS + .d.ts via plain tsc, no bundler. Each source
//     file's pair mirrors its own path (src/server/foo.ts -> server/foo.js
//     + .d.ts), so there's no bundler-vs-declaration path mismatch here.
run(`tsc -p tsconfig.server.json --outDir ${join(DIST_BUILD, 'server')}`);

// 3. Svelte target (svelte-preprocess transpiles TS, emits per-file .svelte.d.ts)
run(`svelte-package -i src/svelte -o ${join(DIST_BUILD, 'svelte')}`);

// 3b. Strip the now-redundant lang="ts" attribute svelte-preprocess leaves behind,
//     so the shipped .svelte compile without a consumer-side TS preprocessor.
const stripLangTs = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) stripLangTs(p);
    else if (e.name.endsWith('.svelte')) {
      const before = readFileSync(p, 'utf8');
      const after = before.replace(/(<script(?:\s+[^>]*?)?)\s+lang=(["'])ts\2/g, '$1');
      if (after !== before) writeFileSync(p, after);
    }
  }
};
stripLangTs(resolve(DIST_BUILD, 'svelte'));

// 3c. A handful of src/svelte/** files import core internals via a deep relative
//     path (e.g. `import type { X } from '../../core/stores/auth-store.js'`)
//     instead of the package self-import (`from '@thepia/flows-auth'`) that most
//     other src/svelte/** files use - deliberately: self-imports resolve via a
//     tsconfig `paths` alias at dev/typecheck time, but risk resolving through a
//     stale *installed* copy of this very package for tools that don't honor
//     that alias, so plain-relative imports are preferred in this codebase.
//     svelte-package preserves that specifier text verbatim into the emitted
//     .d.ts. That's structurally unresolvable on the dist side no matter which
//     relative path source used: src/core/** is nested under a `core/` dir, but
//     core's dist output is flat at dist/ root (dist/index.js etc, see step 2c),
//     while dist/svelte/** mirrors src/svelte/**'s full depth - so a `core/`
//     path segment that's correct in src/ is never correct in dist/, and since
//     step 2c also bundles core's declarations, the deep file it used to point
//     at (e.g. dist/stores/auth-store.d.ts) no longer exists standalone anyway.
//     Rewrite just the emitted specifier (not the source) to point at core's
//     bundled entry (dist/index.d.ts), which re-exports every public core
//     symbol - keeps src/svelte/** on plain-relative imports while producing a
//     dist that actually resolves.
const CORE_INDEX_DTS = resolve(DIST_BUILD, 'index.d.ts');
const CROSS_CORE_REF = /((?:\.\.\/)+)core\/[^'"]+\.js/g;
const fixCrossCoreRefs = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      fixCrossCoreRefs(p);
      continue;
    }
    if (!e.name.endsWith('.d.ts')) continue;
    const before = readFileSync(p, 'utf8');
    if (!CROSS_CORE_REF.test(before)) continue;
    CROSS_CORE_REF.lastIndex = 0;
    let relToIndex = relative(dirname(p), CORE_INDEX_DTS).replace(/\.d\.ts$/, '.js');
    if (!relToIndex.startsWith('.')) relToIndex = `./${relToIndex}`;
    relToIndex = relToIndex.split(sep).join('/');
    const after = before.replace(CROSS_CORE_REF, relToIndex);
    writeFileSync(p, after);
    console.log(
      `✅ Rewrote cross-core reference(s) in (staged) ${p.replace(`${DIST_BUILD}/`, 'dist/')}`
    );
  }
};
fixCrossCoreRefs(resolve(DIST_BUILD, 'svelte'));

// 3d. React target (tsup, bundled JS + .d.ts) -> dist/react/**
run(`tsup --config tsup.react.config.ts --out-dir ${join(DIST_BUILD, 'react')}`);

// 3e. esbuild (via tsup) auto-extracts any `import './Foo.css'` it encounters bundling
//     src/react/index.ts into a sibling dist/react/index.css. That's a redundant, unlisted
//     byproduct: the canonical stylesheet for BOTH targets is the combined dist/flows-auth.css
//     produced by step 4 below (see src/react/styles-entry.ts for why they're merged).
//     Delete it so there's exactly one CSS file for consumers to discover.
for (const junk of ['react/index.css', 'react/index.css.map']) {
  const p = resolve(DIST_BUILD, junk);
  if (existsSync(p)) rmSync(p);
}

// 3e-2. Same `@ts-self-types` need as core's step 2c-2 above, for the same reason
//     (tsup's dts:true here already produces a self-contained react/index.d.ts,
//     it's the .js->.d.ts pairing that raw-import-map Deno consumers can't do
//     without this pragma).
const reactIndexJs = resolve(DIST_BUILD, 'react/index.js');
if (existsSync(reactIndexJs)) {
  const before = readFileSync(reactIndexJs, 'utf8');
  const pragma = '// @ts-self-types="./index.d.ts"\n';
  if (!before.startsWith(pragma)) writeFileSync(reactIndexJs, pragma + before);
}

// 4. Bundled CSS (transitional ./style.css); JS output is throwaway. Two lib entries
//    (Svelte + React, see vite.css.config.mjs) feed the one combined dist/flows-auth.css.
run(`vite build --config vite.css.config.mjs --outDir ${DIST_BUILD}`);
for (const junk of [
  'svelte-css-only.js',
  'svelte-css-only.js.map',
  'react-css-only.js',
  'react-css-only.js.map'
]) {
  const p = resolve(DIST_BUILD, junk);
  if (existsSync(p)) rmSync(p);
}

// 5. Paraglide: copy committed source to dist/paraglide (backward compat)
const paraglideSrc = resolve(ROOT, 'src/core/paraglide');
if (existsSync(paraglideSrc)) {
  cpSync(paraglideSrc, resolve(DIST_BUILD, 'paraglide'), { recursive: true });
  console.log('✅ Copied paraglide -> (staged) dist/paraglide');
}

// 6. Atomic swap: dist/ is either fully the old build or fully the new one,
// never a half-wiped in-between state visible to a concurrent consumer.
if (existsSync(DIST)) renameSync(DIST, DIST_OLD);
renameSync(DIST_BUILD, DIST);
rmSync(DIST_OLD, { recursive: true, force: true });

console.log(
  '\n✅ Build complete: dist/index.js, dist/svelte/**, dist/react/**, dist/server/**, dist/flows-auth.css'
);
