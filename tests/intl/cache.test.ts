import { describe, it, expect, beforeEach } from 'vitest';
import { getCachedFormatter, toResult, clearIntlCache } from '../../src/intl/cache.js';
import { IntlError, Result } from '../../src/core/index.js';

beforeEach(() => {
  clearIntlCache();
});

describe('getCachedFormatter', () => {
  it('should construct once and reuse on a cache hit', () => {
    let calls = 0;
    const create = (): object => {
      calls += 1;
      return { v: calls };
    };
    const a = getCachedFormatter('test', 'en', { x: 1 }, create);
    const b = getCachedFormatter('test', 'en', { x: 1 }, create);
    expect(a).toBe(b);
    expect(calls).toBe(1);
  });

  it('should treat different kind/locale/options as distinct keys', () => {
    let calls = 0;
    const create = (): object => ({ n: (calls += 1) });
    getCachedFormatter('test', 'en', { x: 1 }, create);
    getCachedFormatter('test', 'de', { x: 1 }, create);
    getCachedFormatter('test', 'en', { x: 2 }, create);
    getCachedFormatter('other', 'en', { x: 1 }, create);
    expect(calls).toBe(4);
  });

  it('should reconstruct after clearIntlCache', () => {
    let calls = 0;
    const create = (): object => ({ n: (calls += 1) });
    getCachedFormatter('test', 'en', undefined, create);
    clearIntlCache();
    getCachedFormatter('test', 'en', undefined, create);
    expect(calls).toBe(2);
  });

  it('should evict the oldest entry when the cache is full', () => {
    const counts = new Map<number, number>();
    const make = (i: number) => (): object => {
      counts.set(i, (counts.get(i) ?? 0) + 1);
      return { i };
    };
    // Fill exactly to capacity (keys 0..99), then overflow with key 100.
    for (let i = 0; i <= 100; i += 1) {
      getCachedFormatter('evict', 'en', { i }, make(i));
    }
    // Key 0 was the oldest and should have been evicted -> reconstructs.
    getCachedFormatter('evict', 'en', { i: 0 }, make(0));
    // A recent key (100) should still be cached -> no reconstruction.
    getCachedFormatter('evict', 'en', { i: 100 }, make(100));

    expect(counts.get(0)).toBe(2);
    expect(counts.get(100)).toBe(1);
  });

  it('should wrap an invalid locale as IntlError(INTL_INVALID_LOCALE)', () => {
    expect(() =>
      getCachedFormatter('test', 'invalid !! tag', {}, () => {
        throw new RangeError('bad locale');
      })
    ).toThrow(IntlError);
    try {
      getCachedFormatter('test', 'invalid !! tag', {}, () => {
        throw new RangeError('bad locale');
      });
    } catch (e) {
      expect((e as IntlError).code).toBe('INTL_INVALID_LOCALE');
    }
  });

  it('should wrap a bad-options failure (valid locale) as INTL_INVALID_OPTIONS', () => {
    try {
      getCachedFormatter('test', 'en', { bad: true }, () => {
        throw new RangeError('bad options');
      });
    } catch (e) {
      expect((e as IntlError).code).toBe('INTL_INVALID_OPTIONS');
    }
  });

  it('should classify failures with no locale as INTL_INVALID_OPTIONS', () => {
    try {
      getCachedFormatter('test', undefined, {}, () => {
        throw new TypeError('missing currency');
      });
    } catch (e) {
      expect((e as IntlError).code).toBe('INTL_INVALID_OPTIONS');
    }
  });

  it('should classify non-serialisable (circular) options as INTL_INVALID_OPTIONS', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    let created = false;
    const call = (): unknown =>
      getCachedFormatter('test', 'en', circular, () => {
        created = true;
        return {};
      });

    let caught: unknown;
    try {
      call();
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(IntlError);
    expect((caught as IntlError).code).toBe('INTL_INVALID_OPTIONS');
    // The failure happens at key serialisation, before the formatter is built.
    expect(created).toBe(false);
  });

  it('should rethrow non-Range/Type errors unchanged', () => {
    const boom = new Error('unexpected');
    expect(() =>
      getCachedFormatter('test', 'en', {}, () => {
        throw boom;
      })
    ).toThrow(boom);
  });
});

describe('toResult', () => {
  it('should wrap a successful call in Result.ok', () => {
    const result = toResult(() => 'value');
    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value).toBe('value');
    }
  });

  it('should capture an IntlError as Result.err', () => {
    const result = toResult(() => {
      throw IntlError.invalidLocale();
    });
    expect(Result.isErr(result)).toBe(true);
  });

  it('should rethrow non-IntlError exceptions', () => {
    expect(() =>
      toResult(() => {
        throw new Error('other');
      })
    ).toThrow('other');
  });
});
