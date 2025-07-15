# Invitation Token Implementation - Phase 1

## Overview

This document outlines the implementation of Phase 1: Enhanced registration endpoint to accept and validate invitation tokens as email verification proof.

## Changes Made

### 1. Enhanced API Client (`src/api/auth-api.ts`)

**Before**:
```typescript
async registerUser(userData: {
  email: string;
  firstName?: string;
  lastName?: string;
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
}): Promise<SignInResponse>
```

**After**:
```typescript
async registerUser(userData: {
  email: string;
  firstName?: string;
  lastName?: string;
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
  invitationToken?: string; // NEW: Optional invitation token for email verification
}): Promise<SignInResponse>
```

### 2. Enhanced Auth Store (`src/stores/auth-store.ts`)

- Updated `registerUser()` function signature to accept `invitationToken`
- Added logging to track invitation token usage
- Invitation tokens are now passed through to the API server

### 3. Enhanced Frontend Integration (`flows.thepia.net/src/components/app/AppSignIn.svelte`)

**Before**:
```typescript
const result = await authStore.registerUser({
  email: registrationData.email,
  acceptedTerms: registrationData.acceptedTerms,
  acceptedPrivacy: registrationData.acceptedPrivacy,
  profile: userProfile
});
```

**After**:
```typescript
const result = await authStore.registerUser({
  email: registrationData.email,
  firstName: registrationData.firstName,
  lastName: registrationData.lastName,
  acceptedTerms: registrationData.acceptedTerms,
  acceptedPrivacy: registrationData.acceptedPrivacy,
  invitationToken: invitationToken || undefined // Pass invitation token for email verification
});
```

### 4. Enhanced TypeScript Types (`src/types/index.ts`)

**RegistrationRequest Interface**:
```typescript
export interface RegistrationRequest {
  email: string;
  firstName?: string;
  lastName?: string;
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
  marketingConsent?: boolean;
  invitationToken?: string; // Optional invitation token for email verification proof
}
```

**RegistrationResponse Interface**:
```typescript
export interface RegistrationResponse {
  user?: User;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  step: RegistrationStep;
  emailVerificationRequired?: boolean;
  welcomeEmailSent?: boolean;
  emailVerifiedViaInvitation?: boolean; // True if email was verified via invitation token
}
```

## How It Works

### Registration Flow with Invitation Token

1. **User receives invitation email** with JWT token
2. **User clicks invitation link** (e.g., `https://flows.thepia.net/demo?token=jwt_here`)
3. **Frontend extracts and validates token** client-side
4. **User fills registration form** (email pre-filled from token)
5. **User clicks "Create Account with Passkey"**
6. **Frontend calls `authStore.registerUser()`** with invitation token included
7. **flows-auth sends request to API server** with invitation token
8. **API server validates invitation token** and recognizes email as verified
9. **API server creates Auth0 user** with `email_verified: true`
10. **User is immediately authenticated** without additional email verification

### Registration Flow without Invitation Token

1. **User navigates directly to registration page**
2. **User fills registration form manually**
3. **User clicks "Create Account with Passkey"**
4. **Frontend calls `authStore.registerUser()`** without invitation token
5. **flows-auth sends request to API server** (no invitation token)
6. **API server creates Auth0 user** with `email_verified: false`
7. **API server sends verification email** to user
8. **User must verify email** before gaining full access

## Backend API Server Requirements

The API server at `https://api.thepia.com` must be enhanced to:

1. **Accept invitation token** in registration requests
2. **Validate invitation token JWT**:
   - Verify signature
   - Check expiration
   - Confirm email matches registration email
3. **Set email verification status**:
   - `email_verified: true` when valid invitation token provided
   - `email_verified: false` when no invitation token
4. **Track invitation usage** in database
5. **Return appropriate response** indicating email verification status

## Next Steps (Future Phases)

- **Phase 2**: Enhance Auth0 user creation to set `email_verified: true` for invitation registrations
- **Phase 3**: Update JWT token generation to include invitation context
- **Phase 4**: Add invitation token usage tracking in database
- **Phase 5**: Implement bypass logic for email verification when invitation token is used

## Testing

Both `flows-auth` and `flows.thepia.net` build successfully with these changes. The invitation token will be passed to the API server and can be validated to provide immediate email verification.

## Security Considerations

- Invitation tokens serve as **proof of email possession** since they were sent to the user's email
- Tokens should be validated for **signature, expiration, and email match**
- Token usage should be **tracked and logged** for audit purposes
- **One-time use** tokens prevent replay attacks