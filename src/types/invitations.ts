/**
 * Invitation System Types
 *
 * Types for handling invitation tokens and user registration data
 * across both Auth0 and WorkOS authentication providers.
 *
 * This is the single source of truth for invitation types used across
 * both flows-auth library and thepia.com application.
 */

/**
 * Active invitation data stored in user metadata
 * Keyed by invitation token hash (SHA-256)
 * Only stores active invitations (not expired or completed)
 */
export interface ActiveInvitation {
  email: string;
  name?: string;
  company?: string;
  workflowType?: string;
  comment?: string;
  demoDuration?: string;
  teamSize?: string;
  timeline?: string;
  role?: string;
  requestId?: string;
  createdAt?: string;
  issuedAt?: string | null;
  expiresAt?: string | null;
  firstName?: string;
  lastName?: string;
  phone?: string;
  jobTitle?: string;
  message?: string;
  processedAt: string;
  source: string;
}

/**
 * Client registration tracking
 * Stores information about which clients a user has registered with
 */
export interface ClientRegistration {
  status: "needs_invite" | "invited" | "connected";
  first_seen: string;
  last_seen: string;
  auto_confirm: boolean;
  registration_source: string;
  email_sent?: string;
}

/**
 * Consent record for tracking acceptance of documents/policies
 */
export interface ConsentRecord {
  accepted: boolean;
  timestamp: string;
  version?: string;
}

/**
 * Consent data for GDPR and policy tracking
 */
export interface ConsentData {
  terms?: ConsentRecord;
  privacy?: ConsentRecord;
  cookies?: ConsentRecord;
}

/**
 * User metadata stored in Auth0 app_metadata or WorkOS metadata
 * This is the unified metadata schema used across both providers
 */
export interface UserMetadata {
  /**
   * Active invitations keyed by token hash (SHA-256)
   * Only stores active invitations (not expired or completed)
   */
  invitations?: Record<string, ActiveInvitation>;

  clients?: Record<string, ClientRegistration>;
  original_client_id?: string;
  needs_email_confirmation?: boolean;
  consent_status?: string;
  consent_collected?: ConsentData;
  [key: string]: unknown; // Allow additional fields for Auth0 compatibility
}

