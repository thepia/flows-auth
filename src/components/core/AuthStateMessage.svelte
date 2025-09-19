<!--
  AuthStateMessage - Component for displaying authentication status and error messages
  Features: different message types, icons, animations, accessibility, Paraglide i18n support
-->
<script lang="ts">
import { m } from '../../utils/i18n';

// Props
export let type: 'error' | 'success' | 'info' | 'warning' = 'info';
export let message = '';
export let tKey = ''; // Translation key for Paraglide i18n
export let showIcon = true;
export let dismissible = false;
export let className = '';
export let animate = true;

// Internal state
let visible = true;

// Computed message - use Paraglide message functions directly
$: displayMessage = getDisplayMessage();

function getDisplayMessage(): string {
  // If explicit message is provided, use it
  if (message) return message;

  // If tKey is provided, use Paraglide bracket notation for dot keys
  if (tKey) {
    // Use bracket notation to access Paraglide message functions with dot keys
    const messageFunction = (m as unknown as {[key: string]: () => string})[tKey];
    if (typeof messageFunction === 'function') {
      return messageFunction();
    } else {
      console.warn(`AuthStateMessage: Unknown tKey "${tKey}"`);
      return tKey; // Fallback to showing the key itself
    }
  }

  return '';
}

// SVG icon mapping - simple monochrome
const icons = {
  error: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zM7 4a1 1 0 1 1 2 0v3a1 1 0 1 1-2 0V4zm1 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/></svg>`,
  success: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm3.354 5.854-4 4a.5.5 0 0 1-.708 0l-2-2a.5.5 0 1 1 .708-.708L7 9.793l3.646-3.647a.5.5 0 0 1 .708.708z"/></svg>`,
  info: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 3a1 1 0 0 1 1 1v4a1 1 0 1 1-2 0V5a1 1 0 0 1 1-1zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/></svg>`,
  warning: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zM7 4a1 1 0 1 1 2 0v3a1 1 0 1 1-2 0V4zm1 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/></svg>`
};

function dismiss() {
  if (dismissible) {
    visible = false;
  }
}

// Auto-dismiss for success messages
$: if (type === 'success' && displayMessage) {
  setTimeout(() => {
    if (dismissible) dismiss();
  }, 5000);
}
</script>

{#if visible && displayMessage}
  <div
    class="auth-message type-{type} {className}"
    class:animate
    role={type === 'error' ? 'alert' : 'status'}
    aria-live={type === 'error' ? 'assertive' : 'polite'}
  >
    <div class="message-content">
      {#if showIcon}
        <span class="message-icon" aria-hidden="true">
          {@html icons[type]}
        </span>
      {/if}

      <span class="message-text">{displayMessage}</span>
      
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
    padding: 8px 0 0 0;
    font-size: 14px;
    line-height: 1.5;
    color: var(--auth-text, currentColor);
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

  /* Message types - clean styling, no default backgrounds/borders */
  .type-error {
    color: var(--auth-error-text, #dc2626);
  }

  .type-success {
    color: var(--auth-success-text, #059669);
  }

  .type-info {
    color: var(--auth-info-text, #0369a1);
  }

  .type-warning {
    color: var(--auth-warning-text, #d97706);
  }

  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    .type-error {
      color: var(--auth-error-text-dark, #f87171);
    }

    .type-success {
      color: var(--auth-success-text-dark, #34d399);
    }

    .type-info {
      color: var(--auth-info-text-dark, #60a5fa);
    }

    .type-warning {
      color: var(--auth-warning-text-dark, #fbbf24);
    }
  }
</style>