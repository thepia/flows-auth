/**
 * Real (non-mocked) integration test for the OTLP logs transport
 * (@thepia/flows-auth/telemetry-otlp) - a separate PostHog product surface
 * ("Logs") from the plain capture-events API tested in
 * telemetry-posthog.test.ts. PostHog's own UI states Logs only accepts
 * OpenTelemetry (OTLP); this uses the official @opentelemetry/* SDK
 * packages, per the decision in this session to prioritize correctness over
 * a smaller dependency footprint for this particular transport.
 *
 * IMPORTANT CAVEAT (same class of finding as the capture API): PostHog's
 * OTLP endpoint does not appear to validate synchronously either - a
 * successful ExportResultCode.SUCCESS here confirms the HTTP POST was
 * accepted, not that the log record is confirmed queryable/visible in
 * PostHog's Logs tab. There is no read-back API key available to verify
 * ingestion end-to-end automatically.
 */

import { describe, expect, it } from 'vitest';
import { createOtlpLogsTransport } from '../../src/core/telemetry-otlp.js';

const POSTHOG_TOKEN = 'phc_NbnaU7ZCsvRhapHZTmuPyWmJJo1Ne5ijekOK78h0UCX';
// EU is this project's actual home region (matching eu.i.posthog.com used
// elsewhere in this repo for the capture API), but PostHog's Logs docs only
// ever document the US endpoint explicitly - both were empirically verified
// to return ExportResultCode.SUCCESS for this token during development.
const POSTHOG_OTLP_ENDPOINT = 'https://eu.i.posthog.com/i/v1/logs';

describe('OTLP logs transport - real upload', () => {
  it('successfully exports a server-error event as an OTLP log record', async () => {
    const transport = createOtlpLogsTransport({
      endpoint: POSTHOG_OTLP_ENDPOINT,
      token: POSTHOG_TOKEN,
      serviceName: 'flows-auth-integration-test'
    });

    await expect(
      transport({
        errors: [
          {
            type: 'server-error',
            message: 'Integration test OTLP log - safe to ignore',
            timestamp: Date.now(),
            severity: 'high',
            context: { synthetic: true, source: 'flows-auth-otlp-integration-test' }
          }
        ],
        authStates: [],
        sessionId: `otlp_test_${Math.random().toString(36).slice(2)}`,
        timestamp: Date.now()
      })
    ).resolves.not.toThrow();
  });

  it('successfully exports an auth-state-change event as an OTLP log record', async () => {
    const transport = createOtlpLogsTransport({
      endpoint: POSTHOG_OTLP_ENDPOINT,
      token: POSTHOG_TOKEN,
      serviceName: 'flows-auth-integration-test'
    });

    await expect(
      transport({
        errors: [],
        authStates: [
          {
            type: 'auth-state-change',
            event: 'sign-in-success',
            authMethod: 'passkey',
            timestamp: Date.now(),
            context: { synthetic: true, source: 'flows-auth-otlp-integration-test' }
          }
        ],
        sessionId: `otlp_test_${Math.random().toString(36).slice(2)}`,
        timestamp: Date.now()
      })
    ).resolves.not.toThrow();
  });

  it('rejects when the OTLP endpoint is unreachable', async () => {
    const transport = createOtlpLogsTransport({
      endpoint: 'https://does-not-exist.invalid/i/v1/logs',
      token: POSTHOG_TOKEN
    });

    await expect(
      transport({
        errors: [{ type: 'server-error', message: 'should fail', timestamp: Date.now(), severity: 'low' }],
        authStates: [],
        sessionId: 'otlp-failure-test',
        timestamp: Date.now()
      })
    ).rejects.toThrow();
  });

  it('resolves without exporting when the payload has no errors or auth states', async () => {
    const transport = createOtlpLogsTransport({
      endpoint: 'https://does-not-exist.invalid/i/v1/logs', // would reject if export were attempted
      token: POSTHOG_TOKEN
    });

    await expect(
      transport({ errors: [], authStates: [], sessionId: 'empty-payload-test', timestamp: Date.now() })
    ).resolves.not.toThrow();
  });
});
