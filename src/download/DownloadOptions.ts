/**
 * Download Options Value Object.
 *
 * Immutable configuration for file downloads.
 * All options are validated on creation.
 *
 * @example
 * ```TypeScript
 * const options = DownloadOptions.json('export.json');
 * const csvOptions = DownloadOptions.csv('data.csv');
 * const custom = DownloadOptions.create('file.bin', 'application/octet-stream');
 * ```
 */
import { Validator } from '../core/index.js';

/**
 * Options for creating downloads.
 */
export interface DownloadOptionsInput {
  /**
   * Filename for the download.
   * Will be validated for security (no path traversal, etc.).
   */
  readonly filename: string;

  /**
   * MIME type for the content.
   * @default 'application/octet-stream'
   */
  readonly mimeType?: string;

  /**
   * Whether to sanitize the filename instead of throwing on invalid.
   * @default false (throw ValidationError on invalid filename)
   */
  readonly sanitizeFilename?: boolean;
}

export class DownloadOptions {
  readonly filename: string;
  readonly mimeType: string;

  private constructor(filename: string, mimeType: string) {
    this.filename = filename;
    this.mimeType = mimeType;
  }

  // =========================================================================
  // Factory Methods
  // =========================================================================

  /**
   * Create download options with validation.
   * @throws {ValidationError} If filename or mimeType is invalid
   */
  static create(input: DownloadOptionsInput): DownloadOptions {
    let filename: string;
    if (input.sanitizeFilename === true) {
      filename = Validator.sanitizeFilename(input.filename);
    } else {
      Validator.filename(input.filename);
      filename = input.filename;
    }

    const mimeType = input.mimeType ?? 'application/octet-stream';
    if (input.mimeType !== undefined && input.mimeType !== '') {
      Validator.mimeType(input.mimeType);
    }

    return new DownloadOptions(filename, mimeType);
  }

  /**
   * Create options for JSON download.
   */
  static json(filename: string, sanitize = false): DownloadOptions {
    const name = filename.endsWith('.json') ? filename : `${filename}.json`;
    return DownloadOptions.create({
      filename: name,
      mimeType: 'application/json',
      sanitizeFilename: sanitize,
    });
  }

  /**
   * Create options for CSV download.
   */
  static csv(filename: string, sanitize = false): DownloadOptions {
    const name = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    return DownloadOptions.create({
      filename: name,
      mimeType: 'text/csv',
      sanitizeFilename: sanitize,
    });
  }

  /**
   * Create options for plain text download.
   */
  static text(filename: string, sanitize = false): DownloadOptions {
    const name = filename.endsWith('.txt') ? filename : `${filename}.txt`;
    return DownloadOptions.create({
      filename: name,
      mimeType: 'text/plain',
      sanitizeFilename: sanitize,
    });
  }

  /**
   * Create options for HTML download.
   */
  static html(filename: string, sanitize = false): DownloadOptions {
    const name = filename.endsWith('.html') ? filename : `${filename}.html`;
    return DownloadOptions.create({
      filename: name,
      mimeType: 'text/html',
      sanitizeFilename: sanitize,
    });
  }

  /**
   * Create options for binary download.
   */
  static binary(
    filename: string,
    mimeType = 'application/octet-stream',
    sanitize = false
  ): DownloadOptions {
    return DownloadOptions.create({
      filename,
      mimeType,
      sanitizeFilename: sanitize,
    });
  }

  // =========================================================================
  // Fluent API
  // =========================================================================

  /**
   * Create new options with different filename.
   */
  withFilename(filename: string, sanitize = false): DownloadOptions {
    return DownloadOptions.create({
      filename,
      mimeType: this.mimeType,
      sanitizeFilename: sanitize,
    });
  }

  /**
   * Create new options with different MIME type.
   */
  withMimeType(mimeType: string): DownloadOptions {
    Validator.mimeType(mimeType);
    return new DownloadOptions(this.filename, mimeType);
  }
}
