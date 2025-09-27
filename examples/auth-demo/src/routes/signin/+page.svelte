<script>
import { browser } from '$app/environment';
import { onMount, getContext } from 'svelte';
import { ErrorReportingStatus, AUTH_CONTEXT_KEY } from '@thepia/flows-auth';

// Paraglide i18n setup
import * as m from '../../paraglide/messages';
import { getLocale } from '../../paraglide/runtime.js';

// Error testing components
import ErrorTestMenu from '$lib/components/ErrorTestMenu.svelte';

// ✅ RECEIVE AUTH STORE VIA CONTEXT (to avoid slot prop timing issues)
export let isAuthenticated = false;
export let user = null;

// Get authStore from context instead of props
const authStoreContext = getContext(AUTH_CONTEXT_KEY);
let authStore = null;

// Initialize authStore from context once
if (authStoreContext && browser) {
  authStore = $authStoreContext;
  console.log('📦 [SIGNIN] Auth store from context:', {
    authStore: !!authStore,
    debugId: authStore?._debugId,
    signInState: authStore ? $authStore.signInState : 'none',
    isAuthenticated,
    user: !!user
  });
}

// Optional SvelteKit props
export const params = {};

// Component state
let currentUser = null;
let authState = 'unauthenticated'; // Start with unauthenticated, not loading
let stateMachineState = null;

// 🔑 Reactive locale tracking for component rerenders
$: currentLocale = getLocale() || 'en'; // Fallback to 'en' if locale not ready
let stateMachineContext = null;


// State Machine components - loaded dynamically in onMount
let SessionStateMachineComponent = null;
let SignInStateMachineComponent = null;
let SignInFormComponent = null;
let SignInCoreComponent = null;

// Demo controls
let emailInput = '';
let testEmail = 'demo@example.com';
let currentDomain = 'dev.thepia.net';
let domainOptions = ['dev.thepia.net', 'thepia.net'];

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

// Declare reactive variables first
let signInState = 'emailEntry';
let hasValidPinStatus = false;
let pinRemainingMinutes = 0;

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
    companyName: 'ACME Corp',
    translations: {
      'signIn.title': 'Welcome to ACME',
      'signIn.subtitle': 'Access your ACME account',
      'signIn.email.placeholder': 'Enter your ACME email'
    }
  },
  techcorp: { 
    name: 'TechCorp Solutions', 
    companyName: 'TechCorp',
    translations: {
      'signIn.title': 'TechCorp Portal',
      'signIn.subtitle': 'Innovation starts here',
      'signIn.email.placeholder': 'your.email@techcorp.com'
    }
  },
  healthcare: { 
    name: 'MedSecure Health', 
    companyName: 'MedSecure',
    translations: {
      'signIn.title': 'MedSecure Access',
      'signIn.subtitle': 'Secure healthcare portal',
      'signIn.email.placeholder': 'healthcare.professional@medsecure.com'
    }
  },
  'app.thepia.net': { 
    name: 'Thepia App Portal', 
    companyName: 'Thepia',
    translations: {
      'signIn.title': 'Thepia App',
      'signIn.subtitle': 'Your productivity workspace',
      'signIn.email.placeholder': 'Enter your work email'
    }
  },
  custom: { 
    name: 'Custom Configuration', 
    companyName: 'Your Company',
    translations: {} // Will be populated from textarea
  }
};

// Reactive computations from auth store - simplified debugging
let lastLoggedState = null;
$: {
  if (authStore) {
    const storeValue = $authStore;

    // Only log when state actually changes to prevent spam
    if (storeValue.state !== lastLoggedState) {
      console.log('🔄 [SignIn] Auth state changed:', {
        state: storeValue.state,
        signInState: storeValue.signInState,
        hasUser: !!storeValue.user,
        timestamp: new Date().toISOString()
      });
      lastLoggedState = storeValue.state;
    }

    // Update our local variables to stay synchronized with the store
    signInState = storeValue.signInState || 'emailEntry';
    hasValidPinStatus = hasValidPin(storeValue);
    pinRemainingMinutes = getPinTimeRemaining(storeValue) || 0;
    authState = storeValue.state;
    currentUser = storeValue.user;
  }
}

