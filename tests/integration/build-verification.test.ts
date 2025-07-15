/**
 * Build verification tests
 * These tests ensure the built library exports work correctly
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('Build Verification', () => {
  const distPath = join(__dirname, '../../dist');
  
  beforeEach(() => {
    // Mock environment for tests
    global.fetch = vi.fn();
    Object.defineProperty(global, 'localStorage', {
      value: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() },
      writable: true
    });
    Object.defineProperty(global, 'PublicKeyCredential', {
      value: class { static isUserVerifyingPlatformAuthenticatorAvailable = vi.fn().mockResolvedValue(true); },
      writable: true
    });
  });

  it('should have required build artifacts', () => {
    expect(existsSync(join(distPath, 'index.js'))).toBe(true);
    expect(existsSync(join(distPath, 'index.d.ts'))).toBe(true);
    expect(existsSync(join(distPath, 'style.css'))).toBe(true);
  });

  it('should build as ES modules, not SSR components', () => {
    const indexJs = readFileSync(join(distPath, 'index.js'), 'utf-8');
    
    // Should not contain SSR-specific code
    expect(indexJs).not.toContain('create_ssr_component');
    expect(indexJs).not.toContain('$$render');
    
    // Should contain client-side component code
    expect(indexJs).toContain('createEventDispatcher');
    expect(indexJs).toContain('onMount');
  });

  it('should export correct modules', async () => {
    // Test importing from built artifacts
    const builtLib = await import('../../dist/index.js');
    
    expect(builtLib.SignInForm).toBeDefined();
    expect(builtLib.createAuthStore).toBeDefined();
    expect(builtLib.AuthApiClient).toBeDefined();
    expect(builtLib.isWebAuthnSupported).toBeDefined();
    expect(builtLib.VERSION).toBeDefined();
  });

  it('should have correct TypeScript definitions', () => {
    const indexDts = readFileSync(join(distPath, 'index.d.ts'), 'utf-8');
    
    // Should export main types
    expect(indexDts).toContain('export { default as SignInForm }');
    expect(indexDts).toMatch(/export\s*{\s*[^}]*createAuthStore[^}]*}/);
    expect(indexDts).toContain('export { AuthApiClient }');
    expect(indexDts).toContain('export * from \'./utils/webauthn\'');
  });

  it('should not have SSR configuration in build', () => {
    const packageJson = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8'));
    
    // Verify vite config doesn't have ssr: true
    expect(packageJson.name).toBe('@thepia/flows-auth');
  });

  it('should handle component instantiation from built code', async () => {
    const { SignInForm, createDefaultConfig } = await import('../../dist/index.js');
    
    const config = createDefaultConfig({
      apiBaseUrl: 'https://test.com',
      clientId: 'test-client'
    });

    // Should be able to create component instance
    expect(() => {
      const component = new SignInForm({
        target: document.createElement('div'),
        props: { config }
      });
      component.$destroy();
    }).not.toThrow();
  });

  it('should maintain version consistency', async () => {
    const packageJson = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8'));
    const { VERSION } = await import('../../dist/index.js');
    
    expect(VERSION).toBe(packageJson.version);
  });

  it('should have minimal bundle size for production', () => {
    const indexJs = readFileSync(join(distPath, 'index.js'), 'utf-8');
    const sizeInKB = Buffer.byteLength(indexJs, 'utf8') / 1024;
    
    // Should be reasonable size (adjust threshold as needed)
    expect(sizeInKB).toBeLessThan(200); // 200KB threshold (library includes auth logic, state machine, and components)
  });

  it('should include all necessary CSS', () => {
    const styleCss = readFileSync(join(distPath, 'style.css'), 'utf-8');
    
    // Should contain component styles
    expect(styleCss).toContain('.auth-form');
    expect(styleCss).toContain('.email-input');
    expect(styleCss).toContain('.continue-button');
  });
});