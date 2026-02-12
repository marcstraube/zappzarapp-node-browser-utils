import { describe, it, expect } from 'vitest';
import { CookieError, BrowserUtilsError } from '../../../src/core/index.js';

describe('CookieError', () => {
  // ===========================================================================
  // instanceof checks
  // ===========================================================================

  describe('instanceof', () => {
    it('should be instanceof BrowserUtilsError', () => {
      const error = CookieError.disabled();

      expect(error).toBeInstanceOf(BrowserUtilsError);
    });

    it('should be instanceof CookieError', () => {
      const error = CookieError.disabled();

      expect(error).toBeInstanceOf(CookieError);
    });

    it('should be instanceof Error', () => {
      const error = CookieError.disabled();

      expect(error).toBeInstanceOf(Error);
    });
  });

  // ===========================================================================
  // Constructor
  // ===========================================================================

  describe('constructor', () => {
    it('should set code property', () => {
      const error = new CookieError('COOKIE_DISABLED', 'test message');

      expect(error.code).toBe('COOKIE_DISABLED');
    });

    it('should set message property', () => {
      const error = new CookieError('COOKIE_DISABLED', 'test message');

      expect(error.message).toBe('test message');
    });

    it('should set cookieName property when provided', () => {
      const error = new CookieError('COOKIE_NOT_FOUND', 'Cookie not found', 'session_id');

      expect(error.cookieName).toBe('session_id');
    });

    it('should set cause property when provided', () => {
      const cause = new Error('original error');
      const error = new CookieError('COOKIE_SET_FAILED', 'failed', 'test_cookie', cause);

      expect(error.cause).toBe(cause);
    });

    it('should set name to CookieError', () => {
      const error = new CookieError('COOKIE_DISABLED', 'test');

      expect(error.name).toBe('CookieError');
    });

    it('should work without optional parameters', () => {
      const error = new CookieError('COOKIE_DISABLED', 'test');

      expect(error.cookieName).toBeUndefined();
      expect(error.cause).toBeUndefined();
    });
  });

  // ===========================================================================
  // Factory: disabled
  // ===========================================================================

  describe('disabled', () => {
    it('should create error with correct code', () => {
      const error = CookieError.disabled();

      expect(error.code).toBe('COOKIE_DISABLED');
    });

    it('should have correct message', () => {
      const error = CookieError.disabled();

      expect(error.message).toBe('Cookies are disabled in this browser');
    });

    it('should have no cookieName', () => {
      const error = CookieError.disabled();

      expect(error.cookieName).toBeUndefined();
    });

    it('should have no cause', () => {
      const error = CookieError.disabled();

      expect(error.cause).toBeUndefined();
    });
  });

  // ===========================================================================
  // Factory: tooLarge
  // ===========================================================================

  describe('tooLarge', () => {
    it('should create error with correct code', () => {
      const error = CookieError.tooLarge('big_cookie', 5000);

      expect(error.code).toBe('COOKIE_TOO_LARGE');
    });

    it('should include cookie name in message', () => {
      const error = CookieError.tooLarge('session_data', 8192);

      expect(error.message).toBe('Cookie "session_data" exceeds maximum size (8192 bytes)');
    });

    it('should include size in message', () => {
      const error = CookieError.tooLarge('data', 4097);

      expect(error.message).toContain('4097 bytes');
    });

    it('should store cookieName property', () => {
      const error = CookieError.tooLarge('preferences', 5000);

      expect(error.cookieName).toBe('preferences');
    });

    it('should have no cause', () => {
      const error = CookieError.tooLarge('test', 1000);

      expect(error.cause).toBeUndefined();
    });

    it('should work with different sizes', () => {
      const error1 = CookieError.tooLarge('cookie1', 4096);
      const error2 = CookieError.tooLarge('cookie2', 10000);

      expect(error1.message).toContain('4096');
      expect(error2.message).toContain('10000');
    });
  });

  // ===========================================================================
  // Factory: setFailed
  // ===========================================================================

  describe('setFailed', () => {
    it('should create error with correct code', () => {
      const error = CookieError.setFailed('user_token');

      expect(error.code).toBe('COOKIE_SET_FAILED');
    });

    it('should include cookie name in message', () => {
      const error = CookieError.setFailed('session');

      expect(error.message).toBe('Failed to set cookie: session');
    });

    it('should store cookieName property', () => {
      const error = CookieError.setFailed('auth_token');

      expect(error.cookieName).toBe('auth_token');
    });

    it('should store cause when provided', () => {
      const cause = new Error('Permission denied');
      const error = CookieError.setFailed('test_cookie', cause);

      expect(error.cause).toBe(cause);
    });

    it('should accept non-Error cause', () => {
      const cause = 'string error';
      const error = CookieError.setFailed('test', cause);

      expect(error.cause).toBe(cause);
    });

    it('should work without cause', () => {
      const error = CookieError.setFailed('test');

      expect(error.cause).toBeUndefined();
    });
  });

  // ===========================================================================
  // Factory: notFound
  // ===========================================================================

  describe('notFound', () => {
    it('should create error with correct code', () => {
      const error = CookieError.notFound('missing_cookie');

      expect(error.code).toBe('COOKIE_NOT_FOUND');
    });

    it('should include cookie name in message', () => {
      const error = CookieError.notFound('session_id');

      expect(error.message).toBe('Cookie not found: session_id');
    });

    it('should store cookieName property', () => {
      const error = CookieError.notFound('user_pref');

      expect(error.cookieName).toBe('user_pref');
    });

    it('should have no cause', () => {
      const error = CookieError.notFound('test');

      expect(error.cause).toBeUndefined();
    });

    it('should work with different cookie names', () => {
      const names = ['session', 'auth', 'prefs', 'tracking_id'];

      for (const name of names) {
        const error = CookieError.notFound(name);
        expect(error.message).toContain(name);
        expect(error.cookieName).toBe(name);
      }
    });
  });

  // ===========================================================================
  // Error Code Types
  // ===========================================================================

  describe('Error Code Types', () => {
    it('should have all expected error codes', () => {
      const codes = [
        CookieError.disabled().code,
        CookieError.tooLarge('test', 1000).code,
        CookieError.setFailed('test').code,
        CookieError.notFound('test').code,
      ];

      expect(codes).toContain('COOKIE_DISABLED');
      expect(codes).toContain('COOKIE_TOO_LARGE');
      expect(codes).toContain('COOKIE_SET_FAILED');
      expect(codes).toContain('COOKIE_NOT_FOUND');
    });

    it('should allow programmatic error handling by code', () => {
      const error = CookieError.disabled();

      switch (error.code) {
        case 'COOKIE_DISABLED':
          expect(true).toBe(true);
          break;
        default:
          expect(true).toBe(false);
      }
    });

    it('should distinguish between different error types', () => {
      const disabled = CookieError.disabled();
      const tooLarge = CookieError.tooLarge('test', 1000);
      const setFailed = CookieError.setFailed('test');
      const notFound = CookieError.notFound('test');

      expect(disabled.code).not.toBe(tooLarge.code);
      expect(tooLarge.code).not.toBe(setFailed.code);
      expect(setFailed.code).not.toBe(notFound.code);
      expect(notFound.code).not.toBe(disabled.code);
    });
  });

  // ===========================================================================
  // Inherited Methods
  // ===========================================================================

  describe('Inherited Methods', () => {
    describe('toFormattedString', () => {
      it('should return formatted string with code and message', () => {
        const error = CookieError.disabled();

        expect(error.toFormattedString()).toBe(
          '[COOKIE_DISABLED] Cookies are disabled in this browser'
        );
      });

      it('should work for all error types', () => {
        const errors = [
          CookieError.disabled(),
          CookieError.tooLarge('test', 5000),
          CookieError.setFailed('test'),
          CookieError.notFound('test'),
        ];

        for (const error of errors) {
          const formatted = error.toFormattedString();
          expect(formatted).toContain('[');
          expect(formatted).toContain(']');
          expect(formatted).toContain(error.code);
        }
      });
    });

    it('should have proper stack trace', () => {
      const error = CookieError.disabled();

      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe('string');
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle empty cookie name', () => {
      const error = CookieError.notFound('');

      expect(error.message).toBe('Cookie not found: ');
      expect(error.cookieName).toBe('');
    });

    it('should handle cookie name with special characters', () => {
      const error = CookieError.notFound('cookie-with-dashes_and_underscores');

      expect(error.cookieName).toBe('cookie-with-dashes_and_underscores');
    });

    it('should handle zero size in tooLarge', () => {
      const error = CookieError.tooLarge('empty', 0);

      expect(error.message).toContain('0 bytes');
    });

    it('should handle large size in tooLarge', () => {
      const error = CookieError.tooLarge('huge', 1000000);

      expect(error.message).toContain('1000000');
    });

    it('should be throwable and catchable', () => {
      expect(() => {
        throw CookieError.disabled();
      }).toThrow(CookieError);
    });

    it('should be catchable by BrowserUtilsError type', () => {
      const error = CookieError.disabled();
      expect(error).toBeInstanceOf(BrowserUtilsError);
    });

    it('should be catchable by Error type', () => {
      expect(() => {
        throw CookieError.disabled();
      }).toThrow(Error);
    });
  });
});
