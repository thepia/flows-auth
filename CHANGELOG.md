# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
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
