<!--
  Registration Form Component - Complete registration experience with email verification
  Implements the optimal registration journey: Registration → App Access → Email Verification
-->
<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { createAuthStore } from '../stores/auth-store';
  import { isWebAuthnSupported, isPlatformAuthenticatorAvailable } from '../utils/webauthn';
  import type { 
    AuthConfig, 
    User, 
    AuthError, 
    RegistrationStep,
    RegistrationRequest,
    AuthEventData 
  } from '../types';

  // Props
  export let config: AuthConfig;
  export let showLogo = true;
  export let compact = false;
  export let className = '';
  export let initialEmail = '';

  // Events
  const dispatch = createEventDispatcher<{
    success: { user: User; step: RegistrationStep };
    error: { error: AuthError };
    stepChange: { step: RegistrationStep };
    appAccess: { user: User }; // User enters app with unconfirmed state
  }>();

  // Auth store
  const authStore = createAuthStore(config);

  // Component state
  let email = initialEmail;
  let firstName = '';
  let lastName = '';
  let loading = false;
  let error: string | null = null;
  let step: RegistrationStep = 'email-entry';
  let supportsWebAuthn = false;
  let userExists = false;

  // Terms of Service state
  let acceptedTerms = false;
  let acceptedPrivacy = false;
  let marketingConsent = false;

  // WebAuthn state
  let platformAuthenticatorAvailable = false;

  // Initialize component
  onMount(async () => {
    supportsWebAuthn = isWebAuthnSupported() && config.enablePasskeys;
    platformAuthenticatorAvailable = await isPlatformAuthenticatorAvailable();
    
    console.log('🔐 RegistrationForm WebAuthn Status:', {
      supportsWebAuthn,
      platformAuthenticatorAvailable,
      enablePasskeys: config.enablePasskeys
    });
  });

  // Handle email entry and user check
  async function handleEmailEntry() {
    if (!email.trim()) return;
    
    loading = true;
    error = null;

    try {
      // Check if user already exists
      const emailCheck = await authStore.api.checkEmail(email);
      userExists = emailCheck.exists;
      
      if (userExists) {
        error = 'An account with this email already exists. Please sign in instead.';
        loading = false;
        return;
      }

      // Proceed to Terms of Service
      step = 'terms-of-service';
      dispatch('stepChange', { step });
      loading = false;
    } catch (err: any) {
      loading = false;
      error = err.message || 'Failed to check email';
    }
  }

  // Handle Terms of Service acceptance
  function handleTermsAcceptance() {
    if (!acceptedTerms || !acceptedPrivacy) {
      error = 'You must accept the Terms of Service and Privacy Policy to continue.';
      return;
    }

    error = null;
    step = 'webauthn-register';
    dispatch('stepChange', { step });
    dispatch('terms_accepted', { 
      terms: acceptedTerms, 
      privacy: acceptedPrivacy, 
      marketing: marketingConsent 
    });
  }

  // Handle WebAuthn registration
  async function handleRegistration() {
    if (!acceptedTerms || !acceptedPrivacy) {
      error = 'Terms of Service must be accepted';
      return;
    }

    loading = true;
    error = null;

    try {
      const registrationData: RegistrationRequest = {
        email,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        acceptedTerms,
        acceptedPrivacy,
        marketingConsent
      };

      // Register user with passkey
      const result = await authStore.registerUser(registrationData);

      if (result.step === 'success' && result.user) {
        // Registration successful - user enters app immediately
        step = 'registration-success';
        loading = false;
        
        // Dispatch app access event - user can explore app with limited functionality
        dispatch('appAccess', { user: result.user });
        
        // Also dispatch success for backward compatibility
        dispatch('success', { 
          user: result.user, 
          step: 'registration-success' 
        });
      }
    } catch (err: any) {
      loading = false;
      error = err.message || 'Registration failed';
      dispatch('error', { error: { code: 'registration_failed', message: error } });
    }
  }

  // Handle form submission based on current step
  function handleSubmit() {
    switch (step) {
      case 'email-entry':
        handleEmailEntry();
        break;
      case 'terms-of-service':
        handleTermsAcceptance();
        break;
      case 'webauthn-register':
        handleRegistration();
        break;
    }
  }

  // Go back to previous step
  function handleBack() {
    error = null;
    switch (step) {
      case 'terms-of-service':
        step = 'email-entry';
        break;
      case 'webauthn-register':
        step = 'terms-of-service';
        break;
      default:
        step = 'email-entry';
    }
    dispatch('stepChange', { step });
  }

  // Reset form to initial state
  function resetForm() {
    step = 'email-entry';
    error = null;
    loading = false;
    email = initialEmail;
    firstName = '';
    lastName = '';
    acceptedTerms = false;
    acceptedPrivacy = false;
    marketingConsent = false;
  }
</script>

