<!--
  SignInCore - Core sign-in logic without container styling
  Orchestrates EmailInput, AuthButton, and AuthStateMessage
  Handles auth state machine integration
-->
<script lang="ts">
  import { run, preventDefault } from 'svelte/legacy';

import { createEventDispatcher, onMount } from 'svelte';
import type { SvelteAuthStore } from '@thepia/flows-auth';
import type { AuthError, AuthMethod, User } from '@thepia/flows-auth';
import { getAuthStoreFromContext } from '../../auth-context.js';
import { m } from '@thepia/flows-auth';
import { debug } from '../../utils/debug.js';

import AuthButton from './AuthButton.svelte';
import AuthExplainer from './AuthExplainer.svelte';
import AuthStateMessage from './AuthStateMessage.svelte';
import EmailInput from './EmailInput.svelte';
import CodeInput from './CodeInput.svelte';
import AuthNewUserInfo from './AuthNewUserInfo.svelte';
import UserManagement from '../UserManagement.svelte';
import PinEntryStep from './PinEntryStep.svelte';
import PolicyViewer from './PolicyViewer.svelte';


  interface Props {
    // Props
    store?: SvelteAuthStore | null; // Auth store prop (preferred)
    initialEmail?: string;
    className?: string;
    explainFeatures?: boolean; // Whether to show features list in explainer
  }

  let {
    store = null,
    initialEmail = '',
    className = '',
    explainFeatures = false
  }: Props = $props();

// NOTE: Legacy 'texts' prop has been removed. Use i18n translations instead.

// Auth store - use prop or fallback to context
// If store prop is provided, use it. Otherwise get from context (throws if missing).
// NOTE: kept as a plain `const`, not `$derived` — this component reads live state via
// the classic `$authStore.xxx` store-auto-subscription sigil throughout (including in
// an $effect's dependency list), which requires `authStore` itself to stay a plain
// store reference; wrapping it in a rune breaks that sigil (verified via svelte-autofixer).
const authStore = store || getAuthStoreFromContext();

let authConfig = $derived(authStore?.getConfig?.());

// Events
const dispatch = createEventDispatcher<{
  success: { user: User|null; method: AuthMethod };
  error: { error: AuthError };
  navigate: { section: 'passkeys' | 'profile' | 'privacy' | 'terms' };
}>();

// Component state (minimal - most state now in store)
let email = $state(initialEmail);
// emailCode is now in the store, not local state

// PolicyViewer state
let showPolicyModal = $state(false);

// Get current state from store reactively
let currentSignInState = $state('emailEntry');
run(() => {
    if (authStore) {
    currentSignInState = $authStore.signInState;
  }
  });

// Debounced function to check email for existing pins (reactive statement compatible)
let emailCheckTimeout: ReturnType<typeof setTimeout> | undefined;
async function checkUserForEmail(emailValue: string) {
  // Clear any existing timeout to debounce rapid changes
  if (emailCheckTimeout) {
    clearTimeout(emailCheckTimeout);
  }

  emailCheckTimeout = setTimeout(async () => {
    try {
      const trimmedEmail = emailValue.trim();

      if (!trimmedEmail) {
        authStore.setEmail('');
        return;
      }

      // Validate email format before making API call
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        return;
      }

      await authStore.checkUser(trimmedEmail);

    } catch {
      // Error handling is now managed by AuthStore
    }
  }, 400); // 400ms debounce to avoid too many API calls while typing
}

