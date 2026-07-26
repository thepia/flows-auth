/**
 * base64url Encoding Utility Unit Tests
 */

import { describe, expect, it } from 'vitest';
import {
  base64ToBase64url,
  base64urlToBase64,
  base64urlToUint8Array,
  uint8ArrayToBase64url
} from '../../../src/server/webauthn/encoding.js';

describe('uint8ArrayToBase64url', () => {
  it('encodes bytes without any base64 padding/URL-unsafe characters leaking through', () => {
    const bytes = new Uint8Array([251, 255, 191]); // deliberately produces '+' and '/' in plain base64
    const encoded = uint8ArrayToBase64url(bytes);
    expect(encoded).not.toContain('+');
    expect(encoded).not.toContain('/');
    expect(encoded).not.toContain('=');
  });

  it('roundtrips through base64urlToUint8Array', () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5, 250, 251, 252]);
    const decoded = base64urlToUint8Array(uint8ArrayToBase64url(bytes));
    expect(Array.from(decoded)).toEqual(Array.from(bytes));
  });

  it('handles an empty byte array', () => {
    expect(uint8ArrayToBase64url(new Uint8Array([]))).toBe('');
  });
});

describe('base64urlToUint8Array', () => {
  it('decodes a valid base64url string', () => {
    const original = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
    const encoded = uint8ArrayToBase64url(original);
    expect(Array.from(base64urlToUint8Array(encoded))).toEqual(Array.from(original));
  });

  it('handles base64url with and without padding equivalently', () => {
    // 16 bytes -> unpadded base64url naturally has no '=' already; force a
    // length that base64 normally pads (1 byte -> 2 base64 chars + "==").
    const original = new Uint8Array([65]);
    const encoded = uint8ArrayToBase64url(original); // no padding produced
    expect(encoded.endsWith('=')).toBe(false);
    expect(Array.from(base64urlToUint8Array(encoded))).toEqual(Array.from(original));
  });

  it('handles URL-safe character substitutions (- and _)', () => {
    // Construct a string guaranteed to contain both - and _ after encoding.
    const bytes = new Uint8Array([251, 255, 191, 190]);
    const encoded = uint8ArrayToBase64url(bytes);
    expect(Array.from(base64urlToUint8Array(encoded))).toEqual(Array.from(bytes));
  });

  it('rejects a non-string input', () => {
    // @ts-expect-error - intentionally passing a bad type to verify the runtime guard
    expect(() => base64urlToUint8Array(123)).toThrow('Input must be a string');
  });

  it('rejects an empty string', () => {
    expect(() => base64urlToUint8Array('')).toThrow('Input string cannot be empty');
  });

  it('rejects invalid characters', () => {
    expect(() => base64urlToUint8Array('AQIDBAUGBwg!')).toThrow(
      'Input contains invalid base64url characters'
    );
  });

  it('rejects a "=" that appears before the trailing padding run', () => {
    // The padding-position check only engages when there IS a trailing "="
    // run (it's matched via /=+$/) - a "=" with no trailing padding at all
    // (e.g. "AQID=BAUGBwg") skips this check entirely and fails later, in
    // the decode step itself, with a different message (see the
    // "Failed to decode" test below). This is the case that actually
    // exercises the position check: a "=" earlier in the string AND a
    // trailing padding run.
    expect(() => base64urlToUint8Array('AB=C=')).toThrow('Invalid base64url string length');
  });

  it('a "=" with no trailing padding run fails at the decode step instead, not the position check', () => {
    // Documents real behavior: the position check above never engages here
    // (no /=+$/ match), so this reaches atob() with a "=" mid-string and
    // fails there instead, with a "Failed to decode" message rather than
    // "Invalid base64url string length" - the opposite of what this
    // function's own docstring originally (and incorrectly) claimed.
    expect(() => base64urlToUint8Array('AQID=BAUGBwg')).toThrow('Failed to decode base64url string');
  });

  it('rejects excessive padding (more than 2 "=")', () => {
    expect(() => base64urlToUint8Array('AQIDBAUGBwg===')).toThrow('Invalid base64url string length');
  });

  it('rejects an unpadded length that is 1 mod 4', () => {
    expect(() => base64urlToUint8Array('AQID')).not.toThrow(); // 4 chars, 0 mod 4 - valid
    expect(() => base64urlToUint8Array('AQIDB')).toThrow('Invalid base64url string length'); // 5 chars, 1 mod 4
  });
});

describe('base64urlToBase64 / base64ToBase64url', () => {
  it('base64urlToBase64 converts - and _ back to + and / and restores padding', () => {
    // '-_' is 2 chars -> padEnd to the next multiple of 4 adds 2 '=' chars.
    expect(base64urlToBase64('-_')).toBe('+/==');
  });

  it('base64ToBase64url converts + and / to - and _ and strips padding', () => {
    expect(base64ToBase64url('+/==')).toBe('-_');
  });

  it('roundtrips base64 -> base64url -> base64 for a real encoded value', () => {
    const bytes = new Uint8Array([251, 255, 191]);
    const base64 = btoa(String.fromCharCode(...bytes));
    const url = base64ToBase64url(base64);
    const back = base64urlToBase64(url);
    // back may differ from base64 only in padding normalization, so compare decoded bytes.
    expect(Array.from(base64urlToUint8Array(url))).toEqual(Array.from(bytes));
    expect(back.replace(/=+$/, '')).toBe(base64.replace(/=+$/, ''));
  });
});
