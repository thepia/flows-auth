<!--
  ⚠️  WARNING: MOCK AUTHENTICATION COMPONENT - DO NOT USE IN PRODUCTION ⚠️

  This component provides FAKE authentication for demo/testing purposes only.
  It does NOT connect to real API servers and will sign in ANY email address.

  For REAL authentication, use the actual flows-auth SignInForm component.

  Purpose: Visual demo of authentication UI without backend dependencies
  Context: Only for showcasing UI/UX flows in isolated environments
  Safe to remove: YES - this should NEVER be used in production
-->

<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import type { User, AuthMethod } from '@thepia/flows-auth';
  import { validateAuthConfig, isMockAuthConfig, type MockAuthConfig } from './types';

  // 🚨 MOCK AUTHENTICATION - NOT REAL SECURITY 🚨
  console.error('🚨 CRITICAL WARNING: MockAuthForm is FAKE authentication - DO NOT USE IN PRODUCTION');
  console.error('🚨 This component will sign in ANY email without real authentication');
  console.error('🚨 Use flows-auth SignInForm for real authentication');

  const dispatch = createEventDispatcher<{
    success: { user: User; method: AuthMethod };
    error: { error: any };
  }>();

  export let config: MockAuthConfig;

  // Runtime validation to prevent production usage
  onMount(() => {
    try {
      validateAuthConfig(config, import.meta.env.PROD ? 'production' : 'development');

      if (!isMockAuthConfig(config)) {
        throw new Error('MockAuthForm requires MockAuthConfig - use createMockAuthConfig() helper');
      }
    } catch (error) {
      console.error('🚨 MockAuthForm validation failed:', error);
      throw error;
    }
  });

  let email = '';
  let loading = false;
  let step: 'email' | 'success' = 'email';
  let conditionalAuthActive = false;

  // WebAuthn conditional authentication
  async function startConditionalAuthentication() {
    if (conditionalAuthActive || !window.PublicKeyCredential || !email.trim()) return;
    
    try {
      conditionalAuthActive = true;
      console.log('🔐 Starting conditional WebAuthn authentication for email:', email);
      
      // Mock conditional authentication - would normally call API for challenge
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(32), // Mock challenge
          allowCredentials: [], // Empty allows any credential
          timeout: 60000,
          userVerification: 'preferred'
        },
        mediation: 'conditional' // This is the key for autosuggest!
      });
      
      if (credential) {
        console.log('✅ Conditional authentication successful!');
        // Mock successful auth
        handleMockSuccess();
      }
    } catch (error: any) {
      console.log('⚠️ Conditional authentication failed (normal if no passkeys):', error.name);
      // This is normal - just means no passkeys available or user cancelled
    } finally {
      conditionalAuthActive = false;
    }
  }

  function handleMockSuccess() {
    const mockUser = {
      id: 'demo-user-' + Date.now(),
      email: email,
      name: email.split('@')[0],
      emailVerified: true,
      createdAt: new Date().toISOString()
    };

    dispatch('success', {
      user: mockUser,
      method: 'passkey'
    });
  }

  async function handleEmailSubmit() {
    if (!email.trim()) return;

    loading = true;

    // Simulate authentication for demo purposes
    setTimeout(() => {
      const mockUser: User = {
        id: 'demo-user-' + Date.now(),
        email: email,
        name: email.split('@')[0],
        emailVerified: true,
        createdAt: new Date().toISOString()
      };

      dispatch('success', {
        user: mockUser,
        method: 'password' as AuthMethod
      });

      loading = false;
      step = 'success';
    }, 1000);
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      handleEmailSubmit();
    }
  }

  // Handle email input changes with debounced conditional auth
  let emailTimeout: number | null = null;
  function handleEmailInput(event: Event) {
    const target = event.target as HTMLInputElement;
    email = target.value;
    
    // Clear previous timeout
    if (emailTimeout) {
      clearTimeout(emailTimeout);
    }
    
    // Start conditional auth after 1 second of no typing (like React implementation)
    if (email.trim()) {
      emailTimeout = setTimeout(() => {
        startConditionalAuthentication();
      }, 1000);
    }
  }
</script>

