<!--
  Layout Auth Status Component
  Shows auth state from the shared store via context
-->
<script>
  import { onMount, onDestroy } from 'svelte';
  import { getAuthStoreFromContext } from '@thepia/flows-auth';

  let authState = null;
  let storeId = Math.random().toString(36).substring(2, 11);
  let authStore = null;
  let authError = null;
  let unsubscribe = null;

  // Get auth store from context using the library's helper
  try {
    authStore = getAuthStoreFromContext();
    console.log(`📡 Layout component (${storeId}): Auth store from context:`, !!authStore);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    authError = errorMessage;
    console.error(`📡 Layout component (${storeId}): No auth store available:`, error);
  }

  // Subscribe to auth state changes with proper lifecycle management
  onMount(() => {
    if (authStore) {
      unsubscribe = authStore.subscribe((state) => {
        authState = state;
        console.log(`📡 Layout component (${storeId}): Auth state updated:`, state.state);
      });
    }
  });

  // Clean up subscription on component destroy
  onDestroy(() => {
    if (unsubscribe) {
      unsubscribe();
    }
  });
  
  function testSignIn() {
    if (authStore) {
      console.log(`🔄 Layout component (${storeId}): Testing sign-in...`);
      authStore.signInWithMagicLink('test@example.com');
    }
  }
  
  function testSignOut() {
    if (authStore) {
      console.log(`🔄 Layout component (${storeId}): Testing sign-out...`);
      authStore.signOut();
    }
  }
</script>

<div class="auth-status">
  <h3>Layout Auth Component</h3>
  
  {#if authStore}
    <div class="status-info">
      <p><strong>Store Instance:</strong> {storeId}</p>
      <p><strong>Auth State:</strong> {authState?.state || 'loading...'}</p>
      <p><strong>User:</strong> {authState?.user?.email || 'None'}</p>
      <p><strong>Is Authenticated:</strong> {authState?.state === 'authenticated' ? 'Yes' : 'No'}</p>
    </div>
    
    <div class="test-actions">
      <button on:click={testSignIn} class="btn-test">Test Sign In</button>
      <button on:click={testSignOut} class="btn-test">Test Sign Out</button>
    </div>
  {:else}
    <p class="error">❌ No auth store received</p>
  {/if}
</div>

<style>
  .auth-status {
    background: white;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    padding: 1rem;
  }
  
  .auth-status h3 {
    margin: 0 0 1rem 0;
    color: #374151;
  }
  
  .status-info {
    background: #f8fafc;
    padding: 0.75rem;
    border-radius: 4px;
    margin-bottom: 1rem;
    font-size: 0.9rem;
  }
  
  .status-info p {
    margin: 0.25rem 0;
  }
  
  .test-actions {
    display: flex;
    gap: 0.5rem;
  }
  
  .btn-test {
    background: #0ea5e9;
    color: white;
    border: none;
    padding: 0.5rem 0.75rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
  }
  
  .btn-test:hover {
    background: #0284c7;
  }
  
  .error {
    color: #dc2626;
    font-weight: bold;
  }
</style>