<script>
import { browser } from '$app/environment';
import { onMount, getContext } from 'svelte';
// Paraglide demo translations
import * as m from '../paraglide/messages.js';
import { getLocale } from '../paraglide/runtime.js';

import { CaretRight, User, Envelope, Key, Shield, Pulse, Gear } from 'phosphor-svelte';
import { ErrorReportingStatus, AUTH_CONTEXT_KEY } from '@thepia/flows-auth';

// ✅ RECEIVE AUTH STORE VIA CONTEXT (to avoid slot prop timing issues)
// Get authStore from context (setupAuthContext in layout sets the actual store)
const authStore = getContext(AUTH_CONTEXT_KEY);

// Component state
let currentUser = null;
let authState = 'unauthenticated'; // Start with unauthenticated, not loading
let stateMachineState = null;

// 🔑 Reactive locale tracking for component rerenders
$: currentLocale = getLocale();
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
      'signIn.subtitle': 'Receive task lists and work requests directly from the coordinator.',
      'signIn.subtitleGeneric': 'Receive task lists and work requests directly from the coordinator.',
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
    // Import main components from main package
    const authModule = await import('@thepia/flows-auth');
    const { SignInForm, SignInCore } = authModule;

    // Import Flow components from dev export (avoids @xyflow/svelte in main bundle)
    const devModule = await import('@thepia/flows-auth/dev');
    const { SessionStateMachineFlow, SignInStateMachineFlow } = devModule;

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
              access_token: 'demo_token_' + Date.now(),
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
              access_token: 'demo_token_' + Date.now(),
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

// Update authStore config when controls change
$: if (authStore && authStore.updateConfig) {
  authStore.updateConfig({
    enablePasskeys,
    enableMagicLinks,
    signInMode,
    language: selectedLanguage,
    fallbackLanguage: 'en',
    branding: {
      ...authConfig?.branding,
      companyName: currentClientVariant.companyName
    }
  });
}

// Create reactive config that updates when controls change
$: dynamicAuthConfig = authConfig ? {
  ...authConfig,
  enablePasskeys,
  enableMagicLinks,
  signInMode,
  // i18n configuration
  language: selectedLanguage,
  fallbackLanguage: 'en',
  // Update branding with client variant
  branding: {
    ...authConfig.branding,
    companyName: currentClientVariant.companyName
  }
} : null;

// Note: Config logging removed to prevent console spam
</script>

<!-- 🔑 Conditional wrapper forces rerender when locale changes -->
{#if currentLocale}
<div class="demo-container">



  <!-- Demo Content -->
  <div class="demo-content">
    
    {#if selectedDemo === 'overview'}
      <div class="content-section">
        <h2>{m["overview.title"]()}</h2>
        <p>{m["overview.subtitle"]()}</p>
        
        <div class="feature-grid">
          <div class="feature-card">
            <Shield size={48} weight="regular" class="feature-icon" />
            <h3>{m["overview.features.passkeys.title"]()}</h3>
            <p>{m["overview.features.passkeys.description"]()}</p>
            <a href="/signin" class="feature-link">{m["overview.try_signin"]()}</a>
          </div>
          <div class="feature-card">
            <User size={48} weight="regular" class="feature-icon" />
            <h3>{m["overview.features.magic_links.title"]()}</h3>
            <p>{m["overview.features.magic_links.description"]()}</p>
            <a href="/register" class="feature-link">{m["overview.try_register"]()}</a>
          </div>
          <div class="feature-card">
            <Pulse size={48} weight="bold" class="feature-icon" />
            <h3>{m["overview.features.state_machine.title"]()}</h3>
            <p>{m["overview.features.state_machine.description"]()}</p>
          </div>
          <div class="feature-card">
            <Gear size={48} weight="regular" class="feature-icon" />
            <h3>{m["overview.features.multi_language.title"]()}</h3>
            <p>{m["overview.features.multi_language.description"]()}</p>
          </div>

          <!-- Phosphor Icons Demo Section -->
          <div class="feature-card phosphor-demo-card">
            <div class="phosphor-demo-header">
              <Shield size={32} weight="duotone" />
              <h3>Phosphor Icons Demo</h3>
            </div>
            <p>New icon system with multiple weights and enhanced theming</p>

            <div class="icon-weights-demo">
              <div class="weight-example">
                <Key size={24} weight="thin" />
                <span>Thin</span>
              </div>
              <div class="weight-example">
                <Key size={24} weight="light" />
                <span>Light</span>
              </div>
              <div class="weight-example">
                <Key size={24} weight="regular" />
                <span>Regular</span>
              </div>
              <div class="weight-example">
                <Key size={24} weight="bold" />
                <span>Bold</span>
              </div>
              <div class="weight-example">
                <Key size={24} weight="fill" />
                <span>Fill</span>
              </div>
              <div class="weight-example">
                <Key size={24} weight="duotone" />
                <span>Duotone</span>
              </div>
            </div>
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
        <h2>{m["signIn.title"]()}</h2>
        <p>{m["signIn.subtitle"]()}</p>
        <div class="signin-redirect-notice">
          <p>{m["signIn.redirect_notice"]()}</p>
          <a href="/signin" class="btn btn-primary">{m["signIn.go_to_demo"]()}</a>
        </div>
      </div>
    {:else if selectedDemo === 'register'}
      <div class="content-section">
        <h2>{m["register.title"]()}</h2>
        <p>{m["register.subtitle"]()}</p>
        <div class="signin-redirect-notice">
          <p>{m["register.redirect_notice"]()}</p>
          <a href="/register" class="btn btn-primary">{m["register.go_to_demo"]()}</a>
        </div>
      </div>

    
    {/if}
    
  </div>
</div>
{/if}

<style>
  .demo-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1rem;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
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



  /* Phosphor Icons Demo Styles */
  .phosphor-demo-card {
    grid-column: 1 / -1;
    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
    border: 2px solid var(--primary-color);
  }

  .phosphor-demo-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .icon-weights-demo {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 1rem;
    margin-top: 1.5rem;
  }

  .weight-example {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    background: white;
    border-radius: 0.5rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s ease;
  }

  .weight-example:hover {
    transform: translateY(-2px);
  }

  .weight-example span {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text-muted);
    text-transform: capitalize;
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
  
  .config-display {
    margin-bottom: 2rem;
  }
  
  .config-json {
    background: var(--background-muted);
    padding: 1rem;
    border-radius: var(--radius-sm);
    overflow-x: auto;
    font-size: 0.85rem;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    margin: 0;
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


  @media (max-width: 1200px) {
    .machine-grid {
      grid-template-columns: 1fr;
    }
  }


</style>