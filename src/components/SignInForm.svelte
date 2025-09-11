<!--
  Main Sign In Form Component - Mirrors React thepia.com implementation
  Features email-triggered WebAuthn, conditional authentication, and white labeling
-->
<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { createAuthStore } from '../stores/auth-store';
  import { useAuth } from '../utils/auth-context';
  import { isWebAuthnSupported, isPlatformAuthenticatorAvailable } from '../utils/webauthn';
  import { getWebAuthnDebugInfo, logWebAuthnDebugInfo } from '../utils/webauthn-debug';
  import { getI18n } from '../utils/i18n';
  import type { AuthConfig, User, AuthError, AuthMethod } from '../types';
  import AuthButton from './core/AuthButton.svelte';
  import EmailInput from './core/EmailInput.svelte';

  // Props - Support both patterns for backward compatibility
  export let config: AuthConfig | undefined = undefined;
  export let authStore: ReturnType<typeof createAuthStore> | undefined = undefined;
  export let showLogo = true;
  export let compact = false;
  export let className = '';
  export let initialEmail = '';
  
  // Size and display variants
  export let size: 'small' | 'medium' | 'large' | 'full' = 'medium';
  export let variant: 'inline' | 'popup' = 'inline';
  export let popupPosition: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' = 'top-right';
  
  // Popup modal controls
  export let showCloseButton = true;
  export let closeOnEscape = true;

  // Events
  const dispatch = createEventDispatcher<{
    success: { user: User; method: AuthMethod };
    error: { error: AuthError };
    stepChange: { step: string };
    close: {}; // New event for popup close
  }>();

  // Auth store - Use context store, provided authStore, or create from config (backward compatibility)
  const store = (() => {
    // First try to use context store (preferred pattern per ADR 0004)
    try {
      return useAuth();
    } catch {
      // Fallback to provided authStore or create new one (backward compatibility)
      console.warn('⚠️ SignInForm: Using fallback auth store. Consider using setAuthContext() in layout.');
      return authStore || (config ? createAuthStore(config) : (() => {
        throw new Error('SignInForm: Must provide either authStore or config prop, or use setAuthContext() in layout');
      })());
    }
  })();

  // Get i18n instance - will use context if available, or create from config
  const i18nInstance = getI18n({
    language: config?.language,
    translations: config?.translations,
    fallbackLanguage: config?.fallbackLanguage
  });

  // Extract the translation function store
  const i18n = i18nInstance.t;

  // Update i18n when config changes
  $: {
    if (config?.language) {
      i18nInstance.setLanguage(config.language);
    }
    if (config?.translations) {
      i18nInstance.setTranslations(config.translations);
    }
  }

  // Determine if using AppCode-based authentication (pins instead of magic links)
  $: isAppCodeBased = !!(config?.appCode);

  // Component state - Mirror React component state
  let email = initialEmail;
  let loading = false;
  let error: string | null = null;
  let step: 'combinedAuth' | 'autoAuth' | 'webauthnRegister' | 'emailSent' | 'credentialRecovery' | 'magicLink' | 'registrationTerms' | 'registrationSuccess' = 'combinedAuth';
  let supportsWebAuthn = false;
  let conditionalAuthActive = false;
  let emailChangeTimeout: ReturnType<typeof setTimeout> | null = null;
  let userExists = false;
  let hasPasskeys = false;

  // Registration state - GDPR compliant (no name fields)
  let acceptedTerms = false;
  let acceptedPrivacy = false;

  // WebAuthn state
  let platformAuthenticatorAvailable = false;

  // Popup close functionality
  function handleClose() {
    dispatch('close');
  }

  // Handle escape key for popup
  function handleKeydown(event: KeyboardEvent) {
    if (closeOnEscape && event.key === 'Escape' && variant === 'popup') {
      handleClose();
    }
  }

  // Initialize component
  onMount(async () => {
    // Debug WebAuthn support in development
    if (config?.errorReporting?.debug) {
      const debugInfo = await getWebAuthnDebugInfo();
      logWebAuthnDebugInfo(debugInfo);
      
      console.log('🔍 SignInForm WebAuthn Check:', {
        isWebAuthnSupported: isWebAuthnSupported(),
        enablePasskeys: config?.enablePasskeys,
        finalSupport: isWebAuthnSupported() && (config?.enablePasskeys ?? false)
      });
    }
    
    supportsWebAuthn = isWebAuthnSupported() && (config?.enablePasskeys ?? false);
    platformAuthenticatorAvailable = await isPlatformAuthenticatorAvailable();
    
    console.log('🔐 WebAuthn Status:', {
      supportsWebAuthn,
      platformAuthenticatorAvailable,
      enablePasskeys: config?.enablePasskeys
    });
    
    // If initial email is provided, trigger conditional auth
    if (initialEmail && supportsWebAuthn) {
      await startConditionalAuthentication();
    }
    
    // Setup popup escape key handling
    if (variant === 'popup') {
      document.addEventListener('keydown', handleKeydown);
    }
  });
  
  onDestroy(() => {
    // Cleanup escape key listener
    if (variant === 'popup') {
      document.removeEventListener('keydown', handleKeydown);
    }
  });

  // Email change handler - mirrors thepia.com AuthModal implementation
  async function handleEmailChange(event: Event) {
    const target = event.target as HTMLInputElement;
    email = target.value;

    if (!email.trim() || !supportsWebAuthn || loading) return;

    // Clear previous timeout
    if (emailChangeTimeout) {
      clearTimeout(emailChangeTimeout);
    }

    // Debounce email changes (1 second delay like thepia.com)
    // Only attempt conditional auth for valid email format
    emailChangeTimeout = setTimeout(async () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (email && emailRegex.test(email) && !conditionalAuthActive) {
        try {
          await startConditionalAuthentication();
        } catch (err) {
          // Conditional auth should fail silently
          console.log('⚠️ Conditional authentication failed (expected if no passkeys):', err);
        }
      }
    }, 1000);
  }

  // Handle conditional auth trigger from EmailInput component
  function handleConditionalAuth({ detail }) {
    handleEmailChange({
      target: { value: detail.email }
    });
  }

  // Start conditional authentication - mirrors thepia.com AuthModal implementation
  async function startConditionalAuthentication() {
    if (conditionalAuthActive || !email.trim()) return;

    // Only attempt conditional auth for valid email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return;

    try {
      conditionalAuthActive = true;
      console.log('🔍 Starting conditional authentication for:', email);
      console.log('🔐 WebAuthn domain configured for passkeys:', config?.domain || 'unknown');

      // Use the auth store's conditional authentication
      const success = await store.startConditionalAuthentication(email);

      if (success) {
        // Authentication succeeded - dispatch success event to parent
        console.log('✅ Conditional authentication successful - user signed in');
        // The auth store will handle state updates, we just need to let parent know
        const user = $store.user;
        if (user) {
          dispatch('success', {
            user: user,
            method: 'passkey'
          });
        }
      }
    } catch (error) {
      // Conditional auth should fail silently - this is expected if no passkeys exist
      console.log('⚠️ Conditional authentication failed (expected if no passkeys):', error);
    } finally {
      conditionalAuthActive = false;
    }
  }

  // Handle primary sign in action
  async function handleSignIn() {
    if (!email.trim()) return;
    
    loading = true;
    error = null;

    try {
      // Check what auth methods are available for this email
      const userCheck = await store.checkUser(email);
      userExists = userCheck.exists;
      hasPasskeys = userCheck.hasWebAuthn;
      
      if (userCheck.hasWebAuthn && supportsWebAuthn) {
        // Try passkey authentication first
        try {
          await handlePasskeyAuth(false); // Not silent mode
        } catch (passkeyError) {
          console.warn('Passkey authentication failed:', passkeyError);
          // Fall back to magic link if enabled
          if (config?.enableMagicLinks) {
            try {
              await handleMagicLinkAuth();
            } catch (magicLinkError) {
              console.warn('Magic link failed:', magicLinkError);
              error = getUserFriendlyErrorMessage(magicLinkError);
              loading = false;
            }
          } else {
            error = getUserFriendlyErrorMessage(passkeyError);
            loading = false;
          }
        }
      } else if (userExists && config?.enableMagicLinks) {
        // User exists but no passkey - send magic link
        try {
          await handleMagicLinkAuth();
        } catch (magicLinkError) {
          console.warn('Magic link failed:', magicLinkError);
          error = $i18n('error.magicLinkFailed');
          loading = false;
        }
      } else if (!userExists) {
        // User doesn't exist - switch to registration flow
        step = 'registrationTerms';
        loading = false;
      } else {
        // No authentication methods available
        error = $i18n('error.noAuthMethods');
        loading = false;
      }
    } catch (err: any) {
      loading = false;

      // Check if this is a "user not found" or "no passkey" error
      const message = err.message || '';
      if (message.includes('not found') ||
          message.includes('404') ||
          message.includes('endpoint')) {
        // User doesn't exist or has no passkey - transition to registration
        console.log('🔄 User not found or no passkey available - transitioning to registration');
        step = 'registrationTerms';
        error = null; // Clear error since we're handling it
      } else {
        // Other errors - show user-friendly message
        error = getUserFriendlyErrorMessage(err);
      }
    }
  }

  // Password authentication removed - passwordless system only

  // Handle passkey authentication with silent mode support
  async function handlePasskeyAuth(silent = false) {
    try {
      const result = await store.signInWithPasskey(email);

      if (result.step === 'success' && result.user) {
        loading = false;
        dispatch('success', {
          user: result.user,
          method: 'passkey'
        });
      }
    } catch (err: any) {
      if (!silent) {
        loading = false;
        // Provide user-friendly error messages instead of technical details
        error = getUserFriendlyErrorMessage(err);
      }
      throw err; // Re-throw for caller to handle
    }
  }

  // Convert technical errors to user-friendly messages
  function getUserFriendlyErrorMessage(err: any): string {
    const message = err.message || '';
    const status = err.status || 0;

    // Handle specific API endpoint errors
    if (message.includes('not found') || message.includes('404') || message.includes('endpoint')) {
      return $i18n('error.noPasskeyFound');
    }

    if (message.includes('/auth/webauthn/authenticate') || message.includes('/auth/webauthn/challenge') || status === 404) {
      return $i18n('error.serviceTemporarilyUnavailable');
    }

    // Handle WebAuthn-specific errors
    if (message.includes('NotAllowedError') || message.includes('cancelled')) {
      return $i18n('error.authCancelled');
    }

    if (message.includes('NotSupportedError')) {
      return $i18n('error.passkeyNotSupported');
    }

    if (message.includes('SecurityError')) {
      return $i18n('error.securityError');
    }

    if (message.includes('InvalidStateError')) {
      return $i18n('error.noPasskeyAvailable');
    }

    // Generic fallback
    return $i18n('error.authGenericFailed');
  }

  // Handle magic link authentication
  async function handleMagicLinkAuth() {
    try {
      const result = await store.signInWithMagicLink(email);

      // Check for magic link sent response - the API returns 'magic-link' step
      if (result.step === 'magic-link' || result.magicLinkSent) {
        step = 'magicLink';
        loading = false;
      }
    } catch (err: any) {
      loading = false;
      error = err.message || 'Failed to send magic link';
    }
  }

  // Handle form submission based on current step
  function handleSubmit() {
    if (step === 'combinedAuth') {
      handleSignIn();
    }
  }

  // Handle Terms of Service acceptance
  function handleTermsAcceptance() {
    if (!acceptedTerms || !acceptedPrivacy) {
      error = $i18n('terms.acceptRequired');
      return;
    }

    error = null;
    // Proceed directly to registration since we have ToS acceptance
    handleRegistration();
  }

  // Handle registration with passkey
  async function handleRegistration() {
    if (!acceptedTerms || !acceptedPrivacy) {
      error = $i18n('registration.termsServiceRequired');
      return;
    }

    loading = true;
    error = null;

    try {
      const registrationData = {
        email,
        acceptedTerms,
        acceptedPrivacy
      };

      // Register user with passkey
      const result = await store.registerUser(registrationData);

      if (result.step === 'success' && result.user) {
        // Registration successful - user enters app immediately
        step = 'registrationSuccess';
        loading = false;

        // Dispatch success event
        dispatch('success', {
          user: result.user,
          method: 'passkey' as AuthMethod
        });
      }
    } catch (err: any) {
      loading = false;
      error = err.message || $i18n('error.registrationFailed');
      dispatch('error', { error: { code: 'registration_failed', message: error || $i18n('error.registrationFailed') } });
    }
  }

  // Go back to previous step
  function handleBack() {
    error = null;
    switch (step) {
      case 'registration-terms':
        step = 'combinedAuth';
        break;
      default:
        step = 'combinedAuth';
    }
    dispatch('stepChange', { step });
  }

  // Reset form to initial state
  function resetForm() {
    step = 'combinedAuth';
    error = null;
    loading = false;
    // Reset registration state
    acceptedTerms = false;
    acceptedPrivacy = false;
  }
