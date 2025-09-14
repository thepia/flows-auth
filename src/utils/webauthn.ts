/**
 * WebAuthn/Passkey Utilities
 * Based on thepia.com implementation
 */

import type { AuthError, PasskeyChallenge, PasskeyCredential } from '../types';

/**
 * Check if WebAuthn is supported
 */
export function isWebAuthnSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.PublicKeyCredential !== undefined &&
    typeof window.PublicKeyCredential === 'function'
  );
}

/**
 * Check if platform authenticator is available (Face ID, Touch ID, Windows Hello)
 */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;

  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/**
 * Convert challenge from server to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Convert ArrayBuffer to base64url
 */
function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Create passkey credential
 */
export async function createPasskey(
  challenge: PasskeyChallenge,
  email: string,
  displayName?: string
): Promise<PasskeyCredential> {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn is not supported on this device');
  }

  try {
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge: base64ToArrayBuffer(challenge.challenge),
        rp: {
          id: challenge.rpId,
          name: 'Thepia Authentication'
        },
        user: {
          id: new TextEncoder().encode(email),
          name: email,
          displayName: displayName || email.split('@')[0]
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' }, // ES256
          { alg: -257, type: 'public-key' } // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred'
        },
        timeout: challenge.timeout || 60000,
        attestation: 'direct'
      }
    })) as PublicKeyCredential;

    if (!credential) {
      throw new Error('No credential returned');
    }

    const response = credential.response as AuthenticatorAttestationResponse;

    return {
      id: credential.id,
      rawId: credential.rawId,
      response: response as any,
      type: credential.type
    } as PasskeyCredential;
  } catch (error: any) {
    throw mapWebAuthnError(error);
  }
}

/**
 * Create WebAuthn credential from registration options
 * This function handles the WebAuthn registration options format from the API server
 */
export async function createCredential(registrationOptions: any): Promise<any> {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn is not supported on this device');
  }

  try {
    console.log('🔧 Processing WebAuthn registration options:', registrationOptions);

    // Convert server format to browser format
    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
      challenge: base64ToArrayBuffer(registrationOptions.challenge),
      rp: registrationOptions.rp,
      user: {
        id:
          typeof registrationOptions.user.id === 'string'
            ? base64ToArrayBuffer(registrationOptions.user.id)
            : registrationOptions.user.id,
        name: registrationOptions.user.name,
        displayName: registrationOptions.user.displayName
      },
      pubKeyCredParams: registrationOptions.pubKeyCredParams,
      authenticatorSelection: registrationOptions.authenticatorSelection,
      timeout: registrationOptions.timeout,
      attestation: registrationOptions.attestation || 'direct',
      excludeCredentials: registrationOptions.excludeCredentials?.map((cred: any) => ({
        ...cred,
        id: typeof cred.id === 'string' ? base64ToArrayBuffer(cred.id) : cred.id
      }))
    };

    console.log('🔧 Converted options for browser API:', publicKeyCredentialCreationOptions);

    const credential = (await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions
    })) as PublicKeyCredential;

    if (!credential) {
      throw new Error('No credential returned');
    }

    const response = credential.response as AuthenticatorAttestationResponse;

    // Convert credential to format expected by server
    const credentialForServer = {
      id: credential.id,
      rawId: arrayBufferToBase64Url(credential.rawId),
      response: {
        clientDataJSON: arrayBufferToBase64Url(response.clientDataJSON),
        attestationObject: arrayBufferToBase64Url(response.attestationObject),
        // Include transports if available
        transports: (response as any).getTransports?.() || []
      },
      type: credential.type,
      clientExtensionResults: credential.getClientExtensionResults()
    };

    console.log('✅ WebAuthn authentication created and converted for server');
    return credentialForServer;
  } catch (error: any) {
    console.error('❌ WebAuthn credential creation failed:', error);
    throw mapWebAuthnError(error);
  }
}

/**
 * Check if conditional mediation is supported
 */
export async function isConditionalMediationSupported(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;

  try {
    return (
      window.PublicKeyCredential.isConditionalMediationAvailable &&
      (await window.PublicKeyCredential.isConditionalMediationAvailable())
    );
  } catch {
    return false;
  }
}

/**
 * Authenticate with existing passkey
 */
