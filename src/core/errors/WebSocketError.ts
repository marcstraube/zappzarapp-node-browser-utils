/**
 * WebSocket Error for WebSocket operations.
 *
 * Thrown when WebSocket operations fail due to:
 * - WebSocket not supported
 * - Connection failures
 * - Send failures
 * - Invalid state or URL
 *
 * @example
 * ```TypeScript
 * try {
 *   ws.connect();
 * } catch (error) {
 *   if (error instanceof WebSocketError && error.code === 'CONNECTION_FAILED') {
 *     // Handle connection failure
 *   }
 * }
 * ```
 */
import { BrowserUtilsError } from './BrowserUtilsError.js';

/**
 * WebSocket error codes.
 */
export type WebSocketErrorCode =
  | 'NOT_SUPPORTED'
  | 'CONNECTION_FAILED'
  | 'SEND_FAILED'
  | 'INVALID_STATE'
  | 'INVALID_URL';

/**
 * WebSocket-specific error.
 */
export class WebSocketError extends BrowserUtilsError {
  constructor(
    readonly code: WebSocketErrorCode,
    message: string,
    cause?: unknown
  ) {
    super(message, cause);
  }

  static notSupported(): WebSocketError {
    return new WebSocketError('NOT_SUPPORTED', 'WebSocket is not supported in this environment');
  }

  static connectionFailed(url: string, cause?: unknown): WebSocketError {
    return new WebSocketError('CONNECTION_FAILED', `Failed to connect to "${url}"`, cause);
  }

  static sendFailed(cause?: unknown): WebSocketError {
    return new WebSocketError('SEND_FAILED', 'Failed to send message', cause);
  }

  static invalidState(state: string): WebSocketError {
    return new WebSocketError('INVALID_STATE', `Invalid WebSocket state: ${state}`);
  }

  static invalidUrl(url: string): WebSocketError {
    return new WebSocketError('INVALID_URL', `Invalid WebSocket URL: "${url}"`);
  }
}
