# AddToHomeScreen Component Specification

## Overview

A Svelte component that guides users to install the PWA on their home screen with platform-specific instructions. Includes smart detection of installation state and dismissal tracking.

## Component API

```typescript
interface AddToHomeScreenProps {
  // Whether to auto-show the prompt (default: true)
  autoShow?: boolean;

  // Whether to show on standalone mode (default: false)
  showWhenInstalled?: boolean;

  // Custom dismissal storage key (default: 'a2hs-dismissed')
  storageKey?: string;

  // Days before showing again after dismissal (default: 30)
  dismissDays?: number;

  // Position of the prompt (default: 'bottom')
  position?: 'top' | 'bottom' | 'floating';

  // Custom styling class
  class?: string;
}
```

## Events

```typescript
{
  // Fired when prompt is shown
  show: { platform: 'ios' | 'android' | 'other' };

  // Fired when user dismisses prompt
  dismiss: { platform: string; willShowAgain: boolean };

  // Fired when installation is detected (Android)
  install: { platform: 'android' };
}
```

## Usage Examples

### Basic Usage

```svelte
<script>
  import { AddToHomeScreen } from '@thepia/flows-auth';
</script>

<AddToHomeScreen />
```

### With Auth Store Integration

```svelte
<script>
  import { createAuthStore, AddToHomeScreen } from '@thepia/flows-auth';

  const authStore = createAuthStore({ /* config */ });
</script>

{#if $authStore.isAuthenticated && !$authStore.isStandalone}
  <AddToHomeScreen
    autoShow={true}
    dismissDays={7}
  />
{/if}
```

### Custom Positioning and Styling

```svelte
<AddToHomeScreen
  position="floating"
  class="custom-a2hs-prompt"
  on:show={(e) => console.log('Shown on', e.detail.platform)}
  on:dismiss={(e) => analytics.track('a2hs_dismissed')}
/>
```

### Manual Control

```svelte
<script>
  import { AddToHomeScreen } from '@thepia/flows-auth';

  let showPrompt = false;

  function handleInstallClick() {
    showPrompt = true;
  }
</script>

<button on:click={handleInstallClick}>
  Install App
</button>

<AddToHomeScreen
  autoShow={false}
  bind:visible={showPrompt}
/>
```

## Platform Detection & Instructions

### iOS Safari
- Detects iOS using `navigator.userAgent`
- Shows Safari-specific share button instructions
- Visual guide with share icon and "Add to Home Screen" steps
- Checks for standalone mode: `navigator.standalone`

### Android Chrome
- Detects Android and Chrome browser
- Uses `beforeinstallprompt` event when available
- Triggers native install prompt
- Falls back to manual instructions if needed

### Other Platforms
- Desktop browsers: Optional prompt for PWA installation
- Unsupported browsers: Gracefully hides or shows generic message

## Installation State Detection

The component uses multiple detection methods:

```typescript
// 1. Media query (most reliable)
window.matchMedia('(display-mode: standalone)').matches

// 2. iOS-specific property
(window.navigator as any).standalone === true

// 3. beforeinstallprompt event (Android)
window.addEventListener('beforeinstallprompt', (e) => { /* ... */ })

// 4. appinstalled event (Android)
window.addEventListener('appinstalled', (e) => { /* ... */ })
```

## Dismissal Storage

Uses localStorage to track user dismissals:

```typescript
{
  dismissed: true,
  dismissedAt: '2025-10-06T12:00:00.000Z',
  platform: 'ios',
  count: 2
}
```

## UI Design

### iOS Prompt Layout
```
┌─────────────────────────────────────────┐
│  📱 Install Thepia                      │
│                                         │
│  Add to your home screen for quick     │
│  access and a better experience.       │
│                                         │
│  1. Tap the Share button ⬆️             │
│  2. Select "Add to Home Screen"        │
│  3. Tap "Add" to confirm               │
│                                         │
│  [ Not now ]               [ Show me ] │
└─────────────────────────────────────────┘
```

### Android Prompt Layout
```
┌─────────────────────────────────────────┐
│  📱 Install Thepia                      │
│                                         │
│  Install this app on your device for   │
│  offline access and notifications.     │
│                                         │
│  [ Not now ]                 [ Install ]│
└─────────────────────────────────────────┘
```

