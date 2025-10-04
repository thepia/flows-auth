<script lang="ts">
import { browser } from '$app/environment';
import { onMount } from 'svelte';
import '../app.css';
import { setupAuthContext } from '@thepia/flows-auth';
import type { User } from '@thepia/flows-auth';
import ErrorReportingStatus from '../lib/components/ErrorReportingStatus.svelte';

// Auth state for reactivity
let isAuthenticated = false;
let user: User | null = null;
let isAuthLoading = true;
let initError: string | null = null;

// Create auth store during initialization (not in onMount)
const authConfig = {
  apiBaseUrl: 'https://api.thepia.com',
  clientId: 'tasks-app-demo',
  domain: 'thepia.net',
  enablePasskeys: true,
  enableMagicLinks: true,
  errorReporting: {
    enabled: true,
    debug: true
  },
  appCode: 'demo',
  branding: {
    companyName: 'Assignment Management System'
  }
};

const authStore = setupAuthContext(authConfig);

// Initialize in onMount (browser-specific operations)
onMount(() => {
  if (!browser) {
    console.log('⚠️ Non-browser environment');
    return;
  }

  try {
    console.log('🚀 Initializing tasks app auth store...');

    // Subscribe to auth state changes for layout reactivity
    const unsubscribe = authStore.subscribe((state) => {
      isAuthenticated = state.state === 'authenticated' || state.state === 'authenticated-confirmed';
      user = state.user;
      console.log('🔄 Auth state changed:', { state: state.state, user: !!state.user });
    });

    isAuthLoading = false;
    console.log('✅ Tasks app auth store setup complete');

    // Return cleanup function
    return () => {
      unsubscribe();
    };

  } catch (error) {
    console.error('❌ Failed to initialize tasks app:', error);
    initError = error instanceof Error ? error.message : 'Unknown error';
    isAuthLoading = false;
  }
});
</script>

<div class="app">
	<header>
		<div class="container">
			<h1>Tasks App</h1>
			<div class="auth-status">
				{#if isAuthenticated && user}
					<span>Welcome, {user.email}</span>
					<button on:click={() => authStore?.signOut()}>Sign Out</button>
				{:else}
					<span>Not signed in</span>
				{/if}
			</div>
		</div>
	</header>
	
	<main class="container">
		<slot />
	</main>
</div>

<!-- Error reporting status indicator (dev/staging only) -->
<ErrorReportingStatus />

<style>
	:global(body) {
		margin: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		background: #f5f5f5;
	}
	
	.app {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}
	
	header {
		background: white;
		border-bottom: 1px solid #e0e0e0;
		padding: 1rem 0;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}
	
	.container {
		max-width: 800px;
		margin: 0 auto;
		padding: 0 1rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	
	h1 {
		margin: 0;
		color: #333;
	}
	
	.auth-status {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	
	button {
		padding: 0.5rem 1rem;
		background: #007bff;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.9rem;
	}
	
	button:hover {
		background: #0056b3;
	}
	
	main {
		flex: 1;
		padding: 2rem 1rem;
	}
</style>