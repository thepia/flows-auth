/**
 * Regression Tests for Development Environment / Packaging
 *
 * Guards the 1.2.0 per-target packaging (docs/MULTI_FRAMEWORK_PACKAGING_PLAN.md):
 * agnostic core at `.`, Svelte UI at `./svelte`, flow-viz at `./dev`, ESM-only,
 * built by scripts/build.mjs (tsup + svelte-package). Bundle-content assertions
 * live in build-verification.test.ts and tests/package/*; this file focuses on
 * the package.json contract, the build pipeline wiring, and demo config.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(__dirname, '../..');
const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf-8'));

describe('Development Environment / Packaging Regression Tests', () => {
  describe('package.json exports (post core/svelte split)', () => {
    it('exposes the minimal ESM export surface', () => {
      const e = pkg.exports;
      expect(e['.']).toBeDefined();
      expect(e['./svelte']).toBeDefined();
      expect(e['./dev']).toBeDefined();
      expect(e['./style.css']).toBe('./dist/flows-auth.css');
    });

    it('root `.` is framework-agnostic: types + default only, no svelte/require conditions', () => {
      const main = pkg.exports['.'];
      expect(main.types).toBe('./dist/index.d.ts');
      expect(main.default).toBe('./dist/index.js');
      expect(main.svelte).toBeUndefined();
      expect(main.require).toBeUndefined();
      expect(main.source).toBeUndefined();
    });

    it('./svelte carries the svelte condition -> built svelte-package output', () => {
      const s = pkg.exports['./svelte'];
      expect(s.svelte).toBe('./dist/svelte/index.js');
      expect(s.types).toBe('./dist/svelte/index.d.ts');
    });

    it('dropped the deprecated subpaths and CJS/source conditions', () => {
      expect(pkg.exports['./stores']).toBeUndefined();
      expect(pkg.exports['./stores/core']).toBeUndefined();
      expect(pkg.exports['./types']).toBeUndefined();
      expect(pkg.exports['./src']).toBeUndefined();
      // No top-level `svelte` field pointing at raw TS source anymore.
      expect(pkg.svelte).toBeUndefined();
    });

    it('legacy entry points target the built ESM bundle', () => {
      expect(pkg.main).toBe('./dist/index.js');
      expect(pkg.module).toBe('./dist/index.js');
      expect(pkg.types).toBe('./dist/index.d.ts');
      expect(pkg.type).toBe('module');
    });

    it('declares svelte as a (optional) peer dependency', () => {
      expect(pkg.peerDependencies.svelte).toBeDefined();
      expect(pkg.peerDependenciesMeta?.svelte?.optional).toBe(true);
    });
  });

  describe('build pipeline wiring (tsup + svelte-package, no vite lib build)', () => {
    it('build script drives scripts/build.mjs', () => {
      expect(pkg.scripts.build).toBe('node scripts/build.mjs');
      expect(existsSync(resolve(ROOT, 'scripts/build.mjs'))).toBe(true);
      expect(existsSync(resolve(ROOT, 'tsup.config.ts'))).toBe(true);
      expect(existsSync(resolve(ROOT, 'svelte.config.js'))).toBe(true);
    });

    it('the old vite lib build config is gone', () => {
      expect(existsSync(resolve(ROOT, 'vite.config.ts'))).toBe(false);
    });
  });

  describe('build artifacts (per-target)', () => {
    it('emits core + svelte + css artifacts (ESM, no CJS)', () => {
      const dist = resolve(ROOT, 'dist');
      for (const f of [
        'index.js',
        'index.d.ts',
        'flows-auth.css',
        'svelte/index.js',
        'svelte/index.d.ts',
        'svelte/dev.js'
      ]) {
        expect(existsSync(resolve(dist, f)), `missing dist/${f}`).toBe(true);
      }
      // ESM-only: no CJS bundle.
      expect(existsSync(resolve(dist, 'index.cjs'))).toBe(false);
    });

    it('core bundle does not bundle svelte internals', () => {
      const core = readFileSync(resolve(ROOT, 'dist/index.js'), 'utf-8');
      expect(core).not.toMatch(/from\s+['"]svelte\/internal['"]/);
      expect(core.length).toBeLessThan(800000);
    });
  });

  describe('Component import structure (split surface)', () => {
    it('core exports agnostic logic; svelte target exports components', async () => {
      const { createAuthStore } = await import('@thepia/flows-auth');
      const { SignInForm } = await import('@thepia/flows-auth/svelte');
      expect(typeof createAuthStore).toBe('function');
      expect(SignInForm).toBeDefined();
    }, 30000);

    it('TypeScript definitions are split: createAuthStore at root, SignInForm in ./svelte', () => {
      const rootDts = readFileSync(resolve(ROOT, 'dist/index.d.ts'), 'utf-8');
      const svelteDts = readFileSync(resolve(ROOT, 'dist/svelte/index.d.ts'), 'utf-8');
      expect(rootDts).toMatch(/createAuthStore/);
      expect(rootDts).not.toMatch(/SignInForm/);
      expect(svelteDts).toMatch(/SignInForm/);
    });
  });

  describe('Documentation & demo configuration', () => {
    it('has development documentation', () => {
      const docs = readFileSync(resolve(ROOT, 'docs/README.md'), 'utf-8');
      expect(docs).toMatch(/development/i);
    });

    it('tasks-app-demo has proper Vite config', () => {
      const demoConfig = readFileSync(
        resolve(ROOT, 'examples/tasks-app-demo/vite.config.js'),
        'utf-8'
      );
      expect(demoConfig).toMatch(/noExternal.*flows-auth/);
      expect(demoConfig).toMatch(/dedupe.*svelte/);
      expect(demoConfig).toMatch(/https:/);
    });
  });
});
