<script lang="ts">
import { setupAuthContext } from '@thepia/flows-auth/svelte';
import type { User } from '@thepia/flows-auth';
import ErrorReportingStatus from '../lib/components/ErrorReportingStatus.svelte';
import '../app.css';

interface Props {
	children?: import('svelte').Snippet;
}

let { children }: Props = $props();

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

// Auth state for reactivity — derived directly from Svelte's store
// auto-subscription ($authStore) instead of a hand-rolled
// authStore.subscribe(...) that copied fields into local $state. The
// store's combined state (see AuthStore in flows-auth/src/types/index.ts)
// exposes `state` (AuthState) and `user` (User | null) directly.
let isAuthenticated = $derived(
  $authStore.state === 'authenticated' || $authStore.state === 'authenticated-confirmed'
);
let user: User | null = $derived($authStore.user);
</script>

<div class="app">
	<header>
		<div class="container">
			<h1>Tasks App</h1>
			<div class="auth-status">
				{#if isAuthenticated && user}
					<span>Welcome, {user.email}</span>
					<button onclick={() => authStore?.signOut()}>Sign Out</button>
				{:else}
					<span>Not signed in</span>
				{/if}
			</div>
		</div>
	</header>
	
	<main class="container">
		{@render children?.()}
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