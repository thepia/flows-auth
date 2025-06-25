<script>
	import { createEventDispatcher } from 'svelte';
	
	const dispatch = createEventDispatcher();
	
	let title = '';
	let description = '';
	let isExpanded = false;
	let isSubmitting = false;
	
	function expandForm() {
		isExpanded = true;
	}
	
	function collapseForm() {
		if (!title.trim() && !description.trim()) {
			isExpanded = false;
		}
	}
	
	async function handleSubmit() {
		const taskTitle = title.trim();
		if (!taskTitle) return;
		
		isSubmitting = true;
		
		try {
			dispatch('addTask', {
				title: taskTitle,
				description: description.trim()
			});
			
			// Reset form
			title = '';
			description = '';
			isExpanded = false;
			
		} catch (error) {
			console.error('Failed to add task:', error);
		} finally {
			isSubmitting = false;
		}
	}
	
	function handleKeydown(event) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			handleSubmit();
		} else if (event.key === 'Escape') {
			title = '';
			description = '';
			collapseForm();
		}
	}
	
	function handleTitleKeydown(event) {
		if (event.key === 'Enter') {
			event.preventDefault();
			if (isExpanded) {
				// Move to description field or submit if description is empty
				const descriptionField = event.target.closest('form').querySelector('textarea');
				if (descriptionField) {
					descriptionField.focus();
				}
			} else {
				handleSubmit();
			}
		} else if (event.key === 'Tab' && !isExpanded) {
			expandForm();
		}
	}
</script>

<div class="add-task-form">
	<form on:submit|preventDefault={handleSubmit}>
		<div class="form-content" class:expanded={isExpanded}>
			<div class="title-row">
				<input 
					type="text"
					bind:value={title}
					on:focus={expandForm}
					on:keydown={handleTitleKeydown}
					placeholder={isExpanded ? "What needs to be done?" : "Add a new task..."}
					class="title-input"
					disabled={isSubmitting}
				/>
				
				{#if isExpanded}
					<button 
						type="button"
						class="collapse-btn"
						on:click={collapseForm}
						title="Collapse"
					>
						−
					</button>
				{/if}
			</div>
			
			{#if isExpanded}
				<div class="description-row">
					<textarea 
						bind:value={description}
						on:keydown={handleKeydown}
						placeholder="Add a description (optional)"
						class="description-input"
						rows="3"
						disabled={isSubmitting}
					></textarea>
				</div>
				
				<div class="actions-row">
					<div class="form-hints">
						<span class="hint">Press <kbd>Enter</kbd> to add task</span>
						<span class="hint">Press <kbd>Esc</kbd> to cancel</span>
					</div>
					<div class="form-actions">
						<button 
							type="button"
							class="cancel-btn"
							on:click={() => { title = ''; description = ''; collapseForm(); }}
							disabled={isSubmitting}
						>
							Cancel
						</button>
						<button 
							type="submit"
							class="submit-btn"
							disabled={!title.trim() || isSubmitting}
						>
							{#if isSubmitting}
								<div class="loading-spinner small"></div>
								Adding...
							{:else}
								Add Task
							{/if}
						</button>
					</div>
				</div>
			{/if}
		</div>
	</form>
</div>

<style>
	.add-task-form {
		margin-bottom: 2rem;
	}
	
	.form-content {
		background: white;
		border: 2px solid #e9ecef;
		border-radius: 8px;
		transition: all 0.2s;
		overflow: hidden;
	}
	
	.form-content:focus-within,
	.form-content.expanded {
		border-color: #007bff;
		box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
	}
	
	.title-row {
		display: flex;
		position: relative;
	}
	
	.title-input {
		flex: 1;
		padding: 1rem 1.25rem;
		border: none;
		background: transparent;
		font-size: 1.1rem;
		font-weight: 500;
		color: #333;
		outline: none;
	}
	
	.title-input::placeholder {
		color: #6c757d;
		font-weight: normal;
	}
	
	.collapse-btn {
		position: absolute;
		right: 0.5rem;
		top: 50%;
		transform: translateY(-50%);
		width: 32px;
		height: 32px;
		border: none;
		background: #f8f9fa;
		color: #6c757d;
		border-radius: 50%;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.2rem;
		font-weight: bold;
		transition: all 0.2s;
	}
	
	.collapse-btn:hover {
		background: #e9ecef;
		color: #495057;
	}
	
	.description-row {
		border-top: 1px solid #f1f3f4;
	}
	
	.description-input {
		width: 100%;
		padding: 1rem 1.25rem;
		border: none;
		background: transparent;
		font-size: 0.95rem;
		color: #333;
		outline: none;
		resize: vertical;
		min-height: 80px;
		font-family: inherit;
	}
	
	.description-input::placeholder {
		color: #6c757d;
	}
	
	.actions-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.25rem;
		background: #f8f9fa;
		border-top: 1px solid #f1f3f4;
	}
	
	.form-hints {
		display: flex;
		gap: 1rem;
	}
	
	.hint {
		font-size: 0.8rem;
		color: #6c757d;
	}
	
	kbd {
		background: #e9ecef;
		border: 1px solid #adb5bd;
		border-radius: 3px;
		padding: 0.1rem 0.3rem;
		font-size: 0.75rem;
		font-family: monospace;
	}
	
	.form-actions {
		display: flex;
		gap: 0.75rem;
	}
	
	.cancel-btn, .submit-btn {
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.9rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	
	.cancel-btn {
		background: transparent;
		color: #6c757d;
		border: 1px solid #dee2e6;
	}
	
	.cancel-btn:hover:not(:disabled) {
		background: #f8f9fa;
		border-color: #adb5bd;
	}
	
	.submit-btn {
		background: #007bff;
		color: white;
		border: 1px solid #007bff;
	}
	
	.submit-btn:hover:not(:disabled) {
		background: #0056b3;
		border-color: #0056b3;
	}
	
	.submit-btn:disabled {
		background: #6c757d;
		border-color: #6c757d;
		cursor: not-allowed;
		opacity: 0.6;
	}
	
	.loading-spinner.small {
		width: 16px;
		height: 16px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top: 2px solid white;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}
	
	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}
	
	@media (max-width: 768px) {
		.actions-row {
			flex-direction: column;
			gap: 1rem;
			align-items: stretch;
		}
		
		.form-hints {
			justify-content: center;
			flex-wrap: wrap;
		}
		
		.form-actions {
			justify-content: center;
		}
		
		.hint {
			font-size: 0.75rem;
		}
	}
</style>