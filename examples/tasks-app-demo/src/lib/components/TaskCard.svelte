<script>
export let task;
export let onMarkComplete = null;
export let onViewDetails = null;

// Get priority color
function getPriorityColor(priority) {
  switch (priority) {
    case 'high':
      return '#dc3545'; // Red
    case 'medium':
      return '#fd7e14'; // Orange
    case 'low':
      return '#6c757d'; // Gray
    default:
      return '#6c757d';
  }
}

// Format date for display
function formatDate(dateString) {
  if (!dateString) return 'No due date';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (error) {
    return 'Invalid date';
  }
}

// Get status color and display
function getStatusInfo(status) {
  switch (status) {
    case 'assigned':
      return { color: '#007bff', text: 'Assigned', bg: '#e7f3ff' };
    case 'in_progress':
      return { color: '#fd7e14', text: 'In Progress', bg: '#fff3e0' };
    case 'completed_pending':
      return { color: '#28a745', text: 'Completed (Pending Confirmation)', bg: '#e8f5e8' };
    case 'confirmed':
      return { color: '#6c757d', text: 'Confirmed Complete', bg: '#f8f9fa' };
    case 'overdue':
      return { color: '#dc3545', text: 'Overdue', bg: '#ffeaea' };
    case 'requires_attention':
      return { color: '#ffc107', text: 'Requires Attention', bg: '#fff8e1' };
    default:
      return { color: '#6c757d', text: 'Unknown', bg: '#f8f9fa' };
  }
}

const statusInfo = getStatusInfo(task.status);
const canMarkComplete = task.status === 'assigned' || task.status === 'in_progress';
const isOverdue =
  task.status === 'overdue' || (task.dueDate < new Date() && task.status !== 'confirmed');
</script>

<div class="task-card" class:overdue={isOverdue}>
	<div class="task-header">
		<h3 class="task-title">{task.title}</h3>
		<div class="task-meta">
			<span class="priority" style="color: {getPriorityColor(task.priority)}">
				● {task.priority.toUpperCase()} PRIORITY
			</span>
		</div>
	</div>
	
	<div class="task-status" style="background: {statusInfo.bg}; color: {statusInfo.color}">
		{statusInfo.text}
	</div>
	
	<div class="task-details">
		<p class="task-description">{task.description.split('\n')[0]}...</p>
		
		<div class="task-info">
			<div class="info-item">
				<strong>Assigned by:</strong> {task.assignedBy}
			</div>
			<div class="info-item">
				<strong>Due:</strong> 
				<span class:overdue-text={isOverdue}>
					{formatDate(task.dueDate)}
				</span>
			</div>
			{#if task.relatedDocuments.length > 0}
				<div class="info-item">
					<strong>Documents:</strong> {task.relatedDocuments.length} attached
				</div>
			{/if}
		</div>
	</div>
	
	<div class="task-actions">
		{#if onViewDetails}
			<button class="btn btn-secondary" on:click={() => onViewDetails(task)}>
				📖 View Details
			</button>
		{/if}
		
		{#if canMarkComplete && onMarkComplete}
			<button class="btn btn-primary" on:click={() => onMarkComplete(task)}>
				✅ Mark Complete
			</button>
		{/if}
	</div>
</div>

<style>
	.task-card {
		background: white;
		border: 1px solid #dee2e6;
		border-radius: 8px;
		padding: 1.5rem;
		margin-bottom: 1rem;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		transition: box-shadow 0.2s ease;
	}
	
	.task-card:hover {
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
	}
	
	.task-card.overdue {
		border-left: 4px solid #dc3545;
	}
	
	.task-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 0.75rem;
	}
	
	.task-title {
		margin: 0;
		color: #212529;
		font-size: 1.125rem;
		font-weight: 600;
		flex: 1;
	}
	
	.task-meta {
		margin-left: 1rem;
	}
	
	.priority {
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.5px;
	}
	
	.task-status {
		display: inline-block;
		padding: 0.25rem 0.75rem;
		border-radius: 16px;
		font-size: 0.875rem;
		font-weight: 500;
		margin-bottom: 1rem;
	}
	
	.task-description {
		color: #6c757d;
		margin: 0 0 1rem 0;
		line-height: 1.5;
	}
	
	.task-info {
		margin-bottom: 1rem;
	}
	
	.info-item {
		margin-bottom: 0.5rem;
		font-size: 0.875rem;
	}
	
	.info-item strong {
		color: #495057;
	}
	
	.overdue-text {
		color: #dc3545;
		font-weight: 600;
	}
	
	.task-actions {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}
	
	.btn {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.875rem;
		font-weight: 500;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		transition: background-color 0.2s ease;
	}
	
	.btn-primary {
		background: #007bff;
		color: white;
	}
	
	.btn-primary:hover {
		background: #0056b3;
	}
	
	.btn-secondary {
		background: #6c757d;
		color: white;
	}
	
	.btn-secondary:hover {
		background: #545b62;
	}
</style>