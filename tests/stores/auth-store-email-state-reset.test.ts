import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuthStore } from '../../src/stores';
import type { AuthConfig } from '../../src/types';

describe('Auth Store Email State Reset', () => {
  let store: ReturnType<typeof createAuthStore>;
  let config: AuthConfig;
  let mockApiClient: any;

  beforeEach(() => {
    mockApiClient = {
      registerUser: vi.fn(),
      signIn: vi.fn(),
      signInWithMagicLink: vi.fn(),
      signInWithPasskey: vi.fn(),
      refresh_token: vi.fn(),
      signOut: vi.fn(),
      checkEmail: vi.fn(),
      sendAppEmailCode: vi.fn(),
      verifyAppEmailCode: vi.fn()
    };

    config = {
      apiBaseUrl: 'https://api.test.com',
      clientId: 'test-client',
      domain: 'test.com',
      appCode: 'demo',
      enablePasskeys: true,
      enableMagicLinks: false,
      signInMode: 'login-or-register',
      language: 'en'
    };
    store = createAuthStore(config, mockApiClient);
  });

  describe('Email Change State Reset', () => {
    it('should reset user discovery state when email changes', () => {
      // Set up initial state with email set first, then user discovered
      store.setEmail('test@example.com');
      store.sendSignInEvent({
        type: 'USER_CHECKED',
        email: 'test@example.com',
        exists: true,
        hasPasskey: true,
        hasValidPin: true,
        pinRemainingMinutes: 15
      });

      let state = store.getState();
      expect(state.email).toBe('test@example.com');
      expect(state.signInState).toBe('userChecked');
      expect(state.userExists).toBe(true);
      expect(state.hasPasskeys).toBe(true);
      expect(state.hasValidPin).toBe(true);
      expect(state.pinRemainingMinutes).toBe(15);

      // Change email - should reset user discovery state
      store.setEmail('different@example.com');

      state = store.getState();
      expect(state.email).toBe('different@example.com');
      expect(state.signInState).toBe('emailEntry'); // Reset from userChecked
      expect(state.userExists).toBe(null); // Reset
      expect(state.hasPasskeys).toBe(false); // Reset
      expect(state.hasValidPin).toBe(false); // Reset
      expect(state.pinRemainingMinutes).toBe(0); // Reset
    });

    it('should not reset state when setting same email', () => {
      // Set up initial state with email first
      store.setEmail('test@example.com');
      store.sendSignInEvent({
        type: 'USER_CHECKED',
        email: 'test@example.com',
        exists: true,
        hasPasskey: true,
        hasValidPin: true,
        pinRemainingMinutes: 15
      });

      let state = store.getState();
      expect(state.signInState).toBe('userChecked');
      expect(state.userExists).toBe(true);

      // Set same email - should not reset state
      store.setEmail('test@example.com');

      state = store.getState();
      expect(state.email).toBe('test@example.com');
      expect(state.signInState).toBe('userChecked'); // Should remain
      expect(state.userExists).toBe(true); // Should remain
      expect(state.hasPasskeys).toBe(true); // Should remain
      expect(state.hasValidPin).toBe(true); // Should remain
      expect(state.pinRemainingMinutes).toBe(15); // Should remain
    });

    it('should reset state when clearing email', () => {
      // Set up initial state with email first
      store.setEmail('test@example.com');
      store.sendSignInEvent({
        type: 'USER_CHECKED',
        email: 'test@example.com',
        exists: true,
        hasPasskey: false,
        hasValidPin: false
      });

      let state = store.getState();
      expect(state.signInState).toBe('userChecked');
      expect(state.userExists).toBe(true);

      // Clear email
      store.setEmail('');

      state = store.getState();
      expect(state.email).toBe('');
      expect(state.signInState).toBe('emailEntry'); // Reset from userChecked
      expect(state.userExists).toBe(null); // Reset
      expect(state.hasPasskeys).toBe(false); // Reset
      expect(state.hasValidPin).toBe(false); // Reset
      expect(state.pinRemainingMinutes).toBe(0); // Reset
    });

    it('should not reset state when in other states', () => {
      // Set up userChecked state first, then transition to pinEntry
      store.sendSignInEvent({
        type: 'USER_CHECKED',
        email: 'test@example.com',
        exists: true,
        hasPasskey: false
      });

      // Transition to pinEntry state
      store.sendSignInEvent({ type: 'SENT_PIN_EMAIL' });

      let state = store.getState();
      expect(state.signInState).toBe('pinEntry');

      // Change email - should reset user state but not change signInState from pinEntry
      store.setEmail('new@example.com');

      state = store.getState();
      expect(state.email).toBe('new@example.com');
      expect(state.signInState).toBe('pinEntry'); // Should remain pinEntry
      expect(state.userExists).toBe(null); // Should reset
      expect(state.hasPasskeys).toBe(false); // Should reset
      expect(state.hasValidPin).toBe(false); // Should reset
    });
  });

  describe('Button State After Email Change', () => {
    it('should maintain button disabled state based on signInState', () => {
      // Set up state where button would be disabled due to being in emailEntry
      store.setEmail('test@example.com');

      let buttonConfig = store.getButtonConfig();
      expect(buttonConfig.primary.disabled).toBe(true); // Disabled in emailEntry until user is checked

      // Simulate user check that finds user exists
      store.sendSignInEvent({
        type: 'USER_CHECKED',
        email: 'test@example.com',
        exists: true,
        hasPasskey: false
      });

      buttonConfig = store.getButtonConfig();
      // Button state depends on current signInState (userChecked may still be disabled)
      // The button logic has evolved - it may remain disabled until PIN is sent
      expect(buttonConfig.primary.disabled).toBe(true);

      // Change email - should reset state back to emailEntry and keep button disabled
      store.setEmail('new@example.com');

      buttonConfig = store.getButtonConfig();
      expect(buttonConfig.primary.disabled).toBe(true);
    });
  });
});
