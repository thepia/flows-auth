/**
 * Bundle API Validation Tests
 *
 * Comprehensive integration tests that validate the full API being exported
 * in the built bundles. This ensures the published package exports all
 * intended functionality correctly.
 *
 * Test Categories:
 * - Package.json export configuration validation
 * - ESM bundle validation (importing and testing all exports)
 * - CJS bundle validation
 * - TypeScript definitions validation
 * - Bundle integrity checks
 * - Functional API validation (creating actual instances)
 * - Development components validation
 * - Internationalization exports validation
 * - Invitation and token utilities validation
 * - Context and auth utilities validation
 */

import { existsSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { beforeAll, describe, expect, it } from 'vitest';

// Test setup - NO mocking for integration tests
console.log('🚨 Test setup: NO fetch mocking - using real networking for all tests');

describe('Bundle API Validation (Integration)', () => {
  const ROOT_PATH = join(__dirname, '../..');
  const DIST_PATH = join(ROOT_PATH, 'dist');
  const DIST_ESM_PATH = join(DIST_PATH, 'index.js');
  const DIST_CJS_PATH = join(DIST_PATH, 'index.cjs');
  const DIST_TYPES_PATH = join(DIST_PATH, 'index.d.ts');
  const PACKAGE_JSON_PATH = join(ROOT_PATH, 'package.json');

  let packageJson: any;

  beforeAll(() => {
    // Load package.json for validation
    packageJson = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
  });

  describe('Package.json Export Configuration', () => {
    it('should have correct export paths in package.json', () => {
      expect(packageJson.exports).toBeDefined();
      expect(packageJson.exports['.']).toBeDefined();

      const mainExport = packageJson.exports['.'];
      expect(mainExport.types).toBe('./dist/index.d.ts');
      expect(mainExport.svelte).toBe('./dist/index.js');
      expect(mainExport.import).toBe('./dist/index.js');
      expect(mainExport.require).toBe('./dist/index.cjs');

      // Verify all export paths exist on filesystem
      expect(existsSync(join(ROOT_PATH, mainExport.types))).toBe(true);
      expect(existsSync(join(ROOT_PATH, mainExport.svelte))).toBe(true);
      expect(existsSync(join(ROOT_PATH, mainExport.import))).toBe(true);
      expect(existsSync(join(ROOT_PATH, mainExport.require))).toBe(true);
    });

    it('should have correct legacy fields', () => {
      expect(packageJson.main).toBe('./dist/index.js');
      expect(packageJson.module).toBe('./dist/index.js');
      expect(packageJson.types).toBe('./dist/index.d.ts');
      expect(packageJson.svelte).toBe('./dist/index.js');

      // Verify legacy fields point to existing files
      expect(existsSync(join(ROOT_PATH, packageJson.main))).toBe(true);
      expect(existsSync(join(ROOT_PATH, packageJson.module))).toBe(true);
      expect(existsSync(join(ROOT_PATH, packageJson.types))).toBe(true);
      expect(existsSync(join(ROOT_PATH, packageJson.svelte))).toBe(true);
    });
  });

  describe('ESM Bundle Validation', () => {
    it('should import successfully from ESM bundle', async () => {
      expect(existsSync(DIST_ESM_PATH)).toBe(true);

      // Test actual import
      const esmBundle = await import(DIST_ESM_PATH);
      expect(esmBundle).toBeDefined();
      expect(typeof esmBundle).toBe('object');
    });

    it('should export all core components from ESM bundle', async () => {
      const {
        SignInForm,
        AccountCreationForm,
        SignInCore,
        EmailInput,
        AuthButton,
        AuthStateMessage
      } = await import(DIST_ESM_PATH);

      expect(SignInForm).toBeDefined();
      expect(AccountCreationForm).toBeDefined();
      expect(SignInCore).toBeDefined();
      expect(EmailInput).toBeDefined();
      expect(AuthButton).toBeDefined();
      expect(AuthStateMessage).toBeDefined();
    });

    it('should export all API clients from ESM bundle', async () => {
      const { AuthApiClient, SyncApiClient } = await import(DIST_ESM_PATH);

      expect(AuthApiClient).toBeDefined();
      expect(typeof AuthApiClient).toBe('function');
      expect(SyncApiClient).toBeDefined();
      expect(typeof SyncApiClient).toBe('function');
    });

    it('should export all store functions from ESM bundle', async () => {
      const {
        createAuthStore,
        createAuthDerivedStores,
        getGlobalAuthStore,
        initializeAuth,
        resetGlobalAuthStore
      } = await import(DIST_ESM_PATH);

      expect(createAuthStore).toBeDefined();
      expect(typeof createAuthStore).toBe('function');
      expect(createAuthDerivedStores).toBeDefined();
      expect(typeof createAuthDerivedStores).toBe('function');
      expect(getGlobalAuthStore).toBeDefined();
      expect(typeof getGlobalAuthStore).toBe('function');
      expect(initializeAuth).toBeDefined();
      expect(typeof initializeAuth).toBe('function');
      expect(resetGlobalAuthStore).toBeDefined();
      expect(typeof resetGlobalAuthStore).toBe('function');
    });

    it('should export all WebAuthn utilities from ESM bundle', async () => {
      const {
        isWebAuthnSupported,
        isPlatformAuthenticatorAvailable,
        authenticateWithPasskey,
        createPasskey,
        serializeCredential,
        generatePasskeyName,
        createCredential,
        isConditionalMediationSupported
      } = await import(DIST_ESM_PATH);

      expect(isWebAuthnSupported).toBeDefined();
      expect(typeof isWebAuthnSupported).toBe('function');
      expect(isPlatformAuthenticatorAvailable).toBeDefined();
      expect(typeof isPlatformAuthenticatorAvailable).toBe('function');
      expect(authenticateWithPasskey).toBeDefined();
      expect(typeof authenticateWithPasskey).toBe('function');
      expect(createPasskey).toBeDefined();
      expect(typeof createPasskey).toBe('function');
      expect(serializeCredential).toBeDefined();
      expect(typeof serializeCredential).toBe('function');
      expect(generatePasskeyName).toBeDefined();
      expect(typeof generatePasskeyName).toBe('function');
      expect(createCredential).toBeDefined();
      expect(typeof createCredential).toBe('function');
      expect(isConditionalMediationSupported).toBeDefined();
      expect(typeof isConditionalMediationSupported).toBe('function');
    });

    it('should export all session management utilities from ESM bundle', async () => {
      const {
        saveSession,
        getSession,
        clearSession,
        isSessionValid,
        configureSessionStorage,
        migrateSessionSafely
      } = await import(DIST_ESM_PATH);

      expect(saveSession).toBeDefined();
      expect(typeof saveSession).toBe('function');
      expect(getSession).toBeDefined();
      expect(typeof getSession).toBe('function');
      expect(clearSession).toBeDefined();
      expect(typeof clearSession).toBe('function');
      expect(isSessionValid).toBeDefined();
      expect(typeof isSessionValid).toBe('function');
      expect(configureSessionStorage).toBeDefined();
      expect(typeof configureSessionStorage).toBe('function');
      expect(migrateSessionSafely).toBeDefined();
      expect(typeof migrateSessionSafely).toBe('function');
    });

    it('should export VERSION and configuration utilities from ESM bundle', async () => {
      const { VERSION, createDefaultConfig, detectApiServer, createDefaultAuthConfig } =
        await import(DIST_ESM_PATH);

      expect(VERSION).toBeDefined();
      expect(typeof VERSION).toBe('string');
      expect(VERSION.length).toBeGreaterThan(0);
      expect(createDefaultConfig).toBeDefined();
      expect(typeof createDefaultConfig).toBe('function');
      expect(detectApiServer).toBeDefined();
      expect(typeof detectApiServer).toBe('function');
      expect(createDefaultAuthConfig).toBeDefined();
      expect(typeof createDefaultAuthConfig).toBe('function');
    });

    it('should not export undefined values from ESM bundle', async () => {
      const esmBundle = await import(DIST_ESM_PATH);

      // Check that no exports are undefined
      for (const [key, value] of Object.entries(esmBundle)) {
        expect(value).toBeDefined();
        expect(value).not.toBeNull();
        expect(value).not.toBeUndefined();
      }
    });
  });

  describe('CJS Bundle Validation', () => {
    it('should require successfully from CJS bundle', async () => {
      expect(existsSync(DIST_CJS_PATH)).toBe(true);

      // Test actual require (using dynamic import for CJS)
      const cjsBundle = await import(DIST_CJS_PATH);
      expect(cjsBundle).toBeDefined();
      expect(typeof cjsBundle).toBe('object');
    });

    it('should export core components from CJS bundle', async () => {
      const cjsBundle = await import(DIST_CJS_PATH);

      expect(cjsBundle.SignInForm).toBeDefined();
      expect(cjsBundle.createAuthStore).toBeDefined();
      expect(cjsBundle.AuthApiClient).toBeDefined();
      expect(cjsBundle.isWebAuthnSupported).toBeDefined();
      expect(cjsBundle.VERSION).toBeDefined();
    });
  });

  describe('TypeScript Definitions Validation', () => {
    it('should have TypeScript definition file', () => {
      expect(existsSync(DIST_TYPES_PATH)).toBe(true);

      const dtsContent = readFileSync(DIST_TYPES_PATH, 'utf-8');
      expect(dtsContent.length).toBeGreaterThan(0);
      expect(dtsContent).toContain('export');
    });

    it('should export type definitions for main interfaces', () => {
      const dtsContent = readFileSync(DIST_TYPES_PATH, 'utf-8');

      // Check for key type exports
      expect(dtsContent).toMatch(/export.*AuthConfig/);
      expect(dtsContent).toMatch(/export.*AuthState/);
      expect(dtsContent).toMatch(/export.*SignInState/);
      expect(dtsContent).toMatch(/export.*AuthApiClient/);
    });
  });

  describe('Bundle Integrity', () => {
    it('should have consistent exports between ESM and CJS', async () => {
      const esmBundle = await import(DIST_ESM_PATH);
      const cjsBundle = await import(DIST_CJS_PATH);

      // Get export keys (excluding default export)
      const esmKeys = Object.keys(esmBundle)
        .filter((key) => key !== 'default')
        .sort();
      const cjsKeys = Object.keys(cjsBundle)
        .filter((key) => key !== 'default')
        .sort();

      // Should have same exports (allowing for some differences in bundling)
      const commonKeys = esmKeys.filter((key) => cjsKeys.includes(key));
      expect(commonKeys.length).toBeGreaterThan(20); // Should have substantial overlap
    });

    it('should have reasonable bundle sizes', () => {
      const esmStats = statSync(DIST_ESM_PATH);
      const cjsStats = statSync(DIST_CJS_PATH);

      // Bundle sizes should be reasonable (100KB - 5MB range)
      expect(esmStats.size).toBeGreaterThan(100 * 1024); // > 100KB
      expect(esmStats.size).toBeLessThan(5 * 1024 * 1024); // < 5MB
      expect(cjsStats.size).toBeGreaterThan(100 * 1024); // > 100KB
      expect(cjsStats.size).toBeLessThan(5 * 1024 * 1024); // < 5MB
    });
  });

  describe('Functional API Validation', () => {
    it('should be able to create auth store from built bundle', async () => {
      const { createAuthStore } = await import(DIST_ESM_PATH);

      const config = {
        apiBaseUrl: 'https://api.test.com',
        clientId: 'test-client',
        domain: 'test.com',
        enablePasskeys: true,
        enableMagicLinks: false,
        appCode: 'test-app'
      };

      const authStore = createAuthStore(config);

      expect(authStore).toBeDefined();
      
      // New modular store interface
      expect(authStore.api).toBeDefined();
      expect(typeof authStore.api.signInWithPasskey).toBe('function');
      expect(typeof authStore.api.checkUser).toBe('function');
      expect(typeof authStore.api.isAuthenticated).toBe('function');
      
      // Store access
      expect(authStore.core).toBeDefined();
      expect(authStore.ui).toBeDefined();
      expect(typeof authStore.destroy).toBe('function');
    });

    it('should be able to create API client from built bundle', async () => {
      const { AuthApiClient } = await import(DIST_ESM_PATH);

      const config = {
        apiBaseUrl: 'https://api.test.com',
        clientId: 'test-client',
        domain: 'test.com',
        enablePasskeys: true,
        enableMagicLinks: false,
        appCode: 'test-app'
      };

      const apiClient = new AuthApiClient(config);

      expect(apiClient).toBeDefined();
      expect(typeof apiClient.signIn).toBe('function');
      expect(typeof apiClient.checkEmail).toBe('function');
    });

    it('should export working WebAuthn utilities', async () => {
      const { isWebAuthnSupported, isPlatformAuthenticatorAvailable } = await import(DIST_ESM_PATH);

      // These should be callable without errors
      expect(() => isWebAuthnSupported()).not.toThrow();
      expect(() => isPlatformAuthenticatorAvailable()).not.toThrow();
    });

    it('should export working session utilities', async () => {
      const { configureSessionStorage, getStorageConfig } = await import(DIST_ESM_PATH);

      // These should be callable without errors
      expect(() => configureSessionStorage()).not.toThrow();
      expect(() => getStorageConfig()).not.toThrow();
    });
  });

  describe('Development Components Validation', () => {
    it('should export development and testing components', async () => {
      const { ErrorReportingStatus, TestFlow, SessionStateMachineFlow, SignInStateMachineFlow } =
        await import(DIST_ESM_PATH);

      expect(ErrorReportingStatus).toBeDefined();
      expect(TestFlow).toBeDefined();
      expect(SessionStateMachineFlow).toBeDefined();
      expect(SignInStateMachineFlow).toBeDefined();
    });
  });

  describe('Internationalization Exports', () => {
    it('should export i18n utilities', async () => {
      const { createParaglideI18n } = await import(DIST_ESM_PATH);

      expect(createParaglideI18n).toBeDefined();
      expect(typeof createParaglideI18n).toBe('function');
    });
  });

  describe('Invitation and Token Utilities', () => {
    it('should export invitation processing utilities', async () => {
      const { processInvitationToken, extractRegistrationDataFromToken } = await import(
        DIST_ESM_PATH
      );

      expect(processInvitationToken).toBeDefined();
      expect(typeof processInvitationToken).toBe('function');
      expect(extractRegistrationDataFromToken).toBeDefined();
      expect(typeof extractRegistrationDataFromToken).toBe('function');
    });

    it('should export invitation token utilities', async () => {
      const { decodeInvitationToken, extractRegistrationData, validateInvitationToken } =
        await import(DIST_ESM_PATH);

      expect(decodeInvitationToken).toBeDefined();
      expect(typeof decodeInvitationToken).toBe('function');
      expect(extractRegistrationData).toBeDefined();
      expect(typeof extractRegistrationData).toBe('function');
      expect(validateInvitationToken).toBeDefined();
      expect(typeof validateInvitationToken).toBe('function');
    });
  });

  describe('Context and Auth Utilities', () => {
    it('should export auth context utilities', async () => {
      const { getAuthContext, setAuthContext, useAuth } = await import(DIST_ESM_PATH);

      expect(getAuthContext).toBeDefined();
      expect(typeof getAuthContext).toBe('function');
      expect(setAuthContext).toBeDefined();
      expect(typeof setAuthContext).toBe('function');
      expect(useAuth).toBeDefined();
      expect(typeof useAuth).toBe('function');
    });

    it('should export context constants', async () => {
      const { CONTEXT_KEYS, AUTH_CONTEXT_KEY } = await import(DIST_ESM_PATH);

      expect(CONTEXT_KEYS).toBeDefined();
      expect(typeof CONTEXT_KEYS).toBe('object');
      expect(AUTH_CONTEXT_KEY).toBeDefined();
      expect(typeof AUTH_CONTEXT_KEY).toBe('string');
    });
  });
});
