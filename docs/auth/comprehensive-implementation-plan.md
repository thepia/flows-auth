# Comprehensive Authentication Implementation Plan

## Overview

This document provides a complete implementation plan for the flows-auth library to achieve feature parity with thepia.com's authentication system, including comprehensive test coverage for 100% reliability.

**CRITICAL REQUIREMENT**: The flows-auth library MUST offer the complete sign-in AND sign-up experience equivalent to thepia.com's authentication system. This includes:

- **Complete user registration flow** with Terms of Service acceptance
- **🚨 EMAIL VERIFICATION SYSTEM** - Critical security gap identified
- **WebAuthn passkey setup and management**
- **All authentication methods** (passkeys, magic links, conditional mediation)
- **Full session management** and token handling
- **Comprehensive error handling** and recovery flows
- **All UI components** for every authentication state
- **100% test coverage** equivalent to thepia.com's auth system

The library cannot be considered complete until it provides the full authentication experience that users expect from thepia.com.

## 🚨 CRITICAL: Demo App Locations

**Demo apps are located in `examples/` directory, NOT `src/demo-app/`:**

```
/Volumes/Projects/Thepia/flows-auth/
├── examples/
│   ├── tasks-app-demo/          # ✅ CURRENT: Task management demo app
│   └── flows-app-demo/          # ✅ CURRENT: General flows demo app
├── src/
│   ├── components/              # Library components (SignInForm, RegistrationForm, etc.)
│   ├── stores/                  # Auth stores
│   └── index.ts                 # Main library exports
└── docs/                        # Documentation
```

**NEVER reference `src/demo-app/` - it does not exist!**

### **Demo App Implementation Status**

#### **tasks-app-demo** (Current Focus)
- ✅ **Exists**: `/examples/tasks-app-demo/`
- ❌ **Using library components**: Currently uses custom `AuthForm.svelte`
- 🎯 **Next Step**: Update to use `SignInForm` and `RegistrationForm` from library

#### **flows-app-demo** (Future)
- ✅ **Exists**: `/examples/flows-app-demo/`
- ❌ **Using library components**: Needs to be updated to use standard library features
- 🎯 **Future Step**: Update to use library components after tasks-app-demo

## 🚨 CRITICAL SECURITY GAP: Email Verification Missing

### **Current Vulnerability**
Analysis of thepia.com reveals a critical security gap:

1. **Users created with `email_verified: false`** in Auth0
2. **No welcome email or verification process** implemented
3. **Immediate full access** after passkey registration
4. **No proof of email ownership** required

**Attack Vector**: Anyone can register with any email address and gain immediate access without proving they own that email.

## 🚨 CRITICAL INSIGHT: AUTOMATIC FLOW DETECTION

**FUNDAMENTAL PRINCIPLE**: thepia.com does NOT use separate sign-in and registration forms or manual mode toggles. It uses **automatic flow detection** based on user existence.

### **How thepia.com Actually Works:**

#### **Single Unified Authentication Form**
```typescript
// 1. User enters email in single form
// 2. System automatically checks user existence
const userCheck = await auth0Service.checkUser(email);

// 3. System automatically selects flow based on result
if (userCheck.exists && userCheck.hasWebAuthn) {
  // → Sign-in flow with passkey authentication
} else if (userCheck.exists) {
  // → Sign-in flow with magic link/password
} else {
  // → Registration flow with Terms of Service
}
```

#### **Critical Implementation Requirements:**
1. **Single Form Component**: Use `SignInForm` that handles both flows internally
2. **Automatic User Detection**: Call `checkUser(email)` API on email entry
3. **Dynamic Flow Adaptation**: Form adapts UI based on user existence
4. **No Manual Mode Selection**: Never show "Sign In" vs "Register" buttons
5. **Seamless Transitions**: User doesn't know which flow they're in

#### **WRONG APPROACH** ❌
```svelte
<!-- DON'T DO THIS - Manual mode selection -->
<button on:click={() => mode = 'signin'}>Sign In</button>
<button on:click={() => mode = 'register'}>Register</button>

{#if mode === 'signin'}
  <SignInForm />
{:else}
  <RegistrationForm />
{/if}
```

#### **CORRECT APPROACH** ✅
```svelte
<!-- Single form that auto-detects flow -->
<SignInForm
  config={authConfig}
  on:success={handleAuthSuccess}
  on:error={handleAuthError}
/>
```

### **Required Email Verification System**

#### **New Authentication States Required**
```typescript
type AuthState =
  | 'unauthenticated'
  | 'authenticated-unconfirmed'  // NEW: Logged in but email not verified
  | 'authenticated-confirmed'    // Full access after email verification
  | 'loading'
  | 'error'
```

#### **User Confirmation Flow**
```typescript
// After successful registration + passkey setup
const registrationResult = {
  step: 'email-verification-required',
  user: { ...userInfo, emailVerified: false },
  accessToken: limitedAccessToken, // Restricted permissions
  verificationEmailSent: true
}

// User receives welcome email with verification link
// Click link → verify email → upgrade to full access
```

## Current State Analysis

### Implemented (≈20% of full functionality)
- Basic auth store with simple state management
- Basic passkey authentication (incomplete)
- Simple error reporting
- Basic service worker integration (for sync, not auth)

### Missing (≈80% of full functionality)
- Complete state machine with all 15+ states
- User registration and onboarding flow
- Auth0 integration and user management
- Conditional mediation and auto-authentication
- Comprehensive error handling and recovery
- Email magic link authentication
- Session management and validation
- UI components for all authentication states
- API endpoints for user lookup and management

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1-2)

#### 1.1 Complete State Machine Implementation
**File**: `src/stores/auth-state-machine.ts`

