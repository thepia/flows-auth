<script lang="ts">
import { browser } from '$app/environment';
import { onMount } from 'svelte';
import '../app.css';
import type { User } from '@thepia/flows-auth';
import ErrorReportingStatus from '../lib/components/ErrorReportingStatus.svelte';

let authStore: any = null;
let isAuthenticated = false;
let user: User | null = null;

onMount(async () => {
  if (!browser) return;
  
  try {
    // Initialize error reporting first - TEMPORARILY DISABLED FOR DEBUGGING
    console.log('🔧 Skipping error reporting initialization for debugging');
    // const { initializeTasksErrorReporting, enableGlobalErrorReporting } = await import(
    //   '../lib/config/errorReporting.js'
    // );
    // await initializeTasksErrorReporting();
    // enableGlobalErrorReporting();

    // Dynamic import to avoid SSR issues
    const { createAuthStore } = await import('@thepia/flows-auth');

    // Auto-detect API server with fallback
    let apiBaseUrl = import.meta.env.PUBLIC_API_BASE_URL;

    if (!apiBaseUrl) {
      // Try local API server first
      try {
        const localResponse = await fetch('https://dev.thepia.com:8443/health', {
          method: 'GET',
          signal: AbortSignal.timeout(2000),
        });
        if (localResponse.ok) {
          apiBaseUrl = 'https://dev.thepia.com:8443';
          console.log('🔧 Using local API server');
        } else {
          throw new Error('Local API not responding');
        }
      } catch (error) {
        // Local API not available, use production
        apiBaseUrl = 'https://api.thepia.com';
        console.log('🔧 Using production API server');
        console.log('💡 Note: Some features may be limited due to CORS restrictions');
      }
    }
    authStore = createAuthStore({
      apiBaseUrl,
      clientId: 'tasks-app-demo',
      domain: 'thepia.net',
      enablePasskeys: true,
      enableMagicLinks: true,
      enablePasswordLogin: true,
      enableSocialLogin: false,
    });

    // Subscribe to auth state
    authStore.subscribe((state) => {
      isAuthenticated = state.isAuthenticated;
      user = state.user;
    });

    console.log('🔧 Auth initialized with:', { apiBaseUrl });
  } catch (error) {
    console.error('Failed to initialize auth:', error);
    // Report initialization error
    try {
      const { reportTaskError } = await import('../lib/config/errorReporting.js');
      await reportTaskError('app.init', error, {
        context: 'Layout.onMount',
      });
    } catch (reportError) {
      console.error('Failed to report initialization error:', reportError);
    }
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