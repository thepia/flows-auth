# flows-auth - Claude Code Guide

**📚 Full documentation**: See [docs/README.md](docs/README.md) and repository README.md

## ⚠️ CRITICAL Anti-Patterns

1. **Auth Store Singleton** - NEVER create authStore in components. Always use shared instance from context or parent.
2. **Library Rebuild Required** - Always `pnpm build` after src/ changes. Restart demo servers.
3. **GitHub Packages Publishing** - Use global ~/.npmrc, never local .npmrc with $NODE_AUTH_TOKEN.
4. **NO Mocking in Integration Tests** - See [docs/testing/API_CONTRACT_TESTING_POLICY.md](docs/testing/API_CONTRACT_TESTING_POLICY.md)

## Essential Commands

```bash
pnpm build              # Build library (required after src/ changes)
pnpm test               # Run all tests
pnpm check:fix          # Fix linting
```

## Quick References

- **API Contracts**: See thepia.com/docs/auth/
- **Component Specs**: [docs/specifications/](docs/specifications/)
- **Known Issues**: [docs/CRITICAL_ISSUES_AND_FIXES.md](docs/CRITICAL_ISSUES_AND_FIXES.md)
- **Session Management**: [docs/SESSION_MANAGEMENT_REQUIREMENTS.md](docs/SESSION_MANAGEMENT_REQUIREMENTS.md)

## Svelte MCP

REQUIRED: Use `svelte-autofixer` on all Svelte code before sending to user.
