#!/usr/bin/env node
/**
 * Regenerate the committed Paraglide output under src/core/paraglide.
 *
 * Uses the programmatic compile() so we can PIN `outputStructure: 'locale-modules'`
 * (messages/_index.js + per-locale en.js/da.js). The bare `paraglide-js compile`
 * CLI defaults to "message-modules" (per-message files, no en.js/da.js) and would
 * silently rewrite the committed layout that the core bundle + tests depend on.
 *
 * Run this only when messages/*.json change, then commit src/core/paraglide.
 */
import { compile } from '@inlang/paraglide-js';

await compile({
  project: './project.inlang',
  outdir: './src/core/paraglide',
  outputStructure: 'locale-modules',
  // src/core/paraglide is committed; don't emit the auto .gitignore.
  emitGitIgnore: false
});

console.log('✅ Paraglide compiled to src/core/paraglide (locale-modules)');
