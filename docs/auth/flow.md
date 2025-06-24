# Authentication Flow Documentation

This document provides detailed flow diagrams and explanations for the Thepia authentication system implemented in `@thepia/flows-auth`.

## Complete Authentication Flow

```mermaid
flowchart TD
    A[User visits app] --> B[Check existing session]
    B -->|Valid session| C[Load authenticated app]
    B -->|No session| D[Show sign-in form]
    
    D --> E[User enters email]
    E --> F[Check email in system]
    
    F -->|User exists + has passkeys| G[Show passkey option]
    F -->|User exists + no passkeys| H[Show magic link option]
    F -->|User doesn't exist| I[Show registration flow]
    
    G --> J[User clicks passkey sign-in]
    J --> K[Get WebAuthn challenge]
    K --> L[Show biometric prompt]
    L -->|Success| M[Verify assertion]
    L -->|Failed| N[Show error + retry]
    
    H --> O[User clicks magic link]
    O --> P[Send magic link email]
    P --> Q[User clicks email link]
    Q --> R[Validate magic link token]
    
    M -->|Valid| S[Create session tokens]
    R -->|Valid| S
    S --> T[Store tokens locally]
    T --> C
    
    N --> G
    M -->|Invalid| N
    R -->|Invalid| U[Show magic link error]
    U --> H
```

## State Machine Flow

The authentication system uses a state machine to manage the complex authentication flow:

### State Transitions

```mermaid
stateDiagram-v2
    [*] --> checkingSession
    
    checkingSession --> sessionValid : VALID_SESSION
    checkingSession --> sessionInvalid : INVALID_SESSION
    
    sessionValid --> loadingApp
    loadingApp --> authenticated
    
    sessionInvalid --> combinedAuth : USER_CLICKS_NEXT
    
    combinedAuth --> conditionalMediation : EMAIL_TYPED
    combinedAuth --> explicitAuth : CONTINUE_CLICKED
    
    conditionalMediation --> biometricPrompt : PASSKEY_SELECTED
    conditionalMediation --> waitForExplicit : NO_PASSKEYS
    
    waitForExplicit --> explicitAuth : CONTINUE_CLICKED
    
    explicitAuth --> auth0UserLookup
    auth0UserLookup --> passkeyAuth : HAS_PASSKEYS
    auth0UserLookup --> magicLinkAuth : NO_PASSKEYS
    
    passkeyAuth --> biometricPrompt : CHALLENGE_READY
    passkeyAuth --> error : CHALLENGE_FAILED
    
    biometricPrompt --> verifyingAssertion : ASSERTION_CREATED
    biometricPrompt --> error : ASSERTION_FAILED
    
    verifyingAssertion --> authenticated : ASSERTION_VALID
    verifyingAssertion --> error : ASSERTION_INVALID
    
    magicLinkAuth --> magicLinkSent : LINK_SENT
    magicLinkSent --> authenticated : LINK_CLICKED
    
    error --> combinedAuth : RETRY
    error --> [*] : RESET
    
    authenticated --> [*] : SIGN_OUT
```

## WebAuthn Passkey Flow

### Detailed Passkey Authentication

```mermaid
sequenceDiagram
    participant U as User
    participant C as SignInForm
    participant S as State Machine
    participant A as Auth API
    participant W as WebAuthn API
    participant Auth0 as Auth0
    
    Note over U,Auth0: Passkey Authentication Flow
    
    U->>C: Enters email
    C->>S: EMAIL_TYPED event
    S->>A: checkEmail(email)
    A->>Auth0: User lookup
    Auth0-->>A: User data + passkey info
    A-->>S: {exists: true, hasPasskey: true}
    
    S->>S: Transition to conditionalMediation
    S->>W: navigator.credentials.get({mediation: 'conditional'})
    
    alt Conditional Mediation Available
        W-->>U: Show passkey suggestions in email field
        U->>W: Selects passkey from autofill
        W-->>S: PASSKEY_SELECTED event
    else No Conditional Mediation
        S->>S: Transition to waitForExplicit
        U->>C: Clicks "Continue" button
        C->>S: CONTINUE_CLICKED event
    end
    
    S->>S: Transition to explicitAuth
    S->>A: getPasskeyChallenge(email)
    A->>Auth0: Generate WebAuthn challenge
    Auth0-->>A: Challenge data
    A-->>S: Challenge response
    
    S->>S: Transition to biometricPrompt
    S->>W: navigator.credentials.get(challenge)
    W->>U: Biometric prompt (TouchID/FaceID/etc)
    
    alt Biometric Success
        U-->>W: Provides biometric
        W-->>S: Credential assertion
        S->>S: Transition to verifyingAssertion
        S->>A: signInWithPasskey(assertion)
        A->>Auth0: Verify assertion
        Auth0-->>A: User + access tokens
        A-->>S: Authentication success
        S->>S: Transition to authenticated
    else Biometric Failed
        W-->>S: Authentication error
        S->>S: Transition to error
        S-->>C: Show error message
    end
```

## Magic Link Flow

### Email-Based Authentication

