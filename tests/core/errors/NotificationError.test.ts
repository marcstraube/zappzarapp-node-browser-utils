import { describe, it, expect } from 'vitest';
import { NotificationError, BrowserUtilsError } from '../../../src/core/index.js';

describe('NotificationError', () => {
  // ===========================================================================
  // instanceof checks
  // ===========================================================================

  describe('instanceof', () => {
    it('should be instanceof BrowserUtilsError', () => {
      const error = NotificationError.notSupported();

      expect(error).toBeInstanceOf(BrowserUtilsError);
    });

    it('should be instanceof NotificationError', () => {
      const error = NotificationError.notSupported();

      expect(error).toBeInstanceOf(NotificationError);
    });

    it('should be instanceof Error', () => {
      const error = NotificationError.notSupported();

      expect(error).toBeInstanceOf(Error);
    });
  });

  // ===========================================================================
  // Constructor
  // ===========================================================================

  describe('constructor', () => {
    it('should set code property', () => {
      const error = new NotificationError('NOTIFICATION_NOT_SUPPORTED', 'test message');

      expect(error.code).toBe('NOTIFICATION_NOT_SUPPORTED');
    });

    it('should set message property', () => {
      const error = new NotificationError('NOTIFICATION_NOT_SUPPORTED', 'test message');

      expect(error.message).toBe('test message');
    });

    it('should set cause property when provided', () => {
      const cause = new Error('original error');
      const error = new NotificationError('NOTIFICATION_SHOW_FAILED', 'failed', cause);

      expect(error.cause).toBe(cause);
    });

    it('should set name to NotificationError', () => {
      const error = new NotificationError('NOTIFICATION_NOT_SUPPORTED', 'test');

      expect(error.name).toBe('NotificationError');
    });
  });

  // ===========================================================================
  // Factory: notSupported
  // ===========================================================================

  describe('notSupported', () => {
    it('should create error with correct code', () => {
      const error = NotificationError.notSupported();

      expect(error.code).toBe('NOTIFICATION_NOT_SUPPORTED');
    });

    it('should have correct message', () => {
      const error = NotificationError.notSupported();

      expect(error.message).toBe('Notification API is not supported in this browser');
    });

    it('should have no cause', () => {
      const error = NotificationError.notSupported();

      expect(error.cause).toBeUndefined();
    });
  });

  // ===========================================================================
  // Factory: permissionDenied
  // ===========================================================================

  describe('permissionDenied', () => {
    it('should create error with correct code', () => {
      const error = NotificationError.permissionDenied();

      expect(error.code).toBe('NOTIFICATION_PERMISSION_DENIED');
    });

    it('should have correct message', () => {
      const error = NotificationError.permissionDenied();

      expect(error.message).toBe('Notification permission was denied');
    });

    it('should have no cause', () => {
      const error = NotificationError.permissionDenied();

      expect(error.cause).toBeUndefined();
    });
  });

  // ===========================================================================
  // Factory: permissionDefault
  // ===========================================================================

  describe('permissionDefault', () => {
    it('should create error with correct code', () => {
      const error = NotificationError.permissionDefault();

      expect(error.code).toBe('NOTIFICATION_PERMISSION_DEFAULT');
    });

    it('should have correct message', () => {
      const error = NotificationError.permissionDefault();

      expect(error.message).toBe('Notification permission not yet requested');
    });

    it('should have no cause', () => {
      const error = NotificationError.permissionDefault();

      expect(error.cause).toBeUndefined();
    });
  });

  // ===========================================================================
  // Factory: showFailed
  // ===========================================================================

  describe('showFailed', () => {
    it('should create error with correct code', () => {
      const error = NotificationError.showFailed();

      expect(error.code).toBe('NOTIFICATION_SHOW_FAILED');
    });

    it('should have correct message', () => {
      const error = NotificationError.showFailed();

      expect(error.message).toBe('Failed to show notification');
    });

    it('should store cause when provided', () => {
      const cause = new Error('Network error');
      const error = NotificationError.showFailed(cause);

      expect(error.cause).toBe(cause);
    });

    it('should accept non-Error cause', () => {
      const cause = 'string error';
      const error = NotificationError.showFailed(cause);

      expect(error.cause).toBe(cause);
    });

    it('should work without cause', () => {
      const error = NotificationError.showFailed();

      expect(error.cause).toBeUndefined();
    });
  });

  // ===========================================================================
  // Error Code Types
  // ===========================================================================

  describe('Error Code Types', () => {
    it('should have all expected error codes', () => {
      const codes = [
        NotificationError.notSupported().code,
        NotificationError.permissionDenied().code,
        NotificationError.permissionDefault().code,
        NotificationError.showFailed().code,
      ];

      expect(codes).toContain('NOTIFICATION_NOT_SUPPORTED');
      expect(codes).toContain('NOTIFICATION_PERMISSION_DENIED');
      expect(codes).toContain('NOTIFICATION_PERMISSION_DEFAULT');
      expect(codes).toContain('NOTIFICATION_SHOW_FAILED');
    });
  });

  // ===========================================================================
  // Inherited Methods
  // ===========================================================================

  describe('Inherited Methods', () => {
    describe('toFormattedString', () => {
      it('should return formatted string with code and message', () => {
        const error = NotificationError.notSupported();

        expect(error.toFormattedString()).toBe(
          '[NOTIFICATION_NOT_SUPPORTED] Notification API is not supported in this browser'
        );
      });

      it('should work for all error types', () => {
        const errors = [
          NotificationError.notSupported(),
          NotificationError.permissionDenied(),
          NotificationError.permissionDefault(),
          NotificationError.showFailed(),
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
