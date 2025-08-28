<script>
import { onMount } from 'svelte';
import { requestSync, syncStatus } from '../stores/tasks.js';

let currentStatus = {};
let showDetails = false;

onMount(() => {
  // Subscribe to sync status updates
  syncStatus.subscribe((value) => {
    currentStatus = value;
  });
});

async function handleManualSync() {
  try {
    await requestSync();
  } catch (error) {
    console.error('Manual sync failed:', error);
  }
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

function getStatusColor() {
  if (!currentStatus.isOnline) return 'offline';
  if (currentStatus.syncing) return 'syncing';
  if (currentStatus.pendingCount > 0) return 'pending';
  return 'synced';
}

function getStatusText() {
  if (!currentStatus.isOnline) return 'Offline';
  if (currentStatus.syncing) return 'Syncing...';
  if (currentStatus.pendingCount > 0) return `${currentStatus.pendingCount} pending`;
  return 'All synced';
}

function getStatusIcon() {
  if (!currentStatus.isOnline) return '📱';
  if (currentStatus.syncing) return '🔄';
  if (currentStatus.pendingCount > 0) return '⏳';
  return '✅';
}
</script>

<div class="sync-status">
	<div 
		class="status-main" 
		class:clickable={!currentStatus.syncing} 
		on:click={() => showDetails = !showDetails}
		on:keydown={(e) => e.key === 'Enter' && (showDetails = !showDetails)}
		role="button"
		tabindex="0"
	>
		<div class="status-indicator {getStatusColor()}">
			<span class="status-icon" class:spinning={currentStatus.syncing}>
				{getStatusIcon()}
			</span>
			<span class="status-text">{getStatusText()}</span>
		</div>
		
		<div class="status-actions">
			{#if currentStatus.isOnline && !currentStatus.syncing}
				<button 
					class="sync-btn"
					on:click|stopPropagation={handleManualSync}
					title="Sync now"
				>
					🔄
				</button>
			{/if}
			
			<button 
				class="details-btn"
				on:click|stopPropagation={() => showDetails = !showDetails}
				title={showDetails ? 'Hide details' : 'Show details'}
			>
				{showDetails ? '▼' : '▶'}
			</button>
		</div>
	</div>
	
	{#if showDetails}
		<div class="status-details">
			<div class="detail-row">
				<span class="detail-label">Connection:</span>
				<span class="detail-value" class:online={currentStatus.isOnline} class:offline={!currentStatus.isOnline}>
					{currentStatus.isOnline ? 'Online' : 'Offline'}
				</span>
			</div>
			
			<div class="detail-row">
				<span class="detail-label">Pending tasks:</span>
				<span class="detail-value">{currentStatus.pendingCount || 0}</span>
			</div>
			
			<div class="detail-row">
				<span class="detail-label">Last sync:</span>
				<span class="detail-value">{formatLastSync(currentStatus.lastSync)}</span>
			</div>
			
			{#if currentStatus.syncing}
				<div class="detail-row">
					<span class="detail-label">Status:</span>
					<span class="detail-value syncing">
						<div class="loading-spinner tiny"></div>
						Synchronizing...
					</span>
				</div>
			{/if}
			
			<div class="sync-info">
				<p class="info-text">
					Tasks are automatically synced when online. 
					All data is stored locally and only metadata is uploaded to preserve privacy.
				</p>
			</div>
		</div>
	{/if}
</div>

<style>
	.sync-status {
		background: white;
		border: 1px solid #e9ecef;
		border-radius: 8px;
		overflow: hidden;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}
	
	.status-main {
		padding: 1rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		transition: background-color 0.2s;
	}
	
	.status-main.clickable {
		cursor: pointer;
	}
	
	.status-main.clickable:hover {
		background: #f8f9fa;
	}
	
	.status-indicator {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.9rem;
		font-weight: 500;
	}
	
	.status-indicator.offline {
		color: #6c757d;
	}
	
	.status-indicator.syncing {
		color: #007bff;
	}
	
	.status-indicator.pending {
		color: #ffc107;
	}
	
	.status-indicator.synced {
		color: #28a745;
	}
	
	.status-icon {
		font-size: 1.1rem;
		transition: transform 0.2s;
	}
	
	.status-icon.spinning {
		animation: spin 1s linear infinite;
	}
	
	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}
	
	.status-actions {
		display: flex;
		gap: 0.5rem;
	}
	
	.sync-btn, .details-btn {
		width: 32px;
		height: 32px;
		border: 1px solid #dee2e6;
		background: white;
		border-radius: 6px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.9rem;
		transition: all 0.2s;
	}
	
	.sync-btn:hover, .details-btn:hover {
		background: #f8f9fa;
		border-color: #adb5bd;
	}
	
	.sync-btn:active {
		transform: scale(0.95);
	}
	
	.status-details {
		padding: 1rem;
		background: #f8f9fa;
		border-top: 1px solid #e9ecef;
	}
	
	.detail-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
		font-size: 0.85rem;
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
		font-weight: 500;
	}
	
	.detail-value.online {
		color: #28a745;
	}
	
	.detail-value.offline {
		color: #6c757d;
	}
	
	.detail-value.syncing {
		color: #007bff;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	
	.loading-spinner.tiny {
		width: 12px;
		height: 12px;
		border: 1px solid rgba(0, 123, 255, 0.3);
		border-top: 1px solid #007bff;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}
	
	.sync-info {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid #dee2e6;
	}
	
	.info-text {
		margin: 0;
		font-size: 0.8rem;
		color: #6c757d;
		line-height: 1.4;
	}
	
	@media (max-width: 768px) {
		.status-main {
			padding: 0.75rem;
		}
		
		.status-details {
			padding: 0.75rem;
		}
		
		.detail-row {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.25rem;
			margin-bottom: 0.5rem;
		}
		
		.detail-value.syncing {
			margin-top: 0.25rem;
		}
	}
</style>