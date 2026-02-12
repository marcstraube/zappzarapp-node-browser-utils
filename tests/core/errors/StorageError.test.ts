import { describe, it, expect } from 'vitest';
import { StorageError, BrowserUtilsError } from '../../../src/core/index.js';

describe('StorageError', () => {
  describe('instanceof', () => {
    it('should be instanceof BrowserUtilsError', () => {
      const error = StorageError.unavailable();

      expect(error).toBeInstanceOf(BrowserUtilsError);
    });

    it('should be instanceof StorageError', () => {
      const error = StorageError.unavailable();

      expect(error).toBeInstanceOf(StorageError);
    });
  });

  describe('unavailable', () => {
    it('should create error without reason', () => {
      const error = StorageError.unavailable();

      expect(error.message).toBe('localStorage is not available');
      expect(error.code).toBe('STORAGE_UNAVAILABLE');
      expect(error.key).toBeUndefined();
    });

    it('should create error with reason', () => {
      const error = StorageError.unavailable('private browsing mode');

      expect(error.message).toBe('localStorage is not available: private browsing mode');
    });
  });

  describe('quotaExceeded', () => {
    it('should create error with key', () => {
      const error = StorageError.quotaExceeded('largeData');

      expect(error.message).toBe('Storage quota exceeded while storing key: largeData');
      expect(error.code).toBe('STORAGE_QUOTA_EXCEEDED');
      expect(error.key).toBe('largeData');
    });

    it('should store cause', () => {
      const cause = new Error('DOM exception');
      const error = StorageError.quotaExceeded('data', cause);

      expect(error.cause).toBe(cause);
    });
  });

  describe('serializationFailed', () => {
    it('should create error with key and cause', () => {
      const cause = new TypeError('circular reference');
      const error = StorageError.serializationFailed('myKey', cause);

      expect(error.message).toBe('Failed to serialize value for key: myKey');
      expect(error.code).toBe('STORAGE_SERIALIZATION_FAILED');
      expect(error.key).toBe('myKey');
      expect(error.cause).toBe(cause);
    });
  });

  describe('deserializationFailed', () => {
    it('should create error with key', () => {
      const error = StorageError.deserializationFailed('corrupted');

      expect(error.message).toBe('Failed to deserialize value for key: corrupted');
      expect(error.code).toBe('STORAGE_DESERIALIZATION_FAILED');
      expect(error.key).toBe('corrupted');
    });
  });

  describe('keyNotFound', () => {
    it('should create error with key', () => {
      const error = StorageError.keyNotFound('missing');

      expect(error.message).toBe('Key not found: missing');
      expect(error.code).toBe('STORAGE_KEY_NOT_FOUND');
      expect(error.key).toBe('missing');
    });
  });

  describe('corrupted', () => {
    it('should create error with key and reason', () => {
      const error = StorageError.corrupted('data', 'missing timestamp');

      expect(error.message).toBe('Corrupted data for key data: missing timestamp');
      expect(error.code).toBe('STORAGE_CORRUPTED');
      expect(error.key).toBe('data');
    });
  });
});
