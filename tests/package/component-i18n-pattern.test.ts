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
 * The old "dist/src in sync with preprocessed src" concept is GONE — there is
 * no more dist/src. Instead we verify the built Svelte target under
 * dist/svelte/**:
 *   - every shipped .svelte is TS-free (no lang="ts", no `import type`, no
 *     `interface`) so consumers can compile it without a TS preprocessor, and
 *   - every src component has a corresponding built component.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '../..');
const SRC_SVELTE_DIR = join(ROOT, 'src/svelte');
const SRC_COMPONENTS_DIR = join(ROOT, 'src/svelte/components');
const DIST_SVELTE_DIR = join(ROOT, 'dist/svelte');
const DIST_COMPONENTS_DIR = join(ROOT, 'dist/svelte/components');

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
    const svelteFiles = walkSvelte(SRC_SVELTE_DIR);

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

  describe('dist/svelte — TS-free preprocessed components', () => {
    it('should have a built dist/svelte directory (run pnpm build if missing)', () => {
      expect(existsSync(DIST_SVELTE_DIR)).toBe(true);
    });

    const distSvelteFiles = walkSvelte(DIST_SVELTE_DIR);

    it('should have built .svelte files', () => {
      expect(distSvelteFiles.length).toBeGreaterThan(0);
    });

    for (const distFile of distSvelteFiles) {
      const rel = relative(DIST_SVELTE_DIR, distFile);
      it(`dist/svelte/${rel} must be TS-free`, () => {
        const content = readFileSync(distFile, 'utf-8');
        // Shipped components must compile without a consumer-side TS preprocessor.
        expect(content, `dist/svelte/${rel} still has lang="ts"`).not.toMatch(
          /<script[^>]*\slang=["']ts["']/
        );
        expect(content, `dist/svelte/${rel} still has 'import type'`).not.toMatch(
          /\bimport\s+type\b/
        );
        expect(content, `dist/svelte/${rel} still has an 'interface' declaration`).not.toMatch(
          /\binterface\s+\w/
        );
      });
    }
  });

  describe('dist/svelte/components — mirrors src components', () => {
    const srcComponents = walkSvelte(SRC_COMPONENTS_DIR);

    it('should have source components to check', () => {
      expect(srcComponents.length).toBeGreaterThan(0);
    });

    for (const srcFile of srcComponents) {
      const rel = relative(SRC_COMPONENTS_DIR, srcFile);
      const distFile = join(DIST_COMPONENTS_DIR, rel);
      it(`dist/svelte/components/${rel} must exist (built from source)`, () => {
        expect(
          existsSync(distFile),
          `dist/svelte/components/${rel} is missing — run pnpm build`
        ).toBe(true);
        // Each built component ships a sibling .svelte.d.ts.
        expect(
          existsSync(`${distFile}.d.ts`),
          `dist/svelte/components/${rel}.d.ts is missing — run pnpm build`
        ).toBe(true);
      });
    }
  });
});
