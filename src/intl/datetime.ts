/**
 * Locale-aware date, time, and relative-time formatting (wraps
 * `Intl.DateTimeFormat` and `Intl.RelativeTimeFormat`).
 *
 * Each function has a throwing form and a `Result`-based `*Result` form; both
 * fail only when the locale or options are invalid. Passing an invalid `Date`
 * (or `NaN` timestamp) is a precondition violation and throws a `RangeError`.
 */
import type { Result, IntlError } from '../core/index.js';
import { getCachedFormatter, toResult, type LocaleArg } from './cache.js';

/** A date input accepted by the formatters. */
export type DateInput = Date | number;

function getDateTimeFormat(
  locale: LocaleArg,
  options?: Intl.DateTimeFormatOptions
): Intl.DateTimeFormat {
  return getCachedFormatter(
    'datetime',
    locale,
    options,
    () => new Intl.DateTimeFormat(locale, options)
  );
}

/**
 * Format a date for a locale (date components only by default).
 *
 * @param value `Date` or timestamp (ms).
 * @param locale BCP-47 locale (or list); host default when omitted.
 * @param options `Intl.DateTimeFormat` options.
 * @returns The formatted string.
 * @throws {IntlError} On an invalid locale or options.
 */
export function formatDate(
  value: DateInput,
  locale?: string | readonly string[],
  options?: Intl.DateTimeFormatOptions
): string {
  return getDateTimeFormat(locale, options).format(value);
}

/** {@link formatDate} as a Result. */
export function formatDateResult(
  value: DateInput,
  locale?: string | readonly string[],
  options?: Intl.DateTimeFormatOptions
): Result<string, IntlError> {
  return toResult(() => formatDate(value, locale, options));
}

/**
 * Format the time-of-day for a locale (hour and minute by default).
 *
 * @param value `Date` or timestamp (ms).
 * @param locale BCP-47 locale (or list); host default when omitted.
 * @param options `Intl.DateTimeFormat` options, merged over the `hour`/`minute` default.
 * @returns The formatted string.
 * @throws {IntlError} On an invalid locale or options.
 */
export function formatTime(
  value: DateInput,
  locale?: string | readonly string[],
  options?: Intl.DateTimeFormatOptions
): string {
  return getDateTimeFormat(locale, { hour: 'numeric', minute: 'numeric', ...options }).format(
    value
  );
}

/** {@link formatTime} as a Result. */
export function formatTimeResult(
  value: DateInput,
  locale?: string | readonly string[],
  options?: Intl.DateTimeFormatOptions
): Result<string, IntlError> {
  return toResult(() => formatTime(value, locale, options));
}

function getRelativeTimeFormat(
  locale: LocaleArg,
  options?: Intl.RelativeTimeFormatOptions
): Intl.RelativeTimeFormat {
  return getCachedFormatter(
    'relativetime',
    locale,
    options,
    () => new Intl.RelativeTimeFormat(locale, options)
  );
}

/**
 * Format a relative time (e.g. `-1, 'day'` → "1 day ago").
 *
 * @param value Signed amount; negative is past, positive is future.
 * @param unit Time unit (`'day'`, `'hour'`, …).
 * @param locale BCP-47 locale (or list); host default when omitted.
 * @param options `Intl.RelativeTimeFormat` options.
 * @returns The formatted string.
 * @throws {IntlError} On an invalid locale or options.
 */
export function formatRelativeTime(
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
  locale?: string | readonly string[],
  options?: Intl.RelativeTimeFormatOptions
): string {
  return getRelativeTimeFormat(locale, options).format(value, unit);
}

/** {@link formatRelativeTime} as a Result. */
export function formatRelativeTimeResult(
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
  locale?: string | readonly string[],
  options?: Intl.RelativeTimeFormatOptions
): Result<string, IntlError> {
  return toResult(() => formatRelativeTime(value, unit, locale, options));
}
