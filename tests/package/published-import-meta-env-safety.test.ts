/**
 * Published-artifact safety: no Vite-only `import.meta.env` leaks into dist.
 *
 * The 1.3.0 published build shipped a literal `import.meta.env.DEBUG` (and an
 * unguarded `import.meta.env.PUBLIC_API_URL`) in dist/index.js,
 * dist/react/index.js and dist/svelte/utils/debug.js. `import.meta.env` is a
 * Vite-family construct the build leaves for the CONSUMER's bundler to
 * statically replace. That holds for a Vite/Astro/SvelteKit app, and the
 * symlinked workspace masked it because vitest transforms the source -- but
 * any consumer that does NOT transform the package (plain Node, plain vitest
 * against the INSTALLED package, Jest, a non-Vite bundler) sees
 * `import.meta.env === undefined` at runtime, so `.DEBUG` throws:
 *
 *     TypeError: Cannot read properties of undefined (reading 'DEBUG')
 *
 * and `createAuthStore()` is unusable from the published package.
 *
 * Two complementary checks:
 *  1. Behavioral -- import the BUILT dist in a plain `node` child process (no
 *     transform, the real external-consumer condition) and assert the entry
 *     points don't throw. This is the exact reproduction of the reported bug.
 *  2. Static invariant -- assert no shipped `.js` carries an UNGUARDED
 *     `import.meta.env.X`. The safe idiom (already used in default-config.ts)
 *     is `import.meta.env?.X`, which resolves to `undefined` instead of
 *     throwing when `import.meta.env` is absent. This catches the whole class
 *     (including future regressions) deterministically, without a build.
 *
 * Requires `dist` to already be built (`pnpm build`), same as the sibling
 * tests/package/* bundle tests.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

const ROOT = resolve(__dirname, '../..');
const FIXTURE = resolve(__dirname, 'fixtures/published-consumer.mjs');

/** All published JS entry points that an external consumer can load. */
const SHIPPED_JS = ['dist/index.js', 'dist/react/index.js', 'dist/svelte/utils/debug.js'];

function runFixture(target: string): { ok: boolean; output: string } {
  try {
    const output = execFileSync('node', [FIXTURE, target], {
      cwd: ROOT,
      encoding: 'utf8',
      // A clean env: do NOT leak this process's vars into the child, so the
      // check reflects a bare consumer runtime.
      env: { PATH: process.env.PATH ?? '' }
    });
    return { ok: output.includes('OK'), output };
  } catch (error) {
    const e = error as { stdout?: string; stderr?: string; message?: string };
    return { ok: false, output: [e.stdout, e.stderr, e.message].filter(Boolean).join('\n') };
  }
}

describe('Published artifact: import.meta.env safety', () => {
  beforeAll(() => {
    expect(
      existsSync(resolve(ROOT, 'dist/index.js')),
      'dist/index.js missing -- run `pnpm build` first'
    ).toBe(true);
  });

  it('createAuthStore() does not throw when imported from the built package in plain Node', () => {
    const { ok, output } = runFixture('core');
    expect(ok, `createAuthStore() threw in a plain-Node consumer:\n${output}`).toBe(true);
  });

  it('the Svelte debug util does not throw when imported from the built package in plain Node', () => {
    const { ok, output } = runFixture('svelte-debug');
    expect(ok, `debug() threw in a plain-Node consumer:\n${output}`).toBe(true);
  });

  it('no shipped .js leaks an unguarded import.meta.env.<member>', () => {
    // A `import.meta.env.<member>` access throws when `import.meta.env` is
    // undefined (the non-Vite consumer runtime). Two forms are SAFE to ship:
    //   - `import.meta.env?.X`            -- optional chaining short-circuits.
    //   - `import.meta.env && import.meta.env.X` -- the `&&` guard short-
    //     circuits, and (unlike `?.`) still constant-folds + DCEs under Vite,
    //     so debug() keeps stripping (see debug-log-stripping.test.ts).
    // Scrub both safe forms, then any remaining bare member access is a leak.
    const guardAnd = /import\.meta\.env\s*&&\s*import\.meta\.env\.[A-Za-z_$][\w$]*/g;
    const optChain = /import\.meta\.env\?\.[A-Za-z_$][\w$]*/g;
    const bareAccess = /import\.meta\.env\.[A-Za-z_$][\w$]*/g;

    const offenders: string[] = [];
    for (const rel of SHIPPED_JS) {
      const abs = resolve(ROOT, rel);
      if (!existsSync(abs)) continue;
      const scrubbed = readFileSync(abs, 'utf8')
        .replace(guardAnd, 'GUARDED')
        .replace(optChain, 'GUARDED');
      for (const hit of scrubbed.match(bareAccess) ?? []) offenders.push(`${rel}: ${hit}`);
    }

    expect(
      offenders,
      `shipped dist carries unguarded import.meta.env access(es); guard with ` +
        `\`import.meta.env && import.meta.env.X\` (DCE-safe) or \`import.meta.env?.X\`:\n${offenders.join('\n')}`
    ).toEqual([]);
  });
});
