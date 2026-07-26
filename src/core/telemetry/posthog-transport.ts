/**
 * PostHog transport for the telemetry core (./core.js). Converts the shared
 * {errors, authStates, sessionId, timestamp} envelope into PostHog capture
 * events and POSTs them to PostHog's /batch/ ingestion endpoint - a plain
 * HTTP call, so this works from any runtime (browser, Deno, Node) without
 * the posthog-js SDK.
 *
 * Plugs directly into TelemetryCore as a TelemetryTransport: on a non-2xx
 * response this throws, which TelemetryCore already treats as "queue for
 * retry" - no extra retry logic needed here.
 */

import type { ErrorReportPayload, TelemetryTransport } from './core.js';

export interface PostHogTransportOptions {
  apiKey: string;
  /**
   * PostHog Cloud is region-sharded (e.g. https://us.i.posthog.com vs
   * https://eu.i.posthog.com) - there is no safe default, since posting to
   * the wrong region doesn't error, it just silently never reaches the
   * project you're looking at. Must match the project the apiKey belongs to.
   */
  host: string;
  /** Prefixed onto every PostHog event name, e.g. 'server-error' -> 'flows_auth_server_error'. */
  eventPrefix?: string;
  /** Used as distinct_id when a report has no sessionId. */
  distinctId?: string;
  /** Override for testing or non-global-fetch runtimes. Defaults to the global fetch. */
  fetchImpl?: typeof fetch;
}

function toEventName(name: string, prefix: string): string {
  return `${prefix}${name
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()}`;
}

export function createPostHogTransport(options: PostHogTransportOptions): TelemetryTransport {
  const prefix = options.eventPrefix ?? 'flows_auth_';
  const doFetch = options.fetchImpl ?? fetch;

  return async (payload: ErrorReportPayload) => {
    const distinctId = payload.sessionId || options.distinctId || 'unknown';
    const isoTimestamp = new Date(payload.timestamp).toISOString();

    const batch = [
      ...payload.errors.map((report) => ({
        event: toEventName(report.type, prefix),
        distinct_id: distinctId,
        timestamp: isoTimestamp,
        properties: {
          message: report.message,
          stack: report.stack,
          url: report.url,
          userAgent: report.userAgent,
          severity: report.severity,
          sessionId: report.sessionId,
          ...report.context
        }
      })),
      ...payload.authStates.map((report) => ({
        event: toEventName(report.event, prefix),
        distinct_id: distinctId,
        timestamp: isoTimestamp,
        properties: {
          authMethod: report.authMethod,
          userId: report.userId,
          email: report.email,
          error: report.error,
          duration: report.duration,
          ...report.context
        }
      }))
    ];

    if (batch.length === 0) {
      return;
    }

    const response = await doFetch(`${options.host}/batch/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: options.apiKey, batch })
    });

    if (!response.ok) {
      throw new Error(`PostHog capture failed: ${response.status} ${response.statusText}`);
    }
  };
}
