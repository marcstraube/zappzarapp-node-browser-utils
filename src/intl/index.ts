/**
 * Locale-aware formatting utilities — pure, tree-shakeable wrappers around the
 * native `Intl` API, with formatter caching, strict types, locale negotiation,
 * and the package's dual error handling.
 *
 * This module does **not** provide a translation/message-catalog mechanism —
 * that is the consuming app's domain. `IntlError` is exported from
 * `@zappzarapp/browser-utils/core`, alongside the other error types.
 */
export { clearIntlCache } from './cache.js';
export {
  formatNumber,
  formatNumberResult,
  formatCurrency,
  formatCurrencyResult,
} from './number.js';
export {
  formatDate,
  formatDateResult,
  formatTime,
  formatTimeResult,
  formatRelativeTime,
  formatRelativeTimeResult,
} from './datetime.js';
export type { DateInput } from './datetime.js';
export { formatPlural, formatPluralResult } from './plural.js';
export { compare, compareResult } from './collate.js';
export { resolveLocale } from './locale.js';
