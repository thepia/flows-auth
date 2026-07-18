/**
 * Tree-Shaking Tests for Built Package
 *
 * Verifies that the per-target build (flows-auth 1.2.0) is structured so
 * consuming bundlers can tree-shake effectively:
 *   - the CORE entry ("."; dist/index.js) is ESM-only with named exports,
 *   - Svelte components live behind "./svelte" (dist/svelte/index.js), and
 *   - heavy flow-viz components live behind "./dev" (dist/svelte/dev.js),
 *     so importing core never pulls in @xyflow/svelte.
 *
 * The old per-store subpath exports (./stores, ./stores/core, ...) were REMOVED
 * in the packaging refactor, so the deep-import assertions that targeted them
 * are gone.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(__dirname, '../..');

describe('Tree-Shaking Support (Built Package)', () => {
  it('should support selective imports from the core entry point', async () => {
    // Simulates: import { createAuthStore } from '@thepia/flows-auth'
    const core = await import('../../dist/index.js');

    expect(core.createAuthStore).toBeDefined();
    expect(typeof core.createAuthStore).toBe('function');
  });

  it('should ship core as ESM with named exports (statically analysable)', async () => {
    // Named exports (not a single default blob) are what let bundlers drop
    // unused code. Core must NOT drag in Svelte components either.
    const core = await import('../../dist/index.js');
    const names = Object.keys(core);

    expect(names.length).toBeGreaterThan(10);
    expect(names).toContain('createAuthStore');
    expect(names).toContain('AuthApiClient');

    // No Svelte components / makeSvelteCompatible in core.
    expect(core.SignInForm).toBeUndefined();
    expect(core.makeSvelteCompatible).toBeUndefined();
  });

  it('should keep flow-viz (@xyflow/svelte) out of core and behind ./dev', async () => {
    const core = await import('../../dist/index.js');

    // Flow components are only reachable via ./dev, so importing core stays light.
    expect(core.TestFlow).toBeUndefined();
    expect(core.SessionStateMachineFlow).toBeUndefined();
    expect(core.SignInStateMachineFlow).toBeUndefined();

    const dev = await import('../../dist/svelte/dev.js');
    expect(dev.TestFlow).toBeDefined();
    expect(dev.SessionStateMachineFlow).toBeDefined();
    expect(dev.SignInStateMachineFlow).toBeDefined();
  }, 30000);

  it('should expose Svelte components behind the ./svelte entry only', async () => {
    // Simulates: import { SignInForm } from '@thepia/flows-auth/svelte'
    const svelte = await import('../../dist/svelte/index.js');

    expect(svelte.SignInForm).toBeDefined();
    expect(svelte.AccountCreationForm).toBeDefined();
    expect(typeof svelte.makeSvelteCompatible).toBe('function');
  });

  it('should be able to create a working auth store from the core bundle', async () => {
    const core = await import('../../dist/index.js');
    const store = core.createAuthStore({
      apiBaseUrl: 'https://api.test.com',
      clientId: 'test-client',
      domain: 'test.com',
      enablePasskeys: true
    });

    expect(store).toBeDefined();
    expect(typeof store.signInWithPasskey).toBe('function');
    expect(typeof store.sendEmailCode).toBe('function'); // email auth included in the full store
  });

  it('should verify the built entry points referenced by package.json exports exist', async () => {
    const packageJson = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf-8'));

    // Every non-passthrough export target must exist on disk.
    const targets = [
      packageJson.exports['.'].default,
      packageJson.exports['./svelte'].default,
      packageJson.exports['./dev'].default,
      packageJson.exports['./style.css']
    ];

    for (const target of targets) {
      const fullPath = resolve(ROOT, target);
      expect(existsSync(fullPath), `Missing export target: ${target}`).toBe(true);
    }

    // The removed store subpaths must not be present.
    expect(packageJson.exports['./stores']).toBeUndefined();
    expect(packageJson.exports['./stores/core']).toBeUndefined();
  });

  it('should document real-world usage patterns for optimal tree-shaking', () => {
    // Consuming projects import from the three public entry points; unused
    // exports within each are tree-shaken by the bundler.
    const usageExamples = {
      'Core auth (agnostic)': `import { createAuthStore } from '@thepia/flows-auth'`,
      'Svelte components': `import { SignInForm } from '@thepia/flows-auth/svelte'`,
      'Dev/flow-viz components': `import { TestFlow } from '@thepia/flows-auth/dev'`,
      'Bundled styles': `import '@thepia/flows-auth/style.css'`
    };

    expect(Object.keys(usageExamples).length).toBe(4);

    console.log('📚 Tree-shaking usage patterns:');
    for (const [description, importStatement] of Object.entries(usageExamples)) {
      console.log(`  ${description}: ${importStatement}`);
    }
  });
});
