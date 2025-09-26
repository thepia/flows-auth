<script>
  import { onMount, onDestroy } from 'svelte';
  import { fetchInterceptor } from '../utils/fetch-interceptor.js';
  
  let isOpen = false;
  let isInstalled = false;
  let activeMappings = [];
  
  const errorTypes = [
    {
      id: 'technical',
      label: 'Technical API Error (404)',
      icon: '🔧',
      description: 'service unavailable',
      action: 'passkey'
    },
    {
      id: 'checkuser',
      label: 'Check User Error (503)',
      icon: '👤',
      description: 'User check service unavailable',
      action: 'Enter email'
    },
    { 
      id: 'passkey', 
      label: 'Passkey Challenge Error', 
      icon: '🔑', 
      description: 'WebAuthn challenge endpoint missing',
      action: 'passkey'
    },
    { 
      id: 'webauthn', 
      label: 'WebAuthn Cancelled', 
      icon: '❌', 
      description: 'User cancelled WebAuthn operation',
      action: 'passkey'
    },
    { 
      id: 'security', 
      label: 'Security Error', 
      icon: '🔒', 
      description: 'WebAuthn security context error',
      action: 'any WebAuthn'
    },
    { 
      id: 'generic', 
      label: 'Generic Auth Error', 
      icon: '⚠️', 
      description: 'Unknown server error',
      action: 'Send code'
    },
    { 
      id: 'emailcode', 
      label: 'Email Code Error', 
      icon: '📧', 
      description: 'Invalid verification code',
      action: 'Verify code'
    }
  ];
  
  onMount(() => {
    // Install interceptor when component mounts
    console.log('🧪 ErrorTestMenu mounting...');
    fetchInterceptor.install();
    isInstalled = true;
    updateActiveMappings();
    console.log('🧪 ErrorTestMenu mounted successfully');
  });
  
  onDestroy(() => {
    // Clean up when component unmounts
    if (isInstalled) {
      fetchInterceptor.uninstall();
    }
  });
  
  function updateActiveMappings() {
    activeMappings = fetchInterceptor.getActiveMappings();
  }
  
  function triggerError(errorType) {
    if (!isInstalled) {
      console.warn('Fetch interceptor not installed');
      return;
    }
    
    switch (errorType) {
      case 'technical':
        fetchInterceptor.injectTechnicalError();
        break;
      case 'checkuser':
        fetchInterceptor.injectCheckUserError();
        break;
      case 'passkey':
        fetchInterceptor.injectPasskeyError();
        break;
      case 'webauthn':
        fetchInterceptor.injectWebAuthnError();
        break;
      case 'security':
        fetchInterceptor.injectSecurityError();
        break;
      case 'generic':
        fetchInterceptor.injectGenericError();
        break;
      case 'emailcode':
        fetchInterceptor.injectEmailCodeError();
        break;
      case 'clear':
        fetchInterceptor.clearAllErrors();
        break;
    }
    
    updateActiveMappings();
    isOpen = false;
  }
  
  function toggleMenu() {
    isOpen = !isOpen;
    if (isOpen) {
      updateActiveMappings();
    }
  }
  
  // Close menu when clicking outside
  function handleClickOutside(event) {
    if (!event.target.closest('.error-test-menu')) {
      isOpen = false;
    }
  }
</script>

<svelte:window on:click={handleClickOutside} />

<!-- Debug: Component is rendering -->
{console.log('🧪 ErrorTestMenu template rendering')}

