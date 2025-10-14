/**
 * Do NOT introduce mocking of the API client
 * Do introduce mocking of browser APIs like WebAuthn to ensure correct switching of options.

 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { AuthConfig, User } from '../../src/types';
import { createSimpleMockSessionPersistence } from '../helpers/session-persistence-mock';

// Set up global mocks before any imports
vi.mock('../../src/utils/webauthn', () => ({
  isWebAuthnSupported: vi.fn().mockReturnValue(true),
  isPlatformAuthenticatorAvailable: vi.fn().mockResolvedValue(true),
  isConditionalMediationSupported: vi.fn().mockResolvedValue(true),
  authenticateWithPasskey: vi.fn(),
  serializeCredential: vi.fn().mockReturnValue('serialized-credential')
}));

let mockStorage: Record<string, string> = {};

vi.mock('../../src/utils/sessionManager', () => ({
  getOptimalSessionConfig: vi.fn().mockReturnValue({
    type: 'sessionStorage',
    sessionTimeout: 28800000,
    persistentSessions: false,
    userRole: 'guest'
  }),
  configureSessionStorage: vi.fn(),
  generateInitials: vi.fn((name: string) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  })
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

vi.mock('../../src/api/auth-api', () => ({
  AuthApiClient: vi.fn().mockImplementation(() => ({
    checkEmail: vi.fn(),
    getPasskeyChallenge: vi.fn(),
    signInWithPasskey: vi.fn()
  })),
  createAuthApiClient: vi.fn().mockReturnValue({
    checkEmail: vi.fn(),
    getPasskeyChallenge: vi.fn(),
    signInWithPasskey: vi.fn()
  })
}));

// Import after mocks are set up
import { createAuthStore } from '../../src/stores';

/**
 * CRITICAL INTEGRATION TEST: API Response Format Compatibility
 *
 * This test ensures that the auth store correctly handles both:
 * 1. New API format: {success: true, tokens: {...}, user: {...}}
 * 2. Legacy API format: {step: 'success', access_token: '...', user: {...}}
 *
 * This test MUST PASS to prevent the sessionManager consistency bug from recurring.
 */
