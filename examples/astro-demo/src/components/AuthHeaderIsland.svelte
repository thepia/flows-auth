<!--
  Auth Header Island Component
  
  This island demonstrates:
  - Using client:idle for deferred hydration
  - Displaying auth state in a header/navbar context
  - Sharing state across different parts of the page
-->
<script lang="ts">
  import { sharedAuthStore } from '../lib/shared-auth-store';
  import { makeSvelteCompatible } from '@thepia/flows-auth/stores/adapters/svelte';
  
  // Same store instance as other islands!
  const auth = makeSvelteCompatible(sharedAuthStore);
  
  function handleSignOut() {
    auth.reset();
  }
</script>

<div class="auth-header-island">
  <div class="header-content">
    <div class="logo">
      <span class="logo-icon">🔐</span>
      <span class="logo-text">Flows Auth Demo</span>
    </div>
    
    <div class="auth-status">
      {#if $auth.email}
        <div class="user-info">
          <span class="user-email">{$auth.email}</span>
          {#if $auth.fullName}
            <span class="user-name">({$auth.fullName})</span>
          {/if}
          <button on:click={handleSignOut} class="btn-sign-out">
            Sign Out
          </button>
        </div>
      {:else}
        <span class="not-signed-in">Not signed in</span>
      {/if}
    </div>
  </div>
  
  <p class="island-info">
    This island uses <code>client:idle</code> - hydrates when browser is idle
  </p>
</div>

<style>
  .auth-header-island {
    padding: 1.5rem 2rem;
    border: 2px solid #f59e0b;
    border-radius: 8px;
    background: white;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    margin-bottom: 2rem;
  }
  
  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  
  .logo {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .logo-icon {
    font-size: 2rem;
  }
  
  .logo-text {
    font-size: 1.5rem;
    font-weight: 700;
    color: #111827;
  }
  
  .auth-status {
    display: flex;
    align-items: center;
  }
  
  .user-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .user-email {
    font-weight: 500;
    color: #374151;
  }
  
  .user-name {
    color: #6b7280;
    font-size: 0.875rem;
  }
  
  .not-signed-in {
    color: #9ca3af;
    font-style: italic;
  }
  
  .btn-sign-out {
    padding: 0.375rem 0.75rem;
    background: #ef4444;
    color: white;
    border: none;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }
  
  .btn-sign-out:hover {
    background: #dc2626;
  }
  
  .island-info {
    font-size: 0.75rem;
    color: #9ca3af;
    margin: 0;
    text-align: center;
  }
  
  .island-info code {
    background: #f3f4f6;
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-family: monospace;
  }
</style>

