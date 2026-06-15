import { describe, it, expect, beforeEach } from 'vitest';
import {
  formatNumber,
  formatNumberResult,
  formatCurrency,
  formatCurrencyResult,
} from '../../src/intl/index.js';
import { clearIntlCache } from '../../src/intl/cache.js';
import { IntlError, Result } from '../../src/core/index.js';

beforeEach(() => {
  clearIntlCache();
});

describe('formatNumber', () => {
  it('should group thousands for en', () => {
    expect(formatNumber(1234.5, 'en')).toBe('1,234.5');
  });

  it('should honour options', () => {
    expect(formatNumber(1234.5, 'en', { minimumFractionDigits: 2 })).toBe('1,234.50');
  });

  it('should use a different grouping for de', () => {
    expect(formatNumber(1234.5, 'de', { minimumFractionDigits: 1 })).toBe('1.234,5');
  });

  it('should accept a locale list', () => {
    expect(formatNumber(1000, ['en'])).toBe('1,000');
  });

  it('should throw IntlError for an invalid locale', () => {
    expect(() => formatNumber(1, 'invalid!!')).toThrow(IntlError);
  });
});

describe('formatNumberResult', () => {
  it('should return Ok for valid input', () => {
    const result = formatNumberResult(1000, 'en');
    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value).toBe('1,000');
    }
  });

  it('should return Err(INTL_INVALID_LOCALE) for a bad locale', () => {
    const result = formatNumberResult(1, 'invalid!!');
    expect(Result.isErr(result)).toBe(true);
    if (Result.isErr(result)) {
      expect(result.error.code).toBe('INTL_INVALID_LOCALE');
    }
  });

  it('should stay total for non-serialisable (circular) options', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const result = formatNumberResult(1, 'en', circular as Intl.NumberFormatOptions);
    expect(Result.isErr(result)).toBe(true);
    if (Result.isErr(result)) {
      expect(result.error.code).toBe('INTL_INVALID_OPTIONS');
    }
  });

  it('should return Err(INTL_INVALID_OPTIONS) for bad options', () => {
    const result = formatNumberResult(1, 'en', {
      style: 'bogus',
    } as unknown as Intl.NumberFormatOptions);
    expect(Result.isErr(result)).toBe(true);
    if (Result.isErr(result)) {
      expect(result.error.code).toBe('INTL_INVALID_OPTIONS');
    }
  });
});

describe('formatCurrency', () => {
  it('should format USD for en', () => {
    expect(formatCurrency(1234.5, 'USD', 'en')).toBe('$1,234.50');
  });

  it('should throw IntlError for an invalid currency code', () => {
    expect(() => formatCurrency(1, 'X', 'en')).toThrow(IntlError);
  });
});

describe('formatCurrencyResult', () => {
  it('should return Ok for a valid currency', () => {
    const result = formatCurrencyResult(5, 'USD', 'en');
    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value).toBe('$5.00');
    }
  });

  it('should return Err for an invalid currency', () => {
    const result = formatCurrencyResult(1, 'X', 'en');
    expect(Result.isErr(result)).toBe(true);
    if (Result.isErr(result)) {
      expect(result.error.code).toBe('INTL_INVALID_OPTIONS');
    }
  });
});
