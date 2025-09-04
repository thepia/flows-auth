<script lang="ts">
import { browser } from '$app/environment';
import { page } from '$app/stores';
import { onMount } from 'svelte';
import { goto } from '$app/navigation';

let authStore: any = null;
let loading: boolean = true;
let error: string | null = null;
let success: boolean = false;
let redirectUrl: string = '/';
let tokenData: {
  token: string;
  email: string;
  userId: string;
  fullToken: string;
} | null = null;

// Development domain mapping for local redirects
const PRODUCTION_TO_LOCAL_MAPPING = {
  // Production domain -> Local development equivalent with correct ports and HTTPS
  'app.thepia.net': 'https://dev.thepia.net:5173',        // app.thepia.net -> HTTPS port 5173
  'admin.thepia.net': 'https://dev.thepia.net:5174',      // admin.thepia.net -> HTTPS port 5174
  'flows.thepia.net': 'https://dev.thepia.net:5175',      // flows.thepia.net -> HTTPS port 5175
  'thepia.com': 'https://dev.thepia.com:8443',            // thepia.com -> HTTPS port 8443
  // Add more mappings as needed
};

function determineRedirectUrl(urlParams, verificationResult) {
  // 1. Check if API provided a redirect_url in the verification result
  if (verificationResult.redirect_url) {
    console.log('📍 API provided redirect URL:', verificationResult.redirect_url);
    return verificationResult.redirect_url;
  }
  
  // 2. Check URL parameters for redirect hints
  const redirectParam = urlParams.get('redirect_to') || urlParams.get('return_url') || urlParams.get('redirect_uri');
  if (redirectParam) {
    console.log('📍 URL parameter redirect:', redirectParam);
    return redirectParam;
  }
  
  // 3. Check if we're running locally and can map to a dev domain
  const currentHost = window.location.hostname;
  const isLocalDev = currentHost.includes('dev.') || currentHost.includes('localhost') || currentHost.includes('127.0.0.1');
  
  if (isLocalDev) {
    // Try to determine the target app from the user's clientId or other context
    const clientId = verificationResult.user?.clientId || urlParams.get('client_id');
    console.log('🔧 Local development mode, client ID:', clientId);
    
    // Map clientId to production domain, then to local equivalent
    const clientToProductionDomain = {
      'demo': 'app.thepia.net',
      'admin-demo': 'admin.thepia.net', 
      'flows-demo': 'flows.thepia.net',
      'thepia-com': 'thepia.com'
    };
    
    const productionDomain = clientToProductionDomain[clientId];
    if (productionDomain && PRODUCTION_TO_LOCAL_MAPPING[productionDomain]) {
      const localUrl = PRODUCTION_TO_LOCAL_MAPPING[productionDomain];
      console.log('🏠 Mapped to local development URL:', localUrl);
      return localUrl;
    }
  }
  
  // 4. Fallback to current page root
  console.log('📍 Using fallback redirect to current app root');
  return '/';
}

onMount(async () => {
  if (!browser) return;
  
  console.log('🎯 Account confirmation page loaded');
  console.log('📄 Page URL:', $page.url.href);
  console.log('🔍 URL searchParams:', Object.fromEntries($page.url.searchParams));
  
  try {
    // Get the global auth store
    const { getGlobalAuthStore } = await import('@thepia/flows-auth');
    authStore = getGlobalAuthStore();
    
    // Extract token from URL parameters
    const urlParams = $page.url.searchParams;
    const token = urlParams.get('token') || urlParams.get('access_token') || urlParams.get('auth_token');
    const email = urlParams.get('email');
    const userId = urlParams.get('user_id') || urlParams.get('userId');
    
    console.log('🎫 Extracted from URL:', { token: !!token, email, userId });
    
    if (!token) {
      error = 'No authentication token found in URL';
      loading = false;
      return;
    }
    
    // Store token data for display
    tokenData = {
      token: token.substring(0, 20) + '...' + token.substring(token.length - 10),
      email,
      userId,
      fullToken: token
    };
    
    // Verify the magic link token through the API
    console.log('🔗 Verifying magic link token through API...');
    
    if (!authStore.api || !authStore.api.verifyMagicLink) {
      throw new Error('Auth store API not available or verifyMagicLink method missing');
    }
    
    // Call the verifyMagicLink API method
    const verificationResult = await authStore.api.verifyMagicLink(token);
    console.log('✅ Magic link verification result:', verificationResult);
    
    // Check if verification was successful
    if (verificationResult.step !== 'success' || !verificationResult.user || !verificationResult.accessToken) {
      const errorMsg = verificationResult.error || 'Invalid response';
      throw new Error('Magic link verification failed: ' + errorMsg);
    }
    
    // Update tokenData with actual user information from verification
    tokenData = {
      token: verificationResult.accessToken.substring(0, 20) + '...' + verificationResult.accessToken.substring(verificationResult.accessToken.length - 10),
      email: verificationResult.user.email,
      userId: verificationResult.user.id,
      fullToken: verificationResult.accessToken
    };
    
    console.log('💾 Saving verified authentication session...');
    
    // Since the API call was successful, the auth store should handle the session automatically
    // Force a refresh of the auth store to pick up the authenticated state
    await authStore.initialize();
    
    console.log('✅ Token saved successfully');
    success = true;
    
    // Determine redirect URL - check if API provided one, otherwise use fallback
    redirectUrl = determineRedirectUrl(urlParams, verificationResult);
    console.log('🔄 Will redirect to:', redirectUrl);
    
    // Redirect after a short delay
    setTimeout(() => {
      if (redirectUrl.startsWith('http')) {
        // External redirect (different app/domain)
        window.location.href = redirectUrl;
      } else {
        // Internal route
        goto(redirectUrl);
      }
    }, 3000);
    
  } catch (err) {
    console.error('❌ Failed to process account confirmation:', err);
    error = (err && typeof err === 'object' && 'message' in err) ? err.message : 'Failed to process authentication token';
  } finally {
    loading = false;
  }
});

