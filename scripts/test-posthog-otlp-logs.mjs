#!/usr/bin/env node
/**
 * Manually send one real OTLP log record to PostHog's Logs product - a
 * separate surface from PostHog's Activity/Events explorer (see
 * scripts/test-posthog-upload.mjs for that one). PostHog's Logs tab only
 * accepts OpenTelemetry (OTLP); the plain capture-events API does not
 * populate it.
 *
 * IMPORTANT CAVEAT: like PostHog's capture API, this endpoint does not seem
 * to validate synchronously - the exporter can report success even when
 * something is subtly wrong. A clean exit here means the HTTP POST was
 * accepted, not that the log is confirmed visible in PostHog's UI. Check
 * the Logs tab in PostHog after running this to confirm it actually landed.
 *
 * Requires a built dist/ (pnpm build).
 *
 * Usage:
 *   pnpm test:posthog:logs
 *   pnpm test:posthog:logs -- --message "custom test message" --status-code 503
 *   pnpm test:posthog:logs -- --endpoint https://us.i.posthog.com/i/v1/logs   # try the other region
 */
import { createOtlpLogsTransport } from '../dist/telemetry-otlp.js';

const DEFAULT_TOKEN = 'phc_NbnaU7ZCsvRhapHZTmuPyWmJJo1Ne5ijekOK78h0UCX';
// EU is this project's actual home region (matching the regular capture
// API's eu.i.posthog.com usage elsewhere in this repo), but PostHog's Logs
// docs only ever show the US endpoint explicitly - unconfirmed for EU.
const DEFAULT_ENDPOINT = 'https://eu.i.posthog.com/i/v1/logs';

function parseArgs(argv) {
  const args = {
    message: 'Manual test-posthog-otlp-logs.mjs run - safe to ignore',
    statusCode: 500,
    endpoint: DEFAULT_ENDPOINT,
    token: DEFAULT_TOKEN
  };
  let i = 0;
  while (i < argv.length) {
    if (argv[i] === '--message') args.message = argv[++i];
    else if (argv[i] === '--status-code') args.statusCode = Number(argv[++i]);
    else if (argv[i] === '--endpoint') args.endpoint = argv[++i];
    else if (argv[i] === '--token') args.token = argv[++i];
    i++;
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

const transport = createOtlpLogsTransport({
  endpoint: args.endpoint,
  token: args.token,
  serviceName: 'flows-auth-manual-test'
});

console.log(`Uploading OTLP log record to PostHog (${args.endpoint})...`);
console.log('Event:', { statusCode: args.statusCode, message: args.message });

try {
  await transport({
    errors: [
      {
        type: 'server-error',
        message: args.message,
        timestamp: Date.now(),
        severity: args.statusCode >= 500 ? 'high' : 'medium',
        context: {
          synthetic: true,
          source: 'test-posthog-otlp-logs-script',
          statusCode: args.statusCode
        }
      }
    ],
    authStates: [],
    sessionId: `manual_${Date.now()}`,
    timestamp: Date.now()
  });
  console.log(
    '✅ Log record accepted by PostHog (HTTP-level success - check the Logs tab to confirm it landed).'
  );
} catch (error) {
  console.error('❌ Failed to upload OTLP log record:', error);
  process.exitCode = 1;
}
