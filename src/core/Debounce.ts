/**
 * Debounce - Delay function execution until after wait period.
 *
 * Features:
 * - Leading/trailing edge execution
 * - Maximum wait time
 * - Cancel and flush methods
 * - Pending state check
 * - TypeScript generics preserve function signature
 *
 * @example
 * ```TypeScript
 * // Basic debounce (trailing edge)
 * const debouncedSearch = debounce(search, 300);
 * input.addEventListener('input', debouncedSearch);
 *
 * // Leading edge (fires immediately, then debounces)
 * const debouncedClick = debounce(handleClick, 300, { leading: true });
 *
 * // With max wait (fires at most every 1000ms)
 * const debouncedScroll = debounce(onScroll, 100, { maxWait: 1000 });
 *
 * // Cancel pending execution
 * debouncedSearch.cancel();
 *
 * // Execute immediately
 * debouncedSearch.flush();
 * ```
 */

export interface DebounceOptions {
  /**
   * Execute on leading edge (immediately on first call).
   * @default false
   */
  readonly leading?: boolean;

  /**
   * Execute on trailing edge (after wait period).
   * @default true
   */
  readonly trailing?: boolean;

  /**
   * Maximum time to wait before forced execution.
   * Useful for ensuring periodic updates during continuous activity.
   */
  readonly maxWait?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic function constraint requires any[] for arbitrary argument types
export interface DebouncedFunction<T extends (...args: any[]) => any> {
  /**
   * Call the debounced function.
   */
  (...args: Parameters<T>): ReturnType<T> | undefined;

  /**
   * Cancel any pending execution.
   */
  cancel(): void;

  /**
   * Execute immediately if pending, otherwise do nothing.
   * @returns The result of the function or undefined if nothing was pending
   */
  flush(): ReturnType<T> | undefined;

  /**
   * Check if an execution is pending.
   */
  pending(): boolean;
}

/**
 * Create a debounced version of a function.
 *
 * @param fn Function to debounce
 * @param wait Milliseconds to wait
 * @param options Debounce options
 * @returns Debounced function with control methods
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic function constraint requires any[] for arbitrary argument types
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  wait: number,
  options: DebounceOptions = {}
): DebouncedFunction<T> {
  const { leading = false, trailing = true, maxWait } = options;

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let maxTimeoutId: ReturnType<typeof setTimeout> | undefined;
  let lastArgs: Parameters<T> | undefined;
  let lastThis: unknown;
  let result: ReturnType<T> | undefined;
  let lastCallTime: number | undefined;
  let lastInvokeTime = 0;

  const invokeFunc = (time: number): ReturnType<T> | undefined => {
    const args = lastArgs;
    const thisArg = lastThis;

    lastArgs = undefined;
    lastThis = undefined;
    lastInvokeTime = time;

    if (args !== undefined) {
      result = fn.apply(thisArg, args) as ReturnType<T>;
    }

    return result;
  };

  const startTimer = (pendingFunc: () => void, waitTime: number): ReturnType<typeof setTimeout> => {
    return setTimeout(pendingFunc, waitTime);
  };

  const cancelTimer = (id: ReturnType<typeof setTimeout> | undefined): void => {
    if (id !== undefined) {
      clearTimeout(id);
    }
  };

  const leadingEdge = (time: number): ReturnType<T> | undefined => {
    lastInvokeTime = time;

    // Start timer for trailing edge
    timeoutId = startTimer(timerExpired, wait);

    // Start max wait timer if needed
    if (maxWait !== undefined) {
      maxTimeoutId = startTimer(maxWaitExpired, maxWait);
    }

    // Invoke leading edge
    return leading ? invokeFunc(time) : result;
  };

  const remainingWait = (time: number): number => {
    const timeSinceLastCall = time - (lastCallTime ?? 0);
    const timeSinceLastInvoke = time - lastInvokeTime;
    const timeWaiting = wait - timeSinceLastCall;

    if (maxWait !== undefined) {
      return Math.min(timeWaiting, maxWait - timeSinceLastInvoke);
    }

    return timeWaiting;
  };

  const shouldInvoke = (time: number): boolean => {
    const timeSinceLastCall = time - (lastCallTime ?? 0);
    const timeSinceLastInvoke = time - lastInvokeTime;

    // Either this is the first call, activity has stopped and we're at
    // the trailing edge, the system time has gone backwards and we're
    // treating it as the trailing edge, or we've hit the maxWait limit.
    return (
      lastCallTime === undefined ||
      timeSinceLastCall >= wait ||
      timeSinceLastCall < 0 ||
      (maxWait !== undefined && timeSinceLastInvoke >= maxWait)
    );
  };

  const timerExpired = (): void => {
    const time = Date.now();

    if (shouldInvoke(time)) {
      trailingEdge(time);
      return;
    }

    // Restart timer
    timeoutId = startTimer(timerExpired, remainingWait(time));
  };

  const maxWaitExpired = (): void => {
    const time = Date.now();
    trailingEdge(time);
  };

  const trailingEdge = (time: number): ReturnType<T> | undefined => {
    cancelTimer(timeoutId);
    cancelTimer(maxTimeoutId);
    timeoutId = undefined;
    maxTimeoutId = undefined;

    // Only invoke if we have pending args and trailing is enabled
    if (trailing && lastArgs !== undefined) {
      return invokeFunc(time);
    }

    lastArgs = undefined;
    lastThis = undefined;

    return result;
  };

  const cancel = (): void => {
    cancelTimer(timeoutId);
    cancelTimer(maxTimeoutId);
    lastInvokeTime = 0;
    lastArgs = undefined;
    lastCallTime = undefined;
    lastThis = undefined;
    timeoutId = undefined;
    maxTimeoutId = undefined;
  };

  const flush = (): ReturnType<T> | undefined => {
    if (timeoutId === undefined) {
      return result;
    }

    return trailingEdge(Date.now());
  };

  const pending = (): boolean => {
    return timeoutId !== undefined;
  };

  const debounced = function (this: unknown, ...args: Parameters<T>): ReturnType<T> | undefined {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs = args;
    lastThis = this; // eslint-disable-line @typescript-eslint/no-this-alias -- Required to preserve 'this' context for deferred invocation
    lastCallTime = time;

    if (isInvoking) {
      if (timeoutId === undefined) {
        return leadingEdge(lastCallTime);
      }

      if (maxWait !== undefined) {
        // Handle invocations in a tight loop
        cancelTimer(timeoutId);
        timeoutId = startTimer(timerExpired, wait);
        return invokeFunc(lastCallTime);
      }
    }

    timeoutId ??= startTimer(timerExpired, wait);

    return result;
  } as DebouncedFunction<T>;

  debounced.cancel = cancel;
  debounced.flush = flush;
  debounced.pending = pending;

  return debounced;
}
