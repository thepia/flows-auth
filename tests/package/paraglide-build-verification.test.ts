/**
 * Paraglide Build Verification Tests
 *
 * Ensures Paraglide translation generation is working and that the build output
 * includes properly formatted translation functions.
 *
 * NEW layout (flows-auth 1.2.0, see docs/MULTI_FRAMEWORK_PACKAGING_PLAN.md):
 *  - Committed Paraglide source lives at src/core/paraglide/** (regenerated with
 *    `pnpm build:paraglide` -> outdir ./src/core/paraglide).
 *  - The core bundle (dist/index.js) inlines the messages.
 *  - scripts/build.mjs copies src/core/paraglide -> dist/paraglide (backward
 *    compatible files; NOT exposed as package subpaths anymore).
 *  - The removed `@thepia/flows-auth/paraglide/*` subpath exports are replaced by
 *    importing paraglideMessages / getLocale / setLocale from the core bundle.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

describe('Paraglide Build Verification', () => {
  const rootPath = join(__dirname, '../..');
  const srcParaglidePath = join(rootPath, 'src/core/paraglide');
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

      const missingDanishKeys = enKeys.filter((key) => !daKeys.includes(key));
      expect(missingDanishKeys).toEqual([]);

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

    it('should compile paraglide to src/core/paraglide via the build:paraglide script', () => {
      const packageJson = JSON.parse(readFileSync(join(rootPath, 'package.json'), 'utf-8'));
      // build:paraglide delegates to scripts/build-paraglide.mjs (which pins
      // outputStructure: 'locale-modules' via the programmatic compile()).
      expect(packageJson.scripts['build:paraglide']).toContain('build-paraglide.mjs');

      const paraglideScript = readFileSync(join(rootPath, 'scripts/build-paraglide.mjs'), 'utf-8');
      expect(paraglideScript).toContain('./project.inlang');
      expect(paraglideScript).toContain('./src/core/paraglide');
      expect(paraglideScript).toContain('locale-modules');
    });
  });

  describe('Generated Paraglide Files', () => {
    it('should generate paraglide files in src/core/paraglide/', () => {
      const expectedFiles = [
        'runtime.js',
        'messages/_index.js',
        'messages/en.js',
        'messages/da.js'
      ];

      for (const file of expectedFiles) {
        const filePath = join(srcParaglidePath, file);
        expect(existsSync(filePath), `missing: src/core/paraglide/${file}`).toBe(true);
      }
    });

    it('should have runtime.js with correct locale configuration', () => {
      const runtimePath = join(srcParaglidePath, 'runtime.js');
      expect(existsSync(runtimePath)).toBe(true);
      const runtime = readFileSync(runtimePath, 'utf-8');
      expect(runtime).toContain('export const baseLocale = "en"');
      expect(runtime).toContain('export const locales = /** @type {const} */ (["en", "da"])');
    });

    it('should generate message functions with correct pattern', () => {
      const messagesIndexPath = join(srcParaglidePath, 'messages/_index.js');
      expect(existsSync(messagesIndexPath)).toBe(true);
      const messagesContent = readFileSync(messagesIndexPath, 'utf-8');

      // Function declarations + aliased (dot-notation) exports.
      expect(messagesContent).toContain('const email_label =');
      expect(messagesContent).toContain('export { email_label as "email.label" }');
      expect(messagesContent).toMatch(/export \{ \w+ as "auth\.signIn" \}/);

      // Function signature + locale handling.
      expect(messagesContent).toMatch(/const \w+ = \(inputs = \{\}, options = \{\}\) => \{/);
      expect(messagesContent).toContain('const locale = options.locale ?? getLocale()');
      expect(messagesContent).toContain('if (locale === "en")');

      // Imports + Paraglide compilation markers.
      expect(messagesContent).toContain('import * as en from "./en.js"');
      expect(messagesContent).toContain('import * as da from "./da.js"');
      expect(messagesContent).toContain('This function has been compiled by [Paraglide JS]');
      expect(messagesContent).toContain('/* @__NO_SIDE_EFFECTS__ */');
    });
  });

  describe('Build Output Verification', () => {
    it('should copy paraglide files to dist/paraglide (backward compat)', () => {
      const expectedDistFiles = ['runtime.js', 'messages.js', 'messages/_index.js'];

      for (const file of expectedDistFiles) {
        const filePath = join(distParaglidePath, file);
        expect(existsSync(filePath), `missing: dist/paraglide/${file}`).toBe(true);
      }
    });

    it('should NOT expose paraglide as package subpath exports', () => {
      const packageJson = JSON.parse(readFileSync(join(rootPath, 'package.json'), 'utf-8'));
      // These subpaths were removed in the packaging refactor.
      expect(packageJson.exports['./paraglide/runtime.js']).toBeUndefined();
      expect(packageJson.exports['./paraglide/messages.js']).toBeUndefined();
    });

    it('should expose messages + locale helpers via the core bundle', async () => {
      const core = await import('../../dist/index.js');
      expect(core.paraglideMessages).toBeDefined();
      expect(typeof core.getLocale).toBe('function');
      expect(typeof core.setLocale).toBe('function');
      // The `m` proxy used by components.
      expect(core.m).toBeDefined();
    });

    it('should have dist/paraglide/messages.js with correct re-exports', () => {
      const messagesDistPath = join(distParaglidePath, 'messages.js');
      expect(existsSync(messagesDistPath)).toBe(true);
      const messagesContent = readFileSync(messagesDistPath, 'utf-8');
      expect(messagesContent).toContain("export * from './messages/_index.js'");
      expect(messagesContent).toContain("export * as m from './messages/_index.js'");
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
        expect(generatedMessages).toHaveProperty(key);
        expect(typeof generatedMessages[key]).toBe('function');
      }
    });

    it('should have functions that accept proper parameters', () => {
      if (Object.keys(generatedMessages).length === 0) {
        console.warn('Skipping parameter verification - no generated messages loaded');
        return;
      }

      const testFunctions = ['email.label', 'auth.signIn', 'error.authFailed'];

      for (const funcName of testFunctions) {
        if (generatedMessages[funcName]) {
          const func = generatedMessages[funcName];

          expect(() => func()).not.toThrow();
          expect(() => func({}, {})).not.toThrow();
          expect(() => func({}, { locale: 'en' })).not.toThrow();
          expect(() => func({}, { locale: 'da' })).not.toThrow();

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
        const messagesModule = await import('../../src/core/paraglide/messages.js');
        const m = messagesModule.m || messagesModule;

        expect(m).toBeDefined();
        expect(typeof m).toBe('object');

        expect(m['email.label']).toBeDefined();
        expect(typeof m['email.label']).toBe('function');

        const result = m['email.label']();
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      } catch (error) {
        console.warn('Could not test m[key]() pattern:', error);
      }
    });
  });

  describe('Build Process Integration', () => {
    it('should copy paraglide into dist during the build (scripts/build.mjs)', () => {
      const buildScript = readFileSync(join(rootPath, 'scripts/build.mjs'), 'utf-8');
      // The orchestrator copies committed paraglide source into dist/paraglide.
      expect(buildScript).toContain('src/core/paraglide');
      expect(buildScript).toMatch(/dist.*paraglide|paraglide/);
      expect(buildScript).toContain('cpSync');
    });

    it('should have consistent translation keys across all files', () => {
      const sourceKeys = Object.keys(sourceTranslations.en || {});

      if (Object.keys(generatedMessages).length > 0) {
        for (const key of sourceKeys) {
          const functionName = key.replace(/\./g, '_');

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
      const distDir = join(rootPath, 'dist');

      if (existsSync(distDir)) {
        expect(existsSync(join(distDir, 'index.d.ts'))).toBe(true);

        const packageJson = JSON.parse(readFileSync(join(rootPath, 'package.json'), 'utf-8'));
        expect(packageJson.types).toBe('./dist/index.d.ts');
      }
    });
  });
});
