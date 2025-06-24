<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { browser } from '$app/environment';
  import SimpleAuthForm from './SimpleAuthForm.svelte';
  
  export let config: any;
  
  const dispatch = createEventDispatcher<{
    success: { user: any; method: string };
    error: { error: any };
  }>();
  
  let authLibraryLoaded = false;
  let SignInForm: any = null;
  
  onMount(async () => {
    if (!browser) return;
    
    // For now, just use SimpleAuthForm until we resolve the import issue
    console.log('📝 Using SimpleAuthForm for demo - flows-auth import needs resolution');
    // TODO: Fix dynamic import of flows-auth to avoid vite static analysis
  });
  
  function handleSuccess(event: CustomEvent<{ user: any; method: string }>) {
    dispatch('success', event.detail);
  }
  
  function handleError(event: CustomEvent<{ error: any }>) {
    dispatch('error', event.detail);
  }
</script>

{#if browser}
  <!-- Use SimpleAuthForm for now until dynamic import issue is resolved -->
  <SimpleAuthForm 
    {config}
    on:success={handleSuccess}
    on:error={handleError}
  />
  
  <div class="auth-status">
    <small style="color: orange;">⚠️ Using SimpleAuthForm demo - flows-auth integration pending</small>
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