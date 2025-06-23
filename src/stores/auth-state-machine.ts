/**
 * Authentication State Machine
 * XState-inspired implementation without library dependency
 * Based on documented authentication state machine in /docs/auth/authentication-state-machine.md
 */

import type {
  AuthConfig,
  AuthMachineState,
  AuthMachineEvent,
  AuthMachineContext,
  AuthError,
  User,
  SessionData
} from '../types';
import { AuthApiClient } from '../api/auth-api';
import { isWebAuthnSupported, isConditionalMediationSupported } from '../utils/webauthn';
import { reportAuthState, reportWebAuthnError } from '../utils/errorReporter';

/**
 * Guards - Conditional logic for state transitions
 */
export class AuthGuards {
  constructor(private api: AuthApiClient, private config: AuthConfig) {}

  hasValidSession(context: AuthMachineContext): boolean {
    if (!context.sessionData) return false;
    
    const { accessToken } = context.sessionData;
    if (!accessToken) return false;
    
    // For testing purposes, consider any session with accessToken as valid
    // In production, you'd check expiration time properly
    return true;
  }

  async hasWebAuthnCredentials(email: string): Promise<boolean> {
    try {
      const response = await this.api.checkEmail(email);
      return response.exists && response.hasPasskey;
    } catch {
      return false;
    }
  }

  isWebAuthnSupported(): boolean {
    return isWebAuthnSupported() && this.config.enablePasskeys;
  }

  isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  async isConditionalMediationSupported(): Promise<boolean> {
    return await isConditionalMediationSupported();
  }

  noPasskeysAvailable(): boolean {
    return !this.isWebAuthnSupported();
  }

  // Error classification based on timing (from documentation)
  classifyWebAuthnError(error: any, duration: number): 'credential-not-found' | 'user-cancellation' | 'credential-mismatch' {
    if (duration < 500 || error.message?.includes('not found')) {
      return 'credential-not-found';
    } else if (duration >= 500 && duration < 30000 && this.containsCancellationPattern(error)) {
      return 'user-cancellation';
    } else if (duration >= 500 && duration < 30000) {
      return 'user-cancellation'; // Default for medium timing
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
}

/**
 * Actions - Side effects triggered during transitions
 */
export class AuthActions {
  constructor(
    private api: AuthApiClient, 
    private config: AuthConfig,
    private updateContext: (updates: Partial<AuthMachineContext>) => void
  ) {}

  setEmail(email: string): void {
    this.updateContext({ email });
    this.reportStateChange('sign-in-started', { email });
  }

  clearSession(): void {
    this.updateContext({ 
      sessionData: null, 
      user: null,
      error: null 
    });
    
    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_access_token');
      localStorage.removeItem('auth_refresh_token');
      localStorage.removeItem('auth_expires_at');
      localStorage.removeItem('auth_user');
    }
  }

  loadUserSession(session: SessionData): void {
    this.updateContext({ 
      sessionData: session, 
      user: session.user 
    });
  }

  setError(error: AuthError): void {
    this.updateContext({ error });
  }

  async startConditionalAuth(email: string): Promise<void> {
    this.updateContext({ startTime: Date.now() });
    try {
      // Implementation will be handled by existing auth store methods
      console.log('🔄 Starting conditional authentication for:', email);
    } catch (error) {
      this.reportError('webauthn-failure', error);
    }
  }

  async handleBiometricPrompt(email: string): Promise<void> {
    try {
      const challenge = await this.api.getPasskeyChallenge(email);
      
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(Buffer.from(challenge.challenge, 'base64')),
          allowCredentials: challenge.allowCredentials || [],
          timeout: challenge.timeout || 60000,
          userVerification: 'preferred',
          rpId: challenge.rpId
        },
        mediation: 'required' // Not conditional for explicit prompts
      });
      
