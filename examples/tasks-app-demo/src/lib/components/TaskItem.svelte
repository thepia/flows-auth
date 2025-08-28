<script>
import { createEventDispatcher } from 'svelte';

export let task;

const dispatch = createEventDispatcher();

let isEditing = false;
let editTitle = '';
let editDescription = '';

function startEdit() {
  isEditing = true;
  editTitle = task.title;
  editDescription = task.description || '';
}

function cancelEdit() {
  isEditing = false;
  editTitle = '';
  editDescription = '';
}

function saveEdit() {
  const title = editTitle.trim();
  if (!title) return;

  dispatch('update', {
    uid: task.uid,
    updates: {
      title: title,
      description: editDescription.trim(),
    },
  });

  isEditing = false;
}

function handleToggle() {
  dispatch('toggle');
}

function handleDelete() {
  if (confirm('Are you sure you want to delete this task?')) {
    dispatch('delete');
  }
}

function handleKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    saveEdit();
  } else if (event.key === 'Escape') {
    cancelEdit();
  }
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}
</script>

<div class="task-item" class:completed={task.completed} class:editing={isEditing}>
	<div class="task-content">
		<div class="task-main">
			<label class="task-checkbox">
				<input 
					type="checkbox" 
					checked={task.completed}
					on:change={handleToggle}
				/>
				<span class="checkmark"></span>
			</label>
			
			{#if isEditing}
				<div class="task-edit">
					<input 
						type="text"
						bind:value={editTitle}
						on:keydown={handleKeydown}
						placeholder="Task title"
						class="edit-title"
					/>
					<textarea 
						bind:value={editDescription}
						on:keydown={handleKeydown}
						placeholder="Description (optional)"
						class="edit-description"
						rows="2"
					></textarea>
				</div>
			{:else}
				<div 
					class="task-text" 
					on:dblclick={startEdit}
					on:keydown={(e) => e.key === 'Enter' && startEdit()}
					role="button"
					tabindex="0"
				>
					<h4 class="task-title">{task.title}</h4>
					{#if task.description}
						<p class="task-description">{task.description}</p>
					{/if}
				</div>
			{/if}
		</div>
		
		<div class="task-meta">
			<div class="task-info">
				<span class="task-date">{formatDate(task.updatedAt)}</span>
				<span class="sync-status" class:pending={task.syncStatus === 'pending'} class:failed={task.syncStatus === 'failed'}>
					{#if task.syncStatus === 'pending'}
						⏳
					{:else if task.syncStatus === 'failed'}
						❌
					{:else}
						✅
					{/if}
				</span>
			</div>
			
			<div class="task-actions">
				{#if isEditing}
					<button class="action-btn save" on:click={saveEdit} title="Save">
						💾
					</button>
					<button class="action-btn cancel" on:click={cancelEdit} title="Cancel">
						❌
					</button>
				{:else}
					<button class="action-btn edit" on:click={startEdit} title="Edit">
						✏️
					</button>
					<button class="action-btn delete" on:click={handleDelete} title="Delete">
						🗑️
					</button>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.task-item {
		background: white;
		border: 1px solid #e9ecef;
		border-radius: 8px;
		padding: 1rem;
		transition: all 0.2s;
		position: relative;
	}
	
	.task-item:hover {
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		border-color: #dee2e6;
	}
	
	.task-item.completed {
		opacity: 0.7;
		background: #f8f9fa;
	}
	
	.task-item.editing {
		border-color: #007bff;
		box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.1);
	}
	
	.task-content {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	
	.task-main {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
	}
	
	.task-checkbox {
		position: relative;
		cursor: pointer;
		display: flex;
		align-items: center;
		flex-shrink: 0;
		margin-top: 0.125rem;
	}
	
	.task-checkbox input {
		opacity: 0;
		position: absolute;
		width: 0;
		height: 0;
	}
	
	.checkmark {
		width: 20px;
		height: 20px;
		border: 2px solid #dee2e6;
		border-radius: 4px;
		background: white;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	
	.task-checkbox:hover .checkmark {
		border-color: #007bff;
	}
	
	.task-checkbox input:checked + .checkmark {
		background: #007bff;
		border-color: #007bff;
	}
	
	.task-checkbox input:checked + .checkmark::after {
		content: '✓';
		color: white;
		font-size: 14px;
		font-weight: bold;
	}
	
	.task-text {
		flex: 1;
		cursor: pointer;
		min-width: 0;
	}
	
	.task-title {
		margin: 0 0 0.25rem 0;
		font-size: 1rem;
		font-weight: 500;
		color: #333;
		line-height: 1.3;
		word-wrap: break-word;
	}
	
	.completed .task-title {
		text-decoration: line-through;
		color: #6c757d;
	}
	
	.task-description {
		margin: 0;
		font-size: 0.9rem;
		color: #6c757d;
		line-height: 1.4;
		white-space: pre-wrap;
		word-wrap: break-word;
	}
	
	.completed .task-description {
		text-decoration: line-through;
	}
	
	.task-edit {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	
	.edit-title {
		font-size: 1rem;
		font-weight: 500;
		border: 1px solid #007bff;
		padding: 0.5rem;
		border-radius: 4px;
	}
	
	.edit-description {
		font-size: 0.9rem;
		border: 1px solid #007bff;
		padding: 0.5rem;
		border-radius: 4px;
		resize: vertical;
		min-height: 60px;
	}
	
	.task-meta {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px solid #f1f3f4;
	}
	
	.task-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	
	.task-date {
		font-size: 0.8rem;
		color: #6c757d;
	}
	
	.sync-status {
		font-size: 0.8rem;
		opacity: 0.7;
	}
	
	.sync-status.pending {
		color: #ffc107;
	}
	
	.sync-status.failed {
		color: #dc3545;
	}
	
	.task-actions {
		display: flex;
		gap: 0.25rem;
		opacity: 0;
		transition: opacity 0.2s;
	}
	
	.task-item:hover .task-actions,
	.task-item.editing .task-actions {
		opacity: 1;
	}
	
	.action-btn {
		padding: 0.25rem 0.5rem;
		background: none;
		border: 1px solid transparent;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.8rem;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 30px;
		height: 30px;
	}
	
	.action-btn:hover {
		background: #f8f9fa;
		border-color: #dee2e6;
	}
	
	.action-btn.save:hover {
		background: #d4edda;
		border-color: #c3e6cb;
	}
	
	.action-btn.delete:hover {
		background: #f8d7da;
		border-color: #f5c6cb;
	}
	
	@media (max-width: 768px) {
		.task-item {
			padding: 0.75rem;
		}
		
		.task-main {
			gap: 0.5rem;
		}
		
		.task-meta {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}
		
		.task-actions {
			opacity: 1;
		}
		
		.action-btn {
			min-width: 36px;
			height: 36px;
		}
	}
</style>