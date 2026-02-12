/**
 * CSP Error for Content Security Policy operations.
 *
 * Thrown when CSP operations fail due to:
 * - NonceManager already destroyed
 *
 * @example
 * ```TypeScript
 * try {
 *   manager.getNonce();
 * } catch (error) {
 *   if (error instanceof CspError && error.code === 'CSP_ALREADY_DESTROYED') {
 *     // Handle destroyed manager
 *   }
 * }
 * ```
 */
import { BrowserUtilsError } from './BrowserUtilsError.js';

export type CspErrorCode = 'CSP_ALREADY_DESTROYED';

export class CspError extends BrowserUtilsError {
  readonly code: CspErrorCode;

  constructor(code: CspErrorCode, message: string, cause?: unknown) {
    super(message, cause);
    this.code = code;
  }

  // =========================================================================
  // Factory Methods
  // =========================================================================

  /**
   * NonceManager instance has been destroyed.
   */
  static alreadyDestroyed(): CspError {
    return new CspError(
      'CSP_ALREADY_DESTROYED',
      'NonceManager has been destroyed and cannot be used'
    );
  }
}
