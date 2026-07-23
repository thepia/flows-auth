<script lang="ts">
  import { onMount } from 'svelte';
  import { browser, dev } from '$app/environment';
  import { DEV_SCENARIOS, devScenarioManager, type DevScenario } from '$lib/dev/scenarios.js';
  
  // Import console bridge helpers
  let logStateChange: ((component: string, state: any) => void) | null = null;
  
  if (browser && dev) {
    import('$lib/dev/console-bridge').then(module => {
      logStateChange = module.logStateChange;
    });
  }
  
  let isOpen = $state(false);
  let currentScenario: DevScenario = $state();
  let unsubscribe: (() => void) | null = null;
  
  onMount(() => {
    if (!browser) return;
    
    devScenarioManager.getCurrentScenario().then((scenario) => {
      currentScenario = scenario;
    });

    // Subscribe to scenario changes
    unsubscribe = devScenarioManager.subscribe((scenario) => {
      currentScenario = scenario;
    });
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  });
  
  function toggleSidebar() {
    isOpen = !isOpen;
  }
  
  function selectScenario(scenarioId: string) {
    const previousScenario = currentScenario?.name;
    devScenarioManager.setScenario(scenarioId);
    const newScenario = DEV_SCENARIOS.find(s => s.id === scenarioId);
    
    logStateChange?.('DevSidebar', {
      action: 'scenario-changed',
      from: previousScenario,
      to: newScenario?.name,
      config: newScenario?.config
    });
  }
  
  function triggerScenario(type: 'new-user' | 'existing-user' | 'error' | 'network-error') {
    logStateChange?.('DevSidebar', {
      action: 'scenario-triggered',
      type,
      scenario: currentScenario?.name
    });
    devScenarioManager.triggerScenario(type);
  }
  
  function clearLocalStorage() {
    if (browser) {
      logStateChange?.('DevSidebar', {
        action: 'storage-cleared',
        scenario: currentScenario?.name
      });
      localStorage.clear();
      console.log('🧹 Cleared all localStorage');
      window.location.reload();
    }
  }
  
  function copyConfig() {
    if (browser && currentScenario) {
      const configText = JSON.stringify(currentScenario.config, null, 2);
      navigator.clipboard.writeText(configText);
      console.log('📋 Config copied to clipboard');
    }
  }
</script>

