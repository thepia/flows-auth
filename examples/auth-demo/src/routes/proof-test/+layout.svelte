<!--
  PROOF TEST LAYOUT
  Creates ONE auth store with ONE config, makes it available to all children
-->
<script>
  import { browser } from '$app/environment';
  import { onMount, setContext } from 'svelte';
  import { createAuthStore } from '@thepia/flows-auth';
  
  // Layout component that will show auth state
  import LayoutAuthStatus from './LayoutAuthStatus.svelte';
  
  let authStore = null;
  let authStoreReady = false;
  
  // SINGLE config object that will be shared by ALL components
  const sharedConfig = {
    apiBaseUrl: 'https://api.thepia.com',
    clientId: 'proof-test',
    domain: 'thepia.net',
    enablePasskeys: false,
    enableMagicLinks: true,
    enableErrorReporting: true,
    appCode: 'demo',
    branding: {
      companyName: 'Proof Test'
    }
  };
  
  // Create auth store during component initialization (only way setContext works)
  if (browser) {
    console.log('🔧 Layout: Creating shared auth store during initialization...');
    authStore = createAuthStore(sharedConfig);
    authStore.initialize();
    authStoreReady = true;
    console.log('✅ Layout: Shared auth store created');
  }
  
  // Set context during component initialization (MUST be synchronous)
  if (authStore) {
    setContext('authStore', authStore);
    console.log('✅ Layout: Auth store set in context');
  }
</script>

<div class="proof-layout">
  <h1>Proof Test: Shared Auth Store</h1>
  
  <div class="layout-section">
    <h2>Layout Component (this file)</h2>
    {#if authStoreReady}
      <LayoutAuthStatus {authStore} />
    {:else}
      <p>⏳ Creating shared auth store...</p>
    {/if}
  </div>
  
  <div class="page-section">
    <h2>Page Components</h2>
    <slot />
  </div>
</div>

<style>
  .proof-layout {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
  
  .layout-section {
    background: #f0f9ff;
    padding: 1.5rem;
    border-radius: 8px;
    margin-bottom: 2rem;
    border-left: 4px solid #0ea5e9;
  }
  
  .page-section {
    background: #f0fdf4;
    padding: 1.5rem;
    border-radius: 8px;
    border-left: 4px solid #10b981;
  }
  
  .layout-section h2,
  .page-section h2 {
    margin-top: 0;
    color: #374151;
  }
</style>