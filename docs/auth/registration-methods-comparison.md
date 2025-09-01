# Registration Methods Comparison

## Overview

The flows-auth library provides three distinct registration/authentication methods, each designed for specific use cases and user flows. Understanding when to use each method is critical for proper implementation.

## Method Comparison Table

| Method | Use Case | Email Verification | Authentication | State Machine Flow |
|--------|----------|-------------------|----------------|-------------------|
| `registerUser()` | Invitation-based registration | Optional (via token) | **Immediate** | Invitation flow |
| `registerIndividualUser()` | Personal account creation | **Required** | After verification | Individual registration |
| `signInWithMagicLink()` | Existing user login | N/A | **Immediate** | Existing user auth |

## Detailed Method Analysis

### 1. registerUser() - Invitation Flow

**Purpose**: Register users who have been invited to specific applications (e.g., flows apps, business tools)

**Key Characteristics:**
- **Immediate authentication** - User gets tokens right away
- **Pre-verified email** - If invitation token provided, email is already verified
- **Application context** - User is registered for specific app access
- **Business use case** - Intended for organizational invitations

**Implementation Details:**
```typescript
async function registerUser(userData: {
  email: string;
  firstName?: string;
  lastName?: string;
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
  invitationToken?: string; // Pre-verifies email if present
}): Promise<SignInResponse & { emailVerifiedViaInvitation?: boolean }>
```

**State Machine Path:**
`emailEntry` → `userLookup` → `scenarioDetection` → `appInvitationFlow` → `authenticated`

**When to Use:**
- User clicked an invitation link
- Business application onboarding
- Organizational user provisioning
- When you need immediate app access

### 2. registerIndividualUser() - Individual Registration

**Purpose**: Register individual users for personal app.thepia.net accounts

**Key Characteristics:**
- **Email verification required** - User must click verification link
- **Delayed authentication** - No immediate tokens provided
- **Personal context** - Individual consumer registration
- **Security-first** - Ensures email ownership before access

**Implementation Details:**
```typescript
async function registerIndividualUser(userData: {
  email: string;
  firstName?: string;
  lastName?: string;
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
}): Promise<{
  success: boolean;
  user: any;
  verificationRequired: boolean;
  message: string;
}>
```

**State Machine Path:**
`emailEntry` → `userLookup` → `scenarioDetection` → `individualRegistration` → `emailVerificationRequired` → `emailVerificationSent` → `emailVerified` → `authenticated`

**When to Use:**
- app.thepia.net personal registrations
- Consumer-facing applications
- When email verification is mandatory
- Self-service account creation

### 3. signInWithMagicLink() - Existing User Authentication

**Purpose**: Authenticate users who already have verified accounts

**Key Characteristics:**
- **Existing user only** - Account must already exist
- **Immediate authentication** - Provides tokens upon email verification
- **Email already verified** - User's email was verified during registration
- **Login context** - Not registration, just authentication

**Implementation Details:**
```typescript
async function signInWithMagicLink(request: MagicLinkRequest): Promise<SignInResponse>
```

**State Machine Path:**
`emailEntry` → `userLookup` → `scenarioDetection` → `existingUserAuth` → `emailLinkAuth` → `authenticated`

**When to Use:**
- User forgot password / wants passwordless login
- Existing account authentication
- Cross-device login scenarios
- When passkeys are not available

## Critical Authentication Side Effects

### startPasswordlessAuthentication() Dual Behavior

**⚠️ IMPORTANT**: The underlying `api.startPasswordlessAuthentication()` method behaves differently based on user existence:

```typescript
// For NON-EXISTENT users:
// 1. Creates user account in Auth0
// 2. Sends verification email
// 3. When clicked: Sets email_verified: true + provides auth tokens

// For EXISTING users:
// 1. Sends authentication email
// 2. When clicked: Provides auth tokens (email already verified)
```

This dual behavior is why:
- `registerIndividualUser()` works - it creates account then sends verification
- `signInWithMagicLink()` works - it authenticates existing users
- Email verification **always** results in authentication (not just verification)

### Email Verification = Authentication

**Key Insight**: In Auth0's passwordless flow, email verification is not separate from authentication. When a user clicks a magic link:

1. **Auth0 validates** the link and user identity
2. **Sets email_verified: true** in the user profile
3. **Issues authentication tokens** (access + refresh tokens)
4. **Redirects to callback** with authorization code
5. **API exchanges code** for final tokens

This is why there's no separate "verify email only" step - email verification always results in full authentication.

## Implementation Recommendations

### For Individual Consumer Apps (app.thepia.net)
```typescript
// Use registerIndividualUser for new users
const result = await authStore.registerIndividualUser({
  email: userEmail,
  acceptedTerms: true,
  acceptedPrivacy: true
});

if (result.verificationRequired) {
  showMessage("Please check your email for verification link");
  // User will be authenticated when they click the link
}
```

### For Business Applications (flows.thepia.net)
```typescript
// Use registerUser for invitation-based access
const response = await authStore.registerUser({
  email: userEmail,
  acceptedTerms: true,
  acceptedPrivacy: true,
  invitationToken: getInvitationToken() // From URL or context
});

// User is immediately authenticated
if (response.user) {
  redirectToApplication();
}
```

### For Existing User Login
```typescript
// Use signInWithMagicLink for returning users
await authStore.signInWithMagicLink(userEmail);
// Auth store handles polling and authentication
```

## Common Implementation Mistakes

### ❌ Using Wrong Method for Context
```typescript
// WRONG: Using registerUser for app.thepia.net individual registration
await authStore.registerUser({ email, acceptedTerms: true, acceptedPrivacy: true });
// This bypasses email verification requirement for individual accounts
```

### ❌ Expecting Separate Verification Step
```typescript
// WRONG: Expecting verification without authentication
const result = await api.startPasswordlessAuthentication(email);
// Then somehow verify email without authenticating
// Email verification ALWAYS provides auth tokens
```

### ❌ Not Handling Verification Requirement
```typescript
// WRONG: Expecting immediate authentication from registerIndividualUser
const result = await authStore.registerIndividualUser(data);
if (result.user && result.tokens) { // These won't exist!
  redirectToApp();
}
```

### ✅ Correct Implementation Pattern
```typescript
// CORRECT: Handle verification requirement properly
const result = await authStore.registerIndividualUser(data);
if (result.success && result.verificationRequired) {
  showMessage(result.message); // "Please check your email..."
  
  // User will be authenticated when they click email link
  // Auth store will automatically update when auth completes
}
```

This documentation clarifies the distinct purposes and behaviors of each registration method, helping developers choose the right approach for their specific use case.