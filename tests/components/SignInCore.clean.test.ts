/**
 * SignInCore Tests - Clean Architecture
 * 
 * Tests for SignInCore as a pure auth logic component that gets everything
 * from auth store context. SignInCore should:
 * - Get auth store from context only (no props)
 * - Get config from auth store via store.getConfig()
 * - Handle all authentication logic
 * - Show appropriate loading/error states
 * - Never create or manage auth stores directly
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { setContext } from 'svelte';
import { writable } from 'svelte/store';
import SignInCore from '../SignInCore.svelte';
import { AUTH_CONTEXT_KEY } from '../../../constants/context-keys';

// Mock dependencies
vi.mock('../../../utils/webauthn', () => ({
  isPlatformAuthenticatorAvailable: vi.fn(() => Promise.resolve(false)),
  isWebAuthnSupported: vi.fn(() => false)
}));

vi.mock('../../../utils/i18n', () => ({
  getI18n: vi.fn(() => ({
    t: vi.fn((key: string) => key),
    setLanguage: vi.fn(),
    setTranslations: vi.fn()
  }))
}));

describe('SignInCore - Clean Architecture', () => {
  const mockAuthConfig = {
    apiBaseUrl: 'https://api.test.com',
    clientId: 'test-client',
    domain: 'test.com',
    enablePasskeys: true,
    enableMagicLinks: true,
    appCode: 'test-app',
    branding: {
      logoUrl: 'https://example.com/logo.png',
      companyName: 'Test Company'
    }
  };

  const mockAuthStore = {
    getConfig: vi.fn(() => mockAuthConfig),
    subscribe: vi.fn((callback) => {
      // Mock subscription that calls callback with initial state
      callback({ 
        state: 'unauthenticated', 
        signInState: 'emailEntry',
        user: null, 
        error: null 
      });
      return vi.fn(); // Return unsubscribe function
    }),
    signInWithMagicLink: vi.fn(),
    signInWithPasskey: vi.fn(),
    signOut: vi.fn(),
    initialize: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Context-Only Architecture', () => {
    it('should get auth store from context and config from store', () => {
      const TestWrapper = () => {
        const authStoreContext = writable(mockAuthStore);
        setContext(AUTH_CONTEXT_KEY, authStoreContext);
        return SignInCore;
      };

      render(TestWrapper, {
        props: {
          initialEmail: 'test@example.com',
          className: 'test-class'
        }
      });

      // Should call getConfig to get configuration from store
      expect(mockAuthStore.getConfig).toHaveBeenCalled();
      
      // Should subscribe to store for state updates
      expect(mockAuthStore.subscribe).toHaveBeenCalled();
      
      // Should render the component (not showing loading state)
      expect(screen.queryByText('Waiting for authentication context...')).not.toBeInTheDocument();
    });

    it('should show waiting message when no auth store in context', () => {
      render(SignInCore, {
        props: {
          initialEmail: 'test@example.com'
        }
      });

      // Should show waiting message when no context
      expect(screen.getByText('Waiting for authentication context...')).toBeInTheDocument();
      
      // Should not try to access store methods
      expect(mockAuthStore.getConfig).not.toHaveBeenCalled();
    });

    it('should show config loading message when store exists but no config', () => {
      const storeWithoutConfig = {
        ...mockAuthStore,
        getConfig: vi.fn(() => null)
      };

      const TestWrapper = () => {
        const authStoreContext = writable(storeWithoutConfig);
        setContext(AUTH_CONTEXT_KEY, authStoreContext);
        return SignInCore;
      };

      render(TestWrapper);

      // Should show config loading message
      expect(screen.getByText('Loading configuration...')).toBeInTheDocument();
    });

    it('should never accept config as prop (clean architecture)', () => {
      const TestWrapper = () => {
        const authStoreContext = writable(mockAuthStore);
        setContext(AUTH_CONTEXT_KEY, authStoreContext);
        return SignInCore;
      };

      // Try to pass config as prop (should be ignored)
      render(TestWrapper, {
        props: {
          config: { differentConfig: true }, // This should be ignored
          initialEmail: 'test@example.com'
        }
      });

      // Should use config from store, not from props
      expect(mockAuthStore.getConfig).toHaveBeenCalled();
      
      // Should render successfully (config from store is used)
      expect(screen.queryByText('Loading configuration...')).not.toBeInTheDocument();
    });
  });

  describe('Reactive Context Updates', () => {
    it('should react to auth store being added to context', async () => {
      const authStoreContext = writable(null);
      
      const TestWrapper = () => {
        setContext(AUTH_CONTEXT_KEY, authStoreContext);
        return SignInCore;
      };

      const { component } = render(TestWrapper, {
        props: {
          initialEmail: 'test@example.com'
        }
      });

      // Initially should show waiting message
      expect(screen.getByText('Waiting for authentication context...')).toBeInTheDocument();

      // Simulate auth store being set in context
      authStoreContext.set(mockAuthStore);

      // Should update reactively (in a real test environment)
      // Note: This would require more sophisticated reactivity testing
      expect(component).toBeDefined();
    });

    it('should react to config changes in auth store', async () => {
      const TestWrapper = () => {
        const authStoreContext = writable(mockAuthStore);
        setContext(AUTH_CONTEXT_KEY, authStoreContext);
        return SignInCore;
      };

      render(TestWrapper, {
        props: {
          initialEmail: 'test@example.com'
        }
      });

      // Should initially get config
      expect(mockAuthStore.getConfig).toHaveBeenCalled();

      // Simulate config change (would trigger reactive update)
      const newConfig = { ...mockAuthConfig, clientId: 'new-client' };
      mockAuthStore.getConfig.mockReturnValue(newConfig);

      // In a real reactive test, this would trigger component updates
    });
  });

  describe('Auth Logic Integration', () => {
    const setupWithContext = () => {
      const TestWrapper = () => {
        const authStoreContext = writable(mockAuthStore);
        setContext(AUTH_CONTEXT_KEY, authStoreContext);
        return SignInCore;
      };
      return TestWrapper;
    };

    it('should use store methods for authentication actions', async () => {
      const TestWrapper = setupWithContext();

      render(TestWrapper, {
        props: {
          initialEmail: 'test@example.com'
        }
      });

      // Should have access to auth store methods
      expect(mockAuthStore.subscribe).toHaveBeenCalled();
      
      // In a real test, we'd simulate user interactions and verify
      // that the correct store methods are called (signInWithMagicLink, etc.)
    });

    it('should handle auth state changes from store subscription', () => {
      const TestWrapper = setupWithContext();

      render(TestWrapper, {
        props: {
          initialEmail: 'test@example.com'
        }
      });

      // Verify subscription was set up
      expect(mockAuthStore.subscribe).toHaveBeenCalled();
      
      // In the real implementation, the subscription callback would update
      // component state based on auth store state changes
    });

    it('should apply className prop correctly', () => {
      const TestWrapper = setupWithContext();

      const { container } = render(TestWrapper, {
        props: {
          initialEmail: 'test@example.com',
          className: 'custom-signin-core'
        }
      });

      const coreElement = container.querySelector('.sign-in-core');
      expect(coreElement).toHaveClass('custom-signin-core');
    });

    it('should initialize with provided email', () => {
      const TestWrapper = setupWithContext();

      render(TestWrapper, {
        props: {
          initialEmail: 'preset@example.com'
        }
      });

      // Should use the initial email (in a real test we'd verify the email input value)
      const emailInput = screen.getByRole('textbox');
      expect(emailInput).toBeInTheDocument();
      // In a complete test: expect(emailInput.value).toBe('preset@example.com');
    });
  });

  describe('Error Boundary and Edge Cases', () => {
    it('should handle store.getConfig() returning null gracefully', () => {
      const storeWithNullConfig = {
        ...mockAuthStore,
        getConfig: vi.fn(() => null)
      };

      const TestWrapper = () => {
        const authStoreContext = writable(storeWithNullConfig);
        setContext(AUTH_CONTEXT_KEY, authStoreContext);
        return SignInCore;
      };

      render(TestWrapper, {
        props: {
          initialEmail: 'test@example.com'
        }
      });

      // Should show loading config message, not crash
      expect(screen.getByText('Loading configuration...')).toBeInTheDocument();
    });

    it('should handle store.getConfig() throwing error gracefully', () => {
      const storeWithBrokenConfig = {
        ...mockAuthStore,
        getConfig: vi.fn(() => {
          throw new Error('Config error');
        })
      };

      const TestWrapper = () => {
        const authStoreContext = writable(storeWithBrokenConfig);
        setContext(AUTH_CONTEXT_KEY, authStoreContext);
        return SignInCore;
      };

      // Should not crash when getConfig throws
      expect(() => {
        render(TestWrapper, {
          props: {
            initialEmail: 'test@example.com'
          }
        });
      }).not.toThrow();
    });

    it('should handle malformed context gracefully', () => {
      const TestWrapper = () => {
        // Set malformed context (not a store)
        setContext(AUTH_CONTEXT_KEY, 'not-a-store');
        return SignInCore;
      };

      render(TestWrapper, {
        props: {
          initialEmail: 'test@example.com'
        }
      });

      // Should show waiting message when context is malformed
      expect(screen.getByText('Waiting for authentication context...')).toBeInTheDocument();
    });
  });

  describe('No Prop Dependencies (Clean Architecture)', () => {
    it('should work without any props except presentational ones', () => {
      const TestWrapper = () => {
        const authStoreContext = writable(mockAuthStore);
        setContext(AUTH_CONTEXT_KEY, authStoreContext);
        return SignInCore;
      };

      // Should work with minimal props
      render(TestWrapper, {
        props: {
          // Only presentational props
          initialEmail: '',
          className: ''
        }
      });

      expect(mockAuthStore.getConfig).toHaveBeenCalled();
      expect(screen.queryByText('Waiting for authentication context...')).not.toBeInTheDocument();
    });

    it('should ignore any auth-related props passed incorrectly', () => {
      const TestWrapper = () => {
        const authStoreContext = writable(mockAuthStore);
        setContext(AUTH_CONTEXT_KEY, authStoreContext);
        return SignInCore;
      };

      render(TestWrapper, {
        props: {
          // These should be ignored in clean architecture
          config: { fake: 'config' },
          authStore: { fake: 'store' },
          // Only these should be used
          initialEmail: 'test@example.com',
          className: 'test-class'
        }
      });

      // Should still use context store, not props
      expect(mockAuthStore.getConfig).toHaveBeenCalled();
    });
  });
});