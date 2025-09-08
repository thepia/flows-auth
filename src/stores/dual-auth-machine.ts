/**
 * Dual Auth Machine Coordinator
 * 
 * Coordinates between SessionStateMachine and SignInStateMachine
 */

import type { AuthConfig } from '../types';
import type { SessionState, SessionContext } from '../types/session-state-machine';
import type { SignInState, SignInContext } from '../types/signin-state-machine';
import { SessionStateMachine } from './session-state-machine';
import { SignInStateMachine } from './signin-state-machine';

export interface DualAuthState {
  session: {
    state: SessionState;
    context: SessionContext;
  };
  signIn: {
    state: SignInState;
    context: SignInContext;
  };
  // Derived state for easier consumption
  isAuthenticated: boolean;
  isSigningIn: boolean;
  showSignInForm: boolean;
  currentUser: any | null;
}

export class DualAuthMachine {
  private sessionMachine: SessionStateMachine;
  private signInMachine: SignInStateMachine;
  private listeners: Set<(state: DualAuthState) => void>;
  
  constructor(private config: AuthConfig) {
    this.sessionMachine = new SessionStateMachine(config);
    this.signInMachine = new SignInStateMachine(config);
    this.listeners = new Set();
    
    this.setupCommunication();
  }

  private setupCommunication(): void {
    // Listen to session state changes
    this.sessionMachine.onTransition((sessionState, sessionContext) => {
      // When session becomes unauthenticated, user needs to sign in
      if (sessionState === 'unauthenticated' && !this.signInMachine.matches('emailEntry')) {
        // Don't interfere if sign-in is already in progress
        if (this.signInMachine.matches('signedIn')) {
          this.signInMachine.reset();
        }
      }
      
      this.notifyListeners();
    });
    
    // Listen to sign-in state changes
    this.signInMachine.onTransition((signInState, signInContext) => {
      // When sign-in succeeds, authenticate the session
      if (signInState === 'signedIn') {
        // Extract session data from sign-in success
        // This would typically come from the sign-in context or event
        // For now, simulate successful authentication
        const mockSession = {
          accessToken: 'mock_access_token_' + Date.now(),
          refreshToken: 'mock_refresh_token_' + Date.now(),
          user: {
            id: 'user_' + Date.now(),
            email: signInContext.email || 'user@example.com',
            name: 'Demo User',
            emailVerified: true
          },
          expiresAt: Date.now() + (60 * 60 * 1000), // 1 hour
          lastActivity: Date.now()
        };
        
        this.sessionMachine.send({ type: 'AUTHENTICATE', session: mockSession });
      }
      
      this.notifyListeners();
    });
  }

  private getDualState(): DualAuthState {
    const sessionState = this.sessionMachine.currentState;
    const sessionContext = this.sessionMachine.currentContext;
    const signInState = this.signInMachine.currentState;
    const signInContext = this.signInMachine.currentContext;

    return {
      session: {
        state: sessionState,
        context: sessionContext
      },
      signIn: {
        state: signInState,
        context: signInContext
      },
      // Derived states for easier consumption
      isAuthenticated: sessionState === 'authenticated',
      isSigningIn: signInState !== 'emailEntry' && signInState !== 'signedIn',
      showSignInForm: sessionState === 'unauthenticated' && signInState === 'emailEntry',
      currentUser: sessionContext.session?.user || null
    };
  }

  private notifyListeners(): void {
    const state = this.getDualState();
    this.listeners.forEach(listener => listener(state));
  }

  // Public API
  onStateChange(listener: (state: DualAuthState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  get currentState(): DualAuthState {
    return this.getDualState();
  }

  // Session machine proxy methods
  get sessionState(): SessionState {
    return this.sessionMachine.currentState;
  }

  get sessionContext(): SessionContext {
    return this.sessionMachine.currentContext;
  }

  expireSession(): void {
    this.sessionMachine.expire();
  }

  logout(): void {
    this.sessionMachine.logout();
    this.signInMachine.reset();
  }

  // Sign-in machine proxy methods
  get signInState(): SignInState {
    return this.signInMachine.currentState;
  }

  get signInContext(): SignInContext {
    return this.signInMachine.currentContext;
  }

  startSignIn(): void {
    this.signInMachine.start();
  }

  submitEmail(email: string): void {
    this.signInMachine.send({ type: 'EMAIL_SUBMITTED', email });
  }

  selectPasskey(): void {
    this.signInMachine.send({ type: 'PASSKEY_SELECTED' });
  }

  enterPin(pin: string): void {
    this.signInMachine.send({ type: 'PIN_ENTERED', pin });
  }

  retrySignIn(): void {
    this.signInMachine.retry();
  }

  resetSignIn(): void {
    this.signInMachine.reset();
  }

  // Expose state machine instances for visualization
  get signInMachineInstance(): SignInStateMachine {
    return this.signInMachine;
  }

  get sessionMachineInstance(): SessionStateMachine {
    return this.sessionMachine;
  }

  // Initialize both machines
  start(): void {
    // Session machine starts immediately in 'initializing' state
    this.sessionMachine.start();
    // Don't start sign-in machine automatically - it starts when needed
    
    // Notify listeners immediately with initial state
    this.notifyListeners();
  }

  // Testing helpers
  simulateSessionExpiry(): void {
    this.sessionMachine.expire();
  }

  simulateNetworkError(): void {
    this.signInMachine.send({ 
      type: 'ERROR', 
      error: {
        code: 'NETWORK_ERROR',
        message: 'Network connection failed',
        type: 'network',
        retryable: true
      }
    });
  }
}