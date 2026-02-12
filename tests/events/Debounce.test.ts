import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounce } from '../../src/core/index.js';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ===========================================================================
  // Basic Functionality
  // ===========================================================================

  describe('Basic Functionality', () => {
    it('should delay function execution until after wait period', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should reset timer on subsequent calls', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      vi.advanceTimersByTime(50);
      debounced(); // Reset the timer
      vi.advanceTimersByTime(50);
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should pass arguments to the debounced function', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced('arg1', 'arg2', 123);
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledWith('arg1', 'arg2', 123);
    });

    it('should use latest arguments when called multiple times', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced('first');
      debounced('second');
      debounced('third');
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('third');
    });

    it('should preserve this context', () => {
      const fn = vi.fn(function (this: { value: number }) {
        return this.value;
      });
      const debounced = debounce(fn, 100);
      const obj = { value: 42, debounced };

      obj.debounced();
      vi.advanceTimersByTime(100);

      expect(fn.mock.instances[0]).toBe(obj);
    });

    it('should return undefined before execution', () => {
      const fn = vi.fn(() => 'result');
      const debounced = debounce(fn, 100);

      const result = debounced();

      expect(result).toBeUndefined();
    });
  });

  // ===========================================================================
  // Leading Edge Option
  // ===========================================================================

  describe('Leading Edge Option', () => {
    it('should execute immediately when leading is true', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100, { leading: true });

      debounced();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should not execute on trailing edge when trailing is false', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100, { leading: true, trailing: false });

      debounced();
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1); // No additional call
    });

    it('should execute on both edges when both are true', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100, { leading: true, trailing: true });

      debounced();
      expect(fn).toHaveBeenCalledTimes(1); // Leading edge

      debounced(); // Add a trailing call
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(2); // Trailing edge
    });

    it('should return result on leading edge', () => {
      const fn = vi.fn(() => 'result');
      const debounced = debounce(fn, 100, { leading: true });

      const result = debounced();

      expect(result).toBe('result');
    });

    it('should debounce after leading edge execution', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100, { leading: true, trailing: false });

      debounced();
      debounced();
      debounced();

      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should allow new leading call after wait period', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100, { leading: true, trailing: false });

      debounced();
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);

      debounced();
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  // ===========================================================================
  // Trailing Edge Option
  // ===========================================================================

  describe('Trailing Edge Option', () => {
    it('should execute on trailing edge by default', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should not execute on trailing edge when trailing is false', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100, { trailing: false });

      debounced();
      vi.advanceTimersByTime(100);

      expect(fn).not.toHaveBeenCalled();
    });

    it('should use latest arguments on trailing edge', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100, { leading: true, trailing: true });

      debounced('first');
      debounced('second');
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(2);
      expect(fn).toHaveBeenLastCalledWith('second');
    });
  });

  // ===========================================================================
  // MaxWait Option
  // ===========================================================================

  describe('MaxWait Option', () => {
    it('should force execution after maxWait time', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100, { maxWait: 200 });

      // Keep calling to prevent trailing edge
      debounced();
      vi.advanceTimersByTime(50);
      debounced();
      vi.advanceTimersByTime(50);
      debounced();
      vi.advanceTimersByTime(50);
      debounced();
      vi.advanceTimersByTime(50);

      // Should have been called at 200ms due to maxWait
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should use latest arguments when maxWait triggers', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100, { maxWait: 150 });

      debounced('first');
      vi.advanceTimersByTime(50);
      debounced('second');
      vi.advanceTimersByTime(50);
      debounced('third');
      vi.advanceTimersByTime(50);

      expect(fn).toHaveBeenCalledWith('third');
    });

    it('should still respect wait if maxWait is not reached', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100, { maxWait: 500 });

      debounced();
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should reset maxWait timer after invocation', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100, { maxWait: 200 });

      debounced();
      vi.advanceTimersByTime(200);
      expect(fn).toHaveBeenCalledTimes(1);

      debounced();
      vi.advanceTimersByTime(200);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should handle tight loop with maxWait and leading', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100, { leading: true, maxWait: 50 });

      debounced('first');
      expect(fn).toHaveBeenCalledTimes(1);

      // Invoke again before wait but after maxWait calculation
      vi.advanceTimersByTime(60);
      debounced('second');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should handle invocation when time appears to go backwards with maxWait', () => {
      // This tests the edge case where the system clock goes backwards
      // and we need to handle re-invocation with maxWait defined
      const fn = vi.fn();
      const debounced = debounce(fn, 100, { maxWait: 200 });

      // First call - sets up timers
      debounced('first');
      vi.advanceTimersByTime(50);

      // Simulate time going backwards by mocking Date.now
      const originalNow = Date.now;
      vi.spyOn(Date, 'now').mockReturnValue(originalNow() - 100);

      // This should trigger the tight loop handling (timeSinceLastCall < 0)
      debounced('second');

      // Restore Date.now
      vi.mocked(Date.now).mockRestore();

      // Should have invoked immediately due to time going backwards
      expect(fn).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // cancel() Method
  // ===========================================================================

  describe('cancel() Method', () => {
    it('should cancel pending execution', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      debounced.cancel();
      vi.advanceTimersByTime(100);

      expect(fn).not.toHaveBeenCalled();
    });

    it('should clear pending state after cancel', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      expect(debounced.pending()).toBe(true);

      debounced.cancel();
      expect(debounced.pending()).toBe(false);
    });

    it('should allow new calls after cancel', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      debounced.cancel();
      debounced();
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should be safe to call cancel when nothing is pending', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      expect(() => debounced.cancel()).not.toThrow();
    });

    it('should cancel maxWait timer', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100, { maxWait: 200 });

      debounced();
      vi.advanceTimersByTime(50);
      debounced.cancel();
      vi.advanceTimersByTime(200);

      expect(fn).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // flush() Method
  // ===========================================================================

  describe('flush() Method', () => {
    it('should execute immediately if pending', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      debounced.flush();

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should return the result of the function', () => {
      const fn = vi.fn(() => 'flushed');
      const debounced = debounce(fn, 100);

      debounced();
      const result = debounced.flush();

      expect(result).toBe('flushed');
    });

    it('should return last result if nothing is pending', () => {
      const fn = vi.fn(() => 'result');
      const debounced = debounce(fn, 100);

      debounced();
      vi.advanceTimersByTime(100);
      const result = debounced.flush();

      expect(result).toBe('result');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should use latest arguments', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced('first');
      debounced('second');
      debounced.flush();

      expect(fn).toHaveBeenCalledWith('second');
    });

    it('should clear pending state after flush', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      debounced.flush();

      expect(debounced.pending()).toBe(false);
    });

    it('should not execute again after flush', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      debounced.flush();
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should return undefined when flush is called with no prior invocation', () => {
      const fn = vi.fn(() => 'result');
      const debounced = debounce(fn, 100);

      const result = debounced.flush();

      expect(result).toBeUndefined();
      expect(fn).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // pending() Method
  // ===========================================================================

  describe('pending() Method', () => {
    it('should return false when nothing is pending', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      expect(debounced.pending()).toBe(false);
    });

    it('should return true when execution is pending', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();

      expect(debounced.pending()).toBe(true);
    });

    it('should return false after execution completes', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      vi.advanceTimersByTime(100);

      expect(debounced.pending()).toBe(false);
    });

    it('should return false after cancel', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      debounced.cancel();

      expect(debounced.pending()).toBe(false);
    });

    it('should return false after flush', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      debounced.flush();

      expect(debounced.pending()).toBe(false);
    });
  });

  // ===========================================================================
  // Function Signature Preservation
  // ===========================================================================

  describe('Function Signature Preservation', () => {
    it('should preserve function parameter types', () => {
      const fn = vi.fn((a: string, b: number): string => `${a}${b}`);
      const debounced = debounce(fn, 100);

      debounced('test', 42);
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledWith('test', 42);
    });

    it('should preserve return type', () => {
      const fn = vi.fn((): { value: number } => ({ value: 42 }));
      const debounced = debounce(fn, 100, { leading: true });

      const result = debounced();

      expect(result).toEqual({ value: 42 });
    });

    it('should work with async functions', async () => {
      const fn = vi.fn(async () => 'async result');
      const debounced = debounce(fn, 100, { leading: true });

      const result = await debounced();

      expect(result).toBe('async result');
    });

    it('should work with functions that have no parameters', () => {
      const fn = vi.fn(() => 'no params');
      const debounced = debounce(fn, 100);

      debounced();
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledWith();
    });

    it('should work with functions that have rest parameters', () => {
      const fn = vi.fn((...args: number[]) => args.reduce((a, b) => a + b, 0));
      const debounced = debounce(fn, 100, { leading: true });

      const result = debounced(1, 2, 3, 4, 5);

      expect(result).toBe(15);
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle zero wait time', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 0);

      debounced();
      vi.advanceTimersByTime(0);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should handle rapid calls', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      for (let i = 0; i < 100; i++) {
        debounced(i);
      }
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith(99);
    });

    it('should handle multiple debounced functions independently', () => {
      const fn1 = vi.fn();
      const fn2 = vi.fn();
      const debounced1 = debounce(fn1, 100);
      const debounced2 = debounce(fn2, 200);

      debounced1();
      debounced2();

      vi.advanceTimersByTime(100);
      expect(fn1).toHaveBeenCalledTimes(1);
      expect(fn2).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(fn2).toHaveBeenCalledTimes(1);
    });

    it('should handle system time going backwards', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();

      // Simulate system time going backwards
      vi.setSystemTime(Date.now() - 1000);
      debounced();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalled();
    });

    it('should handle both leading:false and trailing:false', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100, { leading: false, trailing: false });

      debounced();
      vi.advanceTimersByTime(100);

      expect(fn).not.toHaveBeenCalled();
    });

    it('should properly restart timer on continuous calls', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      vi.advanceTimersByTime(99);
      debounced();
      vi.advanceTimersByTime(99);
      debounced();
      vi.advanceTimersByTime(99);

      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should handle remainingWait calculation correctly', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      vi.advanceTimersByTime(50);
      debounced();
      vi.advanceTimersByTime(30);
      debounced();
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // Timer Expiration Logic
  // ===========================================================================

  describe('Timer Expiration Logic', () => {
    it('should restart timer when timer expires but conditions not met', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      vi.advanceTimersByTime(50);
      debounced(); // Reset lastCallTime

      // Timer expires but lastCallTime was reset
      vi.advanceTimersByTime(50);
      expect(fn).not.toHaveBeenCalled();

      // Complete the remaining wait
      vi.advanceTimersByTime(50);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should handle maxWait timeout correctly', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100, { maxWait: 150 });

      debounced('initial');
      vi.advanceTimersByTime(50);
      debounced('update1');
      vi.advanceTimersByTime(50);
      debounced('update2');
      vi.advanceTimersByTime(50); // maxWait reached

      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('update2');
    });

    it('should clear both timers on trailing edge', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100, { maxWait: 200 });

      debounced();
      vi.advanceTimersByTime(100); // Normal trailing edge

      expect(fn).toHaveBeenCalledTimes(1);
      expect(debounced.pending()).toBe(false);
    });
  });

  // ===========================================================================
  // Invoke Logic
  // ===========================================================================

  describe('Invoke Logic', () => {
    it('should clear args and this after invocation', () => {
      const fn = vi.fn(function (this: { name: string }) {
        return this?.name;
      });
      const debounced = debounce(fn, 100);

      const obj = { name: 'test', debounced };
      obj.debounced();
      vi.advanceTimersByTime(100);

      // Second invocation should not have old context
      debounced();
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should handle invocation when args are undefined', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100, { leading: true, trailing: true });

      debounced();
      expect(fn).toHaveBeenCalledTimes(1);

      // Wait for trailing - but args were already used
      vi.advanceTimersByTime(100);
      // No additional call because args are cleared after leading
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should handle remainingWait calculation with maxWait when close to max', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100, { maxWait: 150 });

      // First call
      debounced('call1');

      // Advance 80ms - still waiting
      vi.advanceTimersByTime(80);
      expect(fn).not.toHaveBeenCalled();

      // Second call - resets wait timer but maxWait continues
      debounced('call2');

      // Advance 70ms - maxWait should trigger (80 + 70 = 150ms)
      vi.advanceTimersByTime(70);
      expect(fn).toHaveBeenCalledWith('call2');
    });

    it('should calculate remainingWait correctly when maxWait constraint is active', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 200, { maxWait: 150 });

      // Call and advance time such that maxWait is the limiting factor
      debounced('first');
      vi.advanceTimersByTime(50);

      // Call again - this should use maxWait for scheduling
      debounced('second');
      vi.advanceTimersByTime(100);

      // Should have been called due to maxWait
      expect(fn).toHaveBeenCalledWith('second');
    });
  });
});
