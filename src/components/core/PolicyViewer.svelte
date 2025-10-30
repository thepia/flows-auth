<!--
  PolicyViewer - Modal component for displaying policy documents with consent management
  Supports both inline content and external URLs via iframe
  Displays two policies (Privacy and Acceptable Use) with tabs
  Allows authenticated users to accept policies
-->
<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { X, Check } from 'phosphor-svelte';
  import type { SvelteAuthStore } from '../../types/svelte';
  import { getAuthStoreFromContext } from '../../utils/auth-context';

  // Props
  export let open = false;
  export let store: SvelteAuthStore | null = null;
  export let maxWidth = '900px';
  export let showCloseButton = true;
  export let urlPostfix = '?headless';

  // Get auth store from prop or context
  const authStore = store || getAuthStoreFromContext();

  const dispatch = createEventDispatcher<{
    close: void;
    consent: { url: string; accepted: boolean };
  }>();

  let dialogElement: HTMLDialogElement;
  let isClosing = false;
  let activeTab: 'privacy' | 'acceptable' = 'privacy';
  let isAccepting = false;
  let acceptanceError: string | null = null;

  // Transform URL to use dev domain if needed and append postfix
  function transformUrl(url: string): string {
    if (!url) return '';
    try {
      const urlObj = new URL(url);
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';

      // If we're on dev.thepia.net and URL is thepia.com, replace it
      if (currentHost === 'dev.thepia.net' && urlObj.hostname === 'thepia.com') {
        urlObj.hostname = 'dev.thepia.com';
      }

      // Append postfix (e.g., ?headless)
      let finalUrl = urlObj.toString();
      if (urlPostfix) {
        finalUrl += urlPostfix;
      }
      return finalUrl;
    } catch {
      return url; // Return original if URL parsing fails
    }
  }

  // Get policy URLs from auth config
  $: authConfig = authStore?.getConfig?.();
  $: privacyUrl = transformUrl(authConfig?.privacyPolicyUrl || '');
  $: acceptableUrl = transformUrl(authConfig?.acceptableUseUrl || '');

  // Check if user is authenticated
  $: isAuthenticated = $authStore?.state === 'authenticated';

  // Track consent status for both policies
  $: privacyConsent = $authStore?.user?.metadata?.consent?.[privacyUrl];
  $: acceptableConsent = $authStore?.user?.metadata?.consent?.[acceptableUrl];
  $: bothAccepted = !!privacyConsent && !!acceptableConsent;

  $: if (dialogElement) {
    if (open && !dialogElement.open) {
      dialogElement.showModal();
      document.body.style.overflow = 'hidden';
    } else if (!open && dialogElement.open) {
      handleClose();
    }
  }

  function handleClose() {
    if (isClosing) return;
    isClosing = true;

    // Add closing animation
    if (dialogElement) {
      dialogElement.classList.add('closing');
      setTimeout(() => {
        if (dialogElement?.open) {
          dialogElement.close();
        }
        document.body.style.overflow = '';
        isClosing = false;
        dispatch('close');
      }, 200); // Match animation duration
    }
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === dialogElement) {
      handleClose();
    }
  }

  function handleEscape(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      handleClose();
    }
  }

  async function handleAcceptPolicies() {
    if (!isAuthenticated || !authStore) return;

    isAccepting = true;
    acceptanceError = null;

    try {
      // Create consent records for both policies
      const timestamp = Date.now();
      const consentRecord = {
        v: 1, // version
        dh: 'accepted', // document hash (simplified for acceptance)
        ts: timestamp
      };

      // Update metadata with consent for both URLs
      const currentMetadata = $authStore.user?.metadata || {};
      const updatedConsent = {
        ...(currentMetadata.consent || {}),
        [privacyUrl]: consentRecord,
        [acceptableUrl]: consentRecord
      };

      // Call auth store to update metadata
      await authStore.updateUserMetadata({
        consent: updatedConsent
      });

      dispatch('consent', { url: privacyUrl, accepted: true });
      dispatch('consent', { url: acceptableUrl, accepted: true });

      // Close modal after successful acceptance
      setTimeout(() => {
        handleClose();
      }, 500);
    } catch (error) {
      acceptanceError = error instanceof Error ? error.message : 'Failed to accept policies';
      console.error('Error accepting policies:', error);
    } finally {
      isAccepting = false;
    }
  }

  onMount(() => {
    document.addEventListener('keydown', handleEscape);
  });

  onDestroy(() => {
    document.removeEventListener('keydown', handleEscape);
    document.body.style.overflow = '';
  });
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<dialog
  bind:this={dialogElement}
  class="policy-viewer-dialog"
  on:click={handleBackdropClick}
  aria-labelledby="policy-title"
  aria-modal="true"
