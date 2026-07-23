/**
 * Test RESET event handling in auth store state machine
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuthStore } from '../../src/core/stores/index.js';
import type { AuthConfig } from '../../src/core/types/index.js';
import type { SvelteAuthStore } from '../../src/core/types/svelte.js';
import { makeSvelteCompatible } from '../../src/svelte/adapters/svelte.js';

// Mock WebAuthn utilities
vi.mock('../../src/core/utils/webauthn', () => ({
  isWebAuthnSupported: vi.fn(() => false),
  isPlatformAuthenticatorAvailable: vi.fn(() => Promise.resolve(false)),
  startConditionalAuthentication: vi.fn(() => Promise.resolve())
}));

// Mock telemetry
vi.mock('../../src/core/utils/telemetry', () => ({
  initializeTelemetry: vi.fn(),
  updateErrorReporterConfig: vi.fn(),
  reportAuthState: vi.fn(),
  reportWebAuthnError: vi.fn(),
  reportApiError: vi.fn(),
  flushErrorReports: vi.fn(),
  getErrorReportQueueSize: vi.fn(() => 0),
  // New telemetry convenience functions
  reportAuthEvent: vi.fn(),
  reportSessionEvent: vi.fn(),
  reportRefreshEvent: vi.fn()
}));

describe('Auth Store RESET Event Handling', () => {
  let authStore: SvelteAuthStore;
  let mockConfig: AuthConfig;
  let mockApiClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockApiClient = {
      registerUser: vi.fn(),
      signIn: vi.fn(),
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
      appCode: 'test',
      signInMode: 'login-only'
    };

    authStore = makeSvelteCompatible(createAuthStore(mockConfig, mockApiClient));
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
