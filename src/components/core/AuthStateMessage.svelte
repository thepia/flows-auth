<!--
  AuthStateMessage - Component for displaying authentication status and error messages
  Features: different message types, icons, animations, accessibility
-->
<script lang="ts">
// Props
export let type: 'error' | 'success' | 'info' | 'warning' = 'info';
export let message = '';
export let showIcon = true;
export let dismissible = false;
export let className = '';
export let animate = true;

// Internal state
let visible = true;

// Icon mapping
const icons = {
  error: '⚠️',
  success: '✅', 
  info: 'ℹ️',
  warning: '⚠️'
};

function dismiss() {
  if (dismissible) {
    visible = false;
  }
}

// Auto-dismiss for success messages
$: if (type === 'success' && message) {
  setTimeout(() => {
    if (dismissible) dismiss();
  }, 5000);
}
</script>

{#if visible && message}
  <div 
    class="auth-message type-{type} {className}"
    class:animate
    role={type === 'error' ? 'alert' : 'status'}
    aria-live={type === 'error' ? 'assertive' : 'polite'}
  >
    <div class="message-content">
      {#if showIcon}
        <span class="message-icon" aria-hidden="true">
          {icons[type]}
        </span>
      {/if}
      
      <span class="message-text">{message}</span>
      
      {#if dismissible}
        <button 
          class="dismiss-button"
          on:click={dismiss}
          aria-label="Dismiss message"
        >
          ×
        </button>
      {/if}
    </div>
  </div>
{/if}

<style>
  .auth-message {
    border-radius: var(--auth-border-radius, 8px);
    padding: 12px 16px;
    margin: 8px 0;
    border: 1px solid;
    font-size: 14px;
    line-height: 1.5;
  }

  .auth-message.animate {
    animation: slideIn 0.3s ease-out;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .message-content {
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }

  .message-icon {
    flex-shrink: 0;
    font-size: 16px;
    margin-top: 1px;
  }

  .message-text {
    flex: 1;
    word-wrap: break-word;
  }

  .dismiss-button {
    flex-shrink: 0;
    background: none;
    border: none;
    font-size: 18px;
    font-weight: 600;
    cursor: pointer;
    padding: 0;
    line-height: 1;
    opacity: 0.6;
    transition: opacity 0.2s;
  }

  .dismiss-button:hover {
    opacity: 1;
  }

  /* Message types */
  .type-error {
    background: var(--auth-error-bg, #fef2f2);
    border-color: var(--auth-error-border, #fecaca);
    color: var(--auth-error-text, #dc2626);
  }

  .type-success {
    background: var(--auth-success-bg, #f0f9ff);
    border-color: var(--auth-success-border, #bae6fd);
    color: var(--auth-success-text, #0284c7);
  }

  .type-info {
    background: var(--auth-info-bg, #f0f9ff);
    border-color: var(--auth-info-border, #bae6fd);
    color: var(--auth-info-text, #0284c7);
  }

  .type-warning {
    background: var(--auth-warning-bg, #fffbeb);
    border-color: var(--auth-warning-border, #fed7aa);
    color: var(--auth-warning-text, #d97706);
  }

  /* Dark mode support via CSS custom properties */
  @media (prefers-color-scheme: dark) {
    .type-error {
      background: var(--auth-error-bg-dark, rgba(220, 38, 38, 0.1));
      border-color: var(--auth-error-border-dark, rgba(220, 38, 38, 0.3));
      color: var(--auth-error-text-dark, #f87171);
    }

    .type-success {
      background: var(--auth-success-bg-dark, rgba(2, 132, 199, 0.1));
      border-color: var(--auth-success-border-dark, rgba(2, 132, 199, 0.3));
      color: var(--auth-success-text-dark, #60a5fa);
    }

    .type-info {
      background: var(--auth-info-bg-dark, rgba(2, 132, 199, 0.1));
      border-color: var(--auth-info-border-dark, rgba(2, 132, 199, 0.3));
      color: var(--auth-info-text-dark, #60a5fa);
    }

    .type-warning {
      background: var(--auth-warning-bg-dark, rgba(217, 119, 6, 0.1));
      border-color: var(--auth-warning-border-dark, rgba(217, 119, 6, 0.3));
      color: var(--auth-warning-text-dark, #fbbf24);
    }
  }
</style>