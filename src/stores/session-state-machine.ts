/**
 * Session State Machine Implementation
 * 
 * Manages application-level authentication status and session lifecycle
 */

import type { 
  SessionState, 
  SessionEvent, 
  SessionContext, 
  SessionData, 
  SessionError 
} from '../types/session-state-machine';
import { getSession, isSessionValid, clearSession, saveSession } from '../utils/sessionManager';
import type { AuthConfig } from '../types';

export class SessionStateMachine {
  private state: SessionState = 'initializing';
  private context: SessionContext;
  private listeners: Set<(state: SessionState, context: SessionContext) => void>;

  constructor(private config: AuthConfig) {
    this.context = this.createInitialContext();
    this.listeners = new Set();
  }

  private createInitialContext(): SessionContext {
    return {
      session: null,
      error: null,
      retryCount: 0,
      lastRefreshAttempt: null
    };
  }

  private setState(newState: SessionState): void {
    const previousState = this.state;
    this.state = newState;
    
    console.log(`📱 Session: ${previousState} → ${newState}`);
    
    // Execute entry actions for new state
    this.executeEntryActions(newState);
    
    this.notifyListeners();
  }

  private executeEntryActions(state: SessionState): void {
    switch (state) {
      case 'initializing':
        // Check for existing session on startup
        this.checkExistingSession();
        break;
        
      case 'expired':
        // Automatically attempt refresh if we have a refresh token
        if (this.context.session?.refreshToken) {
          setTimeout(() => this.setState('refreshing'), 0);
        }
        break;
        
      case 'refreshing':
        this.attemptTokenRefresh();
        break;
        
      case 'unauthenticated':
        // Clear any session data
        clearSession();
        this.updateContext({ session: null, error: null });
        break;
    }
  }

  private async checkExistingSession(): Promise<void> {
    try {
      const existingSession = getSession();
      
      if (existingSession && isSessionValid(existingSession)) {
        // Convert FlowsSessionData to SessionData format
        const sessionData: SessionData = {
          accessToken: existingSession.tokens.accessToken,
          refreshToken: existingSession.tokens.refreshToken,
          user: {
            id: existingSession.user.id,
            email: existingSession.user.email,
            name: existingSession.user.name,
            emailVerified: true // Assume verified if they have a session
          },
          expiresAt: existingSession.tokens.expiresAt,
          lastActivity: existingSession.lastActivity
        };

        this.send({ type: 'SESSION_FOUND', session: sessionData });
      } else {
        this.send({ type: 'SESSION_INVALID' });
      }
    } catch (error) {
      console.error('Error checking existing session:', error);
      this.send({ 
        type: 'ERROR', 
        error: {
          code: 'SESSION_CHECK_FAILED',
          message: 'Failed to check existing session',
          type: 'validation'
        }
      });
    }
  }

