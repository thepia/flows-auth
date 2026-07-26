/**
 * Runtime-agnostic telemetry core: event shapes, wire-format conversion, and
 * a transport-pluggable reporter with queue/retry. No dependency on
 * AuthApiClient, AuthConfig, or browser globals (window/navigator/service
 * worker), so this module works unmodified in a browser bundle or in a
 * server runtime (e.g. Deno) - see `../utils/telemetry.ts` for the browser
 * wrapper that adds the AuthApiClient transport and service worker logging.
 */

import type {
  AuthStateReport,
  DevErrorSeverity,
  ErrorReport,
  ErrorReportPayload
} from '../types/dev-error-reports.js';

export interface SerializedError {
  name?: string;
  message?: string;
  code?: string | number;
  stack?: string;
}

export interface AuthStateEvent {
  type: 'auth-state-change';
  event:
    | 'login-attempt'
    | 'login-success'
    | 'login-failure'
    | 'webauthn-start'
    | 'webauthn-success'
    | 'webauthn-failure'
    | 'webauthn-register-start'
    | 'webauthn-register-success'
    | 'webauthn-register-failure'
    | 'sign-in-started'
    | 'sign-in-success'
    | 'sign-in-error'
    | 'token-refreshed'
    | 'sign-out'
    | 'registration-start'
    | 'registration-success'
    | 'registration-failure';
  email?: string;
  userId?: string;
  authMethod?: 'passkey' | 'password' | 'email' | 'unknown';
  duration?: number;
  error?: string;
  context?: Record<string, unknown>;
}

export interface WebAuthnErrorEvent {
  type: 'webauthn-error';
  operation: 'authentication' | 'registration';
  error: SerializedError;
  context?: Record<string, unknown>;
}

export interface ApiErrorEvent {
  type: 'api-error';
  url: string;
  method: string;
  status: number;
  message: string;
  context?: Record<string, unknown>;
}

/**
 * A backend request that failed on the server side (as opposed to
 * ApiErrorEvent, which is a client observing an API response). Intended for
 * use from an API server's own error handling - e.g. thepia.com's Deno API
 * reporting one of its own 500s, with enough context (endpoint, requestId,
 * stack) to reproduce.
 */
export interface ServerErrorEvent {
  type: 'server-error';
  endpoint: string;
  method: string;
  statusCode: number;
  message: string;
  requestId?: string;
  stack?: string;
  context?: Record<string, unknown>;
}

export type TelemetryEvent = AuthStateEvent | WebAuthnErrorEvent | ApiErrorEvent | ServerErrorEvent;

export type { AuthStateReport, DevErrorSeverity, ErrorReport, ErrorReportPayload };

/**
 * Split a telemetry event into the `errors` / `authStates` arrays of the
 * shared wire envelope (see ../types/dev-error-reports.js).
 */
export function toErrorReportArrays(
  event: TelemetryEvent,
  timestamp: number
): { errors: ErrorReport[]; authStates: AuthStateReport[] } {
  if (event.type === 'auth-state-change') {
    const authState: AuthStateReport = {
      type: 'auth-state-change',
      event: event.event,
      authMethod: event.authMethod === 'unknown' ? undefined : event.authMethod,
      userId: event.userId,
      email: event.email,
      error: event.error,
      duration: event.duration,
      timestamp,
      context: event.context
    };
    return { errors: [], authStates: [authState] };
  }

  if (event.type === 'webauthn-error') {
    const errorReport: ErrorReport = {
      type: 'webauthn-error',
      message: event.error.message || event.error.name || 'WebAuthn error',
      stack: event.error.stack,
      timestamp,
      context: { operation: event.operation, ...event.context },
      severity: 'high'
    };
    return { errors: [errorReport], authStates: [] };
  }

  if (event.type === 'server-error') {
    const errorReport: ErrorReport = {
      type: 'server-error',
      message: event.message,
      stack: event.stack,
      timestamp,
      context: {
        endpoint: event.endpoint,
        method: event.method,
        statusCode: event.statusCode,
        requestId: event.requestId,
        ...event.context
      },
      severity: event.statusCode >= 500 ? 'high' : 'medium'
    };
    return { errors: [errorReport], authStates: [] };
  }

  // api-error
  const errorReport: ErrorReport = {
    type: 'api-error',
    message: event.message,
    timestamp,
    context: { url: event.url, method: event.method, status: event.status, ...event.context },
    severity: event.status >= 500 ? 'high' : 'medium'
  };
  return { errors: [errorReport], authStates: [] };
}

