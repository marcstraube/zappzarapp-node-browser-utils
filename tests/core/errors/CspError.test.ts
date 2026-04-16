import { describe, it, expect } from 'vitest';
import { CspError, BrowserUtilsError } from '../../../src/core/index.js';

describe('CspError', () => {
  describe('instanceof', () => {
    it('should be instanceof BrowserUtilsError', () => {
      const error = CspError.alreadyDestroyed();

      expect(error).toBeInstanceOf(BrowserUtilsError);
    });
  });

  describe('alreadyDestroyed', () => {
    it('should create error with correct message and code', () => {
      const error = CspError.alreadyDestroyed();

      expect(error.message).toBe('NonceManager has been destroyed and cannot be used');
      expect(error.code).toBe('CSP_ALREADY_DESTROYED');
    });
  });
});
