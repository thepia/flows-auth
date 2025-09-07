<script lang="ts">
  import { browser } from '$app/environment';
  import AccountIcon from '$lib/components/AccountIcon.svelte';
  import AuthModalManager from '$lib/components/AuthModalManager.svelte';
  import DevSidebar from '$lib/components/DevSidebar.svelte';
  import { devScenarioManager, type DevScenario } from '$lib/dev/scenarios.js';
  import type { User } from '@thepia/flows-auth';
  import { onMount } from 'svelte';
  
  let currentScenario: DevScenario;
  let currentUser: User | null = null;
  let unsubscribe: (() => void) | null = null;
  
  onMount(() => {
    if (!browser) return;
    
    // Initialize with current scenario
    currentScenario = devScenarioManager.getCurrentScenario();
    
    // Subscribe to scenario changes
    unsubscribe = devScenarioManager.subscribe((scenario) => {
      currentScenario = scenario;
    });
    
    // Listen for auth events
    const handleAuthSuccess = (event: CustomEvent) => {
      currentUser = event.detail.user;
    };
    
    const handleAuthSignOut = () => {
      currentUser = null;
    };
    
    window.addEventListener('auth:success', handleAuthSuccess as EventListener);
    window.addEventListener('auth:signout', handleAuthSignOut as EventListener);
    
    // Check initial auth state
    checkInitialAuthState();
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      window.removeEventListener('auth:success', handleAuthSuccess as EventListener);
      window.removeEventListener('auth:signout', handleAuthSignOut as EventListener);
    };
  });
  
  function checkInitialAuthState() {
    if (!browser) return;
    
    try {
      const token = localStorage.getItem('auth_access_token');
      const userStr = localStorage.getItem('auth_user');
      
      if (token && userStr) {
        currentUser = JSON.parse(userStr);
      }
    } catch (error) {
      console.error('Error checking initial auth state:', error);
    }
  }

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
              <span class="method-badge" class:enabled={currentScenario.config.enableMagicPins}>Magic Link</span>
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
                    <li class="feature-item" class:enabled={currentScenario.config.enableMagicPins}>
                      <span class="feature-icon">{currentScenario.config.enableMagicPins ? '✅' : '❌'}</span>
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
                    class="cta-button"
                    on:click={() => handleOpenAuth({ detail: {} })}
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
    background: var(--gray-50);
    font-family: var(--font-family-brand);
    color: var(--gray-900);
  }

  .demo-header {
    background: var(--white);
    border-bottom: 1px solid var(--gray-200);
    padding: var(--spacing-8) 0;
  }

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--spacing-6);
  }

  .brand-logo-section {
    display: flex;
    align-items: center;
    gap: var(--spacing-4);
  }

  .brand-logo {
    height: 48px;
    width: auto;
  }

  .brand-text h1 {
    font-size: var(--font-size-4xl);
    font-weight: var(--font-weight-bold);
    color: var(--primary);
    margin-bottom: var(--spacing-2);
    line-height: var(--line-height-tight);
    margin: 0 0 var(--spacing-1) 0;
  }

  .brand-text p {
    color: var(--gray-600);
    font-size: var(--font-size-lg);
    margin: 0;
  }

  .auth-methods {
    display: flex;
    gap: var(--spacing-2);
    flex-wrap: wrap;
  }

  .method-badge {
    padding: var(--spacing-1) var(--spacing-3);
    border-radius: var(--radius-full);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    background: var(--color-gray-100);
    color: var(--color-gray-500);
    border: var(--border-width) solid var(--color-gray-200);
  }

  .method-badge.enabled {
    background: var(--brand-primary-light);
    color: var(--brand-primary);
    border-color: var(--brand-primary);
  }

  .demo-main {
    flex: 1;
    padding: var(--spacing-12) 0;
  }

  .demo-layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-12);
    align-items: start;
  }

  .card {
    background: var(--color-white);
    border: var(--border-width) solid var(--color-gray-200);
    border-radius: var(--radius-xl);
    padding: var(--spacing-8);
    box-shadow: var(--shadow-sm);
  }

  .info-card {
    height: fit-content;
  }

  .info-card h2 {
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-gray-900);
    margin-bottom: var(--spacing-4);
  }

  .info-card > p {
    color: var(--color-gray-600);
    margin-bottom: var(--spacing-6);
    line-height: var(--line-height-relaxed);
  }

  .config-summary, .features-list {
    margin-bottom: var(--spacing-6);
  }

  .config-summary h3, .features-list h3 {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--color-gray-800);
    margin-bottom: var(--spacing-3);
  }

  .config-grid {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }

  .config-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-2) 0;
    border-bottom: var(--border-width) solid var(--color-gray-100);
  }

  .config-item:last-child {
    border-bottom: none;
  }

  .config-label {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-gray-700);
  }

  .config-value {
    font-size: var(--font-size-sm);
    color: var(--color-gray-600);
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
    gap: var(--spacing-3);
    padding: var(--spacing-2) 0;
    font-size: var(--font-size-sm);
    color: var(--color-gray-600);
  }

  .feature-item.enabled {
    color: var(--color-gray-800);
  }

  .feature-icon {
    font-size: var(--font-size-base);
  }


  /* Authenticated State */
  .auth-success {
    max-width: 600px;
    margin: 0 auto;
  }

  .success-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-4);
    margin-bottom: var(--spacing-4);
  }

  .success-icon {
    font-size: var(--font-size-4xl);
  }

  .success-header h2 {
    font-size: var(--font-size-3xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-gray-900);
    margin: 0;
  }

  .auth-success .welcome-message {
    color: var(--color-gray-600);
    font-size: var(--font-size-lg);
    margin-bottom: var(--spacing-6);
    text-align: center;
  }

  .user-info {
    background: var(--color-gray-50);
    padding: var(--spacing-6);
    border-radius: var(--radius-lg);
    margin-bottom: var(--spacing-6);
  }

  .user-info h3 {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--color-gray-800);
    margin-bottom: var(--spacing-4);
  }

  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-4);
  }

  .dashboard-preview {
    background: var(--color-gray-50);
    padding: var(--spacing-6);
    border-radius: var(--radius-lg);
    margin-top: var(--spacing-6);
  }

  .dashboard-preview h3 {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--color-gray-800);
    margin-bottom: var(--spacing-3);
  }

  .dashboard-preview > p {
    color: var(--color-gray-600);
    margin-bottom: var(--spacing-6);
  }

  .dashboard-content {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--spacing-4);
  }

  .dashboard-item {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-3);
    padding: var(--spacing-4);
    background: var(--color-white);
    border: var(--border-width) solid var(--color-gray-200);
    border-radius: var(--radius-lg);
    transition: all var(--transition-fast);
  }

  .dashboard-item:hover {
    border-color: var(--brand-primary);
    box-shadow: var(--shadow-sm);
  }

  .dashboard-icon {
    font-size: var(--font-size-2xl);
    flex-shrink: 0;
  }

  .dashboard-text h4 {
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-medium);
    color: var(--color-gray-900);
    margin-bottom: var(--spacing-1);
  }

  .dashboard-text p {
    font-size: var(--font-size-sm);
    color: var(--color-gray-600);
    margin: 0;
    line-height: var(--line-height-normal);
  }

  .info-item {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }

  .info-label {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-gray-700);
  }

  .info-value {
    font-size: var(--font-size-sm);
    color: var(--color-gray-600);
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
    border: 3px solid var(--color-gray-200);
    border-top: 3px solid var(--brand-primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto var(--spacing-4);
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Footer */
  .demo-footer {
    background: var(--color-white);
    border-top: var(--border-width) solid var(--color-gray-200);
    padding: var(--spacing-8) 0;
  }

  .footer-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--spacing-6);
  }

  .footer-info p {
    margin: 0;
    color: var(--color-gray-600);
  }

  .footer-meta {
    font-size: var(--font-size-sm);
    color: var(--color-gray-500);
  }

  .footer-links {
    display: flex;
    gap: var(--spacing-4);
  }

  .footer-links a {
    color: var(--brand-primary);
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
      gap: var(--spacing-4);
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
      gap: var(--spacing-8);
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
      gap: var(--spacing-4);
    }
  }

  /* Container */
  .container {
    max-width: var(--size-container-xl);
    margin: 0 auto;
    padding: 0 var(--spacing-6);
  }
</style>