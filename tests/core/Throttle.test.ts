import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { throttle } from '../../src/core/index.js';

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('default behavior (leading + trailing)', () => {
    it('should execute immediately on first call', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled('first');
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('first');
    });

    it('should not execute again during throttle period', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled('first');
      throttled('second');
      throttled('third');

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should execute trailing call after throttle period', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled('first');
      throttled('second');

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(2);
      expect(fn).toHaveBeenLastCalledWith('second');
    });

    it('should allow new calls after throttle period', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled('first');
      throttled('second');
      vi.advanceTimersByTime(100);

      // first (leading) + second (trailing)
      expect(fn).toHaveBeenCalledTimes(2);

      // Need another wait period to pass before shouldInvoke returns true
      vi.advanceTimersByTime(100);
      throttled('third');
      expect(fn).toHaveBeenCalledTimes(3);
      expect(fn).toHaveBeenLastCalledWith('third');
    });
  });

  describe('leading only', () => {
    it('should only execute on leading edge', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100, { trailing: false });

      throttled('first');
      throttled('second');

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('first');
    });
  });

  describe('trailing only', () => {
    it('should not execute immediately', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100, { leading: false });

      throttled('first');
      expect(fn).not.toHaveBeenCalled();
    });

    it('should execute after throttle period', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100, { leading: false });

      throttled('first');
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('first');
    });
  });

  describe('cancel', () => {
    it('should cancel pending trailing execution', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled('first');
      throttled('second');
      throttled.cancel();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should reset state', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled();
      throttled.cancel();
      expect(throttled.pending()).toBe(false);
    });
  });

  describe('flush', () => {
    it('should execute immediately if pending', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled('first');
      throttled('second');
      throttled.flush();

      expect(fn).toHaveBeenCalledTimes(2);
      expect(fn).toHaveBeenLastCalledWith('second');
    });

    it('should return result if nothing pending', () => {
      const fn = vi.fn().mockReturnValue(42);
      const throttled = throttle(fn, 100);

      const result = throttled.flush();
      expect(result).toBeUndefined();
    });
  });

  describe('pending', () => {
    it('should return false initially', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      expect(throttled.pending()).toBe(false);
    });

    it('should return true when trailing call is pending', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled('first');
      throttled('second');
      expect(throttled.pending()).toBe(true);
    });

    it('should return false after trailing call executes', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled('first');
      vi.advanceTimersByTime(100);
      expect(throttled.pending()).toBe(false);
    });
  });

  describe('shouldInvoke edge cases', () => {
    it('should reinvoke after wait period elapses', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled();
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);
      throttled();
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });
});
