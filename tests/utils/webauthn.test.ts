/**
 * WebAuthn Utilities Tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  createPasskey,
  authenticateWithPasskey,
  serializeCredential,
  generatePasskeyName
} from '../../src/utils/webauthn';
import type { PasskeyChallenge } from '../../src/types';

// Mock WebAuthn APIs
const mockCredential = {
  id: 'credential-id',
  rawId: new ArrayBuffer(16),
  response: {
    clientDataJSON: new ArrayBuffer(32),
    authenticatorData: new ArrayBuffer(16),
    signature: new ArrayBuffer(64),
    userHandle: new ArrayBuffer(8)
  },
  type: 'public-key'
};

const mockAttestationCredential = {
  id: 'credential-id',
  rawId: new ArrayBuffer(16),
  response: {
    clientDataJSON: new ArrayBuffer(32),
    attestationObject: new ArrayBuffer(64)
  },
  type: 'public-key'
};

describe('WebAuthn Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Feature Detection', () => {
    it('should detect WebAuthn support when available', () => {
      Object.defineProperty(window, 'PublicKeyCredential', {
        value: function() {},
        configurable: true
      });

      expect(isWebAuthnSupported()).toBe(true);
    });

    it('should detect lack of WebAuthn support', () => {
      Object.defineProperty(window, 'PublicKeyCredential', {
        value: undefined,
        configurable: true
      });

      expect(isWebAuthnSupported()).toBe(false);
    });

    it('should check platform authenticator availability', async () => {
      // Mock both the constructor and the static method
      const mockPublicKeyCredential = function() {};
      mockPublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable = vi.fn().mockResolvedValue(true);

      Object.defineProperty(window, 'PublicKeyCredential', {
        value: mockPublicKeyCredential,
        configurable: true
      });

      const isAvailable = await isPlatformAuthenticatorAvailable();
      expect(isAvailable).toBe(true);
    });

    it('should handle platform authenticator check failure', async () => {
      Object.defineProperty(window, 'PublicKeyCredential', {
        value: {
          isUserVerifyingPlatformAuthenticatorAvailable: vi.fn().mockRejectedValue(new Error('Not available'))
        },
        configurable: true
      });

      const isAvailable = await isPlatformAuthenticatorAvailable();
      expect(isAvailable).toBe(false);
    });
  });

  describe('Passkey Creation', () => {
    const mockChallenge: PasskeyChallenge = {
      challenge: 'Y2hhbGxlbmdl', // base64: "challenge"
      rpId: 'example.com',
      timeout: 60000
    };

    beforeEach(() => {
      Object.defineProperty(window, 'PublicKeyCredential', {
        value: function() {},
        configurable: true
      });

      Object.defineProperty(navigator, 'credentials', {
        value: {
          create: vi.fn().mockResolvedValue(mockAttestationCredential),
          get: vi.fn().mockResolvedValue(mockCredential)
        },
        configurable: true
      });
    });

    it('should create a passkey successfully', async () => {
      const credential = await createPasskey(mockChallenge, 'test@example.com', 'Test User');

      // Verify the call was made with correct structure (don't check exact ArrayBuffer contents)
      expect(navigator.credentials.create).toHaveBeenCalledWith(
        expect.objectContaining({
          publicKey: expect.objectContaining({
            rp: {
              id: 'example.com',
              name: 'Thepia Authentication'
            },
            user: expect.objectContaining({
              name: 'test@example.com',
              displayName: 'Test User'
            }),
            pubKeyCredParams: [
              { alg: -7, type: 'public-key' },
              { alg: -257, type: 'public-key' }
            ],
            authenticatorSelection: {
              authenticatorAttachment: 'platform',
              userVerification: 'required',
              residentKey: 'preferred'
            },
            timeout: 60000,
            attestation: 'direct'
          })
        })
      );

      expect(credential).toEqual(mockAttestationCredential);
    });

    it('should use email prefix as displayName when not provided', async () => {
      await createPasskey(mockChallenge, 'test@example.com');

      expect(navigator.credentials.create).toHaveBeenCalledWith(
        expect.objectContaining({
          publicKey: expect.objectContaining({
            user: expect.objectContaining({
              displayName: 'test'
            })
          })
        })
      );
    });

    it('should throw error when WebAuthn is not supported', async () => {
      Object.defineProperty(window, 'PublicKeyCredential', {
        value: undefined,
        configurable: true
      });

      await expect(createPasskey(mockChallenge, 'test@example.com')).rejects.toThrow(
        'WebAuthn is not supported on this device'
      );
    });

    it('should handle credential creation failure', async () => {
      const createMock = vi.fn().mockRejectedValue(new Error('NotAllowedError'));
      Object.defineProperty(navigator, 'credentials', {
        value: { create: createMock },
        configurable: true
      });

      await expect(createPasskey(mockChallenge, 'test@example.com')).rejects.toThrow();
    });
  });

  describe('Passkey Authentication', () => {
    const mockChallenge: PasskeyChallenge = {
      challenge: 'Y2hhbGxlbmdl',
      rpId: 'example.com',
      timeout: 60000,
      allowCredentials: [
        {
          id: 'Y3JlZGVudGlhbC1pZA==', // base64: "credential-id"
          type: 'public-key',
          transports: ['internal']
        }
      ]
    };

    beforeEach(() => {
      Object.defineProperty(window, 'PublicKeyCredential', {
        value: function() {},
        configurable: true
      });

      Object.defineProperty(navigator, 'credentials', {
        value: {
          get: vi.fn().mockResolvedValue(mockCredential)
        },
        configurable: true
      });
    });

    it('should authenticate with passkey successfully', async () => {
      const credential = await authenticateWithPasskey(mockChallenge);

      expect(navigator.credentials.get).toHaveBeenCalledWith({
        publicKey: {
          challenge: expect.any(ArrayBuffer),
          rpId: 'example.com',
          allowCredentials: [
            {
              id: expect.any(ArrayBuffer),
              type: 'public-key',
              transports: ['internal']
            }
          ],
          userVerification: 'required',
          timeout: 60000
        }
      });

      expect(credential).toEqual(mockCredential);
    });

    it('should handle authentication without allowCredentials', async () => {
      const challengeWithoutCredentials = { ...mockChallenge, allowCredentials: undefined };
      
      await authenticateWithPasskey(challengeWithoutCredentials);

      expect(navigator.credentials.get).toHaveBeenCalledWith({
        publicKey: expect.objectContaining({
          allowCredentials: undefined
        })
      });
    });

    it('should throw error when no credential is returned', async () => {
      Object.defineProperty(navigator, 'credentials', {
        value: {
          get: vi.fn().mockResolvedValue(null)
        },
        configurable: true
      });

      await expect(authenticateWithPasskey(mockChallenge)).rejects.toThrow(
        'No credential returned'
      );
    });
  });

  describe('Error Mapping', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'PublicKeyCredential', {
        value: function() {},
        configurable: true
      });
    });

    it('should map NotSupportedError correctly', async () => {
      const error = new Error('Not supported');
      error.name = 'NotSupportedError';

      Object.defineProperty(navigator, 'credentials', {
        value: {
          create: vi.fn().mockRejectedValue(error)
        },
        configurable: true
      });

      const mockChallenge: PasskeyChallenge = {
        challenge: 'Y2hhbGxlbmdl',
        rpId: 'example.com'
      };

      await expect(createPasskey(mockChallenge, 'test@example.com')).rejects.toMatchObject({
        code: 'passkey_not_supported',
        message: 'Passkeys are not supported on this device'
      });
    });

    it('should map NotAllowedError correctly', async () => {
      const error = new Error('Not allowed');
      error.name = 'NotAllowedError';

      Object.defineProperty(navigator, 'credentials', {
        value: {
          get: vi.fn().mockRejectedValue(error)
        },
        configurable: true
      });

      const mockChallenge: PasskeyChallenge = {
        challenge: 'Y2hhbGxlbmdl',
        rpId: 'example.com'
      };

      await expect(authenticateWithPasskey(mockChallenge)).rejects.toMatchObject({
        code: 'passkey_failed',
        message: 'Passkey operation was cancelled or failed'
      });
    });

    it('should map SecurityError correctly', async () => {
      const error = new Error('Security error');
      error.name = 'SecurityError';

      Object.defineProperty(navigator, 'credentials', {
        value: {
          create: vi.fn().mockRejectedValue(error)
        },
        configurable: true
      });

      const mockChallenge: PasskeyChallenge = {
        challenge: 'Y2hhbGxlbmdl',
        rpId: 'example.com'
      };

      await expect(createPasskey(mockChallenge, 'test@example.com')).rejects.toMatchObject({
        code: 'passkey_failed',
        message: 'Security error during passkey operation'
      });
    });
  });

  describe('Credential Serialization', () => {
    it('should serialize credential correctly', () => {
      const serialized = serializeCredential(mockCredential as any);

      expect(serialized).toEqual({
        id: 'credential-id',
        rawId: expect.any(String),
        response: {
          clientDataJSON: expect.any(String),
          authenticatorData: expect.any(String),
          signature: expect.any(String),
          userHandle: expect.any(String)
        },
        type: 'public-key'
      });
    });

    it('should handle null userHandle', () => {
      const credentialWithoutUserHandle = {
        ...mockCredential,
        response: {
          ...mockCredential.response,
          userHandle: null
        }
      };

      const serialized = serializeCredential(credentialWithoutUserHandle as any);

      expect(serialized.response.userHandle).toBeNull();
    });
  });

  describe('Device Detection', () => {
    it('should generate passkey names with date', () => {
      const name = generatePasskeyName();
      expect(name).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/); // Should contain date
      expect(name.length).toBeGreaterThan(0);
    });
  });
});