import sveltePreprocess from 'svelte-preprocess';

// Used by `svelte-package` (the ./svelte target build) to preprocess the .svelte
// files under src/svelte: transpiles the <script lang="ts"> body to plain JS and
// emits per-file .svelte.d.ts.
//
// NOTE: svelte-preprocess (not vitePreprocess) — vitePreprocess's TS transform
// relies on Vite's esbuild pipeline and is a no-op when svelte-package runs it
// standalone. svelte-preprocess transpiles TS on its own. It leaves the now-
// redundant lang="ts" attribute, which scripts/build.mjs strips afterward so the
// shipped components compile without a consumer-side TS preprocessor.
export default {
  preprocess: sveltePreprocess()
};
