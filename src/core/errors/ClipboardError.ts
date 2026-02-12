/**
 * Clipboard Error for clipboard operations.
 *
 * Thrown when clipboard operations fail due to:
 * - Permission denied
 * - Not supported
 * - Read/write failures
 *
 * @example
 * ```TypeScript
 * const result = await ClipboardManager.readText();
 * if (Result.isErr(result)) {
 *   if (result.error.code === 'CLIPBOARD_PERMISSION_DENIED') {
 *     // Request permission or show fallback
 *   }
 * }
 * ```
 */
import { BrowserUtilsError } from './BrowserUtilsError.js';

export type ClipboardErrorCode =
  | 'CLIPBOARD_NOT_SUPPORTED'
  | 'CLIPBOARD_PERMISSION_DENIED'
  | 'CLIPBOARD_READ_FAILED'
  | 'CLIPBOARD_WRITE_FAILED'
  | 'CLIPBOARD_EMPTY';

export class ClipboardError extends BrowserUtilsError {
  readonly code: ClipboardErrorCode;

  constructor(code: ClipboardErrorCode, message: string, cause?: unknown) {
    super(message, cause);
    this.code = code;
  }

  // =========================================================================
  // Factory Methods
  // =========================================================================

  /**
   * Clipboard API is not supported in this browser.
   */
  static notSupported(operation: string): ClipboardError {
    return new ClipboardError(
      'CLIPBOARD_NOT_SUPPORTED',
      `Clipboard API not supported for operation: ${operation}`
    );
  }

  /**
   * Permission to access clipboard was denied.
   */
  static permissionDenied(operation: string): ClipboardError {
    return new ClipboardError(
      'CLIPBOARD_PERMISSION_DENIED',
      `Clipboard permission denied for operation: ${operation}`
    );
  }

  /**
   * Failed to read from clipboard.
   */
  static readFailed(cause?: unknown): ClipboardError {
    return new ClipboardError('CLIPBOARD_READ_FAILED', 'Failed to read from clipboard', cause);
  }

  /**
   * Failed to write to clipboard.
   */
  static writeFailed(cause?: unknown): ClipboardError {
    return new ClipboardError('CLIPBOARD_WRITE_FAILED', 'Failed to write to clipboard', cause);
  }

  /**
   * Clipboard is empty or has no readable content.
   */
  static empty(): ClipboardError {
    return new ClipboardError('CLIPBOARD_EMPTY', 'Clipboard is empty or has no readable content');
  }
}
