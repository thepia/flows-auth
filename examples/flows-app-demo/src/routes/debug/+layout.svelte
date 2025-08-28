<script lang="ts">
import { browser } from '$app/environment';
import { onMount } from 'svelte';

let showBackButton = true;

onMount(() => {
  if (browser) {
    // Show back button for all debug pages
    showBackButton = $page.url.pathname.startsWith('/debug');
  }
});

function goBack() {
  if (browser) {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  }
}
</script>

<svelte:head>
  <title>Debug Tools - Flows Auth Demo</title>
</svelte:head>

<div class="debug-layout">
  {#if showBackButton}
    <div class="debug-nav">
      <button on:click={goBack} class="back-btn">
        ← Back to Demo
      </button>
      <div class="debug-badge">
        🛠️ Debug Mode
      </div>
    </div>
  {/if}
  
  <slot />
</div>

<style>
  .debug-layout {
    min-height: 100vh;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  }

  .debug-nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .back-btn {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    transition: background-color 0.2s;
  }

  .back-btn:hover {
    background: #2563eb;
  }

  .debug-badge {
    background: #fef3c7;
    color: #92400e;
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    font-size: 0.75rem;
    font-weight: 600;
    border: 1px solid #fbbf24;
  }
</style>