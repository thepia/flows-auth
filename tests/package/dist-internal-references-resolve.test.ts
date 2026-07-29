/**
 * Declaration File Internal Reference Resolution
 *
 * bundle-api-validation.test.ts checks that the top-level package.json export
 * map entries exist on disk. It does NOT check that files *referenced from
 * inside* those entries also exist. tsc's declaration-only emit for the core
 * target (tsconfig.build.json: emitDeclarationOnly, rootDir: src/core) mirrors
 * the source module tree file-by-file (e.g. dist/utils/i18n.d.ts), but the
 * actual JS comes from tsup as a single bundled dist/index.js. A barrel like
 * `export * from './utils/i18n.js'` in dist/index.d.ts is only valid if
 * dist/utils/i18n.js also exists -- and nothing emits it, since JS emission is
 * intentionally bundled, not per-file. This walks every dist/**\/*.d.ts and
 * confirms every relative `.js` import/export specifier actually resolves.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT_PATH = join(__dirname, '../..');
const DIST_PATH = join(ROOT_PATH, 'dist');

function findDeclarationFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...findDeclarationFiles(full));
    } else if (entry.name.endsWith('.d.ts')) {
      out.push(full);
    }
  }
  return out;
}

// Matches `from './relative/path.js'` in both `export ... from` and `import ... from`.
const RELATIVE_JS_SPECIFIER = /\bfrom\s+['"](\.[^'"]+\.js)['"]/g;

function resolveSpecifier(declFile: string, specifier: string): string {
  return resolve(dirname(declFile), specifier);
}

describe('Declaration file internal references (dist/**/*.d.ts)', () => {
  it('every relative .js specifier inside a .d.ts resolves to a real file', () => {
    const declFiles = findDeclarationFiles(DIST_PATH);
    expect(declFiles.length).toBeGreaterThan(0);

    const missing: Array<{ declFile: string; specifier: string; resolvedPath: string }> = [];

    for (const declFile of declFiles) {
      const content = readFileSync(declFile, 'utf-8');
      for (const match of content.matchAll(RELATIVE_JS_SPECIFIER)) {
        const specifier = match[1];
        const resolvedPath = resolveSpecifier(declFile, specifier);
        if (!existsSync(resolvedPath) || !statSync(resolvedPath).isFile()) {
          missing.push({
            declFile: declFile.replace(`${ROOT_PATH}/`, ''),
            specifier,
            resolvedPath: resolvedPath.replace(`${ROOT_PATH}/`, '')
          });
        }
      }
    }

    if (missing.length > 0) {
      const report = missing
        .map((m) => `  ${m.declFile}: '${m.specifier}' -> missing ${m.resolvedPath}`)
        .join('\n');
      throw new Error(
        `${missing.length} declaration file reference(s) point at .js files that were never emitted:\n${report}\n\n` +
          `This breaks consumers that resolve modules structurally (e.g. Deno's node_modules resolution), ` +
          `even though runtime imports of the bundled dist/index.js work fine. ` +
          `Root cause: tsconfig.build.json emits per-file declarations (mirroring src/core/**) via ` +
          `emitDeclarationOnly, while tsup bundles the JS into a single dist/index.js -- the two output ` +
          `shapes don't match. Fix by rolling up the declarations to match the bundled JS shape (or emitting ` +
          `matching per-file JS), not by patching individual re-exports.`
      );
    }
  });
});