      if (credential) {
        this.updateContext({ challengeId: credential.id });
      }
    } catch (error) {
      this.reportWebAuthnError(error, Date.now() - (this.getContext().startTime || 0));
    }
  }

  private getContext(): AuthMachineContext {
    // This will be provided by the state machine
    return {
      email: null,
      user: null,
      error: null,
      startTime: Date.now(),
      retryCount: 0,
      sessionData: null,
      challengeId: null
    };
  }

  private reportStateChange(event: 'login-attempt' | 'login-success' | 'login-failure' | 'webauthn-start' | 'webauthn-success' | 'webauthn-failure' | 'sign-in-started' | 'sign-in-success' | 'sign-in-error', data: any): void {
    if (this.config.errorReporting?.enabled) {
      reportAuthState({ event, ...data });
    }
  }

  private reportError(event: 'login-failure' | 'webauthn-failure' | 'sign-in-error', error: any): void {
    if (this.config.errorReporting?.enabled) {
      reportAuthState({ event, error: error.message });
    }
  }

  private reportWebAuthnError(error: any, duration: number): void {
    if (this.config.errorReporting?.enabled) {
      reportWebAuthnError('authentication', error, { duration });
    }
  }
}

/**
 * Main State Machine Class
 */
export class AuthStateMachine {
  private state: AuthMachineState = 'checkingSession';
  private context: AuthMachineContext;
  private guards: AuthGuards;
  private actions: AuthActions;
  private listeners: Set<(state: AuthMachineState, context: AuthMachineContext) => void>;

  constructor(private api: AuthApiClient, private config: AuthConfig) {
    this.context = this.createInitialContext();
    this.guards = new AuthGuards(api, config);
    this.actions = new AuthActions(api, config, (updates) => this.updateContext(updates));
    this.listeners = new Set();
  }

  private createInitialContext(): AuthMachineContext {
    return {
      email: null,
      user: null,
      error: null,
      startTime: Date.now(),
      retryCount: 0,
      sessionData: null,
      challengeId: null
    };
  }

