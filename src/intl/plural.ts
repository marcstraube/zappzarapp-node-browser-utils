/**
 * Locale-aware pluralisation (wraps `Intl.PluralRules`).
 *
 * Returns the CLDR plural category for a count, which a caller maps to the
 * right message variant. No message catalog lives here — that is the app's job.
 */
import type { Result, IntlError } from '../core/index.js';
import { getCachedFormatter, toResult, type LocaleArg } from './cache.js';

function getPluralRules(locale: LocaleArg, options?: Intl.PluralRulesOptions): Intl.PluralRules {
  return getCachedFormatter('plural', locale, options, () => new Intl.PluralRules(locale, options));
}

/**
 * Select the plural category for a count (e.g. `'one'`, `'other'`).
 *
 * @param count The count to classify.
 * @param locale BCP-47 locale (or list); host default when omitted.
 * @param options `Intl.PluralRules` options (e.g. `{ type: 'ordinal' }`).
 * @returns The CLDR plural category.
 * @throws {IntlError} On an invalid locale or options.
 */
export function formatPlural(
  count: number,
  locale?: string | readonly string[],
  options?: Intl.PluralRulesOptions
): Intl.LDMLPluralRule {
  return getPluralRules(locale, options).select(count);
}

/** {@link formatPlural} as a Result. */
export function formatPluralResult(
  count: number,
  locale?: string | readonly string[],
  options?: Intl.PluralRulesOptions
): Result<Intl.LDMLPluralRule, IntlError> {
  return toResult(() => formatPlural(count, locale, options));
}
