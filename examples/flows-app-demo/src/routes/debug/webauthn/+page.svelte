<script lang="ts">
import { browser } from '$app/environment';
import { onMount } from 'svelte';

// WebAuthn testing state
let supportsWebAuthn = false;
let supportsConditionalUI = false;
let testResults: any[] = [];
let currentTest = '';
let isLoading = false;

// Credential data
let credentialId = '';
let publicKey = '';
let userHandle = '';
let challenge = '';

// Configuration
let rpId = 'dev.thepia.net';
let rpName = 'Thepia WebAuthn Debugger';
let userId = '';
let userName = '';
let userDisplayName = '';

// Test utilities
function arrayBufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (const byte of bytes) {
    str += String.fromCharCode(byte);
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlToArrayBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(base64url.length + ((4 - (base64url.length % 4)) % 4), '=');

  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function stringToArrayBuffer(str: string): ArrayBuffer {
  return new TextEncoder().encode(str).buffer;
}

function generateRandomUserId(): string {
  const timestamp = Date.now().toString(36);
  const random = Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map((b) => b.toString(36))
    .join('');
  return `user_${timestamp}_${random}`;
}

function generateChallenge(): ArrayBuffer {
  return crypto.getRandomValues(new Uint8Array(32)).buffer;
}

function addTestResult(test: string, result: any) {
  testResults = [
    {
      timestamp: new Date().toISOString(),
      test,
      result: typeof result === 'object' ? JSON.stringify(result, null, 2) : result,
      success: !result?.error,
    },
    ...testResults,
  ];
}

// WebAuthn test functions
async function testWebAuthnSupport() {
  currentTest = 'Testing WebAuthn Support';
  isLoading = true;

  try {
    const result = {
      webAuthnSupported: !!window.PublicKeyCredential,
      conditionalUISupported: false,
      platformAuthenticatorSupported: false,
      userVerifyingPlatformAuthenticatorSupported: false,
    };

    if (window.PublicKeyCredential) {
      // Test conditional UI
      if (PublicKeyCredential.isConditionalMediationAvailable) {
        result.conditionalUISupported = await PublicKeyCredential.isConditionalMediationAvailable();
      }

      // Test platform authenticator
      if (PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
        result.platformAuthenticatorSupported =
          await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        result.userVerifyingPlatformAuthenticatorSupported = result.platformAuthenticatorSupported;
      }
    }

    supportsWebAuthn = result.webAuthnSupported;
    supportsConditionalUI = result.conditionalUISupported;
    addTestResult('WebAuthn Support Detection', result);
  } catch (error) {
    addTestResult('WebAuthn Support Detection', { error: error.message });
  } finally {
    isLoading = false;
    currentTest = '';
  }
}

async function createDiscoverableCredential() {
  if (!supportsWebAuthn) {
    addTestResult('Create Discoverable Credential', { error: 'WebAuthn not supported' });
    return;
  }

  currentTest = 'Creating Discoverable Credential';
  isLoading = true;

  try {
    // Generate test data
    const userIdGenerated = userId || generateRandomUserId();
    const challengeBuffer = generateChallenge();
    challenge = arrayBufferToBase64url(challengeBuffer);

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge: challengeBuffer,
        rp: {
          id: rpId,
          name: rpName,
        },
        user: {
          id: stringToArrayBuffer(userIdGenerated),
          name: userName || `${userIdGenerated}@example.com`,
          displayName: userDisplayName || 'Test User',
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' }, // ES256
          { alg: -257, type: 'public-key' }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          requireResidentKey: true,
          residentKey: 'required',
          userVerification: 'preferred',
        },
        timeout: 60000,
        attestation: 'direct',
        extensions: {
          credProps: true,
        },
      },
    })) as PublicKeyCredential;

    if (credential) {
      credentialId = arrayBufferToBase64url(credential.rawId);

      const response = credential.response as AuthenticatorAttestationResponse;
      const extensions = credential.getClientExtensionResults();

      const result = {
        credentialId: credential.id,
        credentialIdBase64url: credentialId,
        rawIdLength: credential.rawId.byteLength,
        type: credential.type,
        authenticatorAttachment: (credential as any).authenticatorAttachment,
        attestationObjectLength: response.attestationObject.byteLength,
        clientDataJSONLength: response.clientDataJSON.byteLength,
        publicKeyLength: response.getPublicKey()?.byteLength || 0,
        extensions: extensions,
        isDiscoverable: extensions.credProps?.rk || 'unknown',
        userIdStored: userIdGenerated,
        challenge: challenge,
      };

      // Store for authentication tests
      userId = userIdGenerated;
      localStorage.setItem('webauthn-test-credential-id', credentialId);
      localStorage.setItem('webauthn-test-user-id', userIdGenerated);

      addTestResult('Create Discoverable Credential', result);
    }
  } catch (error) {
    addTestResult('Create Discoverable Credential', {
      error: error.message,
      name: error.name,
      challenge: challenge,
    });
  } finally {
    isLoading = false;
    currentTest = '';
  }
}

