/**
 * WebAuthn Utilities Tests (Simplified)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isWebAuthnSupported,
  generatePasskeyName
} from '../../src/utils/webauthn';

describe('WebAuthn Utilities (Simplified)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Feature Detection', () => {
    it('should detect WebAuthn support when available', () => {
      // Mock PublicKeyCredential
      Object.defineProperty(global, 'PublicKeyCredential', {
        value: function() {},
        writable: true,
        configurable: true
      });

      const result = isWebAuthnSupported();
      expect(result).toBe(true);
    });

    it('should detect lack of WebAuthn support', () => {
      // Remove PublicKeyCredential
      Object.defineProperty(global, 'PublicKeyCredential', {
        value: undefined,
        writable: true,
        configurable: true
      });

      const result = isWebAuthnSupported();
      expect(result).toBe(false);
    });
  });

  describe('Device Detection', () => {
    it('should generate passkey names', () => {
      const name = generatePasskeyName();
      expect(name).toContain('-');
      expect(name.length).toBeGreaterThan(0);
    });

    it('should include device info in passkey name', () => {
      // Mock different user agents
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
        writable: true,
        configurable: true
      });

      const name = generatePasskeyName();
      expect(name).toContain('iPhone');
    });
  });
});