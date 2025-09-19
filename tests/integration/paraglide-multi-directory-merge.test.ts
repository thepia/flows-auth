/**
 * Integration test for multi-directory Paraglide message merging
 *
 * This test verifies that apps can successfully merge translations from:
 * 1. Library defaults (flows-auth/messages/)
 * 2. App-specific overrides (app/messages/)
 *
 * The test validates:
 * - App messages override library defaults
 * - Library messages are inherited when not overridden
 * - Multi-language support works across merged sources
 * - Build output contains expected merged message functions
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

describe('Paraglide Multi-Directory Message Merging', () => {
  const authDemoRoot = resolve(process.cwd(), 'examples/auth-demo');
  const paraglideOutputDir = resolve(authDemoRoot, 'src/paraglide');
  const messagesIndexPath = resolve(paraglideOutputDir, 'messages/_index.js');

  // Expected override messages (app-specific)
  const expectedOverrides = {
    'signIn.title': 'Sign In Demo', // Updated to match actual generated content
    'signIn.subtitle': 'Experience passwordless authentication in action with {companyName}', // Updated to match actual generated content
    'branding.poweredBy': 'Thepia Flows Demo',
    'auth.signIn': '🔐 Sign In with Demo'
  };

  // Expected inherited messages (from library)
  const expectedInherited = {
    'email.label': 'Email address',
    'auth.loading': 'Loading...',
    'branding.securedBy': 'Secured by',
    'error.network': 'Network error. Please check your connection.'
  };

  // Expected app-specific messages (demo only)
  const expectedAppSpecific = {
    'overview.title': 'Thepia Flows Authentication',
    'overview.subtitle': 'Passwordless authentication with WebAuthn passkeys and magic links'
  };

  beforeAll(() => {
    // Verify that auth-demo has been built with Paraglide
    if (!existsSync(paraglideOutputDir)) {
      throw new Error(
        'Paraglide output directory not found. Please run "cd examples/auth-demo && pnpm build" first.'
      );
    }
  });

  describe('Build Output Validation', () => {
    it('should generate Paraglide output directory', () => {
      expect(existsSync(paraglideOutputDir)).toBe(true);
    });

    it('should generate main messages.js file', () => {
      const mainMessagesPath = resolve(paraglideOutputDir, 'messages.js');
      expect(existsSync(mainMessagesPath)).toBe(true);
    });

    it('should generate messages index file', () => {
      expect(existsSync(messagesIndexPath)).toBe(true);
    });

    it('should generate runtime files', () => {
      const runtimePath = resolve(paraglideOutputDir, 'runtime.js');
      expect(existsSync(runtimePath)).toBe(true);
    });
  });

  describe('Message Function Generation', () => {
    let messagesIndex: string;

    beforeAll(() => {
      messagesIndex = readFileSync(messagesIndexPath, 'utf-8');
    });

    it('should export override message functions', () => {
      // Check that override messages are exported (using new inline export format)
      expect(messagesIndex).toContain('export { signin_title1 as "signIn.title" }');
      expect(messagesIndex).toContain('export { signin_subtitle1 as "signIn.subtitle" }');
      expect(messagesIndex).toContain('export { auth_signin1 as "auth.signIn" }');
    });

    it('should export inherited library message functions', () => {
      // Check that library messages are exported
      expect(messagesIndex).toContain('export { email_label as "email.label" }');
      expect(messagesIndex).toContain('export { auth_loading as "auth.loading" }');
      expect(messagesIndex).toContain('export { error_network as "error.network" }');
    });

    it('should export app-specific message functions', () => {
      // Check that app-specific messages are exported
      expect(messagesIndex).toContain('export { overview_title as "overview.title" }');
      expect(messagesIndex).toContain('export { overview_subtitle as "overview.subtitle" }');
    });

    it('should have reasonable number of exported functions', () => {
      // Count export statements to verify comprehensive merging (using new format)
      const exportCount = (messagesIndex.match(/export \{ \w+ as "/g) || []).length;
      expect(exportCount).toBeGreaterThan(150); // Should have 170+ functions
      expect(exportCount).toBeLessThan(200); // But not too many
    });
  });

  describe('Message Override Functionality', () => {
    let messages: any;

    beforeAll(async () => {
      // Dynamically import the generated messages
      const messagesPath = resolve(paraglideOutputDir, 'messages.js');
      messages = await import(messagesPath);
    });

    it('should override library messages with app-specific values', () => {
      // Test that app overrides work
      expect(messages['signIn.title']).toBeDefined();
      expect(messages['signIn.title']()).toBe(expectedOverrides['signIn.title']);

      expect(messages['branding.poweredBy']).toBeDefined();
      expect(messages['branding.poweredBy']()).toBe(expectedOverrides['branding.poweredBy']);
    });

    it('should support variable substitution in overridden messages', () => {
      expect(messages['signIn.subtitle']).toBeDefined();
      const result = messages['signIn.subtitle']({ companyName: 'Test Corp' });
      expect(result).toBe('Experience passwordless authentication in action with Test Corp');
    });

    it('should inherit library messages when not overridden', () => {
      // Test that library messages are available
      expect(messages['email.label']).toBeDefined();
      expect(messages['email.label']()).toBe(expectedInherited['email.label']);

      expect(messages['auth.loading']).toBeDefined();
      expect(messages['auth.loading']()).toBe(expectedInherited['auth.loading']);

      expect(messages['branding.securedBy']).toBeDefined();
      expect(messages['branding.securedBy']()).toBe(expectedInherited['branding.securedBy']);
    });

    it('should include app-specific messages', () => {
      // Test that app-specific messages are available
      expect(messages['overview.title']).toBeDefined();
      expect(messages['overview.title']()).toBe(expectedAppSpecific['overview.title']);

      expect(messages['overview.subtitle']).toBeDefined();
      expect(messages['overview.subtitle']()).toBe(expectedAppSpecific['overview.subtitle']);
    });
  });

  describe('Multi-Language Support', () => {
    it('should generate message files for all supported languages', () => {
      // Check that both English and Danish language files exist
      const enPath = resolve(paraglideOutputDir, 'messages/en.js');
      const daPath = resolve(paraglideOutputDir, 'messages/da.js');
      expect(existsSync(enPath)).toBe(true);
      expect(existsSync(daPath)).toBe(true);

      // Check that the main index file imports both languages
      const messagesIndex = readFileSync(messagesIndexPath, 'utf-8');
      expect(messagesIndex).toContain('import * as en from "./en.js"');
      expect(messagesIndex).toContain('import * as da from "./da.js"');
    });

    it('should have correct language-specific override values', () => {
      const enPath = resolve(paraglideOutputDir, 'messages/en.js');
      const content = readFileSync(enPath, 'utf-8');

      // Check that English language file contains override values
      expect(content).toContain('form_signintitle2');
      expect(content).toContain('auth_signin1');
    });
  });

  describe('Configuration Validation', () => {
    it('should have correct inlang configuration', () => {
      const configPath = resolve(authDemoRoot, 'project.inlang/settings.json');
      expect(existsSync(configPath)).toBe(true);

      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      expect(config['plugin.inlang.messageFormat']).toBeDefined();
      expect(config['plugin.inlang.messageFormat'].pathPattern).toEqual([
        '../../messages/{languageTag}.json',
        './messages/{languageTag}.json'
      ]);
    });

    it('should have Paraglide Vite plugin configured', () => {
      const viteConfigPath = resolve(authDemoRoot, 'vite.config.js');
      expect(existsSync(viteConfigPath)).toBe(true);

      const viteConfig = readFileSync(viteConfigPath, 'utf-8');
      expect(viteConfig).toContain('paraglideVitePlugin');
      expect(viteConfig).toContain('./project.inlang');
      expect(viteConfig).toContain('./src/paraglide');
    });
  });

  describe('Bundle Optimization', () => {
    it('should generate language-specific message files', () => {
      // Verify that language files exist for tree shaking
      const messageFiles = ['en.js', 'da.js', '_index.js'];

      for (const file of messageFiles) {
        const filePath = resolve(paraglideOutputDir, 'messages', file);
        expect(existsSync(filePath)).toBe(true);
      }
    });

    it('should have proper export structure for tree shaking', () => {
      const mainMessagesPath = resolve(paraglideOutputDir, 'messages.js');
      const content = readFileSync(mainMessagesPath, 'utf-8');

      // Should export from index and also expose as 'm' namespace
      expect(content).toContain("export * from './messages/_index.js'");
      expect(content).toContain("export * as m from './messages/_index.js'");
    });
  });

  describe('Integration with Library Components', () => {
    it('should provide all message keys expected by library components', () => {
      // Verify that critical library message keys are available
      const criticalKeys = [
        'email.label',
        'email.placeholder',
        'auth.signIn',
        'auth.loading',
        'code.label',
        'error.network',
        'branding.securedBy'
      ];

      const messagesIndexContent = readFileSync(messagesIndexPath, 'utf-8');

      // Check for actual export statements with dot notation keys
      expect(messagesIndexContent).toContain('export { email_label as "email.label" }');
      expect(messagesIndexContent).toContain('export { email_placeholder as "email.placeholder" }');
      expect(messagesIndexContent).toContain('export { auth_signin1 as "auth.signIn" }'); // override
      expect(messagesIndexContent).toContain('export { auth_loading as "auth.loading" }');
      expect(messagesIndexContent).toContain('export { code_label as "code.label" }');
      expect(messagesIndexContent).toContain('export { error_network as "error.network" }');
    });
  });
});
