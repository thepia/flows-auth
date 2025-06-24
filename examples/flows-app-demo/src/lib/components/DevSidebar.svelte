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
  
  let isOpen = false;
  let currentScenario: DevScenario;
  let unsubscribe: (() => void) | null = null;
  
  onMount(() => {
    if (!browser) return;
    
    currentScenario = devScenarioManager.getCurrentScenario();
    
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
    on:click={toggleSidebar}
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
      <button class="close-btn" on:click={toggleSidebar}>×</button>
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
              on:click={() => selectScenario(scenario.id)}
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
          <button class="trigger-btn new-user" on:click={() => triggerScenario('new-user')}>
            👤 New User
          </button>
          <button class="trigger-btn existing-user" on:click={() => triggerScenario('existing-user')}>
            🔐 Existing User
          </button>
          <button class="trigger-btn error" on:click={() => triggerScenario('error')}>
            ❌ Auth Error
          </button>
          <button class="trigger-btn network-error" on:click={() => triggerScenario('network-error')}>
            📶 Network Error
          </button>
        </div>
      </section>

      <!-- Development Actions -->
      <section class="scenario-section">
        <h4>Dev Actions</h4>
        <div class="dev-actions">
          <button class="action-btn" on:click={clearLocalStorage}>
            🧹 Clear Storage
          </button>
          <button class="action-btn" on:click={copyConfig}>
            📋 Copy Config
          </button>
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
      on:click={toggleSidebar}
      on:keydown={(e) => e.key === 'Escape' && toggleSidebar()}
    ></div>
  {/if}
{/if}

<style>
  .dev-toggle {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: var(--size-zIndex-fixed);
    width: 48px;
    height: 48px;
    background: #1f2937;
    color: white;
    border: none;
    border-radius: var(--radius-lg);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow-lg);
    transition: all var(--transition-normal);
  }

  .dev-toggle:hover {
    background: #374151;
    transform: scale(1.05);
  }

  .dev-toggle.open {
    background: var(--brand-primary);
  }

  .dev-sidebar {
    position: fixed;
    top: 0;
    right: 0;
    height: 100vh;
    width: 360px;
    background: white;
    border-left: 1px solid var(--gray-200);
    box-shadow: var(--shadow-2xl);
    z-index: var(--size-zIndex-modal);
    transform: translateX(100%);
    transition: transform var(--transition-normal);
    overflow-y: auto;
  }

  .dev-sidebar.open {
    transform: translateX(0);
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-4);
    border-bottom: 1px solid var(--gray-200);
    background: var(--gray-50);
  }

  .sidebar-header h3 {
    margin: 0;
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--color-gray-900);
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: var(--color-gray-500);
    padding: var(--spacing-1);
    line-height: 1;
  }

  .close-btn:hover {
    color: var(--color-gray-700);
  }

  .sidebar-content {
    padding: var(--spacing-4);
  }

  .scenario-section {
    margin-bottom: var(--spacing-6);
  }

  .scenario-section h4 {
    margin: 0 0 var(--spacing-3) 0;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-gray-700);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .current-scenario {
    background: var(--color-gray-50);
    padding: var(--spacing-3);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-gray-200);
  }

  .scenario-badge {
    display: inline-block;
    padding: var(--spacing-1) var(--spacing-2);
    border-radius: var(--radius);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    margin-bottom: var(--spacing-2);
  }

  .scenario-desc {
    font-size: var(--font-size-sm);
    color: var(--color-gray-600);
    margin-bottom: var(--spacing-2);
  }

  .scenario-details {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }

  .scenario-details small {
    font-size: var(--font-size-xs);
    color: var(--color-gray-500);
  }

  .scenario-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .scenario-btn {
    background: white;
    border: 1px solid var(--color-gray-200);
    border-left: 3px solid var(--color-gray-300);
    border-radius: var(--radius);
    padding: var(--spacing-3);
    text-align: left;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .scenario-btn:hover {
    background: var(--color-gray-50);
    border-color: var(--color-gray-300);
  }

  .scenario-btn.active {
    background: var(--brand-primary-light);
    border-color: var(--brand-primary);
  }

  .scenario-name {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-gray-900);
    margin-bottom: var(--spacing-1);
  }

  .scenario-company {
    font-size: var(--font-size-xs);
    color: var(--color-gray-500);
  }

  .trigger-buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-2);
  }

  .trigger-btn {
    background: white;
    border: 1px solid var(--color-gray-300);
    border-radius: var(--radius);
    padding: var(--spacing-2);
    font-size: var(--font-size-xs);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .trigger-btn:hover {
    background: var(--color-gray-50);
  }

  .trigger-btn.new-user:hover { background: #fef3c7; }
  .trigger-btn.existing-user:hover { background: #d1fae5; }
  .trigger-btn.error:hover { background: #fecaca; }
  .trigger-btn.network-error:hover { background: #e0e7ff; }

  .dev-actions {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .action-btn {
    background: var(--color-gray-100);
    border: 1px solid var(--color-gray-300);
    border-radius: var(--radius);
    padding: var(--spacing-2);
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .action-btn:hover {
    background: var(--color-gray-200);
  }

  .env-info {
    background: var(--color-gray-50);
    padding: var(--spacing-2);
    border-radius: var(--radius);
    border: 1px solid var(--color-gray-200);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }

  .env-info small {
    font-size: var(--font-size-xs);
    color: var(--color-gray-600);
    font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  }

  .sidebar-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.5);
    z-index: var(--size-zIndex-modal-backdrop);
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