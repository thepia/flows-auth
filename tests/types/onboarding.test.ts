/**
 * Onboarding Types Tests
 *
 * Tests validation and parsing of onboarding metadata types using Zod schemas.
 */
import { describe, expect, it } from 'vitest';
import {
  CompactConsentRecordSchema,
  ConfirmConsentRequestSchema,
  ConfirmConsentResponseSchema,
  GetConsentsResponseSchema,
  GetOnboardingMetadataResponseSchema,
  OnboardingMetadataSchema,
  UpdateOnboardingMetadataRequestSchema,
  getClientStatus,
  getConsentedUrls,
  hasConsentForUrl,
  parseOnboardingMetadata
} from '../../src/types/onboarding';
import type {
  CompactConsentRecord,
  ConfirmConsentRequest,
  OnboardingMetadata
} from '../../src/types/onboarding';

describe('Onboarding Types - Zod Validation', () => {
  describe('CompactConsentRecordSchema', () => {
    it('should validate a valid consent record', () => {
      const record = {
        v: 1,
        dh: 'abc123def456',
        ts: 1697500000000
      };

      const result = CompactConsentRecordSchema.safeParse(record);
      expect(result.success).toBe(true);
    });

    it('should reject record with missing fields', () => {
      const record = {
        v: 1,
        dh: 'abc123'
        // missing ts
      };

      const result = CompactConsentRecordSchema.safeParse(record);
      expect(result.success).toBe(false);
    });

    it('should reject record with invalid version (non-positive)', () => {
      const record = {
        v: 0,
        dh: 'abc123def456',
        ts: 1697500000000
      };

      const result = CompactConsentRecordSchema.safeParse(record);
      expect(result.success).toBe(false);
    });

    it('should reject record with empty device hash', () => {
      const record = {
        v: 1,
        dh: '',
        ts: 1697500000000
      };

      const result = CompactConsentRecordSchema.safeParse(record);
      expect(result.success).toBe(false);
    });
  });

  describe('ConfirmConsentRequestSchema', () => {
    it('should validate a valid consent request', () => {
      const request: ConfirmConsentRequest = {
        url: 'https://example.com/privacy',
        v: 1,
        dh: 'abc123def456',
        ts: Date.now()
      };

      const result = ConfirmConsentRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should reject request with invalid URL', () => {
      const request = {
        url: 'not-a-url',
        v: 1,
        dh: 'abc123def456',
        ts: Date.now()
      };

      const result = ConfirmConsentRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('should accept various valid URLs', () => {
      const urls = [
        'https://example.com/privacy',
        'https://talki.dev/notifications',
        'https://thepia.com/data-policy',
        'http://localhost:3000/terms'
      ];

      for (const url of urls) {
        const request = {
          url,
          v: 1,
          dh: 'hash123',
          ts: Date.now()
        };

        const result = ConfirmConsentRequestSchema.safeParse(request);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('ConfirmConsentResponseSchema', () => {
    it('should validate a successful response', () => {
      const response = {
        success: true,
        metadata: {
          consent: {
            'https://example.com/privacy': {
              v: 1,
              dh: 'abc123',
              ts: 1697500000000
            }
          }
        }
      };

      const result = ConfirmConsentResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should validate a failure response with error', () => {
      const response = {
        success: false,
        error: 'Invalid document version'
      };

      const result = ConfirmConsentResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });
  });

  describe('GetConsentsResponseSchema', () => {
    it('should validate a valid consents response', () => {
      const response = {
        consents: {
          'https://example.com/privacy': {
            v: 1,
            dh: 'abc123',
            ts: 1697500000000
          },
          'https://example.com/terms': {
            v: 2,
            dh: 'xyz789',
            ts: 1697500001000
          }
        },
        total: 2
      };

      const result = GetConsentsResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should validate empty consents response', () => {
      const response = {
        consents: {},
        total: 0
      };

      const result = GetConsentsResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });
  });

  describe('OnboardingMetadataSchema', () => {
    it('should validate complete metadata', () => {
      const metadata: OnboardingMetadata = {
        consent: {
          'https://example.com/privacy': {
            v: 1,
            dh: 'abc123',
            ts: 1697500000000
          }
        },
        preferences: {
          theme: 'dark',
          language: 'en',
          timezone: 'Europe/Copenhagen'
        },
        invitations: {
          'invite-1': { status: 'pending' }
        },
        clients: {
          'demo': {
            status: 'connected',
            progress: 100,
            steps: [],
            firstSeen: new Date().toISOString(),
            lastSeen: new Date().toISOString()
          }
        }
      };

      const result = OnboardingMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(true);
    });

    it('should validate partial metadata', () => {
      const metadata = {
        preferences: {
          theme: 'light'
        }
      };

      const result = OnboardingMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(true);
    });

    it('should validate empty metadata', () => {
      const metadata = {};

      const result = OnboardingMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(true);
    });
  });

  describe('Utility Functions', () => {
    describe('parseOnboardingMetadata', () => {
      it('should parse valid metadata', () => {
        const metadata = {
          consent: {
            'https://example.com/privacy': {
              v: 1,
              dh: 'abc123',
              ts: 1697500000000
            }
          }
        };

        const result = parseOnboardingMetadata(metadata);
        expect(result.consent).toBeDefined();
      });

      it('should return empty object for null/undefined', () => {
        expect(parseOnboardingMetadata(null)).toEqual({});
        expect(parseOnboardingMetadata(undefined)).toEqual({});
      });

      it('should handle invalid metadata gracefully', () => {
        const result = parseOnboardingMetadata('invalid');
        expect(result).toEqual({});
      });
    });

    describe('hasConsentForUrl', () => {
      it('should return true if user has consented', () => {
        const metadata: OnboardingMetadata = {
          consent: {
            'https://example.com/privacy': {
              v: 1,
              dh: 'abc123',
              ts: 1697500000000
            }
          }
        };

        expect(hasConsentForUrl(metadata, 'https://example.com/privacy')).toBe(true);
      });

      it('should return false if user has not consented', () => {
        const metadata: OnboardingMetadata = {
          consent: {
            'https://example.com/privacy': {
              v: 1,
              dh: 'abc123',
              ts: 1697500000000
            }
          }
        };

        expect(hasConsentForUrl(metadata, 'https://example.com/terms')).toBe(false);
      });

      it('should return false if no consents exist', () => {
        const metadata: OnboardingMetadata = {};

        expect(hasConsentForUrl(metadata, 'https://example.com/privacy')).toBe(false);
      });
    });

    describe('getConsentedUrls', () => {
      it('should return all consented URLs', () => {
        const metadata: OnboardingMetadata = {
          consent: {
            'https://example.com/privacy': {
              v: 1,
              dh: 'abc123',
              ts: 1697500000000
            },
            'https://example.com/terms': {
              v: 1,
              dh: 'xyz789',
              ts: 1697500001000
            }
          }
        };

        const urls = getConsentedUrls(metadata);
        expect(urls).toHaveLength(2);
        expect(urls).toContain('https://example.com/privacy');
        expect(urls).toContain('https://example.com/terms');
      });

      it('should return empty array if no consents', () => {
        const metadata: OnboardingMetadata = {};

        const urls = getConsentedUrls(metadata);
        expect(urls).toEqual([]);
      });
    });

    describe('getClientStatus', () => {
      it('should return client status if exists', () => {
        const metadata: OnboardingMetadata = {
          clients: {
            'demo': {
              status: 'connected',
              progress: 100,
              steps: [],
              firstSeen: new Date().toISOString(),
              lastSeen: new Date().toISOString()
            }
          }
        };

        const status = getClientStatus(metadata, 'demo');
        expect(status).toBeDefined();
        expect(status?.status).toBe('connected');
      });

      it('should return undefined if client does not exist', () => {
        const metadata: OnboardingMetadata = {};

        const status = getClientStatus(metadata, 'non-existent');
        expect(status).toBeUndefined();
      });
    });
  });
});

