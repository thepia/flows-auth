/**
 * Consent Metadata Utilities Tests
 *
 * Tests for storing and retrieving consent information in user metadata
 */

import { describe, it, expect } from 'vitest';
import type { CompactConsentRecord, OnboardingMetadata } from '../../src/types/onboarding';
import {
  addConsentToMetadata,
  confirmConsentInMetadata,
  extractOnboardingMetadata,
  getAllConsents,
  getConsentForUrl,
  getConsentedUrls,
  hasConsentForUrl,
  removeConsentForUrl,
  isValidConsentRecord,
  mergeConsentRecords,
  filterConsentsByDateRange,
  getConsentStats
} from '../../src/api/utils/consent-metadata';

describe('Consent Metadata Utilities', () => {
  const testUrl = 'https://example.com/terms';
  const testRecord: CompactConsentRecord = {
    v: 1,
    dh: 'abc123def456',
    ts: 1697500000000
  };

  describe('extractOnboardingMetadata', () => {
    it('should extract valid metadata', () => {
      const metadata = { consent: { [testUrl]: testRecord } };
      const result = extractOnboardingMetadata(metadata);
      expect(result.consent).toBeDefined();
      expect(result.consent?.[testUrl]).toEqual(testRecord);
    });

    it('should return empty object for undefined metadata', () => {
      const result = extractOnboardingMetadata(undefined);
      expect(result).toEqual({});
    });

    it('should handle invalid metadata gracefully', () => {
      const result = extractOnboardingMetadata({ invalid: 'data' });
      expect(result).toEqual({});
    });
  });

  describe('addConsentToMetadata', () => {
    it('should add consent to empty metadata', () => {
      const metadata: OnboardingMetadata = {};
      const result = addConsentToMetadata(metadata, testUrl, testRecord);
      expect(result.consent?.[testUrl]).toEqual(testRecord);
    });

    it('should add consent to existing metadata', () => {
      const url2 = 'https://example.com/privacy';
      const record2: CompactConsentRecord = { v: 2, dh: 'xyz789', ts: 1697500001000 };
      const metadata: OnboardingMetadata = { consent: { [testUrl]: testRecord } };

      const result = addConsentToMetadata(metadata, url2, record2);
      expect(result.consent?.[testUrl]).toEqual(testRecord);
      expect(result.consent?.[url2]).toEqual(record2);
    });

    it('should overwrite existing consent for same URL', () => {
      const newRecord: CompactConsentRecord = { v: 2, dh: 'new123', ts: 1697500002000 };
      const metadata: OnboardingMetadata = { consent: { [testUrl]: testRecord } };

      const result = addConsentToMetadata(metadata, testUrl, newRecord);
      expect(result.consent?.[testUrl]).toEqual(newRecord);
    });
  });

  describe('confirmConsentInMetadata', () => {
    it('should confirm consent from request', () => {
      const metadata: OnboardingMetadata = {};
      const request = { url: testUrl, v: 1, dh: 'abc123', ts: 1697500000000 };

      const result = confirmConsentInMetadata(metadata, request);
      expect(result.consent?.[testUrl]).toEqual({
        v: request.v,
        dh: request.dh,
        ts: request.ts
      });
    });
  });

  describe('hasConsentForUrl', () => {
    it('should return true for existing consent', () => {
      const metadata: OnboardingMetadata = { consent: { [testUrl]: testRecord } };
      expect(hasConsentForUrl(metadata, testUrl)).toBe(true);
    });

    it('should return false for missing consent', () => {
      const metadata: OnboardingMetadata = { consent: {} };
      expect(hasConsentForUrl(metadata, testUrl)).toBe(false);
    });

    it('should return false for empty metadata', () => {
      const metadata: OnboardingMetadata = {};
      expect(hasConsentForUrl(metadata, testUrl)).toBe(false);
    });
  });

  describe('getConsentForUrl', () => {
    it('should return consent record', () => {
      const metadata: OnboardingMetadata = { consent: { [testUrl]: testRecord } };
      const result = getConsentForUrl(metadata, testUrl);
      expect(result).toEqual(testRecord);
    });

    it('should return undefined for missing consent', () => {
      const metadata: OnboardingMetadata = { consent: {} };
      const result = getConsentForUrl(metadata, testUrl);
      expect(result).toBeUndefined();
    });
  });

  describe('removeConsentForUrl', () => {
    it('should remove consent', () => {
      const metadata: OnboardingMetadata = { consent: { [testUrl]: testRecord } };
      const result = removeConsentForUrl(metadata, testUrl);
      expect(result.consent).toBeUndefined();
    });

    it('should preserve other consents', () => {
      const url2 = 'https://example.com/privacy';
      const record2: CompactConsentRecord = { v: 2, dh: 'xyz789', ts: 1697500001000 };
      const metadata: OnboardingMetadata = {
        consent: { [testUrl]: testRecord, [url2]: record2 }
      };

      const result = removeConsentForUrl(metadata, testUrl);
      expect(result.consent?.[url2]).toEqual(record2);
      expect(result.consent?.[testUrl]).toBeUndefined();
    });
  });

  describe('getAllConsents', () => {
    it('should return all consents', () => {
      const url2 = 'https://example.com/privacy';
      const record2: CompactConsentRecord = { v: 2, dh: 'xyz789', ts: 1697500001000 };
      const metadata: OnboardingMetadata = {
        consent: { [testUrl]: testRecord, [url2]: record2 }
      };

      const result = getAllConsents(metadata);
      expect(Object.keys(result)).toHaveLength(2);
      expect(result[testUrl]).toEqual(testRecord);
      expect(result[url2]).toEqual(record2);
    });

    it('should return empty object for no consents', () => {
      const metadata: OnboardingMetadata = {};
      const result = getAllConsents(metadata);
      expect(result).toEqual({});
    });
  });

  describe('isValidConsentRecord', () => {
    it('should validate correct record', () => {
      expect(isValidConsentRecord(testRecord)).toBe(true);
    });

    it('should reject invalid records', () => {
      expect(isValidConsentRecord({ v: 1, dh: 'abc' })).toBe(false);
      expect(isValidConsentRecord({ v: 0, dh: 'abc', ts: 123 })).toBe(false);
      expect(isValidConsentRecord(null)).toBe(false);
    });
  });

  describe('mergeConsentRecords', () => {
    it('should merge multiple consent records', () => {
      const url2 = 'https://example.com/privacy';
      const record2: CompactConsentRecord = { v: 2, dh: 'xyz789', ts: 1697500001000 };

      const result = mergeConsentRecords(
        { [testUrl]: testRecord },
        { [url2]: record2 }
      );

      expect(Object.keys(result)).toHaveLength(2);
      expect(result[testUrl]).toEqual(testRecord);
      expect(result[url2]).toEqual(record2);
    });

    it('should allow later records to override', () => {
      const newRecord: CompactConsentRecord = { v: 2, dh: 'new123', ts: 1697500002000 };

      const result = mergeConsentRecords(
        { [testUrl]: testRecord },
        { [testUrl]: newRecord }
      );

      expect(result[testUrl]).toEqual(newRecord);
    });
  });

  describe('filterConsentsByDateRange', () => {
    it('should filter consents by date range', () => {
      const url2 = 'https://example.com/privacy';
      const record2: CompactConsentRecord = { v: 2, dh: 'xyz789', ts: 1697500001000 };
      const metadata: OnboardingMetadata = {
        consent: { [testUrl]: testRecord, [url2]: record2 }
      };

      const result = filterConsentsByDateRange(metadata, 1697500000000, 1697500000500);
      expect(Object.keys(result)).toHaveLength(1);
      expect(result[testUrl]).toEqual(testRecord);
    });
  });

  describe('getConsentStats', () => {
    it('should return consent statistics', () => {
      const url2 = 'https://example.com/privacy';
      const record2: CompactConsentRecord = { v: 2, dh: 'xyz789', ts: 1697500001000 };
      const metadata: OnboardingMetadata = {
        consent: { [testUrl]: testRecord, [url2]: record2 }
      };

      const stats = getConsentStats(metadata);
      expect(stats.totalConsents).toBe(2);
      expect(stats.urls).toContain(testUrl);
      expect(stats.urls).toContain(url2);
      expect(stats.oldestConsent).toBe(testRecord.ts);
      expect(stats.newestConsent).toBe(record2.ts);
    });

    it('should handle empty consents', () => {
      const metadata: OnboardingMetadata = {};
      const stats = getConsentStats(metadata);
      expect(stats.totalConsents).toBe(0);
      expect(stats.oldestConsent).toBeNull();
      expect(stats.newestConsent).toBeNull();
    });
  });
});

