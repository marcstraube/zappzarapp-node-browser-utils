/**
 * Intl Error for locale-aware formatting operations.
 *
 * Thrown when an `Intl.*` formatter cannot be constructed, due to:
 * - An invalid or unsupported locale
 * - Invalid formatting options
 *
 * @example
 * ```TypeScript
 * const result = formatNumberResult(1000, 'not-a-locale');
 * if (Result.isErr(result)) {
 *   if (result.error.code === 'INTL_INVALID_LOCALE') {
 *     // Handle invalid locale
 *   }
 * }
 * ```
 */
import { BrowserUtilsError } from './BrowserUtilsError.js';

export type IntlErrorCode = 'INTL_INVALID_LOCALE' | 'INTL_INVALID_OPTIONS';

export class IntlError extends BrowserUtilsError {
  readonly code: IntlErrorCode;

  constructor(code: IntlErrorCode, message: string, cause?: unknown) {
    super(message, cause);
    this.code = code;
  }

  // =========================================================================
  // Factory Methods
  // =========================================================================

  /**
   * The requested locale is invalid or unsupported.
   *
   * The offending locale is not reflected in the message; the original error is
   * preserved as `cause` for diagnostics.
   */
  static invalidLocale(cause?: unknown): IntlError {
    return new IntlError('INTL_INVALID_LOCALE', 'Invalid or unsupported locale', cause);
  }

  /**
   * The formatting options are invalid.
   *
   * Raw options are not reflected in the message; the original error is
   * preserved as `cause`.
   */
  static invalidOptions(cause?: unknown): IntlError {
    return new IntlError('INTL_INVALID_OPTIONS', 'Invalid format options', cause);
  }
}
