/**
 * Sliding-window rate limiting for authentication endpoints.
 *
 * `createRateLimiter(env)` is a factory rather than a bare export: the
 * dev/production enforcement gate needs env access, but `withRateLimit`
 * wraps individual handlers at each of their own definition sites (not
 * through one central request choke point), so threading an `EnvChecker`
 * param through every call site would touch every handler file. Resolving
 * it once via the factory keeps each handler's own `withRateLimit(handler,
 * config)` call two-argument and unchanged.
 */

import { getClientIP } from './client-ip.js';
import type { EnvChecker } from './env.js';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (request: Request) => string; // Custom key generation
}

interface RateLimitEntry {
  count: number;
  windowStart: number;
  requests: number[]; // Sliding window timestamps
}

// Shared wire-level 429 body shape: `error` is a machine-readable code,
// `message` is the human-readable text.
interface RateLimitErrorBody {
  error: string;
  message: string;
  retryAfter?: number;
}

/**
 * Authentication endpoint rate limiting configuration
 */
export const AUTH_RATE_LIMITS = {
  // Registration: 3 attempts per 15 minutes per IP
  register: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 3
  },

  // Login/check-user: 10 attempts per 5 minutes per IP
  checkUser: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 10
  },

  // Token refresh: 20 attempts per 10 minutes per IP
  refresh: {
    windowMs: 10 * 60 * 1000, // 10 minutes
    maxRequests: 20
  },

  // WebAuthn challenges: 30 attempts per 5 minutes per IP
  webauthn: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 30
  }
} as const;

function defaultKeyGenerator(request: Request): string {
  const ip = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';
  return `${ip}:${userAgent.slice(0, 50)}`; // Limit UA length
}

export interface RateLimiter {
  /** Sliding-window check/record for a single request. Does not itself gate on dev/prod - see withRateLimit. */
  rateLimit(
    request: Request,
    config: RateLimitConfig
  ): { allowed: boolean; remaining: number; resetTime: number; error?: Response };

  /** Rate limiting wrapper for authentication handlers. */
  withRateLimit<T extends unknown[]>(
    handler: (request: Request, ...args: T) => Promise<Response>,
    config: RateLimitConfig
  ): (request: Request, ...args: T) => Promise<Response>;

  /** Log rate limiting analytics for monitoring. */
  logRateLimitAnalytics(): void;

  /** Clear rate limit store (for testing purposes). */
  clearRateLimits(): void;

  /** Clear all intervals (for testing purposes). */
  clearRateLimitingIntervals(): void;
}

