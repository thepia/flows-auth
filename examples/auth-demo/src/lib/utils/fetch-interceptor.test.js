/**
 * Tests for Fetch Interceptor
 * Validates that network error injection works correctly
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchInterceptor } from './fetch-interceptor.js';

describe('FetchInterceptor', () => {
  let originalFetch;

  beforeEach(() => {
    // Store original fetch
    originalFetch = globalThis.fetch;
    
    // Mock fetch for testing
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );
    
    // Install interceptor
    fetchInterceptor.install();
  });

  afterEach(() => {
    // Clean up
    fetchInterceptor.uninstall();
    globalThis.fetch = originalFetch;
  });

  it('should not affect normal requests when no errors are mapped', async () => {
    const response = await fetch('https://api.example.com/test');
    const data = await response.json();
    
    expect(data).toEqual({ success: true });
    expect(response.status).toBe(200);
  });

  it('should inject technical error for WebAuthn authenticate endpoint', async () => {
    // Set up error injection
    fetchInterceptor.injectTechnicalError();
    
    // Make request that should be intercepted
    const response = await fetch('https://api.thepia.com/auth/webauthn/authenticate', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' })
    });
    
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.message).toBe('Endpoint not found');
  });

  it('should throw WebAuthn cancellation error', async () => {
    // Set up error injection
    fetchInterceptor.injectWebAuthnError();
    
    // Make request that should throw
    await expect(
      fetch('https://api.thepia.com/auth/webauthn/authenticate', {
        method: 'POST'
      })
    ).rejects.toThrow('NotAllowedError: User cancelled the operation');
  });

  it('should inject passkey error for challenge endpoint', async () => {
    // Set up error injection
    fetchInterceptor.injectPasskeyError();
    
    // Make request that should be intercepted
    const response = await fetch('https://api.thepia.com/auth/webauthn/challenge', {
      method: 'POST'
    });
    
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.message).toBe('404: /auth/webauthn/challenge not found');
  });

  it('should inject generic error for email code endpoint', async () => {
    // Set up error injection
    fetchInterceptor.injectGenericError();
    
    // Make request that should be intercepted
    const response = await fetch('https://api.thepia.com/auth/email-code', {
      method: 'POST'
    });
    
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.message).toBe('Unknown authentication error occurred');
  });

  it('should clear error mappings after first use', async () => {
    // Set up error injection
    fetchInterceptor.injectTechnicalError();
    
    // First request should be intercepted
    const response1 = await fetch('https://api.thepia.com/auth/webauthn/authenticate', {
      method: 'POST'
    });
    expect(response1.status).toBe(404);
    
    // Second request should be normal (error cleared)
    const response2 = await fetch('https://api.thepia.com/auth/webauthn/authenticate', {
      method: 'POST'
    });
    expect(response2.status).toBe(200);
  });

  it('should clear all errors when requested', async () => {
    // Set up multiple error injections
    fetchInterceptor.injectTechnicalError();
    fetchInterceptor.injectPasskeyError();
    fetchInterceptor.injectGenericError();
    
    // Verify errors are mapped
    const mappings = fetchInterceptor.getActiveMappings();
    expect(mappings.length).toBeGreaterThan(0);
    
    // Clear all errors
    fetchInterceptor.clearAllErrors();
    
    // Verify no errors are mapped
    const clearedMappings = fetchInterceptor.getActiveMappings();
    expect(clearedMappings.length).toBe(0);
  });

  it('should match endpoint patterns correctly', async () => {
    // Set up security error for any WebAuthn endpoint
    fetchInterceptor.injectSecurityError();
    
    // Test different WebAuthn endpoints
    const endpoints = [
      'https://api.thepia.com/auth/webauthn/authenticate',
      'https://api.thepia.com/auth/webauthn/challenge',
      'https://api.thepia.com/auth/webauthn/register'
    ];
    
    for (const endpoint of endpoints) {
      await expect(
        fetch(endpoint, { method: 'POST' })
      ).rejects.toThrow('SecurityError: Operation not allowed in this context');
    }
  });

  it('should provide active mappings for debugging', () => {
    // Set up some error injections
    fetchInterceptor.injectTechnicalError();
    fetchInterceptor.injectPasskeyError();
    
    const mappings = fetchInterceptor.getActiveMappings();
    
    expect(mappings).toHaveLength(2);
    expect(mappings[0]).toHaveProperty('pattern');
    expect(mappings[0]).toHaveProperty('type');
    expect(mappings[0]).toHaveProperty('message');
  });

  it('should handle install/uninstall correctly', () => {
    // Uninstall
    fetchInterceptor.uninstall();
    expect(fetchInterceptor.isActive).toBe(false);
    
    // Reinstall
    fetchInterceptor.install();
    expect(fetchInterceptor.isActive).toBe(true);
    
    // Double install should be safe
    fetchInterceptor.install();
    expect(fetchInterceptor.isActive).toBe(true);
  });
});
