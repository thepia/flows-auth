<script>
import { browser } from '$app/environment';
import { onMount, getContext } from 'svelte';
import { ChevronRight, User, Mail, Key, Shield, Activity, Settings } from 'lucide-svelte';

// Get auth store and config from context
const authStoreContainer = getContext('authStore');
const authConfigContainer = getContext('authConfig');

// Component state
let authStore = null;
let authConfig = null;
let currentUser = null;
let isAuthenticated = false;
let authState = 'loading';
let stateMachineState = null;
let stateMachineContext = null;

// Demo controls
let selectedDemo = 'overview';
let emailInput = '';
let testEmail = 'demo@acme.corp';

// Available demo sections
const demoSections = [
  { id: 'overview', title: 'Overview', icon: Activity },
  { id: 'signin', title: 'Sign In Flow', icon: User },
  { id: 'register', title: 'Registration', icon: Mail },
  { id: 'passkey', title: 'Passkey Auth', icon: Key },
  { id: 'state-machine', title: 'State Machine', icon: Settings },
];

onMount(async () => {
  if (!browser) return;
  
  console.log('🎯 Demo page initializing...');
  
  // Wait for auth store to be available from context
  const unsubscribeStore = authStoreContainer.subscribe((store) => {
    if (store) {
      authStore = store;
      console.log('🔐 Auth store received in demo page');
      
      // Subscribe to auth state changes
      authStore.subscribe((state) => {
        isAuthenticated = state.state === 'authenticated';
        currentUser = state.user;
        authState = state.state;
        console.log('📊 Auth state update:', { state: state.state, user: !!state.user });
      });
      
      // Subscribe to state machine updates if available
      if (authStore.stateMachine) {
        authStore.stateMachine.subscribe((sm) => {
          stateMachineState = sm.state;
          stateMachineContext = sm.context;
          console.log('🔧 State machine update:', { state: sm.state });
        });
      }
      
      unsubscribeStore();
    }
  });
  
  // Wait for auth config
  const unsubscribeConfig = authConfigContainer.subscribe((config) => {
    if (config) {
      authConfig = config;
      console.log('⚙️ Auth config received in demo page');
      unsubscribeConfig();
    }
  });
});

// Demo actions
async function testSignIn() {
  if (!authStore || !emailInput.trim()) return;
  
  try {
    console.log('🧪 Testing sign in with:', emailInput);
    const result = await authStore.signIn(emailInput);
    console.log('✅ Sign in result:', result);
  } catch (error) {
    console.error('❌ Sign in failed:', error);
  }
}

async function testPasskeySignIn() {
  if (!authStore || !emailInput.trim()) return;
  
  try {
    console.log('🔑 Testing passkey sign in with:', emailInput);
    const result = await authStore.signInWithPasskey(emailInput);
    console.log('✅ Passkey sign in result:', result);
  } catch (error) {
    console.error('❌ Passkey sign in failed:', error);
  }
}

async function testRegister() {
  if (!authStore || !emailInput.trim()) return;
  
  try {
    console.log('📝 Checking email for registration flow:', emailInput);
    
    // First check if user already exists and their email verification status
    const userCheck = await authStore.checkUser(emailInput);
    console.log('🔍 User check result:', userCheck);
    
    if (userCheck.exists) {
      console.log('👤 User already exists');
      
      if (userCheck.emailVerified === false) {
        console.log('📧 Email not verified - sending verification email');
        await sendVerificationEmail();
        return;
      } else if (!userCheck.hasWebAuthn) {
        console.log('🔑 Email verified but no passkey - proceeding to passkey registration');
        await registerPasskey();
        return;
      } else {
        console.log('✅ User has verified email and passkey - can sign in');
        console.error('⚠️ User already has an account with passkey. Please use Sign In instead.');
        return;
      }
    } else {
      console.log('🆕 New user - creating account first');
      // Use createAccount for complete registration with passkey
      const result = await authStore.createAccount({
        email: emailInput,
        firstName: 'Demo',
        lastName: 'User',
        acceptedTerms: true,
        acceptedPrivacy: true,
      });
      console.log('✅ Full registration with passkey complete:', result);
      console.log('🔐 User is now authenticated with passkey!');
    }
  } catch (error) {
    console.error('❌ Registration failed:', error);
    
    // Provide helpful error messages
    if (error.message?.includes('NotAllowedError')) {
      console.error('💡 Tip: You cancelled the passkey creation. Try again and accept the prompt.');
    } else if (error.message?.includes('NotSupportedError')) {
      console.error('💡 Tip: Your device doesn\'t support passkeys. Try a different device.');
    } else if (error.message?.includes('already exists')) {
      console.error('💡 Tip: This email is already registered. Try signing in instead.');
    }
  }
}