// Helper functions for PIN status
function hasValidPin(storeValue) {
  return storeValue?.pinStatus?.isValid || false;
}

function getPinTimeRemaining(storeValue) {
  if (!storeValue?.pinStatus?.isValid) return 0;
  const expiresAt = storeValue.pinStatus.expiresAt;
  if (!expiresAt) return 0;
  const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / (1000 * 60)));
  return remaining;
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

// Get current client variant and build translation overrides
$: currentClientVariant = clientVariants[selectedClientVariant] || clientVariants.default;
$: combinedTranslations = selectedClientVariant === 'custom' 
  ? customTranslationOverrides 
  : {
      ...currentClientVariant.translations,
      ...customTranslationOverrides
    };


// Config is now managed entirely through authStore.updateConfig() calls above

// Handle clicks on the SignIn state machine diagram
function handleSignInStateClick(clickedState) {
  console.log('🎯 [SIGNIN] State machine clicked:', clickedState, 'Current state:', signInState);

  if (!authStore) {
    console.warn('No auth store available for state transition - store is still initializing');
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
        // Simulate user check
        event = { type: 'USER_CHECKED' };
        break;

      case 'passkeyPrompt':
        // Simulate passkey prompt
        event = { type: 'PASSKEY_AVAILABLE' };
        break;

      case 'pinEntry':
        // Simulate PIN entry
        event = { type: 'SENT_PIN_EMAIL' };
        break;

      case 'emailVerification':
        // Simulate email verification required
        event = { type: 'EMAIL_VERIFICATION_REQUIRED' };
        break;

      case 'passkeyRegistration':
        // Simulate passkey registration
        event = { type: 'REGISTER_PASSKEY' };
        break;

      case 'signedIn':
        // Simulate successful authentication
        event = {
          type: 'EMAIL_VERIFIED',
          session: {
            accessToken: 'demo-token',
            refreshToken: 'demo-refresh',
            user: { id: 'demo-user', email: 'demo@example.com', name: 'Demo User' },
            expiresAt: Date.now() + 24 * 60 * 60 * 1000,
            lastActivity: Date.now()
          }
        };
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
      console.log('🚀 [SIGNIN] Sending event to auth store:', event);
      const newState = authStore.sendSignInEvent(event);
      console.log('✅ [SIGNIN] State transition complete:', signInState, '->', newState);
    } else {
      console.log('⚠️ [SIGNIN] No valid transition from', signInState, 'to', clickedState);
    }
  } catch (error) {
    console.error('❌ [SIGNIN] Error in state transition:', error);
  }
}

// Dynamic component loading
onMount(async () => {
  if (browser) {
    try {
      // Single dynamic import for all components
      const authModule = await import('@thepia/flows-auth');

      const { SessionStateMachineFlow, SignInStateMachineFlow, SignInForm, SignInCore } = authModule;

      SessionStateMachineComponent = SessionStateMachineFlow;
      SignInStateMachineComponent = SignInStateMachineFlow;
      SignInFormComponent = SignInForm;
      SignInCoreComponent = SignInCore;

      // Note: Using demo-specific Paraglide setup, not library i18n

      console.log('✅ Auth components loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load auth components:', error);
    }
  }
});
</script>

