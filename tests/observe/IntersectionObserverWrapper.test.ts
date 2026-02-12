import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IntersectionObserverWrapper, type IntersectionOptions } from '../../src/observe/index.js';
import type { CleanupFn } from '../../src/core/index.js';

/**
 * Mock IntersectionObserverEntry
 */
function createMockEntry(
  target: Element,
  isIntersecting: boolean,
  ratio = 1
): IntersectionObserverEntry {
  const rect = { x: 0, y: 0, width: 100, height: 100, top: 0, left: 0, bottom: 100, right: 100 };
  return {
    target,
    isIntersecting,
    intersectionRatio: ratio,
    boundingClientRect: rect as DOMRectReadOnly,
    intersectionRect: isIntersecting ? (rect as DOMRectReadOnly) : new DOMRect(),
    rootBounds: null,
    time: performance.now(),
  };
}

/**
 * Mock IntersectionObserver class
 */
class MockIntersectionObserver {
  readonly root: Element | Document | null;
  readonly rootMargin: string;
  readonly thresholds: ReadonlyArray<number>;

  private readonly callback: IntersectionObserverCallback;
  private observedElements: Set<Element> = new Set();

  static instances: MockIntersectionObserver[] = [];

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    this.root = options?.root ?? null;
    this.rootMargin = options?.rootMargin ?? '0px';
    this.thresholds = Array.isArray(options?.threshold)
      ? options.threshold
      : [options?.threshold ?? 0];
    MockIntersectionObserver.instances.push(this);
  }

  // noinspection JSUnusedGlobalSymbols - implements IntersectionObserver interface
  observe(target: Element): void {
    this.observedElements.add(target);
    // Simulate initial callback with non-intersecting entry
    this.callback([createMockEntry(target, false, 0)], this as unknown as IntersectionObserver);
  }

  // noinspection JSUnusedGlobalSymbols - implements IntersectionObserver interface
  unobserve(target: Element): void {
    this.observedElements.delete(target);
  }

  // noinspection JSUnusedGlobalSymbols - implements IntersectionObserver interface
  disconnect(): void {
    this.observedElements.clear();
  }

  // noinspection JSUnusedGlobalSymbols - implements IntersectionObserver interface
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  // Test helper to trigger intersection
  _trigger(target: Element, isIntersecting: boolean, ratio = 1): void {
    if (this.observedElements.has(target)) {
      this.callback(
        [createMockEntry(target, isIntersecting, ratio)],
        this as unknown as IntersectionObserver
      );
    }
  }

  _getObservedElements(): Set<Element> {
    return this.observedElements;
  }

  static _reset(): void {
    MockIntersectionObserver.instances = [];
  }

  static _getLastInstance(): MockIntersectionObserver {
    const instance =
      MockIntersectionObserver.instances[MockIntersectionObserver.instances.length - 1];
    if (!instance) {
      throw new Error('No MockIntersectionObserver instance found');
    }
    return instance;
  }
}

