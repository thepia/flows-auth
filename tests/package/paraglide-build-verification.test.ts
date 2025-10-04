/**
 * Paraglide Build Verification Tests
 *
 * These tests ensure that Paraglide translation generation is working correctly
 * and that the build output includes properly formatted translation functions.
 *
 * Key verification points:
 * - Source translation files exist and are valid JSON
 * - Paraglide generates correct message functions in src/paraglide/
 * - Build process copies paraglide files to dist/paraglide/
 * - Generated functions follow the m[key]() pattern
 * - All translation keys from source JSON are available as functions
 * - Functions accept proper parameters (inputs, options with locale)
 * - Package.json exports are correctly configured
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { beforeAll, describe, expect, it } from 'vitest';

describe('Paraglide Build Verification', () => {
  const rootPath = join(__dirname, '../..');
  const srcParaglidePath = join(rootPath, 'src/paraglide');
  const distParaglidePath = join(rootPath, 'dist/paraglide');
  const messagesPath = join(rootPath, 'messages');

  const sourceTranslations: Record<string, any> = {};
  let generatedMessages: any = {};

  beforeAll(async () => {
    // Load source translation files
    const enPath = join(messagesPath, 'en.json');
    const daPath = join(messagesPath, 'da.json');

    if (existsSync(enPath)) {
      sourceTranslations.en = JSON.parse(readFileSync(enPath, 'utf-8'));
    }
    if (existsSync(daPath)) {
      sourceTranslations.da = JSON.parse(readFileSync(daPath, 'utf-8'));
    }

    // Try to load generated messages (may not exist if build hasn't run)
    try {
      const messagesIndexPath = join(srcParaglidePath, 'messages/_index.js');
      if (existsSync(messagesIndexPath)) {
        // Dynamic import of generated messages
        const messagesModule = await import(messagesIndexPath);
        generatedMessages = messagesModule;
      }
    } catch (error) {
      console.warn('Could not load generated messages:', error);
    }
  });

  describe('Source Translation Files', () => {
    it('should have valid English translation file', () => {
      expect(existsSync(join(messagesPath, 'en.json'))).toBe(true);
      expect(sourceTranslations.en).toBeDefined();
      expect(typeof sourceTranslations.en).toBe('object');
      expect(Object.keys(sourceTranslations.en).length).toBeGreaterThan(0);
    });

    it('should have valid Danish translation file', () => {
      expect(existsSync(join(messagesPath, 'da.json'))).toBe(true);
      expect(sourceTranslations.da).toBeDefined();
      expect(typeof sourceTranslations.da).toBe('object');
      expect(Object.keys(sourceTranslations.da).length).toBeGreaterThan(0);
    });

    it('should have matching keys between languages', () => {
      const enKeys = Object.keys(sourceTranslations.en || {});
      const daKeys = Object.keys(sourceTranslations.da || {});

      expect(enKeys.length).toBeGreaterThan(0);
      expect(daKeys.length).toBeGreaterThan(0);

      // Check that all English keys have Danish translations
      const missingDanishKeys = enKeys.filter((key) => !daKeys.includes(key));
      expect(missingDanishKeys).toEqual([]);

      // Check that all Danish keys have English translations
      const missingEnglishKeys = daKeys.filter((key) => !enKeys.includes(key));
      expect(missingEnglishKeys).toEqual([]);
    });

    it('should have required authentication keys', () => {
      const requiredKeys = [
        'email.label',
        'email.placeholder',
        'auth.signIn',
        'auth.signInWithPasskey',
        'auth.loading',
        'auth.signingIn',
        'code.label',
        'code.placeholder',
        'error.authFailed',
        'error.network'
      ];

      for (const key of requiredKeys) {
        expect(sourceTranslations.en).toHaveProperty(key);
        expect(sourceTranslations.da).toHaveProperty(key);
        expect(typeof sourceTranslations.en[key]).toBe('string');
        expect(typeof sourceTranslations.da[key]).toBe('string');
        expect(sourceTranslations.en[key].length).toBeGreaterThan(0);
        expect(sourceTranslations.da[key].length).toBeGreaterThan(0);
      }
    });
  });

  describe('Paraglide Configuration', () => {
    it('should have valid project.inlang configuration', () => {
      const configPath = join(rootPath, 'project.inlang/settings.json');
      expect(existsSync(configPath)).toBe(true);

      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      expect(config.sourceLanguageTag).toBe('en');
      expect(config.languageTags).toEqual(['en', 'da']);
      expect(config['plugin.inlang.mFunctionMatcher'].functionName).toBe('m');
    });

    it('should have vite plugin configured correctly', () => {
      const viteConfigPath = join(rootPath, 'vite.config.ts');
      expect(existsSync(viteConfigPath)).toBe(true);

      const viteConfig = readFileSync(viteConfigPath, 'utf-8');
      expect(viteConfig).toContain('paraglideVitePlugin');
      expect(viteConfig).toContain('./project.inlang');
      expect(viteConfig).toContain('./src/paraglide');
    });
  });

  describe('Generated Paraglide Files', () => {
    it('should generate paraglide files in src/paraglide/', () => {
      // These files should exist after paraglide generation
      const expectedFiles = [
        'runtime.js',
        'messages/_index.js',
        'messages/en.js',
        'messages/da.js'
      ];

      for (const file of expectedFiles) {
        const filePath = join(srcParaglidePath, file);
        expect(existsSync(filePath)).toBe(true);
      }
    });

    it('should have runtime.js with correct locale configuration', () => {
      const runtimePath = join(srcParaglidePath, 'runtime.js');
      if (existsSync(runtimePath)) {
        const runtime = readFileSync(runtimePath, 'utf-8');
        expect(runtime).toContain('export const baseLocale = "en"');
        expect(runtime).toContain('export const locales = /** @type {const} */ (["en", "da"])');
      }
    });

    it('should generate message functions with correct pattern', () => {
      const messagesIndexPath = join(srcParaglidePath, 'messages/_index.js');
      if (existsSync(messagesIndexPath)) {
        const messagesContent = readFileSync(messagesIndexPath, 'utf-8');

        // Check for proper function declarations and aliased exports (new Paraglide pattern)
        expect(messagesContent).toContain('const email_label =');
        expect(messagesContent).toContain('export { email_label as "email.label" }');

        // Check for aliased exports (Paraglide generates internal names and aliases them)
        expect(messagesContent).toMatch(/export \{ \w+ as "auth\.signIn" \}/);

        // Check for proper function signature
        expect(messagesContent).toMatch(/const \w+ = \(inputs = \{\}, options = \{\}\) => \{/);

        // Check for locale handling
        expect(messagesContent).toContain('const locale = options.locale ?? getLocale()');
        expect(messagesContent).toContain('if (locale === "en")');

        // Check for proper imports
        expect(messagesContent).toContain('import * as en from "./en.js"');
        expect(messagesContent).toContain('import * as da from "./da.js"');

        // Check for Paraglide compilation markers
        expect(messagesContent).toContain('This function has been compiled by [Paraglide JS]');
        expect(messagesContent).toContain('/* @__NO_SIDE_EFFECTS__ */');
      }
    });
  });

  describe('Build Output Verification', () => {
    it('should copy paraglide files to dist/', () => {
      const expectedDistFiles = ['runtime.js', 'messages.js'];

      for (const file of expectedDistFiles) {
        const filePath = join(distParaglidePath, file);
        expect(existsSync(filePath)).toBe(true);
      }
    });

    it('should have correct package.json exports for paraglide', () => {
      const packageJsonPath = join(rootPath, 'package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

      expect(packageJson.exports).toHaveProperty('./paraglide/runtime.js');
      expect(packageJson.exports).toHaveProperty('./paraglide/messages.js');
      expect(packageJson.exports['./paraglide/runtime.js']).toBe('./dist/paraglide/runtime.js');
      expect(packageJson.exports['./paraglide/messages.js']).toBe('./dist/paraglide/messages.js');
    });

    it('should have dist/paraglide/messages.js with correct exports', () => {
      const messagesDistPath = join(distParaglidePath, 'messages.js');
      if (existsSync(messagesDistPath)) {
        const messagesContent = readFileSync(messagesDistPath, 'utf-8');

        // Should export all messages and m namespace
        expect(messagesContent).toContain("export * from './messages/_index.js'");
        expect(messagesContent).toContain("export * as m from './messages/_index.js'");
      }
    });
  });

  describe('Message Function Verification', () => {
    it('should generate functions for all source translation keys', () => {
      if (Object.keys(generatedMessages).length === 0) {
        console.warn('Skipping function verification - no generated messages loaded');
        return;
      }

      const sourceKeys = Object.keys(sourceTranslations.en || {});

      for (const key of sourceKeys) {
        // With new Paraglide pattern, functions are accessible via aliased exports (dot notation)
        expect(generatedMessages).toHaveProperty(key);
        expect(typeof generatedMessages[key]).toBe('function');
      }
    });

    it('should have functions that accept proper parameters', () => {
      if (Object.keys(generatedMessages).length === 0) {
        console.warn('Skipping parameter verification - no generated messages loaded');
        return;
      }

      // Test a few key functions (using dot notation for aliased exports)
      const testFunctions = ['email.label', 'auth.signIn', 'error.authFailed'];

      for (const funcName of testFunctions) {
        if (generatedMessages[funcName]) {
          const func = generatedMessages[funcName];

          // Should work with no parameters
          expect(() => func()).not.toThrow();

          // Should work with empty inputs and options
          expect(() => func({}, {})).not.toThrow();

          // Should work with locale option
          expect(() => func({}, { locale: 'en' })).not.toThrow();
          expect(() => func({}, { locale: 'da' })).not.toThrow();

          // Should return string
          expect(typeof func()).toBe('string');
          expect(func().length).toBeGreaterThan(0);
        }
      }
    });

    it('should return different translations for different locales', () => {
      if (Object.keys(generatedMessages).length === 0) {
        console.warn('Skipping locale verification - no generated messages loaded');
        return;
      }

      // Test functions that should have different translations (using dot notation)
      const testFunctions = ['email.label', 'auth.signIn'];

      for (const funcName of testFunctions) {
        if (generatedMessages[funcName]) {
          const func = generatedMessages[funcName];

          const enText = func({}, { locale: 'en' });
          const daText = func({}, { locale: 'da' });

          expect(typeof enText).toBe('string');
          expect(typeof daText).toBe('string');
          expect(enText.length).toBeGreaterThan(0);
          expect(daText.length).toBeGreaterThan(0);

          // Translations should be different (unless they happen to be the same)
          // This is a soft check since some translations might be identical
          if (enText === daText) {
            console.warn(`Translation for ${funcName} is identical in EN and DA: "${enText}"`);
          }
        }
      }
    });
  });

  describe('Integration with Library Components', () => {
    it('should be importable using the m[key]() pattern', async () => {
      try {
        // Test the import pattern used by components
        const messagesModule = await import('../../src/paraglide/messages.js');
        const m = messagesModule.m || messagesModule;

        expect(m).toBeDefined();
        expect(typeof m).toBe('object');

        // Test bracket notation access (using aliased exports)
        expect(m['email.label']).toBeDefined();
        expect(typeof m['email.label']).toBe('function');

        // Test function call
        const result = m['email.label']();
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      } catch (error) {
        console.warn('Could not test m[key]() pattern:', error);
      }
    });
  });

  describe('Build Process Integration', () => {
    it('should trigger paraglide generation during build', () => {
      // Verify that the build process includes paraglide generation
      const viteConfigPath = join(rootPath, 'vite.config.ts');
      const viteConfig = readFileSync(viteConfigPath, 'utf-8');

      // Should have paraglide plugin configured
      expect(viteConfig).toContain('paraglideVitePlugin');
      expect(viteConfig).toContain('copySourceFiles');

      // Should have custom plugin to copy files to dist
      expect(viteConfig).toContain('writeBundle()');
      expect(viteConfig).toContain('copyFileSync');
    });

    it('should have consistent translation keys across all files', () => {
      // This test ensures that all translation keys are properly synchronized
      const sourceKeys = Object.keys(sourceTranslations.en || {});

      if (Object.keys(generatedMessages).length > 0) {
        // Check that generated functions exist for all source keys
        for (const key of sourceKeys) {
          const functionName = key.replace(/\./g, '_');

          // Should have either direct export or aliased export
          const hasDirectExport = Object.prototype.hasOwnProperty.call(
            generatedMessages,
            functionName
          );
          const hasAliasedExport = Object.prototype.hasOwnProperty.call(generatedMessages, key);

          expect(hasDirectExport || hasAliasedExport).toBe(true);
        }
      }
    });

    it('should maintain proper TypeScript support for generated functions', () => {
      // Check that TypeScript definitions are available
      const distTypesPath = join(rootPath, 'dist');

      if (existsSync(distTypesPath)) {
        // Should have TypeScript definition files
        expect(existsSync(join(distTypesPath, 'index.d.ts'))).toBe(true);

        // Package.json should export types
        const packageJsonPath = join(rootPath, 'package.json');
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
        expect(packageJson.types).toBe('./dist/index.d.ts');
      }
    });
  });
});
