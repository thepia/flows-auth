/**
 * PinEntryStep - PIN code entry and verification step
 * Isolated component for the `pinEntry` signInState.
 *
 * Ported from `src/svelte/components/core/PinEntryStep.svelte`.
 */
import type { FormEvent } from 'react';
import { useAuthStore } from '../../hooks/useAuthStore.js';
import type { UseAuthStoreResult } from '../../hooks/useAuthStore.js';
import type { AuthMethod, User } from '../../../core/types/index.js';
import type { ComposedAuthStore } from '../../../core/stores/auth-store.js';
import { debug } from '../../../core/utils/debug.js';
import { AuthButton } from './AuthButton.js';
import { AuthStateMessage } from './AuthStateMessage.js';
import { CodeInput } from './CodeInput.js';
import './PinEntryStep.css';

// `emailCode` is materialized at runtime by `ComposedAuthStore.getState()` (it's part of
// the UI sub-store) but missing from the plain `AuthStore` TS interface -- a real gap in
// `src/core/types/index.ts` flagged during the React port (see Phase C report). Widening
// the hook's return type locally here, rather than casting to `any` at every call site.
type AuthStoreResultWithEmailCode = UseAuthStoreResult & { emailCode: string };

export interface PinEntryStepProps {
  store?: ComposedAuthStore;
  onSuccess?: (payload: { user: User | null; method: AuthMethod }) => void;
}

export function PinEntryStep({ store: storeProp, onSuccess }: PinEntryStepProps) {
  const store = useAuthStore(storeProp) as AuthStoreResultWithEmailCode;
  const authConfig = store.getConfig?.();
  const buttonConfig = store.getButtonConfig();
  const stateMessage =
    store.signInState || store.apiError !== undefined ? store.getStateMessageConfig() : null;

  const handleEmailCodeVerification = async () => {
    const code = store.emailCode || '';
    if (!code.trim()) {
      debug('❌ No code to verify');
      return;
    }
    debug('✅ Verifying code:', code);

    try {
      const result = await store.verifyEmailCode(code);
      if (result?.user) {
        // `verifyEmailCode()` resolves with the raw `SignInData` shape (its nested `.user`
        // lacks `createdAt`/etc. that the core `User` type requires) -- read the canonical,
        // already-converted `User` off the store instead, same fix as `SignInCore`'s
        // `handlePasskeyAuth`.
        const user = store.getState().user;
        onSuccess?.({ user, method: 'email-code' as AuthMethod });
      } else {
        throw new Error('Email code verification failed');
      }
    } catch (err) {
      console.error('❌ Email code verification failed in component:', err);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void handleEmailCodeVerification();
  };

  return (
    <div className="email-code-input">
      <form onSubmit={handleSubmit}>
        <CodeInput
          onChange={(e) => store.setEmailCode(e.value)}
          label="code.label"
          placeholder="code.placeholder"
          disabled={store.loading}
          maxlength={authConfig?.emailCodeLength || 6}
        />

        {stateMessage && (
          <AuthStateMessage
            type={stateMessage.type}
            tKey={stateMessage.textKey}
            showIcon={stateMessage.showIcon}
          />
        )}

        {buttonConfig && (
          <div className="button-section">
            <AuthButton type="submit" buttonConfig={buttonConfig.primary} loading={store.loading} />

            {buttonConfig.secondary && (
              <AuthButton
                type="button"
                variant="secondary"
                buttonConfig={buttonConfig.secondary}
                loading={store.loading}
                onClick={() => store.reset()}
              />
            )}
          </div>
        )}
      </form>
    </div>
  );
}
