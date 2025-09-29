/**
 * Test for Auth Store State Centralization
 *
 * Tests the new architecture where UI state is centralized in the auth store
 * and UI config methods are state-aware (no parameters needed).
 */

import { get } from 'svelte/store';
import { beforeEach, describe, expect, it } from 'vitest';
import { createAuthStore } from '../../src/stores';
import type { AuthConfig } from '../../src/types';

describe('Auth Store State Centralization', () => {
  let authStore: ReturnType<typeof createAuthStore>;
  let config: AuthConfig;

  beforeEach(() => {
    config = {
      apiBaseUrl: 'https://api.thepia.com',
      clientId: 'test-client',
      domain: 'thepia.com',
      enablePasskeys: true,
      enableMagicLinks: true,
      appCode: 'test'
    };
    authStore = makeSvelteCompatible(createAuthStore(config));
  });

  describe('UI State Management', () => {
    it('should have initial UI state in store', () => {
      const state = get(authStore);

      // Check that UI state properties exist
      expect(state).toHaveProperty('signInState');
      expect(state.signInState).toBe('emailEntry');

      // UI State properties
      expect(state).toHaveProperty('email');
      expect(state.email).toBe('');
      expect(state).toHaveProperty('loading');
      expect(state.loading).toBe(false);
      // emailCode is now component-level only, not in store
      expect(state).toHaveProperty('emailCodeSent');
      expect(state.emailCodeSent).toBe(false);
      expect(state).toHaveProperty('fullName');
      expect(state.fullName).toBe('');

      // User Discovery State properties
      expect(state).toHaveProperty('userExists');
      expect(state.userExists).toBe(null);
      expect(state).toHaveProperty('hasPasskeys');
      expect(state.hasPasskeys).toBe(false);
      expect(state).toHaveProperty('hasValidPin');
      expect(state.hasValidPin).toBe(false);
      expect(state).toHaveProperty('pinRemainingMinutes');
      expect(state.pinRemainingMinutes).toBe(0);

      // WebAuthn State properties
      expect(state).toHaveProperty('conditionalAuthActive');
      expect(state.conditionalAuthActive).toBe(false);
      expect(state).toHaveProperty('platformAuthenticatorAvailable');
      expect(state.platformAuthenticatorAvailable).toBe(false);
    });

    it('should provide setter methods for UI state (when implemented)', () => {
      // These methods should be added in the implementation:
      // expect(authStore).toHaveProperty('setEmail');
      // expect(authStore).toHaveProperty('setEmailCode');
      // expect(authStore).toHaveProperty('setFullName');
      // expect(authStore).toHaveProperty('setLoading');
      // Test setter functionality:
      // authStore.setEmail('test@example.com');
      // expect(get(authStore).email).toBe('test@example.com');
      // authStore.setLoading(true);
      // expect(get(authStore).loading).toBe(true);
      // authStore.setEmailCode('123456');
      // expect(get(authStore).emailCode).toBe('123456');
      // authStore.setFullName('Test User');
      // expect(get(authStore).fullName).toBe('Test User');
    });
  });

  describe('State-Aware UI Config Methods', () => {
    it('should have UI config methods that require no parameters', () => {
      // Check that methods exist
      expect(authStore).toHaveProperty('getButtonConfig');
      expect(authStore).toHaveProperty('getStateMessageConfig');
      expect(authStore).toHaveProperty('getExplainerConfig');

      // These should work without parameters:
      const buttonConfig = authStore.getButtonConfig();
      expect(buttonConfig).toBeDefined();
      expect(buttonConfig.primary).toBeDefined();

      const stateMessage = authStore.getStateMessageConfig();
      // May be null for initial state

      const explainer = authStore.getExplainerConfig();
      expect(explainer).toBeDefined();
    });

    it('should reflect pinEntry state correctly in button config', () => {
      // This test validates the specific issue mentioned in the conversation
      // where pinEntry state should show "Verify Code" and "Use different email" buttons

      // Set up pinEntry state: first transition to userChecked, then to pinEntry
      authStore.setEmail('test@example.com');
      // emailCode is now component-level only, not set in store

      // First transition to userChecked state
      authStore.sendSignInEvent({
        type: 'USER_CHECKED',
        email: 'test@example.com',
        exists: true,
        hasPasskey: false
      });

      // Then transition to pinEntry state
      authStore.sendSignInEvent({ type: 'SENT_PIN_EMAIL' });

      const state = get(authStore);
      expect(state.signInState).toBe('pinEntry');

      const buttonConfig = authStore.getButtonConfig();
      expect(buttonConfig.primary.textKey).toBe('code.verify');
      expect(buttonConfig.primary.loadingTextKey).toBe('code.verifying');
      expect(buttonConfig.secondary?.textKey).toBe('action.useDifferentEmail');
    });
  });

  describe('Event-Driven State Updates', () => {
    it('should update store state when processing SignInEvents (when implemented)', () => {
      // Test USER_CHECKED event with enhanced data:
      // const userCheckEvent = {
      //   type: 'USER_CHECKED' as const,
      //   email: 'test@example.com',
      //   exists: true,
      //   hasPasskey: false,
      //   hasValidPin: true,
      //   pinRemainingMinutes: 15
      // };
      // authStore.sendSignInEvent(userCheckEvent);
      // const state = get(authStore);
      // expect(state.email).toBe('test@example.com');
      // expect(state.userExists).toBe(true);
      // expect(state.hasPasskeys).toBe(false);
      // expect(state.hasValidPin).toBe(true);
      // expect(state.pinRemainingMinutes).toBe(15);
      // expect(state.signInState).toBe('userChecked');
    });

    it('should handle EMAIL_CODE_ENTERED event (when implemented)', () => {
      // const codeEnteredEvent = {
      //   type: 'EMAIL_CODE_ENTERED' as const,
      //   code: '654321'
      // };
      // authStore.sendSignInEvent(codeEnteredEvent);
      // const state = get(authStore);
      // expect(state.emailCode).toBe('654321');
    });

    it('should handle SENT_PIN_EMAIL event (when implemented)', () => {
      // authStore.sendSignInEvent({ type: 'SENT_PIN_EMAIL' });
      // const state = get(authStore);
      // expect(state.emailCodeSent).toBe(true);
      // expect(state.signInState).toBe('pinEntry');
    });
  });

  describe('Integration with Translation System', () => {
    it('should work correctly with utils/i18n.ts m proxy (when implemented)', () => {
      // This validates that the centralized button configs work with translations
      // Set up pinEntry state:
      // authStore.sendSignInEvent({ type: 'SENT_PIN_EMAIL' });
      // const buttonConfig = authStore.getButtonConfig();
      // Import translation system:
      // const { m } = await import('../../src/utils/i18n');
      // Verify translation keys work:
      // expect(m[buttonConfig.primary.textKey]()).toBe('Verify Code');
      // expect(m[buttonConfig.secondary?.textKey || '']()).toBe('Use a different email');
    });
  });
});
