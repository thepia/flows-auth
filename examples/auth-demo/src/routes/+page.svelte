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

// State Machine components
// Removed: ProfessionalStateMachine - no longer exported from library
let SessionStateMachineComponent = null;
let SignInStateMachineComponent = null;

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
let enableMagicPins = true;

// New size and variant options
let formSize = 'medium'; // 'small', 'medium', 'large', 'full'
let formVariant = 'inline'; // 'inline', 'popup'
let popupPosition = 'top-right'; // 'top-right', 'top-left', 'bottom-right', 'bottom-left'
let useSignInForm = false; // Toggle between SignInCore and SignInForm

// State machine diagram options
let diagramCompact = false;
let diagramDirection = 'TB'; // 'TB' (top-bottom) or 'LR' (left-right)
// Simplified: Use auth store state directly instead of complex dual machine  
let signInState = 'emailEntry'; // Current sign-in state (stubbed for now)
// Note: authState already exists above

// i18n Configuration options
let selectedLanguage = 'en'; // 'en', 'da'
let selectedClientVariant = 'default'; // 'default', 'acme', 'techcorp', 'healthcare', 'custom'
let customTranslationOverrides = {}; // User-defined translation overrides
let customTranslationsJson = '{}'; // JSON string for custom translations
let customTranslationError = null; // Error message for invalid JSON

// Predefined client variants for demonstration
const clientVariants = {
  default: {
    name: 'Default Thepia',
    companyName: 'Thepia',
    translations: {}
  },
  acme: {
    name: 'ACME Corporation',  
    companyName: 'ACME Corporation',
    translations: {
      'auth.signIn': 'Access ACME Portal',
      'email.placeholder': 'your.email@acme.com',
      'status.emailSent': 'Check your ACME corporate email for verification',
      'webauthn.ready': '🏢 ACME SecureAuth ready - Corporate Touch ID/Face ID available',
      'status.signInSuccess': 'Welcome to ACME Portal!',
      'auth.sendPinByEmail': 'Send ACME security pin'
    }
  },
  techcorp: {
    name: 'TechCorp Solutions',
    companyName: 'TechCorp Solutions', 
    translations: {
      'auth.signIn': 'Login to TechCorp',
      'email.placeholder': 'developer@techcorp.io',
      'status.emailSent': 'Verification code sent to your TechCorp account',
      'webauthn.ready': '🚀 TechCorp Secure Login - Biometric auth enabled',
      'status.signInSuccess': 'Welcome to TechCorp Dashboard!',
      'auth.signInWithPasskey': 'TechCorp Secure Login'
    }
  },
  healthcare: {
    name: 'MedSecure Health',
    companyName: 'MedSecure Health',
    translations: {
      'auth.signIn': 'Secure Medical Portal Access',
      'email.placeholder': 'provider@medsecure.health',
      'status.emailSent': 'Secure verification sent to your healthcare email',
      'webauthn.ready': '🏥 HIPAA-compliant biometric authentication ready',
      'status.signInSuccess': 'Welcome to MedSecure Portal!',
      'auth.sendPinByEmail': 'Send secure medical verification'
    }
  },
  custom: {
    name: 'Custom Configuration',
    companyName: 'Your Company',
    translations: {} // Will be populated from textarea
  }
};
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

