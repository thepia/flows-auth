/**
 * Auth API Client
 * Handles all authentication API calls
 */

import { reportApiError } from '../utils/errorReporter';
import type {
  AuthConfig,
  SignInRequest,
  SignInResponse,
  PasskeyRequest,
  PasswordRequest,
  MagicLinkRequest,
  RefreshTokenRequest,
  LogoutRequest,
  PasskeyChallenge,
  AuthError
} from '../types';

export class AuthApiClient {
  private config: AuthConfig;
  private baseUrl: string;

  constructor(config: AuthConfig) {
    this.config = config;
    this.baseUrl = config.apiBaseUrl.replace(/\/$/, '');
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    includeAuth = false
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>
    };

    if (includeAuth) {
      const token = this.getStoredToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response || !response.ok) {
      const error = await this.handleErrorResponse(response);
      
      // Report API error
      reportApiError(
        url,
        options.method || 'GET',
        response.status,
        error.message,
        { endpoint, includeAuth }
      );
      
      throw error;
    }

    return response.json();
  }

  /**
   * Handle error responses
   */
  private async handleErrorResponse(response: Response): Promise<AuthError> {
    try {
      const errorData = await response.json();
      return {
        code: errorData.code || 'unknown_error',
        message: errorData.message || 'An unknown error occurred',
        details: errorData.details
      };
    } catch {
      return {
        code: 'network_error',
        message: `HTTP ${response.status}: ${response.statusText}`
      };
    }
  }

  /**
   * Get stored access token
   */
  private getStoredToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_access_token');
  }

  /**
   * Initiate sign-in flow
   */
  async signIn(request: SignInRequest): Promise<SignInResponse> {
    return this.request<SignInResponse>('/auth/signin', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  /**
   * Complete passkey authentication
   */
  async signInWithPasskey(request: PasskeyRequest): Promise<SignInResponse> {
    return this.request<SignInResponse>('/auth/webauthn/verify', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  /**
   * Complete password authentication
   */
  async signInWithPassword(request: PasswordRequest): Promise<SignInResponse> {
    return this.request<SignInResponse>('/auth/signin/password', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  /**
   * Request magic link
   */
  async signInWithMagicLink(request: MagicLinkRequest): Promise<SignInResponse> {
    return this.request<SignInResponse>('/auth/signin/magic-link', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  /**
   * Get passkey challenge
   */
  async getPasskeyChallenge(email: string): Promise<PasskeyChallenge> {
    return this.request<PasskeyChallenge>('/auth/webauthn/challenge', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  }

  /**
   * Refresh access token
   */
  async refreshToken(request: RefreshTokenRequest): Promise<SignInResponse> {
    return this.request<SignInResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  /**
   * Sign out
   */
  async signOut(request: LogoutRequest): Promise<void> {
    await this.request<void>('/auth/signout', {
      method: 'POST',
      body: JSON.stringify(request)
    }, true);
  }

  /**
   * Get user profile
   */
  async getProfile(): Promise<any> {
    return this.request<any>('/auth/profile', {
      method: 'GET'
    }, true);
  }

  /**
   * Verify magic link token
   */
  async verifyMagicLink(token: string): Promise<SignInResponse> {
    return this.request<SignInResponse>('/auth/verify-magic-link', {
      method: 'POST',
      body: JSON.stringify({ token })
    });
  }

  /**
   * Check if email exists
   */
  async checkEmail(email: string): Promise<{
    exists: boolean;
    hasPasskey: boolean;
    hasPassword: boolean;
    socialProviders: string[];
  }> {
    const response = await this.request<{
      exists: boolean;
      hasWebAuthn: boolean;
      userId?: string;
    }>('/auth/check-user', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
    
    // Map API response to expected format
    return {
      exists: response.exists,
      hasPasskey: response.hasWebAuthn || false,
      hasPassword: false, // API doesn't return this, passwordless only
      socialProviders: [] // API doesn't return this currently
    };
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    await this.request<void>('/auth/password-reset', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    await this.request<void>('/auth/password-reset/confirm', {
      method: 'POST',
      body: JSON.stringify({ token, password: newPassword })
    });
  }

  /**
   * Create passkey
   */
  async createPasskey(credential: any): Promise<void> {
    await this.request<void>('/auth/passkey/create', {
      method: 'POST',
      body: JSON.stringify({ credential })
    }, true);
  }

  /**
   * List user's passkeys
   */
  async listPasskeys(): Promise<any[]> {
    return this.request<any[]>('/auth/passkeys', {
      method: 'GET'
    }, true);
  }

  /**
   * Delete passkey
   */
  async deletePasskey(credentialId: string): Promise<void> {
    await this.request<void>(`/auth/passkeys/${credentialId}`, {
      method: 'DELETE'
    }, true);
  }

  /**
   * Register new user
   */
  async registerUser(userData: {
    email: string;
    firstName?: string;
    lastName?: string;
    acceptedTerms: boolean;
    acceptedPrivacy: boolean;
    invitationToken?: string; // NEW: Optional invitation token for email verification
  }): Promise<SignInResponse> {
    return this.request<SignInResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  /**
   * Get WebAuthn registration options for new passkey
   */
  async getWebAuthnRegistrationOptions(data: { email: string; userId: string }): Promise<any> {
    return this.request<any>('/auth/webauthn/register-options', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * Verify WebAuthn registration
   */
  async verifyWebAuthnRegistration(registrationData: {
    userId: string;
    registrationResponse: any;
  }): Promise<{ success: boolean; error?: string }> {
    return this.request<{ success: boolean; error?: string }>('/auth/webauthn/register-verify', {
      method: 'POST',
      body: JSON.stringify(registrationData)
    });
  }
}