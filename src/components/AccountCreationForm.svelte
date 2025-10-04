<!--
  Account Creation Form Component - Complete account creation experience for invited users
  Implements the optimal account creation journey: Account Creation → Passkey Setup → App Access
-->
<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { getAuthStoreFromContext } from '../utils/auth-context';
  import type { SvelteAuthStore } from '../types/svelte';
  import { isWebAuthnSupported, isPlatformAuthenticatorAvailable } from '../utils/webauthn';
  import type {
    AuthConfig,
    User,
    AuthError,
    RegistrationRequest,
    AuthEventData,
    InvitationTokenData,
    AdditionalField
  } from '../types';

  // Props
  export let store: SvelteAuthStore | null = null; // Auth store prop (preferred)
  export let showLogo = true;
  export let compact = false;
  export let className = '';
  export let initialEmail = '';
  export let invitationTokenData: InvitationTokenData | null = null;
  export let invitationToken: string | null = null; // Original JWT token string
  export let additionalFields: AdditionalField[] = [];
  export let readOnlyFields: string[] = [];
  export let onSwitchToSignIn: (() => void) | undefined = undefined;

// Events
const dispatch = createEventDispatcher<{
  success: { user: User };
  error: { error: AuthError };
  appAccess: { user: User; emailVerifiedViaInvitation?: boolean; autoSignIn?: boolean }; // User enters app
  switchToSignIn: Record<string, never>;
}>();

  // Auth store - use prop or fallback to context
  const authStore = store || getAuthStoreFromContext();

  if (!authStore) {
    throw new Error('AccountCreationForm requires store prop or auth store in context');
  }

  // Get config from store
  $: config = authStore.getConfig();

  // Track registration completion for auth store subscription
  let registrationCompleted = false;
  let registrationResult: { user: User; emailVerifiedViaInvitation?: boolean } | null = null;
  
  // Auth store subscription unsubscribe function
  let unsubscribeAuthStore: (() => void) | null = null;

  // Component state
  let email = invitationTokenData?.email || initialEmail;
  let firstName = invitationTokenData?.firstName || '';
  let lastName = invitationTokenData?.lastName || '';
  let company = invitationTokenData?.company || '';
  let phone = invitationTokenData?.phone || '';
  let jobTitle = invitationTokenData?.jobTitle || '';
  let loading = false;
  let error: string | null = null;
  let supportsWebAuthn = false;
  let userExists = false;
  // Note: No success step - flow goes directly to authenticated app after passkey creation

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
    
    if (invitationTokenData) {
      console.log('🎫 Form prefilled from invitation token:', {
        email: invitationTokenData.email,
        fieldsPopulated: {
          firstName: !!invitationTokenData.firstName,
          lastName: !!invitationTokenData.lastName,
          company: !!invitationTokenData.company,
          phone: !!invitationTokenData.phone,
          jobTitle: !!invitationTokenData.jobTitle
        }
      });
    }

    // Subscribe to auth store state changes
    console.log('🔧 RegistrationForm subscribing to auth store in onMount');
    unsubscribeAuthStore = authStore.subscribe(($auth) => {
      console.log('🔍 RegistrationForm auth state change:', {
        state: $auth.state,
        hasUser: !!$auth.user,
        registrationCompleted,
        hasRegistrationResult: !!registrationResult
      });

      // Only emit appAccess after successful registration AND auth store confirms authentication
      if (registrationCompleted && registrationResult && $auth.state === 'authenticated' && $auth.user) {
        console.log('✅ Auth store confirmed authentication after registration - emitting appAccess');
        
        dispatch('appAccess', {
          user: registrationResult.user,
          emailVerifiedViaInvitation: registrationResult.emailVerifiedViaInvitation,
          autoSignIn: registrationResult.emailVerifiedViaInvitation || false
        });

        // Reset registration tracking
        registrationCompleted = false;
        registrationResult = null;
      }
    });
  });

  // Clean up subscription on component destroy
  onDestroy(() => {
    if (unsubscribeAuthStore) {
      unsubscribeAuthStore();
    }
  });
  
  // Utility functions
  function isFieldReadOnly(fieldName: string): boolean {
    return readOnlyFields.includes(fieldName) || 
           (invitationTokenData?.readOnlyFields?.includes(fieldName) ?? false);
  }
  
  function isFieldVisible(fieldName: AdditionalField): boolean {
    return additionalFields.includes(fieldName);
  }
  
  function isInvitationExpired(): boolean {
    return invitationTokenData?.expires ? invitationTokenData.expires < new Date() : false;
  }
  
  function handleSwitchToSignIn() {
    if (onSwitchToSignIn) {
      onSwitchToSignIn();
    }
    dispatch('switchToSignIn');
  }

  // Handle registration form submission
  async function handleRegistration() {
    // Validate required fields
    if (!email.trim()) {
      error = 'Email is required';
      return;
    }
    if (!firstName.trim()) {
      error = 'First name is required';
      return;
    }
    if (!lastName.trim()) {
      error = 'Last name is required';
      return;
    }
    if (!acceptedTerms || !acceptedPrivacy) {
      error = 'You must accept the Terms of Service and Privacy Policy to continue.';
      return;
    }

    loading = true;
    error = null;

    try {
      // Check if user already exists
      const emailCheck = await authStore.api.checkEmail(email);
      if (emailCheck.exists) {
        error = 'An account with this email already exists. Please sign in instead.';
        loading = false;
        return;
      }

      const registrationData: RegistrationRequest = {
        email,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        company: company.trim() || undefined,
        phone: phone.trim() || undefined,
        jobTitle: jobTitle.trim() || undefined,
        acceptedTerms,
        acceptedPrivacy,
        marketingConsent,
        invitationToken: invitationToken || undefined // Pass actual JWT token string
      };

      // Create account with passkey (full WebAuthn registration flow)
      const result = await authStore.createAccount(registrationData);

      if (result.step === 'success' && result.user) {
        loading = false;

        // Store registration result for auth store subscription to handle
        registrationResult = {
          user: result.user,
          emailVerifiedViaInvitation: result.emailVerifiedViaInvitation
        };
        registrationCompleted = true;

        console.log('🎉 Registration API call successful - waiting for auth store to confirm session persistence');

        // Account creation completed - auth store will handle session creation and app transition
        console.log('🎉 Account creation API call successful - waiting for auth store to confirm session persistence');

        // Emit success event immediately (for UI feedback)
        console.log('🚀 DISPATCHING SUCCESS EVENT:', { user: result.user });
        dispatch('success', { user: result.user });
      }
    } catch (err: any) {
      loading = false;
      error = err.message || 'Registration failed';
      dispatch('error', { error: { code: 'registration_failed', message: error } });
    }
  }

  // Handle form submission
  function handleSubmit() {
    handleRegistration();
  }

  // Note: resetForm removed - no longer needed since there's no success step
