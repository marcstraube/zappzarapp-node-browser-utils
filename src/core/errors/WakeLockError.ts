/**
 * Wake Lock Error for Screen Wake Lock API operations.
 *
 * Returned (via Result) when a wake lock cannot be acquired due to:
 * - Not supported (Wake Lock API unavailable)
 * - Request failed (e.g. document not active, permission denied, low battery)
 *
 * @example
 * ```TypeScript
 * const result = await WakeLock.request();
 * if (Result.isErr(result)) {
 *   if (result.error.code === 'WAKE_LOCK_NOT_SUPPORTED') {
 *     // Wake Lock API not available
 *   }
 * }
 * ```
 */
import { BrowserUtilsError } from './BrowserUtilsError.js';

export type WakeLockErrorCode = 'WAKE_LOCK_NOT_SUPPORTED' | 'WAKE_LOCK_REQUEST_FAILED';

export class WakeLockError extends BrowserUtilsError {
  readonly code: WakeLockErrorCode;

  constructor(code: WakeLockErrorCode, message: string, cause?: unknown) {
    super(message, cause);
    this.code = code;
  }

  // =========================================================================
  // Factory Methods
  // =========================================================================

  /**
   * Screen Wake Lock API is not supported.
   */
  static notSupported(): WakeLockError {
    return new WakeLockError('WAKE_LOCK_NOT_SUPPORTED', 'Screen Wake Lock API is not supported');
  }

  /**
   * Failed to acquire the wake lock.
   */
  static requestFailed(cause?: unknown): WakeLockError {
    return new WakeLockError('WAKE_LOCK_REQUEST_FAILED', 'Failed to acquire wake lock', cause);
  }
}
