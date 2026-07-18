/**
 * Bundle API Validation Tests
 *
 * Validates the full API surface of the built per-target bundles (flows-auth 1.2.0).
 *
 * NEW package shape (see docs/MULTI_FRAMEWORK_PACKAGING_PLAN.md, Phase 1):
 *  - "."        -> dist/index.js      framework-agnostic CORE (ESM-only)
 *  - "./svelte" -> dist/svelte/index.js  Svelte components + adapters + context
 *  - "./dev"    -> dist/svelte/dev.js     flow-viz components (@xyflow/svelte)
 *  - "./style.css" -> dist/flows-auth.css
 *
 * There is NO CJS build anymore (the `require` condition and dist/index.cjs are
 * gone), so all CJS-bundle and ESM/CJS-consistency tests have been removed.
 * The old `./dist/src/**`, `./stores`, `./types` subpath exports are also gone.
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

// Test setup - NO mocking for integration tests
console.log('🚨 Test setup: NO fetch mocking - using real networking for all tests');

describe('Bundle API Validation (Integration)', () => {
  const ROOT_PATH = join(__dirname, '../..');
  const DIST_PATH = join(ROOT_PATH, 'dist');
  const DIST_ESM_PATH = join(DIST_PATH, 'index.js');
  const DIST_TYPES_PATH = join(DIST_PATH, 'index.d.ts');
  const DIST_SVELTE_PATH = join(DIST_PATH, 'svelte', 'index.js');
  const PACKAGE_JSON_PATH = join(ROOT_PATH, 'package.json');

  // Built entry points (import the actual dist output — the point of these tests).
  const CORE = '../../dist/index.js';
  const SVELTE = '../../dist/svelte/index.js';

  let packageJson: any;

  beforeAll(() => {
    packageJson = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
  });

  describe('Package.json Export Configuration', () => {
    it('should have the new per-target export map', () => {
      expect(packageJson.exports).toBeDefined();

      // Core (ESM-only, no `require`, no `svelte` source condition)
      const core = packageJson.exports['.'];
      expect(core).toBeDefined();
      expect(core.types).toBe('./dist/index.d.ts');
      expect(core.default).toBe('./dist/index.js');
      expect(core.require).toBeUndefined();
      expect(core.svelte).toBeUndefined();

      // Svelte target
      const svelte = packageJson.exports['./svelte'];
      expect(svelte).toBeDefined();
      expect(svelte.types).toBe('./dist/svelte/index.d.ts');
      expect(svelte.svelte).toBe('./dist/svelte/index.js');
      expect(svelte.default).toBe('./dist/svelte/index.js');

      // Dev target (same conditional shape as ./svelte)
      const dev = packageJson.exports['./dev'];
      expect(dev).toBeDefined();
      expect(dev.types).toBe('./dist/svelte/dev.d.ts');
      expect(dev.svelte).toBe('./dist/svelte/dev.js');
      expect(dev.default).toBe('./dist/svelte/dev.js');

      // CSS + package.json passthrough
      expect(packageJson.exports['./style.css']).toBe('./dist/flows-auth.css');
      expect(packageJson.exports['./package.json']).toBe('./package.json');

      // Every referenced file must exist on disk
      expect(existsSync(join(ROOT_PATH, core.types))).toBe(true);
      expect(existsSync(join(ROOT_PATH, core.default))).toBe(true);
      expect(existsSync(join(ROOT_PATH, svelte.types))).toBe(true);
      expect(existsSync(join(ROOT_PATH, svelte.svelte))).toBe(true);
      expect(existsSync(join(ROOT_PATH, dev.default))).toBe(true);
      expect(existsSync(join(ROOT_PATH, packageJson.exports['./style.css']))).toBe(true);
    });

    it('should NOT expose removed subpath exports', () => {
      // These were all removed in the packaging refactor.
      expect(packageJson.exports['./stores']).toBeUndefined();
      expect(packageJson.exports['./types']).toBeUndefined();
      expect(packageJson.exports['./src']).toBeUndefined();
      expect(packageJson.exports['./paraglide/runtime.js']).toBeUndefined();
      expect(packageJson.exports['./paraglide/messages.js']).toBeUndefined();
    });

    it('should have correct legacy fields (ESM-only)', () => {
      expect(packageJson.main).toBe('./dist/index.js');
      expect(packageJson.module).toBe('./dist/index.js');
      expect(packageJson.types).toBe('./dist/index.d.ts');
      // Top-level `svelte` field pointing at dist/src was removed.
      expect(packageJson.svelte).toBeUndefined();

      expect(existsSync(join(ROOT_PATH, packageJson.main))).toBe(true);
      expect(existsSync(join(ROOT_PATH, packageJson.types))).toBe(true);
    });
  });

  describe('Core ESM Bundle Validation', () => {
    it('should import successfully from the core bundle', async () => {
      expect(existsSync(DIST_ESM_PATH)).toBe(true);
      const core = await import(CORE);
      expect(core).toBeDefined();
      expect(typeof core).toBe('object');
    });

    it('should NOT export Svelte components or makeSvelteCompatible from core', async () => {
      const core = await import(CORE);
      expect(core.SignInForm).toBeUndefined();
      expect(core.AccountCreationForm).toBeUndefined();
      expect(core.makeSvelteCompatible).toBeUndefined();
    });

    it('should export all API clients from core', async () => {
      const { AuthApiClient, SyncApiClient } = await import(CORE);
      expect(typeof AuthApiClient).toBe('function');
      expect(typeof SyncApiClient).toBe('function');
    });

    it('should export the auth store factory from core', async () => {
      const { createAuthStore } = await import(CORE);
      expect(typeof createAuthStore).toBe('function');
    });

    it('should export all WebAuthn utilities from core', async () => {
      const {
        isWebAuthnSupported,
        isPlatformAuthenticatorAvailable,
        authenticateWithPasskey,
        createPasskey,
        serializeCredential,
        generatePasskeyName,
        createCredential,
        isConditionalMediationSupported
      } = await import(CORE);

      for (const fn of [
        isWebAuthnSupported,
        isPlatformAuthenticatorAvailable,
        authenticateWithPasskey,
        createPasskey,
        serializeCredential,
        generatePasskeyName,
        createCredential,
        isConditionalMediationSupported
      ]) {
        expect(typeof fn).toBe('function');
      }
    });

    it('should export session management utilities from core', async () => {
      const { isSessionValid, configureSessionStorage, migrateSessionSafely } = await import(CORE);
      expect(typeof isSessionValid).toBe('function');
      expect(typeof configureSessionStorage).toBe('function');
      expect(typeof migrateSessionSafely).toBe('function');
    });

    it('should export VERSION and configuration utilities from core', async () => {
      const { VERSION, createDefaultConfig, detectApiServer, createDefaultAuthConfig } =
        await import(CORE);

      expect(typeof VERSION).toBe('string');
      expect(VERSION.length).toBeGreaterThan(0);
      expect(typeof createDefaultConfig).toBe('function');
      expect(typeof detectApiServer).toBe('function');
      expect(typeof createDefaultAuthConfig).toBe('function');
    });

    it('should not export undefined values from core', async () => {
      const core = await import(CORE);
      for (const [, value] of Object.entries(core)) {
        expect(value).not.toBeUndefined();
        expect(value).not.toBeNull();
      }
    });
  });

  describe('Svelte Bundle Validation', () => {
    it('should export all components from ./svelte', async () => {
      const {
        SignInForm,
        AccountCreationForm,
        EmailVerificationBanner,
        EmailVerificationPrompt,
        ErrorReportingStatus,
        SignInCore,
        EmailInput,
        AuthButton,
        AuthStateMessage,
        PolicyViewer,
        Icon
      } = await import(SVELTE);

      for (const c of [
        SignInForm,
        AccountCreationForm,
        EmailVerificationBanner,
        EmailVerificationPrompt,
        ErrorReportingStatus,
        SignInCore,
        EmailInput,
        AuthButton,
        AuthStateMessage,
        PolicyViewer,
        Icon
      ]) {
        expect(c).toBeDefined();
      }
    });

    it('should export makeSvelteCompatible + context helpers from ./svelte', async () => {
      const {
        makeSvelteCompatible,
        setupAuthContext,
        getAuthStoreFromContext,
        createAuthContext,
        assertAuthConfig,
        resetGlobalAuthStore,
        createParaglideI18n
      } = await import(SVELTE);

      for (const fn of [
        makeSvelteCompatible,
        setupAuthContext,
        getAuthStoreFromContext,
        createAuthContext,
        assertAuthConfig,
        resetGlobalAuthStore,
        createParaglideI18n
      ]) {
        expect(typeof fn).toBe('function');
      }
    });

    it('should NOT export Flow components from ./svelte (they live in ./dev)', async () => {
      const svelte = await import(SVELTE);
      expect(svelte.TestFlow).toBeUndefined();
      expect(svelte.SessionStateMachineFlow).toBeUndefined();
      expect(svelte.SignInStateMachineFlow).toBeUndefined();
    });
  });

  describe('TypeScript Definitions Validation', () => {
    it('should have a core TypeScript definition file', () => {
      expect(existsSync(DIST_TYPES_PATH)).toBe(true);
      const dts = readFileSync(DIST_TYPES_PATH, 'utf-8');
      expect(dts.length).toBeGreaterThan(0);
      expect(dts).toContain('export');
    });

    it('should re-export core types and reference siblings via plain .js specifiers', () => {
      const dts = readFileSync(DIST_TYPES_PATH, 'utf-8');

      expect(dts).toMatch(/export.*AuthApiClient/);
      expect(dts).toMatch(/export type \* from/);

      // The old fixDtsImports `.d.ts`-extension rewrite was REMOVED — sibling
      // declaration imports now use plain `.js` specifiers (tsc default),
      // never `.d.ts`.
      expect(dts).toMatch(/from '\.\/utils\/webauthn\.js'/);
      expect(dts).not.toMatch(/from '[^']*\.d\.ts'/);
    });

    it('should have a Svelte definitions entry', () => {
      const svelteDts = join(DIST_PATH, 'svelte', 'index.d.ts');
      expect(existsSync(svelteDts)).toBe(true);
    });
  });

  describe('Bundle Integrity', () => {
    it('should have a reasonable core bundle size', () => {
      const stats = statSync(DIST_ESM_PATH);
      expect(stats.size).toBeGreaterThan(50 * 1024); // > 50KB
      expect(stats.size).toBeLessThan(5 * 1024 * 1024); // < 5MB
    });

    it('should have a Svelte entry bundle', () => {
      expect(existsSync(DIST_SVELTE_PATH)).toBe(true);
      expect(statSync(DIST_SVELTE_PATH).size).toBeGreaterThan(0);
    });
  });

  describe('Functional API Validation', () => {
    const config = {
      apiBaseUrl: 'https://api.test.com',
      clientId: 'test-client',
      domain: 'test.com',
      enablePasskeys: true,
      enableMagicLinks: false,
      appCode: 'test-app'
    };

    it('should be able to create an auth store from the core bundle', async () => {
      const { createAuthStore } = await import(CORE);
      const authStore = createAuthStore(config);

      expect(authStore).toBeDefined();
      expect(authStore.api).toBeDefined();
      expect(typeof authStore.signInWithPasskey).toBe('function');
      expect(typeof authStore.checkUser).toBe('function');
      expect(typeof authStore.isAuthenticated).toBe('function');
      expect(authStore.core).toBeDefined();
      expect(authStore.ui).toBeDefined();
      expect(typeof authStore.destroy).toBe('function');
    });

    it('should be able to create an API client from the core bundle', async () => {
      const { AuthApiClient } = await import(CORE);
      const apiClient = new AuthApiClient(config);

      expect(apiClient).toBeDefined();
      expect(typeof apiClient.sendAppEmailCode).toBe('function');
      expect(typeof apiClient.verifyAppEmailCode).toBe('function');
      expect(typeof apiClient.checkEmail).toBe('function');
    });

    it('should export working WebAuthn utilities', async () => {
      const { isWebAuthnSupported, isPlatformAuthenticatorAvailable } = await import(CORE);
      expect(() => isWebAuthnSupported()).not.toThrow();
      expect(() => isPlatformAuthenticatorAvailable()).not.toThrow();
    });

    it('should export working session utilities', async () => {
      const { configureSessionStorage, getStorageConfig } = await import(CORE);
      expect(() => configureSessionStorage()).not.toThrow();
      expect(() => getStorageConfig()).not.toThrow();
    });
  });

  describe('Development Components Validation', () => {
    it('should export ErrorReportingStatus from ./svelte', async () => {
      const { ErrorReportingStatus } = await import(SVELTE);
      expect(ErrorReportingStatus).toBeDefined();
    });

    it('should NOT export Flow components from core (avoid @xyflow/svelte dependency)', async () => {
      const core = await import(CORE);
      expect(core.TestFlow).toBeUndefined();
      expect(core.SessionStateMachineFlow).toBeUndefined();
      expect(core.SignInStateMachineFlow).toBeUndefined();
    });
  });

  describe('/dev Export Validation', () => {
    const DEV_JS_PATH = join(ROOT_PATH, 'dist/svelte/dev.js');
    const DEV_TYPES_PATH = join(ROOT_PATH, 'dist/svelte/dev.d.ts');

    it('should have /dev export configured in package.json', () => {
      const dev = packageJson.exports['./dev'];
      expect(dev.types).toBe('./dist/svelte/dev.d.ts');
      expect(dev.svelte).toBe('./dist/svelte/dev.js');
      expect(dev.default).toBe('./dist/svelte/dev.js');
    });

    it('should have /dev export files on filesystem', () => {
      expect(existsSync(DEV_JS_PATH)).toBe(true);
      expect(existsSync(DEV_TYPES_PATH)).toBe(true);
    });

    it('should export Flow components from ./dev', async () => {
      const dev = await import('../../dist/svelte/dev.js');
      expect(dev.SessionStateMachineFlow).toBeDefined();
      expect(dev.SignInStateMachineFlow).toBeDefined();
      expect(dev.TestFlow).toBeDefined();
    }, 30000);

    it('should have correct TypeScript definitions for /dev export', () => {
      const devDts = readFileSync(DEV_TYPES_PATH, 'utf-8');
      expect(devDts).toContain('SessionStateMachineFlow');
      expect(devDts).toContain('SignInStateMachineFlow');
      expect(devDts).toContain('TestFlow');
    });
  });

  describe('Internationalization Exports', () => {
    it('should export the i18n message proxy and locale helpers from core', async () => {
      const { m, setI18nMessages, paraglideMessages, getLocale, setLocale } = await import(CORE);
      expect(m).toBeDefined();
      expect(typeof setI18nMessages).toBe('function');
      expect(paraglideMessages).toBeDefined();
      expect(typeof getLocale).toBe('function');
      expect(typeof setLocale).toBe('function');
    });

    it('should export createParaglideI18n from ./svelte', async () => {
      const { createParaglideI18n } = await import(SVELTE);
      expect(typeof createParaglideI18n).toBe('function');
    });
  });

  describe('Invitation and Token Utilities', () => {
    it('should export invitation processing utilities from core', async () => {
      const { processInvitationToken, extractRegistrationDataFromToken } = await import(CORE);
      expect(typeof processInvitationToken).toBe('function');
      expect(typeof extractRegistrationDataFromToken).toBe('function');
    });

    it('should export invitation token utilities from core', async () => {
      const { decodeInvitationToken, extractRegistrationData, validateInvitationToken } =
        await import(CORE);
      expect(typeof decodeInvitationToken).toBe('function');
      expect(typeof extractRegistrationData).toBe('function');
      expect(typeof validateInvitationToken).toBe('function');
    });
  });

  describe('Context and Auth Utilities', () => {
    it('should export auth context helpers from ./svelte', async () => {
      const { setupAuthContext, getAuthStoreFromContext } = await import(SVELTE);
      expect(typeof setupAuthContext).toBe('function');
      expect(typeof getAuthStoreFromContext).toBe('function');
    });

    it('should export context constants from core', async () => {
      const { CONTEXT_KEYS, AUTH_CONTEXT_KEY } = await import(CORE);
      expect(typeof CONTEXT_KEYS).toBe('object');
      expect(typeof AUTH_CONTEXT_KEY).toBe('string');
    });
  });
});
