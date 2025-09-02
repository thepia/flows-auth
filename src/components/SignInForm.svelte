<!--
  Main Sign In Form Component - Mirrors React thepia.com implementation
  Features email-triggered WebAuthn, conditional authentication, and white labeling
-->
<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { createAuthStore } from '../stores/auth-store';
  import { isWebAuthnSupported, isPlatformAuthenticatorAvailable } from '../utils/webauthn';
  import { getWebAuthnDebugInfo, logWebAuthnDebugInfo } from '../utils/webauthn-debug';
  import type { AuthConfig, User, AuthError, AuthMethod } from '../types';

  // Props - Support both patterns for backward compatibility
  export let config: AuthConfig | undefined = undefined;
  export let authStore: ReturnType<typeof createAuthStore> | undefined = undefined;
  export let showLogo = true;
  export let compact = false;
  export let className = '';
  export let initialEmail = '';

  // Events
  const dispatch = createEventDispatcher<{
    success: { user: User; method: AuthMethod };
    error: { error: AuthError };
    stepChange: { step: string };
  }>();

  // Auth store - Use provided authStore or create from config for backward compatibility
  const store = authStore || (config ? createAuthStore(config) : (() => {
    throw new Error('SignInForm: Must provide either authStore or config prop');
  })());

  // Component state - Mirror React component state
  let email = initialEmail;
  let loading = false;
  let error: string | null = null;
  let step: 'combined-auth' | 'auto-auth' | 'webauthn-register' | 'email-sent' | 'credential-recovery' | 'magic_link' | 'registration-terms' | 'registration-success' = 'combined-auth';
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

  // Initialize component
  onMount(async () => {
    // Debug WebAuthn support in development
    if (config.errorReporting?.debug) {
      const debugInfo = await getWebAuthnDebugInfo();
      logWebAuthnDebugInfo(debugInfo);
      
      console.log('🔍 SignInForm WebAuthn Check:', {
        isWebAuthnSupported: isWebAuthnSupported(),
        enablePasskeys: config.enablePasskeys,
        finalSupport: isWebAuthnSupported() && config.enablePasskeys
      });
    }
    
    supportsWebAuthn = isWebAuthnSupported() && config.enablePasskeys;
    platformAuthenticatorAvailable = await isPlatformAuthenticatorAvailable();
    
    console.log('🔐 WebAuthn Status:', {
      supportsWebAuthn,
      platformAuthenticatorAvailable,
      enablePasskeys: config.enablePasskeys
    });
    
    // If initial email is provided, trigger conditional auth
    if (initialEmail && supportsWebAuthn) {
      await startConditionalAuthentication();
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

  // Start conditional authentication - mirrors thepia.com AuthModal implementation
  async function startConditionalAuthentication() {
    if (conditionalAuthActive || !email.trim()) return;

    // Only attempt conditional auth for valid email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return;

    try {
      conditionalAuthActive = true;
      console.log('🔍 Starting conditional authentication for:', email);
      console.log('🔐 WebAuthn domain configured for passkeys:', store.getConfig?.()?.domain || 'unknown');

      // Use the auth store's conditional authentication
      const success = await store.startConditionalAuthentication(email);

      if (success) {
        // Authentication succeeded - dispatch success event to parent
        console.log('✅ Conditional authentication successful - user signed in');
        // The auth store will handle state updates, we just need to let parent know
        dispatch('success', {
          user: $store.user,
          method: 'passkey'
        });
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
          if (config.enableMagicLinks) {
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
      } else if (userExists && config.enableMagicLinks) {
        // User exists but no passkey - send magic link
        try {
          await handleMagicLinkAuth();
        } catch (magicLinkError) {
          console.warn('Magic link failed:', magicLinkError);
          error = 'Failed to send magic link. Please try again.';
          loading = false;
        }
      } else if (!userExists) {
        // User doesn't exist - switch to registration flow
        step = 'registration-terms';
        loading = false;
      } else {
        // No authentication methods available
        error = 'No authentication methods available for this email.';
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
        step = 'registration-terms';
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
      return 'No passkey found for this email. Please register a new passkey or use a different sign-in method.';
    }

    if (message.includes('/auth/webauthn/authenticate') || message.includes('/auth/webauthn/challenge') || status === 404) {
      return 'Authentication service temporarily unavailable. Please try again in a moment.';
    }

    // Handle WebAuthn-specific errors
    if (message.includes('NotAllowedError') || message.includes('cancelled')) {
      return 'Authentication was cancelled. Please try again.';
    }

    if (message.includes('NotSupportedError')) {
      return 'Passkey authentication is not supported on this device.';
    }

    if (message.includes('SecurityError')) {
      return 'Security error occurred. Please ensure you\'re on a secure connection.';
    }

    if (message.includes('InvalidStateError')) {
      return 'No passkey available on this device. Please register a new passkey.';
    }

    // Generic fallback
    return 'Authentication failed. Please try again or use a different sign-in method.';
  }

  // Handle magic link authentication
  async function handleMagicLinkAuth() {
    try {
      const result = await store.signInWithMagicLink(email);

      // Check for magic link sent response - the API returns 'magic-link' step
      if (result.step === 'magic-link' || result.magicLinkSent) {
        step = 'magic_link';
        loading = false;
      }
    } catch (err: any) {
      loading = false;
      error = err.message || 'Failed to send magic link';
    }
  }

  // Handle form submission based on current step
  function handleSubmit() {
    if (step === 'combined-auth') {
      handleSignIn();
    }
  }

  // Handle Terms of Service acceptance
  function handleTermsAcceptance() {
    if (!acceptedTerms || !acceptedPrivacy) {
      error = 'You must accept the Terms of Service and Privacy Policy to continue.';
      return;
    }

    error = null;
    // Proceed directly to registration since we have ToS acceptance
    handleRegistration();
  }

  // Handle registration with passkey
  async function handleRegistration() {
    if (!acceptedTerms || !acceptedPrivacy) {
      error = 'Terms of Service must be accepted';
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
        step = 'registration-success';
        loading = false;

        // Dispatch success event
        dispatch('success', {
          user: result.user,
          method: 'passkey' as AuthMethod
        });
      }
    } catch (err: any) {
      loading = false;
      error = err.message || 'Registration failed';
      dispatch('error', { error: { code: 'registration_failed', message: error } });
    }
  }

  // Go back to previous step
  function handleBack() {
    error = null;
    switch (step) {
      case 'registration-terms':
        step = 'combined-auth';
        break;
      default:
        step = 'combined-auth';
    }
    dispatch('stepChange', { step });
  }

  // Reset form to initial state
  function resetForm() {
    step = 'combined-auth';
    error = null;
    loading = false;
    // Reset registration state
    acceptedTerms = false;
    acceptedPrivacy = false;
  }
</script>

<div class="auth-form {className}" class:compact>
  {#if showLogo && config.branding?.logoUrl}
    <div class="auth-logo">
      <img src={config.branding.logoUrl} alt={config.branding.companyName || 'Logo'} />
    </div>
  {/if}

  <div class="auth-container">
    {#if step === 'combined-auth'}
      <!-- Combined Auth Step - Primary UI -->
      <div class="combined-auth-step">
        <div class="step-header">
          <h2 class="step-title">Sign in</h2>
          <p class="step-description">
            Enter your email to continue to {config.branding?.companyName || 'your account'}
          </p>
        </div>

        <form on:submit|preventDefault={handleSubmit}>
          <div class="input-group">
            <label for="email" class="input-label">Email address</label>
            <input
              bind:value={email}
              on:input={handleEmailChange}
              id="email"
              type="email"
              class="email-input"
              class:error={!!error}
              placeholder="your.email@company.com"
              autocomplete="email webauthn"
              required
              disabled={loading}
            />
            {#if error}
              <div class="error-message">{error}</div>
            {/if}
          </div>

          <button
            type="submit"
            class="continue-button"
            class:loading
            disabled={loading || !email.trim()}
          >
            {#if loading}
              <span class="loading-spinner"></span>
              Signing in...
            {:else if supportsWebAuthn && config.enablePasskeys}
              🔑 Sign in with Passkey
            {:else if config.enableMagicLinks}
              ✉️ Send Magic Link
            {:else}
              Continue
            {/if}
          </button>
        </form>

        <!-- Auth method indicators -->
        {#if supportsWebAuthn && config.enablePasskeys}
          <div class="webauthn-indicator">
            <small>🔐 WebAuthn ready - Touch ID/Face ID will appear automatically</small>
          </div>
        {/if}
      </div>

    {:else if step === 'magic_link'}
      <!-- Magic Link Sent Step -->
      <div class="magic-link-step">
        <div class="step-header">
          <div class="success-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 12l2 2 4-4"/>
              <circle cx="12" cy="12" r="10"/>
            </svg>
          </div>
          <h2 class="step-title">Check your email</h2>
          <p class="step-description">
            We sent a secure login link to<br>
            <strong>{email}</strong>
          </p>
        </div>

        <button
          type="button"
          class="secondary-button"
          on:click={resetForm}
        >
          Use a different email
        </button>
      </div>

    {:else if step === 'registration-terms'}
      <!-- Registration Terms of Service Step -->
      <div class="registration-terms-step">
        <div class="step-header">
          <button type="button" class="back-button" on:click={handleBack}>
            ← Back
          </button>
          <h2 class="step-title">Terms & Privacy</h2>
          <p class="step-description">
            Please review and accept our terms to create your account
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
                I agree to the
                <a href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a>
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
                I agree to the
                <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
              </label>
            </div>


          </div>

          {#if error}
            <div class="error-message">{error}</div>
          {/if}

          <button
            type="submit"
            class="continue-button"
            class:loading
            disabled={!acceptedTerms || !acceptedPrivacy || loading}
          >
            {#if loading}
              <span class="loading-spinner"></span>
              Creating Account...
            {:else if supportsWebAuthn}
              🔑 Register with Passkey
            {:else}
              Create Account
            {/if}
          </button>

          {#if supportsWebAuthn}
            <div class="webauthn-info">
              <small>🔐 Your device will prompt for Touch ID, Face ID, or Windows Hello</small>
            </div>
          {/if}
        </form>
      </div>



    {:else if step === 'registration-success'}
      <!-- Registration Success Step -->
      <div class="registration-success-step">
        <div class="step-header">
          <div class="success-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 12l2 2 4-4"/>
              <circle cx="12" cy="12" r="10"/>
            </svg>
          </div>
          <h2 class="step-title">Account Created Successfully!</h2>
          <p class="step-description">
            Welcome to {config.branding?.companyName || 'our platform'}!
            You can now explore the application.
          </p>
        </div>

        <div class="success-info">
          <p>📧 We've sent a welcome email to <strong>{email}</strong></p>
          <p>🔓 Verify your email to unlock all features</p>
        </div>
      </div>
    {/if}
  </div>

  {#if config.branding?.showPoweredBy !== false}
    <div class="auth-footer">
      <p class="powered-by">
        Secured by <strong>Thepia</strong>
      </p>
    </div>
  {/if}
</div>

<style>
  .auth-form {
    max-width: 400px;
    width: 100%;
    margin: 0 auto;
    font-family: var(--font-family-brand, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
  }

  .auth-form.compact {
    max-width: 320px;
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
    color: #111827;
    margin: 0 0 8px 0;
  }

  .step-description {
    font-size: 16px;
    color: #4b5563;
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
    color: #374151;
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
    border-color: var(--brand-primary, #0066cc);
    box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
  }

  .email-input:disabled {
    background: #f9fafb;
    color: #6b7280;
    cursor: not-allowed;
  }

  .email-input.error {
    border-color: #ef4444;
  }

  .error-message {
    color: #ef4444;
    font-size: 14px;
    margin-top: 4px;
  }

  .continue-button {
    width: 100%;
    padding: 12px 16px;
    background: var(--brand-primary, #0066cc);
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
    background: var(--brand-primary-hover, #0052a3);
    transform: translateY(-1px);
  }

  .continue-button:disabled {
    background: #d1d5db;
    color: #6b7280;
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
    color: #6b7280;
    font-size: 14px;
    margin: 0;
  }

  .powered-by strong {
    color: var(--brand-primary, #0066cc);
  }

  /* Registration-specific styles */
  .back-button {
    position: absolute;
    left: 0;
    top: 0;
    background: none;
    border: none;
    color: var(--brand-primary, #0066cc);
    cursor: pointer;
    padding: 8px;
    border-radius: 4px;
    transition: background-color 0.2s;
    font-size: 14px;
  }

  .back-button:hover {
    background: var(--primary-light, #e6f2ff);
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
    color: #374151;
    cursor: pointer;
  }

  .checkbox-label input[type="checkbox"] {
    margin: 0;
    width: 18px;
    height: 18px;
    accent-color: var(--brand-primary, #0066cc);
  }

  .checkbox-label a {
    color: var(--brand-primary, #0066cc);
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
    border-color: var(--brand-primary, #0066cc);
    box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
  }

  .name-input:disabled {
    background: #f9fafb;
    color: #6b7280;
    cursor: not-allowed;
  }

  .register-button {
    width: 100%;
    padding: 12px 16px;
    background: var(--brand-primary, #0066cc);
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
    background: var(--brand-primary-hover, #0052a3);
    transform: translateY(-1px);
  }

  .register-button:disabled {
    background: #d1d5db;
    color: #6b7280;
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
    color: #0c4a6e;
  }

  .webauthn-info {
    text-align: center;
    margin-top: 16px;
  }

  .webauthn-info small {
    color: #10b981;
    font-size: 12px;
    font-weight: 500;
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
    color: #10b981;
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
    color: var(--brand-primary, #0066cc);
    cursor: pointer;
    padding: 8px;
    border-radius: 4px;
    transition: background-color 0.2s;
  }

  .back-button:hover {
    background: var(--primary-light, #e6f2ff);
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
    color: var(--brand-primary, #0066cc);
    cursor: pointer;
    font-size: 14px;
    text-decoration: underline;
    transition: color 0.2s;
  }

  .alt-auth-button:hover {
    color: var(--primary-hover, #0052a3);
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
    color: var(--brand-primary, #0066cc);
    border: 2px solid var(--brand-primary, #0066cc);
    border-radius: 8px;
    font-size: 16px;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.2s;
  }

  .secondary-button:hover {
    background: var(--primary-light, #e6f2ff);
  }

  /* Mobile responsive */
  @media (max-width: 480px) {
    .auth-form {
      max-width: none;
      margin: 0 16px;
    }

    .auth-logo img {
      height: 32px;
    }

    .email-step {
      padding: 24px 16px;
    }
  }
</style>