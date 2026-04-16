import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounce } from '../../src/core/index.js';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('trailing edge (default)', () => {
    it('should delay execution until after wait period', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should use the last arguments', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced('a');
      debounced('b');
      debounced('c');

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('c');
    });

    it('should reset timer on subsequent calls', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      vi.advanceTimersByTime(50);
      debounced();
      vi.advanceTimersByTime(50);
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('leading edge', () => {
    it('should execute immediately on first call', () => {
      const fn = vi.fn().mockReturnValue('result');
      const debounced = debounce(fn, 100, { leading: true });

      const result = debounced();
      expect(fn).toHaveBeenCalledTimes(1);
      expect(result).toBe('result');
    });

    it('should not execute again during wait period', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100, { leading: true });

      debounced();
      debounced();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should execute trailing edge with latest args', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100, { leading: true });

      debounced('first');
      debounced('second');

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(2);
      expect(fn).toHaveBeenLastCalledWith('second');
    });
  });

  describe('leading only (no trailing)', () => {
    it('should only execute on leading edge', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100, { leading: true, trailing: false });

      debounced('first');
      debounced('second');

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('first');
    });
  });

  describe('maxWait', () => {
    it('should force execution after maxWait', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100, { maxWait: 200 });

      debounced('a');
      vi.advanceTimersByTime(80);
      debounced('b');
      vi.advanceTimersByTime(80);
      debounced('c');
      vi.advanceTimersByTime(40);

      // maxWait of 200ms has elapsed
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should invoke during tight loop with leading and maxWait', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100, { leading: true, maxWait: 150 });

      debounced('first');
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(50);
      debounced('second');

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('cancel', () => {
    it('should cancel pending execution', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      debounced.cancel();

      vi.advanceTimersByTime(100);
      expect(fn).not.toHaveBeenCalled();
    });

    it('should not be pending after cancel', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      expect(debounced.pending()).toBe(true);

      debounced.cancel();
      expect(debounced.pending()).toBe(false);
    });
  });

  describe('flush', () => {
    it('should execute immediately if pending', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced('arg');
      debounced.flush();

      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('arg');
    });

    it('should return undefined if nothing pending', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      const result = debounced.flush();
      expect(result).toBeUndefined();
    });

    it('should not be pending after flush', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      debounced.flush();
      expect(debounced.pending()).toBe(false);
    });
  });

  describe('pending', () => {
    it('should return false initially', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      expect(debounced.pending()).toBe(false);
    });

    it('should return true when waiting', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      expect(debounced.pending()).toBe(true);
    });

    it('should return false after execution', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      vi.advanceTimersByTime(100);
      expect(debounced.pending()).toBe(false);
    });
  });

  describe('remainingWait recalculation', () => {
    it('should restart timer when called during wait period', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      vi.advanceTimersByTime(80);
      // Timer hasn't expired yet, call again to reset
      debounced();
      vi.advanceTimersByTime(80);
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(20);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});
