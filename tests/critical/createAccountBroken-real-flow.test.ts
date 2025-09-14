import { describe, test, expect, beforeEach, vi } from 'vitest';
import { createAuthStore } from '../../src/stores/auth-store';
import type { AuthConfig } from '../../src/types';

/**
 * CRITICAL REAL FLOW TESTS for createAccountBroken method
 * 
 * These tests validate the ACTUAL createAccountBroken method that components use,
 * not the deprecated registerUser method. They test real business logic
 * with minimal mocking to catch actual production issues.
 * 
 * THESE TESTS MUST PASS for production readiness.
 */

// Mock only external dependencies, not business logic
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock WebAuthn APIs (can't run in test environment)
const mockCredentialCreate = vi.fn();
const mockCredentialGet = vi.fn();

Object.defineProperty(navigator, 'credentials', {
  value: {
    create: mockCredentialCreate,
    get: mockCredentialGet
  },
  writable: true
});

// Mock WebAuthn support detection
vi.mock('../../src/utils/webauthn-utils', () => ({
  isWebAuthnSupported: vi.fn(() => true),
  isPlatformAuthenticatorAvailable: vi.fn(() => Promise.resolve(true))
}));

describe('CRITICAL: createAccountBroken Real Flow Tests', () => {
  let authStore: any;
  let authConfig: AuthConfig;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    mockFetch.mockClear();
    mockCredentialCreate.mockClear();

    // Real auth config (minimal mocking) - FIXED: Use correct property names
    authConfig = {
      apiBaseUrl: 'https://api.test.com',
      appBaseUrl: 'https://app.test.com',
      enableWebAuthn: true,
      enableEmailAuth: false,
      requireEmailVerification: true
    };

    // Create real auth store instance
    authStore = createAuthStore(authConfig);
  });

  test('CRITICAL: createAccountBroken should complete full WebAuthn registration flow', async () => {
    // Mock the complete API flow responses
    mockFetch
      // Step 1: User registration
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          step: 'success',
          user: { 
            id: 'user-123', 
            email: 'test@example.com', 
            emailVerified: false 
          },
          accessToken: 'temp-access-token',
          refreshToken: 'temp-refresh-token',
          emailVerifiedViaInvitation: false
        })
      })
      // Step 2: WebAuthn registration options
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          challenge: 'mock-challenge-base64',
          rp: { name: 'Test App', id: 'test.com' },
          user: { 
            id: 'user-123-base64', 
            name: 'test@example.com', 
            displayName: 'Test User' 
          },
          pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
          timeout: 60000,
          attestation: 'direct'
        })
      })
      // Step 3: WebAuthn registration verification
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          credentialId: 'mock-credential-id',
          user: {
            id: 'user-123',
            email: 'test@example.com',
            emailVerified: false
          },
          accessToken: 'final-access-token',
          refreshToken: 'final-refresh-token'
        })
      });

    // Mock WebAuthn credential creation
    mockCredentialCreate.mockResolvedValue({
      id: 'mock-credential-id',
      rawId: new ArrayBuffer(32),
      response: {
        clientDataJSON: new ArrayBuffer(64),
        attestationObject: new ArrayBuffer(128)
      },
      type: 'public-key'
    });

    const registrationData = {
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      acceptedTerms: true,
      acceptedPrivacy: true
    };

    // CRITICAL: Test the actual createAccountBroken method
    const result = await authStore.createAccountBroken(registrationData);

    // Verify the complete flow was executed
    expect(mockFetch).toHaveBeenCalledTimes(3);
    
    // Verify Step 1: User registration API call
    expect(mockFetch).toHaveBeenNthCalledWith(1, 
      'https://api.test.com/auth/register',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        }),
        body: expect.stringContaining('test@example.com')
      })
    );

    // Verify Step 2: WebAuthn options API call
    expect(mockFetch).toHaveBeenNthCalledWith(2,
      'https://api.test.com/auth/webauthn/register/options',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer temp-access-token'
        })
      })
    );

    // Verify Step 3: WebAuthn verification API call
    expect(mockFetch).toHaveBeenNthCalledWith(3,
      'https://api.test.com/auth/webauthn/register/verify',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer temp-access-token'
        })
      })
    );

    // Verify WebAuthn credential creation was called
    expect(mockCredentialCreate).toHaveBeenCalledWith({
      publicKey: expect.objectContaining({
        challenge: expect.any(ArrayBuffer),
        rp: { name: 'Test App', id: 'test.com' },
        user: expect.objectContaining({
          id: expect.any(ArrayBuffer),
          name: 'test@example.com'
        })
      })
    });

    // Verify successful result
    expect(result.step).toBe('success');
    expect(result.user).toEqual(expect.objectContaining({
      id: 'user-123',
      email: 'test@example.com'
    }));
    expect(result.accessToken).toBe('final-access-token');
  });

  test('CRITICAL: createAccountBroken should handle invitation token flow correctly', async () => {
    // Mock invitation registration response
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          step: 'success',
          user: { 
            id: 'user-456', 
            email: 'invited@example.com', 
            emailVerified: true // Already verified via invitation
          },
          accessToken: 'invitation-access-token',
          refreshToken: 'invitation-refresh-token',
          emailVerifiedViaInvitation: true // CRITICAL: This field must be present
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          challenge: 'invitation-challenge',
          rp: { name: 'Test App', id: 'test.com' },
          user: { 
            id: 'user-456-base64', 
            name: 'invited@example.com', 
            displayName: 'Invited User' 
          },
          pubKeyCredParams: [{ alg: -7, type: 'public-key' }]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          credentialId: 'invitation-credential-id',
          user: {
            id: 'user-456',
            email: 'invited@example.com',
            emailVerified: true
          },
          accessToken: 'final-invitation-token',
          refreshToken: 'final-invitation-refresh'
        })
      });

    mockCredentialCreate.mockResolvedValue({
      id: 'invitation-credential-id',
      rawId: new ArrayBuffer(32),
      response: {
        clientDataJSON: new ArrayBuffer(64),
        attestationObject: new ArrayBuffer(128)
      },
      type: 'public-key'
    });

    const invitationRegistrationData = {
      email: 'invited@example.com',
      firstName: 'Invited',
      lastName: 'User',
      acceptedTerms: true,
      acceptedPrivacy: true,
      invitationToken: 'invitation-token-123' // CRITICAL: Invitation token present
    };

    // CRITICAL: Test invitation flow
    const result = await authStore.createAccountBroken(invitationRegistrationData);

    // Verify invitation token was sent in registration request
    const registrationCall = mockFetch.mock.calls[0];
    const registrationBody = JSON.parse(registrationCall[1].body);
    expect(registrationBody.invitationToken).toBe('invitation-token-123');

    // Verify result includes email verification status
    expect(result.emailVerifiedViaInvitation).toBe(true);
    expect(result.user.emailVerified).toBe(true);
  });

  test('CRITICAL: createAccountBroken should handle WebAuthn errors gracefully', async () => {
    // Mock successful user registration
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        step: 'success',
        user: { id: 'user-789', email: 'error@example.com' },
        accessToken: 'error-access-token'
      })
    });

    // Mock WebAuthn options
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        challenge: 'error-challenge',
        rp: { name: 'Test App', id: 'test.com' },
        user: { id: 'user-789', name: 'error@example.com' }
      })
    });

    // Mock WebAuthn credential creation failure
    mockCredentialCreate.mockRejectedValue(new Error('User cancelled WebAuthn'));

    const registrationData = {
      email: 'error@example.com',
      firstName: 'Error',
      lastName: 'User',
      acceptedTerms: true,
      acceptedPrivacy: true
    };

    // CRITICAL: Should handle WebAuthn errors gracefully
    await expect(authStore.createAccountBroken(registrationData))
      .rejects.toThrow(/User cancelled WebAuthn/);

    // Verify user registration still happened
    expect(mockFetch).toHaveBeenCalledTimes(2);
    
    // Verify WebAuthn verification was NOT called (due to credential creation failure)
    expect(mockFetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/auth/webauthn/register/verify'),
      expect.any(Object)
    );
  });

  test('CRITICAL: createAccountBroken should validate required fields', async () => {
    const invalidRegistrationData = {
      // Missing required fields
      email: '',
      acceptedTerms: false,
      acceptedPrivacy: false
    };

    // CRITICAL: Should validate required fields before API calls
    await expect(authStore.createAccountBroken(invalidRegistrationData))
      .rejects.toThrow();

    // Verify no API calls were made
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockCredentialCreate).not.toHaveBeenCalled();
  });

  test('CRITICAL: createAccountBroken should handle API failures gracefully', async () => {
    // Mock API failure
    mockFetch.mockRejectedValue(new Error('Network error'));

    const registrationData = {
      email: 'network@example.com',
      firstName: 'Network',
      lastName: 'Error',
      acceptedTerms: true,
      acceptedPrivacy: true
    };

    // CRITICAL: Should handle network errors gracefully
    await expect(authStore.createAccountBroken(registrationData))
      .rejects.toThrow(/Network error/);

    // Verify only one API call was attempted
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockCredentialCreate).not.toHaveBeenCalled();
  });
});
