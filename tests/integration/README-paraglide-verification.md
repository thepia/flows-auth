# Paraglide Build Verification Test

This test (`paraglide-build-verification.test.ts`) ensures that the Paraglide translation system is working correctly in the flows-auth library.

## What it Tests

### 1. Source Translation Files
- ✅ Validates that `messages/en.json` and `messages/da.json` exist and contain valid JSON
- ✅ Ensures both language files have matching keys (no missing translations)
- ✅ Verifies required authentication keys are present in both languages

### 2. Paraglide Configuration
- ✅ Checks `project.inlang/settings.json` configuration
- ✅ Validates Vite plugin setup in `vite.config.ts`
- ✅ Ensures function name matcher is set to `m` (for `m[key]()` pattern)

### 3. Generated Paraglide Files
- ✅ Verifies files are generated in `src/paraglide/` during build
- ✅ Checks runtime configuration (locales, base locale)
- ✅ Validates message function generation with correct patterns
- ✅ Ensures proper imports and locale handling

### 4. Build Output Verification
- ✅ Confirms paraglide files are copied to `dist/paraglide/`
- ✅ Validates package.json exports for paraglide files
- ✅ Checks dist structure and file contents

### 5. Message Function Verification
- ✅ Tests that all source translation keys have corresponding functions
- ✅ Validates function signatures accept `(inputs, options)` parameters
- ✅ Ensures functions return different translations for different locales
- ✅ Tests the `m[key]()` pattern used by components

### 6. Integration Testing
- ✅ Verifies components can import and use paraglide messages
- ✅ Tests bracket notation access (`m['email_label']`)
- ✅ Validates build process integration
- ✅ Ensures TypeScript support for generated functions

## Key Patterns Verified

### Translation Function Pattern
```javascript
// Generated functions follow this pattern:
const auth_signin1 = (inputs = {}, options = {}) => {
  const locale = options.locale ?? getLocale()
  if (locale === "en") return en.auth_signin1(inputs)
  return da.auth_signin1(inputs)
};
export { auth_signin1 as "auth_signIn" }
```

### Component Usage Pattern
```javascript
// Components use this pattern:
import * as m from '../../paraglide/messages.js';

// Access via bracket notation for dynamic keys
const text = m['email_label']();
const textWithLocale = m['auth_signIn']({}, { locale: 'da' });
```

### Build Integration
- Paraglide Vite plugin generates files during build
- Custom Vite plugin copies files to dist/
- Package.json exports make files available to consumers

## Running the Test

```bash
# Run just the paraglide verification test
pnpm test:paraglide

# Run as part of integration tests
pnpm test:integration

# Run all tests
pnpm test
```

## What This Ensures

1. **Translation Completeness**: All required keys exist in all languages
2. **Build Process**: Paraglide generation works correctly during build
3. **Function Generation**: Proper message functions are created with correct signatures
4. **Export Structure**: Library consumers can import and use translations
5. **Type Safety**: TypeScript definitions are available for generated functions
6. **Component Integration**: The `m[key]()` pattern works as expected

## Troubleshooting

If tests fail, check:

1. **Missing translations**: Ensure all keys exist in both `en.json` and `da.json`
2. **Build artifacts**: Run `pnpm build` to generate paraglide files
3. **Configuration**: Verify `project.inlang/settings.json` and `vite.config.ts`
4. **File structure**: Ensure `src/paraglide/` and `dist/paraglide/` directories exist

This test is critical for ensuring the translation system works correctly and that the library can be consumed by applications that need internationalization support.
