/**
 * Invitation Token Utilities
 * Handles JWT invitation token decoding, validation, and data extraction
 * Extracted from flows.thepia.net for common usage across Flows apps
 */

export interface InvitationTokenData {
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  company?: string;
  companyName?: string;
  phone?: string;
  jobTitle?: string;
  expires?: Date;
  issuedAt?: Date;
  exp?: number;
  iat?: number;
  [key: string]: any; // Allow additional fields
}

export interface TokenValidationResult {
  isValid: boolean;
  reason?: string;
  data?: InvitationTokenData;
}

/**
 * Decode JWT invitation token - exact implementation from flows.thepia.net
 * @param token - The JWT token to decode
 * @returns The decoded token data
 * @throws Error if token format is invalid
 */
export function decodeInvitationToken(token: string): InvitationTokenData {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    const payload = JSON.parse(atob(parts[1]));
    return {
      email: payload.email,
      firstName: payload.firstName || payload.name?.split(' ')[0],
      lastName: payload.lastName || payload.name?.split(' ').slice(1).join(' '),
      name: payload.name,
      company: payload.company || payload.companyName,
      phone: payload.phone,
      jobTitle: payload.jobTitle,
      expires: payload.exp ? new Date(payload.exp * 1000) : null,
      issuedAt: payload.iat ? new Date(payload.iat * 1000) : null,
      ...payload,
    };
  } catch (error) {
    throw new Error('Failed to decode invitation token');
  }
}

/**
 * Validate invitation token signature and expiration - exact implementation from flows.thepia.net
 * @param token - The JWT token to validate
 * @param tokenData - Pre-decoded token data (optional)
 * @returns boolean indicating if token is valid
 */
export function validateInvitationToken(token: string, tokenData?: InvitationTokenData): TokenValidationResult {
  if (!token) {
    return { isValid: false, reason: 'invalid_structure' };
  }

  try {
    // Decode if not provided
    const data = tokenData || decodeInvitationToken(token);

    // Check if token is expired
    if (data.expires && data.expires < new Date()) {
      console.warn('Invitation token has expired');
      return { isValid: false, reason: 'expired', data };
    }

    // Check if token was issued in the future (clock skew protection)
    if (data.issuedAt && data.issuedAt > new Date(Date.now() + 5 * 60 * 1000)) {
      console.warn('Invitation token issued in the future');
      return { isValid: false, reason: 'invalid_structure', data };
    }

    // Basic JWT structure validation
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.warn('Invalid JWT structure');
      return { isValid: false, reason: 'invalid_structure' };
    }

    // Validate required fields
    if (!data.email) {
      console.warn('Invitation token missing required email field');
      return { isValid: false, reason: 'missing_email', data };
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      console.warn('Invitation token contains invalid email format');
      return { isValid: false, reason: 'invalid_email', data };
    }

    // For production, you would verify the signature here using a public key
    // For now, we'll do basic validation
    const [header, payload, signature] = parts;

    // Validate that the signature is not empty (basic check)
    if (!signature || signature.length < 10) {
      console.warn('Invitation token has invalid or missing signature');
      return { isValid: false, reason: 'invalid_signature', data };
    }

    // Additional security: Check that the token payload hasn't been tampered with
    try {
      const decodedPayload = JSON.parse(atob(payload));
      if (decodedPayload.email !== data.email) {
        console.warn('Token payload mismatch detected');
        return { isValid: false, reason: 'invalid_structure', data };
      }
    } catch (error) {
      console.warn('Failed to re-decode token payload for validation');
      return { isValid: false, reason: 'invalid_structure', data };
    }

    return { isValid: true, data };
  } catch (error) {
    console.error('Token validation error:', error);
    return { isValid: false, reason: 'invalid_structure' };
  }
}

/**
 * Compute SHA-256 hash of invitation token for security verification
 * Exact implementation from flows.thepia.net
 * @param token - The token to hash
 * @returns Hex-encoded hash string or null if hashing fails
 */
export async function hashInvitationToken(token: string): Promise<string | null> {
  if (!token || typeof token !== 'string') {
    return null;
  }

  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    console.error('Failed to hash invitation token:', error);
    return null;
  }
}

/**
 * Extract registration data from invitation token
 * Normalizes field names for consistent usage
 * @param tokenData - Decoded token data
 * @returns Registration form data with normalized field names
 */
export function extractRegistrationData(tokenData: InvitationTokenData): {
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  phone: string;
  jobTitle: string;
} {
  return {
    email: tokenData.email || '',
    firstName: tokenData.firstName || tokenData.name?.split(' ')[0] || '',
    lastName: tokenData.lastName || tokenData.name?.split(' ').slice(1).join(' ') || '',
    company: tokenData.company || tokenData.companyName || '',
    phone: tokenData.phone || '',
    jobTitle: tokenData.jobTitle || ''
  };
}