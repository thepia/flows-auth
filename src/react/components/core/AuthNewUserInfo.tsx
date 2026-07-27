/**
 * AuthNewUserInfo - Component for collecting new user information during registration
 * Shows Full Name input and terms notice.
 *
 * Ported from `src/svelte/components/core/AuthNewUserInfo.svelte`. Controlled component:
 * callers own `fullName` and pass `onChange` (Svelte used `bind:fullName`).
 */
import type { ChangeEvent } from 'react';
import { m } from '../../../core/utils/i18n.js';
import { AuthStateMessage } from './AuthStateMessage.js';
import './AuthNewUserInfo.css';

export interface AuthNewUserInfoProps {
  fullName?: string;
  disabled?: boolean;
  error?: string | null;
  onChange?: (payload: { fullName: string }) => void;
}

export function AuthNewUserInfo({
  fullName = '',
  disabled = false,
  error = null,
  onChange
}: AuthNewUserInfoProps) {
  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    onChange?.({ fullName: event.target.value });
  };

  return (
    <div className="auth-new-user-info">
      <div className="input-group">
        <label htmlFor="fullName" className="input-label">
          {m['auth.fullName']()}
        </label>
        <input
          id="fullName"
          type="text"
          value={fullName}
          onChange={handleInput}
          placeholder={m['auth.fullNamePlaceholder']()}
          className={`auth-input${error ? ' error' : ''}`}
          autoComplete="name"
          autoCapitalize="words"
          spellCheck={false}
          required
          disabled={disabled}
        />
        {error && <span className="error-message">{error}</span>}
      </div>

      <AuthStateMessage type="info" tKey="auth.newUserTermsNotice" showIcon={true} className="terms-notice" />
    </div>
  );
}
