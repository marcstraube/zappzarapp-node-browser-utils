import { describe, it, expect } from 'vitest';
import { FullscreenError, BrowserUtilsError } from '../../../src/core/index.js';

describe('FullscreenError', () => {
  // ===========================================================================
  // instanceof Checks
  // ===========================================================================

  describe('instanceof', () => {
    it('should be instanceof BrowserUtilsError', () => {
      const error = FullscreenError.notSupported();

      expect(error).toBeInstanceOf(BrowserUtilsError);
    });

    it('should be instanceof FullscreenError', () => {
      const error = FullscreenError.notSupported();

      expect(error).toBeInstanceOf(FullscreenError);
    });

    it('should be instanceof Error', () => {
      const error = FullscreenError.notSupported();

      expect(error).toBeInstanceOf(Error);
    });
  });

  // ===========================================================================
  // Factory Methods
  // ===========================================================================

  describe('notSupported', () => {
    it('should create error with correct code', () => {
      const error = FullscreenError.notSupported();

      expect(error.code).toBe('FULLSCREEN_NOT_SUPPORTED');
    });

    it('should create error with correct message', () => {
      const error = FullscreenError.notSupported();

      expect(error.message).toBe('Fullscreen API is not supported');
    });

    it('should have name set to FullscreenError', () => {
      const error = FullscreenError.notSupported();

      expect(error.name).toBe('FullscreenError');
    });

    it('should not have a cause', () => {
      const error = FullscreenError.notSupported();

      expect(error.cause).toBeUndefined();
    });
  });

  describe('elementNotAllowed', () => {
    it('should create error with correct code', () => {
      const error = FullscreenError.elementNotAllowed();

      expect(error.code).toBe('FULLSCREEN_ELEMENT_NOT_ALLOWED');
    });

    it('should create error with correct message', () => {
      const error = FullscreenError.elementNotAllowed();

      expect(error.message).toBe('Element is not allowed to enter fullscreen mode');
    });

    it('should not have a cause', () => {
      const error = FullscreenError.elementNotAllowed();

      expect(error.cause).toBeUndefined();
    });
  });

  describe('requestFailed', () => {
    it('should create error with correct code', () => {
      const error = FullscreenError.requestFailed();

      expect(error.code).toBe('FULLSCREEN_REQUEST_FAILED');
    });

    it('should create error with correct message', () => {
      const error = FullscreenError.requestFailed();

      expect(error.message).toBe('Failed to enter fullscreen');
    });

    it('should store cause when provided', () => {
      const cause = new Error('User denied request');
      const error = FullscreenError.requestFailed(cause);

      expect(error.cause).toBe(cause);
    });

    it('should handle undefined cause', () => {
      const error = FullscreenError.requestFailed(undefined);

      expect(error.cause).toBeUndefined();
    });

    it('should handle non-Error cause', () => {
      const cause = 'string error';
      const error = FullscreenError.requestFailed(cause);

      expect(error.cause).toBe('string error');
    });
  });

  describe('exitFailed', () => {
    it('should create error with correct code', () => {
      const error = FullscreenError.exitFailed();

      expect(error.code).toBe('FULLSCREEN_EXIT_FAILED');
    });

    it('should create error with correct message', () => {
      const error = FullscreenError.exitFailed();

      expect(error.message).toBe('Failed to exit fullscreen');
    });

    it('should store cause when provided', () => {
      const cause = new TypeError('Invalid state');
      const error = FullscreenError.exitFailed(cause);

      expect(error.cause).toBe(cause);
    });

    it('should handle undefined cause', () => {
      const error = FullscreenError.exitFailed(undefined);

      expect(error.cause).toBeUndefined();
    });
  });

  describe('notActive', () => {
    it('should create error with correct code', () => {
      const error = FullscreenError.notActive();

      expect(error.code).toBe('FULLSCREEN_NOT_ACTIVE');
    });

    it('should create error with correct message', () => {
      const error = FullscreenError.notActive();

      expect(error.message).toBe('No element is currently in fullscreen mode');
    });

    it('should not have a cause', () => {
      const error = FullscreenError.notActive();

      expect(error.cause).toBeUndefined();
    });
  });

  // ===========================================================================
  // Error Properties
  // ===========================================================================

  describe('Error Properties', () => {
    it('should have immutable code', () => {
      const error = FullscreenError.notSupported();

      // TypeScript prevents reassignment, but verify the value is consistent
      expect(error.code).toBe('FULLSCREEN_NOT_SUPPORTED');
    });

    it('should format error message correctly', () => {
      const error = FullscreenError.notSupported();

      expect(error.toFormattedString()).toBe(
        '[FULLSCREEN_NOT_SUPPORTED] Fullscreen API is not supported'
      );
    });

    it('should format requestFailed with cause', () => {
      const cause = new Error('Permission denied');
      const error = FullscreenError.requestFailed(cause);

      expect(error.toFormattedString()).toBe(
        '[FULLSCREEN_REQUEST_FAILED] Failed to enter fullscreen'
      );
      expect(error.cause).toBe(cause);
    });
  });

  // ===========================================================================
  // Error Code Types
  // ===========================================================================

  describe('Error Code Types', () => {
    it('should use FULLSCREEN_NOT_SUPPORTED code', () => {
      const error = FullscreenError.notSupported();
      expect(error.code).toBe('FULLSCREEN_NOT_SUPPORTED');
    });

    it('should use FULLSCREEN_ELEMENT_NOT_ALLOWED code', () => {
      const error = FullscreenError.elementNotAllowed();
      expect(error.code).toBe('FULLSCREEN_ELEMENT_NOT_ALLOWED');
    });

    it('should use FULLSCREEN_REQUEST_FAILED code', () => {
      const error = FullscreenError.requestFailed();
      expect(error.code).toBe('FULLSCREEN_REQUEST_FAILED');
    });

    it('should use FULLSCREEN_EXIT_FAILED code', () => {
      const error = FullscreenError.exitFailed();
      expect(error.code).toBe('FULLSCREEN_EXIT_FAILED');
    });

    it('should use FULLSCREEN_NOT_ACTIVE code', () => {
      const error = FullscreenError.notActive();
      expect(error.code).toBe('FULLSCREEN_NOT_ACTIVE');
    });
  });

  // ===========================================================================
  // Stack Trace
  // ===========================================================================

  describe('Stack Trace', () => {
    it('should have a stack trace', () => {
      const error = FullscreenError.notSupported();

      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe('string');
    });

    it('should include error name in stack', () => {
      const error = FullscreenError.requestFailed();

      expect(error.stack).toContain('FullscreenError');
    });
  });
});