async function sendVerificationEmail() {
  if (!authStore || !emailInput.trim()) return;
  
  try {
    console.log('📧 Sending verification email to:', emailInput);
    const result = await authStore.api.sendVerificationEmail(emailInput);
    
    if (result.success) {
      console.log('✅ Verification email sent:', result.message);
      if (result.alreadyVerified) {
        console.log('✅ Email was already verified, proceeding to passkey setup');
        await registerPasskey();
      } else {
        console.log('📬 Please check your email and click the verification link, then try registering again.');
      }
    } else {
      console.error('❌ Failed to send verification email:', result.message);
    }
  } catch (error) {
    console.error('❌ Error sending verification email:', error);
  }
}

async function registerPasskey() {
  if (!authStore || !emailInput.trim()) return;
  
  try {
    console.log('🔑 Starting passkey registration for verified user:', emailInput);
    
    // For existing verified users, we need to use the appropriate method to add a passkey
    // This would typically involve calling the passkey registration flow
    const result = await authStore.createAccount({
      email: emailInput,
      firstName: 'Demo',
      lastName: 'User',
      acceptedTerms: true,
      acceptedPrivacy: true,
    });
    
    console.log('✅ Passkey registration complete:', result);
    console.log('🔐 User is now authenticated with passkey!');
  } catch (error) {
    console.error('❌ Passkey registration failed:', error);
  }
}

async function testSignOut() {
  if (!authStore) return;
  
  try {
    console.log('👋 Testing sign out');
    await authStore.signOut();
    console.log('✅ Sign out successful');
  } catch (error) {
    console.error('❌ Sign out failed:', error);
  }
}

function setTestEmail(email) {
  emailInput = email;
}

function selectDemo(sectionId) {
  selectedDemo = sectionId;
}
</script>

