// Icon component exports
export { default as Icon } from './Icon.svelte';

// Type exports
export type {
  IconProps,
  IconVariant,
  IconSize,
  SemanticIconRegistry,
  SemanticIconName,
  IconCSSProperties,
  IconThemeConfig
} from './types.js';

// Registry and utility exports
export {
  SEMANTIC_ICON_REGISTRY,
  getAllSemanticIconNames,
  getSemanticIconsByCategory,
  getSemanticIconDescription,
  isSemanticIcon,
  DEFAULT_ICON_THEME,
  generateIconCSSProperties,
  applyIconTheme,
  removeIconTheme,
  getCurrentIconTheme,
  validateIconAvailability,
  generateIconTypeDefinitions
} from './IconRegistry.js';

// Re-export commonly used Phosphor icons for convenience
// This provides a curated set of icons that match our semantic registry
// Note: These exports require phosphor-svelte to be installed as a peer dependency

// Conditional exports based on peer dependency availability
// Users should import icons directly from phosphor-svelte when using the Icon component
export type {
  // Authentication & Security
  Shield,
  Key,
  Lock,
  LockOpen as Unlock,
  User,
  UserCheck,
  Fingerprint,
  Envelope as Mail,
  // UI Navigation
  CaretRight as ChevronRight,
  CaretLeft as ChevronLeft,
  CaretDown as ChevronDown,
  CaretUp as ChevronUp,
  List as Menu,
  X,
  Gear as Settings,
  House as Home,
  // Status & Feedback
  Check,
  CheckCircle,
  WarningCircle as AlertCircle,
  XCircle,
  Info,
  CircleNotch as Loader,
  Clock,
  Pulse as Activity,
  // Business & Workflow
  Buildings as Building,
  Users,
  Briefcase,
  File,
  Folder,
  MagnifyingGlass as Search,
  Funnel as Filter,
  DownloadSimple as Download,
  UploadSimple as Upload,
  // Communication
  Bell,
  ChatCircle as MessageCircle,
  Phone,
  VideoCamera as Video,
  ShareNetwork as Share,
  Link
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
