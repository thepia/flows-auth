/**
 * Telemetry ingestion endpoint: the browser auth store's Telemetry client
 * (see @thepia/flows-auth's errorReporting.endpoint config) POSTs its
 * {errors, authStates, sessionId, timestamp} envelope here. Rate-limited and
 * forwarded to PostHog server-side - see ../../lib/telemetry-endpoint.ts for
 * why this goes through the server instead of posting to PostHog directly
 * from the browser.
 */

import type { APIRoute } from 'astro';
import { handleTelemetryRequest } from '../../lib/telemetry-endpoint.js';

export const prerender = false;

// Same production PostHog project thepia.com's website uses (project API
// keys are write-only capture keys, safe to embed) - see the AskUserQuestion
// decision in this session: reuse the production project with synthetic-
// tagged events rather than a separate test project.
const POSTHOG_API_KEY = 'phc_NbnaU7ZCsvRhapHZTmuPyWmJJo1Ne5ijekOK78h0UCX';
const POSTHOG_HOST = 'https://eu.i.posthog.com';

export const POST: APIRoute = async ({ request, clientAddress }) => {
  // Astro provides the real connecting IP via clientAddress; tests instead
  // construct a plain Request with an x-forwarded-for header, which
  // handleTelemetryRequest reads directly.
  const ip = request.headers.get('x-forwarded-for') ? request : withForwardedFor(request, clientAddress);

  return handleTelemetryRequest(ip, {
    posthogApiKey: POSTHOG_API_KEY,
    posthogHost: POSTHOG_HOST
  });
};

function withForwardedFor(request: Request, ip: string): Request {
  const headers = new Headers(request.headers);
  headers.set('x-forwarded-for', ip);
  return new Request(request, { headers });
}
