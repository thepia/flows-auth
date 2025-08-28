/**
 * Auth API Client
 * Handles all authentication API calls
 */

import type {
  AuthConfig,
  AuthError,
  LogoutRequest,
  MagicLinkRequest,
  PasskeyChallenge,
  PasskeyRequest,
  PasswordRequest,
  RefreshTokenRequest,
  SignInRequest,
  SignInResponse,
} from '../types';
import { globalClientRateLimiter } from '../utils/client-rate-limiter';
import { reportApiError } from '../utils/errorReporter';
import { globalUserCache } from '../utils/user-cache';

export class AuthApiClient {
  private config: AuthConfig;
  private baseUrl: string;

  constructor(config: AuthConfig) {
    this.config = config;
    this.baseUrl = config.apiBaseUrl.replace(/\/$/, '');

    // Rate limiting is now handled by the intelligent client rate limiter
    // No configuration needed - uses 5 req/sec default with server backoff
  }

  /**
   * Make authenticated API request with intelligent rate limiting
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    includeAuth = false
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (includeAuth) {
      const token = this.getStoredToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    // Use intelligent client rate limiter (5 req/sec with server backoff)
    const response = await globalClientRateLimiter.executeRequest(
      () =>
        fetch(url, {
          ...options,
          headers,
        }),
      endpoint
    );

    if (!response || !response.ok) {
      const error = await this.handleErrorResponse(response);

      // Report API error
      reportApiError(url, options.method || 'GET', response.status, error.message, {
        endpoint,
        includeAuth,
      });

      throw error;
    }

    return response.json();
  }

  /**
   * Make rate-limited API request (now uses same intelligent rate limiting)
   */
  private async rateLimitedRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    includeAuth = false
  ): Promise<T> {
    // All requests now use the same intelligent rate limiting
    return this.request<T>(endpoint, options, includeAuth);
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
          details: errorData.details,
        };
      }

      // Handle new error format { step: "error", error: { code, message } }
      if (errorData.step === 'error' && errorData.error) {
        return {
          code: errorData.error.code || 'unknown_error',
          message: errorData.error.message || 'An unknown error occurred',
          details: errorData.error.details,
        };
      }

      // Handle legacy error format for backward compatibility
      return {
        code: errorData.code || 'unknown_error',
        message: errorData.message || errorData.error || 'An unknown error occurred',
        details: errorData.details,
      };
    } catch {
      // Enhanced error handling for rate limits
      if (response.status === 429) {
        return {
          code: 'rate_limit_exceeded',
          message: 'Too many requests. Please try again in a moment.',
        };
      }

      return {
        code: 'network_error',
        message: `HTTP ${response.status}: ${response.statusText}`,
      };
    }
  }

  /**
   * Get stored access token
   */
  private getStoredToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_access_token') || localStorage.getItem('authToken');
  }

  /**
   * Store authentication session
   */
  storeSession(
    user: {
      id: string;
      email: string;
      emailVerified: boolean;
    },
    token?: string
  ): void {
    if (typeof window === 'undefined') return;

    localStorage.setItem('userEmail', user.email);
    localStorage.setItem('userId', user.id);
    localStorage.setItem('emailConfirmed', user.emailVerified ? 'true' : 'false');

    if (token) {
      localStorage.setItem('authToken', token);
      localStorage.setItem('auth_access_token', token); // Store in both places for compatibility
    }
  }

  /**
   * Clear authentication session
   */
  clearSession(): void {
    if (typeof window === 'undefined') return;

    localStorage.removeItem('userEmail');
    localStorage.removeItem('userId');
    localStorage.removeItem('emailConfirmed');
    localStorage.removeItem('authToken');
    localStorage.removeItem('auth_access_token');
    localStorage.removeItem('personalEmail');
  }

  /**
   * Get current session
   */
  getSession(): {
    email?: string;
    userId?: string;
    emailConfirmed: boolean;
    token?: string;
  } {
    if (typeof window === 'undefined') {
      return { emailConfirmed: false };
    }

    return {
      email: localStorage.getItem('userEmail') || undefined,
      userId: localStorage.getItem('userId') || undefined,
      emailConfirmed: localStorage.getItem('emailConfirmed') === 'true',
      token: this.getStoredToken() || undefined,
    };
  }

  /**
   * Initiate sign-in flow
   */
  async signIn(request: SignInRequest): Promise<SignInResponse> {
    return this.request<SignInResponse>('/auth/signin', {
      method: 'POST',
      body: JSON.stringify(request),
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
      fullRequest: JSON.stringify(request, null, 2),
    });

    return this.request<SignInResponse>('/auth/webauthn/verify', {
      method: 'POST',
      body: JSON.stringify({
        ...request,
        clientId: this.config.clientId, // Include clientId for token strategy
      }),
    });
  }

  /**
   * Complete password authentication
   */
  async signInWithPassword(request: PasswordRequest): Promise<SignInResponse> {
    return this.request<SignInResponse>('/auth/signin/password', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Request magic link
   */
  async signInWithMagicLink(request: MagicLinkRequest): Promise<SignInResponse> {
    return this.rateLimitedRequest<SignInResponse>('/auth/signin/magic-link', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Get passkey challenge
   */
  async getPasskeyChallenge(email: string): Promise<PasskeyChallenge> {
    return this.rateLimitedRequest<PasskeyChallenge>('/auth/webauthn/challenge', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  /**
   * Refresh access token
   */
  async refreshToken(request: RefreshTokenRequest): Promise<SignInResponse> {
    return this.request<SignInResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Sign out
   */
  async signOut(request: LogoutRequest): Promise<void> {
    await this.request<void>(
      '/auth/signout',
      {
        method: 'POST',
        body: JSON.stringify(request),
      },
      true
    );
  }

  /**
   * Get user profile
   */
  async getProfile(): Promise<any> {
    return this.request<any>(
      '/auth/profile',
      {
        method: 'GET',
      },
      true
    );
  }

  /**
   * Verify magic link token
   */
  async verifyMagicLink(token: string): Promise<SignInResponse> {
    return this.request<SignInResponse>('/auth/verify-magic-link', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  /**
   * Clear user cache (development helper)
   */
  clearUserCache(): void {
    globalUserCache.clearAll();
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

    // Enhanced logging for debugging
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'https://app.thepia.net';
    const requestUrl = `${this.baseUrl}/auth/check-user`;

    console.log(`[AuthApiClient] Making check-user request:`, {
      email,
      requestUrl,
      baseUrl: this.baseUrl,
      origin,
      timestamp: new Date().toISOString(),
    });

    // Use rate-limited request with Origin header for RPID determination
    const response = await this.rateLimitedRequest<{
      exists: boolean;
      hasWebAuthn: boolean;
      userId?: string;
      invitationTokenHash?: string;
    }>('/auth/check-user', {
      method: 'POST',
      body: JSON.stringify({ email }),
      headers: {
        Origin: origin,
      },
    });

    console.log(`[AuthApiClient] Raw API response:`, {
      email,
      requestUrl,
      response: response,
      timestamp: new Date().toISOString(),
    });

    // Map API response to expected format
    const result = {
      exists: response.exists,
      hasPasskey: response.hasWebAuthn || false,
      hasPassword: false, // API doesn't return this, passwordless only
      socialProviders: [], // API doesn't return this currently
      userId: response.userId,
      invitationTokenHash: response.invitationTokenHash,
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
      body: JSON.stringify({ email }),
    });
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    await this.request<void>('/auth/password-reset/confirm', {
      method: 'POST',
      body: JSON.stringify({ token, password: newPassword }),
    });
  }

  /**
   * Create passkey
   */
  async createPasskey(credential: any): Promise<void> {
    await this.request<void>(
      '/auth/passkey/create',
      {
        method: 'POST',
        body: JSON.stringify({ credential }),
      },
      true
    );
  }

  /**
   * List user's passkeys
   */
  async listPasskeys(): Promise<any[]> {
    return this.request<any[]>(
      '/auth/passkeys',
      {
        method: 'GET',
      },
      true
    );
  }

  /**
   * Delete passkey
   */
  async deletePasskey(credentialId: string): Promise<void> {
    await this.request<void>(
      `/auth/passkeys/${credentialId}`,
      {
        method: 'DELETE',
      },
      true
    );
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
      body: JSON.stringify(userData),
      headers: {
        Origin: typeof window !== 'undefined' ? window.location.origin : 'https://app.thepia.net',
      },
    });
  }

  /**
   * Register or sign in user with email (simplified flow)
   * This creates a new user if they don't exist, or signs them in if they do
   * Used for simple email confirmation flows without passkeys
   */
  async registerOrSignIn(
    email: string,
    clientId: string = 'thepia-app'
  ): Promise<{
    success: boolean;
    user?: {
      id: string;
      email: string;
      emailVerified: boolean;
    };
    token?: string;
    message?: string;
  }> {
    return this.request<{
      success: boolean;
      user?: {
        id: string;
        email: string;
        emailVerified: boolean;
      };
      token?: string;
      message?: string;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: email.trim(),
        clientId,
      }),
      headers: {
        Origin: typeof window !== 'undefined' ? window.location.origin : 'https://app.thepia.net',
      },
    });
  }

  /**
   * Send magic link for email verification
   */
  async sendMagicLinkEmail(email: string): Promise<{
    success: boolean;
    message?: string;
  }> {
    return this.request<{
      success: boolean;
      message?: string;
    }>('/auth/magic-link', {
      method: 'POST',
      body: JSON.stringify({
        email: email.trim(),
        redirectTo: `${typeof window !== 'undefined' ? window.location.origin : 'https://app.thepia.net'}/auth/callback`,
      }),
    });
  }

  /**
   * Get WebAuthn registration options for new passkey
   */
  async getWebAuthnRegistrationOptions(data: { email: string; userId: string }): Promise<any> {
    return this.request<any>('/auth/webauthn/register-options', {
      method: 'POST',
      body: JSON.stringify(data),
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
      body: JSON.stringify({
        ...registrationData,
        clientId: this.config.clientId, // Include clientId for token strategy
      }),
    });
  }

  /**
   * Start passwordless email authentication
   */
  async startPasswordlessAuthentication(email: string): Promise<{
    success: boolean;
    timestamp: number;
    message?: string;
    user?: {
      email: string;
      id: string;
    };
  }> {
    return this.request<{
      success: boolean;
      timestamp: number;
      message?: string;
      user?: {
        email: string;
        id: string;
      };
    }>('/auth/start-passwordless', {
      method: 'POST',
      body: JSON.stringify({
        email: email,
        clientId: this.config.clientId,
      }),
    });
  }

  /**
   * Check passwordless authentication status by checking Auth0 user state
   */
  async checkPasswordlessStatus(
    email: string,
    timestamp: number
  ): Promise<{
    status: 'pending' | 'verified' | 'expired';
    user?: {
      id: string;
      email: string;
      email_verified: boolean;
    };
  }> {
    return this.request<{
      status: 'pending' | 'verified' | 'expired';
      user?: {
        id: string;
        email: string;
        email_verified: boolean;
      };
    }>(`/auth/passwordless-status?email=${encodeURIComponent(email)}&timestamp=${timestamp}`, {
      method: 'GET',
    });
  }
}
