<script>
import { onMount } from 'svelte';
import {
  addTask,
  deleteTask,
  initTasks,
  syncStatus,
  tasks,
  toggleTask,
  updateTask,
} from '../stores/tasks.js';

let taskList = [];
let currentSyncStatus = {};
let showCompleted = false;
let filter = 'all'; // 'all', 'active', 'completed'

// Reactive filtering
$: filteredTasks = taskList.filter((task) => {
  if (filter === 'active') return !task.completed;
  if (filter === 'completed') return task.completed;
  return true;
});

$: activeTasks = taskList.filter((task) => !task.completed);
$: completedTasks = taskList.filter((task) => task.completed);

onMount(async () => {
  await initTasks();

  // Subscribe to stores
  tasks.subscribe((value) => {
    taskList = value;
  });

  syncStatus.subscribe((value) => {
    currentSyncStatus = value;
  });
});

async function handleAddTask(event) {
  const { title, description } = event.detail;
  try {
    await addTask(title, description);
  } catch (error) {
    console.error('Failed to add task:', error);
    // Error is already reported in tasks store
    // TODO: Show error to user via toast/notification
  }
}

async function handleToggleTask(uid) {
  try {
    await toggleTask(uid);
  } catch (error) {
    console.error('Failed to toggle task:', error);
  }
}

async function handleUpdateTask(event) {
  const { uid, updates } = event.detail;
  try {
    await updateTask(uid, updates);
  } catch (error) {
    console.error('Failed to update task:', error);
  }
}

async function handleDeleteTask(uid) {
  try {
    await deleteTask(uid);
  } catch (error) {
    console.error('Failed to delete task:', error);
  }
}
</script>

<div class="tasks-list">
	<div class="tasks-header">
		<h2>My Tasks</h2>
		<div class="task-stats">
			<span class="stat">
				<strong>{activeTasks.length}</strong> active
			</span>
			<span class="stat">
				<strong>{completedTasks.length}</strong> completed
			</span>
		</div>
	</div>

	<AddTaskForm on:addTask={handleAddTask} />

	<div class="tasks-filters">
		<button 
			class="filter-btn" 
			class:active={filter === 'all'}
			on:click={() => filter = 'all'}
		>
			All ({taskList.length})
		</button>
		<button 
			class="filter-btn" 
			class:active={filter === 'active'}
			on:click={() => filter = 'active'}
		>
			Active ({activeTasks.length})
		</button>
		<button 
			class="filter-btn" 
			class:active={filter === 'completed'}
			on:click={() => filter = 'completed'}
		>
			Completed ({completedTasks.length})
		</button>
	</div>

	<div class="tasks-container">
		{#if filteredTasks.length === 0}
			<div class="empty-state">
				{#if filter === 'all'}
					<h3>No tasks yet</h3>
					<p>Add your first task using the form above.</p>
				{:else if filter === 'active'}
					<h3>No active tasks</h3>
					<p>Great job! All tasks are completed.</p>
				{:else}
					<h3>No completed tasks</h3>
					<p>Tasks you complete will appear here.</p>
				{/if}
			</div>
		{:else}
			<div class="tasks-grid">
				{#each filteredTasks as task (task.uid)}
					<TaskItem 
						{task}
						on:toggle={() => handleToggleTask(task.uid)}
						on:update={handleUpdateTask}
						on:delete={() => handleDeleteTask(task.uid)}
					/>
				{/each}
			</div>
		{/if}
	</div>

	{#if currentSyncStatus.pendingCount > 0}
		<div class="sync-notice">
			<div class="sync-icon">
				{#if currentSyncStatus.syncing}
					<div class="loading-spinner small"></div>
				{:else}
					📤
				{/if}
			</div>
			<span>
				{currentSyncStatus.pendingCount} task{currentSyncStatus.pendingCount !== 1 ? 's' : ''} 
				{currentSyncStatus.syncing ? 'syncing...' : 'pending sync'}
			</span>
		</div>
	{/if}
</div>

<style>
	.tasks-list {
		max-width: 800px;
		margin: 0 auto;
	}

	.tasks-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
		padding-bottom: 1rem;
		border-bottom: 2px solid #e9ecef;
	}

	.tasks-header h2 {
		margin: 0;
		color: #333;
	}

	.task-stats {
		display: flex;
		gap: 1rem;
	}

	.stat {
		color: #6c757d;
		font-size: 0.9rem;
	}

	.tasks-filters {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
	}

	.filter-btn {
		padding: 0.5rem 1rem;
		background: #f8f9fa;
		color: #6c757d;
		border: 1px solid #dee2e6;
		border-radius: 20px;
		font-size: 0.9rem;
		transition: all 0.2s;
	}

	.filter-btn:hover {
		background: #e9ecef;
		border-color: #adb5bd;
	}

	.filter-btn.active {
		background: #007bff;
		color: white;
		border-color: #007bff;
	}

	.tasks-container {
		min-height: 200px;
	}

	.empty-state {
		text-align: center;
		padding: 3rem 1rem;
		color: #6c757d;
	}

	.empty-state h3 {
		margin-bottom: 0.5rem;
		color: #495057;
	}

	.tasks-grid {
		display: grid;
		gap: 1rem;
	}

	.sync-notice {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		background: #fff3cd;
		border: 1px solid #ffeaa7;
		border-radius: 6px;
		margin-top: 1.5rem;
		font-size: 0.9rem;
		color: #856404;
	}

	.sync-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
	}

	.loading-spinner.small {
		width: 16px;
		height: 16px;
		border: 2px solid #ffeaa7;
		border-top: 2px solid #856404;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	@media (max-width: 768px) {
		.tasks-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}

		.task-stats {
			margin-top: 0.5rem;
		}

		.tasks-filters {
			flex-wrap: wrap;
		}

		.filter-btn {
			font-size: 0.8rem;
			padding: 0.4rem 0.8rem;
		}
	}
</style>