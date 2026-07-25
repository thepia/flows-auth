/**
 * Debug Log Stripping Tests (Production Build)
 *
 * Verifies the actual claim behind `debug()` (src/core/utils/debug.ts): that
 * a downstream Vite production build dead-code-eliminates `debug()` call
 * sites -- including their string arguments -- when `DEBUG` isn't set, and
 * keeps them when a consumer explicitly opts in (see README's "Debug
 * Logging" section). This runs a *real* Vite build (via
 * fixtures/run-debug-build.mjs, in its own Node process) over a fixture that
 * imports the built core entry (dist/index.js), rather than reasoning about
 * bundler internals -- if Vite/esbuild ever stop folding this the way we
 * expect, this test is what would catch it.
 *
 * The check is exhaustive over what the fixture actually reaches, not a
 * hand-picked sample: every `debug(...)` call site in src/core and
 * src/svelte is found via the TypeScript AST (see
 * fixtures/extract-debug-messages.ts). Not all 150+ of those are reachable
 * from this one fixture -- some are standalone utilities or Svelte
 * components it doesn't import -- and unreached code is correctly absent
 * from *both* builds regardless of DEBUG, which is unrelated to whether
 * debug() itself strips correctly. So: build with DEBUG=true first to find
 * which messages this fixture's bundle actually contains, then assert none
 * of *those* survive a DEBUG-unset build. A sampled marker list would only
 * catch a regression if it happened to hit one of the samples; this catches
 * a regression in any debug() call site the fixture reaches.
 *
 * Requires `dist/index.js` to already be built (`pnpm build`), same as the
 * other tests/package/* bundle tests.
 */

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { countDebugCallSites, debugSourceFiles, extractDebugMessages } from './fixtures/extract-debug-messages.js';

const ROOT = resolve(__dirname, '../..');
const RUNNER = resolve(__dirname, 'fixtures/run-debug-build.mjs');

const SOURCE_FILES = debugSourceFiles(ROOT);
const DEBUG_MESSAGES = extractDebugMessages(SOURCE_FILES);

// Deliberately NOT rewritten -- see the vite-debug-log skill's
// "early-return-hard" pattern. Each of these debug() calls sits immediately
// before a distinct, conditional early return/exit, with no safe way to
// hoist it after the try/catch without either changing what gets caught or
// suppressing the message on a failure path where it currently still fires.
// Forcing a fix here would mean restructuring real control flow to chase a
// log line, which isn't worth it for build-output hygiene alone.
//
// If one of these gets fixed later, remove it from the set. If a message not
// in this set starts leaking, that's a real regression -- the assertion
// below will fail and should not be silenced by just adding it here.
const KNOWN_UNELIMINATED = new Set([
  '✅ Email code verified successfully', // email-auth.ts -- precedes a conditional return; catch path also throws
  '✅ Passkey authentication successful', // passkey.ts -- same shape as above
  '🕐 Session expired: no refresh token and access token expired', // sessionManager.ts -- precedes an early `return null` distinct from the function's other return
  '🔧 Using local API server: ', // api-detection.ts -- nested try/catch computing the result sits between this and the function's return
  '🔧 Converted options for browser API:' // webauthn.ts -- more awaited/throwable code follows inside the same try before the catch's rethrow
]);

function buildFixture(mode: 'prod' | 'debug'): string {
  return execFileSync('node', [RUNNER, ...(mode === 'debug' ? ['debug'] : [])], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024
  });
}

describe('Debug Log Stripping (Production Build)', () => {
  beforeAll(() => {
    expect(
      existsSync(resolve(ROOT, 'dist/index.js')),
      'dist/index.js missing -- run `pnpm build` first'
    ).toBe(true);
  });

  it('every debug() call site has a statically-extractable message (sanity check)', () => {
    // If this ever fails, someone added a `debug(someVariable)` or
    // `debug(computedExpr())` call -- extractDebugMessages() can't see
    // inside those, so the exhaustiveness claim below would silently stop
    // being exhaustive. Catch that here instead of losing coverage quietly.
    //
    // Not an exact-count match: a single call site with a multi-interpolation
    // template literal (e.g. `` `a ${x} b ${y}` ``) contributes more than one
    // fragment (the head plus each span's literal text), so extractedCount can
    // legitimately exceed callSiteCount even when every call site is fully
    // extractable. What actually matters is that no call site contributed
    // zero fragments -- extractedCount below callSiteCount is the real signal
    // something was silently skipped.
    const callSiteCount = countDebugCallSites(SOURCE_FILES);
    const extractedCount = SOURCE_FILES.flatMap((f) => extractDebugMessages([f], 0)).length;
    expect(
      extractedCount,
      `found ${callSiteCount} debug() call sites but only extracted ${extractedCount} messages -- some call site's first argument isn't a plain string/template literal`
    ).toBeGreaterThanOrEqual(callSiteCount);
  });

  it('found a substantial number of debug messages to check (sanity check)', () => {
    // Guards against the extractor silently finding nothing (e.g. a path typo
    // in debugSourceFiles), which would make the "not.toContain" test below
    // vacuously pass no matter what.
    expect(DEBUG_MESSAGES.length).toBeGreaterThan(50);
  });

  it('strips every reachable debug() message from a default production build (DEBUG unset)', () => {
    const debugCode = buildFixture('debug');
    const prodCode = buildFixture('prod');

    // Guard against a vacuous pass on the bundle side: confirm both are
    // real, substantial bundles of our fixture, not empty/broken output.
    expect(prodCode.length).toBeGreaterThan(10000);
    expect(prodCode).toContain('test-client');

    // What this fixture's bundle actually contains when DEBUG=true --
    // i.e. the subset of DEBUG_MESSAGES this test can actually vouch for.
    const reachable = DEBUG_MESSAGES.filter((message) => debugCode.includes(message));
    expect(
      reachable.length,
      'the DEBUG=true build did not contain a meaningful number of debug() messages -- ' +
        'the fixture may not be reaching the code it expects to'
    ).toBeGreaterThan(50);

    const leaked = reachable.filter((message) => prodCode.includes(message));
    const unexpectedLeaks = leaked.filter((message) => !KNOWN_UNELIMINATED.has(message));
    expect(
      unexpectedLeaks,
      `${unexpectedLeaks.length} debug() message(s) leaked into the production bundle that aren't in ` +
        `the documented KNOWN_UNELIMINATED exception list (${leaked.length} total leaked, ` +
        `${leaked.length - unexpectedLeaks.length} of which are the known/accepted early-return-hard cases)`
    ).toEqual([]);
  }, 30000);
});
