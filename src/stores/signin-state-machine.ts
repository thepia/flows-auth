/**
 * Sign-In State Machine Implementation
 * 
 * Manages sign-in form UI flow and authentication process
 */

import type { 
  SignInState, 
  SignInEvent, 
  SignInContext, 
  SignInError, 
  WebAuthnError,
  SessionData 
} from '../types/signin-state-machine';
import type { AuthConfig } from '../types';
import { AuthApiClient } from '../api/auth-api';

export class SignInStateMachine {
  private state: SignInState = 'emailEntry';
  private context: SignInContext;
  private listeners: Set<(state: SignInState, context: SignInContext) => void>;
  private api: AuthApiClient;

  constructor(private config: AuthConfig) {
    this.context = this.createInitialContext();
    this.listeners = new Set();
    this.api = new AuthApiClient(config);
  }

  private createInitialContext(): SignInContext {
    return {
      email: null,
      user: null,
      signedInUser: null,
      error: null,
      retryCount: 0,
      startTime: null,
      challengeId: null
    };
  }

  private setState(newState: SignInState): void {
    const previousState = this.state;
    this.state = newState;
    
    console.log(`🔐 SignIn: ${previousState} → ${newState}`);
    
    // Execute entry actions for new state
    this.executeEntryActions(newState);
    
    this.notifyListeners();
  }

  private executeEntryActions(state: SignInState): void {
    switch (state) {
        
      case 'emailEntry':
        // Reset context but preserve email for UX, set start time for analytics
        this.updateContext({ 
          user: null, 
          signedInUser: null,
          error: null, 
          retryCount: 0, 
          startTime: this.context.startTime || Date.now(), 
          challengeId: null 
        });
        break;
        
      case 'userChecked':
        // User data is already loaded, automatically transition to next step
        setTimeout(() => {
          if (this.context.user?.exists && this.context.user?.hasPasskey) {
            this.setState('passkeyPrompt');
          } else {
            // Both existing users without passkey and new users go to email verification first
            this.setState('emailVerification');
          }
        }, 0); // Next tick to avoid state change during state change
        break;
        
      case 'passkeyPrompt':
        // Start conditional mediation for WebAuthn
        this.startConditionalMediation();
        break;
        
      case 'signedIn':
        // Clear any errors on success and populate user info from session
        this.updateContext({ 
          error: null,
          signedInUser: this.context.signedInUser // Will be set during transitions
        });
        break;
    }
  }

  private async performUserLookup(email: string): Promise<void> {
    try {
      const userCheck = await this.api.checkEmail(email);
      
      this.updateContext({ 
        user: {
          exists: userCheck.exists,
          hasPasskey: userCheck.hasPasskey || false,
          emailVerified: userCheck.emailVerified || false
        }
      });

      // Send event to transition to userChecked state  
      if (userCheck.exists) {
        this.send({ type: 'USER_EXISTS', hasPasskey: userCheck.hasPasskey || false });
      } else {
        this.send({ type: 'USER_NOT_FOUND' });
      }
    } catch (error) {
      console.error('User lookup failed:', error);
      this.send({ 
        type: 'ERROR', 
        error: {
          code: 'USER_LOOKUP_FAILED',
          message: 'Failed to check user existence',
          type: 'network',
          retryable: true
        }
      });
    }
  }

  private async startConditionalMediation(): Promise<void> {
    try {
      // Check if WebAuthn is supported
      if (!window.navigator.credentials) {
        this.send({ type: 'PIN_REQUESTED' }); // Fallback to PIN
        return;
      }

      // Start conditional mediation
      console.log('🔑 Starting WebAuthn conditional mediation');
      
      // This would trigger the browser's passkey autofill
      // For now, simulate user having passkeys available
      setTimeout(() => {
        this.send({ type: 'PASSKEY_AVAILABLE' });
      }, 500);
      
    } catch (error) {
      console.error('Conditional mediation failed:', error);
      this.send({ type: 'PIN_REQUESTED' }); // Fallback to PIN
    }
  }