>
  <div class="policy-viewer-content" style="--max-width: {maxWidth}">
    <!-- Header with tabs -->
    <header class="policy-viewer-header">
      <div class="policy-tabs">
        <button
          class="policy-tab {activeTab === 'privacy' ? 'active' : ''}"
          on:click={() => activeTab = 'privacy'}
          aria-selected={activeTab === 'privacy'}
        >
          Privacy Policy
          {#if privacyConsent}
            <Check size={16} weight="bold" class="consent-check" />
          {/if}
        </button>
        <button
          class="policy-tab {activeTab === 'acceptable' ? 'active' : ''}"
          on:click={() => activeTab = 'acceptable'}
          aria-selected={activeTab === 'acceptable'}
        >
          Acceptable Use Policy
          {#if acceptableConsent}
            <Check size={16} weight="bold" class="consent-check" />
          {/if}
        </button>
      </div>
      {#if showCloseButton}
        <button
          type="button"
          class="policy-viewer-close"
          on:click={handleClose}
          aria-label="Close policy viewer"
        >
          <X size={24} weight="bold" />
        </button>
      {/if}
    </header>

    <!-- Policy content -->
    <div class="policy-viewer-body">
      {#if activeTab === 'privacy' && privacyUrl}
        <iframe
          src={privacyUrl}
          title="Privacy Policy"
          class="policy-iframe"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        ></iframe>
      {:else if activeTab === 'acceptable' && acceptableUrl}
        <iframe
          src={acceptableUrl}
          title="Acceptable Use Policy"
          class="policy-iframe"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        ></iframe>
      {:else}
        <div class="policy-empty">
          <p>No policy content available.</p>
        </div>
      {/if}
    </div>

    <!-- Footer with consent button -->
    {#if isAuthenticated}
      <footer class="policy-viewer-footer">
        {#if acceptanceError}
          <div class="error-message">{acceptanceError}</div>
        {/if}
        <button
          class="accept-button"
          on:click={handleAcceptPolicies}
          disabled={isAccepting || bothAccepted}
        >
          {#if isAccepting}
            Accepting...
          {:else if bothAccepted}
            <Check size={18} weight="bold" />
            Policies Accepted
          {:else}
            Accept Policies
          {/if}
        </button>
      </footer>
    {/if}
  </div>
</dialog>

<style>
  .policy-viewer-dialog {
    border: none;
    border-radius: 12px;
    padding: 0;
    max-width: 95vw;
    max-height: 90vh;
    background: transparent;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
      0 10px 10px -5px rgba(0, 0, 0, 0.04);
    animation: slideIn 0.2s ease-out;
  }

  .policy-viewer-dialog::backdrop {
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    animation: fadeIn 0.2s ease-out;
  }

  .policy-viewer-dialog:global(.closing) {
    animation: slideOut 0.2s ease-in;
  }

  .policy-viewer-dialog:global(.closing)::backdrop {
    animation: fadeOut 0.2s ease-in;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes slideOut {
    from {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
    to {
      opacity: 0;
      transform: translateY(-20px) scale(0.95);
    }
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes fadeOut {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  }

  .policy-viewer-content {
    background: var(--auth-background, #ffffff);
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    width: var(--max-width, 800px);
    height: 80vh;
    max-height: 80vh;
    overflow: hidden;
  }

  .policy-viewer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    border-bottom: 1px solid var(--auth-border-color, #e5e7eb);
    background: var(--auth-background, #ffffff);
    flex-shrink: 0;
    gap: 16px;
  }

  .policy-tabs {
    display: flex;
    gap: 0;
    flex: 1;
  }

  .policy-tab {
    flex: 1;
    padding: 16px 20px;
    background: transparent;
    border: none;
    border-bottom: 3px solid transparent;
    cursor: pointer;
    font-size: 0.95rem;
    font-weight: 500;
    color: var(--auth-text-secondary, #6b7280);
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    white-space: nowrap;
  }

  .policy-tab:hover {
    color: var(--auth-text-primary, #111827);
    background: var(--auth-hover-background, #f3f4f6);
  }

  .policy-tab.active {
    color: var(--auth-accent-color, #10b981);
    border-bottom-color: var(--auth-accent-color, #10b981);
  }

  .consent-check {
    color: var(--auth-accent-color, #10b981);
  }

  .policy-viewer-close {
    background: transparent;
    border: none;
    padding: 8px;
    cursor: pointer;
    color: var(--auth-text-secondary, #6b7280);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    transition: all 0.15s ease;
  }

  .policy-viewer-close:hover {
    background: var(--auth-hover-background, #f3f4f6);
    color: var(--auth-text-primary, #111827);
  }

  .policy-viewer-close:focus {
    outline: 2px solid var(--auth-accent-color, #10b981);
    outline-offset: 2px;
  }

  .policy-viewer-body {
    flex: 1;
    overflow: auto;
    padding: 0;
    background: var(--auth-background, #ffffff);
  }

  .policy-iframe {
    width: 100%;
    height: 100%;
    border: none;
    background: white;
    min-height: 500px;
  }

  .policy-viewer-footer {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 20px 24px;
    border-top: 1px solid var(--auth-border-color, #e5e7eb);
    background: var(--auth-background, #ffffff);
    flex-shrink: 0;
  }

  .error-message {
    padding: 12px;
    background: #fee2e2;
    color: #991b1b;
    border-radius: 6px;
    font-size: 0.875rem;
  }

  .accept-button {
    padding: 12px 20px;
    background: var(--auth-accent-color, #10b981);
    color: white;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .accept-button:hover:not(:disabled) {
    background: var(--auth-accent-hover, #059669);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  }

  .accept-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .policy-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--auth-text-secondary, #6b7280);
  }

  /* Responsive */
  @media (max-width: 768px) {
    .policy-viewer-dialog {
      max-width: 100vw;
      max-height: 100vh;
      border-radius: 0;
    }

    .policy-viewer-content {
      width: 100vw;
      height: 100vh;
      max-height: 100vh;
      border-radius: 0;
    }

    .policy-viewer-header {
      padding: 16px;
    }

    .policy-viewer-title {
      font-size: 1.125rem;
    }

    .policy-viewer-body {
      padding: 16px;
    }
  }

  /* Scrollbar styling */
  .policy-viewer-body::-webkit-scrollbar {
    width: 8px;
  }

  .policy-viewer-body::-webkit-scrollbar-track {
    background: var(--auth-hover-background, #f3f4f6);
    border-radius: 4px;
  }

  .policy-viewer-body::-webkit-scrollbar-thumb {
    background: var(--auth-text-tertiary, #9ca3af);
    border-radius: 4px;
  }

  .policy-viewer-body::-webkit-scrollbar-thumb:hover {
    background: var(--auth-text-secondary, #6b7280);
  }
</style>
