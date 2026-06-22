# flows-auth - Claude Code Guide

**Note**: This project uses [bd (beads)](https://github.com/steveyegge/beads)
for issue tracking. Use `bd` commands instead of markdown TODOs.
See AGENTS.md for workflow details.

**📚 Full documentation**: See [docs/README.md](docs/README.md) and repository README.md

## ⚠️ CRITICAL Anti-Patterns

1. **Auth Store Singleton** - NEVER create authStore in components. Always use shared instance from context or parent.
2. **Library Rebuild Required** - Always `pnpm build` after src/ changes. Restart demo servers.
3. **GitHub Packages Publishing** - Use global ~/.npmrc, never local .npmrc with $NODE_AUTH_TOKEN.
4. **NO Mocking in Integration Tests** - See [docs/testing/API_CONTRACT_TESTING_POLICY.md](docs/testing/API_CONTRACT_TESTING_POLICY.md)
5. **Pinned to Svelte 4** - Do NOT bump `svelte`, `@sveltejs/vite-plugin-svelte` (stay `^3`), `@testing-library/svelte` (`^4`), `svelte-check` (`^3`), `vitest`/`@vitest/*` (≤`^3`, all same major), or `vite` (`^5`) to a Svelte-5-coupled major. Always `pnpm install` after editing package.json (a stale install causes phantom typecheck errors). See the **`maintain-dependencies`** skill before any dependency or formatting change.
6. **`src/` is browser-only** - No Node in `src/`: use `ReturnType<typeof setTimeout>` (not `NodeJS.Timeout`), `import.meta.env` (not `process.env`), static `import` (not `require`). Tests and `*.config.ts` are the Node side (use the `node:` import protocol).

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
