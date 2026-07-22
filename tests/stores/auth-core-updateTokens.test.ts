/**
 * Comprehensive tests for auth-core updateTokens method
 * Tests edge cases around token updates, especially Supabase token handling
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuthStore } from '../../src/core/stores/index.js';
import type { AuthConfig } from '../../src/core/types/index.js';

// Mock external dependencies
vi.mock('../../src/core/api/auth-api', () => ({
  // NOTE: must be a real `function`, not an arrow, so `new AuthApiClient()` works
  // under Vitest 4's stricter mock-constructor semantics (arrow functions are not constructible).
  AuthApiClient: vi.fn().mockImplementation(function () {
    return {
      signIn: vi.fn(),
      signInWithPasskey: vi.fn(),
      refreshToken: vi.fn(),
      signOut: vi.fn(),
      checkEmail: vi.fn(),
      sendAppEmailCode: vi.fn(),
      verifyAppEmailCode: vi.fn(),
      getPasskeyChallenge: vi.fn(),
      getWebAuthnRegistrationOptions: vi.fn(),
      verifyWebAuthnRegistration: vi.fn()
    };
  })
}));

describe('auth-core updateTokens', () => {
  let authStore: ReturnType<typeof createAuthStore>;

  const testConfig: AuthConfig = {
    apiBaseUrl: 'https://api.test.com',
    clientId: 'test-client',
    domain: 'test.com',
    enablePasskeys: true,
    appCode: 'test-app'
  };

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    authStore = createAuthStore(testConfig);
  });

  describe('Basic Token Updates', () => {
    it('should update all provided tokens', async () => {
      const expiresAtMs = Date.now() + 3600000;
      const supabaseExpiresAtMs = Date.now() + 7 * 24 * 60 * 60 * 1000;

      const tokens = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expiresAt: new Date(expiresAtMs).toISOString(),
        supabase_token: 'new-supabase-token',
        supabase_expires_at: new Date(supabaseExpiresAtMs).toISOString()
      };

      await authStore.core.getState().updateTokens(tokens);

      const state = authStore.core.getState();
      expect(state.access_token).toBe('new-access-token');
      expect(state.refresh_token).toBe('new-refresh-token');
      // expiresAt is stored as ISO string
      expect(state.expiresAt).toBeDefined();
      expect(typeof state.expiresAt).toBe('string');
      // Verify the ISO string represents the correct time (within 1 second)
      const expiresAtTime = new Date(state.expiresAt as string).getTime();
      expect(Math.abs(expiresAtTime - expiresAtMs)).toBeLessThan(1000);

      expect(state.supabase_token).toBe('new-supabase-token');
      // supabase_expires_at is stored as ISO string
      expect(state.supabase_expires_at).toBeDefined();
      expect(typeof state.supabase_expires_at).toBe('string');
      const supabaseExpiresAtTime = new Date(state.supabase_expires_at as string).getTime();
      expect(Math.abs(supabaseExpiresAtTime - supabaseExpiresAtMs)).toBeLessThan(1000);

      expect(state.refreshedAt).toBeDefined();
      expect(typeof state.refreshedAt).toBe('string');
    });

    it('should preserve existing refresh_token when not provided', async () => {
      // Set initial state
      await authStore.core.getState().updateTokens({
        access_token: 'initial-access',
        refresh_token: 'initial-refresh',
        expiresAt: new Date(Date.now() + 3600000).toISOString()
      });

      // Update without refresh_token
      await authStore.core.getState().updateTokens({
        access_token: 'updated-access',
        expiresAt: new Date(Date.now() + 7200000).toISOString()
      });

      const state = authStore.core.getState();
      expect(state.access_token).toBe('updated-access');
      expect(state.refresh_token).toBe('initial-refresh'); // Should be preserved
    });
  });

  describe('Supabase Token Handling', () => {
    beforeEach(async () => {
      // Set initial state with Supabase tokens
      await authStore.core.getState().updateTokens({
        access_token: 'initial-access',
        refresh_token: 'initial-refresh',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        supabase_token: 'initial-supabase-token',
        supabase_expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000
      });
    });

    it('should update supabase_token when explicitly provided', async () => {
      await authStore.core.getState().updateTokens({
        access_token: 'new-access',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        supabase_token: 'new-supabase-token',
        supabase_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });

      const state = authStore.core.getState();
      expect(state.supabase_token).toBe('new-supabase-token');
    });

    it('should clear supabase_token when not provided (server omits field)', async () => {
      await authStore.core.getState().updateTokens({
        access_token: 'new-access',
        expiresAt: new Date(Date.now() + 3600000).toISOString()
        // No supabase_token provided - server omitted the field
      });

      const state = authStore.core.getState();
      expect(state.supabase_token).toBeUndefined(); // Should be cleared when omitted
    });

    it('should set supabase_token to undefined when explicitly provided as undefined', async () => {
      await authStore.core.getState().updateTokens({
        access_token: 'new-access',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        supabase_token: undefined,
        supabase_expires_at: undefined
      });

      const state = authStore.core.getState();
      expect(state.supabase_token).toBeUndefined();
      expect(state.supabase_expires_at).toBeUndefined();
    });

    it('should set supabase_token to null when explicitly provided as null', async () => {
      await authStore.core.getState().updateTokens({
        access_token: 'new-access',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        // Intentionally passing null even though updateTokens' declared type only allows
        // `string | undefined` here - this test verifies defensive runtime behavior when a
        // caller passes null (e.g. a misbehaving server response) rather than undefined.
        supabase_token: null as unknown as undefined,
        supabase_expires_at: null as unknown as undefined
      });

      const state = authStore.core.getState();
      expect(state.supabase_token).toBeNull();
      // supabase_expires_at should be undefined when supabase_token is null
      expect(state.supabase_expires_at).toBeUndefined();
    });

    it('should handle mixed updates (some fields provided, others not)', async () => {
      await authStore.core.getState().updateTokens({
        access_token: 'new-access',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        supabase_token: 'updated-supabase-token'
        // supabase_expires_at not provided - will be undefined
      });

      const state = authStore.core.getState();
      expect(state.supabase_token).toBe('updated-supabase-token');
      expect(state.supabase_expires_at).toBeUndefined(); // Should be undefined when omitted
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string tokens correctly', async () => {
      await authStore.core.getState().updateTokens({
        access_token: '',
        refresh_token: '',
        expiresAt: null,
        supabase_token: '',
        supabase_expires_at: new Date(0).toISOString()
      });

      const state = authStore.core.getState();
      expect(state.access_token).toBe('');
      expect(state.refresh_token).toBe('');
      expect(state.supabase_token).toBe('');
      // supabase_expires_at should be the epoch ISO string
      expect(state.supabase_expires_at).toBe(new Date(0).toISOString());
    });

    it('should handle null expiresAt correctly', async () => {
      await authStore.core.getState().updateTokens({
        access_token: 'test-token',
        expiresAt: null
      });

      const state = authStore.core.getState();
      expect(state.expiresAt).toBeNull();
    });

    it('should update refreshedAt timestamp on every call', async () => {
      const before = Date.now();

      await authStore.core.getState().updateTokens({
        access_token: 'test-token',
        expiresAt: new Date(Date.now() + 3600000).toISOString()
      });

      const state = authStore.core.getState();
      expect(state.refreshedAt).toBeDefined();
      expect(typeof state.refreshedAt).toBe('string');
      // refreshedAt is now an ISO string, parse it to compare
      const refreshedAtMs = new Date(state.refreshedAt as string).getTime();
      expect(refreshedAtMs).toBeGreaterThanOrEqual(before);
      expect(refreshedAtMs).toBeLessThanOrEqual(Date.now());
    });

    it('should set state to authenticated', async () => {
      // Start with unauthenticated state
      expect(authStore.core.getState().state).toBe('unauthenticated');

      await authStore.core.getState().updateTokens({
        access_token: 'test-token',
        expiresAt: new Date(Date.now() + 3600000).toISOString()
      });

      expect(authStore.core.getState().state).toBe('authenticated');
    });
  });

  describe('Regression Tests', () => {
    it('should clear supabase tokens when server omits them (refresh scenario)', async () => {
      // Simulate initial authentication
      await authStore.core.getState().updateTokens({
        access_token: 'initial-access',
        refresh_token: 'initial-refresh',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        supabase_token: 'initial-supabase',
        supabase_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });

      // Simulate refresh response that only includes OAuth2 tokens (server omits Supabase fields)
      await authStore.core.getState().updateTokens({
        access_token: 'refreshed-access',
        refresh_token: 'refreshed-refresh',
        expiresAt: new Date(Date.now() + 3600000).toISOString()
        // No supabase_token or supabase_expires_at provided - server omitted them
      });

      const state = authStore.core.getState();
      expect(state.access_token).toBe('refreshed-access');
      expect(state.refresh_token).toBe('refreshed-refresh');
      expect(state.supabase_token).toBeUndefined(); // Should be cleared when omitted
      expect(state.supabase_expires_at).toBeUndefined(); // Should be cleared when omitted
    });

    it('should handle server response with undefined supabase tokens (the bug we fixed)', async () => {
      // Set initial state with Supabase tokens
      await authStore.core.getState().updateTokens({
        access_token: 'initial-access',
        refresh_token: 'initial-refresh',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        supabase_token: 'initial-supabase',
        supabase_expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000
      });

      // Simulate server response that explicitly returns undefined for Supabase tokens
      // This was the bug: undefined values were not overriding existing values
      await authStore.core.getState().updateTokens({
        access_token: 'new-access',
        refresh_token: 'new-refresh',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        supabase_token: undefined,
        supabase_expires_at: undefined
      });

      const state = authStore.core.getState();
      expect(state.supabase_token).toBeUndefined(); // Should be undefined, not preserved
      expect(state.supabase_expires_at).toBeUndefined(); // Should be undefined, not preserved
    });
  });
});
