<!--
  AuthNewUserInfo - Component for collecting new user information during registration
  Shows Full Name input and terms notice
-->
<script lang="ts">
import { m } from '../../utils/i18n';
import AuthStateMessage from './AuthStateMessage.svelte';
import {
  "auth.fullName" as authFullName,
  "auth.fullNamePlaceholder" as authFullNamePlaceholder
} from '../../paraglide/messages';

// Props
export let fullName = '';
export let disabled = false;
export let error: string | null = null;
</script>

<div class="auth-new-user-info">
  <div class="input-group">
    <label for="fullName" class="input-label">
      {authFullName()}
    </label>
    <input
      id="fullName"
      type="text"
      bind:value={fullName}
      placeholder={authFullNamePlaceholder()}
      class="auth-input"
      class:error
      autocomplete="name"
      autocapitalize="words"
      spellcheck="false"
      required
      {disabled}
    />
    {#if error}
      <span class="error-message">{error}</span>
    {/if}
  </div>
  
  <AuthStateMessage
    type="info"
    tKey="auth.newUserTermsNotice"
    showIcon={true}
    className="terms-notice"
  />
</div>

<style>
  .auth-new-user-info {
    margin: 16px 0;
  }

  .input-group {
    margin-bottom: 12px;
  }

  .input-label {
    display: block;
    margin-bottom: 6px;
    font-size: 14px;
    font-weight: 500;
    color: var(--auth-label-text, #374151);
  }

  .auth-input {
    width: 100%;
    padding: 10px 12px;
    font-size: 16px;
    line-height: 1.5;
    color: var(--auth-input-text, #111827);
    background: var(--auth-input-bg, #ffffff);
    border: 1px solid var(--auth-input-border, #d1d5db);
    border-radius: 6px;
    transition: all 0.15s ease;
    box-sizing: border-box;
  }

  .auth-input:focus {
    outline: none;
    border-color: var(--auth-input-focus-border, #3b82f6);
    box-shadow: 0 0 0 3px var(--auth-input-focus-shadow, rgba(59, 130, 246, 0.1));
  }

  .auth-input:disabled {
    background: var(--auth-input-disabled-bg, #f3f4f6);
    color: var(--auth-input-disabled-text, #9ca3af);
    cursor: not-allowed;
  }

  .auth-input.error {
    border-color: var(--auth-error-border, #ef4444);
  }

  .auth-input.error:focus {
    border-color: var(--auth-error-border, #ef4444);
    box-shadow: 0 0 0 3px var(--auth-error-shadow, rgba(239, 68, 68, 0.1));
  }

  .error-message {
    display: block;
    margin-top: 4px;
    font-size: 13px;
    color: var(--auth-error-text, #ef4444);
  }

  /* Style for terms notice */
  :global(.terms-notice) {
    margin-top: 12px;
  }

  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    .input-label {
      color: var(--auth-label-text-dark, #d1d5db);
    }

    .auth-input {
      color: var(--auth-input-text-dark, #f3f4f6);
      background: var(--auth-input-bg-dark, #1f2937);
      border-color: var(--auth-input-border-dark, #4b5563);
    }

    .auth-input:focus {
      border-color: var(--auth-input-focus-border-dark, #60a5fa);
      box-shadow: 0 0 0 3px var(--auth-input-focus-shadow-dark, rgba(96, 165, 250, 0.1));
    }

    .auth-input:disabled {
      background: var(--auth-input-disabled-bg-dark, #111827);
      color: var(--auth-input-disabled-text-dark, #6b7280);
    }

    .auth-input.error {
      border-color: var(--auth-error-border-dark, #f87171);
    }

    .auth-input.error:focus {
      border-color: var(--auth-error-border-dark, #f87171);
      box-shadow: 0 0 0 3px var(--auth-error-shadow-dark, rgba(248, 113, 113, 0.1));
    }

    .error-message {
      color: var(--auth-error-text-dark, #f87171);
    }
  }
</style>