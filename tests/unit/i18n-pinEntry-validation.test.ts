/**
 * i18n Translation System Validation for pinEntry State
 * 
 * This test validates that the Paraglide translation system is working correctly
 * for the pinEntry state button texts through the utils/i18n.ts proxy.
 */

import { describe, expect, it } from 'vitest';
import { m } from '../../src/utils/i18n';

describe('i18n Translation System - pinEntry State', () => {
  it('should provide correct translations for pinEntry button texts', () => {
    // Test that the m proxy can access the translation keys used in pinEntry state
    
    // Primary button: "Verify Code"
    expect(typeof m['code.verify']).toBe('function');
    const verifyCodeText = m['code.verify']();
    expect(verifyCodeText).toBe('Verify Code');
    
    // Secondary button: "Use a different email"  
    expect(typeof m['action.useDifferentEmail']).toBe('function');
    const useDifferentEmailText = m['action.useDifferentEmail']();
    expect(useDifferentEmailText).toBe('Use a different email');
    
    // Loading text for primary button
    expect(typeof m['code.verifying']).toBe('function');
    const verifyingText = m['code.verifying']();
    expect(verifyingText).toBe('Verifying...');
  });

  it('should not return incorrect translations', () => {
    // Verify that we don't get the problematic texts mentioned by the user
    const verifyCodeText = m['code.verify']();
    const useDifferentEmailText = m['action.useDifferentEmail']();
    
    // Should NOT be these incorrect values
    expect(verifyCodeText).not.toBe('Send pin by email');
    expect(verifyCodeText).not.toBe('Sind pin by email'); // Danish typo
    expect(useDifferentEmailText).not.toBe('Continue');
  });

  it('should handle missing translation keys gracefully', () => {
    // Test fallback behavior for non-existent keys
    const missingKey = m['nonexistent.key']();
    expect(missingKey).toBe('nonexistent.key'); // Should return the key as fallback
  });

  it('should support the proxy pattern used in AuthButton', () => {
    // Test the exact pattern used in AuthButton.svelte lines 71-84
    const buttonConfig = {
      textKey: 'code.verify',
      loadingTextKey: 'code.verifying'
    };
    
    // Test normal text key access
    if (buttonConfig.textKey && buttonConfig.textKey in m) {
      const text = (m as unknown as {[key: string]: () => string})[buttonConfig.textKey]();
      expect(text).toBe('Verify Code');
    }
    
    // Test loading text key access  
    if (buttonConfig.loadingTextKey && buttonConfig.loadingTextKey in m) {
      const loadingText = (m as unknown as {[key: string]: () => string})[buttonConfig.loadingTextKey]();
      expect(loadingText).toBe('Verifying...');
    }
  });
});