```typescript
type AuthMachineState = 
  | 'checkingSession' | 'sessionValid' | 'sessionInvalid'
  | 'combinedAuth' | 'conditionalMediation' | 'autoAuth'
  | 'auth0UserLookup' | 'directWebAuthnAuth' | 'passkeyRegistration'
  | 'webauthn-register' | 'email-sent' | 'credential-recovery'
  | 'errorHandling' | 'credentialNotFound' | 'userCancellation'
  | 'credentialMismatch' | 'passkeyOptions' | 'retryPrompt'
  | 'passkeyResetup' | 'emailFallback' | 'loadingApp';

type AuthMachineEvent =
  | { type: 'VALID_SESSION'; session: SessionData }
  | { type: 'INVALID_SESSION' }
  | { type: 'EMAIL_TYPED'; email: string }
  | { type: 'CONTINUE_CLICKED' }
  | { type: 'PASSKEY_SELECTED' }
  | { type: 'USER_EXISTS'; hasWebAuthn: boolean }
  | { type: 'USER_NOT_FOUND' }
  | { type: 'WEBAUTHN_SUCCESS'; user: User }
  | { type: 'WEBAUTHN_ERROR'; error: AuthError; duration: number }
  | { type: 'REGISTRATION_SUCCESS'; user: User }
  | { type: 'MAGIC_LINK_SENT' }
  | { type: 'RETRY_REQUESTED' }
  | { type: 'USE_DIFFERENT_ACCOUNT' };
```

**Tasks**:
- [ ] Extend state machine with all missing states
- [ ] Implement comprehensive transition logic
- [ ] Add timing-based error classification
- [ ] Implement state persistence and recovery
- [ ] Add comprehensive logging and debugging

#### 1.2 Auth0 Service Integration
**File**: `src/services/auth0Service.ts`

**CRITICAL**: Copy the complete `auth0Service.ts` file wholesale from thepia.com repository. Do NOT re-implement this functionality - the existing implementation is battle-tested and comprehensive.

**Tasks**:
- [ ] Copy complete Auth0Service from thepia.com/src/services/auth0Service.ts
- [ ] Adapt imports and dependencies for flows-auth structure
- [ ] Ensure all Auth0Service methods are properly exported
- [ ] Verify WebAuthn integration works with flows-auth API endpoints
- [ ] Test all authentication flows with copied Auth0Service
- [ ] **CRITICAL**: Copy all authentication test files from thepia.com to achieve equivalent test coverage
- [ ] Adapt thepia.com auth tests for flows-auth structure and ensure 100% test coverage

#### 1.3 API Client Enhancement
**File**: `src/api/auth-api.ts`

```typescript
class AuthApiClient {
  // Add missing endpoints
  async checkUser(email: string): Promise<UserCheckResponse>
  async registerUser(userData: RegisterRequest): Promise<RegisterResponse>
  async getWebAuthnRegisterOptions(userId: string): Promise<RegistrationOptions>
  async verifyWebAuthnRegistration(request: RegistrationVerification): Promise<VerificationResponse>
  async sendMagicLink(email: string): Promise<MagicLinkResponse>
  async validateSession(token: string): Promise<SessionValidation>
  async refreshToken(refreshToken: string): Promise<TokenResponse>
}
```

**Tasks**:
- [ ] Add all missing API endpoints
- [ ] Implement proper error handling and retry logic
- [ ] Add request/response validation
- [ ] Implement rate limiting and throttling
- [ ] Add comprehensive API logging

### Phase 2: Authentication Flows (Week 3-4)

#### 2.1 User Registration Flow
**Files**:
- `src/components/RegistrationForm.svelte`
- `src/components/TermsOfService.svelte`
- `src/components/PasskeySetup.svelte`
- `src/components/EmailVerificationPrompt.svelte`
- `src/components/UnconfirmedUserDashboard.svelte`

**Tasks**:
- [ ] Create complete registration UI with ToS/Privacy Policy
- [ ] Implement WebAuthn credential registration
- [ ] **🚨 CRITICAL: Add email verification system**
- [ ] Create unconfirmed user experience with limited access
- [ ] Implement welcome email sending after registration
- [ ] Add email verification link handling
- [ ] Create upgrade flow from unconfirmed to confirmed
- [ ] Implement user onboarding and preference setup
- [ ] Add registration progress tracking

#### 2.1.1 Email Verification System (CRITICAL)
**Files**:
- `src/api/email-verification.ts`
- `src/components/EmailVerificationPrompt.svelte`
- `src/stores/verification-store.ts`

**Email Verification Flow**:
```typescript
// After successful registration + passkey setup
const registrationResult = {
  step: 'email-verification-required',
  user: { ...userInfo, emailVerified: false },
  accessToken: limitedAccessToken, // Restricted permissions
  verificationEmailSent: true
}

// Send welcome email with verification link
await emailService.sendWelcomeEmail({
  email: user.email,
  verificationToken: generateVerificationToken(),
  userInfo: { name: user.name, registrationDate: new Date() }
});

// User clicks verification link
const verificationResult = await verifyEmailToken(token);
if (verificationResult.success) {
  // Upgrade user to full access
  await upgradeUserToConfirmed(user.id);
}
```

**Required API Endpoints**:
- `POST /auth/send-verification-email` (user-requested resend only)
- `POST /auth/verify-email`
- `POST /auth/resend-verification` (user-requested resend only)

**🚨 CRITICAL: Email Sending Architecture**

**API Server Responsibility**:
- **Automatic welcome email**: API server sends welcome email immediately after successful registration
- **User-requested resends**: Frontend calls API endpoint for manual resend requests
- **Email delivery logic**: All email sending, templating, and delivery handled server-side
- **Rate limiting**: API server prevents email abuse and implements cooldown periods
- **Audit logging**: Server logs all email sending activities for security

**Frontend Responsibility**:
- **Registration completion**: Trigger registration API call
- **Resend requests**: Call API endpoint when user requests email resend
- **UI state management**: Show resend cooldowns and delivery status
- **No direct email sending**: Frontend NEVER sends emails directly

```typescript
// ✅ CORRECT: API server handles email sending
async function handleRegistration() {
  // API server automatically sends welcome email after successful registration
  const result = await auth0Service.registerWebAuthn(email, webauthnUserId);

  if (result.success) {
    // Email already sent by API server
    currentStep = 'authenticated-unconfirmed';
  }
}

async function handleResendEmail() {
  // User-requested resend via API call
  const result = await authApi.resendVerificationEmail(user.email);

  if (result.success) {
    // API server handles actual email sending
    showResendSuccess();
  }
}
```

