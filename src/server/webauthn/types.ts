/**
 * WebAuthn credential/config types shared across the server-side WebAuthn
 * utilities in this directory.
 */

/** Based on @simplewebauthn/browser's AuthenticatorTransport, defined locally to avoid a hard dependency on that package's types here. */
export type AuthenticatorTransport = 'ble' | 'hybrid' | 'internal' | 'nfc' | 'usb';

export interface WebAuthnConfig {
  /** Must match the domain in the browser's address bar where the WebAuthn ceremony was initiated. */
  rpId: string;
  rpName: string;
  origin: string;
  timeout: number;
}

export interface WebAuthnCredential {
  credentialID: Uint8Array;
  credentialPublicKey: Uint8Array;
  counter: number;
  credentialDeviceType: 'singleDevice' | 'multiDevice';
  credentialBackedUp: boolean;
  transports?: AuthenticatorTransport[];
}
