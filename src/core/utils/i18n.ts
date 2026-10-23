/**
 * Internationalization utilities for flows-auth
 * Provides translation support with configurable overrides and fallbacks
 */

import * as messages from '../paraglide/messages.js';
import { setLocale } from '../paraglide/runtime.js';

// Minimal, framework-agnostic observability for locale changes. Paraglide's own
// getLocale()/setLocale() (imported above) have none -- setLocale() just mutates
// a module-level variable/cookie/localStorage with no way for anything to know
// it happened. React/Svelte adapters build on this rather than each
// reimplementing their own reactive locale store; see
// src/react/hooks/useLocale.ts and src/svelte/locale.ts.
const localeListeners = new Set<() => void>();

/** Change the locale and notify every subscriber (see subscribeToLocale). */
export function setLocaleReactive(locale: Parameters<typeof setLocale>[0]): void {
  setLocale(locale, { reload: false });
  for (const listener of localeListeners) {
    listener();
  }
}

/** Subscribe to locale changes made via setLocaleReactive(). Returns an unsubscribe function. */
export function subscribeToLocale(listener: () => void): () => void {
  localeListeners.add(listener);
  return () => {
    localeListeners.delete(listener);
  };
}

type MessageFn = (vars?: Record<string, unknown>, options?: { locale?: string }) => string;

let appMessages: { [key: string]: MessageFn } | null = null;
export function setI18nMessages(messages: { [key: string]: MessageFn }) {
  appMessages = messages;
}

export const m = new Proxy({} as Record<string, MessageFn>, {
  has(_target, key) {
    const libraryMessages = messages as unknown as { [key: string]: MessageFn };
    return key in libraryMessages || (appMessages && key in appMessages) || false;
  },
  get(_target, key) {
    return (vars?: Record<string, unknown>, options?: { locale?: string }) => {
      const libraryMessages = messages as unknown as { [key: string]: MessageFn };
      const appMessage = appMessages?.[key as string];
      const libraryMessage = libraryMessages[key as string];

      if (appMessage) {
        return appMessage(vars, options);
      }
      if (libraryMessage) {
        return libraryMessage(vars, options);
      }
      return key as string; // Fallback to key if no message found
    };
  }
});
