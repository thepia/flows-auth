/**
 * Client Rate Limiter Unit Tests
 * Tests for intelligent client-side rate limiting with server response handling
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClientRateLimiter } from '../../src/utils/client-rate-limiter';

describe('ClientRateLimiter', () => {
  let rateLimiter: ClientRateLimiter;
  let mockFetch: vi.MockedFunction<typeof fetch>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

    rateLimiter = new ClientRateLimiter({
      maxRequestsPerSecond: 5,
      burstCapacity: 8,
      respectServerHeaders: true,
      debugLogging: false
    });

    mockFetch = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Basic Rate Limiting (5 req/sec)', () => {
    it('should allow up to 5 requests per second', async () => {
      const responses = [];

      for (let i = 0; i < 5; i++) {
        mockFetch.mockResolvedValueOnce(new Response('OK', { status: 200 }));
        const promise = rateLimiter.executeRequest(() => mockFetch('/test'), '/test');
        responses.push(promise);
      }

      const results = await Promise.all(responses);
      expect(results).toHaveLength(5);
      expect(mockFetch).toHaveBeenCalledTimes(5);
    });

    it('should throttle 6th request in same second', async () => {
      // First 5 requests should go through
      for (let i = 0; i < 5; i++) {
        mockFetch.mockResolvedValueOnce(new Response('OK', { status: 200 }));
        await rateLimiter.executeRequest(() => mockFetch('/test'), '/test');
      }

      // 6th request should be delayed
      mockFetch.mockResolvedValueOnce(new Response('OK', { status: 200 }));
      const startTime = Date.now();
      const promise = rateLimiter.executeRequest(() => mockFetch('/test'), '/test');

      // Advance time to complete the delay
      await vi.advanceTimersByTimeAsync(1000);

      await promise;
      expect(mockFetch).toHaveBeenCalledTimes(6);
    });

    it('should allow burst capacity up to 8 requests', async () => {
      const responses = [];

      // Use burst capacity
      for (let i = 0; i < 8; i++) {
        mockFetch.mockResolvedValueOnce(new Response('OK', { status: 200 }));
        const promise = rateLimiter.executeRequest(() => mockFetch('/test'), '/test');
        responses.push(promise);
      }

      const results = await Promise.all(responses);
      expect(results).toHaveLength(8);
      expect(mockFetch).toHaveBeenCalledTimes(8);
    });
  });

  describe('Server Response Handling', () => {
    it('should handle 429 responses with Retry-After header', async () => {
      // First request gets rate limited
      const rateLimitResponse = new Response('Rate Limited', {
        status: 429,
        headers: { 'Retry-After': '5' }
      });
      mockFetch.mockResolvedValueOnce(rateLimitResponse);

      await rateLimiter.executeRequest(() => mockFetch('/test'), '/test');

      // Second request should be delayed by 5 seconds
      mockFetch.mockResolvedValueOnce(new Response('OK', { status: 200 }));
      const promise = rateLimiter.executeRequest(() => mockFetch('/test'), '/test');

      // Should not execute immediately
      await vi.advanceTimersByTimeAsync(4000);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Should execute after 5 second delay
      await vi.advanceTimersByTimeAsync(1000);
      await promise;
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle 429 responses with X-RateLimit-Reset header', async () => {
      const resetTime = Math.floor(Date.now() / 1000) + 3; // 3 seconds from now

      const rateLimitResponse = new Response('Rate Limited', {
        status: 429,
        headers: { 'X-RateLimit-Reset': resetTime.toString() }
      });
      mockFetch.mockResolvedValueOnce(rateLimitResponse);

      await rateLimiter.executeRequest(() => mockFetch('/test'), '/test');

      // Next request should wait until reset time
      mockFetch.mockResolvedValueOnce(new Response('OK', { status: 200 }));
      const promise = rateLimiter.executeRequest(() => mockFetch('/test'), '/test');

      await vi.advanceTimersByTimeAsync(3000);
      await promise;
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should clear backoff state on successful requests', async () => {
      // Get rate limited first
      mockFetch.mockResolvedValueOnce(
        new Response('Rate Limited', {
          status: 429,
          headers: { 'Retry-After': '2' }
        })
      );

      await rateLimiter.executeRequest(() => mockFetch('/test'), '/test');

      // Wait for backoff to clear
      await vi.advanceTimersByTimeAsync(2000);

      // Successful request should clear backoff
      mockFetch.mockResolvedValueOnce(new Response('OK', { status: 200 }));
      await rateLimiter.executeRequest(() => mockFetch('/test'), '/test');

      // Next request should not be delayed
      mockFetch.mockResolvedValueOnce(new Response('OK', { status: 200 }));
      const promise = rateLimiter.executeRequest(() => mockFetch('/test'), '/test');

      await promise; // Should resolve immediately
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('Statistics and State', () => {
    it('should provide accurate statistics', async () => {
      // Make a few requests
      const promises = [];
      for (let i = 0; i < 3; i++) {
        mockFetch.mockResolvedValueOnce(new Response('OK', { status: 200 }));
        promises.push(rateLimiter.executeRequest(() => mockFetch('/test'), '/test'));
      }

      await Promise.all(promises);

      const stats = rateLimiter.getStats();
      expect(stats.recentRequests).toBe(3);
      expect(stats.activeBackoffs).toBe(0);
      expect(stats.config.maxRequestsPerSecond).toBe(5);
    });

    it('should track active backoffs', async () => {
      // Get rate limited
      mockFetch.mockResolvedValueOnce(
        new Response('Rate Limited', {
          status: 429,
          headers: { 'Retry-After': '5' }
        })
      );

      await rateLimiter.executeRequest(() => mockFetch('/test'), '/test');

      const stats = rateLimiter.getStats();
      expect(stats.activeBackoffs).toBe(1);
    });

    it('should reset state', async () => {
      // Make requests and get rate limited
      const promises = [];
      for (let i = 0; i < 3; i++) {
        mockFetch.mockResolvedValueOnce(new Response('OK', { status: 200 }));
        promises.push(rateLimiter.executeRequest(() => mockFetch('/test'), '/test'));
      }

      await Promise.all(promises);

      rateLimiter.reset();

      const stats = rateLimiter.getStats();
      expect(stats.recentRequests).toBe(0);
      expect(stats.activeBackoffs).toBe(0);
    });
  });

  describe('Configuration', () => {
    it('should respect custom configuration', () => {
      const customLimiter = new ClientRateLimiter({
        maxRequestsPerSecond: 10,
        burstCapacity: 15,
        respectServerHeaders: false,
        debugLogging: true
      });

      const stats = customLimiter.getStats();
      expect(stats.config.maxRequestsPerSecond).toBe(10);
      expect(stats.config.burstCapacity).toBe(15);
      expect(stats.config.respectServerHeaders).toBe(false);
      expect(stats.config.debugLogging).toBe(true);
    });

    it('should use default configuration when not specified', () => {
      const defaultLimiter = new ClientRateLimiter();

      const stats = defaultLimiter.getStats();
      expect(stats.config.maxRequestsPerSecond).toBe(5);
      expect(stats.config.burstCapacity).toBe(8);
      expect(stats.config.respectServerHeaders).toBe(true);
      expect(stats.config.debugLogging).toBe(false);
    });
  });

  describe('Endpoint-Specific Handling', () => {
    it('should handle different endpoints independently', async () => {
      // Rate limit one endpoint
      mockFetch.mockResolvedValueOnce(
        new Response('Rate Limited', {
          status: 429,
          headers: { 'Retry-After': '5' }
        })
      );

      await rateLimiter.executeRequest(
        () => mockFetch('/auth/start-passwordless'),
        '/auth/start-passwordless'
      );

      // Different endpoint should not be affected
      mockFetch.mockResolvedValueOnce(new Response('OK', { status: 200 }));
      const promise = rateLimiter.executeRequest(
        () => mockFetch('/auth/check-user'),
        '/auth/check-user'
      );

      await promise; // Should resolve immediately
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
