/**
 * Zod Schema for flows-auth Store Structure
 *
 * Provides runtime validation for the composed auth store state.
 * Use with store-devtools-enhanced for type-safe debugging.
 *
 * Usage:
 *   import { AuthStoreSchema } from '@thepia/flows-auth/types/auth-store-schema';
 *   storeDevTools.add(authStore, 'Auth', { schema: AuthStoreSchema });
 */

import { z } from 'zod';

// ============================================================================
// Core Types
// ============================================================================

export const UserSchema = z.object({
	id: z.string(),
	email: z.string().email(),
	name: z.string().optional(),
	firstName: z.string().optional(),
	lastName: z.string().optional(),
	emailVerified: z.boolean().optional(),
	metadata: z
		.object({
			role: z.enum(['employee', 'admin', 'guest']).optional(),
			clientId: z.string().optional(),
			organizationId: z.string().optional()
		})
		.passthrough()
		.optional(),
	createdAt: z.string().optional(),
	lastLogin: z.string().optional()
});

export const TokensSchema = z.object({
	access_token: z.string(),
	refresh_token: z.string().optional(),
	expiresAt: z.number().optional(),
	expiresIn: z.number().optional()
});

// ============================================================================
// Sign-In State Machine
// ============================================================================

export const SignInStateSchema = z.enum([
	'emailEntry',
	'userChecked',
	'passkeyPrompt',
	'pinEntry',
	'passkeyRegistration',
	'emailVerification',
	'signedIn',
	'generalError'
]);

export const WebAuthnErrorSchema = z.object({
	name: z.string(),
	message: z.string(),
	timing: z.number(),
	type: z.enum(['credential-not-found', 'user-cancellation', 'credential-mismatch', 'unknown'])
});

export const SignInErrorSchema = z.object({
	code: z.string(),
	message: z.string(),
	type: z.enum(['validation', 'network', 'webauthn', 'authentication', 'unknown']),
	retryable: z.boolean()
});

// ============================================================================
// Individual Store States
// ============================================================================

export const AuthCoreStateSchema = z.object({
	state: z.enum(['unauthenticated', 'authenticated']),
	user: UserSchema.nullable(),
	access_token: z.string().nullable(),
	refresh_token: z.string().nullable(),
	expiresAt: z.number().nullable(),
	refreshedAt: z.number().nullable(), // Timestamp when token was last refreshed (spam protection)
	supabase_token: z.string().nullable(), // Supabase JWT for database access with RLS
	supabase_expires_at: z.number().nullable(), // Supabase token expiration timestamp
	passkeysEnabled: z.boolean()
});

export const SessionStateSchema = z.object({
	user: UserSchema.nullable(),
	tokens: TokensSchema.nullable(),
	authMethod: z.enum(['passkey', 'pin', 'email-link', 'magic-link']).nullable(),
	sessionId: z.string().nullable(),
	createdAt: z.number().nullable(),
	expiresAt: z.number().nullable()
});

export const UIStateSchema = z.object({
	// Form inputs
	email: z.string(),
	fullName: z.string(),
	emailCode: z.string(),
	loading: z.boolean(),

	// Master flow state
	signInState: SignInStateSchema,
	emailCodeSent: z.boolean(),

	// User discovery state
	userExists: z.boolean().nullable(),
	hasPasskeys: z.boolean(),
	hasValidPin: z.boolean(),
	pinRemainingMinutes: z.number(),

	// WebAuthn state
	conditionalAuthActive: z.boolean(),
	platformAuthenticatorAvailable: z.boolean()
});

export const ErrorStateSchema = z.object({
	apiError: z
		.object({
			code: z.string(),
			message: z.string(),
			details: z.unknown().optional(),
			timestamp: z.number(),
			context: z
				.object({
					method: z.string().optional(),
					email: z.string().optional()
				})
				.optional()
		})
		.nullable(),
	uiError: z
		.object({
			code: z.string(),
			message: z.string(),
			dismissible: z.boolean()
		})
		.nullable(),
	lastFailedRequest: z
		.object({
			method: z.string(),
			email: z.string().optional(),
			timestamp: z.number()
		})
		.nullable()
});

export const PasskeyStateSchema = z.object({
	available: z.boolean(),
	registering: z.boolean(),
	authenticating: z.boolean(),
	lastError: WebAuthnErrorSchema.nullable()
});

export const EmailAuthStateSchema = z.object({
	emailSent: z.boolean(),
	emailVerified: z.boolean(),
	codeSentAt: z.number().nullable(),
	codeExpiresAt: z.number().nullable(),
	lastError: z.string().nullable()
});

// ============================================================================
// Composed Auth Store (Full State)
// ============================================================================

/**
 * Complete auth store state schema
 * Matches the structure returned by authStore.getState()
 */
export const AuthStoreStateSchema = z.object({
	// Core state
	state: z.enum(['unauthenticated', 'authenticated', 'authenticated-unconfirmed', 'authenticated-confirmed', 'error']),
	signInState: SignInStateSchema,
	user: UserSchema.nullable(),
	access_token: z.string().nullable(),
	refresh_token: z.string().nullable(),
	expiresAt: z.number().nullable(),
	refreshedAt: z.number().nullable(), // Timestamp when token was last refreshed (spam protection)
	supabase_token: z.string().nullable(), // Supabase JWT for database access with RLS
	supabase_expires_at: z.number().nullable(), // Supabase token expiration timestamp
	apiError: z
		.object({
			code: z.string(),
			message: z.string(),
			details: z.unknown().optional(),
			timestamp: z.number(),
			context: z
				.object({
					method: z.string().optional(),
					email: z.string().optional()
				})
				.optional()
		})
		.nullable(),
	passkeysEnabled: z.boolean(),

	// UI state
	email: z.string(),
	loading: z.boolean(),
	emailCodeSent: z.boolean(),
	fullName: z.string(),
	emailCode: z.string(),

	// User discovery
	userExists: z.boolean().nullable(),
	hasPasskeys: z.boolean(),
	hasValidPin: z.boolean(),
	pinRemainingMinutes: z.number(),

	// WebAuthn
	conditionalAuthActive: z.boolean(),
	platformAuthenticatorAvailable: z.boolean()
});

// ============================================================================
// Type Exports
// ============================================================================

export type User = z.infer<typeof UserSchema>;
export type Tokens = z.infer<typeof TokensSchema>;
export type SignInState = z.infer<typeof SignInStateSchema>;
export type AuthStoreState = z.infer<typeof AuthStoreStateSchema>;

// ============================================================================
// Store Setters Metadata (for devtools editing)
// ============================================================================

/**
 * Map of settable fields to their setter method names
 * Used by devtools to enable editing specific fields
 */
export const AuthStoreSetters: Record<string, string> = {
	email: 'setEmail',
	fullName: 'setFullName',
	emailCode: 'setEmailCode',
	loading: 'setLoading',
	emailCodeSent: 'setEmailCodeSent',
	conditionalAuthActive: 'setConditionalAuthActive'
};

/**
 * Fields that are read-only (no setters available)
 */
export const AuthStoreReadOnlyFields = [
	'state',
	'signInState',
	'user',
	'access_token',
	'refresh_token',
	'expiresAt',
	'refreshedAt',
	'supabase_token',
	'supabase_expires_at',
	'apiError',
	'passkeysEnabled',
	'userExists',
	'hasPasskeys',
	'hasValidPin',
	'pinRemainingMinutes',
	'platformAuthenticatorAvailable'
];

// Default export for convenience
export default AuthStoreStateSchema;

