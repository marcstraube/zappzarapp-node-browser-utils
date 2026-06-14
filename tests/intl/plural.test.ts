import { describe, it, expect, beforeEach } from 'vitest';
import { formatPlural, formatPluralResult } from '../../src/intl/index.js';
import { clearIntlCache } from '../../src/intl/cache.js';
import { IntlError, Result } from '../../src/core/index.js';

beforeEach(() => {
  clearIntlCache();
});

describe('formatPlural', () => {
  it('should return "one" for 1 and "other" for 2 (cardinal, en)', () => {
    expect(formatPlural(1, 'en')).toBe('one');
    expect(formatPlural(2, 'en')).toBe('other');
    expect(formatPlural(0, 'en')).toBe('other');
  });

  it('should support ordinal rules', () => {
    const ordinal = { type: 'ordinal' } as const;
    expect(formatPlural(1, 'en', ordinal)).toBe('one'); // 1st
    expect(formatPlural(2, 'en', ordinal)).toBe('two'); // 2nd
    expect(formatPlural(3, 'en', ordinal)).toBe('few'); // 3rd
    expect(formatPlural(4, 'en', ordinal)).toBe('other'); // 4th
  });

  it('should throw IntlError for an invalid locale', () => {
    expect(() => formatPlural(1, 'invalid!!')).toThrow(IntlError);
  });
});

describe('formatPluralResult', () => {
  it('should return Ok with the category', () => {
    const result = formatPluralResult(1, 'en');
    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value).toBe('one');
    }
  });

  it('should return Err for an invalid locale', () => {
    expect(Result.isErr(formatPluralResult(1, 'invalid!!'))).toBe(true);
  });
});
