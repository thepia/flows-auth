import { preprocess } from 'svelte/compiler';
import sveltePreprocess from 'svelte-preprocess';

/**
 * Single source of truth for how `.svelte` files are transformed when copied to
 * `dist/src` (see vite.config.ts `copySourceFiles`). Consumers resolve the
 * library via the `svelte`/`source` export conditions and compile these files
 * themselves — but vite-plugin-svelte does NOT run the app's preprocessor on a
 * dependency's `.svelte`. So we ship them already TS-stripped:
 *
 *  - `svelte.preprocess` transpiles the `<script lang="ts">` body to JS.
 *  - it leaves the `lang="ts"` attribute, which would still make a consumer's
 *    Svelte compiler expect TS, so we strip that attribute too.
 *
 * The dist/src sync test (tests/package/component-i18n-pattern.test.ts) imports
 * this same function so "in sync" means "dist === preprocess(src)", not a
 * verbatim copy.
 */
const sveltePreprocessor = sveltePreprocess();

export async function preprocessSvelteSource(code: string, filename: string): Promise<string> {
  const processed = await preprocess(code, sveltePreprocessor, { filename });
  return processed.code.replace(/(<script(?:\s+[^>]*?)?)\s+lang=(["'])ts\2/g, '$1');
}
