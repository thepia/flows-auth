/**
 * Consent Metadata Management
 *
 * Utilities for storing and retrieving consent information in user metadata.
 * Handles compact storage of consent records by URL with version, device hash, and timestamp.
 */

import type {
  CompactConsentRecord,
  OnboardingMetadata,
  ConfirmConsentRequest
} from '../../types/onboarding';
import { OnboardingMetadataSchema } from '../../types/onboarding';

/**
 * Extract onboarding metadata from user metadata
 * Handles both Auth0 (app_metadata) and WorkOS (metadata) formats
 */
export function extractOnboardingMetadata(
  userMetadata: Record<string, unknown> | undefined
): OnboardingMetadata {
  if (!userMetadata) {
    return {};
  }

  // Try to parse as onboarding metadata
  try {
    return OnboardingMetadataSchema.parse(userMetadata);
  } catch (error) {
    console.warn('Failed to parse onboarding metadata:', error);
    return {};
  }
}

/**
 * Add or update a consent record in metadata
 * Returns the updated metadata object
 */
export function addConsentToMetadata(
  metadata: OnboardingMetadata,
  url: string,
  record: CompactConsentRecord
): OnboardingMetadata {
  return {
    ...metadata,
    consent: {
      ...(metadata.consent || {}),
      [url]: record
    }
  };
}

/**
 * Confirm consent from a request
 * Converts ConfirmConsentRequest to CompactConsentRecord and adds to metadata
 */
export function confirmConsentInMetadata(
  metadata: OnboardingMetadata,
  request: ConfirmConsentRequest
): OnboardingMetadata {
  const record: CompactConsentRecord = {
    v: request.v,
    dh: request.dh,
    ts: request.ts
  };

  return addConsentToMetadata(metadata, request.url, record);
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
 * Get consent record for a specific URL
 */
export function getConsentForUrl(
  metadata: OnboardingMetadata,
  url: string
): CompactConsentRecord | undefined {
  return metadata.consent?.[url];
}

/**
 * Remove consent for a specific URL
 */
export function removeConsentForUrl(
  metadata: OnboardingMetadata,
  url: string
): OnboardingMetadata {
  if (!metadata.consent || !(url in metadata.consent)) {
    return metadata;
  }

  const { [url]: _, ...remainingConsents } = metadata.consent;

  return {
    ...metadata,
    consent: Object.keys(remainingConsents).length > 0 ? remainingConsents : undefined
  };
}

/**
 * Get all consents as a record
 */
export function getAllConsents(metadata: OnboardingMetadata): Record<string, CompactConsentRecord> {
  return metadata.consent || {};
}

/**
 * Validate consent record structure
 */
export function isValidConsentRecord(record: unknown): record is CompactConsentRecord {
  if (!record || typeof record !== 'object') {
    return false;
  }

  const obj = record as Record<string, unknown>;
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
 * Merge consent records from multiple sources
 * Later sources override earlier ones
 */
export function mergeConsentRecords(
  ...records: Record<string, CompactConsentRecord>[]
): Record<string, CompactConsentRecord> {
  return records.reduce((acc, record) => {
    return { ...acc, ...record };
  }, {});
}

/**
 * Filter consents by timestamp range
 */
export function filterConsentsByDateRange(
  metadata: OnboardingMetadata,
  startTime: number,
  endTime: number
): Record<string, CompactConsentRecord> {
  const consents = metadata.consent || {};
  return Object.entries(consents).reduce(
    (acc, [url, record]) => {
      if (record.ts >= startTime && record.ts <= endTime) {
        acc[url] = record;
      }
      return acc;
    },
    {} as Record<string, CompactConsentRecord>
  );
}

/**
 * Get consent statistics
 */
export function getConsentStats(metadata: OnboardingMetadata) {
  const consents = metadata.consent || {};
  const urls = Object.keys(consents);

  return {
    totalConsents: urls.length,
    urls,
    oldestConsent: urls.length > 0 ? Math.min(...urls.map(url => consents[url].ts)) : null,
    newestConsent: urls.length > 0 ? Math.max(...urls.map(url => consents[url].ts)) : null
  };
}

