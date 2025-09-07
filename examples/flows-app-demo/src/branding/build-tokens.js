#!/usr/bin/env node

/**
 * Simple token build system for flows-app-demo
 * Generates CSS custom properties from JSON token files
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tokensDir = path.join(__dirname, 'tokens');

/**
 * Load and parse JSON token files
 */
async function loadTokens() {
  const tokens = {};
  
  try {
    const files = ['colors.json', 'typography.json', 'sizes.json'];
    
    for (const file of files) {
      const filePath = path.join(tokensDir, file);
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const data = JSON.parse(content);
        Object.assign(tokens, data);
      } catch (error) {
        console.warn(`Warning: Could not load ${file}: ${error.message}`);
      }
    }
  } catch (error) {
    console.error('Error loading tokens:', error.message);
    process.exit(1);
  }
  
  return tokens;
}

/**
 * Remove metadata fields from token objects
 */
function removeMetadata(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  const cleaned = {};

  for (const [key, value] of Object.entries(obj)) {
    if (key === '$schema' || key === '$description') {
      continue;
    }

    if (typeof value === 'object' && value !== null && 'value' in value) {
      cleaned[key] = value.value;
    } else {
      cleaned[key] = removeMetadata(value);
    }
  }

  return cleaned;
}

/**
 * Resolve token references like {color.brand.primary}
 */
function resolveReferences(tokens) {
  const resolved = JSON.parse(JSON.stringify(tokens));

  function resolveValue(value) {
    if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
      const reference = value.slice(1, -1);
      const keys = reference.split('.');
      let current = resolved;

      for (const key of keys) {
        if (current && typeof current === 'object' && key in current) {
          current = current[key];
        } else {
          console.warn(`Warning: Unresolved reference: ${reference}`);
          return value;
        }
      }

      return resolveValue(current);
    }

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const resolvedObj = {};
      for (const [key, val] of Object.entries(value)) {
        resolvedObj[key] = resolveValue(val);
      }
      return resolvedObj;
    }

    return value;
  }

  return resolveValue(resolved);
}

/**
 * Flatten nested object to dot notation with dashes
 */
function flattenTokens(obj, prefix = '') {
  const flattened = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}-${key}` : key;

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(flattened, flattenTokens(value, newKey));
    } else {
      flattened[newKey] = value;
    }
  }

  return flattened;
}

/**
 * Generate CSS custom properties
 */
async function generateCSS(tokens) {
  const flattened = flattenTokens(tokens);
  const lines = [
    '/**',
    ' * Design Tokens for Demo Company',
    ' * Generated from JSON token files',
    ' * DO NOT EDIT - This file is auto-generated',
    ' */',
    '',
    ':root {'
  ];

  for (const [key, value] of Object.entries(flattened)) {
    const cssVar = `--${key}`;
    const cssValue = Array.isArray(value) ? value.join(', ') : value;
    lines.push(`  ${cssVar}: ${cssValue};`);
  }

  lines.push('');
  
  // Legacy compatibility aliases for old typography naming
  lines.push('  /* Legacy compatibility aliases for old typography naming */');
  lines.push('  --typography-fontFamily-brand-primary: var(--font-fontFamily-brand-body);');
  lines.push('  --font-family-brand: var(--font-fontFamily-brand-body);');
  lines.push('  --font-family-brand-lead: var(--font-fontFamily-brand-lead);');
  lines.push('  --font-family-brand-mono: var(--font-fontFamily-brand-mono);');
  lines.push('');
  
  // Additional legacy font variables
  lines.push('  /* Legacy font variables */');
  lines.push('  --font-size-xs: var(--font-size-xs);');
  lines.push('  --font-size-sm: var(--font-size-sm);');
  lines.push('  --font-size-base: var(--font-size-base);');
  lines.push('  --font-size-lg: var(--font-size-lg);');
  lines.push('  --font-size-xl: var(--font-size-xl);');
  lines.push('  --font-size-2xl: var(--font-size-2xl);');
  lines.push('  --font-size-3xl: var(--font-size-3xl);');
  lines.push('  --font-size-4xl: var(--font-size-4xl);');
  lines.push('');
  lines.push('  --font-weight-normal: var(--font-weight-normal);');
  lines.push('  --font-weight-medium: var(--font-weight-medium);');
  lines.push('  --font-weight-semibold: var(--font-weight-semibold);');
  lines.push('  --font-weight-bold: var(--font-weight-bold);');
  lines.push('');
  lines.push('  --line-height-tight: var(--font-lineHeight-tight);');
  lines.push('  --line-height-snug: var(--font-lineHeight-snug);');
  lines.push('  --line-height-normal: var(--font-lineHeight-normal);');
  lines.push('  --line-height-relaxed: var(--font-lineHeight-relaxed);');

  lines.push('}');
  lines.push('');

  // Add utility classes for brand themes
  lines.push('/* Brand Theme Classes */');
  lines.push('.brand-demo {');
  lines.push('  /* Default Demo Company branding */');
  lines.push('}');
  lines.push('');

  // Alternative brand demos
  lines.push('.brand-emerald {');
  lines.push('  --color-brand-primary: #059669;');
  lines.push('  --color-brand-primaryHover: #047857;');
  lines.push('  --color-brand-primarySubtle: #d1fae5;');
  lines.push('}');
  lines.push('');

  lines.push('.brand-purple {');
  lines.push('  --color-brand-primary: #7c3aed;');
  lines.push('  --color-brand-primaryHover: #6d28d9;');
  lines.push('  --color-brand-primarySubtle: #ede9fe;');
  lines.push('}');
  lines.push('');

  lines.push('.brand-rose {');
  lines.push('  --color-brand-primary: #e11d48;');
  lines.push('  --color-brand-primaryHover: #be185d;');
  lines.push('  --color-brand-primarySubtle: #ffe4e6;');
  lines.push('}');

  const outputPath = path.join(__dirname, 'design-tokens.css');
  await fs.writeFile(outputPath, lines.join('\n'));
  
  console.log('✓ Generated design-tokens.css from JSON tokens');
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🔄 Loading design tokens...');
    const rawTokens = await loadTokens();
    
    console.log('🔄 Cleaning metadata...');
    const cleanTokens = removeMetadata(rawTokens);
    
    console.log('🔄 Resolving token references...');
    const resolvedTokens = resolveReferences(cleanTokens);
    
    console.log('🔄 Generating CSS...');
    await generateCSS(resolvedTokens);
    
    console.log('✅ Build complete!');
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}