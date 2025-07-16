/**
 * Rate Limiter for Auth0 API calls
 * Implements strategies from thepia.com/docs/testing/auth0-rate-limiting-strategies.md
 */

interface RateLimitState {
  hitCount: number;
  rateLimitHit: boolean;
  lastResetTime: number;
  requestQueue: Array<{ timestamp: number; endpoint: string }>;
}

interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

export class RateLimiter {
  private state: RateLimitState = {
    hitCount: 0,
    rateLimitHit: false,
    lastResetTime: Date.now(),
    requestQueue: []
  };

  private readonly DEFAULT_RETRY_OPTIONS: RetryOptions = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2
  };

  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private readonly MAX_REQUESTS_PER_WINDOW = 45; // Conservative limit (Auth0 allows ~50)
  private readonly MIN_REQUEST_INTERVAL = 500; // Minimum 500ms between requests

  /**
   * Check if we should throttle the request
   */
  shouldThrottle(endpoint: string): boolean {
    const now = Date.now();
    
    // Reset state if window expired
    if (now - this.state.lastResetTime > this.RATE_LIMIT_WINDOW) {
      this.state = {
        hitCount: 0,
        rateLimitHit: false,
        lastResetTime: now,
        requestQueue: []
      };
    }

    // If we've already hit rate limit, throttle
    if (this.state.rateLimitHit) {
      console.log(`⚠️ Rate limit active, throttling request to ${endpoint}`);
      return true;
    }

    // Check if we're approaching the limit
    if (this.state.hitCount >= this.MAX_REQUESTS_PER_WINDOW) {
      console.log(`⚠️ Approaching rate limit (${this.state.hitCount}/${this.MAX_REQUESTS_PER_WINDOW}), throttling ${endpoint}`);
      return true;
    }

    // Check minimum interval between requests
    const lastRequest = this.state.requestQueue[this.state.requestQueue.length - 1];
    if (lastRequest && (now - lastRequest.timestamp) < this.MIN_REQUEST_INTERVAL) {
      console.log(`⚠️ Minimum interval not met, throttling ${endpoint}`);
      return true;
    }

    return false;
  }

  /**
   * Record a request
   */
  recordRequest(endpoint: string): void {
    const now = Date.now();
    
    this.state.hitCount++;
    this.state.requestQueue.push({ timestamp: now, endpoint });

    // Keep only recent requests
    this.state.requestQueue = this.state.requestQueue.filter(
      req => now - req.timestamp < this.RATE_LIMIT_WINDOW
    );

    console.log(`📊 Rate limiter: ${this.state.hitCount}/${this.MAX_REQUESTS_PER_WINDOW} requests in window`);
  }

  /**
   * Record a rate limit hit
   */
  recordRateLimit(endpoint: string): void {
    this.state.rateLimitHit = true;
    console.log(`🚫 Rate limit hit detected for ${endpoint}`);
  }

  /**
   * Wait for minimum interval
   */
  async waitForInterval(): Promise<void> {
    const lastRequest = this.state.requestQueue[this.state.requestQueue.length - 1];
    if (lastRequest) {
      const timeSinceLastRequest = Date.now() - lastRequest.timestamp;
      if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
        const waitTime = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
        console.log(`⏳ Waiting ${waitTime}ms to respect rate limit...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  /**
   * Execute request with retry logic and exponential backoff
   */
  async executeWithRetry<T>(
    requestFn: () => Promise<T>,
    endpoint: string,
    options: Partial<RetryOptions> = {}
  ): Promise<T> {
    const retryOptions = { ...this.DEFAULT_RETRY_OPTIONS, ...options };
    
    // Check if we should throttle
    if (this.shouldThrottle(endpoint)) {
      // In CI, skip if rate limited
      if ((typeof process !== 'undefined' && process.env?.CI === 'true') && this.state.rateLimitHit) {
        throw new Error('Rate limit exceeded in CI environment');
      }
      
      // Wait for interval if throttling
      await this.waitForInterval();
    }

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= retryOptions.maxRetries; attempt++) {
      try {
        // Record the request
        this.recordRequest(endpoint);
        
        // Execute the request
        const result = await requestFn();
        
        // Reset rate limit state on success
        if (this.state.rateLimitHit) {
          console.log(`✅ Request succeeded after rate limit, resetting state`);
          this.state.rateLimitHit = false;
        }
        
        return result;
        
      } catch (error: any) {
        lastError = error;
        
        // Check if it's a rate limit error
        const isRateLimit = error.message?.includes('429') || 
                           error.message?.includes('Too Many Requests') ||
                           error.message?.includes('too_many_requests');
        
        if (isRateLimit) {
          this.recordRateLimit(endpoint);
          
          // Fast-fail on rate limit in CI
          if (typeof process !== 'undefined' && process.env?.CI === 'true') {
            console.log(`⚠️ Rate limit hit in CI, fast-failing for ${endpoint}`);
            throw error;
          }
          
          // Calculate backoff delay
          const delay = Math.min(
            retryOptions.baseDelay * Math.pow(retryOptions.backoffFactor, attempt),
            retryOptions.maxDelay
          );
          
          if (attempt < retryOptions.maxRetries) {
            console.log(`⏳ Rate limit hit, retrying in ${delay}ms (attempt ${attempt + 1}/${retryOptions.maxRetries + 1})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        
        // If it's not a rate limit error, or we've exhausted retries, throw
        if (attempt === retryOptions.maxRetries) {
          throw error;
        }
        
        // For non-rate-limit errors, use shorter backoff
        const shortDelay = Math.min(500 * Math.pow(2, attempt), 2000);
        console.log(`⏳ Request failed, retrying in ${shortDelay}ms (attempt ${attempt + 1}/${retryOptions.maxRetries + 1})`);
        await new Promise(resolve => setTimeout(resolve, shortDelay));
      }
    }
    
    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Get current rate limit state for debugging
   */
  getState(): RateLimitState {
    return { ...this.state };
  }

  /**
   * Reset rate limiter state
   */
  reset(): void {
    this.state = {
      hitCount: 0,
      rateLimitHit: false,
      lastResetTime: Date.now(),
      requestQueue: []
    };
    console.log('🔄 Rate limiter state reset');
  }
}

// Global rate limiter instance
export const globalRateLimiter = new RateLimiter();