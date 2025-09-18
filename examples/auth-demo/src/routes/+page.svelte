<script>
import { browser } from '$app/environment';
import { onMount, getContext } from 'svelte';
import { _ } from 'svelte-i18n';
import { ChevronRight, User, Mail, Key, Shield, Activity, Settings } from 'lucide-svelte';
import { ErrorReportingStatus, AUTH_CONTEXT_KEY } from '@thepia/flows-auth';

// ✅ RECEIVE AUTH STORE VIA CONTEXT (to avoid slot prop timing issues)  
export let isAuthenticated = false;
export let user = null;

// Get authStore from context instead of props
const authStoreContext = getContext(AUTH_CONTEXT_KEY);
let authStore = null;

// Initialize authStore from context once
if (authStoreContext && browser) {
  authStore = $authStoreContext;
  console.log('📦 Auth store from context:', { authStore: !!authStore, isAuthenticated, user: !!user });
}

// Optional SvelteKit props
export let params = {};

// Component state  
let currentUser = null;
let authState = 'unauthenticated'; // Start with unauthenticated, not loading
let stateMachineState = null;
let stateMachineContext = null;
let authSubscribed = false;

// Auth config will be retrieved from the auth store (created in layout)
let authConfig = null;

// Get authConfig from authStore when available
$: if (authStore && authStore.getConfig) {
  authConfig = authStore.getConfig();
  console.log('⚙️ Auth config from authStore:', authConfig);
}

// State Machine components - loaded dynamically in onMount
let SessionStateMachineComponent = null;
let SignInStateMachineComponent = null;
let SignInFormComponent = null;
let SignInCoreComponent = null;

// Demo controls
let selectedDemo = 'overview';
let emailInput = '';
let testEmail = 'demo@example.com';


let currentDomain = 'dev.thepia.net';
let domainOptions = ['dev.thepia.net', 'thepia.net'];
let userStateResult = null;
let invitationToken = '';

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

// Simplified: Use auth store state directly instead of complex dual machine  
// These will be computed reactively from the auth store
// Note: authState already exists above

// Declare reactive variables first
let signInState = 'emailEntry';
let hasValidPinStatus = false;
let pinRemainingMinutes = 0;

// Reactive computations from auth store - simplified debugging
let lastLoggedState = null;
$: {
  if (authStore) {
    const storeValue = $authStore;

    // Only log when state actually changes to prevent spam
    if (storeValue.state !== lastLoggedState) {
      console.log('🔄 [Sidebar] Auth state changed:', {
        state: storeValue.state,
        signInState: storeValue.signInState,
        hasUser: !!storeValue.user,
        timestamp: new Date().toISOString()
      });
      lastLoggedState = storeValue.state;
    }

    // Update our local variables
    signInState = storeValue.signInState || 'emailEntry';
    hasValidPinStatus = hasValidPin(storeValue);
    pinRemainingMinutes = getPinTimeRemaining(storeValue) || 0;
  }
}

