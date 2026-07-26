/**
 * getClientIP Unit Tests
 * Header priority, fallback, and edge-case handling for client IP extraction.
 */

import { describe, expect, it } from 'vitest';
import { getClientIP } from '../../src/server/client-ip.js';

function requestWithHeaders(headers: Record<string, string>): Request {
  return new Request('https://api.example.com/test', { headers });
}

describe('getClientIP', () => {
  it('returns "unknown" when no relevant headers are present', () => {
    expect(getClientIP(requestWithHeaders({}))).toBe('unknown');
  });

  it('reads from cf-connecting-ip when present', () => {
    const request = requestWithHeaders({ 'cf-connecting-ip': '1.2.3.4' });
    expect(getClientIP(request)).toBe('1.2.3.4');
  });

  it('falls back to x-forwarded-for when cf-connecting-ip is absent', () => {
    const request = requestWithHeaders({ 'x-forwarded-for': '5.6.7.8' });
    expect(getClientIP(request)).toBe('5.6.7.8');
  });

  it('falls back to x-real-ip when higher-priority headers are absent', () => {
    const request = requestWithHeaders({ 'x-real-ip': '9.10.11.12' });
    expect(getClientIP(request)).toBe('9.10.11.12');
  });

  it('falls back to x-client-ip as the last resort', () => {
    const request = requestWithHeaders({ 'x-client-ip': '13.14.15.16' });
    expect(getClientIP(request)).toBe('13.14.15.16');
  });

  it('prioritizes cf-connecting-ip over all other headers', () => {
    const request = requestWithHeaders({
      'cf-connecting-ip': '1.1.1.1',
      'x-forwarded-for': '2.2.2.2',
      'x-real-ip': '3.3.3.3',
      'x-client-ip': '4.4.4.4'
    });
    expect(getClientIP(request)).toBe('1.1.1.1');
  });

  it('takes the first IP from a comma-separated x-forwarded-for chain', () => {
    const request = requestWithHeaders({ 'x-forwarded-for': '5.6.7.8, 9.10.11.12, 13.14.15.16' });
    expect(getClientIP(request)).toBe('5.6.7.8');
  });

  it('trims whitespace around the extracted IP', () => {
    const request = requestWithHeaders({ 'x-forwarded-for': '   5.6.7.8   , 9.10.11.12' });
    expect(getClientIP(request)).toBe('5.6.7.8');
  });

  it('treats the literal string "unknown" as absent and falls through to the next header', () => {
    const request = requestWithHeaders({
      'cf-connecting-ip': 'unknown',
      'x-forwarded-for': '5.6.7.8'
    });
    expect(getClientIP(request)).toBe('5.6.7.8');
  });

  it('returns "unknown" when every header is empty or the literal "unknown"', () => {
    const request = requestWithHeaders({
      'cf-connecting-ip': 'unknown',
      'x-forwarded-for': '',
      'x-real-ip': 'unknown'
    });
    expect(getClientIP(request)).toBe('unknown');
  });
});
