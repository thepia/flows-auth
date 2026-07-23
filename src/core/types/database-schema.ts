/**
 * Zod schemas for SessionData and UserData
 *
 * Runtime validation for session and user data structures.
 * These schemas validate data received from flows-client (IndexedDB) or native app storage.
 *
 * All timestamps use ISO 8601 strings for portability across platforms:
 * - IndexedDB stores strings natively
 * - Cookies/localStorage serialize strings
 * - Native apps convert to Date objects for storage
 */

import { z } from 'zod';

/**
 * ISO 8601 datetime string validation
 * Matches format: "2024-11-28T14:30:00.000Z"
 */
const ISODateString = z.string().datetime({ offset: true });

/**
 * SessionData schema - validates complete session with tokens
 * Used when loading/saving sessions from storage
 */
export const SessionDataSchema = z.object({
  userId: z.string().describe('User identifier'),
  email: z.string().email().describe('User email address'),
  name: z.string().optional().describe('User display name'),
  emailVerified: z.boolean().optional().describe('Email verification status'),
  metadata: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Flexible storage for additional tokens'),
  accessToken: z.string().describe('OAuth access token'),
  refreshToken: z.string().optional().describe('OAuth refresh token'),
  expiresAt: ISODateString.describe('Token expiration time (ISO 8601)'),
  refreshedAt: ISODateString.optional().describe('Last token refresh time (ISO 8601)'),
  authMethod: z
    .enum(['passkey', 'password', 'email-code'])
    .optional()
    .describe('Authentication method used'),
  supabaseToken: z.string().optional().describe('Supabase JWT token'),
  supabaseExpiresAt: ISODateString.optional().describe('Supabase token expiration (ISO 8601)')
});

/**
 * Partial SessionData schema - for saveSession operations
 * Allows partial updates to session data
 */
export const PartialSessionDataSchema = SessionDataSchema.partial();

/**
 * UserData schema - validates user profile data
 */
export const UserDataSchema = z.object({
  userId: z.string().describe('User identifier'),
  email: z.string().email().describe('User email address'),
  name: z.string().optional().describe('User display name'),
  emailVerified: z.boolean().optional().describe('Email verification status'),
  createdAt: ISODateString.optional().describe('Account creation time (ISO 8601)'),
  lastLoginAt: ISODateString.optional().describe('Last login time (ISO 8601)'),
  metadata: z.record(z.string(), z.unknown()).optional().describe('User metadata'),
  authMethod: z
    .enum(['passkey', 'password', 'email-code'])
    .optional()
    .describe('Preferred auth method')
});

// Type exports for convenience
export type SessionData = z.infer<typeof SessionDataSchema>;
export type PartialSessionData = z.infer<typeof PartialSessionDataSchema>;
export type UserData = z.infer<typeof UserDataSchema>;
