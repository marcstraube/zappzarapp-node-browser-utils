import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VisibilityManager } from '../../src/visibility/index.js';
import type { CleanupFn } from '../../src/core/index.js';

describe('VisibilityManager', () => {
  let originalDocument: typeof document;
  let cleanupFunctions: CleanupFn[];

  // ===========================================================================
  // Setup and Teardown
  // ===========================================================================

  beforeEach(() => {
    cleanupFunctions = [];
    originalDocument = global.document;

    // Reset visibility state to visible
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    // Clean up all registered event handlers
    cleanupFunctions.forEach((cleanup) => cleanup());
    cleanupFunctions = [];

    vi.restoreAllMocks();
  });

  // ===========================================================================
  // isVisible
  // ===========================================================================

  describe('isVisible', () => {
    it('should return true when document is visible', () => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      });

      expect(VisibilityManager.isVisible()).toBe(true);
    });

    it('should return false when document is hidden', () => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        configurable: true,
      });

      expect(VisibilityManager.isVisible()).toBe(false);
    });

    it('should return false when document is undefined', () => {
      // @ts-expect-error - Testing undefined document
      global.document = undefined;

      expect(VisibilityManager.isVisible()).toBe(false);

      global.document = originalDocument;
    });
  });

  // ===========================================================================
  // isHidden
  // ===========================================================================

  describe('isHidden', () => {
    it('should return true when document is hidden', () => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        configurable: true,
      });

      expect(VisibilityManager.isHidden()).toBe(true);
    });

    it('should return false when document is visible', () => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      });

      expect(VisibilityManager.isHidden()).toBe(false);
    });

    it('should return true when document is undefined', () => {
      // @ts-expect-error - Testing undefined document
      global.document = undefined;

      expect(VisibilityManager.isHidden()).toBe(true);

      global.document = originalDocument;
    });
  });

  // ===========================================================================
  // getState
  // ===========================================================================

  describe('getState', () => {
    it('should return visible when document is visible', () => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      });

      expect(VisibilityManager.getState()).toBe('visible');
    });

    it('should return hidden when document is hidden', () => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        configurable: true,
      });

      expect(VisibilityManager.getState()).toBe('hidden');
    });

    it('should return hidden when document is undefined', () => {
      // @ts-expect-error - Testing undefined document
      global.document = undefined;

      expect(VisibilityManager.getState()).toBe('hidden');

      global.document = originalDocument;
    });
  });

  // ===========================================================================
  // onChange
  // ===========================================================================

  describe('onChange', () => {
    it('should register handler for visibilitychange event', () => {
      const handler = vi.fn();
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

      const cleanup = VisibilityManager.onChange(handler);
      cleanupFunctions.push(cleanup);

      expect(addEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    });

    it('should call handler with current visibility state when event fires', () => {
      const handler = vi.fn();
      const cleanup = VisibilityManager.onChange(handler);
      cleanupFunctions.push(cleanup);

      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        configurable: true,
      });

      const event = new Event('visibilitychange');
      document.dispatchEvent(event);

      expect(handler).toHaveBeenCalledWith('hidden');
    });

    it('should call handler with visible state when document becomes visible', () => {
      const handler = vi.fn();
      const cleanup = VisibilityManager.onChange(handler);
      cleanupFunctions.push(cleanup);

      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      });

      const event = new Event('visibilitychange');
      document.dispatchEvent(event);

      expect(handler).toHaveBeenCalledWith('visible');
    });

    it('should cleanup event listener when cleanup function is called', () => {
      const handler = vi.fn();
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      const cleanup = VisibilityManager.onChange(handler);
      cleanup();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    });

    it('should not call handler after cleanup', () => {
      const handler = vi.fn();

      const cleanup = VisibilityManager.onChange(handler);
      cleanup();

      const event = new Event('visibilitychange');
      document.dispatchEvent(event);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should return no-op function when document is undefined', () => {
      // @ts-expect-error - Testing undefined document
      global.document = undefined;

      const handler = vi.fn();
      const cleanup = VisibilityManager.onChange(handler);

      expect(typeof cleanup).toBe('function');
      expect(() => cleanup()).not.toThrow();

      global.document = originalDocument;
    });

    it('should handle multiple onChange handlers', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      const cleanup1 = VisibilityManager.onChange(handler1);
      const cleanup2 = VisibilityManager.onChange(handler2);
      cleanupFunctions.push(cleanup1, cleanup2);

      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        configurable: true,
      });

      const event = new Event('visibilitychange');
      document.dispatchEvent(event);

      expect(handler1).toHaveBeenCalledWith('hidden');
      expect(handler2).toHaveBeenCalledWith('hidden');
    });
  });

  // ===========================================================================
  // onVisible
  // ===========================================================================

  describe('onVisible', () => {
    it('should register handler for visibilitychange event', () => {
      const handler = vi.fn();
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

      const cleanup = VisibilityManager.onVisible(handler);
      cleanupFunctions.push(cleanup);

      expect(addEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    });

    it('should call handler when document becomes visible', () => {
      const handler = vi.fn();
      const cleanup = VisibilityManager.onVisible(handler);
      cleanupFunctions.push(cleanup);

      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      });

      const event = new Event('visibilitychange');
      document.dispatchEvent(event);

      expect(handler).toHaveBeenCalled();
    });

    it('should not call handler when document becomes hidden', () => {
      const handler = vi.fn();
      const cleanup = VisibilityManager.onVisible(handler);
      cleanupFunctions.push(cleanup);

      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        configurable: true,
      });

      const event = new Event('visibilitychange');
      document.dispatchEvent(event);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should cleanup event listener when cleanup function is called', () => {
      const handler = vi.fn();
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      const cleanup = VisibilityManager.onVisible(handler);
      cleanup();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    });

    it('should not call handler after cleanup', () => {
      const handler = vi.fn();

      const cleanup = VisibilityManager.onVisible(handler);
      cleanup();

      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      });

      const event = new Event('visibilitychange');
      document.dispatchEvent(event);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should return no-op function when document is undefined', () => {
      // @ts-expect-error - Testing undefined document
      global.document = undefined;

      const handler = vi.fn();
      const cleanup = VisibilityManager.onVisible(handler);

      expect(typeof cleanup).toBe('function');
      expect(() => cleanup()).not.toThrow();

      global.document = originalDocument;
    });

    it('should handle multiple onVisible handlers', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      const cleanup1 = VisibilityManager.onVisible(handler1);
      const cleanup2 = VisibilityManager.onVisible(handler2);
      cleanupFunctions.push(cleanup1, cleanup2);

      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      });

      const event = new Event('visibilitychange');
      document.dispatchEvent(event);

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // onHidden
  // ===========================================================================

  describe('onHidden', () => {
    it('should register handler for visibilitychange event', () => {
      const handler = vi.fn();
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

      const cleanup = VisibilityManager.onHidden(handler);
      cleanupFunctions.push(cleanup);

      expect(addEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    });

    it('should call handler when document becomes hidden', () => {
      const handler = vi.fn();
      const cleanup = VisibilityManager.onHidden(handler);
      cleanupFunctions.push(cleanup);

      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        configurable: true,
      });

      const event = new Event('visibilitychange');
      document.dispatchEvent(event);

      expect(handler).toHaveBeenCalled();
    });

    it('should not call handler when document becomes visible', () => {
      const handler = vi.fn();
      const cleanup = VisibilityManager.onHidden(handler);
      cleanupFunctions.push(cleanup);

      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      });

      const event = new Event('visibilitychange');
      document.dispatchEvent(event);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should cleanup event listener when cleanup function is called', () => {
      const handler = vi.fn();
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      const cleanup = VisibilityManager.onHidden(handler);
      cleanup();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    });

    it('should not call handler after cleanup', () => {
      const handler = vi.fn();

      const cleanup = VisibilityManager.onHidden(handler);
      cleanup();

      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        configurable: true,
      });

      const event = new Event('visibilitychange');
      document.dispatchEvent(event);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should return no-op function when document is undefined', () => {
      // @ts-expect-error - Testing undefined document
      global.document = undefined;

      const handler = vi.fn();
      const cleanup = VisibilityManager.onHidden(handler);

      expect(typeof cleanup).toBe('function');
      expect(() => cleanup()).not.toThrow();

      global.document = originalDocument;
    });

    it('should handle multiple onHidden handlers', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      const cleanup1 = VisibilityManager.onHidden(handler1);
      const cleanup2 = VisibilityManager.onHidden(handler2);
      cleanupFunctions.push(cleanup1, cleanup2);

      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        configurable: true,
      });

      const event = new Event('visibilitychange');
      document.dispatchEvent(event);

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle cleanup being called multiple times', () => {
      const handler = vi.fn();
      const cleanup = VisibilityManager.onChange(handler);

      expect(() => {
        cleanup();
        cleanup();
        cleanup();
      }).not.toThrow();
    });

    it('should handle rapid visibility changes', () => {
      const handler = vi.fn();
      const cleanup = VisibilityManager.onChange(handler);
      cleanupFunctions.push(cleanup);

      // Simulate rapid visibility changes
      for (let i = 0; i < 10; i++) {
        Object.defineProperty(document, 'visibilityState', {
          value: i % 2 === 0 ? 'hidden' : 'visible',
          configurable: true,
        });

        const event = new Event('visibilitychange');
        document.dispatchEvent(event);
      }

      expect(handler).toHaveBeenCalledTimes(10);
    });

    it('should correctly combine onChange, onVisible, and onHidden handlers', () => {
      const onChangeHandler = vi.fn();
      const onVisibleHandler = vi.fn();
      const onHiddenHandler = vi.fn();

      const cleanup1 = VisibilityManager.onChange(onChangeHandler);
      const cleanup2 = VisibilityManager.onVisible(onVisibleHandler);
      const cleanup3 = VisibilityManager.onHidden(onHiddenHandler);
      cleanupFunctions.push(cleanup1, cleanup2, cleanup3);

      // Trigger hidden state
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));

      expect(onChangeHandler).toHaveBeenCalledWith('hidden');
      expect(onHiddenHandler).toHaveBeenCalled();
      expect(onVisibleHandler).not.toHaveBeenCalled();

      // Reset mocks
      onChangeHandler.mockClear();
      onVisibleHandler.mockClear();
      onHiddenHandler.mockClear();

      // Trigger visible state
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));

      expect(onChangeHandler).toHaveBeenCalledWith('visible');
      expect(onVisibleHandler).toHaveBeenCalled();
      expect(onHiddenHandler).not.toHaveBeenCalled();
    });

    it('should work with const assertion type', () => {
      // Verify the VisibilityManager is a const object
      const manager = VisibilityManager;
      expect(typeof manager.isVisible).toBe('function');
      expect(typeof manager.isHidden).toBe('function');
      expect(typeof manager.getState).toBe('function');
      expect(typeof manager.onChange).toBe('function');
      expect(typeof manager.onVisible).toBe('function');
      expect(typeof manager.onHidden).toBe('function');
    });
  });

  // ===========================================================================
  // CleanupFn Type
  // ===========================================================================

  describe('CleanupFn Type', () => {
    it('should return CleanupFn from onChange', () => {
      const cleanup: CleanupFn = VisibilityManager.onChange(vi.fn());
      cleanupFunctions.push(cleanup);

      expect(typeof cleanup).toBe('function');
    });

    it('should return CleanupFn from onVisible', () => {
      const cleanup: CleanupFn = VisibilityManager.onVisible(vi.fn());
      cleanupFunctions.push(cleanup);

      expect(typeof cleanup).toBe('function');
    });

    it('should return CleanupFn from onHidden', () => {
      const cleanup: CleanupFn = VisibilityManager.onHidden(vi.fn());
      cleanupFunctions.push(cleanup);

      expect(typeof cleanup).toBe('function');
    });
  });
});
