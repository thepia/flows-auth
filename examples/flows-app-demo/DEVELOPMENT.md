# Development Workflow for flows-app-demo

## Working with Local Library Changes

When developing `@thepia/flows-auth` library and testing in this demo:

### Option 1: Build + Restart (Current)
```bash
# In flows-auth root
pnpm build

# Kill and restart demo server
# Server picks up new build on restart
```

**Pros**: Simple, works with file: dependency
**Cons**: Requires manual restart, Vite caches aggressively

### Option 2: Watch Mode + Force Optimization (Recommended)
```bash
# Terminal 1: flows-auth root - Watch build
pnpm build:watch

# Terminal 2: flows-app-demo - Run with forced optimization
pnpm dev
```

Vite config already has `optimizeDeps.force: true` which re-bundles on every start.

**Pros**: Build auto-rebuilds, restart picks up changes immediately
**Cons**: Still requires restart after library changes

### Option 3: Disable Caching (Slowest but Most Reliable)
```bash
# Terminal 1: flows-auth root
pnpm build:watch

# Terminal 2: flows-app-demo
VITE_DISABLE_CACHE=true pnpm dev
```

**Pros**: Always fresh, no cache issues
**Cons**: Slower startup, more memory usage

## Vite Caching Behavior

Vite caches pre-bundled dependencies in `node_modules/.vite/deps/`:
- **Normally**: Only re-bundles when `package.json` changes
- **With `force: true`**: Re-bundles on every server start
- **With file: dependency**: Doesn't detect changes automatically

## Manual Cache Clear

If you see stale code despite rebuilding:

```bash
# Clear Vite cache
rm -rf node_modules/.vite

# Clear SvelteKit cache
rm -rf .svelte-kit

# Restart dev server
pnpm dev
```

## Recommended Workflow

For active library development:

1. **Keep library building**: `cd ../.. && pnpm build:watch`
2. **Restart demo after changes**: Kill (Ctrl+C) and restart `pnpm dev`
3. **Hard refresh browser**: Cmd+Shift+R (Safari) or Ctrl+Shift+R (Chrome)

The `optimizeDeps.force: true` in vite.config.ts ensures fresh builds on every restart.