// i18n Configuration options
let selectedLanguage = 'en'; // 'en', 'da'
let selectedClientVariant = 'default'; // 'default', 'acme', 'techcorp', 'healthcare', 'app.thepia.net', 'custom'
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
  'app.thepia.net': {
    name: 'app.thepia.net',
    companyName: 'Task Coordination',
    translations: {
      'signIn.title': 'Receiving Requests',
      'signIn.description': 'Receive task lists and work requests directly from the coordinator.',
      'signIn.descriptionGeneric': 'Receive task lists and work requests directly from the coordinator.',
      'email.label': 'Personal e-mail',
      'email.placeholder': 'Enter your personal email address',
      'status.emailSent': "We'll send you a confirmation email to verify this address.",
      'status.checkEmail': 'Check your email',
      'auth.sendPinByEmail': 'Send Confirmation',
      'auth.signIn': 'Send Confirmation',
      'auth.loading': 'Sending...',
      'auth.sendingPin': 'Sending confirmation...',
      'status.signInSuccess': 'Confirmation sent successfully!',
      'webauthn.ready': '🔐 Secure authentication ready',
      'security.passwordlessExplanation': '🔐 {companyName} uses passwordless authentication with biometric passkeys or secure email confirmation for enhanced security.',
      'auth.signInWithPasskey': 'Continue with Touch ID/Face ID'
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


onMount(async () => {
  if (!browser) return;

  console.log('🎯 Demo page initializing...');
  
  try {
    // Single dynamic import for all components
    const authModule = await import('@thepia/flows-auth');
    const {
      SessionStateMachineFlow,
      SignInStateMachineFlow,
      SignInForm,
      SignInCore
    } = authModule;
    
    // Set component variables
    SessionStateMachineComponent = SessionStateMachineFlow;
    SignInStateMachineComponent = SignInStateMachineFlow;
    SignInFormComponent = SignInForm;
    SignInCoreComponent = SignInCore;
    
    console.log('✅ Auth components loaded dynamically');
    
    // Use auth store passed from layout (explicit prop passing pattern per ADR 0004)
    if (authStore) {
      console.log('🔐 Auth store available from props');
      
      // Subscribe to auth state changes
      authStore.subscribe((state) => {
        currentUser = state.user;
        authState = state.state;
        console.log('📊 Auth state update:', { 
          state: state.state, 
          signInState: state.signInState,
          hasValidPin: hasValidPin(state),
          pinRemainingMinutes: getPinTimeRemaining(state) || 0,
          user: !!state.user 
        });
      });
      
      // Subscribe to state machine updates if available
      if (authStore.stateMachine) {
        authStore.stateMachine.subscribe((sm) => {
          stateMachineState = sm.state;
          stateMachineContext = sm.context;
          console.log('🔧 State machine update:', { state: sm.state });
        });
      }
      
      console.log('✅ Auth store subscriptions configured');
    } else {
      console.log('⏳ Auth store not yet available - will be provided by layout');
    }
    
    console.log('✅ Demo page initialization complete');

  } catch (error) {
    console.error('❌ Failed to initialize demo page:', error);
  }
});

// Note: Auth store subscriptions are handled in the reactive block above
// to avoid creating duplicate subscriptions

async function updateDomain() {
  // Update the auth config with new domain
  // TODO use the store to modify the domain used for passkeys. Config cannot be edited directly.
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

// Handle clicks on the SignIn state machine diagram
function handleSignInStateClick(clickedState) {
  console.log('🎯 State machine clicked:', clickedState, 'Current state:', signInState);
  
  if (!authStore) {
    console.warn('No auth store available for state transition - store is still initializing');
    console.log('Auth store status:', { authStore, isAuthenticated, user });
    return;
  }

  try {
    // Determine appropriate event based on clicked state and current state
    let event = null;
    
    switch (clickedState) {
      case 'emailEntry':
        // Reset to email entry
        event = { type: 'RESET' };
        break;
        
      case 'userChecked':
        // If we're in emailEntry, simulate user check
        if (signInState === 'emailEntry') {
          event = { 
            type: 'USER_CHECKED', 
            email: testEmail || emailInput || 'demo@example.com',
            exists: true, 
            hasPasskey: false 
          };
        }
        break;
        
      case 'passkeyPrompt':
        // Simulate transition to passkey prompt (user exists with passkey)
        if (signInState === 'emailEntry') {
          event = { 
            type: 'USER_CHECKED', 
            email: testEmail || emailInput || 'demo@example.com',
            exists: true, 
            hasPasskey: true 
          };
        }
        break;
        
      case 'emailVerification':
        // If we're in userChecked, simulate needing email verification
        if (signInState === 'userChecked') {
          event = { type: 'EMAIL_VERIFICATION_REQUIRED' };
        }
        break;
        
      case 'pinEntry':
        // Simulate PIN email sent
        if (signInState === 'emailVerification') {
          event = { type: 'EMAIL_SENT' };
        } else if (signInState === 'userChecked') {
          // Direct path to PIN entry via email sent
          event = { type: 'SENT_PIN_EMAIL' };
        }
        break;
        
      case 'signedIn':
        // Simulate successful authentication
        if (signInState === 'pinEntry') {
          event = { 
            type: 'PIN_VERIFIED', 
            session: {
              accessToken: 'demo_token_' + Date.now(),
              user: { 
                id: 'demo_user',
                email: testEmail || emailInput || 'demo@example.com',
                name: 'Demo User' 
              }
            }
          };
        } else if (signInState === 'passkeyPrompt') {
          event = { 
            type: 'PASSKEY_SUCCESS', 
            credential: {
              accessToken: 'demo_token_' + Date.now(),
              user: { 
                id: 'demo_user',
                email: testEmail || emailInput || 'demo@example.com',
                name: 'Demo User' 
              }
            }
          };
        }
        break;
        
      case 'passkeyRegistration':
        // Start passkey registration
        if (signInState === 'signedIn') {
          event = { type: 'REGISTER_PASSKEY' };
        }
        break;
        
      case 'generalError':
        // Simulate error
        event = { 
          type: 'ERROR', 
          error: {
            code: 'DEMO_ERROR',
            message: 'Demo error triggered from state machine click',
            type: 'demo',
            retryable: true
          }
        };
        break;
    }
    
    if (event) {
      console.log('🚀 Sending event to auth store:', event);
      const newState = authStore.sendSignInEvent(event);
      console.log('✅ State transition complete:', signInState, '->', newState);
    } else {
      console.log('⚠️ No valid transition from', signInState, 'to', clickedState);
    }
  } catch (error) {
    console.error('❌ Error in state transition:', error);
  }
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
  enableMagicLinks, 
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

// Note: Config logging removed to prevent console spam
</script>

<div class="demo-container">



  <!-- Demo Content -->
  <div class="demo-content">
    
    {#if selectedDemo === 'overview'}
      <div class="content-section">
        <h2>{$_('overview.title')}</h2>
        <p>{$_('overview.subtitle')}</p>
        
        <div class="feature-grid">
          <div class="feature-card">
            <Shield size={32} class="feature-icon" />
            <h3>{$_('overview.features.passkeys.title')}</h3>
            <p>{$_('overview.features.passkeys.description')}</p>
            <a href="/signin" class="feature-link">{$_('overview.try_signin')}</a>
          </div>
          <div class="feature-card">
            <User size={32} class="feature-icon" />
            <h3>{$_('overview.features.magic_links.title')}</h3>
            <p>{$_('overview.features.magic_links.description')}</p>
            <a href="/register" class="feature-link">{$_('overview.try_register')}</a>
          </div>
          <div class="feature-card">
            <Activity size={32} class="feature-icon" />
            <h3>{$_('overview.features.state_machine.title')}</h3>
            <p>{$_('overview.features.state_machine.description')}</p>
          </div>
          <div class="feature-card">
            <Settings size={32} class="feature-icon" />
            <h3>{$_('overview.features.multi_language.title')}</h3>
            <p>{$_('overview.features.multi_language.description')}</p>
          </div>
        </div>
        
        <!-- Interactive State Machine Visualization -->
        <div class="state-machine-overview card">
          <div class="card-header">
            <h3>🔧 Interactive State Machine</h3>
            <p class="text-secondary">Live visualization of the authentication flow - current state: <strong>{stateMachineState || 'checkingSession'}</strong></p>
          </div>
          <div class="card-body">            
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
                          handleSignInStateClick(state);
                        }}
                        on:stateClick={(e) => {
                          console.log('Sign-in state clicked event:', e.detail);
                          if (e.detail && e.detail.state) {
                            handleSignInStateClick(e.detail.state);
                          }
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
        <h2>{$_('signin.title')}</h2>
        <p>{$_('signin.subtitle')}</p>
        <div class="signin-redirect-notice">
          <p>{$_('signin.redirect_notice')}</p>
          <a href="/signin" class="btn btn-primary">{$_('signin.go_to_demo')}</a>
        </div>
      </div>
    {:else if selectedDemo === 'register'}
      <div class="content-section">
        <h2>{$_('register.title')}</h2>
        <p>{$_('register.subtitle')}</p>
        <div class="signin-redirect-notice">
          <p>{$_('register.redirect_notice')}</p>
          <a href="/register" class="btn btn-primary">{$_('register.go_to_demo')}</a>
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
    display: flex;
    flex-direction: column;
    gap: 1rem;
    transition: all 0.2s ease;
  }

  .feature-card:hover {
    border-color: var(--primary-color);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
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

  .feature-link {
    color: var(--primary-color);
    text-decoration: none;
    font-weight: 600;
    font-size: 0.9rem;
    margin-top: auto;
    transition: color 0.2s ease;
  }

  .feature-link:hover {
    color: var(--primary-color-dark);
    text-decoration: underline;
  }

  /* Signin redirect notice */
  .signin-redirect-notice {
    background: var(--background-muted);
    border: 1px solid var(--border-color);
    border-radius: 0.75rem;
    padding: 2rem;
    text-align: center;
    margin: 2rem 0;
  }

  .signin-redirect-notice p {
    margin-bottom: 1.5rem;
    color: var(--text-secondary);
    font-size: 1.1rem;
  }

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

  .btn:hover {
    background: var(--background-muted);
    border-color: var(--primary-color);
    transform: translateY(-1px);
  }

  .btn-primary {
    background: var(--primary-color);
    color: white;
    border-color: var(--primary-color);
  }

  .btn-primary:hover {
    background: var(--primary-color-dark);
    border-color: var(--primary-color-dark);
    color: white;
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
  .pin-badge {
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-sm);
    font-size: 0.8rem;
    font-weight: 600;
    background: #dcfce7;
    color: #15803d;
    border: 1px solid #bbf7d0;
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

  /* Interactive SignIn Machine Styles */
  .machine-status-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .current-signin-state {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--color-primary);
    padding: 0.5rem;
    background: var(--color-primary-light);
    border-radius: var(--radius-sm);
    text-align: center;
    font-family: monospace;
  }

  .action-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .action-buttons .btn {
    flex: 1;
    min-width: 120px;
  }

  .machine-diagram-section {
    margin-bottom: 2rem;
  }

  .signin-machine-container {
    background: #fafafa;
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .event-log {
    background: var(--color-background-secondary);
  }

  .log-instructions {
    line-height: 1.6;
  }

  .log-instructions ul {
    margin: 1rem 0;
    padding-left: 1.5rem;
  }

  .log-instructions li {
    margin-bottom: 0.5rem;
  }

  .current-state-display {
    margin-top: 1rem;
    padding: 1rem;
    background: var(--color-background);
    border-radius: var(--radius-sm);
    border-left: 4px solid var(--color-primary);
  }

  .signin-state-code {
    background: var(--color-primary-light);
    color: var(--color-primary);
    padding: 0.25rem 0.5rem;
    border-radius: 3px;
    font-weight: 600;
  }

  .loading-state {
    text-align: center;
    padding: 3rem;
    color: var(--color-text-secondary);
  }

  @media (max-width: 768px) {
    .machine-status-grid {
      grid-template-columns: 1fr;
    }
    
    .action-buttons .btn {
      min-width: 100px;
    }
  }

  @media (max-width: 1200px) {
    .machine-grid {
      grid-template-columns: 1fr;
    }
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