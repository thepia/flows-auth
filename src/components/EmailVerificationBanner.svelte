<!--
  Email Verification Banner - Subtle top banner for unconfirmed users
  Shows contextual verification prompts without blocking the user experience
-->
<script lang="ts">
import { createEventDispatcher } from 'svelte';

// Props
export let email: string;
export let onVerify: (() => void) | undefined = undefined;
export let onDismiss: (() => void) | undefined = undefined;
export let onResend: (() => void) | undefined = undefined;
export let className = '';

// Events
const dispatch = createEventDispatcher<{
  verify: undefined;
  dismiss: undefined;
  resend: undefined;
}>();

// Component state
let isDismissed = false;
let isResending = false;

// Handle verify action
function handleVerify() {
  if (onVerify) {
    onVerify();
  } else {
    dispatch('verify');
  }
}

// Handle dismiss action
function handleDismiss() {
  isDismissed = true;
  if (onDismiss) {
    onDismiss();
  } else {
    dispatch('dismiss');
  }
}

// Handle resend action
async function handleResend() {
  if (isResending) return;

  isResending = true;
  try {
    if (onResend) {
      onResend();
    } else {
      dispatch('resend');
    }
  } finally {
    // Reset after 3 seconds
    setTimeout(() => {
      isResending = false;
    }, 3000);
  }
}

// Open email app (best effort)
function openEmailApp() {
  // Try to open default email client
  window.location.href = 'mailto:';
}
</script>

<div 
  class="verification-banner {className}" 
  class:dismissed={isDismissed}
  role="banner"
  aria-label="Email verification required"
>
  <div class="banner-content">
    <div class="banner-icon">
      📧
    </div>
    
    <div class="banner-text">
      <span class="banner-message">
        Please verify your email address to unlock all features.
      </span>
      <span class="banner-email">
        Check your inbox at <strong>{email}</strong>
      </span>
    </div>
    
    <div class="banner-actions">
      <button 
        type="button"
        class="verify-button"
        on:click={openEmailApp}
        aria-label="Open email app"
      >
        Check Email
      </button>
      
      <button 
        type="button"
        class="resend-button"
        on:click={handleResend}
        disabled={isResending}
        aria-label="Resend verification email"
      >
        {isResending ? 'Sent!' : 'Resend'}
      </button>
    </div>
    
    <button 
      type="button"
      class="dismiss-button"
      on:click={handleDismiss}
      aria-label="Dismiss verification banner"
    >
      ×
    </button>
  </div>
</div>

<style>
  .verification-banner {
    background: linear-gradient(90deg, #3b82f6, #1d4ed8);
    color: white;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }

  .verification-banner.dismissed {
    transform: translateY(-100%);
    opacity: 0;
    pointer-events: none;
  }

  .banner-content {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
  }

  .banner-icon {
    font-size: 20px;
    flex-shrink: 0;
  }

  .banner-text {
    flex: 1;
    min-width: 0;
  }

  .banner-message {
    display: block;
    font-weight: 500;
    font-size: 14px;
    margin-bottom: 2px;
  }

  .banner-email {
    display: block;
    font-size: 12px;
    opacity: 0.9;
  }

  .banner-actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }

  .verify-button,
  .resend-button {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 6px;
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .verify-button:hover,
  .resend-button:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.3);
    border-color: rgba(255, 255, 255, 0.5);
  }

  .resend-button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .dismiss-button {
    background: none;
    border: none;
    color: white;
    font-size: 18px;
    font-weight: bold;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    transition: background-color 0.2s;
    flex-shrink: 0;
    margin-left: 8px;
  }

  .dismiss-button:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .verification-banner {
      padding: 10px 12px;
    }

    .banner-content {
      gap: 8px;
    }

    .banner-text {
      font-size: 13px;
    }

    .banner-message {
      font-size: 13px;
    }

    .banner-email {
      font-size: 11px;
    }

    .banner-actions {
      gap: 6px;
    }

    .verify-button,
    .resend-button {
      padding: 4px 8px;
      font-size: 11px;
    }
  }

  @media (max-width: 480px) {
    .banner-text {
      min-width: 0;
    }

    .banner-email {
      display: none; /* Hide email on very small screens */
    }

    .banner-actions {
      flex-direction: column;
      gap: 4px;
    }

    .verify-button,
    .resend-button {
      padding: 3px 6px;
      font-size: 10px;
    }
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .verification-banner {
      background: #1e40af;
      border: 2px solid #ffffff;
    }

    .verify-button,
    .resend-button {
      border-color: #ffffff;
    }
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .verification-banner {
      transition: none;
    }

    .verification-banner.dismissed {
      display: none;
    }
  }

  /* Focus styles for accessibility */
  .verify-button:focus,
  .resend-button:focus,
  .dismiss-button:focus {
    outline: 2px solid #ffffff;
    outline-offset: 2px;
  }
</style>
