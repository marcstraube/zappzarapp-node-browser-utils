/**
 * Cookie Error for cookie operations.
 *
 * Thrown when cookie operations fail due to:
 * - Cookies disabled
 * - Cookie too large
 * - Invalid cookie data
 *
 * @example
 * ```TypeScript
 * try {
 *   CookieManager.set('name', 'value');
 * } catch (error) {
 *   if (error instanceof CookieError && error.code === 'COOKIE_DISABLED') {
 *     // Cookies are disabled
 *   }
 * }
 * ```
 */
import { BrowserUtilsError } from './BrowserUtilsError.js';

export type CookieErrorCode =
  | 'COOKIE_DISABLED'
  | 'COOKIE_TOO_LARGE'
  | 'COOKIE_SET_FAILED'
  | 'COOKIE_NOT_FOUND';

export class CookieError extends BrowserUtilsError {
  readonly code: CookieErrorCode;

  /**
   * The cookie name involved (if applicable).
   */
  readonly cookieName?: string;

  constructor(code: CookieErrorCode, message: string, cookieName?: string, cause?: unknown) {
    super(message, cause);
    this.code = code;
    this.cookieName = cookieName;
  }

  // =========================================================================
  // Factory Methods
  // =========================================================================

  /**
   * Cookies are disabled in this browser.
   */
  static disabled(): CookieError {
    return new CookieError('COOKIE_DISABLED', 'Cookies are disabled in this browser');
  }

  /**
   * Cookie exceeds maximum allowed size.
   */
  static tooLarge(name: string, size: number): CookieError {
    return new CookieError(
      'COOKIE_TOO_LARGE',
      `Cookie "${name}" exceeds maximum size (${size} bytes)`,
      name
    );
  }

  /**
   * Failed to set cookie.
   */
  static setFailed(name: string, cause?: unknown): CookieError {
    return new CookieError('COOKIE_SET_FAILED', `Failed to set cookie: ${name}`, name, cause);
  }

  /**
   * Cookie not found.
   */
  static notFound(name: string): CookieError {
    return new CookieError('COOKIE_NOT_FOUND', `Cookie not found: ${name}`, name);
  }
}
