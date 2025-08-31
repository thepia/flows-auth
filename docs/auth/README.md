# Authentication System Documentation

This document provides the complete specification for the Thepia authentication system as implemented in the `@thepia/flows-auth` library.

## Two Primary User Scenarios

The Thepia authentication system is built around **two distinct user scenarios**, each with tailored flows and requirements:

### 1. Individual Registration (app.thepia.net + App Store)

**Context:**
- **Access Points**: 
  - `app.thepia.net` - Web application
  - App Store installations - Mobile/desktop apps
- **Audience**: General public users (self-service)
- **Purpose**: Individual Thepia account creation for personal workflow use
- **Security Model**: Mandatory email verification required

**Registration Flow:**
1. User visits `app.thepia.net` or installs app from App Store
2. User enters email address for account creation
3. System creates Auth0 account with `email_verified: false`
4. System sends verification email with magic link
5. User clicks link to verify email ownership
6. User can optionally add passkey for convenience
7. User gains full access to their individual Thepia account

**Key Requirement**: Email verification is mandatory to prevent spam and ensure valid contact information.
**Note**: This creates a standalone individual account, separate from any organization/workflow invitations.

### 2. Invitation-Based App Access (specific thepia.net subdomains)

**Context:**
- **Domains**: Specific App ID subdomains (e.g., `onboarding.acme.thepia.net`, `workflows.beta.thepia.net`)
- **Audience**: Users invited to specific workflow applications
- **Purpose**: Grant access to a specific Thepia app/workflow instance
- **Security Model**: Invitation token grants access to specific App ID

**Access Flow:**
1. Administrator/system sends invitation email for specific App ID with secure token (JWT)
2. User clicks invitation link containing token + App ID + subdomain
3. System validates token and checks user status:
   - **New User**: Creates account with `email_verified: true` (token proves email ownership)
   - **Existing User**: Adds App ID access to existing account
4. User gains access to the specific workflow app at the subdomain
5. User recommended to add passkey for enhanced security

**Key Principles**: 
- **App-Specific Access**: Each invitation grants access to one specific App ID
- **Existing User Support**: Users with accounts can receive additional app invitations
- **Token-Based Verification**: Invitation delivery proves email ownership for new users

## Authentication Methods

Both scenarios support the same authentication methods with different emphasis:

### Email Links (Primary Method)
- **Universal Compatibility**: Works on all devices and browsers
- **Process**: Time-limited magic links sent to verified email
- **Security**: Single-use tokens with expiration
- **Always Available**: Fallback option regardless of device capability

### Passkeys (Optional Enhancement)
- **Benefits**: Faster authentication, phishing resistant, offline capable
- **Individual Users**: Optional convenience feature
- **Business Users**: Recommended for enhanced security
- **Domain Isolation**: Separate passkeys per domain (app.thepia.net vs flows.thepia.net)

## State Machine

The authentication flow is managed by a comprehensive state machine. See **[Authentication State Machine](./authentication-state-machine.md)** for the complete specification.

### Key State Flows

#### Individual Registration Path (app.thepia.net + App Store)
```
emailEntry → userLookup → individualRegistration → 
emailVerificationRequired → emailVerificationSent → 
emailVerified → passkeyOptional → authenticated
```

#### App Invitation Path (existing user receiving app access)
```
emailEntry (with token) → userLookup → existingUserAuth → 
invitationValidation → appAccessGranted → authenticated
```

#### New User Invitation Path (new user via app invitation)
```
emailEntry (with token) → invitationValidation → 
preVerifiedAccount → passkeyRecommended → authenticated
```

#### Existing User Path
```
emailEntry → userLookup → existingUserAuth → 
authMethodSelection → [emailLinkAuth | passkeyAuth] → authenticated
```

## API Integration

### Available Endpoints (thepia.com/src/api)

#### Core Authentication
- `POST /auth/check-user` - Check user existence, email verification status, and domain-specific WebAuthn credentials
- `POST /auth/register` - Create user account (handles both individual and invitation scenarios)
- `POST /auth/send-verification` - Send email verification link to existing users

#### Email Authentication
- `POST /auth/start-passwordless` - **UNCLEAR PURPOSE** - Sends login email for existing verified users
- `GET /auth/passwordless-status` - Check status of email authentication (polling endpoint)
- `GET /auth/passwordless-callback` - OAuth callback for email link completion

#### WebAuthn/Passkey Management
- `POST /auth/webauthn/register-options` - Get WebAuthn registration challenge options
- `POST /auth/webauthn/register-verify` - Complete WebAuthn credential registration
- `POST /auth/webauthn/challenge` - Get WebAuthn authentication challenge
- `POST /auth/webauthn/verify` - Verify WebAuthn authentication response
- `POST /auth/webauthn/cleanup-invalid` - Clean up invalid/corrupted WebAuthn credentials
- `POST /auth/webauthn/authenticator` - Additional WebAuthn utilities

