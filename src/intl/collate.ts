/**
 * Locale-aware string comparison for sorting (wraps `Intl.Collator`).
 */
import type { Result, IntlError } from '../core/index.js';
import { getCachedFormatter, toResult, type LocaleArg } from './cache.js';

function getCollator(locale: LocaleArg, options?: Intl.CollatorOptions): Intl.Collator {
  return getCachedFormatter('collator', locale, options, () => new Intl.Collator(locale, options));
}

/**
 * Compare two strings for locale-aware sorting.
 *
 * Suitable as an `Array.prototype.sort` comparator.
 *
 * @param a First string.
 * @param b Second string.
 * @param locale BCP-47 locale (or list); host default when omitted.
 * @param options `Intl.Collator` options (e.g. `{ sensitivity: 'base', numeric: true }`).
 * @returns Negative if `a < b`, positive if `a > b`, `0` if equal.
 * @throws {IntlError} On an invalid locale or options.
 */
export function compare(
  a: string,
  b: string,
  locale?: string | readonly string[],
  options?: Intl.CollatorOptions
): number {
  return getCollator(locale, options).compare(a, b);
}

/** {@link compare} as a Result. */
export function compareResult(
  a: string,
  b: string,
  locale?: string | readonly string[],
  options?: Intl.CollatorOptions
): Result<number, IntlError> {
  return toResult(() => compare(a, b, locale, options));
}
