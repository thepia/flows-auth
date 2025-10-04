<script lang="ts">
  import './app.css';
  import '../branding/design-tokens.css';
  import { browser, dev } from '$app/environment';
  import { setupAuthContext } from '@thepia/flows-auth';

  // Initialize console bridge and error reporting in development
  if (browser && dev) {
    import('$lib/dev/console-bridge');
  }

  // Create auth store during initialization
  const authConfig = {
    apiBaseUrl: 'https://dev.thepia.com:8443',
    clientId: 'demo',
    domain: 'dev.thepia.net',
    enablePasskeys: true,
    enableMagicLinks: false,
    errorReporting: {
      enabled: dev, // Only enable in development
      debug: dev
    },
    appCode: 'demo'
  };

  const authStore = setupAuthContext(authConfig);
  console.log('🔐 Auth store initialized in layout');

  // Initialize error reporting if in dev mode
  if (browser && dev) {
    import('../lib/config/errorReporting.js').then(({ initializeFlowsErrorReporting, enableGlobalErrorReporting }) => {
      initializeFlowsErrorReporting();
      enableGlobalErrorReporting();
      console.log('🔧 Flows App Demo initialized with error reporting');
    }).catch(error => {
      console.error('❌ Failed to initialize error reporting:', error);
    });
  }
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