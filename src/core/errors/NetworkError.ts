/**
 * Network Error for network-related operations.
 *
 * Thrown when network operations fail due to:
 * - Offline status
 * - Request timeout
 * - Max retries exceeded
 *
 * @example
 * ```TypeScript
 * queue.add(async () => fetch(url)).catch(error => {
 *   if (error instanceof NetworkError && error.code === 'NETWORK_OFFLINE') {
 *     // Show offline message
 *   }
 * });
 * ```
 */
import { BrowserUtilsError } from './BrowserUtilsError.js';

export type NetworkErrorCode =
  | 'NETWORK_OFFLINE'
  | 'NETWORK_TIMEOUT'
  | 'NETWORK_MAX_RETRIES'
  | 'NETWORK_REQUEST_FAILED'
  | 'NETWORK_ABORTED'
  | 'NETWORK_INVALID_OPTIONS'
  | 'NETWORK_CIRCUIT_OPEN';

export class NetworkError extends BrowserUtilsError {
  readonly code: NetworkErrorCode;

  /**
   * Number of retry attempts made (if applicable).
   */
  readonly attempts?: number;

  constructor(code: NetworkErrorCode, message: string, attempts?: number, cause?: unknown) {
    super(message, cause);
    this.code = code;
    this.attempts = attempts;
  }

  // =========================================================================
  // Factory Methods
  // =========================================================================

  /**
   * Network is offline.
   */
  static offline(): NetworkError {
    return new NetworkError('NETWORK_OFFLINE', 'Network is offline');
  }

  /**
   * Request timed out.
   */
  static timeout(timeoutMs: number): NetworkError {
    return new NetworkError('NETWORK_TIMEOUT', `Request timed out after ${timeoutMs}ms`);
  }

  /**
   * Maximum retry attempts exceeded.
   */
  static maxRetries(attempts: number, cause?: unknown): NetworkError {
    return new NetworkError(
      'NETWORK_MAX_RETRIES',
      `Maximum retry attempts (${attempts}) exceeded`,
      attempts,
      cause
    );
  }

  /**
   * Request failed.
   */
  static requestFailed(cause?: unknown): NetworkError {
    return new NetworkError('NETWORK_REQUEST_FAILED', 'Network request failed', undefined, cause);
  }

  /**
   * Request was aborted.
   */
  static aborted(): NetworkError {
    return new NetworkError('NETWORK_ABORTED', 'Network request was aborted');
  }

  /**
   * Circuit breaker is open.
   */
  static circuitOpen(): NetworkError {
    return new NetworkError('NETWORK_CIRCUIT_OPEN', 'Circuit breaker is open');
  }
}
