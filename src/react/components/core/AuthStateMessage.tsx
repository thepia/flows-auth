/**
 * AuthStateMessage - Component for displaying authentication status and error messages
 * Features: different message types, icons, animations, accessibility, Paraglide i18n support
 *
 * Ported from `src/svelte/components/core/AuthStateMessage.svelte`. Behavior parity:
 * - `message` wins over `tKey` (explicit message > translated lookup).
 * - Auto-dismisses `success` messages after 5s when `dismissible` is true.
 * - Same class names / CSS custom property hooks as the Svelte version (see
 *   `./AuthStateMessage.css`), so consumers styling one target keep parity with the other.
 */
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { m } from '../../../core/utils/i18n.js';
import './AuthStateMessage.css';

export interface AuthStateMessageProps {
  type?: 'error' | 'success' | 'info' | 'warning';
  message?: string;
  /** Translation key for Paraglide i18n (bracket-accessed against `m`). */
  tKey?: string;
  showIcon?: boolean;
  dismissible?: boolean;
  className?: string;
  animate?: boolean;
  variant?: 'default' | 'pin-status';
  children?: ReactNode;
}

// SVG icon mapping - simple monochrome (identical markup to the Svelte version)
const icons: Record<NonNullable<AuthStateMessageProps['type']>, string> = {
  error:
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zM7 4a1 1 0 1 1 2 0v3a1 1 0 1 1-2 0V4zm1 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/></svg>',
  success:
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm3.354 5.854-4 4a.5.5 0 0 1-.708 0l-2-2a.5.5 0 1 1 .708-.708L7 9.793l3.646-3.647a.5.5 0 0 1 .708.708z"/></svg>',
  info: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 3a1 1 0 0 1 1 1v4a1 1 0 1 1-2 0V5a1 1 0 0 1 1-1zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/></svg>',
  warning:
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zM7 4a1 1 0 1 1 2 0v3a1 1 0 1 1-2 0V4zm1 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/></svg>'
};

function getDisplayMessage(message: string, tKey: string): string {
  if (message) return message;

  if (tKey) {
    const messageFunction = (m as unknown as Record<string, () => string>)[tKey];
    if (typeof messageFunction === 'function') {
      return messageFunction();
    }
    console.warn(`AuthStateMessage: Unknown tKey "${tKey}"`);
    return tKey;
  }

  return '';
}

export function AuthStateMessage({
  type = 'info',
  message = '',
  tKey = '',
  showIcon = true,
  dismissible = false,
  className = '',
  animate = true,
  variant = 'default',
  children
}: AuthStateMessageProps) {
  const [visible, setVisible] = useState(true);
  const displayMessage = getDisplayMessage(message, tKey);
  const hasSlotContent = Boolean(children);

  const dismiss = () => {
    if (dismissible) {
      setVisible(false);
    }
  };

  // Auto-dismiss for success messages (mirrors the Svelte `run(() => {...})` block).
  useEffect(() => {
    if (type === 'success' && displayMessage && dismissible) {
      const timeout = setTimeout(() => {
        setVisible(false);
      }, 5000);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [type, displayMessage, dismissible]);

  if (!visible || !(displayMessage || hasSlotContent)) {
    return null;
  }

  return (
    <div
      className={`auth-message type-${type} variant-${variant} ${animate ? 'animate' : ''} ${className}`}
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
    >
      <div className="flex items-start gap-2">
        {showIcon && (
          <span
            className="shrink-0 text-base mt-px"
            aria-hidden="true"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: fixed, non-user-controlled monochrome icon markup (same set as the Svelte version's {@html}).
            dangerouslySetInnerHTML={{ __html: icons[type] }}
          />
        )}

        <span className="flex-1 break-words text-left">
          {hasSlotContent ? children : displayMessage}
        </span>

        {dismissible && (
          <button
            type="button"
            className="dismiss-button shrink-0"
            onClick={dismiss}
            aria-label="Dismiss message"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
