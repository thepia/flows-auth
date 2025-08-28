<script lang="ts">
import { browser } from '$app/environment';
import { type User } from '@thepia/flows-auth';
import { onMount } from 'svelte';
import { getPendingTasks, getUnreadNotifications, mockTasks } from '../lib/stores/mockData.js';

let currentUser: User | null = null;
let isLoading = false;
let activeTab: 'tasks' | 'documents' | 'notifications' = 'tasks';
let tasks: any[] = [];
let pendingTasks: any[] = [];
let unreadNotifications: any[] = [];
let authStore: any = null;

// Authentication UI state
let showAuthForm = true; // Always show the auth form when not authenticated
let isUnconfirmed = false;
let showVerificationBanner = false;
let showVerificationPrompt = false;

// Test error reporting function
async function testErrorReporting() {
  try {
    const { testErrorReporting } = await import('../lib/config/errorReporting.js');
    await testErrorReporting();
  } catch (error) {
    console.error('Failed to test error reporting:', error);
  }
}

// Determine API base URL at runtime
const getApiBaseUrl = () => {
  // Production API URL (hardcoded as requested)
  const prodApiBaseUrl = 'https://api.thepia.com';

  if (typeof window === 'undefined') return prodApiBaseUrl;

  const hostname = window.location.hostname;
  const isDev =
    hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.thepia.net');

  // Development: Check for local API server, fallback to production
  if (isDev) {
    // TODO: Add health check for local API server (dev.thepia.com:8443)
    // For now, always use production API for reliability
    return prodApiBaseUrl;
  }

  // Production: Always use production API
  return prodApiBaseUrl;
};

// Real authentication using flows-auth
async function initializeAuth() {
  if (!browser) return;

  try {
    isLoading = true;
    const { createAuthStore } = await import('@thepia/flows-auth');

    authStore = createAuthStore({
      apiBaseUrl: getApiBaseUrl(),
      clientId: 'flows-auth-demo',
      domain: 'thepia.net',
      enablePasskeys: true,
      enableMagicLinks: true,
      enablePasswordLogin: true,
      enableSocialLogin: false,
    });

    // Subscribe to auth state changes
    authStore.subscribe((state) => {
      currentUser = state.user;
      isLoading = state.isLoading;

      // Check if user is unconfirmed (has account but email not verified)
      isUnconfirmed = currentUser && !currentUser.emailVerified;
      showVerificationBanner = isUnconfirmed;

      if (currentUser) {
        loadData();
      } else {
        tasks = [];
        pendingTasks = [];
        unreadNotifications = [];
      }

      console.log('Auth state changed:', {
        state: state.state,
        user: state.user,
        isUnconfirmed,
        emailVerified: currentUser?.emailVerified,
      });
    });

    // Check for existing session
    await authStore.initialize();
  } catch (error) {
    console.error('Failed to initialize authentication:', error);
    isLoading = false;
  }
}

// Authentication event handlers
function handleAuthSuccess(event) {
  console.log('Authentication successful:', event.detail);
  showAuthForm = false;
}

function handleAuthError(event) {
  console.error('Authentication error:', event.detail);
}

function handleStateChange(event) {
  console.log('Auth state change:', event.detail);
}

// Email verification handlers
function handleVerificationBannerDismiss() {
  showVerificationBanner = false;
}

function handleResendVerificationEmail() {
  console.log('Resending verification email to:', currentUser?.email);
  // In real implementation, call API to resend email
}

function handleShowVerificationPrompt() {
  showVerificationPrompt = true;
}

function handleVerificationPromptDismiss() {
  showVerificationPrompt = false;
}

async function handleSignOut() {
  if (!authStore) return;

  try {
    await authStore.signOut();
  } catch (error) {
    console.error('Sign out failed:', error);
  }
}

function loadData() {
  tasks = mockTasks;
  pendingTasks = getPendingTasks();
  unreadNotifications = getUnreadNotifications();
}

function handleMarkComplete(task) {
  // Update task status to completed_pending
  task.status = 'completed_pending';
  task.completedAt = new Date();

  // Trigger reactivity
  tasks = [...tasks];
  pendingTasks = getPendingTasks();

  console.log(`Task "${task.title}" marked as complete`);
}

