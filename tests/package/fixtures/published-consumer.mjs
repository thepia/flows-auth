#!/usr/bin/env node
/**
 * Imports the BUILT, published dist exactly as a non-Vite consumer would --
 * plain Node, no transform -- so `import.meta.env` is genuinely `undefined`
 * at runtime. This reproduces the 1.3.0 crash where dist shipped a literal
 * `import.meta.env.DEBUG` that only a Vite-family bundler would statically
 * replace (see ../published-import-meta-env-safety.test.ts for the why).
 *
 * Run as a child process (never imported in-process) so vitest's Vite
 * transform never touches the module under test -- that transform is exactly
 * what masked the bug in the workspace dev setup.
 *
 * Usage: node published-consumer.mjs <core|svelte-debug>
 *   core          -> import the core entry and call createAuthStore(config)
 *   svelte-debug  -> import the Svelte debug util and call debug()
 * Prints "OK" and exits 0 on success; throws (non-zero exit) on the bug.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const target = process.argv[2];

// A minimal, side-effect-free config; passkeys/magic-links off so
// construction stays local (no network, no browser APIs).
const config = {
  apiBaseUrl: 'https://api.thepia.com',
  domain: 'thepia.net',
  clientId: 'test-client',
  enablePasskeys: false,
  enableMagicLinks: false
};

const importDist = (rel) => import(pathToFileURL(resolve(ROOT, rel)).href);

if (target === 'core') {
  const { createAuthStore } = await importDist('dist/index.js');
  createAuthStore(config);
} else if (target === 'svelte-debug') {
  const { debug } = await importDist('dist/svelte/utils/debug.js');
  debug('smoke');
} else {
  throw new Error(`unknown target: ${target}`);
}

console.log('OK');
