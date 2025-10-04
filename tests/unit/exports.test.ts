/**
 * Comprehensive Export Tests
 * Verifies all exported functions and components can be imported properly
 */
import { describe, expect, it } from 'vitest';

describe('Library Exports', () => {
  describe('API Clients', () => {
    it('should export AuthApiClient', async () => {
      const { AuthApiClient } = await import('../../src/index');
      expect(AuthApiClient).toBeDefined();
      expect(typeof AuthApiClient).toBe('function');
    });

    it('should export SyncApiClient', async () => {
      const { SyncApiClient } = await import('../../src/index');
      expect(SyncApiClient).toBeDefined();
      expect(typeof SyncApiClient).toBe('function');
    });
  });

  describe('Svelte Components', () => {
    it('should export AccountCreationForm', async () => {
      const { AccountCreationForm } = await import('../../src/index');
      expect(AccountCreationForm).toBeDefined();
    });

    it('should export EmailVerificationBanner', async () => {
      const { EmailVerificationBanner } = await import('../../src/index');
      expect(EmailVerificationBanner).toBeDefined();
    });

    it('should export EmailVerificationPrompt', async () => {
      const { EmailVerificationPrompt } = await import('../../src/index');
      expect(EmailVerificationPrompt).toBeDefined();
    });

    it('should export SignInForm', async () => {
      const { SignInForm } = await import('../../src/index');
      expect(SignInForm).toBeDefined();
    });
  });

  describe('Core Components', () => {
    it('should export EmailInput', async () => {
      const { EmailInput } = await import('../../src/index');
      expect(EmailInput).toBeDefined();
    });

    it('should export AuthButton', async () => {
      const { AuthButton } = await import('../../src/index');
      expect(AuthButton).toBeDefined();
    });

    it('should export AuthStateMessage', async () => {
      const { AuthStateMessage } = await import('../../src/index');
      expect(AuthStateMessage).toBeDefined();
    });

    it('should export SignInCore', async () => {
      const { SignInCore } = await import('../../src/index');
      expect(SignInCore).toBeDefined();
    });
  });

  describe('Store Functions', () => {
    it('should export createAuthStore', async () => {
      const { createAuthStore } = await import('../../src/index');
      expect(createAuthStore).toBeDefined();
      expect(typeof createAuthStore).toBe('function');
    });
  });

  describe('API Detection', () => {
    it('should export DEFAULT_API_CONFIG', async () => {
      const { DEFAULT_API_CONFIG } = await import('../../src/index');
      expect(DEFAULT_API_CONFIG).toBeDefined();
      expect(typeof DEFAULT_API_CONFIG).toBe('object');
    });

    it('should export detectApiServer', async () => {
      const { detectApiServer } = await import('../../src/index');
      expect(detectApiServer).toBeDefined();
      expect(typeof detectApiServer).toBe('function');
    });
  });

  describe('WebAuthn Utilities', () => {
    it('should export isWebAuthnSupported', async () => {
      const { isWebAuthnSupported } = await import('../../src/index');
      expect(isWebAuthnSupported).toBeDefined();
      expect(typeof isWebAuthnSupported).toBe('function');
    });

    it('should export isPlatformAuthenticatorAvailable', async () => {
      const { isPlatformAuthenticatorAvailable } = await import('../../src/index');
      expect(isPlatformAuthenticatorAvailable).toBeDefined();
      expect(typeof isPlatformAuthenticatorAvailable).toBe('function');
    });

    it('should export createPasskey', async () => {
      const { createPasskey } = await import('../../src/index');
      expect(createPasskey).toBeDefined();
      expect(typeof createPasskey).toBe('function');
    });

    it('should export createCredential', async () => {
      const { createCredential } = await import('../../src/index');
      expect(createCredential).toBeDefined();
      expect(typeof createCredential).toBe('function');
    });

    it('should export isConditionalMediationSupported', async () => {
      const { isConditionalMediationSupported } = await import('../../src/index');
      expect(isConditionalMediationSupported).toBeDefined();
      expect(typeof isConditionalMediationSupported).toBe('function');
    });

    it('should export authenticateWithPasskey', async () => {
      const { authenticateWithPasskey } = await import('../../src/index');
      expect(authenticateWithPasskey).toBeDefined();
      expect(typeof authenticateWithPasskey).toBe('function');
    });

    it('should export serializeCredential', async () => {
      const { serializeCredential } = await import('../../src/index');
      expect(serializeCredential).toBeDefined();
      expect(typeof serializeCredential).toBe('function');
    });

    it('should export generatePasskeyName', async () => {
      const { generatePasskeyName } = await import('../../src/index');
      expect(generatePasskeyName).toBeDefined();
      expect(typeof generatePasskeyName).toBe('function');
    });
  });

  describe('Session Management', () => {
    it('should export clearSession', async () => {
      const { clearSession } = await import('../../src/index');
      expect(clearSession).toBeDefined();
      expect(typeof clearSession).toBe('function');
    });

    it('should export configureSessionStorage', async () => {
      const { configureSessionStorage } = await import('../../src/index');
      expect(configureSessionStorage).toBeDefined();
      expect(typeof configureSessionStorage).toBe('function');
    });

    it('should export getAccessTokenFromSession', async () => {
      const { getAccessTokenFromSession } = await import('../../src/index');
      expect(getAccessTokenFromSession).toBeDefined();
      expect(typeof getAccessTokenFromSession).toBe('function');
    });

    it('should export getCurrentUserFromSession', async () => {
      const { getCurrentUserFromSession } = await import('../../src/index');
      expect(getCurrentUserFromSession).toBeDefined();
      expect(typeof getCurrentUserFromSession).toBe('function');
    });

    it('should export getOptimalSessionConfig', async () => {
      const { getOptimalSessionConfig } = await import('../../src/index');
      expect(getOptimalSessionConfig).toBeDefined();
      expect(typeof getOptimalSessionConfig).toBe('function');
    });

    it('should export getSession', async () => {
      const { getSession } = await import('../../src/index');
      expect(getSession).toBeDefined();
      expect(typeof getSession).toBe('function');
    });

    it('should export getStorageConfig', async () => {
      const { getStorageConfig } = await import('../../src/index');
      expect(getStorageConfig).toBeDefined();
      expect(typeof getStorageConfig).toBe('function');
    });

    it('should export isAuthenticatedFromSession', async () => {
      const { isAuthenticatedFromSession } = await import('../../src/index');
      expect(isAuthenticatedFromSession).toBeDefined();
      expect(typeof isAuthenticatedFromSession).toBe('function');
    });

    it('should export isSessionValid', async () => {
      const { isSessionValid } = await import('../../src/index');
      expect(isSessionValid).toBeDefined();
      expect(typeof isSessionValid).toBe('function');
    });

    it('should export saveSession', async () => {
      const { saveSession } = await import('../../src/index');
      expect(saveSession).toBeDefined();
      expect(typeof saveSession).toBe('function');
    });

    it('should export supportsPersistentSessions', async () => {
      const { supportsPersistentSessions } = await import('../../src/index');
      expect(supportsPersistentSessions).toBeDefined();
      expect(typeof supportsPersistentSessions).toBe('function');
    });
  });

  describe('Invitation Processing', () => {
    it('should export extractRegistrationDataFromToken', async () => {
      const { extractRegistrationDataFromToken } = await import('../../src/index');
      expect(extractRegistrationDataFromToken).toBeDefined();
      expect(typeof extractRegistrationDataFromToken).toBe('function');
    });

    it('should export processInvitationToken', async () => {
      const { processInvitationToken } = await import('../../src/index');
      expect(processInvitationToken).toBeDefined();
      expect(typeof processInvitationToken).toBe('function');
    });
  });

  describe('Invitation Tokens', () => {
    it('should export decodeInvitationToken', async () => {
      const { decodeInvitationToken } = await import('../../src/index');
      expect(decodeInvitationToken).toBeDefined();
      expect(typeof decodeInvitationToken).toBe('function');
    });

    it('should export extractRegistrationData', async () => {
      const { extractRegistrationData } = await import('../../src/index');
      expect(extractRegistrationData).toBeDefined();
      expect(typeof extractRegistrationData).toBe('function');
    });

    it('should export hashInvitationToken', async () => {
      const { hashInvitationToken } = await import('../../src/index');
      expect(hashInvitationToken).toBeDefined();
      expect(typeof hashInvitationToken).toBe('function');
    });

    it('should export validateInvitationToken', async () => {
      const { validateInvitationToken } = await import('../../src/index');
      expect(validateInvitationToken).toBeDefined();
      expect(typeof validateInvitationToken).toBe('function');
    });
  });

  describe('Session Migration', () => {
    it('should export getRoleBasedStorageConfig', async () => {
      const { getRoleBasedStorageConfig } = await import('../../src/index');
      expect(getRoleBasedStorageConfig).toBeDefined();
      expect(typeof getRoleBasedStorageConfig).toBe('function');
    });

    it('should export migrateForRole', async () => {
      const { migrateForRole } = await import('../../src/index');
      expect(migrateForRole).toBeDefined();
      expect(typeof migrateForRole).toBe('function');
    });

    it('should export migrateSessionSafely', async () => {
      const { migrateSessionSafely } = await import('../../src/index');
      expect(migrateSessionSafely).toBeDefined();
      expect(typeof migrateSessionSafely).toBe('function');
    });

    it('should export SessionMigrator', async () => {
      const { SessionMigrator } = await import('../../src/index');
      expect(SessionMigrator).toBeDefined();
      expect(typeof SessionMigrator).toBe('function');
    });

    it('should export sessionMigrator', async () => {
      const { sessionMigrator } = await import('../../src/index');
      expect(sessionMigrator).toBeDefined();
      expect(typeof sessionMigrator).toBe('object');
    });

    it('should export shouldMigrateSession', async () => {
      const { shouldMigrateSession } = await import('../../src/index');
      expect(shouldMigrateSession).toBeDefined();
      expect(typeof shouldMigrateSession).toBe('function');
    });
  });

  describe('Configuration', () => {
    it('should export createDefaultConfig', async () => {
      const { createDefaultConfig } = await import('../../src/index');
      expect(createDefaultConfig).toBeDefined();
      expect(typeof createDefaultConfig).toBe('function');
    });

    it('should export VERSION', async () => {
      const { VERSION } = await import('../../src/index');
      expect(VERSION).toBeDefined();
      expect(typeof VERSION).toBe('string');
      expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });
});
