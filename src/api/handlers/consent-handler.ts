/**
 * Consent Handler
 *
 * Server-side handler for managing user consent records.
 * Stores consent information in user metadata via Auth0/WorkOS.
 *
 * This handler is used by the API server to:
 * 1. Get all consents for a user
 * 2. Confirm consent for a specific document URL
 * 3. Update user metadata with consent records
 */

import type {
  ConfirmConsentRequest,
  ConfirmConsentResponse,
  GetConsentsResponse,
  OnboardingMetadata
} from '../../types/onboarding';
import {
  addConsentToMetadata,
  confirmConsentInMetadata,
  extractOnboardingMetadata,
  getAllConsents,
  getConsentStats
} from '../utils/consent-metadata';

/**
 * Get all consents for a user
 * Called by GET /{appCode}/consents or /consents endpoint
 */
export async function getConsentsHandler(
  userMetadata: Record<string, unknown> | undefined
): Promise<GetConsentsResponse> {
  const onboarding = extractOnboardingMetadata(userMetadata);
  const consents = getAllConsents(onboarding);

  return {
    consents,
    total: Object.keys(consents).length
  };
}

/**
 * Confirm consent for a specific document URL
 * Called by PUT /{appCode}/consents or /consents endpoint
 *
 * This handler:
 * 1. Validates the consent request
 * 2. Adds the consent record to user metadata
 * 3. Returns the updated metadata
 */
export async function confirmConsentHandler(
  request: ConfirmConsentRequest,
  userMetadata: Record<string, unknown> | undefined
): Promise<ConfirmConsentResponse> {
  try {
    // Validate request
    if (!validateConsentRequest(request)) {
      return {
        success: false,
        error: 'Invalid consent request: missing or invalid fields'
      };
    }

    // Extract current onboarding metadata
    const onboarding = extractOnboardingMetadata(userMetadata);

    // Add consent to metadata
    const updated = confirmConsentInMetadata(onboarding, request);

    // Return success with updated metadata
    return {
      success: true,
      metadata: updated
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to confirm consent';
    console.error('Error confirming consent:', error);

    return {
      success: false,
      error: message
    };
  }
}

/**
 * Get consent statistics for a user
 * Useful for analytics and debugging
 */
export async function getConsentStatsHandler(
  userMetadata: Record<string, unknown> | undefined
): Promise<{
  totalConsents: number;
  urls: string[];
  oldestConsent: number | null;
  newestConsent: number | null;
}> {
  const onboarding = extractOnboardingMetadata(userMetadata);
  return getConsentStats(onboarding);
}

/**
 * Validate consent request
 * Ensures all required fields are present and valid
 */
export function validateConsentRequest(request: unknown): request is ConfirmConsentRequest {
  if (!request || typeof request !== 'object') {
    return false;
  }

  const obj = request as Record<string, unknown>;

  // Validate URL format
  if (typeof obj.url !== 'string' || obj.url.length === 0) {
    return false;
  }

  try {
    new URL(obj.url);
  } catch {
    return false;
  }

  return (
    typeof obj.v === 'number' &&
    obj.v > 0 &&
    typeof obj.dh === 'string' &&
    obj.dh.length > 0 &&
    typeof obj.ts === 'number' &&
    obj.ts > 0
  );
}

/**
 * Format consent response for API
 * Ensures consistent response format
 */
export function formatConsentResponse(
  success: boolean,
  metadata?: OnboardingMetadata,
  error?: string
): ConfirmConsentResponse {
  return {
    success,
    ...(metadata && { metadata }),
    ...(error && { error })
  };
}