</script>

<div class="auth-form {className}" class:compact class:popup={variant === 'popup'} class:size-small={size === 'small'} class:size-medium={size === 'medium'} class:size-large={size === 'large'} class:size-full={size === 'full'} class:pos-top-right={variant === 'popup' && popupPosition === 'top-right'} class:pos-top-left={variant === 'popup' && popupPosition === 'top-left'} class:pos-bottom-right={variant === 'popup' && popupPosition === 'bottom-right'} class:pos-bottom-left={variant === 'popup' && popupPosition === 'bottom-left'}>
  {#if variant === 'popup' && showCloseButton}
    <button class="popup-close" on:click={handleClose} aria-label="Close authentication form">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  {/if}
  
  {#if showLogo && config?.branding?.logoUrl}
    <div class="auth-logo">
      <img src={config.branding.logoUrl} alt={config.branding.companyName || 'Logo'} />
    </div>
  {/if}

  <div class="auth-container">
    {#if step === 'combinedAuth'}
      <!-- Combined Auth Step - Primary UI -->
      <div class="combined-auth-step">
        <div class="step-header">
          <h2 class="step-title">{$i18n('signIn.title')}</h2>
          <p class="step-description">
            {#if config?.branding?.companyName}
              {$i18n('signIn.description', { companyName: config.branding.companyName })}
            {:else}
              {$i18n('signIn.descriptionGeneric')}
            {/if}
          </p>
        </div>

        <form on:submit|preventDefault={handleSubmit}>
          <div class="input-group">
            <EmailInput
              bind:value={email}
              {i18n}
              label="email.label"
              placeholder="email.placeholder"
              error={error}
              disabled={loading}
              enableWebAuthn={supportsWebAuthn && (config?.enablePasskeys ?? false)}
              on:change={({ detail }) => { email = detail.value; }}
              on:conditionalAuth={handleConditionalAuth}
            />
          </div>

          <AuthButton
            type="submit"
            method={supportsWebAuthn && (config?.enablePasskeys ?? false) ? 'passkey' : (config?.enableMagicLinks ?? false) ? (isAppCodeBased ? 'email' : 'magic-link') : 'generic'}
            {loading}
            disabled={loading || !email.trim()}
            {isAppCodeBased}
            {i18n}
            supportsWebAuthn={supportsWebAuthn}
          />
        </form>

        <!-- Auth method indicators -->
        {#if supportsWebAuthn && config?.enablePasskeys}
          <div class="webauthn-indicator">
            <small>{$i18n('signIn.webAuthnIndicator')}</small>
          </div>
        {/if}
        
        <!-- Security explanation message -->
        <div class="security-message">
          {#if config?.branding?.companyName}
            {#if isAppCodeBased}
              {$i18n('security.passwordlessWithPin', { companyName: config.branding.companyName })}
            {:else}
              {$i18n('security.passwordlessExplanation', { companyName: config.branding.companyName })}
            {/if}
          {:else}
            {#if isAppCodeBased}
              {$i18n('security.passwordlessWithPinGeneric')}
            {:else}
              {$i18n('security.passwordlessGeneric')}
            {/if}
          {/if}
        </div>
      </div>

    {:else if step === 'magicLink'}
      <!-- Magic Link Sent Step -->
      <div class="magic-link-step">
        <div class="step-header">
          <div class="success-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 12l2 2 4-4"/>
              <circle cx="12" cy="12" r="10"/>
            </svg>
          </div>
          <h2 class="step-title">{$i18n('magicLink.title')}</h2>
          <p class="step-description">
            {$i18n('magicLink.description')}<br>
            <strong>{email}</strong>
          </p>
        </div>

        <AuthButton
          type="button"
          variant="secondary"
          method="generic"
          text={$i18n('magicLink.differentEmail')}
          {i18n}
          on:click={resetForm}
        />
      </div>

    {:else if step === 'registrationTerms'}
      <!-- Registration Terms of Service Step -->
      <div class="registration-terms-step">
        <div class="step-header">
          <button type="button" class="back-button" on:click={handleBack}>
            ← {$i18n('action.back')}
          </button>
          <h2 class="step-title">{$i18n('registration.termsTitle')}</h2>
          <p class="step-description">
            {$i18n('registration.termsDescription')}
          </p>
        </div>

        <form on:submit|preventDefault={handleTermsAcceptance}>
          <div class="terms-section">
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  bind:checked={acceptedTerms}
                  required
                />
                <span class="checkmark"></span>
                {$i18n('registration.agreeTerms')}
                <a href="/terms" target="_blank" rel="noopener noreferrer">{$i18n('registration.termsLink')}</a>
              </label>
            </div>

            <div class="checkbox-group">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  bind:checked={acceptedPrivacy}
                  required
                />
                <span class="checkmark"></span>
                {$i18n('registration.agreePrivacy')}
                <a href="/privacy" target="_blank" rel="noopener noreferrer">{$i18n('registration.privacyLink')}</a>
              </label>
            </div>


          </div>

          {#if error}
            <div class="error-message">{error}</div>
          {/if}

          <AuthButton
            type="submit"
            method={supportsWebAuthn ? 'passkey' : 'generic'}
            text={supportsWebAuthn ? undefined : $i18n('registration.createAccount')}
            loadingText={$i18n('registration.creatingAccount')}
            {loading}
            disabled={!acceptedTerms || !acceptedPrivacy || loading}
            {i18n}
            supportsWebAuthn={supportsWebAuthn}
          />

          {#if supportsWebAuthn}
            <div class="webauthn-info">
              <small>{$i18n('registration.webAuthnInfo')}</small>
            </div>
          {/if}
        </form>
      </div>



    {:else if step === 'registrationSuccess'}
      <!-- Registration Success Step -->
      <div class="registration-success-step">
        <div class="step-header">
          <div class="success-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 12l2 2 4-4"/>
              <circle cx="12" cy="12" r="10"/>
            </svg>
          </div>
          <h2 class="step-title">{$i18n('registration.successTitle')}</h2>
          <p class="step-description">
            {#if config?.branding?.companyName}
              {$i18n('registration.successDescription', { companyName: config.branding.companyName })}
            {:else}
              {$i18n('registration.successDescriptionGeneric')}
            {/if}
            {$i18n('registration.successExplore')}
          </p>
        </div>

        <div class="success-info">
          <p>{$i18n('registration.welcomeEmail')} <strong>{email}</strong></p>
          <p>{$i18n('registration.verifyEmail')}</p>
        </div>
      </div>
    {/if}
  </div>

  {#if config?.branding?.showPoweredBy !== false}
    <div class="auth-footer">
      <p class="powered-by">
        {$i18n('branding.securedBy')} <strong>{$i18n('branding.poweredBy')}</strong>
      </p>
    </div>
  {/if}
</div>

<style>
  .auth-form {
    width: 100%;
    margin: 0 auto;
    font-family: var(--font-family-brand, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
  }

  /* Size variants - replaces old compact prop */
  .auth-form.size-small {
    max-width: 280px;
  }

  .auth-form.size-medium {
    max-width: 360px;
  }

  .auth-form.size-large {
    max-width: 480px;
  }

  .auth-form.size-full {
    max-width: none;
  }

  /* Legacy compact support */
  .auth-form.compact {
    max-width: 280px;
  }

  /* Popup variant styling */
  .auth-form.popup {
    position: fixed;
    z-index: 9999;
    background: white;
    border-radius: 12px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    border: 1px solid #e5e7eb;
    padding: 20px;
    margin: 0;
    max-height: 90vh;
    overflow-y: auto;
  }
  
  /* Popup size variants - respect size configuration */
  .auth-form.popup.size-small {
    max-width: 280px;
  }
  
  .auth-form.popup.size-medium {
    max-width: 360px;
  }
  
  .auth-form.popup.size-large {
    max-width: 480px;
  }
  
  .auth-form.popup.size-full {
    max-width: 90vw;
  }
  
  /* Close button for popup */
  .popup-close {
    position: absolute;
    top: 12px;
    right: 12px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    border-radius: 6px;
    color: #6b7280;
    transition: all 0.2s;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .popup-close:hover {
    background: #f3f4f6;
    color: #374151;
  }
  
  .popup-close:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }

  /* Popup positioning */
  .auth-form.popup.pos-top-right {
    top: 20px;
    right: 20px;
  }

  .auth-form.popup.pos-top-left {
    top: 20px;
    left: 20px;
  }

  .auth-form.popup.pos-bottom-right {
    bottom: 20px;
    right: 20px;
  }

  .auth-form.popup.pos-bottom-left {
    bottom: 20px;
    left: 20px;
  }

  .auth-logo {
    text-align: center;
    margin-bottom: 24px;
  }

  .auth-logo img {
    height: 40px;
    max-width: 200px;
    object-fit: contain;
  }

  .auth-container {
    background: #ffffff;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    border: 1px solid #e5e7eb;
    overflow: hidden;
  }

  .combined-auth-step,
  .magic-link-step,
  .registration-terms-step,
  .registration-passkey-step,
  .registration-success-step {
    padding: 32px 24px;
  }

  .step-header {
    text-align: center;
    margin-bottom: 32px;
  }

  .step-title {
    font-size: 24px;
    font-weight: 700;
    color: var(--color-text-primary, #111827);
    margin: 0 0 8px 0;
  }

  .step-description {
    font-size: 16px;
    color: var(--color-text-secondary, #4b5563);
    margin: 0;
    line-height: 1.625;
  }

  .input-group {
    margin-bottom: 24px;
  }

  .input-label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text-primary, #374151);
    margin-bottom: 8px;
  }

  .email-input {
    width: 100%;
    padding: 12px 16px;
    border: 2px solid #d1d5db;
    border-radius: 8px;
    font-size: 16px;
    font-family: inherit;
    background: #ffffff;
    transition: border-color 0.2s, box-shadow 0.2s;
    box-sizing: border-box;
  }

  .email-input:focus {
    outline: none;
    border-color: var(--color-brand-primary, #0066cc);
    box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
  }

  .email-input:disabled {
    background: var(--color-bg-2, #f9fafb);
    color: var(--color-text-3, #6b7280);
    cursor: not-allowed;
  }

  .email-input.error {
    border-color: var(--color-border-error, #ef4444);
  }

  .error-message {
    color: var(--color-text-error, #ef4444);
    font-size: 14px;
    margin-top: 4px;
  }

  .continue-button {
    width: 100%;
    padding: 12px 16px;
    background: var(--color-brand-primary, #0066cc);
    color: #ffffff;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 48px;
  }

  .continue-button:hover:not(:disabled) {
    background: var(--color-brand-primary-hover, #0052a3);
    transform: translateY(-1px);
  }

  .continue-button:disabled {
    background: var(--color-interactive-disabled, #d1d5db);
    color: var(--color-text-3, #6b7280);
    cursor: not-allowed;
    transform: none;
  }

  .loading-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid transparent;
    border-top: 2px solid currentColor;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .auth-footer {
    text-align: center;
    margin-top: 24px;
  }

  .powered-by {
    color: var(--color-text-3, #6b7280);
    font-size: 14px;
    margin: 0;
  }

  .powered-by strong {
    color: var(--color-brand-primary, #0066cc);
  }

  /* Registration-specific styles */
  .back-button {
    position: absolute;
    left: 0;
    top: 0;
    background: none;
    border: none;
    color: var(--color-brand-primary, #0066cc);
    cursor: pointer;
    padding: 8px;
    border-radius: 4px;
    transition: background-color 0.2s;
    font-size: 14px;
  }

  .back-button:hover {
    background: var(--color-brand-primarySubtle, #e6f2ff);
  }

  .terms-section {
    margin-bottom: 24px;
    text-align: left;
  }

  .checkbox-group {
    margin-bottom: 16px;
  }

  .checkbox-label {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    font-size: 14px;
    line-height: 1.5;
    color: var(--color-text-primary, #374151);
    cursor: pointer;
  }

  .checkbox-label input[type="checkbox"] {
    margin: 0;
    width: 18px;
    height: 18px;
    accent-color: var(--color-brand-primary, #0066cc);
  }

  .checkbox-label a {
    color: var(--color-brand-primary, #0066cc);
    text-decoration: none;
  }

  .checkbox-label a:hover {
    text-decoration: underline;
  }

  .optional-fields {
    margin-bottom: 24px;
  }

  .input-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .name-input {
    width: 100%;
    padding: 12px 16px;
    border: 2px solid #d1d5db;
    border-radius: 8px;
    font-size: 16px;
    font-family: inherit;
    background: #ffffff;
    transition: border-color 0.2s, box-shadow 0.2s;
    box-sizing: border-box;
  }

  .name-input:focus {
    outline: none;
    border-color: var(--color-brand-primary, #0066cc);
    box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
  }

  .name-input:disabled {
    background: var(--color-bg-2, #f9fafb);
    color: var(--color-text-3, #6b7280);
    cursor: not-allowed;
  }

  .register-button {
    width: 100%;
    padding: 12px 16px;
    background: var(--color-brand-primary, #0066cc);
    color: #ffffff;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 48px;
  }

  .register-button:hover:not(:disabled) {
    background: var(--color-brand-primary-hover, #0052a3);
    transform: translateY(-1px);
  }

  .register-button:disabled {
    background: var(--color-interactive-disabled, #d1d5db);
    color: var(--color-text-3, #6b7280);
    cursor: not-allowed;
    transform: none;
  }

  .success-info {
    background: #f0f9ff;
    border: 1px solid #0ea5e9;
    border-radius: 8px;
    padding: 16px;
    margin-top: 24px;
    text-align: left;
  }

  .success-info p {
    margin: 8px 0;
    font-size: 14px;
    color: var(--color-text-info, #0c4a6e);
  }

  .webauthn-info {
    text-align: center;
    margin-top: 16px;
  }

  .webauthn-info small {
    color: var(--color-text-success, #10b981);
    font-size: 12px;
    font-weight: 500;
  }

  /* Security message styling - matches thepia.com */
  .security-message {
    margin-top: 16px;
    text-align: center;
    font-size: 0.75rem;
    color: var(--auth-text-secondary, #6b7280);
    line-height: 1.4;
    opacity: 0.8;
  }

  /* Mobile responsive for registration */
  @media (max-width: 480px) {
    .input-row {
      grid-template-columns: 1fr;
      gap: 16px;
    }
  }

  .webauthn-indicator {
    text-align: center;
    margin-top: 16px;
  }

  .webauthn-indicator small {
    color: var(--color-text-success, #10b981);
    font-size: 12px;
    font-weight: 500;
  }

  /* Password Step */
  .back-button {
    position: absolute;
    left: 0;
    top: 0;
    background: none;
    border: none;
    color: var(--color-brand-primary, #0066cc);
    cursor: pointer;
    padding: 8px;
    border-radius: 4px;
    transition: background-color 0.2s;
  }

  .back-button:hover {
    background: var(--color-brand-primarySubtle, #e6f2ff);
  }

  .step-header {
    position: relative;
  }

  /* Password-related styles removed for passwordless authentication */

  .alternative-auth {
    text-align: center;
    margin-top: 24px;
  }

  .alt-auth-button {
    background: none;
    border: none;
    color: var(--color-brand-primary, #0066cc);
    cursor: pointer;
    font-size: 14px;
    text-decoration: underline;
    transition: color 0.2s;
  }

  .alt-auth-button:hover {
    color: var(--color-brand-primaryHover, #0052a3);
  }

  /* Magic Link Step */
  .success-icon {
    display: flex;
    justify-content: center;
    margin-bottom: 16px;
  }

  .secondary-button {
    width: 100%;
    padding: 12px 16px;
    background: #ffffff;
    color: var(--color-brand-primary, #0066cc);
    border: 2px solid var(--color-brand-primary, #0066cc);
    border-radius: 8px;
    font-size: 16px;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.2s;
  }

  .secondary-button:hover {
    background: var(--color-brand-primarySubtle, #e6f2ff);
  }

  /* Mobile responsive */
  @media (max-width: 480px) {
    .auth-form:not(.popup) {
      max-width: none;
      margin: 0 16px;
    }

    /* Mobile popup styles - responsive but respect size preferences */
    .auth-form.popup {
      padding: 16px;
      max-height: 85vh;
    }
    
    /* Override size variants on mobile for better usability */
    .auth-form.popup.size-small,
    .auth-form.popup.size-medium {
      max-width: calc(100vw - 40px);
      min-width: 280px;
    }
    
    .auth-form.popup.size-large {
      max-width: calc(100vw - 30px);
    }
    
    .auth-form.popup.size-full {
      max-width: calc(100vw - 20px);
    }

    /* Mobile popup positioning - center instead of corners */
    .auth-form.popup.pos-bottom-right,
    .auth-form.popup.pos-bottom-left,
    .auth-form.popup.pos-top-right,
    .auth-form.popup.pos-top-left {
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      right: auto;
      bottom: auto;
    }

    .auth-logo img {
      height: 32px;
    }

    .email-step {
      padding: 24px 16px;
    }
  }
</style>