/**
 * SignInCore - Core sign-in logic without container styling
 * Orchestrates EmailInput, AuthButton, and AuthStateMessage.
 * Handles auth state machine integration.
 *
 * Ported from `src/svelte/components/core/SignInCore.svelte` (states: `emailEntry`/
 * `userChecked` -> `passkeyPrompt`/`passkeyRegistration` -> `pinEntry` -> `emailVerification`
 * -> `signedIn`/`generalError`).
 *
 * Deliberate deferrals (see the Phase C report for full rationale):
 * - `signedIn` renders a minimal inline placeholder instead of the (out-of-scope)
 *   `UserManagement` component -- just a "signed in as ..." line + a Sign Out button.
 * - The `PolicyViewer` modal + its `window.showPolicyPopup()` global hook are dropped
 *   entirely (also out of scope). If a translation string embeds a literal
 *   `onclick="showPolicyPopup()"` snippet, it renders as inert text either way --
 *   `AuthStateMessage` never used `{@html}` for message text in the Svelte original either.
 * - `onNavigate` (Svelte's `navigate` event) is dropped: it only ever existed to forward
 *   `UserManagement`'s in-app navigation (profile/passkeys/privacy/terms), which isn't ported.
 *
 * Behavioral note (deliberate divergence, not a missed port): the Svelte version wires the
 * primary submit `AuthButton`'s `on:click` to the *same* `handleSignIn` its wrapping
 * `<form onsubmit>` already calls (research confirmed `AuthButton` dispatches its click event
 * even for `type="submit"`, without calling `preventDefault`) -- i.e. `handleSignIn` runs
 * twice per submit in the original. This port relies on the form's `onSubmit` alone.
 *
 * Behavioral improvement (also deliberate): `onError` is actually invoked here when an auth
 * operation throws. Research confirmed the Svelte version declares an equivalent `error` event
 * but never dispatches it anywhere in the file -- a documented-but-dead part of the contract.
 * Honoring it here matches `docs/components/README.md`'s documented event table.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ComposedAuthStore } from '../../../core/stores/auth-store.js';
import type { AuthError, AuthMethod, User } from '../../../core/types/index.js';
import { debug } from '../../../core/utils/debug.js';
import { m } from '../../../core/utils/i18n.js';
import { useAuthStore } from '../../hooks/useAuthStore.js';
import { AuthButton } from './AuthButton.js';
import { AuthExplainer } from './AuthExplainer.js';
import { AuthNewUserInfo } from './AuthNewUserInfo.js';
import { AuthStateMessage } from './AuthStateMessage.js';
import { EmailInput } from './EmailInput.js';
import { PinEntryStep } from './PinEntryStep.js';
import './SignInCore.css';

export interface SignInCoreProps {
  /** Auth store prop (preferred); falls back to `useAuthStore()`'s context resolution. */
  store?: ComposedAuthStore | null;
  initialEmail?: string;
  className?: string;
  /** Whether to show the features list in the explainer. */
  explainFeatures?: boolean;
  onSuccess?: (payload: { user: User | null; method: AuthMethod }) => void;
  onError?: (payload: { error: AuthError }) => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toAuthError(err: unknown, code = 'error.generic'): AuthError {
  return {
    code,
    message: err instanceof Error ? err.message : String(err),
    timestamp: new Date().toISOString()
  };
}

function determineAuthMethod(
  userCheck: { hasWebAuthn: boolean },
  passkeysEnabled: boolean
): 'passkey-with-fallback' | 'email-code' {
  if (userCheck.hasWebAuthn && passkeysEnabled) {
    return 'passkey-with-fallback';
  }
  return 'email-code';
}

