# Authentication State Machine - flows-auth

## Overview

This document defines the complete authentication state machine for the flows-auth library, including the critical email verification states required for secure user onboarding.

**🚨 CRITICAL UPDATE**: Added email verification states to address security gap where users could register with any email without proving ownership.

## State Machine Architecture

```mermaid
stateDiagram-v2
    [*] --> checkingSession
    
    checkingSession --> sessionValid : Valid session found
    checkingSession --> sessionInvalid : No/expired session
    checkingSession --> error : Validation failed
    
    sessionInvalid --> combinedAuth : User interaction
    
    combinedAuth --> conditionalMediation : Email typed
    combinedAuth --> explicitAuth : Continue clicked
    
    conditionalMediation --> biometricPrompt : Passkey selected
    conditionalMediation --> waitForExplicit : No passkeys
    
    waitForExplicit --> explicitAuth : Continue clicked
    
    explicitAuth --> auth0UserLookup : Check user exists
    
    auth0UserLookup --> webauthnRegister : New user
    auth0UserLookup --> webauthnAuth : Existing user
    
    webauthnRegister --> authenticated-unconfirmed : Registration success
    webauthnAuth --> authenticated-confirmed : Auth success (verified user)
    webauthnAuth --> authenticated-unconfirmed : Auth success (unverified user)
    
    authenticated-unconfirmed --> authenticated-confirmed : Email verified
    authenticated-unconfirmed --> unauthenticated : Logout
    
    authenticated-confirmed --> unauthenticated : Logout
    
    biometricPrompt --> webauthnVerification : User interaction
    webauthnVerification --> authenticated-confirmed : Success (verified)
    webauthnVerification --> authenticated-unconfirmed : Success (unverified)
    webauthnVerification --> error : Failed
    
    error --> combinedAuth : Retry
    sessionValid --> authenticated-confirmed : Valid verified session
    sessionValid --> authenticated-unconfirmed : Valid unverified session
```

## State Definitions

### Core Authentication States

#### `checkingSession`
- **Purpose**: Initial state when app loads, checking for existing session
- **Entry Conditions**: App startup, page refresh
- **Actions**: Validate stored tokens, check session expiry, check email verification status
- **Transitions**: 
  - `sessionValid` if valid session found
  - `sessionInvalid` if no session or expired
  - `error` if validation fails

#### `authenticated-unconfirmed` 🚨 NEW
- **Purpose**: User has valid passkey authentication but email not verified
- **Entry Conditions**: Successful registration + passkey setup, but email_verified: false
- **Actions**: 
  - Show limited dashboard with verification prompt
  - Send welcome email with verification link
  - Restrict access to sensitive functionality
- **User Experience**: 
  - Can see basic account information
  - Can access help/support
  - Cannot access full application features
  - Prominent email verification banner
- **Transitions**:
  - `authenticated-confirmed` after email verification
  - `unauthenticated` on logout
  - `error` on verification failure

#### `authenticated-confirmed` 🚨 NEW  
- **Purpose**: User has both valid passkey authentication AND verified email
- **Entry Conditions**: Email verification completed for authenticated user
- **Actions**: Full application access granted
- **User Experience**: Complete access to all features
- **Transitions**:
  - `unauthenticated` on logout
  - `error` on session invalidation

#### `sessionValid`
- **Purpose**: Valid session detected, determine user's verification status
- **Entry Conditions**: Valid tokens found in storage
- **Actions**: Check email verification status from token claims
- **Transitions**:
  - `authenticated-confirmed` if email verified
  - `authenticated-unconfirmed` if email not verified

#### `sessionInvalid`
- **Purpose**: No valid session, user needs to authenticate
- **Entry Conditions**: No tokens, expired tokens, or invalid tokens
- **Actions**: Clear any stored session data
- **Transitions**: `combinedAuth` when user initiates sign-in

### Authentication Flow States

#### `combinedAuth`
- **Purpose**: Email entry with conditional authentication
- **Entry Conditions**: User needs to authenticate
- **Actions**: 
  - Show email input
  - Start conditional mediation when valid email typed
  - Check user existence on continue
- **Transitions**:
  - `conditionalMediation` when email typed
  - `explicitAuth` when continue clicked

#### `conditionalMediation`
- **Purpose**: Non-intrusive passkey discovery
- **Entry Conditions**: Valid email entered
- **Actions**: Attempt conditional WebAuthn authentication
- **Transitions**:
  - `biometricPrompt` if passkey selected
  - `waitForExplicit` if no passkeys available

