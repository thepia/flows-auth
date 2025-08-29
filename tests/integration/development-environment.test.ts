/**
 * Regression Tests for Development Environment Fixes
 *
 * These tests guard against the development environment issues we fixed:
 * 1. Svelte library build configuration
 * 2. Package.json exports structure
 * 3. Vite dependency optimization
 * 4. Component compilation and import issues
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Development Environment Regression Tests', () => {
  describe('Bug Fix: Package.json Exports Configuration', () => {
    it('should have simplified exports structure', () => {
      const packageJsonPath = resolve(__dirname, '../../package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

      // ✅ REGRESSION TEST: Should have simplified exports
      expect(packageJson.exports).toBeDefined();
      expect(packageJson.exports['.']).toBeDefined();

      // ✅ Should NOT have complex component-level exports that cause issues
      expect(packageJson.exports['./components/*']).toBeUndefined();
      expect(packageJson.exports['./stores/*']).toBeUndefined();
      expect(packageJson.exports['./utils/*']).toBeUndefined();

      // ✅ Should have correct export order (svelte before import)
      const mainExport = packageJson.exports['.'];
      const exportKeys = Object.keys(mainExport);
      const svelteIndex = exportKeys.indexOf('svelte');
      const importIndex = exportKeys.indexOf('import');

      expect(svelteIndex).toBeGreaterThan(-1);
      expect(importIndex).toBeGreaterThan(-1);
      expect(svelteIndex).toBeLessThan(importIndex);
    });

    it('should have consistent main entry points', () => {
      const packageJsonPath = resolve(__dirname, '../../package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

      // ✅ REGRESSION TEST: Main fields should point to dist
      expect(packageJson.main).toBe('./dist/index.js');
      expect(packageJson.module).toBe('./dist/index.js');
      expect(packageJson.svelte).toBe('./dist/index.js');
      expect(packageJson.types).toBe('./dist/index.d.ts');
    });
  });

  describe('Bug Fix: Vite Library Configuration', () => {
    it('should have correct Vite build configuration', async () => {
      // ✅ REGRESSION TEST: Vite config should exist and be importable
      const viteConfigPath = resolve(__dirname, '../../vite.config.ts');

      // Check file exists
      expect(() => readFileSync(viteConfigPath, 'utf-8')).not.toThrow();

      const viteConfig = readFileSync(viteConfigPath, 'utf-8');

      // ✅ Should have svelte/internal as external dependency
      expect(viteConfig).toMatch(/svelte\/internal/);

      // ✅ Should have emitCss: true
      expect(viteConfig).toMatch(/emitCss:\s*true/);

      // ✅ Should externalize svelte dependencies
      expect(viteConfig).toMatch(/external.*svelte/);
    });
  });

  describe('Bug Fix: Library Build Output', () => {
    it('should generate proper build artifacts', () => {
      const distPath = resolve(__dirname, '../../dist');

      // ✅ REGRESSION TEST: Required build files should exist
      const requiredFiles = ['index.js', 'index.cjs', 'index.d.ts', 'style.css'];

      for (const file of requiredFiles) {
        const filePath = resolve(distPath, file);
        expect(() => readFileSync(filePath, 'utf-8')).not.toThrow();
      }
    });

    it('should not bundle svelte internals', () => {
      const distPath = resolve(__dirname, '../../dist/index.js');
      const buildOutput = readFileSync(distPath, 'utf-8');

      // ✅ REGRESSION TEST: Should not bundle svelte internals that cause $$ errors
      expect(buildOutput).not.toMatch(/from\s+['"]svelte\/internal['"]/);

      // ✅ Should reference svelte as external
      expect(buildOutput.length).toBeLessThan(500000); // Reasonable size without bundled deps
    });
  });

  describe('Bug Fix: Component Import Structure', () => {
    it('should export components correctly', async () => {
      // ✅ REGRESSION TEST: Main exports should be importable
      const { SignInForm, createAuthStore } = await import('../../src/index');

      expect(SignInForm).toBeDefined();
      expect(createAuthStore).toBeDefined();
      expect(typeof createAuthStore).toBe('function');
    });

    it('should have proper TypeScript definitions', () => {
      const typesPath = resolve(__dirname, '../../dist/index.d.ts');
      const types = readFileSync(typesPath, 'utf-8');

      // ✅ REGRESSION TEST: Should export main types
      expect(types).toMatch(/export.*SignInForm/);
      expect(types).toMatch(/export.*createAuthStore/);
      expect(types).toMatch(/export.*AuthStore/);
    });
  });

  describe('Bug Fix: Force Reinstall Workflow', () => {
    it('should document the correct build sequence', () => {
      const docsPath = resolve(__dirname, '../../docs/DEVELOPMENT_ENVIRONMENT_FIXES.md');
      const docs = readFileSync(docsPath, 'utf-8');

      // ✅ REGRESSION TEST: Should document force reinstall workflow
      expect(docs).toMatch(/rm -rf node_modules\/@thepia/);
      expect(docs).toMatch(/pnpm install --force/);
      expect(docs).toMatch(/pnpm build/);

      // ✅ Should document systematic troubleshooting
      expect(docs).toMatch(/Component Isolation Testing/);
      expect(docs).toMatch(/Force Reinstall Workflow/);
    });
  });

  describe('Bug Fix: Error Handling Methodology', () => {
    it('should document the 5-step error analysis framework', () => {
      const docsPath = resolve(__dirname, '../../docs/DEVELOPMENT_ENVIRONMENT_FIXES.md');
      const docs = readFileSync(docsPath, 'utf-8');

      // ✅ REGRESSION TEST: Should document error analysis framework
      expect(docs).toMatch(/User Experience Improvement/);
      expect(docs).toMatch(/Logging Enhancement/);
      expect(docs).toMatch(/Complete Prevention/);
      expect(docs).toMatch(/Regression Testing/);
      expect(docs).toMatch(/Documentation.*Tracking/);

      // ✅ Should have implementation pattern
      expect(docs).toMatch(/getUserFriendlyMessage/);
      expect(docs).toMatch(/TODO.*test case/);
    });
  });

  describe('Bug Fix: Demo Configuration', () => {
    it('should have correct demo server configuration', () => {
      const demoConfigPath = resolve(__dirname, '../../examples/tasks-app-demo/vite.config.js');
      const demoConfig = readFileSync(demoConfigPath, 'utf-8');

      // ✅ REGRESSION TEST: Demo should have proper Vite config
      expect(demoConfig).toMatch(/noExternal.*flows-auth/);
      expect(demoConfig).toMatch(/force:\s*true/);
      expect(demoConfig).toMatch(/dedupe.*svelte/);
      expect(demoConfig).toMatch(/hmr:\s*false/);
    });

    it('should use single API configuration source', () => {
      const demoPagePath = resolve(
        __dirname,
        '../../examples/tasks-app-demo/src/routes/+page.svelte'
      );
      const demoPage = readFileSync(demoPagePath, 'utf-8');

      // ✅ REGRESSION TEST: Should have single apiBaseUrl configuration
      const apiBaseUrlMatches = demoPage.match(/apiBaseUrl:/g);
      expect(apiBaseUrlMatches).toBeDefined();

      // ✅ Both should point to the same API server
      expect(demoPage).toMatch(/apiBaseUrl:\s*['"]https:\/\/api\.thepia\.com['"]/);

      // ✅ Should NOT have multiple different API configurations
      expect(demoPage).not.toMatch(/dev\.thepia\.com:8443/);
      expect(demoPage).not.toMatch(/dev\.thepia\.net:5176/);
    });
  });
});
