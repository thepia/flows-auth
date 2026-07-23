<!--
  Error Reporting Status Island

  Wraps @thepia/flows-auth's ErrorReportingStatus with the same shared store
  used by the other islands (see AuthHeaderIsland.svelte) — this demo doesn't
  use Svelte context/setupAuthContext, so the store must be passed explicitly
  rather than relying on ErrorReportingStatus's context fallback.
-->
<script lang="ts">
  import { ErrorReportingStatus } from '@thepia/flows-auth/svelte';
  import { makeSvelteCompatible } from '@thepia/flows-auth/svelte';
  import { sharedAuthStore } from '../lib/shared-auth-store';

  const auth = makeSvelteCompatible(sharedAuthStore);
</script>

<ErrorReportingStatus store={auth} />
