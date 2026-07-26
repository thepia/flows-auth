/**
 * Server-side error telemetry for a Deno/edge API, using this package's own
 * runtime-agnostic TelemetryCore + PostHog capture-events transport
 * (@thepia/flows-auth/telemetry) to forward genuine upstream/server
 * failures to PostHog for API-health visibility.
 *
 * Imports @thepia/flows-auth/telemetry via the package's own name (a
 * self-reference, like ./svelte importing @thepia/flows-auth for core) -
 * not a relative ../core/telemetry.js path, for the same reason src/server
 * never reaches into src/core via relative paths (see biome.json's
 * noRestrictedImports override for src/server/**): core is bundled flat
 * by tsup while server is compiled per-file by tsc, so a relative path
 * across that boundary resolves at typecheck time but points nowhere in
 * the shipped output.
 *
 * tsconfig.json's dev-time `paths` alias for this specifier points at
 * source (for live-editing feedback), but tsconfig.server.json blanks it
 * back out - resolving @thepia/flows-auth/telemetry as a source .ts file
 * would pull src/core/telemetry.ts (and its own src/core/telemetry/**
 * dependencies) into this project, which tsc rejects as outside rootDir.
 * With `paths` blanked, this falls through to plain Node self-reference
 * resolution against the package's own `exports` map (dist/telemetry.d.ts),
 * the same path a real external consumer resolves through - which means
 * core must be built (dist/telemetry.d.ts present) before server builds;
 * see scripts/build.mjs's ordering.
 *
 * Uses createPostHogTransport (a plain fetch to PostHog's /batch/ endpoint)
 * rather than createOtlpLogsTransport - the OTLP path pulls in 5
 * @opentelemetry/* packages that add real weight to a bundled edge
 * function for a feature that only fires on rare upstream failures. Events
 * land in PostHog's Activity/Events explorer rather than its dedicated Logs
 * tab, which is an acceptable tradeoff for most consumers.
 */

import { createPostHogTransport, TelemetryCore } from '@thepia/flows-auth/telemetry';
import { getClientIP } from './client-ip.js';
import type { EnvChecker } from './env.js';

export interface ServerErrorTelemetry {
  endpoint: string;
  method: string;
  statusCode: number;
  message: string;
  requestId?: string;
  stack?: string;
  /** The end-user's IP (not the server's own outbound IP) - set as PostHog's `$ip` so GeoIP reflects the requester, not the infrastructure. */
  clientIp?: string;
  context?: Record<string, unknown>;
}

export interface ServerTelemetryOptions {
  /** PostHog ingestion host. Defaults to postHogHost from EnvChecker, then https://eu.i.posthog.com. */
  host?: string;
  /** Prefixed onto every PostHog event name. Defaults to 'server_'. */
  eventPrefix?: string;
  /** distinct_id attached to every event - there's no per-request "user" for server errors, so this identifies the server itself. Defaults to 'server'. */
  distinctId?: string;
  /**
   * Minimum response status `reportRouteServerError` reports as a server
   * error. Defaults to 500: the assumption is 5xx reflects a genuine
   * upstream/infrastructure problem worth tracking, while 4xx is routine
   * and already handled by the caller - but that's a judgment call, not a
   * spec, so it's configurable rather than hardcoded.
   */
  minStatusCode?: number;
}

export interface ServerTelemetry {
  /** Fire-and-forget: never throws, never delays or fails the caller's request. */
  reportServerError(event: ServerErrorTelemetry): void;

  /**
   * Report a genuine server failure for a completed API route response -
   * intended to be called once, centrally, from the top-level request
   * handler (the one place that sees the FINAL response status for every
   * route and already has the original client Request in scope for IP
   * extraction), rather than scattered across individual providers.
   *
   * Clones the response before reading its body so the caller still gets
   * an unconsumed Response back.
   */
  reportRouteServerError(response: Response, request: Request, path: string): void;
}

const NOOP_TELEMETRY: ServerTelemetry = {
  // Intentional no-ops: telemetry is disabled until an API key is configured.
  reportServerError() {
    // No-op
  },
  reportRouteServerError() {
    // No-op
  }
};

/**
 * Returns a no-op ServerTelemetry (both methods do nothing) when
 * `env.postHogApiKey` is unset, so local dev and tests never emit real
 * telemetry unless explicitly configured. Failures in the underlying
 * transport are always swallowed - a telemetry outage must never affect
 * the request that triggered it.
 */
export function createServerTelemetry(
  env: EnvChecker,
  options: ServerTelemetryOptions = {}
): ServerTelemetry {
  const apiKey = env.postHogApiKey;
  if (!apiKey) {
    return NOOP_TELEMETRY;
  }

  const host = options.host ?? env.postHogHost ?? 'https://eu.i.posthog.com';
  const minStatusCode = options.minStatusCode ?? 500;

  const core = new TelemetryCore(
    createPostHogTransport({
      apiKey,
      host,
      eventPrefix: options.eventPrefix ?? 'server_',
      distinctId: options.distinctId ?? 'server'
    }),
    {
      onError: (error: unknown) => console.warn('📊 [ServerTelemetry] Failed to send event:', error)
    }
  );

  function reportServerError(event: ServerErrorTelemetry): void {
    const { clientIp, context, ...rest } = event;

    core
      .report({
        type: 'server-error',
        ...rest,
        context: { ...(clientIp ? { $ip: clientIp } : {}), ...context }
      })
      .catch(() => {
        // Already logged via onError above.
      });
  }

  function reportRouteServerError(response: Response, request: Request, path: string): void {
    if (response.status < minStatusCode) {
      return;
    }

    const method = request.method;
    const clientIp = getClientIP(request);

    response
      .clone()
      .text()
      .then((body) => {
        let message = `HTTP ${response.status}`;
        try {
          const parsed = JSON.parse(body);
          message = parsed?.error || parsed?.message || message;
        } catch {
          // Not JSON - keep the generic message.
        }
        reportServerError({
          endpoint: path,
          method,
          statusCode: response.status,
          message,
          clientIp
        });
      })
      .catch(() => {
        reportServerError({
          endpoint: path,
          method,
          statusCode: response.status,
          message: `HTTP ${response.status}`,
          clientIp
        });
      });
  }

  return { reportServerError, reportRouteServerError };
}
