/**
 * Notification Error for browser notification operations.
 *
 * Thrown when notification operations fail due to:
 * - Not supported
 * - Permission denied
 * - Show failed
 *
 * @example
 * ```TypeScript
 * const result = await BrowserNotification.requestPermission();
 * if (Result.isErr(result)) {
 *   if (result.error.code === 'NOTIFICATION_PERMISSION_DENIED') {
 *     // User denied notification permission
 *   }
 * }
 * ```
 */
import { BrowserUtilsError } from './BrowserUtilsError.js';

export type NotificationErrorCode =
  | 'NOTIFICATION_NOT_SUPPORTED'
  | 'NOTIFICATION_PERMISSION_DENIED'
  | 'NOTIFICATION_PERMISSION_DEFAULT'
  | 'NOTIFICATION_SHOW_FAILED';

export class NotificationError extends BrowserUtilsError {
  readonly code: NotificationErrorCode;

  constructor(code: NotificationErrorCode, message: string, cause?: unknown) {
    super(message, cause);
    this.code = code;
  }

  // =========================================================================
  // Factory Methods
  // =========================================================================

  /**
   * Notification API is not supported.
   */
  static notSupported(): NotificationError {
    return new NotificationError(
      'NOTIFICATION_NOT_SUPPORTED',
      'Notification API is not supported in this browser'
    );
  }

  /**
   * Notification permission was denied.
   */
  static permissionDenied(): NotificationError {
    return new NotificationError(
      'NOTIFICATION_PERMISSION_DENIED',
      'Notification permission was denied'
    );
  }

  /**
   * Notification permission is in default state (not yet requested).
   */
  static permissionDefault(): NotificationError {
    return new NotificationError(
      'NOTIFICATION_PERMISSION_DEFAULT',
      'Notification permission not yet requested'
    );
  }

  /**
   * Failed to show notification.
   */
  static showFailed(cause?: unknown): NotificationError {
    return new NotificationError('NOTIFICATION_SHOW_FAILED', 'Failed to show notification', cause);
  }
}
