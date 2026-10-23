/**
 * Svelte-specific Paraglide helpers that aren't covered by the reactive locale
 * primitive itself (see locale.ts + core/utils/i18n.ts's subscribeToLocale).
 */
import type { Locale } from '@thepia/flows-auth';

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
