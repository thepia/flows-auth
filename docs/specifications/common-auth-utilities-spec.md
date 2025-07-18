# Common Authentication Utilities Specification

## Overview

This specification defines new utilities to be added to flows-auth that will consolidate authentication logic currently duplicated across multiple Thepia Flows applications. These utilities will reduce code duplication and provide a consistent authentication experience.

## Identified Common Patterns

Based on analysis of flows.thepia.net authentication implementation, the following patterns have been identified for consolidation:

### 1. API Server Detection (`detectApiServer`)
- Smart detection of available API servers (local vs production)
- Health check with timeout
- Configurable fallback behavior
- Used in both AuthSection.svelte and AppSignIn.svelte

### 2. Invitation Token Handling
- JWT decoding and validation
- Token hash computation for security verification
- Token expiration and validity checks
- Pre-filling registration forms from token data

### 3. Enhanced User Check (`checkUserWithInvitation`)
- Extends existing `checkUser` to handle invitation tokens
- Determines registration vs sign-in mode
- Validates token hash against stored values
- Handles edge cases (expired tokens, mismatched emails)

### 4. Registration Flow with Invitation Support
- Enhanced `createAccount` that handles invitation tokens
- Automatic mode detection (new user vs existing user without passkey)
- Token validation and metadata inclusion
- Seamless passkey creation flow

## Proposed API Additions

### 1. API Server Detection Utility

```typescript
// src/utils/api-detection.ts

export interface ApiServerConfig {
  localUrl?: string;
  productionUrl: string;
  healthTimeout?: number;
  preferLocal?: boolean;
}

export interface ApiServerInfo {
  url: string;
  type: 'local' | 'production';
  isHealthy: boolean;
  serverInfo?: {
    version?: string;
    environment?: string;
  };
}

/**
 * Detects the best available API server based on health checks
 * @param config - Configuration for API server detection
 * @returns Promise resolving to the selected API server info
 */
export async function detectApiServer(config: ApiServerConfig): Promise<ApiServerInfo>;

/**
 * Default configuration for Thepia Flows applications
 */
export const DEFAULT_API_CONFIG: ApiServerConfig = {
  localUrl: 'https://dev.thepia.com:8443',
  productionUrl: 'https://api.thepia.com',
  healthTimeout: 3000,
  preferLocal: true
};
```

### 2. Invitation Token Utilities

```typescript
// src/utils/invitation-tokens.ts

export interface InvitationTokenData {
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  company?: string;
  companyName?: string;
  phone?: string;
  jobTitle?: string;
  expires?: Date;
  issuedAt?: Date;
  [key: string]: any; // Allow additional fields
}

export interface TokenValidationResult {
  isValid: boolean;
  reason?: 'expired' | 'invalid_structure' | 'invalid_signature' | 'missing_email' | 'invalid_email';
  data?: InvitationTokenData;
}

/**
 * Decodes a JWT invitation token without verifying the signature
 * @param token - The JWT token to decode
 * @returns The decoded token data
 * @throws Error if token format is invalid
 */
export function decodeInvitationToken(token: string): InvitationTokenData;

/**
 * Validates an invitation token including structure and expiration
 * @param token - The JWT token to validate
 * @param options - Optional validation parameters
 * @returns Validation result with detailed status
 */
export function validateInvitationToken(
  token: string,
  options?: {
    verifySignature?: boolean;
    publicKey?: string;
  }
): TokenValidationResult;

/**
 * Computes SHA-256 hash of invitation token for security verification
 * @param token - The token to hash
 * @returns Hex-encoded hash string or null if hashing fails
 */
export async function hashInvitationToken(token: string): Promise<string | null>;

/**
 * Extracts registration data from invitation token
 * @param tokenData - Decoded token data
 * @returns Registration form data with normalized field names
 */
export function extractRegistrationData(tokenData: InvitationTokenData): {
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  phone: string;
  jobTitle: string;
};
```

### 3. Enhanced Auth Store Methods

