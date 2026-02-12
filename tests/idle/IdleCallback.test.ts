import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IdleCallback, type IdleDeadline } from '../../src/idle/index.js';
import type { CleanupFn } from '../../src/core/index.js';

/**
 * Mock IdleDeadline
 */
function createMockDeadline(timeRemaining = 50, didTimeout = false): IdleDeadline {
  return {
    timeRemaining: () => timeRemaining,
    didTimeout,
  };
}

/**
 * Track scheduled idle callbacks
 */
interface IdleCallbackEntry {
  callback: (deadline: IdleDeadline) => void;
  options?: { timeout?: number };
}

describe('IdleCallback', () => {
  let originalRequestIdleCallback: any;

  let originalCancelIdleCallback: any;
  let idleCallbacks: Map<number, IdleCallbackEntry>;
  let nextIdleId: number;

  beforeEach(() => {
    vi.useFakeTimers();
    idleCallbacks = new Map();
    nextIdleId = 1;

    // Save originals (may be undefined in happy-dom)
    originalRequestIdleCallback = window.requestIdleCallback;
    originalCancelIdleCallback = window.cancelIdleCallback;

    // Mock requestIdleCallback
    window.requestIdleCallback = vi.fn((callback, options) => {
      const id = nextIdleId++;
      idleCallbacks.set(id, { callback, options });
      return id;
    });

    // Mock cancelIdleCallback
    window.cancelIdleCallback = vi.fn((id) => {
      idleCallbacks.delete(id);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    // Restore or delete the properties
    if (originalRequestIdleCallback !== undefined) {
      window.requestIdleCallback = originalRequestIdleCallback;
    } else {
      // @ts-expect-error - deleting property that may not exist
      delete window.requestIdleCallback;
    }
    if (originalCancelIdleCallback !== undefined) {
      window.cancelIdleCallback = originalCancelIdleCallback;
    } else {
      // @ts-expect-error - deleting property that may not exist
      delete window.cancelIdleCallback;
    }
    vi.restoreAllMocks();
  });

  // Helper to execute all pending idle callbacks
  function runIdleCallbacks(deadline: IdleDeadline = createMockDeadline()): void {
    for (const [id, entry] of idleCallbacks) {
      entry.callback(deadline);
      idleCallbacks.delete(id);
    }
  }

  // Helper to get idle callback by id safely
  function getIdleCallback(id: number): IdleCallbackEntry {
    const entry = idleCallbacks.get(id);
    if (!entry) {
      throw new Error(`No idle callback found with id ${id}`);
    }
    return entry;
  }

  // ===========================================================================
  // Core API
  // ===========================================================================

  describe('Core API', () => {
    describe('isSupported()', () => {
      it('should return true when requestIdleCallback is available', () => {
        expect(IdleCallback.isSupported()).toBe(true);
      });

      it('should return false when requestIdleCallback is undefined', () => {
        // @ts-expect-error - intentionally setting undefined for test
        delete window.requestIdleCallback;

        expect(IdleCallback.isSupported()).toBe(false);
      });

      it('should return false when window is undefined', () => {
        const originalWindow = globalThis.window;
        // @ts-expect-error - intentionally setting undefined for test
        delete globalThis.window;

        expect(IdleCallback.isSupported()).toBe(false);

        globalThis.window = originalWindow;
      });
    });

    describe('request()', () => {
      it('should schedule an idle callback', () => {
        const callback = vi.fn();

        IdleCallback.request(callback);

        expect(window.requestIdleCallback).toHaveBeenCalled();
        expect(idleCallbacks.size).toBe(1);
      });

      it('should call callback with deadline', () => {
        const callback = vi.fn();

        IdleCallback.request(callback);
        runIdleCallbacks();

        expect(callback).toHaveBeenCalledWith(
          expect.objectContaining({
            timeRemaining: expect.any(Function),
            didTimeout: expect.any(Boolean),
          })
        );
      });

      it('should return a cancel function', () => {
        const callback = vi.fn();

        const cancel = IdleCallback.request(callback);

        expect(cancel).toBeInstanceOf(Function);
      });

      it('should cancel the callback when cancel is called', () => {
        const callback = vi.fn();

        const cancel = IdleCallback.request(callback);
        cancel();

        expect(window.cancelIdleCallback).toHaveBeenCalled();
        expect(idleCallbacks.size).toBe(0);
      });

      it('should pass timeout option to requestIdleCallback', () => {
        const callback = vi.fn();

        IdleCallback.request(callback, { timeout: 1000 });

        expect(window.requestIdleCallback).toHaveBeenCalledWith(expect.any(Function), {
          timeout: 1000,
        });
      });

      it('should use setTimeout fallback when not supported', () => {
        // @ts-expect-error - intentionally setting undefined for test
        delete window.requestIdleCallback;

        const callback = vi.fn();

        IdleCallback.request(callback);

        expect(callback).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1);

        expect(callback).toHaveBeenCalled();
        const deadline = callback.mock.calls[0]![0];
        expect(deadline.timeRemaining()).toBeLessThanOrEqual(50);
      });

      it('should return no-op cleanup when window is undefined', () => {
        const originalWindow = globalThis.window;
        // @ts-expect-error - intentionally setting undefined for test
        delete globalThis.window;

        const callback = vi.fn();
        const cancel = IdleCallback.request(callback);

        expect(cancel).toBeInstanceOf(Function);
        expect(() => cancel()).not.toThrow();

        globalThis.window = originalWindow;
      });

      it('should set didTimeout correctly in fallback', () => {
        // @ts-expect-error - intentionally setting undefined for test
        delete window.requestIdleCallback;

        const callback = vi.fn();

        IdleCallback.request(callback, { timeout: 100 });
        vi.advanceTimersByTime(1);

        const deadline = callback.mock.calls[0]![0];
        expect(deadline.didTimeout).toBe(true);
      });

      it('should set didTimeout to false in fallback when no timeout', () => {
        // @ts-expect-error - intentionally setting undefined for test
        delete window.requestIdleCallback;

        const callback = vi.fn();

        IdleCallback.request(callback);
        vi.advanceTimersByTime(1);

        const deadline = callback.mock.calls[0]![0];
        expect(deadline.didTimeout).toBe(false);
      });

      it('should cancel setTimeout in fallback when cleanup is called', () => {
        // @ts-expect-error - intentionally setting undefined for test
        delete window.requestIdleCallback;

        const callback = vi.fn();
        const cancel = IdleCallback.request(callback);

        // Cancel before timeout fires
        cancel();
        vi.advanceTimersByTime(10);

        // Callback should not have been called
        expect(callback).not.toHaveBeenCalled();
      });
    });

    describe('requestPromise()', () => {
      it('should return a promise that resolves with deadline', async () => {
        const promise = IdleCallback.requestPromise();
        runIdleCallbacks();

        const deadline = await promise;
        expect(deadline).toHaveProperty('timeRemaining');
        expect(deadline).toHaveProperty('didTimeout');
      });

      it('should pass options to request', () => {
        IdleCallback.requestPromise({ timeout: 500 });

        expect(window.requestIdleCallback).toHaveBeenCalledWith(expect.any(Function), {
          timeout: 500,
        });
      });
    });

    describe('runIfTime()', () => {
      it('should run task if enough time remaining', () => {
        const deadline = createMockDeadline(10);
        const task = vi.fn();

        const result = IdleCallback.runIfTime(deadline, task, 5);

        expect(result).toBe(true);
        expect(task).toHaveBeenCalled();
      });

      it('should not run task if not enough time', () => {
        const deadline = createMockDeadline(2);
        const task = vi.fn();

        const result = IdleCallback.runIfTime(deadline, task, 5);

        expect(result).toBe(false);
        expect(task).not.toHaveBeenCalled();
      });

      it('should run task if didTimeout is true', () => {
        const deadline = createMockDeadline(0, true);
        const task = vi.fn();

        const result = IdleCallback.runIfTime(deadline, task, 5);

        expect(result).toBe(true);
        expect(task).toHaveBeenCalled();
      });

      it('should use default minTime of 1', () => {
        const deadline = createMockDeadline(1);
        const task = vi.fn();

        const result = IdleCallback.runIfTime(deadline, task);

        expect(result).toBe(true);
        expect(task).toHaveBeenCalled();
      });
    });
  });

  // ===========================================================================
  // Task Queue
  // ===========================================================================

  describe('Task Queue', () => {
    describe('runTasks()', () => {
      it('should run all tasks in idle time', () => {
        const tasks = [vi.fn(), vi.fn(), vi.fn()];

        IdleCallback.runTasks(tasks);
        runIdleCallbacks(createMockDeadline(100));

        tasks.forEach((task) => {
          expect(task).toHaveBeenCalled();
        });
      });

      it('should schedule next idle period if not enough time', () => {
        let timeRemaining = 5;
        const deadline: IdleDeadline = {
          timeRemaining: () => {
            const t = timeRemaining;
            timeRemaining -= 2; // Simulate time passing
            return t;
          },
          didTimeout: false,
        };

        const tasks = [vi.fn(), vi.fn(), vi.fn()];

        IdleCallback.runTasks(tasks, { minTimeRemaining: 3 });

        // First idle period - run 2 tasks
        const firstCallback = getIdleCallback(1);
        firstCallback.callback(deadline);

        expect(tasks[0]).toHaveBeenCalled();
        expect(tasks[1]).toHaveBeenCalled();
        expect(tasks[2]).not.toHaveBeenCalled();

        // Second idle period scheduled
        expect(idleCallbacks.size).toBeGreaterThan(0);
      });

      it('should return cleanup function that cancels remaining tasks', () => {
        const tasks = [vi.fn(), vi.fn(), vi.fn()];

        const cleanup = IdleCallback.runTasks(tasks);
        cleanup();

        // Should cancel the idle callback
        expect(window.cancelIdleCallback).toHaveBeenCalled();
      });

      it('should handle task errors gracefully', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const errorTask = vi.fn().mockImplementation(() => {
          throw new Error('Task failed');
        });
        const tasks = [vi.fn(), errorTask, vi.fn()];

        IdleCallback.runTasks(tasks);
        runIdleCallbacks(createMockDeadline(100));

        expect(tasks[0]).toHaveBeenCalled();
        expect(errorTask).toHaveBeenCalled();
        expect(tasks[2]).toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith('IdleCallback task error:', expect.any(Error));

        consoleSpy.mockRestore();
      });

      it('should respect timeout option', () => {
        const tasks = [vi.fn()];

        IdleCallback.runTasks(tasks, { timeout: 2000 });

        expect(window.requestIdleCallback).toHaveBeenCalledWith(expect.any(Function), {
          timeout: 2000,
        });
      });
    });

    describe('processInIdle()', () => {
      it('should process all items', async () => {
        const items = [1, 2, 3, 4, 5];
        const processor = vi.fn();

        const promise = IdleCallback.processInIdle(items, processor);
        runIdleCallbacks(createMockDeadline(100));

        await promise;

        expect(processor).toHaveBeenCalledTimes(5);
        expect(processor).toHaveBeenCalledWith(1, 0);
        expect(processor).toHaveBeenCalledWith(5, 4);
      });

      it('should pass index to processor', async () => {
        const items = ['a', 'b', 'c'];
        const processor = vi.fn();

        const promise = IdleCallback.processInIdle(items, processor);
        runIdleCallbacks(createMockDeadline(100));

        await promise;

        expect(processor).toHaveBeenNthCalledWith(1, 'a', 0);
        expect(processor).toHaveBeenNthCalledWith(2, 'b', 1);
        expect(processor).toHaveBeenNthCalledWith(3, 'c', 2);
      });

      it('should reject on processor error', async () => {
        const items = [1, 2, 3];
        const processor = vi.fn().mockImplementation((item) => {
          if (item === 2) throw new Error('Process failed');
        });

        const promise = IdleCallback.processInIdle(items, processor);
        runIdleCallbacks(createMockDeadline(100));

        await expect(promise).rejects.toThrow('Process failed');
      });

      it('should schedule multiple idle periods for large datasets', async () => {
        let callCount = 0;
        const deadline: IdleDeadline = {
          timeRemaining: () => {
            callCount++;
            return callCount <= 2 ? 5 : 0;
          },
          didTimeout: false,
        };

        const items = [1, 2, 3, 4, 5];
        const processor = vi.fn();

        const promise = IdleCallback.processInIdle(items, processor, { minTimeRemaining: 3 });

        // First idle period
        const firstCallback = getIdleCallback(1);
        firstCallback.callback(deadline);

        expect(processor).toHaveBeenCalledTimes(2);

        // Reset for second period
        callCount = 0;
        const secondCallback = getIdleCallback(2);
        secondCallback.callback(deadline);

        expect(processor).toHaveBeenCalledTimes(4);

        // Third period to finish
        callCount = 0;
        const thirdCallback = getIdleCallback(3);
        thirdCallback.callback(createMockDeadline(100));

        await promise;
        expect(processor).toHaveBeenCalledTimes(5);
      });
    });
  });

  // ===========================================================================
  // Utilities
  // ===========================================================================

  describe('Utilities', () => {
    describe('defer()', () => {
      it('should return a deferred function', () => {
        const fn = vi.fn();

        const deferred = IdleCallback.defer(fn);

        expect(deferred).toBeInstanceOf(Function);
      });

      it('should schedule original function in idle time', () => {
        const fn = vi.fn();

        const deferred = IdleCallback.defer(fn);
        deferred('arg1', 'arg2');

        expect(fn).not.toHaveBeenCalled();

        runIdleCallbacks();

        expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
      });

      it('should return cancel function', () => {
        const fn = vi.fn();

        const deferred = IdleCallback.defer(fn);
        const cancel = deferred();

        expect(cancel).toBeInstanceOf(Function);
        cancel();

        runIdleCallbacks();

        expect(fn).not.toHaveBeenCalled();
      });

      it('should pass options to request', () => {
        const fn = vi.fn();

        const deferred = IdleCallback.defer(fn, { timeout: 1000 });
        deferred();

        expect(window.requestIdleCallback).toHaveBeenCalledWith(expect.any(Function), {
          timeout: 1000,
        });
      });
    });

    describe('batch()', () => {
      it('should return object with schedule, flush, and cancel', () => {
        const fn = vi.fn();

        const batched = IdleCallback.batch(fn);

        expect(batched.schedule).toBeInstanceOf(Function);
        expect(batched.flush).toBeInstanceOf(Function);
        expect(batched.cancel).toBeInstanceOf(Function);
      });

      it('should only schedule once for multiple calls', () => {
        const fn = vi.fn();

        const batched = IdleCallback.batch(fn);
        batched.schedule();
        batched.schedule();
        batched.schedule();

        expect(window.requestIdleCallback).toHaveBeenCalledTimes(1);
      });

      it('should execute function on idle', () => {
        const fn = vi.fn();

        const batched = IdleCallback.batch(fn);
        batched.schedule();

        expect(fn).not.toHaveBeenCalled();

        runIdleCallbacks();

        expect(fn).toHaveBeenCalledTimes(1);
      });

      it('should allow rescheduling after execution', () => {
        const fn = vi.fn();

        const batched = IdleCallback.batch(fn);
        batched.schedule();
        runIdleCallbacks();

        expect(fn).toHaveBeenCalledTimes(1);

        batched.schedule();
        runIdleCallbacks();

        expect(fn).toHaveBeenCalledTimes(2);
      });

      it('should execute immediately on flush', () => {
        const fn = vi.fn();

        const batched = IdleCallback.batch(fn);
        batched.schedule();
        batched.flush();

        expect(fn).toHaveBeenCalledTimes(1);
        expect(window.cancelIdleCallback).toHaveBeenCalled();
      });

      it('should not execute on flush if not scheduled', () => {
        const fn = vi.fn();

        const batched = IdleCallback.batch(fn);
        batched.flush();

        expect(fn).not.toHaveBeenCalled();
      });

      it('should cancel pending execution', () => {
        const fn = vi.fn();

        const batched = IdleCallback.batch(fn);
        batched.schedule();
        batched.cancel();

        runIdleCallbacks();

        expect(fn).not.toHaveBeenCalled();
      });

      it('should pass options to request', () => {
        const fn = vi.fn();

        const batched = IdleCallback.batch(fn, { timeout: 500 });
        batched.schedule();

        expect(window.requestIdleCallback).toHaveBeenCalledWith(expect.any(Function), {
          timeout: 500,
        });
      });
    });
  });

  // ===========================================================================
  // Type Exports
  // ===========================================================================

  describe('Type Exports', () => {
    it('should export CleanupFn type', () => {
      const cleanup: CleanupFn = () => {};
      expect(cleanup).toBeInstanceOf(Function);
    });
  });

  // ===========================================================================
  // Coverage Gaps
  // ===========================================================================

  describe('Coverage Gaps', () => {
    it('should wrap non-Error thrown values in Error in processInIdle (line 243)', async () => {
      const items = [1, 2, 3];
      const processor = vi.fn().mockImplementation((item) => {
        if (item === 2) {
          // Throw a non-Error value to trigger the `new Error(String(error))` branch

          throw 'string error';
        }
      });

      const promise = IdleCallback.processInIdle(items, processor);
      runIdleCallbacks(createMockDeadline(100));

      await expect(promise).rejects.toThrow('string error');
      await expect(promise).rejects.toBeInstanceOf(Error);
    });
  });
});
