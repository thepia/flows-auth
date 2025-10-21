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
    it('should fetch all consents for the current user', async () => {
      const mockResponse: GetConsentsResponse = {
        consents: {
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
        },
        total: 2
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await apiClient.getConsents();

      expect(result).toEqual(mockResponse);
      expect(result.total).toBe(2);
      expect(Object.keys(result.consents)).toHaveLength(2);
    });

    it('should use app-specific endpoint when appCode is set', async () => {
      const mockResponse: GetConsentsResponse = {
        consents: {},
        total: 0
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await apiClient.getConsents();

      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toContain('/test-app/consents');
    });

    it('should handle empty consents response', async () => {
      const mockResponse: GetConsentsResponse = {
        consents: {},
        total: 0
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await apiClient.getConsents();

      expect(result.total).toBe(0);
      expect(Object.keys(result.consents)).toHaveLength(0);
    });

    it('should throw error on API failure', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal Server Error' })
      });

      await expect(apiClient.getConsents()).rejects.toThrow();
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

    it('should use PUT method for confirmConsent', async () => {
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
      expect(fetchCall[1].method).toBe('PUT');
    });

    it('should send request body as JSON', async () => {
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
      expect(body.url).toBe(request.url);
      expect(body.v).toBe(request.v);
      expect(body.dh).toBe(request.dh);
    });

    it('should handle consent confirmation failure', async () => {
      const request: ConfirmConsentRequest = {
        url: 'https://example.com/privacy',
        v: 1,
        dh: 'abc123def456',
        ts: Date.now()
      };

      const mockResponse: ConfirmConsentResponse = {
        success: false,
        error: 'Invalid document version'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await apiClient.confirmConsent(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid document version');
    });
  });

  describe('getOnboardingMetadata', () => {
    it('should fetch onboarding metadata', async () => {
      const mockResponse: GetOnboardingMetadataResponse = {
        metadata: {
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
        },
        lastUpdated: new Date().toISOString()
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await apiClient.getOnboardingMetadata();

      expect(result.metadata).toBeDefined();
      expect(result.metadata.consent).toBeDefined();
      expect(result.metadata.preferences).toBeDefined();
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