// Initialize component logic
async function initializeComponent() {
  // Only initialize if we have store and config
  if (!store || !authConfig) {
    debug('🔍 SignInCore: Waiting for store and config to be available');
    return;
  }

  const passkeysEnabled = $authStore.passkeysEnabled;
  const enablePasskeys = authConfig.enablePasskeys;
  const signInMode = authConfig.signInMode;
  debug('🔐 SignInCore Authentication Methods:', {
    passkeysEnabled,
    enablePasskeys,
    signInMode,
  });

  // If initial email is provided, check for existing pins and trigger conditional auth
  if (initialEmail) {
    authStore.setEmail(initialEmail);

    // Check for existing valid pins if app code is configured
    try {
      await authStore.checkUser(initialEmail);

      // Don't auto-advance to pin input on mount - let user choose their authentication method
      // The pin status message and smart button configuration will show appropriate options
    } catch (error) {
      authStore.setLoading(false);
      console.warn('Error checking for existing pins on mount:', error);
    }
    
    // Also trigger conditional auth if passkeys are enabled
    if ($authStore.passkeysEnabled) {
      await startConditionalAuthentication();
    }
  }
}

// Initialize on mount
onMount(() => {
  initializeComponent();

  // Expose showPolicyPopup globally for onclick handlers in HTML
  if (typeof window !== 'undefined') {
    (window as any).showPolicyPopup = () => {
      showPolicyModal = true;
    };
  }

  // Cleanup on unmount
  return () => {
    if (typeof window !== 'undefined') {
      delete (window as any).showPolicyPopup;
    }
  };
});

// Handle email changes and conditional auth
async function handleEmailChange(event: CustomEvent<{value: string}>) {
  if (!store) return;

  // Update local email variable to ensure reactive statement triggers
  email = event.detail.value;
  // Error clearing is now handled by AuthStore

  const newEmail = event.detail.value;
  const emailLength = newEmail.length;
  const emailTrim = newEmail.trim();
  const emailTrimLength = emailTrim.length;
  const authLoading = $authStore.loading;
  debug('📝 Email changed:', {
    newEmail,
    emailLength,
    emailTrim,
    emailTrimLength,
    buttonShouldBeEnabled: !authLoading && !!emailTrim
  });
}

async function handleConditionalAuth(event: CustomEvent<{email: string}>) {
  if ($authStore.conditionalAuthActive || $authStore.loading) return;

  const conditionalAuthEmail = event.detail.email;
  debug('🔍 Starting conditional authentication for:', conditionalAuthEmail);

  // Whether conditional auth succeeded is only known once the try below
  // resolves. The debug() call reporting success is deferred until after
  // the try/catch/finally so it doesn't sit inside the try body, which
  // would block dead-code elimination of the call in production builds.
  // (The catch-block debug() call below is unaffected by that rule and is
  // left where it is.)
  let conditionalAuthSucceeded = false;

  try {
    authStore.setConditionalAuthActive(true);

    const success = await authStore.startConditionalAuthentication(event.detail.email);
    if (success) {
      conditionalAuthSucceeded = true;
      dispatch('success', {
        user: $authStore.user,
        method: 'passkey',
      });
    }
  } catch (error) {
    // Conditional auth should fail silently - expected if no passkeys exist
    debug('⚠️ Conditional authentication failed (expected if no passkeys):', error);
  } finally {
    authStore.setConditionalAuthActive(false);
  }

  if (conditionalAuthSucceeded) {
    debug('✅ Conditional authentication successful');
  }
}

async function startConditionalAuthentication() {
  if ($authStore.conditionalAuthActive || !email.trim()) return;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return;

  await handleConditionalAuth(new CustomEvent('conditionalAuth', {
    detail: { email }
  }));
}


