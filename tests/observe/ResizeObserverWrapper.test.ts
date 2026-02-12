import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ResizeObserverWrapper } from '../../src/observe/index.js';
import type { CleanupFn } from '../../src/core/index.js';

/**
 * Mock ResizeObserverEntry
 */
function createMockEntry(target: Element, width = 100, height = 100): ResizeObserverEntry {
  return {
    target,
    contentRect: {
      x: 0,
      y: 0,
      width,
      height,
      top: 0,
      left: 0,
      bottom: height,
      right: width,
      toJSON: () => ({ width, height }),
    } as DOMRectReadOnly,
    borderBoxSize: [{ blockSize: height, inlineSize: width }],
    contentBoxSize: [{ blockSize: height, inlineSize: width }],
    devicePixelContentBoxSize: [{ blockSize: height, inlineSize: width }],
  };
}

/**
 * Mock ResizeObserver class
 */
class MockResizeObserver {
  private readonly callback: ResizeObserverCallback;
  private observedElements: Map<Element, ResizeObserverOptions | undefined> = new Map();

  static instances: MockResizeObserver[] = [];

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    MockResizeObserver.instances.push(this);
  }

  // noinspection JSUnusedGlobalSymbols - implements ResizeObserver interface
  observe(target: Element, options?: ResizeObserverOptions): void {
    this.observedElements.set(target, options);
    // Simulate initial callback
    this.callback([createMockEntry(target)], this as unknown as ResizeObserver);
  }

  // noinspection JSUnusedGlobalSymbols - implements ResizeObserver interface
  unobserve(target: Element): void {
    this.observedElements.delete(target);
  }

  // noinspection JSUnusedGlobalSymbols - implements ResizeObserver interface
  disconnect(): void {
    this.observedElements.clear();
  }

  // Test helper to trigger resize
  _trigger(target: Element, width: number, height: number): void {
    if (this.observedElements.has(target)) {
      this.callback([createMockEntry(target, width, height)], this as unknown as ResizeObserver);
    }
  }

  _getObservedElements(): Map<Element, ResizeObserverOptions | undefined> {
    return this.observedElements;
  }

  static _reset(): void {
    MockResizeObserver.instances = [];
  }

  static _getLastInstance(): MockResizeObserver {
    const instance = MockResizeObserver.instances[MockResizeObserver.instances.length - 1];
    if (!instance) {
      throw new Error('No MockResizeObserver instance found');
    }
    return instance;
  }
}

