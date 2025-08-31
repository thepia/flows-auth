<script>
import { browser } from '$app/environment';
import { onMount, setContext } from 'svelte';
import { writable } from 'svelte/store';
import '../app.css';

// Single source of truth for auth state
let authStore = null;
let authConfig = null;
let isAuthenticated = false;
let user = null;

// Create writable stores for context
const authStoreContainer = writable(null);
const authConfigContainer = writable(null);

// Set context immediately (before onMount)
setContext('authStore', authStoreContainer);
setContext('authConfig', authConfigContainer);

onMount(async () => {
  if (!browser) return;
  
  try {
    console.log('🚀 Initializing auth demo...');
    
    // Dynamic import to avoid SSR issues
    const { createAuthStore } = await import('@thepia/flows-auth');
    const { getCachedAuthConfig } = await import('../lib/config/auth.js');
    
    // Get the central config (single source of truth)
    authConfig = await getCachedAuthConfig();
    console.log('⚙️ Auth config loaded:', authConfig);
    
    // Create the single auth store
    authStore = createAuthStore(authConfig);
    console.log('🔐 Auth store created');
    
    // Update context containers
    authStoreContainer.set(authStore);
    authConfigContainer.set(authConfig);
    
    // Subscribe to auth state changes
    authStore.subscribe((state) => {
      isAuthenticated = state.state === 'authenticated';
      user = state.user;
      console.log('🔄 Auth state changed:', { state: state.state, user: !!state.user });
    });
    
    // Initialize the auth store (check for existing session)
    authStore.initialize();
    
    console.log('✅ Auth demo initialization complete');
    
  } catch (error) {
    console.error('❌ Failed to initialize auth demo:', error);
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
			<slot />
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
</style>