function generateSessionId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export type TelemetryTransport = (payload: ErrorReportPayload) => Promise<void>;

export interface TelemetryCoreOptions {
  sessionId?: string;
  maxRetries?: number;
  retryDelay?: number;
  onError?: (error: unknown, event: TelemetryEvent) => void;
}

/** Per-event context a caller can supply in place of browser globals (window.navigator.userAgent, window.location.href). */
export interface TelemetryRequestContext {
  userAgent?: string;
  url?: string;
}

/**
 * Transport-agnostic reporter: formats events onto the shared wire envelope,
 * sends them through an injected transport, and retries on failure with
 * exponential-ish backoff (same policy as the original browser-only
 * implementation). Used directly by non-browser callers (e.g. an API
 * server); wrapped by ../utils/telemetry.ts for the browser.
 */
export class TelemetryCore {
  private readonly transport: TelemetryTransport;
  private readonly maxRetries: number;
  private readonly retryDelay: number;
  private readonly onError?: (error: unknown, event: TelemetryEvent) => void;
  private retryQueue: {
    event: TelemetryEvent;
    context?: TelemetryRequestContext;
    attempts: number;
  }[] = [];
  private sessionId: string;

  constructor(transport: TelemetryTransport, options: TelemetryCoreOptions = {}) {
    this.transport = transport;
    this.maxRetries = options.maxRetries ?? 3;
    this.retryDelay = options.retryDelay ?? 1000;
    this.onError = options.onError;
    this.sessionId = options.sessionId ?? generateSessionId();
  }

  getSessionId(): string {
    return this.sessionId;
  }

  async report(event: TelemetryEvent, context?: TelemetryRequestContext): Promise<void> {
    try {
      await this.send(event, context);
    } catch (error) {
      this.onError?.(error, event);
      this.retryQueue.push({ event, context, attempts: 0 });
      this.scheduleRetry();
    }
  }

  private async send(event: TelemetryEvent, context?: TelemetryRequestContext): Promise<void> {
    const timestamp = Date.now();
    const userAgent =
      context?.userAgent ?? (typeof window !== 'undefined' ? window.navigator.userAgent : 'server');
    const url = context?.url ?? (typeof window !== 'undefined' ? window.location.href : 'unknown');
    const { errors, authStates } = toErrorReportArrays(event, timestamp);

    const payload: ErrorReportPayload = {
      errors: errors.map((e) => ({ ...e, userAgent, url, sessionId: this.sessionId })),
      authStates,
      sessionId: this.sessionId,
      timestamp
    };

    await this.transport(payload);
  }

  private scheduleRetry(): void {
    setTimeout(() => {
      this.processRetryQueue();
    }, this.retryDelay);
  }

  private async processRetryQueue(): Promise<void> {
    const failedRetries: {
      event: TelemetryEvent;
      context?: TelemetryRequestContext;
      attempts: number;
    }[] = [];

    for (const { event, context, attempts } of this.retryQueue) {
      if (attempts >= this.maxRetries) {
        continue;
      }

      try {
        await this.send(event, context);
      } catch {
        failedRetries.push({ event, context, attempts: attempts + 1 });
      }
    }

    this.retryQueue = failedRetries;

    if (this.retryQueue.length > 0) {
      this.scheduleRetry();
    }
  }

  getQueueSize(): number {
    return this.retryQueue.length;
  }
}
