<script>
  import { currentVariant, variantMetadata, switchTranslationVariant } from '../stores/translation-variants.js';
  
  let isOpen = false;
  let dropdownElement;
  
  // Handle variant selection
  function selectVariant(variant) {
    switchTranslationVariant(variant);
    isOpen = false;
  }
  
  // Close dropdown when clicking outside
  function handleClickOutside(event) {
    if (dropdownElement && !dropdownElement.contains(event.target)) {
      isOpen = false;
    }
  }
  
  // Toggle dropdown
  function toggleDropdown() {
    isOpen = !isOpen;
  }
  
  // Get current variant metadata
  $: currentMeta = variantMetadata[$currentVariant] || variantMetadata.standard;
</script>

<svelte:window on:click={handleClickOutside} />

<div class="translation-variant-selector" bind:this={dropdownElement}>
  <button 
    class="variant-button"
    on:click={toggleDropdown}
    aria-label="Select translation variant"
    aria-expanded={isOpen}
  >
    <span class="variant-icon">{currentMeta.icon}</span>
    <span class="variant-name">{currentMeta.name}</span>
    <svg 
      class="dropdown-arrow" 
      class:rotated={isOpen}
      width="12" 
      height="12" 
      viewBox="0 0 12 12" 
      fill="currentColor"
    >
      <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </button>
  
  {#if isOpen}
    <div class="variant-dropdown">
      <div class="dropdown-header">
        <span class="dropdown-title">Translation Style</span>
        <span class="dropdown-subtitle">Demo purposes only</span>
      </div>
      
      {#each Object.entries(variantMetadata) as [key, meta]}
        <button
          class="variant-option"
          class:active={$currentVariant === key}
          on:click={() => selectVariant(key)}
        >
          <span class="option-icon">{meta.icon}</span>
          <div class="option-content">
            <span class="option-name">{meta.name}</span>
            <span class="option-description">{meta.description}</span>
          </div>
          {#if $currentVariant === key}
            <svg class="check-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
            </svg>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .translation-variant-selector {
    position: relative;
    display: inline-block;
    z-index: 1001; /* Ensure parent has z-index context */
  }
  
  .variant-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: var(--surface-primary, white);
    border: 1px solid var(--border-color, #e2e8f0);
    border-radius: 0.5rem;
    font-size: 0.875rem;
    color: var(--text-primary, #1a202c);
    cursor: pointer;
    transition: all 0.2s;
    min-width: 120px;
  }
  
  .variant-button:hover {
    background: var(--surface-secondary, #f8fafc);
    border-color: var(--border-hover, #cbd5e0);
  }
  
  .variant-icon {
    font-size: 1rem;
  }
  
  .variant-name {
    font-weight: 500;
  }
  
  .dropdown-arrow {
    margin-left: auto;
    transition: transform 0.2s;
    color: var(--text-secondary, #64748b);
  }
  
  .dropdown-arrow.rotated {
    transform: rotate(180deg);
  }
  
  .variant-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 0.25rem;
    background: var(--surface-primary, white);
    border: 1px solid var(--border-color, #e2e8f0);
    border-radius: 0.75rem;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    z-index: 10000;
    min-width: 240px;
    overflow: hidden;
    /* Ensure dropdown appears above all content */
    isolation: isolate;
    transform: translateZ(0);
  }
  
  .dropdown-header {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border-light, #f1f5f9);
    background: var(--surface-secondary, #f8fafc);
  }
  
  .dropdown-title {
    display: block;
    font-weight: 600;
    font-size: 0.875rem;
    color: var(--text-primary, #1a202c);
  }
  
  .dropdown-subtitle {
    display: block;
    font-size: 0.75rem;
    color: var(--text-secondary, #64748b);
    margin-top: 0.125rem;
  }
  
  .variant-option {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    padding: 0.75rem 1rem;
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .variant-option:hover {
    background: var(--surface-secondary, #f8fafc);
  }
  
  .variant-option.active {
    background: var(--primary-light, #eff6ff);
    color: var(--primary, #2563eb);
  }
  
  .option-icon {
    font-size: 1.125rem;
    flex-shrink: 0;
  }
  
  .option-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }
  
  .option-name {
    font-weight: 500;
    font-size: 0.875rem;
  }
  
  .option-description {
    font-size: 0.75rem;
    color: var(--text-secondary, #64748b);
  }
  
  .variant-option.active .option-description {
    color: var(--primary-dark, #1d4ed8);
  }
  
  .check-icon {
    flex-shrink: 0;
    color: var(--primary, #2563eb);
  }
  
  /* Mobile responsive */
  @media (max-width: 640px) {
    .variant-dropdown {
      right: auto;
      left: 0;
      min-width: 200px;
    }
    
    .variant-button {
      min-width: 100px;
    }
    
    .variant-name {
      display: none;
    }
  }
</style>
