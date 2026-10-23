/**
 * Reactive Svelte store wrapping flows-auth's core locale observability
 * (src/core/utils/i18n.ts's subscribeToLocale/getLocale). No bespoke Svelte-only
 * i18n machinery here -- just the thinnest possible adapter, matching
 * src/react/hooks/useLocale.ts on the React side.
 *
 * Svelte doesn't cascade re-renders from a parent to its children the way React
 * does, so subscribing at one point isn't enough by itself -- pair this with
 * `{#key $locale}` wrapping your app's content at the root layout to force the
 * whole subtree to re-run on locale change, so every `m['key']()` call anywhere
 * under it picks up the new locale with no change needed at that call site.
 */

import { getLocale, subscribeToLocale } from '@thepia/flows-auth';
import { readable } from 'svelte/store';

export const locale = readable(getLocale(), (set) => {
  return subscribeToLocale(() => set(getLocale()));
});
