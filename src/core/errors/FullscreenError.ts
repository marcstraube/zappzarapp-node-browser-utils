/**
 * Fullscreen Error for fullscreen API operations.
 *
 * Thrown when fullscreen operations fail due to:
 * - Not supported
 * - Permission denied
 * - Element not allowed
 *
 * @example
 * ```TypeScript
 * const result = await Fullscreen.request(element);
 * if (Result.isErr(result)) {
 *   if (result.error.code === 'FULLSCREEN_NOT_SUPPORTED') {
 *     // Fullscreen not available
 *   }
 * }
 * ```
 */
import { BrowserUtilsError } from './BrowserUtilsError.js';

export type FullscreenErrorCode =
  | 'FULLSCREEN_NOT_SUPPORTED'
  | 'FULLSCREEN_ELEMENT_NOT_ALLOWED'
  | 'FULLSCREEN_REQUEST_FAILED'
  | 'FULLSCREEN_EXIT_FAILED'
  | 'FULLSCREEN_NOT_ACTIVE';

export class FullscreenError extends BrowserUtilsError {
  readonly code: FullscreenErrorCode;

  constructor(code: FullscreenErrorCode, message: string, cause?: unknown) {
    super(message, cause);
    this.code = code;
  }

  // =========================================================================
  // Factory Methods
  // =========================================================================

  /**
   * Fullscreen API is not supported.
   */
  static notSupported(): FullscreenError {
    return new FullscreenError('FULLSCREEN_NOT_SUPPORTED', 'Fullscreen API is not supported');
  }

  /**
   * Element is not allowed to enter fullscreen.
   */
  static elementNotAllowed(): FullscreenError {
    return new FullscreenError(
      'FULLSCREEN_ELEMENT_NOT_ALLOWED',
      'Element is not allowed to enter fullscreen mode'
    );
  }

  /**
   * Failed to request fullscreen.
   */
  static requestFailed(cause?: unknown): FullscreenError {
    return new FullscreenError('FULLSCREEN_REQUEST_FAILED', 'Failed to enter fullscreen', cause);
  }

  /**
   * Failed to exit fullscreen.
   */
  static exitFailed(cause?: unknown): FullscreenError {
    return new FullscreenError('FULLSCREEN_EXIT_FAILED', 'Failed to exit fullscreen', cause);
  }

  /**
   * No element is currently in fullscreen mode.
   */
  static notActive(): FullscreenError {
    return new FullscreenError(
      'FULLSCREEN_NOT_ACTIVE',
      'No element is currently in fullscreen mode'
    );
  }
}
