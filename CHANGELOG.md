# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - Core / Svelte target split (breaking, coordinated)

Packaging refactor (Phase 1 of `docs/MULTI_FRAMEWORK_PACKAGING_PLAN.md`): the library
is now a **framework-agnostic core** (`.`) plus a **Svelte UI target** (`./svelte`),
built the canonical way (`tsup` for core, `@sveltejs/package` for Svelte). This also
fixes the long-standing bug where the package shipped un-preprocessed TypeScript
`.svelte` source and broke consumer builds — components now ship preprocessed (TS-free)
with per-file `.svelte.d.ts`.

Although moving export paths is technically breaking, this ships as **1.2.0**: all
first-party consumers are migrated in the same change via the bundled codemod.

### Changed (BREAKING — consumers must migrate)
- **Svelte UI + Svelte-runtime helpers moved to `@thepia/flows-auth/svelte`.** Components
  (`SignInForm`, `AccountCreationForm`, `SignInCore`, `AuthButton`, `Icon`, …) **and** the
  Svelte helpers `makeSvelteCompatible`, `getAuthStoreFromContext`, `setupAuthContext`,
  `createAuthContext`, `assertAuthConfig`, `resetGlobalAuthStore`, `createParaglideI18n`
  are no longer at the package root. Import them from `@thepia/flows-auth/svelte`.
- **Root `.` is now framework-agnostic** (stores, api, utils, types, constants, i18n,
  paraglide runtime, `VERSION`). It carries no `svelte` export condition, so non-Svelte
  bundlers (incl. React, Phase 3) no longer drag in Svelte source.
- **ESM-only.** The CJS build (`dist/index.cjs` / the `require` condition) is removed.
- **Removed export subpaths:** `./stores` and all `./stores/*`, `./types`, `./src`,
  `./dist/style.css`, and the raw `./paraglide/*` / `./src/paraglide/*` aliases.
- `VERSION` is now sourced from `package.json` at build time (can no longer drift).

### Migration
Run the bundled codemod in each consuming repo, then bump the dependency to `^1.2.0`:
```bash
node node_modules/@thepia/flows-auth/scripts/codemod-split-svelte-imports.mjs src
```
It splits each `@thepia/flows-auth` import into a root import (agnostic) + a `/svelte`
import (components + Svelte helpers), and handles dynamic `await import()` forms.
`import type { … }` stays at the root (all types are agnostic). Manually replace any
remaining deep `@thepia/flows-auth/stores/*` or `/types` imports with the root import.
First-party consumers to update in the same train: `examples/*` (done),
`flows.thepia.net`, and `thepia.com` / the `thepia-all` monorepo.

### Added
- Per-target build pipeline: `tsup` (core) + `@sveltejs/package` (Svelte) + a CSS-only
  Vite pass (`dist/flows-auth.css`) + `scripts/build-paraglide.mjs`.
- `scripts/codemod-split-svelte-imports.mjs` — consumer migration codemod.
- `svelte` added to `peerDependencies` (`^5`, optional).
- GitHub Packages publishing configuration
- Biome linting and formatting setup
- Comprehensive CI/CD workflows
- Test coverage reporting with Codecov
- Demo application showcasing library usage
- Commercial license configuration

### Changed
- Migrated from ESLint/Prettier to Biome for code quality
- Updated package.json for GitHub Packages registry
- Enhanced build configuration for better library distribution

### Removed
- ESLint and Prettier dependencies (replaced with Biome)

## [1.0.0] - 2024-06-23

### Added
- Initial release of @thepia/flows-auth
- WebAuthn/Passkey authentication support
- Multi-step authentication flow (Email → Passkey/Password/Magic Link)
- Whitelabel branding and theming system
- Svelte components for authentication UI
- TypeScript support with full type safety
- Comprehensive test suite with Vitest
- SSR compatibility for SvelteKit
- Tree-shakeable exports
- Example implementations
- Complete documentation

### Features
- `SignInForm` component for complete authentication flow
- Individual step components (EmailStep, PasskeyStep, PasswordStep, MagicLinkStep)
- `createAuthStore` for state management
- Configurable branding and styling
- Mobile-optimized responsive design
- Error handling and user feedback
- Authentication state persistence
- Token refresh functionality

### Developer Experience
- Full TypeScript definitions
- Comprehensive test coverage
- Example applications
- Detailed documentation
- Development tools and scripts