async function createNonDiscoverableCredential() {
  if (!supportsWebAuthn) {
    addTestResult('Create Non-Discoverable Credential', { error: 'WebAuthn not supported' });
    return;
  }

  currentTest = 'Creating Non-Discoverable Credential';
  isLoading = true;

  try {
    const userIdGenerated = userId || generateRandomUserId();
    const challengeBuffer = generateChallenge();
    challenge = arrayBufferToBase64url(challengeBuffer);

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge: challengeBuffer,
        rp: {
          id: rpId,
          name: rpName,
        },
        user: {
          id: stringToArrayBuffer(userIdGenerated),
          name: userName || `${userIdGenerated}@example.com`,
          displayName: userDisplayName || 'Test User',
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },
          { alg: -257, type: 'public-key' },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          requireResidentKey: false,
          residentKey: 'discouraged',
          userVerification: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',
        extensions: {
          credProps: true,
        },
      },
    })) as PublicKeyCredential;

    if (credential) {
      const tempCredentialId = arrayBufferToBase64url(credential.rawId);
      const response = credential.response as AuthenticatorAttestationResponse;
      const extensions = credential.getClientExtensionResults();

      const result = {
        credentialId: credential.id,
        credentialIdBase64url: tempCredentialId,
        rawIdLength: credential.rawId.byteLength,
        type: credential.type,
        attestationObjectLength: response.attestationObject.byteLength,
        clientDataJSONLength: response.clientDataJSON.byteLength,
        extensions: extensions,
        isDiscoverable: extensions.credProps?.rk || 'unknown',
        userIdStored: userIdGenerated,
        challenge: challenge,
      };

      addTestResult('Create Non-Discoverable Credential', result);
    }
  } catch (error) {
    addTestResult('Create Non-Discoverable Credential', {
      error: error.message,
      name: error.name,
    });
  } finally {
    isLoading = false;
    currentTest = '';
  }
}

