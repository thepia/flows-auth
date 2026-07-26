#!/usr/bin/env node
/**
 * Manually send one real test event to PostHog - a quick way to verify the
 * telemetry upload path works end-to-end without running the full test
 * suite. Exercises the exact same public API real callers use
 * (@thepia/flows-auth/telemetry's createPostHogTransport + TelemetryCore),
 * so a green run here means the whole pipeline (event -> wire envelope ->
 * PostHog /batch/) is genuinely working, not just that some mock resolved.
 *
 * Posts to the same production PostHog project thepia.com's website uses
 * (project API keys are write-only capture keys, safe to embed) - tagged
 * synthetic:true under a distinct event prefix, matching
 * tests/integration/telemetry-posthog.test.ts, so it's trivially
 * filterable/excludable from real analytics.
 *
 * Requires a built dist/ (pnpm build) since it imports the packaged export,
 * the same way a real consumer would.
 *
 * Usage:
 *   pnpm test:posthog
 *   pnpm test:posthog -- --message "custom test message" --status-code 503 --endpoint /demo/refresh
 *   pnpm test:posthog -- --api-key phc_xxx --host https://us.i.posthog.com   # point at a different project
 *   pnpm test:posthog -- --host https://does-not-exist.invalid              # verify the failure path (exit 1)
 */
import { createPostHogTransport, TelemetryCore } from '../dist/telemetry.js';

const DEFAULT_POSTHOG_API_KEY = 'phc_NbnaU7ZCsvRhapHZTmuPyWmJJo1Ne5ijekOK78h0UCX';
const DEFAULT_POSTHOG_HOST = 'https://eu.i.posthog.com';

function parseArgs(argv) {
  const args = {
    message: 'Manual test-posthog-upload.mjs run - safe to ignore',
    statusCode: 500,
    endpoint: '/manual-test',
    apiKey: DEFAULT_POSTHOG_API_KEY,
    host: DEFAULT_POSTHOG_HOST
  };
  let i = 0;
  while (i < argv.length) {
    if (argv[i] === '--message') args.message = argv[++i];
    else if (argv[i] === '--status-code') args.statusCode = Number(argv[++i]);
    else if (argv[i] === '--endpoint') args.endpoint = argv[++i];
    else if (argv[i] === '--api-key') args.apiKey = argv[++i];
    else if (argv[i] === '--host') args.host = argv[++i];
    i++;
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

const transport = createPostHogTransport({
  apiKey: args.apiKey,
  host: args.host,
  eventPrefix: 'flows_auth_telemetry_test_'
});

// One-shot manual run: no retries, no lingering timers - fail fast and exit.
const core = new TelemetryCore(transport, {
  maxRetries: 0,
  retryDelay: 0,
  onError: (error) => {
    console.error('❌ Failed to upload to PostHog:', error);
    process.exitCode = 1;
  }
});

console.log(`Uploading test event to PostHog (${args.host})...`);
console.log('Event:', {
  endpoint: args.endpoint,
  statusCode: args.statusCode,
  message: args.message
});

await core.report(
  {
    type: 'server-error',
    endpoint: args.endpoint,
    method: 'POST',
    statusCode: args.statusCode,
    message: args.message,
    requestId: `manual_${Date.now()}`,
    context: { synthetic: true, source: 'test-posthog-upload-script' }
  },
  {
    userAgent: 'flows-auth-manual-test-script',
    url: 'https://manual-test.local/test-posthog-upload.mjs'
  }
);

if (process.exitCode !== 1) {
  console.log('✅ Event accepted by PostHog (event name: flows_auth_telemetry_test_server_error).');
}
