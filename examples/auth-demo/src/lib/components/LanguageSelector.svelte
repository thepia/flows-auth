<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { Globe } from 'phosphor-svelte';
  import { baseLocale, setLocale, getLocale } from '../../paraglide/runtime.js';

  // Paraglide language management
  let currentLocale = 'en'; // Default fallback

  // Supported languages (matching Paraglide configuration)
  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'da', name: 'Dansk', flag: '🇩🇰' }
  ];

  let isOpen = false;
  let currentLanguage = languages.find(lang => lang.code === currentLocale) || languages[0];

  // Load current locale from Paraglide on mount
  onMount(() => {
    if (browser) {
      try {
        currentLocale = getLocale();
        currentLanguage = languages.find(lang => lang.code === currentLocale) || languages[0];
        console.log('✅ Language selector initialized with locale:', currentLocale);
      } catch (error) {
        console.warn('⚠️ Failed to get current locale, falling back to base locale:', error);
        currentLocale = baseLocale;
        currentLanguage = languages.find(lang => lang.code === currentLocale) || languages[0];
      }
    }
  });

  // Update current language when locale changes
  $: currentLanguage = languages.find(lang => lang.code === currentLocale) || languages[0];

  // Reactive sync with Paraglide locale changes (e.g., from other components or external changes)
  $: if (browser) {
    try {
      const paraglideLoc = getLocale();
      if (paraglideLoc !== currentLocale) {
        currentLocale = paraglideLoc;
        console.log('🔄 Language selector synced with Paraglide locale:', currentLocale);
      }
    } catch (error) {
      // Ignore errors during reactive updates
    }
  }

  function selectLanguage(language) {
    if (browser) {
      // ✅ Use Paraglide's setLocale function to actually switch language
      setLocale(language.code, { reload: false });

      // Update local component state
      currentLocale = language.code;
      currentLanguage = language;

      // Manual localStorage backup (in case Paraglide localStorage strategy isn't working)
      try {
        localStorage.setItem('PARAGLIDE_LOCALE', language.code);
      } catch (error) {
        console.warn('⚠️ Failed to store locale in localStorage:', error);
      }

      console.log('🌐 Language switched to:', language.code, 'via Paraglide setLocale()');
      console.log('🔍 Current Paraglide locale:', getLocale());
    }
    isOpen = false;
  }

  function toggleDropdown() {
    isOpen = !isOpen;
  }

  function handleClickOutside(event) {
    if (!event.target.closest('.language-selector')) {
      isOpen = false;
    }
  }
</script>

<svelte:window on:click={handleClickOutside} />

<div class="language-selector">
  <button 
    class="language-button"
    on:click={toggleDropdown}
    aria-label="Select language"
    aria-expanded={isOpen}
  >
    <Globe size={16} />
    <span class="current-language">
      <span class="flag">{currentLanguage.flag}</span>
      <span class="name">{currentLanguage.name}</span>
    </span>
    <svg 
      class="chevron" 
      class:rotated={isOpen}
      width="12" 
      height="12" 
      viewBox="0 0 12 12" 
      fill="none"
    >
      <path 
        d="M3 4.5L6 7.5L9 4.5" 
        stroke="currentColor" 
        stroke-width="1.5" 
        stroke-linecap="round" 
        stroke-linejoin="round"
      />
    </svg>
  </button>

  {#if isOpen}
    <div class="language-dropdown">
      {#each languages as language}
        <button
          class="language-option"
          class:active={language.code === currentLocale}
          on:click={() => selectLanguage(language)}
        >
          <span class="flag">{language.flag}</span>
          <span class="name">{language.name}</span>
          {#if language.code === currentLocale}
            <svg class="check" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path 
                d="M13.5 4.5L6 12L2.5 8.5" 
                stroke="currentColor" 
                stroke-width="2" 
                stroke-linecap="round" 
                stroke-linejoin="round"
              />
            </svg>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .language-selector {
    position: relative;
    display: inline-block;
  }

  .language-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.875rem;
  }

  .language-button:hover {
    background: var(--background-muted);
    border-color: var(--primary-color);
  }

  .current-language {
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  .flag {
    font-size: 1rem;
    line-height: 1;
  }

  .name {
    font-weight: 500;
    white-space: nowrap;
  }

  .chevron {
    transition: transform 0.2s ease;
    color: var(--text-secondary);
  }

  .chevron.rotated {
    transform: rotate(180deg);
  }

  .language-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 0.25rem;
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    min-width: 140px;
    overflow: hidden;
  }

  .language-option {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.75rem;
    background: transparent;
    border: none;
    color: var(--text-primary);
    cursor: pointer;
    transition: background-color 0.2s ease;
    font-size: 0.875rem;
    text-align: left;
  }

  .language-option:hover {
    background: var(--background-muted);
  }

  .language-option.active {
    background: var(--primary-color-alpha);
    color: var(--primary-color);
  }

  .language-option .name {
    flex: 1;
    font-weight: 500;
  }

  .check {
    color: var(--primary-color);
    flex-shrink: 0;
  }

  /* Responsive design */
  @media (max-width: 640px) {
    .language-button .name {
      display: none;
    }
    
    .language-dropdown {
      right: auto;
      left: 0;
    }
  }
</style>
