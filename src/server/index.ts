/**
 * Server-side utilities for building a Deno/edge API against flows-auth's
 * contracts. Deliberately outside `src/core/` (see
 * docs/MULTI_FRAMEWORK_PACKAGING_PLAN.md): not tied to any UI framework, not
 * part of the `.` barrel, and built by plain `tsc` (no tsup bundling) so each
 * file's `.js`/`.d.ts` pair mirrors its source path directly - no bundler
 * flattening a source tree into one entry means there's no dist-path
 * mismatch to work around here, unlike telemetry.ts/vite-preset.ts.
 */

export { getClientIP } from './client-ip.js';
export type { EnvChecker } from './env.js';
export type { ProblemDetails, ValidationError } from './error-responses.js';
export {
  createErrorTypes,
  createProblemResponse,
  createStandardErrors,
  createValidationErrorResponse
} from './error-responses.js';
export type { RateLimitConfig, RateLimiter } from './rate-limiting.js';
export { AUTH_RATE_LIMITS, createRateLimiter } from './rate-limiting.js';
export type { ServerErrorTelemetry, ServerTelemetry, ServerTelemetryOptions } from './telemetry.js';
export { createServerTelemetry } from './telemetry.js';
export type {
  AuthenticatorTransport,
  ChallengeData,
  ChallengeStore,
  ChallengeStoreOptions,
  WebAuthnConfig,
  WebAuthnConfigResolver,
  WebAuthnCredential,
  WebAuthnDomainConfig,
  WebAuthnHostRule
} from './webauthn/index.js';
export {
  base64ToBase64url,
  base64urlToBase64,
  base64urlToUint8Array,
  createChallengeStore,
  createWebAuthnConfig,
  uint8ArrayToBase64url
} from './webauthn/index.js';