// Handle secondary action (pin fallback when passkey is primary)
async function handleSecondaryAction() {
  if (!email.trim() || !buttonConfig || !buttonConfig.secondary) return;

  authStore.setLoading(true);

  // Which branch below fires is only known once inside the try. The
  // corresponding debug() call is deferred until after the try/catch so it
  // doesn't sit inside the try body, which would block dead-code
  // elimination of the call in production builds.
  let secondaryPinBranch: 'existing' | 'new' | undefined;

  try {
    const secondaryMethod = buttonConfig.secondary.method;

    if (secondaryMethod === 'email-code') {
      // Check if user has a valid pin first
      if ($authStore.hasValidPin) {
        // Skip sending new code, go directly to verification step
        secondaryPinBranch = 'existing';
        authStore.setLoading(false);
        authStore.notifyPinSent();
      } else {
        // Send new pin
        secondaryPinBranch = 'new';
        await handleEmailCodeAuth();
      }
    }
  } catch (err: any) {
    authStore.setLoading(false);
    console.error('Secondary authentication error:', err);
    // Error handling is now managed by AuthStore
  }

  if (secondaryPinBranch === 'existing') {
    debug('🔢 Secondary action: Valid pin detected, going to verification step');
  } else if (secondaryPinBranch === 'new') {
    debug('📧 Secondary action: Sending new pin');
  }
}

// Handle primary sign in action
async function handleSignIn() {
  if (!email.trim()) return;

  authStore.setLoading(true);

  // The values below are only known once computed inside the try. Their
  // debug() calls are deferred until after the try/catch so they don't sit
  // inside the try body, which would block dead-code elimination of the
  // calls in production builds. (The early-account-creation debug() call
  // further down is left in place: it's followed by a `return` before the
  // end of the try, so deferring it would skip code that must still run.)
  let determinedAuthMethod: 'passkey-with-fallback' | 'email-code' | undefined;
  let validPinDetected = false;

  try {
    // Check what auth methods are available for this email (the user check is a bit redundant here)
    const userCheck = await authStore.checkUser(email);

    // Handle non-existing users based on config
    if (!userCheck.exists) {
      if (authConfig?.signInMode === 'login-only') {
        // Error will be shown via AuthStore apiError
        authStore.setLoading(false);
        return;
      } else if ($authStore.fullName && $authStore.fullName.trim()) {
        // User has entered Full Name, create account
        const [firstName, ...rest] = $authStore.fullName.trim().split(' ');
        const lastName = rest.join(' ');

        debug('🔄 Creating account:', { email, firstName, lastName });
        try {
          await authStore.createAccount({
            email: email.trim(),
            firstName,
            lastName,
            acceptedTerms: false,
            acceptedPrivacy: false,
            invitationToken: authConfig.invitationToken
          });
          await handleEmailCodeAuth();
          authStore.setLoading(false);
        } catch (registrationError: any) {
          console.error('❌ Account creation failed:', registrationError);
          // Error handling is now managed by AuthStore
          authStore.setLoading(false);
        }
        return;
      }
    }

    const authMethod = determineAuthMethod(userCheck);
    determinedAuthMethod = authMethod;

    switch (authMethod) {
      case 'passkey-with-fallback':
        try {
          await handlePasskeyAuth();
        } catch (passkeyError) {
          console.warn('Passkey authentication failed:', passkeyError);
          // Fall back to appropriate email method
          await handleEmailCodeAuth();
        }
        break;

      case 'email-code':
        // Check if user has a valid pin first
        if ($authStore.hasValidPin) {
          // Skip sending new code, go directly to verification step
          validPinDetected = true;
          authStore.setLoading(false);
          authStore.notifyPinSent();
        } else {
          await handleEmailCodeAuth();
        }
        break;
    }

  } catch (err: any) {
    authStore.setLoading(false);
    console.error('Authentication error:', err);
    // Error handling is now managed by AuthStore
  }

  if (determinedAuthMethod) {
    debug('🔐 Determined auth method:', determinedAuthMethod);
  }
  if (validPinDetected) {
    debug('🔢 Valid pin detected, skipping email send and going to verification step');
  }
}

// Determine the best authentication method based on config and user state.
// appCode is always configured (defaults to 'app'), so email-code is always
// available - there's no longer a "no auth method available" or "passkey
// with no fallback" case to handle.
function determineAuthMethod(userCheck: any): 'passkey-with-fallback' | 'email-code' {
  const hasPasskeys = userCheck.hasWebAuthn;

  if (hasPasskeys && $authStore.passkeysEnabled) {
    return 'passkey-with-fallback';
  }

  return 'email-code';
}

