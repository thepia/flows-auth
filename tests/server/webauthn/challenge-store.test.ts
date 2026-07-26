/**
 * createChallengeStore Unit Tests
 * TTL/expiration, one-time-use retrieval, and cleanup behavior.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type ChallengeStore, createChallengeStore } from '../../../src/server/webauthn/challenge-store.js';

function sampleChallenge(overrides: Partial<Parameters<ChallengeStore['store']>[1]> = {}) {
  return {
    challenge: 'test-challenge-123',
    userId: 'auth0|passkey-test@example.com-1234567890',
    email: 'test@example.com',
    timestamp: Date.now(),
    type: 'registration' as const,
    ...overrides
  };
}

describe('createChallengeStore', () => {
  let store: ChallengeStore;

  beforeEach(() => {
    vi.useFakeTimers();
    store = createChallengeStore();
  });

  afterEach(() => {
    store.destroy();
    vi.useRealTimers();
  });

  it('stores and retrieves a challenge with all fields intact', () => {
    const data = sampleChallenge();
    store.store('key1', data);

    const retrieved = store.retrieve('key1');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.challenge).toBe(data.challenge);
    expect(retrieved?.userId).toBe(data.userId);
    expect(retrieved?.email).toBe(data.email);
    expect(retrieved?.type).toBe(data.type);
  });

  it('returns null for a non-existent key', () => {
    expect(store.retrieve('does-not-exist')).toBeNull();
  });

  it('is one-time use: a second retrieve of the same key returns null', () => {
    store.store('key1', sampleChallenge());
    expect(store.retrieve('key1')).not.toBeNull();
    expect(store.retrieve('key1')).toBeNull();
  });

  it('exists() reports true without consuming the challenge', () => {
    store.store('key1', sampleChallenge());
    expect(store.exists('key1')).toBe(true);
    expect(store.exists('key1')).toBe(true); // Calling it again shouldn't consume it.
    expect(store.retrieve('key1')).not.toBeNull(); // Still retrievable afterward.
  });

  it('exists() reports false for a non-existent key', () => {
    expect(store.exists('nope')).toBe(false);
  });

  it('expires a challenge after the default TTL (5 minutes)', () => {
    store.store('key1', sampleChallenge());
    vi.advanceTimersByTime(5 * 60 * 1000 + 1);
    expect(store.retrieve('key1')).toBeNull();
  });

  it('exists() also reports false once expired', () => {
    store.store('key1', sampleChallenge());
    vi.advanceTimersByTime(5 * 60 * 1000 + 1);
    expect(store.exists('key1')).toBe(false);
  });

  it('does not expire a challenge before the TTL elapses', () => {
    store.store('key1', sampleChallenge());
    vi.advanceTimersByTime(4 * 60 * 1000);
    expect(store.exists('key1')).toBe(true);
  });

  it('supports a custom TTL', () => {
    const shortStore = createChallengeStore({ ttlMs: 1000 });
    shortStore.store('key1', sampleChallenge());
    vi.advanceTimersByTime(1001);
    expect(shortStore.exists('key1')).toBe(false);
    shortStore.destroy();
  });

  it('the periodic cleanup sweep removes expired entries from getStats()', () => {
    store.store('key1', sampleChallenge());
    vi.advanceTimersByTime(5 * 60 * 1000 + 1);
    // Advance past the default 1-minute cleanup interval so the sweep runs.
    vi.advanceTimersByTime(60 * 1000);
    expect(store.getStats().total).toBe(0);
  });

  it('getStats reports total and expired counts correctly before cleanup runs', () => {
    store.store('fresh', sampleChallenge());
    store.store('stale', sampleChallenge());
    vi.advanceTimersByTime(5 * 60 * 1000 + 1);
    store.store('fresh2', sampleChallenge()); // Stored after the others expired.

    const stats = store.getStats();
    expect(stats.total).toBe(3); // Cleanup sweep hasn't necessarily run yet.
    expect(stats.expired).toBe(2);
  });

  it('clear() removes all stored challenges', () => {
    store.store('key1', sampleChallenge());
    store.store('key2', sampleChallenge());
    store.clear();
    expect(store.getStats().total).toBe(0);
  });

  it('destroy() clears all challenges and stops the cleanup interval', () => {
    store.store('key1', sampleChallenge());
    store.destroy();
    expect(store.getStats().total).toBe(0);
  });

  it('tracks multiple independent keys correctly', () => {
    store.store('registration-key', sampleChallenge({ type: 'registration' }));
    store.store('auth-key', sampleChallenge({ type: 'authentication' }));

    expect(store.retrieve('registration-key')?.type).toBe('registration');
    expect(store.retrieve('auth-key')?.type).toBe('authentication');
  });

  it('two independent createChallengeStore() instances do not share state', () => {
    const other = createChallengeStore();
    store.store('key1', sampleChallenge());
    expect(other.exists('key1')).toBe(false);
    other.destroy();
  });
});
