/**
 * Subscribes to flows-auth's core locale observability (src/core/utils/i18n.ts's
 * subscribeToLocale/getLocale) via useSyncExternalStore.
 *
 * A component calling this re-renders on locale change, and React's re-render
 * cascades to every descendant -- so calling it once near the root (see
 * AuthProvider in context.tsx) is enough to make every `m['key']()` call
 * anywhere in the tree pick up the new locale, with no change needed at those
 * call sites. Returns the current locale string, but the return value doesn't
 * need to be used for that cascade to work.
 */
import { useSyncExternalStore } from 'react';
import { getLocale, type Locale, subscribeToLocale } from '../../core/index.js';

export function useLocale(): Locale {
  return useSyncExternalStore(subscribeToLocale, getLocale);
}
