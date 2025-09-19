/**
 * Paraglide JS i18n utilities for flows-auth
 * Provides compile-time type-safe translation support
 */

import { getContext, setContext } from 'svelte';
import { type Readable, derived, writable } from 'svelte/store';
import * as m from '../paraglide/messages.js';
import { type Locale, getLocale, setLocale } from '../paraglide/runtime.js';

// Re-export Paraglide types and utilities
export { setLocale, getLocale, type Locale } from '../paraglide/runtime.js';
export { m };

// Type for all available message functions
export type MessageFunction = keyof typeof m;

// Template variable replacement for messages that support parameters
function interpolate(template: string, variables: Record<string, any> = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return variables[key]?.toString() || match;
  });
}

/**
 * Create a Paraglide-based i18n instance
 */
export function createParaglideI18n(initialLocale: Locale = 'en') {
  // Set initial locale
  setLocale(initialLocale);

  // Current language store (reactive)
  const currentLanguage = writable<Locale>(getLocale());

  // Update store when locale changes
  const updateLanguageStore = () => {
    currentLanguage.set(getLocale());
  };

  // Main translation function - uses Paraglide message functions
  const t = derived(currentLanguage, ($lang) => {
    return (messageKey: MessageFunction, variables?: Record<string, any>): string => {
      try {
        // Get the message function from Paraglide
        const messageFunction = m[messageKey];
        if (typeof messageFunction !== 'function') {
          console.warn(`[Paraglide i18n] Message function not found: ${messageKey}`);
          return messageKey;
        }

        // Prepare inputs for the message function
        // Some Paraglide functions require specific parameters
        const inputs = variables || {};

        // Call the message function with current locale and inputs
        // Use type assertion to handle Paraglide's strict typing
        let result = (messageFunction as unknown as (inputs: any, options: any) => string)(inputs, {
          locale: $lang
        });

        // Apply additional template variable substitution if needed
        // (for cases where Paraglide doesn't handle all variables)
        if (variables && typeof result === 'string') {
          result = interpolate(result, variables);
        }

        return result;
      } catch (error) {
        console.error(`[Paraglide i18n] Error translating ${messageKey}:`, error);
        // Return a fallback that includes the key for debugging
        return `[${messageKey}]`;
      }
    };
  });

  return {
    // Main translation function
    t: derived(t, ($t) => $t),

    // Current language (reactive)
    currentLanguage: derived(currentLanguage, ($lang) => $lang),

    // Language management
    setLanguage: (lang: Locale) => {
      setLocale(lang);
      updateLanguageStore();
    },

    // Get current language code
    getLanguage: (): Locale => {
      return getLocale();
    },

    // Direct access to message functions for advanced usage
    messages: m
  };
}

// Global i18n context for app-wide configuration
const PARAGLIDE_I18N_CONTEXT_KEY = 'flows-auth-paraglide-i18n';

/**
 * Set global Paraglide i18n context for the entire app
 * Call this once at the root of your app
 */
export function setParaglideI18nContext(config: {
  language?: Locale;
}) {
  const i18n = createParaglideI18n(config.language || 'en');
  setContext(PARAGLIDE_I18N_CONTEXT_KEY, i18n);
  return i18n;
}

/**
 * Get Paraglide i18n from context or create a default instance
 * Components should use this to get i18n configuration
 */
export function getParaglideI18n(config?: {
  language?: Locale;
}) {
  // Try to get from context first (app-wide configuration)
  const contextI18n = getContext<ReturnType<typeof createParaglideI18n>>(
    PARAGLIDE_I18N_CONTEXT_KEY
  );
  if (contextI18n) {
    // If config is provided, update the context i18n
    if (config?.language) {
      contextI18n.setLanguage(config.language);
    }
    return contextI18n;
  }

  // No context, create instance from config or defaults
  return createParaglideI18n(config?.language || 'en');
}

/**
 * Detect user's preferred language from browser
 */
export function detectUserLanguage(
  supportedLanguages: Locale[] = ['en', 'da'],
  defaultLanguage: Locale = 'en'
): Locale {
  // Browser language detection
  if (typeof navigator !== 'undefined') {
    const browserLangs = navigator.languages || [
      navigator.language || (navigator as unknown as { userLanguage?: string }).userLanguage
    ];

    for (const browserLang of browserLangs) {
      const lang = browserLang.toLowerCase().split('-')[0] as Locale;
      if (supportedLanguages.includes(lang)) {
        return lang;
      }
    }
  }

  return defaultLanguage;
}

/**
 * Utility to get supported languages list
 */
export function getSupportedLanguages(): Locale[] {
  return ['en', 'da']; // From Paraglide runtime
}

/**
 * Check if a language is supported
 */
export function isLanguageSupported(language: string): language is Locale {
  const normalized = language.toLowerCase().split('-')[0];
  return ['en', 'da'].includes(normalized as Locale);
}

/**
 * Migration helper: Convert svelte-i18n keys to Paraglide message function names
 */
export function convertLegacyKey(svelteI18nKey: string): MessageFunction {
  return svelteI18nKey.replace(/\./g, '_') as MessageFunction;
}

/**
 * Migration helper: Get all available message keys for debugging
 */
export function getAvailableMessageKeys(): MessageFunction[] {
  return Object.keys(m) as MessageFunction[];
}
