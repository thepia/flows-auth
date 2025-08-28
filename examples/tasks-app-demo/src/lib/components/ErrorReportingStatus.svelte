<script>
import { browser } from '$app/environment';
import { onMount } from 'svelte';

let queueSize = 0;
let config = null;
let isReporting = false;
let showDetails = false;

// Service Worker state
let serviceWorkerManager = null;
let swState = {
  supported: false,
  registered: false,
  active: false,
  syncStatus: null,
};

// Auth store debugging
let authStore = null;
let authState = null;
let authStateMachine = null;

onMount(async () => {
  if (!browser) return;

  try {
    const { getErrorReportingConfig } = await import('../config/errorReporting.js');
    config = await getErrorReportingConfig();

    // Initialize service worker manager
    try {
      const { getServiceWorkerManager } = await import('@thepia/flows-auth');
      serviceWorkerManager = getServiceWorkerManager();
      await updateServiceWorkerStatus();
    } catch (swError) {
      console.warn('Service worker manager not available:', swError);
    }

    // Initialize auth store debugging
    try {
      const { createAuthStore } = await import('@thepia/flows-auth');
      authStore = createAuthStore({
        apiBaseUrl: 'https://dev.thepia.com:8443',
        clientId: 'flows-auth-demo',
        domain: 'thepia.net',
        enablePasskeys: true,
        enableMagicLinks: true,
        enablePasswordLogin: true,
        enableSocialLogin: false,
      });

      // Subscribe to auth state changes for debugging
      authStore.subscribe((state) => {
        authState = state;
        console.log('🔍 Auth State Debug:', state);
      });

      // Get auth state machine for debugging
      authStateMachine = authStore.stateMachine || null;
    } catch (authError) {
      console.warn('Auth store debugging not available:', authError);
    }

    // Check status periodically
    updateQueueStatus();
    const interval = setInterval(() => {
      updateQueueStatus();
      updateServiceWorkerStatus();
    }, 5000);

    return () => clearInterval(interval);
  } catch (error) {
    console.error('Failed to initialize error reporting status:', error);
  }
});

async function updateQueueStatus() {
  if (!browser) return;

  try {
    const { getErrorReportQueueSize } = await import('@thepia/flows-auth');
    queueSize = await getErrorReportQueueSize();
  } catch (error) {
    // Silently fail - error reporter may not be initialized yet
  }
}

async function updateServiceWorkerStatus() {
  if (!browser || !serviceWorkerManager) return;

  try {
    // Check if service workers are supported
    swState.supported = 'serviceWorker' in navigator;

    // Check if service worker is registered and active
    swState.registered = !!navigator.serviceWorker.controller || serviceWorkerManager.isActive();
    swState.active = serviceWorkerManager.isActive();

    // Get sync status from service worker
    swState.syncStatus = await serviceWorkerManager.getSyncStatus();
  } catch (error) {
    console.warn('Failed to update service worker status:', error);
  }
}

async function flushReports() {
  if (!browser || isReporting) return;

  isReporting = true;
  try {
    const { flushTasksErrorReports } = await import('../config/errorReporting.js');
    await flushTasksErrorReports();
    await updateQueueStatus();
  } catch (error) {
    console.error('Failed to flush error reports:', error);
  } finally {
    isReporting = false;
  }
}

function getStatusColor() {
  if (!config?.enabled) return 'disabled';
  if (queueSize > 0) return 'pending';
  return 'active';
}

function getStatusText() {
  if (!config?.enabled) return 'Disabled';
  if (queueSize > 0) return `${queueSize} pending`;
  return 'Active';
}

function formatLastSync(timestamp) {
  if (!timestamp) return 'Never';

  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleString();
}
</script>

