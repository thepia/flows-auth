/**
 * Real (non-mocked) integration test for the PostHog telemetry transport.
 *
 * Posts actual events to the same PostHog project thepia.com's website uses
 * (see thepia.com/src/components/posthog.astro for the embedded project key
 * - PostHog project API keys are write-only capture keys, safe to reuse
 * server-side). Every event here is tagged `synthetic: true` under a
 * dedicated `flows_auth_telemetry_test` event name so it's trivially
 * filterable/excludable from real analytics - see the AskUserQuestion
 * decision in this session: reuse the production project rather than stand
 * up a separate test project.
 */

import { describe, expect, it, vi } from 'vitest';
import { TelemetryCore } from '../../src/core/telemetry/core.js';
import { createPostHogTransport } from '../../src/core/telemetry/posthog-transport.js';

const POSTHOG_API_KEY = 'phc_NbnaU7ZCsvRhapHZTmuPyWmJJo1Ne5ijekOK78h0UCX';
const POSTHOG_HOST = 'https://eu.i.posthog.com';

describe('PostHog telemetry transport - real upload', () => {
  it('successfully uploads a server-error event to PostHog', async () => {
    // Wrap the global fetch so we can assert on PostHog's actual response,
    // not just "the transport didn't throw" - a call that silently no-oped
    // would also pass a not.toThrow() check.
    const fetchSpy = vi.fn(fetch);
    const transport = createPostHogTransport({
      apiKey: POSTHOG_API_KEY,
      host: POSTHOG_HOST,
      eventPrefix: 'flows_auth_telemetry_test_',
      fetchImpl: fetchSpy
    });

    const core = new TelemetryCore(transport, { maxRetries: 0 });

    await core.report(
      {
        type: 'server-error',
        endpoint: '/demo/refresh',
        method: 'POST',
        statusCode: 500,
        message: 'Integration test event - safe to ignore',
        requestId: `test_${Math.random().toString(36).slice(2)}`,
        context: { synthetic: true, source: 'flows-auth-integration-test' }
      },
      { userAgent: 'flows-auth-vitest', url: 'https://vitest.local/telemetry-posthog.test.ts' }
    );

    expect(fetchSpy).toHaveBeenCalledWith(
      `${POSTHOG_HOST}/batch/`,
      expect.objectContaining({ method: 'POST' })
    );
    const response = await fetchSpy.mock.results[0]?.value;
    expect(response.ok).toBe(true);
    const body = await response.clone().json();
    expect(body).toMatchObject({ status: 'Ok' });

    const [, requestInit] = fetchSpy.mock.calls[0] ?? [null, null];
    const sentBatch = JSON.parse((requestInit?.body ?? '{}') as string);
    expect(sentBatch.api_key).toBe(POSTHOG_API_KEY);
    expect(sentBatch.batch).toHaveLength(1);
    expect(sentBatch.batch[0]).toMatchObject({
      event: 'flows_auth_telemetry_test_server_error',
      properties: expect.objectContaining({ synthetic: true, severity: 'high' })
    });
  });

  it('successfully uploads an auth-state-change event to PostHog', async () => {
    const fetchSpy = vi.fn(fetch);
    const transport = createPostHogTransport({
      apiKey: POSTHOG_API_KEY,
      host: POSTHOG_HOST,
      eventPrefix: 'flows_auth_telemetry_test_',
      fetchImpl: fetchSpy
    });

    const core = new TelemetryCore(transport, { maxRetries: 0 });

    await core.report({
      type: 'auth-state-change',
      event: 'sign-in-success',
      authMethod: 'passkey',
      context: { synthetic: true, source: 'flows-auth-integration-test' }
    });

    const response = await fetchSpy.mock.results[0]?.value;
    expect(response.ok).toBe(true);

    const [, requestInit] = fetchSpy.mock.calls[0] ?? [null, null];
    const sentBatch = JSON.parse((requestInit?.body ?? '{}') as string);
    expect(sentBatch.batch[0]).toMatchObject({
      event: 'flows_auth_telemetry_test_sign_in_success',
      properties: expect.objectContaining({ authMethod: 'passkey', synthetic: true })
    });
  });

  it('throws when PostHog returns a non-2xx response', async () => {
    // PostHog's /batch/ endpoint does NOT validate api_key synchronously -
    // confirmed directly with curl: an invalid key still returns
    // `{"status":"Ok"}` / HTTP 200 (checked asynchronously server-side, with
    // invalid-key events presumably just dropped). So a bad key can't
    // exercise the throw-on-!ok path; hitting a nonexistent path on the same
    // real host reliably produces a real 404 instead (also verified with
    // curl) and still exercises the exact same fetch()-response-not-ok code
    // path in createPostHogTransport.
    const transport = createPostHogTransport({
      apiKey: POSTHOG_API_KEY,
      host: `${POSTHOG_HOST}/this-path-does-not-exist`,
      eventPrefix: 'flows_auth_telemetry_test_'
    });

    await expect(
      transport({
        errors: [{ type: 'server-error', message: 'should 404', timestamp: Date.now(), severity: 'low' }],
        authStates: [],
        sessionId: 'test-session',
        timestamp: Date.now()
      })
    ).rejects.toThrow(/PostHog capture failed: 404/);
  });
});
