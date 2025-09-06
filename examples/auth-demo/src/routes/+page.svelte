<script>
import { browser } from '$app/environment';
import { onMount, getContext } from 'svelte';
import { ChevronRight, User, Mail, Key, Shield, Activity, Settings } from 'lucide-svelte';
import { ErrorReportingStatus } from '@thepia/flows-auth';

// Use singleton auth store pattern
let authStoreFromContext = null;
let authConfigFromSingleton = null;

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
let testEmail = 'demo@example.com';
let currentDomain = 'dev.thepia.net';
let domainOptions = ['dev.thepia.net', 'thepia.net'];
let userStateResult = null;
let invitationToken = '';

// Pin verification controls
let pinCode = '';
let pinVerificationLoading = false;
let pinVerificationError = null;
let pinVerificationSuccess = null;

// Enhanced check user state options
let checkMethod = 'store'; // 'store' or 'api'
let resultFormat = 'formatted'; // 'formatted' or 'json'

// SignIn form configuration options
let signInMode = 'login-or-register'; // 'login-only' or 'login-or-register'
// TODO: Set enablePasskeys back to true by default once WorkOS implements passkey/WebAuthn support
// Currently disabled to prevent 404 errors on /auth/webauthn/authenticate endpoint
let enablePasskeys = false;
let enableMagicLinks = true;

// New size and variant options
let formSize = 'medium'; // 'small', 'medium', 'large', 'full'
let formVariant = 'inline'; // 'inline', 'popup'
let popupPosition = 'top-right'; // 'top-right', 'top-left', 'bottom-right', 'bottom-left'
let useSignInForm = false; // Toggle between SignInCore and SignInForm
let signInCoreLayout = 'full-width'; // 'full-width', 'hero-centered'

