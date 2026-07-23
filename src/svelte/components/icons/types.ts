import type { ComponentType } from 'svelte';

/**
 * Icon variant types for semantic color mapping
 */
export type IconVariant =
  | 'primary' // Brand primary color
  | 'secondary' // Brand secondary color
  | 'accent' // Brand accent color
  | 'success' // Success/positive state
  | 'warning' // Warning/caution state
  | 'error' // Error/negative state
  | 'muted'; // Muted/disabled state

/**
 * Icon size presets
 */
export type IconSize =
  | 'xs' // 12px
  | 'sm' // 16px
  | 'md' // 20px
  | 'lg' // 24px
  | 'xl' // 32px
  | '2xl' // 48px
  | number // Custom pixel size
  | string; // Custom CSS value

/**
 * Phosphor icon weight options
 */
export type IconWeight =
  | 'thin' // Thinnest stroke
  | 'light' // Light stroke
  | 'regular' // Default stroke
  | 'bold' // Bold stroke
  | 'fill' // Filled version
  | 'duotone'; // Two-tone version

/**
 * Props for the Icon component
 */
export interface IconProps {
  /** The Phosphor icon component to render */
  icon: ComponentType;

  /** Size of the icon - preset name, number (px), or CSS value */
  size?: IconSize;

  /** Color of the icon - 'currentColor' or any CSS color value */
  color?: string;

  /** Semantic variant for automatic color mapping */
  variant?: IconVariant;

  /** Phosphor icon weight - controls thickness and style */
  weight?: IconWeight;

  /** Additional CSS classes */
  className?: string;

  /** Whether the icon should have interactive hover/focus states */
  interactive?: boolean;

  /** Accessible label for screen readers */
  ariaLabel?: string;
}

/**
 * Semantic icon names used across the Thepia ecosystem
 * Organized by functional category
 */
export interface SemanticIconRegistry {
  // Authentication & Security
  authentication: {
    shield: 'Security, protection, WebAuthn';
    key: 'Passkeys, authentication keys';
    lock: 'Secure access, locked state';
    unlock: 'Unlocked state, access granted';
    user: 'User profile, account';
    'user-check': 'Verified user, authenticated';
    fingerprint: 'Biometric authentication';
    mail: 'Email authentication, magic links';
  };

  // UI Navigation
  navigation: {
    'chevron-right': 'Forward navigation, next step';
    'chevron-left': 'Back navigation, previous step';
    'chevron-down': 'Dropdown, expand';
    'chevron-up': 'Collapse, minimize';
    menu: 'Hamburger menu, navigation';
    x: 'Close, cancel, dismiss';
    settings: 'Configuration, preferences';
    home: 'Dashboard, main page';
  };

  // Status & Feedback
  status: {
    check: 'Success, completed, verified';
    'check-circle': 'Success state with emphasis';
    'alert-circle': 'Warning, attention needed';
    'x-circle': 'Error, failed state';
    info: 'Information, help';
    loader: 'Loading, processing';
    clock: 'Pending, waiting';
    activity: 'System activity, monitoring';
  };

  // Business & Workflow
  business: {
    building: 'Company, organization';
    users: 'Team, multiple users';
    briefcase: 'Business, work';
    file: 'Document, file';
    folder: 'Directory, organization';
    search: 'Find, discover';
    filter: 'Sort, organize';
    download: 'Export, save';
    upload: 'Import, add';
  };

  // Communication
  communication: {
    bell: 'Notifications, alerts';
    'message-circle': 'Chat, communication';
    phone: 'Contact, call';
    video: 'Video call, meeting';
    share: 'Share, distribute';
    link: 'URL, connection';
  };
}

/**
 * Flattened list of all semantic icon names
 */
export type SemanticIconName =
  | keyof SemanticIconRegistry['authentication']
  | keyof SemanticIconRegistry['navigation']
  | keyof SemanticIconRegistry['status']
  | keyof SemanticIconRegistry['business']
  | keyof SemanticIconRegistry['communication'];

/**
 * CSS custom properties used by the icon system
 */
export interface IconCSSProperties {
  // Size variables
  '--icon-size-xs': string;
  '--icon-size-sm': string;
  '--icon-size-md': string;
  '--icon-size-lg': string;
  '--icon-size-xl': string;
  '--icon-size-2xl': string;

  // Color variables
  '--icon-color-primary': string;
  '--icon-color-secondary': string;
  '--icon-color-accent': string;
  '--icon-color-success': string;
  '--icon-color-warning': string;
  '--icon-color-error': string;
  '--icon-color-muted': string;

  // Interaction variables
  '--icon-hover-scale': string;
  '--icon-active-scale': string;
  '--icon-transition': string;

  // Spacing variables
  '--icon-gap-sm': string;
  '--icon-gap-md': string;
  '--icon-gap-lg': string;
}

/**
 * Configuration for icon theming
 */
export interface IconThemeConfig {
  /** Primary brand color */
  primary?: string;
  /** Secondary brand color */
  secondary?: string;
  /** Accent color */
  accent?: string;
  /** Success color */
  success?: string;
  /** Warning color */
  warning?: string;
  /** Error color */
  error?: string;
  /** Muted text color */
  muted?: string;
  /** Hover scale factor */
  hoverScale?: number;
  /** Active scale factor */
  activeScale?: number;
  /** Transition timing */
  transition?: string;
}
