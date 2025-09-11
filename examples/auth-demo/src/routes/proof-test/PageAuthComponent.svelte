<!--
  Page Auth Component
  Individual component that uses the shared auth store
-->
<script>
  export let title;
  export let authStore;
  
  let authState = null;
  let storeId = Math.random().toString(36).substr(2, 9);
  
  // Subscribe to auth state changes from the shared store
  if (authStore) {
    authStore.subscribe((state) => {
      authState = state;
      console.log(`📱 ${title} (${storeId}): Auth state updated:`, state.state);
    });
  }
  
  function testSignIn() {
    if (authStore) {
      console.log(`🔄 ${title} (${storeId}): Testing sign-in...`);
      authStore.signInWithMagicLink(`test-${storeId}@example.com`);
    }
  }
  
  function testSignOut() {
    if (authStore) {
      console.log(`🔄 ${title} (${storeId}): Testing sign-out...`);
      authStore.signOut();
    }
  }
  
  function checkStoreIdentity() {
    if (authStore) {
      console.log(`🔍 ${title} (${storeId}): Store object reference:`, authStore);
      console.log(`🔍 ${title} (${storeId}): Store subscribe function:`, authStore.subscribe);
    }
  }
</script>

<div class="page-auth-component">
  <div class="component-header">
    <h4>{title}</h4>
    <div class="status-indicator" class:authenticated={authState?.state === 'authenticated'}>
      {authState?.state === 'authenticated' ? '✅' : '🔒'}
    </div>
  </div>
  
  {#if authStore}
    <div class="status-info">
      <p><strong>Component ID:</strong> {storeId}</p>
      <p><strong>Auth State:</strong> {authState?.state || 'loading...'}</p>
      <p><strong>User:</strong> {authState?.user?.email || 'None'}</p>
      <p><strong>Error:</strong> {authState?.error?.message || 'None'}</p>
    </div>
    
    <div class="test-actions">
      <button on:click={testSignIn} class="btn-test">Sign In</button>
      <button on:click={testSignOut} class="btn-test">Sign Out</button>
      <button on:click={checkStoreIdentity} class="btn-debug">Check Store</button>
    </div>
  {:else}
    <p class="error">❌ No auth store provided</p>
  {/if}
</div>

<style>
  .page-auth-component {
    background: white;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    padding: 1rem;
  }
  
  .component-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #e5e7eb;
  }
  
  .component-header h4 {
    margin: 0;
    color: #374151;
  }
  
  .status-indicator {
    font-size: 1.2rem;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    background: #f3f4f6;
  }
  
  .status-indicator.authenticated {
    background: #dcfce7;
  }
  
  .status-info {
    background: #f8fafc;
    padding: 0.75rem;
    border-radius: 4px;
    margin-bottom: 1rem;
    font-size: 0.85rem;
  }
  
  .status-info p {
    margin: 0.25rem 0;
  }
  
  .test-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  
  .btn-test {
    background: #10b981;
    color: white;
    border: none;
    padding: 0.4rem 0.6rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
  }
  
  .btn-test:hover {
    background: #059669;
  }
  
  .btn-debug {
    background: #6b7280;
    color: white;
    border: none;
    padding: 0.4rem 0.6rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
  }
  
  .btn-debug:hover {
    background: #4b5563;
  }
  
  .error {
    color: #dc2626;
    font-weight: bold;
  }
</style>