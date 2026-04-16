import { describe, it, expect } from 'vitest';
import { EncryptionError, BrowserUtilsError } from '../../../src/core/index.js';

describe('EncryptionError', () => {
  describe('instanceof', () => {
    it('should be instanceof BrowserUtilsError', () => {
      const error = EncryptionError.cryptoUnavailable();

      expect(error).toBeInstanceOf(BrowserUtilsError);
    });

    it('should be instanceof EncryptionError', () => {
      const error = EncryptionError.cryptoUnavailable();

      expect(error).toBeInstanceOf(EncryptionError);
    });
  });

  describe('keyDerivationFailed', () => {
    it('should create error with correct message and code', () => {
      const error = EncryptionError.keyDerivationFailed();

      expect(error.message).toBe('Failed to derive encryption key from password');
      expect(error.code).toBe('KEY_DERIVATION_FAILED');
      expect(error.key).toBeUndefined();
    });

    it('should preserve cause', () => {
      const cause = new Error('PBKDF2 failed');
      const error = EncryptionError.keyDerivationFailed(cause);

      expect(error.cause).toBe(cause);
    });
  });

  describe('encryptionFailed', () => {
    it('should create error with key in message', () => {
      const error = EncryptionError.encryptionFailed('secretKey');

      expect(error.message).toBe('Failed to encrypt data for key: secretKey');
      expect(error.code).toBe('ENCRYPTION_FAILED');
      expect(error.key).toBe('secretKey');
    });
  });

  describe('decryptionFailed', () => {
    it('should create error with key in message', () => {
      const error = EncryptionError.decryptionFailed('secretKey');

      expect(error.message).toBe('Failed to decrypt data for key: secretKey');
      expect(error.code).toBe('DECRYPTION_FAILED');
      expect(error.key).toBe('secretKey');
    });
  });

  describe('invalidDataFormat', () => {
    it('should create error with key and reason in message', () => {
      const error = EncryptionError.invalidDataFormat('myKey', 'corrupted header');

      expect(error.message).toBe('Invalid encrypted data format for key myKey: corrupted header');
      expect(error.code).toBe('INVALID_DATA_FORMAT');
      expect(error.key).toBe('myKey');
    });
  });

  describe('storageUnavailable', () => {
    it('should create error with reason', () => {
      const error = EncryptionError.storageUnavailable('quota exceeded');

      expect(error.message).toBe('Storage is not available: quota exceeded');
      expect(error.code).toBe('STORAGE_UNAVAILABLE');
    });

    it('should create error without reason', () => {
      const error = EncryptionError.storageUnavailable();

      expect(error.message).toBe('Storage is not available');
    });

    it('should treat empty string reason as no reason', () => {
      const error = EncryptionError.storageUnavailable('');

      expect(error.message).toBe('Storage is not available');
    });
  });

  describe('quotaExceeded', () => {
    it('should create error with key in message', () => {
      const error = EncryptionError.quotaExceeded('largeData');

      expect(error.message).toBe('Storage quota exceeded while storing key: largeData');
      expect(error.code).toBe('STORAGE_QUOTA_EXCEEDED');
      expect(error.key).toBe('largeData');
    });
  });

  describe('alreadyDestroyed', () => {
    it('should create error with correct message', () => {
      const error = EncryptionError.alreadyDestroyed();

      expect(error.message).toBe('EncryptedStorage instance has been destroyed and cannot be used');
      expect(error.code).toBe('ALREADY_DESTROYED');
    });
  });
});
