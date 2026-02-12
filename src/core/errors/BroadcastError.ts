/**
 * Broadcast Error for BroadcastChannel operations.
 *
 * Thrown when broadcast operations fail due to:
 * - BroadcastChannel not supported
 * - Channel closed
 * - Send failures
 * - Crypto API unavailable
 *
 * @example
 * ```TypeScript
 * try {
 *   broadcast.send('type', payload);
 * } catch (error) {
 *   if (error instanceof BroadcastError && error.code === 'CHANNEL_CLOSED') {
 *     // Handle closed channel
 *   }
 * }
 * ```
 */
import { BrowserUtilsError } from './BrowserUtilsError.js';

/**
 * Broadcast channel error codes.
 */
export type BroadcastErrorCode =
  | 'NOT_SUPPORTED'
  | 'CHANNEL_CLOSED'
  | 'SEND_FAILED'
  | 'CRYPTO_UNAVAILABLE';

/**
 * Broadcast-specific error.
 */
export class BroadcastError extends BrowserUtilsError {
  constructor(
    readonly code: BroadcastErrorCode,
    message: string,
    cause?: unknown
  ) {
    super(message, cause);
  }

  static notSupported(): BroadcastError {
    return new BroadcastError(
      'NOT_SUPPORTED',
      'BroadcastChannel is not supported in this environment'
    );
  }

  static channelClosed(channelName: string): BroadcastError {
    return new BroadcastError('CHANNEL_CLOSED', `Broadcast channel "${channelName}" is closed`);
  }

  static sendFailed(cause?: unknown): BroadcastError {
    return new BroadcastError('SEND_FAILED', 'Failed to send broadcast message', cause);
  }

  static cryptoUnavailable(): BroadcastError {
    return new BroadcastError(
      'CRYPTO_UNAVAILABLE',
      'Crypto API is not available. Secure random ID generation requires crypto.randomUUID() or crypto.getRandomValues()'
    );
  }
}
