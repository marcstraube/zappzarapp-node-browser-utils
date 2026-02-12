/**
 * Encryption Error for encrypted storage operations.
 *
 * Thrown when encryption operations fail due to:
 * - Web Crypto API unavailable
 * - Key derivation failure
 * - Encryption/decryption failure
 * - Invalid data format
 * - Storage quota exceeded
 *
 * @example
 * ```TypeScript
 * try {
 *   await encryptedStorage.set('key', sensitiveData);
 * } catch (error) {
 *   if (error instanceof EncryptionError && error.code === 'CRYPTO_UNAVAILABLE') {
 *     // Handle crypto unavailable
 *   }
 * }
 * ```
 */
import { BrowserUtilsError } from './BrowserUtilsError.js';

export type EncryptionErrorCode =
  | 'CRYPTO_UNAVAILABLE'
  | 'KEY_DERIVATION_FAILED'
  | 'ENCRYPTION_FAILED'
  | 'DECRYPTION_FAILED'
  | 'INVALID_DATA_FORMAT'
  | 'STORAGE_UNAVAILABLE'
  | 'STORAGE_QUOTA_EXCEEDED'
  | 'ALREADY_DESTROYED';

export class EncryptionError extends BrowserUtilsError {
  readonly code: EncryptionErrorCode;

  /**
   * The storage key involved (if applicable).
   */
  readonly key?: string;

  constructor(code: EncryptionErrorCode, message: string, key?: string, cause?: unknown) {
    super(message, cause);
    this.code = code;
    this.key = key;
  }

  // =========================================================================
  // Factory Methods
  // =========================================================================

  /**
   * Web Crypto API is not available.
   */
  static cryptoUnavailable(): EncryptionError {
    return new EncryptionError(
      'CRYPTO_UNAVAILABLE',
      'Web Crypto API is not available. Ensure you are in a secure context (HTTPS).'
    );
  }

  /**
   * Key derivation failed.
   */
  static keyDerivationFailed(cause?: unknown): EncryptionError {
    return new EncryptionError(
      'KEY_DERIVATION_FAILED',
      'Failed to derive encryption key from password',
      undefined,
      cause
    );
  }

  /**
   * Encryption operation failed.
   */
  static encryptionFailed(key: string, cause?: unknown): EncryptionError {
    return new EncryptionError(
      'ENCRYPTION_FAILED',
      `Failed to encrypt data for key: ${key}`,
      key,
      cause
    );
  }

  /**
   * Decryption operation failed.
   */
  static decryptionFailed(key: string, cause?: unknown): EncryptionError {
    return new EncryptionError(
      'DECRYPTION_FAILED',
      `Failed to decrypt data for key: ${key}`,
      key,
      cause
    );
  }

  /**
   * Invalid data format (corrupted or tampered data).
   */
  static invalidDataFormat(key: string, reason: string): EncryptionError {
    return new EncryptionError(
      'INVALID_DATA_FORMAT',
      `Invalid encrypted data format for key ${key}: ${reason}`,
      key
    );
  }

  /**
   * Storage is not available.
   */
  static storageUnavailable(reason?: string): EncryptionError {
    const message =
      reason !== undefined && reason !== ''
        ? `Storage is not available: ${reason}`
        : 'Storage is not available';
    return new EncryptionError('STORAGE_UNAVAILABLE', message);
  }

  /**
   * Storage quota exceeded.
   */
  static quotaExceeded(key: string, cause?: unknown): EncryptionError {
    return new EncryptionError(
      'STORAGE_QUOTA_EXCEEDED',
      `Storage quota exceeded while storing key: ${key}`,
      key,
      cause
    );
  }

  /**
   * Instance has been destroyed.
   */
  static alreadyDestroyed(): EncryptionError {
    return new EncryptionError(
      'ALREADY_DESTROYED',
      'EncryptedStorage instance has been destroyed and cannot be used'
    );
  }
}
