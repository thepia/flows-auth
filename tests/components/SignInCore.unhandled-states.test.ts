/**
 * Bug repro: SignInCore.svelte's {#if}/{:else if} chain over signInState
 * does not cover every value in SignInStateSchema (src/core/types/auth-store-schema.ts).
 *
 * Reported symptom: on some page loads, the sign-in box showed only its
 * (unconditional, rendered by the parent SignInForm) header - the email
 * input and submit button, which live inside SignInCore's signInState
 * branches, were completely absent from the DOM. Reloading the page fixed
 * it (fresh store -> back to the 'emailEntry' default).
 *
 * Root cause: 'generalError' (reachable in real code via
 * sendSignInEvent({type: 'PASSKEY_FAILED'}), e.g. when a failed passkey
 * ceremony - including the browser's autofill/conditional-UI attempt -
 * dispatches that event) has NO matching branch in SignInCore.svelte's
 * template, so the component renders an empty <div class="sign-in-core">
 * and nothing else. 'passkeyPrompt' and 'passkeyRegistration' are likewise
 * unhandled, though nothing in current store code ever transitions to them
 * yet (they only appear in the aspirational state-machine diagram).
 */

import { screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import SignInCore from '../../src/svelte/components/core/SignInCore.svelte';
import { renderWithStoreProp } from '../helpers/component-test-setup.js';

vi.mock('../../src/core/utils/webauthn', () => ({
  isWebAuthnSupported: vi.fn(() => true),
  isPlatformAuthenticatorAvailable: vi.fn(() => Promise.resolve(true)),
  authenticateWithPasskey: vi.fn(),
  serializeCredential: vi.fn(),
  isConditionalMediationSupported: vi.fn(() => true)
}));

describe('SignInCore - unhandled signInState values', () => {
  it('still shows the email input and submit button after a PASSKEY_FAILED event (generalError state)', async () => {
    const { authStore } = renderWithStoreProp(SignInCore, {
      authConfig: { enablePasskeys: true }
    });

    // A real failed passkey ceremony (including the browser's own
    // autofill/conditional-UI attempt, independent of the app's own
    // sign-in button) drives exactly this event through the public API -
    // see auth-store.ts's sendSignInEvent PASSKEY_FAILED case.
    authStore.sendSignInEvent({
      type: 'PASSKEY_FAILED',
      error: { name: 'NotAllowedError', message: 'denied', timing: 0, type: 'user-cancellation' }
    });
    await tick();

    expect(screen.queryByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /./ })).toBeInTheDocument();
  });
});
