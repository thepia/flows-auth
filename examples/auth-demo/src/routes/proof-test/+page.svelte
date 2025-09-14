<!--
  PROOF TEST PAGE
  Multiple components that should all use the SAME auth store from layout
-->
<script>
  import { useAuth, useAuthSafe } from '@thepia/flows-auth';

  // Page components that will show auth state
  import PageAuthComponent from './PageAuthComponent.svelte';

  // Get auth store using the proper context pattern
  let authStore = null;
  let authError = null;

  try {
    authStore = useAuth();
    console.log('📄 Page: Auth store from useAuth():', !!authStore);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn('📄 Page: useAuth() failed, trying useAuthSafe():', errorMessage);
    authStore = useAuthSafe();
    if (!authStore) {
      authError = errorMessage;
      console.error('📄 Page: No auth store available:', error);
    }
  }
</script>

<div class="page-content">
  <h3>Multiple Page Components Using Same Store</h3>
  
  {#if authStore}
    <div class="components-grid">
      <PageAuthComponent title="Page Component 1" />
      <PageAuthComponent title="Page Component 2" />
      <PageAuthComponent title="Page Component 3" />
    </div>
    
    <div class="proof-section">
      <h4>Proof Requirements:</h4>
      <ul>
        <li>✅ All components should show the same Store Instance ID (proves same object)</li>
        <li>✅ When one component triggers sign-in, ALL components should update</li>
        <li>✅ State changes should propagate to both layout and page components</li>
        <li>✅ Only ONE config object should be used across all components</li>
      </ul>
    </div>
  {:else}
    <p class="error">❌ No auth store available from layout context</p>
  {/if}
</div>

<style>
  .page-content {
    margin-top: 1rem;
  }
  
  .page-content h3 {
    margin: 0 0 1rem 0;
    color: #374151;
  }
  
  .components-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }
  
  .proof-section {
    background: #fffbeb;
    border: 1px solid #fed7aa;
    border-radius: 8px;
    padding: 1.5rem;
  }
  
  .proof-section h4 {
    margin: 0 0 1rem 0;
    color: #92400e;
  }
  
  .proof-section ul {
    margin: 0;
    color: #92400e;
  }
  
  .error {
    color: #dc2626;
    font-weight: bold;
    background: #fef2f2;
    padding: 1rem;
    border-radius: 4px;
  }
</style>