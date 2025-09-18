# Internationalization (i18n) Implementation

This document describes the svelte-i18n implementation in the auth-demo application.

## Overview

The auth-demo app now includes comprehensive internationalization support using `svelte-i18n` with a canonical directory structure and multiple language support.

## Features

- **5 Languages Supported**: English (en), Spanish (es), French (fr), German (de), Danish (da)
- **Language Selector**: Interactive dropdown in the header to switch languages
- **Automatic Detection**: Browser language detection with fallback to English
- **Reactive Updates**: All text updates immediately when language changes
- **Professional UI**: Styled language selector with flags and smooth transitions

## Directory Structure

```
src/lib/i18n/
├── index.js                 # i18n initialization and configuration
└── locales/
    ├── en.json             # English translations
    ├── es.json             # Spanish translations
    ├── fr.json             # French translations
    ├── de.json             # German translations
    └── da.json             # Danish translations
```

## Components

### Language Selector (`src/lib/components/LanguageSelector.svelte`)
- Dropdown component with flag icons
- Responsive design (hides language names on mobile)
- Accessible with proper ARIA attributes
- Smooth animations and hover effects

### Tab Navigation (`src/lib/components/TabNavigation.svelte`)
- Updated to use reactive i18n translations
- Tab titles and descriptions update with language changes

## Translation Keys

### Navigation
- `nav.overview` - Overview tab title
- `nav.signin` - Sign In tab title  
- `nav.register` - Registration tab title

### Overview Page
- `overview.title` - Main page title
- `overview.subtitle` - Main page subtitle
- `overview.features.*` - Feature card content
- `overview.try_signin` - Sign in demo link
- `overview.try_register` - Registration demo link

### Sign In & Registration
- `signin.*` - Sign in page content
- `register.*` - Registration page content

### Common Elements
- `common.*` - Shared UI elements (loading, buttons, etc.)
- `auth.*` - Authentication-related terms
- `demo.*` - Demo-specific labels

## Usage

### In Components
```svelte
<script>
  import { _ } from 'svelte-i18n';
</script>

<h1>{$_('overview.title')}</h1>
<p>{$_('overview.subtitle')}</p>
```

### Reactive Translations
```svelte
$: tabs = [
  {
    title: $_('nav.overview'),
    description: $_('overview.subtitle')
  }
];
```

## Adding New Languages

1. Create new locale file: `src/lib/i18n/locales/[code].json`
2. Add language to registration in `src/lib/i18n/index.js`:
   ```js
   register('[code]', () => import('./locales/[code].json'));
   ```
3. Add language option to `LanguageSelector.svelte`:
   ```js
   { code: '[code]', name: '[Name]', flag: '[flag]' }
   ```

## Configuration

The i18n system is configured in `src/lib/i18n/index.js`:
- **Default Locale**: English (`en`)
- **Fallback**: English for missing translations
- **Auto-detection**: Uses browser language preference
- **Supported Locales**: en, es, fr, de, da

## Integration

The i18n system is initialized in the main layout (`+layout.svelte`) and available throughout the application via the `$_()` function from svelte-i18n.

## Browser Support

- Modern browsers with ES6+ support
- Graceful fallback to English for unsupported languages
- Responsive design works on all screen sizes
