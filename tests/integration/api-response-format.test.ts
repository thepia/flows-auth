import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AuthConfig, User } from '../../src/types';

// Set up global mocks before any imports
vi.mock('../../src/utils/webauthn', () => ({
  isWebAuthnSupported: vi.fn().mockReturnValue(true),
  authenticateWithPasskey: vi.fn(),
  serializeCredential: vi.fn().mockReturnValue('serialized-credential')
}));

vi.mock('../../src/utils/sessionManager', () => ({
  saveSession: vi.fn(),
  getSession: vi.fn().mockReturnValue(null),
  clearSession: vi.fn(),
  isSessionValid: vi.fn().mockReturnValue(false),
  getOptimalSessionConfig: vi.fn().mockReturnValue({
    type: 'sessionStorage',
    sessionTimeout: 28800000,
    persistentSessions: false,
    userRole: 'guest'
  }),
  configureSessionStorage: vi.fn(),
  isAuthenticatedFromSession: vi.fn().mockReturnValue(false),
  getCurrentUserFromSession: vi.fn().mockReturnValue(null)
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

vi.mock('../../src/stores/auth-state-machine', () => ({
  AuthStateMachine: vi.fn().mockImplementation(() => ({
    getState: vi.fn().mockReturnValue({ state: 'unauthenticated' }),
    updateState: vi.fn(),
    subscribe: vi.fn(),
    emit: vi.fn(),
    onTransition: vi.fn().mockReturnValue(() => {}), // Returns unsubscribe function
    start: vi.fn(),
    signInWithPasskey: vi.fn()
  }))
}));

// Import after mocks are set up
import { createAuthStore } from '../../src/stores/auth-store';

/**
 * CRITICAL INTEGRATION TEST: API Response Format Compatibility
 *
 * This test ensures that the auth store correctly handles both:
 * 1. New API format: {success: true, tokens: {...}, user: {...}}
 * 2. Legacy API format: {step: 'success', accessToken: '...', user: {...}}
 *
 * This test MUST PASS to prevent the sessionManager consistency bug from recurring.
 */
describe('API Response Format Compatibility - CRITICAL', () => {

  let authStore: any;
  let mockWebAuthn: any;
  let mockSessionManager: any;
  let mockApiClient: any;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();

    // Get references to the mocked modules
    mockWebAuthn = await vi.importMock('../../src/utils/webauthn');
    mockSessionManager = await vi.importMock('../../src/utils/sessionManager');

    // Get the mocked AuthApiClient constructor
    const authApiModule = await vi.importMock('../../src/api/auth-api');
    const MockedAuthApiClient = authApiModule.AuthApiClient;

    // Create a mock instance that will be returned by the constructor
    mockApiClient = {
      checkEmail: vi.fn(),
      getPasskeyChallenge: vi.fn(),
      signInWithPasskey: vi.fn()
    };

    // Make the constructor return our mock instance
    MockedAuthApiClient.mockReturnValue(mockApiClient);

    const config: AuthConfig = {
      apiBaseUrl: 'https://test-api.example.com',
      clientId: 'test-client',
      domain: 'test.example.com',
      enablePasskeys: true,
      enableMagicPins: false
    };

    authStore = createAuthStore(config);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('CRITICAL: Must handle new API response format {success: true, tokens: {...}}', async () => {
    const mockUser: User = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User'
    };

    const newFormatResponse = {
      success: true,
      tokens: {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
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
    expect(savedSession).toEqual(expect.objectContaining({
      step: 'success',
      user: mockUser,
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      expiresIn: expect.any(Number)
    }));

    // 4. CRITICAL: Verify store state was updated to authenticated
    const storeState = authStore.getState();
    expect(storeState.state).toBe('authenticated');
    expect(storeState.user).toEqual(mockUser);
    expect(storeState.accessToken).toBe('new-access-token');
    expect(storeState.refreshToken).toBe('new-refresh-token');
  });

  test('CRITICAL: Must handle legacy API response format {step: "success", accessToken: "..."}', async () => {
    const mockUser: User = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User'
    };

    const legacyFormatResponse = {
      step: 'success' as const,
      accessToken: 'legacy-access-token',
      refreshToken: 'legacy-refresh-token',
      expiresIn: 3600, // 1 hour in seconds
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

    // 1. Verify the response is returned correctly
    expect(result).toEqual(legacyFormatResponse);

    // 2. CRITICAL: Verify session was saved
    expect(mockSessionManager.saveSession).toHaveBeenCalledTimes(1);

    // 3. CRITICAL: Verify session was saved correctly (legacy format should work as-is)
    const savedSessionCall = mockSessionManager.saveSession.mock.calls[0];
    const savedSession = savedSessionCall[0];
    const authMethod = savedSessionCall[1];

    expect(authMethod).toBe('passkey');
    expect(savedSession).toEqual(legacyFormatResponse);

    // 4. CRITICAL: Verify store state was updated to authenticated
    const storeState = authStore.getState();
    expect(storeState.state).toBe('authenticated');
    expect(storeState.user).toEqual(mockUser);
    expect(storeState.accessToken).toBe('legacy-access-token');
    expect(storeState.refreshToken).toBe('legacy-refresh-token');
  });

  test('CRITICAL: Must NOT save session when response is missing required fields', async () => {
    const invalidResponses = [
      { success: true, tokens: { accessToken: 'token' } }, // Missing user
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

      // Execute signInWithPasskey
      await authStore.signInWithPasskey('test@example.com');

      // CRITICAL: Verify session was NOT saved for invalid responses
      expect(mockSessionManager.saveSession).not.toHaveBeenCalled();

      // CRITICAL: Verify store state was NOT updated to authenticated
      const storeState = authStore.getState();
      expect(storeState.state).not.toBe('authenticated');
    }
  });
});
