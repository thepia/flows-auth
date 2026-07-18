/**
 * Reproduces bug: ErrorReportingStatus displays authConfig.apiBaseUrl (the
 * static, configured URL) as "API URL" and derives "Error Endpoint" from it,
 * but AuthApiClient silently detects and uses a DIFFERENT effective URL
 * (local dev server vs configured production URL) for all real requests —
 * see detectEffectiveBaseUrl() in src/api/auth-api.ts. There is currently no
 * public way to read that effective URL back out of the client, so any UI
 * that wants to show "what server am I actually talking to" is forced to
 * fall back to the stale static config and reports the wrong server.
 *
 * Observed in the wild: console shows
 *   "🔧 Using local API server: https://dev.thepia.com:8443"
 * but ErrorReportingStatus's "API URL" / "Error Endpoint" fields still show
 * https://api.thepia.com.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthApiClient } from '../../src/core/api/auth-api.js';
import type { AuthConfig } from '../../src/core/types/index.js';

describe('AuthApiClient effective base URL', () => {
  const mockFetch = vi.fn();
  global.fetch = mockFetch;

  const config: AuthConfig = {
    apiBaseUrl: 'https://api.thepia.com',
    clientId: 'test-client',
    domain: 'test.com',
    appCode: 'test-app',
    enablePasskeys: true,
    enableMagicLinks: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes the actually-detected effective URL, not just the static configured one', async () => {
    // Simulate a healthy local dev server, same health check detectApiServer() makes
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'healthy', version: '1.0.0' })
    });

    const client = new AuthApiClient(config);

    expect(typeof client.getEffectiveBaseUrl).toBe('function');
    const effectiveUrl = await client.getEffectiveBaseUrl();

    expect(effectiveUrl).toBe('https://dev.thepia.com:8443');
    // The static config is unchanged (by design) — this is exactly why UI
    // code must call getEffectiveBaseUrl() instead of reading config.apiBaseUrl.
    expect(client.config.apiBaseUrl).toBe('https://api.thepia.com');
  });

  it('falls back to the configured URL when no local server is available', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const client = new AuthApiClient(config);
    const effectiveUrl = await client.getEffectiveBaseUrl();

    expect(effectiveUrl).toBe('https://api.thepia.com');
  });
});
