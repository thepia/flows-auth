/**
 * Internationalization utilities for flows-auth
 * Provides translation support with configurable overrides and fallbacks
 */

import { writable, derived, type Readable } from 'svelte/store';

// Default translations for auth components
export const defaultTranslations = {
  en: {
    // Email input
    'email.label': 'Email address',
    'email.placeholder': 'your.email@company.com',
    'email.invalid': 'Please enter a valid email address',
    'email.required': 'Email address is required',
    
    // Authentication buttons  
    'auth.signIn': 'Sign In',
    'auth.signInWithPasskey': 'Sign in with Passkey',
    'auth.sendPinByEmail': 'Send pin by email',
    'auth.enterExistingPin': 'Enter existing pin',
    'auth.sendMagicLink': 'Send Magic Link',
    'auth.loading': 'Loading...',
    'auth.signingIn': 'Signing in...',
    'auth.sendingPin': 'Sending pin...',
    'auth.verifyingPin': 'Verifying pin...',
    'auth.sendingMagicLink': 'Sending magic link...',
    
    // PIN/Code input
    'code.label': 'Enter verification code',
    'code.placeholder': '6-digit code',
    'code.invalid': 'Please enter a valid 6-digit code',
    'code.expired': 'Verification code has expired',
    'code.incorrect': 'Incorrect verification code',
    
    // Status messages
    'status.emailSent': 'We sent a verification code to',
    'status.checkEmail': 'Check your email',
    'status.pinValid': 'A valid pin was already sent to you, good for {minutes} minute{s}.',
    'status.pinDirectAction': 'Enter pin here',
    'status.pinDetected': '🔢 Valid pin detected',
    'status.signInSuccess': 'Welcome back!',
    'status.magicLinkSent': 'We sent a secure login link to',
    
    // Errors
    'error.network': 'Network error. Please try again.',
    'error.authentication': 'Authentication failed. Please try again.',
    'error.userNotFound': 'No account found with this email address',
    'error.invalidCredentials': 'Invalid email or authentication failed',
    'error.serviceUnavailable': 'Service is temporarily unavailable',
    'error.unknown': 'An unexpected error occurred',
    
    // WebAuthn
    'webauthn.ready': '🔐 WebAuthn ready - Touch ID/Face ID will appear automatically',
    'webauthn.touchId': 'Touch ID',
    'webauthn.faceId': 'Face ID',
    'webauthn.cancelled': 'Authentication was cancelled',
    'webauthn.notSupported': 'WebAuthn is not supported on this device',
    
    // General actions
    'action.retry': 'Try again',
    'action.back': 'Back',
    'action.continue': 'Continue',
    'action.cancel': 'Cancel',
    'action.useDifferentEmail': 'Use a different email',
    
    // Registration/Terms
    'registration.required': 'Registration is required. Please complete the registration process.',
    'terms.acceptRequired': 'You must accept the terms of service',
    'privacy.acceptRequired': 'You must accept the privacy policy',
    'registration.terms': 'I accept the {companyName} Terms of Service',
    'registration.privacy': 'I accept the {companyName} Privacy Policy',
    'registration.completing': 'Completing registration...',
    
    // Time formatting
    'time.minute': 'minute',
    'time.minutes': 'minutes',
    'time.second': 'second', 
    'time.seconds': 'seconds'
  },
  es: {
    // Email input
    'email.label': 'Dirección de correo electrónico',
    'email.placeholder': 'tu.correo@empresa.com',
    'email.invalid': 'Por favor ingresa una dirección de correo válida',
    'email.required': 'La dirección de correo es obligatoria',
    
    // Authentication buttons  
    'auth.signIn': 'Iniciar Sesión',
    'auth.signInWithPasskey': 'Iniciar sesión con Passkey',
    'auth.sendPinByEmail': 'Enviar pin por correo',
    'auth.enterExistingPin': 'Ingresar pin existente',
    'auth.sendMagicLink': 'Enviar Enlace Mágico',
    'auth.loading': 'Cargando...',
    'auth.signingIn': 'Iniciando sesión...',
    'auth.sendingPin': 'Enviando pin...',
    'auth.verifyingPin': 'Verificando pin...',
    'auth.sendingMagicLink': 'Enviando enlace mágico...',
    
    // PIN/Code input
    'code.label': 'Ingresa el código de verificación',
    'code.placeholder': 'Código de 6 dígitos',
    'code.invalid': 'Por favor ingresa un código válido de 6 dígitos',
    'code.expired': 'El código de verificación ha expirado',
    'code.incorrect': 'Código de verificación incorrecto',
    
    // Status messages
    'status.emailSent': 'Enviamos un código de verificación a',
    'status.checkEmail': 'Revisa tu correo electrónico',
    'status.pinValid': 'Ya se envió un pin válido, válido por {minutes} minuto{s}.',
    'status.pinDirectAction': 'Ingresar pin aquí',
    'status.pinDetected': '🔢 Pin válido detectado',
    'status.signInSuccess': '¡Bienvenido de vuelta!',
    'status.magicLinkSent': 'Enviamos un enlace seguro de inicio de sesión a',
    
    // Errors
    'error.network': 'Error de red. Por favor intenta de nuevo.',
    'error.authentication': 'Autenticación fallida. Por favor intenta de nuevo.',
    'error.userNotFound': 'No se encontró cuenta con esta dirección de correo',
    'error.invalidCredentials': 'Correo inválido o autenticación fallida',
    'error.serviceUnavailable': 'Servicio temporalmente no disponible',
    'error.unknown': 'Ocurrió un error inesperado',
    
    // WebAuthn
    'webauthn.ready': '🔐 WebAuthn listo - Touch ID/Face ID aparecerá automáticamente',
    'webauthn.touchId': 'Touch ID',
    'webauthn.faceId': 'Face ID',
    'webauthn.cancelled': 'Autenticación cancelada',
    'webauthn.notSupported': 'WebAuthn no es compatible con este dispositivo',
    
    // General actions
    'action.retry': 'Intentar de nuevo',
    'action.back': 'Volver',
    'action.continue': 'Continuar',
    'action.cancel': 'Cancelar',
    'action.useDifferentEmail': 'Usar un correo diferente',
    
    // Registration/Terms
    'registration.required': 'Se requiere registro. Por favor completa el proceso de registro.',
    'terms.acceptRequired': 'Debes aceptar los términos de servicio',
    'privacy.acceptRequired': 'Debes aceptar la política de privacidad',
    'registration.terms': 'Acepto los Términos de Servicio de {companyName}',
    'registration.privacy': 'Acepto la Política de Privacidad de {companyName}',
    'registration.completing': 'Completando registro...',
    
    // Time formatting
    'time.minute': 'minuto',
    'time.minutes': 'minutos',
    'time.second': 'segundo', 
    'time.seconds': 'segundos'
  }
} as const;

