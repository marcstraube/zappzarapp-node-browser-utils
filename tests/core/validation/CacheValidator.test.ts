import { describe, it, expect } from 'vitest';
import { Validator, Result, ValidationError } from '../../../src/core/index.js';
import { CacheValidator } from '../../../src/core/validation';

describe('CacheValidator', () => {
  describe('cacheKey', () => {
    it('should accept valid simple key', () => {
      expect(() => CacheValidator.cacheKey('user')).not.toThrow();
    });

    it('should accept key with colons', () => {
      expect(() => CacheValidator.cacheKey('user:123')).not.toThrow();
    });

    it('should accept key with slashes', () => {
      expect(() => CacheValidator.cacheKey('api/users/list')).not.toThrow();
    });

    it('should accept key with dots', () => {
      expect(() => CacheValidator.cacheKey('config.theme.dark')).not.toThrow();
    });

    it('should accept key with hyphens', () => {
      expect(() => CacheValidator.cacheKey('my-cache-key')).not.toThrow();
    });

    it('should accept key with underscores', () => {
      expect(() => CacheValidator.cacheKey('my_cache_key')).not.toThrow();
    });

    it('should accept key with mixed valid characters', () => {
      expect(() => CacheValidator.cacheKey('api/users:123/profile.name')).not.toThrow();
    });

    it('should throw for empty key', () => {
      expect(() => CacheValidator.cacheKey('')).toThrow(ValidationError);
    });

    it('should throw for key with spaces', () => {
      expect(() => CacheValidator.cacheKey('key with spaces')).toThrow(ValidationError);
    });

    it('should throw for key with angle brackets', () => {
      expect(() => CacheValidator.cacheKey('key<script>')).toThrow(ValidationError);
    });

    it('should throw for key exceeding max length', () => {
      const longKey = 'a'.repeat(257);
      expect(() => CacheValidator.cacheKey(longKey)).toThrow(ValidationError);
    });

    it('should accept key at max length', () => {
      const maxKey = 'a'.repeat(256);
      expect(() => CacheValidator.cacheKey(maxKey)).not.toThrow();
    });
  });

  describe('cacheKeyResult', () => {
    it('should return Ok for valid key', () => {
      const result = CacheValidator.cacheKeyResult('user:123');
      expect(Result.isOk(result)).toBe(true);
    });

    it('should return Err for empty key', () => {
      const result = CacheValidator.cacheKeyResult('');
      expect(Result.isErr(result)).toBe(true);
    });

    it('should return Err for key with invalid characters', () => {
      const result = CacheValidator.cacheKeyResult('key with spaces');
      expect(Result.isErr(result)).toBe(true);
    });

    it('should return Err for key exceeding max length', () => {
      const result = CacheValidator.cacheKeyResult('a'.repeat(257));
      expect(Result.isErr(result)).toBe(true);
    });
  });

  describe('Validator facade', () => {
    it('should expose cacheKey via Validator facade', () => {
      expect(() => Validator.cacheKey('user:123')).not.toThrow();
    });

    it('should expose cacheKeyResult via Validator facade', () => {
      const result = Validator.cacheKeyResult('user:123');
      expect(Result.isOk(result)).toBe(true);
    });

    it('should reject invalid key via Validator facade', () => {
      expect(() => Validator.cacheKey('')).toThrow(ValidationError);
    });
  });
});
