<script lang="ts">
	import { onMount } from 'svelte';
	import { getAuthStoreFromContext } from '../utils/auth-context';
	import type { SvelteAuthStore } from '../types/svelte';

	// Browser detection without SvelteKit dependency
	const browser = typeof window !== 'undefined';

	// Props
	export let store: SvelteAuthStore | null = null; // Auth store prop (preferred)

	// Auth store - use prop or fallback to context
	let authStore = null;
	try {
		authStore = store || getAuthStoreFromContext();
	} catch (error) {
		console.warn('ErrorReportingStatus: No auth store available in context');
	}

	let queueSize = 0;
	let config = null;
	let isReporting = false;
	let showDetails = false;

	onMount(() => {
		if (!browser) return;

		try {
			// Get config from auth store if available
			if (authStore) {
				const authConfig = authStore.getConfig?.();
				const apiClient = authStore.api;

				// Determine server type from API client
				let serverType = 'Unknown';
				let apiUrl = authConfig?.apiBaseUrl || 'Not configured';

				if (apiClient) {
					// API client exists - it will detect local vs production
					if (apiUrl.includes('dev.thepia.com') || apiUrl.includes('localhost')) {
						serverType = 'Local Development Server';
					} else if (apiUrl.includes('api.thepia.com')) {
						serverType = 'Production API (auto-detects local)';
					} else {
						serverType = 'Custom API Server';
					}
				} else {
					serverType = 'No API Client';
				}

				config = {
					enabled: authConfig?.errorReporting?.enabled ?? true,
					serverType,
					environment: authConfig?.errorReporting?.debug ? 'development' : 'production',
					endpoint: authConfig?.errorReporting?.endpoint ||
					          (authConfig?.apiBaseUrl ? `${authConfig.apiBaseUrl}/dev/error-reports` : null),
					debug: authConfig?.errorReporting?.debug ?? true,
					apiBaseUrl: apiUrl
				};
			} else {
				// Fallback config if no auth store
				config = {
					enabled: true,
					serverType: 'Standalone (No Auth Store)',
					environment: 'development',
					endpoint: null,
					debug: true
				};
			}

			// Check status periodically
			updateQueueStatus();
			const interval = setInterval(updateQueueStatus, 5000);

			return () => clearInterval(interval);
		} catch (error) {
			console.error('Failed to initialize error reporting status:', error);

			// Set fallback config so component shows something
			config = {
				enabled: false,
				serverType: 'Error loading config',
				environment: 'unknown',
				endpoint: null
			};
		}
	});

	function updateQueueStatus() {
		if (!browser) return;

		try {
			import('../utils/telemetry').then(({ getTelemetryQueueSize }) => {
				queueSize = getTelemetryQueueSize();
			});
		} catch (error) {
			// Silently fail - telemetry may not be initialized yet
		}
	}
	
	async function flushReports() {
		if (!browser || isReporting) return;

		isReporting = true;
		try {
			const { flushTelemetry } = await import('../utils/telemetry');
			flushTelemetry();
			await updateQueueStatus();
		} catch (error) {
			console.error('Failed to flush telemetry:', error);
		} finally {
			isReporting = false;
		}
	}

	async function testAuthError() {
		try {
			const { reportAuthState } = await import('../utils/telemetry');
			reportAuthState({
				event: 'login-attempt',
				email: 'demo@test.com',
				authMethod: 'email',
				context: { test: true, demoMode: true }
			});
			await updateQueueStatus();
		} catch (error) {
			console.error('Failed to send test auth error:', error);
		}
	}

	async function testWebAuthnError() {
		try {
			const { reportWebAuthnError } = await import('../utils/telemetry');
			const mockError = {
				name: 'NotAllowedError',
				message: 'User cancelled the operation',
				code: 'NotAllowedError'
			};
			reportWebAuthnError('authentication', mockError, {
				test: true,
				demoMode: true
			});
			await updateQueueStatus();
		} catch (error) {
			console.error('Failed to send test WebAuthn error:', error);
		}
	}

	async function testApiError() {
		try {
			const { reportApiError } = await import('../utils/telemetry');
			reportApiError(
				'https://api.thepia.com/auth/test-endpoint',
				'POST',
				429,
				'Rate limit exceeded',
				{ test: true, demoMode: true }
			);
			await updateQueueStatus();
		} catch (error) {
			console.error('Failed to send test API error:', error);
		}
	}
	
	function getStatusColor() {
		if (!config) return 'disabled';
		if (!config.enabled) return 'disabled';
		if (queueSize > 0) return 'pending';
		return 'active';
	}
	
	$: statusText = (() => {
		if (!config) return 'Loading...';
		if (!config.enabled) return 'Disabled';
		if (queueSize > 0) return `${queueSize} pending`;
		return 'Active';
	})();
</script>

<div class="error-reporting-status">
	<div 
		class="status-indicator {getStatusColor()}"
		on:click={() => showDetails = !showDetails}
		on:keydown={(e) => e.key === 'Enter' && (showDetails = !showDetails)}
		role="button"
		tabindex="0"
		title="Error reporting status - Click to expand"
	>
		<span class="status-icon">📊</span>
		<span class="status-text">{statusText}</span>
	</div>
	
	{#if showDetails && config}
		<div class="status-details">
			<div class="detail-row">
				<span class="detail-label">Server:</span>
				<span class="detail-value">{config.serverType}</span>
			</div>

			{#if config.apiBaseUrl}
				<div class="detail-row">
					<span class="detail-label">API URL:</span>
					<span class="detail-value endpoint">{config.apiBaseUrl}</span>
				</div>
			{/if}

			<div class="detail-row">
				<span class="detail-label">Error Endpoint:</span>
				<span class="detail-value endpoint">{config.endpoint || 'None'}</span>
			</div>

			<div class="detail-row">
				<span class="detail-label">Queue size:</span>
				<span class="detail-value">{queueSize}</span>
			</div>

			<div class="detail-row">
				<span class="detail-label">Debug mode:</span>
				<span class="detail-value">{config.debug ? 'On' : 'Off'}</span>
			</div>

			<div class="section-divider">Test Error Reports</div>

			<div class="test-actions">
				<button on:click={testAuthError} class="test-btn auth">
					Auth Event
				</button>
				<button on:click={testWebAuthnError} class="test-btn webauthn">
					WebAuthn Error
				</button>
				<button on:click={testApiError} class="test-btn api">
					API Error
				</button>
			</div>

			{#if queueSize > 0}
				<div class="actions">
					<button
						on:click={flushReports}
						disabled={isReporting}
						class="flush-btn"
					>
						{isReporting ? 'Flushing...' : `Flush ${queueSize} Reports`}
					</button>
				</div>
			{/if}
		</div>
	{/if}
</div>

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
		max-width: 300px;
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
		max-height: 400px;
		overflow-y: auto;
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

	.test-actions {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 0.25rem;
		margin-bottom: 0.75rem;
	}

	.test-btn {
		padding: 0.25rem 0.5rem;
		border: 1px solid #dee2e6;
		background: white;
		border-radius: 4px;
		font-size: 0.7rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.test-btn:hover {
		background: #f8f9fa;
	}

	.test-btn.auth {
		border-color: #28a745;
		color: #28a745;
	}

	.test-btn.webauthn {
		border-color: #ffc107;
		color: #856404;
	}

	.test-btn.api {
		border-color: #dc3545;
		color: #dc3545;
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
			max-width: 250px;
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

		.test-actions {
			grid-template-columns: 1fr;
		}
	}
</style>