```mermaid
sequenceDiagram
    participant U as User
    participant C as SignInForm
    participant S as State Machine
    participant A as Auth API
    participant E as Email Service
    participant Auth0 as Auth0
    
    Note over U,Auth0: Magic Link Authentication Flow
    
    U->>C: Enters email (no passkeys available)
    C->>S: EMAIL_TYPED event
    S->>A: checkEmail(email)
    A-->>S: {exists: true, hasPasskey: false}
    
    U->>C: Clicks "Send Magic Link"
    C->>S: CONTINUE_CLICKED event
    S->>S: Transition to magicLinkAuth
    
    S->>A: signInWithMagicLink(email)
    A->>Auth0: Generate magic link
    Auth0->>E: Send email with link
    E-->>U: Magic link email
    
    S->>S: Transition to magicLinkSent
    S-->>C: Show "Check your email" message
    
    U->>E: Clicks magic link in email
    E->>A: Magic link validation
    A->>Auth0: Validate magic link token
    Auth0-->>A: User + access tokens
    A-->>U: Redirect to app with tokens
    
    Note over U: User returns to app with tokens
    U->>C: App loads with tokens in URL
    C->>S: LINK_CLICKED event
    S->>S: Transition to authenticated
```

## Error Handling Flow

### Comprehensive Error Management

```mermaid
flowchart TD
    A[Authentication Error] --> B{Error Type}
    
    B -->|WebAuthn Error| C[Passkey Error Handler]
    B -->|Network Error| D[Network Error Handler]
    B -->|API Error| E[API Error Handler]
    B -->|Session Error| F[Session Error Handler]
    
    C --> G{Recoverable?}
    G -->|Yes| H[Show retry option]
    G -->|No| I[Show fallback options]
    
    D --> J[Show offline message]
    J --> K[Retry when online]
    
    E --> L{Status Code}
    L -->|401| M[Clear session + restart]
    L -->|403| N[Show access denied]
    L -->|429| O[Show rate limit message]
    L -->|500| P[Show server error]
    
    F --> Q[Clear invalid session]
    Q --> R[Restart auth flow]
    
    H --> S[User retries]
    I --> T[Switch to magic link]
    K --> U[Resume auth flow]
    M --> V[Fresh sign-in]
    
    S --> W[Retry authentication]
    T --> X[Magic link flow]
    U --> W
    V --> Y[Show sign-in form]
```

## Session Management Flow

### Token Lifecycle

```mermaid
sequenceDiagram
    participant A as App
    participant S as Auth Store
    participant L as Local Storage
    participant API as Auth API
    
    Note over A,API: Session Initialization
    
    A->>S: App starts
    S->>L: Check stored tokens
    L-->>S: Access token + refresh token
    S->>S: Validate token expiration
    
    alt Token Valid
        S-->>A: Authenticated state
    else Token Expired
        S->>API: refreshToken(refreshToken)
        API-->>S: New access token
        S->>L: Store new tokens
        S-->>A: Authenticated state
    else No Valid Tokens
        S-->>A: Unauthenticated state
    end
    
    Note over A,API: Background Token Refresh
    
    loop Every 30 minutes
        S->>S: Check token expiration
        alt Token expires soon
            S->>API: refreshToken(refreshToken)
            API-->>S: New tokens
            S->>L: Update stored tokens
        end
    end
    
    Note over A,API: Sign Out
    
    A->>S: signOut()
    S->>API: logout(refreshToken)
    S->>L: Clear all tokens
    S-->>A: Unauthenticated state
```

## Cross-Domain Session Flow

### Multi-Domain Authentication

```mermaid
sequenceDiagram
    participant U as User
    participant T as thepia.com
    participant F as flows.thepia.net
    participant API as api.thepia.com
    
    Note over U,API: Cross-Domain Session Sharing
    
    U->>T: Authenticated on thepia.com
    T->>API: Has valid session
    
    U->>F: Clicks link to flows app
    F->>API: Check session validity
    API-->>F: Session valid for thepia.net
    F-->>U: Authenticated access granted
    
    Note over U,API: Domain-Specific Storage
    
    T->>T: Stores tokens for thepia.com
    F->>F: Stores tokens for thepia.net
    
    Note over U,API: Unified Backend Validation
    
    T->>API: API calls with thepia.com origin
    F->>API: API calls with thepia.net origin
    API->>API: Validates both domains
```

## Performance Optimizations

### Conditional Mediation Flow

```mermaid
flowchart TD
    A[Email field focused] --> B{Conditional mediation supported?}
    
    B -->|Yes| C[Start conditional mediation]
    B -->|No| D[Standard email input]
    
    C --> E[Browser shows passkey suggestions]
    E --> F{User selects passkey?}
    
    F -->|Yes| G[Immediate authentication]
    F -->|No| H[Continue with email]
    
    D --> H
    H --> I[User clicks continue]
    I --> J[Explicit passkey flow]
    
    G --> K[Authenticated]
    J --> L[Biometric prompt]
    L --> K
```

This flow provides the optimal user experience by:
- Showing passkey options immediately when available
- Falling back gracefully when not supported
- Minimizing user interaction steps
- Providing clear feedback at each stage

## Related Documentation

- **[State Management](./state-management.md)** - Detailed state machine documentation
- **[API Reference](./api-reference.md)** - Complete API documentation
- **[Security Model](../flows/security.md)** - Security architecture
- **[Troubleshooting](../troubleshooting/README.md)** - Common flow issues
