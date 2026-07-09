import { describe, it, expect } from 'vitest';
import { WakeLockError, BrowserUtilsError } from '../../../src/core/index.js';

describe('WakeLockError', () => {
  // ===========================================================================
  // instanceof Checks
  // ===========================================================================

  describe('instanceof', () => {
    it('should be instanceof BrowserUtilsError', () => {
      const error = WakeLockError.notSupported();

      expect(error).toBeInstanceOf(BrowserUtilsError);
    });

    it('should be instanceof WakeLockError', () => {
      const error = WakeLockError.notSupported();

      expect(error).toBeInstanceOf(WakeLockError);
    });

    it('should be instanceof Error', () => {
      const error = WakeLockError.notSupported();

      expect(error).toBeInstanceOf(Error);
    });
  });

  // ===========================================================================
  // Factory Methods
  // ===========================================================================

  describe('notSupported', () => {
    it('should create error with correct code', () => {
      const error = WakeLockError.notSupported();

      expect(error.code).toBe('WAKE_LOCK_NOT_SUPPORTED');
    });

    it('should create error with correct message', () => {
      const error = WakeLockError.notSupported();

      expect(error.message).toBe('Screen Wake Lock API is not supported');
    });

    it('should have name set to WakeLockError', () => {
      const error = WakeLockError.notSupported();

      expect(error.name).toBe('WakeLockError');
    });

    it('should not have a cause', () => {
      const error = WakeLockError.notSupported();

      expect(error.cause).toBeUndefined();
    });
  });

  describe('requestFailed', () => {
    it('should create error with correct code', () => {
      const error = WakeLockError.requestFailed();

      expect(error.code).toBe('WAKE_LOCK_REQUEST_FAILED');
    });

    it('should create error with correct message', () => {
      const error = WakeLockError.requestFailed();

      expect(error.message).toBe('Failed to acquire wake lock');
    });

    it('should store cause when provided', () => {
      const cause = new Error('NotAllowedError');
      const error = WakeLockError.requestFailed(cause);

      expect(error.cause).toBe(cause);
    });

    it('should handle undefined cause', () => {
      const error = WakeLockError.requestFailed(undefined);

      expect(error.cause).toBeUndefined();
    });

    it('should handle non-Error cause', () => {
      const error = WakeLockError.requestFailed('string error');

      expect(error.cause).toBe('string error');
    });
  });

  // ===========================================================================
  // Error Properties
  // ===========================================================================

  describe('Error Properties', () => {
    it('should format error message correctly', () => {
      const error = WakeLockError.notSupported();

      expect(error.toFormattedString()).toBe(
        '[WAKE_LOCK_NOT_SUPPORTED] Screen Wake Lock API is not supported'
      );
    });

    it('should format requestFailed with cause', () => {
      const cause = new Error('Permission denied');
      const error = WakeLockError.requestFailed(cause);

      expect(error.toFormattedString()).toBe(
        '[WAKE_LOCK_REQUEST_FAILED] Failed to acquire wake lock'
      );
      expect(error.cause).toBe(cause);
    });
  });

  // ===========================================================================
  // Stack Trace
  // ===========================================================================

  describe('Stack Trace', () => {
    it('should have a stack trace', () => {
      const error = WakeLockError.notSupported();

      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe('string');
    });

    it('should include error name in stack', () => {
      const error = WakeLockError.requestFailed();

      expect(error.stack).toContain('WakeLockError');
    });
  });
});
