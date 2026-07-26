/**
 * createRateLimiter Unit Tests
 * Sliding-window enforcement, the dev/production enforcement gate, and the
 * withRateLimit wrapper's header/response behavior.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EnvChecker } from '../../src/server/env.js';
import { AUTH_RATE_LIMITS, createRateLimiter, type RateLimiter } from '../../src/server/rate-limiting.js';

function makeEnv(overrides: Partial<EnvChecker> = {}): EnvChecker {
  return {
    get postHogApiKey() {
      return undefined;
    },
    get postHogHost() {
      return undefined;
    },
    get apiServerHost() {
      return undefined;
    },
    get enforceRateLimit() {
      return undefined;
    },
    ...overrides
  };
}

function request(ip = '1.2.3.4'): Request {
  return new Request('https://api.example.com/auth/check-user', {
    headers: { 'x-forwarded-for': ip }
  });
}

describe('createRateLimiter - rateLimit (production env, always enforced)', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    // No apiServerHost -> treated as production -> always enforced.
    limiter = createRateLimiter(makeEnv());
  });

  afterEach(() => {
    limiter.clearRateLimitingIntervals();
    vi.useRealTimers();
  });

  it('allows the first request from a new key', () => {
    const result = limiter.rateLimit(request(), { windowMs: 1000, maxRequests: 2 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
  });

  it('allows requests up to the limit, then blocks with a 429', () => {
    const config = { windowMs: 60_000, maxRequests: 2 };
    expect(limiter.rateLimit(request(), config).allowed).toBe(true);
    expect(limiter.rateLimit(request(), config).allowed).toBe(true);

    const blocked = limiter.rateLimit(request(), config);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.error).toBeInstanceOf(Response);
    expect(blocked.error?.status).toBe(429);
  });

  it('tracks different keys (IPs) independently', () => {
    const config = { windowMs: 60_000, maxRequests: 1 };
    expect(limiter.rateLimit(request('1.1.1.1'), config).allowed).toBe(true);
    // A different IP should not be affected by the first IP's usage.
    expect(limiter.rateLimit(request('2.2.2.2'), config).allowed).toBe(true);
    expect(limiter.rateLimit(request('1.1.1.1'), config).allowed).toBe(false);
  });

  it('resets the window after windowMs elapses', () => {
    const config = { windowMs: 1000, maxRequests: 1 };
    expect(limiter.rateLimit(request(), config).allowed).toBe(true);
    expect(limiter.rateLimit(request(), config).allowed).toBe(false);

    vi.advanceTimersByTime(1001);

    expect(limiter.rateLimit(request(), config).allowed).toBe(true);
  });

  it('the 429 response includes Retry-After and X-RateLimit-* headers', () => {
    const config = { windowMs: 60_000, maxRequests: 1 };
    limiter.rateLimit(request(), config);
    const blocked = limiter.rateLimit(request(), config);

    expect(blocked.error?.headers.get('Retry-After')).toBeTruthy();
    expect(blocked.error?.headers.get('X-RateLimit-Limit')).toBe('1');
    expect(blocked.error?.headers.get('X-RateLimit-Remaining')).toBe('0');
  });

  it('honors a custom keyGenerator instead of the default IP+UA key', () => {
    // Ignores User-Agent entirely - keys purely on cf-connecting-ip.
    const customKeyGenerator = (req: Request) => req.headers.get('cf-connecting-ip') || 'unknown';
    const config = { windowMs: 60_000, maxRequests: 2, keyGenerator: customKeyGenerator };

    const requestFrom = (ip: string, userAgent: string) =>
      new Request('https://api.example.com/auth/test', {
        headers: { 'cf-connecting-ip': ip, 'user-agent': userAgent }
      });

    // Same IP, different User-Agent - should still share the same bucket
    // because the custom generator ignores User-Agent.
    expect(limiter.rateLimit(requestFrom('192.168.1.1', 'Browser1'), config).allowed).toBe(true);
    expect(limiter.rateLimit(requestFrom('192.168.1.1', 'Browser2'), config).allowed).toBe(true);
    expect(limiter.rateLimit(requestFrom('192.168.1.1', 'Browser3'), config).allowed).toBe(false);
  });
});

describe('AUTH_RATE_LIMITS presets', () => {
  it('register: 3 requests per 15 minutes', () => {
    expect(AUTH_RATE_LIMITS.register).toEqual({ windowMs: 15 * 60 * 1000, maxRequests: 3 });
  });

  it('checkUser: 10 requests per 5 minutes', () => {
    expect(AUTH_RATE_LIMITS.checkUser).toEqual({ windowMs: 5 * 60 * 1000, maxRequests: 10 });
  });

  it('refresh: 20 requests per 10 minutes', () => {
    expect(AUTH_RATE_LIMITS.refresh).toEqual({ windowMs: 10 * 60 * 1000, maxRequests: 20 });
  });

  it('webauthn: 30 requests per 5 minutes', () => {
    expect(AUTH_RATE_LIMITS.webauthn).toEqual({ windowMs: 5 * 60 * 1000, maxRequests: 30 });
  });
});

describe('createRateLimiter - dev/production enforcement gate', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('production (no apiServerHost): always enforces, even without an explicit flag', async () => {
    const limiter = createRateLimiter(makeEnv({ apiServerHost: undefined, enforceRateLimit: undefined }));
    const handler = limiter.withRateLimit(async () => new Response('ok'), {
      windowMs: 60_000,
      maxRequests: 1
    });

    expect((await handler(request())).status).toBe(200);
    expect((await handler(request())).status).toBe(429);
    limiter.clearRateLimitingIntervals();
  });

  it('local dev (apiServerHost includes :8443) without enforceRateLimit: bypasses limiting entirely', async () => {
    const limiter = createRateLimiter(
      makeEnv({ apiServerHost: 'dev.thepia.com:8443', enforceRateLimit: undefined })
    );
    const handler = limiter.withRateLimit(async () => new Response('ok'), {
      windowMs: 60_000,
      maxRequests: 1
    });

    expect((await handler(request())).status).toBe(200);
    expect((await handler(request())).status).toBe(200);
    expect((await handler(request())).status).toBe(200);
    limiter.clearRateLimitingIntervals();
  });

  it('local dev with enforceRateLimit="true": enforces exactly like production', async () => {
    const limiter = createRateLimiter(
      makeEnv({ apiServerHost: 'dev.thepia.com:8443', enforceRateLimit: 'true' })
    );
    const handler = limiter.withRateLimit(async () => new Response('ok'), {
      windowMs: 60_000,
      maxRequests: 1
    });

    expect((await handler(request())).status).toBe(200);
    expect((await handler(request())).status).toBe(429);
    limiter.clearRateLimitingIntervals();
  });

  it('local dev with enforceRateLimit="1": also treated as enforced', async () => {
    const limiter = createRateLimiter(makeEnv({ apiServerHost: 'dev.thepia.com:8443', enforceRateLimit: '1' }));
    const handler = limiter.withRateLimit(async () => new Response('ok'), {
      windowMs: 60_000,
      maxRequests: 1
    });

    expect((await handler(request())).status).toBe(200);
    expect((await handler(request())).status).toBe(429);
    limiter.clearRateLimitingIntervals();
  });

  it('a host without :8443 is not treated as local dev, even if set', async () => {
    const limiter = createRateLimiter(makeEnv({ apiServerHost: 'api.thepia.com', enforceRateLimit: undefined }));
    const handler = limiter.withRateLimit(async () => new Response('ok'), {
      windowMs: 60_000,
      maxRequests: 1
    });

    expect((await handler(request())).status).toBe(200);
    expect((await handler(request())).status).toBe(429);
    limiter.clearRateLimitingIntervals();
  });
});

describe('createRateLimiter - withRateLimit response handling', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = createRateLimiter(makeEnv());
  });

  afterEach(() => {
    limiter.clearRateLimitingIntervals();
  });

  it('adds X-RateLimit-* headers to a successful response without altering its body', async () => {
    const handler = limiter.withRateLimit(async () => new Response('hello'), AUTH_RATE_LIMITS.checkUser);
    const response = await handler(request());

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('hello');
    expect(response.headers.get('X-RateLimit-Limit')).toBe(String(AUTH_RATE_LIMITS.checkUser.maxRequests));
    expect(response.headers.get('X-RateLimit-Remaining')).toBeTruthy();
  });

  it('preserves the status and body of a non-200 handler response', async () => {
    const handler = limiter.withRateLimit(
      async () => new Response(JSON.stringify({ error: 'nope' }), { status: 404 }),
      AUTH_RATE_LIMITS.checkUser
    );
    const response = await handler(request());
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'nope' });
  });
});

describe('createRateLimiter - clearRateLimits', () => {
  it('clears tracked state so a previously-blocked key is allowed again', () => {
    const limiter = createRateLimiter(makeEnv());
    const config = { windowMs: 60_000, maxRequests: 1 };

    limiter.rateLimit(request(), config);
    expect(limiter.rateLimit(request(), config).allowed).toBe(false);

    limiter.clearRateLimits();

    expect(limiter.rateLimit(request(), config).allowed).toBe(true);
    limiter.clearRateLimitingIntervals();
  });
});
