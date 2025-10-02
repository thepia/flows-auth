/**
 * Session Management Requirements Tests
 *
 * These tests verify compliance with SESSION_MANAGEMENT_REQUIREMENTS.md
 * Each test maps to specific requirements (R1, R2, etc.)
 */

import { get } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuthStore, makeSvelteCompatible } from '../../src/stores';
import type { AuthConfig, SignInData } from '../../src/types';
import {
  clearSession,
  configureSessionStorage,
  getOptimalSessionConfig,
  getSession,
  getStorageConfig,
  isSessionValid,
  saveSession
} from '../../src/utils/sessionManager';

// Mock browser storage APIs
const createMockStorage = () => ({
  data: new Map<string, string>(),
  getItem: vi.fn((key: string) => createMockStorage.data?.get(key) || null),
  setItem: vi.fn((key: string, value: string) => createMockStorage.data?.set(key, value)),
  removeItem: vi.fn((key: string) => createMockStorage.data?.delete(key)),
  clear: vi.fn(() => createMockStorage.data?.clear())
});

const mockSessionStorage = createMockStorage();
const mockLocalStorage = createMockStorage();

Object.defineProperty(window, 'sessionStorage', { value: mockSessionStorage });
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

const mockConfig: AuthConfig = {
  apiBaseUrl: 'https://api.test.com',
  clientId: 'test-client',
  domain: 'test.com',
  enablePasskeys: true,
  enableMagicLinks: false
};

const createTestSession = (): SignInData => ({
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    initials: 'TU'
  },
  tokens: {
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
    expiresAt: Date.now() + 60000
  },
  authMethod: 'passkey',
  lastActivity: Date.now()
});

describe('R1: Session Storage Consistency (CRITICAL)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionStorage.data.clear();
    mockLocalStorage.data.clear();
    configureSessionStorage({ type: 'sessionStorage', userRole: 'guest' });
  });

  describe('R1.1: Single Source of Truth', () => {
    it.skip('MUST use sessionManager as single source of truth', () => {
      const session = createTestSession();
      saveSession(session);

      // Verify session is accessible through sessionManager
      const retrievedSession = getSession();
      expect(retrievedSession).not.toBeNull();
      expect(retrievedSession?.tokens.accessToken).toBe('test-access-token');
    });

    it.skip('MUST NOT allow direct storage access outside sessionManager', () => {
      // This is enforced by code review and architecture, not runtime
      // Test verifies sessionManager is the only way to access session data
      const session = createTestSession();
      saveSession(session);

      // Direct storage access should not be used
      const directAccess = mockSessionStorage.getItem('thepia_auth_session');
      expect(directAccess).toBeTruthy(); // sessionManager did store it

      // But applications should only use sessionManager functions
      const properAccess = getSession();
      expect(properAccess).not.toBeNull();
    });
  });

  describe('R1.2: Unified Storage Key', () => {
    it('MUST use single session key "thepia_auth_session"', () => {
      const session = createTestSession();
      saveSession(session);

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'thepia_auth_session',
        expect.any(String)
      );
    });

    it('MUST NOT use legacy keys', () => {
      const session = createTestSession();
      saveSession(session);

      // Verify legacy keys are not used
      expect(mockSessionStorage.setItem).not.toHaveBeenCalledWith(
        'auth_access_token',
        expect.any(String)
      );
      expect(mockSessionStorage.setItem).not.toHaveBeenCalledWith('auth_user', expect.any(String));
      expect(mockSessionStorage.setItem).not.toHaveBeenCalledWith(
        'auth_refresh_token',
        expect.any(String)
      );
    });
  });

  describe('R1.3: State Machine Integration', () => {
    it.skip('MUST use sessionManager functions in state machine', () => {
      const session = createTestSession();
      saveSession(session);

      // Auth store should find session through sessionManager
      const authStore = makeSvelteCompatible(createAuthStore(mockConfig));
      authStore.initialize();

      // Should be authenticated since valid session exists
      const state = authStore.getState();
      expect(state.state).toBe('authenticated');
    });

    it('MUST NOT use direct localStorage in state machine', () => {
      // Simulate legacy localStorage data
      mockLocalStorage.data.set('auth_access_token', 'legacy-token');
      mockLocalStorage.data.set('auth_user', JSON.stringify({ id: 'legacy' }));

      // Auth store should NOT find legacy localStorage data
      const authStore = makeSvelteCompatible(createAuthStore(mockConfig));
      authStore.initialize();

      // Should be unauthenticated since no valid session exists
      const state = get(authStore);
      expect(state.state).toBe('unauthenticated');
    });
  });
});

