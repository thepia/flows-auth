/**
 * Unit tests for API server detection utility
 * Tests various network conditions and fallback scenarios
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_API_CONFIG, detectApiServer } from '../../src/utils/api-detection';

describe('detectApiServer', () => {
  // Mock fetch
  const mockFetch = vi.fn();
  global.fetch = mockFetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful detection', () => {
    it('should detect local API server when healthy', async () => {
      // Mock successful local health check
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'healthy',
          server: 'thepia-api-local',
          version: '1.0.0'
        })
      });

      const result = await detectApiServer(DEFAULT_API_CONFIG);

      expect(result).toEqual({
        url: 'https://dev.thepia.com:8443',
        type: 'local',
        isHealthy: true,
        serverInfo: {
          version: '1.0.0',
          environment: 'local'
        }
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://dev.thepia.com:8443/health',
        expect.objectContaining({
          signal: expect.any(AbortSignal)
        })
      );
    });

    it('should fallback to production when local is unavailable', async () => {
      // Mock failed local health check
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await detectApiServer(DEFAULT_API_CONFIG);

      expect(result).toEqual({
        url: 'https://api.thepia.com',
        type: 'production',
        isHealthy: true,
        serverInfo: undefined
      });
    });

    it('should prefer production when preferLocal is false', async () => {
      const config = {
        ...DEFAULT_API_CONFIG,
        preferLocal: false
      };

      const result = await detectApiServer(config);

      expect(result).toEqual({
        url: 'https://api.thepia.com',
        type: 'production',
        isHealthy: true,
        serverInfo: undefined
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('timeout handling', () => {
    it('should timeout after specified duration', async () => {
      // Mock slow response
      mockFetch.mockImplementationOnce(() => new Promise((resolve) => setTimeout(resolve, 5000)));

      const config = {
        ...DEFAULT_API_CONFIG,
        healthTimeout: 100 // 100ms timeout
      };

      const result = await detectApiServer(config);

      expect(result.type).toBe('production');
      expect(result.url).toBe('https://api.thepia.com');
    });
  });

  describe('localhost handling', () => {
    it('should try local API first when running on localhost', async () => {
      const mockLocation = { hostname: 'localhost' };

      // Mock successful local health check
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'healthy',
          version: '1.0.0',
          environment: 'local'
        })
      });

      const result = await detectApiServer(DEFAULT_API_CONFIG, mockLocation);

      expect(result).toEqual({
        url: 'https://dev.thepia.com:8443',
        type: 'local',
        isHealthy: true,
        serverInfo: {
          version: '1.0.0',
          environment: 'local'
        }
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://dev.thepia.com:8443/health',
        expect.objectContaining({
          signal: expect.any(AbortSignal)
        })
      );
    });

    it('should fallback to production when local API unavailable on localhost', async () => {
      const mockLocation = { hostname: 'localhost' };

      // Mock failed local health check
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await detectApiServer(DEFAULT_API_CONFIG, mockLocation);

      expect(result).toEqual({
        url: 'https://api.thepia.com',
        type: 'production',
        isHealthy: true,
        serverInfo: undefined
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://dev.thepia.com:8443/health',
        expect.objectContaining({
          signal: expect.any(AbortSignal)
        })
      );
    });
  });

  describe('custom configuration', () => {
    it('should use custom URLs when provided', async () => {
      const customConfig = {
        localUrl: 'https://custom.local:9000',
        productionUrl: 'https://custom.api.com',
        healthTimeout: 5000,
        preferLocal: true
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'healthy' })
      });

      const result = await detectApiServer(customConfig);

      expect(result.url).toBe('https://custom.local:9000');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://custom.local:9000/health',
        expect.any(Object)
      );
    });

    it('should handle missing localUrl', async () => {
      const config = {
        productionUrl: 'https://api.example.com',
        preferLocal: true
      };

      const result = await detectApiServer(config as any);

      expect(result).toEqual({
        url: 'https://api.example.com',
        type: 'production',
        isHealthy: true,
        serverInfo: undefined
      });
    });
  });

  describe('error handling', () => {
    it('should handle non-200 health check responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503
      });

      const result = await detectApiServer(DEFAULT_API_CONFIG);

      expect(result.type).toBe('production');
    });

    it('should handle malformed health check responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        }
      });

      const result = await detectApiServer(DEFAULT_API_CONFIG);

      expect(result).toEqual({
        url: 'https://dev.thepia.com:8443',
        type: 'local',
        isHealthy: true,
        serverInfo: undefined
      });
    });
  });
});
