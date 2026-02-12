import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ScrollUtils } from '../../src/scroll/index.js';

describe('ScrollUtils', () => {
  // Store original values
  let originalScrollY: number;
  let originalScrollX: number;
  let originalInnerWidth: number;
  let originalInnerHeight: number;
  let originalScrollTo: typeof window.scrollTo;
  let originalAddEventListener: typeof window.addEventListener;
  let originalRemoveEventListener: typeof window.removeEventListener;

  // Mock DOM elements
  let mockDocumentElement: {
    scrollHeight: number;
    scrollWidth: number;
    clientHeight: number;
    clientWidth: number;
  };

  let mockBody: {
    scrollHeight: number;
    style: CSSStyleDeclaration;
  };

  beforeEach(() => {
    // Save originals
    originalScrollY = window.scrollY;
    originalScrollX = window.scrollX;
    originalInnerWidth = window.innerWidth;
    originalInnerHeight = window.innerHeight;
    originalScrollTo = window.scrollTo;
    originalAddEventListener = window.addEventListener;
    originalRemoveEventListener = window.removeEventListener;

    // Mock window properties
    Object.defineProperty(window, 'scrollY', {
      value: 0,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(window, 'scrollX', {
      value: 0,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(window, 'pageYOffset', {
      value: 0,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(window, 'pageXOffset', {
      value: 0,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(window, 'innerWidth', {
      value: 1024,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(window, 'innerHeight', {
      value: 768,
      writable: true,
      configurable: true,
    });

    // Mock scrollTo
    window.scrollTo = vi.fn();

    // Mock document.documentElement
    mockDocumentElement = {
      scrollHeight: 2000,
      scrollWidth: 1500,
      clientHeight: 768,
      clientWidth: 1024,
    };

    Object.defineProperty(document, 'documentElement', {
      value: {
        ...document.documentElement,
        ...mockDocumentElement,
        style: {} as CSSStyleDeclaration,
      },
      writable: true,
      configurable: true,
    });

    // Mock document.body
    mockBody = {
      scrollHeight: 2000,
      style: {} as CSSStyleDeclaration,
    };

    Object.defineProperty(document, 'body', {
      value: {
        ...document.body,
        ...mockBody,
      },
      writable: true,
      configurable: true,
    });

    // Reset timers
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();

    // Restore originals
    Object.defineProperty(window, 'scrollY', {
      value: originalScrollY,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(window, 'scrollX', {
      value: originalScrollX,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(window, 'innerWidth', {
      value: originalInnerWidth,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(window, 'innerHeight', {
      value: originalInnerHeight,
      writable: true,
      configurable: true,
    });

    window.scrollTo = originalScrollTo;
    window.addEventListener = originalAddEventListener;
    window.removeEventListener = originalRemoveEventListener;
  });

  // ===========================================================================
  // scrollTo
  // ===========================================================================

  describe('scrollTo', () => {
    it('should call window.scrollTo with provided options', () => {
      ScrollUtils.scrollTo({ top: 100, left: 50 });

      expect(window.scrollTo).toHaveBeenCalledWith({
        top: 100,
        left: 50,
        behavior: 'auto',
      });
    });

    it('should use auto behavior by default', () => {
      ScrollUtils.scrollTo({ top: 200 });

      expect(window.scrollTo).toHaveBeenCalledWith({
        top: 200,
        left: undefined,
        behavior: 'auto',
      });
    });

    it('should use smooth behavior when specified', () => {
      ScrollUtils.scrollTo({ top: 300, behavior: 'smooth' });

      expect(window.scrollTo).toHaveBeenCalledWith({
        top: 300,
        left: undefined,
        behavior: 'smooth',
      });
    });

    it('should handle only left position', () => {
      ScrollUtils.scrollTo({ left: 100, behavior: 'smooth' });

      expect(window.scrollTo).toHaveBeenCalledWith({
        top: undefined,
        left: 100,
        behavior: 'smooth',
      });
    });

    it('should do nothing when window is undefined', () => {
      const originalWindow = global.window;
      // @ts-expect-error - Testing non-browser environment
      delete global.window;

      // Should not throw
      expect(() => ScrollUtils.scrollTo({ top: 100 })).not.toThrow();

      global.window = originalWindow;
    });
  });

  // ===========================================================================
  // scrollToTop
  // ===========================================================================

  describe('scrollToTop', () => {
    it('should scroll to top with default behavior', () => {
      ScrollUtils.scrollToTop();

      expect(window.scrollTo).toHaveBeenCalledWith({
        top: 0,
        left: undefined,
        behavior: 'auto',
      });
    });

    it('should scroll to top with smooth behavior', () => {
      ScrollUtils.scrollToTop({ behavior: 'smooth' });

      expect(window.scrollTo).toHaveBeenCalledWith({
        top: 0,
        left: undefined,
        behavior: 'smooth',
      });
    });

    it('should scroll to top without options', () => {
      ScrollUtils.scrollToTop();

      expect(window.scrollTo).toHaveBeenCalledWith({
        top: 0,
        left: undefined,
        behavior: 'auto',
      });
    });
  });

  // ===========================================================================
  // scrollToBottom
  // ===========================================================================

  describe('scrollToBottom', () => {
    it('should scroll to bottom of page', () => {
      ScrollUtils.scrollToBottom();

      expect(window.scrollTo).toHaveBeenCalledWith({
        top: 2000, // Max of body.scrollHeight and documentElement.scrollHeight
        left: undefined,
        behavior: 'auto',
      });
    });

    it('should scroll to bottom with smooth behavior', () => {
      ScrollUtils.scrollToBottom({ behavior: 'smooth' });

      expect(window.scrollTo).toHaveBeenCalledWith({
        top: 2000,
        left: undefined,
        behavior: 'smooth',
      });
    });

    it('should use the larger of body.scrollHeight and documentElement.scrollHeight', () => {
      Object.defineProperty(document, 'body', {
        value: {
          ...document.body,
          scrollHeight: 3000,
          style: {} as CSSStyleDeclaration,
        },
        writable: true,
        configurable: true,
      });

      ScrollUtils.scrollToBottom();

      expect(window.scrollTo).toHaveBeenCalledWith({
        top: 3000,
        left: undefined,
        behavior: 'auto',
      });
    });

    it('should do nothing when document is undefined', () => {
      const originalDocument = global.document;
      // @ts-expect-error - Testing non-browser environment
      delete global.document;

      // Should not throw
      expect(() => ScrollUtils.scrollToBottom()).not.toThrow();

      global.document = originalDocument;
    });
  });

  // ===========================================================================
  // scrollIntoView
  // ===========================================================================

  describe('scrollIntoView', () => {
    it('should call scrollIntoView on element with default options', () => {
      const mockElement = {
        scrollIntoView: vi.fn(),
        getBoundingClientRect: vi.fn(),
      } as unknown as Element;

      ScrollUtils.scrollIntoView(mockElement);

      expect(mockElement.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'auto',
        block: 'start',
        inline: 'nearest',
      });
    });

    it('should use custom behavior', () => {
      const mockElement = {
        scrollIntoView: vi.fn(),
      } as unknown as Element;

      ScrollUtils.scrollIntoView(mockElement, { behavior: 'smooth' });

      expect(mockElement.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
      });
    });

    it('should use custom block option', () => {
      const mockElement = {
        scrollIntoView: vi.fn(),
      } as unknown as Element;

      ScrollUtils.scrollIntoView(mockElement, { block: 'center' });

      expect(mockElement.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'auto',
        block: 'center',
        inline: 'nearest',
      });
    });

    it('should use custom inline option', () => {
      const mockElement = {
        scrollIntoView: vi.fn(),
      } as unknown as Element;

      ScrollUtils.scrollIntoView(mockElement, { inline: 'center' });

      expect(mockElement.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'auto',
        block: 'start',
        inline: 'center',
      });
    });

    it('should use all custom options', () => {
      const mockElement = {
        scrollIntoView: vi.fn(),
      } as unknown as Element;

      ScrollUtils.scrollIntoView(mockElement, {
        behavior: 'smooth',
        block: 'end',
        inline: 'start',
      });

      expect(mockElement.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'end',
        inline: 'start',
      });
    });
  });

  // ===========================================================================
  // scrollToElement
  // ===========================================================================

  describe('scrollToElement', () => {
    it('should return true and scroll when element exists', () => {
      const mockElement = {
        scrollIntoView: vi.fn(),
      } as unknown as Element;

      vi.spyOn(document, 'querySelector').mockReturnValue(mockElement);

      const result = ScrollUtils.scrollToElement('#my-element');

      expect(result).toBe(true);
      expect(mockElement.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'auto',
        block: 'start',
        inline: 'nearest',
      });
    });

    it('should return false when element does not exist', () => {
      vi.spyOn(document, 'querySelector').mockReturnValue(null);

      const result = ScrollUtils.scrollToElement('#nonexistent');

      expect(result).toBe(false);
    });

    it('should pass options to scrollIntoView', () => {
      const mockElement = {
        scrollIntoView: vi.fn(),
      } as unknown as Element;

      vi.spyOn(document, 'querySelector').mockReturnValue(mockElement);

      ScrollUtils.scrollToElement('.my-class', {
        behavior: 'smooth',
        block: 'center',
      });

      expect(mockElement.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    });

    it('should do nothing when document is undefined', () => {
      const originalDocument = global.document;
      // @ts-expect-error - Testing non-browser environment
      delete global.document;

      const result = ScrollUtils.scrollToElement('#element');

      expect(result).toBe(false);

      global.document = originalDocument;
    });
  });

  // ===========================================================================
  // lock and unlock
  // ===========================================================================

  describe('lock', () => {
    beforeEach(() => {
      // Reset body and html styles
      Object.defineProperty(document, 'body', {
        value: {
          style: {
            overflow: '',
            position: '',
            top: '',
            width: '',
            paddingRight: '',
          } as unknown as CSSStyleDeclaration,
          scrollHeight: 2000,
        },
        writable: true,
        configurable: true,
      });

      Object.defineProperty(document, 'documentElement', {
        value: {
          ...mockDocumentElement,
          style: {
            overflow: '',
          } as unknown as CSSStyleDeclaration,
          clientWidth: 1000,
        },
        writable: true,
        configurable: true,
      });
    });

    it('should apply lock styles to body and html', () => {
      Object.defineProperty(window, 'scrollY', {
        value: 100,
        writable: true,
        configurable: true,
      });

      ScrollUtils.lock();

      expect(document.body.style.overflow).toBe('hidden');
      expect(document.body.style.position).toBe('fixed');
      expect(document.body.style.top).toBe('-100px');
      expect(document.body.style.width).toBe('100%');
      expect(document.documentElement.style.overflow).toBe('hidden');
    });

    it('should add scrollbar compensation when scrollbar exists', () => {
      Object.defineProperty(window, 'innerWidth', {
        value: 1024,
        writable: true,
        configurable: true,
      });

      Object.defineProperty(document, 'documentElement', {
        value: {
          ...mockDocumentElement,
          style: {
            overflow: '',
          } as unknown as CSSStyleDeclaration,
          clientWidth: 1007, // 17px scrollbar
        },
        writable: true,
        configurable: true,
      });

      ScrollUtils.lock();

      expect(document.body.style.paddingRight).toBe('17px');
    });

    it('should not add padding when no scrollbar', () => {
      Object.defineProperty(window, 'innerWidth', {
        value: 1024,
        writable: true,
        configurable: true,
      });

      Object.defineProperty(document, 'documentElement', {
        value: {
          ...mockDocumentElement,
          style: {
            overflow: '',
          } as unknown as CSSStyleDeclaration,
          clientWidth: 1024, // No scrollbar
        },
        writable: true,
        configurable: true,
      });

      ScrollUtils.lock();

      expect(document.body.style.paddingRight).toBe('');
    });

    it('should return cleanup function that restores styles', () => {
      Object.defineProperty(document, 'body', {
        value: {
          style: {
            overflow: 'auto',
            position: 'relative',
            top: '10px',
            width: '90%',
            paddingRight: '',
          } as unknown as CSSStyleDeclaration,
          scrollHeight: 2000,
        },
        writable: true,
        configurable: true,
      });

      Object.defineProperty(document, 'documentElement', {
        value: {
          ...mockDocumentElement,
          style: {
            overflow: 'scroll',
          } as unknown as CSSStyleDeclaration,
          clientWidth: 1024,
        },
        writable: true,
        configurable: true,
      });

      Object.defineProperty(window, 'scrollY', {
        value: 200,
        writable: true,
        configurable: true,
      });

      const unlock = ScrollUtils.lock();

      // Verify lock applied
      expect(document.body.style.overflow).toBe('hidden');

      // Unlock
      unlock();

      // Verify original styles restored
      expect(document.body.style.overflow).toBe('auto');
      expect(document.body.style.position).toBe('relative');
      expect(document.body.style.top).toBe('10px');
      expect(document.body.style.width).toBe('90%');
      expect(document.body.style.paddingRight).toBe('');
      expect(document.documentElement.style.overflow).toBe('scroll');

      // Verify scroll position restored
      expect(window.scrollTo).toHaveBeenCalledWith(0, 200);
    });

    it('should return noop function when document is undefined', () => {
      const originalDocument = global.document;
      // @ts-expect-error - Testing non-browser environment
      delete global.document;

      const unlock = ScrollUtils.lock();

      // Should not throw
      expect(() => unlock()).not.toThrow();

      global.document = originalDocument;
    });
  });

  // ===========================================================================
  // getScrollPosition
  // ===========================================================================

  describe('getScrollPosition', () => {
    it('should return current scroll position', () => {
      Object.defineProperty(window, 'scrollX', {
        value: 100,
        writable: true,
        configurable: true,
      });

      Object.defineProperty(window, 'scrollY', {
        value: 200,
        writable: true,
        configurable: true,
      });

      const position = ScrollUtils.getScrollPosition();

      expect(position).toEqual({ x: 100, y: 200 });
    });

    it('should return zero values when window is undefined', () => {
      const originalWindow = global.window;
      // @ts-expect-error - Testing non-browser environment
      delete global.window;

      const position = ScrollUtils.getScrollPosition();

      expect(position).toEqual({ x: 0, y: 0 });

      global.window = originalWindow;
    });

    it('should fall back to pageXOffset/pageYOffset for older browsers', () => {
      // Simulate older browser where scrollX/scrollY might return undefined
      Object.defineProperty(window, 'scrollX', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      Object.defineProperty(window, 'scrollY', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      Object.defineProperty(window, 'pageXOffset', {
        value: 50,
        writable: true,
        configurable: true,
      });

      Object.defineProperty(window, 'pageYOffset', {
        value: 150,
        writable: true,
        configurable: true,
      });

      const position = ScrollUtils.getScrollPosition();

      expect(position).toEqual({ x: 50, y: 150 });
    });
  });

  // ===========================================================================
  // getScrollPercentage
  // ===========================================================================

  describe('getScrollPercentage', () => {
    it('should return scroll percentage', () => {
      Object.defineProperty(window, 'scrollX', {
        value: 238,
        writable: true,
        configurable: true,
      });

      Object.defineProperty(window, 'scrollY', {
        value: 616,
        writable: true,
        configurable: true,
      });

      Object.defineProperty(window, 'innerWidth', {
        value: 1024,
        writable: true,
        configurable: true,
      });

      Object.defineProperty(window, 'innerHeight', {
        value: 768,
        writable: true,
        configurable: true,
      });

      Object.defineProperty(document, 'documentElement', {
        value: {
          scrollWidth: 1500, // maxX = 1500 - 1024 = 476
          scrollHeight: 2000, // maxY = 2000 - 768 = 1232
          clientHeight: 768,
          clientWidth: 1024,
          style: {},
        },
        writable: true,
        configurable: true,
      });

      const percentage = ScrollUtils.getScrollPercentage();

      // x: (238 / 476) * 100 = 50
      // y: (616 / 1232) * 100 = 50
      expect(percentage.x).toBe(50);
      expect(percentage.y).toBe(50);
    });

    it('should return 0 when at top/left', () => {
      Object.defineProperty(window, 'scrollX', {
        value: 0,
        writable: true,
        configurable: true,
      });

      Object.defineProperty(window, 'scrollY', {
        value: 0,
        writable: true,
        configurable: true,
      });

      const percentage = ScrollUtils.getScrollPercentage();

      expect(percentage).toEqual({ x: 0, y: 0 });
    });

    it('should return 0 when maxScroll is 0 (no scrollable area)', () => {
      Object.defineProperty(window, 'innerWidth', {
        value: 1024,
        writable: true,
        configurable: true,
      });

      Object.defineProperty(window, 'innerHeight', {
        value: 768,
        writable: true,
        configurable: true,
      });

      Object.defineProperty(document, 'documentElement', {
        value: {
          scrollWidth: 1024, // Same as innerWidth, no horizontal scroll
          scrollHeight: 768, // Same as innerHeight, no vertical scroll
          clientHeight: 768,
          clientWidth: 1024,
          style: {},
        },
        writable: true,
        configurable: true,
      });

      const percentage = ScrollUtils.getScrollPercentage();

      expect(percentage).toEqual({ x: 0, y: 0 });
    });

    it('should return zero values when document is undefined', () => {
      const originalDocument = global.document;
      // @ts-expect-error - Testing non-browser environment
      delete global.document;

      const percentage = ScrollUtils.getScrollPercentage();

      expect(percentage).toEqual({ x: 0, y: 0 });

      global.document = originalDocument;
    });
  });

  // ===========================================================================
  // getMaxScroll
  // ===========================================================================

  describe('getMaxScroll', () => {
    it('should return maximum scroll values', () => {
      Object.defineProperty(window, 'innerWidth', {
        value: 1024,
        writable: true,
        configurable: true,
      });

      Object.defineProperty(window, 'innerHeight', {
        value: 768,
        writable: true,
        configurable: true,
      });

      Object.defineProperty(document, 'documentElement', {
        value: {
          scrollWidth: 1500,
          scrollHeight: 2000,
          clientHeight: 768,
          clientWidth: 1024,
          style: {},
        },
        writable: true,
        configurable: true,
      });

      const maxScroll = ScrollUtils.getMaxScroll();

      expect(maxScroll).toEqual({
        x: 476, // 1500 - 1024
        y: 1232, // 2000 - 768
      });
    });

    it('should return zero values when document is undefined', () => {
      const originalDocument = global.document;
      // @ts-expect-error - Testing non-browser environment
      delete global.document;

      const maxScroll = ScrollUtils.getMaxScroll();

      expect(maxScroll).toEqual({ x: 0, y: 0 });

      global.document = originalDocument;
    });
  });

  // ===========================================================================
  // isInViewport
  // ===========================================================================

  describe('isInViewport', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'innerWidth', {
        value: 1024,
        writable: true,
        configurable: true,
      });

      Object.defineProperty(window, 'innerHeight', {
        value: 768,
        writable: true,
        configurable: true,
      });

      Object.defineProperty(document, 'documentElement', {
        value: {
          ...mockDocumentElement,
          clientHeight: 768,
          clientWidth: 1024,
          style: {},
        },
        writable: true,
        configurable: true,
      });
    });

    it('should return true when element is fully in viewport', () => {
      const mockElement = {
        getBoundingClientRect: vi.fn().mockReturnValue({
          top: 100,
          left: 100,
          bottom: 300,
          right: 400,
          width: 300,
          height: 200,
        }),
      } as unknown as Element;

      expect(ScrollUtils.isInViewport(mockElement)).toBe(true);
    });

    it('should return true when element is partially in viewport (no threshold)', () => {
      const mockElement = {
        getBoundingClientRect: vi.fn().mockReturnValue({
          top: -50,
          left: 100,
          bottom: 100,
          right: 400,
          width: 300,
          height: 150,
        }),
      } as unknown as Element;

      expect(ScrollUtils.isInViewport(mockElement)).toBe(true);
    });

    it('should return false when element is above viewport', () => {
      const mockElement = {
        getBoundingClientRect: vi.fn().mockReturnValue({
          top: -200,
          left: 100,
          bottom: -50,
          right: 400,
          width: 300,
          height: 150,
        }),
      } as unknown as Element;

      expect(ScrollUtils.isInViewport(mockElement)).toBe(false);
    });

    it('should return false when element is below viewport', () => {
      const mockElement = {
        getBoundingClientRect: vi.fn().mockReturnValue({
          top: 800,
          left: 100,
          bottom: 1000,
          right: 400,
          width: 300,
          height: 200,
        }),
      } as unknown as Element;

      expect(ScrollUtils.isInViewport(mockElement)).toBe(false);
    });

    it('should return false when element is to the left of viewport', () => {
      const mockElement = {
        getBoundingClientRect: vi.fn().mockReturnValue({
          top: 100,
          left: -300,
          bottom: 300,
          right: -50,
          width: 250,
          height: 200,
        }),
      } as unknown as Element;

      expect(ScrollUtils.isInViewport(mockElement)).toBe(false);
    });

    it('should return false when element is to the right of viewport', () => {
      const mockElement = {
        getBoundingClientRect: vi.fn().mockReturnValue({
          top: 100,
          left: 1100,
          bottom: 300,
          right: 1400,
          width: 300,
          height: 200,
        }),
      } as unknown as Element;

      expect(ScrollUtils.isInViewport(mockElement)).toBe(false);
    });

    it('should check threshold for partial visibility', () => {
      // Element 200x200, only 100x200 visible (50% visible)
      const mockElement = {
        getBoundingClientRect: vi.fn().mockReturnValue({
          top: -100,
          left: 100,
          bottom: 100,
          right: 300,
          width: 200,
          height: 200,
        }),
      } as unknown as Element;

      // 50% threshold should pass (exactly 50% visible)
      expect(ScrollUtils.isInViewport(mockElement, 0.5)).toBe(true);

      // 51% threshold should fail
      expect(ScrollUtils.isInViewport(mockElement, 0.51)).toBe(false);
    });

    it('should return true for 0 threshold with any visibility', () => {
      // Element partially visible
      const mockElement = {
        getBoundingClientRect: vi.fn().mockReturnValue({
          top: 750,
          left: 100,
          bottom: 950,
          right: 300,
          width: 200,
          height: 200,
        }),
      } as unknown as Element;

      // Only 18px visible (768 - 750), but threshold is 0
      expect(ScrollUtils.isInViewport(mockElement, 0)).toBe(true);
    });

    it('should return false when visible area is zero', () => {
      const mockElement = {
        getBoundingClientRect: vi.fn().mockReturnValue({
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          width: 0,
          height: 0,
        }),
      } as unknown as Element;

      expect(ScrollUtils.isInViewport(mockElement)).toBe(false);
    });

    it('should handle zero-size elements with threshold', () => {
      const mockElement = {
        getBoundingClientRect: vi.fn().mockReturnValue({
          top: 100,
          left: 100,
          bottom: 100,
          right: 100,
          width: 0,
          height: 0,
        }),
      } as unknown as Element;

      // totalArea is 0, so should return false for any threshold > 0
      expect(ScrollUtils.isInViewport(mockElement, 0.5)).toBe(false);
    });

    it('should return false when window is undefined', () => {
      const originalWindow = global.window;
      // @ts-expect-error - Testing non-browser environment
      delete global.window;

      const mockElement = {
        getBoundingClientRect: vi.fn(),
      } as unknown as Element;

      expect(ScrollUtils.isInViewport(mockElement)).toBe(false);

      global.window = originalWindow;
    });
  });

  // ===========================================================================
  // isFullyInViewport
  // ===========================================================================

  describe('isFullyInViewport', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'innerWidth', {
        value: 1024,
        writable: true,
        configurable: true,
      });

      Object.defineProperty(window, 'innerHeight', {
        value: 768,
        writable: true,
        configurable: true,
      });

      Object.defineProperty(document, 'documentElement', {
        value: {
          ...mockDocumentElement,
          clientHeight: 768,
          clientWidth: 1024,
          style: {},
        },
        writable: true,
        configurable: true,
      });
    });

    it('should return true when element is fully in viewport', () => {
      const mockElement = {
        getBoundingClientRect: vi.fn().mockReturnValue({
          top: 100,
          left: 100,
          bottom: 300,
          right: 400,
        }),
      } as unknown as Element;

      expect(ScrollUtils.isFullyInViewport(mockElement)).toBe(true);
    });

    it('should return false when top is above viewport', () => {
      const mockElement = {
        getBoundingClientRect: vi.fn().mockReturnValue({
          top: -10,
          left: 100,
          bottom: 300,
          right: 400,
        }),
      } as unknown as Element;

      expect(ScrollUtils.isFullyInViewport(mockElement)).toBe(false);
    });

    it('should return false when bottom is below viewport', () => {
      const mockElement = {
        getBoundingClientRect: vi.fn().mockReturnValue({
          top: 100,
          left: 100,
          bottom: 800,
          right: 400,
        }),
      } as unknown as Element;

      expect(ScrollUtils.isFullyInViewport(mockElement)).toBe(false);
    });

    it('should return false when left is outside viewport', () => {
      const mockElement = {
        getBoundingClientRect: vi.fn().mockReturnValue({
          top: 100,
          left: -10,
          bottom: 300,
          right: 400,
        }),
      } as unknown as Element;

      expect(ScrollUtils.isFullyInViewport(mockElement)).toBe(false);
    });

    it('should return false when right is outside viewport', () => {
      const mockElement = {
        getBoundingClientRect: vi.fn().mockReturnValue({
          top: 100,
          left: 100,
          bottom: 300,
          right: 1100,
        }),
      } as unknown as Element;

      expect(ScrollUtils.isFullyInViewport(mockElement)).toBe(false);
    });

    it('should return true when element is at exact viewport boundaries', () => {
      const mockElement = {
        getBoundingClientRect: vi.fn().mockReturnValue({
          top: 0,
          left: 0,
          bottom: 768,
          right: 1024,
        }),
      } as unknown as Element;

      expect(ScrollUtils.isFullyInViewport(mockElement)).toBe(true);
    });

    it('should return false when window is undefined', () => {
      const originalWindow = global.window;
      // @ts-expect-error - Testing non-browser environment
      delete global.window;

      const mockElement = {
        getBoundingClientRect: vi.fn(),
      } as unknown as Element;

      expect(ScrollUtils.isFullyInViewport(mockElement)).toBe(false);

      global.window = originalWindow;
    });
  });

  // ===========================================================================
  // isAboveViewport
  // ===========================================================================

  describe('isAboveViewport', () => {
    it('should return true when element is above viewport', () => {
      const mockElement = {
        getBoundingClientRect: vi.fn().mockReturnValue({
          top: -200,
          left: 100,
          bottom: -50,
          right: 400,
        }),
      } as unknown as Element;

      expect(ScrollUtils.isAboveViewport(mockElement)).toBe(true);
    });

    it('should return false when element bottom is at viewport top', () => {
      const mockElement = {
        getBoundingClientRect: vi.fn().mockReturnValue({
          top: -100,
          left: 100,
          bottom: 0,
          right: 400,
        }),
      } as unknown as Element;

      expect(ScrollUtils.isAboveViewport(mockElement)).toBe(false);
    });

    it('should return false when element is in viewport', () => {
      const mockElement = {
        getBoundingClientRect: vi.fn().mockReturnValue({
          top: 100,
          left: 100,
          bottom: 300,
          right: 400,
        }),
      } as unknown as Element;

      expect(ScrollUtils.isAboveViewport(mockElement)).toBe(false);
    });

    it('should return false when element is below viewport', () => {
      const mockElement = {
        getBoundingClientRect: vi.fn().mockReturnValue({
          top: 800,
          left: 100,
          bottom: 1000,
          right: 400,
        }),
      } as unknown as Element;

      expect(ScrollUtils.isAboveViewport(mockElement)).toBe(false);
    });
  });

  // ===========================================================================
  // isBelowViewport
  // ===========================================================================

  describe('isBelowViewport', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'innerHeight', {
        value: 768,
        writable: true,
        configurable: true,
      });

      Object.defineProperty(document, 'documentElement', {
        value: {
          ...mockDocumentElement,
          clientHeight: 768,
          style: {},
        },
        writable: true,
        configurable: true,
      });
    });

    it('should return true when element is below viewport', () => {
      const mockElement = {
        getBoundingClientRect: vi.fn().mockReturnValue({
          top: 800,
          left: 100,
          bottom: 1000,
          right: 400,
        }),
      } as unknown as Element;

      expect(ScrollUtils.isBelowViewport(mockElement)).toBe(true);
    });

    it('should return false when element top is at viewport bottom', () => {
      const mockElement = {
        getBoundingClientRect: vi.fn().mockReturnValue({
          top: 768,
          left: 100,
          bottom: 968,
          right: 400,
        }),
      } as unknown as Element;

      expect(ScrollUtils.isBelowViewport(mockElement)).toBe(false);
    });

    it('should return false when element is in viewport', () => {
      const mockElement = {
        getBoundingClientRect: vi.fn().mockReturnValue({
          top: 100,
          left: 100,
          bottom: 300,
          right: 400,
        }),
      } as unknown as Element;

      expect(ScrollUtils.isBelowViewport(mockElement)).toBe(false);
    });

    it('should return false when element is above viewport', () => {
      const mockElement = {
        getBoundingClientRect: vi.fn().mockReturnValue({
          top: -200,
          left: 100,
          bottom: -50,
          right: 400,
        }),
      } as unknown as Element;

      expect(ScrollUtils.isBelowViewport(mockElement)).toBe(false);
    });

    it('should return false when window is undefined', () => {
      const originalWindow = global.window;
      // @ts-expect-error - Testing non-browser environment
      delete global.window;

      const mockElement = {
        getBoundingClientRect: vi.fn(),
      } as unknown as Element;

      expect(ScrollUtils.isBelowViewport(mockElement)).toBe(false);

      global.window = originalWindow;
    });
  });

  // ===========================================================================
  // onScroll
  // ===========================================================================

  describe('onScroll', () => {
    let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
    let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    });

    it('should add scroll event listener', () => {
      const handler = vi.fn();

      ScrollUtils.onScroll(handler);

      expect(addEventListenerSpy).toHaveBeenCalledWith('scroll', handler, { passive: true });
    });

    it('should return cleanup function that removes listener', () => {
      const handler = vi.fn();

      const cleanup = ScrollUtils.onScroll(handler);
      cleanup();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', handler);
    });

    it('should use non-passive when specified', () => {
      const handler = vi.fn();

      ScrollUtils.onScroll(handler, { passive: false });

      expect(addEventListenerSpy).toHaveBeenCalledWith('scroll', handler, { passive: false });
    });

    it('should throttle handler when throttle option is set', () => {
      const handler = vi.fn();

      ScrollUtils.onScroll(handler, { throttle: 100 });

      // The actual handler should be throttled, not the original
      expect(addEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function), {
        passive: true,
      });

      // Get the actual handler that was registered
      const actualHandler = addEventListenerSpy.mock.calls[0]?.[1] as EventListener;

      // Simulate multiple scroll events
      actualHandler(new Event('scroll'));
      actualHandler(new Event('scroll'));
      actualHandler(new Event('scroll'));

      // Only one call should happen immediately (leading edge)
      expect(handler).toHaveBeenCalledTimes(1);

      // Advance time and trigger trailing edge
      vi.advanceTimersByTime(100);

      // Now trailing edge should fire
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should cancel throttled handler on cleanup', () => {
      const handler = vi.fn();

      const cleanup = ScrollUtils.onScroll(handler, { throttle: 100 });

      // Get the actual handler
      const actualHandler = addEventListenerSpy.mock.calls[0]?.[1] as EventListener;

      // Trigger a scroll
      actualHandler(new Event('scroll'));

      expect(handler).toHaveBeenCalledTimes(1);

      // Cleanup before trailing edge
      cleanup();

      // Advance time - no trailing call should happen
      vi.advanceTimersByTime(100);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should return noop when window is undefined', () => {
      const originalWindow = global.window;
      // @ts-expect-error - Testing non-browser environment
      delete global.window;

      const handler = vi.fn();
      const cleanup = ScrollUtils.onScroll(handler);

      // Should not throw
      expect(() => cleanup()).not.toThrow();

      global.window = originalWindow;
    });

    it('should handle zero throttle (no throttling)', () => {
      const handler = vi.fn();

      ScrollUtils.onScroll(handler, { throttle: 0 });

      // Should use original handler, not throttled
      expect(addEventListenerSpy).toHaveBeenCalledWith('scroll', handler, { passive: true });
    });

    it('should work without options', () => {
      const handler = vi.fn();

      ScrollUtils.onScroll(handler);

      expect(addEventListenerSpy).toHaveBeenCalledWith('scroll', handler, { passive: true });
    });
  });

  // ===========================================================================
  // onScrollDirection
  // ===========================================================================

  describe('onScrollDirection', () => {
    let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
    let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      Object.defineProperty(window, 'scrollY', {
        value: 0,
        writable: true,
        configurable: true,
      });
    });

    it('should add scroll event listener', () => {
      const handler = vi.fn();

      ScrollUtils.onScrollDirection(handler);

      expect(addEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function), {
        passive: true,
      });
    });

    it('should detect scroll down direction', () => {
      const handler = vi.fn();

      Object.defineProperty(window, 'scrollY', {
        value: 0,
        writable: true,
        configurable: true,
      });

      ScrollUtils.onScrollDirection(handler, { threshold: 10, throttle: 0 });

      const actualHandler = addEventListenerSpy.mock.calls[0]?.[1] as EventListener;

      // Scroll down more than threshold
      Object.defineProperty(window, 'scrollY', {
        value: 20,
        writable: true,
        configurable: true,
      });

      actualHandler(new Event('scroll'));

      expect(handler).toHaveBeenCalledWith('down');
    });

    it('should detect scroll up direction', () => {
      const handler = vi.fn();

      Object.defineProperty(window, 'scrollY', {
        value: 100,
        writable: true,
        configurable: true,
      });

      ScrollUtils.onScrollDirection(handler, { threshold: 10, throttle: 0 });

      const actualHandler = addEventListenerSpy.mock.calls[0]?.[1] as EventListener;

      // Scroll up more than threshold
      Object.defineProperty(window, 'scrollY', {
        value: 80,
        writable: true,
        configurable: true,
      });

      actualHandler(new Event('scroll'));

      expect(handler).toHaveBeenCalledWith('up');
    });

    it('should not call handler when scroll is below threshold', () => {
      const handler = vi.fn();

      Object.defineProperty(window, 'scrollY', {
        value: 100,
        writable: true,
        configurable: true,
      });

      ScrollUtils.onScrollDirection(handler, { threshold: 10, throttle: 0 });

      const actualHandler = addEventListenerSpy.mock.calls[0]?.[1] as EventListener;

      // Scroll less than threshold
      Object.defineProperty(window, 'scrollY', {
        value: 105,
        writable: true,
        configurable: true,
      });

      actualHandler(new Event('scroll'));

      expect(handler).not.toHaveBeenCalled();
    });

    it('should only call handler on direction change', () => {
      const handler = vi.fn();

      Object.defineProperty(window, 'scrollY', {
        value: 0,
        writable: true,
        configurable: true,
      });

      ScrollUtils.onScrollDirection(handler, { threshold: 10, throttle: 0 });

      const actualHandler = addEventListenerSpy.mock.calls[0]?.[1] as EventListener;

      // First scroll down
      Object.defineProperty(window, 'scrollY', {
        value: 50,
        writable: true,
        configurable: true,
      });
      actualHandler(new Event('scroll'));

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenLastCalledWith('down');

      // Continue scrolling down - no new call
      Object.defineProperty(window, 'scrollY', {
        value: 100,
        writable: true,
        configurable: true,
      });
      actualHandler(new Event('scroll'));

      expect(handler).toHaveBeenCalledTimes(1);

      // Scroll up - new call
      Object.defineProperty(window, 'scrollY', {
        value: 80,
        writable: true,
        configurable: true,
      });
      actualHandler(new Event('scroll'));

      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenLastCalledWith('up');
    });

    it('should use default threshold of 10', () => {
      const handler = vi.fn();

      Object.defineProperty(window, 'scrollY', {
        value: 0,
        writable: true,
        configurable: true,
      });

      ScrollUtils.onScrollDirection(handler, { throttle: 0 });

      const actualHandler = addEventListenerSpy.mock.calls[0]?.[1] as EventListener;

      // Scroll less than default threshold (10)
      Object.defineProperty(window, 'scrollY', {
        value: 9,
        writable: true,
        configurable: true,
      });
      actualHandler(new Event('scroll'));

      expect(handler).not.toHaveBeenCalled();

      // Scroll at threshold
      Object.defineProperty(window, 'scrollY', {
        value: 10,
        writable: true,
        configurable: true,
      });
      actualHandler(new Event('scroll'));

      expect(handler).toHaveBeenCalledWith('down');
    });

    it('should throttle by default', () => {
      const handler = vi.fn();

      Object.defineProperty(window, 'scrollY', {
        value: 0,
        writable: true,
        configurable: true,
      });

      ScrollUtils.onScrollDirection(handler); // Default throttle is 100ms

      const actualHandler = addEventListenerSpy.mock.calls[0]?.[1] as EventListener;

      // Multiple rapid scroll events
      Object.defineProperty(window, 'scrollY', {
        value: 50,
        writable: true,
        configurable: true,
      });
      actualHandler(new Event('scroll'));

      Object.defineProperty(window, 'scrollY', {
        value: 100,
        writable: true,
        configurable: true,
      });
      actualHandler(new Event('scroll'));

      // Only one immediate call
      expect(handler).toHaveBeenCalledTimes(1);

      // Advance throttle time
      vi.advanceTimersByTime(100);

      // Trailing call may or may not fire depending on implementation
      // Just verify throttling is working
    });

    it('should return cleanup function', () => {
      const handler = vi.fn();

      const cleanup = ScrollUtils.onScrollDirection(handler);

      expect(typeof cleanup).toBe('function');

      cleanup();

      expect(removeEventListenerSpy).toHaveBeenCalled();
    });

    it('should cancel throttled handler on cleanup', () => {
      const handler = vi.fn();

      Object.defineProperty(window, 'scrollY', {
        value: 0,
        writable: true,
        configurable: true,
      });

      const cleanup = ScrollUtils.onScrollDirection(handler, { throttle: 100 });

      const actualHandler = addEventListenerSpy.mock.calls[0]?.[1] as EventListener;

      Object.defineProperty(window, 'scrollY', {
        value: 50,
        writable: true,
        configurable: true,
      });
      actualHandler(new Event('scroll'));

      expect(handler).toHaveBeenCalledTimes(1);

      cleanup();

      // Advance time - no additional calls
      vi.advanceTimersByTime(100);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should return noop when window is undefined', () => {
      const originalWindow = global.window;
      // @ts-expect-error - Testing non-browser environment
      delete global.window;

      const handler = vi.fn();
      const cleanup = ScrollUtils.onScrollDirection(handler);

      expect(() => cleanup()).not.toThrow();

      global.window = originalWindow;
    });

    it('should work with zero throttle', () => {
      const handler = vi.fn();

      Object.defineProperty(window, 'scrollY', {
        value: 0,
        writable: true,
        configurable: true,
      });

      ScrollUtils.onScrollDirection(handler, { throttle: 0 });

      const actualHandler = addEventListenerSpy.mock.calls[0]?.[1] as EventListener;

      // Multiple scroll events should trigger immediately
      Object.defineProperty(window, 'scrollY', {
        value: 50,
        writable: true,
        configurable: true,
      });
      actualHandler(new Event('scroll'));

      expect(handler).toHaveBeenCalledWith('down');
    });

    it('should work without options', () => {
      const handler = vi.fn();

      ScrollUtils.onScrollDirection(handler);

      expect(addEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function), {
        passive: true,
      });
    });
  });

  // ===========================================================================
  // Type exports
  // ===========================================================================

  describe('Type exports', () => {
    it('should export CleanupFn type', () => {
      const cleanup: ReturnType<typeof ScrollUtils.lock> = () => {};
      expect(typeof cleanup).toBe('function');
    });

    it('should export ScrollPosition type', () => {
      const position: ReturnType<typeof ScrollUtils.getScrollPosition> = { x: 0, y: 0 };
      expect(position).toHaveProperty('x');
      expect(position).toHaveProperty('y');
    });
  });

  // ===========================================================================
  // Coverage Gaps
  // ===========================================================================

  describe('Coverage Gaps', () => {
    it('should fall back to 0 when both scrollX/pageXOffset and scrollY/pageYOffset are undefined (lines 194-195)', () => {
      Object.defineProperty(window, 'scrollX', {
        value: undefined,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(window, 'scrollY', {
        value: undefined,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(window, 'pageXOffset', {
        value: undefined,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(window, 'pageYOffset', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const position = ScrollUtils.getScrollPosition();

      expect(position).toEqual({ x: 0, y: 0 });
    });

    it('should fall back to document.documentElement.clientHeight/clientWidth in isInViewport (lines 246, 248)', () => {
      Object.defineProperty(window, 'innerHeight', {
        value: undefined,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(window, 'innerWidth', {
        value: undefined,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(document, 'documentElement', {
        value: {
          ...document.documentElement,
          clientHeight: 600,
          clientWidth: 800,
          style: {},
        },
        writable: true,
        configurable: true,
      });

      const mockElement = {
        getBoundingClientRect: vi.fn().mockReturnValue({
          top: 100,
          left: 100,
          bottom: 300,
          right: 400,
          width: 300,
          height: 200,
        }),
      } as unknown as Element;

      expect(ScrollUtils.isInViewport(mockElement)).toBe(true);
    });

    it('should fall back to document.documentElement.clientHeight/clientWidth in isFullyInViewport (lines 281-282)', () => {
      Object.defineProperty(window, 'innerHeight', {
        value: undefined,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(window, 'innerWidth', {
        value: undefined,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(document, 'documentElement', {
        value: {
          ...document.documentElement,
          clientHeight: 600,
          clientWidth: 800,
          style: {},
        },
        writable: true,
        configurable: true,
      });

      const mockElement = {
        getBoundingClientRect: vi.fn().mockReturnValue({
          top: 100,
          left: 100,
          bottom: 500,
          right: 700,
        }),
      } as unknown as Element;

      expect(ScrollUtils.isFullyInViewport(mockElement)).toBe(true);
    });

    it('should fall back to document.documentElement.clientHeight in isBelowViewport (line 303)', () => {
      Object.defineProperty(window, 'innerHeight', {
        value: undefined,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(document, 'documentElement', {
        value: {
          ...document.documentElement,
          clientHeight: 600,
          style: {},
        },
        writable: true,
        configurable: true,
      });

      const mockElement = {
        getBoundingClientRect: vi.fn().mockReturnValue({
          top: 700,
          left: 100,
          bottom: 900,
          right: 400,
        }),
      } as unknown as Element;

      expect(ScrollUtils.isBelowViewport(mockElement)).toBe(true);
    });
  });
});
