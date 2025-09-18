import { writable } from 'svelte/store';
import { addMessages, locale } from 'svelte-i18n';
import { browser } from '$app/environment';

// Available translation variants for demo purposes
export const translationVariants = {
  standard: {
    // Sign In Page
    'signin.title': 'Sign In Flow Demo',
    'signin.subtitle': 'Test SignInCore/SignInForm',
    
    // Auth Components
    'auth.sign_in': 'Sign In',
    'auth.welcome_back': 'Welcome back!',
    'auth.create_account': 'Create Account',
    'auth.register': 'Register',
    
    // Overview
    'overview.title': 'Authentication Demo Overview',
    'overview.subtitle': 'Auth Overview'
  },
  
  friendly: {
    // Sign In Page
    'signin.title': 'Welcome Back! 👋',
    'signin.subtitle': 'Let\'s get you signed in',
    
    // Auth Components
    'auth.sign_in': 'Let\'s Go!',
    'auth.welcome_back': 'Great to see you again!',
    'auth.create_account': 'Join Us!',
    'auth.register': 'Come Aboard!',
    
    // Overview
    'overview.title': 'Your Friendly Auth Demo 🌟',
    'overview.subtitle': 'Authentication Made Easy'
  },
  
  professional: {
    // Sign In Page
    'signin.title': 'Authentication Portal',
    'signin.subtitle': 'Secure Access Management',
    
    // Auth Components
    'auth.sign_in': 'Authenticate',
    'auth.welcome_back': 'Access Granted',
    'auth.create_account': 'Register Account',
    'auth.register': 'Account Registration',
    
    // Overview
    'overview.title': 'Enterprise Authentication System',
    'overview.subtitle': 'Security & Access Control'
  },
  
  playful: {
    // Sign In Page
    'signin.title': '🚀 Ready to Launch?',
    'signin.subtitle': 'Time to blast off into your account!',
    
    // Auth Components
    'auth.sign_in': 'Blast Off! 🚀',
    'auth.welcome_back': 'You\'re back! 🎉',
    'auth.create_account': 'Join the Adventure! ✨',
    'auth.register': 'Start Your Journey! 🌟',
    
    // Overview
    'overview.title': '🎮 Auth Playground',
    'overview.subtitle': 'Fun with Authentication!'
  },
  
  minimalist: {
    // Sign In Page
    'signin.title': 'Sign In',
    'signin.subtitle': 'Authentication',
    
    // Auth Components
    'auth.sign_in': 'Enter',
    'auth.welcome_back': 'Return',
    'auth.create_account': 'New',
    'auth.register': 'Join',
    
    // Overview
    'overview.title': 'Auth Demo',
    'overview.subtitle': 'Simple'
  }
};

// Current variant store
export const currentVariant = writable('standard');

// Variant metadata for UI
export const variantMetadata = {
  standard: {
    name: 'Standard',
    description: 'Default professional tone',
    icon: '📋'
  },
  friendly: {
    name: 'Friendly',
    description: 'Warm and welcoming',
    icon: '😊'
  },
  professional: {
    name: 'Professional',
    description: 'Enterprise and formal',
    icon: '💼'
  },
  playful: {
    name: 'Playful',
    description: 'Fun and energetic',
    icon: '🎮'
  },
  minimalist: {
    name: 'Minimalist',
    description: 'Clean and simple',
    icon: '⚪'
  }
};

// Function to switch translation variant
export function switchTranslationVariant(variant) {
  if (!translationVariants[variant]) {
    console.warn(`Translation variant "${variant}" not found`);
    return;
  }
  
  // Get current locale
  let currentLocale;
  const unsubscribe = locale.subscribe(value => {
    currentLocale = value;
  });
  unsubscribe();
  
  if (!currentLocale) {
    console.warn('No locale set, cannot switch translation variant');
    return;
  }
  
  // Add variant translations to current locale
  addMessages(currentLocale, translationVariants[variant]);
  
  // Update current variant store
  currentVariant.set(variant);
  
  // Persist to localStorage for demo
  if (browser) {
    localStorage.setItem('demo-translation-variant', variant);
  }
  
  console.log(`🔄 Switched to "${variant}" translation variant`);
}

// Initialize variant from localStorage
export function initializeVariant() {
  if (browser) {
    const savedVariant = localStorage.getItem('demo-translation-variant');
    if (savedVariant && translationVariants[savedVariant]) {
      // Delay to ensure svelte-i18n is initialized
      setTimeout(() => {
        switchTranslationVariant(savedVariant);
      }, 100);
    }
  }
}
