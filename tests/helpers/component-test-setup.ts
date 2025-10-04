/**
 * Component Test Setup Helpers
 *
 * Standardized helpers for testing components that require auth store context.
 * This ensures consistent test setup across all component tests.
 */

import { render } from '@testing-library/svelte';
import { getContext } from 'svelte';
import { writable } from 'svelte/store';
import { vi } from 'vitest';
import { AUTH_CONTEXT_KEY } from '../../src/constants/context-keys';
import { createAuthStore, makeSvelteCompatible } from '../../src/stores';
import type { AuthConfig } from '../../src/types';
import type { SvelteAuthStore } from '../../src/types/svelte';

/**
 * Creates a real auth store with test configuration and optional mock API client
 */
export function createTestAuthStore(authConfig: Partial<AuthConfig> = {}) {
  // Default auth config for tests - using appCode (modern) instead of deprecated clientId
  const defaultAuthConfig: AuthConfig = {
    apiBaseUrl: 'https://api.test.com',
    clientId: 'deprecated-field', // Note: clientId is deprecated, appCode is preferred
    domain: 'test.auth0.com',
    appCode: 'test-app', // Modern approach - appCode replaces clientId
    enablePasskeys: true,
    enableMagicLinks: false,
    signInMode: 'login-or-register',
    language: 'en',
    ...authConfig
  };

  // Create a mock API client for testing
  const mockApiClient = {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
    patch: vi.fn().mockResolvedValue({ data: {} }),
    // Add checkEmail method for user existence checks
    checkEmail: vi.fn().mockResolvedValue({
      exists: false,
      hasWebAuthn: false,
      userId: undefined,
      emailVerified: false,
      invitationTokenHash: undefined,
      lastPinExpiry: undefined
    }),
    // Add sendAppEmailCode method for email code sending
    sendAppEmailCode: vi.fn().mockResolvedValue({
      success: true,
      message: 'Email code sent'
    })
  } as any; // Type assertion needed for mock

  // Create the real auth store with test config and mock API client
  const baseStore = createAuthStore(defaultAuthConfig, mockApiClient);
  const authStore = makeSvelteCompatible(baseStore);
  console.log('🔧 Created test auth store:', !!authStore, 'config:', defaultAuthConfig);
  console.log('🔧 Auth store has subscribe:', typeof authStore.subscribe);
  console.log('🔧 Auth store methods:', Object.keys(authStore).slice(0, 10));
  return authStore;
}

export function renderWithContext(
  Component: any,
  options: {
    props?: Record<string, any>;
    authConfig?: Partial<AuthConfig>;
    mockUserCheck?: {
      exists: boolean;
      hasPasskey?: boolean; // Accept hasPasskey for convenience
      userId?: string | null;
      emailVerified?: boolean;
      lastPinExpiry?: string | null;
    };
  } = {}
) {
  const { props = {} } = options;

  let authStore = getContext<SvelteAuthStore>(AUTH_CONTEXT_KEY);
  if (!authStore) {
    authStore = createTestAuthStore(options.authConfig);
  }

  return {
    ...render(Component, {
      props: {
        ...props,
        store: authStore
      }
    }),
    authStore
  };
}

/**
 * Renders a component with auth store passed as prop
 * This is the standard way to test components that depend on auth store
 */
export function renderWithStoreProp(
  Component: any,
  options: {
    props?: Record<string, any>;
    authConfig?: Partial<AuthConfig>;
    mockUserCheck?: {
      exists: boolean;
      hasPasskey?: boolean; // Accept hasPasskey for convenience
      userId?: string | null;
      emailVerified?: boolean;
      lastPinExpiry?: string | null;
    };
  } = {}
) {
  const { props = {}, authConfig = {}, mockUserCheck } = options;

  const authStore = createTestAuthStore(authConfig);

  // Configure mock API responses if provided
  if (mockUserCheck && authStore.api && authStore.api.checkEmail) {
    vi.mocked(authStore.api.checkEmail).mockResolvedValue({
      exists: mockUserCheck.exists,
      hasWebAuthn: mockUserCheck.hasPasskey || false, // Map hasPasskey to hasWebAuthn
      userId: mockUserCheck.userId || undefined,
      emailVerified: mockUserCheck.emailVerified || false,
      invitationTokenHash: undefined,
      lastPinExpiry: mockUserCheck.lastPinExpiry || undefined
    });
  }

  console.log('🔧 Created auth store:', !!authStore);
  console.log('🔧 Auth store has subscribe:', typeof authStore.subscribe);

  return {
    ...render(Component, {
      props: {
        ...props,
        store: authStore
      }
    }),
    authStore
  };
}

/**
 * Default auth configs for common test scenarios
 */
export const TEST_AUTH_CONFIGS = {
  /** Standard config with app code (modern approach) */
  withAppCode: {
    appCode: 'test-app',
    enablePasskeys: true,
    enableMagicLinks: false
  },

  /** Legacy config without app code (magic links only) */
  legacyMagicLinks: {
    enablePasskeys: true,
    enableMagicLinks: true
  },

  /** Login-only mode (no registration) */
  loginOnly: {
    appCode: 'test-app',
    signInMode: 'login-only' as const,
    enablePasskeys: true,
    enableMagicLinks: false
  },

  /** Passkeys disabled */
  noPasskeys: {
    appCode: 'test-app',
    enablePasskeys: false,
    enableMagicLinks: false
  }
} as const;
