<script lang="ts">
import { browser } from '$app/environment';
import { createEventDispatcher, onMount } from 'svelte';

export let config: any;

const dispatch = createEventDispatcher<{
  success: { user: any; method: string };
  error: { error: any };
}>();

let mounted = false;

onMount(async () => {
  if (!browser) return;

  try {
    mounted = true;

    console.log('✅ Real flows-auth SignInForm loaded with config:', {
      apiBaseUrl: config.apiBaseUrl,
      domain: config.domain,
      enablePasskeys: config.enablePasskeys,
    });
  } catch (error) {
    console.error('❌ Failed to initialize flows-auth:', error);
  }
});

function handleSuccess(event: CustomEvent<{ user: any; method: string }>) {
  dispatch('success', event.detail);
}

function handleError(event: CustomEvent<{ error: any }>) {
  dispatch('error', event.detail);
}
</script>

{#if browser && mounted && config}
  <!-- Debug: Show what we're trying to render -->
  <div class="debug-info" style="background: #f0f0f0; padding: 10px; margin: 10px 0; border-radius: 5px;">
    <p><strong>🔍 Debug: About to render SignInForm</strong></p>
    <p>Config keys: {Object.keys(config).join(', ')}</p>
    <p>API Base URL: {config.apiBaseUrl}</p>
    <p>Domain: {config.domain}</p>
    <p>Enable Passkeys: {config.enablePasskeys}</p>
  </div>

  <!-- Use real flows-auth SignInForm with direct import -->
  <SignInForm
    {config}
    on:success={handleSuccess}
    on:error={handleError}
  />

  <div class="auth-status">
    <small style="color: green;">✅ Using real flows-auth SignInForm (direct import)</small>
  </div>
{:else if browser}
  <!-- Loading state -->
  <div class="loading-auth">
    <div class="spinner"></div>
    <p>Initializing authentication system...</p>
  </div>
{:else}
  <!-- SSR fallback -->
  <div class="loading-auth">
    <div class="spinner"></div>
    <p>Loading authentication system...</p>
  </div>
{/if}

<style>
  .auth-status {
    text-align: center;
    margin-top: 8px;
    font-size: 12px;
    opacity: 0.7;
  }
  
  .loading-auth {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-8);
    text-align: center;
  }

  .loading-auth .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--color-gray-200);
    border-top: 3px solid var(--brand-primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: var(--spacing-4);
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .loading-auth p {
    color: var(--color-gray-600);
    margin: 0;
  }
</style>