<div class="registration-form {className}" class:compact>
  {#if showLogo && config.branding?.logoUrl}
    <div class="auth-logo">
      <img src={config.branding.logoUrl} alt={config.branding.companyName || 'Logo'} />
    </div>
  {/if}

  <div class="auth-container">
    {#if step === 'email-entry'}
      <!-- Email Entry Step -->
      <div class="email-entry-step">
        <div class="step-header">
          <h2 class="step-title">Create Account</h2>
          <p class="step-description">
            Enter your email to create a new account with {config.branding?.companyName || 'us'}
          </p>
        </div>

        <form on:submit|preventDefault={handleSubmit}>
          <div class="input-group">
            <label for="email" class="input-label">Email address</label>
            <input
              bind:value={email}
              id="email"
              type="email"
              class="email-input"
              class:error={!!error}
              placeholder="your.email@company.com"
              autocomplete="email"
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
              Checking email...
            {:else}
              Continue
            {/if}
          </button>
        </form>
      </div>

    {:else if step === 'terms-of-service'}
      <!-- Terms of Service Step -->
      <div class="terms-step">
        <div class="step-header">
          <button type="button" class="back-button" on:click={handleBack}>
            ← Back
          </button>
          <h2 class="step-title">Terms & Privacy</h2>
          <p class="step-description">
            Please review and accept our terms to continue
          </p>
        </div>

        <form on:submit|preventDefault={handleSubmit}>
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

            <div class="checkbox-group">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  bind:checked={marketingConsent}
                />
                <span class="checkmark"></span>
                I would like to receive product updates and marketing communications (optional)
              </label>
            </div>
          </div>

          {#if error}
            <div class="error-message">{error}</div>
          {/if}

          <button
            type="submit"
            class="continue-button"
            disabled={!acceptedTerms || !acceptedPrivacy}
          >
            Accept & Continue
          </button>
        </form>
      </div>

    {:else if step === 'webauthn-register'}
      <!-- WebAuthn Registration Step -->
      <div class="webauthn-register-step">
        <div class="step-header">
          <button type="button" class="back-button" on:click={handleBack}>
            ← Back
          </button>
          <h2 class="step-title">Create Account with Passkey</h2>
          <p class="step-description">
            Create a new account for <strong>{email}</strong> using secure passkey authentication
          </p>
        </div>

        <form on:submit|preventDefault={handleSubmit}>
          <div class="optional-fields">
            <div class="input-row">
              <div class="input-group">
                <label for="firstName" class="input-label">First Name (optional)</label>
                <input
                  bind:value={firstName}
                  id="firstName"
                  type="text"
                  class="name-input"
                  placeholder="John"
                  autocomplete="given-name"
                  disabled={loading}
                />
              </div>
              <div class="input-group">
                <label for="lastName" class="input-label">Last Name (optional)</label>
                <input
                  bind:value={lastName}
                  id="lastName"
                  type="text"
                  class="name-input"
                  placeholder="Doe"
                  autocomplete="family-name"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {#if error}
            <div class="error-message">{error}</div>
          {/if}

          <button
            type="submit"
            class="register-button"
            class:loading
            disabled={loading}
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
      <!-- Registration Success - User enters app immediately -->
      <div class="success-step">
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
  /* Base styles - inherit from SignInForm */
  .registration-form {
    max-width: 400px;
    width: 100%;
    margin: 0 auto;
    font-family: var(--font-family-brand, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
  }

  .registration-form.compact {
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

  .email-entry-step,
  .terms-step,
  .webauthn-register-step,
  .success-step {
    padding: 32px 24px;
  }

  .step-header {
    text-align: center;
    margin-bottom: 32px;
    position: relative;
  }

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

  /* Input styles */
  .input-group {
    margin-bottom: 24px;
  }

  .input-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .input-label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: #374151;
    margin-bottom: 8px;
  }

  .email-input,
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

  .email-input:focus,
  .name-input:focus {
    outline: none;
    border-color: var(--brand-primary, #0066cc);
    box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
  }

  .email-input:disabled,
  .name-input:disabled {
    background: #f9fafb;
    color: #6b7280;
    cursor: not-allowed;
  }

  .email-input.error {
    border-color: #ef4444;
  }

  /* Terms of Service styles */
  .terms-section {
    margin-bottom: 24px;
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

  /* Button styles */
  .continue-button,
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

  .continue-button:hover:not(:disabled),
  .register-button:hover:not(:disabled) {
    background: var(--brand-primary-hover, #0052a3);
    transform: translateY(-1px);
  }

  .continue-button:disabled,
  .register-button:disabled {
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

  .error-message {
    color: #ef4444;
    font-size: 14px;
    margin-top: 8px;
    margin-bottom: 16px;
  }

  /* Success step styles */
  .success-icon {
    display: flex;
    justify-content: center;
    margin-bottom: 16px;
  }

  .success-icon svg {
    width: 48px;
    height: 48px;
    color: #10b981;
  }

  .success-info {
    background: #f0f9ff;
    border: 1px solid #0ea5e9;
    border-radius: 8px;
    padding: 16px;
    margin-top: 24px;
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

  /* Mobile responsive */
  @media (max-width: 480px) {
    .registration-form {
      max-width: none;
      margin: 0 16px;
    }

    .auth-logo img {
      height: 32px;
    }

    .email-entry-step,
    .terms-step,
    .webauthn-register-step,
    .success-step {
      padding: 24px 16px;
    }

    .input-row {
      grid-template-columns: 1fr;
      gap: 16px;
    }
  }
</style>
