<!--
  Email Verification Prompt - Feature-specific verification prompts
  Shows when users try to access locked features, encouraging email verification
-->
<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import type { EmailVerificationPromptProps } from '../types';

  // Props
  export let email: string;
  export let featureName = 'this feature';
  export let onVerify: (() => void) | undefined = undefined;
  export let onResend: (() => void) | undefined = undefined;
  export let onDismiss: (() => void) | undefined = undefined;
  export let className = '';

  // Events
  const dispatch = createEventDispatcher<{
    verify: void;
    resend: void;
    dismiss: void;
  }>();

  // Component state
  let isVisible = false;
  let isResending = false;
  let isDismissed = false;

  // Show prompt with animation
  onMount(() => {
    setTimeout(() => {
      isVisible = true;
    }, 100);
  });

  // Handle verify action
  function handleVerify() {
    if (onVerify) {
      onVerify();
    } else {
      dispatch('verify');
    }
    openEmailApp();
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

  // Handle dismiss action
  function handleDismiss() {
    isDismissed = true;
    isVisible = false;
    
    setTimeout(() => {
      if (onDismiss) {
        onDismiss();
      } else {
        dispatch('dismiss');
      }
    }, 300);
  }

  // Open email app (best effort)
  function openEmailApp() {
    try {
      // Try to open default email client
      window.location.href = 'mailto:';
    } catch (error) {
      console.log('Could not open email app:', error);
    }
  }

  // Handle escape key
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      handleDismiss();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if !isDismissed}
  <div 
    class="verification-prompt {className}" 
    class:show={isVisible}
    role="dialog"
    aria-labelledby="prompt-title"
    aria-describedby="prompt-description"
  >
    <div class="prompt-content">
      <div class="prompt-header">
        <div class="prompt-icon">
          🔓
        </div>
        <h3 id="prompt-title" class="prompt-title">
          Unlock {featureName}
        </h3>
        <button 
          type="button"
          class="close-button"
          on:click={handleDismiss}
          aria-label="Close verification prompt"
        >
          ×
        </button>
      </div>
      
      <div class="prompt-body">
        <p id="prompt-description" class="prompt-description">
          To access {featureName}, please verify your email address. 
          We sent a verification link to <strong>{email}</strong>.
        </p>
        
        <div class="verification-steps">
          <div class="step">
            <span class="step-number">1</span>
            <span class="step-text">Check your email inbox</span>
          </div>
          <div class="step">
            <span class="step-number">2</span>
            <span class="step-text">Click the verification link</span>
          </div>
          <div class="step">
            <span class="step-number">3</span>
            <span class="step-text">Return here to access all features</span>
          </div>
        </div>
      </div>
      
      <div class="prompt-actions">
        <button 
          type="button"
          class="primary-action"
          on:click={handleVerify}
        >
          Check Email
        </button>
        
        <button 
          type="button"
          class="secondary-action"
          on:click={handleResend}
          disabled={isResending}
        >
          {isResending ? 'Email Sent!' : 'Resend Link'}
        </button>
        
        <button 
          type="button"
          class="tertiary-action"
          on:click={handleDismiss}
        >
          Continue with limited access
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .verification-prompt {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    border: 1px solid #e5e7eb;
    max-width: 400px;
    width: calc(100vw - 40px);
    transform: translateY(100px);
    opacity: 0;
    transition: all 0.3s ease;
    z-index: 1000;
  }

  .verification-prompt.show {
    transform: translateY(0);
    opacity: 1;
  }

  .prompt-content {
    padding: 24px;
  }

  .prompt-header {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 16px;
    position: relative;
  }

  .prompt-icon {
    font-size: 24px;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .prompt-title {
    font-size: 18px;
    font-weight: 600;
    color: #111827;
    margin: 0;
    flex: 1;
    line-height: 1.4;
  }

  .close-button {
    background: none;
    border: none;
    color: #6b7280;
    font-size: 20px;
    font-weight: bold;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s;
    position: absolute;
    top: -4px;
    right: -4px;
  }

  .close-button:hover {
    background: #f3f4f6;
    color: #374151;
  }

  .prompt-body {
    margin-bottom: 20px;
  }

  .prompt-description {
    font-size: 14px;
    color: #4b5563;
    line-height: 1.5;
    margin: 0 0 16px 0;
  }

  .verification-steps {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .step {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: #6b7280;
  }

  .step-number {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    background: #3b82f6;
    color: white;
    border-radius: 50%;
    font-size: 11px;
    font-weight: 600;
    flex-shrink: 0;
  }

  .step-text {
    line-height: 1.4;
  }

  .prompt-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .primary-action {
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 10px 16px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .primary-action:hover {
    background: #2563eb;
    transform: translateY(-1px);
  }

  .secondary-action {
    background: #f9fafb;
    color: #374151;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    padding: 8px 16px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .secondary-action:hover:not(:disabled) {
    background: #f3f4f6;
    border-color: #9ca3af;
  }

  .secondary-action:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    background: #10b981;
    color: white;
    border-color: #10b981;
  }

  .tertiary-action {
    background: none;
    color: #6b7280;
    border: none;
    padding: 8px 16px;
    font-size: 13px;
    cursor: pointer;
    transition: color 0.2s;
    text-decoration: underline;
  }

  .tertiary-action:hover {
    color: #374151;
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .verification-prompt {
      bottom: 16px;
      right: 16px;
      left: 16px;
      width: auto;
      max-width: none;
    }

    .prompt-content {
      padding: 20px;
    }

    .prompt-title {
      font-size: 16px;
    }

    .prompt-description {
      font-size: 13px;
    }
  }

  @media (max-width: 480px) {
    .verification-prompt {
      bottom: 12px;
      right: 12px;
      left: 12px;
    }

    .prompt-content {
      padding: 16px;
    }

    .prompt-header {
      gap: 8px;
      margin-bottom: 12px;
    }

    .prompt-icon {
      font-size: 20px;
    }

    .prompt-title {
      font-size: 15px;
    }

    .verification-steps {
      gap: 6px;
    }

    .step {
      font-size: 12px;
    }

    .step-number {
      width: 18px;
      height: 18px;
      font-size: 10px;
    }
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .verification-prompt {
      border: 2px solid #000000;
    }

    .primary-action {
      background: #000000;
    }

    .secondary-action {
      border-color: #000000;
    }
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .verification-prompt {
      transition: opacity 0.2s ease;
    }

    .verification-prompt.show {
      transform: none;
    }

    .primary-action:hover {
      transform: none;
    }
  }

  /* Focus styles for accessibility */
  .primary-action:focus,
  .secondary-action:focus,
  .tertiary-action:focus,
  .close-button:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }
</style>
