/**
 * Public entry point for the `@thepia/flows-auth/telemetry` export: the
 * runtime-agnostic telemetry core, safe to import from any JS runtime
 * (browser, Deno, Node) with no AuthApiClient/AuthConfig/browser-global
 * dependency. The browser auth store uses the higher-level wrapper in
 * ./utils/telemetry.ts instead, which adds the AuthApiClient transport and
 * service worker logging on top of this core.
 *
 * Flat file (not telemetry/index.ts) so its declaration output lands at
 * dist/telemetry.d.ts, matching tsup's flat dist/telemetry.js bundle for
 * this entry - mirroring the vite-preset.ts precedent.
 */

export type {
  ApiErrorEvent,
  AuthStateEvent,
  AuthStateReport,
  DevErrorSeverity,
  ErrorReport,
  ErrorReportPayload,
  SerializedError,
  ServerErrorEvent,
  TelemetryCoreOptions,
  TelemetryEvent,
  TelemetryRequestContext,
  TelemetryTransport,
  WebAuthnErrorEvent
} from './telemetry/core.js';
export {
  TelemetryCore,
  toErrorReportArrays
} from './telemetry/core.js';
export type { PostHogTransportOptions } from './telemetry/posthog-transport.js';
export { createPostHogTransport } from './telemetry/posthog-transport.js';