  private async attemptTokenRefresh(): Promise<void> {
    if (!this.context.session?.refreshToken) {
      this.send({ type: 'REFRESH_FAILED' });
      return;
    }

    try {
      this.updateContext({ lastRefreshAttempt: Date.now() });

      // TODO: Implement actual token refresh API call
      // For now, simulate refresh failure after 3 attempts
      if (this.context.retryCount >= 2) {
        this.send({ type: 'REFRESH_FAILED' });
        return;
      }

      // Simulate refresh delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Simulate refresh success/failure
      const refreshSuccess = Math.random() > 0.3; // 70% success rate for testing
      
      if (refreshSuccess && this.context.session) {
        const refreshedSession: SessionData = {
          ...this.context.session,
          accessToken: 'new_access_token_' + Date.now(),
          expiresAt: Date.now() + (60 * 60 * 1000), // 1 hour from now
          lastActivity: Date.now()
        };

        this.send({ type: 'REFRESH_SUCCESS', session: refreshedSession });
      } else {
        this.send({ type: 'REFRESH_FAILED' });
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.send({ 
        type: 'ERROR', 
        error: {
          code: 'REFRESH_FAILED',
          message: error instanceof Error ? error.message : 'Token refresh failed',
          type: 'network'
        }
      });
    }
  }

  private updateContext(updates: Partial<SessionContext>): void {
    this.context = { ...this.context, ...updates };
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state, this.context));
  }

  // Public API
  send(event: SessionEvent): void {
    const newState = this.transition(this.state, event, this.context);
    if (newState !== this.state) {
      this.setState(newState);
    }
  }

  private transition(
    currentState: SessionState, 
    event: SessionEvent, 
    context: SessionContext
  ): SessionState {
    
    switch (currentState) {
      case 'initializing':
        if (event.type === 'SESSION_FOUND') {
          this.updateContext({ session: event.session, error: null });
          return 'authenticated';
        }
        if (event.type === 'SESSION_INVALID') {
          return 'unauthenticated';
        }
        if (event.type === 'ERROR') {
          this.updateContext({ error: event.error });
          return 'error';
        }
        break;

      case 'unauthenticated':
        if (event.type === 'AUTHENTICATE') {
          this.updateContext({ session: event.session, error: null, retryCount: 0 });
          // Save session to storage
          saveSession({
            user: {
              ...event.session.user,
              initials: event.session.user.name.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'
            },
            tokens: {
              accessToken: event.session.accessToken,
              refreshToken: event.session.refreshToken,
              expiresAt: event.session.expiresAt
            },
            authMethod: 'passkey', // Default, could be passed in event
            lastActivity: event.session.lastActivity
          });
          return 'authenticated';
        }
        if (event.type === 'ERROR') {
          this.updateContext({ error: event.error });
          return 'error';
        }
        break;

      case 'authenticated':
        if (event.type === 'EXPIRE') {
          return 'expired';
        }
        if (event.type === 'LOGOUT') {
          return 'unauthenticated';
        }
        if (event.type === 'ERROR') {
          this.updateContext({ error: event.error });
          return 'error';
        }
        break;

      case 'expired':
        if (event.type === 'LOGOUT') {
          return 'unauthenticated';
        }
        // Automatic transition to refreshing is handled in executeEntryActions
        break;

      case 'refreshing':
        if (event.type === 'REFRESH_SUCCESS') {
          this.updateContext({ session: event.session, error: null, retryCount: 0 });
          // Update session in storage
          saveSession({
            user: {
              ...event.session.user,
              initials: event.session.user.name.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'
            },
            tokens: {
              accessToken: event.session.accessToken,
              refreshToken: event.session.refreshToken,
              expiresAt: event.session.expiresAt
            },
            authMethod: 'passkey', // Default
            lastActivity: event.session.lastActivity
          });
          return 'authenticated';
        }
        if (event.type === 'REFRESH_FAILED') {
          this.updateContext({ retryCount: context.retryCount + 1 });
          return 'unauthenticated';
        }
        if (event.type === 'ERROR') {
          this.updateContext({ error: event.error });
          return 'error';
        }
        break;

      case 'error':
        if (event.type === 'INIT') {
          this.updateContext({ error: null });
          return 'initializing';
        }
        if (event.type === 'LOGOUT') {
          return 'unauthenticated';
        }
        break;
    }

    return currentState; // No transition
  }

  // XState-like API
  matches(state: SessionState): boolean {
    return this.state === state;
  }

  onTransition(listener: (state: SessionState, context: SessionContext) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  get currentState(): SessionState {
    return this.state;
  }

  get currentContext(): SessionContext {
    return this.context;
  }

  // Initialize the session machine
  start(): void {
    if (this.state === 'initializing') {
      // checkExistingSession is called in executeEntryActions for 'initializing'
    } else {
      this.send({ type: 'INIT' });
    }
  }

  // Force session expiry (for testing)
  expire(): void {
    if (this.state === 'authenticated') {
      this.send({ type: 'EXPIRE' });
    }
  }

  // Manual logout
  logout(): void {
    this.send({ type: 'LOGOUT' });
  }

  // Visualization methods for state machine flow diagrams
  getStateTransitions(): Array<{source: string, target: string, event?: string}> {
    return [
      // Initialization flow
      { source: 'initializing', target: 'authenticated', event: 'SESSION_FOUND' },
      { source: 'initializing', target: 'unauthenticated', event: 'SESSION_INVALID' },
      { source: 'initializing', target: 'error', event: 'ERROR' },
      
      // Authentication flow
      { source: 'unauthenticated', target: 'authenticated', event: 'AUTHENTICATE' },
      
      // Session management
      { source: 'authenticated', target: 'expired', event: 'EXPIRE' },
      { source: 'authenticated', target: 'unauthenticated', event: 'LOGOUT' },
      { source: 'authenticated', target: 'error', event: 'ERROR' },
      
      // Refresh flow
      { source: 'expired', target: 'refreshing', event: 'REFRESH' },
      { source: 'refreshing', target: 'authenticated', event: 'REFRESH_SUCCESS' },
      { source: 'refreshing', target: 'unauthenticated', event: 'REFRESH_FAILED' },
      { source: 'refreshing', target: 'error', event: 'ERROR' },
      
      // Error recovery
      { source: 'error', target: 'initializing', event: 'RETRY' },
      { source: 'error', target: 'unauthenticated', event: 'LOGOUT' }
    ];
  }

  getStateCategories(): Record<string, {color: string, states: string[]}> {
    return {
      initialization: { color: '#6366f1', states: ['initializing'] },
      unauthenticated: { color: '#ef4444', states: ['unauthenticated'] },
      authenticated: { color: '#10b981', states: ['authenticated'] },
      maintenance: { color: '#f59e0b', states: ['expired', 'refreshing'] },
      errors: { color: '#dc2626', states: ['error'] }
    };
  }
}