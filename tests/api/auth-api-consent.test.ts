/**
 * AuthApiClient - Consent API Tests
 *
 * Tests the consent management API endpoints (getConsents, confirmConsent)
 * and onboarding metadata endpoints.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthApiClient } from '../../src/api/auth-api';
import type { AuthConfig } from '../../src/types';
import type {
  ConfirmConsentRequest,
  ConfirmConsentResponse,
  GetConsentsResponse,
  GetOnboardingMetadataResponse
} from '../../src/types/onboarding';

// Mock fetch for API calls
global.fetch = vi.fn();

describe('AuthApiClient - Consent Management', () => {
  let apiClient: AuthApiClient;
  let mockConfig: AuthConfig;

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfig = {
      apiBaseUrl: 'https://api.test.com',
      appCode: 'test-app',
      enablePasskeys: true,
      enableMagicLinks: false
    };

    apiClient = new AuthApiClient(mockConfig);
  });

  describe('getConsents', () => {
    it('should fetch all consents from onboarding metadata', async () => {
      const mockMetadata = {
        metadata: {
          consent: {
            'https://example.com/privacy': {
              v: 1,
              dh: 'abc123def456',
              ts: 1697500000000
            },
            'https://example.com/terms': {
              v: 2,
              dh: 'xyz789uvw012',
              ts: 1697500001000
            }
          }
        },
        lastUpdated: new Date().toISOString()
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetadata
      });

      const result = await apiClient.getConsents();

      expect(result.total).toBe(2);
      expect(Object.keys(result.consents)).toHaveLength(2);
      expect(result.consents['https://example.com/privacy']).toEqual({
        v: 1,
        dh: 'abc123def456',
        ts: 1697500000000
      });
    });

    it('should use app-specific metadata endpoint when appCode is set', async () => {
      const mockResponse = {
        success: true,
        metadata: { consent: {} }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await apiClient.getConsents();

      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toContain('/test-app/metadata');
      expect(fetchCall[1].method).toBe('GET');
    });

    it('should handle empty consents in metadata', async () => {
      const mockMetadata = {
        metadata: { consent: {} },
        lastUpdated: new Date().toISOString()
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetadata
      });

      const result = await apiClient.getConsents();

      expect(result.total).toBe(0);
      expect(Object.keys(result.consents)).toHaveLength(0);
    });

    it('should return empty consents on API failure', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal Server Error' })
      });

      const result = await apiClient.getConsents();

      expect(result.total).toBe(0);
      expect(result.consents).toEqual({});
    });
  });

  describe('confirmConsent', () => {
    it('should confirm consent for a document URL', async () => {
      const request: ConfirmConsentRequest = {
        url: 'https://example.com/privacy',
        v: 1,
        dh: 'abc123def456',
        ts: Date.now()
      };

      const mockResponse: ConfirmConsentResponse = {
        success: true,
        metadata: {
          consent: {
            'https://example.com/privacy': {
              v: 1,
              dh: 'abc123def456',
              ts: request.ts
            }
          }
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await apiClient.confirmConsent(request);

      expect(result.success).toBe(true);
      expect(result.metadata?.consent).toBeDefined();
    });

    it('should use PATCH method for confirmConsent', async () => {
      const request: ConfirmConsentRequest = {
        url: 'https://example.com/terms',
        v: 1,
        dh: 'xyz789uvw012',
        ts: Date.now()
      };

      const mockResponse: ConfirmConsentResponse = {
        success: true
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await apiClient.confirmConsent(request);

      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[1].method).toBe('PATCH');
    });

    it('should send request body as JSON with patch wrapper', async () => {
      const request: ConfirmConsentRequest = {
        url: 'https://example.com/cookies',
        v: 1,
        dh: 'hash123',
        ts: Date.now()
      };

      const mockResponse: ConfirmConsentResponse = {
        success: true
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await apiClient.confirmConsent(request);

      const fetchCall = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.patch).toBeDefined();
      expect(body.patch.consent).toBeDefined();
      expect(body.patch.consent[request.url]).toEqual({
        v: request.v,
        dh: request.dh,
        ts: request.ts
      });
    });

    it('should handle consent confirmation failure', async () => {
      const request: ConfirmConsentRequest = {
        url: 'https://example.com/privacy',
        v: 1,
        dh: 'abc123def456',
        ts: Date.now()
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid document version' })
      });

      const result = await apiClient.confirmConsent(request);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getOnboardingMetadata', () => {
    it('should fetch onboarding metadata from metadata endpoint', async () => {
      const mockMetadata = {
        consent: {
          'https://example.com/privacy': {
            v: 1,
            dh: 'abc123',
            ts: 1697500000000
          }
        },
        preferences: {
          theme: 'dark',
          language: 'en'
        }
      };

      const mockResponse = {
        success: true,
        metadata: mockMetadata
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await apiClient.getOnboardingMetadata();

      expect(result.metadata).toBeDefined();
      expect(result.metadata.consent).toBeDefined();
      expect(result.metadata.preferences).toBeDefined();
      expect(result.lastUpdated).toBeDefined();
    });

    it('should use app-specific metadata endpoint when appCode is set', async () => {
      const mockResponse = {
        success: true,
        metadata: {}
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await apiClient.getOnboardingMetadata();

      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toContain('/test-app/metadata');
      expect(fetchCall[1].method).toBe('GET');
    });
  });

  describe('updateOnboardingMetadata', () => {
    it('should update onboarding metadata', async () => {
      const request = {
        preferences: {
          theme: 'light',
          language: 'da'
        }
      };

      const mockResponse: GetOnboardingMetadataResponse = {
        metadata: {
          preferences: request.preferences
        },
        lastUpdated: new Date().toISOString()
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await apiClient.updateOnboardingMetadata(request);

      expect(result.metadata.preferences).toEqual(request.preferences);
    });
  });
});
