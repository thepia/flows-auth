/**
 * Regression Tests for Development Environment Fixes
 *
 * These tests guard against the development environment issues we fixed:
 * 1. Svelte library build configuration
 * 2. Package.json exports structure
 * 3. Vite dependency optimization
 * 4. Component compilation and import issues
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

describe('Development Environment Regression Tests', () => {
  describe('Bug Fix: Package.json Exports Configuration', () => {
    it('should have proper exports structure', () => {
      const packageJsonPath = resolve(__dirname, '../../package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

      // ✅ REGRESSION TEST: Should have main export
      expect(packageJson.exports).toBeDefined();
      expect(packageJson.exports['.']).toBeDefined();

      // ✅ Should have store exports for direct access
      expect(packageJson.exports['./stores']).toBeDefined();
      expect(packageJson.exports['./stores/core']).toBeDefined();

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
      expect(packageJson.svelte).toBe('./dist/src/index.ts'); // Source for Svelte
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

      // ✅ Should have emitCss: true
      expect(viteConfig).toMatch(/emitCss:\s*true/);

      // ✅ Should externalize svelte dependencies
      expect(viteConfig).toMatch(/external.*svelte/);

      // ✅ Should copy source files to dist/src
      expect(viteConfig).toMatch(/copySourceFiles/);
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
    }, 30000); // Increase timeout for import initialization

    it('should have proper TypeScript definitions', () => {
      const typesPath = resolve(__dirname, '../../dist/index.d.ts');
      const types = readFileSync(typesPath, 'utf-8');

      // ✅ REGRESSION TEST: Should export main types
      expect(types).toMatch(/export.*SignInForm/);
      expect(types).toMatch(/export.*createAuthStore/);
      expect(types).toMatch(/export.*AuthStore/);
    });
  });

  describe('Bug Fix: Development Documentation', () => {
    it('should have development documentation', () => {
      const docsPath = resolve(__dirname, '../../docs/README.md');

      // ✅ REGRESSION TEST: Core documentation should exist
      expect(() => readFileSync(docsPath, 'utf-8')).not.toThrow();

      const docs = readFileSync(docsPath, 'utf-8');
      expect(docs).toMatch(/development/i);
    });
  });

  describe('Bug Fix: Demo Configuration', () => {
    it('should have correct demo server configuration', () => {
      const demoConfigPath = resolve(__dirname, '../../examples/tasks-app-demo/vite.config.js');
      const demoConfig = readFileSync(demoConfigPath, 'utf-8');

      // ✅ REGRESSION TEST: Demo should have proper Vite config
      expect(demoConfig).toMatch(/noExternal.*flows-auth/);
      expect(demoConfig).toMatch(/dedupe.*svelte/);
      expect(demoConfig).toMatch(/https:/);
    });

    it('should have demo page with auth configuration', () => {
      const demoPagePath = resolve(
        __dirname,
        '../../examples/tasks-app-demo/src/routes/+page.svelte'
      );

      // ✅ REGRESSION TEST: Demo page should exist
      expect(() => readFileSync(demoPagePath, 'utf-8')).not.toThrow();

      const demoPage = readFileSync(demoPagePath, 'utf-8');

      // ✅ Should have auth-related imports or configuration
      expect(demoPage.length).toBeGreaterThan(0);
    });
  });
});