// Reactive statement to log page changes
$: if ($page.url && browser) {
  console.log('📍 Page URL changed:', $page.url.href);
}
</script>

<div class="confirmation-container">
  <div class="confirmation-card">
    <div class="card-header">
      <h1 class="confirmation-title">
        {#if loading}
          <span class="loading-spinner"></span>
          Processing Authentication...
        {:else if success}
          ✅ Account Confirmed
        {:else if error}
          ❌ Authentication Failed
        {:else}
          🔄 Account Confirmation
        {/if}
      </h1>
    </div>
    
    <div class="card-body">
      {#if loading}
        <p class="loading-text">
          Processing your authentication token and setting up your session...
        </p>
      {:else if success}
        <div class="success-content">
          <p class="success-message">
            Your account has been successfully authenticated! You will be redirected to the main page shortly.
          </p>
          
          {#if tokenData}
            <div class="token-info">
              <h3>Authentication Details:</h3>
              <div class="info-grid">
                {#if tokenData.email}
                  <div class="info-item">
                    <span class="label">Email:</span>
                    <span class="value">{tokenData.email}</span>
                  </div>
                {/if}
                {#if tokenData.userId}
                  <div class="info-item">
                    <span class="label">User ID:</span>
                    <span class="value">{tokenData.userId}</span>
                  </div>
                {/if}
                <div class="info-item">
                  <span class="label">Token:</span>
                  <span class="value token-preview">{tokenData.token}</span>
                </div>
              </div>
            </div>
          {/if}
          
          <div class="redirect-info">
            <p>Redirecting to your application in 3 seconds...</p>
            <div class="redirect-target">
              <strong>Target:</strong> 
              {#if redirectUrl.startsWith('http')}
                <a href={redirectUrl} class="redirect-link">{redirectUrl}</a>
              {:else}
                <span class="redirect-path">{redirectUrl}</span>
              {/if}
            </div>
            <div class="redirect-actions">
              <button class="btn btn-primary" on:click={() => {
                if (redirectUrl.startsWith('http')) {
                  window.location.href = redirectUrl;
                } else {
                  goto(redirectUrl);
                }
              }}>
                Go Now
              </button>
              <button class="btn btn-outline" on:click={() => goto('/')}>
                Stay Here
              </button>
            </div>
          </div>
        </div>
      {:else if error}
        <div class="error-content">
          <p class="error-message">
            {error}
          </p>
          <p class="error-help">
            Please check that your email link is complete and try again. If the problem persists, 
            request a new authentication email.
          </p>
          <button class="btn btn-primary" on:click={() => goto('/')}>
            Return to Main Page
          </button>
        </div>
      {:else}
        <p>Initializing...</p>
      {/if}
    </div>
  </div>
  
  <!-- Debug Information (shown in development) -->
  {#if browser && window.location.hostname.includes('dev')}
    <div class="debug-panel">
      <h3>Debug Information</h3>
      <div class="debug-content">
        <p><strong>Current URL:</strong> {$page.url.href}</p>
        <p><strong>URL Parameters:</strong></p>
        <pre class="debug-params">{JSON.stringify(Object.fromEntries($page.url.searchParams), null, 2)}</pre>
        {#if tokenData}
          <p><strong>Extracted Token Data:</strong></p>
          <pre class="debug-token">{JSON.stringify({
            token: tokenData.token,
            email: tokenData.email,
            userId: tokenData.userId
          }, null, 2)}</pre>
        {/if}
        <p><strong>Redirect URL:</strong> {redirectUrl}</p>
        <p><strong>Is Local Dev:</strong> {window?.location?.hostname.includes('dev') || window?.location?.hostname.includes('localhost')}</p>
      </div>
    </div>
  {/if}
</div>

<style>
  .confirmation-container {
    max-width: 600px;
    margin: 2rem auto;
    padding: 0 1rem;
  }
  
  .confirmation-card {
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    overflow: hidden;
  }
  
  .card-header {
    background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
    color: white;
    padding: 2rem;
    text-align: center;
  }
  
  .confirmation-title {
    margin: 0;
    font-size: 1.75rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
  }
  
  .loading-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: white;
    animation: spin 1s ease-in-out infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .card-body {
    padding: 2rem;
  }
  
  .loading-text {
    text-align: center;
    color: #6b7280;
    font-size: 1.1rem;
    margin: 0;
  }
  
  .success-content, .error-content {
    text-align: center;
  }
  
  .success-message {
    color: #059669;
    font-size: 1.1rem;
    font-weight: 500;
    margin-bottom: 2rem;
  }
  
  .error-message {
    color: #dc2626;
    font-size: 1.1rem;
    font-weight: 500;
    margin-bottom: 1rem;
  }
  
  .error-help {
    color: #6b7280;
    margin-bottom: 2rem;
  }
  
  .token-info {
    background: #f8fafc;
    border-radius: 8px;
    padding: 1.5rem;
    margin: 2rem 0;
    text-align: left;
  }
  
  .token-info h3 {
    margin: 0 0 1rem 0;
    color: #374151;
    font-size: 1.1rem;
  }
  
  .info-grid {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid #e5e7eb;
  }
  
  .info-item:last-child {
    border-bottom: none;
  }
  
  .label {
    font-weight: 500;
    color: #4b5563;
  }
  
  .value {
    color: #111827;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.9rem;
  }
  
  .token-preview {
    background: #e5e7eb;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
  }
  
  .redirect-info {
    background: #fef3c7;
    border: 1px solid #fbbf24;
    border-radius: 8px;
    padding: 1.5rem;
    margin-top: 2rem;
  }
  
  .redirect-info p {
    margin: 0 0 1rem 0;
    color: #92400e;
    font-weight: 500;
  }
  
  .redirect-target {
    background: white;
    border-radius: 6px;
    padding: 1rem;
    margin: 1rem 0;
    border: 1px solid #d97706;
  }
  
  .redirect-link {
    color: #2563eb;
    text-decoration: none;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.9rem;
    word-break: break-all;
  }
  
  .redirect-link:hover {
    text-decoration: underline;
  }
  
  .redirect-path {
    color: #374151;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.9rem;
    font-weight: 500;
  }
  
  .redirect-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-top: 1rem;
  }
  
  .btn {
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    border: none;
  }
  
  .btn-primary {
    background: #2563eb;
    color: white;
  }
  
  .btn-primary:hover {
    background: #1d4ed8;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
  }
  
  .btn-outline {
    background: transparent;
    border: 2px solid #d1d5db;
    color: #374151;
  }
  
  .btn-outline:hover {
    background: #f9fafb;
    border-color: #9ca3af;
    transform: translateY(-1px);
  }
  
  .debug-panel {
    margin-top: 2rem;
    background: #1f2937;
    color: white;
    border-radius: 8px;
    padding: 1.5rem;
  }
  
  .debug-panel h3 {
    margin: 0 0 1rem 0;
    color: #fbbf24;
  }
  
  .debug-content p {
    margin: 0.5rem 0;
  }
  
  .debug-params, .debug-token {
    background: #111827;
    border-radius: 4px;
    padding: 1rem;
    font-size: 0.85rem;
    overflow-x: auto;
    margin: 0.5rem 0;
  }
  
  @media (max-width: 640px) {
    .confirmation-container {
      margin: 1rem auto;
      padding: 0 0.5rem;
    }
    
    .card-header, .card-body {
      padding: 1.5rem;
    }
    
    .confirmation-title {
      font-size: 1.5rem;
    }
    
    .info-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.25rem;
    }
  }
</style>