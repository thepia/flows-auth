/**
 * Reproduces a reported bug: the react-demo's inputs render with no visible
 * styling (no border, no padding, no focus/error states).
 *
 * `EmailInput.tsx`/`CodeInput.tsx` (src/react/components/core/) render their
 * `<input>` with class `input-brand`, but that class is only ever *defined*
 * by `@thepia/branding`'s `css/components.css` -- flows-auth's own
 * `dist/flows-auth.css` never declares it (see EmailInput.css: only
 * `.email-input-label`'s color is set there). Every other example in this
 * repo (auth-demo, astro-demo, flows-app-demo, tasks-app-demo) depends on
 * `@thepia/branding` and imports `@thepia/branding/css/components` itself.
 * react-demo has neither the dependency nor the import, so `.input-brand`
 * resolves to nothing and the `<input>` renders as a bare, unstyled native
 * element.
 *
 * This runs a real `vite build` of examples/react-demo (not a dev server)
 * and asserts the emitted CSS actually defines `.input-brand` -- if the
 * demo were wired up correctly, `@thepia/branding`'s component styles would
 * be bundled into its output.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

const EXAMPLE_DIR = resolve(__dirname, '../../examples/react-demo');
const DIST_DIR = resolve(EXAMPLE_DIR, 'dist');

describe('react-demo: branding component CSS is bundled', () => {
  let cssBundle: string;

  beforeAll(() => {
    rmSync(DIST_DIR, { recursive: true, force: true });

    execFileSync('pnpm', ['exec', 'vite', 'build'], {
      cwd: EXAMPLE_DIR,
      stdio: 'pipe'
    });

    const assetsDir = resolve(DIST_DIR, 'assets');
    const cssFile = readdirSync(assetsDir).find((f) => f.endsWith('.css'));
    if (!cssFile) throw new Error(`No CSS asset found in ${assetsDir}`);
    cssBundle = readFileSync(resolve(assetsDir, cssFile), 'utf-8');
  }, 60_000);

  it('produces a CSS asset', () => {
    expect(cssBundle.length).toBeGreaterThan(0);
  });

  it('defines a styled .input-brand rule (border/padding), not just the bare class name', () => {
    // The class name alone isn't enough proof -- assert it carries real
    // declarations (border), which only `@thepia/branding/css/components`
    // provides.
    const rule = /\.input-brand\s*\{[^}]*border[^}]*\}/;
    expect(cssBundle).toMatch(rule);
  });
});
