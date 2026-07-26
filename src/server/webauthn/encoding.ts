/**
 * base64url encoding/decoding for WebAuthn credential IDs and other binary
 * data, ensuring consistent handling across the registration/authentication
 * flow.
 */

export function uint8ArrayToBase64url(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Converts a base64url string to a Uint8Array.
 *
 * Validates (in order): the input is a non-empty string; contains only
 * valid base64url/base64 characters; padding (if any) appears only at the
 * end and is 0-2 characters; the unpadded length isn't 1 mod 4 (which is
 * never a valid base64 length). Accepts both base64url (-_) and base64
 * (+/) character sets and adds correct padding automatically, since
 * credential IDs may arrive in either form depending on the storage
 * provider.
 */
export function base64urlToUint8Array(base64url: string): Uint8Array {
  if (typeof base64url !== 'string') {
    throw new Error('Input must be a string');
  }

  if (base64url.length === 0) {
    throw new Error('Input string cannot be empty');
  }

  if (!/^[A-Za-z0-9\-_+/=]*$/.test(base64url)) {
    throw new Error('Input contains invalid base64url characters');
  }

  const paddingMatch = base64url.match(/=+$/);
  if (paddingMatch) {
    if (paddingMatch[0].length > 2) {
      throw new Error('Invalid base64url string length');
    }
    if (base64url.indexOf('=') !== base64url.length - paddingMatch[0].length) {
      throw new Error('Invalid base64url string length');
    }
  }

  const unpadded = base64url.replace(/=+$/, '');

  if (unpadded.length % 4 === 1) {
    throw new Error('Invalid base64url string length');
  }

  try {
    const base64 = unpadded
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(unpadded.length + ((4 - (unpadded.length % 4)) % 4), '=');

    const binary = atob(base64);
    const result = new Uint8Array(Math.floor((unpadded.length * 3) / 4));
    for (let i = 0; i < result.length; i++) {
      result[i] = binary.charCodeAt(i);
    }
    return result;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to decode base64url string: ${errorMessage}`);
  }
}

export function base64urlToBase64(base64url: string): string {
  return base64url
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(base64url.length + ((4 - (base64url.length % 4)) % 4), '=');
}

export function base64ToBase64url(base64: string): string {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
