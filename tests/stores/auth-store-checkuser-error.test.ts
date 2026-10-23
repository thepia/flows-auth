/**
 * Reproduces a reported bug: when `checkUser()` fails (network error, CORS,
 * API outage, ...), nothing surfaces the failure to the UI. `signInState`
 * stays at `emailEntry` — where `getButtonConfig()` (ui-state.ts) hardcodes
 * the primary submit button to `disabled: true` — so the button looks like
 * it "doesn't respond" to typing a valid email, with zero feedback about why.
 *
 * Every other store method that calls the API on this path follows the same
 * pattern on failure (see `verifyEmailCode`, `registerUser` in auth-store.ts):
 * catch, then `error.getState().setApiError(err, { method, email })` so
 * `apiError` is populated and `AuthExplainer` can render it. `checkUser`'s
 * catch block (auth-store.ts) only emits a telemetry event and rethrows —
 * it never calls `setApiError`, so `apiError` stays `null` and the UI shows
 * nothing.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuthStore } from '../../src/core/stores/index.js';
import type { AuthApiClient } from '../../src/core/api/auth-api.js';
import type { AuthConfig } from '../../src/core/types/index.js';

describe('checkUser() failure surfaces an apiError', () => {
  let config: AuthConfig;

  beforeEach(() => {
    config = {
      apiBaseUrl: 'https://api.test.com',
      clientId: 'test',
      domain: 'test.com',
      enablePasskeys: true,
      appCode: 'test'
    };
  });

  it('sets apiError when the check-user API call rejects', async () => {
    const checkEmail = vi.fn().mockRejectedValue(new Error('Failed to fetch'));
    const mockApiClient = { checkEmail } as unknown as AuthApiClient;

    const authStore = createAuthStore(config, mockApiClient);

    expect(authStore.getState().apiError).toBeNull();

    await expect(authStore.checkUser('person@example.com')).rejects.toThrow('Failed to fetch');

    expect(authStore.getState().apiError).not.toBeNull();
  });
});