#### `explicitAuth`
- **Purpose**: Explicit authentication attempt
- **Entry Conditions**: User clicked continue or conditional auth unavailable
- **Actions**: Check if user exists, determine next step
- **Transitions**: `auth0UserLookup` to determine user status

#### `auth0UserLookup`
- **Purpose**: Determine if user exists and authentication method
- **Entry Conditions**: User email provided
- **Actions**: Call Auth0 to check user existence and WebAuthn status
- **Transitions**:
  - `webauthnRegister` if new user
  - `webauthnAuth` if existing user with passkeys
  - `emailLogin` if existing user without passkeys

### Registration States

#### `webauthnRegister`
- **Purpose**: Register new user with passkey
- **Entry Conditions**: New user confirmed, WebAuthn supported
- **Actions**: 
  - Show Terms of Service
  - Create Auth0 user account
  - Register WebAuthn credential
  - Send welcome email with verification link
- **Transitions**:
  - `authenticated-unconfirmed` on successful registration
  - `error` on registration failure

### Authentication States

#### `webauthnAuth`
- **Purpose**: Authenticate existing user with passkey
- **Entry Conditions**: Existing user with WebAuthn credentials
- **Actions**: Perform WebAuthn authentication
- **Transitions**:
  - `authenticated-confirmed` if user email verified
  - `authenticated-unconfirmed` if user email not verified
  - `error` on authentication failure

#### `biometricPrompt`
- **Purpose**: Show biometric authentication prompt
- **Entry Conditions**: Conditional mediation triggered
- **Actions**: Display platform-specific biometric prompt
- **Transitions**: `webauthnVerification` on user interaction

#### `webauthnVerification`
- **Purpose**: Verify WebAuthn response
- **Entry Conditions**: User completed biometric authentication
- **Actions**: Send WebAuthn response to server for verification
- **Transitions**:
  - `authenticated-confirmed` if verified user
  - `authenticated-unconfirmed` if unverified user
  - `error` on verification failure

### Error and Recovery States

#### `error`
- **Purpose**: Handle authentication errors
- **Entry Conditions**: Any authentication step fails
- **Actions**: Display appropriate error message, log error details
- **Transitions**: 
  - `combinedAuth` on retry
  - `unauthenticated` on cancel

#### `unauthenticated`
- **Purpose**: User not authenticated
- **Entry Conditions**: Logout, session expiry, or authentication cancellation
- **Actions**: Clear all session data
- **Transitions**: `combinedAuth` when user initiates sign-in

## Email Verification Flow

### Verification Process

1. **Registration Complete**: User in `authenticated-unconfirmed` state
2. **Welcome Email Sent**: Contains verification link with token
3. **User Clicks Link**: Opens verification page
4. **Token Verification**: Server validates token and updates user
5. **State Transition**: User moves to `authenticated-confirmed`

### Verification Components

#### `EmailVerificationPrompt`
- Shows in `authenticated-unconfirmed` state
- Displays verification status
- Allows resending verification email
- Links to help/support

#### `UnconfirmedUserDashboard`
- Limited functionality view
- Shows what user can/cannot access
- Prominent verification call-to-action
- Access to basic account settings

### API Integration

#### Required Endpoints
- `POST /auth/send-verification-email`
- `POST /auth/verify-email`
- `POST /auth/resend-verification`
- `GET /auth/verification-status`

#### Token Claims
```typescript
interface AuthTokenClaims {
  sub: string;
  email: string;
  email_verified: boolean; // Critical for state determination
  exp: number;
  iat: number;
}
```

## Security Considerations

### Email Verification Security
- **Verification tokens** must be cryptographically secure
- **Token expiry** should be reasonable (24-48 hours)
- **Rate limiting** on verification email sending
- **Audit logging** of all verification attempts

### State Transition Security
- **Token validation** on every state transition
- **Email verification check** before granting full access
- **Session invalidation** if verification status changes
- **Cross-tab synchronization** of verification state

## Implementation Priority

1. **Phase 1**: Add `authenticated-unconfirmed` and `authenticated-confirmed` states
2. **Phase 2**: Implement email verification API endpoints
3. **Phase 3**: Create verification UI components
4. **Phase 4**: Add welcome email system
5. **Phase 5**: Implement state transition logic
6. **Phase 6**: Add comprehensive testing

This state machine ensures users cannot access full functionality without proving email ownership, closing the critical security gap identified in the current system.
