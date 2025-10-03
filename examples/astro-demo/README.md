# Astro Islands Demo - Flows Auth

This demo showcases how to use **Zustand vanilla stores** with **Astro's island architecture** for shared state management across multiple Svelte islands with partial hydration.

## 🎯 What This Demonstrates

1. **Singleton Store Pattern** - One Zustand store instance shared across all islands
2. **Partial Hydration** - Different islands hydrate at different times (`client:load`, `client:visible`, `client:idle`)
3. **Reactive State Sharing** - Changes in one island automatically update all other islands
4. **Framework Agnostic** - The same pattern works with React, Preact, Vue, Solid, or Svelte islands

## 🏗️ Architecture

```
src/
├── lib/
│   └── shared-auth-store.ts      # Singleton Zustand store instance
├── components/
│   ├── AuthHeaderIsland.svelte   # Header island (client:idle)
│   ├── SignInIsland.svelte       # Sign-in form (client:load)
│   └── UserStatusIsland.svelte   # Status display (client:visible)
└── pages/
    └── index.astro                # Main page with islands
```

### Key Files

#### `src/lib/shared-auth-store.ts`
Creates a **singleton instance** of the Zustand auth store that all islands import.

#### Island Components
Each Svelte island imports the same store instance and wraps it with `makeSvelteCompatible()` for reactivity.

## 🚀 Running the Demo

```bash
# Install dependencies
pnpm install

# Start dev server with HTTPS (keep this running)
pnpm dev
```

**Then visit** `https://dev.thepia.net:4321` in your browser.

### Prerequisites

- **mkcert CA installed**: The demo uses HTTPS with mkcert certificates
  ```bash
  brew install mkcert
  mkcert -install
  ```

- **dev.thepia.net in /etc/hosts**: Add if not already present
  ```bash
  echo "127.0.0.1 dev.thepia.net thepia.local" | sudo tee -a /etc/hosts
  ```

- **Certificates**: Located in `certs/` directory (already included)

### Troubleshooting

**"Site can't be reached"**:
1. Make sure `pnpm dev` is running in a terminal
2. Check `/etc/hosts` has `127.0.0.1 dev.thepia.net`
3. Try `https://localhost:4321` as fallback

**Certificate warnings**:
1. Run `mkcert -install` to trust the development CA
2. Restart your browser

## 🧪 Try It Out

1. **Enter an email** in the Sign-In Island (blue border)
2. **Click "Check User"** to simulate user discovery
3. **Watch the User Status Island** (green border) update automatically
4. **See the Auth Header Island** (orange border) reflect the changes
5. **Open DevTools** to see Zustand devtools (if enabled in development)

## 🔑 Key Concepts

### 1. Singleton Store Instance

All islands must share the same store instance for state to synchronize.

### 2. No Context Providers Needed

Unlike React Context, Zustand stores are imported directly - no providers required!

### 3. Partial Hydration Strategies

Different islands can hydrate at different times while sharing the same store.

### 4. Framework Agnostic

The same Zustand store works with any framework - mix React, Svelte, Vue islands!

## 📚 Learn More

- [Astro Islands Documentation](https://docs.astro.build/en/concepts/islands/)
- [Zustand Documentation](https://docs.pmnd.rs/zustand/getting-started/introduction)
- [Flows Auth Documentation](../../README.md)