{#if browser}
  <!-- Toggle Button -->
  <button 
    class="dev-toggle" 
    class:open={isOpen}
    onclick={toggleSidebar}
    title="Development Tools"
  >
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0L19.2 12l-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/>
    </svg>
  </button>

  <!-- Sidebar -->
  <div class="dev-sidebar" class:open={isOpen}>
    <div class="sidebar-header">
      <h3>Development Tools</h3>
      <button class="close-btn" onclick={toggleSidebar}>×</button>
    </div>
    
    <div class="sidebar-content">
      <!-- Current Scenario -->
      {#if currentScenario}
        <section class="scenario-section">
          <h4>Current Scenario</h4>
          <div class="current-scenario">
            <div class="scenario-badge" style="background-color: {currentScenario.branding.colors.primary}15; color: {currentScenario.branding.colors.primary};">
              {currentScenario.name}
            </div>
            <p class="scenario-desc">{currentScenario.description}</p>
            <div class="scenario-details">
              <small><strong>Company:</strong> {currentScenario.branding.companyName}</small>
              <small><strong>API:</strong> {currentScenario.config.apiBaseUrl}</small>
              <small><strong>Client:</strong> {currentScenario.config.clientId}</small>
            </div>
          </div>
        </section>
      {/if}

      <!-- Scenario Selector -->
      <section class="scenario-section">
        <h4>Switch Scenario</h4>
        <div class="scenario-list">
          {#each DEV_SCENARIOS as scenario}
            <button 
              class="scenario-btn"
              class:active={currentScenario?.id === scenario.id}
              style="border-left-color: {scenario.branding.colors.primary};"
              onclick={() => selectScenario(scenario.id)}
            >
              <div class="scenario-name">{scenario.name}</div>
              <div class="scenario-company">{scenario.branding.companyName}</div>
            </button>
          {/each}
        </div>
      </section>

      <!-- Auth State Triggers -->
      <section class="scenario-section">
        <h4>Trigger Auth States</h4>
        <div class="trigger-buttons">
          <button class="trigger-btn new-user" onclick={() => triggerScenario('new-user')}>
            👤 New User
          </button>
          <button class="trigger-btn existing-user" onclick={() => triggerScenario('existing-user')}>
            🔐 Existing User
          </button>
          <button class="trigger-btn error" onclick={() => triggerScenario('error')}>
            ❌ Auth Error
          </button>
          <button class="trigger-btn network-error" onclick={() => triggerScenario('network-error')}>
            📶 Network Error
          </button>
        </div>
      </section>

      <!-- Development Actions -->
      <section class="scenario-section">
        <h4>Dev Actions</h4>
        <div class="dev-actions">
          <button class="action-btn" onclick={clearLocalStorage}>
            🧹 Clear Storage
          </button>
          <button class="action-btn" onclick={copyConfig}>
            📋 Copy Config
          </button>
          <a href="/debug/webauthn" class="action-btn" style="text-decoration: none; display: block;">
            🔐 WebAuthn Debugger
          </a>
        </div>
      </section>

      <!-- Environment Info -->
      <section class="scenario-section">
        <h4>Environment</h4>
        <div class="env-info">
          <small>Mode: Development</small>
          <small>URL: {browser ? window.location.origin : 'N/A'}</small>
          <small>User Agent: {browser ? navigator.userAgent.split(' ').slice(-2).join(' ') : 'N/A'}</small>
        </div>
      </section>
    </div>
  </div>

  <!-- Backdrop -->
  {#if isOpen}
    <div 
      class="sidebar-backdrop" 
      role="button" 
      tabindex="-1"
      onclick={toggleSidebar}
      onkeydown={(e) => e.key === 'Escape' && toggleSidebar()}
    ></div>
  {/if}
{/if}

<style>
  .dev-toggle {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1030;
    width: 48px;
    height: 48px;
    background: #1f2937;
    color: white;
    border: none;
    border-radius: var(--size-radius-4, 0.5rem);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
    transition: all 200ms ease;
  }

  .dev-toggle:hover {
    background: #374151;
    transform: scale(1.05);
  }

  .dev-toggle.open {
    background: var(--color-brand-primary, #0066cc);
  }

  .dev-sidebar {
    position: fixed;
    top: 0;
    right: 0;
    height: 100vh;
    width: 360px;
    background: white;
    border-left: 1px solid var(--color-border-default, #e5e7eb);
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    z-index: 1050;
    transform: translateX(100%);
    transition: transform 200ms ease;
    overflow-y: auto;
  }

  .dev-sidebar.open {
    transform: translateX(0);
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--size-space-4, 1rem);
    border-bottom: 1px solid var(--color-border-default, #e5e7eb);
    background: var(--color-bg-secondary, #f9fafb);
  }

  .sidebar-header h3 {
    margin: 0;
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary, #111827);
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: var(--color-text-3, #6b7280);
    padding: var(--size-space-1, 0.25rem);
    line-height: 1;
  }

  .close-btn:hover {
    color: var(--color-text-secondary, #374151);
  }

  .sidebar-content {
    padding: var(--size-space-4, 1rem);
  }

  .scenario-section {
    margin-bottom: var(--size-space-6, 1.5rem);
  }

  .scenario-section h4 {
    margin: 0 0 var(--size-space-3, 0.75rem) 0;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-secondary, #374151);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .current-scenario {
    background: var(--color-bg-secondary, #f9fafb);
    padding: var(--size-space-3, 0.75rem);
    border-radius: var(--size-radius-3, 0.375rem);
    border: 1px solid var(--color-border-default, #e5e7eb);
  }

  .scenario-badge {
    display: inline-block;
    padding: var(--size-space-1, 0.25rem) var(--size-space-2, 0.5rem);
    border-radius: var(--size-radius-2, 0.25rem);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    margin-bottom: var(--size-space-2, 0.5rem);
  }

  .scenario-desc {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary, #4b5563);
    margin-bottom: var(--size-space-2, 0.5rem);
  }

  .scenario-details {
    display: flex;
    flex-direction: column;
    gap: var(--size-space-1, 0.25rem);
  }

  .scenario-details small {
    font-size: var(--font-size-xs);
    color: var(--color-text-3, #6b7280);
  }

  .scenario-list {
    display: flex;
    flex-direction: column;
    gap: var(--size-space-2, 0.5rem);
  }

  .scenario-btn {
    background: white;
    border: 1px solid var(--color-border-default, #e5e7eb);
    border-left: 3px solid var(--color-border-default, #d1d5db);
    border-radius: var(--size-radius-2, 0.25rem);
    padding: var(--size-space-3, 0.75rem);
    text-align: left;
    cursor: pointer;
    transition: all 150ms ease;
  }

  .scenario-btn:hover {
    background: var(--color-bg-secondary, #f9fafb);
    border-color: var(--color-border-default, #d1d5db);
  }

  .scenario-btn.active {
    background: var(--color-brand-primarySubtle, #eff6ff);
    border-color: var(--color-brand-primary, #0066cc);
  }

  .scenario-name {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-primary, #111827);
    margin-bottom: var(--size-space-1, 0.25rem);
  }

  .scenario-company {
    font-size: var(--font-size-xs);
    color: var(--color-text-3, #6b7280);
  }

  .trigger-buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--size-space-2, 0.5rem);
  }

  .trigger-btn {
    background: white;
    border: 1px solid var(--color-border-default, #d1d5db);
    border-radius: var(--size-radius-2, 0.25rem);
    padding: var(--size-space-2, 0.5rem);
    font-size: var(--font-size-xs);
    cursor: pointer;
    transition: all 150ms ease;
  }

  .trigger-btn:hover {
    background: var(--color-bg-secondary, #f9fafb);
  }

  .trigger-btn.new-user:hover { background: #fef3c7; }
  .trigger-btn.existing-user:hover { background: #d1fae5; }
  .trigger-btn.error:hover { background: #fecaca; }
  .trigger-btn.network-error:hover { background: #e0e7ff; }

  .dev-actions {
    display: flex;
    flex-direction: column;
    gap: var(--size-space-2, 0.5rem);
  }

  .action-btn {
    background: var(--color-bg-secondary, #f3f4f6);
    border: 1px solid var(--color-border-default, #d1d5db);
    border-radius: var(--size-radius-2, 0.25rem);
    padding: var(--size-space-2, 0.5rem);
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition: all 150ms ease;
  }

  .action-btn:hover {
    background: var(--color-border-default, #e5e7eb);
  }

  .env-info {
    background: var(--color-bg-secondary, #f9fafb);
    padding: var(--size-space-2, 0.5rem);
    border-radius: var(--size-radius-2, 0.25rem);
    border: 1px solid var(--color-border-default, #e5e7eb);
    display: flex;
    flex-direction: column;
    gap: var(--size-space-1, 0.25rem);
  }

  .env-info small {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary, #4b5563);
    font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  }

  .sidebar-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1040;
  }

  /* Mobile adjustments */
  @media (max-width: 768px) {
    .dev-sidebar {
      width: 100vw;
    }
    
    .trigger-buttons {
      grid-template-columns: 1fr;
    }
  }
</style>