export async function authenticateWithPasskey(
  challenge: PasskeyChallenge,
  conditional = false
): Promise<PasskeyCredential> {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn is not supported on this device');
  }

  const requestOptions: CredentialRequestOptions = {
    publicKey: {
      challenge: base64ToArrayBuffer(challenge.challenge),
      rpId: challenge.rpId,
      allowCredentials: challenge.allowCredentials?.map((cred) => ({
        ...cred,
        id: base64ToArrayBuffer(cred.id as unknown as string)
      })) as PublicKeyCredentialDescriptor[],
      userVerification: 'required',
      timeout: challenge.timeout || 60000
    }
  };

  // Add conditional mediation for email-triggered auth
  if (conditional && (await isConditionalMediationSupported())) {
    (requestOptions as any).mediation = 'conditional';
  }

  try {
    const credential = (await navigator.credentials.get(requestOptions)) as PublicKeyCredential;

    if (!credential) {
      throw new Error('No credential returned');
    }

    const response = credential.response as AuthenticatorAssertionResponse;

    return {
      id: credential.id,
      rawId: credential.rawId,
      response: {
        ...response,
        clientDataJSON: response.clientDataJSON,
        authenticatorData: response.authenticatorData,
        signature: response.signature,
        userHandle: response.userHandle
      },
      type: credential.type
    } as PasskeyCredential;
  } catch (error: any) {
    throw mapWebAuthnError(error);
  }
}

/**
 * Map WebAuthn errors to our error format
 */
function mapWebAuthnError(error: any): AuthError {
  const message = error.message || error.name || 'Unknown error';

  if (error.name === 'NotSupportedError') {
    return {
      code: 'passkey_not_supported',
      message: 'Passkeys are not supported on this device'
    };
  }

  if (error.name === 'SecurityError') {
    return {
      code: 'passkey_failed',
      message: 'Security error during passkey operation'
    };
  }

  if (error.name === 'NotAllowedError') {
    return {
      code: 'passkey_failed',
      message: 'Passkey operation was cancelled or failed'
    };
  }

  if (error.name === 'InvalidStateError') {
    return {
      code: 'passkey_failed',
      message: 'A passkey already exists for this account'
    };
  }

  if (error.name === 'ConstraintError') {
    return {
      code: 'passkey_failed',
      message: 'Passkey creation constraints were not met'
    };
  }

  if (error.name === 'UnknownError') {
    return {
      code: 'passkey_failed',
      message: 'An unknown error occurred during passkey operation'
    };
  }

  return {
    code: 'passkey_failed',
    message: `Passkey operation failed: ${message}`
  };
}

/**
 * Convert credential to format expected by server
 */
export function serializeCredential(credential: PasskeyCredential): any {
  return {
    id: credential.id,
    rawId: arrayBufferToBase64Url(credential.rawId),
    response: {
      clientDataJSON: arrayBufferToBase64Url(credential.response.clientDataJSON),
      authenticatorData: arrayBufferToBase64Url(
        (credential.response as AuthenticatorAssertionResponse).authenticatorData
      ),
      signature: arrayBufferToBase64Url(
        (credential.response as AuthenticatorAssertionResponse).signature
      ),
      userHandle: (credential.response as AuthenticatorAssertionResponse).userHandle
        ? arrayBufferToBase64Url(
            (credential.response as AuthenticatorAssertionResponse).userHandle!
          )
        : null
    },
    type: credential.type
  };
}

/**
 * Generate a user-friendly passkey name
 */
export function generatePasskeyName(): string {
  const now = new Date();
  const deviceInfo = getDeviceInfo();
  return `${deviceInfo} - ${now.toLocaleDateString()}`;
}

/**
 * Get device information for passkey naming
 */
function getDeviceInfo(): string {
  if (typeof window === 'undefined') return 'Unknown Device';

  const userAgent = navigator.userAgent;

  if (/iPhone|iPad|iPod/.test(userAgent)) {
    return /iPad/.test(userAgent) ? 'iPad' : 'iPhone';
  }

  if (/Mac/.test(userAgent)) {
    return 'Mac';
  }

  if (/Android/.test(userAgent)) {
    return 'Android Device';
  }

  if (/Windows/.test(userAgent)) {
    return 'Windows PC';
  }

  if (/Linux/.test(userAgent)) {
    return 'Linux Device';
  }

  return 'Unknown Device';
}
