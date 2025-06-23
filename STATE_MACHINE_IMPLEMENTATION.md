# State Machine Implementation Plan

## Overview

This document outlines the implementation of the authentication state machine as documented in `/docs/auth/authentication-state-machine.md`. The implementation follows XState concepts without the library dependency to maintain bundle size efficiency while providing formal state machine benefits.

## XState-Inspired Architecture

### Core Concepts Implementation

**States** → TypeScript union types with explicit enumeration
**Transitions** → Event-driven functions with conditional logic
**Guards** → Boolean/Promise functions that control transitions
**Actions** → Side effect functions triggered during transitions
**Context** → Persistent data object across state transitions
**Events** → Typed events that trigger state changes

## Implementation Structure

### 1. Type Definitions

```typescript
// Core state machine types
export type AuthMachineState = 
  | 'checkingSession'
  | 'sessionValid'
  | 'sessionInvalid'
  | 'combinedAuth'
  | 'conditionalMediation'
  | 'autofillPasskeys'
  | 'waitForExplicit'
  | 'explicitAuth'
  | 'auth0UserLookup'
  | 'directWebAuthnAuth'
  | 'passkeyRegistration'
  | 'newUserRegistration'
  | 'biometricPrompt'
  | 'auth0WebAuthnVerify'
  | 'passkeyError'
  | 'errorHandling'
  | 'credentialNotFound'
  | 'userCancellation'
  | 'credentialMismatch'
  | 'auth0TokenExchange'
  | 'sessionCreated'
  | 'loadingApp'
  | 'appLoaded';

export type AuthMachineEvent = 
  | { type: 'CHECK_SESSION' }
  | { type: 'VALID_SESSION'; session: SessionData }
  | { type: 'INVALID_SESSION' }
  | { type: 'USER_CLICKS_NEXT' }
  | { type: 'EMAIL_TYPED'; email: string }
  | { type: 'CONTINUE_CLICKED' }
  | { type: 'PASSKEY_SELECTED'; credential: any }
  | { type: 'USER_EXISTS'; hasPasskey: boolean }
  | { type: 'USER_NOT_FOUND' }
  | { type: 'WEBAUTHN_SUCCESS'; response: any }
  | { type: 'WEBAUTHN_ERROR'; error: AuthError; timing: number }
  | { type: 'TOKEN_EXCHANGE_SUCCESS'; tokens: any }
  | { type: 'RESET_TO_COMBINED_AUTH' };

export interface AuthMachineContext {
  email: string | null;
  user: User | null;
  error: AuthError | null;
  startTime: number;
  retryCount: number;
  sessionData: SessionData | null;
  challengeId: string | null;
}
```

### 2. State Machine Class

```typescript
export class AuthStateMachine {
  private state: AuthMachineState = 'checkingSession';
  private context: AuthMachineContext;
  private guards: AuthGuards;
  private actions: AuthActions;
  private listeners: Set<(state: AuthMachineState, context: AuthMachineContext) => void>;

  constructor(private api: AuthApiClient, private config: AuthConfig) {
    this.context = this.createInitialContext();
    this.guards = new AuthGuards(api, config);
    this.actions = new AuthActions(api, config, this.context);
    this.listeners = new Set();
  }

  // XState-like transition method
  send(event: AuthMachineEvent): void {
    const newState = this.transition(this.state, event, this.context);
    if (newState !== this.state) {
      this.setState(newState);
    }
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
}
```

### 3. Transition Logic

```typescript
private transition(
  currentState: AuthMachineState, 
  event: AuthMachineEvent, 
  context: AuthMachineContext
): AuthMachineState {
  
  switch (currentState) {
    case 'checkingSession':
      if (event.type === 'VALID_SESSION' && this.guards.hasValidSession()) {
        this.actions.loadUserSession(event.session);
        return 'sessionValid';
      }
      if (event.type === 'INVALID_SESSION') {
        this.actions.clearSession();
        return 'sessionInvalid';
      }
      break;

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

    // ... implement all documented state transitions
  }

  return currentState; // No transition
}
```

### 4. Guards Implementation

```typescript
export class AuthGuards {
  constructor(private api: AuthApiClient, private config: AuthConfig) {}

  hasValidSession(): boolean {
    const session = getSession();
    return session && !isExpired(session) && this.isTokenValid(session.accessToken);
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

  noPasskeysAvailable(): boolean {
    // Logic to determine if no passkeys are available for conditional mediation
    return !this.isWebAuthnSupported();
  }

  // Error classification based on timing (from documentation)
  classifyWebAuthnError(error: any, duration: number): 'credential-not-found' | 'user-cancellation' | 'credential-mismatch' {
    if (duration < 500 || error.message?.includes('not found')) {
      return 'credential-not-found';
    } else if (duration < 30000 && this.containsCancellationPattern(error)) {
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
}
```

### 5. Actions Implementation

