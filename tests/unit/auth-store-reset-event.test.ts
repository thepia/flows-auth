/**
 * Test RESET event handling in auth store state machine
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createAuthStore } from '../../src/stores/auth-store';
import type { AuthConfig } from '../../src/types';

// Mock WebAuthn utilities
vi.mock('../../src/utils/webauthn', () => ({
  isWebAuthnSupported: vi.fn(() => false),
  isPlatformAuthenticatorAvailable: vi.fn(() => Promise.resolve(false)),
  startConditionalAuthentication: vi.fn(() => Promise.resolve()),
}));

// Mock error reporter
vi.mock('../../src/utils/errorReporter', () => ({
  reportError: vi.fn(),
}));

describe('Auth Store RESET Event Handling', () => {
  let authStore: ReturnType<typeof createAuthStore>;
  let mockConfig: AuthConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockConfig = {
      apiBaseUrl: 'https://api.test.com',
      clientId: 'test-client',
      domain: 'test.com',
      enablePasskeys: false,
      enableMagicPins: true,
      enableErrorReporting: false,
      appCode: 'test',
      signInMode: 'login-only'
    };

    authStore = createAuthStore(mockConfig);
  });

  it('should transition from userChecked to emailEntry on RESET', () => {
    // Get current state
    let currentState: any;
    const unsubscribe = authStore.subscribe(state => { currentState = state; });
    
    console.log('🧪 Initial state:', currentState.signInState);
    expect(currentState.signInState).toBe('emailEntry');

    // Send USER_CHECKED to get to userChecked state
    const stateAfterUserCheck = authStore.sendSignInEvent({ 
      type: 'USER_CHECKED', 
      email: 'test@example.com', 
      exists: false, 
      hasPasskey: false 
    });
    console.log('🧪 After USER_CHECKED:', stateAfterUserCheck);
    expect(stateAfterUserCheck).toBe('userChecked');
    expect(currentState.signInState).toBe('userChecked');

    // Now send RESET - this should go back to emailEntry
    console.log('🧪 Sending RESET event...');
    const stateAfterReset = authStore.sendSignInEvent({ type: 'RESET' });
    console.log('🧪 After RESET:', stateAfterReset);
    console.log('🧪 Store state after RESET:', currentState.signInState);
    
    // This is the critical test - RESET should return emailEntry
    expect(stateAfterReset).toBe('emailEntry');
    expect(currentState.signInState).toBe('emailEntry');
    
    unsubscribe();
  });

  it('should transition from pinEntry to emailEntry on RESET', () => {
    let currentState: any;
    const unsubscribe = authStore.subscribe(state => { currentState = state; });
    
    // Get to pinEntry state: emailEntry -> userChecked -> pinEntry
    authStore.sendSignInEvent({ 
      type: 'USER_CHECKED', 
      email: 'test@example.com', 
      exists: false, 
      hasPasskey: false 
    });
    expect(currentState.signInState).toBe('userChecked');

    const stateAfterPinSent = authStore.sendSignInEvent({ type: 'SENT_PIN_EMAIL' });
    console.log('🧪 After SENT_PIN_EMAIL:', stateAfterPinSent);
    expect(stateAfterPinSent).toBe('pinEntry');
    expect(currentState.signInState).toBe('pinEntry');

    // Now send RESET from pinEntry
    const stateAfterReset = authStore.sendSignInEvent({ type: 'RESET' });
    console.log('🧪 After RESET from pinEntry:', stateAfterReset);
    
    expect(stateAfterReset).toBe('emailEntry');
    expect(currentState.signInState).toBe('emailEntry');
    
    unsubscribe();
  });

  it('should stay in current state for unhandled events', () => {
    let currentState: any;
    const unsubscribe = authStore.subscribe(state => { currentState = state; });
    
    // Get to userChecked state
    authStore.sendSignInEvent({ 
      type: 'USER_CHECKED', 
      email: 'test@example.com', 
      exists: false, 
      hasPasskey: false 
    });
    expect(currentState.signInState).toBe('userChecked');

    // Send an invalid event
    const stateAfterInvalid = authStore.sendSignInEvent({ type: 'INVALID_EVENT' as any });
    console.log('🧪 After invalid event:', stateAfterInvalid);
    
    // Should stay in userChecked
    expect(stateAfterInvalid).toBe('userChecked');
    expect(currentState.signInState).toBe('userChecked');
    
    unsubscribe();
  });
});