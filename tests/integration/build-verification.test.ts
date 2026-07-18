/**
 * Build verification tests
 *
 * Validates the per-target build (docs/MULTI_FRAMEWORK_PACKAGING_PLAN.md):
 *   - `.`        -> dist/index.js (+ .d.ts)   framework-agnostic core, NO components
 *   - `./svelte` -> dist/svelte/index.js       Svelte UI + Svelte helpers
 *   - `./style.css` -> dist/flows-auth.css
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('Build Verification', () => {
  const distPath = join(__dirname, '../../dist');

  beforeEach(() => {
    global.fetch = vi.fn();
    Object.defineProperty(global, 'localStorage', {
      value: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() },
      writable: true
    });
    Object.defineProperty(global, 'PublicKeyCredential', {
      value: class {
        static isUserVerifyingPlatformAuthenticatorAvailable = vi.fn().mockResolvedValue(true);
      },
      writable: true
    });
  });

  it('should have required core build artifacts', () => {
    expect(existsSync(join(distPath, 'index.js'))).toBe(true);
    expect(existsSync(join(distPath, 'index.d.ts'))).toBe(true);
    expect(existsSync(join(distPath, 'flows-auth.css'))).toBe(true);
  });

  it('should have required Svelte-target build artifacts', () => {
    expect(existsSync(join(distPath, 'svelte/index.js'))).toBe(true);
    expect(existsSync(join(distPath, 'svelte/index.d.ts'))).toBe(true);
    // Components ship as preprocessed (TS-free) .svelte with per-file .d.ts.
    expect(existsSync(join(distPath, 'svelte/components/SignInForm.svelte'))).toBe(true);
    expect(existsSync(join(distPath, 'svelte/components/SignInForm.svelte.d.ts'))).toBe(true);
  });

  it('should ship TS-free .svelte (no lang="ts", no type syntax)', () => {
    const comp = readFileSync(join(distPath, 'svelte/components/SignInForm.svelte'), 'utf-8');
    expect(comp).not.toContain('lang="ts"');
    expect(comp).not.toContain('import type');
    expect(comp).not.toContain('interface Props');
  });

  it('core bundle must be framework-agnostic (no bundled Svelte component code)', () => {
    const indexJs = readFileSync(join(distPath, 'index.js'), 'utf-8');
    expect(indexJs).not.toContain('create_ssr_component');
    expect(indexJs).not.toContain('$$render');
    // Components live in the ./svelte target now, not the core bundle.
    expect(indexJs).not.toContain('createEventDispatcher');
  });

  it('core `.` exports agnostic logic only (no components)', async () => {
    const builtLib = await import('../../dist/index.js');

    expect(builtLib.createAuthStore).toBeDefined();
    expect(builtLib.AuthApiClient).toBeDefined();
    expect(builtLib.isWebAuthnSupported).toBeDefined();
    expect(builtLib.VERSION).toBeDefined();
    // Components are NOT on the root anymore.
    expect(builtLib.SignInForm).toBeUndefined();
    expect(builtLib.makeSvelteCompatible).toBeUndefined();
  });

  it('should have correct core TypeScript definitions', () => {
    const indexDts = readFileSync(join(distPath, 'index.d.ts'), 'utf-8');

    expect(indexDts).toMatch(/export\s*{\s*[^}]*createAuthStore[^}]*}/);
    expect(indexDts).toContain('AuthApiClient');
    expect(indexDts).toContain('isWebAuthnSupported');
    expect(indexDts).toContain('VERSION');
    // No component declarations at the root.
    expect(indexDts).not.toContain('SignInForm');
  });

  it('should have correct Svelte-target TypeScript definitions', () => {
    const svelteDts = readFileSync(join(distPath, 'svelte/index.d.ts'), 'utf-8');
    expect(svelteDts).toContain('SignInForm');
    expect(svelteDts).toContain('makeSvelteCompatible');
  });

  it('should export components + Svelte helpers from the ./svelte target', async () => {
    const { SignInCore, SignInForm, makeSvelteCompatible } = await import(
      '../../dist/svelte/index.js'
    );
    expect(typeof SignInCore).toBe('function');
    expect(typeof SignInForm).toBe('function');
    expect(typeof makeSvelteCompatible).toBe('function');
  });

  it('makeSvelteCompatible (from ./svelte) wraps a core store', async () => {
    const { createAuthStore } = await import('../../dist/index.js');
    const { makeSvelteCompatible } = await import('../../dist/svelte/index.js');

    const baseStore = createAuthStore({
      apiBaseUrl: 'https://test.com',
      clientId: 'test-client',
      domain: 'test.com',
      appCode: 'test-app',
      enablePasskeys: true,
      enableMagicLinks: false
    });
    const authStore = makeSvelteCompatible(baseStore);
    expect(typeof authStore.subscribe).toBe('function');
  });

  it('should maintain version consistency (VERSION === package.json version)', async () => {
    const packageJson = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8'));
    const { VERSION } = await import('../../dist/index.js');
    expect(VERSION).toBe(packageJson.version);
  });

  it('core bundle should be a reasonable size', () => {
    const indexJs = readFileSync(join(distPath, 'index.js'), 'utf-8');
    const sizeInKB = Buffer.byteLength(indexJs, 'utf8') / 1024;
    expect(sizeInKB).toBeLessThan(800);
  });

  it('should include component CSS in the bundled stylesheet', () => {
    const styleCss = readFileSync(join(distPath, 'flows-auth.css'), 'utf-8');
    expect(styleCss.length).toBeGreaterThan(1000);
  });
});
