import { describe, it, expect } from 'vitest';
import { ValidationError, BrowserUtilsError } from '../../../src/core/index.js';

describe('ValidationError', () => {
  describe('instanceof', () => {
    it('should be instanceof BrowserUtilsError', () => {
      const error = ValidationError.empty('field');

      expect(error).toBeInstanceOf(BrowserUtilsError);
    });

    it('should be instanceof ValidationError', () => {
      const error = ValidationError.empty('field');

      expect(error).toBeInstanceOf(ValidationError);
    });
  });

  describe('empty', () => {
    it('should create error for empty field', () => {
      const error = ValidationError.empty('username');

      expect(error.message).toBe('username cannot be empty');
      expect(error.field).toBe('username');
      expect(error.value).toBe('(empty)');
      expect(error.constraint).toBe('non-empty');
      expect(error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('containsForbiddenChars', () => {
    it('should create error for forbidden characters', () => {
      const error = ValidationError.containsForbiddenChars('key', 'bad;value', 'semicolon');

      expect(error.message).toBe('key contains forbidden characters: semicolon');
      expect(error.field).toBe('key');
      expect(error.value).toBe('bad;value');
      expect(error.constraint).toBe('must not contain: semicolon');
    });

    it('should sanitize value with control characters', () => {
      const error = ValidationError.containsForbiddenChars('key', 'bad\nvalue', 'newline');

      expect(error.value).toBe('bad\\nvalue');
    });

    it('should truncate long values', () => {
      const longValue = 'a'.repeat(100);
      const error = ValidationError.containsForbiddenChars('key', longValue, 'test');

      expect(error.value.length).toBeLessThanOrEqual(53); // 50 + '...'
      expect(error.value).toContain('...');
    });
  });

  describe('invalidFilename', () => {
    it('should create error for invalid filename', () => {
      const error = ValidationError.invalidFilename('../etc/passwd', 'path traversal detected');

      expect(error.message).toBe('Invalid filename: path traversal detected');
      expect(error.field).toBe('filename');
      expect(error.constraint).toBe('valid filename');
    });
  });

  describe('tooLong', () => {
    it('should create error for value exceeding max length', () => {
      const error = ValidationError.tooLong('name', 'a'.repeat(300), 255);

      expect(error.message).toBe('name exceeds maximum length of 255');
      expect(error.field).toBe('name');
      expect(error.value).toBe('(300 chars)');
      expect(error.constraint).toBe('max 255 chars');
    });
  });

  describe('invalidFormat', () => {
    it('should create error for invalid format', () => {
      const error = ValidationError.invalidFormat('mimeType', 'invalid', 'type/subtype');

      expect(error.message).toBe('mimeType has invalid format, expected: type/subtype');
      expect(error.field).toBe('mimeType');
      expect(error.constraint).toBe('type/subtype');
    });
  });

  describe('insufficientComplexity', () => {
    it('should create error for insufficient password complexity', () => {
      const error = ValidationError.insufficientComplexity('password', 1, 3);

      expect(error.message).toBe(
        'password must contain at least 3 character classes (lowercase, uppercase, digits, special), got 1'
      );
      expect(error.field).toBe('password');
      expect(error.value).toBe('(hidden)');
      expect(error.constraint).toBe('at least 3 of 4 character classes');
    });
  });

  describe('outOfRange', () => {
    it('should create error for value out of range', () => {
      const error = ValidationError.outOfRange('maxEntries', 0, 1, 10000);

      expect(error.message).toBe('maxEntries must be between 1 and 10000, got 0');
      expect(error.field).toBe('maxEntries');
      expect(error.value).toBe('0');
      expect(error.constraint).toBe('1 <= value <= 10000');
    });
  });
});
