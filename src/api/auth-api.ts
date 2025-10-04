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
  PasskeyCredential,
  PasskeyRequest,
  RefreshTokenRequest,
  RegistrationResponse,
  SignInRequest,
  SignInResponse,
  User,
  UserCheckData,
  UserPasskey,
  UserProfile,
  WebAuthnRegistrationOptions,
  WebAuthnRegistrationResponse,
  WebAuthnVerificationResult
} from '../types';
import { globalClientRateLimiter } from '../utils/client-rate-limiter';
import { reportApiError } from '../utils/telemetry';
import { globalUserCache } from '../utils/user-cache';

export class AuthApiClient {
  private config: AuthConfig;
  private baseUrl: string;
  private effectiveBaseUrl: Promise<string>;

  constructor(config: AuthConfig) {
    this.config = config;
    this.baseUrl = config.apiBaseUrl.replace(/\/$/, '');

    // Create a promise that resolves to the effective base URL
    // This allows for async API detection while keeping the constructor synchronous
    this.effectiveBaseUrl = this.detectEffectiveBaseUrl();

    // Rate limiting is now handled by the intelligent client rate limiter
    // No configuration needed - uses 5 req/sec default with server backoff
  }

  /**
   * Detect the effective base URL to use (local dev server or production)
   */
  private async detectEffectiveBaseUrl(): Promise<string> {
    // If running in browser and config allows detection
    if (typeof window !== 'undefined' && this.config.apiBaseUrl === 'https://api.thepia.com') {
      try {
        // Try to use the detection utility if available
        const { detectApiServer } = await import('../utils/api-detection');
        const apiServer = await detectApiServer();
        console.log(`🌐 AuthApiClient: Using ${apiServer.type} API: ${apiServer.url}`);
        return apiServer.url.replace(/\/$/, '');
      } catch (error) {
        // Fall back to configured URL if detection fails
        console.log('🌐 AuthApiClient: Using configured API:', this.baseUrl);
      }
    }

    // Use the configured URL as-is
    return this.baseUrl;
  }

  /**
   * Get the effective app code - uses 'app' as default when appCode support is enabled
   */
  private getEffectiveAppCode(): string | null {
    // If appCode is explicitly set to false/null/undefined, use legacy endpoints
    if (
      this.config.appCode === false ||
      this.config.appCode === null ||
      this.config.appCode === undefined
    ) {
      return null;
    }

    // If appCode is explicitly set to a string, use that
    if (typeof this.config.appCode === 'string') {
      return this.config.appCode;
    }

    // If appCode is set to true, use default 'app' appCode
    if (this.config.appCode === true) {
      return 'app';
    }

    // Default to null for backward compatibility
    return null;
  }