{#if config}
	<div class="error-reporting-status">
		<div 
			class="status-indicator {getStatusColor()}"
			on:click={() => showDetails = !showDetails}
			on:keydown={(e) => e.key === 'Enter' && (showDetails = !showDetails)}
			role="button"
			tabindex="0"
			title="Error reporting status"
		>
			<span class="status-icon">📊</span>
			<span class="status-text">{getStatusText()}</span>
		</div>
		
		{#if showDetails}
			<div class="status-details">
				<div class="detail-row">
					<span class="detail-label">Server:</span>
					<span class="detail-value">{config.serverType}</span>
				</div>
				
				<div class="detail-row">
					<span class="detail-label">Endpoint:</span>
					<span class="detail-value endpoint">{config.endpoint}</span>
				</div>
				
				{#if config.fallbackToProduction}
					<div class="detail-row fallback-notice">
						<span class="detail-label">Notice:</span>
						<span class="detail-value">Local API unavailable, using production</span>
					</div>
				{/if}
				
				<div class="detail-row">
					<span class="detail-label">Queue size:</span>
					<span class="detail-value">{queueSize}</span>
				</div>
				
				<div class="detail-row">
					<span class="detail-label">Debug mode:</span>
					<span class="detail-value">{config.debug ? 'On' : 'Off'}</span>
				</div>

				<!-- Service Worker Status Section -->
				<div class="section-divider">Service Worker</div>

				<div class="detail-row">
					<span class="detail-label">Supported:</span>
					<span class="detail-value" class:success={swState.supported} class:error={!swState.supported}>
						{swState.supported ? 'Yes' : 'No'}
					</span>
				</div>

				<div class="detail-row">
					<span class="detail-label">Registered:</span>
					<span class="detail-value" class:success={swState.registered} class:error={!swState.registered}>
						{swState.registered ? 'Yes' : 'No'}
					</span>
				</div>

				<div class="detail-row">
					<span class="detail-label">Active:</span>
					<span class="detail-value" class:success={swState.active} class:error={!swState.active}>
						{swState.active ? 'Yes' : 'No'}
					</span>
				</div>

				{#if swState.syncStatus}
					<div class="detail-row">
						<span class="detail-label">Pending uploads:</span>
						<span class="detail-value">{swState.syncStatus.pendingUploads}</span>
					</div>

					<div class="detail-row">
						<span class="detail-label">Online:</span>
						<span class="detail-value" class:success={swState.syncStatus.isOnline} class:error={!swState.syncStatus.isOnline}>
							{swState.syncStatus.isOnline ? 'Yes' : 'No'}
						</span>
					</div>

					<div class="detail-row">
						<span class="detail-label">Last sync:</span>
						<span class="detail-value">{formatLastSync(swState.syncStatus.lastSync)}</span>
					</div>
				{:else if swState.supported}
					<div class="detail-row">
						<span class="detail-label">Sync status:</span>
						<span class="detail-value error">Unavailable</span>
					</div>
				{/if}

				<!-- Auth Store Debug Section -->
				<div class="section-divider">Auth Store Debug</div>

				{#if authState}
					<div class="detail-row">
						<span class="detail-label">Auth State:</span>
						<span class="detail-value auth-state" class:success={authState.user} class:warning={authState.state === 'checking'} class:error={authState.error}>
							{authState.state}
						</span>
					</div>

					<div class="detail-row">
						<span class="detail-label">User:</span>
						<span class="detail-value" class:success={authState.user} class:error={!authState.user}>
							{authState.user ? authState.user.email || 'Authenticated' : 'None'}
						</span>
					</div>

					<div class="detail-row">
						<span class="detail-label">Loading:</span>
						<span class="detail-value" class:warning={authState.isLoading}>
							{authState.isLoading ? 'Yes' : 'No'}
						</span>
					</div>

					{#if authState.error}
						<div class="detail-row">
							<span class="detail-label">Error:</span>
							<span class="detail-value error">{authState.error.message || authState.error}</span>
						</div>
					{/if}

					{#if authState.user}
						<div class="detail-row">
							<span class="detail-label">Email Verified:</span>
							<span class="detail-value" class:success={authState.user.emailVerified} class:warning={!authState.user.emailVerified}>
								{authState.user.emailVerified ? 'Yes' : 'No'}
							</span>
						</div>
					{/if}

					{#if authStateMachine}
						<div class="detail-row">
							<span class="detail-label">State Machine:</span>
							<span class="detail-value">{authStateMachine.state || 'Unknown'}</span>
						</div>
					{/if}
				{:else}
					<div class="detail-row">
						<span class="detail-label">Auth Store:</span>
						<span class="detail-value error">Not initialized</span>
					</div>
				{/if}

				{#if queueSize > 0}
					<div class="actions">
						<button
							on:click={flushReports}
							disabled={isReporting}
							class="flush-btn"
						>
							{isReporting ? 'Flushing...' : 'Flush Reports'}
						</button>
					</div>
				{/if}
			</div>
		{/if}
	</div>
{/if}

<style>
	.error-reporting-status {
		position: fixed;
		bottom: 1rem;
		right: 1rem;
		background: white;
		border: 1px solid #e9ecef;
		border-radius: 8px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		font-size: 0.8rem;
		z-index: 1000;
		min-width: 120px;
	}
	
	.status-indicator {
		padding: 0.5rem 0.75rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		transition: background-color 0.2s;
	}
	
	.status-indicator:hover {
		background: #f8f9fa;
	}
	
	.status-indicator.disabled {
		color: #6c757d;
		opacity: 0.7;
	}
	
	.status-indicator.pending {
		color: #ffc107;
	}
	
	.status-indicator.active {
		color: #28a745;
	}
	
	.status-icon {
		font-size: 0.9rem;
	}
	
	.status-text {
		font-weight: 500;
	}
	
	.status-details {
		padding: 0.75rem;
		border-top: 1px solid #f1f3f4;
		background: #f8f9fa;
	}
	
	.detail-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}
	
	.detail-row:last-child {
		margin-bottom: 0;
	}
	
	.detail-label {
		color: #6c757d;
		font-weight: 500;
	}
	
	.detail-value {
		color: #333;
		text-align: right;
		max-width: 60%;
		word-break: break-all;
	}
	
	.detail-value.endpoint {
		font-size: 0.7rem;
		font-family: monospace;
	}

	.detail-value.success {
		color: #28a745;
		font-weight: 500;
	}

	.detail-value.error {
		color: #dc3545;
		font-weight: 500;
	}

	.detail-value.warning {
		color: #ffc107;
		font-weight: 500;
	}

	.detail-value.auth-state {
		font-family: monospace;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.section-divider {
		font-weight: 600;
		color: #495057;
		margin: 0.75rem 0 0.5rem 0;
		padding-bottom: 0.25rem;
		border-bottom: 1px solid #dee2e6;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.detail-row.fallback-notice {
		background: #fff3cd;
		padding: 0.5rem;
		border-radius: 4px;
		margin: 0.5rem 0;
	}

	.fallback-notice .detail-value {
		color: #856404;
		font-weight: 500;
	}
	
	.actions {
		margin-top: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px solid #dee2e6;
	}
	
	.flush-btn {
		width: 100%;
		padding: 0.5rem;
		background: #007bff;
		color: white;
		border: none;
		border-radius: 4px;
		font-size: 0.8rem;
		cursor: pointer;
		transition: background-color 0.2s;
	}
	
	.flush-btn:hover:not(:disabled) {
		background: #0056b3;
	}
	
	.flush-btn:disabled {
		background: #6c757d;
		cursor: not-allowed;
	}
	
	@media (max-width: 768px) {
		.error-reporting-status {
			bottom: 0.5rem;
			right: 0.5rem;
			min-width: 100px;
		}
		
		.status-indicator {
			padding: 0.4rem 0.6rem;
		}
		
		.status-details {
			padding: 0.5rem;
		}
		
		.detail-value {
			font-size: 0.75rem;
		}
	}
	
	/* Hide in production unless queue has items */
	:global(body[data-env="production"]) .error-reporting-status {
		display: none;
	}
	
	:global(body[data-env="production"]) .error-reporting-status.has-queue {
		display: block;
	}
</style>