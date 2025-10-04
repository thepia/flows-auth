<script lang="ts">
  import type { ComponentType } from 'svelte';

  // Props
  export let icon: ComponentType;
  export let size: number | string = 24;
  export let color: string = 'currentColor';
  export let variant: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'muted' = 'primary';
  export let weight: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone' = 'regular';
  export let className: string = '';
  export let interactive: boolean = false;
  export let ariaLabel: string = '';
  
  // CSS variable mapping for consistent theming
  const colorMap = {
    primary: 'var(--icon-color-primary, var(--color-brand-primary, #988ACA))',
    secondary: 'var(--icon-color-secondary, var(--color-brand-secondary, #4A90A4))', 
    accent: 'var(--icon-color-accent, var(--color-brand-accent, #F7931E))',
    success: 'var(--icon-color-success, var(--color-brand-success, #38A169))',
    warning: 'var(--icon-color-warning, var(--color-brand-warning, #D69E2E))',
    error: 'var(--icon-color-error, var(--color-brand-error, #E53E3E))',
    muted: 'var(--icon-color-muted, var(--color-text-muted, #6b7280))'
  };
  
  // Size mapping for consistent sizing
  const sizeMap = {
    xs: 'var(--icon-size-xs, 12px)',
    sm: 'var(--icon-size-sm, 16px)',
    md: 'var(--icon-size-md, 20px)',
    lg: 'var(--icon-size-lg, 24px)',
    xl: 'var(--icon-size-xl, 32px)',
    '2xl': 'var(--icon-size-2xl, 48px)'
  };
  
  // Reactive computed values
  $: iconColor = color === 'currentColor' ? colorMap[variant] : color;
  $: iconSize = typeof size === 'string' && size in sizeMap 
    ? sizeMap[size as keyof typeof sizeMap]
    : typeof size === 'number' ? `${size}px` : size;
  
  // Build CSS classes
  $: cssClasses = [
    'thepia-icon',
    interactive && 'thepia-icon--interactive',
    className
  ].filter(Boolean).join(' ');
</script>

<svelte:component
  this={icon}
  size={iconSize}
  color={iconColor}
  weight={weight}
  class={cssClasses}
  style="--icon-size: {iconSize}; --icon-color: {iconColor};"
  aria-label={ariaLabel}
  role={ariaLabel ? 'img' : undefined}
  {...$$restProps}
/>

<style>
  :global(.thepia-icon) {
    width: var(--icon-size);
    height: var(--icon-size);
    color: var(--icon-color);
    transition: var(--icon-transition, all 0.2s ease);
    flex-shrink: 0;
    display: inline-block;
  }
  
  :global(.thepia-icon--interactive) {
    cursor: pointer;
  }
  
  :global(.thepia-icon--interactive:hover) {
    transform: scale(var(--icon-hover-scale, 1.05));
  }
  
  :global(.thepia-icon--interactive:active) {
    transform: scale(var(--icon-active-scale, 0.95));
  }
  
  /* Focus styles for accessibility */
  :global(.thepia-icon--interactive:focus) {
    outline: 2px solid var(--icon-color-primary);
    outline-offset: 2px;
    border-radius: var(--radius-sm, 2px);
  }
  
  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    :global(.thepia-icon) {
      transition: none;
    }
    
    :global(.thepia-icon--interactive:hover),
    :global(.thepia-icon--interactive:active) {
      transform: none;
    }
  }
</style>
