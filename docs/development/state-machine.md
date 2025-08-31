# State Machine Implementation Guide

This document provides implementation guidance for the authentication state machine defined in `/docs/auth/authentication-state-machine.md`.

## Overview

The authentication state machine manages two primary user scenarios:
1. **Individual Registration** (app.thepia.net) - Public registration with email verification
2. **Invitation-Based Registration** (flows.thepia.net) - Private access with pre-verified emails

## Implementation Structure

### State Types

```typescript
// Core authentication states aligned with scenarios
export type AuthState = 
  | 'initializing'
  | 'sessionCheck'
  | 'emailEntry'
  | 'userLookup'
  | 'scenarioDetection'
  // Individual Registration states
  | 'individualRegistration'
  | 'emailVerificationRequired'
  | 'emailVerificationSent'
  | 'emailVerified'
  | 'passkeyOptional'
  // Invitation-Based states
  | 'invitationRegistration'
  | 'invitationValidation'
  | 'preVerifiedAccount'
  | 'passkeyRecommended'
  // Existing User states
  | 'existingUserAuth'
  | 'authMethodSelection'
  | 'emailLinkAuth'
  | 'emailLinkSent'
  | 'emailLinkVerification'
  | 'passkeyAuth'
  | 'passkeyChallenge'
  | 'passkeyVerification'
  // Terminal states
  | 'authenticated'
  | 'error';
```

### Context Data

```typescript
interface AuthContext {
  // User information
  email?: string;
  userId?: string;
  userExists: boolean;
  emailVerified: boolean;
  
  // Scenario context
  domain: 'app.thepia.net' | 'flows.thepia.net' | string;
  scenario: 'individual' | 'invitation';
  invitationToken?: string;
  
  // Authentication methods
  hasPasskeys: boolean;
  availableMethods: ('email' | 'passkey')[];
  
  // Session data
  sessionTokens?: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  };
  
  // Error handling
  lastError?: string;
  retryCount: number;
}
```

## State Transitions

### Scenario Detection Logic

```typescript
function detectScenario(context: AuthContext): AuthState {
  const { userExists, domain, invitationToken } = context;
  
  if (!userExists && domain === 'app.thepia.net') {
    return 'individualRegistration';
  } else if (!userExists && invitationToken) {
    return 'invitationRegistration';
  } else if (userExists) {
    return 'existingUserAuth';
  } else {
    return 'error';
  }
}
```

### Email Verification Handling

```typescript
function handleEmailVerification(context: AuthContext): AuthState {
  const { scenario, emailVerified } = context;
  
  if (scenario === 'individual' && !emailVerified) {
    return 'emailVerificationRequired';
  } else if (scenario === 'invitation') {
    // Invitation tokens pre-verify email
    return 'preVerifiedAccount';
  } else {
    return 'authMethodSelection';
  }
}
```

## Integration with Auth Store

### Store Actions

```typescript
class AuthStore {
  // Individual Registration actions
  async registerIndividual(email: string) {
    // Create account with email_verified: false
    // Transition to emailVerificationRequired
  }
  
  async sendVerificationEmail(email: string) {
    // Send verification email
    // Transition to emailVerificationSent
  }
  
  // Invitation-Based actions
  async registerWithInvitation(token: string) {
    // Validate token and create pre-verified account
    // Transition to preVerifiedAccount
  }
  
  // Authentication actions
  async authenticateWithEmail(email: string) {
    // Send magic link
    // Transition to emailLinkSent
  }
  
  async authenticateWithPasskey(email: string) {
    // Initiate WebAuthn flow
    // Transition through passkey states
  }
}
```

### State Updates

```typescript
function updateState(newState: AuthState, context: Partial<AuthContext>) {
  // Update store state
  store.update(s => ({
    ...s,
    state: newState,
    context: { ...s.context, ...context }
  }));
  
  // Emit state change event
  emit('state_change', { from: currentState, to: newState });
  
  // Trigger side effects
  handleStateEffects(newState, context);
}
```

## Component Integration

### SignInForm Component

```typescript
// Component reacts to state changes
$: {
  switch ($authStore.state) {
    case 'emailEntry':
      showEmailInput = true;
      break;
    case 'emailVerificationRequired':
      showVerificationPrompt = true;
      break;
    case 'authMethodSelection':
      showAuthOptions = true;
      break;
    // ... handle other states
  }
}
```

### EmailVerificationBanner

```typescript
// Show banner for unverified users
$: showBanner = $authStore.state === 'emailVerificationRequired' ||
                ($authStore.context.emailVerified === false);
```

## Error Handling

### Error State Management

```typescript
function handleError(error: Error, fromState: AuthState): AuthState {
  // Log error for debugging
  console.error(`Error in state ${fromState}:`, error);
  
  // Update context with error
  updateState('error', {
    lastError: error.message,
    retryCount: context.retryCount + 1
  });
  
  // Determine recovery path
  return getRecoveryState(fromState, error);
}
```

### Recovery Strategies

```typescript
function getRecoveryState(fromState: AuthState, error: Error): AuthState {
  // Network errors - retry same state
  if (error.name === 'NetworkError') {
    return fromState;
  }
  
  // Invalid token - return to email entry
  if (error.message.includes('invalid token')) {
    return 'emailEntry';
  }
  
  // Default - return to email entry
  return 'emailEntry';
}
```

## Testing State Transitions

### Unit Tests

```typescript
describe('State Machine', () => {
  it('routes new app.thepia.net users to individual registration', () => {
    const context = {
      userExists: false,
      domain: 'app.thepia.net',
      invitationToken: undefined
    };
    
    const nextState = detectScenario(context);
    expect(nextState).toBe('individualRegistration');
  });
  
  it('routes invitation users to pre-verified flow', () => {
    const context = {
      userExists: false,
      domain: 'flows.thepia.net',
      invitationToken: 'valid-token'
    };
    
    const nextState = detectScenario(context);
    expect(nextState).toBe('invitationRegistration');
  });
});
```

### Integration Tests

```typescript
describe('Full Authentication Flow', () => {
  it('completes individual registration with email verification', async () => {
    // Start at email entry
    await authStore.enterEmail('user@example.com');
    expect(authStore.state).toBe('individualRegistration');
    
    // Register account
    await authStore.register();
    expect(authStore.state).toBe('emailVerificationRequired');
    
    // Send verification
    await authStore.sendVerification();
    expect(authStore.state).toBe('emailVerificationSent');
    
    // Simulate clicking verification link
    await authStore.verifyEmail(token);
    expect(authStore.state).toBe('emailVerified');
  });
});
```

## Best Practices

1. **State Immutability**: Never modify state directly, always create new state objects
2. **Side Effect Isolation**: Keep side effects in dedicated functions, not in state transition logic
3. **Error Recovery**: Always provide a path back to a valid state from error conditions
4. **State Persistence**: Consider persisting state machine state for recovery after page refresh
5. **Event Logging**: Log all state transitions for debugging and analytics

This implementation guide ensures the state machine correctly handles both authentication scenarios while maintaining clean separation of concerns and testability.