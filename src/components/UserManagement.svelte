<!--
  UserManagement - Dedicated component for user management dashboard
  Handles profile, security (passkeys), and privacy management
  Dispatches navigate events for routing to management subpages
-->
<script lang="ts">
import { createEventDispatcher } from 'svelte';
import type { User } from '../types';
import type { getI18n } from '../utils/i18n';

// Props
export let user: User;
export let onSignOut: () => void;
export let i18n: ReturnType<typeof getI18n>['t'];

// Events
const dispatch = createEventDispatcher<{
  navigate: { section: 'passkeys' | 'profile' | 'privacy' | 'terms' };
}>();

function handleSignOut() {
  onSignOut();
}
</script>

<div class="user-management">
  <div class="user-profile-header">
    <div class="user-info">
      <h3>{$i18n('user.welcomeBack')}</h3>
      <p class="user-name">{user.name || user.email}</p>
      <p class="user-email">{user.email}</p>
    </div>
    
    <button
      type="button"
      class="sign-out-button"
      on:click={handleSignOut}
      title={$i18n('user.signOut')}
    >
      {$i18n('user.signOut')}
    </button>
  </div>

  <div class="management-sections">
    <!-- Security & Passkeys Management -->
    <div class="management-card">
      <div class="card-header">
        <h4>{$i18n('user.security.title')}</h4>
        <span class="card-icon">🔐</span>
      </div>
      <p class="card-description">{$i18n('user.security.description')}</p>
      <div class="card-actions">
        <button
          type="button"
          class="action-button primary"
          on:click={() => dispatch('navigate', { section: 'passkeys' })}
        >
          {$i18n('user.security.managePasskeys')}
        </button>
      </div>
    </div>

    <!-- Profile Management -->
    <div class="management-card">
      <div class="card-header">
        <h4>{$i18n('user.profile.title')}</h4>
        <span class="card-icon">👤</span>
      </div>
      <p class="card-description">{$i18n('user.profile.description')}</p>
      <div class="card-actions">
        <button
          type="button"
          class="action-button secondary"
          on:click={() => dispatch('navigate', { section: 'profile' })}
        >
          {$i18n('user.profile.editProfile')}
        </button>
      </div>
    </div>

    <!-- Privacy & Data Policy -->
    <div class="management-card">
      <div class="card-header">
        <h4>{$i18n('user.privacy.title')}</h4>
        <span class="card-icon">🛡️</span>
      </div>
      <p class="card-description">{$i18n('user.privacy.description')}</p>
      <div class="card-actions">
        <button
          type="button"
          class="action-button secondary"
          on:click={() => dispatch('navigate', { section: 'privacy' })}
        >
          {$i18n('user.privacy.dataPolicy')}
        </button>
        <button
          type="button"
          class="action-button secondary"
          on:click={() => dispatch('navigate', { section: 'terms' })}
        >
          {$i18n('user.privacy.termsOfService')}
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

  .management-card.primary {
    border-color: var(--auth-primary-color, #3b82f6);
    background: var(--auth-primary-light-bg, #eff6ff);
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

  .action-button.large {
    padding: 12px 24px;
    font-size: 1rem;
    font-weight: 600;
  }

  /* Responsive adjustments */
  @media (max-width: 640px) {
    .user-profile-header {
      flex-direction: column;
      align-items: stretch;
      gap: 16px;
    }

    .sign-out-button {
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