**Auth State Updates**:
```typescript
type AuthState =
  | 'unauthenticated'
  | 'authenticated-unconfirmed'  // NEW: Has passkey but email not verified
  | 'authenticated-confirmed'    // Full access after email verification
  | 'loading'
  | 'error'
```

#### 2.2 Enhanced Sign-In Flows (CRITICAL: Auto-Detection)
**File**: `src/components/SignInForm.svelte`

**🚨 CRITICAL REQUIREMENT**: The `SignInForm` component MUST implement automatic flow detection exactly like thepia.com:

```typescript
// Email entry triggers automatic user check
async function handleEmailEntry() {
  const userCheck = await authStore.api.checkEmail(email);

  if (userCheck.exists) {
    // → Sign-in flow: Show passkey/magic link options
    if (userCheck.hasPasskey) {
      // Attempt passkey authentication
    } else {
      // Show magic link option
    }
  } else {
    // → Registration flow: Show Terms of Service + passkey setup
    step = 'registration-terms';
  }
}
```

**Implementation Requirements**:
1. **Single Form Interface**: No separate SignInForm/RegistrationForm components
2. **Automatic User Detection**: Call `checkEmail()` API on email submission
3. **Dynamic UI Adaptation**: Form UI changes based on user existence
4. **Seamless Flow Transitions**: User doesn't know which flow they're in
5. **Progressive Enhancement**: Graceful fallback for unsupported devices

**Tasks**:
- [ ] **🚨 CRITICAL**: Implement automatic user detection via `checkEmail()` API
- [ ] **🚨 CRITICAL**: Add dynamic flow switching (sign-in vs registration)
- [ ] **🚨 CRITICAL**: Remove any manual mode selection UI
- [ ] Implement conditional mediation for returning users
- [ ] Add auto-authentication detection
- [ ] Implement device capability detection (Touch ID/Face ID)
- [ ] Add progressive enhancement for unsupported devices
- [ ] Implement smart fallback mechanisms

#### 2.3 Error Handling & Recovery
**Files**:
- `src/utils/errorClassification.ts`
- `src/components/ErrorRecovery.svelte`

**Tasks**:
- [ ] Implement timing-based error classification
- [ ] Add intelligent retry mechanisms
- [ ] Create fallback authentication methods
- [ ] Design user-friendly error messages
- [ ] Implement error reporting and analytics

### Phase 3: Session Management (Week 5)

#### 3.1 Session Validation
**Files**:
- `src/utils/sessionManager.ts`
- `src/utils/tokenManager.ts`

**Tasks**:
- [ ] Implement server-side token validation
- [ ] Add cross-tab synchronization
- [ ] Implement automatic token refresh
- [ ] Add secure session storage
- [ ] Implement session timeout handling

#### 3.2 Logout & Cleanup
**Tasks**:
- [ ] Implement complete Auth0 logout flow
- [ ] Add session cleanup across tabs
- [ ] Implement credential cleanup options
- [ ] Add secure token revocation
- [ ] Implement logout event propagation

### Phase 4: UI Components (Week 6-7)

#### 4.1 Complete SignInForm Component
**File**: `src/components/SignInForm.svelte`

**Tasks**:
- [ ] Implement all authentication states
- [ ] Add progressive UI enhancement
- [ ] Ensure accessibility compliance
- [ ] Add internationalization support
- [ ] Implement responsive design

#### 4.2 Additional Components
**Files**:
- `src/components/AutoAuthPrompt.svelte`
- `src/components/DeviceSetupGuide.svelte`
- `src/components/SessionManager.svelte`

**Tasks**:
- [ ] Create registration form with ToS
- [ ] Build error recovery dialogs
- [ ] Design device setup guidance
- [ ] Implement session management UI
- [ ] Add user preference management

## Test Coverage Strategy

### Unit Tests (Target: 100% Line Coverage)

#### State Machine Tests
**File**: `tests/unit/auth-state-machine.test.ts`

```typescript
describe('AuthStateMachine', () => {
  describe('State Transitions', () => {
    test('checkingSession → sessionValid with valid token')
    test('checkingSession → sessionInvalid with expired token')
    test('sessionInvalid → combinedAuth on user action')
    test('combinedAuth → conditionalMediation on valid email')
    test('combinedAuth → auth0UserLookup on continue click')
    test('auth0UserLookup → directWebAuthnAuth for existing user with passkey')
    test('auth0UserLookup → passkeyRegistration for existing user without passkey')
    test('auth0UserLookup → webauthn-register for new user')
    test('directWebAuthnAuth → loadingApp on success')
    test('directWebAuthnAuth → errorHandling on failure')
    test('errorHandling → credentialNotFound on <500ms timing')
    test('errorHandling → userCancellation on 500ms-30s timing')
    test('errorHandling → credentialMismatch on >30s timeout')
    test('webauthn-register → loadingApp on successful registration')
    test('passkeyRegistration → loadingApp on passkey setup')
    test('emailFallback → email-sent on magic link')
  })

  describe('Guards', () => {
    test('hasValidSession with valid Auth0 token')
    test('hasValidSession with expired token')
    test('isValidEmail with various email formats')
    test('hasWebAuthnCredentials for user with passkeys')
    test('hasWebAuthnCredentials for user without passkeys')
    test('noPasskeysAvailable detection')
    test('isWebAuthnSupported on different browsers')
  })

  describe('Actions', () => {
    test('loadUserSession stores session data')
    test('clearSession removes all stored data')
    test('setEmail updates context')
    test('startConditionalAuth initiates WebAuthn')
    test('reportError logs and reports errors')
  })
})
```

#### Auth Store Tests
**File**: `tests/unit/auth-store.test.ts`