// Type for supported languages (extensible)
export type SupportedLanguage = keyof typeof defaultTranslations;

// Type for all translation keys
export type TranslationKey = keyof typeof defaultTranslations.en;

// Custom translations interface - allows partial overrides
export type CustomTranslations = Partial<Record<TranslationKey, string>>;

// Template variable replacement
function interpolate(template: string, variables: Record<string, any> = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return variables[key]?.toString() || match;
  });
}

/**
 * Create an i18n instance with language and custom translations
 */
export function createI18n(
  language: string = 'en',
  customTranslations: CustomTranslations = {},
  fallbackLanguage: SupportedLanguage = 'en'
) {
  // Validate and normalize language
  const normalizedLang = (language.toLowerCase().split('-')[0]) as SupportedLanguage;
  const currentLanguage = writable<SupportedLanguage>(
    normalizedLang in defaultTranslations ? normalizedLang : fallbackLanguage
  );
  
  // Store for custom translations (reactive)
  const customTransStore = writable<CustomTranslations>(customTranslations);
  
  // Main translation function
  const t = derived(
    [currentLanguage, customTransStore],
    ([$lang, $custom]) => {
      return (key: TranslationKey, variables?: Record<string, any>): string => {
        // Priority: custom translations > language defaults > fallback language > key
        let translation = $custom[key] || 
                         defaultTranslations[$lang]?.[key] ||
                         defaultTranslations[fallbackLanguage]?.[key] ||
                         key;
        
        // Apply template variable substitution
        if (variables && typeof translation === 'string') {
          translation = interpolate(translation, variables);
        }
        
        return translation;
      };
    }
  );
  
  return {
    // Main translation function
    t: derived(t, ($t) => $t),
    
    // Current language (reactive)
    currentLanguage: derived(currentLanguage, ($lang) => $lang),
    
    // Language management
    setLanguage: (lang: string) => {
      const normalized = (lang.toLowerCase().split('-')[0]) as SupportedLanguage;
      if (normalized in defaultTranslations) {
        currentLanguage.set(normalized);
      }
    },
    
    // Add or update custom translations
    addTranslations: (translations: CustomTranslations) => {
      customTransStore.update(current => ({ ...current, ...translations }));
    },
    
    // Set all custom translations (replaces existing)
    setTranslations: (translations: CustomTranslations) => {
      customTransStore.set(translations);
    },
    
    // Get current language code
    getLanguage: () => {
      let lang: SupportedLanguage;
      currentLanguage.subscribe(l => lang = l)();
      return lang!;
    }
  };
}

/**
 * Detect user's preferred language from various sources
 */
export function detectUserLanguage(
  supportedLanguages: SupportedLanguage[] = ['en'],
  defaultLanguage: SupportedLanguage = 'en'
): SupportedLanguage {
  // 1. Browser language detection (most reliable for components)
  if (typeof navigator !== 'undefined') {
    const browserLangs = navigator.languages || [navigator.language || (navigator as any).userLanguage];
    
    for (const browserLang of browserLangs) {
      const lang = browserLang.toLowerCase().split('-')[0] as SupportedLanguage;
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
export function getSupportedLanguages(): SupportedLanguage[] {
  return Object.keys(defaultTranslations) as SupportedLanguage[];
}

/**
 * Check if a language is supported
 */
export function isLanguageSupported(language: string): language is SupportedLanguage {
  const normalized = language.toLowerCase().split('-')[0];
  return normalized in defaultTranslations;
}