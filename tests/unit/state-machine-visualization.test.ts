import { describe, it, expect } from 'vitest';
import { SignInStateMachine } from '../../src/stores/signin-state-machine';
import type { SignInConfig } from '../../src/types';

describe('State Machine Visualization Translation', () => {
  let signInMachine: SignInStateMachine;

  beforeEach(() => {
    const config: SignInConfig = {
      apiBaseUrl: 'https://api.example.com',
      domain: 'example.com',
      enablePasskeys: true,
      enableMagicPins: true
    };
    signInMachine = new SignInStateMachine(config);
  });

  describe('getStateTransitions', () => {
    it('should return correct state transitions for visualization', () => {
      const transitions = signInMachine.getStateTransitions();
      
      // Check that we have the expected number of transitions
      expect(transitions).toHaveLength(11);
      
      // Verify key transitions exist
      const transitionMap = new Map(
        transitions.map(t => [`${t.source}-${t.target}`, t.event])
      );
      
      // Basic flow - direct from emailEntry to userChecked
      expect(transitionMap.get('emailEntry-userChecked')).toBe('EMAIL_SUBMITTED');
      expect(transitionMap.get('emailEntry-generalError')).toBe('ERROR');
      
      // Conditional transitions from userChecked
      expect(transitionMap.get('userChecked-passkeyPrompt')).toBe('AUTO_TRANSITION_PASSKEY');
      expect(transitionMap.get('userChecked-emailVerification')).toBe('AUTO_TRANSITION_EMAIL');
      
      // Passkey flow
      expect(transitionMap.get('passkeyPrompt-signedIn')).toBe('PASSKEY_SUCCESS');
      expect(transitionMap.get('passkeyPrompt-passkeyError')).toBe('PASSKEY_FAILED');
      
      // Email verification + PIN entry flow (correct order)
      expect(transitionMap.get('emailVerification-pinEntry')).toBe('EMAIL_SENT');
      expect(transitionMap.get('pinEntry-signedIn')).toBe('PIN_VERIFIED');
      
      // Registration flow - only accessible from signedIn
      expect(transitionMap.get('signedIn-passkeyRegistration')).toBe('REGISTER_PASSKEY');
      expect(transitionMap.get('passkeyRegistration-signedIn')).toBe('PASSKEY_REGISTERED');
    });

    it('should not have duplicate transitions', () => {
      const transitions = signInMachine.getStateTransitions();
      const uniqueTransitions = new Set(
        transitions.map(t => `${t.source}-${t.target}`)
      );
      
      expect(transitions.length).toBe(uniqueTransitions.size);
    });

    it('should have valid source and target states', () => {
      const transitions = signInMachine.getStateTransitions();
      const categories = signInMachine.getStateCategories();
      const allStates = Object.values(categories).flatMap(cat => cat.states);
      
      transitions.forEach(transition => {
        expect(allStates).toContain(transition.source);
        expect(allStates).toContain(transition.target);
      });
    });
  });

  describe('getStateCategories', () => {
    it('should return correctly categorized states', () => {
      const categories = signInMachine.getStateCategories();
      
      expect(categories).toHaveProperty('input');
      expect(categories).toHaveProperty('auth');
      expect(categories).toHaveProperty('verification');
      expect(categories).toHaveProperty('registration');
      expect(categories).toHaveProperty('completion');
      expect(categories).toHaveProperty('errors');
      
      // Verify specific states are in correct categories
      expect(categories.input.states).toEqual(['emailEntry', 'userChecked']);
      expect(categories.auth.states).toEqual(['passkeyPrompt', 'pinEntry']);
      expect(categories.verification.states).toEqual(['emailVerification']);
      expect(categories.registration.states).toEqual(['passkeyRegistration']);
      expect(categories.completion.states).toEqual(['signedIn']);
      expect(categories.errors.states).toEqual(['generalError']);
    });

    it('should have color codes for all categories', () => {
      const categories = signInMachine.getStateCategories();
      
      Object.values(categories).forEach(category => {
        expect(category.color).toMatch(/^#[0-9a-f]{6}$/);
        expect(category.states.length).toBeGreaterThan(0);
      });
    });

    it('should not have duplicate states across categories', () => {
      const categories = signInMachine.getStateCategories();
      const allStates: string[] = [];
      
      Object.values(categories).forEach(category => {
        allStates.push(...category.states);
      });
      
      const uniqueStates = new Set(allStates);
      expect(allStates.length).toBe(uniqueStates.size);
    });

    it('should not include removed error states', () => {
      const categories = signInMachine.getStateCategories();
      const allStates = Object.values(categories).flatMap(cat => cat.states);
      
      expect(allStates).not.toContain('biometricAuth');
      expect(allStates).not.toContain('processing');
      expect(allStates).not.toContain('userLookup');
      expect(allStates).not.toContain('networkError');
      expect(allStates).not.toContain('userError');
      expect(allStates).not.toContain('passkeyError');
    });
  });

  describe('State Flow Validation', () => {
    it('should have a valid entry point', () => {
      const transitions = signInMachine.getStateTransitions();
      const categories = signInMachine.getStateCategories();
      
      // emailEntry should be the entry point (no incoming transitions)
      const incomingToEmailEntry = transitions.filter(t => t.target === 'emailEntry');
      const outgoingFromEmailEntry = transitions.filter(t => t.source === 'emailEntry');
      
      expect(outgoingFromEmailEntry.length).toBeGreaterThan(0);
      // Should only have error recovery transitions coming to emailEntry
      incomingToEmailEntry.forEach(t => {
        expect(['generalError']).toContain(t.source);
      });
    });

    it('should have valid terminal states', () => {
      const transitions = signInMachine.getStateTransitions();
      
      // signedIn should be a terminal state (no outgoing transitions)
      const outgoingFromSignedIn = transitions.filter(t => t.source === 'signedIn');
      expect(outgoingFromSignedIn).toHaveLength(0);
      
      // But should have incoming transitions
      const incomingToSignedIn = transitions.filter(t => t.target === 'signedIn');
      expect(incomingToSignedIn.length).toBeGreaterThan(0);
    });

    it('should validate the three main authentication paths', () => {
      const transitions = signInMachine.getStateTransitions();
      const transitionMap = new Map(
        transitions.map(t => [`${t.source}-${t.target}`, t.event])
      );

      // Path 1: Existing user with passkey
      expect(transitionMap.get('userChecked-passkeyPrompt')).toBe('AUTO_TRANSITION_PASSKEY');
      expect(transitionMap.get('passkeyPrompt-signedIn')).toBe('PASSKEY_SUCCESS');

      // Path 2: Existing user without passkey (email verification + PIN entry)
      expect(transitionMap.get('userChecked-emailVerification')).toBe('AUTO_TRANSITION_EMAIL');
      expect(transitionMap.get('emailVerification-pinEntry')).toBe('EMAIL_SENT');
      expect(transitionMap.get('pinEntry-signedIn')).toBe('PIN_VERIFIED');

      // Path 3: New user registration - only after signing in
      expect(transitionMap.get('signedIn-passkeyRegistration')).toBe('REGISTER_PASSKEY');
      expect(transitionMap.get('passkeyRegistration-signedIn')).toBe('PASSKEY_REGISTERED');
    });
  });
});