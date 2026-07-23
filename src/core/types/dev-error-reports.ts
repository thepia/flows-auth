/**
 * Wire contract for the thepia.com `/dev/error-reports` development endpoint.
 *
 * This is the single source of truth shared between:
 * - flows-auth's telemetry client (src/core/utils/telemetry.ts), which POSTs this shape
 * - thepia.com's dev endpoint (src/api/dev/error-reports.ts), which parses this shape
 *
 * Dev-only diagnostic channel - not part of the production auth API contract.
 */

export type DevErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ErrorReport {
  type:
    | 'console.error'
    | 'unhandled-error'
    | 'unhandled-rejection'
    | 'auth-state-change'
    | 'api-error'
    | 'webauthn-error';
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