```typescript
describe('AuthStore', () => {
  describe('Authentication Methods', () => {
    test('signIn with valid email and passkey')
    test('signIn with invalid email format')
    test('signIn with non-existent user')
    test('signInWithPasskey success flow')
    test('signInWithPasskey with invalid credential')
    test('signInWithPassword success flow')
    test('signInWithPassword with wrong password')
    test('signInWithMagicLink success flow')
    test('startConditionalAuthentication with valid email')
    test('startConditionalAuthentication with no passkeys')
  })

  describe('Registration', () => {
    test('register new user with passkey')
    test('register new user with email only')
    test('register with existing email')
    test('register with invalid data')
  })

  describe('Session Management', () => {
    test('initialize with valid stored session')
    test('initialize with expired session')
    test('initialize with no session')
    test('refreshToken with valid refresh token')
    test('refreshToken with expired refresh token')
    test('signOut clears all data')
  })

  describe('Event Emission', () => {
    test('emits sign_in_success on successful authentication')
    test('emits sign_in_error on failed authentication')
    test('emits registration_success on successful registration')
    test('emits session_expired on token expiration')
  })
})
```

#### Auth0Service Tests
**File**: `tests/unit/auth0Service.test.ts`

**CRITICAL**: Copy all Auth0Service tests from thepia.com repository to ensure equivalent test coverage.

```typescript
describe('Auth0Service', () => {
  describe('User Management', () => {
    test('checkUser with existing user')
    test('checkUser with non-existent user')
    test('checkUser with invalid email format')
    test('getUserByEmail with valid email')
    test('getUserByEmail with non-existent email')
    test('createUser with valid data')
    test('createUser with duplicate email')
    test('updateUser with valid changes')
  })

  describe('WebAuthn Integration', () => {
    test('authenticateWithWebAuthn success flow')
    test('authenticateWithWebAuthn with invalid credential')
    test('authenticateWithWebAuthn with expired challenge')
    test('authenticateWithWebAuthn with user cancellation')
    test('authenticateWithWebAuthn conditional mediation')
    test('registerWebAuthnCredential success')
    test('registerWebAuthnCredential with invalid data')
    test('getWebAuthnCredentials for user')
    test('deleteWebAuthnCredential')
  })

  describe('Token Management', () => {
    test('getAccessToken with valid session')
    test('getAccessToken with expired session')
    test('refreshAccessToken with valid refresh token')
    test('refreshAccessToken with expired refresh token')
    test('revokeTokens success')
    test('validateToken with valid token')
    test('validateToken with invalid token')
  })

  describe('Error Handling', () => {
    test('handles Auth0 API errors gracefully')
    test('handles network timeouts')
    test('handles rate limiting')
    test('handles malformed responses')
    test('retries failed requests appropriately')
  })
})
```

#### WebAuthn Utility Tests
**File**: `tests/unit/webauthn.test.ts`

```typescript
describe('WebAuthn Utils', () => {
  describe('Browser Support Detection', () => {
    test('isWebAuthnSupported on supported browsers')
    test('isWebAuthnSupported on unsupported browsers')
    test('isConditionalMediationSupported detection')
    test('isPlatformAuthenticatorAvailable detection')
    test('isUserVerifyingPlatformAuthenticatorAvailable detection')
  })

  describe('Credential Management', () => {
    test('authenticateWithPasskey success flow')
    test('authenticateWithPasskey with conditional mediation')
    test('authenticateWithPasskey user cancellation')
    test('authenticateWithPasskey timeout handling')
    test('createPasskey success flow')
    test('createPasskey with user cancellation')
    test('serializeCredential format validation')
    test('deserializeCredential format validation')
  })

  describe('Error Classification', () => {
    test('classifies NotAllowedError correctly')
    test('classifies InvalidStateError correctly')
    test('classifies NotSupportedError correctly')
    test('classifies SecurityError correctly')
    test('classifies AbortError correctly')
    test('classifies timeout errors correctly')
  })
})
```

### Integration Tests (Target: 100% API Coverage)

#### API Client Integration Tests
**File**: `tests/integration/auth-api.test.ts`

```typescript
describe('AuthApiClient Integration', () => {
  describe('User Management Endpoints', () => {
    test('POST /auth/check-user with existing user')
    test('POST /auth/check-user with non-existent user')
    test('POST /auth/register with valid user data')
    test('POST /auth/register with duplicate email')
    test('POST /auth/register with invalid data')
  })

  describe('WebAuthn Endpoints', () => {
    test('POST /auth/webauthn/challenge success')
    test('POST /auth/webauthn/challenge with invalid email')
    test('POST /auth/webauthn/verify success')
    test('POST /auth/webauthn/verify with invalid credential')
    test('POST /auth/webauthn/register-options success')
    test('POST /auth/webauthn/register-verify success')
    test('POST /auth/webauthn/register-verify with invalid data')
  })

  describe('Session Management Endpoints', () => {
    test('POST /auth/refresh with valid refresh token')
    test('POST /auth/refresh with expired refresh token')
    test('POST /auth/signout success')
    test('GET /auth/profile with valid token')
    test('GET /auth/profile with invalid token')
  })

  describe('Error Handling', () => {
    test('handles 401 Unauthorized responses')
    test('handles 403 Forbidden responses')
    test('handles 404 Not Found responses')
    test('handles 429 Rate Limited responses')
    test('handles 500 Server Error responses')
    test('handles network timeouts')
    test('handles malformed JSON responses')
  })
})
```

#### Full Authentication Flow Integration Tests
**File**: `tests/integration/auth-flows.test.ts`

```typescript
describe('Authentication Flows Integration', () => {
  describe('New User Registration Flow', () => {
    test('complete registration with passkey setup')
    test('registration with email verification')
    test('registration with terms acceptance')
    test('registration failure recovery')
  })

  describe('Returning User Authentication Flow', () => {
    test('successful passkey authentication')
    test('conditional mediation auto-authentication')
    test('fallback to magic link')
    test('error recovery and retry')
  })

  describe('Session Management Flow', () => {
    test('automatic token refresh')
    test('cross-tab session synchronization')
    test('session timeout handling')
    test('logout and cleanup')
  })

  describe('Error Recovery Flows', () => {
    test('credential not found recovery')
    test('user cancellation recovery')
    test('network error recovery')
    test('API error recovery')
  })
})
```

### End-to-End Tests (Target: 100% User Journey Coverage)

#### Complete User Journeys
**File**: `tests/e2e/user-journeys.test.ts`

