<script lang="ts">
  import './app.css';
  import '../branding/dist/css/tokens.css';
  import '../branding/scenario-themes.css';
  import { browser, dev } from '$app/environment';
  import { setupAuthContext } from '@thepia/flows-auth/svelte';
  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();

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
    privacyPolicyUrl: 'https://thepia.com/app/privacy',
    acceptableUseUrl: 'https://thepia.com/app/acceptable',
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
  {@render children?.()}
</main>

<style>
  main {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
</style>