export function createRateLimiter(env: EnvChecker): RateLimiter {
  // In-memory store for rate limiting (production should use Redis/external store)
  const rateLimitStore = new Map<string, RateLimitEntry>();

  // Cleanup old entries every 5 minutes
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now - entry.windowStart > 300000) {
        // 5 minutes
        rateLimitStore.delete(key);
      }
    }
  }, 300000);

  function rateLimit(
    request: Request,
    config: RateLimitConfig
  ): { allowed: boolean; remaining: number; resetTime: number; error?: Response } {
    const now = Date.now();
    const key = (config.keyGenerator || defaultKeyGenerator)(request);

    let entry = rateLimitStore.get(key);

    if (!entry) {
      // First request from this key
      entry = {
        count: 1,
        windowStart: now,
        requests: [now]
      };
      rateLimitStore.set(key, entry);

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: now + config.windowMs
      };
    }

    // Clean old requests outside the sliding window
    const windowStart = now - config.windowMs;
    entry.requests = entry.requests.filter((timestamp) => timestamp > windowStart);

    // Check if we're within the limit
    if (entry.requests.length >= config.maxRequests) {
      // Rate limit exceeded
      const oldestRequest = Math.min(...entry.requests);
      const resetTime = oldestRequest + config.windowMs;

      const errorBody: RateLimitErrorBody = {
        error: 'too_many_requests',
        message: 'Too many authentication requests. Please wait before trying again.',
        retryAfter: Math.ceil((resetTime - now) / 1000) // seconds
      };

      const error = new Response(JSON.stringify(errorBody), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil((resetTime - now) / 1000).toString(),
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString()
        }
      });

      return {
        allowed: false,
        remaining: 0,
        resetTime,
        error
      };
    }

    // Add current request to the window
    entry.requests.push(now);
    entry.count = entry.requests.length;

    return {
      allowed: true,
      remaining: config.maxRequests - entry.requests.length,
      resetTime: now + config.windowMs
    };
  }

  function shouldEnforceRateLimit(): boolean {
    // Check if we're in local development based on apiServerHost
    const apiServerHost = env.apiServerHost;
    const isLocalDev = apiServerHost?.includes(':8443');

    if (isLocalDev) {
      // In local development, check for explicit rate limit flag
      const enforceRateLimit = env.enforceRateLimit;
      return enforceRateLimit === 'true' || enforceRateLimit === '1';
    }

    // In production (no apiServerHost set), always enforce
    return true;
  }

  function withRateLimit<T extends unknown[]>(
    handler: (request: Request, ...args: T) => Promise<Response>,
    config: RateLimitConfig
  ) {
    return async (request: Request, ...args: T): Promise<Response> => {
      // Skip rate limiting in development unless explicitly enabled
      if (!shouldEnforceRateLimit()) {
        // Log that rate limiting is disabled for transparency
        const url = new URL(request.url);
        if (url.pathname.includes('/auth/')) {
          console.log('🔓 Rate limiting disabled (development mode)');
        }
        return handler(request, ...args);
      }

      const result = rateLimit(request, config);

      if (!result.allowed) {
        // Log rate limit violation for monitoring
        const ip = getClientIP(request);
        const userAgent = request.headers.get('user-agent') || 'unknown';

        console.warn('🚨 Rate limit exceeded:', {
          timestamp: new Date().toISOString(),
          ip,
          userAgent: userAgent.slice(0, 100),
          endpoint: new URL(request.url).pathname,
          method: request.method,
          resetTime: new Date(result.resetTime).toISOString()
        });

        // biome-ignore lint/style/noNonNullAssertion: result.error is always set when allowed is false
        return result.error!;
      }

      // Add rate limit headers to successful responses
      const response = await handler(request, ...args);

      // Clone response to add headers
      const newResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: new Headers(response.headers)
      });

      newResponse.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
      newResponse.headers.set('X-RateLimit-Remaining', result.remaining.toString());
      newResponse.headers.set('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString());

      return newResponse;
    };
  }

  function logRateLimitAnalytics(): void {
    const stats = {
      totalKeys: rateLimitStore.size,
      activeWindows: 0,
      topKeys: [] as Array<{ key: string; count: number; requests: number }>
    };

    const now = Date.now();
    const entries = Array.from(rateLimitStore.entries());

    for (const [key, entry] of entries) {
      if (now - entry.windowStart < 300000) {
        // Active within 5 minutes
        stats.activeWindows++;
      }

      const cleanKey = key.split(':')[0];
      if (cleanKey) {
        stats.topKeys.push({
          key: cleanKey, // IP only (hide user agent)
          count: entry.count,
          requests: entry.requests.length
        });
      }
    }

    // Sort by request count and take top 10
    stats.topKeys = stats.topKeys.sort((a, b) => b.requests - a.requests).slice(0, 10);

    console.log('📊 Rate limiting analytics:', {
      timestamp: new Date().toISOString(),
      ...stats
    });
  }

  // Log analytics every 10 minutes
  const analyticsInterval = setInterval(logRateLimitAnalytics, 10 * 60 * 1000);

  return {
    rateLimit,
    withRateLimit,
    logRateLimitAnalytics,
    clearRateLimits() {
      rateLimitStore.clear();
    },
    clearRateLimitingIntervals() {
      clearInterval(cleanupInterval);
      clearInterval(analyticsInterval);
    }
  };
}
