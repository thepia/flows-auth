<script>
  import { getContext } from 'svelte';
  import { SignInForm } from '@thepia/flows-auth';

  const AUTH_CONTEXT_KEY = 'flows-auth-store';
  const authStore = getContext(AUTH_CONTEXT_KEY);
</script>

<div class="page-container">
  <h1>Simple SignInForm Test</h1>

  <div class="form-wrapper">
    {#if authStore}
      <SignInForm store={authStore} />
    {:else}
      <p>Loading auth store...</p>
    {/if}
  </div>
</div>

<style>
  .page-container {
    max-width: 600px;
    margin: 2rem auto;
    padding: 1rem;
  }

  h1 {
    text-align: center;
    margin-bottom: 2rem;
    color: #1e293b;
  }

  .form-wrapper {
    margin-top: 2rem;
  }
</style>