// Load StateMachineFlow as soon as possible
onMount(async () => {
  if (!browser) return;
  
  console.log('🎯 Demo page initializing...');
  
  // Load state machine components for immediate rendering
  const loadComponentPromise = import('@thepia/flows-auth').then((module) => {
    const { SessionStateMachineFlow, SignInStateMachineFlow } = module;
    SessionStateMachineComponent = SessionStateMachineFlow;
    SignInStateMachineComponent = SignInStateMachineFlow;
    // Note: ProfessionalStateMachine removed from library exports
    console.log('State machine components loaded (simplified)');
  });
  
  try {
    // Load auth store (simplified - no more dual machine)
    const { getGlobalAuthStore, getGlobalAuthConfig } = await import('@thepia/flows-auth');
    
    console.log('✅ Auth store imports loaded - no dual machine needed');
    
    // Separately wait for layout to initialize the global auth store (for demo UI)
    let attempts = 0;
    while (!authStore && attempts < 10) {
      try {
        authStore = getGlobalAuthStore();
        break; // Success - exit loop
      } catch (error) {
        // Auth store not yet initialized, wait and try again
        await new Promise(resolve => setTimeout(resolve, 25));
        attempts++;
      }
    }
    
    if (!authStore) {
      console.warn('⚠️ Global auth store not available for demo UI');
    }
    
    // Only configure global auth store if it's available
    if (authStore) {
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
    } else {
      console.log('📝 Demo initialized with visualization-only mode (no global auth store)');
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

function handleSignInClose() {
  console.log('✖️ SignInForm popup closed by user');
  // In a real app, you might hide the popup or reset state
  // For demo purposes, we'll just log it
}

// Handle custom translation updates
function updateCustomTranslations() {
  try {
    // Parse the JSON and validate it
    const parsed = JSON.parse(customTranslationsJson);
    if (typeof parsed === 'object' && parsed !== null) {
      customTranslationOverrides = parsed;
      customTranslationError = null;
      // Update the custom variant's translations
      clientVariants.custom.translations = parsed;
    } else {
      customTranslationError = 'Invalid JSON: must be an object';
    }
  } catch (error) {
    customTranslationError = `Invalid JSON: ${error.message}`;
  }
}

// Get current client variant and build translation overrides
$: currentClientVariant = clientVariants[selectedClientVariant] || clientVariants.default;
$: combinedTranslations = selectedClientVariant === 'custom' 
  ? customTranslationOverrides 
  : {
      ...currentClientVariant.translations,
      ...customTranslationOverrides
    };

// Create reactive config that updates when controls change
$: dynamicAuthConfig = authConfig ? {
  ...authConfig,
  enablePasskeys,
  enableMagicPins, 
  signInMode,
  // i18n configuration
  language: selectedLanguage,
  translations: combinedTranslations,
  fallbackLanguage: 'en',
  // Update branding with client variant
  branding: {
    ...authConfig.branding,
    companyName: currentClientVariant.companyName
  }
} : null;

// Log changes for debugging
$: if (dynamicAuthConfig) {
  console.log('⚙️ SignInCore config updated:', {
    signInMode: dynamicAuthConfig.signInMode,
    enablePasskeys: dynamicAuthConfig.enablePasskeys,
    enableMagicPins: dynamicAuthConfig.enableMagicPins,
    language: dynamicAuthConfig.language,
    clientVariant: selectedClientVariant,
    translationCount: Object.keys(combinedTranslations).length
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
            <p>XState-inspired authentication state management with 26 states</p>
          </div>
          <div class="feature-card">
            <Settings size={32} class="feature-icon" />
            <h3>Branded Components</h3>
            <p>White-label ready with configurable branding</p>
          </div>
        </div>
        
        <!-- Interactive State Machine Visualization -->
        <div class="state-machine-overview card">
          <div class="card-header">
            <h3>🔧 Interactive State Machine</h3>
            <p class="text-secondary">Live visualization of the authentication flow - current state: <strong>{stateMachineState || 'checkingSession'}</strong></p>
          </div>
          <div class="card-body">
            <!-- Diagram Controls -->
            <div class="diagram-controls">
              <label class="control-item">
                <input type="checkbox" bind:checked={diagramCompact} />
                <span>Compact Mode</span>
              </label>
              <div class="control-item">
                <label for="diagram-direction">Layout Direction:</label>
                <select id="diagram-direction" bind:value={diagramDirection} class="form-select">
                  <option value="TB">Top to Bottom</option>
                  <option value="LR">Left to Right</option>
                </select>
              </div>
            </div>
            
            <div class="state-machines-container">
              {#if SessionStateMachineComponent}
                <div class="machine-grid">
                  <!-- AuthState Machine (Simplified) -->
                  <div class="machine-section">
                    <svelte:component this={SessionStateMachineComponent}
                      authState={authState}
                      width={600}
                      height={300}
                      onStateClick={(state) => {
                        console.log('Auth state clicked:', state);
                      }}
                      on:stateClick={(e) => {
                        console.log('Auth state clicked event:', e.detail);
                      }}
                    />
                  </div>

                  <!-- Sign-In State Machine (Simplified) -->
                  {#if SignInStateMachineComponent}
                    <div class="machine-section">
                      <svelte:component this={SignInStateMachineComponent}
                        currentSignInState={signInState}
                        width={600}
                        height={300}
                        onStateClick={(state) => {
                          console.log('Sign-in state clicked:', state);
                        }}
                        on:stateClick={(e) => {
                          console.log('Sign-in state clicked event:', e.detail);
                        }}
                      />
                    </div>
                  {/if}
                </div>
              {:else}
                <div class="graph-error">
                  <p>Loading state machine visualizations...</p>
                  <p class="text-secondary">The state machines are initializing...</p>
                </div>
              {/if}
            </div>
            
            <div class="state-info">
              <div class="state-stats">
                <div class="stat-item">
                  <span class="stat-label">Current State:</span>
                  <span class="stat-value">{stateMachineState || 'checkingSession'}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Total States:</span>
                  <span class="stat-value">26</span>
                </div>
                {#if stateMachineContext}
                  <div class="stat-item">
                    <span class="stat-label">Has Context:</span>
                    <span class="stat-value">Yes</span>
                  </div>
                {/if}
              </div>

            </div>
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
        
        <div class="demo-layout">
          <!-- Configuration Sidebar -->
          <div class="config-sidebar">
            <div class="sidebar-header">
              <h3>Authentication Configuration</h3>
              <p class="text-secondary">Configure component behavior:</p>
            </div>
            
            <!-- Quick Email Input -->
            <div class="config-section">
              <h4>🔄 Set Initial Email</h4>
              <div class="quick-emails">
                <button class="btn btn-outline btn-xs" on:click={() => emailInput = 'demo@example.com'}>
                  demo@example.com
                </button>
                <button class="btn btn-outline btn-xs" on:click={() => emailInput = 'test@thepia.net'}>
                  test@thepia.net
                </button>
                <button class="btn btn-outline btn-xs" on:click={() => emailInput = ''}>
                  Clear
                </button>
              </div>
            </div>

            <!-- Basic Auth Store State -->
            <div class="config-section">
              <h4>⚙️ Auth Store State</h4>
              <div class="auth-state-controls">
                <!-- Legacy Store State -->
                <div class="state-section">
                  <span class="config-label">Current State:</span>
                  <span class="state-badge {authState}">{authState}</span>
                </div>
              </div>
            </div>
        
            <!-- Configuration Controls -->
            <div class="config-grid">
              <div class="config-group">
                <span class="config-label">User Handling:</span>
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
                <span class="config-label">Component Type:</span>
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
                  <span class="config-label">SignInCore Layout:</span>
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
                  <span class="config-label">Form Size:</span>
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
                  <div class="config-label" id="display-variant-label">Display Variant:</div>
                  <div class="radio-group" role="radiogroup" aria-labelledby="display-variant-label">
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
                    <div class="config-label" id="popup-position-label">Popup Position:</div>
                    <div class="radio-group" role="radiogroup" aria-labelledby="popup-position-label">
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

              <!-- i18n Configuration Controls -->
              <div class="config-section">
                <h4 class="config-section-title">🌍 Internationalization (i18n)</h4>
                
                <div class="config-group">
                  <div class="config-label">Language:</div>
                  <div class="radio-group">
                    <label class="radio-option">
                      <input type="radio" bind:group={selectedLanguage} value="en" />
                      <span>English</span>
                    </label>
                    <label class="radio-option">
                      <input type="radio" bind:group={selectedLanguage} value="da" />
                      <span>Dansk (Danish)</span>
                    </label>
                  </div>
                </div>

                <div class="config-group">
                  <div class="config-label">Client Variant:</div>
                  <div class="radio-group">
                    <label class="radio-option">
                      <input type="radio" bind:group={selectedClientVariant} value="default" />
                      <span>Default Thepia</span>
                    </label>
                    <label class="radio-option">
                      <input type="radio" bind:group={selectedClientVariant} value="acme" />
                      <span>🏢 ACME Corporation</span>
                    </label>
                    <label class="radio-option">
                      <input type="radio" bind:group={selectedClientVariant} value="techcorp" />
                      <span>🚀 TechCorp Solutions</span>
                    </label>
                    <label class="radio-option">
                      <input type="radio" bind:group={selectedClientVariant} value="healthcare" />
                      <span>🏥 MedSecure Health</span>
                    </label>
                  </div>
                </div>

                <div class="config-group">
                  <div class="config-label">Current Configuration:</div>
                  <div class="config-info">
                    <div class="info-line">
                      <strong>Language:</strong> {selectedLanguage === 'en' ? 'English' : 'Dansk'}
                    </div>
                    <div class="info-line">
                      <strong>Client:</strong> {currentClientVariant.name}
                    </div>
                    <div class="info-line">
                      <strong>Custom Translations:</strong> {Object.keys(combinedTranslations).length} keys
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="config-group">
                <div class="config-label">Authentication Methods:</div>
                <div class="checkbox-group">
                  <label class="checkbox-option">
                    <input type="checkbox" bind:checked={enablePasskeys} />
                    <span>Enable Passkeys</span>
                  </label>
                  <label class="checkbox-option">
                    <input type="checkbox" bind:checked={enableMagicPins} />
                    <span>Enable Magic Pins</span>
                  </label>
                </div>
              </div>
            </div>
            
            <!-- <div class="config-info">
              <p><strong>Current Configuration:</strong></p>
              <ul>
                <li>User Handling: {signInMode === 'login-only' ? 'Login Only' : 'Login or Register as Needed'}</li>
                <li>Passkeys: {enablePasskeys ? 'Enabled' : 'Disabled'}</li>
                <li>Magic Pins: {enableMagicPins ? 'Enabled' : 'Disabled'}</li>
                <li>Autocomplete: {enablePasskeys ? 'email webauthn' : 'email'}</li>
                <li>Auth Flow: {enablePasskeys && enableMagicPins ? 'Passkey preferred with email fallback' : enablePasskeys ? 'Passkey only' : enableMagicPins ? 'Email only' : 'No auth methods'}</li>
              </ul>
            </div> -->
          </div>

          <!-- Main Demo Area -->
          <div class="demo-main">
            <!-- Live SignInCore Component -->
            {#if authStore && dynamicAuthConfig && !isAuthenticated}
              {#if useSignInForm && formVariant === 'popup'}
                <!-- Popup SignInForm - no card wrapper to avoid double borders -->
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
                <!-- Inline components with card wrapper -->
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
                          on:close={handleSignInClose}
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
                          <p>Failed to load SignInForm: {error.message}</p>
                        </div>
                      {/await}
                    {/if}
                  </div>
                </div>
              {/if}
            {/if}
          </div>

          <!-- State Machine Sidebar (Right) -->
          <div class="state-machine-sidebar">
            <div class="sidebar-header">
              <h3>🔧 State Machine</h3>
              <p class="text-secondary">Interactive authentication flow visualization:</p>
            </div>
            
            {#if authStore && authStore.stateMachine}
              <!-- Interactive State Machine Graphs -->
              <div class="config-section">
                <h4>📊 State Machine Visualization</h4>
                {#if SessionStateMachineComponent}
                  <!-- Compact AuthState Machine (Simplified) -->
                  <div class="compact-machine">
                    <svelte:component this={SessionStateMachineComponent}
                      authState={authState}
                      compact={true}
                      width={280}
                      height={180}
                      onStateClick={(state) => console.log('Auth state clicked:', state)}
                      on:stateClick={(e) => console.log('Auth state clicked event:', e.detail)}
                    />
                  </div>
                  
                  <!-- Current Auth State Display -->
                  <div class="compact-machine">
                    <div class="state-display">
                      <h4>Current State</h4>
                      <div class="state-value">{authState}</div>
                      {#if signInState !== 'emailEntry'}
                        <div class="signin-state">Sign-in: {signInState}</div>
                      {/if}
                    </div>
                  </div>
                {:else}
                  <div class="graph-error">
                    <p>Loading state machines...</p>
                    <!-- Fallback to simple state display -->
                    <div class="state-display-compact">
                      <div class="state-item-compact">
                        <span class="state-label">Machine:</span>
                        <span class="machine-state-badge">{stateMachineState || 'loading'}</span>
                      </div>
                      <div class="state-item-compact">
                        <span class="state-label">Legacy:</span>
                        <span class="state-badge {authState}">{authState}</span>
                      </div>
                    </div>
                  </div>
                {/if}
              </div>
              
              <!-- State Machine Event Controls -->
              <div class="config-section">
                <h4>State Events</h4>
                <div class="event-controls-compact">
                  <div class="control-group-compact">
                    <span class="group-label">Session:</span>
                    <div class="control-buttons-compact">
                      <button class="btn btn-outline btn-xs" on:click={() => authStore.checkSession()}>
                        Check
                      </button>
                      <button class="btn btn-outline btn-xs" on:click={() => authStore.stateMachine.send({ type: 'INVALID_SESSION' })}>
                        Invalid
                      </button>
                    </div>
                  </div>
                  
                  <div class="control-group-compact">
                    <span class="group-label">Input:</span>
                    <div class="control-buttons-compact">
                      <button class="btn btn-outline btn-xs" on:click={() => authStore.clickNext()}>
                        Next
                      </button>
                      <button class="btn btn-outline btn-xs" on:click={() => authStore.typeEmail(emailInput || 'demo@test.com')}>
                        Email
                      </button>
                      <button class="btn btn-outline btn-xs" on:click={() => authStore.clickContinue()}>
                        Continue
                      </button>
                    </div>
                  </div>
                  
                  <div class="control-group-compact">
                    <span class="group-label">Auth:</span>
                    <div class="control-buttons-compact">
                      <button class="btn btn-outline btn-xs" on:click={() => authStore.stateMachine.send({ type: 'PASSKEY_SELECTED', credential: {} })}>
                        Passkey
                      </button>
                      <button class="btn btn-outline btn-xs" on:click={() => authStore.stateMachine.send({ type: 'WEBAUTHN_SUCCESS', response: {} })}>
                        Success
                      </button>
                      <button class="btn btn-outline btn-xs" on:click={() => authStore.stateMachine.send({ type: 'WEBAUTHN_ERROR', error: { code: 'test', message: 'Test error' }, timing: 1000 })}>
                        Error
                      </button>
                    </div>
                  </div>
                  
                  <div class="control-group-compact">
                    <span class="group-label">Reset:</span>
                    <div class="control-buttons-compact">
                      <button class="btn btn-outline btn-xs" on:click={() => authStore.resetToAuth()}>
                        Reset
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- State Machine Context (Compact) -->
              <div class="config-section">
                <details class="context-details-compact">
                  <summary class="context-summary">Machine Context</summary>
                  <div class="context-data-compact">
                    {#if stateMachineContext}
                      <div class="context-item-compact">
                        <strong>Email:</strong> {stateMachineContext.email || 'None'}
                      </div>
                      <div class="context-item-compact">
                        <strong>User:</strong> {stateMachineContext.user?.email || 'None'}
                      </div>
                      <div class="context-item-compact">
                        <strong>Error:</strong> {stateMachineContext.error?.message || 'None'}
                      </div>
                      <div class="context-item-compact">
                        <strong>Retry:</strong> {stateMachineContext.retryCount || 0}
                      </div>
                      {#if stateMachineContext.sessionData}
                        <div class="context-item-compact">
                          <strong>Session:</strong> {stateMachineContext.sessionData.accessToken ? 'Present' : 'None'}
                        </div>
                      {/if}
                    {:else}
                      <div class="context-item-compact">No context available</div>
                    {/if}
                  </div>
                </details>
              </div>
            {:else}
              <div class="no-state-machine">
                <p class="text-secondary">State machine not available</p>
              </div>
            {/if}
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
                <div class="option-label">Call Method:</div>
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
                <div class="option-label">Result Format:</div>
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
        <p>Monitor and control the internal state machine that drives authentication flows:</p>
        
        <div class="state-display grid grid-cols-2 gap-4">
          <div class="state-card card">
            <div class="card-header">
              <h4>Current Machine State</h4>
            </div>
            <div class="card-body">
              <div class="state-value">
                {stateMachineState || 'loading'}
              </div>
              <div class="state-info-small">
                Legacy: <code>{authState || 'loading'}</code>
              </div>
            </div>
          </div>
          
          <div class="context-card card">
            <div class="card-header">
              <h4>Machine Context</h4>
            </div>
            <div class="card-body">
              <pre class="context-json">
                {JSON.stringify(stateMachineContext || { state: authState }, null, 2)}
              </pre>
            </div>
          </div>
        </div>
        
        <!-- State Machine Controls -->
        {#if authStore && authStore.stateMachine}
          <div class="machine-control-panel card">
            <div class="card-header">
              <h4>State Machine Controls</h4>
              <p class="text-secondary">Send events to transition between states</p>
            </div>
            <div class="card-body">
              <div class="control-grid">
                <div class="control-group">
                  <h5>Session Events</h5>
                  <div class="control-buttons">
                    <button class="btn btn-outline btn-sm" on:click={() => authStore.checkSession()}>
                      CHECK_SESSION
                    </button>
                    <button class="btn btn-outline btn-sm" on:click={() => authStore.stateMachine.send({ type: 'INVALID_SESSION' })}>
                      INVALID_SESSION
                    </button>
                  </div>
                </div>
                
                <div class="control-group">
                  <h5>User Input Events</h5>
                  <div class="control-buttons">
                    <button class="btn btn-outline btn-sm" on:click={() => authStore.clickNext()}>
                      USER_CLICKS_NEXT
                    </button>
                    <button class="btn btn-outline btn-sm" on:click={() => authStore.typeEmail(emailInput || 'demo@test.com')}>
                      EMAIL_TYPED
                    </button>
                    <button class="btn btn-outline btn-sm" on:click={() => authStore.clickContinue()}>
                      CONTINUE_CLICKED
                    </button>
                  </div>
                </div>
                
                <div class="control-group">
                  <h5>Auth Flow Events</h5>
                  <div class="control-buttons">
                    <button class="btn btn-outline btn-sm" on:click={() => authStore.stateMachine.send({ type: 'PASSKEY_SELECTED', credential: {} })}>
                      PASSKEY_SELECTED
                    </button>
                    <button class="btn btn-outline btn-sm" on:click={() => authStore.stateMachine.send({ type: 'WEBAUTHN_SUCCESS', response: {} })}>
                      WEBAUTHN_SUCCESS
                    </button>
                    <button class="btn btn-outline btn-sm" on:click={() => authStore.stateMachine.send({ type: 'WEBAUTHN_ERROR', error: { code: 'test', message: 'Test error' }, timing: 1000 })}>
                      WEBAUTHN_ERROR
                    </button>
                  </div>
                </div>
                
                <div class="control-group">
                  <h5>Reset Events</h5>
                  <div class="control-buttons">
                    <button class="btn btn-outline btn-sm" on:click={() => authStore.resetToAuth()}>
                      RESET_TO_COMBINED_AUTH
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        {/if}
        
        <div class="state-info card">
          <div class="card-body">
            <h4>All State Machine States (26 Total)</h4>
            <p>The authentication state machine manages these states:</p>
            
            <div class="states-grid">
              <div class="state-category">
                <h5>Session Management</h5>
                <ul>
                  <li><code>checkingSession</code> - Initial session validation</li>
                  <li><code>sessionValid</code> - Existing valid session found</li>
                  <li><code>sessionInvalid</code> - No valid session, needs authentication</li>
                </ul>
              </div>
              
              <div class="state-category">
                <h5>Authentication Flow</h5>
                <ul>
                  <li><code>combinedAuth</code> - Combined authentication form</li>
                  <li><code>emailCodeInput</code> - PIN/code entry state</li>
                  <li><code>conditionalMediation</code> - Passkey auto-discovery</li>
                  <li><code>autofillPasskeys</code> - Autofill passkey suggestions</li>
                  <li><code>waitForExplicit</code> - Waiting for explicit user action</li>
                  <li><code>explicitAuth</code> - Explicit authentication flow</li>
                </ul>
              </div>
              
              <div class="state-category">
                <h5>User Management</h5>
                <ul>
                  <li><code>auth0UserLookup</code> - Looking up user in Auth0</li>
                  <li><code>directWebAuthnAuth</code> - Direct WebAuthn authentication</li>
                  <li><code>passkeyRegistration</code> - Passkey registration flow</li>
                  <li><code>newUserRegistration</code> - New user registration</li>
                  <li><code>webauthnRegister</code> - WebAuthn registration</li>
                </ul>
              </div>
              
              <div class="state-category">
                <h5>Authentication States</h5>
                <ul>
                  <li><code>authenticatedUnconfirmed</code> - Logged in but email unverified</li>
                  <li><code>authenticatedConfirmed</code> - Full access after verification</li>
                  <li><code>biometricPrompt</code> - WebAuthn authentication prompt</li>
                  <li><code>auth0WebAuthnVerify</code> - WebAuthn verification with Auth0</li>
                </ul>
              </div>
              
              <div class="state-category">
                <h5>Error Handling</h5>
                <ul>
                  <li><code>passkeyError</code> - General passkey error</li>
                  <li><code>errorHandling</code> - Generic error handling</li>
                  <li><code>credentialNotFound</code> - No matching credential</li>
                  <li><code>userCancellation</code> - User cancelled operation</li>
                  <li><code>credentialMismatch</code> - Credential mismatch error</li>
                </ul>
              </div>
              
              <div class="state-category">
                <h5>Session Creation</h5>
                <ul>
                  <li><code>auth0TokenExchange</code> - Token exchange process</li>
                  <li><code>sessionCreated</code> - New session established</li>
                  <li><code>loadingApp</code> - Loading application</li>
                  <li><code>appLoaded</code> - Authentication complete</li>
                </ul>
              </div>
            </div>
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

  /* Sidebar Layout */
  .demo-layout {
    display: grid;
    grid-template-columns: 320px 1fr 320px;
    gap: 2rem;
    align-items: start;
  }

  .config-sidebar, .state-machine-sidebar {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 0.75rem;
    padding: 1.5rem;
    height: fit-content;
    position: sticky;
    top: 2rem;
  }

  .sidebar-header {
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border-color);
  }

  .sidebar-header h3 {
    margin: 0 0 0.5rem 0;
    color: var(--text-primary);
    font-size: 1.25rem;
    font-weight: 600;
  }

  .sidebar-header .text-secondary {
    margin: 0;
    font-size: 0.9rem;
  }

  .config-section {
    margin-bottom: 1.5rem;
  }

  .config-section h4 {
    margin: 0 0 0.75rem 0;
    color: var(--text-primary);
    font-size: 1rem;
    font-weight: 500;
  }

  .section-desc {
    margin: 0 0 0.75rem 0;
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .quick-emails {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .demo-main {
    min-height: 60vh;
  }

  /* Responsive adjustments */
  @media (max-width: 1200px) {
    .demo-layout {
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }

    .config-sidebar, .state-machine-sidebar {
      position: static;
    }
  }

  /* Overview state machine responsive */
  @media (max-width: 900px) {
    .state-machine-container {
      padding: 0.5rem;
    }
    
    .state-stats {
      flex-direction: column;
      gap: 1rem;
    }
    
    .stat-item {
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
    }
  }

  .config-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
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


  /* Auth State Controls */
  .auth-state-controls {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .state-section {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .current-state {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .state-badge {
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-sm);
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .state-badge.authenticated {
    background: #dcfce7;
    color: #15803d;
    border: 1px solid #bbf7d0;
  }

  .state-badge.unauthenticated {
    background: #fef3c7;
    color: #d97706;
    border: 1px solid #fed7aa;
  }

  .state-badge.loading {
    background: #dbeafe;
    color: #2563eb;
    border: 1px solid #bfdbfe;
  }

  .state-badge.error {
    background: #fee2e2;
    color: #dc2626;
    border: 1px solid #fecaca;
  }

  .state-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .machine-controls {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border-color);
  }

  .event-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .machine-state-badge {
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-sm);
    font-size: 0.8rem;
    font-weight: 600;
    background: #e0f2fe;
    color: #0369a1;
    border: 1px solid #bae6fd;
    font-family: var(--font-mono, 'Monaco', 'Menlo', 'Ubuntu Mono', monospace);
  }

  .context-group {
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--border-color);
  }

  .context-group:last-child {
    border-bottom: none;
    margin-bottom: 0;
  }

  .context-info {
    margin-top: 0.5rem;
  }


  .context-data {
    margin-top: 0.5rem;
    padding: 0.75rem;
    background: var(--background-muted);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-color);
  }

  .context-item {
    font-size: 0.8rem;
    color: var(--text-secondary);
    margin: 0.25rem 0;
    font-family: var(--font-mono, 'Monaco', 'Menlo', 'Ubuntu Mono', monospace);
    padding-left: 0.5rem;
  }


  /* State Machine Panel Styles */
  .machine-control-panel {
    margin-bottom: 2rem;
  }

  .control-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
  }

  .control-group {
    padding: 1rem;
    background: var(--background-muted);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-color);
  }

  .control-group h5 {
    margin: 0 0 0.75rem 0;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-primary);
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 0.5rem;
  }

  .control-buttons {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .control-buttons .btn {
    font-size: 0.8rem;
    font-family: var(--font-mono, 'Monaco', 'Menlo', 'Ubuntu Mono', monospace);
    text-align: left;
    justify-content: flex-start;
  }

  .state-info-small {
    margin-top: 0.5rem;
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  .states-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
    margin-top: 1rem;
  }

  .state-category {
    padding: 1rem;
    background: var(--background-muted);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-color);
  }

  .state-category h5 {
    margin: 0 0 0.75rem 0;
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--primary-color);
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 0.5rem;
  }

  .state-category ul {
    margin: 0;
    padding-left: 1.5rem;
    color: var(--text-secondary);
    font-size: 0.85rem;
    line-height: 1.5;
  }

  .state-category li {
    margin: 0.25rem 0;
  }

  .state-category code {
    font-family: var(--font-mono, 'Monaco', 'Menlo', 'Ubuntu Mono', monospace);
    background: var(--background-primary);
    padding: 0.2rem 0.4rem;
    border-radius: 0.25rem;
    border: 1px solid var(--border-color);
    color: var(--primary-color);
    font-weight: 500;
  }

  /* State Machine Sidebar Compact Styles */
  .state-display-compact {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .state-item-compact {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    background: var(--background-muted);
    border-radius: var(--radius-sm);
    font-size: 0.85rem;
  }

  .state-label {
    font-weight: 500;
    color: var(--text-secondary);
  }

  .event-controls-compact {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .control-group-compact {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .group-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-primary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .control-buttons-compact {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  .control-buttons-compact .btn {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    min-height: auto;
  }

  .context-details-compact {
    background: var(--background-muted);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-color);
  }

  .context-summary {
    cursor: pointer;
    padding: 0.75rem;
    font-weight: 500;
    color: var(--text-primary);
    font-size: 0.9rem;
  }

  .context-summary:hover {
    background: var(--background-primary);
  }

  .context-data-compact {
    padding: 0.75rem;
    border-top: 1px solid var(--border-color);
  }

  .context-item-compact {
    font-size: 0.8rem;
    color: var(--text-secondary);
    margin: 0.25rem 0;
    font-family: var(--font-mono, 'Monaco', 'Menlo', 'Ubuntu Mono', monospace);
    word-break: break-word;
  }

  .context-item-compact strong {
    color: var(--text-primary);
    font-weight: 600;
  }

  .no-state-machine {
    padding: 2rem 1rem;
    text-align: center;
    background: var(--background-muted);
    border-radius: var(--radius-sm);
    border: 2px dashed var(--border-color);
  }

  .graph-error {
    padding: 1rem;
    background: var(--background-muted);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    font-size: 0.85rem;
  }

  .graph-error p {
    margin: 0 0 0.75rem 0;
    color: #dc2626;
    font-weight: 500;
  }

  /* Overview State Machine Section */
  .state-machine-overview {
    margin: 2rem 0;
    background: var(--card-bg);
    border: 1px solid var(--border-color);
  }

  .state-machines-container {
    margin-bottom: 1.5rem;
    background: var(--background-muted);
    border-radius: var(--radius-sm);
    padding: 1rem;
    overflow: visible;
    position: relative;
  }

  .machine-grid {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .machine-section {
    background: white;
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .compact-machine {
    margin-bottom: 1rem;
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .compact-machine:last-child {
    margin-bottom: 0;
  }

  @media (max-width: 1200px) {
    .machine-grid {
      grid-template-columns: 1fr;
    }
  }
  
  .diagram-controls {
    display: flex;
    gap: 1rem;
    align-items: center;
    padding: 0.75rem;
    background: var(--background-muted);
    border-radius: var(--radius-sm);
    margin-bottom: 1rem;
  }
  
  .diagram-controls .control-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .diagram-controls input[type="checkbox"] {
    margin: 0;
  }
  
  .diagram-controls .form-select {
    padding: 0.25rem 0.5rem;
    font-size: 0.9rem;
    min-width: 150px;
  }

  .state-info {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .state-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 2rem;
    padding: 1rem;
    background: var(--background-primary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .stat-label {
    font-size: 0.85rem;
    color: var(--text-secondary);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .stat-value {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--primary-color);
    font-family: var(--font-mono, 'Monaco', 'Menlo', 'Ubuntu Mono', monospace);
  }

  .state-description {
    color: var(--text-secondary);
    line-height: 1.6;
    margin: 0;
  }

  .state-description strong {
    color: var(--text-primary);
    font-weight: 600;
  }

  .state-display {
    padding: 20px;
    border: 1px solid var(--border-light);
    border-radius: 8px;
    background: var(--bg-surface);
    text-align: center;
  }

  .state-display h4 {
    margin: 0 0 10px 0;
    color: var(--text-primary);
    font-size: 14px;
    font-weight: 600;
  }

  .state-value {
    font-size: 16px;
    font-weight: 600;
    color: var(--accent-color);
    margin-bottom: 5px;
  }

  .signin-state {
    font-size: 12px;
    color: var(--text-secondary);
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


  .integration-note {
    margin-top: 1.5rem;
    padding: 1rem;
    background: rgba(59, 130, 246, 0.05);
    border: 1px solid rgba(59, 130, 246, 0.2);
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

  /* i18n Configuration Styles */
  .config-section {
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1rem;
    margin: 1rem 0;
    background: var(--surface-variant);
  }

  .config-section-title {
    margin: 0 0 1rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 0.5rem;
  }

  .config-info {
    background: var(--surface-secondary);
    padding: 0.75rem;
    border-radius: 6px;
    border-left: 3px solid var(--primary-color);
  }

  .info-line {
    margin: 0.25rem 0;
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .info-line strong {
    color: var(--text-primary);
    font-weight: 600;
  }
</style>