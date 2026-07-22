<script lang="ts">
  import { onMount } from 'svelte';
  import { browser, dev } from '$app/environment';
  import { createEventDispatcher } from 'svelte';
  import { type User } from '@thepia/flows-auth';
import { getAuthStoreFromContext } from '@thepia/flows-auth/svelte';
  
  // Import console bridge helpers
  let logAuthEvent: ((eventType: string, data: any) => void) | null = null;
  let logStateChange: ((component: string, state: any) => void) | null = null;
  
  // Get the shared auth store from context (created once in +layout; never create one here).
  // getContext() must run during component init, not inside onMount/async.
  let authStore: any = null;
  try {
    authStore = getAuthStoreFromContext();
  } catch (contextError) {
    console.warn('⚠️ AccountIcon: auth store not available in context:', contextError);
  }
  
  if (browser && dev) {
    import('$lib/dev/console-bridge').then(module => {
      logAuthEvent = module.logAuthEvent;
      logStateChange = module.logStateChange;
    });
  }

  const dispatch = createEventDispatcher<{
    openAuth: { switchUser?: boolean };
  }>();

  let currentUser: User | null = $state(null);
  let showProfileMenu = $state(false);
  let isLoading = $state(true);
  let profileMenuRef: HTMLDivElement = $state();

  onMount(async () => {
    if (!browser) return;

    // Auth store comes from Svelte context (created once in +layout); nothing to create here.

    // Check for existing session in localStorage
    checkAuthState();

    // Listen for auth state changes
    const handleAuthUpdate = (event: CustomEvent) => {
      if (event.detail.user) {
        currentUser = event.detail.user;
        logAuthEvent?.('user-authenticated', {
          userId: event.detail.user.id,
          email: event.detail.user.email,
          method: event.detail.method || 'unknown'
        });
      } else {
        currentUser = null;
        logAuthEvent?.('user-cleared', {});
      }
      isLoading = false;
      logStateChange?.('AccountIcon', { currentUser, isLoading });
    };

    const handleSignOutEvent = () => {
      currentUser = null;
      showProfileMenu = false;
      logAuthEvent?.('user-signed-out', {});
    };

    // Listen for auth library events
    window.addEventListener('auth:success', handleAuthUpdate as EventListener);
    window.addEventListener('auth:signout', handleSignOutEvent as EventListener);
    window.addEventListener('auth:error', (() => { isLoading = false; }) as EventListener);

    // Listen for storage changes (cross-tab sync)
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'auth_access_token' || event.key === 'auth_user') {
        checkAuthState();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Close menu when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef && !profileMenuRef.contains(event.target as Node)) {
        showProfileMenu = false;
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('auth:success', handleAuthUpdate as EventListener);
      window.removeEventListener('auth:signout', handleSignOutEvent as EventListener);
      window.removeEventListener('auth:error', (() => { isLoading = false; }) as EventListener);
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  });

  function checkAuthState() {
    if (!browser) return;

    try {
      const token = localStorage.getItem('auth_access_token');
      const userStr = localStorage.getItem('auth_user');
      
      if (token && userStr) {
        currentUser = JSON.parse(userStr);
      } else {
        currentUser = null;
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
      currentUser = null;
    }
    
    isLoading = false;
  }

  function handleAuthClick() {
    logAuthEvent?.('auth-dialog-requested', { trigger: 'account-icon-click' });
    dispatch('openAuth', {});
  }

  function handleSwitchUser() {
    showProfileMenu = false;
    logAuthEvent?.('switch-user-requested', { currentUser: currentUser?.email });
    dispatch('openAuth', { switchUser: true });
  }

  async function handleSignOut() {
    if (!browser) return;
    
    const userEmail = currentUser?.email;
    logAuthEvent?.('sign-out-initiated', { userEmail });
    
    try {
      if (authStore) {
        // Use proper auth store signOut method
        console.log('🔒 Signing out via auth store...');
        await authStore.signOut();
        console.log('✅ Auth store sign out completed');
      } else {
        // Fallback to manual cleanup if auth store not available
        console.warn('⚠️ Auth store not available, falling back to manual cleanup');
        localStorage.removeItem('auth_access_token');
        localStorage.removeItem('auth_user');
      }
      
      // Update local state
      currentUser = null;
      showProfileMenu = false;
      
      // Dispatch sign out event for other components
      window.dispatchEvent(new CustomEvent('auth:signout'));
      
      logAuthEvent?.('sign-out-completed', { userEmail });
      
      // Trigger page reload to reset state
      window.location.reload();
    } catch (error) {
      console.error('❌ Sign out failed:', error);
      logAuthEvent?.('sign-out-failed', { userEmail, error: error?.message });
      
      // Fallback: manual cleanup and reload
      localStorage.removeItem('auth_access_token');
      localStorage.removeItem('auth_user');
      currentUser = null;
      showProfileMenu = false;
      window.dispatchEvent(new CustomEvent('auth:signout'));
      window.location.reload();
    }
  }

  function toggleProfileMenu() {
    showProfileMenu = !showProfileMenu;
  }

  function getInitials(name: string): string {
    return name
      .split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
  }

  let userInitials = $derived(currentUser?.name ? getInitials(currentUser.name) : '');
</script>

{#if isLoading}
  <!-- Loading State -->
  <div class="account-icon loading">
    <div class="loading-spinner"></div>
  </div>
{:else if currentUser}
  <!-- Authenticated State -->
  <div class="account-menu" bind:this={profileMenuRef}>
    <button
      class="profile-button"
      onclick={toggleProfileMenu}
      aria-label="User profile"
      aria-expanded={showProfileMenu}
      type="button"
    >
      {#if currentUser.avatar}
        <img
          src={currentUser.avatar}
          alt={currentUser.name}
          class="profile-avatar"
        />
      {:else}
        <span class="profile-initials">{userInitials}</span>
      {/if}
    </button>

    {#if showProfileMenu}
      <div class="profile-menu">
        <!-- User Info Header -->
        <div class="profile-header">
          <div class="profile-info">
            {#if currentUser.avatar}
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                class="profile-avatar-large"
              />
            {:else}
              <div class="profile-avatar-large profile-initials-large">
                {userInitials}
              </div>
            {/if}
            <div class="profile-details">
              <div class="profile-name">{currentUser.name}</div>
              <div class="profile-email">{currentUser.email}</div>
            </div>
          </div>
        </div>

        <!-- Menu Actions -->
        <div class="profile-actions">
          <button
            class="profile-action"
            onclick={handleSwitchUser}
            type="button"
          >
            <svg class="action-icon" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003Z"/>
            </svg>
            Switch User
          </button>
          <button
            class="profile-action"
            onclick={handleSignOut}
            type="button"
          >
            <svg class="action-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25Z" clip-rule="evenodd"/>
              <path fill-rule="evenodd" d="M6 10a.75.75 0 0 1 .75-.75h9.546l-1.048-.943a.75.75 0 1 1 1.004-1.114l2.5 2.25a.75.75 0 0 1 0 1.114l-2.5 2.25a.75.75 0 1 1-1.004-1.114l1.048-.943H6.75A.75.75 0 0 1 6 10Z" clip-rule="evenodd"/>
            </svg>
            Sign Out
          </button>
        </div>
      </div>
    {/if}
  </div>
{:else}
  <!-- Unauthenticated State -->
  <button
    class="account-icon sign-in"
    onclick={handleAuthClick}
    aria-label="Sign in"
    type="button"
  >
    <svg class="account-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.5"
        d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
      />
    </svg>
  </button>
{/if}

<style>
  .account-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border: none;
    background: none;
    cursor: pointer;
    border-radius: var(--size-radius-full, 9999px);
    transition: all 200ms ease;
    color: var(--color-text-secondary, #374151);
  }

  .account-icon:hover {
    color: var(--color-brand-primary, #0066cc);
    background: var(--color-brand-primarySubtle, #eff6ff);
  }

  .account-icon:focus {
    outline: none;
    ring: 2px solid var(--color-brand-primary, #0066cc);
    ring-offset: 2px;
  }

  .account-icon.loading {
    background: var(--color-bg-secondary, #f3f4f6);
    cursor: default;
  }

  .account-icon.loading:hover {
    background: var(--color-bg-secondary, #f3f4f6);
    color: var(--color-text-secondary, #374151);
  }

  .account-icon-svg {
    width: 24px;
    height: 24px;
  }

  .loading-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--color-border-default, #e5e7eb);
    border-top: 2px solid var(--color-brand-primary, #0066cc);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Profile Menu */
  .account-menu {
    position: relative;
  }

  .profile-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: var(--size-radius-full, 9999px);
    background: var(--color-brand-primary, #0066cc);
    color: white;
    border: none;
    cursor: pointer;
    transition: all 200ms ease;
  }

  .profile-button:hover {
    background: var(--color-brand-primaryHover, #0052a3);
    transform: scale(1.05);
  }

  .profile-button:focus {
    outline: none;
    ring: 2px solid var(--color-brand-primary, #0066cc);
    ring-offset: 2px;
  }

  .profile-avatar {
    width: 40px;
    height: 40px;
    border-radius: var(--size-radius-full, 9999px);
    object-fit: cover;
  }

  .profile-initials {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
  }

  .profile-menu {
    position: absolute;
    right: 0;
    top: calc(100% + var(--size-space-2, 0.5rem));
    width: 280px;
    background: var(--color-bg-primary, #ffffff);
    border: 1px solid var(--color-border-default, #e5e7eb);
    border-radius: var(--size-radius-6, 0.75rem);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    overflow: hidden;
  }

  .profile-header {
    padding: var(--size-space-4, 1rem);
    border-bottom: 1px solid var(--color-border-default, #e5e7eb);
    background: var(--color-bg-secondary, #f9fafb);
  }

  .profile-info {
    display: flex;
    align-items: center;
    gap: var(--size-space-3, 0.75rem);
  }

  .profile-avatar-large {
    width: 48px;
    height: 48px;
    border-radius: var(--size-radius-full, 9999px);
    object-fit: cover;
    flex-shrink: 0;
  }

  .profile-initials-large {
    background: var(--color-brand-primary, #0066cc);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
  }

  .profile-details {
    flex: 1;
    min-width: 0;
  }

  .profile-name {
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-primary, #111827);
    margin-bottom: var(--size-space-1, 0.25rem);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .profile-email {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary, #4b5563);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .profile-actions {
    padding: var(--size-space-2, 0.5rem);
  }

  .profile-action {
    display: flex;
    align-items: center;
    gap: var(--size-space-3, 0.75rem);
    width: 100%;
    padding: var(--size-space-3, 0.75rem) var(--size-space-4, 1rem);
    border: none;
    background: none;
    color: var(--color-text-secondary, #374151);
    font-size: var(--font-size-sm);
    text-align: left;
    cursor: pointer;
    border-radius: var(--size-radius-3, 0.375rem);
    transition: all 150ms ease;
  }

  .profile-action:hover {
    background: var(--color-bg-secondary, #f3f4f6);
    color: var(--color-text-primary, #111827);
  }

  .action-icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }

  /* Mobile adjustments */
  @media (max-width: 768px) {
    .profile-menu {
      width: 260px;
      right: -20px;
    }
  }
</style>