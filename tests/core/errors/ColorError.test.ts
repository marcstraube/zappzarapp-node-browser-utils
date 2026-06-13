import { describe, it, expect } from 'vitest';
import { ColorError, BrowserUtilsError } from '../../../src/core/index.js';

describe('ColorError', () => {
  // ===========================================================================
  // instanceof checks
  // ===========================================================================

  describe('instanceof', () => {
    it('should be instanceof BrowserUtilsError', () => {
      expect(ColorError.invalidFormat()).toBeInstanceOf(BrowserUtilsError);
    });

    it('should be instanceof ColorError', () => {
      expect(ColorError.invalidFormat()).toBeInstanceOf(ColorError);
    });

    it('should be instanceof Error', () => {
      expect(ColorError.invalidFormat()).toBeInstanceOf(Error);
    });
  });

  // ===========================================================================
  // Constructor
  // ===========================================================================

  describe('constructor', () => {
    it('should set code property', () => {
      const error = new ColorError('COLOR_INVALID_FORMAT', 'test message');

      expect(error.code).toBe('COLOR_INVALID_FORMAT');
    });

    it('should set message property', () => {
      const error = new ColorError('COLOR_INVALID_FORMAT', 'test message');

      expect(error.message).toBe('test message');
    });

    it('should set name to ColorError', () => {
      const error = new ColorError('COLOR_INVALID_FORMAT', 'test');

      expect(error.name).toBe('ColorError');
    });

    it('should set cause property when provided', () => {
      const cause = new Error('original error');
      const error = new ColorError('COLOR_INVALID_FORMAT', 'failed', cause);

      expect(error.cause).toBe(cause);
    });

    it('should leave cause undefined when omitted', () => {
      const error = new ColorError('COLOR_INVALID_FORMAT', 'test');

      expect(error.cause).toBeUndefined();
    });
  });

  // ===========================================================================
  // Factory: invalidFormat
  // ===========================================================================

  describe('invalidFormat', () => {
    it('should set code to COLOR_INVALID_FORMAT', () => {
      expect(ColorError.invalidFormat().code).toBe('COLOR_INVALID_FORMAT');
    });

    it('should use a fixed message', () => {
      expect(ColorError.invalidFormat().message).toBe('Invalid color format');
    });

    it('should take no argument (no input can be reflected)', () => {
      // The factory has arity 0 by design: there is no parameter that could
      // ever carry attacker-controlled input into the message.
      expect(ColorError.invalidFormat).toHaveLength(0);
    });
  });

  // ===========================================================================
  // Factory: unsupportedSpace
  // ===========================================================================

  describe('unsupportedSpace', () => {
    it('should set code to COLOR_UNSUPPORTED_SPACE', () => {
      expect(ColorError.unsupportedSpace('oklch').code).toBe('COLOR_UNSUPPORTED_SPACE');
    });

    it('should include the space token in the message', () => {
      expect(ColorError.unsupportedSpace('oklch').message).toBe('Unsupported color space: oklch');
    });
  });

  // ===========================================================================
  // toFormattedString
  // ===========================================================================

  describe('toFormattedString', () => {
    it('should prefix the message with the code', () => {
      expect(ColorError.invalidFormat().toFormattedString()).toBe(
        '[COLOR_INVALID_FORMAT] Invalid color format'
      );
    });
  });
});
