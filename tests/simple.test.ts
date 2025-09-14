/**
 * Simple test to verify vitest configuration
 */
import { describe, expect, it } from 'vitest';

describe('Simple Test', () => {
  it('should pass basic assertion', () => {
    expect(1 + 1).toBe(2);
  });

  it('should work with strings', () => {
    expect('hello').toBe('hello');
  });

  it('should work with objects', () => {
    const obj = { name: 'test' };
    expect(obj.name).toBe('test');
  });
});
