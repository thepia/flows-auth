/**
 * Working Tests for Auth Library Core Functionality
 */
import { describe, expect, it } from 'vitest';
import { createDefaultConfig } from '../src/index';

describe('Auth Library Core', () => {
  describe('Configuration', () => {
    it('should create default config', () => {
      const config = createDefaultConfig();

      expect(config).toMatchObject({
        apiBaseUrl: '',
        clientId: '',
        domain: '',
        enablePasskeys: true,
        enableMagicPins: true,
        branding: {
          companyName: 'Your Company',
          showPoweredBy: true
        }
      });
    });

    it('should merge config overrides', () => {
      const config = createDefaultConfig({
        apiBaseUrl: 'https://api.example.com',
        clientId: 'test-client',
        branding: {
          companyName: 'Test Company'
        }
      });

      expect(config.apiBaseUrl).toBe('https://api.example.com');
      expect(config.clientId).toBe('test-client');
      expect(config.branding?.companyName).toBe('Test Company');
      expect(config.branding?.showPoweredBy).toBe(true); // Should preserve defaults
    });

    it('should support disabling features', () => {
      const config = createDefaultConfig({
        enablePasskeys: false,
        enableMagicPins: false
      });

      expect(config.enablePasskeys).toBe(false);
      expect(config.enableMagicPins).toBe(false);
    });
  });

  describe('Library Structure', () => {
    it('should export version', async () => {
      const { VERSION } = await import('../src/index');
      expect(VERSION).toBe('1.0.0');
    });

    it('should export main components', async () => {
      // Dynamic import to avoid SSR issues in tests
      const lib = await import('../src/index');

      expect(lib.SignInForm).toBeDefined();
      expect(lib.createAuthStore).toBeDefined();
      expect(lib.createDefaultConfig).toBeDefined();
      expect(lib.AuthApiClient).toBeDefined();
    });

    it('should export utilities', async () => {
      const lib = await import('../src/index');

      expect(lib.isWebAuthnSupported).toBeDefined();
      expect(lib.generatePasskeyName).toBeDefined();
    });
  });

  describe('Type Safety', () => {
    it('should handle config types correctly', () => {
      const config = createDefaultConfig({
        apiBaseUrl: 'https://api.test.com',
        enablePasskeys: true,
        branding: {
          companyName: 'Test Corp',
          logoUrl: 'https://example.com/logo.png',
          primaryColor: '#ff0000',
          showPoweredBy: false
        }
      });

      // TypeScript should ensure these properties exist and have correct types
      expect(typeof config.apiBaseUrl).toBe('string');
      expect(typeof config.enablePasskeys).toBe('boolean');
      expect(typeof config.branding?.companyName).toBe('string');
      expect(typeof config.branding?.showPoweredBy).toBe('boolean');
    });
  });
});