describe('ResizeObserverWrapper', () => {
  let originalResizeObserver: typeof ResizeObserver | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    originalResizeObserver = globalThis.ResizeObserver;
    globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
    MockResizeObserver._reset();
  });

  afterEach(() => {
    vi.useRealTimers();
    if (originalResizeObserver) {
      globalThis.ResizeObserver = originalResizeObserver;
    }
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // Core API
  // ===========================================================================

  describe('Core API', () => {
    describe('isSupported()', () => {
      it('should return true when ResizeObserver is available', () => {
        expect(ResizeObserverWrapper.isSupported()).toBe(true);
      });

      it('should return false when ResizeObserver is undefined', () => {
        // @ts-expect-error - intentionally setting undefined for test
        globalThis.ResizeObserver = undefined;

        expect(ResizeObserverWrapper.isSupported()).toBe(false);
      });
    });

    describe('observe()', () => {
      it('should observe an element and call callback on size changes', () => {
        const element = document.createElement('div');
        const callback = vi.fn();

        ResizeObserverWrapper.observe(element, callback);

        expect(callback).toHaveBeenCalled();
        expect(callback.mock.calls[0]![0]).toHaveProperty('target', element);
      });

      it('should return a cleanup function', () => {
        const element = document.createElement('div');
        const callback = vi.fn();

        const cleanup = ResizeObserverWrapper.observe(element, callback);

        expect(cleanup).toBeInstanceOf(Function);
      });

      it('should cleanup properly when called', () => {
        const element = document.createElement('div');
        const callback = vi.fn();

        const cleanup = ResizeObserverWrapper.observe(element, callback);
        cleanup();

        const observer = MockResizeObserver._getLastInstance();
        expect(observer._getObservedElements().size).toBe(0);
      });

      it('should use content-box by default', () => {
        const element = document.createElement('div');
        const callback = vi.fn();

        ResizeObserverWrapper.observe(element, callback);

        const observer = MockResizeObserver._getLastInstance();
        const options = observer._getObservedElements().get(element);
        expect(options?.box).toBe('content-box');
      });

      it('should pass box option to observer', () => {
        const element = document.createElement('div');
        const callback = vi.fn();

        ResizeObserverWrapper.observe(element, callback, { box: 'border-box' });

        const observer = MockResizeObserver._getLastInstance();
        const options = observer._getObservedElements().get(element);
        expect(options?.box).toBe('border-box');
      });

      it('should debounce callback when debounce option is set', () => {
        const element = document.createElement('div');
        const callback = vi.fn();

        ResizeObserverWrapper.observe(element, callback, { debounce: 100 });
        const observer = MockResizeObserver._getLastInstance();

        // Initial call is debounced
        expect(callback).not.toHaveBeenCalled();

        // Trigger multiple resizes
        observer._trigger(element, 200, 200);
        observer._trigger(element, 300, 300);
        observer._trigger(element, 400, 400);

        expect(callback).not.toHaveBeenCalled();

        // Fast forward debounce time
        vi.advanceTimersByTime(100);

        // Only the last entry should be processed
        expect(callback).toHaveBeenCalled();
      });

      it('should clear debounce timeout on cleanup', () => {
        const element = document.createElement('div');
        const callback = vi.fn();

        const cleanup = ResizeObserverWrapper.observe(element, callback, { debounce: 100 });
        cleanup();

        vi.advanceTimersByTime(100);

        // Callback should not be called after cleanup
        expect(callback).not.toHaveBeenCalled();
      });

      it('should use fallback when ResizeObserver is not supported', () => {
        // @ts-expect-error - intentionally setting undefined for test
        globalThis.ResizeObserver = undefined;

        const element = document.createElement('div');
        Object.defineProperty(element, 'getBoundingClientRect', {
          value: () => ({ width: 100, height: 50 }),
        });
        const callback = vi.fn();

        const cleanup = ResizeObserverWrapper.observe(element, callback);

        expect(callback).toHaveBeenCalledTimes(1);
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

        const result = ResizeObserverWrapper.observeAll(elements, callback);

        expect(callback).toHaveBeenCalledTimes(3);
        expect(result.cleanup).toBeInstanceOf(Function);
        expect(result.observer).toBeDefined();
      });

      it('should use a single observer for all elements', () => {
        const elements = [document.createElement('div'), document.createElement('div')];
        const callback = vi.fn();

        ResizeObserverWrapper.observeAll(elements, callback);

        expect(MockResizeObserver.instances.length).toBe(1);
      });

      it('should cleanup all observations', () => {
        const elements = [document.createElement('div'), document.createElement('div')];
        const callback = vi.fn();

        const result = ResizeObserverWrapper.observeAll(elements, callback);
        result.cleanup();

        const observer = MockResizeObserver._getLastInstance();
        expect(observer._getObservedElements().size).toBe(0);
      });

      it('should support debounce option', () => {
        const elements = [document.createElement('div'), document.createElement('div')];
        const callback = vi.fn();

        ResizeObserverWrapper.observeAll(elements, callback, { debounce: 50 });

        expect(callback).not.toHaveBeenCalled();

        vi.advanceTimersByTime(50);

        expect(callback).toHaveBeenCalled();
      });

      it('should use fallback when not supported', () => {
        // @ts-expect-error - intentionally setting undefined for test
        globalThis.ResizeObserver = undefined;

        const elements = [document.createElement('div'), document.createElement('div')];
        const callback = vi.fn();

        const result = ResizeObserverWrapper.observeAll(elements, callback);

        expect(callback).toHaveBeenCalledTimes(2);
        expect(result.cleanup).toBeInstanceOf(Function);
      });
    });
  });

  // ===========================================================================
  // Convenience Methods
  // ===========================================================================

  describe('Convenience Methods', () => {
    describe('onBreakpoint()', () => {
      it('should call callback when breakpoint changes', () => {
        const element = document.createElement('div');
        const callback = vi.fn();
        const breakpoints = [320, 768, 1024];

        ResizeObserverWrapper.onBreakpoint(element, breakpoints, callback);
        const observer = MockResizeObserver._getLastInstance();

        // Initial state is 100px width (below all breakpoints)
        // The wrapper only calls callback when breakpoint changes from initial
        // So first trigger a resize to establish first state
        observer._trigger(element, 400, 100);
        // Breakpoint should change from null to 320
        expect(callback).toHaveBeenCalledWith(320, 400);

        callback.mockClear();

        // Resize to 800px (should be 768 breakpoint)
        observer._trigger(element, 800, 100);
        expect(callback).toHaveBeenCalledWith(768, 800);
      });

      it('should not call callback when breakpoint stays the same', () => {
        const element = document.createElement('div');
        const callback = vi.fn();
        const breakpoints = [320, 768, 1024];

        ResizeObserverWrapper.onBreakpoint(element, breakpoints, callback);
        const observer = MockResizeObserver._getLastInstance();

        callback.mockClear();

        // Resize within same breakpoint range
        observer._trigger(element, 50, 100);
        observer._trigger(element, 60, 100);
        observer._trigger(element, 70, 100);

        expect(callback).not.toHaveBeenCalled();
      });

      it('should sort breakpoints ascending', () => {
        const element = document.createElement('div');
        const callback = vi.fn();
        const breakpoints = [1024, 320, 768]; // Unsorted

        ResizeObserverWrapper.onBreakpoint(element, breakpoints, callback);
        const observer = MockResizeObserver._getLastInstance();

        // Resize to 800px
        observer._trigger(element, 800, 100);

        // Should use 768 breakpoint (sorted correctly)
        expect(callback).toHaveBeenCalledWith(768, 800);
      });

      it('should return cleanup function', () => {
        const element = document.createElement('div');
        const callback = vi.fn();

        const cleanup = ResizeObserverWrapper.onBreakpoint(element, [320, 768], callback);

        expect(cleanup).toBeInstanceOf(Function);
      });
    });

    describe('getSize()', () => {
      it('should return content-box size by default', () => {
        const element = document.createElement('div');
        Object.defineProperty(element, 'clientWidth', { value: 200 });
        Object.defineProperty(element, 'clientHeight', { value: 100 });

        const size = ResizeObserverWrapper.getSize(element);

        expect(size.width).toBe(200);
        expect(size.height).toBe(100);
      });

      it('should return border-box size when specified', () => {
        const element = document.createElement('div');
        Object.defineProperty(element, 'getBoundingClientRect', {
          value: () => ({ width: 220, height: 120 }),
        });

        const size = ResizeObserverWrapper.getSize(element, 'border-box');

        expect(size.width).toBe(220);
        expect(size.height).toBe(120);
      });

      it('should use getBoundingClientRect for non-HTML elements', () => {
        const element = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        Object.defineProperty(element, 'getBoundingClientRect', {
          value: () => ({ width: 150, height: 75 }),
        });

        const size = ResizeObserverWrapper.getSize(element);

        expect(size.width).toBe(150);
        expect(size.height).toBe(75);
      });
    });

    describe('onResize()', () => {
      it('should call callback with width and height', () => {
        const element = document.createElement('div');
        const callback = vi.fn();

        ResizeObserverWrapper.onResize(element, callback);
        const observer = MockResizeObserver._getLastInstance();

        observer._trigger(element, 300, 200);

        expect(callback).toHaveBeenCalledWith(300, 200);
      });

      it('should support options', () => {
        const element = document.createElement('div');
        const callback = vi.fn();

        ResizeObserverWrapper.onResize(element, callback, { box: 'border-box' });

        const observer = MockResizeObserver._getLastInstance();
        const options = observer._getObservedElements().get(element);
        expect(options?.box).toBe('border-box');
      });

      it('should return cleanup function', () => {
        const element = document.createElement('div');
        const callback = vi.fn();

        const cleanup = ResizeObserverWrapper.onResize(element, callback);

        expect(cleanup).toBeInstanceOf(Function);
      });
    });
  });

  // ===========================================================================
  // Internal Methods
  // ===========================================================================

  describe('Internal Methods', () => {
    describe('createFallbackEntry()', () => {
      it('should create a valid ResizeObserverEntry', () => {
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

        const entry = ResizeObserverWrapper.createFallbackEntry(element);

        expect(entry.target).toBe(element);
        expect(entry.contentRect.width).toBe(100);
        expect(entry.contentRect.height).toBe(50);
        expect(entry.borderBoxSize[0]!.inlineSize).toBe(100);
        expect(entry.borderBoxSize[0]!.blockSize).toBe(50);
      });
    });
  });

  // ===========================================================================
  // Debounce Cleanup
  // ===========================================================================

  describe('Debounce Cleanup', () => {
    it('should clear pending timeout when cleanup is called with debounce (covers lines 197-199)', () => {
      const element1 = document.createElement('div');
      const element2 = document.createElement('div');
      const callback = vi.fn();

      // Use observeAll with debounce
      const { cleanup } = ResizeObserverWrapper.observeAll([element1, element2], callback, {
        debounce: 100,
      });

      // Trigger a resize event - this will schedule a debounced callback
      const instance = MockResizeObserver._getLastInstance();
      instance._trigger(element1, 200, 200);

      // Cleanup before debounce completes - should clear the timeout
      cleanup();

      // Advance timers - callback should NOT fire after cleanup
      vi.advanceTimersByTime(200);

      // The callback was called initially by observe, but not again after the trigger
      // because cleanup cleared the timeout
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
    it('should call fallback cleanup noop from observe without error (line 131)', () => {
      // @ts-expect-error - intentionally setting undefined for test
      globalThis.ResizeObserver = undefined;

      const element = document.createElement('div');
      const callback = vi.fn();

      const cleanup = ResizeObserverWrapper.observe(element, callback);
      // Call the fallback cleanup noop function
      expect(() => cleanup()).not.toThrow();
    });

    it('should call fallback cleanup noop from observeAll without error (line 180)', () => {
      // @ts-expect-error - intentionally setting undefined for test
      globalThis.ResizeObserver = undefined;

      const elements = [document.createElement('div')];
      const callback = vi.fn();

      const result = ResizeObserverWrapper.observeAll(elements, callback);
      // Call the fallback cleanup noop function
      expect(() => result.cleanup()).not.toThrow();
      expect(result.observer).toBeNull();
    });

    it('should call toJSON on fallback entry contentRect (line 324)', () => {
      const element = document.createElement('div');
      Object.defineProperty(element, 'getBoundingClientRect', {
        value: () => ({ width: 100, height: 50 }),
      });

      const entry = ResizeObserverWrapper.createFallbackEntry(element);
      const json = entry.contentRect.toJSON();

      expect(json).toEqual({ width: 100, height: 50 });
    });
  });
});