// Handle passkey authentication
async function handlePasskeyAuth() {
  try {
    const result = await authStore.signInWithPasskey(email);

    authStore.setLoading(false);
    if (result.step === 'success' && result.user) {
      dispatch('success', {
        user: result.user,
        method: 'passkey',
      });
    }
  } catch (err: any) {
    // Error handling is now managed by AuthStore
    throw err;
  }
}

// Handle email code authentication (transparently uses app endpoints if configured)
async function handleEmailCodeAuth() {
  try {
    const result = await authStore.sendEmailCode(email);

    authStore.setLoading(false);
    if (result.success) {
      // Notify auth store that PIN was sent to drive state transition
      authStore.notifyPinSent();
    } else {
      throw new Error(result.message || 'Failed to send email code');
    }
  } catch (err: any) {
    // Error handling is now managed by AuthStore
    throw err;
  }
}

// Email code verification now handled in PinEntryStep component

// Determine authentication method and button configuration (with null guards)
// Only depend on specific fields that affect button config, not the entire store
let buttonConfig = $derived((() => {
  // List dependencies explicitly to avoid reading the entire store
  const deps = [
    $authStore?.signInState,
    $authStore?.loading,
    $authStore?.email,
    $authStore?.emailCode,
    $authStore?.fullName,
    $authStore?.userExists,
    $authStore?.hasPasskeys
  ];
  return authStore?.getButtonConfig?.() ?? null;
})());

// State message configuration (centralized in AuthStore)
// CRITICAL: Depend on $authStore to trigger recalculation when ANY store state changes
let stateMessage = $derived($authStore ? authStore.getStateMessageConfig?.() ?? null : null);

// Explainer configuration (centralized in AuthStore)
let explainerConfig = $derived(authStore?.getExplainerConfig?.(explainFeatures) ?? null);

// Reactive statement to check for existing pins when email changes (handles autocomplete)
run(() => {
    if (authStore && email && (currentSignInState === 'emailEntry' || currentSignInState === 'userChecked' || currentSignInState === 'generalError')) {
    checkUserForEmail(email);
  }
  });
</script>

