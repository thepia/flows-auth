<script>
  import { onMount } from 'svelte';
  
  let authStore = null;
  let testEmail = 'test@example.com';
  let testResult = null;
  let loading = false;
  let error = null;
  
  export { authStore };
  
  async function testCheckUser() {
    if (!authStore || !testEmail.trim()) return;
    
    loading = true;
    error = null;
    
    try {
      console.log('🧪 Testing checkUser with:', testEmail);
      console.log('Auth store available:', !!authStore);
      console.log('Auth store methods:', Object.keys(authStore));
      
      const result = await authStore.checkUser(testEmail);
      console.log('✅ checkUser result:', result);
      
      testResult = result;
    } catch (err) {
      console.error('❌ checkUser failed:', err);
      error = err.message || 'Unknown error';
    } finally {
      loading = false;
    }
  }
  
  async function testApiDirectly() {
    if (!authStore || !testEmail.trim()) return;
    
    loading = true;
    error = null;
    
    try {
      console.log('🧪 Testing API directly with:', testEmail);
      
      if (authStore.api) {
        const result = await authStore.api.checkEmail(testEmail);
        console.log('✅ Direct API result:', result);
        testResult = result;
      } else {
        throw new Error('No API client available');
      }
    } catch (err) {
      console.error('❌ Direct API failed:', err);
      error = err.message || 'Unknown error';
    } finally {
      loading = false;
    }
  }
</script>

<div class="debug-panel">
  <h3>Registration Debug Panel</h3>
  
  <div class="test-section">
    <h4>Auth Store Status</h4>
    <p>Available: {!!authStore ? '✅ Yes' : '❌ No'}</p>
    {#if authStore}
      <p>Methods: {Object.keys(authStore).join(', ')}</p>
      <p>Has checkUser: {typeof authStore.checkUser === 'function' ? '✅ Yes' : '❌ No'}</p>
      <p>Has API: {!!authStore.api ? '✅ Yes' : '❌ No'}</p>
    {/if}
  </div>
  
  <div class="test-section">
    <h4>Test checkUser Function</h4>
    
    <div class="input-group">
      <label for="test-email">Test Email:</label>
      <input 
        id="test-email"
        type="email" 
        bind:value={testEmail} 
        placeholder="Enter email to test"
        class="form-input"
      />
    </div>
    
    <div class="button-group">
      <button 
        on:click={testCheckUser} 
        disabled={loading || !testEmail.trim()}
        class="btn btn-primary"
      >
        {loading ? 'Testing...' : 'Test checkUser()'}
      </button>
      
      <button 
        on:click={testApiDirectly} 
        disabled={loading || !testEmail.trim()}
        class="btn btn-secondary"
      >
        {loading ? 'Testing...' : 'Test API Directly'}
      </button>
    </div>
    
    {#if error}
      <div class="error-display">
        <strong>Error:</strong> {error}
      </div>
    {/if}
    
    {#if testResult}
      <div class="result-display">
        <h5>Result:</h5>
        <pre>{JSON.stringify(testResult, null, 2)}</pre>
      </div>
    {/if}
  </div>
</div>

<style>
  .debug-panel {
    background: #f8f9fa;
    border: 2px dashed #6c757d;
    border-radius: 8px;
    padding: 1rem;
    margin: 1rem 0;
    font-family: monospace;
  }
  
  .test-section {
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: white;
    border-radius: 4px;
    border: 1px solid #dee2e6;
  }
  
  .test-section h4, .test-section h5 {
    margin-top: 0;
    color: #495057;
  }
  
  .input-group {
    margin-bottom: 1rem;
  }
  
  .input-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: bold;
    color: #495057;
  }
  
  .form-input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ced4da;
    border-radius: 4px;
    font-size: 0.9rem;
  }
  
  .button-group {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  
  .btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    transition: all 0.2s;
  }
  
  .btn-primary {
    background: #007bff;
    color: white;
  }
  
  .btn-primary:hover:not(:disabled) {
    background: #0056b3;
  }
  
  .btn-secondary {
    background: #6c757d;
    color: white;
  }
  
  .btn-secondary:hover:not(:disabled) {
    background: #545b62;
  }
  
  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .error-display {
    margin-top: 1rem;
    padding: 0.75rem;
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
    border-radius: 4px;
  }
  
  .result-display {
    margin-top: 1rem;
    padding: 0.75rem;
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
    border-radius: 4px;
  }
  
  .result-display pre {
    margin: 0.5rem 0 0 0;
    background: rgba(255,255,255,0.7);
    padding: 0.5rem;
    border-radius: 4px;
    font-size: 0.8rem;
    overflow-x: auto;
  }
</style>