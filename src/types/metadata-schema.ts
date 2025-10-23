/**
 * Unified Metadata Schema for Auth0 and WorkOS
 *
 * ⚠️ CRITICAL: Auth0 app_metadata and WorkOS metadata MUST have IDENTICAL fields
 *
 * This ensures consistency across both providers:
 * - Auth0: Stores in app_metadata (size-based limits, flexible)
 * - WorkOS: Stores in metadata (STRICT 10-field limit)
 *
 * Current field usage: 4/10 fields
 * Available fields: 6 remaining (for WorkOS constraint)
 *
 * NOTE: Organization membership is managed via native platform APIs:
 * - WorkOS: Use organization_membership API endpoints
 * - Auth0: Use Organizations API endpoints
 * No metadata storage needed for organization association.
 */

import { email, z } from 'zod';

// ============================================================================
// Unified Metadata Schema (Auth0 app_metadata and WorkOS metadata)
// ============================================================================

/**
 * UNIFIED SCHEMA - Auth0 app_metadata and WorkOS metadata MUST be identical
 *
 * Includes all planned metadata fields for future consolidation decisions
 */
export const UserMetadataSchema = z.object({
  // ========== User Identifiers ==========
  ids: z
    .object({
      supabase_user: z.string().uuid().optional().describe('Supabase user UUID for stable mapping')
    })
    .optional()
    .describe('External user identifiers (Supabase UUID, etc.)'),

  // ========== Onboarding & Consent ==========
  consent: z
    .record(
      z.string().url(),
      z.object({
        v: z.number().int().positive(),
        dh: z.string(),
        ts: z.number().int().positive()
      })
    )
    .optional()
    .describe('Consent records by URL (compact format)'),

  preferences: z
    .record(z.string(), z.any())
    .optional()
    .describe('User preferences (theme, language, timezone, etc.)'),

  // Active invitations keyed by token hash (SHA-256)
  // Only stores active invitations (not expired or completed)
  invitations: z
    .record(
      z.string(),
      z.object({
        email: z.string().email(),
        name: z.string().optional(),
        company: z.string().optional(),
        workflowType: z.string().optional(),
        comment: z.string().optional(),
        demoDuration: z.string().optional(),
        teamSize: z.string().optional(),
        timeline: z.string().optional(),
        role: z.string().optional(),
        requestId: z.string().optional(),
        createdAt: z.string().optional(),
        issuedAt: z.string().datetime({ offset: true }).nullable().optional(),
        expiresAt: z.string().datetime({ offset: true }).nullable().optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        phone: z.string().optional(),
        jobTitle: z.string().optional(),
        message: z.string().optional(),
        processedAt: z.string().datetime({ offset: true }),
        source: z.string()
      })
    )
    .optional()
    .describe('Active invitations keyed by token hash'),

  clients: z
    .record(
      z.string(),
      z.object({
        status: z.enum(['needs_invite', 'invited', 'connected']),
        progress: z.number().min(0).max(100).optional(),
        steps: z.array(z.string()).optional(),
        first_seen: z.string().datetime({ offset: true }),
        last_seen: z.string().datetime({ offset: true }),
        auto_confirm: z.boolean().optional(),
        source: z.string().optional(),
        code: z.string().optional(),
        email_sent: z.string().datetime({ offset: true }).optional()
      })
    )
    .optional()
    .describe('Client registrations'),

  // ========== WebAuthn credentials ==========
  webauthn_credentials: z.array(z.any()).optional().describe('WebAuthn credential storage'),

  // ========== Client association ==========
  clientId: z.string().optional().describe('Client ID association'),

  // ========== Pin authentication (temporary) ==========
  lastPin: z
    .object({
      sentAt: z.string().datetime({ offset: true }).describe('When the PIN was sent'),
      expiresAt: z.string().datetime({ offset: true }).describe('When the PIN expires')
    })
    .optional()
    .describe('Last PIN sent and expiry information')
});

export type UserMetadata = z.infer<typeof UserMetadataSchema>;

// ============================================================================
// Field Validation
// ============================================================================

/**
 * Get field count from metadata object
 * Counts all top-level fields that are defined and not null/undefined
 */
export function getFieldCount(metadata: Record<string, unknown>): number {
  return Object.keys(metadata).filter(
    (key) => metadata[key] !== undefined && metadata[key] !== null
  ).length;
}

/**
 * Validate metadata field count
 * Note: WorkOS has a 10-field limit, so this helps track field usage
 */
export function validateFieldLimit(metadata: Record<string, unknown>): {
  valid: boolean;
  count: number;
  available: number;
  fields: string[];
} {
  const count = getFieldCount(metadata);
  const available = 10 - count;
  const fields = Object.keys(metadata).filter(
    (key) => metadata[key] !== undefined && metadata[key] !== null
  );

  return {
    valid: count <= 10,
    count,
    available,
    fields
  };
}

/**
 * Get all fields currently in use
 */
export function getFieldsInUse(metadata: Record<string, unknown>): string[] {
  return Object.keys(metadata).filter(
    (key) => metadata[key] !== undefined && metadata[key] !== null
  );
}
