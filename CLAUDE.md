# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 📚 Documentation Authority - Quick Reference

**When information conflicts, these documents are authoritative:**

- **`docs/specifications/`** → Component behavior, API contracts, technical specs
- **`docs/CRITICAL_ISSUES_AND_FIXES.md`** → Known issues, root causes, fix status  
- **`docs/SESSION_MANAGEMENT_REQUIREMENTS.md`** → Session storage, timeouts
- **`docs/testing/API_CONTRACT_TESTING_POLICY.md`** → API testing requirements
- **`CLAUDE.md` (this file)** → AI development patterns, common mistakes

**⚠️ NEVER contradict authoritative documents. Flag conflicts as critical issues.**

See [README.md § Documentation Authority Matrix](./README.md#documentation-authority-matrix) for complete authority assignments.

## Flows Repositories

This section must be replicated across the directories of the Thepia Flows product to ensure consistency. Capture lessons learned.

### Repository Standards and Consensus

**📋 COMPLETE STANDARDS**: See [thepia.com/docs/flows/repository-standards.md](https://github.com/thepia/thepia.com/blob/main/docs/flows/repository-standards.md) for comprehensive development standards that must be applied across all Flows repositories.

#### Repository Ecosystem
The Thepia Flows product consists of interconnected repositories:
- **`thepia.com`**: Main website and API server with authentication backend
- **`flows-auth`**: Frontend sign-in UI library (Svelte) with WebAuthn support
- **`flows-db`**: Database schema and functionality with admin demo application  
- **`flows.thepia.net`**: Public demo website for Thepia Flows with live database integration and passkey authentication

#### Critical Development Standards
- **PNPM only** - Package manager across all repositories
- **Biome configuration** - Exact biome.json required (see standards doc)
- **`NODE_AUTH_TOKEN`** - Local .env file for GitHub package installation
- **Error reporting system** - Mandatory implementation in all demos
- **@thepia/branding integration** - Required for client-specific theming
- **Component breakdown** - Regular refactoring to avoid module bloat
- **automation** - Run automated checks to ensure quality. Build out GitHub Actions.
- **Document First** - Document before implementing new features. Write in /docs/ and reference in README.md

#### Demo Patterns (Mandatory)
```bash
# Required scripts in all demo repositories
pnpm demo:setup     # Initialize demo environment
pnpm demo:*         # Various demo operations  
pnpm build         # Ensure correctness before commits
pnpm lint          # Biome linting (must pass)
```

#### Quality Requirements
- **Strict code standards** for maintaining development velocity
- **Build must pass** before any commit (`pnpm build`)
- **Error reporting to demo server console** for AI debugging
- **File logging** for AI assistant error tracking
- **Consistent patterns** across repositories for generated code quality

#### Cross-Repository Integration
- **GitHub packages** for shared functionality
- **GitHub Actions** for automated workflows
- **Mature demo components** migrate to shared libraries
- **Synchronized standards** across all CLAUDE.md files

## ⚠️ CRITICAL MISTAKES TO AVOID

### 1. GitHub Packages Publishing Authentication
- **NEVER keep local `.npmrc` files with environment variable references for publishing**
- **Local `.npmrc` with `//npm.pkg.github.com/:_authToken=$NODE_AUTH_TOKEN` breaks npm publish**
- **npm doesn't expand environment variables during publish operations**
- **Publishing fails with 401 Unauthorized despite valid token in .env file**

**Root Cause**: npm publish process doesn't expand `$NODE_AUTH_TOKEN` environment variables in local `.npmrc` files during the publish workflow, even when the token exists in `.env`.

**Solution**: Remove local `.npmrc` files and rely on global `~/.npmrc` with actual token values:
```bash
# In ~/.npmrc (WORKS)
//npm.pkg.github.com/:_authToken=ghp_actualTokenHere
@thepia:registry=https://npm.pkg.github.com

# In local .npmrc (BREAKS PUBLISHING)
//npm.pkg.github.com/:_authToken=$NODE_AUTH_TOKEN  # ❌ npm doesn't expand this
```

**Publishing Workflow**:
1. Ensure `~/.npmrc` has actual token (not environment variable)
2. Remove local `.npmrc` files from repository
3. Use `package.json` publishConfig for registry settings
4. Run `pnpm publish --no-git-checks` (delegates to npm internally)

### 2. Dev Server Management
- **NEVER run dev servers and continue with other tasks**
- Dev servers are blocking operations that require user interaction
- Always let the user start/stop dev servers
- If you need to test something, ask the user to run the dev server

### 2. Client-Side vs Development Infrastructure

- **Production library code** - Must be 100% client-side only (src/, dist/)
- **Customer implementations** - Client-side only with no SSR dependencies
- **Development infrastructure** - CAN use SSR (demo servers, error reporting, dev tooling)
- **Demo applications** - Should demonstrate client-side patterns but may run on SSR frameworks
for convenience

**Key principle**: Anything that ships to customers or gets imported by customers must work in
pure client-side environments. Development and demo infrastructure can use whatever is most
efficient.

### 3. Library Rebuilding
- **Always rebuild the library after changes to src/**: `pnpm build`
- **Restart demo servers** after library rebuilds to pick up changes
- **Demo apps use local file dependency**: Changes require full restart cycle

AccountCreationForm and SignInForm are the primary authentication components.


## Development Commands

### Main Library
```bash
# Core development
pnpm build                    # Build the library (required after src/ changes)
pnpm build:watch              # Watch mode for development
pnpm test                     # Run all tests
pnpm test:unit                # Unit tests only
pnpm test:integration         # Integration tests only
pnpm test:smoke               # Quick smoke tests

# Code quality
pnpm check                    # Run Biome linting and formatting checks
pnpm check:fix                # Auto-fix Biome issues
pnpm typecheck                # TypeScript type checking
```

### Demo Applications
```bash
# From library root
pnpm example:flows-app-demo           # Main authentication showcase
pnpm example:flows-app-demo:local     # Force local API server
pnpm example:flows-app-demo:production # Force production API server

# From demo directories
cd examples/flows-app-demo && pnpm dev:auto        # Smart API detection
cd examples/tasks-app-demo && pnpm dev             # Task management demo
```

## Architecture Overview

### Core Philosophy
- **Passwordless-only authentication** - No traditional passwords supported
- **100% cookie-free by default** - Privacy-first architecture
- **Client-only library** - All authentication logic runs in browser
- **Multi-domain support** - Unified backend serves thepia.com and thepia.net

### State Machine Architecture
- **XState-inspired without dependency** - Saves ~18KB bundle size
- **Manual TypeScript implementation** - States, transitions, guards, actions
- **Svelte store integration** - Reactive state management
- **Event-driven design** - Comprehensive auth event system

### Key Components
- **`createAuthStore(config)`** - Main auth store factory (NOT `getAuthStore`)
- **SignInForm** - Primary authentication component
- **Service Worker integration** - Background sync for offline capability
- **Error reporting system** - Smart server detection with fallbacks


## Correct Patterns

### Dynamic Imports for Client Libraries
```svelte
<script>
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  
  let authStore = null;
  
  onMount(async () => {
    if (!browser) return;
    
    try {
      const { createAuthStore } = await import('@thepia/flows-auth');
      authStore = createAuthStore({
        apiBaseUrl: 'https://api.thepia.com',
        domain: 'thepia.net',
        enablePasskeys: true,
        enableMagicLinks: true
      });
    } catch (error) {
      console.error('Failed to load auth:', error);
    }
  });
</script>

{#if browser && authStore}
  <!-- Auth components here -->
{/if}
```

### Avoid Static Imports for Client Libraries
```svelte
<!-- ❌ WRONG - Will cause SSR errors -->
<script>
  import { createAuthStore } from '@thepia/flows-auth';
</script>

<!-- ✅ CORRECT - Use dynamic imports in onMount -->
```

## API Server Architecture

### Development Environment Detection
- **Local API server**: `https://dev.thepia.com:8443` (requires thepia.com repo)
- **Production API**: `https://api.thepia.com`
- **Smart detection**: Automatically checks local availability, falls back to production
- **Demo servers**: Can run on `dev.thepia.net:5176` with proper SSL certs

### Performance Optimization (Zero-Delay Production)
- **Production domains** (flows.thepia.net, *.thepia.net, *.thepia.com): Use production API immediately (0ms)
- **Development domains** (dev.thepia.net, dev.thepia.com): Check local server first, fallback to production (0-3000ms)
- **Localhost**: Always use production API immediately (0ms)
- **Key optimization**: Non-dev domains skip the 3-second local server health check

### Error Reporting Strategy
- **Development only**: Frontend error reporting not implemented for production
- **Smart server detection**: Prefers local demo server → local API server → disabled
- **Health check endpoints**: `/health` and `/dev/error-reports` for availability testing
- **Console logging**: Formatted error reports in development terminal

## WebAuthn Implementation

### Conditional UI Requirements
- **Key insight**: `autocomplete="email webauthn"` alone is NOT enough
- **Conditional mediation required**: Must call `navigator.credentials.get()` with `mediation: 'conditional'`
- **Proper implementation**:
  ```javascript
  const credential = await navigator.credentials.get({
    publicKey: {
      challenge: challenge,
      allowCredentials: [], // Empty allows any credential
      timeout: 60000,
      userVerification: 'preferred'
    },
    mediation: 'conditional' // Enables autosuggest in email field
  });
  ```

### Testing Requirements
- **HTTPS required**: WebAuthn only works over HTTPS in production
- **Local development**: Works on localhost for basic testing
- **Full testing**: Use `https://dev.thepia.net:5176` with proper certificates

## Known Issues & Workarounds

### Vite Dynamic Import Analysis
- **Issue**: Vite tries to resolve dynamic imports even in `onMount()`
- **Workaround**: Use browser guards and proper error handling
- **Future**: Research vite config options to exclude packages

### Library Development Cycle
1. Make changes to `src/`
2. Run `pnpm build` to rebuild library
3. Restart demo servers to pick up changes
4. Hard refresh browser to clear cache

## Testing Strategy

### ⚠️ CRITICAL TESTING PRINCIPLES

#### Integration Tests - NO MOCKING POLICY
- **NEVER mock networking in integration tests** - This defeats the purpose of integration testing
- **NEVER mock fetch, HTTP requests, or API calls** - Integration tests must validate real network behavior
- **NEVER mock external services** - Integration tests verify actual service integration
- **ALL mocking in integration tests requires highest level of scrutiny and explicit sign-off**

**📋 FORMAL POLICY**: See [API Contract Testing Policy](docs/testing/API_CONTRACT_TESTING_POLICY.md)

#### API Contract Requirements
- **thepia.com/docs/auth/** is the single source of truth for API behavior
- **flows-auth integration tests** must reference specific API contract scenarios
- **All API endpoints** must have documented contracts before integration testing
- **Test scenarios** must be organized by expected API behavior

#### Unit Tests vs Integration Tests
- **Unit tests**: Mock everything external (fetch, APIs, services) - test logic in isolation  
- **Integration tests**: Mock nothing - test real integrations against live services
- **If you need to mock something in an integration test, it's probably not an integration test**

### Test Categories
- **Unit tests**: Core functions, utilities, API clients - **HEAVY MOCKING**
- **Integration tests**: End-to-end flows against real API servers - **NO MOCKING**
- **WebAuthn tests**: Limited to Chromium virtual authenticator - **BROWSER API MOCKING ONLY**
- **Environment tests**: Local vs production API server detection - **NO MOCKING**

### API Server Detection Strategy for Integration Tests
Following thepia.com patterns, integration tests should use simplified server detection:

1. **Single Detection Function**: Use one consistent API detection strategy across all tests
2. **Clear Precedence**: Local server first (`https://dev.thepia.com:8443`), production second (`https://api.thepia.com`)
3. **No Silent Passes**: Always fail loudly if expected API server is unreachable
4. **Timeout-based Detection**: 3-second timeout for local server health check
5. **Environment Override**: `TEST_API_URL` environment variable for explicit override

**❌ Anti-patterns to avoid:**
- Hardcoded API URLs in test files
- Complex CI detection logic  
- Different detection strategies in different tests
- Silent skipping of tests when API unavailable

**✅ Correct pattern:**
```typescript
// In test-setup.ts - single source of truth
const detectApiServer = async (): Promise<string> => {
  if (process.env.TEST_API_URL) return process.env.TEST_API_URL;
  
  // Try local first with 3s timeout
  try {
    const response = await fetch('https://dev.thepia.com:8443/health', { 
      signal: AbortSignal.timeout(3000) 
    });
    if (response.ok) return 'https://dev.thepia.com:8443';
  } catch {}
  
  // Fallback to production - always works or fails explicitly
  return 'https://api.thepia.com';
};
```

### Running Specific Tests
```bash
# Unit tests (with mocking)
pnpm test:unit                 # Unit tests with isolated mocking
pnpm test:state-machine        # Auth state machine unit tests
pnpm test:api                  # API client unit tests

# Integration tests (no mocking)
pnpm test:integration          # Full integration tests against live APIs
pnpm test:auth-store          # Auth store integration tests  
pnpm test:integration:env     # API environment detection tests
```

## Documentation Structure

- **`/docs/README.md`** - Main documentation hub
- **`/docs/auth/`** - Authentication system documentation
- **`/docs/development/`** - Development principles and architecture
- **`/docs/privacy/`** - Zero-cookie architecture details
- **`/CLAUDE.md`** - This file (critical for AI development assistance)

## Common Debugging

### Cache Issues
- **Hard refresh**: Cmd+Shift+R (Safari) or Ctrl+Shift+R (Chrome)
- **DevTools**: "Empty Cache and Hard Reload"
- **Incognito mode**: Fresh environment for testing

### Import Errors
- Check if using `createAuthStore` not `getAuthStore`
- Ensure dynamic imports in `onMount()` with browser guards
- Verify library was rebuilt after src/ changes

### Error Reporting Issues
- Check console for error reporting initialization logs
- Verify demo server is running with proper endpoints
- Test with manual error reporting button when available

This codebase implements a sophisticated, privacy-first authentication system with comprehensive WebAuthn support. The architecture prioritizes bundle size, security, and developer experience while maintaining flexibility for various deployment scenarios.