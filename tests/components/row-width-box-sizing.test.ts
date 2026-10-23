/**
 * Reproduces a reported bug: rows in the sign-in form (the email input,
 * buttons, the new-user full-name field) don't line up -- they render at
 * slightly different widths even though every one of them is `width: 100%`
 * of the same container.
 *
 * Root cause: `width: 100%` is content-box by default, so any row that also
 * has padding/border renders wider than a sibling that happens to be
 * border-box. Fix has two parts, applied once at the form level rather than
 * patched per component (see SignInForm.css/.svelte's header comment for why
 * it's scoped to `.auth-form` rather than a page-global `*`/`html` reset):
 *
 * 1. `.auth-form` and everything inside it is forced to `box-sizing:
 *    border-box`, so `width: 100%` always means "outer edge matches the
 *    container", regardless of padding/border -- including
 *    `@thepia/branding`'s `.input-brand`, which this library doesn't own
 *    and can't otherwise change the `width: 100%` it declares.
 * 2. The form's direct rows are laid out with `display: grid; gap: ...`
 *    instead of default block flow + scattered per-row margins, so spacing
 *    is centralized (one `gap` covers the container) and rows fill the
 *    container width via grid's default `justify-items: stretch`, rather
 *    than each row separately declaring `width: 100%`.
 *
 * Both React and Svelte are checked -- they intentionally share class
 * names/CSS 1:1 (see SignInForm.tsx's header comment).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(__dirname, '../..');

function ruleFor(css: string, selector: string): string | null {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Selector must start at a boundary (not mid-identifier, e.g. `button.auth-btn`
  // should not match a lookup for `.auth-btn`), and must be the whole selector
  // (not e.g. `.auth-btn-full` matching a `.auth-btn` lookup).
  const match = css.match(new RegExp(`(?<![\\w-])${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : null;
}

describe('sign-in form: consistent row widths (box-sizing + grid)', () => {
  describe('React', () => {
    const signInFormCss = readFileSync(resolve(ROOT, 'src/react/components/SignInForm.css'), 'utf-8');
    const signInCoreCss = readFileSync(resolve(ROOT, 'src/react/components/core/SignInCore.css'), 'utf-8');

    it('scopes a box-sizing: border-box reset to .auth-form and its descendants', () => {
      expect(signInFormCss).toMatch(/\.auth-form\s*,\s*\n?\s*\.auth-form \*/);
      const rule = ruleFor(signInFormCss, '.auth-form,\n.auth-form *,\n.auth-form *::before,\n.auth-form *::after');
      // Fall back to a looser check in case formatting differs -- the
      // important thing is the declaration exists somewhere selector-scoped
      // to `.auth-form *`.
      const hasReset = rule?.includes('box-sizing: border-box') ?? /\.auth-form \*[^{]*\{[^}]*box-sizing:\s*border-box/.test(signInFormCss);
      expect(hasReset).toBe(true);
    });

    it('does NOT scope the reset to the page (no bare * or html selector)', () => {
      expect(signInFormCss).not.toMatch(/(?<![\w.-])html\s*\{[^}]*box-sizing/);
      expect(signInFormCss).not.toMatch(/^\*\s*\{[^}]*box-sizing/m);
    });

    it('lays out form rows with grid + gap instead of block flow + margins', () => {
      const rule = ruleFor(signInCoreCss, '.sign-in-core form');
      expect(rule).toContain('display: grid');
      expect(rule).toMatch(/gap:\s*\S/);
    });

    it('lays out the button section with grid + gap', () => {
      const rule = ruleFor(signInCoreCss, '.sign-in-core .button-section');
      expect(rule).toContain('display: grid');
      expect(rule).toMatch(/gap:\s*\S/);
    });

    it('AuthNewUserInfo row no longer double-spaces with its own margin (form gap owns spacing)', () => {
      const css = readFileSync(resolve(ROOT, 'src/react/components/core/AuthNewUserInfo.css'), 'utf-8');
      const rule = ruleFor(css, '.auth-new-user-info');
      expect(rule).toBeNull();
    });
  });

  describe('Svelte -- same class names, same fix', () => {
    function styleBlock(svelte: string): string {
      const match = svelte.match(/<style[^>]*>([\s\S]*)<\/style>/);
      if (!match) throw new Error('No <style> block found');
      return match[1];
    }

    const signInFormSvelte = readFileSync(resolve(ROOT, 'src/svelte/components/SignInForm.svelte'), 'utf-8');
    const signInCoreSvelte = readFileSync(resolve(ROOT, 'src/svelte/components/core/SignInCore.svelte'), 'utf-8');
    const signInCoreStyle = styleBlock(signInCoreSvelte);

    it('scopes a :global(.auth-form) box-sizing: border-box reset (reaches into child components)', () => {
      const style = styleBlock(signInFormSvelte);
      expect(style).toMatch(/:global\(\.auth-form \*\)/);
      expect(style).toMatch(/:global\(\.auth-form[^)]*\)[\s\S]{0,200}box-sizing:\s*border-box/);
    });

    it('lays out form rows with grid + gap', () => {
      const rule = ruleFor(signInCoreStyle, 'form');
      expect(rule).toContain('display: grid');
      expect(rule).toMatch(/gap:\s*\S/);
    });

    it('lays out the button section with grid + gap', () => {
      const rule = ruleFor(signInCoreStyle, '.button-section');
      expect(rule).toContain('display: grid');
      expect(rule).toMatch(/gap:\s*\S/);
    });

    it('AuthNewUserInfo.svelte row no longer double-spaces with its own margin', () => {
      const svelte = readFileSync(
        resolve(ROOT, 'src/svelte/components/core/AuthNewUserInfo.svelte'),
        'utf-8'
      );
      const rule = ruleFor(styleBlock(svelte), '.auth-new-user-info');
      expect(rule).toBeNull();
    });
  });
});