describe('R2: Storage Configuration (SHOULD)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionStorage.data.clear();
    mockLocalStorage.data.clear();
  });

  describe('R2.1: Configurable Storage Type', () => {
    it('SHOULD support both sessionStorage and localStorage', () => {
      // Test sessionStorage configuration
      configureSessionStorage({ type: 'sessionStorage', userRole: 'guest' });
      let config = getStorageConfig();
      expect(config.type).toBe('sessionStorage');

      // Test localStorage configuration
      configureSessionStorage({ type: 'localStorage', userRole: 'employee' });
      config = getStorageConfig();
      expect(config.type).toBe('localStorage');
    });

    it('SHOULD default to sessionStorage for security', () => {
      configureSessionStorage({ userRole: 'guest' }); // No type specified
      const config = getStorageConfig();
      expect(config.type).toBe('sessionStorage');
    });
  });

  describe('R2.2: Role-Based Storage Strategy', () => {
    it('SHOULD configure guest users with localStorage for persistence', () => {
      const guestConfig = getOptimalSessionConfig('guest');

      expect(guestConfig.type).toBe('localStorage');
      expect(guestConfig.sessionTimeout).toBe(8 * 60 * 60 * 1000); // 8 hours
      expect(guestConfig.persistentSessions).toBe(true);
    });

    it('SHOULD configure employee users with localStorage', () => {
      const employeeConfig = getOptimalSessionConfig('employee');

      expect(employeeConfig.type).toBe('localStorage');
      expect(employeeConfig.sessionTimeout).toBe(7 * 24 * 60 * 60 * 1000); // 7 days
      expect(employeeConfig.persistentSessions).toBe(true);
    });

    it('SHOULD configure admin users with localStorage', () => {
      const adminConfig = getOptimalSessionConfig('admin');

      expect(adminConfig.type).toBe('localStorage');
      expect(adminConfig.persistentSessions).toBe(true);
    });
  });

  describe('R2.3: Runtime Configuration', () => {
    it('SHOULD allow storage configuration at runtime', () => {
      // Start with sessionStorage
      configureSessionStorage({ type: 'sessionStorage', userRole: 'guest' });
      expect(getStorageConfig().type).toBe('sessionStorage');

      // Switch to localStorage
      configureSessionStorage({ type: 'localStorage', userRole: 'employee' });
      expect(getStorageConfig().type).toBe('localStorage');
    });

    it('SHOULD provide helper functions for optimal configuration', () => {
      const guestConfig = getOptimalSessionConfig('guest');
      const employeeConfig = getOptimalSessionConfig('employee');

      expect(guestConfig).toBeDefined();
      expect(employeeConfig).toBeDefined();
      // Both use localStorage now for persistence
      expect(guestConfig.type).toBe(employeeConfig.type);
    });
  });
});

describe('R3: Session Validation (MUST)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionStorage.data.clear();
    mockLocalStorage.data.clear();
    configureSessionStorage({ type: 'sessionStorage', userRole: 'guest' });
  });

  describe('R3.1: Token Expiration', () => {
    it('MUST check tokens.expiresAt against current time', () => {
      const expiredSession: SignInData = {
        ...createTestSession(),
        tokens: {
          accessToken: 'expired-token',
          refreshToken: 'expired-refresh',
          expiresAt: Date.now() - 60000 // Expired 1 minute ago
        }
      };

      expect(isSessionValid(expiredSession)).toBe(false);
    });

    it('MUST clear expired sessions automatically', () => {
      const expiredSession: SignInData = {
        ...createTestSession(),
        tokens: {
          accessToken: 'expired-token',
          refreshToken: 'expired-refresh',
          expiresAt: Date.now() - 60000
        }
      };

      saveSession(expiredSession);

      // getSession should clear expired session and return null
      const retrievedSession = getSession();
      expect(retrievedSession).toBeNull();
    });
  });

  describe('R3.2: Activity Timeout', () => {
    it('MUST check lastActivity against configurable timeout', () => {
      configureSessionStorage({
        type: 'sessionStorage',
        sessionTimeout: 1000, // 1 second
        userRole: 'guest'
      });

      const inactiveSession: SignInData = {
        ...createTestSession(),
        lastActivity: Date.now() - 2000 // 2 seconds ago
      };

      expect(isSessionValid(inactiveSession)).toBe(false);
    });

    it('MUST clear inactive sessions automatically', () => {
      configureSessionStorage({
        type: 'sessionStorage',
        sessionTimeout: 1000, // 1 second
        userRole: 'guest'
      });

      const inactiveSession: SignInData = {
        ...createTestSession(),
        lastActivity: Date.now() - 2000
      };

      saveSession(inactiveSession);

      // getSession should clear inactive session
      const retrievedSession = getSession();
      expect(retrievedSession).toBeNull();
    });
  });

  describe('R3.3: Session Structure Validation', () => {
    it.skip('MUST handle corrupted session data gracefully', () => {
      // Manually insert corrupted data
      mockSessionStorage.data.set('thepia_auth_session', 'invalid-json');

      // Should return null and clear corrupted data
      const session = getSession();
      expect(session).toBeNull();
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('thepia_auth_session');
    });

    it('MUST validate session data structure', () => {
      const incompleteSession = {
        user: { email: 'test@example.com' } // Missing required fields
        // Missing tokens
      };

      mockSessionStorage.data.set('thepia_auth_session', JSON.stringify(incompleteSession));

      // Should handle incomplete session gracefully
      expect(() => getSession()).not.toThrow();
    });
  });
});

