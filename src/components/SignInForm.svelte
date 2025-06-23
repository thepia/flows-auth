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

  // Props - Mirror React component props
  export let config: AuthConfig;
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

  // Auth store
  const authStore = createAuthStore(config);

  // Component state - Mirror React component state
  let email = initialEmail;
  let loading = false;
  let error: string | null = null;
  let step: 'combined-auth' | 'auto-auth' | 'webauthn-register' | 'email-sent' | 'credential-recovery' = 'combined-auth';
  let supportsWebAuthn = false;
  let conditionalAuthActive = false;
  let emailChangeTimeout: number | null = null;
  let userExists = false;
  let hasPasskeys = false;

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

  // Email change handler - mirrors React implementation
  async function handleEmailChange(event: Event) {
    const target = event.target as HTMLInputElement;
    email = target.value;
    
    if (!email.trim() || !supportsWebAuthn || loading) return;

    // Clear previous timeout
    if (emailChangeTimeout) {
      clearTimeout(emailChangeTimeout);
    }

    // Debounce email changes (1 second delay like React)
    emailChangeTimeout = setTimeout(async () => {
      try {
        await startConditionalAuthentication();
      } catch (err) {
        console.warn('Conditional authentication failed:', err);
      }
    }, 1000);
  }

  // Start conditional authentication - mirrors React conditional auth
  async function startConditionalAuthentication() {
    if (conditionalAuthActive || !email.trim()) return;

    try {
      conditionalAuthActive = true;
      
      // Use the auth store's conditional authentication
      const success = await authStore.startConditionalAuthentication(email);
      
      if (success) {
        // Authentication succeeded - component will receive success event
        console.log('✅ Conditional authentication successful');
      }
    } catch (error) {
      console.warn('Conditional authentication failed:', error);
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
      const emailCheck = await authStore.api.checkEmail(email);
      userExists = emailCheck.exists;
      hasPasskeys = emailCheck.hasPasskey;
      
      if (emailCheck.hasPasskey && supportsWebAuthn) {
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
              error = 'Authentication failed. Please try again.';
              loading = false;
            }
          } else {
            error = 'Authentication failed. Please try again.';
            loading = false;
          }
        }
      } else if (config.enableMagicLinks) {
        // Send magic link
        try {
          await handleMagicLinkAuth();
        } catch (magicLinkError) {
          console.warn('Magic link failed:', magicLinkError);
          error = 'Failed to send magic link. Please try again.';
          loading = false;
        }
      } else {
        // No authentication methods available
        error = 'No authentication methods available for this email.';
        loading = false;
      }
    } catch (err: any) {
      loading = false;
      error = err.message || 'Failed to check email';
    }
  }

  // Password authentication removed - passwordless system only

  // Handle passkey authentication with silent mode support
  async function handlePasskeyAuth(silent = false) {
    try {
      const result = await authStore.signInWithPasskey(email);
      
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
        error = err.message || 'Passkey authentication failed';
      }
      throw err; // Re-throw for caller to handle
    }
  }

  // Handle magic link authentication
  async function handleMagicLinkAuth() {
    try {
      const result = await authStore.signInWithMagicLink(email);
      
      if (result.step === 'magic_link_sent') {
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

  // Reset form to initial state
  function resetForm() {
    step = 'combined-auth';
    error = null;
    loading = false;
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
  .magic-link-step {
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