export function SignInCore({
  store: storeProp = null,
  initialEmail = '',
  className = '',
  explainFeatures = false,
  onSuccess,
  onError
}: SignInCoreProps) {
  const result = useAuthStore(storeProp ?? undefined);
  // Stable across renders (created once by `<AuthProvider>`/the caller) -- used inside
  // effects so their dependency arrays don't churn on every snapshot change, unlike
  // `result` itself which is a fresh object literal each render (see useAuthStore.ts).
  const authStoreInstance = result.store;

  const [email, setEmail] = useState(initialEmail);
  const emailCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const signInState = result.signInState;
  const authConfig = authStoreInstance.getConfig?.();
  const buttonConfig = authStoreInstance.getButtonConfig?.() ?? null;
  const stateMessage =
    result.signInState || result.apiError !== undefined
      ? (authStoreInstance.getStateMessageConfig?.() ?? null)
      : null;
  const explainerConfig = authStoreInstance.getExplainerConfig?.(explainFeatures) ?? null;

  // useCallback (not a plain function) so its identity only changes with authStoreInstance/
  // onSuccess, letting the mount effect below list it as a dependency without re-running on
  // every render (a plain function re-created each render would force that).
  const handleConditionalAuth = useCallback(
    async (conditionalAuthEmail: string) => {
      const state = authStoreInstance.getState();
      if (state.conditionalAuthActive || state.loading) return;

      debug('🔍 Starting conditional authentication for:', conditionalAuthEmail);
      try {
        authStoreInstance.setConditionalAuthActive(true);
        const success =
          await authStoreInstance.startConditionalAuthentication(conditionalAuthEmail);
        if (success) {
          onSuccess?.({ user: authStoreInstance.getState().user, method: 'passkey' });
        }
      } catch (error) {
        // Conditional auth fails silently - expected if no passkeys exist.
        debug('⚠️ Conditional authentication failed (expected if no passkeys):', error);
      } finally {
        authStoreInstance.setConditionalAuthActive(false);
      }
    },
    [authStoreInstance, onSuccess]
  );

  // Initialize on mount: if an initial email was provided, check for existing pins /
  // trigger conditional auth (mirrors the Svelte version's `onMount(initializeComponent)`).
  useEffect(() => {
    if (!initialEmail) return;

    let cancelled = false;
    (async () => {
      authStoreInstance.setEmail(initialEmail);
      try {
        await authStoreInstance.checkUser(initialEmail);
      } catch (error) {
        authStoreInstance.setLoading(false);
        console.warn('Error checking for existing pins on mount:', error);
      }
      if (cancelled) return;
      if (authStoreInstance.getState().passkeysEnabled) {
        await handleConditionalAuth(initialEmail);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authStoreInstance, initialEmail, handleConditionalAuth]);

  // Debounced check-user-for-email whenever the local email field changes, mirroring the
  // Svelte reactive block that re-triggers `checkUserForEmail` while in emailEntry/userChecked/
  // generalError (also covers autofill, since browsers set the input value programmatically).
  useEffect(() => {
    if (
      !(
        email &&
        (signInState === 'emailEntry' ||
          signInState === 'userChecked' ||
          signInState === 'generalError')
      )
    ) {
      return undefined;
    }

    if (emailCheckTimeoutRef.current) {
      clearTimeout(emailCheckTimeoutRef.current);
    }
    emailCheckTimeoutRef.current = setTimeout(async () => {
      const trimmedEmail = email.trim();
      if (!trimmedEmail) {
        authStoreInstance.setEmail('');
        return;
      }
      if (!EMAIL_REGEX.test(trimmedEmail)) return;
      try {
        await authStoreInstance.checkUser(trimmedEmail);
      } catch {
        // Error handling is managed by the store.
      }
    }, 400);

    return () => {
      if (emailCheckTimeoutRef.current) {
        clearTimeout(emailCheckTimeoutRef.current);
      }
    };
  }, [email, signInState, authStoreInstance]);

  async function handlePasskeyAuth() {
    // `signInWithPasskey()` resolves with the raw `SignInData` (no `.step` field -- unlike
    // the Svelte original's `result.step === 'success'` check, which traced back to
    // `auth-store.ts` never sets `.step` on this return value, so that check can never be
    // true and its `dispatch('success', ...)` is dead code there). Read the canonical,
    // already-converted `User` off the store instead (`authenticateUser()` sets it
    // synchronously before this promise resolves), matching how conditional auth below
    // reports success.
    await authStoreInstance.signInWithPasskey(email);
    authStoreInstance.setLoading(false);
    const user = authStoreInstance.getState().user;
    if (user) {
      onSuccess?.({ user, method: 'passkey' });
    }
  }

  async function handleEmailCodeAuth() {
    const sendResult = await authStoreInstance.sendEmailCode(email);
    authStoreInstance.setLoading(false);
    if (sendResult.success) {
      authStoreInstance.notifyPinSent();
    } else {
      throw new Error(sendResult.message || 'Failed to send email code');
    }
  }

  async function handleSignIn() {
    if (!email.trim()) return;

    authStoreInstance.setLoading(true);

    try {
      const userCheck = await authStoreInstance.checkUser(email);

      if (!userCheck.exists) {
        if (authConfig?.signInMode === 'login-only') {
          authStoreInstance.setLoading(false);
          return;
        }
        const currentFullName = authStoreInstance.getState().fullName;
        if (currentFullName?.trim()) {
          const [firstName, ...rest] = currentFullName.trim().split(' ');
          const lastName = rest.join(' ');

          debug('🔄 Creating account:', { email, firstName, lastName });
          try {
            await authStoreInstance.createAccount({
              email: email.trim(),
              firstName,
              lastName,
              acceptedTerms: false,
              acceptedPrivacy: false,
              invitationToken: authConfig?.invitationToken
            });
            await handleEmailCodeAuth();
            authStoreInstance.setLoading(false);
          } catch (registrationError) {
            console.error('❌ Account creation failed:', registrationError);
            authStoreInstance.setLoading(false);
            onError?.({ error: toAuthError(registrationError, 'error.registrationFailed') });
          }
          return;
        }
      }

      const authMethod = determineAuthMethod(
        userCheck,
        authStoreInstance.getState().passkeysEnabled
      );

      switch (authMethod) {
        case 'passkey-with-fallback':
          try {
            await handlePasskeyAuth();
          } catch (passkeyError) {
            console.warn('Passkey authentication failed:', passkeyError);
            await handleEmailCodeAuth();
          }
          break;

        case 'email-code':
          if (authStoreInstance.getState().hasValidPin) {
            authStoreInstance.setLoading(false);
            authStoreInstance.notifyPinSent();
          } else {
            await handleEmailCodeAuth();
          }
          break;
      }
    } catch (err) {
      authStoreInstance.setLoading(false);
      console.error('Authentication error:', err);
      onError?.({ error: toAuthError(err, 'error.authFailed') });
    }
  }

  async function handleSecondaryAction() {
    if (!email.trim() || !buttonConfig?.secondary) return;

    authStoreInstance.setLoading(true);
    try {
      if (buttonConfig.secondary.method === 'email-code') {
        if (authStoreInstance.getState().hasValidPin) {
          authStoreInstance.setLoading(false);
          authStoreInstance.notifyPinSent();
        } else {
          await handleEmailCodeAuth();
        }
      }
    } catch (err) {
      authStoreInstance.setLoading(false);
      console.error('Secondary authentication error:', err);
      onError?.({ error: toAuthError(err, 'error.authFailed') });
    }
  }

  if (!authStoreInstance) return null;

  return (
    <div className={`sign-in-core ${className}`}>
      {(signInState === 'emailEntry' || signInState === 'userChecked') && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleSignIn();
          }}
        >
          <EmailInput
            value={email}
            label="email.label"
            placeholder="email.placeholder"
            disabled={result.loading}
            enableWebAuthn={result.passkeysEnabled}
            onChange={(e) => setEmail(e.value)}
            onConditionalAuth={(e) => void handleConditionalAuth(e.email)}
          />

          {result.hasValidPin && result.pinRemainingMinutes > 0 && (
            <AuthStateMessage type="info" variant="pin-status">
              {m['status.pinValid']({
                minutes: result.pinRemainingMinutes,
                s: result.pinRemainingMinutes !== 1 ? 's' : ''
              })}
              <button
                type="button"
                className="pin-direct-link"
                onClick={() => authStoreInstance.notifyPinSent()}
                disabled={result.loading}
              >
                {m['status.pinDirectAction']()}
              </button>
            </AuthStateMessage>
          )}

          {signInState === 'userChecked' && result.userExists === false && (
            <>
              {stateMessage && (
                <AuthStateMessage
                  type={stateMessage.type}
                  tKey={stateMessage.textKey}
                  showIcon={stateMessage.showIcon}
                />
              )}
              {authConfig?.signInMode !== 'login-only' && (
                <AuthNewUserInfo
                  fullName={result.fullName}
                  disabled={result.loading}
                  error={null}
                  onChange={(e) => authStoreInstance.setFullName(e.fullName)}
                />
              )}
            </>
          )}

          {buttonConfig && (
            <div className="button-section">
              <AuthButton
                type="submit"
                buttonConfig={buttonConfig.primary}
                loading={result.loading}
              />

              {buttonConfig.secondary && (
                <AuthButton
                  type="button"
                  variant="secondary"
                  buttonConfig={buttonConfig.secondary}
                  loading={result.loading}
                  onClick={() => void handleSecondaryAction()}
                />
              )}
            </div>
          )}

          <AuthExplainer config={explainerConfig} apiError={result.apiError} />
        </form>
      )}

      {signInState === 'pinEntry' && (
        <PinEntryStep store={authStoreInstance} onSuccess={onSuccess} />
      )}

      {signInState === 'signedIn' && result.user && (
        // Minimal stand-in for the (out-of-scope) `UserManagement` component -- just
        // enough to confirm sign-in succeeded and let the user sign out. See the file
        // header for why the full account-management UI isn't ported here.
        <div className="signed-in-success">
          <AuthStateMessage type="success" showIcon={true}>
            {m['auth.signedInSuccess']()} ({result.user.email})
          </AuthStateMessage>
          <div className="button-section">
            <AuthButton
              type="button"
              variant="secondary"
              buttonConfig={{
                method: 'generic',
                textKey: 'user.signOut',
                loadingTextKey: 'user.signOut',
                supportsWebAuthn: false,
                disabled: false
              }}
              loading={false}
              onClick={() => void authStoreInstance.signOut()}
            />
          </div>
        </div>
      )}

      {(signInState === 'generalError' ||
        signInState === 'passkeyPrompt' ||
        signInState === 'passkeyRegistration') && (
        // 'generalError' is reachable today: a failed passkey ceremony (including the browser's
        // own autofill/conditional-UI attempt) sets signInState to 'generalError'. Recovery here
        // is via the email field itself, not a dedicated button: retyping the email re-triggers
        // the debounced check-user effect above, which naturally advances signInState again.
        <>
          <AuthStateMessage
            type={signInState === 'generalError' ? 'error' : 'info'}
            tKey={signInState === 'generalError' ? 'error.authFailed' : 'auth.authenticating'}
            showIcon={true}
          />
          <EmailInput
            value={email}
            label="email.label"
            placeholder="email.placeholder"
            disabled={result.loading}
            enableWebAuthn={false}
            onChange={(e) => setEmail(e.value)}
          />
        </>
      )}

      {signInState === 'emailVerification' && stateMessage && (
        <AuthStateMessage
          type={stateMessage.type}
          tKey={stateMessage.textKey}
          showIcon={stateMessage.showIcon}
        />
      )}
    </div>
  );
}
