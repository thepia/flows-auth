<!--
  AuthExplainer - Configurable explanation component for authentication
  Can display either a single paragraph with icon or a list of features with icons
  Based on ExplainerConfig from auth store
-->
<script lang="ts">
  import { 
    Lock, 
    Shield, 
    Certificate as BadgeCheck,
    Key,
    UserCheck,
    ShieldCheck,
    Fingerprint,
    DeviceMobile,
    Globe,
    CheckCircle
  } from 'phosphor-svelte';
  import type { ExplainerConfig } from '../../types';
  import { m } from '../../utils/i18n';

  // Props
  export let config: ExplainerConfig | null = null;

  // Type the m object for dynamic access
  const messages = m as Record<string, (params?: any) => string>;

  // Icon mapping for Phosphor icons
  const iconMap = {
    Lock,
    Shield,
    BadgeCheck,
    Key,
    UserCheck,
    ShieldCheck,
    Fingerprint,
    DeviceMobile,
    Globe,
    CheckCircle
  };

  // Get icon component by name
  function getIconComponent(iconName: string) {
    return iconMap[iconName as keyof typeof iconMap] || Lock;
  }

  // Get icon weight, defaulting to 'duotone'
  function getIconWeight(weight?: string): 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone' {
    return (weight as 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone') || 'duotone';
  }
</script>

{#if config}
  <div class="auth-explainer {config.className || ''}">
    {#if config.type === 'paragraph'}
      <!-- Single paragraph with optional icon -->
      <div class="explainer-paragraph">
        {#if config.iconName}
          <div class="paragraph-icon">
            <svelte:component 
              this={getIconComponent(config.iconName)} 
              size={16} 
              weight={getIconWeight(config.iconWeight)} 
              color="currentColor" 
            />
          </div>
        {/if}
        <span class="paragraph-text">
          {#if config.textKey}
            {#if config.useCompanyName && config.companyName}
              {messages[config.textKey]({ companyName: config.companyName })}
            {:else}
              {messages[config.textKey]()}
            {/if}
          {/if}
        </span>
      </div>
    {:else if config.type === 'features' && config.features}
      <!-- Feature list with icons -->
      <div class="explainer-features">
        {#each config.features as feature}
          <div class="feature-item">
            <div class="feature-icon">
              <svelte:component 
                this={getIconComponent(feature.iconName)} 
                size={20} 
                weight={getIconWeight(feature.iconWeight)} 
                color="currentColor" 
              />
            </div>
            <span class="feature-text">
              {messages[feature.textKey]()}
            </span>
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/if}

<style>
  .auth-explainer {
    margin-top: 16px;
  }

  /* Paragraph style with inline icon at text start */
  .explainer-paragraph {
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    gap: 6px;
    text-align: left;
    font-size: 0.75rem;
    color: var(--auth-text-secondary, #6b7280);
    line-height: 1.4;
    opacity: 0.8;
  }

  .paragraph-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 1px; /* Slight adjustment to align with first line of text */
  }

  .paragraph-text {
    flex: 1;
    text-align: left;
  }

  /* Features list style (matches SignInForm Info Section) */
  .explainer-features {
    padding-top: 16px;
    border-top: 1px solid var(--color-border-light, #e5e7eb);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .feature-item {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .feature-icon {
    width: 20px;
    height: 20px;
    color: var(--auth-accent-color, #10b981);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .feature-text {
    font-size: 0.875rem;
    color: var(--auth-text-secondary, #6b7280);
    line-height: 1.4;
  }

  /* Responsive adjustments */
  @media (max-width: 480px) {
    .explainer-paragraph {
      font-size: 0.7rem;
    }
    
    .feature-text {
      font-size: 0.8rem;
    }
  }
</style>
