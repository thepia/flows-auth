/**
 * Simple test for checkUser functionality
 */

export async function testCheckUserFunctionality() {
  console.log('🧪 Starting checkUser functionality test...');

  try {
    // Import the flows-auth library
    const { useAuth, isAuthStoreInitialized } = await import('@thepia/flows-auth');

    // Check if auth store is initialized
    if (!isAuthStoreInitialized()) {
      throw new Error('Auth store is not initialized');
    }

    // Get the auth store
    const authStore = useAuth();
    console.log('✅ Auth store retrieved successfully');
    console.log('Auth store methods:', Object.keys(authStore));

    // Check if checkUser method exists
    if (typeof authStore.checkUser !== 'function') {
      throw new Error('checkUser method is not available');
    }
    console.log('✅ checkUser method is available');

    // Test with a sample email
    const testEmail = 'test@example.com';
    console.log(`🔍 Testing checkUser with: ${testEmail}`);

    const startTime = Date.now();
    const result = await authStore.checkUser(testEmail);
    const duration = Date.now() - startTime;

    console.log('✅ checkUser completed successfully');
    console.log('Result:', result);
    console.log(`Duration: ${duration}ms`);

    // Validate result structure
    const expectedFields = ['exists', 'hasWebAuthn', 'emailVerified'];
    const missingFields = expectedFields.filter((field) => !(field in result));

    if (missingFields.length > 0) {
      console.warn('⚠️ Missing expected fields:', missingFields);
    } else {
      console.log('✅ Result has all expected fields');
    }

    return {
      success: true,
      result,
      duration,
      message: 'checkUser test completed successfully'
    };
  } catch (error) {
    console.error('❌ checkUser test failed:', error);
    return {
      success: false,
      error: error.message,
      stack: error.stack,
      message: `checkUser test failed: ${error.message}`
    };
  }
}

export function runTestAndDisplay() {
  return testCheckUserFunctionality().then((result) => {
    const testResult = document.createElement('div');
    testResult.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${result.success ? '#d4edda' : '#f8d7da'};
      color: ${result.success ? '#155724' : '#721c24'};
      border: 1px solid ${result.success ? '#c3e6cb' : '#f5c6cb'};
      border-radius: 8px;
      padding: 1rem;
      max-width: 400px;
      font-family: monospace;
      font-size: 12px;
      z-index: 9999;
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    `;

    testResult.innerHTML = `
      <h4 style="margin: 0 0 0.5rem 0;">checkUser Test ${result.success ? '✅' : '❌'}</h4>
      <p style="margin: 0 0 0.5rem 0;"><strong>Status:</strong> ${result.success ? 'PASSED' : 'FAILED'}</p>
      ${result.duration ? `<p style="margin: 0 0 0.5rem 0;"><strong>Duration:</strong> ${result.duration}ms</p>` : ''}
      ${result.result ? `<p style="margin: 0 0 0.5rem 0;"><strong>Result:</strong> ${JSON.stringify(result.result)}</p>` : ''}
      ${result.error ? `<p style="margin: 0 0 0.5rem 0;"><strong>Error:</strong> ${result.error}</p>` : ''}
      <button onclick="this.parentElement.remove()" style="
        margin-top: 0.5rem;
        padding: 0.25rem 0.5rem;
        background: rgba(0,0,0,0.1);
        border: none;
        border-radius: 4px;
        cursor: pointer;
      ">Close</button>
    `;

    document.body.appendChild(testResult);

    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (testResult.parentElement) {
        testResult.remove();
      }
    }, 10000);

    return result;
  });
}