```typescript
describe('Complete User Journeys', () => {
  describe('First-Time User Journey', () => {
    test('discovers app → enters email → registers → sets up passkey → accesses app')
    test('discovers app → enters email → registers → skips passkey → uses magic link')
    test('discovers app → enters invalid email → sees validation → corrects → continues')
  })

  describe('Returning User Journey', () => {
    test('visits app → auto-detects passkey → authenticates → accesses app')
    test('visits app → enters email → conditional auth → authenticates → accesses app')
    test('visits app → enters email → no passkey → uses magic link → accesses app')
  })

  describe('Error Recovery Journeys', () => {
    test('passkey fails → tries again → succeeds')
    test('passkey fails → switches to magic link → succeeds')
    test('network error → retries → succeeds')
    test('API error → shows error → user retries → succeeds')
  })

  describe('Cross-Device Journeys', () => {
    test('registers on desktop → authenticates on mobile')
    test('sets up passkey on mobile → uses on desktop')
    test('loses device → recovers account via email')
  })
})
```

#### Component Integration Tests
**File**: `tests/e2e/components.test.ts`

```typescript
describe('Component Integration E2E', () => {
  describe('SignInForm Component', () => {
    test('email input → validation → continue → authentication')
    test('conditional mediation triggers automatically')
    test('error states display correctly')
    test('loading states work properly')
    test('accessibility features function')
  })

  describe('RegistrationForm Component', () => {
    test('form validation works correctly')
    test('terms acceptance required')
    test('passkey setup integration')
    test('error handling and recovery')
  })

  describe('State Machine Integration', () => {
    test('all state transitions work in UI')
    test('error states display appropriate UI')
    test('loading states show progress')
    test('success states navigate correctly')
  })
})
```

## Test Coverage Requirements Summary

### **CRITICAL REQUIREMENT**: Copy All Tests from thepia.com

**Task**: Copy the complete test suite from thepia.com authentication system to ensure equivalent test coverage:

- [ ] Copy all unit tests from thepia.com/tests/auth/
- [ ] Copy all integration tests from thepia.com/tests/integration/auth/
- [ ] Copy all E2E tests from thepia.com/tests/e2e/auth/
- [ ] Adapt test imports and dependencies for flows-auth structure
- [ ] Ensure all tests pass with flows-auth implementation
- [ ] Achieve 100% line coverage equivalent to thepia.com
- [ ] Implement missing test utilities and mocks
- [ ] Add flows-auth specific test cases for new functionality

### Coverage Targets

- **Unit Tests**: 100% line coverage
- **Integration Tests**: 100% API endpoint coverage
- **E2E Tests**: 100% user journey coverage
- **Component Tests**: 100% UI state coverage
- **Error Handling**: 100% error scenario coverage

This comprehensive test coverage ensures the flows-auth library provides the same reliability and robustness as the thepia.com authentication system.

## Critical Registration Flow Analysis (thepia.com → Svelte)

### **Registration Flow Architecture (Exact Replication Required)**

Based on detailed analysis of thepia.com's registration implementation, the flows-auth library must replicate this exact behavior:

#### **1. Two-Phase Registration Process**
```typescript
// Phase 1: User Account Creation
const registerResult = await auth0Service.registerUser(email);
// Returns: { success: true, user: { id, sub, email, name, initials } }

// Phase 2: WebAuthn Credential Registration
const webauthnUserId = `auth0|passkey-${email}-${Date.now()}-${auth0UserId}`;
const webauthnResult = await auth0Service.registerWebAuthn(email, webauthnUserId);
```

#### **2. Enhanced User ID Format (Critical)**
- **Format**: `auth0|passkey-{email}-{timestamp}-{auth0UserId}`
- **Purpose**: Correlates WebAuthn registration with Auth0 user
- **Example**: `auth0|passkey-user@example.com-1703123456789-auth0|abc123`
- **Usage**: Passed to WebAuthn registration options for user.id

#### **3. State Machine Integration**
```typescript
type AuthStep =
  | 'combined-auth'      // Email entry + user check
  | 'webauthn-register'  // Registration with ToS
  | 'webauthn-setup'     // Post-registration setup
  | 'email-login'        // Fallback method
  | 'credential-mismatch' // Re-registration flow
```

#### **4. Terms of Service Integration (Required)**
- **Checkbox**: Must be checked before registration
- **Links**: `/terms` and `/privacy` pages
- **Validation**: Registration button disabled until ToS accepted
- **Text**: "In order to use the service, you must agree to our Terms of Service and Privacy Policy."

#### **5. Re-Registration Flow (SECURITY CRITICAL)**

**🚨 SECURITY WARNING**: The current re-registration flow in thepia.com has a critical vulnerability that allows account hijacking with only an email address.

**Vulnerable Flow**:
```typescript
// DANGEROUS - DO NOT IMPLEMENT IN PRODUCTION
if (userExists) {
  const cleanupResult = await auth0Service.cleanupInvalidCredentials(
    email,
    'clean-invalid',
    'credential-mismatch-reregister'
  );
  // Attacker can now register their passkey for victim's account
}
```

**Attack Vector**:
1. Attacker knows victim's email
2. Triggers re-registration flow
3. System cleans victim's passkeys
4. Attacker registers their own passkey
5. **Complete account takeover**

**Security Requirements for Production**:

```typescript
// SECURE re-registration flow
async function secureReRegistration(email: string, environment: 'development' | 'production') {
  const userCheck = await auth0Service.checkUser(email);

  if (userCheck.exists) {
    if (environment === 'production') {
      // PRODUCTION: Require additional authentication
      throw new Error('REREGISTRATION_REQUIRES_VERIFICATION');
      // Must redirect to secure verification flow:
      // - Magic link verification
      // - Support PIN/password
      // - Admin-initiated reset
    } else {
      // DEVELOPMENT: Allow for testing (with clear warnings)
      console.warn('🚨 DEVELOPMENT MODE: Re-registration allowed without verification');
      return await cleanupAndReregister(email);
    }
  }
}
```

**Production Re-Registration Requirements**:

1. **Magic Link Verification**:
   ```typescript
   // User must verify email ownership first
   const verificationResult = await auth0Service.sendVerificationMagicLink(email);
   // Only after clicking magic link can re-registration proceed
   ```

