/**
 * Internationalization utilities for flows-auth
 * Provides translation support with configurable overrides and fallbacks
 */

import * as messages from '../paraglide/messages';

let appMessages: { [key: string]: (vars?: object) => string } | null = null;
export function setI18nMessages(messages: { [key: string]: (vars?: object) => string }) {
  appMessages = messages;
}

export const m = new Proxy(
  {},
  {
    get: (target, key) => {
      return (vars?: object) => {
        const libraryMessages: { [key: string]: (vars?: object) => string } = messages;
        const appMessage = appMessages?.[key as string];
        const libraryMessage = libraryMessages[key as string];

        if (appMessage) {
          return appMessage(vars);
        }
        if (libraryMessage) {
          return libraryMessage(vars);
        }
        return key as string; // Fallback to key if no message found
      };
    }
  }
);
