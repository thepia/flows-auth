/**
 * User Existence Cache
 * Reduces Auth0 API calls by caching user existence checks
 */

interface CacheEntry {
  exists: boolean;
  hasPasskey: boolean;
  hasPassword: boolean;
  socialProviders: string[];
  timestamp: number;
}

export class UserCache {
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 100;

  /**
   * Get cached user data
   */
  get(email: string): CacheEntry | null {
    const normalizedEmail = email.toLowerCase().trim();
    const entry = this.cache.get(normalizedEmail);

    // DEBUGGING: Force cache miss for henrik@thepia.com to debug the issue
    if (normalizedEmail === 'henrik@thepia.com') {
      console.log(`🐛 [DEBUG] Forcing cache miss for ${normalizedEmail} to debug API issue`);
      this.cache.delete(normalizedEmail);
      return null;
    }

    if (!entry) {
      return null;
    }

    // Check if cache entry is still valid
    if (Date.now() - entry.timestamp > this.CACHE_TTL) {
      this.cache.delete(normalizedEmail);
      return null;
    }

    console.log(`📋 Cache hit for ${normalizedEmail}`);
    return entry;
  }

  /**
   * Set cached user data
   */
  set(email: string, data: Omit<CacheEntry, 'timestamp'>): void {
    const normalizedEmail = email.toLowerCase().trim();

    // Implement simple LRU by removing oldest entries
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(normalizedEmail, {
      ...data,
      timestamp: Date.now(),
    });

    console.log(`📝 Cached user data for ${normalizedEmail}`);
  }

  /**
   * Clear cache entry
   */
  clear(email: string): void {
    const normalizedEmail = email.toLowerCase().trim();
    this.cache.delete(normalizedEmail);
    console.log(`🗑️ Cleared cache for ${normalizedEmail}`);
  }

  /**
   * Clear all cache entries
   */
  clearAll(): void {
    this.cache.clear();
    console.log('🗑️ Cleared all user cache entries');
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    const validEntries = Array.from(this.cache.values()).filter(
      (entry) => now - entry.timestamp <= this.CACHE_TTL
    );

    return {
      totalEntries: this.cache.size,
      validEntries: validEntries.length,
      expiredEntries: this.cache.size - validEntries.length,
      cacheHitRate: this.cache.size > 0 ? (validEntries.length / this.cache.size) * 100 : 0,
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach((key) => this.cache.delete(key));

    if (expiredKeys.length > 0) {
      console.log(`🧹 Cleaned up ${expiredKeys.length} expired cache entries`);
    }
  }
}

// Global user cache instance
export const globalUserCache = new UserCache();

// Auto-cleanup expired entries every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(
    () => {
      globalUserCache.cleanup();
    },
    5 * 60 * 1000
  );
}
