import { describe, it, expect, beforeEach } from 'vitest';
import {
  formatDate,
  formatDateResult,
  formatTime,
  formatTimeResult,
  formatRelativeTime,
  formatRelativeTimeResult,
} from '../../src/intl/index.js';
import { clearIntlCache } from '../../src/intl/cache.js';
import { IntlError, Result } from '../../src/core/index.js';

// Fixed instant; tests pin timeZone: 'UTC' so output is deterministic.
const TS = Date.UTC(2024, 0, 15, 10, 30, 0); // 2024-01-15T10:30:00Z
const UTC = { timeZone: 'UTC' } as const;

beforeEach(() => {
  clearIntlCache();
});

describe('formatDate', () => {
  it('should format a date for en', () => {
    expect(formatDate(TS, 'en', UTC)).toBe('1/15/2024');
  });

  it('should format a date for de', () => {
    expect(formatDate(TS, 'de', UTC)).toBe('15.1.2024');
  });

  it('should accept a Date instance', () => {
    expect(formatDate(new Date(TS), 'en', UTC)).toBe('1/15/2024');
  });

  it('should throw IntlError for an invalid locale', () => {
    expect(() => formatDate(TS, 'invalid!!')).toThrow(IntlError);
  });
});

describe('formatDateResult', () => {
  it('should return Ok for valid input', () => {
    const result = formatDateResult(TS, 'en', UTC);
    expect(Result.isOk(result)).toBe(true);
  });

  it('should return Err(INTL_INVALID_OPTIONS) for a bad time zone', () => {
    const result = formatDateResult(TS, 'en', { timeZone: 'Mars/Phobos' });
    expect(Result.isErr(result)).toBe(true);
    if (Result.isErr(result)) {
      expect(result.error.code).toBe('INTL_INVALID_OPTIONS');
    }
  });
});

describe('formatTime', () => {
  it('should format hour and minute by default for en', () => {
    expect(formatTime(TS, 'en', UTC)).toBe('10:30 AM');
  });

  it('should allow overriding the default options', () => {
    expect(
      formatTime(TS, 'en', { ...UTC, hour: '2-digit', minute: '2-digit', hour12: false })
    ).toBe('10:30');
  });
});

describe('formatTimeResult', () => {
  it('should return Ok for valid input', () => {
    expect(Result.isOk(formatTimeResult(TS, 'en', UTC))).toBe(true);
  });
});

describe('formatRelativeTime', () => {
  it('should format the past for en', () => {
    expect(formatRelativeTime(-1, 'day', 'en')).toBe('1 day ago');
  });

  it('should format the future for en', () => {
    expect(formatRelativeTime(3, 'day', 'en')).toBe('in 3 days');
  });

  it('should honour the numeric:auto option', () => {
    expect(formatRelativeTime(-1, 'day', 'en', { numeric: 'auto' })).toBe('yesterday');
  });

  it('should throw IntlError for an invalid locale', () => {
    expect(() => formatRelativeTime(1, 'day', 'invalid!!')).toThrow(IntlError);
  });
});

describe('formatRelativeTimeResult', () => {
  it('should return Ok for valid input', () => {
    expect(Result.isOk(formatRelativeTimeResult(-1, 'day', 'en'))).toBe(true);
  });

  it('should return Err for a bad locale', () => {
    expect(Result.isErr(formatRelativeTimeResult(1, 'day', 'invalid!!'))).toBe(true);
  });
});
