<script>
import { browser } from '$app/environment';
import { onMount, getContext } from 'svelte';
import { ChevronRight, User, Mail, Key, Shield, Activity, Settings } from 'lucide-svelte';
import { ErrorReportingStatus, AUTH_CONTEXT_KEY } from '@thepia/flows-auth';

// Paraglide i18n setup
import * as m from '../../paraglide/messages.js';

// ✅ RECEIVE AUTH STORE VIA CONTEXT (to avoid slot prop timing issues)  
export let isAuthenticated = false;
export let user = null;

// Auth store from context
let authStore = null;

// Component references for dynamic imports
let SessionStateMachineComponent = null;

// Registration state
let emailInput = '';
let testEmail = 'demo@example.com';
let currentDomain = 'dev.thepia.net';
let domainOptions = ['dev.thepia.net', 'thepia.net'];
let userStateResult = null;
let isCheckingState = false;
let registrationSuccess = '';
let invitationToken = '';

// Auth state tracking
let currentUser = null;
let authState = 'initial';
let signInState = 'emailEntry';
let stateMachineState = null;
let stateMachineContext = null;
let lastLoggedState = null;

// Auth config for display
let authConfig = null;

onMount(async () => {
  if (!browser) return;
  
  console.log('🎯 Registration page initializing...');
  
  try {
    // Single dynamic import for components
    const authModule = await import('@thepia/flows-auth');
    const { SessionStateMachineFlow } = authModule;
    
    // Set component variables
    SessionStateMachineComponent = SessionStateMachineFlow;
    
    console.log('✅ Registration components loaded');
    
    // Get auth store from context
    const authStoreContext = getContext(AUTH_CONTEXT_KEY);
    if (authStoreContext) {
      authStore = authStoreContext;
      authConfig = authStore.config;
      console.log('🔐 Auth store available from context');
      
      // Subscribe to auth state changes
      authStore.subscribe((state) => {
        currentUser = state.user;
        authState = state.state;
        console.log('📊 Auth state update:', { 
          state: state.state, 
          signInState: state.signInState,
          user: !!state.user 
        });
      });
      
      console.log('✅ Auth store subscriptions configured');
    } else {
      console.log('⏳ Auth store not yet available - will be provided by layout');
    }
    
    console.log('✅ Registration page initialization complete');
    
  } catch (error) {
    console.error('❌ Failed to initialize registration page:', error);
  }
});

// Helper functions
function hasValidPin(state) {
  return state.pin && state.pinExpiresAt && new Date(state.pinExpiresAt) > new Date();
}

function getPinTimeRemaining(state) {
  if (!hasValidPin(state)) return 0;
  return Math.max(0, Math.floor((new Date(state.pinExpiresAt) - new Date()) / 1000 / 60));
}

function getRecommendedAction(result) {
  if (!result) return 'check-state';
  if (!result.exists) return 'register-new';
  if (!result.emailVerified) return 'verify-email';
  if (!result.hasPasskey) return 'add-passkey';
  return 'use-signin';
}

