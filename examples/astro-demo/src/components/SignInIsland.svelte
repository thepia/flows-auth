<script lang="ts">
  import { sharedAuthStore } from '../lib/shared-auth-store';
  import { makeSvelteCompatible } from '@thepia/flows-auth/svelte';
  import { SignInForm } from '@thepia/flows-auth/svelte';

  const auth = makeSvelteCompatible(sharedAuthStore);
</script>

<SignInForm store={auth} />
