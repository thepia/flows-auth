/**
 * Integration tests for component exports
 * These tests ensure components can be imported and instantiated correctly
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithStoreProp } from '../helpers/component-test-setup.js';

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
    const { SignInForm } = await import('@thepia/flows-auth/svelte');
    expect(SignInForm).toBeDefined();
    expect(typeof SignInForm).toBe('function');
  });

  it('should import createAuthStore as named export', async () => {
    const { createAuthStore } = await import('@thepia/flows-auth');
    expect(createAuthStore).toBeDefined();
    expect(typeof createAuthStore).toBe('function');
  });

  it('should import AuthApiClient as named export', async () => {
    const { AuthApiClient } = await import('@thepia/flows-auth');
    expect(AuthApiClient).toBeDefined();
    expect(typeof AuthApiClient).toBe('function');
  });

  it('should import WebAuthn utilities as named exports', async () => {
    const {
      isWebAuthnSupported,
      isPlatformAuthenticatorAvailable,
      authenticateWithPasskey,
      createPasskey
    } = await import('@thepia/flows-auth');

    expect(isWebAuthnSupported).toBeDefined();
    expect(isPlatformAuthenticatorAvailable).toBeDefined();
    expect(authenticateWithPasskey).toBeDefined();
    expect(createPasskey).toBeDefined();
  });

  it('should create and render SignInForm component without errors', async () => {
    const { SignInForm } = await import('@thepia/flows-auth/svelte');

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
    const { createAuthStore, createDefaultConfig } = await import('@thepia/flows-auth');

    const config = createDefaultConfig({
      apiBaseUrl: 'https://test.com',
      clientId: 'test-client'
    });

    expect(() => {
      createAuthStore(config);
    }).not.toThrow();
  });

  it('should create API client without errors', async () => {
    const { AuthApiClient, createDefaultConfig } = await import('@thepia/flows-auth');

    const config = createDefaultConfig({
      apiBaseUrl: 'https://test.com',
      clientId: 'test-client'
    });

    expect(() => {
      new AuthApiClient(config);
    }).not.toThrow();
  });

  it('should have correct component properties and methods', async () => {
    const { SignInForm } = await import('@thepia/flows-auth/svelte');

    // Svelte 5 components compile to plain functions of shape
    // `(anchor, props) => Exports`, not classes with $set/$on/$destroy -
    // those instance methods were removed. Mounting/events/unmounting go
    // through svelte's mount()/unmount() and the `events` mount option
    // instead (see the "should create and render" test above, which
    // already exercises this).
    expect(typeof SignInForm).toBe('function');
  });

  it('should maintain consistent exports between builds', async () => {
    // Post-split surface: agnostic logic lives at the root `.`, Svelte UI at `./svelte`.
    const authLib = await import('@thepia/flows-auth');
    const svelteLib = await import('@thepia/flows-auth/svelte');

    const expectedRootExports = [
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
    const expectedSvelteExports = ['SignInForm'];

    for (const exportName of expectedRootExports) {
      expect(authLib).toHaveProperty(exportName);
      expect((authLib as any)[exportName]).toBeDefined();
    }
    for (const exportName of expectedSvelteExports) {
      expect(svelteLib).toHaveProperty(exportName);
      expect(svelteLib[exportName as keyof typeof svelteLib]).toBeDefined();
    }
  });

  it('should handle component instantiation in different environments', async () => {
    const { SignInForm } = await import('@thepia/flows-auth/svelte');

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