  /**
   * Make authenticated API request with intelligent rate limiting
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    includeAuth = false
  ): Promise<T> {
    // Resolve the effective base URL (will use cached promise result after first call)
    const effectiveUrl = await this.effectiveBaseUrl;
    const url = `${effectiveUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>)
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
          headers
        }),
      endpoint
    );

    if (!response || !response.ok) {
      const error = await this.handleErrorResponse(response);

      // Report API error
      reportApiError(url, options.method || 'GET', response.status, error.message, {
        endpoint,
        includeAuth
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
      token: this.getStoredToken() || undefined
    };
  }

  /**
   * Initiate sign-in flow
   * Note: This endpoint doesn't exist on the server - use startPasswordlessAuthentication instead
   * @deprecated Use startPasswordlessAuthentication for magic links
   */
  async signIn(request: SignInRequest): Promise<SignInResponse> {
    // The /auth/signin endpoint doesn't exist - redirect to passwordless
    console.warn(
      '⚠️ signIn() method called but /auth/signin endpoint does not exist. Use startPasswordlessAuthentication() instead.'
    );
    throw new Error(
      'The /auth/signin endpoint is not available. Please use passwordless authentication methods.'
    );
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
      body: JSON.stringify({
        ...request,
        clientId: this.config.clientId // Include clientId for token strategy
      })
    });
  }

  /**
   * Request magic link
   * Note: Uses the unified passwordless endpoint
   */
  async signInWithMagicLink(request: MagicLinkRequest): Promise<SignInResponse> {
    // The /auth/signin/magic-link endpoint doesn't exist - use startPasswordlessAuthentication
    console.warn(
      '⚠️ signInWithMagicLink() called - redirecting to startPasswordlessAuthentication()'
    );

    // Use the unified passwordless endpoint instead
    const result = await this.startPasswordlessAuthentication(request.email);

    // Convert the passwordless response to SignInResponse format
    return {
      step: result.success ? 'email-sent' : 'error',
      message: result.message,
      needsPasskey: false,
      needsVerification: true // Passwordless always requires verification
    } as SignInResponse;
  }

  /**
   * Get passkey challenge
   */
  async getPasskeyChallenge(email: string): Promise<PasskeyChallenge> {
    return this.rateLimitedRequest<PasskeyChallenge>('/auth/webauthn/authenticate', {
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
    await this.request<void>(
      '/auth/signout',
      {
        method: 'POST',
        body: JSON.stringify(request)
      },
      true
    );
  }

  /**
   * Get user profile
   */
  async getProfile(): Promise<UserProfile> {
    return this.request<UserProfile>(
      '/auth/profile',
      {
        method: 'GET'
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
      body: JSON.stringify({ token })
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
  async checkEmail(email: string): Promise<UserCheckData> {
    // Check cache first
    const cachedResult = globalUserCache.get(email);
    if (cachedResult) {
      return cachedResult;
    }

    // Enhanced logging for debugging
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'https://app.thepia.net';

    // Use app-specific endpoint if appCode is configured, otherwise use default
    const effectiveAppCode = this.getEffectiveAppCode();
    const endpoint = effectiveAppCode ? `/${effectiveAppCode}/check-user` : '/auth/check-user';
    const requestUrl = `${this.baseUrl}${endpoint}`;

    console.log(`[AuthApiClient] Making check-user request:`, {
      email,
      requestUrl,
      baseUrl: this.baseUrl,
      endpoint,
      appCode: this.config.appCode,
      origin,
      timestamp: new Date().toISOString()
    });

    // Use rate-limited request with Origin header for RPID determination
    // Using GET method with email as query parameter (API server supports this)
    const response = await this.rateLimitedRequest<UserCheckData>(
      `${endpoint}?email=${encodeURIComponent(email)}`,
      {
        method: 'GET',
        headers: {
          Origin: origin
        }
      }
    );

    console.log(`[AuthApiClient] Raw API response:`, {
      email,
      requestUrl,
      response: response,
      timestamp: new Date().toISOString()
    });

    // Return the response directly since it's already in UserCheckData format
    const result: UserCheckData = response;

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
  async createPasskey(credential: PasskeyCredential): Promise<void> {
    await this.request<void>(
      '/auth/passkey/create',
      {
        method: 'POST',
        body: JSON.stringify({ credential })
      },
      true
    );
  }

  /**
   * List user's passkeys
   */
  async listPasskeys(): Promise<UserPasskey[]> {
    return this.request<UserPasskey[]>(
      '/auth/passkeys',
      {
        method: 'GET'
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
        method: 'DELETE'
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
    const effectiveAppCode = this.getEffectiveAppCode();
    const endpoint = effectiveAppCode ? `/${effectiveAppCode}/create-user` : '/auth/register';

    const response = await this.request<{
      success?: boolean;
      user?: any;
      message?: string;
      step?: string;
      accessToken?: string;
      refreshToken?: string;
      expiresIn?: number;
    }>(endpoint, {
      method: 'POST',
      body: JSON.stringify(userData),
      headers: {
        Origin: typeof window !== 'undefined' ? window.location.origin : 'https://app.thepia.net'
      }
    });

    // Transform API response to SignInResponse format
    if (response.success && response.user) {
      // API returned {success: true, user: {...}} format
      return {
        step: 'success',
        user: response.user,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        expiresIn: response.expiresIn
      };
    } else if (response.step) {
      // API returned legacy SignInResponse format
      return response as SignInResponse;
    } else {
      // API returned error or unexpected format
      return {
        step: 'error',
        user: undefined
      };
    }
  }

  /**
   * Register or sign in user with email (simplified flow)
   * This creates a new user if they don't exist, or signs them in if they do
   * Used for simple email confirmation flows without passkeys
   */
  async registerOrSignIn(
    email: string,
    clientId = 'app'
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
    const effectiveAppCode = this.getEffectiveAppCode();
    const endpoint = effectiveAppCode ? `/${effectiveAppCode}/send-email` : '/auth/register';

    return this.request<{
      success: boolean;
      user?: {
        id: string;
        email: string;
        emailVerified: boolean;
      };
      token?: string;
      message?: string;
    }>(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        email: email.trim(),
        clientId
      }),
      headers: {
        Origin: typeof window !== 'undefined' ? window.location.origin : 'https://app.thepia.net'
      }
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
        redirectTo: `${typeof window !== 'undefined' ? window.location.origin : 'https://app.thepia.net'}/auth/callback`
      })
    });
  }

  /**
   * Get WebAuthn registration options for new passkey
   */
  async getWebAuthnRegistrationOptions(data: {
    email: string;
    userId: string;
  }): Promise<WebAuthnRegistrationOptions> {
    return this.request<WebAuthnRegistrationOptions>('/auth/webauthn/register-options', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * Verify WebAuthn registration
   */
  async verifyWebAuthnRegistration(registrationData: {
    userId: string;
    registrationResponse: WebAuthnRegistrationResponse;
  }): Promise<WebAuthnVerificationResult> {
    return this.request<WebAuthnVerificationResult>('/auth/webauthn/register-verify', {
      method: 'POST',
      body: JSON.stringify({
        ...registrationData,
        clientId: this.config.clientId // Include clientId for token strategy
      })
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
    console.log('🔗 Starting passwordless authentication:', {
      email,
      clientId: this.config.clientId,
      apiBaseUrl: this.config.apiBaseUrl,
      requestOrigin: typeof window !== 'undefined' ? window.location.origin : 'unknown'
    });

    const effectiveAppCode = this.getEffectiveAppCode();
    const endpoint = effectiveAppCode
      ? `/${effectiveAppCode}/send-email`
      : '/auth/start-passwordless';

    return this.request<{
      success: boolean;
      timestamp: number;
      message?: string;
      user?: {
        email: string;
        id: string;
      };
    }>(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        email: email,
        clientId: this.config.clientId
        // Server should determine redirectUri based on clientId and origin
      })
    });
  }

  /**
   * Send email signin (unified login/registration flow)
   * This replaces registerUser, registerOrSignIn, and startPasswordlessAuthentication
   * with a single, clear function that handles both new user registration and existing user signin
   */
  async sendEmailSignin(
    email: string,
    options?: {
      firstName?: string;
      lastName?: string;
      acceptedTerms?: boolean;
      acceptedPrivacy?: boolean;
      invitationToken?: string;
    }
  ): Promise<{
    success: boolean;
    step: 'email-sent' | 'user-created' | 'error';
    message?: string;
    user?: {
      id: string;
      email: string;
      emailVerified: boolean;
    };
    isNewUser?: boolean;
  }> {
    const effectiveAppCode = this.getEffectiveAppCode();
    const endpoint = effectiveAppCode ? `/${effectiveAppCode}/send-email` : '/auth/register';

    console.log('📧 Sending email signin:', {
      email,
      endpoint,
      appCode: effectiveAppCode,
      clientId: this.config.clientId,
      hasOptions: !!options
    });

    const requestBody = {
      email: email.trim(),
      clientId: this.config.clientId,
      ...options
    };

    return this.request<{
      success: boolean;
      step: 'email-sent' | 'user-created' | 'error';
      message?: string;
      user?: {
        id: string;
        email: string;
        emailVerified: boolean;
      };
      isNewUser?: boolean;
    }>(endpoint, {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        Origin: typeof window !== 'undefined' ? window.location.origin : 'https://app.thepia.net'
      }
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
      method: 'GET'
    });
  }

  /**
   * Send email authentication code using app-based endpoints
   * Uses /{appCode}/send-email endpoint for unified registration/login
   */
  async sendAppEmailCode(email: string): Promise<{
    success: boolean;
    message: string;
    timestamp: number;
  }> {
    const effectiveAppCode = this.getEffectiveAppCode();
    if (!effectiveAppCode) {
      throw new Error(
        'App code is required for app-based email authentication. Set appCode in config.'
      );
    }

    console.log('📧 Sending app email code:', {
      email,
      appCode: effectiveAppCode,
      apiBaseUrl: this.config.apiBaseUrl
    });

    return this.request<{
      success: boolean;
      message: string;
      timestamp: number;
    }>(`/${effectiveAppCode}/send-email`, {
      method: 'POST',
      body: JSON.stringify({
        email: email
      })
    });
  }

  /**
   * Verify email authentication code using app-based endpoints
   * Uses /{appCode}/verify-email endpoint for unified registration/login
   */
  async verifyAppEmailCode(email: string, code: string): Promise<SignInResponse> {
    const effectiveAppCode = this.getEffectiveAppCode();
    if (!effectiveAppCode) {
      throw new Error(
        'App code is required for app-based email authentication. Set appCode in config.'
      );
    }

    console.log('🔍 Verifying app email code:', {
      email,
      appCode: effectiveAppCode,
      hasCode: !!code,
      apiBaseUrl: this.config.apiBaseUrl
    });

    const response = await this.request<{
      success?: boolean;
      user?: User;
      accessToken?: string;
      refreshToken?: string;
      idToken?: string;
      expiresIn?: number;
      step?: string;
      error?: string;
      message?: string;
    }>(`/${effectiveAppCode}/verify-email`, {
      method: 'POST',
      body: JSON.stringify({
        email: email,
        code: code
      })
    });

    console.log('📦 Raw verify-email API response:', {
      email,
      hasSuccess: 'success' in response,
      successValue: response.success,
      hasUser: 'user' in response,
      hasAccessToken: 'accessToken' in response,
      hasStep: 'step' in response,
      stepValue: response.step,
      hasError: 'error' in response,
      hasMessage: 'message' in response,
      messageValue: response.message,
      fullResponse: response
    });

    // Transform organization API response to match SignInResponse interface
    // The API returns tokens directly in the response, not nested
    if (response.success && response.user && response.accessToken) {
      // Clear user cache entry since verification succeeded
      // This handles cases where user was previously cached as "doesn't exist"
      // but verification created the user account
      globalUserCache.clear(email);
      console.log(`🧹 Cleared user cache for ${email} after successful pin verification`);

      return {
        step: 'success',
        user: response.user,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        expiresIn: response.expiresIn || 3600
      };
    }

    // Handle error response
    throw new Error(response.error || response.message || 'Email code verification failed');
  }

  /**
   * Create user using app-based endpoints
   * Uses /{appCode}/create-user endpoint for unified user creation
   */
  async createAppUser(userData: {
    email: string;
    firstName?: string;
    lastName?: string;
    invitationToken?: string;
  }): Promise<{
    success: boolean;
    user?: User;
    message?: string;
  }> {
    const effectiveAppCode = this.getEffectiveAppCode();
    if (!effectiveAppCode) {
      throw new Error('App code is required for app-based user creation. Set appCode in config.');
    }

    console.log('👤 Creating app user:', {
      email: userData.email,
      appCode: effectiveAppCode,
      hasInvitation: !!userData.invitationToken,
      apiBaseUrl: this.config.apiBaseUrl
    });

    return this.request<{
      success: boolean;
      user?: User;
      message?: string;
    }>(`/${effectiveAppCode}/create-user`, {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }
}