#### Session Management
- `POST /auth/refresh` - Refresh authentication tokens
- `POST /auth/logout` - End user session

### Implementation Status

✅ **Fully Implemented:**
- User existence checking with email verification status and domain-specific WebAuthn credentials
- User registration for both individual and invitation scenarios (single endpoint handles both)
- Email verification flow via Auth0 Management API
- Passwordless magic link authentication with cross-device polling
- Complete WebAuthn/passkey registration and authentication
- Domain-specific credential storage (thepia.com vs thepia.net isolation)
- Session management with refresh and logout

⚠️ **Areas Requiring flows-auth Integration:**
- Frontend integration of passwordless authentication polling
- App invitation token validation logic (backend handles invitation tokens in registration)
- Proper JWT token handling in client library

## Current API Problems & Planned Improvements

### Email Authentication Confusion

**Current State (Problematic):**
- **Two email endpoints** with unclear purposes:
  - `/auth/send-verification` - Sends verification email to unverified users
  - `/auth/start-passwordless` - **UNCLEAR WHEN TO USE** - Appears to send login emails

**What Should Happen (Planned):**

1. **`POST /auth/register`** - Should handle email resending
   - New user → Create account + send verification email
   - Existing unverified user → Resend verification email  
   - Existing verified user → Error (they should use login flow)

2. **Email links should serve dual purpose:**
   - **Unverified user clicks link** → Email gets verified AND user gets authenticated
   - **Verified user uses email authentication** → User gets authenticated

3. **Single email authentication flow:**
   - All email links go through same verification/authentication process
   - Backend determines if it's verifying email or just authenticating
   - Frontend gets same token response either way

### Planned API Redesign

**Enhanced/Keep:**
- `POST /auth/register` (handles new users + resending verification emails)
- `GET /auth/passwordless-status` (for polling email authentication)
- `GET /auth/passwordless-callback` (for OAuth completion)

**New Login Endpoints:**
- `POST /auth/send-login-link` - Send magic link email to existing verified users for login
- `POST /auth/send-login-code` - Send numeric code via email for existing verified users (alternative to magic link)

**Remove/Deprecate:**
- `POST /auth/send-verification` (merge functionality into register)
- `POST /auth/start-passwordless` (remove - purpose unclear and confusing name)

**Clear Endpoint Purposes:**
- **`/auth/register`** - Account creation + verification email resending
- **`/auth/send-login-link`** - Login via magic link for verified users
- **`/auth/send-login-code`** - Login via numeric code for verified users  
- **Authentication polling** - Same endpoints work for both verification and login flows

**Result:** Crystal clear separation between account creation/verification vs login flows.

**Note:** The API server handles both individual registration and app invitation scenarios through a unified registration endpoint that detects invitation tokens automatically.

## Security Considerations

### Email Verification
- **app.thepia.net**: Mandatory verification prevents account takeover
- **flows.thepia.net**: Invitation tokens provide cryptographic proof of email ownership
- **Token Security**: All tokens must be time-limited and single-use
- **Rate Limiting**: Prevent email bombing and brute force attacks

### Domain Isolation
- **Separate Passkeys**: flows.thepia.net passkeys ≠ app.thepia.net passkeys
- **Session Isolation**: Sessions are domain-specific
- **CORS Validation**: API must validate request origins

### Access Control
- **app.thepia.net**: Open registration with email verification
- **flows.thepia.net**: Invitation-only with token validation
- **Subdomain Isolation**: Client-specific access control

## Component Integration

The flows-auth library provides components that implement these scenarios:

### SignInForm Component
- Detects scenario based on domain and invitation token
- Shows appropriate UI for each scenario
- Handles both email and passkey authentication

### EmailVerificationBanner Component
- Shows for users with unverified emails
- Provides resend functionality
- Clear messaging about verification requirements

### Auth Store
- Manages authentication state machine
- Provides actions for all auth operations
- Reactive state updates for UI components

## Testing Requirements

### Scenario Testing
1. **Individual Registration**: Full app.thepia.net flow with email verification
2. **Invitation-Based**: Complete flows.thepia.net invitation acceptance
3. **Cross-Scenario**: Ensure proper domain isolation
4. **Fallback Testing**: Email links work when passkeys unavailable

### Integration Testing
- No mocking in integration tests (per testing policy)
- Test against real Auth0 backend
- Verify email delivery and token validation
- Test passkey registration and authentication

## Related Documentation

- **[Authentication State Machine](./authentication-state-machine.md)** - Complete state flow specification
- **[API Integration Status](./api-integration-status.md)** - Current implementation status
- **[Testing Policy](../testing/API_CONTRACT_TESTING_POLICY.md)** - No-mocking integration test requirements

For implementation details, see the [thepia.com authentication documentation](https://github.com/thepia/thepia.com/tree/main/docs/auth).