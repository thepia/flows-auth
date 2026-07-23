<!--
  AuthNewUserInfo - Component for collecting new user information during registration
  Shows Full Name input and terms notice
-->
<script lang="ts">
import { createEventDispatcher } from 'svelte';
import AuthStateMessage from './AuthStateMessage.svelte';
import { m } from '@thepia/flows-auth';


  interface Props {
    // Props
    fullName?: string;
    disabled?: boolean;
    error?: string | null;
  }

  let { fullName = $bindable(''), disabled = false, error = null }: Props = $props();

// Event dispatcher
const dispatch = createEventDispatcher<{
  input: { fullName: string };
}>();

// Handle input changes and emit events
function handleInput(event: Event) {
  const target = event.target as HTMLInputElement;
  fullName = target.value;
  dispatch('input', { fullName });
}
</script>

<div class="auth-new-user-info">
  <div class="input-group">
    <label for="fullName" class="input-label">
      {m['auth.fullName']()}
    </label>
    <input
      id="fullName"
      type="text"
      bind:value={fullName}
      oninput={handleInput}
      placeholder={m['auth.fullNamePlaceholder']()}
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
    color: var(--color-text-secondary, #374151);
  }

  .auth-input {
    width: 100%;
    padding: 10px 12px;
    font-size: 16px;
    line-height: 1.5;
    color: var(--color-text-primary, #111827);
    background: var(--color-bg-primary, #ffffff);
    border: 1px solid var(--color-border-default, #d1d5db);
    border-radius: 6px;
    transition: all 0.15s ease;
    box-sizing: border-box;
  }

  .auth-input:focus {
    outline: none;
    border-color: var(--color-border-brand, #3b82f6);
    box-shadow: var(--shadow-input-focus, 0 0 0 3px rgba(59, 130, 246, 0.1));
  }

  .auth-input:disabled {
    background: var(--color-bg-disabled-input, #f3f4f6);
    color: var(--color-disabled-text, #9ca3af);
    cursor: not-allowed;
  }

  .auth-input.error {
    border-color: var(--color-border-error, #ef4444);
  }

  .auth-input.error:focus {
    border-color: var(--color-border-error, #ef4444);
    box-shadow: var(--shadow-error, 0 0 0 3px rgba(239, 68, 68, 0.1));
  }

  .error-message {
    display: block;
    margin-top: 4px;
    font-size: 13px;
    color: var(--color-text-error, #ef4444);
  }

  /* Style for terms notice */
  :global(.terms-notice) {
    margin-top: 12px;
  }

</style>