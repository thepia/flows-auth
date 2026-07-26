/**
 * Real (non-mocked) proof of the "frontend -> API server -> PostHog"
 * telemetry architecture decided in the flows-auth session that built this:
 *
 * PostHog's own docs confirm its public capture endpoints have no rate
 * limiting - the project API key is only "write-only" (can't leak data
 * back), not protected against someone scripting fake events with a key
 * copied from view-source. So instead of the browser posting straight to
 * PostHog, it posts to this app's own /api/telemetry route (see
 * ../pages/api/telemetry.ts), which rate-limits by IP and only then
 * forwards to PostHog - using @thepia/flows-auth/telemetry's
 * createPostHogTransport via this repo's real pnpm workspace link (no
 * publish needed, unlike thepia.com which resolves flows-auth from the
 * published registry).
 *
 * Posts real events to the same production PostHog project thepia.com's
 * website uses, tagged synthetic:true under a distinct event prefix so
 * they're trivially filterable out of real analytics - same call made for
 * flows-auth's own tests/integration/telemetry-posthog.test.ts.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { handleTelemetryRequest, isRateLimited, resetRateLimitState } from './telemetry-endpoint.js';

const POSTHOG_API_KEY = 'phc_NbnaU7ZCsvRhapHZTmuPyWmJJo1Ne5ijekOK78h0UCX';
const POSTHOG_HOST = 'https://eu.i.posthog.com';

function makeRequest(body: unknown, ip = '203.0.113.1'): Request {
  return new Request('https://astro-demo.local/api/telemetry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body)
  });
}

function samplePayload(overrides: Record<string, unknown> = {}) {
  return {
    errors: [
      {
        type: 'server-error',
        message: 'astro-demo telemetry endpoint integration test - safe to ignore',
        timestamp: Date.now(),
        severity: 'low',
        context: { synthetic: true, source: 'astro-demo-telemetry-endpoint-test' }
      }
    ],
    authStates: [],
    sessionId: `test_${Math.random().toString(36).slice(2)}`,
    timestamp: Date.now(),
    ...overrides
  };
}

describe('astro-demo /api/telemetry endpoint', () => {
  beforeEach(() => {
    resetRateLimitState();
  });

  it('forwards a real event to PostHog and returns success', async () => {
    const response = await handleTelemetryRequest(makeRequest(samplePayload()), {
      posthogApiKey: POSTHOG_API_KEY,
      posthogHost: POSTHOG_HOST
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ success: true });
  });

  it('rejects malformed payloads with 400 before ever reaching PostHog', async () => {
    const response = await handleTelemetryRequest(makeRequest({ not: 'a valid envelope' }), {
      posthogApiKey: POSTHOG_API_KEY,
      posthogHost: POSTHOG_HOST
    });

    expect(response.status).toBe(400);
  });

  it('rate-limits a single IP after enough requests, independent of PostHog', async () => {
    // Use an unreachable host so this proves the rate limiter itself acts
    // BEFORE any network call is attempted - it can't be "lucky" real
    // PostHog latency masking the limit kicking in.
    const options = { posthogApiKey: POSTHOG_API_KEY, posthogHost: 'https://unreachable.invalid' };
    const ip = '203.0.113.42';

    const results: number[] = [];
    for (let i = 0; i < 25; i++) {
      const response = await handleTelemetryRequest(makeRequest(samplePayload(), ip), options);
      results.push(response.status);
    }

    // First 20 attempt to forward (and fail against the unreachable host ->
    // 502); the rest are rejected by the rate limiter before any network
    // call - status 429, not 502.
    expect(results.slice(0, 20).every((s) => s === 502)).toBe(true);
    expect(results.slice(20).every((s) => s === 429)).toBe(true);
  });

  it('does not rate-limit one IP based on another IP making requests', async () => {
    for (let i = 0; i < 20; i++) {
      isRateLimited('203.0.113.99');
    }
    expect(isRateLimited('203.0.113.99')).toBe(true);
    expect(isRateLimited('203.0.113.100')).toBe(false);
  });
});