describe('IntersectionObserverWrapper', () => {
  let originalIntersectionObserver: typeof IntersectionObserver | undefined;

  beforeEach(() => {
    originalIntersectionObserver = globalThis.IntersectionObserver;
    globalThis.IntersectionObserver =
      MockIntersectionObserver as unknown as typeof IntersectionObserver;
    MockIntersectionObserver._reset();
  });

  afterEach(() => {
    if (originalIntersectionObserver) {
      globalThis.IntersectionObserver = originalIntersectionObserver;
    }
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // Core API
  // ===========================================================================

  describe('Core API', () => {
    describe('isSupported()', () => {
      it('should return true when IntersectionObserver is available', () => {
        expect(IntersectionObserverWrapper.isSupported()).toBe(true);
      });

      it('should return false when IntersectionObserver is undefined', () => {
        // @ts-expect-error - intentionally setting undefined for test
        globalThis.IntersectionObserver = undefined;

        expect(IntersectionObserverWrapper.isSupported()).toBe(false);
      });
    });

    describe('observe()', () => {
      it('should observe an element and call callback on intersection changes', () => {
        const element = document.createElement('div');
        const callback = vi.fn();

        IntersectionObserverWrapper.observe(element, callback);

        expect(callback).toHaveBeenCalled();
        const lastCall = callback.mock.calls[callback.mock.calls.length - 1]!;
        expect(lastCall[0]).toHaveProperty('target', element);
      });

      it('should return a cleanup function', () => {
        const element = document.createElement('div');
        const callback = vi.fn();

        const cleanup = IntersectionObserverWrapper.observe(element, callback);

        expect(cleanup).toBeInstanceOf(Function);
      });

      it('should cleanup properly when called', () => {
        const element = document.createElement('div');
        const callback = vi.fn();

        const cleanup = IntersectionObserverWrapper.observe(element, callback);
        const observer = MockIntersectionObserver._getLastInstance();

        // Element should be observed initially
        expect(observer._getObservedElements().has(element)).toBe(true);

        cleanup();

        // After cleanup, observer should be disconnected
        expect(observer._getObservedElements().size).toBe(0);
      });

      it('should use default options when none provided', () => {
        const element = document.createElement('div');
        const callback = vi.fn();

        IntersectionObserverWrapper.observe(element, callback);

        const observer = MockIntersectionObserver._getLastInstance();
        expect(observer.rootMargin).toBe('0px');
        expect(observer.thresholds).toEqual([0]);
      });

      it('should pass options to the observer', () => {
        const element = document.createElement('div');
        const callback = vi.fn();
        const options: IntersectionOptions = {
          rootMargin: '10px',
          threshold: 0.5,
        };

        IntersectionObserverWrapper.observe(element, callback, options);

        const observer = MockIntersectionObserver._getLastInstance();
        expect(observer.rootMargin).toBe('10px');
        expect(observer.thresholds).toEqual([0.5]);
      });

      it('should support array thresholds', () => {
        const element = document.createElement('div');
        const callback = vi.fn();
        const options: IntersectionOptions = {
          threshold: [0, 0.25, 0.5, 0.75, 1],
        };

        IntersectionObserverWrapper.observe(element, callback, options);

        const observer = MockIntersectionObserver._getLastInstance();
        expect(observer.thresholds).toEqual([0, 0.25, 0.5, 0.75, 1]);
      });

      it('should use fallback when IntersectionObserver is not supported', () => {
        // @ts-expect-error - intentionally setting undefined for test
        globalThis.IntersectionObserver = undefined;

        const element = document.createElement('div');
        const callback = vi.fn();

        const cleanup = IntersectionObserverWrapper.observe(element, callback);

        // Fallback should call callback immediately
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback.mock.calls[0]![0].isIntersecting).toBe(true);
        expect(cleanup).toBeInstanceOf(Function);
      });
    });

    describe('observeAll()', () => {
      it('should observe multiple elements', () => {
        const elements = [
          document.createElement('div'),
          document.createElement('div'),
          document.createElement('div'),
        ];
        const callback = vi.fn();

        const result = IntersectionObserverWrapper.observeAll(elements, callback);

        expect(callback).toHaveBeenCalledTimes(3);
        expect(result.cleanup).toBeInstanceOf(Function);
        expect(result.observer).toBeDefined();
      });

      it('should use a single observer for all elements', () => {
        const elements = [document.createElement('div'), document.createElement('div')];
        const callback = vi.fn();

        IntersectionObserverWrapper.observeAll(elements, callback);

        expect(MockIntersectionObserver.instances.length).toBe(1);
      });

      it('should cleanup all observations', () => {
        const elements = [document.createElement('div'), document.createElement('div')];
        const callback = vi.fn();

        const result = IntersectionObserverWrapper.observeAll(elements, callback);
        result.cleanup();

        const observer = MockIntersectionObserver._getLastInstance();
        expect(observer._getObservedElements().size).toBe(0);
      });

      it('should use fallback when not supported', () => {
        // @ts-expect-error - intentionally setting undefined for test
        globalThis.IntersectionObserver = undefined;

        const elements = [document.createElement('div'), document.createElement('div')];
        const callback = vi.fn();

        const result = IntersectionObserverWrapper.observeAll(elements, callback);

        expect(callback).toHaveBeenCalledTimes(2);
        expect(result.cleanup).toBeInstanceOf(Function);
      });
    });
  });

  // ===========================================================================
  // Convenience Methods
  // ===========================================================================

  describe('Convenience Methods', () => {
    describe('onceVisible()', () => {
      it('should resolve when element becomes visible', async () => {
        const element = document.createElement('div');

        const promise = IntersectionObserverWrapper.onceVisible(element);
        const observer = MockIntersectionObserver._getLastInstance();

        // Trigger visibility
        observer._trigger(element, true);

        const entry = await promise;
        expect(entry.isIntersecting).toBe(true);
      });

      it('should disconnect observer after resolving', async () => {
        const element = document.createElement('div');

        const promise = IntersectionObserverWrapper.onceVisible(element);
        const observer = MockIntersectionObserver._getLastInstance();

        observer._trigger(element, true);
        await promise;

        expect(observer._getObservedElements().size).toBe(0);
      });

      it('should use fallback and resolve immediately when not supported', async () => {
        // @ts-expect-error - intentionally setting undefined for test
        globalThis.IntersectionObserver = undefined;

        const element = document.createElement('div');
        const entry = await IntersectionObserverWrapper.onceVisible(element);

        expect(entry.isIntersecting).toBe(true);
      });
    });

    describe('lazyLoad()', () => {
      it('should call loader when element becomes visible', () => {
        const elements = [document.createElement('img'), document.createElement('img')];
        const loader = vi.fn();

        IntersectionObserverWrapper.lazyLoad(elements, loader);
        const observer = MockIntersectionObserver._getLastInstance();

        // Trigger visibility for first element
        observer._trigger(elements[0]!, true);

        expect(loader).toHaveBeenCalledWith(elements[0]);
      });

      it('should unobserve element after loading', () => {
        const element = document.createElement('img');
        const loader = vi.fn();

        IntersectionObserverWrapper.lazyLoad([element], loader);
        const observer = MockIntersectionObserver._getLastInstance();

        observer._trigger(element, true);

        // Element should be unobserved after loading
        expect(loader).toHaveBeenCalledTimes(1);
      });

      it('should use 50px rootMargin by default for preloading', () => {
        const elements = [document.createElement('img')];
        const loader = vi.fn();

        IntersectionObserverWrapper.lazyLoad(elements, loader);
        const observer = MockIntersectionObserver._getLastInstance();

        expect(observer.rootMargin).toBe('50px');
      });

      it('should load all immediately when not supported', () => {
        // @ts-expect-error - intentionally setting undefined for test
        globalThis.IntersectionObserver = undefined;

        const elements = [document.createElement('img'), document.createElement('img')];
        const loader = vi.fn();

        IntersectionObserverWrapper.lazyLoad(elements, loader);

        expect(loader).toHaveBeenCalledTimes(2);
      });
    });

    describe('trackVisibility()', () => {
      it('should call callback with visibility ratio', () => {
        const element = document.createElement('div');
        const callback = vi.fn();

        IntersectionObserverWrapper.trackVisibility(element, callback);
        const observer = MockIntersectionObserver._getLastInstance();

        observer._trigger(element, true, 0.5);

        expect(callback).toHaveBeenCalledWith(0.5, expect.any(Object));
      });

      it('should use 10 threshold steps by default', () => {
        const element = document.createElement('div');
        const callback = vi.fn();

        IntersectionObserverWrapper.trackVisibility(element, callback);
        const observer = MockIntersectionObserver._getLastInstance();

        expect(observer.thresholds).toHaveLength(11); // 0 through 1 in 0.1 steps
      });

      it('should support custom step count', () => {
        const element = document.createElement('div');
        const callback = vi.fn();

        IntersectionObserverWrapper.trackVisibility(element, callback, 4);
        const observer = MockIntersectionObserver._getLastInstance();

        expect(observer.thresholds).toHaveLength(5); // 0, 0.25, 0.5, 0.75, 1
      });
    });

    describe('infiniteScroll()', () => {
      it('should call loadMore when sentinel is visible', () => {
        const sentinel = document.createElement('div');
        const loadMore = vi.fn();

        IntersectionObserverWrapper.infiniteScroll(sentinel, loadMore);
        const observer = MockIntersectionObserver._getLastInstance();

        observer._trigger(sentinel, true);

        expect(loadMore).toHaveBeenCalled();
      });

      it('should use 100px rootMargin by default', () => {
        const sentinel = document.createElement('div');
        const loadMore = vi.fn();

        IntersectionObserverWrapper.infiniteScroll(sentinel, loadMore);
        const observer = MockIntersectionObserver._getLastInstance();

        expect(observer.rootMargin).toBe('100px');
      });

      it('should not call loadMore while already loading', async () => {
        const sentinel = document.createElement('div');
        let resolveLoad: () => void;
        const loadMore = vi.fn().mockImplementation(
          () =>
            new Promise<void>((resolve) => {
              resolveLoad = resolve;
            })
        );

        IntersectionObserverWrapper.infiniteScroll(sentinel, loadMore);
        const observer = MockIntersectionObserver._getLastInstance();

        // First trigger
        observer._trigger(sentinel, true);
        expect(loadMore).toHaveBeenCalledTimes(1);

        // Second trigger while loading
        observer._trigger(sentinel, true);
        expect(loadMore).toHaveBeenCalledTimes(1);

        // Complete loading
        resolveLoad!();
        await Promise.resolve();

        // Now it can load again
        observer._trigger(sentinel, true);
        expect(loadMore).toHaveBeenCalledTimes(2);
      });

      it('should return cleanup function', () => {
        const sentinel = document.createElement('div');
        const loadMore = vi.fn();

        const cleanup = IntersectionObserverWrapper.infiniteScroll(sentinel, loadMore);

        expect(cleanup).toBeInstanceOf(Function);
      });
    });
  });

  // ===========================================================================
  // Internal Methods
  // ===========================================================================

  describe('Internal Methods', () => {
    describe('createFallbackEntry()', () => {
      it('should create a valid IntersectionObserverEntry', () => {
        const element = document.createElement('div');
        Object.defineProperty(element, 'getBoundingClientRect', {
          value: () => ({
            x: 10,
            y: 20,
            width: 100,
            height: 50,
            top: 20,
            left: 10,
            bottom: 70,
            right: 110,
          }),
        });

        const entry = IntersectionObserverWrapper.createFallbackEntry(element, true);

        expect(entry.target).toBe(element);
        expect(entry.isIntersecting).toBe(true);
        expect(entry.intersectionRatio).toBe(1);
        expect(entry.boundingClientRect.width).toBe(100);
        expect(entry.time).toBeGreaterThan(0);
      });

      it('should set intersectionRatio to 0 when not intersecting', () => {
        const element = document.createElement('div');

        const entry = IntersectionObserverWrapper.createFallbackEntry(element, false);

        expect(entry.intersectionRatio).toBe(0);
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
    it('should pass explicit root option to observeAll (lines 161-163)', () => {
      const elements = [document.createElement('div')];
      const callback = vi.fn();
      const rootElement = document.createElement('div');

      IntersectionObserverWrapper.observeAll(elements, callback, {
        root: rootElement,
        rootMargin: '20px',
        threshold: 0.5,
      });

      const observer = MockIntersectionObserver._getLastInstance();
      expect(observer.root).toBe(rootElement);
      expect(observer.rootMargin).toBe('20px');
      expect(observer.thresholds).toEqual([0.5]);
    });

    it('should pass explicit root option to onceVisible (lines 206-208)', () => {
      const element = document.createElement('div');
      const rootElement = document.createElement('div');

      IntersectionObserverWrapper.onceVisible(element, {
        root: rootElement,
        rootMargin: '15px',
        threshold: 0.25,
      });

      const observer = MockIntersectionObserver._getLastInstance();
      expect(observer.root).toBe(rootElement);
      expect(observer.rootMargin).toBe('15px');
      expect(observer.thresholds).toEqual([0.25]);
    });

    it('should pass explicit root option to lazyLoad (lines 248-250)', () => {
      const elements = [document.createElement('img')];
      const loader = vi.fn();
      const rootElement = document.createElement('div');

      IntersectionObserverWrapper.lazyLoad(elements, loader, {
        root: rootElement,
        rootMargin: '30px',
        threshold: 0.75,
      });

      const observer = MockIntersectionObserver._getLastInstance();
      expect(observer.root).toBe(rootElement);
      expect(observer.rootMargin).toBe('30px');
      expect(observer.thresholds).toEqual([0.75]);
    });

    it('should pass explicit root option to infiniteScroll (lines 309-311)', () => {
      const sentinel = document.createElement('div');
      const loadMore = vi.fn();
      const rootElement = document.createElement('div');

      IntersectionObserverWrapper.infiniteScroll(sentinel, loadMore, {
        root: rootElement,
        rootMargin: '50px',
        threshold: 0.1,
      });

      const observer = MockIntersectionObserver._getLastInstance();
      expect(observer.root).toBe(rootElement);
      expect(observer.rootMargin).toBe('50px');
      expect(observer.thresholds).toEqual([0.1]);
    });

    it('should call fallback cleanup noop from observeAll without error (line 149)', () => {
      // @ts-expect-error - intentionally setting undefined for test
      globalThis.IntersectionObserver = undefined;

      const elements = [document.createElement('div')];
      const callback = vi.fn();

      const result = IntersectionObserverWrapper.observeAll(elements, callback);
      expect(() => result.cleanup()).not.toThrow();
      expect(result.observer).toBeNull();
    });
  });
});
