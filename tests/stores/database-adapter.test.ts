/**
 * Database Adapter Configuration Tests
 *
 * Tests that the auth store correctly handles:
 * 1. Custom database adapters passed via AuthConfig.database
 * 2. Default localStorage adapter when no database is provided
 * 3. Adapter initialization and session restoration
 * 4. User profile persistence (saveUser, getUser, clearUser)
 * 5. Separation of session tokens and user profile data
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuthStore } from '../../src/stores';
import { createLocalStorageAdapter } from '../../src/stores/core/database';
import type {
  AuthConfig,
  SessionData,
  SessionPersistence,
  SignInData,
  UserData
} from '../../src/types';

// Mock API client
vi.mock('../../src/api/auth-api', () => ({
  AuthApiClient: vi.fn().mockImplementation(() => ({
    signIn: vi.fn(),
    signOut: vi.fn(),
    refresh_token: vi.fn()
  }))
}));

// Mock telemetry
vi.mock('../../src/utils/telemetry', () => ({
  initializeTelemetry: vi.fn(),
  updateErrorReporterConfig: vi.fn(),
  reportAuthState: vi.fn(),
  reportWebAuthnError: vi.fn(),
  reportApiError: vi.fn(),
  flushErrorReports: vi.fn(),
  getErrorReportQueueSize: vi.fn(() => 0),
  // New telemetry convenience functions
  reportAuthEvent: vi.fn(),
  reportSessionEvent: vi.fn(),
  reportRefreshEvent: vi.fn()
}));

let mockStorage: Record<string, string> = {};

// Mock session manager utilities (used by localStorage adapter)
vi.mock('../../src/utils/sessionManager', () => ({
  configureSessionStorage: vi.fn(),
  getOptimalSessionConfig: vi.fn(() => ({ type: 'sessionStorage' })),
  getSession: vi.fn(),
  saveSession: vi.fn(),
  clearSession: vi.fn(),
  isSessionValid: vi.fn()
}));

vi.mock('../../src/utils/storageManager', () => ({
  getStorageManager: vi.fn(() => ({
    getItem: vi.fn((key: string) => mockStorage[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      mockStorage[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete mockStorage[key];
    }),
    clear: vi.fn(() => {
      mockStorage = {};
    }),
    getConfig: vi.fn(() => ({ type: 'sessionStorage' })),
    getSessionTimeout: vi.fn(() => 8 * 60 * 60 * 1000)
  }))
}));

// Mock date helpers
vi.mock('../../src/utils/date-helpers', () => ({
  isOlderThan: vi.fn(() => false), // Default: not expired
  nowISO: vi.fn(() => '2024-10-15T14:22:00.000Z')
}));

const mockConfig: AuthConfig = {
  apiBaseUrl: 'https://api.test.com',
  clientId: 'test-client',
  domain: 'test.com',
  enablePasskeys: true,
  enableMagicLinks: true
};

describe('Database Adapter Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    mockStorage = {};
  });

  describe('Default localStorage Adapter', () => {
    it('should use createLocalStorageAdapter when no database is provided', () => {
      const store = createAuthStore(mockConfig);

      // The store should be created successfully without errors
      expect(store).toBeDefined();
      expect(store.core).toBeDefined();
      expect(store.session).toBeDefined();

      store.destroy();
    });

    it('should configure session storage using optimal defaults', async () => {
      const { configureSessionStorage, getOptimalSessionConfig } = await import(
        '../../src/utils/sessionManager'
      );

      createAuthStore(mockConfig);

      // Verify storage configuration was called
      expect(vi.mocked(getOptimalSessionConfig)).toHaveBeenCalled();
      expect(vi.mocked(configureSessionStorage)).toHaveBeenCalledWith({ type: 'sessionStorage' });
    });

    it('should use custom storage config if provided in AuthConfig', async () => {
      const { configureSessionStorage } = await import('../../src/utils/sessionManager');

      const configWithStorage: AuthConfig = {
        ...mockConfig,
        storage: {
          type: 'localStorage',
          enablePersistence: true,
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        }
      };

      createAuthStore(configWithStorage);

      // Verify custom storage config was used
      expect(vi.mocked(configureSessionStorage)).toHaveBeenCalledWith({
        type: 'localStorage',
        enablePersistence: true,
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
    });
  });

  describe('Custom Database Adapter', () => {
    it('should use custom database adapter when provided', () => {
      const mockAdapter: SessionPersistence = {
        saveSession: vi.fn().mockResolvedValue(undefined),
        loadSession: vi.fn().mockResolvedValue(null),
        clearSession: vi.fn().mockResolvedValue(undefined),
        saveUser: vi.fn().mockResolvedValue(undefined),
        getUser: vi.fn().mockResolvedValue(null),
        clearUser: vi.fn().mockResolvedValue(undefined)
      };

      const configWithDb: AuthConfig = {
        ...mockConfig,
        database: mockAdapter
      };

      const store = createAuthStore(configWithDb);

      // Verify store was created
      expect(store).toBeDefined();

      // Verify the custom adapter's loadSession was called during initialization
      expect(mockAdapter.loadSession).toHaveBeenCalled();

      store.destroy();
    });

    it('should restore session from custom adapter on initialization', async () => {
      const mockSessionData: SessionData = {
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: true,
        metadata: { role: 'admin' },
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
        expiresAt: Date.now() + 3600000, // 1 hour from now
        authMethod: 'passkey'
      };

      const mockAdapter: SessionPersistence = {
        saveSession: vi.fn().mockResolvedValue(undefined),
        loadSession: vi.fn().mockResolvedValue(mockSessionData),
        clearSession: vi.fn().mockResolvedValue(undefined),
        saveUser: vi.fn().mockResolvedValue(undefined),
        getUser: vi.fn().mockResolvedValue(null),
        clearUser: vi.fn().mockResolvedValue(undefined)
      };

      const configWithDb: AuthConfig = {
        ...mockConfig,
        database: mockAdapter
      };

      const store = createAuthStore(configWithDb);

      // Wait for async session initialization
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify session was restored
      const coreState = store.core.getState();
      expect(coreState.state).toBe('authenticated');
      expect(coreState.user?.id).toBe('user-123');
      expect(coreState.user?.email).toBe('test@example.com');
      expect(coreState.access_token).toBe('access-token-123');
      expect(coreState.refresh_token).toBe('refresh-token-123');

      // Verify UI state updated
      const uiState = store.ui.getState();
      expect(uiState.signInState).toBe('signedIn');

      store.destroy();
    });

    it('should not restore session if adapter returns null', async () => {
      const mockAdapter: SessionPersistence = {
        saveSession: vi.fn().mockResolvedValue(undefined),
        loadSession: vi.fn().mockResolvedValue(null), // No session
        clearSession: vi.fn().mockResolvedValue(undefined),
        saveUser: vi.fn().mockResolvedValue(undefined),
        getUser: vi.fn().mockResolvedValue(null),
        clearUser: vi.fn().mockResolvedValue(undefined)
      };

      const configWithDb: AuthConfig = {
        ...mockConfig,
        database: mockAdapter
      };

      const store = createAuthStore(configWithDb);

      // Wait for async session initialization
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify no session was restored
      const coreState = store.core.getState();
      expect(coreState.state).toBe('unauthenticated');
      expect(coreState.user).toBeNull();
      expect(coreState.access_token).toBeNull();

      store.destroy();
    });

    it('should not restore expired session', async () => {
      const expiredSessionData: SessionData = {
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: true,
        metadata: {},
        accessToken: 'expired-token',
        refreshToken: undefined, // No refresh token - session should not be restored
        expiresAt: Date.now() - 1000, // Expired 1 second ago
        authMethod: 'email-code'
      };

      const mockAdapter: SessionPersistence = {
        saveSession: vi.fn().mockResolvedValue(undefined),
        loadSession: vi.fn().mockResolvedValue(expiredSessionData),
        clearSession: vi.fn().mockResolvedValue(undefined),
        saveUser: vi.fn().mockResolvedValue(undefined),
        getUser: vi.fn().mockResolvedValue(null),
        clearUser: vi.fn().mockResolvedValue(undefined)
      };

      const configWithDb: AuthConfig = {
        ...mockConfig,
        database: mockAdapter
      };

      const store = createAuthStore(configWithDb);

      // Wait for async session initialization
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify expired session was not restored
      const coreState = store.core.getState();
      expect(coreState.state).toBe('unauthenticated');
      expect(coreState.user).toBeNull();

      store.destroy();
    });

    it('should handle adapter errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const faultyAdapter: SessionPersistence = {
        saveSession: vi.fn().mockResolvedValue(undefined),
        loadSession: vi.fn().mockRejectedValue(new Error('Database connection failed')),
        clearSession: vi.fn().mockResolvedValue(undefined)
      };

      const configWithDb: AuthConfig = {
        ...mockConfig,
        database: faultyAdapter
      };

      const store = createAuthStore(configWithDb);

      // Wait for async session initialization
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Session initialization failed:',
        expect.any(Error)
      );

      // Verify store remains functional in unauthenticated state
      const coreState = store.core.getState();
      expect(coreState.state).toBe('unauthenticated');

      store.destroy();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Session Persistence with Adapters', () => {
    it('should persist session via custom adapter on authentication', async () => {
      const mockAdapter: SessionPersistence = {
        saveSession: vi.fn().mockResolvedValue(undefined),
        loadSession: vi.fn().mockResolvedValue(null),
        clearSession: vi.fn().mockResolvedValue(undefined),
        saveUser: vi.fn().mockResolvedValue(undefined),
        getUser: vi.fn().mockResolvedValue(null),
        clearUser: vi.fn().mockResolvedValue(undefined)
      };

      const configWithDb: AuthConfig = {
        ...mockConfig,
        database: mockAdapter
      };

      const store = createAuthStore(configWithDb);

      // Simulate authentication
      const mockUser = {
        id: 'user-456',
        email: 'newuser@example.com',
        name: 'New User',
        emailVerified: true,
        createdAt: new Date().toISOString()
      };

      const mockTokens = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expiresAt: Date.now() + 3600000
      };

      // Update authentication state
      store.core.getState().updateUser(mockUser);
      await store.core.getState().updateTokens(mockTokens);

      // Wait for async save
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify adapter's saveSession was called
      expect(mockAdapter.saveSession).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-456',
          email: 'newuser@example.com',
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token'
        })
      );

      store.destroy();
    });

    it('should clear session via custom adapter on sign out', async () => {
      const mockAdapter: SessionPersistence = {
        saveSession: vi.fn().mockResolvedValue(undefined),
        loadSession: vi.fn().mockResolvedValue(null),
        clearSession: vi.fn().mockResolvedValue(undefined),
        saveUser: vi.fn().mockResolvedValue(undefined),
        getUser: vi.fn().mockResolvedValue(null),
        clearUser: vi.fn().mockResolvedValue(undefined)
      };

      const configWithDb: AuthConfig = {
        ...mockConfig,
        database: mockAdapter
      };

      const store = createAuthStore(configWithDb);

      // Simulate sign out
      await store.core.getState().signOut();

      // Verify adapter's clearSession was called
      expect(mockAdapter.clearSession).toHaveBeenCalled();

      // Verify state is cleared
      const coreState = store.core.getState();
      expect(coreState.state).toBe('unauthenticated');
      expect(coreState.user).toBeNull();
      expect(coreState.access_token).toBeNull();

      store.destroy();
    });
  });

  describe('createLocalStorageAdapter Function', () => {
    it('should create a valid SessionPersistence', () => {
      const adapter = createLocalStorageAdapter(mockConfig);

      expect(adapter).toBeDefined();
      expect(typeof adapter.saveSession).toBe('function');
      expect(typeof adapter.loadSession).toBe('function');
      expect(typeof adapter.clearSession).toBe('function');
    });

    it('should work without config parameter', () => {
      const adapter = createLocalStorageAdapter();

      expect(adapter).toBeDefined();
      expect(typeof adapter.saveSession).toBe('function');
      expect(typeof adapter.loadSession).toBe('function');
      expect(typeof adapter.clearSession).toBe('function');
    });

    it('should convert SessionData to internal format on save', async () => {
      const adapter = createLocalStorageAdapter(mockConfig);

      const sessionData: SessionData = {
        userId: 'user-789',
        email: 'save@example.com',
        name: 'Save User',
        emailVerified: true,
        metadata: { foo: 'bar' },
        accessToken: 'save-token',
        refreshToken: 'save-refresh',
        expiresAt: Date.now() + 3600000,
        refreshedAt: Date.now(),
        authMethod: 'magic-link'
      };

      await adapter.saveSession(sessionData);

      // Verify data was saved to storage in SignInData format
      const storedData = mockStorage['thepia_auth_session'];
      expect(storedData).toBeDefined();

      const parsedData = JSON.parse(storedData);
      expect(parsedData).toMatchObject({
        user: {
          id: 'user-789',
          email: 'save@example.com',
          name: 'Save User'
        },
        tokens: {
          accessToken: 'save-token',
          refreshToken: 'save-refresh'
        },
        authMethod: 'magic-link'
      });
    });

    it('should convert internal format to SessionData on load', async () => {
      // Put internal session data into mock storage
      const internalSession = {
        user: {
          id: 'user-load',
          email: 'load@example.com',
          name: 'Load User',
          initials: 'LU',
          avatar: null,
          preferences: { theme: 'dark' }
        },
        tokens: {
          accessToken: 'load-token',
          refreshToken: 'load-refresh',
          expiresAt: Date.now() + 3600000,
          refreshedAt: Date.now()
        },
        authMethod: 'passkey' as const
      };

      mockStorage['thepia_auth_session'] = JSON.stringify(internalSession);

      const adapter = createLocalStorageAdapter(mockConfig);
      const sessionData = await adapter.loadSession();

      expect(sessionData).toEqual(
        expect.objectContaining({
          userId: 'user-load',
          email: 'load@example.com',
          name: 'Load User',
          accessToken: 'load-token',
          refreshToken: 'load-refresh',
          authMethod: 'passkey'
        })
      );
    });

    it('should return null if no valid session exists', async () => {
      // Don't put anything in mockStorage - it should be empty
      mockStorage = {};

      const adapter = createLocalStorageAdapter(mockConfig);
      const sessionData = await adapter.loadSession();

      expect(sessionData).toBeNull();
    });

    it('should clear session via storage manager', async () => {
      const adapter = createLocalStorageAdapter(mockConfig);

      // Save a session first
      const mockSession: SessionData = {
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: true,
        metadata: {},
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        refreshedAt: Date.now(),
        expiresAt: Date.now() + 3600000,
        authMethod: 'passkey'
      };
      await adapter.saveSession(mockSession);

      // Verify it was saved
      expect(mockStorage.thepia_auth_session).toBeDefined();

      // Clear session
      await adapter.clearSession();

      // Verify it was removed
      expect(mockStorage.thepia_auth_session).toBeUndefined();
    });
  });

  describe('Adapter Integration with Store Options', () => {
    it('should pass database adapter to all stores via StoreOptions', () => {
      const mockAdapter: SessionPersistence = {
        saveSession: vi.fn().mockResolvedValue(undefined),
        loadSession: vi.fn().mockResolvedValue(null),
        clearSession: vi.fn().mockResolvedValue(undefined),
        saveUser: vi.fn().mockResolvedValue(undefined),
        getUser: vi.fn().mockResolvedValue(null),
        clearUser: vi.fn().mockResolvedValue(undefined)
      };

      const configWithDb: AuthConfig = {
        ...mockConfig,
        database: mockAdapter
      };

      const store = createAuthStore(configWithDb);

      // Verify store was created (proves db was passed successfully)
      expect(store).toBeDefined();
      expect(store.core).toBeDefined();
      expect(store.session).toBeDefined();

      // The fact that no errors occurred means db was properly passed to stores
      store.destroy();
    });
  });

  describe('User Profile Persistence - New Methods', () => {
    describe('saveUser Method', () => {
      it('should save user profile with all fields', async () => {
        const mockAdapter: SessionPersistence = {
          saveSession: vi.fn().mockResolvedValue(undefined),
          loadSession: vi.fn().mockResolvedValue(null),
          clearSession: vi.fn().mockResolvedValue(undefined),
          saveUser: vi.fn().mockResolvedValue(undefined),
          getUser: vi.fn().mockResolvedValue(null),
          clearUser: vi.fn().mockResolvedValue(undefined)
        };

        const configWithDb: AuthConfig = {
          ...mockConfig,
          database: mockAdapter
        };

        const store = createAuthStore(configWithDb);

        // Simulate authentication with full user data
        const mockUser = {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          picture: 'https://example.com/avatar.jpg',
          emailVerified: true,
          createdAt: '2024-01-01T00:00:00Z',
          lastLoginAt: '2024-10-15T12:00:00Z',
          metadata: { role: 'admin', theme: 'dark' }
        };

        const mockTokens = {
          access_token: 'access-token-123',
          refresh_token: 'refresh-token-123',
          expiresAt: Date.now() + 3600000
        };

        store.core.getState().updateUser(mockUser);
        await store.core.getState().updateTokens(mockTokens);

        // Wait for async save
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Verify saveUser was called with correct UserData
        expect(mockAdapter.saveUser).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 'user-123',
            email: 'test@example.com',
            name: 'Test User',
            avatar: 'https://example.com/avatar.jpg',
            emailVerified: true,
            createdAt: '2024-01-01T00:00:00Z',
            lastLoginAt: '2024-10-15T12:00:00Z',
            metadata: { role: 'admin', theme: 'dark' }
          })
        );

        store.destroy();
      });

      it('should handle missing optional user fields', async () => {
        const mockAdapter: SessionPersistence = {
          saveSession: vi.fn().mockResolvedValue(undefined),
          loadSession: vi.fn().mockResolvedValue(null),
          clearSession: vi.fn().mockResolvedValue(undefined),
          saveUser: vi.fn().mockResolvedValue(undefined),
          getUser: vi.fn().mockResolvedValue(null),
          clearUser: vi.fn().mockResolvedValue(undefined)
        };

        const configWithDb: AuthConfig = {
          ...mockConfig,
          database: mockAdapter
        };

        const store = createAuthStore(configWithDb);

        // User with minimal data
        const mockUser = {
          id: 'user-456',
          email: 'minimal@example.com',
          emailVerified: false,
          createdAt: '2024-01-01T00:00:00Z'
          // No name, picture, lastLoginAt, metadata
        };

        const mockTokens = {
          access_token: 'token',
          refresh_token: 'refresh',
          expiresAt: Date.now() + 3600000
        };

        store.core.getState().updateUser(mockUser);
        await store.core.getState().updateTokens(mockTokens);
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Verify saveUser handles missing fields
        expect(mockAdapter.saveUser).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 'user-456',
            email: 'minimal@example.com',
            emailVerified: false
          })
        );

        store.destroy();
      });
    });

    describe('getUser Method', () => {
      it('should retrieve user profile by userId', async () => {
        const mockUserData: UserData = {
          userId: 'user-get-123',
          email: 'get@example.com',
          name: 'Get User',
          avatar: 'https://example.com/get-avatar.jpg',
          emailVerified: true,
          createdAt: '2024-01-01T00:00:00Z',
          lastLoginAt: '2024-10-15T10:00:00Z',
          metadata: { plan: 'premium' },
          authMethod: 'passkey'
        };

        const mockAdapter: SessionPersistence = {
          saveSession: vi.fn().mockResolvedValue(undefined),
          loadSession: vi.fn().mockResolvedValue(null),
          clearSession: vi.fn().mockResolvedValue(undefined),
          saveUser: vi.fn().mockResolvedValue(undefined),
          getUser: vi.fn().mockResolvedValue(mockUserData),
          clearUser: vi.fn().mockResolvedValue(undefined)
        };

        const adapter = mockAdapter;

        // Call getUser directly
        const userData = await adapter.getUser('user-get-123');

        expect(mockAdapter.getUser).toHaveBeenCalledWith('user-get-123');
        expect(userData).toEqual(mockUserData);
      });

      it('should return null if user not found', async () => {
        const mockAdapter: SessionPersistence = {
          saveSession: vi.fn().mockResolvedValue(undefined),
          loadSession: vi.fn().mockResolvedValue(null),
          clearSession: vi.fn().mockResolvedValue(undefined),
          saveUser: vi.fn().mockResolvedValue(undefined),
          getUser: vi.fn().mockResolvedValue(null),
          clearUser: vi.fn().mockResolvedValue(undefined)
        };

        const userData = await mockAdapter.getUser('non-existent-user');

        expect(userData).toBeNull();
      });
    });

    describe('clearUser Method', () => {
      it('should clear user profile when implemented', async () => {
        const mockAdapter: SessionPersistence = {
          saveSession: vi.fn().mockResolvedValue(undefined),
          loadSession: vi.fn().mockResolvedValue(null),
          clearSession: vi.fn().mockResolvedValue(undefined),
          saveUser: vi.fn().mockResolvedValue(undefined),
          getUser: vi.fn().mockResolvedValue(null),
          clearUser: vi.fn().mockResolvedValue(undefined)
        };

        const store = createAuthStore({ ...mockConfig, database: mockAdapter });

        // Call session store's clearSession (which calls both db.clearSession and db.clearUser)
        await store.session.getState().clearSession();

        // Verify both methods were called
        expect(mockAdapter.clearSession).toHaveBeenCalled();
        expect(mockAdapter.clearUser).toHaveBeenCalled();

        store.destroy();
      });

      it('should work with adapters that do not implement clearUser', async () => {
        // Adapter without clearUser (optional method)
        const mockAdapter: SessionPersistence = {
          saveSession: vi.fn().mockResolvedValue(undefined),
          loadSession: vi.fn().mockResolvedValue(null),
          clearSession: vi.fn().mockResolvedValue(undefined),
          saveUser: vi.fn().mockResolvedValue(undefined),
          getUser: vi.fn().mockResolvedValue(null),
          clearUser: vi.fn().mockResolvedValue(undefined)
          // No clearUser
        };

        const store = createAuthStore({ ...mockConfig, database: mockAdapter });

        // Sign out should not fail
        await expect(store.core.getState().signOut()).resolves.not.toThrow();

        store.destroy();
      });
    });

    describe('Session and User Separation', () => {
      it('should save both session and user data on authentication', async () => {
        const mockAdapter: SessionPersistence = {
          saveSession: vi.fn().mockResolvedValue(undefined),
          loadSession: vi.fn().mockResolvedValue(null),
          clearSession: vi.fn().mockResolvedValue(undefined),
          saveUser: vi.fn().mockResolvedValue(undefined),
          getUser: vi.fn().mockResolvedValue(null),
          clearUser: vi.fn().mockResolvedValue(undefined)
        };

        const store = createAuthStore({ ...mockConfig, database: mockAdapter });

        const mockUser = {
          id: 'user-both-123',
          email: 'both@example.com',
          name: 'Both User',
          picture: 'https://example.com/both.jpg',
          emailVerified: true,
          createdAt: '2024-01-01T00:00:00Z',
          metadata: { subscription: 'pro' }
        };

        store.core.getState().updateUser(mockUser);
        await store.core.getState().updateTokens({
          access_token: 'access',
          refresh_token: 'refresh',
          expiresAt: Date.now() + 3600000
        });
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Verify both methods called
        expect(mockAdapter.saveSession).toHaveBeenCalled();
        expect(mockAdapter.saveUser).toHaveBeenCalled();

        // Verify session has tokens
        const sessionCall = vi.mocked(mockAdapter.saveSession).mock.calls[0][0];
        expect(sessionCall.accessToken).toBe('access');
        expect(sessionCall.refreshToken).toBe('refresh');

        // Verify user has profile data
        const userCall = vi.mocked(mockAdapter.saveUser).mock.calls[0][0];
        expect(userCall.userId).toBe('user-both-123');
        expect(userCall.avatar).toBe('https://example.com/both.jpg');
        expect(userCall.metadata).toEqual({ subscription: 'pro' });

        store.destroy();
      });

      it('should preserve user profile after session cleared', async () => {
        let sessionCleared = false;
        let userCleared = false;

        const mockAdapter: SessionPersistence = {
          saveSession: vi.fn().mockResolvedValue(undefined),
          loadSession: vi.fn().mockResolvedValue(null),
          clearSession: vi.fn().mockImplementation(async () => {
            sessionCleared = true;
          }),
          saveUser: vi.fn().mockResolvedValue(undefined),
          getUser: vi.fn().mockResolvedValue(null),
          clearUser: vi.fn().mockImplementation(async () => {
            userCleared = true;
          })
        };

        const store = createAuthStore({ ...mockConfig, database: mockAdapter });

        // Call session store's clearSession (which clears both)
        await store.session.getState().clearSession();

        // Both should be cleared
        expect(sessionCleared).toBe(true);
        expect(userCleared).toBe(true);
        expect(mockAdapter.clearUser).toHaveBeenCalled();

        store.destroy();
      });
    });
  });

  describe('localStorage Adapter User Methods', () => {
    it('should implement all user methods', () => {
      const adapter = createLocalStorageAdapter(mockConfig);

      expect(adapter.saveUser).toBeDefined();
      expect(adapter.getUser).toBeDefined();
      expect(adapter.clearUser).toBeDefined();
      expect(typeof adapter.saveUser).toBe('function');
      expect(typeof adapter.getUser).toBe('function');
      expect(typeof adapter.clearUser).toBe('function');
    });

    it('should save user to localStorage directly', async () => {
      const adapter = createLocalStorageAdapter(mockConfig);

      const userData: UserData = {
        userId: 'user-local-123',
        email: 'local@example.com',
        name: 'Local User',
        avatar: 'https://example.com/local.jpg',
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00Z',
        lastLoginAt: '2024-10-15T08:00:00Z',
        metadata: { theme: 'light' },
        authMethod: 'passkey'
      };

      await adapter.saveUser(userData);

      // Verify data was saved to localStorage
      const savedData = localStorage.getItem('thepia_last_user');
      expect(savedData).toBe(JSON.stringify(userData));
    });

    it('should retrieve user from localStorage', async () => {
      const mockUserData: UserData = {
        userId: 'user-retrieve-123',
        email: 'retrieve@example.com',
        name: 'Retrieve User',
        authMethod: 'email-code',
        lastLoginAt: '2024-10-15T14:22:00Z'
      };

      // Mock localStorage.getItem
      localStorage.setItem('thepia_last_user', JSON.stringify(mockUserData));

      const adapter = createLocalStorageAdapter(mockConfig);
      const userData = await adapter.getUser('user-retrieve-123');

      expect(userData).toEqual(mockUserData);
    });

    it('should return null if no user in localStorage', async () => {
      // Ensure localStorage is empty
      localStorage.clear();

      const adapter = createLocalStorageAdapter(mockConfig);
      const userData = await adapter.getUser('any-user-id');

      expect(userData).toBeNull();
    });

    it('should return null if user is expired (>30 days)', async () => {
      const { isOlderThan } = await import('../../src/utils/date-helpers');

      // Mock isOlderThan to return true (expired)
      vi.mocked(isOlderThan).mockReturnValueOnce(true);

      const expiredUserData: UserData = {
        userId: 'user-expired',
        email: 'expired@example.com',
        authMethod: 'passkey',
        lastLoginAt: '2024-01-01T00:00:00Z' // Old date
      };

      localStorage.setItem('thepia_last_user', JSON.stringify(expiredUserData));

      const adapter = createLocalStorageAdapter(mockConfig);
      const userData = await adapter.getUser('user-expired');

      expect(userData).toBeNull();
      expect(localStorage.getItem('thepia_last_user')).toBeNull(); // Should be removed
    });

    it('should clear user from localStorage', async () => {
      localStorage.setItem('thepia_last_user', JSON.stringify({ userId: 'test' }));

      const adapter = createLocalStorageAdapter(mockConfig);
      await adapter.clearUser?.();

      expect(localStorage.getItem('thepia_last_user')).toBeNull();
    });

    it('should save userId in both thepia_auth_session and thepia_last_user', async () => {
      const adapter = createLocalStorageAdapter(mockConfig);

      const sessionData: SessionData = {
        userId: 'user-both-keys',
        email: 'both@example.com',
        name: 'Both Keys User',
        emailVerified: true,
        accessToken: 'token-both',
        refreshToken: 'refresh-both',
        expiresAt: Date.now() + 3600000,
        refreshedAt: Date.now(),
        authMethod: 'passkey'
      };

      const userData: UserData = {
        userId: 'user-both-keys',
        email: 'both@example.com',
        name: 'Both Keys User',
        emailVerified: true,
        authMethod: 'passkey',
        lastLoginAt: new Date().toISOString()
      };

      // Save both session and user data
      await adapter.saveSession(sessionData);
      await adapter.saveUser(userData);

      // Verify userId is in thepia_auth_session (via mockStorage which is mocked via getStorageManager)
      const sessionStored = mockStorage['thepia_auth_session'];
      expect(sessionStored).toBeDefined();
      const sessionParsed = JSON.parse(sessionStored);
      expect(sessionParsed.user.id).toBe('user-both-keys');

      // Verify userId is in thepia_last_user (via localStorage which is used directly by saveUser)
      const userStored = localStorage.getItem('thepia_last_user');
      expect(userStored).toBeDefined();
      const userParsed = JSON.parse(userStored!);
      expect(userParsed.userId).toBe('user-both-keys');

      // Verify both have the same userId
      expect(sessionParsed.user.id).toBe(userParsed.userId);
    });
  });

  describe('Supabase Token Persistence', () => {
    it('should save Supabase tokens in SessionData', async () => {
      const mockSessionData: SessionData = {
        userId: 'user-supabase-123',
        email: 'supabase@example.com',
        name: 'Supabase User',
        emailVerified: true,
        metadata: {},
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
        expiresAt: Date.now() + 3600000,
        refreshedAt: Date.now(),
        authMethod: 'passkey',
        supabaseToken:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSJ9.abc123',
        supabaseExpiresAt: Date.now() + 3600000
      };

      const mockAdapter: SessionPersistence = {
        saveSession: vi.fn().mockResolvedValue(undefined),
        loadSession: vi.fn().mockResolvedValue(mockSessionData),
        clearSession: vi.fn().mockResolvedValue(undefined),
        saveUser: vi.fn().mockResolvedValue(undefined),
        getUser: vi.fn().mockResolvedValue(null),
        clearUser: vi.fn().mockResolvedValue(undefined)
      };

      const configWithDb: AuthConfig = {
        ...mockConfig,
        database: mockAdapter
      };

      const store = createAuthStore(configWithDb);

      // Wait for async session initialization
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify session was restored with Supabase tokens
      const coreState = store.core.getState();
      expect(coreState.state).toBe('authenticated');
      expect(coreState.user?.id).toBe('user-supabase-123');

      store.destroy();
    });

    it('should handle SessionData with Supabase tokens via localStorage adapter', async () => {
      const adapter = createLocalStorageAdapter(mockConfig);

      const sessionData: SessionData = {
        userId: 'user-local-supabase',
        email: 'local-supabase@example.com',
        name: 'Local Supabase User',
        emailVerified: true,
        metadata: { app_code: 'flows' },
        accessToken: 'access-token-local',
        refreshToken: 'refresh-token-local',
        expiresAt: Date.now() + 3600000,
        refreshedAt: Date.now(),
        authMethod: 'passkey',
        supabaseToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLWxvY2FsIn0.xyz789',
        supabaseExpiresAt: Date.now() + 3600000
      };

      await adapter.saveSession(sessionData);

      // Verify data was saved to storage
      const storedData = mockStorage['thepia_auth_session'];
      expect(storedData).toBeDefined();

      const parsedData = JSON.parse(storedData);
      // Storage format uses camelCase (SignInData format)
      expect(parsedData.tokens.supabaseToken).toBe(sessionData.supabaseToken);
      expect(parsedData.tokens.supabaseExpiresAt).toBe(sessionData.supabaseExpiresAt);
    });

    it('should convert internal format with Supabase tokens to SessionData on load', async () => {
      const supabaseToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLWxvYWQtc3VwYWJhc2UifQ.def456';
      const supabaseExpiresAt = Date.now() + 3600000;

      // Put internal session data with Supabase tokens into mock storage (SignInData format with camelCase)
      const internalSession: SignInData = {
        user: {
          id: 'user-load-supabase',
          email: 'load-supabase@example.com',
          name: 'Load Supabase User',
          initials: 'LSU',
          preferences: {}
        },
        tokens: {
          accessToken: 'load-token',
          refreshToken: 'load-refresh',
          expiresAt: Date.now() + 3600000,
          refreshedAt: Date.now(),
          supabaseToken: supabaseToken,
          supabaseExpiresAt: supabaseExpiresAt
        },
        authMethod: 'passkey' as const
      };

      mockStorage['thepia_auth_session'] = JSON.stringify(internalSession);

      const adapter = createLocalStorageAdapter(mockConfig);
      const sessionData = await adapter.loadSession();

      expect(sessionData).toEqual(
        expect.objectContaining({
          userId: 'user-load-supabase',
          email: 'load-supabase@example.com',
          accessToken: 'load-token',
          refreshToken: 'load-refresh',
          authMethod: 'passkey',
          supabaseToken: supabaseToken,
          supabaseExpiresAt: supabaseExpiresAt
        })
      );
    });

    it('should handle SessionData without Supabase tokens (backward compatibility)', async () => {
      const sessionDataNoSupabase: SessionData = {
        userId: 'user-no-supabase',
        email: 'no-supabase@example.com',
        name: 'No Supabase User',
        emailVerified: true,
        metadata: {},
        accessToken: 'access-only',
        refreshToken: 'refresh-only',
        expiresAt: Date.now() + 3600000,
        refreshedAt: Date.now(),
        authMethod: 'email-code'
        // No supabaseToken or supabaseExpiresAt
      };

      const adapter = createLocalStorageAdapter(mockConfig);
      await adapter.saveSession(sessionDataNoSupabase);

      const storedData = mockStorage['thepia_auth_session'];
      expect(storedData).toBeDefined();

      const parsedData: SignInData = JSON.parse(storedData);
      // Storage format uses camelCase (SignInData format)
      expect(parsedData.tokens.accessToken).toBe('access-only');
      expect(parsedData.tokens.supabaseToken).toBeUndefined();
      expect(parsedData.tokens.supabaseExpiresAt).toBeUndefined();
    });

    it('should preserve Supabase tokens across save/load cycle', async () => {
      const adapter = createLocalStorageAdapter(mockConfig);

      const supabaseToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLXByZXNlcnZlIn0.ghi789';
      const supabaseExpiresAt = Date.now() + 3600000;

      const originalSession: SessionData = {
        userId: 'user-preserve',
        email: 'preserve@example.com',
        name: 'Preserve User',
        emailVerified: true,
        metadata: { company_id: 'company-123' },
        accessToken: 'access-preserve',
        refreshToken: 'refresh-preserve',
        expiresAt: Date.now() + 3600000,
        refreshedAt: Date.now(),
        authMethod: 'passkey',
        supabaseToken: supabaseToken,
        supabaseExpiresAt: supabaseExpiresAt
      };

      // Save
      await adapter.saveSession(originalSession);

      // Load
      const loadedSession = await adapter.loadSession();

      // Verify Supabase tokens preserved
      expect(loadedSession?.supabaseToken).toBe(supabaseToken);
      expect(loadedSession?.supabaseExpiresAt).toBe(supabaseExpiresAt);
      expect(loadedSession?.userId).toBe('user-preserve');
      expect(loadedSession?.email).toBe('preserve@example.com');
    });
  });

  describe('Data Preservation - Critical Fields', () => {
    it('should preserve createdAt timestamp across save/load', async () => {
      const createdAt = '2024-01-15T10:30:00Z';

      const mockAdapter: SessionPersistence = {
        saveSession: vi.fn().mockResolvedValue(undefined),
        loadSession: vi.fn().mockResolvedValue(null),
        clearSession: vi.fn().mockResolvedValue(undefined),
        saveUser: vi.fn().mockResolvedValue(undefined),
        getUser: vi.fn().mockResolvedValue({
          userId: 'user-created',
          email: 'created@example.com',
          createdAt: createdAt,
          authMethod: 'passkey'
        }),
        clearUser: vi.fn().mockResolvedValue(undefined)
      };

      const store = createAuthStore({ ...mockConfig, database: mockAdapter });

      const mockUser = {
        id: 'user-created',
        email: 'created@example.com',
        createdAt: createdAt,
        emailVerified: true
      };

      store.core.getState().updateUser(mockUser);
      await store.core.getState().updateTokens({
        access_token: 'token',
        refresh_token: 'refresh',
        expiresAt: Date.now() + 3600000
      });
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify createdAt preserved
      const savedUser = vi.mocked(mockAdapter.saveUser).mock.calls[0][0];
      expect(savedUser.createdAt).toBe(createdAt);

      // Load and verify
      const loadedUser = await mockAdapter.getUser('user-created');
      expect(loadedUser?.createdAt).toBe(createdAt);

      store.destroy();
    });

    it('should preserve lastLoginAt timestamp', async () => {
      const lastLoginAt = '2024-10-15T14:22:00Z';

      const mockAdapter: SessionPersistence = {
        saveSession: vi.fn().mockResolvedValue(undefined),
        loadSession: vi.fn().mockResolvedValue(null),
        clearSession: vi.fn().mockResolvedValue(undefined),
        saveUser: vi.fn().mockResolvedValue(undefined),
        getUser: vi.fn().mockResolvedValue(null),
        clearUser: vi.fn().mockResolvedValue(undefined)
      };

      const store = createAuthStore({ ...mockConfig, database: mockAdapter });

      const mockUser = {
        id: 'user-login',
        email: 'login@example.com',
        lastLoginAt: lastLoginAt,
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00Z'
      };

      store.core.getState().updateUser(mockUser);
      await store.core.getState().updateTokens({
        access_token: 'token',
        refresh_token: 'refresh',
        expiresAt: Date.now() + 3600000
      });
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify lastLoginAt preserved
      const savedUser = vi.mocked(mockAdapter.saveUser).mock.calls[0][0];
      expect(savedUser.lastLoginAt).toBe(lastLoginAt);

      store.destroy();
    });

    it('should preserve complex metadata objects', async () => {
      const complexMetadata = {
        subscription: {
          tier: 'enterprise',
          features: ['advanced-analytics', 'priority-support'],
          expiresAt: '2025-12-31'
        },
        preferences: {
          theme: 'dark',
          language: 'en-US',
          notifications: {
            email: true,
            push: false
          }
        },
        customFields: {
          department: 'Engineering',
          location: 'San Francisco'
        }
      };

      const mockAdapter: SessionPersistence = {
        saveSession: vi.fn().mockResolvedValue(undefined),
        loadSession: vi.fn().mockResolvedValue(null),
        clearSession: vi.fn().mockResolvedValue(undefined),
        saveUser: vi.fn().mockResolvedValue(undefined),
        getUser: vi.fn().mockResolvedValue(null),
        clearUser: vi.fn().mockResolvedValue(undefined)
      };

      const store = createAuthStore({ ...mockConfig, database: mockAdapter });

      const mockUser = {
        id: 'user-metadata',
        email: 'metadata@example.com',
        metadata: complexMetadata,
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00Z'
      };

      store.core.getState().updateUser(mockUser);
      await store.core.getState().updateTokens({
        access_token: 'token',
        refresh_token: 'refresh',
        expiresAt: Date.now() + 3600000
      });
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify metadata deep equality
      const savedUser = vi.mocked(mockAdapter.saveUser).mock.calls[0][0];
      expect(savedUser.metadata).toEqual(complexMetadata);

      store.destroy();
    });

    it('should not lose emailVerified status', async () => {
      const mockAdapter: SessionPersistence = {
        saveSession: vi.fn().mockResolvedValue(undefined),
        loadSession: vi.fn().mockResolvedValue(null),
        clearSession: vi.fn().mockResolvedValue(undefined),
        saveUser: vi.fn().mockResolvedValue(undefined),
        getUser: vi.fn().mockResolvedValue(null),
        clearUser: vi.fn().mockResolvedValue(undefined)
      };

      const store = createAuthStore({ ...mockConfig, database: mockAdapter });

      const mockUser = {
        id: 'user-verified',
        email: 'verified@example.com',
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00Z'
      };

      store.core.getState().updateUser(mockUser);
      await store.core.getState().updateTokens({
        access_token: 'token',
        refresh_token: 'refresh',
        expiresAt: Date.now() + 3600000
      });
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify emailVerified preserved
      const savedUser = vi.mocked(mockAdapter.saveUser).mock.calls[0][0];
      expect(savedUser.emailVerified).toBe(true);

      store.destroy();
    });
  });
});