</script>

<div class="registration-form {className}" class:compact>
  {#if showLogo && config.branding?.logoUrl}
    <div class="auth-logo">
      <img src={config.branding.logoUrl} alt={config.branding.companyName || 'Logo'} />
    </div>
  {/if}

  <div class="auth-container">
    <!-- Account Creation Form - Single Form Design -->


      <!-- Single Form Registration - Mirror original flows.thepia.net form -->
      <div class="webauthn-register-step">
        <div class="step-header">
          <h2 class="step-title">Create Account</h2>
          <p class="step-description">
            {#if invitationTokenData?.message}
              {invitationTokenData.message}
            {:else if invitationTokenData}
              We have some information from your invitation. Please review and complete your profile.
            {:else}
              Enter your details to create a new account with {config.branding?.companyName || 'us'}
            {/if}
          </p>
        </div>

        <!-- Invitation Token Warning -->
        {#if invitationTokenData && isInvitationExpired()}
          <div class="warning-banner">
            <svg class="warning-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3l-7.732-13.5c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <span>This invitation has expired. You can still register, but some features may be limited.</span>
          </div>
        {/if}

        <form on:submit|preventDefault={handleSubmit}>
          <div class="form-grid">
            <!-- Email Field (full width) -->
            <div class="form-field">
              <label for="email">Email Address <span class="required">*</span></label>
              <input
                id="email"
                type="email"
                bind:value={email}
                required
                readonly={isFieldReadOnly('email') || !!invitationTokenData?.email}
                class:readonly={isFieldReadOnly('email') || !!invitationTokenData?.email}
                placeholder="your.email@company.com"
                autocomplete="email"
                disabled={loading}
              />
            </div>
            
            <!-- First Name -->
            <div class="form-field">
              <label for="firstName">First Name <span class="required">*</span></label>
              <input
                id="firstName"
                type="text"
                bind:value={firstName}
                required
                readonly={isFieldReadOnly('firstName')}
                class:readonly={isFieldReadOnly('firstName')}
                placeholder="John"
                autocomplete="given-name"
                disabled={loading}
              />
            </div>
            
            <!-- Last Name -->
            <div class="form-field">
              <label for="lastName">Last Name <span class="required">*</span></label>
              <input
                id="lastName"
                type="text"
                bind:value={lastName}
                required
                readonly={isFieldReadOnly('lastName')}
                class:readonly={isFieldReadOnly('lastName')}
                placeholder="Doe"
                autocomplete="family-name"
                disabled={loading}
              />
            </div>
            
            <!-- Company (full width) -->
            <div class="form-field">
              <label for="company">Company</label>
              <input
                id="company"
                type="text"
                bind:value={company}
                readonly={isFieldReadOnly('company')}
                class:readonly={isFieldReadOnly('company')}
                placeholder="Acme Corp"
                autocomplete="organization"
                disabled={loading}
              />
            </div>
            
            <!-- Phone Number -->
            <div class="form-field">
              <label for="phone">Phone Number</label>
              <input
                id="phone"
                type="tel"
                bind:value={phone}
                readonly={isFieldReadOnly('phone')}
                class:readonly={isFieldReadOnly('phone')}
                placeholder="+1 (555) 123-4567"
                autocomplete="tel"
                disabled={loading}
              />
            </div>
            
            <!-- Job Title -->
            <div class="form-field">
              <label for="jobTitle">Job Title</label>
              <input
                id="jobTitle"
                type="text"
                bind:value={jobTitle}
                readonly={isFieldReadOnly('jobTitle')}
                class:readonly={isFieldReadOnly('jobTitle')}
                placeholder="Software Engineer"
                autocomplete="organization-title"
                disabled={loading}
              />
            </div>
          </div>
          
          <!-- Terms Container -->
          <div class="terms-container">
            <label class="checkbox-label">
              <input
                type="checkbox"
                bind:checked={acceptedTerms}
                required
                disabled={loading}
              />
              <span>I agree to the <a href="/terms" target="_blank">Terms of Service</a> <span class="required">*</span></span>
            </label>
            
            <label class="checkbox-label">
              <input
                type="checkbox"
                bind:checked={acceptedPrivacy}
                required
                disabled={loading}
              />
              <span>I agree to the <a href="/privacy" target="_blank">Privacy Policy</a> <span class="required">*</span></span>
            </label>
          </div>

          {#if error}
            <div class="error-message">{error}</div>
          {/if}

          <button
            type="submit"
            class="submit-button"
            class:loading
            disabled={loading || !acceptedTerms || !acceptedPrivacy}
          >
            {#if loading}
              <span class="loading-spinner"></span>
              Creating Account...
            {:else}
              🔑 Create Account with Passkey
            {/if}
          </button>

          {#if supportsWebAuthn}
            <div class="webauthn-info">
              <small>🔐 Your device will prompt for Touch ID, Face ID, or Windows Hello</small>
            </div>
          {/if}
        </form>
        
        <!-- Form Footer -->
        <div class="form-footer">
          <p>Already have an account? <button on:click={handleSwitchToSignIn} class="link-button">Sign in instead</button></p>
        </div>
      </div>

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
  /* Registration form styling - exact styling from flows.thepia.net backup */
  .registration-form {
    max-width: 500px;
    width: 100%;
    margin: 0 auto;
    font-family: var(--font-family-brand, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
  }

  :global(.registration-form.compact) {
    max-width: 320px;
  }

  :global(.auth-logo) {
    text-align: center;
    margin-bottom: 24px;
  }

  :global(.auth-logo img) {
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

  .webauthn-register-step {
    padding: 32px 32px;
  }

  .step-header {
    text-align: center;
    margin-bottom: 32px;
    position: relative;
  }

  :global(.back-button) {
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

  :global(.back-button:hover) {
    background: var(--primary-light, #e6f2ff);
  }

  :global(.step-title) {
    font-size: 24px;
    font-weight: 600;
    color: #1a202c;
    margin: 0 0 8px 0;
    text-align: center;
  }

  :global(.step-description) {
    color: #64748b;
    text-align: center;
    margin: 0 0 24px 0;
    font-size: 14px;
  }

  :global(.warning-banner) {
    background: #fef3c7;
    color: #92400e;
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 24px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
  }

  :global(.warning-icon) {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 24px;
  }

  .form-field {
    display: flex;
    flex-direction: column;
  }

  .form-field:first-child {
    grid-column: 1 / -1;
  }

  /* Make company field span full width too */
  .form-field:nth-child(4) {
    grid-column: 1 / -1;
  }

  .form-field label {
    font-size: 14px;
    font-weight: 500;
    color: #374151;
    margin-bottom: 4px;
  }

  .form-field input {
    padding: 12px 16px;
    border: 2px solid #d1d5db;
    border-radius: 8px;
    font-size: 16px;
    transition: border-color 0.2s;
  }

  .form-field input:focus {
    outline: none;
    border-color: var(--thepia-primary, var(--brand-primary, #0066cc));
    box-shadow: 0 0 0 3px rgba(152, 138, 202, 0.1);
  }

  .form-field input.readonly {
    background: #f9fafb;
    cursor: not-allowed;
  }

  :global(.required) {
    color: #ef4444;
  }

  :global(.terms-container) {
    margin-bottom: 24px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  :global(.checkbox-label) {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 14px;
    color: #374151;
    cursor: pointer;
  }

  :global(.checkbox-label input[type="checkbox"]) {
    margin-top: 2px;
    width: 16px;
    height: 16px;
    accent-color: var(--thepia-primary, var(--brand-primary, #0066cc));
  }

  :global(.checkbox-label a) {
    color: var(--thepia-primary, var(--brand-primary, #0066cc));
    text-decoration: none;
  }

  :global(.checkbox-label a:hover) {
    text-decoration: underline;
  }

  :global(.submit-button) {
    width: 100%;
    background: var(--thepia-primary, var(--brand-primary, #0066cc));
    color: white;
    border: none;
    padding: 16px;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  :global(.submit-button:hover:not(:disabled)) {
    background: var(--thepia-primary-600, var(--brand-primary-dark, #0056b3));
    transform: translateY(-1px);
  }

  :global(.submit-button:disabled) {
    background: #d1d5db;
    color: #6b7280;
    cursor: not-allowed;
    transform: none;
  }

  :global(.submit-button .loading-spinner) {
    width: 16px;
    height: 16px;
    border: 2px solid transparent;
    border-top: 2px solid currentColor;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-right: 8px;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  :global(.form-footer) {
    text-align: center;
    font-size: 14px;
    color: #64748b;
    padding-top: 16px;
    border-top: 1px solid #e5e7eb;
  }

  :global(.form-footer p) {
    margin: 0;
  }

  :global(.link-button) {
    background: none;
    border: none;
    color: var(--thepia-primary, var(--brand-primary, #0066cc));
    cursor: pointer;
    text-decoration: underline;
    font: inherit;
    padding: 0;
  }

  :global(.link-button:hover) {
    color: var(--thepia-primary-600, var(--brand-primary-dark, #0056b3));
  }

  /* Mobile responsive for registration form */
  @media (max-width: 768px) {
    :global(.form-grid) {
      grid-template-columns: 1fr;
      gap: 16px;
    }
    
    :global(.form-field:first-child),
    :global(.form-field:nth-child(4)) {
      grid-column: 1;
    }
  }

  @media (max-width: 480px) {
    :global(.webauthn-register-step) {
      padding: 24px 16px;
    }
  }

  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    :global(.auth-container) {
      background: #2d3748;
      box-shadow: 
        0 20px 25px -5px rgba(0, 0, 0, 0.4),
        0 10px 10px -5px rgba(0, 0, 0, 0.2);
    }

    :global(.step-title) {
      color: #f7fafc;
    }

    :global(.step-description) {
      color: #a0aec0;
    }

    :global(.warning-banner) {
      background: #78350f;
      color: #fed7aa;
    }

    :global(.form-field label) {
      color: #e2e8f0;
    }

    :global(.form-field input) {
      background: #374151;
      border-color: #4a5568;
      color: #f7fafc;
    }

    :global(.form-field input:focus) {
      border-color: var(--thepia-primary, var(--brand-primary, #0066cc));
    }

    :global(.form-field input.readonly) {
      background: #1f2937;
    }

    :global(.checkbox-label) {
      color: #e2e8f0;
    }

    :global(.form-footer) {
      color: #a0aec0;
    }
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

  /* New styles for enhanced features */
  .readonly {
    background-color: #f9fafb !important;
    color: #6b7280 !important;
    cursor: not-allowed !important;
  }

  .business-fields {
    margin-top: 16px;
  }

  .warning-banner {
    background: #fef3c7;
    border: 1px solid #f59e0b;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .warning-icon {
    width: 20px;
    height: 20px;
    color: #f59e0b;
    flex-shrink: 0;
  }

  .warning-banner span {
    font-size: 14px;
    color: #92400e;
  }

  .invitation-message {
    background: #f0f9ff;
    border: 1px solid #0ea5e9;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }

  .message-icon {
    font-size: 20px;
    flex-shrink: 0;
  }

  .invitation-message p {
    margin: 0;
    font-size: 14px;
    color: #0c4a6e;
    line-height: 1.5;
  }

  .form-footer {
    text-align: center;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #e5e7eb;
  }

  .form-footer p {
    margin: 0;
    font-size: 14px;
    color: #6b7280;
  }

  .link-button {
    background: none;
    border: none;
    color: var(--brand-primary, #0066cc);
    cursor: pointer;
    text-decoration: underline;
    font-size: inherit;
    font-family: inherit;
    padding: 0;
    margin: 0;
  }

  .link-button:hover {
    color: var(--brand-primary-hover, #0052a3);
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
