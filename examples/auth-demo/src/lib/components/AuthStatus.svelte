<!-- 
  Example component showing how to use the global auth store singleton
  This component doesn't create its own auth store - it uses the global one
-->
<script>
  import { useAuth } from '@thepia/flows-auth';
  
  // Get the global auth store - no need to create or pass it around!
  const auth = useAuth();
  
  // Subscribe to auth state
  $: authState = $auth;
  $: isAuthenticated = authState.state === 'authenticated' || authState.state === 'authenticated-confirmed';
  $: user = authState.user;
  
  function handleSignOut() {
    auth.signOut();
  }
</script>

<div class="auth-status">
  <h3>Auth Status (using singleton pattern)</h3>
  
  <div class="status-info">
    <p><strong>State:</strong> {authState.state}</p>
    <p><strong>Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</p>
    
    {#if user}
      <p><strong>User:</strong> {user.email}</p>
      <button on:click={handleSignOut} class="sign-out-btn">
        Sign Out
      </button>
    {:else}
      <p><em>No user authenticated</em></p>
    {/if}
  </div>
  
  <div class="pattern-info">
    <p class="pattern-note">
      ✅ This component uses <code>useAuth()</code> to access the global auth store.
      No auth store creation, no prop drilling, no state duplication!
    </p>
  </div>
</div>

<style>
  .auth-status {
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    padding: 16px;
    margin: 16px 0;
    background: #f9fafb;
  }
  
  .status-info {
    margin: 12px 0;
  }
  
  .status-info p {
    margin: 8px 0;
  }
  
  .sign-out-btn {
    background: #ef4444;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    margin-top: 8px;
  }
  
  .sign-out-btn:hover {
    background: #dc2626;
  }
  
  .pattern-info {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #d1d5db;
  }
  
  .pattern-note {
    font-size: 14px;
    color: #059669;
    background: #ecfdf5;
    padding: 12px;
    border-radius: 6px;
    border-left: 4px solid #059669;
  }
  
  code {
    background: #1f2937;
    color: #f9fafb;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 12px;
  }
</style>