{#if authStore}
<div class="sign-in-core {className}">
  {#if currentSignInState === 'emailEntry' || currentSignInState === 'userChecked'}
    <!-- Combined Auth Step - Email entry with intelligent routing -->
    <form onsubmit={preventDefault(handleSignIn)}>
      <EmailInput
        value={email}
        label="email.label"
        placeholder="email.placeholder"
        disabled={$authStore.loading}
        enableWebAuthn={$authStore.passkeysEnabled}
        on:change={handleEmailChange}
        on:conditionalAuth={handleConditionalAuth}
      />
      
      {#if $authStore.hasValidPin && $authStore.pinRemainingMinutes > 0}
        <AuthStateMessage
          type="info"
          variant="pin-status"
        >
          {m["status.pinValid"]({
            minutes: $authStore.pinRemainingMinutes,
            s: $authStore.pinRemainingMinutes !== 1 ? 's' : ''
          })}
          <button
            type="button"
            class="pin-direct-link"
            onclick={() => authStore.notifyPinSent()}
            disabled={$authStore.loading}
          >
            {m["status.pinDirectAction"]()}
          </button>
        </AuthStateMessage>
      {/if}

      {#if currentSignInState === 'userChecked' && $authStore.userExists === false}
        {#if stateMessage}
          <AuthStateMessage
            type={stateMessage.type}
            tKey={stateMessage.textKey}
            showIcon={stateMessage.showIcon}
          />
        {/if}
        {#if authConfig?.signInMode !== 'login-only'}
          <!-- Registration form for new users -->
          <AuthNewUserInfo
            fullName={$authStore.fullName}
            disabled={$authStore.loading}
            error={null}
            on:input={(e) => authStore.setFullName(e.detail.fullName)}
          />
        {/if}
      {/if}
      
      {#if buttonConfig}
        <div class="button-section">
          <AuthButton
            type="submit"
            buttonConfig={buttonConfig.primary}
            loading={$authStore.loading}
            on:click={handleSignIn}
          />

          {#if buttonConfig.secondary}
            <AuthButton
              type="button"
              variant="secondary"
              buttonConfig={buttonConfig.secondary}
              loading={$authStore.loading}
              on:click={handleSecondaryAction}
            />
          {/if}
        </div>
      {/if}

      <!-- Auth explainer component -->
      <AuthExplainer config={explainerConfig} apiError={$authStore.apiError} />
    </form>

  {:else if currentSignInState === 'pinEntry'}
    <PinEntryStep {authStore} on:success />

  {:else if currentSignInState === 'signedIn'}
    {#if $authStore.user}
      <UserManagement
        user={$authStore.user}
        onSignOut={() => authStore.signOut()}
        onRefreshTokens={() => authStore.refreshTokens()}
        on:navigate
      />
    {/if}

  {:else if currentSignInState === 'generalError' || currentSignInState === 'passkeyPrompt' || currentSignInState === 'passkeyRegistration'}
    <!-- 'generalError' is reachable today: a failed passkey ceremony (including the
         browser's own autofill/conditional-UI attempt, independent of the app's own
         sign-in button) dispatches PASSKEY_FAILED (auth-store.ts sendSignInEvent) or
         goes through signInStateTransitions.authenticationError (ui-state.ts), both of
         which set signInState to 'generalError'. Previously this state - along with
         'passkeyPrompt' and 'passkeyRegistration' (not currently set anywhere in real
         store logic; they only appear in the aspirational SignInStateMachineFlow.svelte
         diagram) - had no matching branch at all, so the component rendered nothing:
         no error, no way to recover, just an empty div.

         Recovery here is via the email field itself, not a dedicated button: retyping
         the email re-triggers the same debounced checkUserForEmail() used by the
         'emailEntry'/'userChecked' branch (see the reactive block above, which now also
         covers 'generalError'), which naturally advances signInState again once the
         email is re-validated. -->
    <AuthStateMessage
      type={currentSignInState === 'generalError' ? 'error' : 'info'}
      tKey={currentSignInState === 'generalError' ? 'error.authFailed' : 'auth.authenticating'}
      showIcon={true}
    />
    <EmailInput
      value={email}
      label="email.label"
      placeholder="email.placeholder"
      disabled={$authStore.loading}
      enableWebAuthn={false}
      on:change={handleEmailChange}
    />

  {:else if currentSignInState === 'emailVerification'}
    <!-- Email verification required -->
    {#if stateMessage}
      <AuthStateMessage
        type={stateMessage.type}
        tKey={stateMessage.textKey}
        showIcon={stateMessage.showIcon}
      />
    {/if}
  {/if}
</div>

<!-- PolicyViewer Modal - Opened by global showPolicyPopup() function -->
<PolicyViewer
  open={showPolicyModal}
  store={authStore}
  on:close={() => showPolicyModal = false}
  on:consent={(e) => {
    const consentDetail = e.detail;
    debug('Policy consent:', consentDetail);
  }}
/>
{/if}

<style>
  .sign-in-core {
    width: 100%;
  }

  .button-section {
    margin-top: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .email-code-input,
  .signed-in-success {
    text-align: center;
  }

  .email-code-message {
    color: var(--color-text-secondary, #6b7280);
    margin: 16px 0 24px 0;
    line-height: 1.5;
  }

  /* Global styling hook for WebAuthn indicator */
  :global(.webauthn-indicator) {
    text-align: center;
    margin-top: 16px;
  }
</style>