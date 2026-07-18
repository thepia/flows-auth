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
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const DIST = resolve(ROOT, 'dist');
const run = (cmd) => {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
};

// 1. Clean
rmSync(DIST, { recursive: true, force: true });

// 2. Core JS bundle (esbuild via tsup) + core .d.ts tree (tsc). tsc, not tsup's
//    dts engine, because Paraglide's committed output uses string-literal exports.
//    Core first: svelte-package resolves `@thepia/flows-auth` types against it.
run('tsup');
run('tsc -p tsconfig.build.json');

// 3. Svelte target (svelte-preprocess transpiles TS, emits per-file .svelte.d.ts)
run('svelte-package -i src/svelte -o dist/svelte');

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
stripLangTs(resolve(DIST, 'svelte'));

// 4. Bundled CSS (transitional ./style.css); JS output is throwaway
run('vite build --config vite.css.config.mjs');
for (const junk of ['__css-only.js', '__css-only.js.map']) {
  const p = resolve(DIST, junk);
  if (existsSync(p)) rmSync(p);
}

// 5. Paraglide: copy committed source to dist/paraglide (backward compat)
const paraglideSrc = resolve(ROOT, 'src/core/paraglide');
if (existsSync(paraglideSrc)) {
  cpSync(paraglideSrc, resolve(DIST, 'paraglide'), { recursive: true });
  console.log('✅ Copied paraglide -> dist/paraglide');
}

console.log('\n✅ Build complete: dist/index.js, dist/svelte/**, dist/flows-auth.css');
