<!--
  Sign-In Island Component
  
  This is an Astro island that uses the shared Zustand auth store.
  It demonstrates:
  - Importing the singleton store instance
  - Using makeSvelteCompatible() for Svelte reactivity
  - Reactive state updates across islands
-->
<script lang="ts">
  import { sharedAuthStore } from '../lib/shared-auth-store';
  import { makeSvelteCompatible } from '@thepia/flows-auth/stores/adapters/svelte';
  
  // Wrap the Zustand store for Svelte reactivity
  const auth = makeSvelteCompatible(sharedAuthStore);
  
  // Local state for form
  let email = '';
  let fullName = '';
  let loading = false;
  
  // Sync with store
  $: email = $auth.email || '';
  $: fullName = $auth.fullName || '';
  $: loading = $auth.loading || false;
  
  async function handleCheckUser() {
    if (!email.trim()) return;
    
    loading = true;
    try {
      await auth.checkUser(email);
    } catch (error) {
      console.error('User check failed:', error);
    } finally {
      loading = false;
    }
  }
  
  async function handleSignIn() {
    if (!email.trim()) return;
    
    loading = true;
    try {
      // This would trigger actual sign-in flow
      console.log('Sign in with:', email);
    } catch (error) {
      console.error('Sign in failed:', error);
    } finally {
      loading = false;
    }
  }
</script>

<div class="sign-in-island">
  <h2>🏝️ Sign-In Island</h2>
  <p class="island-info">
    This island uses <code>client:load</code> - hydrates immediately
  </p>
  
  <div class="form-group">
    <label for="email">Email</label>
    <input
      id="email"
      type="email"
      bind:value={email}
      on:input={() => auth.setEmail(email)}
      placeholder="you@example.com"
      disabled={loading}
    />
  </div>
  
  {#if $auth.userExists !== null}
    <div class="user-status">
      {#if $auth.userExists}
        <p class="status-exists">✅ User exists</p>
        {#if $auth.hasPasskeys}
          <p class="status-passkey">🔑 Has passkeys</p>
        {/if}
      {:else}
        <p class="status-new">👋 New user - registration required</p>
        <div class="form-group">
          <label for="fullName">Full Name</label>
          <input
            id="fullName"
            type="text"
            bind:value={fullName}
            on:input={() => auth.setFullName(fullName)}
            placeholder="Your Name"
            disabled={loading}
          />
        </div>
      {/if}
    </div>
  {/if}
  
  <div class="button-group">
    <button
      on:click={handleCheckUser}
      disabled={!email.trim() || loading}
      class="btn-primary"
    >
      {loading ? 'Checking...' : 'Check User'}
    </button>
    
    {#if $auth.userExists !== null}
      <button
        on:click={handleSignIn}
        disabled={!email.trim() || loading}
        class="btn-secondary"
      >
        {$auth.userExists ? 'Sign In' : 'Register'}
      </button>
    {/if}
  </div>
  
  <div class="state-display">
    <strong>Current State:</strong> {$auth.signInState}
  </div>
</div>

<style>
  .sign-in-island {
    padding: 2rem;
    border: 2px solid #4f46e5;
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
  
  .form-group {
    margin-bottom: 1rem;
  }
  
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #374151;
  }
  
  input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 1rem;
  }
  
  input:focus {
    outline: none;
    border-color: #4f46e5;
    ring: 2px solid rgba(79, 70, 229, 0.2);
  }
  
  input:disabled {
    background: #f3f4f6;
    cursor: not-allowed;
  }
  
  .user-status {
    margin: 1rem 0;
    padding: 1rem;
    background: #f9fafb;
    border-radius: 0.375rem;
  }
  
  .status-exists {
    color: #059669;
    font-weight: 500;
  }
  
  .status-passkey {
    color: #0891b2;
    font-size: 0.875rem;
  }
  
  .status-new {
    color: #d97706;
    font-weight: 500;
  }
  
  .button-group {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
  }
  
  button {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.375rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .btn-primary {
    background: #4f46e5;
    color: white;
  }
  
  .btn-primary:hover:not(:disabled) {
    background: #4338ca;
  }
  
  .btn-secondary {
    background: #10b981;
    color: white;
  }
  
  .btn-secondary:hover:not(:disabled) {
    background: #059669;
  }
  
  .state-display {
    margin-top: 1rem;
    padding: 0.75rem;
    background: #fef3c7;
    border-radius: 0.375rem;
    font-size: 0.875rem;
  }
</style>

