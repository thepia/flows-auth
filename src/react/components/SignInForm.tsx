/**
 * SignInForm - Simple wrapper around SignInCore with border/popup functionality
 * The actual auth logic is handled by `SignInCore`.
 *
 * Ported from `src/svelte/components/SignInForm.svelte`. `variant`/`popupPosition` are
 * CSS-only positioning differences (no backdrop, no anchoring) -- intentional, matching
 * the Svelte version exactly.
 *
 * Event contract: `docs/components/README.md`'s documented `SignInFormEvents` table lists
 * `success`, `error`, `close`. Research during the port confirmed the Svelte version
 * declares a 4th (`stepChange`) that's never dispatched, and that `error` is *also* never
 * dispatched there in practice (`SignInCore.svelte` declares an `error` event but never
 * calls `dispatch('error', ...)` anywhere). This port honors the documented contract at
 * this outer layer: `onError` is wired to `SignInCore`'s `onError`, which -- unlike the
 * Svelte original -- *is* actually invoked when an auth operation throws (see
 * `SignInCore.tsx`'s header comment). `stepChange`/`navigate` are dropped as vestigial.
 */
import { useEffect } from 'react';
import type { ComposedAuthStore } from '../../core/stores/auth-store.js';
import type { AuthError, AuthMethod, User } from '../../core/types/index.js';
import { m } from '../../core/utils/i18n.js';
import { useAuthStore } from '../hooks/useAuthStore.js';
import { SignInCore } from './core/SignInCore.js';
import './SignInForm.css';

export interface SignInFormProps {
  /** Auth store prop (preferred); falls back to `useAuthStore()`'s context resolution. */
  store?: ComposedAuthStore | null;
  showLogo?: boolean;
  compact?: boolean;
  className?: string;
  initialEmail?: string;
  size?: 'small' | 'medium' | 'large' | 'full';
  variant?: 'inline' | 'popup';
  popupPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  showCloseButton?: boolean;
  closeOnEscape?: boolean;
  titleKey?: string;
  subtitleBrandedKey?: string;
  subtitleKey?: string;
  /** Whether to show the features list in the explainer. */
  explainFeatures?: boolean;
  onSuccess?: (payload: { user: User; method: AuthMethod }) => void;
  onError?: (payload: { error: AuthError }) => void;
  /** Popup variant only. */
  onClose?: () => void;
}

function getDisplayText(key: string, variables?: Record<string, unknown>): string {
  const fn = (m as unknown as Record<string, (vars?: Record<string, unknown>) => string>)[key];
  return typeof fn === 'function' ? fn(variables) : key;
}

export function SignInForm({
  store: storeProp = null,
  showLogo = true,
  compact = false,
  className = '',
  initialEmail = '',
  size = 'medium',
  variant = 'inline',
  popupPosition = 'top-right',
  showCloseButton = true,
  closeOnEscape = true,
  titleKey = 'signIn.title',
  subtitleBrandedKey = 'signIn.subtitle',
  subtitleKey = 'signIn.subtitleGeneric',
  explainFeatures = false,
  onSuccess,
  onError,
  onClose
}: SignInFormProps) {
  // Throws if neither `store` nor a context store is available, matching the Svelte
  // version's mount-time `if (!authStore) throw ...` fail-fast behavior.
  const authStore = useAuthStore(storeProp ?? undefined);
  const authConfig = authStore.getConfig?.();
  const logoConfig = authConfig?.branding;

  useEffect(() => {
    if (variant !== 'popup' || !closeOnEscape) return undefined;

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [variant, closeOnEscape, onClose]);

  const handleSuccess = (payload: { user: User | null; method: AuthMethod }) => {
    if (payload.user) {
      onSuccess?.({ user: payload.user, method: payload.method });
    }
  };

  const authFormClasses = [
    'auth-form',
    `auth-form--${size}`,
    `auth-form--${variant}`,
    variant === 'popup' ? `pos-${popupPosition}` : '',
    compact ? 'auth-form--compact' : '',
    className
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <div className={authFormClasses}>
        {variant === 'popup' && showCloseButton && (
          <button
            type="button"
            className="popup-close"
            onClick={() => onClose?.()}
            aria-label="Close sign-in dialog"
          >
            ✕
          </button>
        )}

        {showLogo && logoConfig?.logoUrl && (
          <div className="auth-logo">
            <img src={logoConfig.logoUrl} alt={logoConfig.companyName || 'Logo'} />
          </div>
        )}

        <div className="auth-header">
          <h2 className="auth-title font-brand-lead">{getDisplayText(titleKey)}</h2>
          <p className="auth-description">
            {authConfig?.branding?.companyName
              ? getDisplayText(subtitleBrandedKey, { companyName: authConfig.branding.companyName })
              : getDisplayText(subtitleKey)}
          </p>
        </div>

        <div className="auth-container">
          <SignInCore
            store={authStore.store}
            explainFeatures={explainFeatures}
            initialEmail={initialEmail}
            onSuccess={handleSuccess}
            onError={onError}
          />
        </div>
      </div>

      {authConfig?.branding?.showPoweredBy === true && (
        <div className="auth-footer">
          <p className="powered-by">
            {getDisplayText('branding.securedBy')} <strong>{getDisplayText('branding.poweredBy')}</strong>
          </p>
        </div>
      )}
    </>
  );
}
