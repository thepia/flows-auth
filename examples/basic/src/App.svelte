<!--
  Basic Auth Library Example
  Shows how to use @thepia/flows-auth in a simple application
-->
<script>
  import { SignInForm, createAuthStore } from '@thepia/flows-auth';

  // Auth configuration
  const authConfig = {
    apiBaseUrl: 'https://api.demo.thepia.com',
    clientId: 'demo-client-id',
    domain: 'demo.thepia.com',
    enablePasskeys: true,
    enableMagicLinks: true,
    enablePasswordLogin: true,
    branding: {
      companyName: 'Demo Company',
      logoUrl: '/demo-logo.svg',
      primaryColor: '#0066cc',
      showPoweredBy: true
    }
  };

  // Create auth store
  const auth = createAuthStore(authConfig);

  // State
  let showSignIn = true;

  // Event handlers
  function handleSignInSuccess({ detail }) {
    console.log('✅ Sign in successful:', detail.user);
    showSignIn = false;
  }

  function handleSignInError({ detail }) {
    console.error('❌ Sign in error:', detail.error);
  }

  function handleSignOut() {
    auth.signOut().then(() => {
      showSignIn = true;
      console.log('👋 Signed out');
    });
  }

  // Subscribe to auth state
  $: console.log('Auth state:', $auth);
</script>

<main>
  <div class="container">
    <header>
      <h1>@thepia/flows-auth</h1>
      <p>Basic Example</p>
    </header>

    {#if showSignIn}
      <div class="auth-section">
        <h2>Sign In</h2>
        <SignInForm 
          config={authConfig}
          showLogo={true}
          on:success={handleSignInSuccess}
          on:error={handleSignInError}
        />
      </div>
    {:else}
      <div class="dashboard">
        <h2>Welcome back!</h2>
        {#if $auth.user}
          <div class="user-info">
            <p><strong>Name:</strong> {$auth.user.name || 'Unknown'}</p>
            <p><strong>Email:</strong> {$auth.user.email}</p>
            <p><strong>ID:</strong> {$auth.user.id}</p>
          </div>
        {/if}
        
        <button class="sign-out-btn" on:click={handleSignOut}>
          Sign Out
        </button>
      </div>
    {/if}

    <footer>
      <p>
        This example demonstrates basic usage of the Thepia Auth Library.
        Check the browser console for detailed logs.
      </p>
    </footer>
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #f5f5f5;
  }

  .container {
    max-width: 600px;
    margin: 0 auto;
    padding: 2rem;
  }

  header {
    text-align: center;
    margin-bottom: 3rem;
  }

  header h1 {
    color: #333;
    margin-bottom: 0.5rem;
  }

  header p {
    color: #666;
    font-size: 1.1rem;
  }

  .auth-section {
    margin: 2rem 0;
  }

  .auth-section h2 {
    text-align: center;
    margin-bottom: 2rem;
    color: #333;
  }

  .dashboard {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    text-align: center;
  }

  .dashboard h2 {
    color: #333;
    margin-bottom: 1.5rem;
  }

  .user-info {
    text-align: left;
    background: #f8f9fa;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 2rem;
  }

  .user-info p {
    margin: 0.5rem 0;
    color: #555;
  }

  .sign-out-btn {
    background: #dc3545;
    color: white;
    border: none;
    padding: 0.75rem 2rem;
    border-radius: 8px;
    font-size: 1rem;
    cursor: pointer;
    transition: background 0.2s;
  }

  .sign-out-btn:hover {
    background: #c82333;
  }

  footer {
    margin-top: 3rem;
    text-align: center;
    color: #666;
    font-size: 0.9rem;
  }
</style>