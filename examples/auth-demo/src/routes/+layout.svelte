<script>
import { browser } from '$app/environment';
import { onMount } from 'svelte';
import { createAuthStore } from '@thepia/flows-auth'; // ✅ Static imports
import '../app.css';
import '@thepia/flows-auth/dist/style.css';

// Optional SvelteKit props
export let params = {};

// Auth state for reactivity
let isAuthenticated = false;
let user = null;
let authStore = null;
let isLoading = true;
let initError = null;

console.log('🚀 Initializing auth demo with explicit prop passing pattern...');

// ✅ CORRECT PATTERN: Create auth store in layout, pass via props
onMount(async () => {
  if (!browser) {
    console.log('⚠️ Non-browser environment - auth store will be null');
    isLoading = false;
    return;
  }

  try {
    // ✅ Create config synchronously (direct config object, not quickAuthSetup)
    const authConfig = {
      apiBaseUrl: 'https://api.thepia.com',
      clientId: 'demo',
      domain: 'thepia.net',
      enablePasskeys: false,
      enableMagicLinks: true,
      enableErrorReporting: true,
      appCode: 'demo',
      branding: {
        companyName: 'Auth Demo'
      }
    };
    console.log('⚙️ Auth config created:', authConfig);
    
    // ✅ Create single auth store that all components will share
    authStore = createAuthStore(authConfig);
    console.log('🔧 Auth store created');
    
    // Subscribe to auth state changes for layout reactivity
    authStore.subscribe((state) => {
      isAuthenticated = state.state === 'authenticated' || state.state === 'authenticated-confirmed';
      user = state.user;
      console.log('🔄 Auth state changed:', { state: state.state, user: !!state.user });
    });
    
    // Initialize the auth store (check for existing session)
    authStore.initialize();
    isLoading = false;
    
    console.log('✅ Auth demo initialization complete');
    
  } catch (error) {
    console.error('❌ Failed to initialize auth demo:', error);
    initError = error.message;
    isLoading = false;
  }
});
</script>

<div class="app" class:authenticated={isAuthenticated}>
	<header class="header">
		<div class="container">
			<div class="header-content">
				<h1 class="logo">
					<span class="brand-icon">🔐</span>
					Auth Demo
				</h1>
				<div class="auth-status">
					{#if isAuthenticated && user}
						<div class="user-info">
							<span class="welcome">Welcome, {user.email}!</span>
							<button 
								class="btn btn-outline" 
								on:click={() => authStore?.signOut()}
							>
								Sign Out
							</button>
						</div>
					{:else}
						<div class="status-indicator">
							<span class="status-dot"></span>
							Not authenticated
						</div>
					{/if}
				</div>
			</div>
		</div>
	</header>
	
	<main class="main">
		<div class="container">
			{#if isLoading}
				<div class="loading-state">
					<div class="loading-spinner"></div>
					<p>Initializing auth demo...</p>
				</div>
			{:else if initError}
				<div class="error-state">
					<h2>❌ Initialization Error</h2>
					<p>{initError}</p>
					<button class="btn btn-outline" on:click={() => window.location.reload()}>
						Reload Page
					</button>
				</div>
			{:else}
				<!-- ✅ Pass authStore to all pages via slot props -->
				<slot 
					authStore={authStore} 
					isAuthenticated={isAuthenticated} 
					user={user} 
				/>
			{/if}
		</div>
	</main>
</div>

<style>
	:global(*) {
		box-sizing: border-box;
	}
	
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
		background: #f8fafc;
		color: #1e293b;
		line-height: 1.6;
	}
	
	.app {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}
	
	.header {
		background: white;
		border-bottom: 1px solid #e2e8f0;
		box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
		position: sticky;
		top: 0;
		z-index: 10;
	}
	
	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 1rem;
	}
	
	.header-content {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 0;
	}
	
	.logo {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin: 0;
		font-size: 1.5rem;
		font-weight: 700;
		color: #2563eb;
	}
	
	.brand-icon {
		font-size: 2rem;
	}
	
	.auth-status {
		display: flex;
		align-items: center;
	}
	
	.user-info {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	
	.welcome {
		font-weight: 500;
		color: #059669;
	}
	
	.status-indicator {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: #64748b;
		font-size: 0.9rem;
	}
	
	.status-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #ef4444;
	}
	
	.authenticated .status-dot {
		background: #10b981;
	}
	
	.btn {
		padding: 0.5rem 1rem;
		border-radius: 0.375rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-size: 0.9rem;
		border: none;
	}
	
	.btn-outline {
		background: transparent;
		border: 1px solid #d1d5db;
		color: #374151;
	}
	
	.btn-outline:hover {
		background: #f9fafb;
		border-color: #9ca3af;
	}
	
	.main {
		flex: 1;
		padding: 2rem 0;
	}
	
	.loading-state,
	.error-state {
		text-align: center;
		padding: 4rem 2rem;
	}
	
	.loading-spinner {
		width: 3rem;
		height: 3rem;
		border: 4px solid #e5e7eb;
		border-top: 4px solid #2563eb;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin: 0 auto 1rem;
	}
	
	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}
	
	.error-state {
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 8px;
		max-width: 500px;
		margin: 0 auto;
	}
	
	.error-state h2 {
		color: #dc2626;
		margin-bottom: 1rem;
	}
	
	.error-state p {
		color: #7f1d1d;
		margin-bottom: 1.5rem;
	}
</style>