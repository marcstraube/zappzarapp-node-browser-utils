import { describe, it, expect } from 'vitest';
import { ClipboardError, BrowserUtilsError } from '../../../src/core/index.js';

describe('ClipboardError', () => {
  // ===========================================================================
  // instanceof checks
  // ===========================================================================

  describe('instanceof', () => {
    it('should be instanceof BrowserUtilsError', () => {
      const error = ClipboardError.notSupported('readText');

      expect(error).toBeInstanceOf(BrowserUtilsError);
    });

    it('should be instanceof ClipboardError', () => {
      const error = ClipboardError.notSupported('readText');

      expect(error).toBeInstanceOf(ClipboardError);
    });

    it('should be instanceof Error', () => {
      const error = ClipboardError.notSupported('readText');

      expect(error).toBeInstanceOf(Error);
    });
  });

  // ===========================================================================
  // Constructor
  // ===========================================================================

  describe('constructor', () => {
    it('should set code property', () => {
      const error = new ClipboardError('CLIPBOARD_NOT_SUPPORTED', 'test message');

      expect(error.code).toBe('CLIPBOARD_NOT_SUPPORTED');
    });

    it('should set message property', () => {
      const error = new ClipboardError('CLIPBOARD_NOT_SUPPORTED', 'test message');

      expect(error.message).toBe('test message');
    });

    it('should set cause property when provided', () => {
      const cause = new Error('original error');
      const error = new ClipboardError('CLIPBOARD_READ_FAILED', 'failed', cause);

      expect(error.cause).toBe(cause);
    });

    it('should set name to ClipboardError', () => {
      const error = new ClipboardError('CLIPBOARD_NOT_SUPPORTED', 'test');

      expect(error.name).toBe('ClipboardError');
    });
  });

  // ===========================================================================
  // Factory: notSupported
  // ===========================================================================

  describe('notSupported', () => {
    it('should create error with correct code', () => {
      const error = ClipboardError.notSupported('readText');

      expect(error.code).toBe('CLIPBOARD_NOT_SUPPORTED');
    });

    it('should include operation in message', () => {
      const error = ClipboardError.notSupported('writeText');

      expect(error.message).toBe('Clipboard API not supported for operation: writeText');
    });

    it('should work with different operation names', () => {
      const operations = ['read', 'write', 'readText', 'writeText'];

      for (const op of operations) {
        const error = ClipboardError.notSupported(op);
        expect(error.message).toContain(op);
      }
    });
  });

  // ===========================================================================
  // Factory: permissionDenied
  // ===========================================================================

  describe('permissionDenied', () => {
    it('should create error with correct code', () => {
      const error = ClipboardError.permissionDenied('read');

      expect(error.code).toBe('CLIPBOARD_PERMISSION_DENIED');
    });

    it('should include operation in message', () => {
      const error = ClipboardError.permissionDenied('readText');

      expect(error.message).toBe('Clipboard permission denied for operation: readText');
    });

    it('should work with different operation names', () => {
      const operations = ['read', 'write', 'readText', 'writeText'];

      for (const op of operations) {
        const error = ClipboardError.permissionDenied(op);
        expect(error.message).toContain(op);
      }
    });
  });

  // ===========================================================================
  // Factory: readFailed
  // ===========================================================================

  describe('readFailed', () => {
    it('should create error with correct code', () => {
      const error = ClipboardError.readFailed();

      expect(error.code).toBe('CLIPBOARD_READ_FAILED');
    });

    it('should have correct message', () => {
      const error = ClipboardError.readFailed();

      expect(error.message).toBe('Failed to read from clipboard');
    });

    it('should store cause when provided', () => {
      const cause = new Error('Network error');
      const error = ClipboardError.readFailed(cause);

      expect(error.cause).toBe(cause);
    });

    it('should accept non-Error cause', () => {
      const cause = 'string error';
      const error = ClipboardError.readFailed(cause);

      expect(error.cause).toBe(cause);
    });

    it('should work without cause', () => {
      const error = ClipboardError.readFailed();

      expect(error.cause).toBeUndefined();
    });
  });

  // ===========================================================================
  // Factory: writeFailed
  // ===========================================================================

  describe('writeFailed', () => {
    it('should create error with correct code', () => {
      const error = ClipboardError.writeFailed();

      expect(error.code).toBe('CLIPBOARD_WRITE_FAILED');
    });

    it('should have correct message', () => {
      const error = ClipboardError.writeFailed();

      expect(error.message).toBe('Failed to write to clipboard');
    });

    it('should store cause when provided', () => {
      const cause = new TypeError('Invalid data');
      const error = ClipboardError.writeFailed(cause);

      expect(error.cause).toBe(cause);
    });

    it('should accept non-Error cause', () => {
      const cause = { reason: 'unknown' };
      const error = ClipboardError.writeFailed(cause);

      expect(error.cause).toBe(cause);
    });

    it('should work without cause', () => {
      const error = ClipboardError.writeFailed();

      expect(error.cause).toBeUndefined();
    });
  });

  // ===========================================================================
  // Factory: empty
  // ===========================================================================

  describe('empty', () => {
    it('should create error with correct code', () => {
      const error = ClipboardError.empty();

      expect(error.code).toBe('CLIPBOARD_EMPTY');
    });

    it('should have correct message', () => {
      const error = ClipboardError.empty();

      expect(error.message).toBe('Clipboard is empty or has no readable content');
    });

    it('should have no cause', () => {
      const error = ClipboardError.empty();

      expect(error.cause).toBeUndefined();
    });
  });

  // ===========================================================================
  // Error Code Types
  // ===========================================================================

  describe('Error Code Types', () => {
    it('should have all expected error codes', () => {
      const codes = [
        ClipboardError.notSupported('op').code,
        ClipboardError.permissionDenied('op').code,
        ClipboardError.readFailed().code,
        ClipboardError.writeFailed().code,
        ClipboardError.empty().code,
      ];

      expect(codes).toContain('CLIPBOARD_NOT_SUPPORTED');
      expect(codes).toContain('CLIPBOARD_PERMISSION_DENIED');
      expect(codes).toContain('CLIPBOARD_READ_FAILED');
      expect(codes).toContain('CLIPBOARD_WRITE_FAILED');
      expect(codes).toContain('CLIPBOARD_EMPTY');
    });
  });

  // ===========================================================================
  // Inherited Methods
  // ===========================================================================

  describe('Inherited Methods', () => {
    describe('toFormattedString', () => {
      it('should return formatted string with code and message', () => {
        const error = ClipboardError.notSupported('read');

        expect(error.toFormattedString()).toBe(
          '[CLIPBOARD_NOT_SUPPORTED] Clipboard API not supported for operation: read'
        );
      });

      it('should work for all error types', () => {
        const errors = [
          ClipboardError.notSupported('read'),
          ClipboardError.permissionDenied('write'),
          ClipboardError.readFailed(),
          ClipboardError.writeFailed(),
          ClipboardError.empty(),
        ];

        for (const error of errors) {
          const formatted = error.toFormattedString();
          expect(formatted).toContain('[');
          expect(formatted).toContain(']');
          expect(formatted).toContain(error.code);
        }
      });
    });
  });
});