<div class="auth-form">
  <!-- 🚨 MOCK AUTHENTICATION WARNING 🚨 -->
  <div class="mock-warning">
    <div class="warning-icon">⚠️</div>
    <div class="warning-text">
      <strong>MOCK AUTHENTICATION</strong><br>
      This is FAKE authentication for demo purposes only!<br>
      <small>Any email will be accepted without real verification</small>
    </div>
  </div>

  <div class="form-header">
    <h3>Sign In (MOCK)</h3>
    <p>Welcome to {config?.branding?.companyName || 'Demo App'}</p>
  </div>

  {#if step === 'email'}
    <div class="form-body">
      <div class="input-group">
        <label for="email">Email Address</label>
        <input
          id="email"
          type="email"
          bind:value={email}
          on:input={handleEmailInput}
          on:keydown={handleKeyDown}
          placeholder="Enter your email"
          autocomplete="email webauthn"
          disabled={loading}
          required
        />
      </div>

      <div class="auth-methods">
        {#if config?.enablePasskeys}
          <button 
            class="btn btn-primary"
            on:click={handleEmailSubmit}
            disabled={loading || !email.trim()}
          >
            {#if loading}
              <span class="spinner"></span>
              Signing in...
            {:else}
              🔑 Sign in with Passkey
            {/if}
          </button>
        {/if}

        {#if config?.enableMagicPins}
          <button 
            class="btn btn-secondary"
            on:click={handleEmailSubmit}
            disabled={loading || !email.trim()}
          >
            ✉️ Send Magic Link
          </button>
        {/if}

      </div>

      <div class="features">
        <div class="feature">
          <span class="feature-icon">🔑</span>
          <span>Passwordless authentication</span>
        </div>
        <div class="feature">
          <span class="feature-icon">⚡</span>
          <span>Fast & secure</span>
        </div>
      </div>
    </div>
  {:else}
    <div class="success-message">
      <div class="success-icon">✅</div>
      <h4>Welcome back!</h4>
      <p>You've been successfully signed in.</p>
    </div>
  {/if}
</div>

<style>
  .auth-form {
    max-width: 400px;
    margin: 0 auto;
  }

  /* 🚨 MOCK WARNING STYLES 🚨 */
  .mock-warning {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    background: #fff3cd;
    border: 2px solid #ffc107;
    border-radius: var(--radius-md);
    padding: var(--spacing-4);
    margin-bottom: var(--spacing-6);
    animation: pulse-warning 2s infinite;
  }

  .warning-icon {
    font-size: var(--font-size-2xl);
    color: #856404;
  }

  .warning-text {
    flex: 1;
    color: #856404;
    font-weight: var(--font-weight-medium);
  }

  .warning-text strong {
    color: #721c24;
    font-size: var(--font-size-lg);
  }

  .warning-text small {
    font-size: var(--font-size-xs);
    opacity: 0.8;
  }

  @keyframes pulse-warning {
    0%, 100% {
      border-color: #ffc107;
      background: #fff3cd;
    }
    50% {
      border-color: #fd7e14;
      background: #ffeaa7;
    }
  }

  .form-header {
    text-align: center;
    margin-bottom: var(--spacing-6);
  }

  .form-header h3 {
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-gray-900);
    margin-bottom: var(--spacing-2);
  }

  .form-header p {
    color: var(--color-gray-600);
    margin: 0;
  }

  .input-group {
    margin-bottom: var(--spacing-6);
  }

  .input-group label {
    display: block;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-gray-700);
    margin-bottom: var(--spacing-2);
  }

  .input-group input {
    width: 100%;
    padding: var(--spacing-3);
    border: var(--border-width) solid var(--color-gray-300);
    border-radius: var(--radius-md);
    font-size: var(--font-size-base);
    transition: all var(--transition-fast);
    box-sizing: border-box;
  }

  .input-group input:focus {
    outline: none;
    border-color: var(--brand-primary);
    box-shadow: 0 0 0 3px var(--brand-primary-light);
  }

  .input-group input:disabled {
    background: var(--color-gray-100);
    cursor: not-allowed;
  }

  .auth-methods {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
    margin-bottom: var(--spacing-6);
  }

  .btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-2);
    padding: var(--spacing-3) var(--spacing-4);
    border-radius: var(--radius-md);
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: all var(--transition-fast);
    border: var(--border-width) solid transparent;
    text-decoration: none;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary {
    background: var(--brand-primary);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--brand-primary-hover);
  }

  .btn-secondary {
    background: var(--color-gray-100);
    color: var(--color-gray-700);
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--color-gray-200);
  }


  .spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid transparent;
    border-top: 2px solid currentColor;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .features {
    display: flex;
    justify-content: center;
    gap: var(--spacing-4);
    font-size: var(--font-size-sm);
    color: var(--color-gray-600);
  }

  .feature {
    display: flex;
    align-items: center;
    gap: var(--spacing-1);
  }

  .feature-icon {
    font-size: var(--font-size-base);
  }

  .success-message {
    text-align: center;
    padding: var(--spacing-8) var(--spacing-4);
  }

  .success-icon {
    font-size: var(--font-size-4xl);
    margin-bottom: var(--spacing-4);
  }

  .success-message h4 {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-gray-900);
    margin-bottom: var(--spacing-2);
  }

  .success-message p {
    color: var(--color-gray-600);
    margin: 0;
  }
</style>