#!/usr/bin/env node
/**
 * Runs a real Vite production build over debug-consumer.ts and prints the
 * resulting chunk to stdout. Invoked as a child process (not imported
 * in-process) so it runs in a clean Node environment, independent of
 * vitest's jsdom test environment/setup files -- see
 * ../debug-log-stripping.test.ts.
 *
 * Usage: node run-debug-build.mjs [debug]
 *   (no arg)  -> default production build, DEBUG unset
 *   "debug"   -> DEBUG=true, with DEBUG opted into envPrefix (as README instructs)
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../..');
const FIXTURE = resolve(__dirname, 'debug-consumer.ts');

const debugEnabled = process.argv[2] === 'debug';

if (debugEnabled) {
  process.env.DEBUG = 'true';
} else {
  delete process.env.DEBUG;
}

const result = await build({
  root: ROOT,
  configFile: false,
  logLevel: 'silent',
  envPrefix: debugEnabled ? ['VITE_', 'DEBUG'] : ['VITE_'],
  build: {
    write: false,
    minify: 'esbuild',
    rollupOptions: {
      input: FIXTURE,
      // Rollup defaults to treating any property read as a potential side
      // effect (getters, proxies). That conservatism isn't specific to our
      // debug() calls -- it inflates what Rollup keeps across the whole
      // reachable graph, which in turn affects how much esbuild's later
      // minify pass can prove is dead. Confirmed empirically: this single
      // option was the difference between 0/79 and full elimination.
      treeshake: { propertyReadSideEffects: false }
    }
  }
});

const output = Array.isArray(result) ? result[0] : result;
const chunk = output.output.find((o) => o.type === 'chunk');

if (!chunk) {
  console.error('No JS chunk produced by the fixture build');
  process.exit(1);
}

process.stdout.write(chunk.code);
