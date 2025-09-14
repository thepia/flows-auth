/**
 * SignIn Machine Integration Tests
 *
 * Tests that verify the SignInStateMachine is properly integrated with the auth store
 */

import { describe, expect, it } from 'vitest';
import { createAuthStore } from '../../src/stores/auth-store';

describe('SignIn Machine Integration', () => {
  const mockConfig = {
    apiBaseUrl: 'https://api.example.com',
    clientId: 'test',
    domain: 'example.com',
    enablePasskeys: true,
    enableMagicPins: true
  };

  it('should expose signInMachine instance from auth store', () => {
    const authStore = createAuthStore(mockConfig);

    expect(authStore.signInMachine).toBeDefined();
    expect(typeof authStore.signInMachine.getStateTransitions).toBe('function');
    expect(typeof authStore.signInMachine.getStateCategories).toBe('function');
  });

  it('should have functional state machine methods', () => {
    const authStore = createAuthStore(mockConfig);
    const machine = authStore.signInMachine;

    // Test getStateTransitions
    const transitions = machine.getStateTransitions();
    expect(Array.isArray(transitions)).toBe(true);
    expect(transitions.length).toBeGreaterThan(0);

    // Verify expected transition structure
    const firstTransition = transitions[0];
    expect(firstTransition).toHaveProperty('source');
    expect(firstTransition).toHaveProperty('target');
    expect(firstTransition).toHaveProperty('event');

    // Test getStateCategories
    const categories = machine.getStateCategories();
    expect(typeof categories).toBe('object');
    expect(Object.keys(categories).length).toBeGreaterThan(0);

    // Verify expected category structure
    const firstCategory = Object.values(categories)[0] as any;
    expect(firstCategory).toHaveProperty('color');
    expect(firstCategory).toHaveProperty('states');
    expect(Array.isArray(firstCategory.states)).toBe(true);
  });

  it('should include expected sign-in states in categories', () => {
    const authStore = createAuthStore(mockConfig);
    const categories = authStore.signInMachine.getStateCategories();

    // Flatten all states from all categories
    const allStates = Object.values(categories).flatMap((cat: any) => cat.states);

    // Verify key states are present
    expect(allStates).toContain('emailEntry');
    expect(allStates).toContain('userChecked');
    expect(allStates).toContain('signedIn');
  });

  it('should include expected transitions between states', () => {
    const authStore = createAuthStore(mockConfig);
    const transitions = authStore.signInMachine.getStateTransitions();

    // Look for key transitions
    const emailToUserChecked = transitions.find(
      (t) => t.source === 'emailEntry' && t.target === 'userChecked'
    );
    expect(emailToUserChecked).toBeDefined();
    expect(emailToUserChecked?.event).toBe('USER_CHECKED');

    // Look for completion transitions
    const toSignedIn = transitions.filter((t) => t.target === 'signedIn');
    expect(toSignedIn.length).toBeGreaterThan(0);
  });
});
