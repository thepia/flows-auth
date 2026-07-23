#!/usr/bin/env node
/**
 * Watch mode for the per-target build.
 *
 * Runs the FULL `scripts/build.mjs` (debounced) on any change under src/.
 * We can't just use `svelte-package --watch`: that re-emits dist/svelte/**
 * WITHOUT the `lang="ts"`-stripping post-step (build.mjs step 3b), so the
 * shipped components would still carry TypeScript and break consumers that
 * don't run a TS preprocessor on dependency .svelte. A full rebuild is a couple
 * of seconds and always produces correct, TS-free output.
 */
import { execSync } from 'node:child_process';
import { watch } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const SRC = resolve(ROOT, 'src');

let timer = null;
let building = false;
let queued = false;

function build() {
  if (building) {
    queued = true;
    return;
  }
  building = true;
  try {
    execSync('node scripts/build.mjs', { cwd: ROOT, stdio: 'inherit' });
  } catch {
    // build.mjs already printed the error; keep watching.
  }
  building = false;
  if (queued) {
    queued = false;
    build();
  }
}

console.log('👀 Watching src/ — full rebuild on change (Ctrl-C to stop)');
build();

watch(SRC, { recursive: true }, (_event, filename) => {
  // Ignore the committed Paraglide output (regenerate via `pnpm build:paraglide`).
  if (filename && filename.includes('paraglide')) return;
  clearTimeout(timer);
  timer = setTimeout(build, 150);
});
