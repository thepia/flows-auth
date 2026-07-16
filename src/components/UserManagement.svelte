<!--
  UserManagement - Dedicated component for user management dashboard
  Handles profile, security (passkeys), and privacy management
  Dispatches navigate events for routing to management subpages
-->
<script lang="ts">
import { createEventDispatcher } from 'svelte';
import type { User } from '../types';
import Icon from './icons/Icon.svelte';
import { ArrowsClockwise } from 'phosphor-svelte';
import { m } from '../utils/i18n';


  interface Props {
    // Props
    user: User;
    onSignOut: () => void;
    onRefreshTokens?: (() => Promise<void>) | undefined;
  }

  let { user, onSignOut, onRefreshTokens = undefined }: Props = $props();

// Events
const dispatch = createEventDispatcher<{
  navigate: { section: 'passkeys' | 'profile' | 'privacy' | 'terms' };
}>();

let refreshing = $state(false);

function handleSignOut() {
  onSignOut();
}

async function handleRefreshTokens() {
  if (!onRefreshTokens || refreshing) return;

  try {
    refreshing = true;
    await onRefreshTokens();
  } catch (error) {
    console.error('Token refresh failed:', error);
  } finally {
    refreshing = false;
  }
}
</script>

<div class="user-management">
  <div class="user-profile-header">
    <div class="user-info">
      <h3>{m['user.welcomeBack']()}</h3>
      <p class="user-name">{user.name || user.email}</p>
      <p class="user-email">{user.email}</p>
    </div>

    <div class="header-actions">
      {#if onRefreshTokens}
        <button
          type="button"
          class="refresh-button"
          onclick={handleRefreshTokens}
          disabled={refreshing}
          title="Refresh tokens"
          aria-label="Refresh tokens"
        >
          <span class="icon-wrapper" class:spinning={refreshing}>
            <Icon
              icon={ArrowsClockwise}
              size={20}
              variant="secondary"
            />
          </span>
        </button>
      {/if}

      <button
        type="button"
        class="sign-out-button"
        onclick={handleSignOut}
        title={m['user.signOut']()}
      >
        {m['user.signOut']()}
      </button>
    </div>
  </div>

  <div class="management-sections">
    <!-- Security & Passkeys Management -->
    <div class="management-card">
      <div class="card-header">
        <h4>{m['user.security.title']()}</h4>
        <span class="card-icon">🔐</span>
      </div>
      <p class="card-description">{m['user.security.description']()}</p>
      <div class="card-actions">
        <button
          type="button"
          class="action-button primary"
          onclick={() => dispatch('navigate', { section: 'passkeys' })}
        >
          {m['user.security.managePasskeys']()}
        </button>
      </div>
    </div>

    <!-- Profile Management -->
    <div class="management-card">
      <div class="card-header">
        <h4>{m['user.profile.title']()}</h4>
        <span class="card-icon">👤</span>
      </div>
      <p class="card-description">{m['user.profile.description']()}</p>
      <div class="card-actions">
        <button
          type="button"
          class="action-button secondary"
          onclick={() => dispatch('navigate', { section: 'profile' })}
        >
          {m['user.profile.editProfile']()}
        </button>
      </div>
    </div>

    <!-- Privacy & Data Policy -->
    <div class="management-card">
      <div class="card-header">
        <h4>{m['user.privacy.title']()}</h4>
        <span class="card-icon">🛡️</span>
      </div>
      <p class="card-description">{m['user.privacy.description']()}</p>
      <div class="card-actions">
        <button
          type="button"
          class="action-button secondary"
          onclick={() => dispatch('navigate', { section: 'privacy' })}
        >
          {m['user.privacy.dataPolicy']()}
        </button>
        <button
          type="button"
          class="action-button secondary"
          onclick={() => dispatch('navigate', { section: 'terms' })}
        >
          {m['user.privacy.termsOfService']()}
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .user-management {
    text-align: left;
    max-width: 500px;
    margin: 0 auto;
  }

  .user-profile-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 20px 0;
    border-bottom: 1px solid var(--auth-border, #e5e7eb);
    margin-bottom: 24px;
  }

  .user-info h3 {
    margin: 0 0 8px 0;
    font-size: 1.25rem;
    color: var(--auth-text-primary, #111827);
  }

  .user-name {
    font-size: 1rem;
    font-weight: 600;
    color: var(--auth-text-primary, #111827);
    margin: 0 0 4px 0;
  }

  .user-email {
    font-size: 0.875rem;
    color: var(--auth-text-secondary, #6b7280);
    margin: 0;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .refresh-button {
    background: var(--auth-button-secondary-bg, #f9fafb);
    color: var(--auth-button-secondary-text, #374151);
    border: 1px solid var(--auth-button-secondary-border, #d1d5db);
    border-radius: 6px;
    padding: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 36px;
    height: 36px;
  }

  .refresh-button:hover:not(:disabled) {
    background: var(--auth-button-secondary-hover-bg, #f3f4f6);
    border-color: var(--auth-button-secondary-hover-border, #9ca3af);
  }

  .refresh-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .icon-wrapper {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.3s ease;
  }

  .icon-wrapper.spinning {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .sign-out-button {
    background: var(--auth-button-secondary-bg, #f9fafb);
    color: var(--auth-button-secondary-text, #374151);
    border: 1px solid var(--auth-button-secondary-border, #d1d5db);
    border-radius: 6px;
    padding: 8px 16px;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .sign-out-button:hover {
    background: var(--auth-button-secondary-hover-bg, #f3f4f6);
    border-color: var(--auth-button-secondary-hover-border, #9ca3af);
  }

  .management-sections {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .management-card {
    background: var(--auth-card-bg, #ffffff);
    border: 1px solid var(--auth-border, #e5e7eb);
    border-radius: 12px;
    padding: 20px;
    text-align: left;
    transition: all 0.2s ease;
  }

  .management-card:hover {
    border-color: var(--auth-primary-color, #3b82f6);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .card-header h4 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--auth-text-primary, #111827);
  }

  .card-icon {
    font-size: 1.5rem;
    opacity: 0.8;
  }

  .card-description {
    margin: 0 0 16px 0;
    font-size: 0.875rem;
    color: var(--auth-text-secondary, #6b7280);
    line-height: 1.5;
  }

  .card-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .action-button {
    background: var(--auth-button-secondary-bg, #f9fafb);
    color: var(--auth-button-secondary-text, #374151);
    border: 1px solid var(--auth-button-secondary-border, #d1d5db);
    border-radius: 6px;
    padding: 8px 16px;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s ease;
    font-weight: 500;
  }

  .action-button:hover {
    background: var(--auth-button-secondary-hover-bg, #f3f4f6);
    border-color: var(--auth-button-secondary-hover-border, #9ca3af);
  }

  .action-button.primary {
    background: var(--auth-primary-color, #3b82f6);
    color: white;
    border-color: var(--auth-primary-color, #3b82f6);
  }

  .action-button.primary:hover {
    background: var(--auth-primary-dark, #2563eb);
    border-color: var(--auth-primary-dark, #2563eb);
  }


  /* Responsive adjustments */
  @media (max-width: 640px) {
    .user-profile-header {
      flex-direction: column;
      align-items: stretch;
      gap: 16px;
    }

    .header-actions {
      align-self: flex-start;
    }

    .card-actions {
      flex-direction: column;
    }

    .action-button {
      justify-content: center;
    }
  }
</style>