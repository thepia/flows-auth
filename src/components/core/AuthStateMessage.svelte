<!--
  AuthStateMessage - Component for displaying authentication status and error messages
  Features: different message types, icons, animations, accessibility, Paraglide i18n support
-->
<script lang="ts">
  import { run } from 'svelte/legacy';

import { m } from '../../utils/i18n';


  interface Props {
    // Props
    type?: 'error' | 'success' | 'info' | 'warning';
    message?: string;
    tKey?: string; // Translation key for Paraglide i18n
    showIcon?: boolean;
    dismissible?: boolean;
    className?: string;
    animate?: boolean;
    variant?: 'default' | 'pin-status';
    children?: import('svelte').Snippet;
  }

  let {
    type = 'info',
    message = '',
    tKey = '',
    showIcon = true,
    dismissible = false,
    className = '',
    animate = true,
    variant = 'default',
    children
  }: Props = $props();

// Internal state
let visible = $state(true);



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

// Computed message - use Paraglide message functions directly
let displayMessage = $derived(getDisplayMessage());
// Check if we have slot content
let hasSlotContent = $derived(children);
// Auto-dismiss for success messages
run(() => {
    if (type === 'success' && displayMessage) {
    setTimeout(() => {
      if (dismissible) dismiss();
    }, 5000);
  }
  });
</script>

{#if visible && (displayMessage || hasSlotContent)}
  <div
    class="auth-message type-{type} variant-{variant} {className}"
    class:animate
    role={type === 'error' ? 'alert' : 'status'}
    aria-live={type === 'error' ? 'assertive' : 'polite'}
  >
    <div class="flex items-start gap-2">
      {#if showIcon}
        <span class="shrink-0 text-base mt-px" aria-hidden="true">
          {@html icons[type]}
        </span>
      {/if}

      <span class="flex-1 break-words text-left">
        {#if hasSlotContent}
          {@render children?.()}
        {:else}
          {displayMessage}
        {/if}
      </span>

      {#if dismissible}
        <button
          class="dismiss-button shrink-0"
          onclick={dismiss}
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

  .dismiss-button {
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

  /* Pin status variant - matches SignInCore pin-status-message styling */
  .variant-pin-status {
    padding: 12px 16px;
    margin: 12px 0;
    background: #f0f9ff;
    border: 1px solid #bae6fd;
    border-radius: 8px;
    font-size: 14px;
    color: #0369a1;
    line-height: 1.4;
  }

  /* Pin direct link styles (for buttons within pin-status variant) */
  .variant-pin-status :global(.pin-direct-link) {
    background: none;
    border: none;
    color: #0369a1;
    font-size: inherit;
    font-weight: 500;
    text-decoration: underline;
    cursor: pointer;
    padding: 0;
    margin: 0 0 0 4px;
    transition: color 0.2s;
  }

  .variant-pin-status :global(.pin-direct-link:hover:not(:disabled)) {
    color: #075985;
  }

  .variant-pin-status :global(.pin-direct-link:disabled) {
    opacity: 0.6;
    cursor: not-allowed;
    text-decoration: none;
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

    .variant-pin-status {
      background: #0c1821;
      border-color: #1e3a8a;
      color: #60a5fa;
    }

    .variant-pin-status :global(.pin-direct-link) {
      color: #60a5fa;
    }

    .variant-pin-status :global(.pin-direct-link:hover:not(:disabled)) {
      color: #93c5fd;
    }
  }
</style>