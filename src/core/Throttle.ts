/**
 * Throttle - Limit function execution to at most once per wait period.
 *
 * Features:
 * - Leading/trailing edge execution
 * - Cancel and flush methods
 * - Pending state check
 * - TypeScript generics preserve function signature
 *
 * @example
 * ```TypeScript
 * // Basic throttle
 * const throttledScroll = throttle(onScroll, 100);
 * window.addEventListener('scroll', throttledScroll);
 *
 * // Only leading edge (no trailing call)
 * const throttledClick = throttle(onClick, 1000, { trailing: false });
 *
 * // Only trailing edge (no immediate call)
 * const throttledResize = throttle(onResize, 200, { leading: false });
 *
 * // Cancel pending execution
 * throttledScroll.cancel();
 *
 * // Execute immediately
 * throttledScroll.flush();
 * ```
 */

export interface ThrottleOptions {
  /**
   * Execute on leading edge (immediately on first call).
   * @default true
   */
  readonly leading?: boolean;

  /**
   * Execute on trailing edge (after wait period if calls occurred).
   * @default true
   */
  readonly trailing?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic function constraint requires any[] for arbitrary argument types
export interface ThrottledFunction<T extends (...args: any[]) => any> {
  /**
   * Call the throttled function.
   */
  (...args: Parameters<T>): ReturnType<T> | undefined;

  /**
   * Cancel any pending trailing execution.
   */
  cancel(): void;

  /**
   * Execute immediately if pending, otherwise do nothing.
   * @returns The result of the function or undefined if nothing was pending
   */
  flush(): ReturnType<T> | undefined;

  /**
   * Check if a trailing execution is pending.
   */
  pending(): boolean;
}

/**
 * Create a throttled version of a function.
 *
 * @param fn Function to throttle
 * @param wait Milliseconds between allowed executions
 * @param options Throttle options
 * @returns Throttled function with control methods
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic function constraint requires any[] for arbitrary argument types
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  wait: number,
  options: ThrottleOptions = {}
): ThrottledFunction<T> {
  const { leading = true, trailing = true } = options;

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let lastArgs: Parameters<T> | undefined;
  let lastThis: unknown;
  let result: ReturnType<T> | undefined;
  let lastInvokeTime = 0;

  const invokeFunc = (): ReturnType<T> | undefined => {
    const args = lastArgs;
    const thisArg = lastThis;

    lastArgs = undefined;
    lastThis = undefined;
    lastInvokeTime = Date.now();

    if (args !== undefined) {
      result = fn.apply(thisArg, args) as ReturnType<T>;
    }

    return result;
  };

  const startTimer = (pendingFunc: () => void, waitTime: number): ReturnType<typeof setTimeout> => {
    return setTimeout(pendingFunc, waitTime);
  };

  const cancelTimer = (): void => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
  };

  const trailingEdge = (): void => {
    timeoutId = undefined;

    // Only invoke if we have pending args and trailing is enabled
    if (trailing && lastArgs !== undefined) {
      invokeFunc();
      // Start new timer for next potential trailing call if new args came in during invoke
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- lastArgs may be set during invokeFunc
      if (lastArgs !== undefined) {
        timeoutId = startTimer(trailingEdge, wait);
      }
    } else {
      lastArgs = undefined;
      lastThis = undefined;
    }
  };

  const shouldInvoke = (): boolean => {
    const timeSinceLastInvoke = Date.now() - lastInvokeTime;
    return timeSinceLastInvoke >= wait || timeSinceLastInvoke < 0;
  };

  const cancel = (): void => {
    cancelTimer();
    lastInvokeTime = 0;
    lastArgs = undefined;
    lastThis = undefined;
  };

  const flush = (): ReturnType<T> | undefined => {
    if (timeoutId === undefined && lastArgs === undefined) {
      return result;
    }

    cancelTimer();
    return invokeFunc();
  };

  const pending = (): boolean => {
    return timeoutId !== undefined || lastArgs !== undefined;
  };

  const throttled = function (this: unknown, ...args: Parameters<T>): ReturnType<T> | undefined {
    const isInvoking = shouldInvoke();

    lastArgs = args;
    lastThis = this; // eslint-disable-line @typescript-eslint/no-this-alias -- Required to preserve 'this' context for deferred invocation

    if (isInvoking) {
      if (timeoutId === undefined) {
        // First call or after wait period elapsed
        if (leading) {
          result = invokeFunc();
        }
        // Set up trailing edge timer
        timeoutId = startTimer(trailingEdge, wait);
        return result;
      }
    }

    // During throttle period, just update args for potential trailing call
    // Timer is already running

    return result;
  } as ThrottledFunction<T>;

  throttled.cancel = cancel;
  throttled.flush = flush;
  throttled.pending = pending;

  return throttled;
}
