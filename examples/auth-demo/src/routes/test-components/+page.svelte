<!--
  Component Test Page
  Simple test to verify components load without exceptions
-->
<script>
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  
  let testResults = [];
  let SessionStateMachineComponent = null;
  let SignInCoreComponent = null;
  let componentsLoaded = false;
  let loadError = null;
  
  function addResult(test, success, message) {
    testResults = [...testResults, { test, success, message, timestamp: new Date().toISOString() }];
  }
  
  onMount(async () => {
    if (!browser) return;
    
    addResult('Browser Check', true, 'Running in browser environment');
    
    try {
      // Test component imports
      addResult('Import Test', true, 'Starting component import...');
      
      const authModule = await import('@thepia/flows-auth');
      addResult('Auth Module', true, 'Successfully imported @thepia/flows-auth');
      
      const { SessionStateMachineFlow, SignInCore } = authModule;
      
      if (SessionStateMachineFlow) {
        SessionStateMachineComponent = SessionStateMachineFlow;
        addResult('SessionStateMachineFlow', true, 'Component imported successfully');
      } else {
        addResult('SessionStateMachineFlow', false, 'Component not found in module');
      }
      
      if (SignInCore) {
        SignInCoreComponent = SignInCore;
        addResult('SignInCore', true, 'Component imported successfully');
      } else {
        addResult('SignInCore', false, 'Component not found in module');
      }
      
      componentsLoaded = true;
      addResult('Load Complete', true, 'All components loaded successfully');
      
    } catch (error) {
      loadError = error.message;
      addResult('Import Error', false, `Failed to import components: ${error.message}`);
      console.error('Component import error:', error);
    }
  });
</script>

<div class="test-page">
  <h1>Component Test Page</h1>
  
  <div class="test-results">
    <h2>Test Results</h2>
    {#each testResults as result}
      <div class="test-result" class:success={result.success} class:failure={!result.success}>
        <span class="test-name">{result.test}:</span>
        <span class="test-status">{result.success ? '✅' : '❌'}</span>
        <span class="test-message">{result.message}</span>
        <span class="test-time">{new Date(result.timestamp).toLocaleTimeString()}</span>
      </div>
    {/each}
  </div>
  
  {#if loadError}
    <div class="error-section">
      <h3>Load Error</h3>
      <pre>{loadError}</pre>
    </div>
  {/if}
  
  {#if componentsLoaded}
    <div class="component-tests">
      <h2>Component Rendering Tests</h2>
      
      {#if SessionStateMachineComponent}
        <div class="component-test">
          <h3>SessionStateMachineFlow</h3>
          <div class="component-container">
            <svelte:component 
              this={SessionStateMachineComponent}
              authState="unauthenticated"
              width={400}
              height={200}
            />
          </div>
        </div>
      {/if}
      
      {#if SignInCoreComponent}
        <div class="component-test">
          <h3>SignInCore (without auth context - should show fallback)</h3>
          <div class="component-container">
            <svelte:component 
              this={SignInCoreComponent}
              config={{
                apiBaseUrl: 'https://api.thepia.com',
                clientId: 'test',
                domain: 'thepia.net',
                enablePasskeys: false,
                enableMagicLinks: true,
                branding: { companyName: 'Test' }
              }}
              initialEmail=""
            />
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .test-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
  
  .test-results {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 2rem;
  }
  
  .test-result {
    display: grid;
    grid-template-columns: 200px 40px 1fr 100px;
    gap: 1rem;
    padding: 0.5rem;
    border-bottom: 1px solid #e2e8f0;
    align-items: center;
  }
  
  .test-result:last-child {
    border-bottom: none;
  }
  
  .test-result.success {
    background: #f0fdf4;
  }
  
  .test-result.failure {
    background: #fef2f2;
  }
  
  .test-name {
    font-weight: 600;
  }
  
  .test-time {
    font-size: 0.8rem;
    color: #6b7280;
  }
  
  .error-section {
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 2rem;
  }
  
  .error-section pre {
    background: #fff;
    padding: 1rem;
    border-radius: 4px;
    overflow-x: auto;
  }
  
  .component-tests {
    margin-top: 2rem;
  }
  
  .component-test {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
  }
  
  .component-container {
    border: 1px dashed #d1d5db;
    border-radius: 4px;
    padding: 1rem;
    background: #fafafa;
  }
</style>
