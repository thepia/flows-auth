<script>
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  // Paraglide demo translations
  import * as m from '../../paraglide/messages.js';
  import { Pulse as Activity, User, Envelope } from 'phosphor-svelte';

  // Tab configuration with Paraglide functions
  $: tabs = [
    {
      id: 'overview',
      title: m.tabs_overview_title(),
      description: m.tabs_overview_description(),
      icon: Activity,
      href: '/'
    },
    {
      id: 'signin',
      title: m.tabs_signin_title(),
      description: m.tabs_signin_description(),
      icon: User,
      href: '/signin'
    },
    {
      id: 'register',
      title: m.tabs_register_title(),
      description: m.tabs_register_description(),
      icon: Envelope,
      href: '/register'
    }
  ];

  // Get current active tab based on URL
  $: currentPath = $page.url.pathname;
  $: activeTab = getActiveTab(currentPath);

  function getActiveTab(path) {
    if (path === '/signin') return 'signin';
    if (path === '/register') return 'register';
    return 'overview';
  }

  function handleTabClick(tab) {
    if (tab.href) {
      // Use normal navigation for all tabs
      goto(tab.href);
    }
  }
</script>

<nav class="tab-navigation" aria-label="Demo navigation">
  <div class="tab-container">
    <div class="tab-list">
      {#each tabs as tab}
        <button
          class="tab-button"
          class:active={activeTab === tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls="tab-panel-{tab.id}"
          tabindex={activeTab === tab.id ? 0 : -1}
          on:click={() => handleTabClick(tab)}
        >
          <div class="tab-icon">
            <svelte:component this={tab.icon} size={20} />
          </div>
          <div class="tab-content">
            <span class="tab-title">{tab.title}</span>
            <span class="tab-description">{tab.description}</span>
          </div>
        </button>
      {/each}
    </div>
  </div>
</nav>

<style>
  .tab-navigation {
    background: transparent;
    border-bottom: 1px solid var(--border-color);
    position: static;
    z-index: 1;
  }

  .tab-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 1rem;
  }

  .tab-list {
    display: flex;
    gap: 0;
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .tab-list::-webkit-scrollbar {
    display: none;
  }

  .tab-button {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.5rem;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition: color 0.2s ease;
    border-bottom: 2px solid transparent;
    min-width: 0;
    flex-shrink: 0;
    position: relative;
  }

  .tab-button:hover {
    color: var(--text-primary);
  }

  .tab-button.active {
    color: var(--primary-color);
    border-bottom-color: var(--primary-color);
  }

  .tab-button:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
  }

  .tab-icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .tab-content {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    min-width: 0;
  }

  .tab-title {
    font-weight: 600;
    font-size: 1rem;
    line-height: 1.2;
    white-space: nowrap;
  }

  .tab-description {
    font-size: 0.875rem;
    line-height: 1.3;
    opacity: 0.8;
    margin-top: 0.25rem;
    display: none;
  }

  /* Responsive design */
  @media (min-width: 768px) {
    .tab-description {
      display: block;
    }

    .tab-button {
      padding: 1rem 2rem;
    }
  }

  @media (max-width: 767px) {
    .tab-container {
      padding: 0 1rem;
    }

    .tab-button {
      padding: 0.75rem 1rem;
      gap: 0.75rem;
    }

    .tab-content {
      align-items: center;
    }
  }

  @media (max-width: 640px) {
    .tab-button {
      flex-direction: column;
      gap: 0.5rem;
      padding: 0.75rem;
      text-align: center;
    }

    .tab-content {
      align-items: center;
    }

    .tab-title {
      font-size: 0.875rem;
    }
  }
</style>
