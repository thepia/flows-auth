/**
 * OTLP (OpenTelemetry Protocol) logs transport for the telemetry core
 * (./telemetry/core.js) - separate export subpath (@thepia/flows-auth/telemetry-otlp)
 * from the plain @thepia/flows-auth/telemetry export because this pulls in
 * the official @opentelemetry/* packages as real dependencies; consumers who
 * only want createPostHogTransport's custom-capture-event path (a plain
 * fetch call, no dependencies) shouldn't have to carry this weight.
 *
 * This exists because PostHog's "Logs" product (distinct from its general
 * Activity/Events explorer, which createPostHogTransport already feeds) only
 * accepts OTLP - PostHog's own UI states: "PostHog logs works with any
 * OpenTelemetry-compatible client... just use standard OpenTelemetry
 * libraries to send logs via OTLP." Their docs show no raw HTTP/JSON example
 * for this, only the official SDK, which is what this module uses.
 *
 * Flat file (not telemetry-otlp/index.ts) for the same dist-path-matching
 * reason as telemetry.ts and vite-preset.ts - see telemetry.ts's comment.
 */

import { type LogAttributes, type Logger, SeverityNumber } from '@opentelemetry/api-logs';
import { ExportResultCode } from '@opentelemetry/core';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import type { ReadableLogRecord } from '@opentelemetry/sdk-logs';
import { LoggerProvider, type LogRecordProcessor } from '@opentelemetry/sdk-logs';
import type {
  AuthStateReport,
  ErrorReport,
  ErrorReportPayload,
  TelemetryTransport
} from './telemetry/core.js';

export interface OtlpLogsTransportOptions {
  /** e.g. https://us.i.posthog.com/i/v1/logs (PostHog's EU logs endpoint is unconfirmed as of writing - verify before relying on it) */
  endpoint: string;
  /** Bearer token - PostHog's project token (phc_...) works here, sent as a header rather than in the body (unlike createPostHogTransport). */
  token: string;
  /** OTel resource attribute service.name. Defaults to 'flows-auth'. */
  serviceName?: string;
}

function severityFor(severity: ErrorReport['severity'] | undefined): {
  number: SeverityNumber;
  text: string;
} {
  switch (severity) {
    case 'critical':
      return { number: SeverityNumber.FATAL, text: 'FATAL' };
    case 'high':
      return { number: SeverityNumber.ERROR, text: 'ERROR' };
    case 'medium':
      return { number: SeverityNumber.WARN, text: 'WARN' };
    default:
      return { number: SeverityNumber.INFO, text: 'INFO' };
  }
}

/**
 * Drop undefined-valued attributes rather than passing them through as-is.
 * AnyValueMap technically permits `undefined` (see @opentelemetry/api-logs),
 * but PostHog renders an attribute with an undefined value as an empty
 * string in its Logs UI (verified against a real uploaded entry) - noisy
 * for anyone browsing entries where a field legitimately wasn't provided.
 */
function withoutUndefined(attributes: Record<string, unknown>): LogAttributes {
  const result: LogAttributes = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (value !== undefined) {
      result[key] = value as LogAttributes[string];
    }
  }
  return result;
}

function emitError(logger: Logger, error: ErrorReport, sessionId: string): void {
  const { number, text } = severityFor(error.severity);
  logger.emit({
    severityNumber: number,
    severityText: text,
    body: error.message,
    attributes: withoutUndefined({
      posthogDistinctId: sessionId,
      type: error.type,
      stack: error.stack,
      url: error.url,
      userAgent: error.userAgent,
      ...(error.context ?? {})
    })
  });
}

function emitAuthState(logger: Logger, authState: AuthStateReport, sessionId: string): void {
  logger.emit({
    severityNumber: SeverityNumber.INFO,
    severityText: 'INFO',
    body: authState.event,
    attributes: withoutUndefined({
      posthogDistinctId: sessionId,
      type: 'auth-state-change',
      authMethod: authState.authMethod,
      userId: authState.userId,
      email: authState.email,
      error: authState.error,
      ...(authState.context ?? {})
    })
  });
}

export function createOtlpLogsTransport(options: OtlpLogsTransportOptions): TelemetryTransport {
  const exporter = new OTLPLogExporter({
    url: options.endpoint,
    headers: { Authorization: `Bearer ${options.token}` }
  });

  // Capture SDK-constructed LogRecords instead of relying on a normal
  // processor to export them: SimpleLogRecordProcessor.onEmit() `void`s the
  // export promise in the common (synchronous-resource) case and routes
  // failures to OTel's internal diagnostic handler - never a promise a
  // caller can await or catch (confirmed by reading its source). Calling the
  // exporter's own export() directly - still on fully SDK-constructed
  // records, not hand-built - gives a real awaitable/rejectable completion
  // signal, matching this library's TelemetryTransport contract (throws ->
  // TelemetryCore queues a retry).
  let captured: ReadableLogRecord[] = [];
  const capturingProcessor: LogRecordProcessor = {
    onEmit: (logRecord) => {
      captured.push(logRecord as unknown as ReadableLogRecord);
    },
    // No-ops: this processor only captures records for createOtlpLogsTransport's
    // own export() call below, it never owns the exporter's lifecycle itself.
    forceFlush: async () => undefined,
    shutdown: async () => undefined
  };

  const loggerProvider = new LoggerProvider({
    resource: resourceFromAttributes({ 'service.name': options.serviceName ?? 'flows-auth' }),
    processors: [capturingProcessor]
  });
  const logger = loggerProvider.getLogger('flows-auth-telemetry');

  return async (payload: ErrorReportPayload) => {
    captured = [];

    for (const error of payload.errors) {
      emitError(logger, error, payload.sessionId);
    }
    for (const authState of payload.authStates) {
      emitAuthState(logger, authState, payload.sessionId);
    }

    if (captured.length === 0) {
      return;
    }

    const recordsToExport = captured;
    captured = [];

    await new Promise<void>((resolve, reject) => {
      exporter.export(recordsToExport, (result) => {
        if (result.code === ExportResultCode.SUCCESS) {
          resolve();
        } else {
          reject(result.error ?? new Error('OTLP log export failed'));
        }
      });
    });
  };
}
