/**
 * Integration tests for component exports
 * These tests ensure components can be imported and instantiated correctly
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithStoreProp } from '../helpers/component-test-setup';

describe('Component Exports', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock WebAuthn API
    Object.defineProperty(navigator, 'credentials', {
      value: {
        create: vi.fn(),
        get: vi.fn()
      },
      writable: true,
      configurable: true
    });

    // Mock PublicKeyCredential
    Object.defineProperty(global, 'PublicKeyCredential', {
      value: {
        isUserVerifyingPlatformAuthenticatorAvailable: vi.fn().mockResolvedValue(true),
        isConditionalMediationAvailable: vi.fn().mockResolvedValue(true)
      },
      writable: true,
      configurable: true
    });
  });

  it('should import SignInForm as named export', async () => {
    const { SignInForm } = await import('../../src/index');
    expect(SignInForm).toBeDefined();
    expect(typeof SignInForm).toBe('function');
  });

  it('should import createAuthStore as named export', async () => {
    const { createAuthStore } = await import('../../src/index');
    expect(createAuthStore).toBeDefined();
    expect(typeof createAuthStore).toBe('function');
  });

  it('should import AuthApiClient as named export', async () => {
    const { AuthApiClient } = await import('../../src/index');
    expect(AuthApiClient).toBeDefined();
    expect(typeof AuthApiClient).toBe('function');
  });

  it('should import WebAuthn utilities as named exports', async () => {
    const {
      isWebAuthnSupported,
      isPlatformAuthenticatorAvailable,
      authenticateWithPasskey,
      createPasskey
    } = await import('../../src/index');

    expect(isWebAuthnSupported).toBeDefined();
    expect(isPlatformAuthenticatorAvailable).toBeDefined();
    expect(authenticateWithPasskey).toBeDefined();
    expect(createPasskey).toBeDefined();
  });

  it('should create and render SignInForm component without errors', async () => {
    const { SignInForm } = await import('../../src/index');

    expect(() => {
      renderWithStoreProp(SignInForm, {
        authConfig: {
          apiBaseUrl: 'https://test.com',
          appCode: 'test-app',
          enablePasskeys: false
        }
      });
    }).not.toThrow();
  });

  it('should create auth store without errors', async () => {
    const { createAuthStore, createDefaultConfig } = await import('../../src/index');

    const config = createDefaultConfig({
      apiBaseUrl: 'https://test.com',
      clientId: 'test-client'
    });

    expect(() => {
      createAuthStore(config);
    }).not.toThrow();
  });

  it('should create API client without errors', async () => {
    const { AuthApiClient, createDefaultConfig } = await import('../../src/index');

    const config = createDefaultConfig({
      apiBaseUrl: 'https://test.com',
      clientId: 'test-client'
    });

    expect(() => {
      new AuthApiClient(config);
    }).not.toThrow();
  });

  it('should have correct component properties and methods', async () => {
    const { SignInForm } = await import('../../src/index');

    // Check if it's a Svelte component constructor
    expect(SignInForm.prototype).toBeDefined();
    expect(SignInForm.prototype.$set).toBeDefined();
    expect(SignInForm.prototype.$on).toBeDefined();
    expect(SignInForm.prototype.$destroy).toBeDefined();
  });

  it('should maintain consistent exports between builds', async () => {
    const authLib = await import('../../src/index');

    // Check all expected exports are present
    const expectedExports = [
      'SignInForm',
      'createAuthStore',
      'AuthApiClient',
      'isWebAuthnSupported',
      'isPlatformAuthenticatorAvailable',
      'authenticateWithPasskey',
      'createPasskey',
      'serializeCredential',
      'generatePasskeyName',
      'createDefaultConfig',
      'VERSION'
    ];

    for (const exportName of expectedExports) {
      expect(authLib).toHaveProperty(exportName);
      expect(authLib[exportName as keyof typeof authLib]).toBeDefined();
    }
  });

  it('should handle component instantiation in different environments', async () => {
    const { SignInForm } = await import('../../src/index');

    const baseAuthConfig = {
      apiBaseUrl: 'https://test.com',
      appCode: 'test-app',
      enablePasskeys: false
    };

    // Test with different prop combinations
    const propCombinations = [
      {},
      { showLogo: false },
      { compact: true },
      { className: 'custom-class' },
      { initialEmail: 'test@example.com' },
      {
        showLogo: false,
        compact: true,
        className: 'custom-class',
        initialEmail: 'test@example.com'
      }
    ];

    for (const props of propCombinations) {
      expect(() => {
        const { unmount } = renderWithStoreProp(SignInForm, {
          props,
          authConfig: baseAuthConfig
        });
        unmount();
      }).not.toThrow();
    }
  });
});
