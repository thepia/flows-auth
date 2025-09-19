# Internationalization (i18n) Guide

**Translation system for @thepia/flows-auth library using Paraglide JS**

## Overview

The flows-auth library uses [Paraglide JS](https://inlang.com/m/gerre34r/paraglide-js) for compile-time internationalization with dot notation keys for cross-platform compatibility.

**Current Status:**
- ✅ **Dot notation migration complete** - All keys converted from `email_label` to `email.label`
- ✅ **Paraglide integration** - Full setup with m-function-matcher plugin
- ✅ **Component updates** - All library components use new patterns
- 🔄 **Translation override architecture** - Planned for app-level customization

## Translation Key Principles

**Use dot notation for cross-platform compatibility:**

```json
{
  "email.label": "Email address",
  "auth.signIn": "Sign In",
  "user.security.title": "Security"
}
```

**Key naming pattern:** `domain.component.element.state`
- `auth.signIn` - Primary actions
- `email.label` - Form elements
- `user.security.title` - Nested navigation
- `error.network` - System messages

## Usage Patterns

**Two import patterns available:**

```javascript
// Pattern A: Namespace import
import * as m from '@thepia/flows-auth/paraglide/messages';
m["email.label"]()

// Pattern B: Direct import with alias
import { "email.label" as emailLabel } from '@thepia/flows-auth/paraglide/messages';
emailLabel()
```

**In Svelte components:**

```svelte
<script>
  import * as m from '@thepia/flows-auth/paraglide/messages';
</script>

<label for="email">{m["email.label"]()}</label>
<button>{m["auth.signIn"]()}</button>
```

**Variable substitution:**

```javascript
m["welcome.message"]({ name: "John", company: "ACME" })
// "Welcome John to ACME!"
```

## Multi-Platform Support

**Cross-platform compatibility via dot notation:**

| Platform | Format | Status |
|----------|--------|--------|
| **Web** | Paraglide `m["key"]()` | ✅ Implemented |
| **iOS** | Xcode String Catalogs | ✅ [Inlang plugin](https://inlang.com/m/xcstrings) |
| **Android** | ARB format | 🔄 Custom export scripts |
| **React Native** | i18next JSON | ✅ Direct use |

**Translation override architecture (planned):**
Apps can override library translations at build time while maintaining type safety and performance.

## Configuration

**Paraglide setup with inlang:**

```json
// project.inlang/settings.json
{
  "sourceLanguageTag": "en",
  "languageTags": ["en", "da"],
  "modules": [
    "https://cdn.jsdelivr.net/npm/@inlang/plugin-message-format@latest/dist/index.js",
    "https://cdn.jsdelivr.net/npm/@inlang/plugin-m-function-matcher@latest/dist/index.js"
  ],
  "plugin.inlang.messageFormat": {
    "pathPattern": "./messages/{languageTag}.json"
  },
  "plugin.inlang.mFunctionMatcher": {
    "functionName": "m"
  }
}
```

**Useful resources:**
- [Paraglide JS Documentation](https://inlang.com/m/gerre34r/paraglide-js)
- [Inlang Editor](https://inlang.com/editor) - Web-based translation editor
- [M-Function Matcher Plugin](https://inlang.com/m/632iow21/plugin-inlang-mFunctionMatcher)

## Current Status

**✅ Completed:**
- Dot notation migration (`email_label` → `email.label`)
- Paraglide integration with m-function-matcher plugin
- All library components updated to use new patterns
- Both import patterns working (namespace and direct)
- Consistent TypeScript patterns (`as unknown as {[key: string]: () => string}`)

**🔄 Next:**
- Translation override architecture for app-level customization
- Cross-platform export scripts for iOS/Android
- Translation coverage testing

**Files:**
- `messages/en.json` - 143 translation keys in dot notation
- `messages/da.json` - Complete Danish translations
- `src/paraglide/messages/` - Generated Paraglide functions

---

## Usage Examples

**Basic component usage:**

```svelte
<script>
  import { SignInCore } from '@thepia/flows-auth';

  const config = {
    apiBaseUrl: 'https://api.thepia.com',
    domain: 'thepia.com',
    enablePasskeys: true
  };
</script>

<SignInCore {config} />
```

**Custom translation overrides (planned):**

```javascript
const config = {
  apiBaseUrl: 'https://api.thepia.com',
  domain: 'thepia.com',
  translations: {
    "auth.signIn": "Login to ACME",
    "email.placeholder": "usuario@acme.com"
  }
};
```

---

**Related docs:** [Multi-Framework i18n Strategy](../architecture/i18n-strategy-multi-framework.md) • [Content Plan](../content/i18n-content-plan.md) • [Paraglide Testing](../testing/README-paraglide-verification.md)

**Note:** The other i18n docs in this repo are for different contexts:
- `../architecture/i18n-strategy-multi-framework.md` - Cross-repository strategy for thepia.com ecosystem
- `../content/i18n-content-plan.md` - Website content internationalization (not library components)
