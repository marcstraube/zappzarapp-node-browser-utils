import { describe, it, expect, beforeEach } from 'vitest';
import { compare, compareResult } from '../../src/intl/index.js';
import { clearIntlCache } from '../../src/intl/cache.js';
import { IntlError, Result } from '../../src/core/index.js';

beforeEach(() => {
  clearIntlCache();
});

describe('compare', () => {
  it('should order strings ascending', () => {
    expect(compare('a', 'b', 'en')).toBeLessThan(0);
    expect(compare('b', 'a', 'en')).toBeGreaterThan(0);
    expect(compare('a', 'a', 'en')).toBe(0);
  });

  it('should work as an Array.sort comparator', () => {
    expect(['banana', 'apple', 'cherry'].sort((x, y) => compare(x, y, 'en'))).toEqual([
      'apple',
      'banana',
      'cherry',
    ]);
  });

  it('should treat case as equal with sensitivity: base', () => {
    expect(compare('a', 'A', 'en', { sensitivity: 'base' })).toBe(0);
  });

  it('should sort numerically with numeric: true', () => {
    expect(['10', '2', '1'].sort((x, y) => compare(x, y, 'en', { numeric: true }))).toEqual([
      '1',
      '2',
      '10',
    ]);
  });

  it('should throw IntlError for an invalid locale', () => {
    expect(() => compare('a', 'b', 'invalid!!')).toThrow(IntlError);
  });
});

describe('compareResult', () => {
  it('should return Ok with the comparison', () => {
    const result = compareResult('a', 'b', 'en');
    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value).toBeLessThan(0);
    }
  });

  it('should return Err for an invalid locale', () => {
    expect(Result.isErr(compareResult('a', 'b', 'invalid!!'))).toBe(true);
  });
});
