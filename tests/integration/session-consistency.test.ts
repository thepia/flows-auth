/**
 * Session Consistency Integration Tests
 *
 * These tests verify that the sessionManager and auth state machine
 * use consistent storage and maintain authentication state properly.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthStateMachine } from '../../src/stores/auth-state-machine';
import type { AuthConfig, FlowsSessionData } from '../../src/types';
import {
  clearSession,
  configureSessionStorage,
  getSession,
  getStorageConfig,
  isSessionValid,
  saveSession,
} from '../../src/utils/sessionManager';

// Mock browser storage APIs
const mockSessionStorage = {
  data: new Map<string, string>(),
  getItem: vi.fn((key: string) => mockSessionStorage.data.get(key) || null),
  setItem: vi.fn((key: string, value: string) => mockSessionStorage.data.set(key, value)),
  removeItem: vi.fn((key: string) => mockSessionStorage.data.delete(key)),
  clear: vi.fn(() => mockSessionStorage.data.clear()),
};

const mockLocalStorage = {
  data: new Map<string, string>(),
  getItem: vi.fn((key: string) => mockLocalStorage.data.get(key) || null),
  setItem: vi.fn((key: string, value: string) => mockLocalStorage.data.set(key, value)),
  removeItem: vi.fn((key: string) => mockLocalStorage.data.delete(key)),
  clear: vi.fn(() => mockLocalStorage.data.clear()),
};

// Mock window object
Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true,
});

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock AuthApiClient
const mockApiClient = {
  signInWithPasskey: vi.fn(),
  createAccount: vi.fn(),
  checkUser: vi.fn(),
};

const mockConfig: AuthConfig = {
  apiBaseUrl: 'https://api.test.com',
  clientId: 'test-client',
  domain: 'test.com',
  enablePasskeys: true,
  enableMagicLinks: true,
  enableSocialLogin: false,
  enablePasswordLogin: false,
};

describe('Session Consistency Integration Tests', () => {
  let stateMachine: AuthStateMachine;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionStorage.data.clear();
    mockLocalStorage.data.clear();

    // Reset storage configuration to default
    configureSessionStorage({
      type: 'sessionStorage',
      userRole: 'guest',
    });

    stateMachine = new AuthStateMachine(mockApiClient as any, mockConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Storage Consistency', () => {
    it('should use the same storage for sessionManager and state machine', () => {
      const testSession: FlowsSessionData = {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
          initials: 'TU',
        },
        tokens: {
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
          expiresAt: Date.now() + 60000,
        },
        authMethod: 'passkey',
        lastActivity: Date.now(),
      };

      // Save session using sessionManager
      saveSession(testSession);

      // Verify it's stored in sessionStorage (default)
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'thepia_auth_session',
        expect.stringContaining('test-access-token')
      );
      // Note: localStorage.setItem may be called for lastUser data, which is expected
      const sessionStorageCalls = mockSessionStorage.setItem.mock.calls.filter(
        (call) => call[0] === 'thepia_auth_session'
      );
      expect(sessionStorageCalls.length).toBeGreaterThan(0);

      // Start state machine - it should find the session
      stateMachine.start();

      // Verify state machine found the session
      expect(stateMachine.currentState).toBe('sessionValid');
    });

    it('should maintain consistency when switching storage types', () => {
      // Start with sessionStorage
      const testSession: FlowsSessionData = {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
          initials: 'TU',
        },
        tokens: {
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
          expiresAt: Date.now() + 60000,
        },
        authMethod: 'passkey',
        lastActivity: Date.now(),
      };

      saveSession(testSession);
      expect(mockSessionStorage.setItem).toHaveBeenCalled();

      // Switch to localStorage
      configureSessionStorage({
        type: 'localStorage',
        userRole: 'employee',
      });

      // Save another session
      const updatedSession = { ...testSession, lastActivity: Date.now() };
      saveSession(updatedSession);

      // Should now use localStorage
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'thepia_auth_session',
        expect.stringContaining('test-access-token')
      );
    });

    it('should clear sessions from correct storage', () => {
      const testSession: FlowsSessionData = {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
          initials: 'TU',
        },
        tokens: {
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
          expiresAt: Date.now() + 60000,
        },
        authMethod: 'passkey',
        lastActivity: Date.now(),
      };

      // Save to sessionStorage
      saveSession(testSession);
      expect(getSession()).not.toBeNull();

      // Clear session
      clearSession();

      // Should remove from sessionStorage
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('thepia_auth_session');
      expect(getSession()).toBeNull();
    });
  });

  describe('State Machine Integration', () => {
    it('should start with sessionInvalid when no session exists', () => {
      stateMachine.start();
      expect(stateMachine.currentState).toBe('sessionInvalid');
    });

    it('should start with sessionValid when valid session exists', () => {
      const testSession: FlowsSessionData = {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
          initials: 'TU',
        },
        tokens: {
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
          expiresAt: Date.now() + 60000,
        },
        authMethod: 'passkey',
        lastActivity: Date.now(),
      };

      saveSession(testSession);
      stateMachine.start();

      expect(stateMachine.currentState).toBe('sessionValid');
    });

    it('should start with sessionInvalid when session is expired', () => {
      const expiredSession: FlowsSessionData = {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
          initials: 'TU',
        },
        tokens: {
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
          expiresAt: Date.now() - 60000, // Expired 1 minute ago
        },
        authMethod: 'passkey',
        lastActivity: Date.now() - 60000,
      };

      saveSession(expiredSession);
      stateMachine.start();

      expect(stateMachine.currentState).toBe('sessionInvalid');
    });
  });

  describe('Legacy Migration', () => {
    it('should clean up legacy localStorage entries', () => {
      // Simulate legacy localStorage data
      mockLocalStorage.data.set('auth_access_token', 'legacy-token');
      mockLocalStorage.data.set(
        'auth_user',
        JSON.stringify({
          id: 'legacy-user',
          email: 'legacy@example.com',
          name: 'Legacy User',
        })
      );
      mockLocalStorage.data.set('auth_refresh_token', 'legacy-refresh');

      // Start state machine - should clean up legacy data
      stateMachine.start();

      // Legacy localStorage should be cleaned up
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_access_token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_user');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_refresh_token');
    });
  });

  describe('Configuration Validation', () => {
    it('should respect storage configuration', () => {
      const config = getStorageConfig();
      expect(config.type).toBe('sessionStorage');
      expect(config.userRole).toBe('guest');

      configureSessionStorage({
        type: 'localStorage',
        userRole: 'employee',
        sessionTimeout: 7 * 24 * 60 * 60 * 1000,
      });

      const updatedConfig = getStorageConfig();
      expect(updatedConfig.type).toBe('localStorage');
      expect(updatedConfig.userRole).toBe('employee');
      expect(updatedConfig.sessionTimeout).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it('should validate session timeouts based on configuration', () => {
      // Configure short timeout for testing
      configureSessionStorage({
        type: 'sessionStorage',
        sessionTimeout: 1000, // 1 second
        userRole: 'guest',
      });

      const testSession: FlowsSessionData = {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
          initials: 'TU',
        },
        tokens: {
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
          expiresAt: Date.now() + 60000, // Token valid for 1 minute
        },
        authMethod: 'passkey',
        lastActivity: Date.now() - 2000, // Last activity 2 seconds ago
      };

      saveSession(testSession);

      // Session should be invalid due to timeout
      expect(isSessionValid(testSession)).toBe(false);
    });
  });
});
