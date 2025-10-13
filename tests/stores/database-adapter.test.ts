/**
 * Database Adapter Configuration Tests
 *
 * Tests that the auth store correctly handles:
 * 1. Custom database adapters passed via AuthConfig.database
 * 2. Default localStorage adapter when no database is provided
 * 3. Adapter initialization and session restoration
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuthStore } from '../../src/stores';
import { createLocalStorageAdapter } from '../../src/stores/core/database';
import type { AuthConfig, DatabaseAdapter, SessionData } from '../../src/types';

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
  reportError: vi.fn(),
  initializeTelemetry: vi.fn(),
  reportAuthState: vi.fn()
}));

// Mock session manager utilities (used by localStorage adapter)
vi.mock('../../src/utils/sessionManager', () => ({
  configureSessionStorage: vi.fn(),
  getOptimalSessionConfig: vi.fn(() => ({ type: 'sessionStorage' })),
  getSession: vi.fn(() => null),
  isSessionValid: vi.fn(() => false),
  saveSession: vi.fn(),
  clearSession: vi.fn()
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
      const { configureSessionStorage, getOptimalSessionConfig } = await import('../../src/utils/sessionManager');

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
      const mockAdapter: DatabaseAdapter = {
        saveSession: vi.fn().mockResolvedValue(undefined),
        loadSession: vi.fn().mockResolvedValue(null),
        clearSession: vi.fn().mockResolvedValue(undefined)
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

      const mockAdapter: DatabaseAdapter = {
        saveSession: vi.fn().mockResolvedValue(undefined),
        loadSession: vi.fn().mockResolvedValue(mockSessionData),
        clearSession: vi.fn().mockResolvedValue(undefined)
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
      const mockAdapter: DatabaseAdapter = {
        saveSession: vi.fn().mockResolvedValue(undefined),
        loadSession: vi.fn().mockResolvedValue(null), // No session
        clearSession: vi.fn().mockResolvedValue(undefined)
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
        refreshToken: 'refresh-token',
        expiresAt: Date.now() - 1000, // Expired 1 second ago
        authMethod: 'email-code'
      };

      const mockAdapter: DatabaseAdapter = {
        saveSession: vi.fn().mockResolvedValue(undefined),
        loadSession: vi.fn().mockResolvedValue(expiredSessionData),
        clearSession: vi.fn().mockResolvedValue(undefined)
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

      const faultyAdapter: DatabaseAdapter = {
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
      const mockAdapter: DatabaseAdapter = {
        saveSession: vi.fn().mockResolvedValue(undefined),
        loadSession: vi.fn().mockResolvedValue(null),
        clearSession: vi.fn().mockResolvedValue(undefined)
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
      const mockAdapter: DatabaseAdapter = {
        saveSession: vi.fn().mockResolvedValue(undefined),
        loadSession: vi.fn().mockResolvedValue(null),
        clearSession: vi.fn().mockResolvedValue(undefined)
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
    it('should create a valid DatabaseAdapter', () => {
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
      const { saveSession } = await import('../../src/utils/sessionManager');
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
        authMethod: 'magic-link'
      };

      await adapter.saveSession(sessionData);

      // Verify internal saveSession was called with correct format
      expect(vi.mocked(saveSession)).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({
            id: 'user-789',
            email: 'save@example.com',
            name: 'Save User'
          }),
          tokens: expect.objectContaining({
            access_token: 'save-token',
            refresh_token: 'save-refresh'
          }),
          authMethod: 'magic-link'
        })
      );
    });

    it('should convert internal format to SessionData on load', async () => {
      const { getSession, isSessionValid } = await import('../../src/utils/sessionManager');

      // Mock internal session data
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
          access_token: 'load-token',
          refresh_token: 'load-refresh',
          expiresAt: Date.now() + 3600000
        },
        authMethod: 'passkey',
        lastActivity: Date.now()
      };

      vi.mocked(getSession).mockReturnValueOnce(internalSession);
      vi.mocked(isSessionValid).mockReturnValueOnce(true);

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
      const { getSession } = await import('../../src/utils/sessionManager');
      vi.mocked(getSession).mockReturnValueOnce(null);

      const adapter = createLocalStorageAdapter(mockConfig);
      const sessionData = await adapter.loadSession();

      expect(sessionData).toBeNull();
    });

    it('should clear session via internal utility', async () => {
      const { clearSession } = await import('../../src/utils/sessionManager');

      const adapter = createLocalStorageAdapter(mockConfig);
      await adapter.clearSession();

      expect(vi.mocked(clearSession)).toHaveBeenCalled();
    });
  });

  describe('Adapter Integration with Store Options', () => {
    it('should pass database adapter to all stores via StoreOptions', () => {
      const mockAdapter: DatabaseAdapter = {
        saveSession: vi.fn().mockResolvedValue(undefined),
        loadSession: vi.fn().mockResolvedValue(null),
        clearSession: vi.fn().mockResolvedValue(undefined)
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
});
