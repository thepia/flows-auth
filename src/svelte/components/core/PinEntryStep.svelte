<!--
  PinEntryStep - PIN code entry and verification step
  Isolated component for the pinEntry state
-->
<script lang="ts">
  import { preventDefault } from 'svelte/legacy';

import { createEventDispatcher } from 'svelte';
import type { AuthMethod } from '@thepia/flows-auth';
import type { SvelteAuthStore } from '@thepia/flows-auth';
import CodeInput from './CodeInput.svelte';
import AuthButton from './AuthButton.svelte';
import AuthStateMessage from './AuthStateMessage.svelte';

  interface Props {
    authStore: SvelteAuthStore;
  }

  let { authStore }: Props = $props();

const dispatch = createEventDispatcher<{
  success: { user: any; method: AuthMethod };
}>();

// Reactive store subscription
let store = $derived(authStore);
let authConfig = $derived($authStore?.config);

// Button config - only depends on fields needed for pinEntry
let buttonConfig = $derived((() => {
  const deps = [$authStore?.loading, $authStore?.emailCode];
  return authStore ? authStore.getButtonConfig() : null;
})());

// State message (includes API errors) - reactive to signInState and apiError changes
let stateMessage = $derived(authStore && ($authStore.signInState || $authStore.apiError !== undefined) ? authStore.getStateMessageConfig() : null);

async function handleEmailCodeVerification() {
  console.log('🔐 handleEmailCodeVerification called', { emailCode: $authStore.emailCode });
  const code = $authStore.emailCode || '';
  if (!code.trim()) {
    console.log('❌ No code to verify');
    return;
  }
  console.log('✅ Verifying code:', code);

  try {
    const result = await authStore.verifyEmailCode(code);

    // verifyEmailCode returns SignInData with user and tokens, not a response with step
    if (result && result.user) {
      dispatch('success', {
        user: result.user,
        method: 'email-code' as AuthMethod
      });
    } else {
      throw new Error('Email code verification failed');
    }
  } catch (err: any) {
    console.error('❌ Email code verification failed in component:', err);
  }
}
</script>

<div class="email-code-input">
  <form onsubmit={preventDefault(handleEmailCodeVerification)}>
    <CodeInput
      on:change={(e) => {
        authStore.setEmailCode(e.detail.value);
      }}
      label="code.label"
      placeholder="code.placeholder"
      disabled={$authStore.loading}
      maxlength={authConfig?.emailCodeLength || 6}
    />

    {#if stateMessage}
      <AuthStateMessage
        type={stateMessage.type}
        tKey={stateMessage.textKey}
        showIcon={stateMessage.showIcon}
      />
    {/if}

    {#if buttonConfig}
      <div class="button-section">
        <AuthButton
          type="submit"
          buttonConfig={buttonConfig.primary}
          loading={$authStore.loading}
        />

        {#if buttonConfig.secondary}
          <AuthButton
            type="button"
            variant="secondary"
            buttonConfig={buttonConfig.secondary}
            loading={$authStore.loading}
            on:click={authStore.reset}
          />
        {/if}
      </div>
    {/if}
  </form>
</div>
