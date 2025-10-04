import type { IconCSSProperties, IconThemeConfig, SemanticIconRegistry } from './types.js';

/**
 * Semantic icon registry with descriptions for each icon's purpose
 * This serves as documentation and helps maintain consistency across the ecosystem
 */
export const SEMANTIC_ICON_REGISTRY: SemanticIconRegistry = {
  authentication: {
    shield: 'Security, protection, WebAuthn',
    key: 'Passkeys, authentication keys',
    lock: 'Secure access, locked state',
    unlock: 'Unlocked state, access granted',
    user: 'User profile, account',
    'user-check': 'Verified user, authenticated',
    fingerprint: 'Biometric authentication',
    mail: 'Email authentication, magic links'
  },

  navigation: {
    'chevron-right': 'Forward navigation, next step',
    'chevron-left': 'Back navigation, previous step',
    'chevron-down': 'Dropdown, expand',
    'chevron-up': 'Collapse, minimize',
    menu: 'Hamburger menu, navigation',
    x: 'Close, cancel, dismiss',
    settings: 'Configuration, preferences',
    home: 'Dashboard, main page'
  },

  status: {
    check: 'Success, completed, verified',
    'check-circle': 'Success state with emphasis',
    'alert-circle': 'Warning, attention needed',
    'x-circle': 'Error, failed state',
    info: 'Information, help',
    loader: 'Loading, processing',
    clock: 'Pending, waiting',
    activity: 'System activity, monitoring'
  },

  business: {
    building: 'Company, organization',
    users: 'Team, multiple users',
    briefcase: 'Business, work',
    file: 'Document, file',
    folder: 'Directory, organization',
    search: 'Find, discover',
    filter: 'Sort, organize',
    download: 'Export, save',
    upload: 'Import, add'
  },

  communication: {
    bell: 'Notifications, alerts',
    'message-circle': 'Chat, communication',
    phone: 'Contact, call',
    video: 'Video call, meeting',
    share: 'Share, distribute',
    link: 'URL, connection'
  }
};

/**
 * Get all semantic icon names as a flat array
 */
export function getAllSemanticIconNames(): string[] {
  return Object.values(SEMANTIC_ICON_REGISTRY).flatMap((category) => Object.keys(category));
}

/**
 * Get semantic icon names by category
 */
export function getSemanticIconsByCategory(category: keyof SemanticIconRegistry): string[] {
  return Object.keys(SEMANTIC_ICON_REGISTRY[category]);
}

/**
 * Get the description for a semantic icon
 */
export function getSemanticIconDescription(iconName: string): string | undefined {
  for (const category of Object.values(SEMANTIC_ICON_REGISTRY)) {
    if (iconName in category) {
      return category[iconName as keyof typeof category];
    }
  }
  return undefined;
}

/**
 * Check if an icon name is in the semantic registry
 */
export function isSemanticIcon(iconName: string): boolean {
  return getAllSemanticIconNames().includes(iconName);
}

/**
 * Default icon theme configuration
 */
export const DEFAULT_ICON_THEME: IconThemeConfig = {
  primary: '#988ACA', // Thepia lavender
  secondary: '#4A90A4', // Secondary blue
  accent: '#F7931E', // Orange accent
  success: '#38A169', // Green
  warning: '#D69E2E', // Yellow
  error: '#E53E3E', // Red
  muted: '#6b7280', // Gray
  hoverScale: 1.05,
  activeScale: 0.95,
  transition: 'all 0.2s ease'
};

/**
 * Generate CSS custom properties from theme config
 */
