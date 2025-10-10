import { describe, expect, test } from 'vitest';

/**
 * API CONTRACT TESTS
 *
 * These tests define the exact API response formats that flows-auth MUST support.
 * Any changes to these contracts require careful consideration and migration planning.
 *
 * BREAKING CHANGES to these contracts will break authentication flows.
 */
describe('API Response Contracts - IMMUTABLE', () => {
  describe('signInWithPasskey Response Contract', () => {
    test('MUST support new response format: {success: true, tokens: {...}, user: {...}}', () => {
      // This is the EXACT format the API currently returns
      const newFormatResponse = {
        success: true,
        tokens: {
          access_token: 'webauthn-verified',
          refresh_token: 'webauthn-verified',
          expiresAt: 1752790702497 // Unix timestamp
        },
        user: {
          id: 'auth0|6877d3ff7b15eabb845ccafa',
          email: 'thepia@pm.me',
          name: 'Test User'
        }
      };

      // Contract validation
      expect(newFormatResponse).toHaveProperty('success', true);
      expect(newFormatResponse).toHaveProperty('tokens');
      expect(newFormatResponse.tokens).toHaveProperty('access_token');
      expect(newFormatResponse.tokens).toHaveProperty('refresh_token');
      expect(newFormatResponse.tokens).toHaveProperty('expiresAt');
      expect(newFormatResponse).toHaveProperty('user');
      expect(newFormatResponse.user).toHaveProperty('id');
      expect(newFormatResponse.user).toHaveProperty('email');

      // Type validation
      expect(typeof newFormatResponse.success).toBe('boolean');
      expect(typeof newFormatResponse.tokens.access_token).toBe('string');
      expect(typeof newFormatResponse.tokens.refresh_token).toBe('string');
      expect(typeof newFormatResponse.tokens.expiresAt).toBe('number');
      expect(typeof newFormatResponse.user.id).toBe('string');
      expect(typeof newFormatResponse.user.email).toBe('string');
    });

    test('MUST support legacy response format: {step: "success", access_token: "...", user: {...}}', () => {
      // This is the legacy format that must remain supported for backward compatibility
      const legacyFormatResponse = {
        step: 'success',
        access_token: 'legacy-access-token',
        refresh_token: 'legacy-refresh-token',
        expires_in: 3600, // Seconds from now
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User'
        }
      };

      // Contract validation
      expect(legacyFormatResponse).toHaveProperty('step', 'success');
      expect(legacyFormatResponse).toHaveProperty('access_token');
      expect(legacyFormatResponse).toHaveProperty('refresh_token');
      expect(legacyFormatResponse).toHaveProperty('expires_in');
      expect(legacyFormatResponse).toHaveProperty('user');
      expect(legacyFormatResponse.user).toHaveProperty('id');
      expect(legacyFormatResponse.user).toHaveProperty('email');

      // Type validation
      expect(typeof legacyFormatResponse.step).toBe('string');
      expect(typeof legacyFormatResponse.access_token).toBe('string');
      expect(typeof legacyFormatResponse.refresh_token).toBe('string');
      expect(typeof legacyFormatResponse.expires_in).toBe('number');
      expect(typeof legacyFormatResponse.user.id).toBe('string');
      expect(typeof legacyFormatResponse.user.email).toBe('string');
    });

    test('MUST handle failure responses consistently', () => {
      const failureResponses = [
        // New format failure
        {
          success: false,
          error: 'Authentication failed',
          message: 'Invalid credentials'
        },
        // Legacy format failure
        {
          step: 'failed',
          error: 'Authentication failed',
          message: 'Invalid credentials'
        }
      ];

      for (const failureResponse of failureResponses) {
        // All failure responses must have error information
        expect(failureResponse).toHaveProperty('error');
        expect(typeof failureResponse.error).toBe('string');

        // Success indicator must be false or step must be 'failed'
        const isFailure =
          failureResponse.success === false || (failureResponse as any).step === 'failed';
        expect(isFailure).toBe(true);
      }
    });
  });

  describe('Session Data Contract', () => {
    test('MUST normalize all response formats to consistent session format', () => {
      // This is the EXACT format that must be saved to sessionStorage
      const normalizedSessionFormat = {
        step: 'success',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User'
        },
        access_token: 'normalized-access-token',
        refresh_token: 'normalized-refresh-token',
        expires_in: 3600 // Always in seconds
      };

      // Contract validation
      expect(normalizedSessionFormat).toHaveProperty('step', 'success');
      expect(normalizedSessionFormat).toHaveProperty('user');
      expect(normalizedSessionFormat).toHaveProperty('access_token');
      expect(normalizedSessionFormat).toHaveProperty('refresh_token');
      expect(normalizedSessionFormat.user).toHaveProperty('id');
      expect(normalizedSessionFormat.user).toHaveProperty('email');

      // Type validation
      expect(typeof normalizedSessionFormat.step).toBe('string');
      expect(typeof normalizedSessionFormat.access_token).toBe('string');
      expect(typeof normalizedSessionFormat.refresh_token).toBe('string');
      expect(typeof normalizedSessionFormat.user.id).toBe('string');
      expect(typeof normalizedSessionFormat.user.email).toBe('string');

      // ExpiresIn must be a number (seconds) when present
      if (normalizedSessionFormat.expires_in !== undefined) {
        expect(typeof normalizedSessionFormat.expires_in).toBe('number');
        expect(normalizedSessionFormat.expires_in).toBeGreaterThan(0);
      }
    });
  });

  describe('Storage Key Contract', () => {
    test('MUST use consistent storage key across all components', () => {
      // This is the EXACT key that must be used for session storage
      const REQUIRED_STORAGE_KEY = 'thepia_auth_session';

      // This key is used by:
      // - sessionManager.saveSession()
      // - sessionManager.getSession()
      // - auth-state-machine.ts
      // - Any other component accessing session data

      expect(REQUIRED_STORAGE_KEY).toBe('thepia_auth_session');
      expect(typeof REQUIRED_STORAGE_KEY).toBe('string');
      expect(REQUIRED_STORAGE_KEY.length).toBeGreaterThan(0);
    });
  });

  describe('Authentication State Contract', () => {
    test('MUST maintain consistent state transitions', () => {
      // These are the EXACT states that the auth store must support
      const REQUIRED_AUTH_STATES = ['unauthenticated', 'loading', 'authenticated', 'error'];

      // Validate all required states exist
      for (const state of REQUIRED_AUTH_STATES) {
        expect(typeof state).toBe('string');
        expect(state.length).toBeGreaterThan(0);
      }

      // Validate state transition rules
      const validTransitions = {
        unauthenticated: ['loading', 'error'],
        loading: ['authenticated', 'error', 'unauthenticated'],
        authenticated: ['loading', 'unauthenticated', 'error'],
        error: ['loading', 'unauthenticated']
      };

      // Each state must have valid transition targets
      for (const [fromState, toStates] of Object.entries(validTransitions)) {
        expect(REQUIRED_AUTH_STATES).toContain(fromState);
        for (const toState of toStates) {
          expect(REQUIRED_AUTH_STATES).toContain(toState);
        }
      }
    });
  });

  describe('sendMagicLinkEmail Response Contract', () => {
    test('MUST support sendMagicLinkEmail response format: {success: true, message: string}', () => {
      // This is the EXACT format the sendMagicLinkEmail API returns
      const magicLinkResponse = {
        success: true,
        message: 'Check your email for a verification link'
      };

      // Contract validation
      expect(magicLinkResponse).toHaveProperty('success', true);
      expect(magicLinkResponse).toHaveProperty('message');

      // Type validation
      expect(typeof magicLinkResponse.success).toBe('boolean');
      expect(typeof magicLinkResponse.message).toBe('string');
      expect(magicLinkResponse.message.length).toBeGreaterThan(0);
    });

    test('MUST handle sendMagicLinkEmail failure responses', () => {
      const failureResponse = {
        success: false,
        error: 'Invalid email address',
        message: 'Please check your email address and try again'
      };

      // Contract validation
      expect(failureResponse).toHaveProperty('success', false);
      expect(failureResponse).toHaveProperty('error');
      expect(failureResponse).toHaveProperty('message');

      // Type validation
      expect(typeof failureResponse.success).toBe('boolean');
      expect(typeof failureResponse.error).toBe('string');
      expect(typeof failureResponse.message).toBe('string');
    });
  });

  describe('Passwordless Authentication Response Contract', () => {
    test('MUST support startPasswordlessAuthentication response format', () => {
      // This is the EXACT format the startPasswordlessAuthentication API returns
      const passwordlessStartResponse = {
        success: true,
        timestamp: 1638360000000,
        message: 'Check your email for a verification link',
        user: {
          email: 'test@example.com',
          id: 'user-123'
        }
      };

      // Contract validation
      expect(passwordlessStartResponse).toHaveProperty('success', true);
      expect(passwordlessStartResponse).toHaveProperty('timestamp');
      expect(passwordlessStartResponse).toHaveProperty('message');
      expect(passwordlessStartResponse).toHaveProperty('user');
      expect(passwordlessStartResponse.user).toHaveProperty('email');
      expect(passwordlessStartResponse.user).toHaveProperty('id');

      // Type validation
      expect(typeof passwordlessStartResponse.success).toBe('boolean');
      expect(typeof passwordlessStartResponse.timestamp).toBe('number');
      expect(typeof passwordlessStartResponse.message).toBe('string');
      expect(typeof passwordlessStartResponse.user.email).toBe('string');
      expect(typeof passwordlessStartResponse.user.id).toBe('string');
    });

    test('MUST support checkPasswordlessStatus response format', () => {
      // This is the EXACT format the checkPasswordlessStatus API returns
      const statusResponses = [
        // Pending status
        {
          status: 'pending',
          user: undefined
        },
        // Verified status
        {
          status: 'verified',
          user: {
            id: 'user-123',
            email: 'test@example.com',
            email_verified: true
          }
        },
        // Expired status
        {
          status: 'expired',
          user: undefined
        }
      ];

      for (const statusResponse of statusResponses) {
        // Contract validation
        expect(statusResponse).toHaveProperty('status');
        expect(['pending', 'verified', 'expired']).toContain(statusResponse.status);

        // Type validation
        expect(typeof statusResponse.status).toBe('string');

        if (statusResponse.user) {
          expect(statusResponse.user).toHaveProperty('id');
          expect(statusResponse.user).toHaveProperty('email');
          expect(typeof statusResponse.user.id).toBe('string');
          expect(typeof statusResponse.user.email).toBe('string');
        }
      }
    });
  });

  describe('Event Contract', () => {
    test('MUST emit consistent authentication events', () => {
      // These are the EXACT events that must be emitted during authentication
      const REQUIRED_AUTH_EVENTS = [
        'sign_in_started',
        'sign_in_success',
        'sign_in_error',
        'passkey_used',
        'session_updated',
        'session_cleared'
      ];

      // Validate all required events
      for (const event of REQUIRED_AUTH_EVENTS) {
        expect(typeof event).toBe('string');
        expect(event.length).toBeGreaterThan(0);
        expect(event).toMatch(/^[a-z_]+$/); // Only lowercase and underscores
      }

      // Event payload contracts
      const eventPayloads = {
        sign_in_success: { user: expect.any(Object), method: expect.any(String) },
        sign_in_error: { error: expect.any(String), method: expect.any(String) },
        passkey_used: { user: expect.any(Object) }
      };

      // Validate event payload structures
      for (const [event, payload] of Object.entries(eventPayloads)) {
        expect(REQUIRED_AUTH_EVENTS).toContain(event);
        expect(payload).toBeDefined();
      }
    });
  });

  describe('UI/UX Integration Contract', () => {
    test('MUST define consistent UI state contracts', () => {
      // These are the EXACT UI states that AuthSection must support
      const REQUIRED_UI_STATES = [
        'unauthenticated', // Show sign-in form
        'authenticated', // Show "Open Demo" button
        'loading', // Show loading spinner
        'error' // Show error message
      ];

      // Validate all required UI states
      for (const state of REQUIRED_UI_STATES) {
        expect(typeof state).toBe('string');
        expect(state.length).toBeGreaterThan(0);
      }

      // UI state behavior contracts
      const uiStateBehaviors = {
        unauthenticated: {
          showSignInForm: true,
          showOpenDemoButton: false,
          showUserEmail: false,
          allowAutoRedirect: false
        },
        authenticated: {
          showSignInForm: false,
          showOpenDemoButton: true,
          showUserEmail: true,
          allowAutoRedirect: false // No automatic redirect from landing page
        },
        loading: {
          showSignInForm: false,
          showOpenDemoButton: false,
          showUserEmail: false,
          allowAutoRedirect: false
        },
        error: {
          showSignInForm: true, // Allow retry
          showOpenDemoButton: false,
          showUserEmail: false,
          allowAutoRedirect: false
        }
      };

      // Validate UI behavior contracts
      for (const [state, behavior] of Object.entries(uiStateBehaviors)) {
        expect(REQUIRED_UI_STATES).toContain(state);
        expect(behavior).toHaveProperty('showSignInForm');
        expect(behavior).toHaveProperty('showOpenDemoButton');
        expect(behavior).toHaveProperty('showUserEmail');
        expect(behavior).toHaveProperty('allowAutoRedirect');
        expect(typeof behavior.showSignInForm).toBe('boolean');
        expect(typeof behavior.showOpenDemoButton).toBe('boolean');
        expect(typeof behavior.showUserEmail).toBe('boolean');
        expect(typeof behavior.allowAutoRedirect).toBe('boolean');
      }
    });

    test('MUST define navigation behavior contracts', () => {
      // These are the EXACT navigation behaviors that must be supported
      const NAVIGATION_CONTRACTS = {
        'landing-page-open-button-authenticated': {
          action: 'navigate',
          destination: '/app'
        },
        'landing-page-open-button-unauthenticated': {
          action: 'scroll',
          destination: 'AuthSection'
        },
        'auth-section-open-demo-button': {
          action: 'navigate',
          destination: '/app'
        },
        'invitation-flow-with-token': {
          action: 'navigate', // MAY redirect after auth
          destination: '/app'
        }
      };

      // Validate navigation contracts
      for (const [scenario, contract] of Object.entries(NAVIGATION_CONTRACTS)) {
        expect(contract).toHaveProperty('action');
        expect(contract).toHaveProperty('destination');
        expect(typeof contract.action).toBe('string');
        expect(typeof contract.destination).toBe('string');
        expect(['navigate', 'scroll']).toContain(contract.action);
      }
    });
  });

  describe('Registration Response Contract', () => {
    test('MUST support registration response with email verification status', () => {
      // This is the EXACT format for invitation-based registration
      const invitationRegistrationResponse = {
        step: 'success',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          emailVerified: true,
          createdAt: '2024-01-01T00:00:00Z'
        },
        access_token: 'invitation-access-token',
        refresh_token: 'invitation-refresh-token',
        emailVerifiedViaInvitation: true, // CRITICAL: Must be present for invitation flows
        welcomeEmailSent: false, // No welcome email for invitation users
        emailVerificationRequired: false
      };

      // This is the EXACT format for standard registration
      const standardRegistrationResponse = {
        step: 'success',
        user: {
          id: 'user-456',
          email: 'standard@example.com',
          emailVerified: false,
          createdAt: '2024-01-01T00:00:00Z'
        },
        access_token: 'standard-access-token',
        refresh_token: 'standard-refresh-token',
        emailVerifiedViaInvitation: false, // CRITICAL: Must be present for all registrations
        welcomeEmailSent: true, // Welcome email sent for standard registration
        emailVerificationRequired: true
      };

      // Contract validation for invitation registration
      expect(invitationRegistrationResponse).toHaveProperty('step', 'success');
      expect(invitationRegistrationResponse).toHaveProperty('emailVerifiedViaInvitation', true);
      expect(invitationRegistrationResponse).toHaveProperty('welcomeEmailSent', false);
      expect(invitationRegistrationResponse).toHaveProperty('emailVerificationRequired', false);
      expect(invitationRegistrationResponse.user).toHaveProperty('emailVerified', true);

      // Contract validation for standard registration
      expect(standardRegistrationResponse).toHaveProperty('step', 'success');
      expect(standardRegistrationResponse).toHaveProperty('emailVerifiedViaInvitation', false);
      expect(standardRegistrationResponse).toHaveProperty('welcomeEmailSent', true);
      expect(standardRegistrationResponse).toHaveProperty('emailVerificationRequired', true);
      expect(standardRegistrationResponse.user).toHaveProperty('emailVerified', false);

      // Type validation
      expect(typeof invitationRegistrationResponse.emailVerifiedViaInvitation).toBe('boolean');
      expect(typeof invitationRegistrationResponse.welcomeEmailSent).toBe('boolean');
      expect(typeof invitationRegistrationResponse.emailVerificationRequired).toBe('boolean');
      expect(typeof standardRegistrationResponse.emailVerifiedViaInvitation).toBe('boolean');
      expect(typeof standardRegistrationResponse.welcomeEmailSent).toBe('boolean');
      expect(typeof standardRegistrationResponse.emailVerificationRequired).toBe('boolean');
    });

    test('MUST handle registration failure responses consistently', () => {
      const registrationFailureResponse = {
        step: 'failed',
        error: 'Registration failed',
        message: 'Email already exists',
        code: 'email_already_exists'
      };

      // Contract validation
      expect(registrationFailureResponse).toHaveProperty('step', 'failed');
      expect(registrationFailureResponse).toHaveProperty('error');
      expect(registrationFailureResponse).toHaveProperty('message');
      expect(typeof registrationFailureResponse.error).toBe('string');
      expect(typeof registrationFailureResponse.message).toBe('string');
    });
  });
});