2. **Support-Initiated Reset**:
   ```typescript
   // Admin/support generates secure reset token
   const resetToken = await generateSupportResetToken(email, supportAgentId);
   // User must provide reset token to proceed
   ```

3. **Existing Credential Challenge**:
   ```typescript
   // If user has any working credentials, require one for verification
   const hasWorkingCredentials = await testExistingCredentials(email);
   if (hasWorkingCredentials) {
     throw new Error('USE_EXISTING_CREDENTIAL_FOR_RESET');
   }
   ```

**Implementation Strategy**:
- **Development**: Allow re-registration with prominent warnings
- **Staging**: Require magic link verification
- **Production**: Require magic link + support approval for security

### **Svelte Implementation Strategy**

#### **Component Architecture**
```svelte
<!-- Main Auth Component -->
<AuthModal bind:isOpen {onClose}>
  {#if currentStep === 'combined-auth'}
    <EmailEntry bind:email on:continue={handleEmailContinue} />
  {:else if currentStep === 'webauthn-register'}
    <RegistrationForm
      {email}
      {userExists}
      bind:tosChecked
      on:register={handleRegistration}
    />
  {:else if currentStep === 'webauthn-setup'}
    <PasskeySetup {email} on:complete={handleSetupComplete} />
  {/if}
</AuthModal>
```

#### **State Management (Svelte Stores)**
```typescript
// Registration store
export const registrationStore = writable({
  currentStep: 'combined-auth',
  email: '',
  userExists: false,
  tosChecked: false,
  isLoading: false,
  error: null,
  userId: null
});

// Registration actions
export const registrationActions = {
  async checkUser(email: string) {
    const result = await auth0Service.checkUser(email);
    registrationStore.update(state => ({
      ...state,
      userExists: result.exists,
      currentStep: result.exists ? 'webauthn-register' : 'webauthn-register'
    }));
  },

  async registerUser(email: string, tosAccepted: boolean) {
    if (!tosAccepted) throw new Error('Terms of Service must be accepted');

    // Phase 1: Create user account
    const registerResult = await auth0Service.registerUser(email);

    // Phase 2: Register WebAuthn credential
    const webauthnUserId = `auth0|passkey-${email}-${Date.now()}-${registerResult.user.sub}`;
    const webauthnResult = await auth0Service.registerWebAuthn(email, webauthnUserId);

    if (webauthnResult.success) {
      registrationStore.update(state => ({ ...state, currentStep: 'webauthn-setup' }));
    }
  }
};
```

#### **Critical Implementation Requirements**

1. **🚨 SECURITY: Re-Registration Protection**
   - **NEVER** implement email-only re-registration in production
   - Require magic link verification for existing users
   - Add environment-based security controls
   - Log all re-registration attempts for security monitoring
   - Consider rate limiting re-registration attempts

2. **Exact API Endpoint Compatibility**
   - Use same endpoints as thepia.com: `/auth/register`, `/auth/webauthn/register-options`, `/auth/webauthn/register-verify`
   - Maintain same request/response formats
   - Handle same error scenarios

2. **Enhanced User ID Generation**
   - Must generate exact same format as thepia.com
   - Include timestamp and Auth0 user ID correlation
   - Pass to WebAuthn registration options

3. **Terms of Service Component**
   ```svelte
   <div class="tos-section">
     <label class="tos-label">
       <input
         type="checkbox"
         bind:checked={tosChecked}
         required
       />
       In order to use the service, you must agree to our
       <a href="/terms" target="_blank">Terms of Service</a> and
       <a href="/privacy" target="_blank">Privacy Policy</a>.
     </label>
   </div>
   ```

4. **Error Handling Parity**
   - Same error classification as thepia.com
   - Credential mismatch detection and cleanup
   - User cancellation handling
   - Network error recovery

5. **Conditional Authentication Integration**
   - Start conditional auth during email entry
   - Handle auto-authentication for returning users
   - Graceful fallback when no passkeys exist

### **Implementation Priority**

1. **Phase 1**: Copy Auth0Service wholesale and adapt for Svelte
2. **Phase 2**: Create registration components with exact ToS integration
3. **Phase 3**: Implement state machine with all thepia.com steps
4. **Phase 4**: Add error handling and recovery flows
5. **Phase 5**: Test complete registration → authentication flow

**CRITICAL**: The registration flow must be identical to thepia.com to ensure users have the same experience across all Thepia applications.

## Complete Registration Experience Design

### **🎯 OPTIMAL REGISTRATION USER JOURNEY**

**Key Principle**: Allow users to explore the application with limited functionality before requiring email verification. This reduces friction and demonstrates value before asking for commitment.

#### **Sequential Journey Overview**
1. **Registration & Passkey Setup** → User creates account with passkey
2. **Immediate App Access** → User enters app with limited functionality
3. **App Exploration Phase** → User discovers value before committing to verification
4. **In-App Verification Prompts** → Contextual calls-to-action within app content
5. **Completed Registration** → Full access after email verification

### **Registration User Journey (Enhanced with App Exploration)**

#### **Step 1: Email Entry & User Detection**
```svelte
<!-- EmailEntry.svelte -->
<div class="email-entry">
  <h2>Sign in to your account</h2>
  <input
    type="email"
    bind:value={email}
    placeholder="Enter your email address"
    on:input={handleEmailInput}
  />
  <button on:click={handleContinue}>Continue</button>
</div>

<!-- Auto-triggers user existence check -->
<script>
  async function handleEmailInput() {
    if (isValidEmail(email)) {
      // Start conditional authentication
      await startConditionalAuth(email);
    }
  }

  async function handleContinue() {
    const userCheck = await checkUser(email);
    if (!userCheck.exists) {
      // Transition to registration
      currentStep = 'webauthn-register';
    }
  }
</script>
```

