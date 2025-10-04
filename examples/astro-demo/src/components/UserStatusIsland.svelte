<!--
  User Status Island Component
  
  This island demonstrates:
  - Sharing state with SignInIsland through the same Zustand store
  - Using client:visible for lazy hydration
  - Reactive updates when other islands modify the store
-->
<script lang="ts">
  import { sharedAuthStore } from '../lib/shared-auth-store';
  import { makeSvelteCompatible } from '@thepia/flows-auth/stores/adapters/svelte';
  
  // Same store instance as SignInIsland!
  const auth = makeSvelteCompatible(sharedAuthStore);
  
  // This island will automatically update when SignInIsland changes the store
</script>

<div class="user-status-island">
  <h2>👤 User Status Island</h2>
  <p class="island-info">
    This island uses <code>client:visible</code> - hydrates when scrolled into view
  </p>
  
  <div class="status-grid">
    <div class="status-item">
      <span class="label">Email:</span>
      <span class="value">{$auth.email || '(not set)'}</span>
    </div>
    
    <div class="status-item">
      <span class="label">Full Name:</span>
      <span class="value">{$auth.fullName || '(not set)'}</span>
    </div>
    
    <div class="status-item">
      <span class="label">User Exists:</span>
      <span class="value">
        {#if $auth.userExists === null}
          <span class="badge badge-gray">Unknown</span>
        {:else if $auth.userExists}
          <span class="badge badge-green">Yes</span>
        {:else}
          <span class="badge badge-yellow">No</span>
        {/if}
      </span>
    </div>
    
    <div class="status-item">
      <span class="label">Has Passkeys:</span>
      <span class="value">
        {#if $auth.hasPasskeys}
          <span class="badge badge-blue">Yes</span>
        {:else}
          <span class="badge badge-gray">No</span>
        {/if}
      </span>
    </div>
    
    <div class="status-item">
      <span class="label">Sign-In State:</span>
      <span class="value">
        <span class="badge badge-purple">{$auth.signInState}</span>
      </span>
    </div>
    
    <div class="status-item">
      <span class="label">Loading:</span>
      <span class="value">
        {#if $auth.loading}
          <span class="badge badge-orange">Yes</span>
        {:else}
          <span class="badge badge-gray">No</span>
        {/if}
      </span>
    </div>
  </div>
  
  <div class="sync-indicator">
    <p>
      ✨ This island automatically updates when the Sign-In Island changes the store!
    </p>
  </div>
</div>

<style>
  .user-status-island {
    padding: 2rem;
    border: 2px solid #10b981;
    border-radius: 8px;
    background: white;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  
  .island-info {
    font-size: 0.875rem;
    color: #6b7280;
    margin-bottom: 1.5rem;
  }
  
  .island-info code {
    background: #f3f4f6;
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-family: monospace;
  }
  
  .status-grid {
    display: grid;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  
  .status-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: #f9fafb;
    border-radius: 0.375rem;
  }
  
  .label {
    font-weight: 500;
    color: #374151;
  }
  
  .value {
    color: #6b7280;
  }
  
  .badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
  }
  
  .badge-gray {
    background: #f3f4f6;
    color: #6b7280;
  }
  
  .badge-green {
    background: #d1fae5;
    color: #065f46;
  }
  
  .badge-yellow {
    background: #fef3c7;
    color: #92400e;
  }
  
  .badge-blue {
    background: #dbeafe;
    color: #1e40af;
  }
  
  .badge-purple {
    background: #ede9fe;
    color: #5b21b6;
  }
  
  .badge-orange {
    background: #fed7aa;
    color: #9a3412;
  }
  
  .sync-indicator {
    padding: 1rem;
    background: #ecfdf5;
    border: 1px solid #10b981;
    border-radius: 0.375rem;
    text-align: center;
  }
  
  .sync-indicator p {
    margin: 0;
    color: #065f46;
    font-size: 0.875rem;
  }
</style>

