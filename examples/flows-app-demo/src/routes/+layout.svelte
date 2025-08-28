<script lang="ts">
import './app.css';
import '../branding/design-tokens.css';
import { browser, dev } from '$app/environment';
import { onMount } from 'svelte';

// Initialize console bridge and error reporting in development
if (browser && dev) {
  import('$lib/dev/console-bridge');
}

onMount(async () => {
  if (browser && dev) {
    try {
      // Initialize error reporting first
      const { initializeFlowsErrorReporting, enableGlobalErrorReporting } = await import(
        '../lib/config/errorReporting.js'
      );
      await initializeFlowsErrorReporting();
      enableGlobalErrorReporting();

      console.log('🔧 Flows App Demo initialized with error reporting');
    } catch (error) {
      console.error('❌ Failed to initialize flows app demo:', error);
    }
  }
});
</script>

<main>
  <slot />
</main>

<style>
  main {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
</style>