function handleViewDetails(task) {
  console.log('View details for task:', task.title);
  // TODO: Open task detail modal/page
}

onMount(async () => {
  if (!browser) return;
  console.log('Tasks app loaded successfully');

  // Initialize real authentication
  await initializeAuth();
});
</script>

<svelte:head>
	<title>Tasks App - Flows Auth Demo</title>
	<meta name="description" content="Task management with WebAuthn authentication" />
	<link rel="icon" href="/favicon.svg" type="image/svg+xml">
	<link rel="icon" href="/favicon.ico" type="image/x-icon">
</svelte:head>

<div class="page">
	{#if isLoading}
		<div class="loading">
			<div class="spinner"></div>
			<p>Loading assignment dashboard...</p>
		</div>
	{:else if !currentUser}
		<div class="auth-section">
			<h1>Assignment Management System</h1>
			<p>Secure access to your assigned tasks and company communications.</p>

			{#if authStore && showAuthForm}
				<!-- Single Authentication Form - Auto-detects Sign In vs Registration -->
				<div class="auth-form-container">
					<SignInForm
						config={{
							apiBaseUrl: getApiBaseUrl(), // Use same runtime detection
							clientId: 'flows-auth-demo',
							domain: 'thepia.net',
							enablePasskeys: true,
							enableMagicLinks: true,
							enablePasswordLogin: true,
							enableSocialLogin: false,
							branding: {
								companyName: 'Assignment Management System',
								showPoweredBy: true
							}
						}}
						showLogo={false}
						compact={false}
						on:success={handleAuthSuccess}
						on:error={handleAuthError}
						on:stateChange={handleStateChange}
					/>
				</div>
			{:else}
				<div class="loading-auth">
					<div class="spinner"></div>
					<p>Loading authentication system...</p>
				</div>
			{/if}

			<!-- Test error reporting button for debugging -->
			<div class="debug-section">
				<button on:click={testErrorReporting} class="test-button">
					🧪 Test Error Reporting
				</button>
			</div>
		</div>
	{:else}
		<!-- Email Verification Banner -->
		{#if showVerificationBanner && isUnconfirmed}
			<!-- TODO: Re-enable when EmailVerificationBanner import is fixed -->
			<div class="verification-banner">
				<p>Please verify your email: {currentUser?.email || ''}</p>
			</div>
		{/if}

		<!-- Main Dashboard -->
		<header class="dashboard-header">
			<div class="header-content">
				<div class="user-info">
					<h1>Assignment Dashboard</h1>
					<p>Welcome back, <strong>{currentUser.name}</strong></p>
				</div>
				
				<div class="header-actions">
					<div class="notification-badge">
						🔔 {unreadNotifications.length}
					</div>

					{#if isUnconfirmed}
						<button class="verify-email-button" on:click={handleShowVerificationPrompt}>
							🔓 Verify Email
						</button>
					{/if}

					<button on:click={handleSignOut} class="sign-out-button">
						Sign Out
					</button>
				</div>
			</div>
			
			<!-- Navigation Tabs -->
			<nav class="nav-tabs">
				<button 
					class="nav-tab" 
					class:active={activeTab === 'tasks'}
					on:click={() => activeTab = 'tasks'}
				>
					📋 Tasks ({pendingTasks.length})
				</button>
				<button 
					class="nav-tab" 
					class:active={activeTab === 'documents'}
					on:click={() => activeTab = 'documents'}
				>
					📄 Documents
				</button>
				<button 
					class="nav-tab" 
					class:active={activeTab === 'notifications'}
					on:click={() => activeTab = 'notifications'}
				>
					🔔 Notifications ({unreadNotifications.length})
				</button>
			</nav>
		</header>
		
		<main class="dashboard-content">
			{#if activeTab === 'tasks'}
				<div class="tasks-section">
					<div class="section-header">
						<h2>Your Assigned Tasks</h2>
						<p>Complete your assignments and track progress with your team.</p>
					</div>
					
					{#if pendingTasks.length > 0}
						<div class="tasks-grid">
							{#each pendingTasks as task}
								<TaskCard 
									{task} 
									onMarkComplete={handleMarkComplete}
									onViewDetails={handleViewDetails}
								/>
							{/each}
						</div>
					{:else}
						<div class="empty-state">
							<h3>🎉 All caught up!</h3>
							<p>You have no pending tasks at the moment.</p>
						</div>
					{/if}
					
					<!-- Completed Tasks Summary -->
					{#if tasks.filter(t => t.status === 'completed_pending' || t.status === 'confirmed').length > 0}
						<div class="completed-section">
							<h3>Recent Activity</h3>
							<div class="activity-summary">
								<div class="activity-item">
									<span class="activity-count">
										{tasks.filter(t => t.status === 'completed_pending').length}
									</span>
									<span class="activity-label">Completed (Pending Confirmation)</span>
								</div>
								<div class="activity-item">
									<span class="activity-count">
										{tasks.filter(t => t.status === 'confirmed').length}
									</span>
									<span class="activity-label">Confirmed Complete</span>
								</div>
							</div>
						</div>
					{/if}
				</div>
			{:else if activeTab === 'documents'}
				<div class="documents-section">
					<div class="section-header">
						<h2>Document Library</h2>
						<p>Access documents and resources provided by your team.</p>
					</div>
					<div class="placeholder-content">
						<p>📄 Document library will be implemented next...</p>
					</div>
				</div>
			{:else if activeTab === 'notifications'}
				<div class="notifications-section">
					<div class="section-header">
						<h2>Notifications</h2>
						<p>Stay updated with task assignments and communications.</p>
					</div>
					<div class="placeholder-content">
						<p>🔔 Notifications center will be implemented next...</p>
					</div>
				</div>
			{/if}
		</main>
	{/if}
</div>

<!-- Email Verification Prompt -->
{#if showVerificationPrompt && isUnconfirmed}
	<!-- TODO: Re-enable when EmailVerificationPrompt import is fixed -->
	<div class="verification-prompt">
		<p>Verify your email ({currentUser?.email || ''}) to access advanced task features</p>
		<button on:click={handleVerificationPromptDismiss}>Dismiss</button>
	</div>
{/if}

<style>
	.page {
		min-height: 100vh;
		background: #f8f9fa;
	}
	
	.loading {
		text-align: center;
		padding: 3rem 0;
		min-height: 50vh;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}
	
	.spinner {
		width: 40px;
		height: 40px;
		border: 3px solid #f3f3f3;
		border-top: 3px solid #007bff;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin: 0 auto 1rem;
	}
	
	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}
	
	/* Authentication Section */
	.auth-section {
		text-align: center;
		margin: 2rem auto;
		max-width: 500px;
	}



	.auth-form-container {
		background: white;
		border-radius: 12px;
		padding: 24px;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
		border: 1px solid #e5e7eb;
		margin-top: 16px;
	}

	.verify-email-button {
		background: #f59e0b;
		color: white;
		border: none;
		border-radius: 6px;
		padding: 8px 16px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		margin-right: 12px;
	}

	.verify-email-button:hover {
		background: #d97706;
		transform: translateY(-1px);
	}
	
	.auth-section h1 {
		margin-top: 0;
		color: #212529;
		font-size: 2rem;
		margin-bottom: 1rem;
	}
	
	.auth-section p {
		color: #6c757d;
		margin-bottom: 2rem;
		font-size: 1.1rem;
	}
	
	.loading-auth {
		text-align: center;
		padding: 2rem;
		background: white;
		border-radius: 12px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
	}
	
	.loading-auth p {
		color: #6c757d;
		margin-top: 1rem;
		font-size: 0.9rem;
	}
	
	.debug-section {
		border-top: 1px solid #dee2e6;
		padding-top: 1.5rem;
		margin-top: 1.5rem;
	}
	
	.test-button {
		background: #28a745;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.875rem;
		opacity: 0.7;
	}
	
	.test-button:hover {
		background: #218838;
		opacity: 1;
	}
	
	/* Dashboard Header */
	.dashboard-header {
		background: white;
		border-bottom: 1px solid #dee2e6;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
	}
	
	.header-content {
		max-width: 1200px;
		margin: 0 auto;
		padding: 1.5rem 1rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	
	.user-info h1 {
		margin: 0 0 0.25rem 0;
		color: #212529;
		font-size: 1.75rem;
	}
	
	.user-info p {
		margin: 0;
		color: #6c757d;
		font-size: 1rem;
	}
	
	.header-actions {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	
	.notification-badge {
		background: #007bff;
		color: white;
		padding: 0.5rem 0.75rem;
		border-radius: 16px;
		font-size: 0.875rem;
		font-weight: 600;
	}
	
	.sign-out-button {
		background: #6c757d;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.875rem;
		transition: background-color 0.2s ease;
	}
	
	.sign-out-button:hover {
		background: #545b62;
	}
	
	/* Navigation Tabs */
	.nav-tabs {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 1rem;
		display: flex;
		gap: 0.5rem;
		border-bottom: 1px solid #dee2e6;
	}
	
	.nav-tab {
		background: none;
		border: none;
		padding: 1rem 1.5rem;
		cursor: pointer;
		font-size: 0.95rem;
		font-weight: 500;
		color: #6c757d;
		border-bottom: 3px solid transparent;
		transition: all 0.2s ease;
	}
	
	.nav-tab:hover {
		color: #007bff;
		background: #f8f9fa;
	}
	
	.nav-tab.active {
		color: #007bff;
		border-bottom-color: #007bff;
		background: #f8f9fa;
	}
	
	/* Dashboard Content */
	.dashboard-content {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem 1rem;
	}
	
	.section-header {
		margin-bottom: 2rem;
	}
	
	.section-header h2 {
		margin: 0 0 0.5rem 0;
		color: #212529;
		font-size: 1.5rem;
	}
	
	.section-header p {
		margin: 0;
		color: #6c757d;
		font-size: 1rem;
	}
	
	/* Tasks Section */
	.tasks-grid {
		display: grid;
		gap: 1.5rem;
		grid-template-columns: 1fr;
	}
	
	@media (min-width: 768px) {
		.tasks-grid {
			grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
		}
	}
	
	.empty-state {
		text-align: center;
		padding: 3rem 2rem;
		background: white;
		border-radius: 8px;
		border: 2px dashed #dee2e6;
	}
	
	.empty-state h3 {
		margin: 0 0 0.5rem 0;
		color: #28a745;
		font-size: 1.25rem;
	}
	
	.empty-state p {
		margin: 0;
		color: #6c757d;
	}
	
	/* Activity Summary */
	.completed-section {
		margin-top: 3rem;
		padding: 1.5rem;
		background: white;
		border-radius: 8px;
		border-left: 4px solid #28a745;
	}
	
	.completed-section h3 {
		margin: 0 0 1rem 0;
		color: #212529;
		font-size: 1.125rem;
	}
	
	.activity-summary {
		display: flex;
		gap: 2rem;
		flex-wrap: wrap;
	}
	
	.activity-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	
	.activity-count {
		background: #e9ecef;
		color: #495057;
		padding: 0.25rem 0.75rem;
		border-radius: 16px;
		font-weight: 600;
		font-size: 0.875rem;
	}
	
	.activity-label {
		color: #6c757d;
		font-size: 0.875rem;
	}
	
	/* Placeholder Content */
	.placeholder-content {
		text-align: center;
		padding: 3rem 2rem;
		background: white;
		border-radius: 8px;
		color: #6c757d;
	}
	
	.placeholder-content p {
		margin: 0;
		font-size: 1.1rem;
	}
	
	/* Responsive Design */
	@media (max-width: 768px) {
		.header-content {
			flex-direction: column;
			gap: 1rem;
			text-align: center;
		}
		
		.nav-tabs {
			flex-direction: column;
		}
		
		.nav-tab {
			text-align: left;
			padding: 0.75rem 1rem;
		}
		
		.dashboard-content {
			padding: 1rem;
		}
		
		.activity-summary {
			flex-direction: column;
			gap: 1rem;
		}
	}
</style>