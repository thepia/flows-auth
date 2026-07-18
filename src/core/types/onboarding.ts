/**
 * Onboarding, Consent, Preferences, and Invitations Types
 *
 * Comprehensive user metadata management for:
 * - Consent tracking (document confirmations by URL)
 * - User preferences (theme, language, timezone, etc.)
 * - Invitation tracking and client registrations
 *
 * All stored compactly in user metadata to fit within Auth0/WorkOS limits.
 *
 * Example structure:
 * ```json
 * {
 *   "consent": {
 *     "https://talki.dev/notifications": { "v": 1, "dh": "abc123...", "ts": 1697500000000 },
 *     "https://thepia.com/data-policy": { "v": 1, "dh": "abc123...", "ts": 1697500000000 }
 *   },
 *   "preferences": {
 *     "theme": "dark",
 *     "language": "en",
 *     "timezone": "Europe/Copenhagen"
 *   },
 *   "invitations": {},
 *   "clients": {
 *     "demo": {
 *       "status": "connected",
 *       "progress": 100,
 *       "steps": [],
 *       "first_seen": "2025-10-21T...",
 *       "last_seen": "2025-10-21T..."
 *     }
 *   }
 * }
 * ```
 */

import { z } from 'zod';

// ============================================================================
// Compact Consent Record (for any consent URL)
// ============================================================================

/**
 * Compact consent record stored in user metadata
 * Uses short keys to minimize storage:
 * - v: version number
 * - dh: device/location hash (SHA-256 of device fingerprint + location)
 * - ts: timestamp (milliseconds since epoch)
 */
export const CompactConsentRecordSchema = z.object({
  v: z.number().int().positive().describe('Document version number'),
  dh: z.string().min(1).describe('Device/location hash (SHA-256)'),
  ts: z.number().int().positive().describe('Timestamp in milliseconds')
});

export type CompactConsentRecord = z.infer<typeof CompactConsentRecordSchema>;

// ============================================================================
// Preferences Types
// ============================================================================

/**
 * User preferences stored as flexible key-value pairs
 * Common keys: theme, language, timezone, preferredAuthMethod, etc.
 */
export const UserPreferencesSchema = z
  .record(z.string(), z.any())
  .describe('User preferences as key-value pairs');

export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

// ============================================================================
// Client Registration Types
// ============================================================================

/**
 * Client registration tracking
 * Stores connection status and onboarding progress per client
 */
export const ClientRegistrationSchema = z.object({
  status: z.enum(['needs_invite', 'invited', 'connected']).describe('Registration status'),
  progress: z.number().min(0).max(100).optional().describe('Onboarding progress 0-100'),
  steps: z.array(z.string()).optional().describe('Completed onboarding steps'),
  first_seen: z.string().datetime({ offset: true }).describe('First connection timestamp'),
  last_seen: z.string().datetime({ offset: true }).describe('Last connection timestamp')
});

export type ClientRegistration = z.infer<typeof ClientRegistrationSchema>;

/**
 * Invitations stored as flexible key-value pairs
 * Can store invitation tokens, status, etc.
 */
export const InvitationsSchema = z
  .record(z.string(), z.any())
  .describe('Invitations as key-value pairs');

export type Invitations = z.infer<typeof InvitationsSchema>;

// ============================================================================
// Composite Onboarding Metadata
// ============================================================================

/**
 * Complete onboarding metadata structure
 * Stores all user onboarding-related data in a compact format
 */
export const OnboardingMetadataSchema = z.object({
  // Consent tracking by URL
  consent: z
    .record(z.string().url(), CompactConsentRecordSchema)
    .optional()
    .describe('Consent records by URL'),

  // User preferences
  preferences: UserPreferencesSchema.optional().describe('User preferences'),

  // Invitations
  invitations: InvitationsSchema.optional().describe('Invitation data'),

  // Client registrations
  clients: z
    .record(z.string(), ClientRegistrationSchema)
    .optional()
    .describe('Client registrations by client ID')
});

export type OnboardingMetadata = z.infer<typeof OnboardingMetadataSchema>;

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Request to update onboarding metadata
 * Can update any combination of consent, preferences, invitations, or clients
 */
export const UpdateOnboardingMetadataRequestSchema = z.object({
  consent: z.record(z.string().url(), CompactConsentRecordSchema).optional(),
  preferences: UserPreferencesSchema.optional(),
  invitations: InvitationsSchema.optional(),
  clients: z.record(z.string(), ClientRegistrationSchema).optional()
});

export type UpdateOnboardingMetadataRequest = z.infer<typeof UpdateOnboardingMetadataRequestSchema>;

/**
 * Response from getting onboarding metadata
 */
export const GetOnboardingMetadataResponseSchema = z.object({
  metadata: OnboardingMetadataSchema,
  lastUpdated: z.string().datetime({ offset: true })
});

export type GetOnboardingMetadataResponse = z.infer<typeof GetOnboardingMetadataResponseSchema>;

/**
 * Request to confirm consent for a specific URL
 * Mirrors CompactConsentRecord structure with URL
 */
export const ConfirmConsentRequestSchema = z.object({
  url: z.string().url().describe('Consent document URL'),
  v: z.number().int().positive().describe('Document version number'),
  dh: z.string().min(1).describe('Device/location hash (SHA-256)'),
  ts: z.number().int().positive().describe('Timestamp in milliseconds')
});

export type ConfirmConsentRequest = z.infer<typeof ConfirmConsentRequestSchema>;

/**
 * Response from confirming consent
 */
export const ConfirmConsentResponseSchema = z.object({
  success: z.boolean(),
  metadata: OnboardingMetadataSchema.optional(),
  error: z.string().optional()
});

export type ConfirmConsentResponse = z.infer<typeof ConfirmConsentResponseSchema>;

/**
 * Response from getting all consents
 */
export const GetConsentsResponseSchema = z.object({
  consents: z.record(z.string().url(), CompactConsentRecordSchema),
  total: z.number().int().nonnegative()
});

export type GetConsentsResponse = z.infer<typeof GetConsentsResponseSchema>;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Parse onboarding metadata from user metadata
 */
export function parseOnboardingMetadata(metadata: unknown): OnboardingMetadata {
  if (!metadata || typeof metadata !== 'object') {
    return {};
  }

  try {
    return OnboardingMetadataSchema.parse(metadata);
  } catch (error) {
    console.warn('Failed to parse onboarding metadata:', error);
    return {};
  }
}

/**
 * Check if user has given consent to a specific URL
 */
export function hasConsentForUrl(metadata: OnboardingMetadata, url: string): boolean {
  return !!(metadata.consent && url in metadata.consent);
}

/**
 * Get all consent URLs the user has agreed to
 */
export function getConsentedUrls(metadata: OnboardingMetadata): string[] {
  return metadata.consent ? Object.keys(metadata.consent) : [];
}

/**
 * Get client registration status
 */
export function getClientStatus(
  metadata: OnboardingMetadata,
  clientId: string
): ClientRegistration | undefined {
  return metadata.clients?.[clientId];
}

export default {
  parseOnboardingMetadata,
  hasConsentForUrl,
  getConsentedUrls,
  getClientStatus
};
