#!/usr/bin/env node
/**
 * Per-target build orchestrator (see docs/MULTI_FRAMEWORK_PACKAGING_PLAN.md).
 *
 *   core   -> tsup           -> dist/index.js (+ .d.ts)     => "."
 *   svelte -> svelte-package -> dist/svelte/**              => "./svelte"
 *   css    -> vite (css-only)-> dist/flows-auth.css         => "./style.css" (transitional)
 *
 * Paraglide output under src/core/paraglide is COMMITTED source (regenerate with
 * `pnpm build:paraglide` when messages change); it is bundled into core by tsup
 * and also copied verbatim to dist/paraglide for backward-compatible subpaths.
 *
 * src/server (Deno target) is intentionally NOT built here.
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
import { join, resolve } from 'node:path';

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

// 4. Bundled CSS (transitional ./style.css); JS output is throwaway
run(`vite build --config vite.css.config.mjs --outDir ${DIST_BUILD}`);
for (const junk of ['__css-only.js', '__css-only.js.map']) {
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

console.log('\n✅ Build complete: dist/index.js, dist/svelte/**, dist/flows-auth.css');