<div class="demo-container">
  <!-- Hero Section -->
  <div class="hero">
    <h1 class="hero-title">
      <span class="brand-accent">Flows Auth</span> Demo
    </h1>
    <p class="hero-subtitle">
      Comprehensive demonstration of authentication flows, state machine, and branded components
    </p>
    
    <!-- Auth Status Card -->
    <div class="auth-status-card card">
      <div class="card-body">
        <div class="status-row">
          <div class="status-info">
            <div class="status-indicator {authState}">
              <span class="status-dot"></span>
              <span class="status-text">
                {#if isAuthenticated}
                  Authenticated as {currentUser?.email || 'Unknown'}
                {:else if authState === 'loading'}
                  Initializing...
                {:else}
                  Not authenticated
                {/if}
              </span>
            </div>
            {#if authConfig}
              <div class="config-info">
                <span class="brand-badge">{authConfig.branding?.companyName || 'Default'}</span>
                <span class="domain-badge">{authConfig.domain}</span>
              </div>
            {/if}
          </div>
          {#if isAuthenticated}
            <button class="btn btn-outline btn-sm" on:click={testSignOut}>
              Sign Out
            </button>
          {/if}
        </div>
      </div>
    </div>
  </div>

  <!-- Demo Navigation -->
  <div class="demo-nav">
    {#each demoSections as section (section.id)}
      <button 
        class="nav-item" 
        class:active={selectedDemo === section.id}
        on:click={() => selectDemo(section.id)}
      >
        <svelte:component this={section.icon} size={20} />
        <span>{section.title}</span>
        <ChevronRight size={16} class="nav-arrow" />
      </button>
    {/each}
  </div>

  <!-- Demo Content -->
  <div class="demo-content">
    
    {#if selectedDemo === 'overview'}
      <div class="content-section">
        <h2>Authentication Demo Overview</h2>
        <p>This demo showcases the flows-auth library capabilities:</p>
        
        <div class="feature-grid">
          <div class="feature-card">
            <Shield size={32} class="feature-icon" />
            <h3>Passwordless Authentication</h3>
            <p>WebAuthn passkeys and magic link authentication</p>
          </div>
          <div class="feature-card">
            <User size={32} class="feature-icon" />
            <h3>User Registration</h3>
            <p>Complete registration flow with email verification</p>
          </div>
          <div class="feature-card">
            <Activity size={32} class="feature-icon" />
            <h3>State Machine</h3>
            <p>XState-inspired authentication state management</p>
          </div>
          <div class="feature-card">
            <Settings size={32} class="feature-icon" />
            <h3>Branded Components</h3>
            <p>White-label ready with configurable branding</p>
          </div>
        </div>
        
        <div class="config-display card">
          <div class="card-header">
            <h3>Current Configuration</h3>
          </div>
          <div class="card-body">
            {#if authConfig}
              <pre class="config-json">{JSON.stringify(authConfig, null, 2)}</pre>
            {:else}
              <p>Loading configuration...</p>
            {/if}
          </div>
        </div>
      </div>
    
    {:else if selectedDemo === 'signin'}
      <div class="content-section">
        <h2>Sign In Flow Demo</h2>
        <p>Test different sign-in methods with the branded SignInForm component:</p>
        
        <div class="demo-controls">
          <div class="input-group">
            <label for="email">Email Address</label>
            <input 
              id="email" 
              type="email" 
              bind:value={emailInput}
              placeholder="Enter email to test..." 
              class="form-input"
            />
          </div>
          
          <div class="quick-emails">
            <span>Quick test emails:</span>
            <button class="btn btn-outline btn-sm" on:click={() => setTestEmail('demo@acme.corp')}>
              demo@acme.corp
            </button>
            <button class="btn btn-outline btn-sm" on:click={() => setTestEmail('test@example.com')}>
              test@example.com
            </button>
          </div>
          
          <div class="action-buttons">
            <button class="btn btn-primary" on:click={testSignIn} disabled={!emailInput.trim()}>
              <Mail size={16} />
              Test Sign In
            </button>
            <button class="btn btn-secondary" on:click={testPasskeySignIn} disabled={!emailInput.trim()}>
              <Key size={16} />
              Test Passkey
            </button>
          </div>
        </div>
        
        <!-- Embedded SignInForm Component -->
        {#if authStore && authConfig && !isAuthenticated}
          <div class="signin-demo card">
            <div class="card-header">
              <h3>Live SignInForm Component</h3>
              <p class="text-secondary">This is the actual branded component:</p>
            </div>
            <div class="card-body">
              <!-- We'll add the SignInForm component here -->
              <div class="signin-placeholder">
                <p>SignInForm component will be rendered here</p>
                <p class="text-muted">Using config: {authConfig.branding?.companyName}</p>
              </div>
            </div>
          </div>
        {/if}
      </div>
    
    {:else if selectedDemo === 'register'}
      <div class="content-section">
        <h2>Registration Flow Demo</h2>
        <p>Test the complete email verification and registration flow:</p>
        
        <div class="demo-controls">
          <div class="input-group">
            <label for="reg-email">Email Address for New Account</label>
            <input 
              id="reg-email" 
              type="email" 
              bind:value={emailInput}
              placeholder="Enter new email for registration..." 
              class="form-input"
            />
          </div>
          
          <div class="action-buttons">
            <button class="btn btn-primary" on:click={testRegister} disabled={!emailInput.trim() || isAuthenticated}>
              <User size={16} />
              Register with Email Verification
            </button>
            <button class="btn btn-secondary" on:click={sendVerificationEmail} disabled={!emailInput.trim()}>
              <Mail size={16} />
              Send Verification Email
            </button>
          </div>
        </div>
        
        <div class="info-card card">
          <div class="card-body">
            <h4>What This Button Does (Email Verification Flow):</h4>
            <ol>
              <li><strong>Checks if email exists</strong> and its verification status</li>
              <li><strong>New users:</strong> Creates account and proceeds to passkey setup</li>
              <li><strong>Existing users with unverified email:</strong> Sends verification email</li>
              <li><strong>Existing users with verified email but no passkey:</strong> Registers passkey</li>
              <li><strong>Existing users with passkey:</strong> Prompts to use Sign In instead</li>
            </ol>
            
            <div class="alert alert-info" style="margin-top: 1rem;">
              <strong>Note:</strong> This demonstrates the proper registration flow that handles email verification requirements and prevents duplicate accounts.
            </div>
            
            {#if !window?.PublicKeyCredential}
              <div class="alert alert-warning" style="margin-top: 1rem;">
                <strong>Warning:</strong> Your browser doesn't support WebAuthn/Passkeys. Registration may fail.
              </div>
            {/if}
          </div>
        </div>
      </div>
    
    {:else if selectedDemo === 'passkey'}
      <div class="content-section">
        <h2>Passkey Authentication Demo</h2>
        <p>Test WebAuthn passkey authentication flows:</p>
        
        <div class="passkey-info card">
          <div class="card-body">
            <h4>Passkey Requirements</h4>
            <ul>
              <li>HTTPS connection (✅ Current: {window?.location?.protocol === 'https:' ? 'Secure' : 'Insecure'})</li>
              <li>WebAuthn support (✅ {typeof PublicKeyCredential !== 'undefined' ? 'Supported' : 'Not supported'})</li>
              <li>Domain: {authConfig?.domain || 'Loading...'}</li>
              <li>Registered passkeys for this domain</li>
            </ul>
          </div>
        </div>
        
        <div class="demo-controls">
          <div class="input-group">
            <label for="passkey-email">Email with Passkey</label>
            <input 
              id="passkey-email" 
              type="email" 
              bind:value={emailInput}
              placeholder="Enter email with existing passkey..." 
              class="form-input"
            />
          </div>
          
          <div class="action-buttons">
            <button class="btn btn-primary" on:click={testPasskeySignIn} disabled={!emailInput.trim()}>
              <Key size={16} />
              Authenticate with Passkey
            </button>
          </div>
        </div>
        
        <div class="passkey-tips card">
          <div class="card-body">
            <h4>Tips for Testing Passkeys</h4>
            <ul>
              <li>Use Chrome/Edge with Windows Hello or macOS Safari with Touch ID</li>
              <li>Register a passkey first using the registration flow</li>
              <li>Make sure the domain matches your registered passkey domain</li>
            </ul>
          </div>
        </div>
      </div>
    
    {:else if selectedDemo === 'state-machine'}
      <div class="content-section">
        <h2>Authentication State Machine</h2>
        <p>Monitor the internal state machine that drives authentication flows:</p>
        
        <div class="state-display grid grid-cols-2 gap-4">
          <div class="state-card card">
            <div class="card-header">
              <h4>Current State</h4>
            </div>
            <div class="card-body">
              <div class="state-value">
                {stateMachineState || authState || 'loading'}
              </div>
            </div>
          </div>
          
          <div class="context-card card">
            <div class="card-header">
              <h4>Context</h4>
            </div>
            <div class="card-body">
              <pre class="context-json">
                {JSON.stringify(stateMachineContext || { state: authState }, null, 2)}
              </pre>
            </div>
          </div>
        </div>
        
        <div class="state-info card">
          <div class="card-body">
            <h4>State Machine Flow</h4>
            <p>The authentication state machine manages these key states:</p>
            <ul>
              <li><code>checkingSession</code> - Initial session validation</li>
              <li><code>sessionValid</code> - Existing valid session found</li>
              <li><code>sessionInvalid</code> - No valid session, needs authentication</li>
              <li><code>combinedAuth</code> - Combined authentication form</li>
              <li><code>conditionalMediation</code> - Passkey auto-discovery</li>
              <li><code>biometricPrompt</code> - WebAuthn authentication</li>
              <li><code>sessionCreated</code> - New session established</li>
              <li><code>appLoaded</code> - Authentication complete</li>
            </ul>
          </div>
        </div>
      </div>
    {/if}
    
  </div>
</div>

<style>
  .demo-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1rem;
  }
  
  .hero {
    text-align: center;
    margin-bottom: 3rem;
  }
  
  .hero-title {
    font-size: 3rem;
    font-weight: 700;
    margin-bottom: 1rem;
    background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  .brand-accent {
    color: var(--primary-color);
  }
  
  .hero-subtitle {
    font-size: 1.25rem;
    color: var(--text-secondary);
    margin-bottom: 2rem;
  }
  
  .auth-status-card {
    max-width: 600px;
    margin: 0 auto;
  }
  
  .status-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .status-info {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .status-indicator {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-weight: 500;
  }
  
  .status-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--error-color);
    transition: background 0.3s;
  }
  
  .status-indicator.authenticated .status-dot {
    background: var(--success-color);
  }
  
  .status-indicator.loading .status-dot {
    background: var(--warning-color);
    animation: pulse 2s infinite;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  
  .config-info {
    display: flex;
    gap: 0.5rem;
  }
  
  .brand-badge, .domain-badge {
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.8rem;
    font-weight: 500;
  }
  
  .brand-badge {
    background: var(--primary-color);
    color: white;
  }
  
  .domain-badge {
    background: var(--background-muted);
    color: var(--text-secondary);
  }
  
  .demo-nav {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 1rem;
    overflow-x: auto;
  }
  
  .nav-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border: none;
    background: transparent;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
    color: var(--text-secondary);
  }
  
  .nav-item:hover {
    background: var(--background-muted);
    color: var(--text-primary);
  }
  
  .nav-item.active {
    background: var(--primary-color);
    color: white;
  }
  
  .nav-arrow {
    opacity: 0.5;
    transition: transform 0.2s;
  }
  
  .nav-item.active .nav-arrow {
    transform: rotate(90deg);
  }
  
  .content-section {
    margin-bottom: 2rem;
  }
  
  .content-section h2 {
    color: var(--primary-color);
    margin-bottom: 0.5rem;
  }
  
  .content-section p {
    color: var(--text-secondary);
    margin-bottom: 2rem;
  }
  
  .feature-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }
  
  .feature-card {
    padding: 1.5rem;
    border-radius: var(--radius);
    border: 1px solid var(--border-color);
    background: var(--background-primary);
    text-align: center;
  }
  
  .feature-icon {
    color: var(--primary-color);
    margin-bottom: 1rem;
  }
  
  .feature-card h3 {
    margin-bottom: 0.5rem;
    font-size: 1.125rem;
  }
  
  .feature-card p {
    color: var(--text-secondary);
    font-size: 0.9rem;
    margin: 0;
  }
  
  .config-display, .info-card, .passkey-info, .passkey-tips, .state-info {
    margin-bottom: 2rem;
  }
  
  .config-json, .context-json {
    background: var(--background-muted);
    padding: 1rem;
    border-radius: var(--radius-sm);
    overflow-x: auto;
    font-size: 0.85rem;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    margin: 0;
  }
  
  .demo-controls {
    background: var(--background-primary);
    padding: 1.5rem;
    border-radius: var(--radius);
    border: 1px solid var(--border-color);
    margin-bottom: 2rem;
  }
  
  .input-group {
    margin-bottom: 1rem;
  }
  
  .input-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: var(--text-primary);
  }
  
  .form-input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    font-size: 1rem;
    transition: border-color 0.2s;
  }
  
  .form-input:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }
  
  .quick-emails {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
    font-size: 0.9rem;
  }
  
  .quick-emails span {
    color: var(--text-secondary);
  }
  
  .action-buttons {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }
  
  .signin-demo, .signin-placeholder {
    margin-bottom: 2rem;
  }
  
  .signin-placeholder {
    padding: 2rem;
    text-align: center;
    background: var(--background-muted);
    border-radius: var(--radius-sm);
    border: 2px dashed var(--border-color);
  }
  
  .state-display {
    margin-bottom: 2rem;
  }
  
  .state-value {
    font-size: 1.5rem;
    font-weight: 600;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    color: var(--primary-color);
    text-align: center;
    padding: 1rem;
    background: var(--background-muted);
    border-radius: var(--radius-sm);
  }
  
  @media (max-width: 768px) {
    .hero-title {
      font-size: 2rem;
    }
    
    .demo-nav {
      flex-direction: column;
    }
    
    .status-row {
      flex-direction: column;
      align-items: stretch;
      gap: 1rem;
    }
    
    .action-buttons {
      flex-direction: column;
    }
  }
</style>