// Registration functions
async function registerWithPasskey() {
  if (!authStore) {
    console.error('❌ Auth store not available');
    return;
  }

  try {
    console.log('🔐 Starting passkey registration...');
    
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

async function checkUserState() {
  if (!emailInput.trim()) {
    console.warn('⚠️ No email provided for state check');
    return;
  }

  if (!authStore) {
    console.error('❌ Auth store not available');
    return;
  }

  isCheckingState = true;
  userStateResult = null;
  registrationSuccess = '';

  try {
    console.log('🔍 Checking user state for:', emailInput);
    
    const result = await authStore.checkUserState(emailInput);
    
    console.log('✅ User state check complete:', result);
    userStateResult = result;
    
  } catch (error) {
    console.error('❌ Failed to check user state:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    userStateResult = {
      email: emailInput,
      exists: false,
      emailVerified: false,
      hasPasskey: false,
      error: error.message || 'Unknown error occurred'
    };
  } finally {
    isCheckingState = false;
  }
}

async function registerIndividualUser() {
  if (!authStore) {
    console.error('❌ Auth store not available');
    return;
  }

  try {
    console.log('👤 Starting individual user registration...');
    
    const result = await authStore.registerUser({
      email: userStateResult.email,
      firstName: 'Demo',
      lastName: 'User',
      acceptedTerms: true,
      acceptedPrivacy: true,
    });
    
    console.log('✅ Individual user registration complete:', result);
    registrationSuccess = result.message;
    
    // Refresh user state after a short delay
    setTimeout(() => {
      checkUserState();
    }, 1000);
    
  } catch (error) {
    console.error('❌ Individual user registration failed:', error);
  }
}

async function setupPasskeyForVerifiedUser() {
  if (!authStore) {
    console.error('❌ Auth store not available');
    return;
  }

  try {
    console.log('🔑 Setting up passkey for verified user...');
    
    const result = await authStore.createAccount({
      email: userStateResult.email,
      firstName: 'Demo',
      lastName: 'User',
      acceptedTerms: true,
      acceptedPrivacy: true,
    });
    
    console.log('✅ Passkey setup complete:', result);
    
    // Refresh user state
    await checkUserState();
    
  } catch (error) {
    console.error('❌ Passkey setup failed:', error);
  }
}

async function registerWithInvitation() {
  if (!authStore || !invitationToken.trim()) {
    console.error('❌ Auth store not available or no invitation token');
    return;
  }

  try {
    console.log('📧 Starting invitation registration...');
    
    const result = await authStore.createAccount({
      invitationToken: invitationToken,
      acceptedTerms: true,
      acceptedPrivacy: true,
    });
    
    console.log('✅ Invitation registration complete:', result);
    
    // Clear token and refresh state if email was extracted
    invitationToken = '';
    if (result.user?.email) {
      emailInput = result.user.email;
      await checkUserState();
    }
    
  } catch (error) {
    console.error('❌ Invitation registration failed:', error);
  }
}

async function updateDomain() {
  // Update the auth config with new domain
  // TODO use the store to modify the domain used for passkeys. Config cannot be edited directly.
  console.log('🌐 Domain updated to:', currentDomain);
}
</script>

<div class="demo-container">
  <!-- Demo Content -->
  <div class="demo-content">
    <div class="content-section">
      <h2>{m["register.page_title"]()}</h2>
      <p>{m["register.description"]()}</p>
      
      <!-- Debug Panel -->
      <div class="debug-panel card">
        <div class="card-header">
          <h3>Debug Information</h3>
        </div>
        <div class="card-body">
          <div class="debug-grid">
            <div class="debug-item">
              <span class="label">Auth State:</span>
              <span class="value">{authState}</span>
            </div>
            <div class="debug-item">
              <span class="label">Sign-In State:</span>
              <span class="value">{signInState}</span>
            </div>
            <div class="debug-item">
              <span class="label">Current User:</span>
              <span class="value">{currentUser?.email || 'None'}</span>
            </div>
            <div class="debug-item">
              <span class="label">Domain:</span>
              <span class="value">{currentDomain}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- User State Check -->
      <div class="state-check-card card">
        <div class="card-header">
          <h3>1. Check User State</h3>
        </div>
        <div class="card-body">
          <p>First, check if the user already exists and their verification status:</p>

          <div class="input-group">
            <label for="email-input">Email Address</label>
            <input
              id="email-input"
              type="email"
              bind:value={emailInput}
              placeholder="Enter email to check"
              class="form-input"
            />
          </div>

          <div class="quick-emails">
            <span>Quick test emails:</span>
            <button class="email-btn" on:click={() => emailInput = 'demo@example.com'}>demo@example.com</button>
            <button class="email-btn" on:click={() => emailInput = 'test@thepia.net'}>test@thepia.net</button>
            <button class="email-btn" on:click={() => emailInput = 'new@user.com'}>new@user.com</button>
          </div>

          <button
            class="btn btn-primary"
            on:click={checkUserState}
            disabled={isCheckingState || !emailInput.trim()}
          >
            {isCheckingState ? 'Checking...' : 'Check User State'}
          </button>

          {#if userStateResult}
            <div class="state-result">
              <h4>User State Result:</h4>

              {#if userStateResult.error}
                <!-- Error display -->
                <div class="state-grid">
                  <div class="state-item error">
                    <span class="label">Email:</span>
                    <span class="value">{userStateResult.email}</span>
                  </div>
                  <div class="error-section">
                    <strong>Error:</strong> {userStateResult.error}
                  </div>
                </div>
              {:else}
                <!-- Formatted display -->
                <div class="state-grid">
                  <div class="state-item">
                    <span class="label">Exists:</span>
                    <span class="value" class:exists={userStateResult.exists} class:not-exists={!userStateResult.exists}>
                      {userStateResult.exists ? '✅ Yes' : '❌ No'}
                    </span>
                  </div>
                  <div class="state-item">
                    <span class="label">Email Verified:</span>
                    <span class="value" class:verified={userStateResult.emailVerified} class:not-verified={!userStateResult.emailVerified}>
                      {userStateResult.emailVerified ? '✅ Yes' : '❌ No'}
                    </span>
                  </div>
                  <div class="state-item">
                    <span class="label">Has Passkey:</span>
                    <span class="value" class:has-passkey={userStateResult.hasPasskey} class:no-passkey={!userStateResult.hasPasskey}>
                      {userStateResult.hasPasskey ? '✅ Yes' : '❌ No'}
                    </span>
                  </div>
                </div>

                <!-- Recommended Action -->
                <div class="recommended-action">
                  <h5>Recommended Action:</h5>
                  {#if getRecommendedAction(userStateResult) === 'register-new'}
                    <button class="btn btn-primary" on:click={registerWithPasskey}>
                      <User size={16} />
                      Register New User with Passkey
                    </button>
                    <p class="action-note">User doesn't exist. Create new account with passkey.</p>
                  {:else if getRecommendedAction(userStateResult) === 'verify-email'}
                    <button class="btn btn-secondary" on:click={registerIndividualUser}>
                      <Mail size={16} />
                      Send Verification Email
                    </button>
                    <p class="action-note">User exists but email not verified. Send verification email first.</p>
                  {:else if getRecommendedAction(userStateResult) === 'add-passkey'}
                    <button class="btn btn-secondary" on:click={setupPasskeyForVerifiedUser}>
                      <Key size={16} />
                      Add Passkey to Verified Account
                    </button>
                    <p class="action-note">Email is verified but no passkey. Complete registration with passkey.</p>
                  {:else if getRecommendedAction(userStateResult) === 'use-signin'}
                    <a href="/signin" class="btn btn-secondary">
                      <Shield size={16} />
                      Go to Sign In
                    </a>
                    <p class="action-note">User is fully registered. Use sign-in flow instead of registration.</p>
                  {/if}
                </div>
              {/if}
            </div>
          {/if}

          {#if registrationSuccess}
            <div class="success-message">
              <strong>Success:</strong> {registrationSuccess}
            </div>
          {/if}
        </div>
      </div>

      <!-- Registration Flow Documentation -->
      <div class="flow-docs-card card">
        <div class="card-header">
          <h3>2. Registration Flow Documentation</h3>
        </div>
        <div class="card-body">
          <p>The registration system handles different user states automatically:</p>

          <div class="scenarios-grid">
            <div class="scenario-doc">
              <div class="scenario-header">
                <span class="scenario-badge new">NEW USER</span>
                <h4>Complete Registration</h4>
              </div>
              <p><strong>When:</strong> User doesn't exist in system</p>
              <p><strong>Flow:</strong> Email verification → Passkey setup → Complete</p>
            </div>

            <div class="scenario-doc">
              <div class="scenario-header">
                <span class="scenario-badge pending">UNVERIFIED</span>
                <h4>Email Verification Required</h4>
              </div>
              <p><strong>When:</strong> User exists but email not verified</p>
              <p><strong>Flow:</strong> Resend verification email → Email verification → Passkey setup → Complete</p>
            </div>

            <div class="scenario-doc">
              <div class="scenario-header">
                <span class="scenario-badge partial">NO PASSKEY</span>
                <h4>Passkey Setup Required</h4>
              </div>
              <p><strong>When:</strong> Email verified but no passkey registered</p>
              <p><strong>Flow:</strong> Skip email verification → Passkey setup → Complete</p>
            </div>

            <div class="scenario-doc">
              <div class="scenario-header">
                <span class="scenario-badge complete">COMPLETE</span>
                <h4>Already Registered</h4>
              </div>
              <p><strong>When:</strong> Email verified AND has passkey</p>
              <p><strong>Flow:</strong> Reject registration → Redirect to sign-in</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Invitation Registration -->
      <div class="invitation-card card">
        <div class="card-header">
          <h3>3. Invitation Token Registration</h3>
        </div>
        <div class="card-body">
          <p>Register using an invitation token (bypasses some verification steps):</p>

          <div class="input-group">
            <label for="invitation-token">Invitation Token</label>
            <input
              id="invitation-token"
              type="text"
              bind:value={invitationToken}
              placeholder="Paste invitation token here"
              class="form-input"
            />
          </div>

          <button
            class="btn btn-primary"
            on:click={registerWithInvitation}
            disabled={!invitationToken.trim()}
          >
            Register with Invitation
          </button>
        </div>
      </div>

      <div class="info-card card">
        <div class="card-body">
          <h4>Domain Configuration: {currentDomain}</h4>
          <p>Passkeys will be registered for this domain. Make sure it matches your testing environment.</p>

          {#if !window?.PublicKeyCredential}
            <div class="alert alert-warning" style="margin-top: 1rem;">
              <strong>Warning:</strong> Your browser doesn't support WebAuthn/Passkeys. Registration will fail.
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .demo-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1rem;
  }

  .demo-content {
    padding: 2rem 0;
  }

  .content-section {
    margin-bottom: 2rem;
  }

  .content-section h2 {
    color: var(--text-primary);
    margin-bottom: 1rem;
    font-size: 2rem;
    font-weight: 700;
  }

  .content-section p {
    color: var(--text-secondary);
    font-size: 1.1rem;
    line-height: 1.6;
    margin-bottom: 2rem;
  }

  /* Card styles */
  .card {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    margin-bottom: 2rem;
    overflow: hidden;
  }

  .card-header {
    background: var(--background-muted);
    padding: 1.5rem 2rem;
    border-bottom: 1px solid var(--border-color);
  }

  .card-header h3 {
    margin: 0;
    color: var(--text-primary);
    font-size: 1.25rem;
    font-weight: 600;
  }

  .card-body {
    padding: 2rem;
  }

  /* Debug panel */
  .debug-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .debug-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: var(--background-muted);
    border-radius: var(--radius-sm);
  }

  .debug-item .label {
    font-weight: 600;
    color: var(--text-secondary);
  }

  .debug-item .value {
    color: var(--text-primary);
    font-family: monospace;
  }

  /* Form styles */
  .input-group {
    margin-bottom: 1.5rem;
  }

  .input-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .form-input {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    background: var(--card-bg);
    color: var(--text-primary);
    font-size: 1rem;
    transition: border-color 0.2s ease;
  }

  .form-input:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px var(--primary-color-alpha);
  }

  /* Button styles */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    background: var(--card-bg);
    color: var(--text-primary);
    font-size: 1rem;
    font-weight: 500;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn:hover:not(:disabled) {
    background: var(--background-muted);
    border-color: var(--primary-color);
    transform: translateY(-1px);
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-primary {
    background: var(--primary-color);
    color: white;
    border-color: var(--primary-color);
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--primary-color-dark);
    border-color: var(--primary-color-dark);
    color: white;
  }

  .btn-secondary {
    background: var(--background-muted);
    border-color: var(--border-color);
  }

  /* Quick emails */
  .quick-emails {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
    margin-bottom: 1.5rem;
    font-size: 0.9rem;
  }

  .quick-emails span {
    color: var(--text-secondary);
  }

  .email-btn {
    padding: 0.25rem 0.5rem;
    background: var(--background-muted);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .email-btn:hover {
    background: var(--primary-color);
    color: white;
    border-color: var(--primary-color);
  }

  /* State results */
  .state-result {
    margin-top: 2rem;
    padding: 1.5rem;
    background: var(--background-muted);
    border-radius: var(--radius-sm);
  }

  .state-result h4 {
    margin: 0 0 1rem 0;
    color: var(--text-primary);
  }

  .state-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .state-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: var(--card-bg);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-color);
  }

  .state-item.error {
    border-color: var(--error-color);
    background: var(--error-bg);
  }

  .state-item .label {
    font-weight: 600;
    color: var(--text-secondary);
  }

  .state-item .value {
    font-weight: 600;
  }

  .state-item .value.exists,
  .state-item .value.verified,
  .state-item .value.has-passkey {
    color: var(--success-color);
  }

  .state-item .value.not-exists,
  .state-item .value.not-verified,
  .state-item .value.no-passkey {
    color: var(--error-color);
  }

  .error-section {
    grid-column: 1 / -1;
    padding: 1rem;
    background: var(--error-bg);
    border: 1px solid var(--error-color);
    border-radius: var(--radius-sm);
    color: var(--error-color);
  }

  /* Recommended action */
  .recommended-action {
    margin-top: 1.5rem;
    padding: 1.5rem;
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
  }

  .recommended-action h5 {
    margin: 0 0 1rem 0;
    color: var(--text-primary);
    font-size: 1.1rem;
  }

  .action-note {
    margin-top: 0.5rem;
    font-size: 0.9rem;
    color: var(--text-secondary);
    font-style: italic;
  }

  /* Success message */
  .success-message {
    margin-top: 1rem;
    padding: 1rem;
    background: var(--success-bg);
    border: 1px solid var(--success-color);
    border-radius: var(--radius-sm);
    color: var(--success-color);
  }

  /* Scenarios grid */
  .scenarios-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
    margin-top: 1.5rem;
  }

  .scenario-doc {
    padding: 1.5rem;
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
  }

  .scenario-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .scenario-badge {
    padding: 0.25rem 0.75rem;
    border-radius: var(--radius-sm);
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .scenario-badge.new {
    background: var(--primary-color);
    color: white;
  }

  .scenario-badge.pending {
    background: var(--warning-color);
    color: white;
  }

  .scenario-badge.partial {
    background: var(--info-color);
    color: white;
  }

  .scenario-badge.complete {
    background: var(--success-color);
    color: white;
  }

  .scenario-header h4 {
    margin: 0;
    color: var(--text-primary);
    font-size: 1rem;
  }

  .scenario-doc p {
    margin: 0.5rem 0;
    font-size: 0.9rem;
    line-height: 1.4;
  }

  /* Alert styles */
  .alert {
    padding: 1rem;
    border-radius: var(--radius-sm);
    border: 1px solid;
  }

  .alert-warning {
    background: var(--warning-bg);
    border-color: var(--warning-color);
    color: var(--warning-color);
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .demo-container {
      padding: 0 0.5rem;
    }

    .card-body {
      padding: 1.5rem;
    }

    .debug-grid,
    .state-grid {
      grid-template-columns: 1fr;
    }

    .scenarios-grid {
      grid-template-columns: 1fr;
    }

    .quick-emails {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
