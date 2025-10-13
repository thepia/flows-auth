/**
 * Test RESET event handling in auth store state machine
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuthStore } from '../../src/stores';
import type { AuthConfig } from '../../src/types';

// Mock WebAuthn utilities
vi.mock('../../src/utils/webauthn', () => ({
  isWebAuthnSupported: vi.fn(() => false),
  isPlatformAuthenticatorAvailable: vi.fn(() => Promise.resolve(false)),
  startConditionalAuthentication: vi.fn(() => Promise.resolve())
}));

// Mock telemetry
vi.mock('../../src/utils/telemetry', () => ({
  reportError: vi.fn(),
  initializeTelemetry: vi.fn()
}));

describe('Auth Store RESET Event Handling', () => {
  let authStore: ReturnType<typeof createAuthStore>;
  let mockConfig: AuthConfig;
  let mockApiClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

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

    mockConfig = {
      apiBaseUrl: 'https://api.test.com',
      clientId: 'test-client',
      domain: 'test.com',
      enablePasskeys: false,
      enableMagicLinks: false,
      appCode: 'test',
      signInMode: 'login-only'
    };

    authStore = createAuthStore(mockConfig, mockApiClient);
  });

  it('should transition from userChecked to emailEntry on RESET', () => {
    // Get initial state
    const initialState = authStore.getState();
    console.log('🧪 Initial state:', initialState.signInState);
    expect(initialState.signInState).toBe('emailEntry');

    // Send USER_CHECKED to get to userChecked state
    const stateAfterUserCheck = authStore.sendSignInEvent({
      type: 'USER_CHECKED',
      email: 'test@example.com',
      exists: false,
      hasPasskey: false
    });
    console.log('🧪 After USER_CHECKED:', stateAfterUserCheck);
    expect(stateAfterUserCheck).toBe('userChecked');
    expect(authStore.getState().signInState).toBe('userChecked');

    // Now send RESET - this should go back to emailEntry
    console.log('🧪 Sending RESET event...');
    const stateAfterReset = authStore.sendSignInEvent({ type: 'RESET' });
    console.log('🧪 After RESET:', stateAfterReset);
    console.log('🧪 Store state after RESET:', authStore.getState().signInState);

    // This is the critical test - RESET should return emailEntry
    expect(stateAfterReset).toBe('emailEntry');
    expect(authStore.getState().signInState).toBe('emailEntry');
  });

  it('should transition from pinEntry to emailEntry on RESET', () => {
    // Get to pinEntry state: emailEntry -> userChecked -> pinEntry
    authStore.sendSignInEvent({
      type: 'USER_CHECKED',
      email: 'test@example.com',
      exists: false,
      hasPasskey: false
    });
    expect(authStore.getState().signInState).toBe('userChecked');

    const stateAfterPinSent = authStore.sendSignInEvent({ type: 'SENT_PIN_EMAIL' });
    console.log('🧪 After SENT_PIN_EMAIL:', stateAfterPinSent);
    expect(stateAfterPinSent).toBe('pinEntry');
    expect(authStore.getState().signInState).toBe('pinEntry');

    // Now send RESET from pinEntry
    const stateAfterReset = authStore.sendSignInEvent({ type: 'RESET' });
    console.log('🧪 After RESET from pinEntry:', stateAfterReset);

    expect(stateAfterReset).toBe('emailEntry');
    expect(authStore.getState().signInState).toBe('emailEntry');
  });

  it('should stay in current state for unhandled events', () => {
    // Get to userChecked state
    authStore.sendSignInEvent({
      type: 'USER_CHECKED',
      email: 'test@example.com',
      exists: false,
      hasPasskey: false
    });
    expect(authStore.getState().signInState).toBe('userChecked');

    // Send an invalid event
    const stateAfterInvalid = authStore.sendSignInEvent({ type: 'INVALID_EVENT' as any });
    console.log('🧪 After invalid event:', stateAfterInvalid);

    // Should stay in userChecked
    expect(stateAfterInvalid).toBe('userChecked');
    expect(authStore.getState().signInState).toBe('userChecked');
  });
});
