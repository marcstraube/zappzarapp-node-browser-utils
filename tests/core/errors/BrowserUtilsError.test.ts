import { describe, it, expect } from 'vitest';
import { BrowserUtilsError } from '../../../src/core/index.js';

// Concrete implementation for testing abstract class
class TestError extends BrowserUtilsError {
  readonly code = 'TEST_ERROR';
}

describe('BrowserUtilsError', () => {
  describe('constructor', () => {
    it('should set message', () => {
      const error = new TestError('Test message');

      expect(error.message).toBe('Test message');
    });

    it('should set name to class name', () => {
      const error = new TestError('Test message');

      expect(error.name).toBe('TestError');
    });

    it('should store cause', () => {
      const cause = new Error('Original error');
      const error = new TestError('Wrapped error', cause);

      expect(error.cause).toBe(cause);
    });

    it('should allow undefined cause', () => {
      const error = new TestError('No cause');

      expect(error.cause).toBeUndefined();
    });
  });

  describe('instanceof', () => {
    it('should be instanceof Error', () => {
      const error = new TestError('Test');

      expect(error).toBeInstanceOf(Error);
    });

    it('should be instanceof BrowserUtilsError', () => {
      const error = new TestError('Test');

      expect(error).toBeInstanceOf(BrowserUtilsError);
    });

    it('should be instanceof TestError', () => {
      const error = new TestError('Test');

      expect(error).toBeInstanceOf(TestError);
    });
  });

  describe('toFormattedString', () => {
    it('should format with code and message', () => {
      const error = new TestError('Something went wrong');

      expect(error.toFormattedString()).toBe('[TEST_ERROR] Something went wrong');
    });
  });
});
