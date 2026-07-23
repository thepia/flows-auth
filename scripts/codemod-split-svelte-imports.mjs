#!/usr/bin/env node
/**
 * Codemod: split `@thepia/flows-auth` imports for the 1.2.0 core/svelte split.
 *
 * Before 1.2.0 everything came from the package root. Now the root `.` is the
 * framework-agnostic core and all Svelte UI + Svelte-runtime helpers moved to
 * the `./svelte` subpath. This rewrites consumer imports accordingly:
 *
 *   import { createAuthStore, SignInForm, setupAuthContext } from '@thepia/flows-auth'
 *     ->
 *   import { createAuthStore } from '@thepia/flows-auth'
 *   import { SignInForm, setupAuthContext } from '@thepia/flows-auth/svelte'
 *
 * Handles static `import { ... } from '@thepia/flows-auth'` (single- or multi-
 * line), `import type { ... }` (types stay at root), and dynamic
 * `const { ... } = await import('@thepia/flows-auth')` destructures.
 *
 * `import type` always stays at root (all types are agnostic). `/dev`,
 * `/style.css` and other subpaths are left untouched.
 *
 * Usage:  node scripts/codemod-split-svelte-imports.mjs <file-or-dir> [more...]
 *         (defaults to scanning ./src and ./examples if no args)
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

// Symbols that moved to '@thepia/flows-auth/svelte'. Everything else -> root.
const SVELTE_SYMBOLS = new Set([
  // components
  'SignInForm',
  'AccountCreationForm',
  'EmailVerificationBanner',
  'EmailVerificationPrompt',
  'ErrorReportingStatus',
  'AuthButton',
  'AuthStateMessage',
  'EmailInput',
  'PolicyViewer',
  'SignInCore',
  'Icon',
  // Svelte-runtime helpers
  'makeSvelteCompatible',
  'getAuthStoreFromContext',
  'setupAuthContext',
  'createAuthContext',
  'assertAuthConfig',
  'resetGlobalAuthStore',
  'createParaglideI18n'
]);

const PKG = '@thepia/flows-auth';
const SVELTE_SUBPATH = `${PKG}/svelte`;
const EXTS = new Set(['.ts', '.js', '.mjs', '.svelte']);

// Parse a `{ a, b as c }` specifier list into {raw, name, isType} entries.
function parseNames(inner) {
  return inner
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((raw) => {
      const typePrefix = /^type\s+/.test(raw);
      const name = raw
        .replace(/^type\s+/, '')
        .split(/\s+as\s+/)[0]
        .trim();
      return { raw, name, isType: typePrefix };
    });
}

function splitList(entries) {
  const svelte = entries.filter((e) => !e.isType && SVELTE_SYMBOLS.has(e.name));
  const root = entries.filter((e) => e.isType || !SVELTE_SYMBOLS.has(e.name));
  return { svelte, root };
}

function transform(code) {
  let out = code;

  // 0) Collapse deprecated deep subpaths to the bare root so steps 1/2 can then
  //    split them by symbol. Covers './stores', './stores/adapters/svelte',
  //    './stores/core', './types', and raw './src/...' aliases. Leaves the still-
  //    valid './svelte', './dev', './style.css', './package.json' subpaths alone.
  const deepRe = new RegExp(
    `(['"])${PKG.replace('/', '\\/')}\\/(?:stores|types|src)(?:\\/[^'"]*)?\\1`,
    'g'
  );
  out = out.replace(deepRe, (_m, q) => `${q}${PKG}${q}`);

  // 1) static: import [type] { ... } from '@thepia/flows-auth'
  const staticRe = new RegExp(
    `import\\s+(type\\s+)?\\{([^}]*)\\}\\s*from\\s*(['"])${PKG.replace('/', '\\/')}\\3;?`,
    'g'
  );
  out = out.replace(staticRe, (m, typeKw, inner, q) => {
    if (typeKw) return m; // `import type { ... }` -> all agnostic, leave at root
    const { svelte, root } = splitList(parseNames(inner));
    if (svelte.length === 0) return m;
    const lines = [];
    if (root.length)
      lines.push(`import { ${root.map((e) => e.raw).join(', ')} } from ${q}${PKG}${q};`);
    lines.push(`import { ${svelte.map((e) => e.raw).join(', ')} } from ${q}${SVELTE_SUBPATH}${q};`);
    return lines.join('\n');
  });

  // 2) dynamic: const { ... } = await import('@thepia/flows-auth')
  const dynRe = new RegExp(
    `const\\s*\\{([^}]*)\\}\\s*=\\s*await\\s+import\\(\\s*(['"])${PKG.replace('/', '\\/')}\\2\\s*\\);?`,
    'g'
  );
  out = out.replace(dynRe, (m, inner, q) => {
    const { svelte, root } = splitList(parseNames(inner));
    if (svelte.length === 0) return m;
    const lines = [];
    if (root.length)
      lines.push(`const { ${root.map((e) => e.raw).join(', ')} } = await import(${q}${PKG}${q});`);
    lines.push(
      `const { ${svelte.map((e) => e.raw).join(', ')} } = await import(${q}${SVELTE_SUBPATH}${q});`
    );
    return lines.join('\n');
  });

  return out;
}

function collect(target, acc) {
  const st = statSync(target);
  if (st.isDirectory()) {
    if (/node_modules|\.git|dist|build|\.svelte-kit/.test(target)) return;
    for (const e of readdirSync(target)) collect(join(target, e), acc);
  } else if (EXTS.has(extname(target))) {
    acc.push(target);
  }
}

const args = process.argv.slice(2);
const roots = (args.length ? args : ['src', 'examples']).map((p) => resolve(process.cwd(), p));
const files = [];
for (const r of roots) {
  try {
    collect(r, files);
  } catch {
    /* skip missing */
  }
}

let changed = 0;
for (const f of files) {
  const before = readFileSync(f, 'utf8');
  if (!before.includes(PKG)) continue;
  const after = transform(before);
  if (after !== before) {
    writeFileSync(f, after);
    changed++;
    console.log('  rewrote', f);
  }
}
console.log(`\nCodemod complete: ${changed} file(s) updated.`);
