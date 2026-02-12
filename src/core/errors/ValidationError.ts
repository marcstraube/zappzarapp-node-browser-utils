/**
 * Validation Error for input validation failures.
 *
 * Thrown when user input or external data fails validation.
 * Provides detailed context about what failed and why.
 *
 * @example
 * ```TypeScript
 * if (filename.includes('..')) {
 *   throw ValidationError.invalidFilename(filename, 'path traversal detected');
 * }
 * ```
 */
import { BrowserUtilsError } from './BrowserUtilsError.js';

export class ValidationError extends BrowserUtilsError {
  readonly code = 'VALIDATION_ERROR';

  /**
   * The field or parameter that failed validation.
   */
  readonly field: string;

  /**
   * The value that failed validation (sanitized for logging).
   */
  readonly value: string;

  /**
   * The validation constraint that was violated.
   */
  readonly constraint: string;

  constructor(message: string, field: string, value: string, constraint: string) {
    super(message);
    this.field = field;
    this.value = value;
    this.constraint = constraint;
  }

  // =========================================================================
  // Factory Methods
  // =========================================================================

  /**
   * Create error for empty value.
   */
  static empty(field: string): ValidationError {
    return new ValidationError(`${field} cannot be empty`, field, '(empty)', 'non-empty');
  }

  /**
   * Create error for value containing forbidden characters.
   */
  static containsForbiddenChars(field: string, value: string, chars: string): ValidationError {
    const sanitized = ValidationError.sanitizeForLog(value);
    return new ValidationError(
      `${field} contains forbidden characters: ${chars}`,
      field,
      sanitized,
      `must not contain: ${chars}`
    );
  }

  /**
   * Create error for invalid filename.
   */
  static invalidFilename(filename: string, reason: string): ValidationError {
    const sanitized = ValidationError.sanitizeForLog(filename);
    return new ValidationError(
      `Invalid filename: ${reason}`,
      'filename',
      sanitized,
      'valid filename'
    );
  }

  /**
   * Create error for value exceeding maximum length.
   */
  static tooLong(field: string, value: string, maxLength: number): ValidationError {
    return new ValidationError(
      `${field} exceeds maximum length of ${maxLength}`,
      field,
      `(${value.length} chars)`,
      `max ${maxLength} chars`
    );
  }

  /**
   * Create error for invalid format.
   */
  static invalidFormat(field: string, value: string, expectedFormat: string): ValidationError {
    const sanitized = ValidationError.sanitizeForLog(value);
    return new ValidationError(
      `${field} has invalid format, expected: ${expectedFormat}`,
      field,
      sanitized,
      expectedFormat
    );
  }

  /**
   * Create error for insufficient password complexity.
   */
  static insufficientComplexity(field: string, actual: number, required: number): ValidationError {
    return new ValidationError(
      `${field} must contain at least ${required} character classes (lowercase, uppercase, digits, special), got ${actual}`,
      field,
      '(hidden)',
      `at least ${required} of 4 character classes`
    );
  }

  /**
   * Create error for value out of allowed range.
   */
  static outOfRange(field: string, value: number, min: number, max: number): ValidationError {
    return new ValidationError(
      `${field} must be between ${min} and ${max}, got ${value}`,
      field,
      String(value),
      `${min} <= value <= ${max}`
    );
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  /**
   * Sanitize value for safe logging (truncate, escape control chars).
   */
  private static sanitizeForLog(value: string, maxLength = 50): string {
    // Replace control characters with visible representations
    const sanitized = value
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
      .replace(/[\x00-\x1f]/g, '?');

    if (sanitized.length > maxLength) {
      return sanitized.substring(0, maxLength) + '...';
    }

    return sanitized;
  }
}
