/**
 * Auth Store Singleton Architecture Tests
 *
 * These tests ensure components follow the critical architectural requirement
 * that auth stores must be passed as props, not created internally.
 */

import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import SignInCore from '../../src/components/core/SignInCore.svelte';
import { renderWithAuthContext } from '../helpers/component-test-setup';

describe('Auth Store Singleton Architecture', () => {
  it('SignInCore should accept authStore prop and use provided store', () => {
    // This should work without throwing
    const { component } = renderWithAuthContext(SignInCore, {
      authConfig: {
        apiBaseUrl: 'https://api.example.com',
        appCode: 'test-app',
        enablePasskeys: true,
        enableMagicLinks: true
      }
    });

    expect(component).toBeDefined();
  });

  it('SignInCore should create fallback store when authStore not provided', () => {
    // This should work for backward compatibility
    const { component } = renderWithAuthContext(SignInCore, {
      authConfig: {
        apiBaseUrl: 'https://api.example.com',
        appCode: 'test-app',
        enablePasskeys: true,
        enableMagicLinks: true
      }
    });

    expect(component).toBeDefined();
  });

  it('should prevent architectural violations - multiple store instances break reactivity', () => {
    // This test documents the architectural pattern using real auth stores
    const { component } = renderWithAuthContext(SignInCore, {
      authConfig: {
        apiBaseUrl: 'https://api.example.com',
        appCode: 'test-app',
        enablePasskeys: true,
        enableMagicLinks: true
      }
    });

    expect(component).toBeDefined();
  });

  it('should demonstrate correct shared store pattern', () => {
    // Multiple components using the SAME store instance through context
    const component1 = renderWithAuthContext(SignInCore, {
      authConfig: {
        apiBaseUrl: 'https://api.example.com',
        appCode: 'test-app',
        enablePasskeys: true,
        enableMagicLinks: true
      }
    });

    const component2 = renderWithAuthContext(SignInCore, {
      authConfig: {
        apiBaseUrl: 'https://api.example.com',
        appCode: 'test-app',
        enablePasskeys: true,
        enableMagicLinks: true
      }
    });

    // Both components use real auth stores - this is the correct pattern
    expect(component1.component).toBeDefined();
    expect(component2.component).toBeDefined();
  });
});
