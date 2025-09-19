# Bundle API Validation Testing

## Overview

The Bundle API Validation test suite (`tests/integration/bundle-api-validation.test.ts`) provides comprehensive validation of the full API being exported in the built bundles. This is a critical integration test that ensures the published package exports all intended functionality correctly.

## Purpose

This test suite validates that:
- All expected exports are present and functional in built bundles
- Both ESM and CJS bundles work correctly
- TypeScript definitions are accurate and complete
- Package.json export configuration is correct
- No undefined exports or broken imports exist
- Bundle sizes are reasonable
- Core functionality works when imported from built bundles

## Test Categories

### 1. Package.json Export Configuration
- Validates export paths in package.json
- Ensures all export paths exist on filesystem
- Checks legacy fields (main, module, types, svelte)

### 2. ESM Bundle Validation
- Tests successful import from ESM bundle
- Validates all core components are exported
- Checks API clients, stores, WebAuthn utilities
- Verifies session management utilities
- Ensures no undefined exports

### 3. CJS Bundle Validation
- Tests successful require from CJS bundle
- Validates core components in CommonJS format
- Ensures compatibility with Node.js environments

### 4. TypeScript Definitions Validation
- Verifies TypeScript definition file exists
- Checks for key type exports (AuthConfig, AuthState, etc.)
- Ensures proper type definitions are generated

### 5. Bundle Integrity
- Compares exports between ESM and CJS bundles
- Validates reasonable bundle sizes (100KB - 5MB range)
- Ensures consistency across formats

### 6. Functional API Validation
- Tests actual functionality from built bundles
- Creates auth store instances
- Instantiates API clients
- Validates WebAuthn and session utilities work

### 7. Specialized Export Categories
- Development components (ErrorReportingStatus, TestFlow, etc.)
- Internationalization utilities (i18n, Paraglide)
- Invitation and token utilities
- Context and auth utilities

## Running the Tests

### Individual Test
```bash
pnpm test:publish
```

### As Part of Validation
```bash
pnpm validate:publish  # Builds then runs bundle validation
```

### Integration with CI/CD
The test should be run:
- Before publishing to npm/GitHub packages
- After any changes to src/index.ts exports
- As part of pre-push validation
- In CI/CD pipelines before deployment

## Test Requirements

### Prerequisites
- Built bundles must exist in `dist/` directory
- Run `pnpm build` before executing tests
- Tests import from actual built files, not source

### Environment
- Node.js environment (not browser)
- No mocking - tests real bundle functionality
- Uses actual file system checks

## Key Validations

### Export Completeness
The test validates all major export categories:
- **Components**: SignInForm, AccountCreationForm, core components
- **Stores**: createAuthStore, global auth store functions
- **API Clients**: AuthApiClient, SyncApiClient
- **WebAuthn**: All passkey and WebAuthn utilities
- **Session Management**: All session-related functions
- **Utilities**: i18n, invitation processing, context helpers
- **Types**: All TypeScript type definitions

### Functional Testing
Beyond just checking exports exist, the test validates:
- Auth stores can be created and have expected methods
- API clients can be instantiated with proper configuration
- WebAuthn utilities are callable without errors
- Session utilities work correctly

### Bundle Quality
- Bundle sizes are within reasonable limits
- No undefined or null exports
- Consistent behavior between ESM and CJS
- TypeScript definitions match actual exports

## Common Issues and Solutions

### Missing Exports
If exports are missing from bundles:
1. Check `src/index.ts` for proper export statements
2. Verify build process includes all necessary files
3. Ensure TypeScript compilation is successful

### Bundle Size Issues
If bundles are too large:
1. Review dependencies and tree-shaking
2. Check for unnecessary imports in src/index.ts
3. Consider code splitting for large utilities

### Type Definition Problems
If TypeScript definitions are incorrect:
1. Verify `vite-plugin-dts` configuration
2. Check for proper type exports in src/index.ts
3. Ensure all types are properly exported

### Functional Test Failures
If functional tests fail:
1. Check constructor parameters for API clients
2. Verify auth store interface matches expectations
3. Ensure proper configuration objects are used

## Maintenance

### Adding New Exports
When adding new exports to the library:
1. Add export to `src/index.ts`
2. Add corresponding test to bundle validation
3. Update this documentation
4. Run `pnpm validate:publish` to verify

### Updating Test Expectations
When changing existing APIs:
1. Update test expectations to match new interfaces
2. Ensure backward compatibility is maintained
3. Document breaking changes appropriately

## Integration with Publishing

This test suite is designed to be the final validation step before publishing:

```bash
# Recommended pre-publish workflow
pnpm build                    # Build the library
pnpm test:publish            # Validate bundle exports
pnpm publish                 # Publish if validation passes
```

The test ensures that what gets published actually works and exports the intended API surface.
