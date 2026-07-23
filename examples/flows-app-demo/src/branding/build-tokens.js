#!/usr/bin/env node

/**
 * Generates Demo Company's brand tokens.css via @thepia/branding's reusable
 * token pipeline. Only the tokens under ./tokens (brand colors + font) are
 * defined here - structural tokens (spacing, radius, shadows, neutrals, action
 * colors) are inherited from @thepia/branding/css, imported first in app.css.
 * See docs/CUSTOMER-BRAND-EXTRACTION.md in the branding repo for the token schema.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateTokenOutputs } from '@thepia/branding/build-tokens';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

await generateTokenOutputs({
  tokensDir: path.join(__dirname, 'tokens'),
  outputsDir: path.join(__dirname, 'dist'),
  brandName: 'Demo Company',
});

console.log('✓ Generated Demo Company brand tokens');
