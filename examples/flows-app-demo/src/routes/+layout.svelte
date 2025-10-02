<script lang="ts">
  import './app.css';
  import '../branding/design-tokens.css';
  import { browser, dev } from '$app/environment';
  import { onMount } from 'svelte';
  import { initializeAuth } from '@thepia/flows-auth/global-auth-store';

  // Initialize console bridge and error reporting in development
  if (browser && dev) {
    import('$lib/dev/console-bridge');
  }

  onMount(async () => {
    if (browser) {
      try {
        // Initialize global auth store first
        initializeAuth({
          apiBaseUrl: 'https://dev.thepia.com:8443',
          clientId: 'demo',
          domain: 'dev.thepia.net',
          enablePasskeys: true,
          enableMagicLinks: false,
          appCode: 'demo'
        });
        console.log('🔐 Global auth store initialized in layout');

        if (dev) {
          // Initialize error reporting
          const { initializeFlowsErrorReporting, enableGlobalErrorReporting } = await import('../lib/config/errorReporting.js');
          await initializeFlowsErrorReporting();
          enableGlobalErrorReporting();
          console.log('🔧 Flows App Demo initialized with error reporting');
        }
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