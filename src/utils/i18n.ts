/**
 * Internationalization utilities for flows-auth
 * Provides translation support with configurable overrides and fallbacks
 */

import { getContext, setContext } from 'svelte';
import { type Readable, derived, writable } from 'svelte/store';

// Default translations for auth components
export const defaultTranslations = {
  en: {
    // Email input
    'email.label': 'Email address',
    'email.placeholder': 'your@email.com',
    'email.invalid': 'Please enter a valid email address',
    'email.required': 'Email address is required',

    // Form titles and descriptions
    'form.signInTitle': 'Sign in to {companyName}',
    'form.signInDescription': 'Use your {companyName} account, or create one.',
    'form.signInGeneric': 'Sign in',
    'form.signInGenericDescription': 'Enter your email to continue to {companyName}',

    // Authentication buttons
    'auth.signIn': 'Sign In',
    'auth.signInWithPasskey': 'Sign in with Passkey',
    'auth.continueWithTouchId': 'Continue with Touch ID',
    'auth.continueWithFaceId': 'Continue with Face ID',
    'auth.continueWithBiometric': 'Continue with Touch ID/Face ID',
    'auth.continueWithTouchIdFaceId': 'Continue with Touch ID/Face ID',

    // Email authentication - AppCode vs Magic Link variants
    'auth.sendPinByEmail': 'Send pin by email',
    'auth.sendPinToEmail': 'Send pin to email',
    'auth.sendMagicLink': 'Send Magic Link',
    'auth.loading': 'Loading...',
    'auth.signingIn': 'Signing in...',
    'auth.sendingPin': 'Sending pin...',
    'auth.sendingMagicLink': 'Sending magic link...',

    // PIN/Code input
    'code.label': 'Enter verification code',
    'code.placeholder': '6-digit code',
    'code.invalid': 'Please enter a valid 6-digit code',
    'code.expired': 'Verification code has expired',
    'code.incorrect': 'Incorrect verification code',
    'code.verify': 'Verify Code',
    'code.verifying': 'Verifying...',

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

    // Auth state messages
    'auth.onlyRegisteredUsers':
      'Only registered users can sign in. Please contact support if you need access.',
    'auth.fullName': 'Full Name',
    'auth.fullNamePlaceholder': 'Enter your full name',
    'auth.newUserTermsNotice':
      'As a new user you will have to review and confirm the terms of service after signing-in via e-mail.',
    'auth.signedInSuccess': 'Successfully signed in!',

    // WebAuthn
    'webauthn.ready': '🔐 WebAuthn ready - Touch ID/Face ID will appear automatically',
    'webauthn.touchId': 'Touch ID',
    'webauthn.faceId': 'Face ID',
    'webauthn.cancelled': 'Authentication was cancelled',
    'webauthn.notSupported': 'WebAuthn is not supported on this device',

    // Security explanation messages
    'security.passwordlessExplanation':
      '🔐 {companyName} uses passwordless authentication with biometric passkeys or secure email links for enhanced security and convenience.',
    'security.passwordlessGeneric':
      '🔐 Passwordless authentication with biometric passkeys or secure email links for enhanced security and convenience.',
    'security.passwordlessWithPin':
      '🔐 {companyName} uses passwordless authentication with biometric passkeys or secure email pins for enhanced security and convenience.',
    'security.passwordlessWithPinGeneric':
      '🔐 Passwordless authentication with biometric passkeys or secure email pins for enhanced security and convenience.',

    // General actions
    'action.retry': 'Try again',
    'action.back': 'Back',
    'action.continue': 'Continue',
    'action.cancel': 'Cancel',
    'action.useDifferentEmail': 'Use a different email',

    // SignInForm specific
    'signIn.title': 'Sign in',
    'signIn.description': 'Enter your email to continue to {companyName}',
    'signIn.descriptionGeneric': 'Enter your email to continue to your account',
    'signIn.webAuthnIndicator': '🔐 WebAuthn ready - Touch ID/Face ID will appear automatically',

    // Magic Link step
    'magicLink.title': 'Check your email',
    'magicLink.description': 'We sent a secure login link to',
    'magicLink.differentEmail': 'Use a different email',

    // Registration Terms step
    'registration.termsTitle': 'Terms & Privacy',
    'registration.termsDescription': 'Please review and accept our terms to create your account',
    'registration.agreeTerms': 'I agree to the',
    'registration.agreePrivacy': 'I agree to the',
    'registration.termsLink': 'Terms of Service',
    'registration.privacyLink': 'Privacy Policy',
    'registration.createAccount': 'Create Account',
    'registration.creatingAccount': 'Creating Account...',
    'registration.webAuthnInfo':
      '🔐 Your device will prompt for Touch ID, Face ID, or Windows Hello',

    // Registration Success step
    'registration.successTitle': 'Account Created Successfully!',
    'registration.successDescription': 'Welcome to {companyName}!',
    'registration.successDescriptionGeneric': 'Welcome to our platform!',
    'registration.successExplore': 'You can now explore the application.',
    'registration.welcomeEmail': "📧 We've sent a welcome email to",
    'registration.verifyEmail': '🔓 Verify your email to unlock all features',

    // Registration/Terms
    'registration.required': 'Registration is required. Please complete the registration process.',
    'terms.acceptRequired': 'You must accept the Terms of Service and Privacy Policy to continue.',
    'privacy.acceptRequired': 'You must accept the privacy policy',
    'registration.terms': 'I accept the {companyName} Terms of Service',
    'registration.privacy': 'I accept the {companyName} Privacy Policy',
    'registration.completing': 'Completing registration...',
    'registration.termsServiceRequired': 'Terms of Service must be accepted',

    // Error messages specific to SignInForm
    'error.magicLinkFailed': 'Failed to send magic link. Please try again.',
    'error.noAuthMethods': 'No authentication methods available for this email.',
    'error.noPasskeyFound':
      'No passkey found for this email. Please register a new passkey or use a different sign-in method.',
    'error.serviceTemporarilyUnavailable':
      'Authentication service temporarily unavailable. Please try again in a moment.',
    'error.authCancelled': 'Authentication was cancelled. Please try again.',
    'error.passkeyNotSupported': 'Passkey authentication is not supported on this device.',
    'error.securityError': "Security error occurred. Please ensure you're on a secure connection.",
    'error.noPasskeyAvailable':
      'No passkey available on this device. Please register a new passkey.',
    'error.authGenericFailed':
      'Authentication failed. Please try again or use a different sign-in method.',
    'error.registrationFailed': 'Registration failed',

    // Branding
    'branding.securedBy': 'Secured by',
    'branding.poweredBy': 'Thepia',

    // Time formatting
    'time.minute': 'minute',
    'time.minutes': 'minutes',
    'time.second': 'second',
    'time.seconds': 'seconds',

    // User Management Dashboard
    'user.welcomeBack': 'Welcome back!',
    'user.signOut': 'Sign out',

    // Security section
    'user.security.title': 'Security',
    'user.security.description':
      'Manage your passkeys, authentication methods, and security settings.',
    'user.security.managePasskeys': 'Manage Passkeys',

    // Profile section
    'user.profile.title': 'Profile',
    'user.profile.description': 'Update your personal information and account preferences.',
    'user.profile.editProfile': 'Edit Profile',

    // Privacy section
    'user.privacy.title': 'Privacy & Legal',
    'user.privacy.description': 'Review data policies, terms of service, and privacy settings.',
    'user.privacy.dataPolicy': 'Data Policy',
    'user.privacy.termsOfService': 'Terms of Service'
  },
  da: {
    // Email input
    'email.label': 'E-mail adresse',
    'email.placeholder': 'din@email.dk',
    'email.invalid': 'Indtast venligst en gyldig e-mail adresse',
    'email.required': 'E-mail adresse er påkrævet',

    // Form titles and descriptions
    'form.signInTitle': 'Log ind på {companyName}',
    'form.signInDescription': 'Brug din {companyName} konto, eller opret en.',
    'form.signInGeneric': 'Log ind',
    'form.signInGenericDescription': 'Indtast din e-mail for at fortsætte til {companyName}',

    // Authentication buttons
    'auth.signIn': 'Log ind',
    'auth.signInWithPasskey': 'Log ind med Passkey',
    'auth.continueWithTouchId': 'Fortsæt med Touch ID',
    'auth.continueWithFaceId': 'Fortsæt med Face ID',
    'auth.continueWithBiometric': 'Fortsæt med Touch ID/Face ID',
    'auth.continueWithTouchIdFaceId': 'Fortsæt med Touch ID/Face ID',

    // Email authentication - AppCode vs Magic Link variants
    'auth.sendPinByEmail': 'Send pin via e-mail',
    'auth.sendPinToEmail': 'Send pin til e-mail',
    'auth.sendMagicLink': 'Send Magisk Link',
    'auth.loading': 'Indlæser...',
    'auth.signingIn': 'Logger ind...',
    'auth.sendingPin': 'Sender pin...',
    'auth.sendingMagicLink': 'Sender magisk link...',

    // PIN/Code input
    'code.label': 'Indtast bekræftelseskode',
    'code.placeholder': '6-cifret kode',
    'code.invalid': 'Indtast venligst en gyldig 6-cifret kode',
    'code.expired': 'Bekræftelseskoden er udløbet',
    'code.incorrect': 'Forkert bekræftelseskode',

    // Status messages
    'status.emailSent': 'Vi sendte en bekræftelseskode til',
    'status.checkEmail': 'Tjek din e-mail',
    'status.pinValid': 'En gyldig pin blev allerede sendt til dig, gyldig i {minutes} minut{s}.',
    'status.pinDirectAction': 'Indtast pin her',
    'status.pinDetected': '🔢 Gyldig pin fundet',
    'status.signInSuccess': 'Velkommen tilbage!',
    'status.magicLinkSent': 'Vi sendte et sikkert login link til',

    // Errors
    'error.network': 'Netværksfejl. Prøv venligst igen.',
    'error.authentication': 'Godkendelse mislykkedes. Prøv venligst igen.',
    'error.userNotFound': 'Ingen konto fundet med denne e-mail adresse',
    'error.invalidCredentials': 'Ugyldig e-mail eller godkendelse mislykkedes',
    'error.serviceUnavailable': 'Tjenesten er midlertidigt utilgængelig',
    'error.unknown': 'Der opstod en uventet fejl',

    // Auth state messages
    'auth.onlyRegisteredUsers':
      'Kun registrerede brugere kan logge ind. Kontakt support hvis du har brug for adgang.',
    'auth.fullName': 'Fulde Navn',
    'auth.fullNamePlaceholder': 'Indtast dit fulde navn',
    'auth.newUserTermsNotice':
      'Som ny bruger skal du gennemgå og bekræfte servicevilkårene efter login via e-mail.',
    'auth.signedInSuccess': 'Du er nu logget ind!',

    // WebAuthn
    'webauthn.ready': '🔐 WebAuthn klar - Touch ID/Face ID vises automatisk',
    'webauthn.touchId': 'Touch ID',
    'webauthn.faceId': 'Face ID',
    'webauthn.cancelled': 'Godkendelse annulleret',
    'webauthn.notSupported': 'WebAuthn understøttes ikke på denne enhed',

    // Security explanation messages
    'security.passwordlessExplanation':
      '🔐 {companyName} bruger adgangskodeløs godkendelse med biometriske passkeys eller sikre e-mail links for øget sikkerhed og bekvemmelighed.',
    'security.passwordlessGeneric':
      '🔐 Adgangskodeløs godkendelse med biometriske passkeys eller sikre e-mail links for øget sikkerhed og bekvemmelighed.',
    'security.passwordlessWithPin':
      '🔐 {companyName} bruger adgangskodeløs godkendelse med biometriske passkeys eller sikre e-mail pins for øget sikkerhed og bekvemmelighed.',
    'security.passwordlessWithPinGeneric':
      '🔐 Adgangskodeløs godkendelse med biometriske passkeys eller sikre e-mail pins for øget sikkerhed og bekvemmelighed.',

    // General actions
    'action.retry': 'Prøv igen',
    'action.back': 'Tilbage',
    'action.continue': 'Fortsæt',
    'action.cancel': 'Annuller',
    'action.useDifferentEmail': 'Brug en anden e-mail',

    // SignInForm specific
    'signIn.title': 'Log ind',
    'signIn.description': 'Indtast din e-mail for at fortsætte til {companyName}',
    'signIn.descriptionGeneric': 'Indtast din e-mail for at fortsætte til din konto',
    'signIn.webAuthnIndicator': '🔐 WebAuthn klar - Touch ID/Face ID vises automatisk',

    // Magic Link step
    'magicLink.title': 'Tjek din e-mail',
    'magicLink.description': 'Vi sendte et sikkert login link til',
    'magicLink.differentEmail': 'Brug en anden e-mail',

    // Registration Terms step
    'registration.termsTitle': 'Vilkår og Privatliv',
    'registration.termsDescription':
      'Gennemgå og accepter venligst vores vilkår for at oprette din konto',
    'registration.agreeTerms': 'Jeg accepterer',
    'registration.agreePrivacy': 'Jeg accepterer',
    'registration.termsLink': 'Servicevilkår',
    'registration.privacyLink': 'Privatlivspolitik',
    'registration.createAccount': 'Opret Konto',
    'registration.creatingAccount': 'Opretter konto...',
    'registration.webAuthnInfo': '🔐 Din enhed vil bede om Touch ID, Face ID eller Windows Hello',

    // Registration Success step
    'registration.successTitle': 'Konto Oprettet!',
    'registration.successDescription': 'Velkommen til {companyName}!',
    'registration.successDescriptionGeneric': 'Velkommen til vores platform!',
    'registration.successExplore': 'Du kan nu udforske applikationen.',
    'registration.welcomeEmail': '📧 Vi har sendt en velkomst e-mail til',
    'registration.verifyEmail': '🔓 Bekræft din e-mail for at låse op for alle funktioner',

    // Registration/Terms
    'registration.required': 'Registrering påkrævet. Fuldfør venligst registreringsprocessen.',
    'terms.acceptRequired':
      'Du skal acceptere Servicevilkår og Privatlivspolitik for at fortsætte.',
    'privacy.acceptRequired': 'Du skal acceptere privatlivspolitikken',
    'registration.terms': 'Jeg accepterer {companyName}s Servicevilkår',
    'registration.privacy': 'Jeg accepterer {companyName}s Privatlivspolitik',
    'registration.completing': 'Fuldfører registrering...',
    'registration.termsServiceRequired': 'Du skal acceptere Servicevilkårene',

    // Error messages specific to SignInForm
    'error.magicLinkFailed': 'Kunne ikke sende magisk link. Prøv venligst igen.',
    'error.noAuthMethods': 'Ingen godkendelsesmetoder tilgængelige for denne e-mail.',
    'error.noPasskeyFound':
      'Ingen passkey fundet for denne e-mail. Registrer venligst en ny passkey eller brug en anden login-metode.',
    'error.serviceTemporarilyUnavailable':
      'Godkendelsestjenesten er midlertidigt utilgængelig. Prøv venligst igen om et øjeblik.',
    'error.authCancelled': 'Godkendelse annulleret. Prøv venligst igen.',
    'error.passkeyNotSupported': 'Passkey godkendelse understøttes ikke på denne enhed.',
    'error.securityError':
      'Sikkerhedsfejl opstod. Sørg venligst for at du er på en sikker forbindelse.',
    'error.noPasskeyAvailable':
      'Ingen passkey tilgængelig på denne enhed. Registrer venligst en ny passkey.',
    'error.authGenericFailed':
      'Godkendelse mislykkedes. Prøv venligst igen eller brug en anden login-metode.',
    'error.registrationFailed': 'Registrering mislykkedes',

    // Branding
    'branding.securedBy': 'Sikret af',
    'branding.poweredBy': 'Thepia',

    // Time formatting
    'time.minute': 'minut',
    'time.minutes': 'minutter',
    'time.second': 'sekund',
    'time.seconds': 'sekunder',

    // Additional code input keys
    'code.verify': 'Bekræft kode',
    'code.verifying': 'Bekræfter...',

    // User Management Dashboard
    'user.welcomeBack': 'Velkommen tilbage!',
    'user.signOut': 'Log ud',

    // Security section
    'user.security.title': 'Sikkerhed',
    'user.security.description':
      'Administrer dine passkeys, godkendelsesmetoder og sikkerhedsindstillinger.',
    'user.security.managePasskeys': 'Administrer Passkeys',

    // Profile section
    'user.profile.title': 'Profil',
    'user.profile.description': 'Opdater dine personlige oplysninger og kontopræferencer.',
    'user.profile.editProfile': 'Rediger profil',

    // Privacy section
    'user.privacy.title': 'Privatliv og jura',
    'user.privacy.description':
      'Gennemgå datapolitikker, servicevilkår og privatlivsindstillinger.',
    'user.privacy.dataPolicy': 'Datapolitik',
    'user.privacy.termsOfService': 'Servicevilkår'
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
  language = 'en',
  customTranslations: CustomTranslations = {},
  fallbackLanguage: SupportedLanguage = 'en'
) {
  // Validate and normalize language
  const normalizedLang = language.toLowerCase().split('-')[0] as SupportedLanguage;
  const currentLanguage = writable<SupportedLanguage>(
    normalizedLang in defaultTranslations ? normalizedLang : fallbackLanguage
  );

  // Store for custom translations (reactive)
  const customTransStore = writable<CustomTranslations>(customTranslations);

  // Main translation function
  const t = derived([currentLanguage, customTransStore], ([$lang, $custom]) => {
    return (key: TranslationKey, variables?: Record<string, any>): string => {
      // Priority: custom translations > language defaults > fallback language > key
      let translation =
        $custom[key] ||
        defaultTranslations[$lang]?.[key] ||
        defaultTranslations[fallbackLanguage]?.[key] ||
        key;

      // Apply template variable substitution
      if (variables && typeof translation === 'string') {
        translation = interpolate(translation, variables);
      }

      return translation;
    };
  });

  return {
    // Main translation function
    t: derived(t, ($t) => $t),

    // Current language (reactive)
    currentLanguage: derived(currentLanguage, ($lang) => $lang),

    // Language management
    setLanguage: (lang: string) => {
      const normalized = lang.toLowerCase().split('-')[0] as SupportedLanguage;
      if (normalized in defaultTranslations) {
        currentLanguage.set(normalized);
      }
    },

    // Add or update custom translations
    addTranslations: (translations: CustomTranslations) => {
      customTransStore.update((current) => ({ ...current, ...translations }));
    },

    // Set all custom translations (replaces existing)
    setTranslations: (translations: CustomTranslations) => {
      customTransStore.set(translations);
    },

    // Get current language code
    getLanguage: () => {
      let lang: SupportedLanguage;
      currentLanguage.subscribe((l) => (lang = l))();
      return lang!;
    }
  };
}

// Global i18n context for app-wide configuration
const I18N_CONTEXT_KEY = 'flows-auth-i18n';

/**
 * Set global i18n context for the entire app
 * Call this once at the root of your app
 */
export function setI18nContext(config: {
  language?: string;
  translations?: CustomTranslations;
  fallbackLanguage?: SupportedLanguage;
}) {
  const i18n = createI18n(
    config.language || detectUserLanguage(['en'], 'en'),
    config.translations || {},
    config.fallbackLanguage || 'en'
  );
  setContext(I18N_CONTEXT_KEY, i18n);
  return i18n;
}

/**
 * Get i18n from context or create a default instance
 * Components should use this to get i18n configuration
 */
export function getI18n(config?: {
  language?: string;
  translations?: CustomTranslations;
  fallbackLanguage?: string;
}) {
  // Try to get from context first (app-wide configuration)
  const contextI18n = getContext<ReturnType<typeof createI18n>>(I18N_CONTEXT_KEY);
  if (contextI18n) {
    // If config is provided, update the context i18n
    if (config?.language) {
      contextI18n.setLanguage(config.language);
    }
    if (config?.translations) {
      contextI18n.setTranslations(config.translations);
    }
    return contextI18n;
  }

  // No context, create instance from config or defaults
  return createI18n(
    config?.language || detectUserLanguage(['en'], 'en'),
    config?.translations || {},
    (config?.fallbackLanguage as unknown as SupportedLanguage) || 'en'
  );
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
    const browserLangs = navigator.languages || [
      navigator.language || (navigator as any).userLanguage
    ];

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
