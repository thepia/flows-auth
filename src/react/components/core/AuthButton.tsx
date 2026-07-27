/**
 * AuthButton - State-aware authentication button component
 * Features: loading states, different auth methods, customizable appearance, i18n support
 *
 * Ported from `src/svelte/components/core/AuthButton.svelte`. Icon set: `@phosphor-icons/react`
 * (the React equivalent of `phosphor-svelte`, same icon names/weights) rather than inline SVG,
 * for visual/API parity with the Svelte target -- see the Phase C report for why.
 *
 * Icons are imported via deep per-icon paths (`@phosphor-icons/react/dist/csr/<Name>`)
 * rather than the package's barrel (`import { Key } from '@phosphor-icons/react'`):
 * the barrel's `dist/index.d.ts` re-exports ~1500 icons via `export * from './csr/<Name>'`
 * with extensionless relative specifiers, which `moduleResolution: "nodenext"` (this
 * project's setting) cannot resolve through star-re-exports -- confirmed by direct testing
 * during the port (explicit/named re-exports like `IconContext` resolve fine; every
 * star-re-exported icon name doesn't). Deep imports resolve directly to each icon's own
 * `.d.ts` and sidestep the issue entirely; they're also the package's documented
 * tree-shaking-friendly import style.
 */
import { Envelope } from '@phosphor-icons/react/dist/csr/Envelope';
import { Fingerprint } from '@phosphor-icons/react/dist/csr/Fingerprint';
import { Key } from '@phosphor-icons/react/dist/csr/Key';
import { SmileyWink } from '@phosphor-icons/react/dist/csr/SmileyWink';
import type { MouseEvent } from 'react';
import type { SingleButtonConfig } from '../../../core/types/index.js';
import { m } from '../../../core/utils/i18n.js';
import './AuthButton.css';

export interface AuthButtonProps {
  type?: 'submit' | 'button';
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
  /** Method-specific text and icons (legacy - use buttonConfig instead) */
  supportsWebAuthn?: boolean;
  /** NEW: Button configuration object (preferred approach) */
  buttonConfig: SingleButtonConfig;
  onClick?: (payload: { method: string }) => void;
}

// Matches ../icons/Icon.svelte's sizeMap (--icon-size-sm/md/lg) - kept as a plain
// number here rather than routing through a shared Icon component, since that would
// also force an icon color that would fight the button variant's own text color
// (white on primary, muted on ghost, etc).
const iconSizeBySize: Record<NonNullable<AuthButtonProps['size']>, number> = {
  sm: 16,
  md: 20,
  lg: 24
};

function detectAppleDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent);
}

function getDisplayText(buttonConfig: SingleButtonConfig, loading: boolean, isAppleDevice: boolean): string {
  const messages = m as unknown as Record<string, () => string>;

  if (loading && buttonConfig.loadingTextKey && buttonConfig.loadingTextKey in m) {
    return messages[buttonConfig.loadingTextKey]();
  }
  if (buttonConfig.textKey && buttonConfig.textKey in m) {
    return messages[buttonConfig.textKey]();
  }

  if (loading) {
    switch (buttonConfig.method) {
      case 'passkey':
        return m['auth.signingIn']();
      case 'email':
      case 'email-code':
        return m['auth.sendingPin']();
      case 'continue-touchid':
      case 'continue-faceid':
      case 'continue-biometric':
        return m['auth.signingIn']();
      default:
        return m['auth.loading']();
    }
  }

  switch (buttonConfig.method) {
    case 'passkey':
      if (buttonConfig.supportsWebAuthn && isAppleDevice) {
        // Generic "Touch ID/Face ID" text for better reliability and UX -- specific
        // detection is unreliable and WebAuthn intentionally obscures biometric details.
        return m['auth.continueWithBiometric']();
      }
      return buttonConfig.supportsWebAuthn ? m['auth.signInWithPasskey']() : m['auth.signIn']();
    case 'email':
    case 'email-code':
      return m['auth.sendPinByEmail']();
    case 'continue-touchid':
      return m['auth.continueWithTouchId']();
    case 'continue-faceid':
      return m['auth.continueWithFaceId']();
    case 'continue-biometric':
      return m['auth.continueWithBiometric']();
    default:
      return m['action.continue']();
  }
}

function getDisplayIconComponent(buttonConfig: SingleButtonConfig, loading: boolean, isAppleDevice: boolean) {
  if (loading) return null;
  if (!buttonConfig?.method) return null;

  switch (buttonConfig.method) {
    case 'passkey':
      // Fingerprint icon for Apple devices, key icon for others.
      return isAppleDevice ? Fingerprint : Key;
    case 'email':
    case 'email-code':
      return Envelope;
    case 'continue-touchid':
      return Fingerprint;
    case 'continue-faceid':
      return SmileyWink;
    case 'continue-biometric':
      return Fingerprint;
    default:
      return null;
  }
}

export function AuthButton({
  type = 'submit',
  loading = false,
  variant = 'primary',
  size = 'md',
  fullWidth = true,
  className = '',
  buttonConfig,
  onClick
}: AuthButtonProps) {
  const isAppleDevice = detectAppleDevice();
  const effectiveDisabled = buttonConfig?.disabled || false;
  const isDisabled = effectiveDisabled || loading;
  const displayText = getDisplayText(buttonConfig, loading, isAppleDevice);
  const DisplayIcon = getDisplayIconComponent(buttonConfig, loading, isAppleDevice);
  const iconSize = iconSizeBySize[size];

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (effectiveDisabled || loading) {
      event.preventDefault();
      return;
    }
    onClick?.({ method: buttonConfig.method });
    // For type="submit" buttons, don't preventDefault - the form's onSubmit handler
    // catches it, same as the Svelte version.
  };

  const variantClass =
    variant === 'primary' ? 'auth-btn-primary' : variant === 'secondary' ? 'auth-btn-secondary' : 'auth-btn-ghost';

  return (
    <button
      type={type}
      className={`auth-btn ${variantClass} auth-btn-size-${size} ${fullWidth ? 'auth-btn-full' : ''} ${className}`}
      disabled={isDisabled}
      onClick={handleClick}
      aria-label={displayText}
      aria-describedby={loading ? 'button-loading-text' : undefined}
    >
      {loading ? (
        <>
          <div className="auth-btn-spinner" aria-hidden="true" />
          <span id="button-loading-text" className="auth-btn-sr-only">
            Signing in...
          </span>
        </>
      ) : (
        DisplayIcon && <DisplayIcon size={iconSize} weight="bold" aria-hidden="true" />
      )}

      <span>{displayText}</span>
    </button>
  );
}