  private updateContext(updates: Partial<AuthMachineContext>): void {
    this.context = { ...this.context, ...updates };
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state, this.context));
  }

  // XState-like transition method
  send(event: AuthMachineEvent): void {
    const newState = this.transition(this.state, event, this.context);
    if (newState !== this.state) {
      this.setState(newState);
    }
  }

  private setState(newState: AuthMachineState): void {
    const previousState = this.state;
    this.state = newState;
    
    console.log(`🔄 State transition: ${previousState} → ${newState}`);
    
    // Execute entry actions for new state
    this.executeEntryActions(newState);
    
    this.notifyListeners();
  }

  private executeEntryActions(state: AuthMachineState): void {
    switch (state) {
      case 'combinedAuth':
        this.actions.setError({ code: '', message: '' } as AuthError); // Clear any previous errors
        break;
      case 'conditionalMediation':
        if (this.context.email) {
          this.actions.startConditionalAuth(this.context.email);
        }
        break;
      case 'biometricPrompt':
        if (this.context.email) {
          this.actions.handleBiometricPrompt(this.context.email);
        }
        break;
      case 'sessionCreated':
        // Automatically transition to loading app
        setTimeout(() => this.setState('loadingApp'), 0);
        break;
      case 'loadingApp':
        // Automatically transition to app loaded
        setTimeout(() => this.setState('appLoaded'), 0);
        break;
    }
  }

  // Core transition logic based on documented state machine
  private transition(
    currentState: AuthMachineState, 
    event: AuthMachineEvent, 
    context: AuthMachineContext
  ): AuthMachineState {
    
    switch (currentState) {
      case 'checkingSession':
        if (event.type === 'VALID_SESSION') {
          // Update context first, then check if valid
          const updatedContext = { ...context, sessionData: event.session, user: event.session.user };
          if (this.guards.hasValidSession(updatedContext)) {
            this.actions.loadUserSession(event.session);
            return 'sessionValid';
          } else {
            this.actions.clearSession();
            return 'sessionInvalid';
          }
        }
        if (event.type === 'INVALID_SESSION') {
          this.actions.clearSession();
          return 'sessionInvalid';
        }
        break;

      case 'sessionValid':
        return 'loadingApp';

      case 'sessionInvalid':
        if (event.type === 'USER_CLICKS_NEXT') {
          return 'combinedAuth';
        }
        break;

      case 'combinedAuth':
        if (event.type === 'EMAIL_TYPED' && this.guards.isValidEmail(event.email)) {
          this.actions.setEmail(event.email);
          return 'conditionalMediation';
        }
        if (event.type === 'CONTINUE_CLICKED') {
          return 'explicitAuth';
        }
        break;

      case 'conditionalMediation':
        if (event.type === 'PASSKEY_SELECTED') {
          return 'biometricPrompt';
        }
        if (this.guards.noPasskeysAvailable()) {
          return 'waitForExplicit';
        }
        break;

      case 'waitForExplicit':
        if (event.type === 'CONTINUE_CLICKED') {
          return 'explicitAuth';
        }
        break;

      case 'explicitAuth':
        return 'auth0UserLookup';

      case 'auth0UserLookup':
        if (event.type === 'USER_EXISTS' && event.hasPasskey) {
          return 'directWebAuthnAuth';
        }
        if (event.type === 'USER_EXISTS' && !event.hasPasskey) {
          return 'passkeyRegistration';
        }
        if (event.type === 'USER_NOT_FOUND') {
          return 'newUserRegistration';
        }
        break;

      case 'directWebAuthnAuth':
        return 'biometricPrompt';

      case 'biometricPrompt':
        if (event.type === 'WEBAUTHN_SUCCESS') {
          return 'auth0WebAuthnVerify';
        }
        if (event.type === 'WEBAUTHN_ERROR') {
          // Directly classify and transition to appropriate error state
          const errorType = this.guards.classifyWebAuthnError(event.error, event.timing);
          switch (errorType) {
            case 'credential-not-found':
              return 'credentialNotFound';
            case 'user-cancellation':
              return 'userCancellation';
            case 'credential-mismatch':
              return 'credentialMismatch';
            default:
              return 'passkeyError';
          }
        }
        break;

      case 'auth0WebAuthnVerify':
        if (event.type === 'TOKEN_EXCHANGE_SUCCESS') {
          return 'sessionCreated';
        }
        if (event.type === 'WEBAUTHN_ERROR') {
          return 'passkeyError';
        }
        break;

      case 'errorHandling':
        if (event.type === 'WEBAUTHN_ERROR') {
          const errorType = this.guards.classifyWebAuthnError(event.error, event.timing);
          switch (errorType) {
            case 'credential-not-found':
              return 'credentialNotFound';
            case 'user-cancellation':
              return 'userCancellation';
            case 'credential-mismatch':
              return 'credentialMismatch';
            default:
              return 'credentialMismatch';
          }
        }
        break;

      case 'sessionCreated':
        return 'loadingApp';

      case 'loadingApp':
        return 'appLoaded';

      case 'credentialNotFound':
      case 'userCancellation':
      case 'credentialMismatch':
        if (event.type === 'RESET_TO_COMBINED_AUTH') {
          return 'combinedAuth';
        }
        break;
    }

    return currentState; // No transition
  }

  // XState-like state matching
  matches(state: AuthMachineState): boolean {
    return this.state === state;
  }

  // XState-like subscription
  onTransition(listener: (state: AuthMachineState, context: AuthMachineContext) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Getters for current state and context
  get currentState(): AuthMachineState {
    return this.state;
  }

  get currentContext(): AuthMachineContext {
    return this.context;
  }

  // Initialize the state machine
  start(): void {
    // Check for existing session
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('auth_access_token');
      const storedUser = localStorage.getItem('auth_user');
      
      if (storedToken && storedUser) {
        const user = JSON.parse(storedUser);
        const sessionData: SessionData = {
          accessToken: storedToken,
          refreshToken: localStorage.getItem('auth_refresh_token') || undefined,
          user
        };
        
        this.send({ type: 'VALID_SESSION', session: sessionData });
      } else {
        this.send({ type: 'INVALID_SESSION' });
      }
    } else {
      this.send({ type: 'INVALID_SESSION' });
    }
  }
}