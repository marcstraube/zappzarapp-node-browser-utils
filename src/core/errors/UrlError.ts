/**
 * URL Error for URL-related operations.
 *
 * Thrown when URL operations fail due to:
 * - Invalid URL format
 * - Dangerous protocol
 * - Invalid state
 *
 * @example
 * ```TypeScript
 * const result = UrlBuilder.fromResult('invalid-url');
 * if (Result.isErr(result)) {
 *   if (result.error.code === 'URL_INVALID_FORMAT') {
 *     // Handle invalid URL
 *   }
 * }
 * ```
 */
import { BrowserUtilsError } from './BrowserUtilsError.js';

export type UrlErrorCode =
  | 'URL_INVALID_FORMAT'
  | 'URL_DANGEROUS_PROTOCOL'
  | 'URL_INVALID_STATE'
  | 'URL_NAVIGATION_FAILED';

export class UrlError extends BrowserUtilsError {
  readonly code: UrlErrorCode;

  /**
   * The URL that caused the error (if safe to expose).
   */
  readonly url?: string;

  constructor(code: UrlErrorCode, message: string, url?: string, cause?: unknown) {
    super(message, cause);
    this.code = code;
    this.url = url;
  }

  // =========================================================================
  // Factory Methods
  // =========================================================================

  /**
   * URL has invalid format.
   */
  static invalidFormat(_url: string): UrlError {
    // Don't include the URL in the message for security (could be malicious)
    return new UrlError('URL_INVALID_FORMAT', 'Invalid URL format');
  }

  /**
   * URL uses a dangerous protocol (javascript:, data:, etc.).
   */
  static dangerousProtocol(protocol: string): UrlError {
    return new UrlError(
      'URL_DANGEROUS_PROTOCOL',
      `Dangerous protocol not allowed: ${protocol}`,
      undefined
    );
  }

  /**
   * Invalid state object for history.
   */
  static invalidState(reason: string): UrlError {
    return new UrlError('URL_INVALID_STATE', `Invalid history state: ${reason}`);
  }

  /**
   * Navigation failed.
   */
  static navigationFailed(cause?: unknown): UrlError {
    return new UrlError('URL_NAVIGATION_FAILED', 'Navigation failed', undefined, cause);
  }
}
