import { describe, it, expect } from 'vitest';
import { Validator, ValidationError, Result } from '../../../src/core/index.js';

describe('Validator', () => {
  // ===========================================================================
  // Storage Key Validation
  // ===========================================================================

  describe('storageKey', () => {
    it('should accept valid key', () => {
      expect(() => Validator.storageKey('validKey')).not.toThrow();
    });

    it('should throw for empty key', () => {
      expect(() => Validator.storageKey('')).toThrow(ValidationError);
    });

    it('should throw for key exceeding max length', () => {
      const longKey = 'a'.repeat(129);

      expect(() => Validator.storageKey(longKey)).toThrow(ValidationError);
    });

    it('should throw for key with semicolon', () => {
      expect(() => Validator.storageKey('key;value')).toThrow(ValidationError);
    });

    it('should throw for key with newline', () => {
      expect(() => Validator.storageKey('key\nvalue')).toThrow(ValidationError);
    });

    it('should throw for key with control characters', () => {
      expect(() => Validator.storageKey('key\x00value')).toThrow(ValidationError);
    });
  });

  describe('storageKeyResult', () => {
    it('should return Ok for valid key', () => {
      const result = Validator.storageKeyResult('validKey');

      expect(Result.isOk(result)).toBe(true);
      expect(Result.unwrap(result)).toBe('validKey');
    });

    it('should return Err for empty key', () => {
      const result = Validator.storageKeyResult('');

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result).field).toBe('storageKey');
    });

    it('should accept key at max length', () => {
      const maxKey = 'a'.repeat(128);
      const result = Validator.storageKeyResult(maxKey);

      expect(Result.isOk(result)).toBe(true);
    });

    it('should return Err for key exceeding max length', () => {
      const longKey = 'a'.repeat(129);
      const result = Validator.storageKeyResult(longKey);

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result).constraint).toContain('128');
    });
  });

  // ===========================================================================
  // Storage Prefix Validation
  // ===========================================================================

  describe('storagePrefix', () => {
    it('should accept valid prefix', () => {
      expect(() => Validator.storagePrefix('myApp')).not.toThrow();
    });

    it('should accept prefix with underscore', () => {
      expect(() => Validator.storagePrefix('my_app')).not.toThrow();
    });

    it('should accept prefix with hyphen', () => {
      expect(() => Validator.storagePrefix('my-app')).not.toThrow();
    });

    it('should throw for empty prefix', () => {
      expect(() => Validator.storagePrefix('')).toThrow(ValidationError);
    });

    it('should throw for prefix starting with number', () => {
      expect(() => Validator.storagePrefix('1app')).toThrow(ValidationError);
    });

    it('should throw for prefix starting with underscore', () => {
      expect(() => Validator.storagePrefix('_app')).toThrow(ValidationError);
    });
  });

  describe('storagePrefixResult', () => {
    it('should return Ok for valid prefix', () => {
      const result = Validator.storagePrefixResult('myApp');

      expect(Result.isOk(result)).toBe(true);
      expect(Result.unwrap(result)).toBe('myApp');
    });

    it('should return Err for empty prefix', () => {
      const result = Validator.storagePrefixResult('');

      expect(Result.isErr(result)).toBe(true);
    });

    it('should accept prefix at max length', () => {
      const maxPrefix = 'a'.repeat(32);
      const result = Validator.storagePrefixResult(maxPrefix);

      expect(Result.isOk(result)).toBe(true);
    });

    it('should return Err for prefix exceeding max length', () => {
      const longPrefix = 'a'.repeat(33);
      const result = Validator.storagePrefixResult(longPrefix);

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result).constraint).toContain('32');
    });

    it('should return Err for prefix with forbidden chars', () => {
      const result = Validator.storagePrefixResult('app;test');

      expect(Result.isErr(result)).toBe(true);
    });

    it('should return Err for invalid format', () => {
      const result = Validator.storagePrefixResult('123');

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result).message).toContain('invalid format');
    });
  });

  // ===========================================================================
  // Filename Validation
  // ===========================================================================

  describe('filename', () => {
    it('should accept valid filename', () => {
      expect(() => Validator.filename('document.pdf')).not.toThrow();
    });

    it('should accept filename with spaces', () => {
      expect(() => Validator.filename('my document.pdf')).not.toThrow();
    });

    it('should throw for empty filename', () => {
      expect(() => Validator.filename('')).toThrow(ValidationError);
    });

    it('should throw for path traversal', () => {
      expect(() => Validator.filename('../etc/passwd')).toThrow(ValidationError);
    });

    it('should throw for backslash path traversal', () => {
      expect(() => Validator.filename('..\\Windows\\System32')).toThrow(ValidationError);
    });

    it('should throw for double dot only', () => {
      expect(() => Validator.filename('..')).toThrow(ValidationError);
    });

    it('should throw for reserved Windows name CON', () => {
      expect(() => Validator.filename('CON')).toThrow(ValidationError);
    });

    it('should throw for reserved Windows name NUL.txt', () => {
      expect(() => Validator.filename('NUL.txt')).toThrow(ValidationError);
    });

    it('should throw for reserved Windows name COM1', () => {
      expect(() => Validator.filename('COM1')).toThrow(ValidationError);
    });

    it('should throw for filename starting with dot', () => {
      expect(() => Validator.filename('.htaccess')).toThrow(ValidationError);
    });

    it('should throw for filename ending with dot', () => {
      expect(() => Validator.filename('file.')).toThrow(ValidationError);
    });

    it('should throw for filename starting with space', () => {
      expect(() => Validator.filename(' file.txt')).toThrow(ValidationError);
    });

    it('should throw for filename ending with space', () => {
      expect(() => Validator.filename('file.txt ')).toThrow(ValidationError);
    });
  });

  describe('filenameResult', () => {
    it('should return Ok for valid filename', () => {
      const result = Validator.filenameResult('report.csv');

      expect(Result.isOk(result)).toBe(true);
      expect(Result.unwrap(result)).toBe('report.csv');
    });

    it('should return Err for empty filename', () => {
      const result = Validator.filenameResult('');

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result).field).toBe('filename');
    });

    it('should return Err for filename exceeding max length', () => {
      const longFilename = 'a'.repeat(256);
      const result = Validator.filenameResult(longFilename);

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result).constraint).toContain('255');
    });

    it('should return Err for forbidden characters', () => {
      const result = Validator.filenameResult('file<name>.txt');

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result).message).toContain('forbidden characters');
    });

    it('should return Err for colon in filename', () => {
      const result = Validator.filenameResult('file:name.txt');

      expect(Result.isErr(result)).toBe(true);
    });

    it('should return Err for pipe in filename', () => {
      const result = Validator.filenameResult('file|name.txt');

      expect(Result.isErr(result)).toBe(true);
    });

    it('should return Err for question mark in filename', () => {
      const result = Validator.filenameResult('file?.txt');

      expect(Result.isErr(result)).toBe(true);
    });

    it('should return Err for asterisk in filename', () => {
      const result = Validator.filenameResult('file*.txt');

      expect(Result.isErr(result)).toBe(true);
    });

    it('should return Err for null byte in filename', () => {
      const result = Validator.filenameResult('file\x00.txt');

      expect(Result.isErr(result)).toBe(true);
    });

    it('should return Err for path traversal in middle', () => {
      // Note: slash is forbidden, so that validation triggers first
      const result = Validator.filenameResult('path/../file.txt');

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result).message).toContain('forbidden characters');
    });
  });

  // ===========================================================================
  // Sanitize Filename
  // ===========================================================================

  describe('sanitizeFilename', () => {
    it('should return default for empty filename', () => {
      expect(Validator.sanitizeFilename('')).toBe('download');
    });

    it('should preserve valid filename', () => {
      expect(Validator.sanitizeFilename('valid-file.txt')).toBe('valid-file.txt');
    });

    it('should replace forbidden characters', () => {
      expect(Validator.sanitizeFilename('file<name>.txt')).toBe('file_name_.txt');
    });

    it('should replace path traversal', () => {
      // '..' replaced and leading dot trimmed
      expect(Validator.sanitizeFilename('../file.txt')).toBe('__file.txt');
    });

    it('should remove leading dots', () => {
      expect(Validator.sanitizeFilename('.hidden')).toBe('hidden');
    });

    it('should remove trailing dots', () => {
      expect(Validator.sanitizeFilename('file.')).toBe('file');
    });

    it('should remove leading spaces', () => {
      expect(Validator.sanitizeFilename('  file.txt')).toBe('file.txt');
    });

    it('should remove trailing spaces', () => {
      expect(Validator.sanitizeFilename('file.txt  ')).toBe('file.txt');
    });

    it('should prefix reserved Windows names', () => {
      expect(Validator.sanitizeFilename('CON')).toBe('_CON');
    });

    it('should prefix reserved Windows names with extension', () => {
      expect(Validator.sanitizeFilename('NUL.txt')).toBe('_NUL.txt');
    });

    it('should use custom replacement character', () => {
      expect(Validator.sanitizeFilename('file<name>.txt', '-')).toBe('file-name-.txt');
    });

    it('should return download if sanitization results in empty', () => {
      expect(Validator.sanitizeFilename('   ')).toBe('download');
    });

    it('should truncate filename exceeding max length', () => {
      const longName = 'a'.repeat(300);
      const result = Validator.sanitizeFilename(longName);

      expect(result.length).toBeLessThanOrEqual(255);
    });

    it('should preserve extension when truncating', () => {
      const longName = 'a'.repeat(260) + '.txt';
      const result = Validator.sanitizeFilename(longName);

      expect(result.length).toBeLessThanOrEqual(255);
      expect(result).toMatch(/\.txt$/);
    });

    it('should handle multiple dots when preserving extension', () => {
      const longName = 'a'.repeat(260) + '.tar.gz';
      const result = Validator.sanitizeFilename(longName);

      expect(result.length).toBeLessThanOrEqual(255);
    });
  });

  // ===========================================================================
  // MIME Type Validation
  // ===========================================================================

  describe('mimeType', () => {
    it('should accept valid MIME type', () => {
      expect(() => Validator.mimeType('text/plain')).not.toThrow();
    });

    it('should accept MIME type with parameters', () => {
      expect(() => Validator.mimeType('text/html; charset=utf-8')).not.toThrow();
    });

    it('should accept complex MIME types', () => {
      expect(() => Validator.mimeType('application/vnd.ms-excel')).not.toThrow();
    });

    it('should throw for empty MIME type', () => {
      expect(() => Validator.mimeType('')).toThrow(ValidationError);
    });

    it('should throw for invalid format', () => {
      expect(() => Validator.mimeType('invalid')).toThrow(ValidationError);
    });
  });

  describe('mimeTypeResult', () => {
    it('should return Ok for valid MIME type', () => {
      const result = Validator.mimeTypeResult('application/json');

      expect(Result.isOk(result)).toBe(true);
      expect(Result.unwrap(result)).toBe('application/json');
    });

    it('should return Err for empty MIME type', () => {
      const result = Validator.mimeTypeResult('');

      expect(Result.isErr(result)).toBe(true);
    });

    it('should return Err for MIME type exceeding max length', () => {
      const longMime = 'text/' + 'a'.repeat(130);
      const result = Validator.mimeTypeResult(longMime);

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result).constraint).toContain('127');
    });

    it('should return Err for missing slash', () => {
      const result = Validator.mimeTypeResult('textplain');

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result).message).toContain('invalid format');
    });

    it('should return Err for double slash', () => {
      const result = Validator.mimeTypeResult('text//plain');

      expect(Result.isErr(result)).toBe(true);
    });

    it('should accept application/octet-stream', () => {
      const result = Validator.mimeTypeResult('application/octet-stream');

      expect(Result.isOk(result)).toBe(true);
    });

    it('should accept application/x-www-form-urlencoded', () => {
      const result = Validator.mimeTypeResult('application/x-www-form-urlencoded');

      expect(Result.isOk(result)).toBe(true);
    });
  });

  // ===========================================================================
  // Number Range Validation
  // ===========================================================================

  describe('numberInRange', () => {
    it('should accept number within range', () => {
      expect(() => Validator.numberInRange('count', 5, 1, 10)).not.toThrow();
    });

    it('should accept number at min boundary', () => {
      expect(() => Validator.numberInRange('count', 1, 1, 10)).not.toThrow();
    });

    it('should accept number at max boundary', () => {
      expect(() => Validator.numberInRange('count', 10, 1, 10)).not.toThrow();
    });

    it('should throw for number below min', () => {
      expect(() => Validator.numberInRange('count', 0, 1, 10)).toThrow(ValidationError);
    });

    it('should throw for number above max', () => {
      expect(() => Validator.numberInRange('count', 11, 1, 10)).toThrow(ValidationError);
    });
  });

  describe('numberInRangeResult', () => {
    it('should return Ok for number within range', () => {
      const result = Validator.numberInRangeResult('count', 50, 0, 100);

      expect(Result.isOk(result)).toBe(true);
      expect(Result.unwrap(result)).toBe(50);
    });

    it('should return Err for number below min', () => {
      const result = Validator.numberInRangeResult('count', -1, 0, 100);

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result).message).toContain('between');
    });

    it('should return Err for number above max', () => {
      const result = Validator.numberInRangeResult('count', 101, 0, 100);

      expect(Result.isErr(result)).toBe(true);
    });

    it('should include field name in error', () => {
      const result = Validator.numberInRangeResult('maxEntries', 0, 1, 1000);

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result).field).toBe('maxEntries');
    });
  });

  // ===========================================================================
  // Positive Integer Validation
  // ===========================================================================

  describe('positiveIntegerResult', () => {
    it('should return Ok for positive integer', () => {
      const result = Validator.positiveIntegerResult('count', 5);

      expect(Result.isOk(result)).toBe(true);
      expect(Result.unwrap(result)).toBe(5);
    });

    it('should return Ok for 1', () => {
      const result = Validator.positiveIntegerResult('count', 1);

      expect(Result.isOk(result)).toBe(true);
    });

    it('should return Err for 0', () => {
      const result = Validator.positiveIntegerResult('count', 0);

      expect(Result.isErr(result)).toBe(true);
    });

    it('should return Err for negative number', () => {
      const result = Validator.positiveIntegerResult('count', -5);

      expect(Result.isErr(result)).toBe(true);
    });

    it('should return Err for float', () => {
      const result = Validator.positiveIntegerResult('count', 5.5);

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result).message).toContain('invalid format');
    });

    it('should include field name in error', () => {
      const result = Validator.positiveIntegerResult('quantity', 0);

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result).field).toBe('quantity');
    });
  });

  // ===========================================================================
  // Non-Empty Validation
  // ===========================================================================

  describe('nonEmpty', () => {
    it('should accept non-empty string', () => {
      expect(() => Validator.nonEmpty('field', 'value')).not.toThrow();
    });

    it('should throw for empty string', () => {
      expect(() => Validator.nonEmpty('name', '')).toThrow(ValidationError);
    });

    it('should include field name in error', () => {
      try {
        Validator.nonEmpty('username', '');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).field).toBe('username');
      }
    });
  });

  describe('nonEmptyResult', () => {
    it('should return Ok for non-empty string', () => {
      const result = Validator.nonEmptyResult('field', 'value');

      expect(Result.isOk(result)).toBe(true);
      expect(Result.unwrap(result)).toBe('value');
    });

    it('should return Err for empty string', () => {
      const result = Validator.nonEmptyResult('name', '');

      expect(Result.isErr(result)).toBe(true);
    });

    it('should include field name in error', () => {
      const result = Validator.nonEmptyResult('email', '');

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result).field).toBe('email');
    });
  });

  // ===========================================================================
  // Clipboard Text Validation
  // ===========================================================================

  describe('clipboardText', () => {
    it('should accept text within limits', () => {
      expect(() => Validator.clipboardText('hello world')).not.toThrow();
    });

    it('should throw for text exceeding max length', () => {
      const veryLongText = 'a'.repeat(10_000_001);

      expect(() => Validator.clipboardText(veryLongText)).toThrow(ValidationError);
    });
  });

  describe('clipboardTextResult', () => {
    it('should return Ok for valid text', () => {
      const result = Validator.clipboardTextResult('hello');

      expect(Result.isOk(result)).toBe(true);
      expect(Result.unwrap(result)).toBe('hello');
    });

    it('should return Err for text exceeding limit', () => {
      const veryLongText = 'a'.repeat(10_000_001);
      const result = Validator.clipboardTextResult(veryLongText);

      expect(Result.isErr(result)).toBe(true);
    });
  });
});