// Registration action feedback
let registrationError = null;
let registrationSuccess = null;
let registrationLoading = false;


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
  
  try {
    // Use the global auth store (not context-based)
    const { getGlobalAuthStore, getGlobalAuthConfig } = await import('@thepia/flows-auth');
    
    // Wait for layout to initialize the global auth store
    let attempts = 0;
    while (!authStore && attempts < 20) {
      try {
        authStore = getGlobalAuthStore();
        break; // Success - exit loop
      } catch (error) {
        // Auth store not yet initialized, wait and try again
        await new Promise(resolve => setTimeout(resolve, 50));
        attempts++;
      }
    }
    
    if (!authStore) {
      throw new Error('Auth store not available after waiting');
    }
    
    console.log('🔐 Auth store retrieved using proper pattern');
    
    // Get config from global singleton
    authConfig = getGlobalAuthConfig();
    console.log('⚙️ Auth config retrieved from singleton');
    
    // Subscribe to auth state changes
    authStore.subscribe((state) => {
      isAuthenticated = state.state === 'authenticated' || state.state === 'authenticated-confirmed';
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
    
    console.log('✅ Demo page initialization complete');
    
  } catch (error) {
    console.error('❌ Failed to initialize demo page:', error);
  }
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
        await startPasswordlessAuth();
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

// Uses the unified /auth/start-passwordless endpoint for all magic link flows
async function startPasswordlessAuth() {
  if (!authStore || !emailInput.trim()) return;
  
  try {
    console.log('📧 Starting passwordless authentication for:', emailInput);
    const result = await authStore.api.startPasswordlessAuthentication(emailInput);
    
    if (result.success) {
      console.log('✅ Passwordless email sent:', result.message);
      console.log('📬 Please check your email and click the verification link to continue.');
    } else {
      console.error('❌ Failed to start passwordless authentication:', result.message);
    }
  } catch (error) {
    console.error('❌ Error starting passwordless authentication:', error);
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

async function updateDomain() {
  if (!authConfig) return;
  
  // Update the auth config with new domain
  authConfig.domain = currentDomain;
  console.log('🌐 Updated domain to:', currentDomain);
  
  // If auth store exists, we might need to reinitialize with new domain
  // This is important for passkey registration to work with correct domain
  if (authStore) {
    console.log('⚠️ Domain change requires re-initialization for passkeys to work correctly');
  }
}

// Enhanced state-based registration function
async function checkUserStateEnhanced() {
  console.log('🔍 Starting enhanced checkUserState function');
  console.log('Auth store available:', !!authStore);
  console.log('Email input:', emailInput);
  console.log('Check method:', checkMethod);
  console.log('Result format:', resultFormat);
  
  if (!authStore) {
    console.error('❌ No auth store available');
    userStateResult = {
      email: emailInput,
      exists: false,
      emailVerified: false,
      hasWebAuthn: false,
      error: 'Auth store not available',
      method: checkMethod,
      rawResult: null
    };
    return;
  }
  
  if (!emailInput.trim()) {
    console.error('❌ No email input provided');
    return;
  }
  
  try {
    let rawResult;
    
    if (checkMethod === 'api') {
      // Direct API call (like the debug panel)
      console.log('🔍 Calling API directly for:', emailInput);
      console.log('API client available:', !!authStore.api);
      
      if (!authStore.api) {
        throw new Error('No API client available on auth store');
      }
      
      rawResult = await authStore.api.checkEmail(emailInput);
      console.log('✅ Direct API result:', rawResult);
    } else {
      // Use auth store method (default)
      console.log('🔍 Using authStore.checkUser for:', emailInput);
      console.log('Auth store methods available:', Object.keys(authStore));
      console.log('checkUser method type:', typeof authStore.checkUser);
      
      rawResult = await authStore.checkUser(emailInput);
      console.log('✅ Auth store result:', rawResult);
    }
    
    userStateResult = {
      email: emailInput,
      exists: rawResult.exists || false,
      emailVerified: rawResult.emailVerified || false,
      hasWebAuthn: rawResult.hasWebAuthn || rawResult.hasPasskey || false,
      userId: rawResult.userId,
      lastPinExpiry: rawResult.lastPinExpiry,
      lastPinSentAt: rawResult.lastPinSentAt,
      method: checkMethod,
      rawResult: rawResult
    };
    
    console.log('📊 Enhanced user state determined:', userStateResult);
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
      hasWebAuthn: false,
      error: error.message || 'Unknown error',
      method: checkMethod,
      rawResult: null
    };
  }
}

// Keep original function for backward compatibility where referenced
async function checkUserState() {
  // Just call the enhanced version with default settings
  checkMethod = 'store';
  resultFormat = 'formatted';
  await checkUserStateEnhanced();
}

function getRegistrationStatus(state) {
  if (!state.exists) return 'New User';
  if (!state.emailVerified) return 'Unverified Email';
  if (!state.hasWebAuthn) return 'Missing Passkey';
  return 'Fully Registered';
}

function getStatusClass(state) {
  if (!state.exists) return 'new';
  if (!state.emailVerified) return 'unverified';
  if (!state.hasWebAuthn) return 'partial';
  return 'complete';
}

function getRecommendedAction(state) {
  if (!state.exists) return 'new-registration';
  if (!state.emailVerified) return 'resend-verification';
  if (!state.hasWebAuthn) return 'passkey-setup';
  return 'use-signin';
}

function hasValidPin(state) {
  if (!state || !state.lastPinExpiry) return false;
  
  try {
    const expiryTime = new Date(state.lastPinExpiry);
    const now = new Date();
    return expiryTime > now; // Pin is still valid if expiry is in the future
  } catch (error) {
    console.error('Error parsing pin expiry time:', error);
    return false;
  }
}

function getPinTimeRemaining(state) {
  if (!hasValidPin(state)) return null;
  
  try {
    const expiryTime = new Date(state.lastPinExpiry);
    const now = new Date();
    const remainingMs = expiryTime.getTime() - now.getTime();
    const remainingMinutes = Math.ceil(remainingMs / (1000 * 60));
    return remainingMinutes;
  } catch (error) {
    console.error('Error calculating pin time remaining:', error);
    return null;
  }
}

async function executeNewUserRegistration() {
  if (!authStore || !userStateResult?.email) return;
  
  // Clear previous messages
  registrationError = null;
  registrationSuccess = null;
  registrationLoading = true;
  
  try {
    console.log('🆕 Executing individual user registration for:', userStateResult.email);
    
    const result = await authStore.registerIndividualUser({
      email: userStateResult.email,
      firstName: 'Demo',
      lastName: 'User',
      acceptedTerms: true,
      acceptedPrivacy: true,
    });
    
    console.log('✅ Individual user registration complete:', result);
    registrationSuccess = result.message;
    
    // Refresh user state after a short delay
    setTimeout(async () => {
      await checkUserState();
    }, 1000);
    
  } catch (error) {
    console.error('❌ New user registration failed:', error);
    
    // Parse error message
    if (error.message?.includes('rate limit') || error.message?.includes('429')) {
      registrationError = 'Rate limit exceeded (max 3 registration attempts per 15 minutes). Please wait before trying again.';
    } else if (error.message?.includes('already exists')) {
      registrationError = 'This email is already registered. Try signing in instead.';
    } else if (error.message?.includes('invalid email')) {
      registrationError = 'Please enter a valid email address.';
    } else {
      registrationError = error.message || 'Registration failed. Please try again.';
    }
  } finally {
    registrationLoading = false;
  }
}

async function executeResendVerification() {
  if (!authStore || !userStateResult?.email) return;
  
  try {
    console.log('📧 Resending verification email for:', userStateResult.email);
    
    const result = await authStore.api.startPasswordlessAuthentication(userStateResult.email);
    console.log('✅ Verification email sent:', result);
    
    if (result.alreadyVerified) {
      console.log('🎉 Email was already verified!');
      await checkUserState();
    }
  } catch (error) {
    console.error('❌ Failed to send verification email:', error);
  }
}

async function executePasskeySetup() {
  if (!authStore || !userStateResult?.email) return;
  
  try {
    console.log('🔑 Setting up passkey for verified user:', userStateResult.email);
    
    // For verified users, we complete the registration with passkey
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

async function executeInvitationRegistration() {
  if (!authStore || !invitationToken.trim()) return;
  
  try {
    console.log('🎫 Executing invitation registration with token');
    
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

async function runQuickTest() {
  const { runTestAndDisplay } = await import('../lib/test/checkUserTest.js');
  return runTestAndDisplay();
}

async function verifyAuthPin() {
  if (!authStore || !emailInput.trim() || !pinCode.trim()) return;
  
  // Clear previous messages
  pinVerificationError = null;
  pinVerificationSuccess = null;
  pinVerificationLoading = true;
  
  try {
    console.log('🔢 Verifying auth pin for:', emailInput);
    
    // Use the WorkOS verifyEmailAuth function
    const result = await authStore.api.verifyEmailAuth(emailInput, pinCode);
    console.log('✅ Pin verification result:', result);
    
    pinVerificationSuccess = `Successfully authenticated! Welcome, ${result.user?.email}`;
    
    // Clear pin code after successful verification
    pinCode = '';
    
    // The auth store should automatically update with the authenticated user
    // so we don't need to manually update the UI
    
  } catch (error) {
    console.error('❌ Pin verification failed:', error);
    
    // Parse error message for user-friendly display
    if (error.message?.includes('invalid code') || error.message?.includes('401')) {
      pinVerificationError = 'Invalid or expired pin code. Please try again or request a new pin.';
    } else if (error.message?.includes('rate limit') || error.message?.includes('429')) {
      pinVerificationError = 'Too many verification attempts. Please wait before trying again.';
    } else if (error.message?.includes('user not found')) {
      pinVerificationError = 'User not found. Please check the email address.';
    } else {
      pinVerificationError = error.message || 'Pin verification failed. Please try again.';
    }
  } finally {
    pinVerificationLoading = false;
  }
}


// SignInForm event handlers
function handleSignInSuccess(detail) {
  console.log('✅ SignInForm Success:', detail);
  console.log(`🎉 User ${detail.user.email} successfully authenticated via ${detail.method}`);
}

function handleSignInError(detail) {
  console.error('❌ SignInForm Error:', detail);
  console.log(`⚠️ Authentication error: ${detail.error.message || detail.error.code}`);
}

function handleStepChange(detail) {
  console.log('🔄 SignInForm Step Change:', detail);
  console.log(`📍 Authentication flow step: ${detail.step}`);
}

// Create reactive config that updates when controls change
$: dynamicAuthConfig = authConfig ? {
  ...authConfig,
  enablePasskeys,
  enableMagicLinks, 
  signInMode
} : null;

// Log changes for debugging
$: if (dynamicAuthConfig) {
  console.log('⚙️ SignInCore config updated:', {
    signInMode: dynamicAuthConfig.signInMode,
    enablePasskeys: dynamicAuthConfig.enablePasskeys,
    enableMagicLinks: dynamicAuthConfig.enableMagicLinks
  });
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
                <span class="domain-badge">{authConfig.domain}</span>
                <select class="domain-select" bind:value={currentDomain} on:change={updateDomain}>
                  {#each domainOptions as domain}
                    <option value={domain}>{domain}</option>
                  {/each}
                </select>
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
        <p>Test different sign-in methods with the core authentication components:</p>
        
        <div class="demo-controls">
          <div class="quick-emails">
            <span>Quick test emails:</span>
            <button class="btn btn-outline btn-sm" on:click={() => emailInput = 'demo@example.com'}>
              demo@example.com
            </button>
            <button class="btn btn-outline btn-sm" on:click={() => emailInput = 'test@thepia.net'}>
              test@thepia.net
            </button>
            <button class="btn btn-outline btn-sm" on:click={() => emailInput = ''}>
              Clear
            </button>
          </div>
        </div>
        
        <!-- Configuration Controls -->
        <div class="signin-config card">
          <div class="card-header">
            <h3>Authentication Configuration</h3>
            <p class="text-secondary">Configure the SignInCore component behavior:</p>
          </div>
          <div class="card-body">
            <div class="config-grid">
              <div class="config-group">
                <label class="config-label">User Handling:</label>
                <div class="radio-group">
                  <label class="radio-option">
                    <input type="radio" bind:group={signInMode} value="login-only" />
                    <span>Login Only (error for new users)</span>
                  </label>
                  <label class="radio-option">
                    <input type="radio" bind:group={signInMode} value="login-or-register" />
                    <span>Login or Register as Needed</span>
                  </label>
                </div>
              </div>

              <div class="config-group">
                <label class="config-label">Component Type:</label>
                <div class="radio-group">
                  <label class="radio-option">
                    <input type="radio" bind:group={useSignInForm} value={false} />
                    <span>SignInCore (basic, no size options)</span>
                  </label>
                  <label class="radio-option">
                    <input type="radio" bind:group={useSignInForm} value={true} />
                    <span>SignInForm (full-featured, with sizing)</span>
                  </label>
                </div>
              </div>

              {#if !useSignInForm}
                <div class="config-group">
                  <label class="config-label">SignInCore Layout:</label>
                  <div class="radio-group">
                    <label class="radio-option">
                      <input type="radio" bind:group={signInCoreLayout} value="full-width" />
                      <span>Full Width (current style)</span>
                    </label>
                    <label class="radio-option">
                      <input type="radio" bind:group={signInCoreLayout} value="hero-centered" />
                      <span>Hero Centered (card style, ~square)</span>
                    </label>
                  </div>
                </div>
              {/if}

              {#if useSignInForm}
                <div class="config-group">
                  <label class="config-label">Form Size:</label>
                  <div class="radio-group">
                    <label class="radio-option">
                      <input type="radio" bind:group={formSize} value="small" />
                      <span>Small (280px)</span>
                    </label>
                    <label class="radio-option">
                      <input type="radio" bind:group={formSize} value="medium" />
                      <span>Medium (360px)</span>
                    </label>
                    <label class="radio-option">
                      <input type="radio" bind:group={formSize} value="large" />
                      <span>Large (480px)</span>
                    </label>
                    <label class="radio-option">
                      <input type="radio" bind:group={formSize} value="full" />
                      <span>Full Width</span>
                    </label>
                  </div>
                </div>

                <div class="config-group">
                  <label class="config-label">Display Variant:</label>
                  <div class="radio-group">
                    <label class="radio-option">
                      <input type="radio" bind:group={formVariant} value="inline" />
                      <span>Inline (normal flow)</span>
                    </label>
                    <label class="radio-option">
                      <input type="radio" bind:group={formVariant} value="popup" />
                      <span>Popup (fixed position)</span>
                    </label>
                  </div>
                </div>

                {#if formVariant === 'popup'}
                  <div class="config-group">
                    <label class="config-label">Popup Position:</label>
                    <div class="radio-group">
                      <label class="radio-option">
                        <input type="radio" bind:group={popupPosition} value="top-right" />
                        <span>Top Right</span>
                      </label>
                      <label class="radio-option">
                        <input type="radio" bind:group={popupPosition} value="top-left" />
                        <span>Top Left</span>
                      </label>
                      <label class="radio-option">
                        <input type="radio" bind:group={popupPosition} value="bottom-right" />
                        <span>Bottom Right</span>
                      </label>
                      <label class="radio-option">
                        <input type="radio" bind:group={popupPosition} value="bottom-left" />
                        <span>Bottom Left</span>
                      </label>
                    </div>
                  </div>
                {/if}
              {/if}
              
              <div class="config-group">
                <label class="config-label">Authentication Methods:</label>
                <div class="checkbox-group">
                  <label class="checkbox-option">
                    <input type="checkbox" bind:checked={enablePasskeys} />
                    <span>Enable Passkeys</span>
                  </label>
                  <label class="checkbox-option">
                    <input type="checkbox" bind:checked={enableMagicLinks} />
                    <span>Enable Magic Links</span>
                  </label>
                </div>
              </div>
            </div>
            
            <div class="config-info">
              <p><strong>Current Configuration:</strong></p>
              <ul>
                <li>User Handling: {signInMode === 'login-only' ? 'Login Only' : 'Login or Register as Needed'}</li>
                <li>Passkeys: {enablePasskeys ? 'Enabled' : 'Disabled'}</li>
                <li>Magic Links: {enableMagicLinks ? 'Enabled' : 'Disabled'}</li>
                <li>Autocomplete: {enablePasskeys ? 'email webauthn' : 'email'}</li>
                <li>Auth Flow: {enablePasskeys && enableMagicLinks ? 'Passkey preferred with email fallback' : enablePasskeys ? 'Passkey only' : enableMagicLinks ? 'Email only' : 'No auth methods'}</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Live SignInCore Component -->
        {#if authStore && dynamicAuthConfig && !isAuthenticated}
          <div class="signin-demo card">
            <div class="card-header">
              <h3>Live Sign-In Component</h3>
              <p class="text-secondary">
                {#if signInMode === 'login-only'}
                  Login-only mode - will show error if user doesn't exist
                {:else}
                  Login-or-register mode - will automatically handle new users
                {/if}
              </p>
            </div>
            <div class="card-body">
              {#if useSignInForm}
                {#await import('@thepia/flows-auth') then { SignInForm }}
                  <SignInForm 
                    config={dynamicAuthConfig}
                    initialEmail={emailInput}
                    size={formSize}
                    variant={formVariant}
                    popupPosition={popupPosition}
                    className="demo-signin-form"
                    on:success={(e) => handleSignInSuccess(e.detail)}
                    on:error={(e) => handleSignInError(e.detail)}
                    on:stepChange={(e) => handleStepChange(e.detail)}
                  />
                {:catch error}
                  <div class="signin-error">
                    <p>Failed to load SignInForm: {error.message}</p>
                  </div>
                {/await}
              {:else}
                {#await import('@thepia/flows-auth') then { SignInCore }}
                  <div class="signin-core-container" class:hero-centered={signInCoreLayout === 'hero-centered'}>
                    <SignInCore 
                      config={dynamicAuthConfig}
                      initialEmail={emailInput}
                      className="demo-signin-form {signInCoreLayout === 'hero-centered' ? 'hero-style' : ''}"
                      on:success={(e) => handleSignInSuccess(e.detail)}
                      on:error={(e) => handleSignInError(e.detail)}
                      on:stepChange={(e) => handleStepChange(e.detail)}
                    />
                  </div>
                {:catch error}
                  <div class="signin-error">
                    <p>Failed to load SignInCore: {error.message}</p>
                  </div>
                {/await}
              {/if}
            </div>
          </div>
        {/if}
        
        <!-- Pin Integration Info -->
        <div class="pin-integration-info card">
          <div class="card-header">
            <h4>🔢 Smart Pin Detection</h4>
          </div>
          <div class="card-body">
            <p>The Live Sign-In component now includes intelligent pin detection:</p>
            <ul>
              <li><strong>Automatic Detection:</strong> When you enter an email, the system checks for existing valid pins</li>
              <li><strong>Skip Redundant Sends:</strong> If a valid pin exists, it skips sending a new one and goes directly to verification</li>
              <li><strong>Smart Messaging:</strong> Shows different messages for new codes vs. existing valid pins</li>
              <li><strong>Seamless Experience:</strong> Users don't need to re-request pins after page reloads</li>
            </ul>
            
            <div class="integration-note">
              <p><strong>💡 Try it:</strong> Use the registration flow to send yourself a pin, then come back to this Sign-In form. 
              Enter the same email and you'll see it detects the existing pin instead of sending a new one!</p>
            </div>
          </div>
        </div>
      </div>
    
    {:else if selectedDemo === 'register'}
      <div class="content-section">
        <h2>Registration Flow Demo</h2>
        <p>Test registration by first checking actual user state, then following the appropriate flow:</p>
        
        <!-- Debug Panel -->
        
        <!-- Quick Test Button -->
        <div class="quick-test card">
          <div class="card-body">
            <button class="btn btn-info" on:click={runQuickTest}>
              🧪 Run Quick checkUser Test
            </button>
            
            <ErrorReportingStatus />
          </div>
        </div>
        
        <!-- User State Checker -->
        <div class="user-checker card">
          <div class="card-header">
            <h3>1. Check User State</h3>
          </div>
          <div class="card-body">
            <div class="input-group">
              <label for="check-email">Email Address</label>
              <input 
                id="check-email" 
                type="email" 
                bind:value={emailInput}
                placeholder="Enter email to check registration status" 
                class="form-input"
              />
            </div>

            <!-- Enhanced options section -->
            <div class="check-options">
              <div class="option-group">
                <label class="option-label">Call Method:</label>
                <div class="radio-group">
                  <label class="radio-option">
                    <input type="radio" bind:group={checkMethod} value="store" />
                    <span>authStore.checkUser() <em>(recommended)</em></span>
                  </label>
                  <label class="radio-option">
                    <input type="radio" bind:group={checkMethod} value="api" />
                    <span>Direct API call</span>
                  </label>
                </div>
              </div>

              <div class="option-group">
                <label class="option-label">Result Format:</label>
                <div class="radio-group">
                  <label class="radio-option">
                    <input type="radio" bind:group={resultFormat} value="formatted" />
                    <span>Formatted display <em>(default)</em></span>
                  </label>
                  <label class="radio-option">
                    <input type="radio" bind:group={resultFormat} value="json" />
                    <span>Raw JSON</span>
                  </label>
                </div>
              </div>
            </div>
            
            <div class="action-buttons">
              <button class="btn btn-primary" on:click={checkUserStateEnhanced} disabled={!emailInput.trim()}>
                <User size={16} />
                Check User State
              </button>
              <button class="btn btn-outline" on:click={() => userStateResult = null}>
                Clear Results
              </button>
            </div>
            
            {#if userStateResult}
              <div class="user-state-result">
                <h4>User State for: {userStateResult.email}</h4>
                <div class="result-meta">
                  <small>Method: <strong>{userStateResult.method === 'api' ? 'Direct API' : 'Auth Store'}</strong> | Format: <strong>{resultFormat}</strong></small>
                </div>

                {#if resultFormat === 'json'}
                  <!-- Raw JSON display -->
                  <div class="json-result">
                    <h5>Raw Result:</h5>
                    <pre class="json-output">{JSON.stringify(userStateResult.rawResult, null, 2)}</pre>
                    {#if userStateResult.error}
                      <div class="error-section">
                        <strong>Error:</strong> {userStateResult.error}
                      </div>
                    {/if}
                  </div>
                {:else}
                  <!-- Formatted display -->
                  <div class="state-grid">
                    <div class="state-item">
                      <span class="label">Exists:</span>
                      <span class="value" class:exists={userStateResult.exists} class:not-exists={!userStateResult.exists}>
                        {userStateResult.exists ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div class="state-item">
                      <span class="label">Email Verified:</span>
                      <span class="value" class:verified={userStateResult.emailVerified} class:unverified={!userStateResult.emailVerified}>
                        {userStateResult.emailVerified ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div class="state-item">
                      <span class="label">Has Passkey:</span>
                      <span class="value" class:has-passkey={userStateResult.hasWebAuthn} class:no-passkey={!userStateResult.hasWebAuthn}>
                        {userStateResult.hasWebAuthn ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div class="state-item">
                      <span class="label">Registration Status:</span>
                      <span class="status-badge {getStatusClass(userStateResult)}">
                        {getRegistrationStatus(userStateResult)}
                      </span>
                    </div>
                  </div>
                {/if}
                
                <!-- Show appropriate registration action -->
                <div class="recommended-action">
                  <h4>Recommended Action:</h4>
                  
                  {#if registrationError}
                    <div class="alert alert-error">
                      <strong>Error:</strong> {registrationError}
                    </div>
                  {/if}
                  
                  {#if registrationSuccess}
                    <div class="alert alert-success">
                      <strong>Success:</strong> {registrationSuccess}
                    </div>
                  {/if}
                  
                  {#if getRecommendedAction(userStateResult) === 'new-registration'}
                    <button 
                      class="btn btn-success" 
                      on:click={executeNewUserRegistration} 
                      disabled={isAuthenticated || registrationLoading}
                    >
                      <User size={16} />
                      {registrationLoading ? 'Registering...' : 'Complete New User Registration'}
                    </button>
                    <p class="action-note">This will create a new account, send verification email, and set up passkey.</p>
                  {:else if getRecommendedAction(userStateResult) === 'resend-verification'}
                    <button class="btn btn-warning" on:click={executeResendVerification}>
                      <Mail size={16} />
                      Resend Email Verification
                    </button>
                    <p class="action-note">Email exists but not verified. Send verification email again.</p>
                  {:else if getRecommendedAction(userStateResult) === 'passkey-setup'}
                    <button class="btn btn-info" on:click={executePasskeySetup}>
                      <Key size={16} />
                      Add Passkey to Verified Account
                    </button>
                    <p class="action-note">Email is verified but no passkey. Complete registration with passkey.</p>
                  {:else if getRecommendedAction(userStateResult) === 'use-signin'}
                    <button class="btn btn-secondary" on:click={() => selectedDemo = 'signin'}>
                      <Shield size={16} />
                      Go to Sign In
                    </button>
                    <p class="action-note">User is fully registered. Use sign-in flow instead of registration.</p>
                  {/if}
                </div>
              </div>
            {/if}
          </div>
        </div>
        
        <!-- Registration Scenarios Documentation -->
        <div class="scenarios-info card">
          <div class="card-header">
            <h3>2. Registration Flow Scenarios</h3>
          </div>
          <div class="card-body">
            <p>The registration system handles these different user states automatically:</p>
            
            <div class="scenario-grid">
              <div class="scenario-doc">
                <div class="scenario-header">
                  <span class="scenario-badge new">NEW USER</span>
                  <h4>New User Registration</h4>
                </div>
                <p><strong>When:</strong> Email doesn't exist in system</p>
                <p><strong>Flow:</strong> Create account → Send verification email → Email verification → Passkey setup → Complete</p>
              </div>
              
              <div class="scenario-doc">
                <div class="scenario-header">
                  <span class="scenario-badge unverified">UNVERIFIED</span>
                  <h4>Email Verification Needed</h4>
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
            
            <button class="btn btn-primary" on:click={executeInvitationRegistration} disabled={!invitationToken.trim() || isAuthenticated}>
              <Mail size={16} />
              Register with Invitation
            </button>
            
            <p class="action-note">Invitation tokens pre-fill user data and may skip email verification.</p>
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
  
  .domain-select {
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    border: 1px solid var(--border-color);
    font-size: 0.8rem;
    font-weight: 500;
    background: white;
    color: var(--text-primary);
    cursor: pointer;
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
  
  .info-note {
    margin-top: 1rem;
    padding: 0.75rem;
    background: rgba(59, 130, 246, 0.05);
    border: 1px solid rgba(59, 130, 246, 0.2);
    border-radius: 8px;
    color: #3b82f6;
    font-size: 0.875rem;
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
  
  /* Registration Scenario Styles */
  .registration-scenarios {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    margin-bottom: 2rem;
  }
  
  .scenario-card {
    border-left: 4px solid var(--primary-color);
  }
  
  .scenario-card .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  
  .scenario-card h3 {
    margin: 0;
    font-size: 1.1rem;
  }
  
  .scenario-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
  }
  
  .scenario-badge.new {
    background: #dcfce7;
    color: #166534;
  }
  
  .scenario-badge.unverified {
    background: #fef3c7;
    color: #92400e;
  }
  
  .scenario-badge.partial {
    background: #e0f2fe;
    color: #0369a1;
  }
  
  .scenario-badge.complete {
    background: #f3e8ff;
    color: #7c2d12;
  }
  
  .scenario-badge.invitation {
    background: #fce7f3;
    color: #be185d;
  }
  
  .scenario-flow {
    margin-top: 1rem;
    padding: 1rem;
    background: var(--background-muted);
    border-radius: var(--radius-sm);
  }
  
  .scenario-flow h4 {
    margin: 0 0 0.5rem 0;
    font-size: 0.9rem;
    color: var(--text-secondary);
  }
  
  .scenario-flow ol {
    margin: 0;
    padding-left: 1.5rem;
    font-size: 0.85rem;
    color: var(--text-secondary);
    line-height: 1.4;
  }
  
  .scenario-flow li {
    margin-bottom: 0.25rem;
  }
  
  /* Check Options Styles */
  .check-options {
    margin: 1rem 0;
    padding: 1rem;
    background: #f8f9fa;
    border-radius: 6px;
    border: 1px solid #e9ecef;
  }

  .option-group {
    margin-bottom: 1rem;
  }

  .option-group:last-child {
    margin-bottom: 0;
  }

  .option-label {
    display: block;
    font-weight: 600;
    color: #495057;
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
  }

  .radio-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .radio-option {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    font-size: 0.9rem;
    color: #6c757d;
  }

  .radio-option input[type="radio"] {
    margin: 0;
  }

  .radio-option span em {
    color: #6c757d;
    font-style: italic;
    font-size: 0.8rem;
  }

  /* User State Display Styles */
  .user-state-result {
    margin-top: 1.5rem;
    padding: 1.5rem;
    background: var(--background-muted);
    border-radius: var(--radius);
    border: 1px solid var(--border-color);
  }

  .result-meta {
    margin-bottom: 1rem;
    padding: 0.5rem;
    background: #e9ecef;
    border-radius: 4px;
  }

  .json-result {
    margin-top: 1rem;
  }

  .json-output {
    background: #fff;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    padding: 1rem;
    overflow-x: auto;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.85rem;
    color: #495057;
    max-height: 300px;
    overflow-y: auto;
  }

  .error-section {
    margin-top: 1rem;
    padding: 0.75rem;
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
    border-radius: 4px;
  }

  .alert {
    margin: 1rem 0;
    padding: 0.75rem 1rem;
    border-radius: 4px;
    border: 1px solid;
  }

  .alert-error {
    background: #f8d7da;
    color: #721c24;
    border-color: #f5c6cb;
  }

  .alert-success {
    background: #d4edda;
    color: #155724;
    border-color: #c3e6cb;
  }

  .alert strong {
    font-weight: 600;
  }
  
  .user-state-result h4 {
    margin: 0 0 1rem 0;
    color: var(--text-primary);
    font-size: 1.1rem;
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
    background: var(--background-primary);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-color);
  }
  
  .state-item .label {
    font-weight: 500;
    color: var(--text-secondary);
  }
  
  .state-item .value {
    font-weight: 600;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.9rem;
  }
  
  .value.exists, .value.verified, .value.has-passkey {
    background: #dcfce7;
    color: #166534;
  }
  
  .value.not-exists, .value.unverified, .value.no-passkey {
    background: #fef2f2;
    color: #dc2626;
  }
  
  .status-badge {
    padding: 0.35rem 0.75rem;
    border-radius: 0.5rem;
    font-size: 0.85rem;
    font-weight: 600;
    text-transform: uppercase;
  }
  
  .recommended-action {
    margin-top: 1.5rem;
    padding: 1rem;
    background: var(--background-primary);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-color);
  }
  
  .recommended-action h4 {
    margin: 0 0 1rem 0;
    color: var(--text-primary);
    font-size: 1rem;
  }
  
  .action-note {
    margin-top: 0.5rem;
    font-size: 0.9rem;
    color: var(--text-secondary);
    font-style: italic;
  }
  
  /* Scenario Documentation Styles */
  .scenario-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }
  
  .scenario-doc {
    padding: 1rem;
    background: var(--background-primary);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-color);
  }
  
  .scenario-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }
  
  .scenario-doc h4 {
    margin: 0;
    font-size: 0.95rem;
    color: var(--text-primary);
  }
  
  .scenario-doc p {
    margin: 0.5rem 0;
    font-size: 0.85rem;
    color: var(--text-secondary);
    line-height: 1.4;
  }

  /* SignIn Configuration Styles */
  .signin-config {
    margin-bottom: 2rem;
  }

  .config-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 2rem;
    margin-bottom: 1.5rem;
  }

  .config-group {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .config-label {
    font-weight: 600;
    color: var(--text-primary);
    font-size: 0.9rem;
  }

  .checkbox-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .checkbox-option {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    font-size: 0.9rem;
    color: var(--text-secondary);
  }

  .checkbox-option input[type="checkbox"] {
    margin: 0;
    width: 16px;
    height: 16px;
    accent-color: var(--primary-color);
  }

  .config-info {
    padding: 1rem;
    background: var(--background-muted);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-color);
  }

  .config-info p {
    margin: 0 0 0.5rem 0;
    font-weight: 600;
    color: var(--text-primary);
  }

  .config-info ul {
    margin: 0;
    padding-left: 1.5rem;
    color: var(--text-secondary);
    font-size: 0.9rem;
  }

  .config-info li {
    margin: 0.25rem 0;
  }

  /* Demo SignInForm styles */
  .demo-signin-form {
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
  }

  /* SignInCore container styles */
  .signin-core-container {
    width: 100%;
  }

  .signin-core-container.hero-centered {
    display: flex;
    justify-content: center;
    padding: 2rem 0;
  }

  /* Hero-style SignInCore */
  .demo-signin-form.hero-style {
    max-width: 360px;
    width: 100%;
  }

  .signin-error {
    padding: 1rem;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: var(--radius-sm);
    color: #dc2626;
    text-align: center;
  }

  /* Pin Integration Info Styles */
  .pin-integration-info {
    margin-top: 2rem;
    margin-bottom: 1.5rem;
  }

  .pin-integration-info ul {
    padding-left: 1.5rem;
    color: var(--text-secondary);
    font-size: 0.9rem;
    line-height: 1.6;
  }

  .pin-integration-info li {
    margin: 0.5rem 0;
  }

  .integration-note {
    margin-top: 1.5rem;
    padding: 1rem;
    background: rgba(59, 130, 246, 0.05);
    border: 1px solid rgba(59, 130, 246, 0.2);
    border-radius: var(--radius-sm);
  }

  .integration-note p {
    margin: 0;
    font-size: 0.9rem;
    color: var(--text-secondary);
    font-style: italic;
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
    
    .scenario-card .card-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }
  }
</style>