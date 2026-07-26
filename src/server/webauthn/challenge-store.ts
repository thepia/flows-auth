/**
 * In-memory WebAuthn challenge storage with TTL and automatic cleanup.
 *
 * Known limitation, carried forward as-is: this is single-instance,
 * in-memory state. Under a serverless/edge deployment with multiple
 * concurrent instances (or no guaranteed instance reuse between requests),
 * a challenge stored by one instance may not be retrievable by whichever
 * instance handles the follow-up verify request. A durable shared store
 * (Redis or similar) is the real fix if that's a concern for a given
 * deployment target - this in-memory version is the pragmatic default for
 * single-instance/warm-reuse deployments.
 */

export interface ChallengeData {
  challenge: string;
  userId: string;
  email: string;
  timestamp: number;
  type: 'registration' | 'authentication';
  expiresAt: number;
}

export interface ChallengeStore {
  /** Store a challenge with automatic expiration (default TTL 5 minutes). */
  store(key: string, data: Omit<ChallengeData, 'expiresAt'>): void;
  /** Retrieve and remove a challenge (one-time use). Returns null if missing or expired. */
  retrieve(key: string): ChallengeData | null;
  /** Check if a challenge exists and hasn't expired, without consuming it. */
  exists(key: string): boolean;
  /** Current store stats (for debugging/monitoring). */
  getStats(): { total: number; expired: number };
  /** Clear all challenges (for testing). */
  clear(): void;
  /** Stop the cleanup interval and clear all challenges (for testing/shutdown). */
  destroy(): void;
}

export interface ChallengeStoreOptions {
  /** How long a stored challenge remains valid. Defaults to 5 minutes. */
  ttlMs?: number;
  /** How often expired entries are swept. Defaults to 1 minute. */
  cleanupIntervalMs?: number;
}

export function createChallengeStore(options: ChallengeStoreOptions = {}): ChallengeStore {
  const ttlMs = options.ttlMs ?? 5 * 60 * 1000;
  const cleanupIntervalMs = options.cleanupIntervalMs ?? 60 * 1000;

  const challenges = new Map<string, ChallengeData>();

  function cleanup(): void {
    const now = Date.now();
    for (const [key, data] of challenges.entries()) {
      if (now > data.expiresAt) {
        challenges.delete(key);
      }
    }
  }

  const cleanupInterval = setInterval(cleanup, cleanupIntervalMs);

  return {
    store(key, data) {
      challenges.set(key, { ...data, expiresAt: Date.now() + ttlMs });
    },

    retrieve(key) {
      const data = challenges.get(key);
      if (!data) {
        return null;
      }

      if (Date.now() > data.expiresAt) {
        challenges.delete(key);
        return null;
      }

      challenges.delete(key); // One-time use.
      return data;
    },

    exists(key) {
      const data = challenges.get(key);
      if (!data) {
        return false;
      }
      if (Date.now() > data.expiresAt) {
        challenges.delete(key);
        return false;
      }
      return true;
    },

    getStats() {
      const now = Date.now();
      let expired = 0;
      for (const data of challenges.values()) {
        if (now > data.expiresAt) {
          expired++;
        }
      }
      return { total: challenges.size, expired };
    },

    clear() {
      challenges.clear();
    },

    destroy() {
      clearInterval(cleanupInterval);
      challenges.clear();
    }
  };
}
