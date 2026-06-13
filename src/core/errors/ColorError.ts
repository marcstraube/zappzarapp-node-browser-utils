/**
 * Color Error for color parsing and conversion operations.
 *
 * Thrown when a color string cannot be parsed, due to:
 * - Invalid or malformed format
 * - A recognisable but currently unsupported color space
 *
 * @example
 * ```TypeScript
 * const result = parseColorResult('not-a-color');
 * if (Result.isErr(result)) {
 *   if (result.error.code === 'COLOR_INVALID_FORMAT') {
 *     // Handle invalid color
 *   }
 * }
 * ```
 */
import { BrowserUtilsError } from './BrowserUtilsError.js';

export type ColorErrorCode = 'COLOR_INVALID_FORMAT' | 'COLOR_UNSUPPORTED_SPACE';

export class ColorError extends BrowserUtilsError {
  readonly code: ColorErrorCode;

  constructor(code: ColorErrorCode, message: string, cause?: unknown) {
    super(message, cause);
    this.code = code;
  }

  // =========================================================================
  // Factory Methods
  // =========================================================================

  /**
   * Color string has an invalid or unrecognised format.
   *
   * Takes no argument by design: the raw input is never reflected in the
   * message, since it may be attacker-controlled.
   */
  static invalidFormat(): ColorError {
    return new ColorError('COLOR_INVALID_FORMAT', 'Invalid color format');
  }

  /**
   * Color string names a recognisable but currently unsupported color space.
   *
   * @param space A fixed, parser-recognised space identifier (e.g. `oklch`,
   *   `lab`). Never pass raw user input — only known function-name tokens.
   */
  static unsupportedSpace(space: string): ColorError {
    return new ColorError('COLOR_UNSUPPORTED_SPACE', `Unsupported color space: ${space}`);
  }
}
