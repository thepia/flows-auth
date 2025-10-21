/**
 * Consent Handler Tests
 *
 * Tests for server-side consent handling
 */

import { describe, it, expect } from 'vitest';
import type { ConfirmConsentRequest, OnboardingMetadata } from '../../src/types/onboarding';
import {
  getConsentsHandler,
  confirmConsentHandler,
  getConsentStatsHandler,
  validateConsentRequest,
  formatConsentResponse
} from '../../src/api/handlers/consent-handler';

describe('Consent Handler', () => {
  const testUrl = 'https://example.com/terms';
  const testRequest: ConfirmConsentRequest = {
    url: testUrl,
    v: 1,
    dh: 'abc123def456',
    ts: 1697500000000
  };

  describe('getConsentsHandler', () => {
    it('should return empty consents for new user', async () => {
      const result = await getConsentsHandler(undefined);
      expect(result.consents).toEqual({});
      expect(result.total).toBe(0);
    });

    it('should return existing consents', async () => {
      const metadata = {
        consent: {
          [testUrl]: { v: 1, dh: 'abc123', ts: 1697500000000 }
        }
      };

      const result = await getConsentsHandler(metadata);
      expect(result.total).toBe(1);
      expect(result.consents[testUrl]).toBeDefined();
    });

    it('should handle multiple consents', async () => {
      const url2 = 'https://example.com/privacy';
      const metadata = {
        consent: {
          [testUrl]: { v: 1, dh: 'abc123', ts: 1697500000000 },
          [url2]: { v: 1, dh: 'xyz789', ts: 1697500001000 }
        }
      };

      const result = await getConsentsHandler(metadata);
      expect(result.total).toBe(2);
      expect(Object.keys(result.consents)).toHaveLength(2);
    });
  });

  describe('confirmConsentHandler', () => {
    it('should confirm consent for new user', async () => {
      const result = await confirmConsentHandler(testRequest, undefined);
      expect(result.success).toBe(true);
      expect(result.metadata?.consent?.[testUrl]).toBeDefined();
      expect(result.metadata?.consent?.[testUrl]).toEqual({
        v: testRequest.v,
        dh: testRequest.dh,
        ts: testRequest.ts
      });
    });

    it('should confirm consent for existing user', async () => {
      const existingUrl = 'https://example.com/existing';
      const metadata = {
        consent: {
          [existingUrl]: { v: 1, dh: 'existing123', ts: 1697500000000 }
        }
      };

      const result = await confirmConsentHandler(testRequest, metadata);
      expect(result.success).toBe(true);
      expect(result.metadata?.consent?.[existingUrl]).toBeDefined();
      expect(result.metadata?.consent?.[testUrl]).toBeDefined();
    });

    it('should update existing consent for same URL', async () => {
      const metadata = {
        consent: {
          [testUrl]: { v: 1, dh: 'old123', ts: 1697500000000 }
        }
      };

      const newRequest: ConfirmConsentRequest = {
        ...testRequest,
        v: 2,
        dh: 'new456'
      };

      const result = await confirmConsentHandler(newRequest, metadata);
      expect(result.success).toBe(true);
      expect(result.metadata?.consent?.[testUrl].v).toBe(2);
      expect(result.metadata?.consent?.[testUrl].dh).toBe('new456');
    });

    it('should handle errors gracefully', async () => {
      const invalidRequest = { url: 'not-a-url' } as unknown as ConfirmConsentRequest;
      const result = await confirmConsentHandler(invalidRequest, undefined);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getConsentStatsHandler', () => {
    it('should return stats for empty metadata', async () => {
      const stats = await getConsentStatsHandler(undefined);
      expect(stats.totalConsents).toBe(0);
      expect(stats.urls).toEqual([]);
      expect(stats.oldestConsent).toBeNull();
      expect(stats.newestConsent).toBeNull();
    });

    it('should return stats for multiple consents', async () => {
      const url2 = 'https://example.com/privacy';
      const metadata = {
        consent: {
          [testUrl]: { v: 1, dh: 'abc123', ts: 1697500000000 },
          [url2]: { v: 1, dh: 'xyz789', ts: 1697500001000 }
        }
      };

      const stats = await getConsentStatsHandler(metadata);
      expect(stats.totalConsents).toBe(2);
      expect(stats.urls).toContain(testUrl);
      expect(stats.urls).toContain(url2);
      expect(stats.oldestConsent).toBe(1697500000000);
      expect(stats.newestConsent).toBe(1697500001000);
    });
  });

  describe('validateConsentRequest', () => {
    it('should validate correct request', () => {
      expect(validateConsentRequest(testRequest)).toBe(true);
    });

    it('should reject invalid requests', () => {
      expect(validateConsentRequest(null)).toBe(false);
      expect(validateConsentRequest({})).toBe(false);
      expect(validateConsentRequest({ url: testUrl })).toBe(false);
      expect(validateConsentRequest({ url: 'not-a-url', v: 1, dh: 'abc', ts: 123 })).toBe(false);
      expect(validateConsentRequest({ url: testUrl, v: 0, dh: 'abc', ts: 123 })).toBe(false);
      expect(validateConsentRequest({ url: testUrl, v: 1, dh: '', ts: 123 })).toBe(false);
      expect(validateConsentRequest({ url: testUrl, v: 1, dh: 'abc', ts: 0 })).toBe(false);
    });
  });

  describe('formatConsentResponse', () => {
    it('should format success response', () => {
      const metadata: OnboardingMetadata = {
        consent: { [testUrl]: { v: 1, dh: 'abc123', ts: 1697500000000 } }
      };

      const response = formatConsentResponse(true, metadata);
      expect(response.success).toBe(true);
      expect(response.metadata).toEqual(metadata);
      expect(response.error).toBeUndefined();
    });

    it('should format error response', () => {
      const response = formatConsentResponse(false, undefined, 'Test error');
      expect(response.success).toBe(false);
      expect(response.error).toBe('Test error');
      expect(response.metadata).toBeUndefined();
    });

    it('should format response without metadata', () => {
      const response = formatConsentResponse(true);
      expect(response.success).toBe(true);
      expect(response.metadata).toBeUndefined();
    });
  });
});

