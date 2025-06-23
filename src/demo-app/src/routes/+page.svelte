<script>
  import { onMount } from 'svelte';
  import { SignInForm, createAuthStore } from '@thepia/flows-auth';
  
  // Demo configuration
  const authConfig = {
    apiBaseUrl: 'https://api.demo.thepia.com',
    clientId: 'demo-flows-auth',
    domain: 'demo.thepia.com',
    enablePasskeys: true,
    enableMagicLinks: true,
    enablePasswordLogin: true,
    branding: {
      companyName: 'Demo Company',
      logoUrl: '/logo.svg',
      primaryColor: '#3b82f6',
      secondaryColor: '#1f2937',
      showPoweredBy: true
    }
  };
  
  // Create auth store
  const auth = createAuthStore(authConfig);
  
  let currentUser = null;
  let authState = 'signed-out';
  let showAuthForm = false;
  
  // Subscribe to auth state changes
  onMount(() => {
    const unsubscribe = auth.subscribe(($auth) => {
      currentUser = $auth.user;
      authState = $auth.state;
      console.log('Auth state changed:', $auth);
    });
    
    return unsubscribe;
  });
  
  function handleAuthSuccess(event) {
    console.log('Authentication successful:', event.detail);
    showAuthForm = false;
  }
  
  function handleAuthError(event) {
    console.error('Authentication error:', event.detail);
  }
  
  function handleStateChange(event) {
    console.log('Auth state change:', event.detail);
  }
  
  async function signOut() {
    try {
      await auth.signOut();
      console.log('Signed out successfully');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }
</script>

<div class="demo-container">
  <div class="demo-section">
    <h2>Authentication Demo</h2>
    <p>This demo showcases the @thepia/flows-auth library with WebAuthn/passkey support.</p>
    
    <div class="auth-status">
      <h3>Current Status</h3>
      <div class="status-card">
        <div class="status-indicator" class:signed-in={currentUser} class:signed-out={!currentUser}></div>
        <div class="status-info">
          <p><strong>State:</strong> {authState}</p>
          {#if currentUser}
            <p><strong>User:</strong> {currentUser.email || 'Unknown'}</p>
            <p><strong>ID:</strong> {currentUser.id || 'N/A'}</p>
          {:else}
            <p>Not authenticated</p>
          {/if}
        </div>
      </div>
    </div>
    
    <div class="demo-actions">
      {#if !currentUser}
        <button 
          class="btn btn-primary" 
          on:click={() => showAuthForm = !showAuthForm}
        >
          {showAuthForm ? 'Hide' : 'Show'} Authentication Form
        </button>
      {:else}
        <button class="btn btn-secondary" on:click={signOut}>
          Sign Out
        </button>
      {/if}
    </div>
    
    {#if showAuthForm && !currentUser}
      <div class="auth-form-container">
        <h3>Sign In</h3>
        <SignInForm 
          config={authConfig}
          showLogo={true}
          compact={false}
          on:success={handleAuthSuccess}
          on:error={handleAuthError}
          on:stateChange={handleStateChange}
        />
      </div>
    {/if}
  </div>
  
  <div class="demo-section">
    <h2>Features</h2>
    <div class="features-grid">
      <div class="feature-card">
        <h4>🔐 WebAuthn/Passkeys</h4>
        <p>Secure, passwordless authentication using modern WebAuthn standards.</p>
      </div>
      <div class="feature-card">
        <h4>🎨 Whitelabel Ready</h4>
        <p>Complete branding and theming system for custom applications.</p>
      </div>
      <div class="feature-card">
        <h4>🔄 Multi-step Flow</h4>
        <p>Email → Passkey/Password/Magic Link authentication flow.</p>
      </div>
      <div class="feature-card">
        <h4>📱 Mobile Optimized</h4>
        <p>Works seamlessly on all devices and screen sizes.</p>
      </div>
      <div class="feature-card">
        <h4>🧪 Fully Tested</h4>
        <p>Comprehensive test coverage with Vitest and integration tests.</p>
      </div>
      <div class="feature-card">
        <h4>📦 Tree Shakeable</h4>
        <p>Import only what you need for optimal bundle size.</p>
      </div>
    </div>
  </div>
  
  <div class="demo-section">
    <h2>Configuration</h2>
    <div class="config-display">
      <pre><code>{JSON.stringify(authConfig, null, 2)}</code></pre>
    </div>
  </div>
</div>

<style>
  .demo-container {
    max-width: 800px;
    margin: 0 auto;
  }
  
  .demo-section {
    margin-bottom: 3rem;
  }
  
  .demo-section h2 {
    font-size: 1.875rem;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 1rem;
  }
  
  .demo-section h3 {
    font-size: 1.5rem;
    font-weight: 600;
    color: #374151;
    margin-bottom: 1rem;
  }
  
  .auth-status {
    margin: 2rem 0;
  }
  
  .status-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    background: #f9fafb;
  }
  
  .status-indicator {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  
  .status-indicator.signed-in {
    background-color: #10b981;
  }
  
  .status-indicator.signed-out {
    background-color: #ef4444;
  }
  
  .status-info p {
    margin: 0.25rem 0;
    font-size: 0.875rem;
  }
  
  .demo-actions {
    margin: 2rem 0;
  }
  
  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 0.375rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .btn-primary {
    background-color: #3b82f6;
    color: white;
  }
  
  .btn-primary:hover {
    background-color: #2563eb;
  }
  
  .btn-secondary {
    background-color: #6b7280;
    color: white;
  }
  
  .btn-secondary:hover {
    background-color: #4b5563;
  }
  
  .auth-form-container {
    margin: 2rem 0;
    padding: 2rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    background: white;
  }
  
  .features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin: 2rem 0;
  }
  
  .feature-card {
    padding: 1.5rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    background: white;
  }
  
  .feature-card h4 {
    font-size: 1.125rem;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 0.5rem;
  }
  
  .feature-card p {
    color: #6b7280;
    font-size: 0.875rem;
    margin: 0;
  }
  
  .config-display {
    margin: 1rem 0;
  }
  
  .config-display pre {
    background: #f3f4f6;
    padding: 1rem;
    border-radius: 0.375rem;
    overflow-x: auto;
    font-size: 0.875rem;
  }
  
  .config-display code {
    color: #374151;
  }
</style>
