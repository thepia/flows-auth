<script lang="ts">
  import { browser } from '$app/environment';
  import AccountIcon from '$lib/components/AccountIcon.svelte';
  import AuthModalManager from '$lib/components/AuthModalManager.svelte';
  import DevSidebar from '$lib/components/DevSidebar.svelte';
  import { devScenarioManager, type DevScenario } from '$lib/dev/scenarios.js';
  import type { User } from '@thepia/flows-auth';
  import { getAuthStoreFromContext } from '@thepia/flows-auth/svelte';
  import { onMount } from 'svelte';

  let currentScenario: DevScenario = $state();
  let currentUser: User | null = $state(null);
  // Obtain the auth store from Svelte context during component init.
  // getContext() must run here (not inside onMount/async) per ADR 0004.
  const authStore = getAuthStoreFromContext();
  let unsubscribeScenario: (() => void) | null = null;
  let unsubscribeAuth: (() => void) | null = null;
  
  onMount(() => {
    if (!browser) return;

    // Initialize with current scenario
    devScenarioManager.getCurrentScenario().then((scenario) => {
      currentScenario = scenario;
    });

    // Subscribe to scenario changes
    unsubscribeScenario = devScenarioManager.subscribe((scenario) => {
      currentScenario = scenario;
    });
    
    // Subscribe to auth store changes (store obtained from context at init)
    unsubscribeAuth = authStore.subscribe(($authState) => {
      console.log('📊 Auth state update:', { state: $authState.state, user: !!$authState.user });

      if ($authState.state === 'authenticated' && $authState.user) {
        currentUser = $authState.user;
      } else {
        currentUser = null;
      }
    });
    
    console.log('✅ Demo page initialization complete');
    
    return () => {
      if (unsubscribeScenario) {
        unsubscribeScenario();
      }
      if (unsubscribeAuth) {
        unsubscribeAuth();
      }
    };
  });
  

  function handleOpenAuth(event: CustomEvent<{ switchUser?: boolean }>) {
    // Dispatch the openAuthModal event that AuthModalManager listens for
    window.dispatchEvent(new CustomEvent('openAuthModal', { 
      detail: { switchUser: event.detail.switchUser } 
    }));
  }
</script>

<svelte:head>
  <title>Flows App Demo - @thepia/flows-auth</title>
  <meta name="description" content="Demo app for testing the Thepia authentication library with different branding configurations" />
</svelte:head>

