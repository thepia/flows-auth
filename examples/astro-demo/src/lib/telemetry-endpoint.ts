/**
 * Server-side telemetry forwarding: accepts the browser telemetry client's
 * {errors, authStates, sessionId, timestamp} envelope, applies a per-IP rate
 * limit, and forwards accepted events to PostHog.
 *
 * This proves out the "frontend -> API server -> PostHog" architecture
 * decided in this session: PostHog's own docs confirm its public capture
 * endpoints (/i/v0/e, /batch) have NO rate limiting at all - the project API
 * key is only "write-only" (can't leak data back), not protected against
 * someone else scripting fake events with a key copied from view-source.
 * Routing through our own server gives us an actual, enforceable throttle
 * that PostHog itself doesn't provide.
 *
 * A real deployment (e.g. thepia.com) would use a proper distributed rate
 * limiter; this in-memory sliding window is intentionally minimal, sized for
 * proving the architecture in this demo, not for production traffic.
 */

import { createPostHogTransport, type ErrorReportPayload } from '@thepia/flows-auth/telemetry';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;

const requestTimesByIp = new Map<string, number[]>();

export function isRateLimited(ip: string, now: number = Date.now()): boolean {
  const recent = (requestTimesByIp.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    requestTimesByIp.set(ip, recent);
    return true;
  }

  recent.push(now);
  requestTimesByIp.set(ip, recent);
  return false;
}

/** Test-only: clear rate limit state between test cases. */
export function resetRateLimitState(): void {
  requestTimesByIp.clear();
}

export interface TelemetryEndpointOptions {
  posthogApiKey: string;
  posthogHost: string;
}

function clientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}

export async function handleTelemetryRequest(
  request: Request,
  options: TelemetryEndpointOptions
): Promise<Response> {
  const ip = clientIp(request);

  if (isRateLimited(ip)) {
    return new Response(JSON.stringify({ error: 'rate_limited' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let payload: ErrorReportPayload;
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!Array.isArray(payload?.errors) || !Array.isArray(payload?.authStates)) {
    return new Response(JSON.stringify({ error: 'invalid_payload' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const transport = createPostHogTransport({
    apiKey: options.posthogApiKey,
    host: options.posthogHost,
    eventPrefix: 'flows_auth_telemetry_test_'
  });

  try {
    // The payload arrives already formatted by the client's TelemetryCore
    // (errors/authStates/sessionId/timestamp) - forward it straight through
    // rather than re-deriving it from a synthetic event.
    await transport(payload);
  } catch (error) {
    console.error('Failed to forward telemetry to PostHog:', error);
    return new Response(JSON.stringify({ error: 'forwarding_failed' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
