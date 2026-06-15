import { describe, it, expect } from 'vitest';
import { IntlError, BrowserUtilsError } from '../../../src/core/index.js';

describe('IntlError', () => {
  describe('instanceof', () => {
    it('should be instanceof BrowserUtilsError', () => {
      expect(IntlError.invalidLocale()).toBeInstanceOf(BrowserUtilsError);
    });

    it('should be instanceof IntlError', () => {
      expect(IntlError.invalidLocale()).toBeInstanceOf(IntlError);
    });

    it('should be instanceof Error', () => {
      expect(IntlError.invalidLocale()).toBeInstanceOf(Error);
    });
  });

  describe('constructor', () => {
    it('should set code, message, and name', () => {
      const error = new IntlError('INTL_INVALID_LOCALE', 'test message');
      expect(error.code).toBe('INTL_INVALID_LOCALE');
      expect(error.message).toBe('test message');
      expect(error.name).toBe('IntlError');
    });

    it('should set cause when provided', () => {
      const cause = new RangeError('original');
      const error = new IntlError('INTL_INVALID_OPTIONS', 'failed', cause);
      expect(error.cause).toBe(cause);
    });

    it('should leave cause undefined when omitted', () => {
      expect(new IntlError('INTL_INVALID_OPTIONS', 'x').cause).toBeUndefined();
    });
  });

  describe('invalidLocale', () => {
    it('should set code to INTL_INVALID_LOCALE with a fixed message', () => {
      const error = IntlError.invalidLocale();
      expect(error.code).toBe('INTL_INVALID_LOCALE');
      expect(error.message).toBe('Invalid or unsupported locale');
    });

    it('should preserve the cause', () => {
      const cause = new RangeError('bad tag');
      expect(IntlError.invalidLocale(cause).cause).toBe(cause);
    });
  });

  describe('invalidOptions', () => {
    it('should set code to INTL_INVALID_OPTIONS with a fixed message', () => {
      const error = IntlError.invalidOptions();
      expect(error.code).toBe('INTL_INVALID_OPTIONS');
      expect(error.message).toBe('Invalid format options');
    });
  });

  describe('toFormattedString', () => {
    it('should prefix the message with the code', () => {
      expect(IntlError.invalidLocale().toFormattedString()).toBe(
        '[INTL_INVALID_LOCALE] Invalid or unsupported locale'
      );
    });
  });
});
