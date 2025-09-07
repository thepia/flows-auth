<!--
  CodeInput - Dedicated input component for verification codes
  Features: numeric input optimization, proper formatting, validation
-->
<script lang="ts">
import { createEventDispatcher } from 'svelte';
import type { Readable } from 'svelte/store';
import type { TranslationKey } from '../../utils/i18n';

// Props
export let value = '';
export let placeholder: TranslationKey | '' = '';
export let disabled = false;
export let required = true;
export let error: string | null = null;
export let label: TranslationKey | '' = '';
export let showLabel = true;
export let maxlength = 6;
export let className = '';
export let i18n: Readable<(key: TranslationKey, variables?: Record<string, any>) => string>;

// Events
const dispatch = createEventDispatcher<{
  change: { value: string };
  focus: { value: string };
  blur: { value: string };
}>();

// Handle input changes
function handleInput(event: Event) {
  const target = event.target as HTMLInputElement;
  // Only allow numeric input
  const numericValue = target.value.replace(/[^0-9]/g, '');
  value = numericValue;
  target.value = numericValue;
  
  // Dispatch immediate change
  dispatch('change', { value });
}

function handleFocus(event: Event) {
  const target = event.target as HTMLInputElement;
  dispatch('focus', { value: target.value });
}

function handleBlur(event: Event) {
  const target = event.target as HTMLInputElement;
  dispatch('blur', { value: target.value });
}

function getInputClasses(): string {
  const baseClasses = "input-brand text-center text-lg font-mono tracking-widest";
  if (error) {
    return `${baseClasses} error`;
  }
  return baseClasses;
}

// Reactive values for i18n
$: displayPlaceholder = $i18n(placeholder || 'code.placeholder');
$: displayLabel = $i18n(label || 'code.label');
</script>

<div class="space-y-2 {className}">
  {#if showLabel}
    <label for="code-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
      {displayLabel}
    </label>
  {/if}
  
  <input
    id="code-input"
    type="text"
    class="w-full {getInputClasses()}"
    bind:value
    on:input={handleInput}
    on:focus={handleFocus}
    on:blur={handleBlur}
    placeholder={displayPlaceholder}
    {disabled}
    {required}
    {maxlength}
    autocomplete="one-time-code"
    inputmode="numeric"
    pattern="[0-9]*"
  />
  
  {#if error}
    <div class="text-sm mt-1 text-semantic-error-600" role="alert">
      {error}
    </div>
  {/if}
</div>

<style>
  label {
    color: var(--color-text-secondary);
  }
</style>