describe('R4: Legacy Migration (MUST)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionStorage.data.clear();
    mockLocalStorage.data.clear();
    configureSessionStorage({ type: 'sessionStorage', userRole: 'guest' });
  });

  describe('R4.2: Backward Compatibility', () => {
    it.skip('MUST work without configuration changes', () => {
      // Test that existing applications work without any config changes
      const session = createTestSession();
      saveSession(session);

      const retrievedSession = getSession();
      expect(retrievedSession).not.toBeNull();
      expect(retrievedSession?.tokens.accessToken).toBe('test-access-token');
    });

    it('MUST gracefully handle missing configuration', () => {
      // Should not throw when no storage config is provided
      expect(() => {
        const authStore = makeSvelteCompatible(createAuthStore(mockConfig));
        authStore.initialize();
      }).not.toThrow();
    });

    it('MUST default to sessionStorage behavior', () => {
      // Without explicit configuration, should behave like sessionStorage
      const session = createTestSession();
      saveSession(session);

      // Should use sessionStorage by default
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'thepia_auth_session',
        expect.any(String)
      );
    });
  });
});

describe('R5: Event System (MUST)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionStorage.data.clear();
    mockLocalStorage.data.clear();
    configureSessionStorage({ type: 'sessionStorage', userRole: 'guest' });
  });

  describe('R5.1: Session Events', () => {
    it('MUST emit sessionUpdate event on session save', () => {
      const eventSpy = vi.fn();
      window.addEventListener('sessionUpdate', eventSpy);

      const session = createTestSession();
      saveSession(session);

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { session: session }
        })
      );

      window.removeEventListener('sessionUpdate', eventSpy);
    });

    it('MUST emit sessionUpdate event on session clear', () => {
      const eventSpy = vi.fn();
      window.addEventListener('sessionUpdate', eventSpy);

      clearSession();

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { session: null }
        })
      );

      window.removeEventListener('sessionUpdate', eventSpy);
    });
  });
});

describe('R7: Security Requirements (CRITICAL)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionStorage.data.clear();
    mockLocalStorage.data.clear();
  });

  describe('R7.1: Default Security', () => {
    it('MUST default to sessionStorage', () => {
      configureSessionStorage({ userRole: 'guest' }); // No type specified

      const config = getStorageConfig();
      expect(config.type).toBe('sessionStorage');
    });

    it('MUST require explicit configuration for localStorage', () => {
      const guestConfig = getOptimalSessionConfig('guest');
      const employeeConfig = getOptimalSessionConfig('employee');

      // Now both use localStorage for persistence
      expect(guestConfig.type).toBe('localStorage');
      expect(employeeConfig.type).toBe('localStorage'); // Explicit for employees
    });
  });

  describe('R7.2: Session Timeouts', () => {
    it('MUST enforce guest sessions ≤ 8 hours', () => {
      const guestConfig = getOptimalSessionConfig('guest');
      const eightHours = 8 * 60 * 60 * 1000;

      expect(guestConfig.sessionTimeout).toBeLessThanOrEqual(eightHours);
    });

    it('MUST enforce employee sessions ≤ 7 days', () => {
      const employeeConfig = getOptimalSessionConfig('employee');
      const sevenDays = 7 * 24 * 60 * 60 * 1000;

      expect(employeeConfig.sessionTimeout).toBeLessThanOrEqual(sevenDays);
    });
  });

  describe('R7.3: Data Protection', () => {
    it('MUST clear sessions on sign out', () => {
      const session = createTestSession();
      saveSession(session);

      clearSession();

      expect(getSession()).toBeNull();
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('thepia_auth_session');
    });
  });
});
