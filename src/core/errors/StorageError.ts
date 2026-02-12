/**
 * Storage Error for localStorage operations.
 *
 * Thrown when storage operations fail due to:
 * - Quota exceeded
 * - Storage unavailable (private browsing)
 * - Serialization failures
 * - Corrupted data
 *
 * @example
 * ```TypeScript
 * try {
 *   storage.set('key', largeData);
 * } catch (error) {
 *   if (error instanceof StorageError && error.code === 'STORAGE_QUOTA_EXCEEDED') {
 *     // Handle quota exceeded
 *   }
 * }
 * ```
 */
import { BrowserUtilsError } from './BrowserUtilsError.js';

export type StorageErrorCode =
  | 'STORAGE_UNAVAILABLE'
  | 'STORAGE_QUOTA_EXCEEDED'
  | 'STORAGE_SERIALIZATION_FAILED'
  | 'STORAGE_DESERIALIZATION_FAILED'
  | 'STORAGE_KEY_NOT_FOUND'
  | 'STORAGE_CORRUPTED';

export class StorageError extends BrowserUtilsError {
  readonly code: StorageErrorCode;

  /**
   * The storage key involved (if applicable).
   */
  readonly key?: string;

  constructor(code: StorageErrorCode, message: string, key?: string, cause?: unknown) {
    super(message, cause);
    this.code = code;
    this.key = key;
  }

  // =========================================================================
  // Factory Methods
  // =========================================================================

  /**
   * Storage is not available (private browsing, disabled, etc.).
   */
  static unavailable(reason?: string): StorageError {
    const message =
      reason !== undefined && reason !== ''
        ? `localStorage is not available: ${reason}`
        : 'localStorage is not available';
    return new StorageError('STORAGE_UNAVAILABLE', message);
  }

  /**
   * Storage quota exceeded.
   */
  static quotaExceeded(key: string, cause?: unknown): StorageError {
    return new StorageError(
      'STORAGE_QUOTA_EXCEEDED',
      `Storage quota exceeded while storing key: ${key}`,
      key,
      cause
    );
  }

  /**
   * Failed to serialize value to JSON.
   */
  static serializationFailed(key: string, cause?: unknown): StorageError {
    return new StorageError(
      'STORAGE_SERIALIZATION_FAILED',
      `Failed to serialize value for key: ${key}`,
      key,
      cause
    );
  }

  /**
   * Failed to deserialize stored value.
   */
  static deserializationFailed(key: string, cause?: unknown): StorageError {
    return new StorageError(
      'STORAGE_DESERIALIZATION_FAILED',
      `Failed to deserialize value for key: ${key}`,
      key,
      cause
    );
  }

  /**
   * Key not found in storage.
   */
  static keyNotFound(key: string): StorageError {
    return new StorageError('STORAGE_KEY_NOT_FOUND', `Key not found: ${key}`, key);
  }

  /**
   * Stored data is corrupted or has unexpected format.
   */
  static corrupted(key: string, reason: string): StorageError {
    return new StorageError('STORAGE_CORRUPTED', `Corrupted data for key ${key}: ${reason}`, key);
  }
}
