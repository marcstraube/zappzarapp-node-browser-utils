import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { throttle } from '../../src/core/index.js';

describe('throttle', () => {
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
    it('should execute immediately on first call (leading edge)', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled();

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should not execute again during wait period', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled();
      throttled();
      throttled();

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should execute on trailing edge after wait period', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled();
      throttled();
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should pass arguments to the throttled function', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled('arg1', 'arg2', 123);

      expect(fn).toHaveBeenCalledWith('arg1', 'arg2', 123);
    });

    it('should use latest arguments for trailing edge', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled('first');
      throttled('second');
      throttled('third');
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(2);
      expect(fn).toHaveBeenLastCalledWith('third');
    });

    it('should preserve this context', () => {
      const fn = vi.fn(function (this: { value: number }) {
        return this.value;
      });
      const throttled = throttle(fn, 100);
      const obj = { value: 42, throttled };

      obj.throttled();

      expect(fn.mock.instances[0]).toBe(obj);
    });

    it('should return the result of the function', () => {
      const fn = vi.fn(() => 'result');
      const throttled = throttle(fn, 100);

      const result = throttled();

      expect(result).toBe('result');
    });
  });

  // ===========================================================================
  // Leading Edge Option
  // ===========================================================================

  describe('Leading Edge Option', () => {
    it('should execute immediately when leading is true (default)', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled();

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should not execute immediately when leading is false', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100, { leading: false });

      throttled();

      expect(fn).not.toHaveBeenCalled();
    });

    it('should execute on trailing edge when leading is false', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100, { leading: false });

      throttled();
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should use arguments from first call when leading is true', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled('first');
      throttled('second');

      expect(fn).toHaveBeenCalledWith('first');
    });
  });

  // ===========================================================================
  // Trailing Edge Option
  // ===========================================================================

  describe('Trailing Edge Option', () => {
    it('should execute on trailing edge by default', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled();
      throttled();
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should not execute on trailing edge when trailing is false', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100, { trailing: false });

      throttled();
      throttled();
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should not clear args when trailing is false', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100, { trailing: false });

      throttled('first');
      throttled('second');
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('first');
    });

    it('should use latest arguments on trailing edge', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled('first');
      throttled('second');
      throttled('third');
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenLastCalledWith('third');
    });
  });

  // ===========================================================================
  // Timing Behavior
  // ===========================================================================

  describe('Timing Behavior', () => {
    it('should call at most once per wait period', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      // Call multiple times within first wait period
      throttled();
      vi.advanceTimersByTime(20);
      throttled();
      vi.advanceTimersByTime(20);
      throttled();
      vi.advanceTimersByTime(20);
      throttled();

      // Only one call so far (leading edge)
      expect(fn).toHaveBeenCalledTimes(1);

      // Complete first wait period - trailing edge fires
      vi.advanceTimersByTime(40);
      expect(fn).toHaveBeenCalledTimes(2);

      // Wait period elapsed, no more calls
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should allow new leading call after wait period', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled();
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);

      throttled();
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should handle continuous calls correctly', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      // Simulate scroll-like continuous calls
      for (let i = 0; i < 10; i++) {
        throttled(i);
        vi.advanceTimersByTime(30);
      }
      vi.advanceTimersByTime(100);

      // Leading call + trailing calls as wait periods complete
      expect(fn.mock.calls.length).toBeGreaterThan(1);
      expect(fn.mock.calls.length).toBeLessThan(10);
    });

    it('should respect wait period boundaries', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100, { trailing: false });

      throttled();
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(99);
      throttled();
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(1);
      throttled();
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should handle negative time difference (system clock change)', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled();
      expect(fn).toHaveBeenCalledTimes(1);

      // Simulate system time going backwards
      vi.setSystemTime(Date.now() - 200);

      throttled();
      // Timer is still running, so it doesn't invoke again immediately
      // but args are updated for trailing call
      expect(fn).toHaveBeenCalledTimes(1);

      // Advance past the wait period to get trailing call
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  // ===========================================================================
  // cancel() Method
  // ===========================================================================

  describe('cancel() Method', () => {
    it('should cancel pending trailing execution', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled();
      throttled();
      throttled.cancel();
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(1); // Only leading call
    });

    it('should clear pending state after cancel', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled();
      throttled();
      expect(throttled.pending()).toBe(true);

      throttled.cancel();
      expect(throttled.pending()).toBe(false);
    });

    it('should allow new calls after cancel', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled();
      throttled.cancel();
      throttled();

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should be safe to call cancel when nothing is pending', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      expect(() => throttled.cancel()).not.toThrow();
    });

    it('should reset lastInvokeTime after cancel', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled();
      vi.advanceTimersByTime(50);
      throttled.cancel();

      // Should be able to call immediately after cancel
      throttled();
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  // ===========================================================================
  // flush() Method
  // ===========================================================================

  describe('flush() Method', () => {
    it('should execute immediately if pending', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled();
      throttled();
      throttled.flush();

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should return the result of the function', () => {
      const fn = vi.fn(() => 'flushed');
      const throttled = throttle(fn, 100);

      throttled();
      throttled();
      const result = throttled.flush();

      expect(result).toBe('flushed');
    });

    it('should return last result if nothing is pending', () => {
      const fn = vi.fn(() => 'result');
      const throttled = throttle(fn, 100);

      throttled();
      vi.advanceTimersByTime(100);

      const result = throttled.flush();

      expect(result).toBe('result');
      expect(fn).toHaveBeenCalledTimes(1); // No additional call from flush
    });

    it('should use latest arguments', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled('first');
      throttled('second');
      throttled.flush();

      expect(fn).toHaveBeenLastCalledWith('second');
    });

    it('should clear pending state after flush', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled();
      throttled();
      throttled.flush();

      expect(throttled.pending()).toBe(false);
    });

    it('should cancel timer after flush', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled();
      throttled();
      throttled.flush();
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(2); // No additional call
    });

    it('should handle flush when only args are pending', () => {
      const fn = vi.fn().mockReturnValue('result');
      const throttled = throttle(fn, 100, { leading: false });

      throttled('pending');
      const result = throttled.flush();

      expect(fn).toHaveBeenCalledWith('pending');
      // Function with return value should return it
      expect(result).toBe('result');
    });
  });

  // ===========================================================================
  // pending() Method
  // ===========================================================================

  describe('pending() Method', () => {
    it('should return false when nothing is pending', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      expect(throttled.pending()).toBe(false);
    });

    it('should return true when timer is pending', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled();

      expect(throttled.pending()).toBe(true);
    });

    it('should return true when args are pending', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled();
      throttled(); // Add pending args

      expect(throttled.pending()).toBe(true);
    });

    it('should return false after execution completes', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled();
      vi.advanceTimersByTime(100);

      expect(throttled.pending()).toBe(false);
    });

    it('should return false after cancel', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled();
      throttled.cancel();

      expect(throttled.pending()).toBe(false);
    });

    it('should return false after flush', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled();
      throttled();
      throttled.flush();

      expect(throttled.pending()).toBe(false);
    });
  });

  // ===========================================================================
  // Function Signature Preservation
  // ===========================================================================

  describe('Function Signature Preservation', () => {
    it('should preserve function parameter types', () => {
      const fn = vi.fn((a: string, b: number): string => `${a}${b}`);
      const throttled = throttle(fn, 100);

      throttled('test', 42);

      expect(fn).toHaveBeenCalledWith('test', 42);
    });

    it('should preserve return type', () => {
      const fn = vi.fn((): { value: number } => ({ value: 42 }));
      const throttled = throttle(fn, 100);

      const result = throttled();

      expect(result).toEqual({ value: 42 });
    });

    it('should work with async functions', async () => {
      const fn = vi.fn(async () => 'async result');
      const throttled = throttle(fn, 100);

      const result = await throttled();

      expect(result).toBe('async result');
    });

    it('should work with functions that have no parameters', () => {
      const fn = vi.fn(() => 'no params');
      const throttled = throttle(fn, 100);

      throttled();

      expect(fn).toHaveBeenCalledWith();
    });

    it('should work with functions that have rest parameters', () => {
      const fn = vi.fn((...args: number[]) => args.reduce((a, b) => a + b, 0));
      const throttled = throttle(fn, 100);

      const result = throttled(1, 2, 3, 4, 5);

      expect(result).toBe(15);
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle zero wait time', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 0);

      throttled();
      expect(fn).toHaveBeenCalledTimes(1);

      throttled();
      // Still throttled until setTimeout fires (even with 0ms)
      expect(fn).toHaveBeenCalledTimes(1);

      // Advance timers to let trailing call execute
      vi.advanceTimersByTime(1);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should handle rapid calls', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      for (let i = 0; i < 100; i++) {
        throttled(i);
      }
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(2);
      expect(fn).toHaveBeenNthCalledWith(1, 0); // Leading
      expect(fn).toHaveBeenNthCalledWith(2, 99); // Trailing
    });

    it('should handle multiple throttled functions independently', () => {
      const fn1 = vi.fn();
      const fn2 = vi.fn();
      const throttled1 = throttle(fn1, 100);
      const throttled2 = throttle(fn2, 200);

      throttled1();
      throttled2();

      expect(fn1).toHaveBeenCalledTimes(1);
      expect(fn2).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);
      throttled1();
      throttled2();

      expect(fn1).toHaveBeenCalledTimes(2);
      expect(fn2).toHaveBeenCalledTimes(1);
    });

    it('should handle both leading:false and trailing:false', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100, { leading: false, trailing: false });

      throttled();
      vi.advanceTimersByTime(100);

      expect(fn).not.toHaveBeenCalled();
    });

    it('should handle only trailing:true', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100, { leading: false, trailing: true });

      throttled();
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should handle only leading:true', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100, { leading: true, trailing: false });

      throttled();
      throttled();
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // Trailing Edge Logic
  // ===========================================================================

  describe('Trailing Edge Logic', () => {
    it('should start new timer if throttled is called during invoke', () => {
      let callCount = 0;
      // Use an object to hold the throttled function so we can reference it inside fn
      const holder: { throttled: ReturnType<typeof throttle> | null } = { throttled: null };

      const fn = vi.fn(() => {
        callCount++;
        // On first trailing edge invocation, call throttled again
        // This sets lastArgs during invokeFunc, triggering a new timer
        if (callCount === 2 && holder.throttled) {
          holder.throttled('reentrant');
        }
      });

      holder.throttled = throttle(fn, 100);
      const throttled = holder.throttled;

      // First call - immediate (leading)
      throttled('first');
      expect(fn).toHaveBeenCalledTimes(1);

      // Second call - queued for trailing
      throttled('second');

      // Trailing edge fires - invokes fn, fn calls throttled again
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(2);

      // New timer should have been started, advance to trigger it
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(3);
      expect(fn).toHaveBeenLastCalledWith('reentrant');
    });

    it('should clear args and context when trailing is false', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100, { trailing: false });

      throttled('first');
      throttled('second');
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(1);

      // After trailing edge clears, should be able to call again
      throttled('third');
      expect(fn).toHaveBeenCalledTimes(2);
      expect(fn).toHaveBeenLastCalledWith('third');
    });

    it('should invoke with correct args when trailing fires', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled('a', 1);
      throttled('b', 2);
      throttled('c', 3);

      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenLastCalledWith('c', 3);
    });
  });

  // ===========================================================================
  // Invoke Logic
  // ===========================================================================

  describe('Invoke Logic', () => {
    it('should update lastInvokeTime on each invocation', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled();
      vi.advanceTimersByTime(100);
      throttled();
      vi.advanceTimersByTime(100);
      throttled();

      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should clear args and this after invocation', () => {
      const fn = vi.fn(function (this: { name: string }) {
        return this?.name;
      });
      const throttled = throttle(fn, 100);

      const obj = { name: 'test', throttled };
      obj.throttled();
      vi.advanceTimersByTime(100);

      // Second invocation with no pending args
      throttled();
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should handle invocation when args are undefined', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled();
      vi.advanceTimersByTime(100);

      // Timer expired but no new args - should not invoke again
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // Context Preservation
  // ===========================================================================

  describe('Context Preservation', () => {
    it('should preserve this context for leading edge', () => {
      const fn = vi.fn(function (this: { value: number }) {
        return this.value;
      });
      const throttled = throttle(fn, 100);
      const obj = { value: 42, throttled };

      obj.throttled();

      expect(fn.mock.results[0]?.value).toBe(42);
    });

    it('should preserve this context for trailing edge', () => {
      const fn = vi.fn(function (this: { value: number }) {
        return this.value;
      });
      const throttled = throttle(fn, 100);
      const obj = { value: 100, throttled };

      obj.throttled();
      obj.throttled();
      vi.advanceTimersByTime(100);

      expect(fn.mock.results[1]?.value).toBe(100);
    });

    it('should use correct context when called from different objects', () => {
      const fn = vi.fn(function (this: { name: string }) {
        return this.name;
      });
      const throttled = throttle(fn, 100);

      const obj1 = { name: 'first', throttled };
      const obj2 = { name: 'second', throttled };

      obj1.throttled();
      obj2.throttled(); // Different context for trailing

      vi.advanceTimersByTime(100);

      expect(fn.mock.results[0]?.value).toBe('first');
      expect(fn.mock.results[1]?.value).toBe('second');
    });
  });

  // ===========================================================================
  // Return Value Behavior
  // ===========================================================================

  describe('Return Value Behavior', () => {
    it('should return result immediately for leading call', () => {
      const fn = vi.fn(() => 'immediate');
      const throttled = throttle(fn, 100);

      const result = throttled();

      expect(result).toBe('immediate');
    });

    it('should return last result for subsequent calls during wait', () => {
      const fn = vi.fn(() => 'value');
      const throttled = throttle(fn, 100);

      throttled();
      const result = throttled();

      expect(result).toBe('value'); // Returns previous result
    });

    it('should return undefined when leading is false and no prior result', () => {
      const fn = vi.fn(() => 'result');
      const throttled = throttle(fn, 100, { leading: false });

      const result = throttled();

      expect(result).toBeUndefined();
    });
  });
});
