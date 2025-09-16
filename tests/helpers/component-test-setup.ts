/**
 * Component Test Setup Helpers
 * 
 * Standardized helpers for testing components that require auth store context.
 * This ensures consistent test setup across all component tests.
 */

import { render } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import { vi } from 'vitest';
import { AUTH_CONTEXT_KEY } from '../../src/constants/context-keys';
import { createAuthStore } from '../../src/stores/auth-store';
import type { AuthConfig } from '../../src/types';

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
      hasPasskey: false,
      userId: null,
      emailVerified: false,
      invitationTokenHash: null,
      lastPinExpiry: null
    }),
    // Add sendAppEmailCode method for email code sending
    sendAppEmailCode: vi.fn().mockResolvedValue({
      success: true,
      message: 'Email code sent'
    })
  };

  // Create the real auth store with test config and mock API
  const authStore = createAuthStore(defaultAuthConfig, mockApiClient);
  console.log('🔧 Created test auth store:', !!authStore, 'config:', defaultAuthConfig);
  return authStore;
}

/**
 * Renders a component with proper auth store context using REAL auth store
 * This is the standard way to test components that depend on auth store
 */
export function renderWithAuthContext(
  Component: any,
  options: {
    props?: Record<string, any>;
    authConfig?: Partial<AuthConfig>;
    mockUserCheck?: {
      exists: boolean;
      hasPasskey?: boolean;
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
    authStore.api.checkEmail.mockResolvedValue({
      exists: mockUserCheck.exists,
      hasPasskey: mockUserCheck.hasPasskey || false,
      userId: mockUserCheck.userId || null,
      emailVerified: mockUserCheck.emailVerified || false,
      invitationTokenHash: null,
      lastPinExpiry: mockUserCheck.lastPinExpiry || null
    });
  }

  // Component expects context to contain writable(authStore) based on working test examples
  const authStoreContext = writable(authStore);
  console.log('🔧 Created auth store context:', !!authStoreContext, 'contains:', !!authStore);

  return {
    ...render(Component, {
      props,
      context: new Map([[AUTH_CONTEXT_KEY, authStoreContext]])
    }),
    authStore,
    authStoreContext
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
