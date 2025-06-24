<script lang="ts">
  import './app.css';
  import '../branding/design-tokens.css';
  import { browser, dev } from '$app/environment';
  
  // Initialize console bridge in development
  if (browser && dev) {
    import('$lib/dev/console-bridge');
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