async function authenticateWithCredentialId() {
  if (!credentialId) {
    addTestResult('Authenticate with Credential ID', {
      error: 'No credential ID available. Create a credential first.',
    });
    return;
  }

  currentTest = 'Authenticating with Credential ID';
  isLoading = true;

  try {
    const challengeBuffer = generateChallenge();
    const challengeBase64 = arrayBufferToBase64url(challengeBuffer);

    const assertion = (await navigator.credentials.get({
      publicKey: {
        challenge: challengeBuffer,
        rpId: rpId,
        allowCredentials: [
          {
            id: base64urlToArrayBuffer(credentialId),
            type: 'public-key',
            transports: ['internal'],
          },
        ],
        userVerification: 'preferred',
        timeout: 60000,
      },
    })) as PublicKeyCredential;

    if (assertion) {
      const response = assertion.response as AuthenticatorAssertionResponse;
      let extractedUserHandle = null;

      if (response.userHandle) {
        extractedUserHandle = new TextDecoder().decode(response.userHandle);
      }

      const result = {
        credentialId: assertion.id,
        rawIdMatches: arrayBufferToBase64url(assertion.rawId) === credentialId,
        originalUserId: userId,
        userHandleReturned: extractedUserHandle,
        userHandleMatches: extractedUserHandle === userId,
        userHandleStatus: extractedUserHandle
          ? extractedUserHandle === userId
            ? 'MATCH - user.id retrieved from passkey'
            : 'MISMATCH - different user.id returned'
          : 'NULL - credential does not store user.id',
        authenticatorDataLength: response.authenticatorData.byteLength,
        clientDataJSONLength: response.clientDataJSON.byteLength,
        signatureLength: response.signature.byteLength,
        challenge: challengeBase64,
      };

      userHandle = extractedUserHandle || 'null';
      addTestResult('Authenticate with Credential ID', result);
    }
  } catch (error) {
    addTestResult('Authenticate with Credential ID', {
      error: error.message,
      name: error.name,
    });
  } finally {
    isLoading = false;
    currentTest = '';
  }
}

async function authenticateDiscoverable() {
  if (!supportsWebAuthn) {
    addTestResult('Discoverable Authentication', { error: 'WebAuthn not supported' });
    return;
  }

  currentTest = 'Discoverable Authentication';
  isLoading = true;

  try {
    const challengeBuffer = generateChallenge();
    const challengeBase64 = arrayBufferToBase64url(challengeBuffer);

    const assertion = (await navigator.credentials.get({
      publicKey: {
        challenge: challengeBuffer,
        rpId: rpId,
        allowCredentials: [], // Empty for discoverable
        userVerification: 'preferred',
        timeout: 60000,
      },
    })) as PublicKeyCredential;

    if (assertion) {
      const response = assertion.response as AuthenticatorAssertionResponse;
      let extractedUserHandle = null;

      if (response.userHandle) {
        extractedUserHandle = new TextDecoder().decode(response.userHandle);
      }

      const result = {
        mode: 'Discoverable/Resident Key Authentication',
        credentialId: assertion.id,
        credentialIdBase64url: arrayBufferToBase64url(assertion.rawId),
        userHandleReturned: extractedUserHandle,
        userHandleStatus: extractedUserHandle
          ? 'SUCCESS - user.id retrieved from passkey without credential ID'
          : 'FAILED - no user.id returned (may not be discoverable)',
        originalUserIdStored: userId || 'Unknown (no credential created in this session)',
        userIdMatches: extractedUserHandle === userId,
        authenticatorDataLength: response.authenticatorData.byteLength,
        clientDataJSONLength: response.clientDataJSON.byteLength,
        signatureLength: response.signature.byteLength,
        challenge: challengeBase64,
        note: 'This tests backup recovery - user.id should be returned from the passkey',
      };

      userHandle = extractedUserHandle || 'null';
      addTestResult('Discoverable Authentication', result);
    }
  } catch (error) {
    addTestResult('Discoverable Authentication', {
      error: error.message,
      name: error.name,
    });
  } finally {
    isLoading = false;
    currentTest = '';
  }
}

async function testConditionalUI() {
  if (!supportsConditionalUI) {
    addTestResult('Conditional UI Test', { error: 'Conditional UI not supported' });
    return;
  }

  currentTest = 'Testing Conditional UI';
  isLoading = true;

  try {
    const challengeBuffer = generateChallenge();
    const challengeBase64 = arrayBufferToBase64url(challengeBuffer);

    const assertion = (await navigator.credentials.get({
      publicKey: {
        challenge: challengeBuffer,
        rpId: rpId,
        allowCredentials: [],
        userVerification: 'preferred',
        timeout: 60000,
      },
      mediation: 'conditional',
    })) as PublicKeyCredential;

    if (assertion) {
      const response = assertion.response as AuthenticatorAssertionResponse;
      let extractedUserHandle = null;

      if (response.userHandle) {
        extractedUserHandle = new TextDecoder().decode(response.userHandle);
      }

      const result = {
        mode: 'Conditional UI',
        credentialId: assertion.id,
        userHandle: extractedUserHandle,
        challenge: challengeBase64,
      };

      addTestResult('Conditional UI Test', result);
    }
  } catch (error) {
    addTestResult('Conditional UI Test', {
      error: error.message,
      name: error.name,
    });
  } finally {
    isLoading = false;
    currentTest = '';
  }
}