  private async performWebAuthnAuthentication(email: string): Promise<void> {
    try {
      const startTime = Date.now();
      
      // Get WebAuthn challenge
      const challenge = await this.api.getPasskeyChallenge(email);
      
      // Perform WebAuthn authentication
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(Buffer.from(challenge.challenge, 'base64')),
          allowCredentials: challenge.allowCredentials || [],
          timeout: challenge.timeout || 60000,
          userVerification: 'preferred',
          rpId: challenge.rpId
        },
        mediation: 'required'
      });

      if (credential) {
        // TODO: Verify credential with server using proper API method
        // For now, simulate successful authentication
        const mockSession: SessionData = {
          accessToken: 'mock_access_token_' + Date.now(),
          refreshToken: 'mock_refresh_token_' + Date.now(), 
          user: {
            id: 'user_' + Date.now(),
            email: email,
            name: 'Demo User',
            emailVerified: true
          },
          expiresAt: Date.now() + (60 * 60 * 1000), // 1 hour
          lastActivity: Date.now()
        };
        
        // Update context with signed in user info before sending event
        this.updateContext({
          signedInUser: {
            id: mockSession.user.id,
            email: mockSession.user.email,
            name: mockSession.user.name,
            emailVerified: mockSession.user.emailVerified,
            authMethod: 'passkey'
          }
        });
        
        this.send({ type: 'PASSKEY_SUCCESS', credential: mockSession });
      } else {
        throw new Error('No credential received');
      }
      
    } catch (error: any) {
      const duration = Date.now() - (this.context.startTime || 0);
      const webauthnError: WebAuthnError = {
        name: error.name || 'UnknownError',
        message: error.message || 'WebAuthn authentication failed',
        timing: duration,
        type: this.classifyWebAuthnError(error, duration)
      };
      
      this.send({ type: 'PASSKEY_FAILED', error: webauthnError });
    }
  }

  private classifyWebAuthnError(error: any, duration: number): WebAuthnError['type'] {
    if (duration < 500 || error.message?.includes('not found')) {
      return 'credential-not-found';
    } else if (duration >= 500 && duration < 30000 && this.containsCancellationPattern(error)) {
      return 'user-cancellation';
    } else if (duration >= 500 && duration < 30000) {
      return 'user-cancellation';
    } else {
      return 'credential-mismatch';
    }
  }

  private containsCancellationPattern(error: any): boolean {
    const cancellationPatterns = ['NotAllowedError', 'cancelled', 'aborted'];
    return cancellationPatterns.some(pattern => 
      error.name?.includes(pattern) || error.message?.includes(pattern)
    );
  }

  private updateContext(updates: Partial<SignInContext>): void {
    this.context = { ...this.context, ...updates };
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state, this.context));
  }

  // Public API
  send(event: SignInEvent): void {
    const newState = this.transition(this.state, event, this.context);
    if (newState !== this.state) {
      this.setState(newState);
    }
  }

  // Extract state machine transitions for visualization
  getStateTransitions(): Array<{source: string, target: string, event?: string}> {
    // Return the correct state machine transitions based on actual business logic
    return [
      // Basic flow - direct from emailEntry to userChecked (no userLookup state)
      { source: 'emailEntry', target: 'userChecked', event: 'EMAIL_SUBMITTED' },
      { source: 'emailEntry', target: 'generalError', event: 'ERROR' },
      
      // After userChecked - conditional transitions based on user state
      { source: 'userChecked', target: 'passkeyPrompt', event: 'AUTO_TRANSITION_PASSKEY' },
      { source: 'userChecked', target: 'emailVerification', event: 'AUTO_TRANSITION_EMAIL' },
      { source: 'userChecked', target: 'generalError', event: 'ERROR' },
      
      // Passkey authentication flow
      { source: 'passkeyPrompt', target: 'signedIn', event: 'PASSKEY_SUCCESS' },
      { source: 'passkeyPrompt', target: 'generalError', event: 'PASSKEY_FAILED' },
      
      // Email verification + PIN entry flow (correct order)
      { source: 'emailVerification', target: 'pinEntry', event: 'EMAIL_SENT' },
      { source: 'emailVerification', target: 'generalError', event: 'ERROR' },
      { source: 'pinEntry', target: 'signedIn', event: 'PIN_VERIFIED' },
      { source: 'pinEntry', target: 'generalError', event: 'ERROR' },
      
      // Registration flow - only accessible from signedIn
      { source: 'signedIn', target: 'passkeyRegistration', event: 'REGISTER_PASSKEY' },
      { source: 'passkeyRegistration', target: 'signedIn', event: 'PASSKEY_REGISTERED' },
      { source: 'passkeyRegistration', target: 'generalError', event: 'ERROR' },
      
      // Error recovery
      { source: 'generalError', target: 'emailEntry', event: 'RETRY' }
    ];
  }

  getStateCategories(): Record<string, {color: string, states: string[]}> {
    return {
      input: { color: '#10b981', states: ['emailEntry', 'userChecked'] },
      auth: { color: '#f59e0b', states: ['passkeyPrompt', 'pinEntry'] },
      verification: { color: '#8b5cf6', states: ['emailVerification'] },
      registration: { color: '#9333ea', states: ['passkeyRegistration'] },
      completion: { color: '#06b6d4', states: ['signedIn'] },
      errors: { color: '#ef4444', states: ['generalError'] }
    };
  }

  private transition(
    currentState: SignInState, 
    event: SignInEvent, 
    context: SignInContext
  ): SignInState {
    
    switch (currentState) {
      case 'emailEntry':
        if (event.type === 'EMAIL_ENTERED') {
          this.updateContext({ email: event.email, error: null });
          return 'emailEntry'; // Stay in same state, just update context
        }
        if (event.type === 'EMAIL_SUBMITTED') {
          if (this.isValidEmail(event.email)) {
            this.updateContext({ email: event.email });
            // Perform user lookup immediately and transition to userChecked
            this.performUserLookup(event.email);
            return 'userChecked';
          } else {
            this.updateContext({ 
              error: {
                code: 'INVALID_EMAIL',
                message: 'Please enter a valid email address',
                type: 'validation',
                retryable: false
              }
            });
            return 'generalError';
          }
        }
        break;

      case 'userChecked':
        // Handle user lookup results and auto-transitions in entry actions
        if (event.type === 'USER_EXISTS') {
          return 'userChecked'; // Stay in same state, entry actions will handle transition
        }
        if (event.type === 'USER_NOT_FOUND') {
          return 'userChecked'; // Stay in same state, entry actions will handle transition
        }
        if (event.type === 'ERROR') {
          this.updateContext({ error: event.error });
          return 'generalError';
        }
        break;

      case 'passkeyPrompt':
        if (event.type === 'PASSKEY_SUCCESS') {
          // Direct passkey authentication success
          return 'signedIn';
        }
        if (event.type === 'PASSKEY_FAILED') {
          this.updateContext({ 
            error: {
              code: 'WEBAUTHN_FAILED',
              message: event.error.message,
              type: 'webauthn',
              retryable: event.error.type !== 'credential-not-found'
            }
          });
          return 'generalError';
        }
        break;

      case 'emailVerification':
        if (event.type === 'EMAIL_SENT') {
          return 'pinEntry';
        }
        if (event.type === 'ERROR') {
          this.updateContext({ error: event.error });
          return 'generalError';
        }
        break;

      case 'pinEntry':
        if (event.type === 'PIN_VERIFIED') {
          return 'signedIn';
        }
        break;

      case 'passkeyRegistration':
        if (event.type === 'PASSKEY_REGISTERED') {
          return 'signedIn';
        }
        break;

      case 'signedIn':
        if (event.type === 'REGISTER_PASSKEY') {
          return 'passkeyRegistration';
        }
        if (event.type === 'RESET') {
          return 'emailEntry';
        }
        break;

      // Error state
      case 'generalError':
        if (event.type === 'RETRY') {
          return 'emailEntry';
        }
        if (event.type === 'RESET') {
          return 'emailEntry';
        }
        break;
    }

    return currentState; // No transition
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // XState-like API
  matches(state: SignInState): boolean {
    return this.state === state;
  }

  onTransition(listener: (state: SignInState, context: SignInContext) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  get currentState(): SignInState {
    return this.state;
  }

  get currentContext(): SignInContext {
    return this.context;
  }

  // Initialize the sign-in machine (now starts in emailEntry)
  start(): void {
    // Already starts in emailEntry, no action needed
  }

  // Reset to initial state
  reset(): void {
    this.send({ type: 'RESET' });
  }

  // Manual retry from error states
  retry(): void {
    this.send({ type: 'RETRY' });
  }
}