<div class="error-test-menu">
  <button 
    class="menu-trigger"
    class:active={isOpen}
    class:has-errors={activeMappings.length > 0}
    on:click={toggleMenu}
    title="Network Error Testing - {activeMappings.length} active error{activeMappings.length === 1 ? '' : 's'}"
  >
    🧪 Test Errors
    {#if activeMappings.length > 0}
      <span class="error-count">{activeMappings.length}</span>
    {/if}
  </button>
  
  {#if isOpen}
    <div class="menu-dropdown">
      <div class="menu-header">
        <h4>🧪 Network Error Testing</h4>
        <p>Inject errors into API calls to test friendly error messages:</p>
      </div>
      
      {#if activeMappings.length > 0}
        <div class="active-errors">
          <h5>Active Error Injections:</h5>
          {#each activeMappings as mapping}
            <div class="active-error">
              <span class="error-type">{mapping.type}</span>
              <span class="error-pattern">{mapping.pattern}</span>
            </div>
          {/each}
        </div>
      {/if}
      
      <div class="menu-items">
        {#each errorTypes as errorType}
          <button 
            class="menu-item"
            on:click={() => triggerError(errorType.id)}
          >
            <span class="menu-icon">{errorType.icon}</span>
            <div class="menu-content">
              <span class="menu-label">{errorType.label}</span>
              <span class="menu-description">{errorType.description}
                <span class="menu-action">→ {errorType.action}</span>
              </span>
              
            </div>
          </button>
        {/each}
        
        <div class="menu-divider"></div>
        
        <button 
          class="menu-item clear-item"
          on:click={() => triggerError('clear')}
          disabled={activeMappings.length === 0}
        >
          <span class="menu-icon">✨</span>
          <div class="menu-content">
            <span class="menu-label">Clear All Errors</span>
            <span class="menu-description">Reset to normal network behavior</span>
          </div>
        </button>
      </div>
      
      <div class="menu-footer">
        <p class="instructions">
          💡 <strong>How to test:</strong><br>
          1. Click an error type above<br>
          2. Perform the suggested action in SignInCore<br>
          3. See the friendly error message appear<br>
          4. Error clears automatically after first use
        </p>
      </div>
    </div>
  {/if}
</div>

<style>
  .error-test-menu {
    position: fixed;
    top: 120px;
    right: 20px;
    z-index: 1000;
  }
  
  .menu-trigger {
    background: #2563eb;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 0.75rem 1rem;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    position: relative;
  }
  
  .menu-trigger:hover {
    background: #1d4ed8;
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(37, 99, 235, 0.4);
  }
  
  .menu-trigger.active {
    background: #1d4ed8;
  }
  
  .menu-trigger.has-errors {
    background: #dc2626;
  }
  
  .menu-trigger.has-errors:hover {
    background: #b91c1c;
  }
  
  .error-count {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 700;
  }
  
  .menu-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    min-width: 360px;
    max-width: 420px;
    overflow: hidden;
  }
  
  .menu-header {
    padding: 1rem;
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
  }
  
  .menu-header h4 {
    margin: 0 0 0.25rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: #111827;
  }
  
  .menu-header p {
    margin: 0;
    font-size: 0.875rem;
    color: #6b7280;
    line-height: 1.4;
  }
  
  .active-errors {
    padding: 1rem;
    background: #fef2f2;
    border-bottom: 1px solid #e5e7eb;
  }
  
  .active-errors h5 {
    margin: 0 0 0.5rem 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: #dc2626;
  }
  
  .active-error {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.25rem 0;
    font-size: 0.8rem;
  }
  
  .error-type {
    background: #dc2626;
    color: white;
    padding: 0.125rem 0.375rem;
    border-radius: 4px;
    font-weight: 500;
  }
  
  .error-pattern {
    color: #6b7280;
    font-family: monospace;
  }
  
  .menu-items {
    padding: 0.5rem;
  }
  
  .menu-item {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    width: 100%;
    padding: 0.75rem;
    border: none;
    background: transparent;
    border-radius: 6px;
    cursor: pointer;
    transition: background-color 0.15s ease;
    text-align: left;
  }
  
  .menu-item:hover:not(:disabled) {
    background: #f3f4f6;
  }
  
  .menu-item:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .menu-item.clear-item {
    border-top: 1px solid #e5e7eb;
    margin-top: 0.5rem;
    padding-top: 1rem;
  }
  
  .menu-divider {
    height: 1px;
    background: #e5e7eb;
    margin: 0.5rem 0;
  }
  
  .menu-icon {
    font-size: 1.1rem;
    width: 20px;
    text-align: center;
    margin-top: 0.1rem;
  }
  
  .menu-content {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
  }
  
  .menu-label {
    font-size: 0.9rem;
    color: #374151;
    font-weight: 500;
  }
  
  .menu-description {
    font-size: 0.8rem;
    color: #6b7280;
    line-height: 1.3;
  }
  
  .menu-action {
    font-size: 0.75rem;
    color: #2563eb;
    font-weight: 500;
    font-style: italic;
  }
  
  .menu-footer {
    padding: 1rem;
    background: #fef3c7;
    border-top: 1px solid #e5e7eb;
  }
  
  .instructions {
    margin: 0;
    font-size: 0.8rem;
    color: #92400e;
    line-height: 1.4;
  }
</style>