```typescript
// Additions to src/stores/auth-store.ts

export interface EnhancedUserCheck {
  exists: boolean;
  hasPasskey: boolean;
  hasWebAuthn: boolean; // Alias for hasPasskey
  invitationTokenHash?: string;
  requiresPasskeySetup?: boolean;
  registrationMode?: 'new_user' | 'complete_passkey' | 'sign_in';
}

export interface InvitationAuthOptions {
  token: string;
  tokenData?: InvitationTokenData;
  skipTokenValidation?: boolean;
}

// Additional methods for auth store
interface EnhancedAuthStore extends AuthStore {
  /**
   * Enhanced user check that includes invitation token validation
   * @param email - User email to check
   * @param invitationOptions - Optional invitation token for validation
   * @returns Enhanced user check result with registration mode
   */
  checkUserWithInvitation(
    email: string,
    invitationOptions?: InvitationAuthOptions
  ): Promise<EnhancedUserCheck>;

  /**
   * Determines the appropriate authentication flow based on user status and invitation
   * @param email - User email
   * @param invitationToken - Optional invitation token
   * @returns Recommended auth flow and pre-filled data
   */
  determineAuthFlow(
    email: string,
    invitationToken?: string
  ): Promise<{
    mode: 'register' | 'complete_passkey' | 'sign_in';
    prefillData?: Partial<RegistrationRequest>;
    message?: string;
  }>;
}
```

### 4. Auth Flow Components

```typescript
// src/components/InvitationAuthFlow.svelte
/**
 * Complete authentication flow component that handles invitation tokens
 * Automatically determines whether to show registration or sign-in
 * Handles all edge cases including expired tokens and existing users
 */
export interface InvitationAuthFlowProps {
  invitationToken?: string;
  config: AuthConfig;
  onSuccess: (event: AuthSuccessEvent) => void;
  onError?: (event: AuthErrorEvent) => void;
}
```

## Implementation Plan

### Phase 1: Core Utilities (Priority: High)
1. Implement `detectApiServer` utility with comprehensive testing
2. Implement invitation token utilities with full test coverage
3. Add utilities to library exports

### Phase 2: Enhanced Auth Store (Priority: Medium)
1. Add `checkUserWithInvitation` method to auth store
2. Add `determineAuthFlow` method for smart flow detection
3. Update existing `createAccount` to better handle invitation tokens
4. Ensure backward compatibility

### Phase 3: Integration Components (Priority: Low)
1. Create `InvitationAuthFlow` component
2. Add examples demonstrating invitation flow
3. Update documentation with invitation token patterns

## Testing Requirements

### Unit Tests
- API detection with various network conditions
- Token decoding with valid/invalid tokens
- Token validation with various expiration scenarios
- Hash computation consistency
- Registration data extraction edge cases

### Integration Tests
- Full invitation flow against real API
- API server failover scenarios
- Token validation with API verification
- User check with invitation token

### E2E Tests
- Complete invitation registration flow
- Existing user with invitation token
- Expired token handling
- Network failure scenarios

## Migration Guide

### For flows.thepia.net

```svelte
<!-- Before -->
<script>
async function detectApiServer() {
  // 20+ lines of detection logic
}

function decodeInvitationToken(token) {
  // 15+ lines of decoding logic
}
</script>

<!-- After -->
<script>
import { detectApiServer, decodeInvitationToken } from '@thepia/flows-auth';

onMount(async () => {
  const apiServer = await detectApiServer(DEFAULT_API_CONFIG);
  const tokenData = decodeInvitationToken(invitationToken);
});
</script>
```

## Benefits

1. **Code Reduction**: Remove ~200+ lines of duplicated code per application
2. **Consistency**: Ensure all Flows apps handle authentication identically
3. **Maintainability**: Single source of truth for auth logic
4. **Testing**: Centralized, comprehensive test coverage
5. **Security**: Consistent token validation and security practices

## Backward Compatibility

All changes will be additive, ensuring existing flows-auth consumers continue to work without modification. New utilities will be opt-in through explicit imports.

## Success Criteria

1. All utilities have 90%+ test coverage
2. flows.thepia.net can remove all local auth utility implementations
3. Documentation clearly explains invitation token patterns
4. Examples demonstrate all common use cases
5. No breaking changes to existing API