function clearResults() {
  testResults = [];
}

function clearStoredData() {
  credentialId = '';
  publicKey = '';
  userHandle = '';
  userId = '';
  localStorage.removeItem('webauthn-test-credential-id');
  localStorage.removeItem('webauthn-test-user-id');
  addTestResult('Clear Stored Data', { success: 'All stored test data cleared' });
}

onMount(() => {
  if (browser) {
    // Initialize from localStorage
    credentialId = localStorage.getItem('webauthn-test-credential-id') || '';
    userId = localStorage.getItem('webauthn-test-user-id') || '';

    // Auto-detect WebAuthn support
    testWebAuthnSupport();

    // Set defaults
    if (!userId) {
      userId = generateRandomUserId();
    }
    if (!userName) {
      userName = `${userId}@example.com`;
    }
    if (!userDisplayName) {
      userDisplayName = 'Test User';
    }
  }
});
</script>

<div class="min-h-screen p-6 bg-gradient-to-br from-purple-50 to-indigo-50">
  <div class="max-w-6xl mx-auto">
    <h1 class="text-3xl font-bold text-gray-900 mb-4">
      🔐 WebAuthn/Passkey Debugger
    </h1>
    
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
      <h2 class="text-lg font-semibold text-blue-900 mb-2">Key Concepts</h2>
      <div class="text-sm text-blue-800 space-y-2">
        <p><strong>user.id</strong> (registration): Data YOU provide - stored in passkey if discoverable</p>
        <p><strong>userHandle</strong> (authentication): Your user.id returned from the passkey</p>
        <p><strong>Credential ID</strong>: Unique identifier for the passkey itself (always returned)</p>
        <p><strong>Discoverable vs Non-Discoverable</strong>: Whether user.id is stored with the passkey</p>
      </div>
    </div>

    <!-- Support Status -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div class="bg-white p-4 rounded-lg shadow">
        <h3 class="font-semibold text-gray-700">WebAuthn Support</h3>
        <p class="text-sm {supportsWebAuthn ? 'text-green-600' : 'text-red-600'}">
          {supportsWebAuthn ? '✅ Supported' : '❌ Not Supported'}
        </p>
      </div>
      <div class="bg-white p-4 rounded-lg shadow">
        <h3 class="font-semibold text-gray-700">Conditional UI</h3>
        <p class="text-sm {supportsConditionalUI ? 'text-green-600' : 'text-red-600'}">
          {supportsConditionalUI ? '✅ Supported' : '❌ Not Supported'}
        </p>
      </div>
      <div class="bg-white p-4 rounded-lg shadow">
        <h3 class="font-semibold text-gray-700">Current Domain</h3>
        <p class="text-sm text-gray-600">{browser ? window.location.hostname : 'N/A'}</p>
      </div>
      <div class="bg-white p-4 rounded-lg shadow">
        <h3 class="font-semibold text-gray-700">Status</h3>
        <p class="text-sm {isLoading ? 'text-orange-600' : 'text-green-600'}">
          {isLoading ? `🔄 ${currentTest}` : '✅ Ready'}
        </p>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <!-- Configuration Panel -->
      <div class="bg-white p-6 rounded-lg shadow">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">Configuration</h2>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">RP ID</label>
            <input 
              bind:value={rpId}
              type="text" 
              class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="example.com"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">RP Name</label>
            <input 
              bind:value={rpName}
              type="text" 
              class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Your App Name"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">User ID</label>
            <input 
              bind:value={userId}
              type="text" 
              class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="user123"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">User Name (email)</label>
            <input 
              bind:value={userName}
              type="email" 
              class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
            <input 
              bind:value={userDisplayName}
              type="text" 
              class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="User Display Name"
            />
          </div>
        </div>

        {#if credentialId}
          <div class="mt-6 p-4 bg-green-50 rounded-lg">
            <h3 class="text-sm font-semibold text-green-800 mb-2">Test Credential (localStorage)</h3>
            <p class="text-xs text-green-700 break-all">Credential ID: {credentialId}</p>
            <p class="text-xs text-green-700">Original user.id: {userId}</p>
            {#if userHandle && userHandle !== 'null'}
              <p class="text-xs text-green-700">Returned userHandle: {userHandle}</p>
              <p class="text-xs {userHandle === userId ? 'text-green-700' : 'text-red-700'}">
                userHandle matches: {userHandle === userId ? '✅ Yes' : '❌ No'}
              </p>
            {:else}
              <p class="text-xs text-gray-600">userHandle: Not returned yet</p>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Test Actions -->
      <div class="bg-white p-6 rounded-lg shadow">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">Test Actions</h2>
        
        <div class="space-y-3">
          <h3 class="font-medium text-gray-700 text-sm uppercase tracking-wide">Registration</h3>
          
          <button 
            on:click={createDiscoverableCredential}
            disabled={isLoading || !supportsWebAuthn}
            class="w-full bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
          >
            Create Discoverable Credential
          </button>
          
          <button 
            on:click={createNonDiscoverableCredential}
            disabled={isLoading || !supportsWebAuthn}
            class="w-full bg-purple-500 text-white py-2 px-4 rounded hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
          >
            Create Non-Discoverable Credential
          </button>

          <h3 class="font-medium text-gray-700 text-sm uppercase tracking-wide mt-6">Authentication</h3>
          
          <button 
            on:click={authenticateWithCredentialId}
            disabled={isLoading || !supportsWebAuthn || !credentialId}
            class="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
          >
            Authenticate (with Credential ID)
          </button>
          
          <button 
            on:click={authenticateDiscoverable}
            disabled={isLoading || !supportsWebAuthn}
            class="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
          >
            Authenticate (Discoverable)
          </button>
          
          <button 
            on:click={testConditionalUI}
            disabled={isLoading || !supportsConditionalUI}
            class="w-full bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
          >
            Test Conditional UI
          </button>

          <h3 class="font-medium text-gray-700 text-sm uppercase tracking-wide mt-6">Utilities</h3>
          
          <button 
            on:click={testWebAuthnSupport}
            disabled={isLoading}
            class="w-full bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
          >
            Re-check WebAuthn Support
          </button>
          
          <button 
            on:click={clearStoredData}
            class="w-full bg-orange-600 text-white py-2 px-4 rounded hover:bg-orange-700 text-sm"
          >
            Clear Stored Data
          </button>
        </div>
      </div>
    </div>

    <!-- Test Results -->
    <div class="mt-8 bg-white p-6 rounded-lg shadow">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold text-gray-900">Test Results</h2>
        <button 
          on:click={clearResults}
          class="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
        >
          Clear Results
        </button>
      </div>
      
      {#if testResults.length === 0}
        <p class="text-gray-500 text-center py-8">No test results yet. Run a test to see results here.</p>
      {:else}
        <div class="space-y-4 max-h-96 overflow-y-auto">
          {#each testResults as result}
            <div class="border border-gray-200 rounded-lg p-4 {result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}">
              <div class="flex justify-between items-start mb-2">
                <h3 class="font-medium {result.success ? 'text-green-800' : 'text-red-800'}">{result.test}</h3>
                <span class="text-xs text-gray-500">{new Date(result.timestamp).toLocaleTimeString()}</span>
              </div>
              <pre class="text-xs {result.success ? 'text-green-700' : 'text-red-700'} whitespace-pre-wrap overflow-x-auto">{result.result}</pre>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  pre {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  }
</style>