## Auth Store Integration

### New Method: `isStandalone()`

Add to `ComposedAuthStore`:

```typescript
export interface ComposedAuthStore extends AuthStoreFunctions {
  // ... existing properties

  /**
   * Check if app is running in standalone/fullscreen mode
   * Returns true if installed as PWA or added to home screen
   */
  isStandalone: () => boolean;
}
```

Implementation delegates to existing `device.ts` utility:

```typescript
import { isStandalone } from '../utils/device';

export function createAuthStore(config: AuthConfig): ComposedAuthStore {
  // ... existing code

  return {
    // ... existing methods

    isStandalone: () => isStandalone()
  };
}
```

### Reactive Store Property

For easier Svelte integration, add reactive property:

```typescript
// In UI store
export interface UIState {
  // ... existing properties
  isStandalone: boolean;
}

// Initialize in createUIStore
const uiStore = create<UIState>((set, get) => ({
  // ... existing properties
  isStandalone: isStandalone(),

  // ... existing methods
}));

// Make available in composed store
export interface ComposedAuthStore {
  // ... existing properties

  // Access via: $authStore.isStandalone
  ui: ReturnType<typeof createUIStore>;
}
```

## Implementation Files

### Component File
`src/components/AddToHomeScreen.svelte`

### Utility File (if needed)
`src/utils/install-prompt.ts` - Handles beforeinstallprompt logic

### Styles
Integrated in component with Tailwind classes, exports CSS for styling customization

## Accessibility

- Keyboard navigable
- Screen reader friendly announcements
- Respects `prefers-reduced-motion`
- High contrast support
- Focus management

## i18n Support

Uses existing Paraglide i18n system:

```json
{
  "a2hs.title": "Install {appName}",
  "a2hs.description": "Add to your home screen for quick access",
  "a2hs.ios.step1": "Tap the Share button",
  "a2hs.ios.step2": "Select \"Add to Home Screen\"",
  "a2hs.ios.step3": "Tap \"Add\" to confirm",
  "a2hs.android.install": "Install",
  "a2hs.dismiss": "Not now",
  "a2hs.show": "Show me"
}
```

## Testing Strategy

### Unit Tests
- Platform detection logic
- Dismissal storage/retrieval
- Installation state detection

### Component Tests
- Renders correct instructions for iOS
- Renders correct instructions for Android
- Handles dismissal correctly
- Respects dismissal period
- Fires events correctly

### Integration Tests
- Works with auth store
- Standalone detection accurate
- beforeinstallprompt integration (Android)

### Manual Testing
- iOS Safari: Visual guide accuracy
- Android Chrome: Native prompt triggers
- Desktop: Appropriate behavior
- Standalone mode: Correctly hidden

## Browser Support

| Platform | Browser | Support Level |
|----------|---------|---------------|
| iOS 13+ | Safari | Full (manual instructions) |
| Android 5+ | Chrome | Full (native prompt) |
| Android 5+ | Firefox | Partial (manual instructions) |
| Desktop | Chrome/Edge | Full (PWA install) |
| Desktop | Safari | Limited (no PWA support) |
| Desktop | Firefox | Limited (no PWA support) |

## Performance Considerations

- Lazy load visual assets
- Debounce resize listeners
- Minimal re-renders
- Small bundle size (~3KB)

## Security Considerations

- No sensitive data stored
- localStorage only for dismissal tracking
- Respects user privacy preferences
- No external dependencies

## Future Enhancements

1. **Visual Installation Preview**: Show what icon will look like
2. **Custom App Names**: Per-deployment customization
3. **Analytics Integration**: Track installation funnel
4. **A/B Testing Support**: Different prompt styles
5. **Smart Timing**: Show after user engagement signals
6. **Badge Notifications**: Show count of missed features
7. **Onboarding Flow**: Post-install welcome experience

## Related Documentation

- [HOME-SCREEN-ICONS.md](/Volumes/Projects/Thepia/thepia-all/apps/app.thepia.net/HOME-SCREEN-ICONS.md) - Icon requirements
- [device.ts](../utils/device.ts) - Device detection utilities
- [PWA Best Practices](https://web.dev/add-to-home-screen/)
