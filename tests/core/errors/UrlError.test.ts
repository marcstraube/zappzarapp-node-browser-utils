import { describe, it, expect } from 'vitest';
import { UrlError, BrowserUtilsError } from '../../../src/core/index.js';

describe('UrlError', () => {
  // ===========================================================================
  // Class Structure
  // ===========================================================================

  describe('Class Structure', () => {
    it('should extend BrowserUtilsError', () => {
      const error = UrlError.invalidFormat('https://example.com');

      expect(error).toBeInstanceOf(BrowserUtilsError);
      expect(error).toBeInstanceOf(Error);
    });

    it('should have correct name property', () => {
      const error = UrlError.invalidFormat('test');

      expect(error.name).toBe('UrlError');
    });

    it('should have proper prototype chain for instanceof checks', () => {
      const error = UrlError.invalidFormat('test');

      expect(error).toBeInstanceOf(UrlError);
      expect(error).toBeInstanceOf(BrowserUtilsError);
      expect(error).toBeInstanceOf(Error);
    });
  });

  // ===========================================================================
  // Factory Methods
  // ===========================================================================

  describe('invalidFormat', () => {
    it('should create error with URL_INVALID_FORMAT code', () => {
      const error = UrlError.invalidFormat('not-a-url');

      expect(error.code).toBe('URL_INVALID_FORMAT');
    });

    it('should have descriptive message without exposing URL', () => {
      const maliciousUrl = 'javascript:alert("xss")';
      const error = UrlError.invalidFormat(maliciousUrl);

      expect(error.message).toBe('Invalid URL format');
      // Security: URL should not be included in message
      expect(error.message).not.toContain('javascript');
      expect(error.message).not.toContain('xss');
    });

    it('should not store the URL in the error object', () => {
      const error = UrlError.invalidFormat('invalid-url');

      expect(error.url).toBeUndefined();
    });
  });

  describe('dangerousProtocol', () => {
    it('should create error with URL_DANGEROUS_PROTOCOL code', () => {
      const error = UrlError.dangerousProtocol('javascript:');

      expect(error.code).toBe('URL_DANGEROUS_PROTOCOL');
    });

    it('should include protocol in message', () => {
      const error = UrlError.dangerousProtocol('javascript:');

      expect(error.message).toBe('Dangerous protocol not allowed: javascript:');
    });

    it('should work with data: protocol', () => {
      const error = UrlError.dangerousProtocol('data:');

      expect(error.message).toContain('data:');
    });

    it('should work with vbscript: protocol', () => {
      const error = UrlError.dangerousProtocol('vbscript:');

      expect(error.message).toContain('vbscript:');
    });

    it('should not store URL in error object', () => {
      const error = UrlError.dangerousProtocol('javascript:');

      expect(error.url).toBeUndefined();
    });
  });

  describe('invalidState', () => {
    it('should create error with URL_INVALID_STATE code', () => {
      const error = UrlError.invalidState('circular reference');

      expect(error.code).toBe('URL_INVALID_STATE');
    });

    it('should include reason in message', () => {
      const error = UrlError.invalidState('circular reference detected');

      expect(error.message).toBe('Invalid history state: circular reference detected');
    });

    it('should work with different reasons', () => {
      const error1 = UrlError.invalidState('not serializable');
      const error2 = UrlError.invalidState('contains functions');

      expect(error1.message).toContain('not serializable');
      expect(error2.message).toContain('contains functions');
    });
  });

  describe('navigationFailed', () => {
    it('should create error with URL_NAVIGATION_FAILED code', () => {
      const error = UrlError.navigationFailed();

      expect(error.code).toBe('URL_NAVIGATION_FAILED');
    });

    it('should have descriptive message', () => {
      const error = UrlError.navigationFailed();

      expect(error.message).toBe('Navigation failed');
    });

    it('should store cause when provided', () => {
      const cause = new Error('Network error');
      const error = UrlError.navigationFailed(cause);

      expect(error.cause).toBe(cause);
    });

    it('should work without cause', () => {
      const error = UrlError.navigationFailed();

      expect(error.cause).toBeUndefined();
    });

    it('should accept non-Error cause', () => {
      const cause = { type: 'network', status: 500 };
      const error = UrlError.navigationFailed(cause);

      expect(error.cause).toBe(cause);
    });
  });

  // ===========================================================================
  // Error Properties
  // ===========================================================================

  describe('Error Properties', () => {
    it('should have code property of correct type', () => {
      const error = UrlError.invalidFormat('test');

      // Verify code is the expected type (UrlErrorCode)
      expect(error.code).toBe('URL_INVALID_FORMAT');
      expect(typeof error.code).toBe('string');

      // Note: TypeScript's 'readonly' is compile-time only and doesn't
      // provide runtime immutability. Use TypeScript's type checking
      // to prevent accidental modifications at compile time.
    });

    it('should support toFormattedString from base class', () => {
      const error = UrlError.invalidFormat('test');

      const formatted = error.toFormattedString();

      expect(formatted).toBe('[URL_INVALID_FORMAT] Invalid URL format');
    });

    it('should have proper stack trace', () => {
      const error = UrlError.invalidFormat('test');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('UrlError');
    });
  });

  // ===========================================================================
  // Error Code Types
  // ===========================================================================

  describe('Error Code Types', () => {
    it('should use URL_INVALID_FORMAT for format errors', () => {
      const error = UrlError.invalidFormat(':::');

      expect(error.code).toBe('URL_INVALID_FORMAT');
    });

    it('should use URL_DANGEROUS_PROTOCOL for protocol errors', () => {
      const error = UrlError.dangerousProtocol('javascript:');

      expect(error.code).toBe('URL_DANGEROUS_PROTOCOL');
    });

    it('should use URL_INVALID_STATE for state errors', () => {
      const error = UrlError.invalidState('reason');

      expect(error.code).toBe('URL_INVALID_STATE');
    });

    it('should use URL_NAVIGATION_FAILED for navigation errors', () => {
      const error = UrlError.navigationFailed();

      expect(error.code).toBe('URL_NAVIGATION_FAILED');
    });
  });

  // ===========================================================================
  // Constructor
  // ===========================================================================

  describe('Constructor', () => {
    it('should accept all parameters', () => {
      const cause = new Error('original');
      const error = new UrlError('URL_INVALID_FORMAT', 'Test message', 'https://test.com', cause);

      expect(error.code).toBe('URL_INVALID_FORMAT');
      expect(error.message).toBe('Test message');
      expect(error.url).toBe('https://test.com');
      expect(error.cause).toBe(cause);
    });

    it('should work without optional parameters', () => {
      const error = new UrlError('URL_NAVIGATION_FAILED', 'Test message');

      expect(error.url).toBeUndefined();
      expect(error.cause).toBeUndefined();
    });

    it('should work with only url parameter', () => {
      const error = new UrlError('URL_INVALID_FORMAT', 'Test', 'https://example.com');

      expect(error.url).toBe('https://example.com');
      expect(error.cause).toBeUndefined();
    });
  });
});
