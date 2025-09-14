/**
 * Client-Side Rate Limiter for flows-auth
 * Provides intelligent rate limiting that respects server signals
 */

export interface ClientRateLimitConfig {
  maxRequestsPerSecond: number;
  burstCapacity?: number;
  respectServerHeaders: boolean;
  debugLogging: boolean;
}

export class ClientRateLimiter {
  private requestTimes: number[] = [];
  private backoffState = new Map<
    string,
    {
      retryAfter: number;
      attempts: number;
    }
  >();

  private config: ClientRateLimitConfig;

  constructor(config: Partial<ClientRateLimitConfig> = {}) {
    this.config = {
      maxRequestsPerSecond: 5, // Conservative but permissive
      burstCapacity: 8, // Allow short bursts
      respectServerHeaders: true, // Server signals take precedence
      debugLogging: false, // Enable for debugging
      ...config
    };
  }

  /**
   * Execute a request with intelligent rate limiting
   */
  async executeRequest<T>(requestFn: () => Promise<Response>, endpoint: string): Promise<Response> {
    // Check server-imposed backoff first
    if (this.config.respectServerHeaders) {
      await this.handleServerBackoff(endpoint);
    }

    // Apply client-side rate limiting
    await this.handleClientRateLimit();

    try {
      const response = await requestFn();

      // Learn from server responses
      this.handleServerResponse(endpoint, response);

      return response;
    } catch (error) {
      this.logDebug(
        `❌ Request failed for ${endpoint}:`,
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    }
  }

  /**
   * Handle client-side rate limiting (5 req/sec default)
   */
  private async handleClientRateLimit(): Promise<void> {
    const now = Date.now();

    // Clean requests older than 1 second
    this.requestTimes = this.requestTimes.filter((time) => now - time < 1000);

    // Check if we're at the burst capacity
    const maxRequests = this.config.burstCapacity || this.config.maxRequestsPerSecond;

    if (this.requestTimes.length >= maxRequests) {
      const oldestRequest = Math.min(...this.requestTimes);
      const waitTime = 1000 - (now - oldestRequest);

      if (waitTime > 0) {
        this.logDebug(
          `⏳ Client rate limit: Waiting ${waitTime}ms (${this.requestTimes.length}/${maxRequests} req/sec)`
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    // Record this request
    this.requestTimes.push(Date.now());
  }

  /**
   * Handle server-imposed backoff (respect 429 responses)
   */
  private async handleServerBackoff(endpoint: string): Promise<void> {
    const backoff = this.backoffState.get(endpoint);

    if (backoff && Date.now() < backoff.retryAfter) {
      const waitTime = backoff.retryAfter - Date.now();
      this.logDebug(`🚫 Server backoff: Waiting ${waitTime}ms for ${endpoint}`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  /**
   * Learn from server responses to adjust behavior
   */
  private handleServerResponse(endpoint: string, response: Response): void {
    if (response.status === 429) {
      // Server says we're rate limited
      let waitTime = 1000; // Default 1 second

      const retryAfter = response.headers.get('Retry-After');
      const rateLimitReset = response.headers.get('X-RateLimit-Reset');

      if (retryAfter) {
        waitTime = Number.parseInt(retryAfter) * 1000;
      } else if (rateLimitReset) {
        waitTime = Math.max(0, Number.parseInt(rateLimitReset) * 1000 - Date.now());
      }

      this.backoffState.set(endpoint, {
        retryAfter: Date.now() + waitTime,
        attempts: (this.backoffState.get(endpoint)?.attempts || 0) + 1
      });

      this.logDebug(`🚫 Server rate limit on ${endpoint}: backing off ${waitTime}ms`);
    } else if (response.ok) {
      // Success - clear any backoff state
      this.backoffState.delete(endpoint);
    }
  }

  /**
   * Get current rate limiting statistics
   */
  getStats(): {
    recentRequests: number;
    activeBackoffs: number;
    config: ClientRateLimitConfig;
  } {
    const now = Date.now();
    this.requestTimes = this.requestTimes.filter((time) => now - time < 1000);

    return {
      recentRequests: this.requestTimes.length,
      activeBackoffs: Array.from(this.backoffState.values()).filter(
        (backoff) => Date.now() < backoff.retryAfter
      ).length,
      config: this.config
    };
  }

  /**
   * Reset rate limiter state (useful for testing)
   */
  reset(): void {
    this.requestTimes = [];
    this.backoffState.clear();
    this.logDebug('🔄 Client rate limiter state reset');
  }

  private logDebug(message: string, ...args: any[]): void {
    if (this.config.debugLogging) {
      console.log(`[ClientRateLimiter] ${message}`, ...args);
    }
  }
}

/**
 * Global instance with default configuration
 */
export const globalClientRateLimiter = new ClientRateLimiter({
  maxRequestsPerSecond: 5,
  burstCapacity: 8,
  respectServerHeaders: true,
  debugLogging: false // Enable in development if needed
});