#### **Step 2: Registration with Terms of Service**
```svelte
<!-- RegistrationForm.svelte -->
<div class="registration-step">
  <h2>Create Account with Passkey</h2>
  <p>Create a new Thepia account for {email} using secure passkey authentication</p>

  {#if userExists}
    <div class="re-registration-notice">
      <p><strong>Re-registering your passkey</strong></p>
      <p>Your previous passkey will be replaced with a new one. Any invalid or unavailable credentials will be automatically cleaned up.</p>
    </div>
  {/if}

  <!-- Critical: Terms of Service Acceptance -->
  <div class="tos-section">
    <label class="tos-checkbox">
      <input
        type="checkbox"
        bind:checked={tosChecked}
        required
        id="tos-checkbox"
        aria-describedby="tos-description"
      />
      <span id="tos-description">
        In order to use the service, you must agree to our
        <a href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a> and
        <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
      </span>
    </label>
  </div>

  {#if error}
    <div class="error-message" role="alert">
      {error}
    </div>
  {/if}

  <!-- Registration Actions -->
  <div class="registration-actions">
    <button
      class="btn-primary"
      on:click={handleRegistration}
      disabled={!tosChecked || loading}
      aria-label="{userExists ? 'Re-register' : 'Register'} passkey for {email}"
    >
      {#if loading}
        <span class="spinner"></span>
        {getTranslation('status.loading')}
      {:else}
        {userExists ? 'Set Up New Passkey' : getTranslation('auth.register')}
      {/if}
    </button>

    <button
      class="btn-secondary"
      on:click={handleUseDifferentAccount}
      aria-label="Use a different account"
    >
      Use a different account
    </button>
  </div>
</div>
```

#### **Step 3: Passkey Creation Process**
```typescript
// Registration flow implementation
async function handleRegistration() {
  if (!tosChecked) {
    throw new Error('Terms of Service must be accepted');
  }

  setLoading(true);
  setError(null);

  try {
    // Phase 1: Create Auth0 user account (if new user)
    let auth0UserId = userId;

    if (!userExists) {
      const registerResult = await auth0Service.registerUser(email);
      if (!registerResult.success) {
        throw new Error(registerResult.error || 'Failed to create account');
      }
      auth0UserId = registerResult.user?.sub || registerResult.user?.id;
    }

    // Phase 2: Register WebAuthn credential
    const webauthnUserId = `auth0|passkey-${email}-${Date.now()}-${auth0UserId}`;
    const webauthnResult = await auth0Service.registerWebAuthn(email, webauthnUserId);

    if (webauthnResult.success) {
      // Transition to unconfirmed state (NEW)
      currentStep = 'authenticated-unconfirmed';

      // Send welcome email with verification link
      await sendWelcomeEmail(email, webauthnResult.user);
    }
  } catch (error) {
    setError('Failed to create account with passkey authentication');
  } finally {
    setLoading(false);
  }
}
```

#### **Step 4: Immediate App Access (NEW APPROACH)**
```svelte
<!-- Registration Success - Immediate App Entry -->
<script>
  // After successful registration, immediately transition to app
  if (webauthnResult.success) {
    // Send welcome email in background
    sendWelcomeEmail(email, webauthnResult.user);

    // Close auth modal and enter app with unconfirmed state
    authStore.update(state => ({
      ...state,
      user: { ...webauthnResult.user, emailVerified: false },
      isAuthenticated: true,
      authState: 'authenticated-unconfirmed'
    }));

    // Close auth modal - user enters app immediately
    closeAuthModal();
  }
</script>
```

#### **Step 5: App Exploration Phase (CRITICAL UX)**
```svelte
<!-- Application Layout with Contextual Verification Prompts -->
<!-- src/routes/+layout.svelte -->
<script>
  import { authStore } from '@thepia/flows-auth';
  import VerificationBanner from '$lib/components/VerificationBanner.svelte';
  import VerificationPrompt from '$lib/components/VerificationPrompt.svelte';

  $: user = $authStore.user;
  $: isUnconfirmed = user && !user.emailVerified;
  $: showVerificationPrompts = isUnconfirmed;
</script>

<!-- App Header with Verification Banner -->
<header class="app-header">
  <div class="header-content">
    <h1>Your Application</h1>

    {#if showVerificationPrompts}
      <VerificationBanner
        email={user.email}
        onVerify={handleVerificationClick}
        onDismiss={handleBannerDismiss}
      />
    {/if}
  </div>
</header>

<!-- Main App Content -->
<main class="app-content">
  <slot />

  <!-- Contextual Verification Prompts -->
  {#if showVerificationPrompts}
    <VerificationPrompt
      trigger="feature-access"
      feature="advanced-features"
      email={user.email}
    />
  {/if}
</main>
```

#### **Step 6: Contextual Verification Prompts**
```svelte
<!-- VerificationBanner.svelte - Subtle top banner -->
<div class="verification-banner" class:dismissed={isDismissed}>
  <div class="banner-content">
    <div class="banner-icon">📧</div>
    <div class="banner-text">
      <span>Please verify your email address to unlock all features.</span>
      <button class="verify-link" on:click={onVerify}>
        Verify now
      </button>
    </div>
    <button class="dismiss-btn" on:click={onDismiss}>×</button>
  </div>
</div>

<!-- VerificationPrompt.svelte - Feature-specific prompts -->
<div class="verification-prompt" class:show={shouldShow}>
  <div class="prompt-content">
    <h3>🔓 Unlock Full Access</h3>
    <p>
      To access {feature}, please verify your email address.
      We sent a verification link to <strong>{email}</strong>.
    </p>

    <div class="prompt-actions">
      <button class="btn-primary" on:click={openEmailApp}>
        Check Email
      </button>
      <button class="btn-secondary" on:click={resendEmail}>
        Resend Link
      </button>
      <button class="btn-link" on:click={dismissPrompt}>
        Continue with limited access
      </button>
    </div>
  </div>
</div>

<style>
  .verification-banner {
    background: linear-gradient(90deg, #3b82f6, #1d4ed8);
    color: white;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    transition: all 0.3s ease;
  }

  .verification-banner.dismissed {
    transform: translateY(-100%);
    opacity: 0;
  }

  .verification-prompt {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    padding: 24px;
    max-width: 400px;
    transform: translateY(100px);
    opacity: 0;
    transition: all 0.3s ease;
  }

  .verification-prompt.show {
    transform: translateY(0);
    opacity: 1;
  }
</style>
```

