/**
 * Wire contract for telemetry/error reporting.
 *
 * This is the single source of truth shared between:
 * - flows-auth's telemetry core (src/core/telemetry/core.ts), used by both the
 *   browser client (src/core/utils/telemetry.ts, POSTs to thepia.com's dev-only
 *   `/dev/error-reports`) and, via the `@thepia/flows-auth/telemetry` export,
 *   thepia.com's own Deno API server (reporting its own backend errors, e.g.
 *   'server-error', to whatever production-facing sink it's configured with)
 * - thepia.com's dev endpoint (src/api/dev/error-reports.ts), which parses this
 *   shape for the browser-originated events
 */

export type DevErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ErrorReport {
  type:
    | 'console.error'
    | 'unhandled-error'
    | 'unhandled-rejection'
    | 'auth-state-change'
    | 'api-error'
    | 'webauthn-error'
    | 'server-error';
  message: string;
  stack?: string;
  url?: string;
  lineNumber?: number;
  columnNumber?: number;
  userAgent?: string;
  timestamp: number;
  sessionId?: string;
  userId?: string;
  context?: Record<string, unknown>;
  severity: DevErrorSeverity;
}

export interface AuthStateReport {
  type: 'auth-state-change';
  event: string;
  authMethod?: 'passkey' | 'password' | 'email';
  userId?: string;
  email?: string;
  error?: string;
  duration?: number;
  timestamp: number;
  context?: Record<string, unknown>;
}

export interface ErrorReportPayload {
  errors: ErrorReport[];
  authStates: AuthStateReport[];
  sessionId: string;
  timestamp: number;
}