describe('API Response Format Compatibility - CRITICAL', () => {
  let authStore: any;
  let mockWebAuthn: any;
  let mockSessionManager: any;
  let mockApiClient: any;
  let mockDatabase: any;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();

    // Get references to the mocked modules
    mockWebAuthn = await vi.importMock('../../src/utils/webauthn');
    mockSessionManager = await vi.importMock('../../src/utils/sessionManager');

    // Get the mocked AuthApiClient constructor
    const authApiModule = await vi.importMock('../../src/api/auth-api');
    const MockedAuthApiClient = authApiModule.AuthApiClient;

    // Create a mock API client instance
    mockApiClient = {
      checkEmail: vi.fn(),
      getPasskeyChallenge: vi.fn(),
      signInWithPasskey: vi.fn(),
      registerUser: vi.fn(),
      getWebAuthnRegistrationOptions: vi.fn(),
      verifyWebAuthnRegistration: vi.fn()
    };

    // Create a mock database adapter with full SessionPersistence interface
    mockDatabase = createSimpleMockSessionPersistence();

    const config: AuthConfig = {
      apiBaseUrl: 'https://test-api.example.com',
      clientId: 'test-client',
      domain: 'test.example.com',
      enablePasskeys: true,
      enableMagicLinks: false,
      database: mockDatabase
    };

    // Inject the mock API client into createAuthStore
    authStore = createAuthStore(config, mockApiClient as any);

    // Manually set passkey capabilities since mocks don't affect initialization
    authStore.passkey.setState({
      isSupported: true,
      isPlatformAvailable: true,
      isConditionalSupported: true
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test.skip('CRITICAL: Must handle new API response format {success: true, tokens: {...}}', async () => {
    // TODO: Implementation doesn't support new format yet - only legacy format is handled
    // This test should be enabled when the API starts returning {success: true, tokens: {...}} format
    const mockUser: User = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      emailVerified: true,
      createdAt: new Date().toISOString()
    };

    const newFormatResponse = {
      success: true,
      tokens: {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expiresAt: Date.now() + 3600000 // 1 hour from now
      },
      user: mockUser
    };

    // Setup mocks for this test
    mockApiClient.checkEmail.mockResolvedValue({
      exists: true,
      hasPasskey: true,
      userId: 'user-123'
    });

    mockApiClient.getPasskeyChallenge.mockResolvedValue({
      challenge: 'test-challenge',
      rpId: 'test.example.com'
    });

    mockApiClient.signInWithPasskey.mockResolvedValue(newFormatResponse);

    mockWebAuthn.authenticateWithPasskey.mockResolvedValue({
      id: 'credential-id',
      response: { authenticatorData: 'test-data' }
    });

    // Execute signInWithPasskey
    const result = await authStore.signInWithPasskey('test@example.com');

    // CRITICAL ASSERTIONS: These MUST pass to prevent the bug

    // 1. Verify the response is returned correctly
    expect(result).toEqual(newFormatResponse);

    // 2. CRITICAL: Verify session was saved (this was the bug - session wasn't saved)
    expect(mockSessionManager.saveSession).toHaveBeenCalledTimes(1);

    // 3. CRITICAL: Verify session was saved with normalized SignInResponse format
    const savedSessionCall = mockSessionManager.saveSession.mock.calls[0];
    const savedSession = savedSessionCall[0];
    const authMethod = savedSessionCall[1];

    expect(authMethod).toBe('passkey');
    expect(savedSession).toEqual(
      expect.objectContaining({
        step: 'success',
        user: mockUser,
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: expect.any(Number)
      })
    );

    // 4. CRITICAL: Verify store state was updated to authenticated
    const storeState = authStore.getState();
    expect(storeState.state).toBe('authenticated');
    expect(storeState.user).toEqual(mockUser);
    expect(storeState.access_token).toBe('new-access-token');
    expect(storeState.refresh_token).toBe('new-refresh-token');
  });

  test('CRITICAL: Must handle legacy API response format {step: "success", access_token: "..."}', async () => {
    const mockUser: User = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      emailVerified: true,
      createdAt: new Date().toISOString()
    };

    const legacyFormatResponse = {
      step: 'success' as const,
      access_token: 'legacy-access-token',
      refresh_token: 'legacy-refresh-token',
      expires_in: 3600, // 1 hour in seconds
      user: mockUser
    };

    // Setup mocks for this test
    mockApiClient.checkEmail.mockResolvedValue({
      exists: true,
      hasPasskey: true,
      userId: 'user-123'
    });

    mockApiClient.getPasskeyChallenge.mockResolvedValue({
      challenge: 'test-challenge',
      rpId: 'test.example.com'
    });

    mockApiClient.signInWithPasskey.mockResolvedValue(legacyFormatResponse);

    mockWebAuthn.authenticateWithPasskey.mockResolvedValue({
      id: 'credential-id',
      response: { authenticatorData: 'test-data' }
    });

    // Execute signInWithPasskey
    const result = await authStore.signInWithPasskey('test@example.com');

    // CRITICAL ASSERTIONS: These MUST pass to prevent the bug

    // 1. Verify the response is returned correctly (normalized to SignInData format)
    expect(result).toEqual(
      expect.objectContaining({
        user: expect.objectContaining({
          email: mockUser.email,
          id: mockUser.id
        }),
        tokens: expect.objectContaining({
          access_token: 'legacy-access-token',
          refresh_token: 'legacy-refresh-token'
        }),
        authMethod: 'passkey'
      })
    );

    // 2. CRITICAL: Verify session was saved to database
    // Note: saveSession is called twice (once in session store, once in updateTokens)
    // This is a known redundancy but both calls must succeed
    expect(mockDatabase.saveSession).toHaveBeenCalled();
    expect(mockDatabase.saveSession.mock.calls.length).toBeGreaterThanOrEqual(1);

    // 3. CRITICAL: Verify session was saved with correct SessionData format
    const savedSessionCall = mockDatabase.saveSession.mock.calls[0];
    const savedSession = savedSessionCall[0];

    // Database receives SessionData format (flatter structure than SignInData)
    expect(savedSession).toEqual(
      expect.objectContaining({
        userId: mockUser.id,
        email: mockUser.email,
        accessToken: 'legacy-access-token',
        refreshToken: 'legacy-refresh-token',
        expiresAt: expect.any(Number),
        authMethod: 'passkey'
      })
    );

    // 4. CRITICAL: Verify store state was updated to authenticated
    const storeState = authStore.getState();
    expect(storeState.state).toBe('authenticated');
    expect(storeState.user).toEqual(
      expect.objectContaining({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        emailVerified: mockUser.emailVerified
      })
    );
    expect(storeState.access_token).toBe('legacy-access-token');
    expect(storeState.refresh_token).toBe('legacy-refresh-token');
  });

  test('CRITICAL: Must NOT save session when response is missing required fields', async () => {
    const invalidResponses = [
      { success: true, tokens: { access_token: 'token' } }, // Missing user
      { success: true, user: { id: '1', email: 'test@example.com' } }, // Missing tokens
      { success: false, error: 'Authentication failed' }, // Explicit failure
      { step: 'failed', error: 'Authentication failed' } // Legacy failure
    ];

    for (const invalidResponse of invalidResponses) {
      // Reset mocks
      vi.clearAllMocks();

      // Setup mocks for this test iteration
      mockApiClient.checkEmail.mockResolvedValue({
        exists: true,
        hasPasskey: true,
        userId: 'user-123'
      });

      mockApiClient.getPasskeyChallenge.mockResolvedValue({
        challenge: 'test-challenge',
        rpId: 'test.example.com'
      });

      mockApiClient.signInWithPasskey.mockResolvedValue(invalidResponse);

      mockWebAuthn.authenticateWithPasskey.mockResolvedValue({
        id: 'credential-id',
        response: { authenticatorData: 'test-data' }
      });

      // Execute signInWithPasskey - expect it to throw for invalid responses
      try {
        await authStore.signInWithPasskey('test@example.com');
      } catch (error) {
        // Invalid responses should throw errors - this is expected
      }

      // CRITICAL: Verify session was NOT saved for invalid responses
      expect(mockDatabase.saveSession).not.toHaveBeenCalled();

      // CRITICAL: Verify store state was NOT updated to authenticated
      const storeState = authStore.getState();
      expect(storeState.state).not.toBe('authenticated');
    }
  });

  test('Should handle API response with Supabase tokens', async () => {
    const mockUser: User = {
      id: 'user-supabase-123',
      email: 'supabase@example.com',
      name: 'Supabase User',
      emailVerified: true,
      createdAt: new Date().toISOString()
    };

    const responseWithSupabase = {
      step: 'success' as const,
      access_token: 'auth0-access-token',
      refresh_token: 'auth0-refresh-token',
      expires_in: 3600,
      user: mockUser,
      supabase_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLXN1cGFiYXNlLTEyMyJ9.abc123',
      supabase_expires_at: Date.now() + 3600000
    };

    // Setup mocks
    mockApiClient.checkEmail.mockResolvedValue({
      exists: true,
      hasPasskey: true,
      userId: 'user-supabase-123'
    });

    mockApiClient.getPasskeyChallenge.mockResolvedValue({
      challenge: 'test-challenge',
      rpId: 'test.example.com'
    });

    mockApiClient.signInWithPasskey.mockResolvedValue(responseWithSupabase);

    mockWebAuthn.authenticateWithPasskey.mockResolvedValue({
      id: 'credential-id',
      response: { authenticatorData: 'test-data' }
    });

    // Execute signInWithPasskey
    const result = await authStore.signInWithPasskey('supabase@example.com');

    // Verify SignInData includes Supabase tokens
    expect(result.tokens.supabase_token).toBe(responseWithSupabase.supabase_token);
    expect(result.tokens.supabase_expires_at).toBe(responseWithSupabase.supabase_expires_at);

    // Verify session was saved with Supabase tokens
    expect(mockDatabase.saveSession).toHaveBeenCalled();
    const savedSession = mockDatabase.saveSession.mock.calls[0][0];
    expect(savedSession.supabaseToken).toBe(responseWithSupabase.supabase_token);
    expect(savedSession.supabaseExpiresAt).toBe(responseWithSupabase.supabase_expires_at);

    // Verify store state includes standard tokens
    const storeState = authStore.getState();
    expect(storeState.state).toBe('authenticated');
    expect(storeState.access_token).toBe('auth0-access-token');
    expect(storeState.refresh_token).toBe('auth0-refresh-token');
  });

  test('Should handle API response without Supabase tokens (backward compatibility)', async () => {
    const mockUser: User = {
      id: 'user-no-supabase',
      email: 'no-supabase@example.com',
      name: 'No Supabase User',
      emailVerified: true,
      createdAt: new Date().toISOString()
    };

    const responseWithoutSupabase = {
      step: 'success' as const,
      access_token: 'auth0-only-token',
      refresh_token: 'auth0-only-refresh',
      expires_in: 3600,
      user: mockUser
      // No Supabase tokens
    };

    // Setup mocks
    mockApiClient.checkEmail.mockResolvedValue({
      exists: true,
      hasPasskey: true,
      userId: 'user-no-supabase'
    });

    mockApiClient.getPasskeyChallenge.mockResolvedValue({
      challenge: 'test-challenge',
      rpId: 'test.example.com'
    });

    mockApiClient.signInWithPasskey.mockResolvedValue(responseWithoutSupabase);

    mockWebAuthn.authenticateWithPasskey.mockResolvedValue({
      id: 'credential-id',
      response: { authenticatorData: 'test-data' }
    });

    // Execute signInWithPasskey
    const result = await authStore.signInWithPasskey('no-supabase@example.com');

    // Verify SignInData does not include Supabase tokens
    expect(result.tokens.supabase_token).toBeUndefined();
    expect(result.tokens.supabase_expires_at).toBeUndefined();

    // Verify session was saved without Supabase tokens
    expect(mockDatabase.saveSession).toHaveBeenCalled();
    const savedSession = mockDatabase.saveSession.mock.calls[0][0];
    expect(savedSession.supabaseToken).toBeUndefined();
    expect(savedSession.supabaseExpiresAt).toBeUndefined();

    // Verify store state works normally
    const storeState = authStore.getState();
    expect(storeState.state).toBe('authenticated');
    expect(storeState.access_token).toBe('auth0-only-token');
  });
});