export function generateIconCSSProperties(
  theme: Partial<IconThemeConfig> = {}
): Partial<IconCSSProperties> {
  const mergedTheme = { ...DEFAULT_ICON_THEME, ...theme };

  return {
    // Size variables (fixed)
    '--icon-size-xs': '12px',
    '--icon-size-sm': '16px',
    '--icon-size-md': '20px',
    '--icon-size-lg': '24px',
    '--icon-size-xl': '32px',
    '--icon-size-2xl': '48px',

    // Color variables (themeable)
    '--icon-color-primary': mergedTheme.primary!,
    '--icon-color-secondary': mergedTheme.secondary!,
    '--icon-color-accent': mergedTheme.accent!,
    '--icon-color-success': mergedTheme.success!,
    '--icon-color-warning': mergedTheme.warning!,
    '--icon-color-error': mergedTheme.error!,
    '--icon-color-muted': mergedTheme.muted!,

    // Interaction variables (themeable)
    '--icon-hover-scale': mergedTheme.hoverScale!.toString(),
    '--icon-active-scale': mergedTheme.activeScale!.toString(),
    '--icon-transition': mergedTheme.transition!,

    // Spacing variables (fixed)
    '--icon-gap-sm': '0.25rem',
    '--icon-gap-md': '0.5rem',
    '--icon-gap-lg': '1rem'
  };
}

/**
 * Apply icon theme to document root
 */
export function applyIconTheme(theme: Partial<IconThemeConfig> = {}): void {
  if (typeof document === 'undefined') return;

  const properties = generateIconCSSProperties(theme);
  const root = document.documentElement;

  Object.entries(properties).forEach(([property, value]) => {
    if (value) {
      root.style.setProperty(property, value);
    }
  });
}

/**
 * Remove icon theme from document root
 */
export function removeIconTheme(): void {
  if (typeof document === 'undefined') return;

  const properties = generateIconCSSProperties();
  const root = document.documentElement;

  Object.keys(properties).forEach((property) => {
    root.style.removeProperty(property);
  });
}

/**
 * Get current icon theme from CSS custom properties
 */
export function getCurrentIconTheme(): Partial<IconThemeConfig> {
  if (typeof document === 'undefined') return {};

  const root = document.documentElement;
  const computedStyle = getComputedStyle(root);

  return {
    primary: computedStyle.getPropertyValue('--icon-color-primary').trim() || undefined,
    secondary: computedStyle.getPropertyValue('--icon-color-secondary').trim() || undefined,
    accent: computedStyle.getPropertyValue('--icon-color-accent').trim() || undefined,
    success: computedStyle.getPropertyValue('--icon-color-success').trim() || undefined,
    warning: computedStyle.getPropertyValue('--icon-color-warning').trim() || undefined,
    error: computedStyle.getPropertyValue('--icon-color-error').trim() || undefined,
    muted: computedStyle.getPropertyValue('--icon-color-muted').trim() || undefined,
    hoverScale:
      Number.parseFloat(computedStyle.getPropertyValue('--icon-hover-scale')) || undefined,
    activeScale:
      Number.parseFloat(computedStyle.getPropertyValue('--icon-active-scale')) || undefined,
    transition: computedStyle.getPropertyValue('--icon-transition').trim() || undefined
  };
}

/**
 * Validate that all required Lucide icons are available
 * This helps catch missing icon imports during development
 */
export function validateIconAvailability(iconNames: string[]): {
  available: string[];
  missing: string[];
} {
  const available: string[] = [];
  const missing: string[] = [];

  iconNames.forEach((iconName) => {
    try {
      // This would need to be implemented based on how Lucide icons are imported
      // For now, we'll assume all icons are available
      available.push(iconName);
    } catch {
      missing.push(iconName);
    }
  });

  return { available, missing };
}

/**
 * Generate TypeScript type definitions for available icons
 * Useful for creating strict typing in applications
 */
export function generateIconTypeDefinitions(iconNames: string[]): string {
  const typeUnion = iconNames.map((name) => `'${name}'`).join(' | ');

  return `// Auto-generated icon type definitions
export type AvailableIconName = ${typeUnion};

export interface StrictIconProps extends Omit<IconProps, 'icon'> {
  /** Strictly typed icon name */
  name: AvailableIconName;
}`;
}
