<script lang="ts">
  import { onMount } from 'svelte';
  import { browser, dev } from '$app/environment';
  import type { User, AuthMethod } from '@thepia/flows-auth';
  import { devScenarioManager, type DevScenario } from '$lib/dev/scenarios.js';
  import AuthFormWrapper from './AuthFormWrapper.svelte';
  
  // Import console bridge helpers
  let logAuthEvent: ((eventType: string, data: any) => void) | null = null;
  let logStateChange: ((component: string, state: any) => void) | null = null;
  
  if (browser && dev) {
    import('$lib/dev/console-bridge').then(module => {
      logAuthEvent = module.logAuthEvent;
      logStateChange = module.logStateChange;
    });
  }

  let isModalOpen = false;
  let isSwitchUser = false;
  let currentScenario: DevScenario;
  let authConfig: any = null;
  let unsubscribe: (() => void) | null = null;

  onMount(() => {
    if (!browser) return;

    // Initialize with current scenario (async to resolve auto-detect)
    (async () => {
      currentScenario = await devScenarioManager.getCurrentScenario();
      createConfigForScenario(currentScenario);
    })();

    // Subscribe to scenario changes
    unsubscribe = devScenarioManager.subscribe(async (_scenario) => {
      currentScenario = await devScenarioManager.getCurrentScenario();
      createConfigForScenario(currentScenario);
    });

    // Listen for modal open events
    const handleOpenAuthModal = (event: Event) => {
      const customEvent = event as CustomEvent<{ switchUser?: boolean }>;
      const switchUser = customEvent.detail?.switchUser || false;
      
      logAuthEvent?.('auth-modal-opened', { 
        switchUser, 
        scenario: currentScenario?.name,
        authMethods: currentScenario?.config
      });
      
      // If switching user, clear existing auth
      if (switchUser && browser) {
        localStorage.removeItem('auth_access_token');
        localStorage.removeItem('auth_user');
        window.dispatchEvent(new CustomEvent('auth:signout'));
        logAuthEvent?.('auth-cleared-for-switch', {});
      }
      
      isSwitchUser = switchUser;
      isModalOpen = true;
      logStateChange?.('AuthModalManager', { isModalOpen, isSwitchUser, currentScenario: currentScenario?.name });
    };

    window.addEventListener('openAuthModal', handleOpenAuthModal as EventListener);

    return () => {
      window.removeEventListener('openAuthModal', handleOpenAuthModal as EventListener);
      if (unsubscribe) {
        unsubscribe();
      }
    };
  });

  function createConfigForScenario(scenario: DevScenario) {
    authConfig = {
      apiBaseUrl: scenario.config.apiBaseUrl,
      clientId: scenario.config.clientId,
      domain: 'dev.thepia.net', // Fixed: Use dev.thepia.net for proper WebAuthn support
      enablePasskeys: scenario.config.enablePasskeys,
      enableMagicPins: scenario.config.enableMagicPins,
      branding: {
        companyName: scenario.branding.companyName,
        logoUrl: '/thepia-logo.svg',
        showPoweredBy: scenario.branding.name !== 'Thepia Default',
        primaryColor: scenario.branding.colors.primary,
        secondaryColor: scenario.branding.colors.accent
      }
    };
  }

  function handleCloseModal() {
    logAuthEvent?.('auth-modal-closed', { 
      wasAuthenticated: false,
      isSwitchUser 
    });
    isModalOpen = false;
    isSwitchUser = false;
    logStateChange?.('AuthModalManager', { isModalOpen, isSwitchUser });
  }

  function handleAuthSuccess(event: CustomEvent<{ user: User; method: AuthMethod }>) {
    console.log('✅ Authentication successful:', event.detail);
    
    logAuthEvent?.('authentication-successful', {
      userId: event.detail.user.id,
      email: event.detail.user.email,
      method: event.detail.method,
      scenario: currentScenario?.name,
      isSwitchUser
    });
    
    // Store user data
    if (browser) {
      localStorage.setItem('auth_user', JSON.stringify(event.detail.user));
      // Simulate access token for demo
      localStorage.setItem('auth_access_token', 'demo-token-' + Date.now());
    }
    
    // Dispatch success event for other components
    window.dispatchEvent(new CustomEvent('auth:success', { 
      detail: { 
        user: event.detail.user, 
        method: event.detail.method 
      } 
    }));
    
    // Close modal
    isModalOpen = false;
    isSwitchUser = false;
    logStateChange?.('AuthModalManager', { isModalOpen, isSwitchUser, authenticatedUser: event.detail.user.email });
  }

  function handleAuthError(event: CustomEvent<{ error: any }>) {
    console.error('❌ Authentication failed:', event.detail.error);
    
    logAuthEvent?.('authentication-failed', {
      error: event.detail.error?.message || 'Unknown error',
      scenario: currentScenario?.name,
      isSwitchUser
    });
    
    // Dispatch error event
    window.dispatchEvent(new CustomEvent('auth:error', { 
      detail: { error: event.detail.error } 
    }));
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      handleCloseModal();
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      handleCloseModal();
    }
  }
