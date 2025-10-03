/**
 * Unified Response Types for flows-auth
 *
 * ⚠️ WARNING: This file appears to be SPECULATIVE/UNUSED code.
 * It defines types that are NOT imported or used anywhere in the codebase.
 * The actual codebase uses types from src/types/index.ts instead.
 *
 * This module provides flows-auth specific types that align with the unified
 * API response structure from thepia.com/src/api/types/unified-responses.ts
 *
 * These types maintain backward compatibility while moving toward the unified structure.
 *
 * TODO: Either integrate these types into the codebase or remove this file.
 */

// Re-export unified types from thepia.com API
// Note: In a real implementation, these would come from a shared package

// ============================================================================
// Base Response Types (aligned with API)
// ============================================================================

export interface ApiResponse<T = any> {
  data?: T;
  success: boolean;
  message?: string;
  meta?: {
    timestamp: string;
    requestId?: string;
    version?: string;
    duration?: number;
  };
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

// ============================================================================
// flows-auth Specific Response Types
// ============================================================================

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  emailVerified: boolean;
  isNewUser?: boolean;
  metadata?: Record<string, any>;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresIn?: number;
  expiresAt?: number;
}

export type AuthStep =
  | 'email-sent'
  | 'code-required'
  | 'authenticated'
  | 'passkey-required'
  | 'registration-required'
  | 'magic-link-sent';

export type AuthMethod = 'email' | 'passkey' | 'magic-link' | 'password' | 'email-code'; // flows-auth specific

export interface AuthState {
  step: AuthStep;
  method: AuthMethod;
  requiresAdditionalAuth?: boolean;
}

export interface AuthCapabilities {
  hasPasskeys: boolean;
  canCreatePasskeys: boolean;
  supportsMagicLinks: boolean;
}

export interface OrganizationContext {
  code: string;
  name: string;
  provider: 'auth0' | 'workos';
  features: string[];
}

// ============================================================================
// Updated flows-auth Response Interfaces (v2)
// ============================================================================

/**
 * New unified SignInResponse (v2) - replaces legacy SignInResponse
 * Maintains backward compatibility through optional fields
 */
export interface SignInResponseV2
  extends ApiResponse<{
    user: AuthUser;
    tokens?: AuthTokens;
    state: AuthState;
    context?: {
      organization?: OrganizationContext;
      capabilities?: AuthCapabilities;
    };
  }> {}

/**
 * Backward compatible SignInResponse (legacy)
 * TODO: Deprecate this interface in favor of SignInResponseV2
 */
export interface SignInResponse {
  user?: AuthUser;
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
  expiresIn?: number;
  requiresPasskey?: boolean;
  magicLinkSent?: boolean;
  challengeId?: string;
  step: AuthStep;
  emailVerifiedViaInvitation?: boolean;
}

export interface CheckUserResponseV2
  extends ApiResponse<{
    exists: boolean;
    user?: Pick<AuthUser, 'id' | 'email' | 'emailVerified'>;
    capabilities: AuthCapabilities;
    context?: {
      organization: OrganizationContext;
    };
  }> {}

export interface EmailSendResponseV2
  extends ApiResponse<{
    state: Pick<AuthState, 'step' | 'method'>;
    context?: {
      organization: OrganizationContext;
      expiresAt?: number;
    };
  }> {}

// ============================================================================
// Migration Utilities
// ============================================================================

/**
 * Convert legacy SignInResponse to new unified format
 */
export function migrateToUnifiedSignInResponse(legacy: SignInResponse): SignInResponseV2 {
  const authData = {
    user: {
      id: legacy.user?.id || '',
      email: legacy.user?.email || '',
      name: legacy.user?.name,
      emailVerified: legacy.user?.emailVerified || false,
      isNewUser: legacy.user?.isNewUser,
      metadata: legacy.user?.metadata
    },
    state: {
      step: legacy.step,
      method: (legacy.requiresPasskey
        ? 'passkey'
        : legacy.magicLinkSent
          ? 'magic-link'
          : 'email') as AuthMethod,
      requiresAdditionalAuth: legacy.requiresPasskey
    }
  };

  // Add tokens if present
  const tokens: AuthTokens | undefined = legacy.accessToken
    ? {
        accessToken: legacy.accessToken,
        refreshToken: legacy.refreshToken,
        idToken: legacy.idToken,
        expiresIn: legacy.expiresIn
      }
    : undefined;

  return {
    success: true,
    data: {
      ...authData,
      tokens
    },
    meta: {
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Convert unified response back to legacy format for backward compatibility
 */
export function migratFromUnifiedSignInResponse(unified: SignInResponseV2): SignInResponse {
  if (!unified.success || !unified.data) {
    throw new Error('Cannot convert error response to legacy format');
  }

  const { user, tokens, state } = unified.data;

  return {
    user,
    accessToken: tokens?.accessToken,
    refreshToken: tokens?.refreshToken,
    idToken: tokens?.idToken,
    expiresIn: tokens?.expiresIn,
    step: state.step,
    requiresPasskey: state.method === 'passkey',
    magicLinkSent: state.method === 'magic-link',
    emailVerifiedViaInvitation: false // Legacy field
  };
}

// ============================================================================
// Type Guards
// ============================================================================

export function isUnifiedSignInResponse(response: any): response is SignInResponseV2 {
  return (
    typeof response === 'object' &&
    'success' in response &&
    'data' in response &&
    response.data &&
    'user' in response.data &&
    'state' in response.data
  );
}

export function isLegacySignInResponse(response: any): response is SignInResponse {
  return typeof response === 'object' && 'step' in response && typeof response.step === 'string';
}

// ============================================================================
// Error Codes (flows-auth specific)
// ============================================================================

export const FLOWS_AUTH_ERROR_CODES = {
  // Client-side errors
  BROWSER_NOT_SUPPORTED: 'BROWSER_NOT_SUPPORTED',
  WEBAUTHN_NOT_AVAILABLE: 'WEBAUTHN_NOT_AVAILABLE',
  USER_CANCELLED: 'USER_CANCELLED',
  INVALID_CONFIGURATION: 'INVALID_CONFIGURATION',

  // Auth flow errors
  EMAIL_VERIFICATION_FAILED: 'EMAIL_VERIFICATION_FAILED',
  CODE_VERIFICATION_FAILED: 'CODE_VERIFICATION_FAILED',
  PASSKEY_REGISTRATION_FAILED: 'PASSKEY_REGISTRATION_FAILED',
  MAGIC_LINK_GENERATION_FAILED: 'MAGIC_LINK_GENERATION_FAILED',

  // API communication errors
  API_UNREACHABLE: 'API_UNREACHABLE',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',

  // State management errors
  INVALID_STATE: 'INVALID_STATE',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  STORAGE_ERROR: 'STORAGE_ERROR'
} as const;

export type FlowsAuthErrorCode =
  (typeof FLOWS_AUTH_ERROR_CODES)[keyof typeof FLOWS_AUTH_ERROR_CODES];

// ============================================================================
// Response Creation Helpers
// ============================================================================

export function createFlowsAuthSuccess<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
    meta: {
      timestamp: new Date().toISOString(),
      version: '2.0' // flows-auth v2 with unified responses
    }
  };
}

export function createFlowsAuthError(
  code: FlowsAuthErrorCode,
  message: string,
  details?: Record<string, any>
): ApiResponse<never> {
  return {
    success: false,
    error: {
      code,
      message,
      details
    },
    meta: {
      timestamp: new Date().toISOString(),
      version: '2.0'
    }
  };
}
