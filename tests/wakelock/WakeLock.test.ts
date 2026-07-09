import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { WakeLock, type WakeLockHandle, type WakeLockOptions } from '../../src/wakelock/index.js';
import { Result, WakeLockError } from '../../src/core/index.js';

// ===========================================================================
// Mock helpers
// ===========================================================================

interface MockSentinel {
  released: boolean;
  type: 'screen';
  release: Mock<() => Promise<void>>;
}

function createSentinel(): MockSentinel {
  const sentinel: MockSentinel = {
    released: false,
    type: 'screen',
    release: vi.fn(async (): Promise<void> => {
      sentinel.released = true;
    }),
  };
  return sentinel;
}

function setVisibility(state: 'visible' | 'hidden'): void {
  Object.defineProperty(document, 'visibilityState', {
    value: state,
    configurable: true,
    writable: true,
  });
}

/** Flush pending microtasks/timers so async re-acquisition settles. */
const flush = (): Promise<void> => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('WakeLock', () => {
  let requestMock: Mock;
  let sentinels: MockSentinel[];
  let handles: WakeLockHandle[];

  /** Access a recorded sentinel, narrowing away `undefined` for the type checker. */
  function nthSentinel(index: number): MockSentinel {
    const sentinel = sentinels[index];
    if (sentinel === undefined) {
      throw new Error(`No sentinel recorded at index ${index}`);
    }
    return sentinel;
  }

  /** Acquire a lock and track the handle so it is released after the test. */
  async function acquire(options?: WakeLockOptions): Promise<WakeLockHandle> {
    const result = await WakeLock.request(options);
    const handle = Result.unwrap(result);
    handles.push(handle);
    return handle;
  }

  beforeEach(() => {
    sentinels = [];
    handles = [];
    requestMock = vi.fn(async (): Promise<MockSentinel> => {
      const sentinel = createSentinel();
      sentinels.push(sentinel);
      return sentinel;
    });

    Object.defineProperty(navigator, 'wakeLock', {
      value: { request: requestMock },
      configurable: true,
      writable: true,
    });

    setVisibility('visible');
  });

  afterEach(async () => {
    // Release every acquired handle so no visibilitychange listener leaks into
    // the next test (they share the same document).
    for (const handle of handles) {
      await handle.release();
    }
    handles = [];

    vi.unstubAllGlobals();
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      Reflect.deleteProperty(navigator as unknown as Record<string, unknown>, 'wakeLock');
    }
    vi.restoreAllMocks();
  });

  // =========================================================================
  // isSupported
  // =========================================================================

  describe('isSupported', () => {
    it('should return true when navigator.wakeLock exists', () => {
      expect(WakeLock.isSupported()).toBe(true);
    });

    it('should return false when navigator has no wakeLock', () => {
      Reflect.deleteProperty(navigator as unknown as Record<string, unknown>, 'wakeLock');

      expect(WakeLock.isSupported()).toBe(false);
    });

    it('should return false when navigator is undefined', () => {
      vi.stubGlobal('navigator', undefined);

      expect(WakeLock.isSupported()).toBe(false);
    });
  });

  // =========================================================================
  // request
  // =========================================================================

  describe('request', () => {
    it('should return NOT_SUPPORTED error when the API is unavailable', async () => {
      Reflect.deleteProperty(navigator as unknown as Record<string, unknown>, 'wakeLock');

      const result = await WakeLock.request();

      expect(Result.isErr(result)).toBe(true);
      const error = Result.unwrapErr(result);
      expect(error).toBeInstanceOf(WakeLockError);
      expect(error.code).toBe('WAKE_LOCK_NOT_SUPPORTED');
    });

    it('should acquire a screen wake lock', async () => {
      const handle = await acquire();

      expect(requestMock).toHaveBeenCalledWith('screen');
      expect(handle.active).toBe(true);
    });

    it('should return REQUEST_FAILED error when the request rejects', async () => {
      const cause = new Error('NotAllowedError');
      requestMock.mockRejectedValueOnce(cause);

      const result = await WakeLock.request();

      expect(Result.isErr(result)).toBe(true);
      const error = Result.unwrapErr(result);
      expect(error).toBeInstanceOf(WakeLockError);
      expect(error.code).toBe('WAKE_LOCK_REQUEST_FAILED');
      expect(error.cause).toBe(cause);
    });

    it('should report active=false once the browser releases the lock', async () => {
      const handle = await acquire();

      expect(handle.active).toBe(true);
      nthSentinel(0).released = true;
      expect(handle.active).toBe(false);
    });

    it('should acquire without observing visibility when document is undefined', async () => {
      vi.stubGlobal('document', undefined);

      const result = await WakeLock.request();

      expect(Result.isOk(result)).toBe(true);
      expect(Result.unwrap(result).active).toBe(true);
    });
  });

  // =========================================================================
  // Automatic re-acquisition
  // =========================================================================

  describe('re-acquisition on visibility change', () => {
    it('should register a visibilitychange listener by default', async () => {
      const addSpy = vi.spyOn(document, 'addEventListener');

      await acquire();

      expect(addSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    });

    it('should not register a listener when reacquireOnVisible is false', async () => {
      const addSpy = vi.spyOn(document, 'addEventListener');

      await acquire({ reacquireOnVisible: false });

      expect(addSpy).not.toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    });

    it('should re-acquire when the page becomes visible again', async () => {
      const handle = await acquire();

      // Browser released the lock while hidden.
      nthSentinel(0).released = true;
      setVisibility('visible');
      document.dispatchEvent(new Event('visibilitychange'));
      await flush();

      expect(requestMock).toHaveBeenCalledTimes(2);
      expect(handle.active).toBe(true);
    });

    it('should not re-acquire while the page is hidden', async () => {
      await acquire();

      nthSentinel(0).released = true;
      setVisibility('hidden');
      document.dispatchEvent(new Event('visibilitychange'));
      await flush();

      expect(requestMock).toHaveBeenCalledTimes(1);
    });

    it('should not re-acquire while the lock is still held', async () => {
      await acquire();

      // sentinel still active (released === false)
      setVisibility('visible');
      document.dispatchEvent(new Event('visibilitychange'));
      await flush();

      expect(requestMock).toHaveBeenCalledTimes(1);
    });

    it('should ignore re-acquisition failures', async () => {
      const handle = await acquire();

      nthSentinel(0).released = true;
      requestMock.mockRejectedValueOnce(new Error('reacquire failed'));
      setVisibility('visible');
      document.dispatchEvent(new Event('visibilitychange'));
      await flush();

      expect(requestMock).toHaveBeenCalledTimes(2);
      expect(handle.active).toBe(false);
    });
  });

  // =========================================================================
  // release
  // =========================================================================

  describe('release', () => {
    it('should release the lock and remove the listener', async () => {
      const removeSpy = vi.spyOn(document, 'removeEventListener');
      const handle = await acquire();

      await handle.release();

      expect(nthSentinel(0).release).toHaveBeenCalled();
      expect(removeSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
      expect(handle.active).toBe(false);
    });

    it('should be safe to call multiple times', async () => {
      const handle = await acquire();

      await handle.release();
      await handle.release();
      await handle.release();

      // Second and third calls see an already-released sentinel and skip it.
      expect(nthSentinel(0).release).toHaveBeenCalledTimes(1);
    });

    it('should swallow errors from sentinel.release (best-effort)', async () => {
      const handle = await acquire();
      nthSentinel(0).release = vi.fn().mockRejectedValue(new Error('release failed'));

      await expect(handle.release()).resolves.toBeUndefined();
    });

    it('should not touch the listener when reacquireOnVisible is false', async () => {
      const removeSpy = vi.spyOn(document, 'removeEventListener');
      const handle = await acquire({ reacquireOnVisible: false });

      await handle.release();

      expect(removeSpy).not.toHaveBeenCalledWith('visibilitychange', expect.any(Function));
      expect(nthSentinel(0).release).toHaveBeenCalled();
    });

    it('should skip release when the lock was already released', async () => {
      const handle = await acquire();

      nthSentinel(0).released = true;
      await handle.release();

      expect(nthSentinel(0).release).not.toHaveBeenCalled();
    });

    it('should discard a lock acquired after manual release (in-flight race)', async () => {
      const handle = await acquire();

      // Browser released the first lock; a re-acquisition is about to start.
      nthSentinel(0).released = true;

      // Make the next request hang until we resolve it manually.
      const lateSentinel = createSentinel();
      let resolveRequest: (sentinel: MockSentinel) => void = () => {};
      requestMock.mockReturnValueOnce(
        new Promise<MockSentinel>((resolve) => {
          resolveRequest = resolve;
        })
      );

      setVisibility('visible');
      document.dispatchEvent(new Event('visibilitychange'));
      await flush();

      // Release before the in-flight re-acquisition resolves.
      await handle.release();

      // The re-acquisition now resolves with a fresh lock that must be discarded.
      resolveRequest(lateSentinel);
      await flush();

      expect(lateSentinel.release).toHaveBeenCalled();
      expect(handle.active).toBe(false);
    });
  });

  // =========================================================================
  // Result integration
  // =========================================================================

  describe('Result integration', () => {
    it('should work with Result.match on success', async () => {
      const result = await WakeLock.request();
      handles.push(Result.unwrap(result));

      const message = Result.match(result, {
        ok: () => 'locked',
        err: (e) => `failed: ${e.code}`,
      });

      expect(message).toBe('locked');
    });

    it('should work with Result.match on error', async () => {
      Reflect.deleteProperty(navigator as unknown as Record<string, unknown>, 'wakeLock');

      const result = await WakeLock.request();

      const message = Result.match(result, {
        ok: () => 'locked',
        err: (e) => `failed: ${e.code}`,
      });

      expect(message).toBe('failed: WAKE_LOCK_NOT_SUPPORTED');
    });
  });
});
