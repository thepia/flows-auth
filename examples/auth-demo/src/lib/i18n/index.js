import { browser } from '$app/environment';
import { init, register } from 'svelte-i18n';

const defaultLocale = 'en';

// Register locales
register('en', () => import('./locales/en.json'));
register('es', () => import('./locales/es.json'));
register('fr', () => import('./locales/fr.json'));
register('de', () => import('./locales/de.json'));
register('da', () => import('./locales/da.json'));

// Initialize svelte-i18n
init({
  fallbackLocale: defaultLocale,
  initialLocale: browser ? window.navigator.language.split('-')[0] : defaultLocale,
});
