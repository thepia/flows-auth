/**
 * Auth State Machine Unit Tests
 * Focused testing of state machine logic, transitions, guards, and actions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthStateMachine, AuthGuards, AuthActions } from '../../src/stores/auth-state-machine';
import { AuthApiClient } from '../../src/api/auth-api';
import type { AuthConfig, AuthMachineState, AuthMachineContext } from '../../src/types';

const mockConfig: AuthConfig = {
  apiBaseUrl: 'https://api.test.com',
  clientId: 'test-client',
  domain: 'test.com',
  enablePasskeys: true,
  enableMagicPins: true,
  branding: {
    companyName: 'Test Company',
    showPoweredBy: true
  }
};

describe('AuthStateMachine', () => {
  let stateMachine: AuthStateMachine;
  let mockApi: AuthApiClient;

  beforeEach(() => {
    mockApi = new AuthApiClient(mockConfig);
    stateMachine = new AuthStateMachine(mockApi, mockConfig);
  });

  describe('Initialization', () => {
    it('should start in checkingSession state', () => {
      expect(stateMachine.currentState).toBe('checkingSession');
    });

    it('should have initial context with default values', () => {
      const context = stateMachine.currentContext;
      
      expect(context.email).toBeNull();
      expect(context.user).toBeNull();
      expect(context.error).toBeNull();
      expect(context.sessionData).toBeNull();
      expect(context.challengeId).toBeNull();
      expect(context.retryCount).toBe(0);
      expect(typeof context.startTime).toBe('number');
    });

    it('should initialize with valid session when sessionStorage has valid session', () => {
      const mockSessionData = {
        user: {
          id: '123',
          email: 'test@example.com',
          name: 'Test User',
          initials: 'TU',
          avatar: undefined,
          preferences: {}
        },
        tokens: {
          accessToken: 'valid-token',
          refreshToken: 'refresh-token',
          expiresAt: Date.now() + 3600000 // 1 hour from now
        },
        authMethod: 'passkey' as const,
        lastActivity: Date.now()
      };

      sessionStorage.setItem('thepia_auth_session', JSON.stringify(mockSessionData));

      const newStateMachine = new AuthStateMachine(mockApi, mockConfig);
      newStateMachine.start();

      expect(newStateMachine.currentState).toBe('sessionValid');
    });

    it('should initialize with invalid session when no session exists', () => {
      sessionStorage.clear();
      localStorage.clear();

      const newStateMachine = new AuthStateMachine(mockApi, mockConfig);
      newStateMachine.start();

      expect(newStateMachine.currentState).toBe('sessionInvalid');
    });
  });

  describe('State Transitions', () => {
    it('should transition from checkingSession to sessionValid with valid session', () => {
      const sessionData = {
        accessToken: 'valid-token',
        user: {
          id: '123',
          email: 'test@example.com',
          name: 'Test User',
          emailVerified: true,
          createdAt: '2023-01-01T00:00:00Z'
        }
      };

      stateMachine.send({ type: 'VALID_SESSION', session: sessionData });
      
      expect(stateMachine.currentState).toBe('sessionValid');
      expect(stateMachine.currentContext.sessionData).toEqual(sessionData);
    });

    it('should transition from checkingSession to sessionInvalid with invalid session', () => {
      stateMachine.send({ type: 'INVALID_SESSION' });
      
      expect(stateMachine.currentState).toBe('sessionInvalid');
    });

    it('should transition from sessionInvalid to combinedAuth when user clicks next', () => {
      stateMachine.send({ type: 'INVALID_SESSION' });
      stateMachine.send({ type: 'USER_CLICKS_NEXT' });
      
      expect(stateMachine.currentState).toBe('combinedAuth');
    });

    it('should transition from combinedAuth to conditionalMediation when valid email typed', () => {
      stateMachine.send({ type: 'INVALID_SESSION' });
      stateMachine.send({ type: 'USER_CLICKS_NEXT' });
      stateMachine.send({ type: 'EMAIL_TYPED', email: 'test@example.com' });
      
      expect(stateMachine.currentState).toBe('conditionalMediation');
      expect(stateMachine.currentContext.email).toBe('test@example.com');
    });

    it('should transition from combinedAuth to explicitAuth when continue clicked', () => {
      stateMachine.send({ type: 'INVALID_SESSION' });
      stateMachine.send({ type: 'USER_CLICKS_NEXT' });
      stateMachine.send({ type: 'CONTINUE_CLICKED' });
      
      expect(stateMachine.currentState).toBe('explicitAuth');
    });

    it('should transition from conditionalMediation to biometricPrompt when passkey selected', () => {
      stateMachine.send({ type: 'INVALID_SESSION' });
      stateMachine.send({ type: 'USER_CLICKS_NEXT' });
      stateMachine.send({ type: 'EMAIL_TYPED', email: 'test@example.com' });
      stateMachine.send({ type: 'PASSKEY_SELECTED', credential: {} });
      
      expect(stateMachine.currentState).toBe('biometricPrompt');
    });

    it('should transition through complete successful authentication flow', async () => {
      const transitions: AuthMachineState[] = [];
      
      stateMachine.onTransition((state) => {
        transitions.push(state);
      });

      // Complete flow
      stateMachine.send({ type: 'INVALID_SESSION' });
      stateMachine.send({ type: 'USER_CLICKS_NEXT' });
      stateMachine.send({ type: 'EMAIL_TYPED', email: 'test@example.com' });
      stateMachine.send({ type: 'PASSKEY_SELECTED', credential: {} });
      stateMachine.send({ type: 'WEBAUTHN_SUCCESS', response: {} });
      stateMachine.send({ type: 'TOKEN_EXCHANGE_SUCCESS', tokens: {} });

      // Wait for automatic transitions to complete with longer timeout
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Filter out checkingSession initial state and duplicates
      const filteredTransitions = transitions.filter((state, index) => {
        return state !== 'checkingSession' && transitions.indexOf(state) === index;
      });

      // Check for minimum required transitions, allowing for timing variations
      expect(filteredTransitions).toEqual(
        expect.arrayContaining([
          'sessionInvalid',
          'combinedAuth',
          'conditionalMediation',
          'biometricPrompt',
          'auth0WebAuthnVerify',
          'sessionCreated',
          'loadingApp',
        ])
      );

      // Verify we have at least the core states
      expect(filteredTransitions.length).toBeGreaterThanOrEqual(7);
    });
  });

  describe('Error Handling States', () => {
    it('should transition to error state on WebAuthn error', () => {
      // Get to biometric prompt
      stateMachine.send({ type: 'INVALID_SESSION' });
      stateMachine.send({ type: 'USER_CLICKS_NEXT' });
      stateMachine.send({ type: 'EMAIL_TYPED', email: 'test@example.com' });
      stateMachine.send({ type: 'PASSKEY_SELECTED', credential: {} });
      
      // Trigger error (1000ms = user cancellation)
      const error = { name: 'NotAllowedError', message: 'WebAuthn failed' };
      stateMachine.send({ type: 'WEBAUTHN_ERROR', error: error as any, timing: 1000 });
      
      expect(stateMachine.currentState).toBe('userCancellation');
    });

    it('should classify quick errors as credential not found', () => {
      // Get to error handling
      stateMachine.send({ type: 'INVALID_SESSION' });
      stateMachine.send({ type: 'USER_CLICKS_NEXT' });
      stateMachine.send({ type: 'EMAIL_TYPED', email: 'test@example.com' });
      stateMachine.send({ type: 'PASSKEY_SELECTED', credential: {} });
      
      const error = { message: 'not found' };
      stateMachine.send({ type: 'WEBAUTHN_ERROR', error: error as any, timing: 100 });
      
      expect(stateMachine.currentState).toBe('credentialNotFound');
    });

    it('should classify medium timing errors as user cancellation', () => {
      // Get to error handling
      stateMachine.send({ type: 'INVALID_SESSION' });
      stateMachine.send({ type: 'USER_CLICKS_NEXT' });
      stateMachine.send({ type: 'EMAIL_TYPED', email: 'test@example.com' });
      stateMachine.send({ type: 'PASSKEY_SELECTED', credential: {} });
      
      const error = { name: 'NotAllowedError', message: 'cancelled' };
      stateMachine.send({ type: 'WEBAUTHN_ERROR', error: error as any, timing: 5000 });
      
      expect(stateMachine.currentState).toBe('userCancellation');
    });

    it('should classify long timing errors as credential mismatch', () => {
      // Get to error handling
      stateMachine.send({ type: 'INVALID_SESSION' });
      stateMachine.send({ type: 'USER_CLICKS_NEXT' });
      stateMachine.send({ type: 'EMAIL_TYPED', email: 'test@example.com' });
      stateMachine.send({ type: 'PASSKEY_SELECTED', credential: {} });
      
      const error = { message: 'timeout' };
      stateMachine.send({ type: 'WEBAUTHN_ERROR', error: error as any, timing: 35000 });
      
      expect(stateMachine.currentState).toBe('credentialMismatch');
    });

    it('should allow reset from error states', () => {
      // Get to error state
      stateMachine.send({ type: 'INVALID_SESSION' });
      stateMachine.send({ type: 'USER_CLICKS_NEXT' });
      stateMachine.send({ type: 'EMAIL_TYPED', email: 'test@example.com' });
      stateMachine.send({ type: 'PASSKEY_SELECTED', credential: {} });
      stateMachine.send({ type: 'WEBAUTHN_ERROR', error: {} as any, timing: 100 });
      
      expect(stateMachine.currentState).toBe('credentialNotFound');
      
      stateMachine.send({ type: 'RESET_TO_COMBINED_AUTH' });
      
      expect(stateMachine.currentState).toBe('combinedAuth');
    });
  });

  describe('State Matching', () => {
    it('should correctly match current state', () => {
      expect(stateMachine.matches('checkingSession')).toBe(true);
      expect(stateMachine.matches('combinedAuth')).toBe(false);
      
      stateMachine.send({ type: 'INVALID_SESSION' });
      stateMachine.send({ type: 'USER_CLICKS_NEXT' });
      
      expect(stateMachine.matches('combinedAuth')).toBe(true);
      expect(stateMachine.matches('checkingSession')).toBe(false);
    });
  });

  describe('Event Subscription', () => {
    it('should notify listeners on state transitions', () => {
      const transitions: { state: AuthMachineState; context: AuthMachineContext }[] = [];
      
      const unsubscribe = stateMachine.onTransition((state, context) => {
        if (state !== 'checkingSession') { // Ignore initial state
          transitions.push({ state, context });
        }
      });

      stateMachine.send({ type: 'INVALID_SESSION' });
      stateMachine.send({ type: 'USER_CLICKS_NEXT' });

      expect(transitions.length).toBeGreaterThanOrEqual(2);
      expect(transitions[0].state).toBe('sessionInvalid');
      expect(transitions[1].state).toBe('combinedAuth');

      unsubscribe();
      
      const lengthAfterUnsubscribe = transitions.length;
      
      stateMachine.send({ type: 'EMAIL_TYPED', email: 'test@example.com' });
      
      // Should not receive more events after unsubscribe
      expect(transitions.length).toBe(lengthAfterUnsubscribe);
    });

    it('should support multiple listeners', () => {
      const listener1Events: AuthMachineState[] = [];
      const listener2Events: AuthMachineState[] = [];
      
      stateMachine.onTransition((state) => {
        if (state !== 'checkingSession') listener1Events.push(state);
      });
      stateMachine.onTransition((state) => {
        if (state !== 'checkingSession') listener2Events.push(state);
      });

      stateMachine.send({ type: 'INVALID_SESSION' });

      expect(listener1Events).toEqual(['sessionInvalid']);
      expect(listener2Events).toEqual(['sessionInvalid']);
    });
  });
});

describe('AuthGuards', () => {
  let guards: AuthGuards;
  let mockApi: AuthApiClient;

  beforeEach(() => {
    mockApi = new AuthApiClient(mockConfig);
    guards = new AuthGuards(mockApi, mockConfig);
  });

  describe('Session Validation', () => {
    it('should validate session with valid token and user', () => {
      const context: AuthMachineContext = {
        email: 'test@example.com',
        user: {
          id: '123',
          email: 'test@example.com',
          name: 'Test User',
          emailVerified: true,
          createdAt: '2023-01-01T00:00:00Z'
        },
        error: null,
        startTime: Date.now(),
        retryCount: 0,
        sessionData: {
          accessToken: 'valid-token',
          user: {
            id: '123',
            email: 'test@example.com',
            name: 'Test User',
            emailVerified: true,
            createdAt: '2023-01-01T00:00:00Z'
          }
        },
        challengeId: null
      };

      expect(guards.hasValidSession(context)).toBe(true);
    });

    it('should invalidate session without session data', () => {
      const context: AuthMachineContext = {
        email: 'test@example.com',
        user: null,
        error: null,
        startTime: Date.now(),
        retryCount: 0,
        sessionData: null,
        challengeId: null
      };

      expect(guards.hasValidSession(context)).toBe(false);
    });

    it('should invalidate session without access token', () => {
      const context: AuthMachineContext = {
        email: 'test@example.com',
        user: null,
        error: null,
        startTime: Date.now(),
        retryCount: 0,
        sessionData: {
          accessToken: '',
          user: {
            id: '123',
            email: 'test@example.com',
            name: 'Test User',
            emailVerified: true,
            createdAt: '2023-01-01T00:00:00Z'
          }
        },
        challengeId: null
      };

      expect(guards.hasValidSession(context)).toBe(false);
    });
  });

  describe('Email Validation', () => {
    it('should validate correct email formats', () => {
      expect(guards.isValidEmail('test@example.com')).toBe(true);
      expect(guards.isValidEmail('user.name+tag@domain.co.uk')).toBe(true);
      expect(guards.isValidEmail('simple@test.org')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(guards.isValidEmail('not-an-email')).toBe(false);
      expect(guards.isValidEmail('missing@domain')).toBe(false);
      expect(guards.isValidEmail('@missing-user.com')).toBe(false);
      expect(guards.isValidEmail('spaces @domain.com')).toBe(false);
      expect(guards.isValidEmail('')).toBe(false);
    });
  });

  describe('WebAuthn Support Detection', () => {
    it('should detect WebAuthn support when enabled and available', () => {
      // Mock WebAuthn availability
      Object.defineProperty(global, 'PublicKeyCredential', {
        value: class MockPublicKeyCredential {},
        writable: true,
        configurable: true
      });

      expect(guards.isWebAuthnSupported()).toBe(true);
    });

    it('should return false when passkeys disabled in config', () => {
      const disabledConfig = { ...mockConfig, enablePasskeys: false };
      const disabledGuards = new AuthGuards(mockApi, disabledConfig);

      expect(disabledGuards.isWebAuthnSupported()).toBe(false);
    });
  });

  describe('Error Classification', () => {
    it('should classify quick errors as credential not found', () => {
      const error = { message: 'credential not found' };
      const classification = guards.classifyWebAuthnError(error, 300);
      
      expect(classification).toBe('credential-not-found');
    });

    it('should classify cancellation errors correctly', () => {
      const error = { name: 'NotAllowedError', message: 'cancelled by user' };
      const classification = guards.classifyWebAuthnError(error, 5000);
      
      expect(classification).toBe('user-cancellation');
    });

    it('should classify timeout errors correctly', () => {
      const error = { message: 'operation timed out' };
      const classification = guards.classifyWebAuthnError(error, 35000);
      
      expect(classification).toBe('credential-mismatch');
    });

    it('should handle edge case timing', () => {
      const error = { message: 'generic error' };
      
      expect(guards.classifyWebAuthnError(error, 499)).toBe('credential-not-found');
      expect(guards.classifyWebAuthnError(error, 500)).toBe('user-cancellation');
      expect(guards.classifyWebAuthnError(error, 29999)).toBe('user-cancellation');
      expect(guards.classifyWebAuthnError(error, 30000)).toBe('credential-mismatch');
      expect(guards.classifyWebAuthnError(error, 35000)).toBe('credential-mismatch');
    });
  });
});

describe('AuthActions', () => {
  let actions: AuthActions;
  let mockApi: AuthApiClient;
  let mockUpdateContext: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockApi = new AuthApiClient(mockConfig);
    mockUpdateContext = vi.fn();
    actions = new AuthActions(mockApi, mockConfig, mockUpdateContext);
  });

  describe('Context Updates', () => {
    it('should update email in context', () => {
      actions.setEmail('test@example.com');
      
      expect(mockUpdateContext).toHaveBeenCalledWith({ email: 'test@example.com' });
    });

    it('should clear session data', () => {
      actions.clearSession();
      
      expect(mockUpdateContext).toHaveBeenCalledWith({
        sessionData: null,
        user: null,
        error: null
      });
    });

    it('should load user session', () => {
      const sessionData = {
        accessToken: 'token',
        user: {
          id: '123',
          email: 'test@example.com',
          name: 'Test User',
          emailVerified: true,
          createdAt: '2023-01-01T00:00:00Z'
        }
      };

      actions.loadUserSession(sessionData);
      
      expect(mockUpdateContext).toHaveBeenCalledWith({
        sessionData,
        user: sessionData.user
      });
    });

    it('should set error in context', () => {
      const error = {
        code: 'test_error',
        message: 'Test error message'
      };

      actions.setError(error);
      
      expect(mockUpdateContext).toHaveBeenCalledWith({ error });
    });
  });

  describe('WebAuthn Operations', () => {
    it('should handle biometric prompt preparation', async () => {
      // Mock API response
      vi.spyOn(mockApi, 'getPasskeyChallenge').mockResolvedValue({
        challenge: 'test-challenge',
        rpId: 'test.com',
        allowCredentials: [],
        timeout: 60000
      });

      // Mock WebAuthn
      vi.spyOn(navigator.credentials, 'get').mockResolvedValue({
        id: 'credential-id',
        rawId: new ArrayBuffer(16),
        response: {},
        type: 'public-key'
      } as any);

      await actions.handleBiometricPrompt('test@example.com');

      expect(mockApi.getPasskeyChallenge).toHaveBeenCalledWith('test@example.com');
      expect(navigator.credentials.get).toHaveBeenCalled();
    });

    it('should handle biometric prompt errors', async () => {
      vi.spyOn(mockApi, 'getPasskeyChallenge').mockRejectedValue(new Error('Challenge failed'));

      await actions.handleBiometricPrompt('test@example.com');

      // Should handle error gracefully (no throw)
      expect(mockApi.getPasskeyChallenge).toHaveBeenCalled();
    });
  });

  describe('Error Reporting', () => {
    it('should report state changes when error reporting enabled', () => {
      const configWithReporting = {
        ...mockConfig,
        errorReporting: { enabled: true }
      };

      const reportingActions = new AuthActions(mockApi, configWithReporting, mockUpdateContext);
      
      // This would normally call reportAuthState, but we're not mocking it
      // Just verify it doesn't throw
      reportingActions.setEmail('test@example.com');
      
      expect(mockUpdateContext).toHaveBeenCalled();
    });

    it('should skip reporting when error reporting disabled', () => {
      const configWithoutReporting = {
        ...mockConfig,
        errorReporting: { enabled: false }
      };

      const nonReportingActions = new AuthActions(mockApi, configWithoutReporting, mockUpdateContext);
      
      nonReportingActions.setEmail('test@example.com');
      
      expect(mockUpdateContext).toHaveBeenCalled();
    });
  });
});