<!-- 🔑 Conditional wrapper forces rerender when locale changes -->
{#if currentLocale}
<div class="signin-page">
  <div class="page-header">
    <h1>{m["signIn.title"]()}</h1>
    <p>{m["signIn.subtitleGeneric"]()}</p>
  </div>
  
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
            <span class="config-label">Store State:</span>
            <span class="state-badge {authState}">{authState}</span>
          </div>
          <!-- Sign In State -->
          <div class="state-section">
            <span class="config-label">SignIn State:</span>
            <span class="machine-state-badge">{signInState}</span>
          </div>
          <!-- PIN Status -->
          {#if hasValidPinStatus}
            <div class="state-section">
              <span class="config-label">PIN:</span>
              <span class="pin-badge">Valid ({pinRemainingMinutes}min)</span>
            </div>
          {/if}

          <!-- New Store Properties Pills -->
          {#if authStore}
            <div class="state-section">
              <span class="config-label">Store Props:</span>
              <div class="pills-container">
                <span class="pill {$authStore.loading ? 'active' : 'inactive'}">
                  {$authStore.loading ? '⏳' : '✅'} loading
                </span>
                <span class="pill {$authStore.emailCodeSent ? 'active' : 'inactive'}">
                  {$authStore.emailCodeSent ? '📧' : '📭'} codeSent
                </span>
                <span class="pill {$authStore.userExists === true ? 'active' : $authStore.userExists === false ? 'inactive' : 'neutral'}">
                  {$authStore.userExists === true ? '👤' : $authStore.userExists === false ? '👻' : '❓'} userExists
                </span>
                <span class="pill {$authStore.hasPasskeys ? 'active' : 'inactive'}">
                  {$authStore.hasPasskeys ? '🔑' : '🚫'} passkeys
                </span>
                <span class="pill {$authStore.conditionalAuthActive ? 'active' : 'inactive'}">
                  {$authStore.conditionalAuthActive ? '🔄' : '⏸️'} conditional-auth
                </span>
                <span class="pill {$authStore.platformAuthenticatorAvailable ? 'active' : 'inactive'}">
                  {$authStore.platformAuthenticatorAvailable ? '📱' : '💻'} platform-auth
                </span>
                <span class="pill {$authStore.hasValidPin ? 'active' : 'inactive'}">
                  {$authStore.hasValidPin ? '🔢' : '❌'} valid-pin
                </span>
                <span class="pill">
                  email: {$authStore.email}
                </span>
                <span class="pill">
                  code: {$authStore.emailCode}
                </span>
              </div>
            </div>
          {/if}
        </div>
      </div>
  
      <!-- Configuration Controls -->
      <div class="config-grid">
        <div class="config-group">
          <span class="config-label">User Handling:</span>
          <div class="radio-group">
            <label class="radio-option">
              <input type="radio" bind:group={signInMode} value="login-only"
                     on:change={() => authStore?.updateConfig?.({ signInMode })} />
              <span>Login Only (error for new users)</span>
            </label>
            <label class="radio-option">
              <input type="radio" bind:group={signInMode} value="login-or-register"
                     on:change={() => authStore?.updateConfig?.({ signInMode })} />
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

        <!-- Note: i18n Configuration Controls removed for cleaner demo -->

        <div class="config-group">
          <div class="config-label">Authentication Methods:</div>
          <div class="checkbox-group">
            <label class="checkbox-option">
              <input type="checkbox" bind:checked={enablePasskeys} 
                     on:change={() => authStore?.updateConfig?.({ enablePasskeys })} />
              <span>Enable Passkeys</span>
            </label>
            <label class="checkbox-option">
              <input type="checkbox" bind:checked={enableMagicLinks}
                     on:change={() => authStore?.updateConfig?.({ enableMagicLinks })} />
              <span>Enable Magic Links</span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Demo Area -->
    <div class="demo-main">
      <!-- Live SignInCore Component -->
      {#if authStore}
        <!-- Debug: Log what should be shown -->
        {#if browser}
          {console.log('🔍 SignIn demo conditions:', { authStore: !!authStore, useSignInForm, formVariant, SignInCoreComponent: !!SignInCoreComponent })}
        {/if}
        {#if useSignInForm && formVariant === 'popup'}
          <!-- Popup SignInForm - no card wrapper to avoid double borders -->
          {#if browser && SignInFormComponent}
            <svelte:component this={SignInFormComponent}
              initialEmail={emailInput}
              size={formSize}
              variant={formVariant}
              popupPosition={popupPosition}
              className="demo-signin-form"
              explainFeatures={true}

              on:success={(e) => handleSignInSuccess(e.detail)}
              on:error={(e) => handleSignInError(e.detail)}
              on:stepChange={(e) => handleStepChange(e.detail)}
            />
          {:else}
            <div class="signin-loading">
              <p>{m["signIn.loading_form"]()}</p>
            </div>
          {/if}
        {:else}
          <!-- Inline components with card wrapper -->

              {#if useSignInForm}
                {#if browser && SignInFormComponent}
                  <svelte:component this={SignInFormComponent}
                    initialEmail={emailInput}
                    size={formSize}
                    variant={formVariant}
                    popupPosition={popupPosition}
                    className="demo-signin-form"
                    explainFeatures={true}

                    on:success={(e) => handleSignInSuccess(e.detail)}
                    on:error={(e) => handleSignInError(e.detail)}
                    on:stepChange={(e) => handleStepChange(e.detail)}
                    on:close={handleSignInClose}
                  />
                {:else}
                  <div class="signin-loading">
                    <p>{m["signIn.loading_form"]()}</p>
                  </div>
                {/if}
              {:else}
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
                              {#if browser && SignInCoreComponent}

                                  <svelte:component this={SignInCoreComponent}
                      authStore={authStore}
                      initialEmail={emailInput}
                      className="demo-signin-form {signInCoreLayout === 'hero-centered' ? 'hero-style' : ''}"
                      explainFeatures={true}

                      on:success={(e) => handleSignInSuccess(e.detail)}
                      on:error={(e) => handleSignInError(e.detail)}
                      on:stepChange={(e) => handleStepChange(e.detail)}
                    />
                {:else}
                  <div class="signin-loading">
                    <p>{m["signIn.loading_core"]()}</p>
                  </div>
                {/if}
            </div>
          </div>
              {/if}
        {/if}
      {/if}
    </div>

    <!-- State Machine Sidebar (Right) -->
    <div class="state-machine-sidebar">
      <div class="sidebar-header">
        <h3>{m["signIn.state_machine_title"]()}</h3>
        <p class="text-secondary">{m["signIn.state_machine_description"]()}</p>
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

            <!-- Sign-In State Machine (Interactive) -->
            {#if SignInStateMachineComponent}
              <div class="compact-machine">
                <svelte:component this={SignInStateMachineComponent}
                  currentSignInState={signInState}
                  width={280}
                  height={200}
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
              <p>{m["signIn.loading_state_machines"]()}</p>
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
{/if}

<!-- Floating Error Test Menu (outside conditional block) -->
<ErrorTestMenu />

<style>
  .signin-page {
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem;
  }

  .page-header {
    margin-bottom: 2rem;
    text-align: center;
  }

  .page-header h1 {
    color: var(--primary-color);
    margin-bottom: 0.5rem;
    font-size: 2.5rem;
    font-weight: 700;
  }

  .page-header p {
    color: var(--text-secondary);
    font-size: 1.1rem;
    margin-bottom: 0;
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

  .config-section-title {
    margin: 0 0 1rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 0.5rem;
  }

  .quick-emails {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .demo-main {
    min-height: 60vh;
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
    color: var(--text-secondary);
  }

  .radio-option input[type="radio"] {
    margin: 0;
    width: 16px;
    height: 16px;
    accent-color: var(--primary-color);
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

  .info-line {
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
  }

  .info-line:last-child {
    margin-bottom: 0;
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

  .machine-state-badge {
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-sm);
    font-size: 0.8rem;
    font-weight: 600;
    background: #f3f4f6;
    color: #374151;
    border: 1px solid #d1d5db;
  }

  .pin-badge {
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-sm);
    font-size: 0.8rem;
    font-weight: 600;
    background: #dcfce7;
    color: #15803d;
    border: 1px solid #bbf7d0;
  }

  /* Pills Container */
  .pills-container {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    margin-top: 0.25rem;
  }

  /* Pill Styles */
  .pill {
    padding: 0.125rem 0.375rem;
    border-radius: var(--radius-sm);
    font-size: 0.7rem;
    font-weight: 500;
    border: 1px solid;
    white-space: nowrap;
  }

  .pill.active {
    background: #dcfce7;
    color: #15803d;
    border-color: #bbf7d0;
  }

  .pill.inactive {
    background: #f3f4f6;
    color: #6b7280;
    border-color: #d1d5db;
  }

  .pill.neutral {
    background: #fef3c7;
    color: #d97706;
    border-color: #fed7aa;
  }

  /* Sign-in components */
  .signin-demo {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 0.75rem;
    overflow: hidden;
  }

  .card-header {
    padding: 1.5rem;
    border-bottom: 1px solid var(--border-color);
    background: var(--background-muted);
  }

  .card-header h3 {
    margin: 0 0 0.5rem 0;
    color: var(--text-primary);
    font-size: 1.25rem;
    font-weight: 600;
  }

  .card-header .text-secondary {
    margin: 0;
    font-size: 0.9rem;
  }

  .card-body {
    padding: 1.5rem;
  }

  .signin-loading {
    text-align: center;
    padding: 2rem;
    color: var(--text-secondary);
  }

  .signin-core-container {
    width: 100%;
  }

  .signin-core-container.hero-centered {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 400px;
  }

  /* State machine visualization */
  .compact-machine {
    margin-bottom: 1rem;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .state-display {
    padding: 1rem;
    background: var(--background-muted);
    text-align: center;
  }

  .state-display h4 {
    margin: 0 0 0.5rem 0;
    font-size: 1rem;
    color: var(--text-primary);
  }

  .state-value {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--primary-color);
    margin-bottom: 0.25rem;
  }

  .signin-state {
    font-size: 0.9rem;
    color: var(--text-secondary);
  }

  .graph-error {
    padding: 1rem;
    text-align: center;
    color: var(--text-secondary);
  }

  .state-display-compact {
    padding: 1rem;
    background: var(--background-muted);
  }

  .state-item-compact {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .state-item-compact:last-child {
    margin-bottom: 0;
  }

  .state-label {
    font-size: 0.9rem;
    color: var(--text-secondary);
  }

  /* Event controls */
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
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .control-buttons-compact {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  /* Context details */
  .context-details-compact {
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
  }

  .context-summary {
    padding: 0.75rem;
    background: var(--background-muted);
    cursor: pointer;
    font-weight: 600;
    color: var(--text-primary);
  }

  .context-data-compact {
    padding: 1rem;
    border-top: 1px solid var(--border-color);
  }

  .context-item-compact {
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
  }

  .context-item-compact:last-child {
    margin-bottom: 0;
  }

  .no-state-machine {
    padding: 2rem;
    text-align: center;
  }

  /* Button styles */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    background: var(--card-bg);
    color: var(--text-primary);
    font-size: 0.9rem;
    font-weight: 500;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn:hover {
    background: var(--background-muted);
    border-color: var(--primary-color);
  }

  .btn-outline {
    background: transparent;
    border-color: var(--border-color);
  }

  .btn-outline:hover {
    background: var(--primary-color);
    color: white;
    border-color: var(--primary-color);
  }

  .btn-xs {
    padding: 0.25rem 0.5rem;
    font-size: 0.8rem;
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

  @media (max-width: 768px) {
    .signin-page {
      padding: 1rem;
    }

    .page-header h1 {
      font-size: 2rem;
    }

    .control-buttons-compact {
      flex-direction: column;
    }
  }
</style>
