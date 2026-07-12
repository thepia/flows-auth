// Icon component exports
export { default as Icon } from './Icon.svelte';
// Registry and utility exports
export {
  applyIconTheme,
  DEFAULT_ICON_THEME,
  generateIconCSSProperties,
  generateIconTypeDefinitions,
  getAllSemanticIconNames,
  getCurrentIconTheme,
  getSemanticIconDescription,
  getSemanticIconsByCategory,
  isSemanticIcon,
  removeIconTheme,
  SEMANTIC_ICON_REGISTRY,
  validateIconAvailability
} from './IconRegistry.js';
// Type exports
export type {
  IconCSSProperties,
  IconProps,
  IconSize,
  IconThemeConfig,
  IconVariant,
  SemanticIconName,
  SemanticIconRegistry
} from './types.js';

// Re-export commonly used Phosphor icons for convenience
// This provides a curated set of icons that match our semantic registry
// Note: These exports require phosphor-svelte to be installed as a peer dependency

// Conditional exports based on peer dependency availability
// Users should import icons directly from phosphor-svelte when using the Icon component
export type {
  // Communication
  Bell,
  Briefcase,
  // Business & Workflow
  Buildings as Building,
  CaretDown as ChevronDown,
  CaretLeft as ChevronLeft,
  // UI Navigation
  CaretRight as ChevronRight,
  CaretUp as ChevronUp,
  ChatCircle as MessageCircle,
  // Status & Feedback
  Check,
  CheckCircle,
  CircleNotch as Loader,
  Clock,
  DownloadSimple as Download,
  Envelope as Mail,
  File,
  Fingerprint,
  Folder,
  Funnel as Filter,
  Gear as Settings,
  House as Home,
  Info,
  Key,
  Link,
  List as Menu,
  Lock,
  LockOpen as Unlock,
  MagnifyingGlass as Search,
  Phone,
  Pulse as Activity,
  ShareNetwork as Share,
  // Authentication & Security
  Shield,
  UploadSimple as Upload,
  User,
  UserCheck,
  Users,
  VideoCamera as Video,
  WarningCircle as AlertCircle,
  X,
  XCircle
} from 'phosphor-svelte';

/**
 * Convenience function to create an icon with semantic meaning
 * This helps ensure consistent usage across the application
 *
 * Note: Lucide icon imports are commented out to avoid build errors
 * when lucide-svelte is not installed. Uncomment when needed.
 */

/**
 * Semantic icon mapping for easy access
 * This provides a single source of truth for icon selection
 *
 * Note: Commented out until lucide-svelte is properly installed
 */
/*
export const SEMANTIC_ICONS = {
  // Authentication & Security
  authentication: {
    shield: Shield,
    key: Key,
    lock: Lock,
    unlock: Unlock,
    user: User,
    'user-check': UserCheck,
    fingerprint: Fingerprint,
    mail: Mail
  },

  // UI Navigation
  navigation: {
    'chevron-right': ChevronRight,
    'chevron-left': ChevronLeft,
    'chevron-down': ChevronDown,
    'chevron-up': ChevronUp,
    menu: Menu,
    x: X,
    settings: Settings,
    home: Home
  },

  // Status & Feedback
  status: {
    check: Check,
    'check-circle': CheckCircle,
    'alert-circle': AlertCircle,
    'x-circle': XCircle,
    info: Info,
    loader: Loader,
    clock: Clock,
    activity: Activity
  },

  // Business & Workflow
  business: {
    building: Building,
    users: Users,
    briefcase: Briefcase,
    file: File,
    folder: Folder,
    search: Search,
    filter: Filter,
    download: Download,
    upload: Upload
  },

  // Communication
  communication: {
    bell: Bell,
    'message-circle': MessageCircle,
    phone: Phone,
    video: Video,
    share: Share,
    link: Link
  }
} as const;
*/

/**
 * Get a semantic icon component by name
 * Note: Commented out until SEMANTIC_ICONS is available
 */
/*
export function getSemanticIcon(category: keyof typeof SEMANTIC_ICONS, name: string) {
  return SEMANTIC_ICONS[category]?.[name as keyof (typeof SEMANTIC_ICONS)[typeof category]];
}
*/

/**
 * Get all semantic icons as a flat object
 * Note: Commented out until SEMANTIC_ICONS is available
 */
/*
export function getAllSemanticIcons() {
  const allIcons: Record<string, ComponentType> = {};

  for (const category of Object.values(SEMANTIC_ICONS)) {
    Object.assign(allIcons, category);
  }

  return allIcons;
}
*/
