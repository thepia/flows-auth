/**
 * Auth API Client
 * Handles all authentication API calls
 */

import { reportApiError } from '../utils/errorReporter';
import { globalRateLimiter } from '../utils/rate-limiter';
import { globalUserCache } from '../utils/user-cache';
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
   * Make authenticated API request with rate limiting
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
   * Make rate-limited API request
   */
  private async rateLimitedRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    includeAuth = false
  ): Promise<T> {
    return globalRateLimiter.executeWithRetry(
      () => this.request<T>(endpoint, options, includeAuth),
      endpoint,
      {
        maxRetries: (typeof process !== 'undefined' && process.env?.CI === 'true') ? 1 : 2,
        baseDelay: (typeof process !== 'undefined' && process.env?.CI === 'true') ? 1000 : 500,
        maxDelay: 8000
      }
    );
  }

  /**
   * Handle error responses
   */
  private async handleErrorResponse(response: Response): Promise<AuthError> {
    try {
      const errorData = await response.json();
      
      // Enhanced error handling for rate limits
      if (response.status === 429 || errorData.error === 'too_many_requests') {
        return {
          code: 'rate_limit_exceeded',
          message: 'Too many requests. Please try again in a moment.',
          details: errorData.details
        };
      }
      
      // Handle new error format { step: "error", error: { code, message } }
      if (errorData.step === 'error' && errorData.error) {
        return {
          code: errorData.error.code || 'unknown_error',
          message: errorData.error.message || 'An unknown error occurred',
          details: errorData.error.details
        };
      }
      
      // Handle legacy error format for backward compatibility
      return {
        code: errorData.code || 'unknown_error',
        message: errorData.message || errorData.error || 'An unknown error occurred',
        details: errorData.details
      };
    } catch {
      // Enhanced error handling for rate limits
      if (response.status === 429) {
        return {
          code: 'rate_limit_exceeded',
          message: 'Too many requests. Please try again in a moment.'
        };
      }
      
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
    console.log('🔍 signInWithPasskey called with:', {
      requestKeys: Object.keys(request),
      hasUserId: 'userId' in request,
      hasAuthResponse: 'authResponse' in request,
      hasEmail: 'email' in request,
      hasChallengeId: 'challengeId' in request,
      hasCredential: 'credential' in request,
      fullRequest: JSON.stringify(request, null, 2)
    });
    
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
   * Check if email exists with rate limiting and caching
   */
  async checkEmail(email: string): Promise<{
    exists: boolean;
    hasPasskey: boolean;
    hasPassword: boolean;
    socialProviders: string[];
    userId?: string;
    invitationTokenHash?: string;
  }> {
    // Check cache first
    const cachedResult = globalUserCache.get(email);
    if (cachedResult) {
      return cachedResult;
    }
    
    // Use rate-limited request
    const response = await this.rateLimitedRequest<{
      exists: boolean;
      hasWebAuthn: boolean;
      userId?: string;
      invitationTokenHash?: string;
    }>('/auth/check-user', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
    
    // Map API response to expected format
    const result = {
      exists: response.exists,
      hasPasskey: response.hasWebAuthn || false,
      hasPassword: false, // API doesn't return this, passwordless only
      socialProviders: [], // API doesn't return this currently
      userId: response.userId,
      invitationTokenHash: response.invitationTokenHash
    };
    
    // Cache the result
    globalUserCache.set(email, result);
    
    return result;
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
  }): Promise<{
    success: boolean;
    error?: string;
    tokens?: {
      accessToken: string;
      refreshToken: string;
      expiresAt: number;
    };
    user?: {
      id: string;
      email: string;
    };
  }> {
    return this.request<{
      success: boolean;
      error?: string;
      tokens?: {
        accessToken: string;
        refreshToken: string;
        expiresAt: number;
      };
      user?: {
        id: string;
        email: string;
      };
    }>('/auth/webauthn/register-verify', {
      method: 'POST',
      body: JSON.stringify(registrationData)
    });
  }
}