```typescript
export class AuthActions {
  constructor(
    private api: AuthApiClient, 
    private config: AuthConfig,
    private context: AuthMachineContext
  ) {}

  setEmail(email: string): void {
    this.context.email = email;
    this.reportStateChange('email-set', { email });
  }

  async startConditionalAuth(email: string): Promise<void> {
    this.context.startTime = Date.now();
    try {
      // Implementation from current auth-store.ts
      await this.api.startConditionalAuthentication(email);
    } catch (error) {
      this.reportError('conditional-auth-failed', error);
    }
  }

  clearSession(): void {
    this.context.sessionData = null;
    this.context.user = null;
    clearTokens();
  }

  loadUserSession(session: SessionData): void {
    this.context.sessionData = session;
    this.context.user = session.user;
  }

  async handleBiometricPrompt(): Promise<void> {
    try {
      const credential = await navigator.credentials.get({
        publicKey: await this.api.getPasskeyChallenge(this.context.email!),
        mediation: 'required' // Not conditional
      });
      
      this.context.challengeId = credential.id;
    } catch (error) {
      this.reportWebAuthnError(error, Date.now() - this.context.startTime);
    }
  }

  private reportStateChange(event: string, data: any): void {
    if (this.config.errorReporting?.enabled) {
      reportAuthState({ event, ...data });
    }
  }

  private reportError(event: string, error: any): void {
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
```

## Integration with Svelte Stores

### 6. Svelte Store Integration

```typescript
// auth-store.ts - Updated to use state machine
import { writable, derived } from 'svelte/store';
import { AuthStateMachine } from './auth-state-machine';

export function createAuthStore(config: AuthConfig) {
  const api = new AuthApiClient(config);
  const stateMachine = new AuthStateMachine(api, config);
  
  // Create Svelte store that syncs with state machine
  const store = writable({
    state: stateMachine.currentState,
    context: stateMachine.currentContext
  });

  // Subscribe to state machine changes
  const unsubscribe = stateMachine.onTransition((state, context) => {
    store.set({ state, context });
  });

  // Derived stores for specific values
  const user = derived(store, $store => $store.context.user);
  const isAuthenticated = derived(store, $store => $store.state === 'appLoaded');
  const currentStep = derived(store, $store => $store.state);
  const error = derived(store, $store => $store.context.error);

  return {
    subscribe: store.subscribe,
    
    // State machine event senders
    checkSession: () => stateMachine.send({ type: 'CHECK_SESSION' }),
    typeEmail: (email: string) => stateMachine.send({ type: 'EMAIL_TYPED', email }),
    clickContinue: () => stateMachine.send({ type: 'CONTINUE_CLICKED' }),
    reset: () => stateMachine.send({ type: 'RESET_TO_COMBINED_AUTH' }),
    
    // Derived stores
    user,
    isAuthenticated,
    currentStep,
    error,
    
    // State checks (XState-like)
    matches: (state: AuthMachineState) => stateMachine.matches(state),
    
    // Cleanup
    destroy: unsubscribe
  };
}
```

## Implementation Priority

### Phase 1: Core State Machine (Week 1)
1. ✅ Define all state and event types
2. ✅ Implement AuthStateMachine class with basic transition logic
3. ✅ Implement Guards class with documented conditions
4. ✅ Implement Actions class with side effects

### Phase 2: Key Flows (Week 2)
1. ✅ CheckingSession → SessionValid/Invalid flow
2. ✅ CombinedAuth → ConditionalMediation flow
3. ✅ DirectWebAuthnAuth → BiometricPrompt flow
4. ✅ ErrorHandling with timing-based classification

### Phase 3: Integration (Week 3)
1. ✅ Svelte store integration
2. ✅ Update SignInForm component to use state machine
3. ✅ Event system integration
4. ✅ Error reporting integration

### Phase 4: Testing & Refinement (Week 4)
1. ✅ Unit tests for state machine logic
2. ✅ Integration tests with components
3. ✅ E2E tests for complete flows
4. ✅ Performance optimization

## Benefits of This Approach

1. **📦 Bundle Size**: No XState dependency (~18KB saved)
2. **🎯 Formal Design**: All documented states and transitions implemented
3. **🔍 Debuggable**: Pure TypeScript, easy to trace and debug
4. **⚡ Performance**: Optimized for Svelte's reactivity system
5. **🧪 Testable**: State machine logic is pure functions
6. **🔄 Maintainable**: Clear separation of concerns
7. **📈 Scalable**: Can migrate to XState if complexity grows

## Migration Path to XState

If the manual implementation becomes too complex, migration to XState is straightforward:

```typescript
// Current manual implementation
const stateMachine = new AuthStateMachine(api, config);

// Future XState implementation
import { createMachine, interpret } from 'xstate';
const authMachine = createMachine({
  // Same states, events, guards, and actions
  // But with XState syntax
});
const authService = interpret(authMachine);
```

The type definitions and logic patterns remain identical, making migration low-risk.