<script>
  import { Globe } from 'phosphor-svelte';
  import { setLocaleReactive } from '@thepia/flows-auth';
  import { locale } from '@thepia/flows-auth/svelte';

  // `locale` is a plain Svelte store wrapping flows-auth's core locale
  // observability -- no bespoke context object, no manual sync. Pairs with
  // `{#key $locale}` in +layout.svelte, which is what actually makes the rest
  // of the app's `m['key']()` calls pick up the change; this component only
  // needs to read the current value and call setLocaleReactive() to change it.
  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'da', name: 'Dansk', flag: '🇩🇰' }
  ];

  let isOpen = $state(false);
  let activeLanguage = $derived(languages.find(lang => lang.code === $locale) || languages[0]);

  function selectLanguage(language) {
    setLocaleReactive(language.code);
    // Remember this as an explicit user choice so +layout.svelte's
    // browser-detection on the next load/reload doesn't overwrite it.
    localStorage.setItem('flows-auth-locale-choice', language.code);
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

<svelte:window onclick={handleClickOutside} />

<div class="language-selector">
  <button 
    class="language-button"
    onclick={toggleDropdown}
    aria-label="Select language"
    aria-expanded={isOpen}
  >
    <Globe size={16} />
    <span class="current-language">
      <span class="flag">{activeLanguage.flag}</span>
      <span class="name">{activeLanguage.name}</span>
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
      {#each languages as language (language.code)}
        <button
          class="language-option"
          class:active={language.code === $locale}
          onclick={() => selectLanguage(language)}
        >
          <span class="flag">{language.flag}</span>
          <span class="name">{language.name}</span>
          {#if language.code === $locale}
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
