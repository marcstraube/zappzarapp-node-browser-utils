/**
 * Base Error for all browser-utils errors.
 *
 * Provides structured error handling with:
 * - Error codes for programmatic handling
 * - Proper prototype chain for instanceof checks
 * - Immutable error properties
 *
 * @example
 * ```TypeScript
 * try {
 *   storage.set('key', value);
 * } catch (error) {
 *   if (error instanceof BrowserUtilsError) {
 *     console.error(`[${error.code}] ${error.message}`);
 *   }
 * }
 * ```
 */
export abstract class BrowserUtilsError extends Error {
  /**
   * Error code for programmatic handling.
   * Format: MODULE_ERROR_TYPE (e.g., STORAGE_QUOTA_EXCEEDED)
   */
  abstract readonly code: string;

  /**
   * Original error that caused this error (if any).
   */
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    // Pass cause to Error constructor (ES2022+) and also store it explicitly
    super(message, cause !== undefined ? { cause } : undefined);
    this.name = this.constructor.name;
    // Store cause explicitly for consistent access (Error.cause is standardized in ES2022)
    this.cause = cause;

    // Restore prototype chain (required for extending Error in TypeScript)
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Create a formatted error message with code.
   */
  toFormattedString(): string {
    return `[${this.code}] ${this.message}`;
  }
}
