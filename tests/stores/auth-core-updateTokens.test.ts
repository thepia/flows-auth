/**
 * Comprehensive tests for auth-core updateTokens method
 * Tests edge cases around token updates, especially Supabase token handling
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuthStore } from '../../src/stores';
import type { AuthConfig } from '../../src/types';

// Mock external dependencies
vi.mock('../../src/api/auth-api', () => ({
  AuthApiClient: vi.fn().mockImplementation(() => ({
    signIn: vi.fn(),
    signInWithMagicLink: vi.fn(),
    signInWithPasskey: vi.fn(),
    refreshToken: vi.fn(),
    signOut: vi.fn(),
    checkEmail: vi.fn(),
    sendAppEmailCode: vi.fn(),
    verifyAppEmailCode: vi.fn(),
    getPasskeyChallenge: vi.fn(),
    getWebAuthnRegistrationOptions: vi.fn(),
    verifyWebAuthnRegistration: vi.fn()
  }))
}));

describe('auth-core updateTokens', () => {
  let authStore: ReturnType<typeof createAuthStore>;

  const testConfig: AuthConfig = {
    apiBaseUrl: 'https://api.test.com',
    domain: 'test.com',
    enablePasskeys: true,
    enableMagicLinks: false
  };

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    authStore = createAuthStore(testConfig);
  });

  describe('Basic Token Updates', () => {
    it('should update all provided tokens', async () => {
      const tokens = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expiresAt: Date.now() + 3600000,
        supabase_token: 'new-supabase-token',
        supabase_expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000
      };

      await authStore.core.getState().updateTokens(tokens);

      const state = authStore.core.getState();
      expect(state.access_token).toBe('new-access-token');
      expect(state.refresh_token).toBe('new-refresh-token');
      expect(state.expiresAt).toBe(tokens.expiresAt);
      expect(state.supabase_token).toBe('new-supabase-token');
      expect(state.supabase_expires_at).toBe(tokens.supabase_expires_at);
      expect(state.refreshedAt).toBeDefined();
    });

    it('should preserve existing refresh_token when not provided', async () => {
      // Set initial state
      await authStore.core.getState().updateTokens({
        access_token: 'initial-access',
        refresh_token: 'initial-refresh',
        expiresAt: Date.now() + 3600000
      });

      // Update without refresh_token
      await authStore.core.getState().updateTokens({
        access_token: 'updated-access',
        expiresAt: Date.now() + 7200000
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
        expiresAt: Date.now() + 3600000,
        supabase_token: 'initial-supabase-token',
        supabase_expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000
      });
    });

    it('should update supabase_token when explicitly provided', async () => {
      await authStore.core.getState().updateTokens({
        access_token: 'new-access',
        expiresAt: Date.now() + 3600000,
        supabase_token: 'new-supabase-token',
        supabase_expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000
      });

      const state = authStore.core.getState();
      expect(state.supabase_token).toBe('new-supabase-token');
    });

    it('should clear supabase_token when not provided (server omits field)', async () => {
      await authStore.core.getState().updateTokens({
        access_token: 'new-access',
        expiresAt: Date.now() + 3600000
        // No supabase_token provided - server omitted the field
      });

      const state = authStore.core.getState();
      expect(state.supabase_token).toBeUndefined(); // Should be cleared when omitted
    });

    it('should set supabase_token to undefined when explicitly provided as undefined', async () => {
      await authStore.core.getState().updateTokens({
        access_token: 'new-access',
        expiresAt: Date.now() + 3600000,
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
        expiresAt: Date.now() + 3600000,
        supabase_token: null as string | null,
        supabase_expires_at: null as number | null
      });

      const state = authStore.core.getState();
      expect(state.supabase_token).toBeNull();
      expect(state.supabase_expires_at).toBeNull();
    });

    it('should handle mixed updates (some fields provided, others not)', async () => {
      await authStore.core.getState().updateTokens({
        access_token: 'new-access',
        expiresAt: Date.now() + 3600000,
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
        supabase_expires_at: 0
      });

      const state = authStore.core.getState();
      expect(state.access_token).toBe('');
      expect(state.refresh_token).toBe('');
      expect(state.supabase_token).toBe('');
      expect(state.supabase_expires_at).toBe(0);
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
        expiresAt: Date.now() + 3600000
      });

      const state = authStore.core.getState();
      expect(state.refreshedAt).toBeGreaterThanOrEqual(before);
      expect(state.refreshedAt).toBeLessThanOrEqual(Date.now());
    });

    it('should set state to authenticated', async () => {
      // Start with unauthenticated state
      expect(authStore.core.getState().state).toBe('unauthenticated');

      await authStore.core.getState().updateTokens({
        access_token: 'test-token',
        expiresAt: Date.now() + 3600000
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
        expiresAt: Date.now() + 3600000,
        supabase_token: 'initial-supabase',
        supabase_expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000
      });

      // Simulate refresh response that only includes OAuth2 tokens (server omits Supabase fields)
      await authStore.core.getState().updateTokens({
        access_token: 'refreshed-access',
        refresh_token: 'refreshed-refresh',
        expiresAt: Date.now() + 3600000
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
        expiresAt: Date.now() + 3600000,
        supabase_token: 'initial-supabase',
        supabase_expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000
      });

      // Simulate server response that explicitly returns undefined for Supabase tokens
      // This was the bug: undefined values were not overriding existing values
      await authStore.core.getState().updateTokens({
        access_token: 'new-access',
        refresh_token: 'new-refresh',
        expiresAt: Date.now() + 3600000,
        supabase_token: undefined,
        supabase_expires_at: undefined
      });

      const state = authStore.core.getState();
      expect(state.supabase_token).toBeUndefined(); // Should be undefined, not preserved
      expect(state.supabase_expires_at).toBeUndefined(); // Should be undefined, not preserved
    });
  });
});
