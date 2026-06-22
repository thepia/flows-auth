/**
 * Component i18n Pattern Tests
 *
 * Verifies that Svelte components use the `m` proxy from utils/i18n for
 * translations, not direct string-literal named imports from paraglide.
 *
 * String-literal imports (`import { "code.label" as codeLabel } from '...'`)
 * cause SyntaxErrors in WebKit/Safari and bypass the i18n fallback proxy.
 * All components must go through `m['key']()` instead.
 *
 * Also verifies that dist/src/ is in sync with src/ so the consuming app
 * doesn't silently receive stale built components.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '../..');
const SRC_DIR = join(ROOT, 'src');
const DIST_SRC_DIR = join(ROOT, 'dist/src');

function walkSvelte(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkSvelte(full));
    } else if (entry.name.endsWith('.svelte')) {
      results.push(full);
    }
  }
  return results;
}

// Matches: import { "some.key" as alias } or import { "some.key" }
const STRING_LITERAL_IMPORT_RE = /import\s*\{[^}]*"[^"]+"\s*(as\s+\w+)?\s*[^}]*\}\s*from/;

describe('Component i18n Pattern', () => {
  describe('Source files — no string-literal paraglide imports', () => {
    const svelteFiles = walkSvelte(SRC_DIR);

    it('should have Svelte component source files to check', () => {
      expect(svelteFiles.length).toBeGreaterThan(0);
    });

    for (const file of svelteFiles) {
      const rel = relative(ROOT, file);
      it(`${rel} must not use string-literal named imports`, () => {
        const content = readFileSync(file, 'utf-8');
        const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/);
        if (!scriptMatch) return;
        const script = scriptMatch[1];
        const paraglideImports = script
          .split('\n')
          .filter(
            (line) =>
              STRING_LITERAL_IMPORT_RE.test(line) &&
              (line.includes('paraglide') || line.includes('/messages'))
          );
        expect(
          paraglideImports,
          `Found direct paraglide string-literal imports — use m['key']() instead:\n${paraglideImports.join('\n')}`
        ).toHaveLength(0);
      });
    }
  });

  describe('dist/src — in sync with source', () => {
    it('should have a built dist/src directory (run pnpm build if missing)', () => {
      expect(existsSync(DIST_SRC_DIR)).toBe(true);
    });

    const svelteFiles = walkSvelte(SRC_DIR);

    for (const srcFile of svelteFiles) {
      const rel = relative(SRC_DIR, srcFile);
      const distFile = join(DIST_SRC_DIR, rel);
      it(`dist/src/${rel} must match src/${rel}`, () => {
        if (!existsSync(DIST_SRC_DIR)) return; // skip if no build yet
        expect(existsSync(distFile), `dist/src/${rel} is missing — run pnpm build`).toBe(true);
        const srcContent = readFileSync(srcFile, 'utf-8');
        const distContent = readFileSync(distFile, 'utf-8');
        expect(distContent, `dist/src/${rel} is stale — run pnpm build`).toBe(srcContent);
      });
    }
  });
});
