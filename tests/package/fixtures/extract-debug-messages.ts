/**
 * Extracts every string literal / template literal passed as the first
 * argument to a `debug(...)` call, across a set of source files, via the
 * TypeScript AST (not regex text-scraping, which breaks on multi-line calls,
 * template literals, and escaped quotes).
 *
 * Used by ../debug-log-stripping.test.ts to build an exhaustive list of
 * "message fragments that must not survive a production build" -- rather
 * than a hand-picked sample, which would only catch a regression if it
 * happened to affect one of the sampled call sites.
 */
import { extname, join } from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';
import ts from 'typescript';

function walkFiles(dir: string, exts: string[]): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(full, exts));
    } else if (exts.includes(extname(entry.name))) {
      results.push(full);
    }
  }
  return results;
}

function extractScriptFromSvelte(source: string): string {
  const match = source.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  return match ? match[1] : '';
}

function collectFromFile(filePath: string): string[] {
  const raw = readFileSync(filePath, 'utf8');
  const code = filePath.endsWith('.svelte') ? extractScriptFromSvelte(raw) : raw;
  const sourceFile = ts.createSourceFile(filePath, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const messages: string[] = [];

  function visit(node: ts.Node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'debug' &&
      node.arguments.length > 0
    ) {
      const arg = node.arguments[0];
      if (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) {
        messages.push(arg.text);
      } else if (ts.isTemplateExpression(arg)) {
        // Static portions only -- interpolated (${...}) parts are runtime
        // values and can't be checked for verbatim.
        if (arg.head.text) messages.push(arg.head.text);
        for (const span of arg.templateSpans) {
          if (span.literal.text) messages.push(span.literal.text);
        }
      }
      // Any other argument shape (identifier, computed expression) can't be
      // statically extracted; there are none in this codebase today (see
      // the sanity check in the test), but silently skipping here would
      // hide a real gap if one were added, so this is intentionally checked
      // by the caller via `debug(...)` call-site count, not filtered here.
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return messages;
}

export function countDebugCallSites(files: string[]): number {
  let count = 0;
  for (const file of files) {
    const raw = readFileSync(file, 'utf8');
    const code = file.endsWith('.svelte') ? extractScriptFromSvelte(raw) : raw;
    const sourceFile = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    ts.forEachChild(sourceFile, function visit(node) {
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'debug'
      ) {
        count++;
      }
      ts.forEachChild(node, visit);
    });
  }
  return count;
}

/**
 * All debug() source files in this package: everywhere `debug()` is
 * imported and called (core + the svelte-side duplicate; see
 * src/svelte/utils/debug.ts for why there are two).
 */
export function debugSourceFiles(root: string): string[] {
  return [
    ...walkFiles(join(root, 'src/core'), ['.ts']),
    ...walkFiles(join(root, 'src/svelte'), ['.ts', '.svelte'])
  ];
}

/**
 * Every extractable debug() message fragment across the given files,
 * deduplicated, with generic/too-short fragments (template-literal
 * interpolation boundaries like ": " or "/") filtered out since they'd
 * produce false-positive matches against unrelated bundle content.
 */
export function extractDebugMessages(files: string[], minLength = 8): string[] {
  const all = files.flatMap(collectFromFile);
  return Array.from(new Set(all)).filter((m) => m.trim().length >= minLength);
}