{#if browser}
  <DevSidebar />
  <AuthModalManager />
{/if}

<div class="demo-app" class:brand-demo={currentScenario?.branding.className === 'brand-thepia'} class:brand-emerald={currentScenario?.branding.className === 'brand-emerald'} class:brand-purple={currentScenario?.branding.className === 'brand-purple'} class:brand-rose={currentScenario?.branding.className === 'brand-rose'}>
  <header class="demo-header">
    <div class="container">
      <div class="header-content">
        <div class="brand-info">
          <div class="brand-logo-section">
            <img src="/src/branding/assets/logos/logo.svg" alt="Demo Company" class="brand-logo" />
            <div class="brand-text">
              <h1>{currentScenario?.branding.companyName || 'Loading...'}</h1>
              <p>Secure authentication powered by Thepia</p>
            </div>
          </div>
        </div>
        
        <div class="header-actions">
          {#if currentScenario}
            <div class="auth-methods">
              <span class="method-badge" class:enabled={currentScenario.config.enablePasskeys}>Passkeys</span>
              <span class="method-badge" class:enabled={currentScenario.config.enableMagicLinks}>Magic Link</span>
            </div>
          {/if}
          
          <AccountIcon on:openAuth={handleOpenAuth} />
        </div>
      </div>
    </div>
  </header>

  <main class="demo-main">
    <div class="container">
      {#if currentUser}
        <!-- Authenticated State -->
        <div class="auth-success">
          <div class="card">
            <div class="success-header">
              <div class="success-icon">✅</div>
              <h2>Welcome back, {currentUser.name}!</h2>
            </div>
            <p class="welcome-message">You're successfully authenticated with <strong>{currentScenario?.branding.companyName}</strong></p>
            
            <div class="user-info">
              <h3>Account Information</h3>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Email Address</span>
                  <span class="info-value">{currentUser.email}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">User ID</span>
                  <span class="info-value">{currentUser.id}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Email Status</span>
                  <span class="info-value">{currentUser.emailVerified ? '✅ Verified' : '⚠️ Pending verification'}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Member Since</span>
                  <span class="info-value">{new Date(currentUser.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
              </div>
            </div>

            <div class="dashboard-preview">
              <h3>Application Dashboard</h3>
              <p>This is where your main application content would appear after successful authentication.</p>
              <div class="dashboard-content">
                <div class="dashboard-item">
                  <div class="dashboard-icon">📊</div>
                  <div class="dashboard-text">
                    <h4>Analytics</h4>
                    <p>View your usage metrics and insights</p>
                  </div>
                </div>
                <div class="dashboard-item">
                  <div class="dashboard-icon">⚙️</div>
                  <div class="dashboard-text">
                    <h4>Settings</h4>
                    <p>Manage your account preferences</p>
                  </div>
                </div>
                <div class="dashboard-item">
                  <div class="dashboard-icon">🔒</div>
                  <div class="dashboard-text">
                    <h4>Security</h4>
                    <p>Configure passkeys and security options</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      {:else if currentScenario}
        <!-- Unauthenticated State -->
        <div class="auth-demo">
          <div class="demo-layout">
            <div class="demo-info">
              <div class="card info-card">
                <h2>Authentication Demo</h2>
                <p>This demo showcases the Thepia authentication library with real API integration. Click the account icon in the header to sign in.</p>
                
                <div class="config-summary">
                  <h3>Current Configuration</h3>
                  <div class="config-grid">
                    <div class="config-item">
                      <span class="config-label">Company</span>
                      <span class="config-value">{currentScenario.branding.companyName}</span>
                    </div>
                    <div class="config-item">
                      <span class="config-label">API Endpoint</span>
                      <span class="config-value">{currentScenario.config.apiBaseUrl}</span>
                    </div>
                    <div class="config-item">
                      <span class="config-label">Client ID</span>
                      <span class="config-value">{currentScenario.config.clientId}</span>
                    </div>
                    <div class="config-item">
                      <span class="config-label">Branding</span>
                      <span class="config-value">{currentScenario.branding.description}</span>
                    </div>
                  </div>
                </div>
                
                <div class="features-list">
                  <h3>Authentication Methods</h3>
                  <ul>
                    <li class="feature-item" class:enabled={currentScenario.config.enablePasskeys}>
                      <span class="feature-icon">{currentScenario.config.enablePasskeys ? '✅' : '❌'}</span>
                      <div class="feature-details">
                        <strong>WebAuthn/Passkey Authentication</strong>
                        <small>Biometric authentication using Touch ID, Face ID, or security keys</small>
                      </div>
                    </li>
                    <li class="feature-item" class:enabled={currentScenario.config.enableMagicLinks}>
                      <span class="feature-icon">{currentScenario.config.enableMagicLinks ? '✅' : '❌'}</span>
                      <div class="feature-details">
                        <strong>Magic Link Authentication</strong>
                        <small>Passwordless login via secure email links</small>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div class="auth-cta">
              <div class="card cta-card">
                <div class="cta-content">
                  <h3>Ready to Sign In?</h3>
                  <p>Click the account icon in the header to start the authentication process.</p>
                  <button
                    class="cta-button btn-brand"
                    onclick={() => handleOpenAuth({ detail: {} })}
                    type="button"
                  >
                    <svg class="cta-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clip-rule="evenodd"/>
                    </svg>
                    Sign In Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      {:else}
        <!-- Loading State -->
        <div class="loading-state">
          <div class="card">
            <div class="loading-spinner"></div>
            <p>Initializing authentication system...</p>
          </div>
        </div>
      {/if}
    </div>
  </main>

  <footer class="demo-footer">
    <div class="container">
      <div class="footer-content">
        <div class="footer-info">
          <p>
            Demo app for testing <strong>@thepia/flows-auth</strong>
          </p>
          <p class="footer-meta">
            Protected by enterprise-grade security with privacy-first Thepia Shadow™ protection
          </p>
        </div>
        <div class="footer-links">
          <a href="https://github.com/thepia/flows-auth" target="_blank">GitHub</a>
          <a href="https://thepia.com/privacy" target="_blank">Privacy</a>
          <a href="https://thepia.com/security" target="_blank">Security</a>
        </div>
      </div>
    </div>
  </footer>
</div>

<style>
  .demo-app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--color-bg-secondary, #f9fafb);
    font-family: var(--font-fontFamily-brand-body, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
    color: var(--color-text-primary, #111827);
  }

  .demo-header {
    background: var(--color-bg-primary, #ffffff);
    border-bottom: 1px solid var(--color-border-default, #e5e7eb);
    padding: var(--size-space-8, 2rem) 0;
  }

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--size-space-6, 1.5rem);
  }

  .brand-logo-section {
    display: flex;
    align-items: center;
    gap: var(--size-space-4, 1rem);
  }

  .brand-logo {
    height: 48px;
    width: auto;
  }

  .brand-text h1 {
    font-size: var(--font-size-4xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-brand-primary, #0066cc);
    margin-bottom: var(--size-space-2, 0.5rem);
    line-height: var(--font-lineHeight-tight, 1.25);
    margin: 0 0 var(--size-space-1, 0.25rem) 0;
  }

  .brand-text p {
    color: var(--color-text-secondary, #4b5563);
    font-size: var(--font-size-lg);
    margin: 0;
  }

  .auth-methods {
    display: flex;
    gap: var(--size-space-2, 0.5rem);
    flex-wrap: wrap;
  }

  .method-badge {
    padding: var(--size-space-1, 0.25rem) var(--size-space-3, 0.75rem);
    border-radius: var(--size-radius-full, 9999px);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    background: var(--color-bg-secondary, #f3f4f6);
    color: var(--color-text-3, #6b7280);
    border: 1px solid var(--color-border-default, #e5e7eb);
  }

  .method-badge.enabled {
    background: var(--color-brand-primarySubtle, #eff6ff);
    color: var(--color-brand-primary, #0066cc);
    border-color: var(--color-brand-primary, #0066cc);
  }

  .demo-main {
    flex: 1;
    padding: var(--size-space-12, 3rem) 0;
  }

  .demo-layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--size-space-12, 3rem);
    align-items: start;
  }

  .card {
    background: var(--color-bg-primary, #ffffff);
    border: 1px solid var(--color-border-default, #e5e7eb);
    border-radius: var(--size-radius-6, 0.75rem);
    padding: var(--size-space-8, 2rem);
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1);
  }

  .info-card {
    height: fit-content;
  }

  .info-card h2 {
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary, #111827);
    margin-bottom: var(--size-space-4, 1rem);
  }

  .info-card > p {
    color: var(--color-text-secondary, #4b5563);
    margin-bottom: var(--size-space-6, 1.5rem);
    line-height: var(--font-lineHeight-relaxed, 1.625);
  }

  .config-summary, .features-list {
    margin-bottom: var(--size-space-6, 1.5rem);
  }

  .config-summary h3, .features-list h3 {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary, #1f2937);
    margin-bottom: var(--size-space-3, 0.75rem);
  }

  .config-grid {
    display: flex;
    flex-direction: column;
    gap: var(--size-space-3, 0.75rem);
  }

  .config-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--size-space-2, 0.5rem) 0;
    border-bottom: 1px solid var(--color-bg-secondary, #f3f4f6);
  }

  .config-item:last-child {
    border-bottom: none;
  }

  .config-label {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-secondary, #374151);
  }

  .config-value {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary, #4b5563);
    font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
    text-align: right;
  }

  .features-list ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .feature-item {
    display: flex;
    align-items: center;
    gap: var(--size-space-3, 0.75rem);
    padding: var(--size-space-2, 0.5rem) 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary, #4b5563);
  }

  .feature-item.enabled {
    color: var(--color-text-primary, #1f2937);
  }

  .feature-icon {
    font-size: var(--font-size-base);
  }

  .cta-icon {
    width: 20px;
    height: 20px;
  }


  /* Authenticated State */
  .auth-success {
    max-width: 600px;
    margin: 0 auto;
  }

  .success-header {
    display: flex;
    align-items: center;
    gap: var(--size-space-4, 1rem);
    margin-bottom: var(--size-space-4, 1rem);
  }

  .success-icon {
    font-size: var(--font-size-4xl);
  }

  .success-header h2 {
    font-size: var(--font-size-3xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary, #111827);
    margin: 0;
  }

  .auth-success .welcome-message {
    color: var(--color-text-secondary, #4b5563);
    font-size: var(--font-size-lg);
    margin-bottom: var(--size-space-6, 1.5rem);
    text-align: center;
  }

  .user-info {
    background: var(--color-bg-secondary, #f9fafb);
    padding: var(--size-space-6, 1.5rem);
    border-radius: var(--size-radius-4, 0.5rem);
    margin-bottom: var(--size-space-6, 1.5rem);
  }

  .user-info h3 {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary, #1f2937);
    margin-bottom: var(--size-space-4, 1rem);
  }

  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--size-space-4, 1rem);
  }

  .dashboard-preview {
    background: var(--color-bg-secondary, #f9fafb);
    padding: var(--size-space-6, 1.5rem);
    border-radius: var(--size-radius-4, 0.5rem);
    margin-top: var(--size-space-6, 1.5rem);
  }

  .dashboard-preview h3 {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary, #1f2937);
    margin-bottom: var(--size-space-3, 0.75rem);
  }

  .dashboard-preview > p {
    color: var(--color-text-secondary, #4b5563);
    margin-bottom: var(--size-space-6, 1.5rem);
  }

  .dashboard-content {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--size-space-4, 1rem);
  }

  .dashboard-item {
    display: flex;
    align-items: flex-start;
    gap: var(--size-space-3, 0.75rem);
    padding: var(--size-space-4, 1rem);
    background: var(--color-bg-primary, #ffffff);
    border: 1px solid var(--color-border-default, #e5e7eb);
    border-radius: var(--size-radius-4, 0.5rem);
    transition: all 150ms ease;
  }

  .dashboard-item:hover {
    border-color: var(--color-brand-primary, #0066cc);
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1);
  }

  .dashboard-icon {
    font-size: var(--font-size-2xl);
    flex-shrink: 0;
  }

  .dashboard-text h4 {
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-primary, #111827);
    margin-bottom: var(--size-space-1, 0.25rem);
  }

  .dashboard-text p {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary, #4b5563);
    margin: 0;
    line-height: var(--font-lineHeight-normal, 1.5);
  }

  .info-item {
    display: flex;
    flex-direction: column;
    gap: var(--size-space-1, 0.25rem);
  }

  .info-label {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-secondary, #374151);
  }

  .info-value {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary, #4b5563);
    font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  }


  /* Loading State */
  .loading-state {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 300px;
  }

  .loading-state .card {
    text-align: center;
    max-width: 300px;
  }

  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--color-border-default, #e5e7eb);
    border-top: 3px solid var(--color-brand-primary, #0066cc);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto var(--size-space-4, 1rem);
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Footer */
  .demo-footer {
    background: var(--color-bg-primary, #ffffff);
    border-top: 1px solid var(--color-border-default, #e5e7eb);
    padding: var(--size-space-8, 2rem) 0;
  }

  .footer-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--size-space-6, 1.5rem);
  }

  .footer-info p {
    margin: 0;
    color: var(--color-text-secondary, #4b5563);
  }

  .footer-meta {
    font-size: var(--font-size-sm);
    color: var(--color-text-3, #6b7280);
  }

  .footer-links {
    display: flex;
    gap: var(--size-space-4, 1rem);
  }

  .footer-links a {
    color: var(--color-brand-primary, #0066cc);
    text-decoration: none;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
  }

  .footer-links a:hover {
    text-decoration: underline;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .header-content {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--size-space-4, 1rem);
    }

    .header-actions {
      align-self: stretch;
      justify-content: space-between;
    }

    .brand-info h1 {
      font-size: var(--font-size-3xl);
    }

    .demo-layout {
      grid-template-columns: 1fr;
      gap: var(--size-space-8, 2rem);
    }

    .info-grid {
      grid-template-columns: 1fr;
    }

    .dashboard-content {
      grid-template-columns: 1fr;
    }

    .footer-content {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--size-space-4, 1rem);
    }
  }

  /* Container */
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 var(--size-space-6, 1.5rem);
  }
</style>