#### **Step 7: Feature-Gated Access Patterns**
```svelte
<!-- Example: Limited vs Full Feature Access -->
<script>
  import { authStore } from '@thepia/flows-auth';

  $: user = $authStore.user;
  $: canAccessAdvancedFeatures = user?.emailVerified;
  $: isUnconfirmed = user && !user.emailVerified;
</script>

<!-- Feature Access with Verification Prompts -->
<div class="feature-section">
  <h2>Project Management</h2>

  <!-- Basic features available to unconfirmed users -->
  <div class="basic-features">
    <button on:click={viewProjects}>View Projects</button>
    <button on:click={browseTemplates}>Browse Templates</button>
  </div>

  <!-- Advanced features require verification -->
  <div class="advanced-features" class:locked={!canAccessAdvancedFeatures}>
    {#if canAccessAdvancedFeatures}
      <button on:click={createProject}>Create New Project</button>
      <button on:click={inviteTeamMembers}>Invite Team Members</button>
      <button on:click={exportData}>Export Data</button>
    {:else}
      <div class="locked-feature" on:click={showVerificationPrompt}>
        <div class="lock-icon">🔒</div>
        <div class="lock-text">
          <h4>Create Projects</h4>
          <p>Verify your email to create and manage projects</p>
        </div>
        <button class="unlock-btn">Verify Email</button>
      </div>
    {/if}
  </div>
</div>
```

#### **Step 5: Email Verification Complete**
```svelte
<!-- EmailVerificationSuccess.svelte -->
<div class="verification-success">
  <div class="success-animation">
    <div class="checkmark">✅</div>
  </div>

  <h2>Email Verified Successfully!</h2>
  <p>Your account is now fully activated. You have access to all Thepia features!</p>

  <div class="success-actions">
    <button class="btn-primary" on:click={proceedToApp}>
      Continue to Application
    </button>

    <button class="btn-secondary" on:click={goToAccountSettings}>
      Account Settings
    </button>
  </div>

  <!-- Welcome Tips -->
  <div class="welcome-tips">
    <h4>Getting Started:</h4>
    <ul>
      <li>🔐 Your passkey is now active for secure sign-ins</li>
      <li>📱 You can add more passkeys from other devices</li>
      <li>⚙️ Customize your account in Settings</li>
    </ul>
  </div>
</div>
```

### **Registration State Management**

```typescript
// Enhanced registration store
export const registrationStore = writable({
  currentStep: 'combined-auth',
  email: '',
  userExists: false,
  tosChecked: false,
  isLoading: false,
  error: null,
  userId: null,
  verificationEmailSent: false,
  resendCooldown: 0
});

// Registration actions with email verification
export const registrationActions = {
  async registerUser(email: string, tosAccepted: boolean) {
    if (!tosAccepted) throw new Error('Terms of Service must be accepted');

    // Two-phase registration
    const registerResult = await auth0Service.registerUser(email);
    const webauthnUserId = `auth0|passkey-${email}-${Date.now()}-${registerResult.user.sub}`;
    const webauthnResult = await auth0Service.registerWebAuthn(email, webauthnUserId);

    if (webauthnResult.success) {
      // Send welcome email
      await emailService.sendWelcomeEmail({
        email,
        user: webauthnResult.user,
        verificationToken: generateVerificationToken()
      });

      // Update state to unconfirmed
      registrationStore.update(state => ({
        ...state,
        currentStep: 'authenticated-unconfirmed',
        verificationEmailSent: true
      }));
    }
  },

  async resendVerificationEmail() {
    // Rate limiting
    registrationStore.update(state => ({ ...state, resendCooldown: 60 }));

    // Send email
    await emailService.resendVerificationEmail(email);

    // Countdown timer
    const timer = setInterval(() => {
      registrationStore.update(state => {
        const newCooldown = state.resendCooldown - 1;
        if (newCooldown <= 0) {
          clearInterval(timer);
          return { ...state, resendCooldown: 0 };
        }
        return { ...state, resendCooldown: newCooldown };
      });
    }, 1000);
  }
};
```

### **Critical Implementation Requirements**

1. **Exact UI Parity**: Registration form must match thepia.com exactly
2. **Terms of Service**: Required checkbox with exact text and links
3. **Enhanced User ID**: Must generate same format as thepia.com
4. **🎯 App Exploration Pattern**: Immediate app access with limited functionality
5. **Email Verification**: Welcome email sent in background after registration
6. **Contextual Prompts**: In-app verification calls-to-action, not blocking walls
7. **Feature Gating**: Clear locked/unlocked feature patterns
8. **Graceful Upgrade**: Seamless transition to full access after verification

### **🚨 MANDATORY PATTERN FOR ALL FLOWS APPS**

**The App Exploration Pattern is REQUIRED for every Thepia Flows application:**

#### **Implementation Standard**
```typescript
// ✅ REQUIRED: Immediate app access after registration
if (registrationSuccess) {
  // Send welcome email in background
  sendWelcomeEmail(user.email);

  // Close auth modal, enter app immediately
  closeAuthModal();

  // User explores app with limited functionality
  // Verification prompts appear contextually within app content
}

// ❌ FORBIDDEN: Blocking verification walls
if (registrationSuccess) {
  // DO NOT: Force verification before app access
  showVerificationWall(); // ❌ NEVER DO THIS
}
```

#### **Why This Pattern is Mandatory**
1. **Reduces Friction**: Users see value before committing to verification
2. **Increases Engagement**: App exploration leads to higher verification rates
3. **Better UX**: Natural verification flow within app context
4. **Consistent Experience**: Same pattern across all Thepia applications
5. **Higher Conversion**: Users verify when they need locked features

#### **Flows App Implementation Checklist**
Every Flows app MUST implement:
- [ ] **Immediate app access** after registration (no verification walls)
- [ ] **Limited functionality** for unconfirmed users
- [ ] **Contextual verification prompts** within app content
- [ ] **Feature-gated access** with clear upgrade paths
- [ ] **Background email sending** without blocking UX

**See**: `/docs/flows/app-implementation-checklist.md` for complete implementation requirements.

**CRITICAL**: The registration flow must be identical to thepia.com to ensure users have the same experience across all Thepia applications.
