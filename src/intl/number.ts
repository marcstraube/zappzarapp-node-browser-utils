/**
 * Locale-aware number and currency formatting (wraps `Intl.NumberFormat`).
 *
 * Each function has a throwing form and a `Result`-based `*Result` form; both
 * fail only when the locale or options are invalid (the construction boundary).
 */
import type { Result, IntlError } from '../core/index.js';
import { getCachedFormatter, toResult, type LocaleArg } from './cache.js';

function getNumberFormat(locale: LocaleArg, options?: Intl.NumberFormatOptions): Intl.NumberFormat {
  return getCachedFormatter(
    'number',
    locale,
    options,
    () => new Intl.NumberFormat(locale, options)
  );
}

/**
 * Format a number for a locale.
 *
 * @param value Number to format.
 * @param locale BCP-47 locale (or list); host default when omitted.
 * @param options `Intl.NumberFormat` options.
 * @returns The formatted string.
 * @throws {IntlError} On an invalid locale or options.
 */
export function formatNumber(
  value: number,
  locale?: string | readonly string[],
  options?: Intl.NumberFormatOptions
): string {
  return getNumberFormat(locale, options).format(value);
}

/** {@link formatNumber} as a Result. */
export function formatNumberResult(
  value: number,
  locale?: string | readonly string[],
  options?: Intl.NumberFormatOptions
): Result<string, IntlError> {
  return toResult(() => formatNumber(value, locale, options));
}

/**
 * Format a number as a currency amount.
 *
 * @param value Amount to format.
 * @param currency ISO 4217 currency code (e.g. `'EUR'`, `'USD'`).
 * @param locale BCP-47 locale (or list); host default when omitted.
 * @param options Additional `Intl.NumberFormat` options.
 * @returns The formatted currency string.
 * @throws {IntlError} On an invalid locale, currency, or options.
 */
export function formatCurrency(
  value: number,
  currency: string,
  locale?: string | readonly string[],
  options?: Intl.NumberFormatOptions
): string {
  return getNumberFormat(locale, { ...options, style: 'currency', currency }).format(value);
}

/** {@link formatCurrency} as a Result. */
export function formatCurrencyResult(
  value: number,
  currency: string,
  locale?: string | readonly string[],
  options?: Intl.NumberFormatOptions
): Result<string, IntlError> {
  return toResult(() => formatCurrency(value, currency, locale, options));
}