</script>

{#if isModalOpen && currentScenario && authConfig}
  <!-- Modal Backdrop -->
  <div 
    class="modal-backdrop"
    on:click={handleBackdropClick}
    on:keydown={handleKeydown}
    role="button"
    aria-label="Close dialog"
    tabindex="-1"
  >
    <!-- Modal Content -->
    <div class="modal-content">
      <!-- Modal Header -->
      <div class="modal-header">
        <div class="modal-title-section">
          <h2 id="auth-modal-title" class="modal-title">
            {isSwitchUser ? 'Switch User' : 'Sign In'}
          </h2>
          {#if isSwitchUser}
            <p class="modal-subtitle">
              Sign in with a different account to continue
            </p>
          {:else}
            <p class="modal-subtitle">
              Welcome to {currentScenario.branding.companyName}
            </p>
          {/if}
        </div>
        
        <button 
          class="modal-close"
          on:click={handleCloseModal}
          aria-label="Close dialog"
          type="button"
        >
          <svg class="close-icon" viewBox="0 0 20 20" fill="currentColor">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"/>
          </svg>
        </button>
      </div>

      <!-- Auth Form -->
      <div class="modal-body">
        {#if authConfig}
          <AuthFormWrapper 
            config={authConfig}
            on:success={handleAuthSuccess}
            on:error={handleAuthError}
          />
        {:else}
          <div class="loading-auth">
            <div class="spinner"></div>
            <p>Loading authentication...</p>
          </div>
        {/if}
      </div>

      <!-- Modal Footer -->
      <div class="modal-footer">
        <div class="auth-features">
          <div class="feature-badge" class:enabled={currentScenario.config.enablePasskeys}>
            {#if currentScenario.config.enablePasskeys}
              <svg class="feature-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M18 8a6 6 0 0 1-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1 1 18 8Zm-6-4a1 1 0 1 0 0 2 2 2 0 0 1 2 2 1 1 0 1 0 2 0 4 4 0 0 0-4-4Z" clip-rule="evenodd"/>
              </svg>
              Passkey Ready
            {:else}
              <svg class="feature-icon disabled" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M18 8a6 6 0 0 1-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1 1 18 8Zm-6-4a1 1 0 1 0 0 2 2 2 0 0 1 2 2 1 1 0 1 0 2 0 4 4 0 0 0-4-4Z" clip-rule="evenodd"/>
              </svg>
              Passkey Disabled
            {/if}
          </div>
          
          <div class="feature-badge" class:enabled={currentScenario.config.enableMagicPins}>
            {#if currentScenario.config.enableMagicPins}
              <svg class="feature-icon" viewBox="0 0 20 20" fill="currentColor">
                <path d="M3 4a2 2 0 0 1 2-2h1.007a1 1 0 0 1 .757.349L8.72 4.216A1 1 0 0 0 9.477 4.5h8.023a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4Z"/>
              </svg>
              Magic Link
            {:else}
              <svg class="feature-icon disabled" viewBox="0 0 20 20" fill="currentColor">
                <path d="M3 4a2 2 0 0 1 2-2h1.007a1 1 0 0 1 .757.349L8.72 4.216A1 1 0 0 0 9.477 4.5h8.023a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4Z"/>
              </svg>
              Magic Link Disabled
            {/if}
          </div>
        </div>
        
        <div class="security-notice">
          <svg class="security-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M9.661 2.237a.531.531 0 0 1 .678 0 11.947 11.947 0 0 0 7.078 2.749.5.5 0 0 1 .479.425c.069.52.104 1.05.104 1.589 0 5.956-3.724 11.47-8.962 13.5a.502.502 0 0 1-.316 0C3.724 18.47.001 12.956.001 7c0-.539.035-1.069.104-1.589a.5.5 0 0 1 .48-.425 11.947 11.947 0 0 0 7.076-2.749Zm4.196 5.954a.75.75 0 0 0-1.214-.882l-3.236 4.53L7.73 9.77a.75.75 0 0 0-1.06 1.061l2.25 2.25a.75.75 0 0 0 1.137-.089l3.75-5.25Z" clip-rule="evenodd"/>
          </svg>
          Protected by enterprise-grade security with privacy-first Thepia Shadow™ protection
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    z-index: var(--z-modal);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-4);
    animation: fadeIn var(--transition-normal);
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .modal-content {
    background: var(--color-white);
    border-radius: var(--radius-2xl);
    box-shadow: var(--shadow-2xl);
    max-width: 480px;
    width: 100%;
    max-height: 90vh;
    overflow: hidden;
    animation: slideIn var(--transition-normal);
  }

  @keyframes slideIn {
    from { 
      opacity: 0; 
      transform: scale(0.95) translateY(20px);
    }
    to { 
      opacity: 1; 
      transform: scale(1) translateY(0);
    }
  }

  .modal-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--spacing-4);
    padding: var(--spacing-6);
    border-bottom: var(--border-width) solid var(--color-gray-200);
  }

  .modal-title-section {
    flex: 1;
  }

  .modal-title {
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-gray-900);
    margin: 0 0 var(--spacing-2) 0;
    line-height: var(--line-height-tight);
  }

  .modal-subtitle {
    font-size: var(--font-size-base);
    color: var(--color-gray-600);
    margin: 0;
    line-height: var(--line-height-normal);
  }

  .modal-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    background: var(--color-gray-100);
    color: var(--color-gray-500);
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition: all var(--transition-fast);
    flex-shrink: 0;
  }

  .modal-close:hover {
    background: var(--color-gray-200);
    color: var(--color-gray-700);
  }

  .close-icon {
    width: 16px;
    height: 16px;
  }

  .modal-body {
    padding: 0 var(--spacing-6) var(--spacing-6);
  }

  .modal-footer {
    padding: var(--spacing-6);
    border-top: var(--border-width) solid var(--color-gray-200);
    background: var(--color-gray-50);
  }

  .auth-features {
    display: flex;
    gap: var(--spacing-3);
    margin-bottom: var(--spacing-4);
    justify-content: center;
  }

  .feature-badge {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    padding: var(--spacing-2) var(--spacing-3);
    background: var(--color-gray-100);
    color: var(--color-gray-500);
    border-radius: var(--radius-full);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    transition: all var(--transition-fast);
  }

  .feature-badge.enabled {
    background: var(--brand-primary-light);
    color: var(--brand-primary);
  }

  .feature-icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }

  .feature-icon.disabled {
    opacity: 0.5;
  }

  .security-notice {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    font-size: var(--font-size-sm);
    color: var(--color-gray-600);
    text-align: center;
    justify-content: center;
  }

  .security-icon {
    width: 16px;
    height: 16px;
    color: var(--color-success);
    flex-shrink: 0;
  }

  .loading-auth {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-8);
    text-align: center;
  }

  .loading-auth .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--color-gray-200);
    border-top: 3px solid var(--brand-primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: var(--spacing-4);
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .loading-auth p {
    color: var(--color-gray-600);
    margin: 0;
  }

  /* Mobile adjustments */
  @media (max-width: 768px) {
    .modal-backdrop {
      padding: var(--spacing-2);
    }
    
    .modal-content {
      max-height: 95vh;
    }
    
    .modal-header {
      padding: var(--spacing-4);
    }
    
    .modal-body {
      padding: 0 var(--spacing-4) var(--spacing-4);
    }
    
    .modal-footer {
      padding: var(--spacing-4);
    }
    
    .modal-title {
      font-size: var(--font-size-xl);
    }
    
    .auth-features {
      flex-direction: column;
      align-items: center;
    }
  }
</style>