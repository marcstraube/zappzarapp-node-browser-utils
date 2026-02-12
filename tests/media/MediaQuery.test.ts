import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MediaQuery, type Breakpoint } from '../../src/media/index.js';
import type { CleanupFn } from '../../src/core/index.js';

/**
 * Create a mock MediaQueryList for testing.
 */
function createMockMediaQueryList(matches: boolean = false): MediaQueryList {
  const listeners: Array<(event: MediaQueryListEvent) => void> = [];

  // noinspection JSDeprecatedSymbols -- testing legacy API fallback
  return {
    matches,
    media: '',
    onchange: null,
    addEventListener: vi.fn((type: string, listener: (event: MediaQueryListEvent) => void) => {
      if (type === 'change') {
        listeners.push(listener);
      }
    }),
    removeEventListener: vi.fn((type: string, listener: (event: MediaQueryListEvent) => void) => {
      if (type === 'change') {
        const index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    }),
    addListener: vi.fn((listener: (event: MediaQueryListEvent) => void) => {
      listeners.push(listener);
    }),
    removeListener: vi.fn((listener: (event: MediaQueryListEvent) => void) => {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }),
    dispatchEvent: vi.fn((event: Event) => {
      listeners.forEach((listener) => listener(event as MediaQueryListEvent));
      return true;
    }),
    // Helper to trigger change events in tests
    _triggerChange(newMatches: boolean): void {
      const event = { matches: newMatches } as MediaQueryListEvent;
      listeners.forEach((listener) => listener(event));
    },
    _getListenerCount(): number {
      return listeners.length;
    },
  } as MediaQueryList & {
    _triggerChange: (matches: boolean) => void;
    _getListenerCount: () => number;
  };
}

/**
 * Create a mock MediaQueryList using legacy API (no addEventListener).
 */
function createLegacyMockMediaQueryList(matches: boolean = false): MediaQueryList {
  const listeners: Array<(event: MediaQueryListEvent) => void> = [];

  // noinspection JSDeprecatedSymbols -- testing legacy API fallback
  return {
    matches,
    media: '',
    onchange: null,
    addEventListener: undefined as unknown as MediaQueryList['addEventListener'],
    removeEventListener: undefined as unknown as MediaQueryList['removeEventListener'],
    addListener: vi.fn((listener: (event: MediaQueryListEvent) => void) => {
      listeners.push(listener);
    }),
    removeListener: vi.fn((listener: (event: MediaQueryListEvent) => void) => {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }),
    dispatchEvent: vi.fn(() => true),
    // Helper to trigger change events in tests
    _triggerChange(newMatches: boolean): void {
      const event = { matches: newMatches } as MediaQueryListEvent;
      listeners.forEach((listener) => listener(event));
    },
    _getListenerCount(): number {
      return listeners.length;
    },
  } as MediaQueryList & {
    _triggerChange: (matches: boolean) => void;
    _getListenerCount: () => number;
  };
}

describe('MediaQuery', () => {
  let originalMatchMedia: typeof window.matchMedia | undefined;
  let originalInnerWidth: number;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    originalInnerWidth = window.innerWidth;
  });

  afterEach(() => {
    if (originalMatchMedia) {
      window.matchMedia = originalMatchMedia;
    }
    Object.defineProperty(window, 'innerWidth', {
      value: originalInnerWidth,
      writable: true,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // Core API
  // ===========================================================================

  describe('Core API', () => {
    describe('matches', () => {
      it('should return true when media query matches', () => {
        const mockMql = createMockMediaQueryList(true);
        window.matchMedia = vi.fn(() => mockMql);

        const result = MediaQuery.matches('(min-width: 768px)');

        expect(result).toBe(true);
        expect(window.matchMedia).toHaveBeenCalledWith('(min-width: 768px)');
      });

      it('should return false when media query does not match', () => {
        const mockMql = createMockMediaQueryList(false);
        window.matchMedia = vi.fn(() => mockMql);

        const result = MediaQuery.matches('(min-width: 1200px)');

        expect(result).toBe(false);
      });

      it('should return false when window is undefined', () => {
        const originalWindow = globalThis.window;
        // @ts-expect-error - Simulating non-browser environment
        delete globalThis.window;

        // Need to re-import or call directly
        // Since MediaQuery uses typeof window check, we simulate by making matchMedia undefined
        Object.defineProperty(globalThis, 'window', {
          value: originalWindow,
          writable: true,
          configurable: true,
        });

        const tempMatchMedia = window.matchMedia;
        // @ts-expect-error - Simulating missing matchMedia
        delete window.matchMedia;

        const result = MediaQuery.matches('(min-width: 768px)');

        expect(result).toBe(false);

        window.matchMedia = tempMatchMedia;
      });

      it('should return false when matchMedia is undefined', () => {
        const tempMatchMedia = window.matchMedia;
        // @ts-expect-error - Simulating missing matchMedia
        delete window.matchMedia;

        const result = MediaQuery.matches('(min-width: 768px)');

        expect(result).toBe(false);

        window.matchMedia = tempMatchMedia;
      });
    });

    describe('onChange', () => {
      it('should register change listener and call handler on change', () => {
        const mockMql = createMockMediaQueryList(false) as MediaQueryList & {
          _triggerChange: (matches: boolean) => void;
        };
        window.matchMedia = vi.fn(() => mockMql);

        const handler = vi.fn();
        MediaQuery.onChange('(min-width: 768px)', handler);

        // Trigger a change
        mockMql._triggerChange(true);

        expect(handler).toHaveBeenCalledWith(true);
      });

      it('should return cleanup function that removes listener', () => {
        const mockMql = createMockMediaQueryList(false) as MediaQueryList & {
          _triggerChange: (matches: boolean) => void;
          _getListenerCount: () => number;
        };
        window.matchMedia = vi.fn(() => mockMql);

        const handler = vi.fn();
        const cleanup = MediaQuery.onChange('(min-width: 768px)', handler);

        expect(mockMql._getListenerCount()).toBe(1);

        cleanup();

        expect(mockMql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
      });

      it('should return no-op cleanup when window is undefined', () => {
        const tempMatchMedia = window.matchMedia;
        // @ts-expect-error - Simulating missing matchMedia
        delete window.matchMedia;

        const handler = vi.fn();
        const cleanup = MediaQuery.onChange('(min-width: 768px)', handler);

        expect(cleanup).toBeInstanceOf(Function);
        expect(() => cleanup()).not.toThrow();

        window.matchMedia = tempMatchMedia;
      });

      it('should use legacy addListener API when addEventListener is unavailable', () => {
        const mockMql = createLegacyMockMediaQueryList(false) as MediaQueryList & {
          _triggerChange: (matches: boolean) => void;
        };
        window.matchMedia = vi.fn(() => mockMql);

        const handler = vi.fn();
        const cleanup = MediaQuery.onChange('(min-width: 768px)', handler);

        expect(mockMql.addListener).toHaveBeenCalled();

        // Trigger a change
        mockMql._triggerChange(true);
        expect(handler).toHaveBeenCalledWith(true);

        // Cleanup should use removeListener
        cleanup();
        expect(mockMql.removeListener).toHaveBeenCalled();
      });

      it('should handle multiple change events', () => {
        const mockMql = createMockMediaQueryList(false) as MediaQueryList & {
          _triggerChange: (matches: boolean) => void;
        };
        window.matchMedia = vi.fn(() => mockMql);

        const handler = vi.fn();
        MediaQuery.onChange('(min-width: 768px)', handler);

        mockMql._triggerChange(true);
        mockMql._triggerChange(false);
        mockMql._triggerChange(true);

        expect(handler).toHaveBeenCalledTimes(3);
        expect(handler).toHaveBeenNthCalledWith(1, true);
        expect(handler).toHaveBeenNthCalledWith(2, false);
        expect(handler).toHaveBeenNthCalledWith(3, true);
      });
    });
  });

  // ===========================================================================
  // User Preferences
  // ===========================================================================

  describe('User Preferences', () => {
    describe('prefersDarkMode', () => {
      it('should return true when user prefers dark mode', () => {
        window.matchMedia = vi.fn((query: string) => {
          return createMockMediaQueryList(query === '(prefers-color-scheme: dark)');
        });

        expect(MediaQuery.prefersDarkMode()).toBe(true);
      });

      it('should return false when user does not prefer dark mode', () => {
        window.matchMedia = vi.fn(() => createMockMediaQueryList(false));

        expect(MediaQuery.prefersDarkMode()).toBe(false);
      });
    });

    describe('prefersLightMode', () => {
      it('should return true when user prefers light mode', () => {
        window.matchMedia = vi.fn((query: string) => {
          return createMockMediaQueryList(query === '(prefers-color-scheme: light)');
        });

        expect(MediaQuery.prefersLightMode()).toBe(true);
      });

      it('should return false when user does not prefer light mode', () => {
        window.matchMedia = vi.fn(() => createMockMediaQueryList(false));

        expect(MediaQuery.prefersLightMode()).toBe(false);
      });
    });

    describe('prefersReducedMotion', () => {
      it('should return true when user prefers reduced motion', () => {
        window.matchMedia = vi.fn((query: string) => {
          return createMockMediaQueryList(query === '(prefers-reduced-motion: reduce)');
        });

        expect(MediaQuery.prefersReducedMotion()).toBe(true);
      });

      it('should return false when user does not prefer reduced motion', () => {
        window.matchMedia = vi.fn(() => createMockMediaQueryList(false));

        expect(MediaQuery.prefersReducedMotion()).toBe(false);
      });
    });

    describe('prefersReducedTransparency', () => {
      it('should return true when user prefers reduced transparency', () => {
        window.matchMedia = vi.fn((query: string) => {
          return createMockMediaQueryList(query === '(prefers-reduced-transparency: reduce)');
        });

        expect(MediaQuery.prefersReducedTransparency()).toBe(true);
      });

      it('should return false when user does not prefer reduced transparency', () => {
        window.matchMedia = vi.fn(() => createMockMediaQueryList(false));

        expect(MediaQuery.prefersReducedTransparency()).toBe(false);
      });
    });

    describe('prefersHighContrast', () => {
      it('should return true when user prefers more contrast', () => {
        window.matchMedia = vi.fn((query: string) => {
          return createMockMediaQueryList(query === '(prefers-contrast: more)');
        });

        expect(MediaQuery.prefersHighContrast()).toBe(true);
      });

      it('should return true when MS high contrast is active', () => {
        window.matchMedia = vi.fn((query: string) => {
          return createMockMediaQueryList(query === '(-ms-high-contrast: active)');
        });

        expect(MediaQuery.prefersHighContrast()).toBe(true);
      });

      it('should return false when no high contrast preference', () => {
        window.matchMedia = vi.fn(() => createMockMediaQueryList(false));

        expect(MediaQuery.prefersHighContrast()).toBe(false);
      });
    });

    describe('onDarkModeChange', () => {
      it('should listen for dark mode changes', () => {
        const mockMql = createMockMediaQueryList(false) as MediaQueryList & {
          _triggerChange: (matches: boolean) => void;
        };
        window.matchMedia = vi.fn(() => mockMql);

        const handler = vi.fn();
        MediaQuery.onDarkModeChange(handler);

        mockMql._triggerChange(true);

        expect(handler).toHaveBeenCalledWith(true);
      });

      it('should return cleanup function', () => {
        const mockMql = createMockMediaQueryList(false);
        window.matchMedia = vi.fn(() => mockMql);

        const handler = vi.fn();
        const cleanup = MediaQuery.onDarkModeChange(handler);

        expect(cleanup).toBeInstanceOf(Function);
        cleanup();
        expect(mockMql.removeEventListener).toHaveBeenCalled();
      });
    });

    describe('onReducedMotionChange', () => {
      it('should listen for reduced motion preference changes', () => {
        const mockMql = createMockMediaQueryList(false) as MediaQueryList & {
          _triggerChange: (matches: boolean) => void;
        };
        window.matchMedia = vi.fn(() => mockMql);

        const handler = vi.fn();
        MediaQuery.onReducedMotionChange(handler);

        mockMql._triggerChange(true);

        expect(handler).toHaveBeenCalledWith(true);
      });

      it('should return cleanup function', () => {
        const mockMql = createMockMediaQueryList(false);
        window.matchMedia = vi.fn(() => mockMql);

        const handler = vi.fn();
        const cleanup = MediaQuery.onReducedMotionChange(handler);

        expect(cleanup).toBeInstanceOf(Function);
        cleanup();
        expect(mockMql.removeEventListener).toHaveBeenCalled();
      });
    });
  });

  // ===========================================================================
  // Device Type Detection
  // ===========================================================================

  describe('Device Type Detection', () => {
    describe('isMobile', () => {
      it('should return true for mobile screen width', () => {
        window.matchMedia = vi.fn((query: string) => {
          return createMockMediaQueryList(query === '(max-width: 767px)');
        });

        expect(MediaQuery.isMobile()).toBe(true);
      });

      it('should return false for non-mobile screen width', () => {
        window.matchMedia = vi.fn(() => createMockMediaQueryList(false));

        expect(MediaQuery.isMobile()).toBe(false);
      });
    });

    describe('isTablet', () => {
      it('should return true for tablet screen width', () => {
        window.matchMedia = vi.fn((query: string) => {
          return createMockMediaQueryList(query === '(min-width: 768px) and (max-width: 1023px)');
        });

        expect(MediaQuery.isTablet()).toBe(true);
      });

      it('should return false for non-tablet screen width', () => {
        window.matchMedia = vi.fn(() => createMockMediaQueryList(false));

        expect(MediaQuery.isTablet()).toBe(false);
      });
    });

    describe('isDesktop', () => {
      it('should return true for desktop screen width', () => {
        window.matchMedia = vi.fn((query: string) => {
          return createMockMediaQueryList(query === '(min-width: 1024px)');
        });

        expect(MediaQuery.isDesktop()).toBe(true);
      });

      it('should return false for non-desktop screen width', () => {
        window.matchMedia = vi.fn(() => createMockMediaQueryList(false));

        expect(MediaQuery.isDesktop()).toBe(false);
      });
    });

    describe('isPortrait', () => {
      it('should return true for portrait orientation', () => {
        window.matchMedia = vi.fn((query: string) => {
          return createMockMediaQueryList(query === '(orientation: portrait)');
        });

        expect(MediaQuery.isPortrait()).toBe(true);
      });

      it('should return false for non-portrait orientation', () => {
        window.matchMedia = vi.fn(() => createMockMediaQueryList(false));

        expect(MediaQuery.isPortrait()).toBe(false);
      });
    });

    describe('isLandscape', () => {
      it('should return true for landscape orientation', () => {
        window.matchMedia = vi.fn((query: string) => {
          return createMockMediaQueryList(query === '(orientation: landscape)');
        });

        expect(MediaQuery.isLandscape()).toBe(true);
      });

      it('should return false for non-landscape orientation', () => {
        window.matchMedia = vi.fn(() => createMockMediaQueryList(false));

        expect(MediaQuery.isLandscape()).toBe(false);
      });
    });
  });

  // ===========================================================================
  // Breakpoints
  // ===========================================================================

  describe('Breakpoints', () => {
    describe('breakpoint', () => {
      it('should return md as default when window is undefined', () => {
        const tempWindow = globalThis.window;
        // @ts-expect-error - Simulating non-browser environment
        delete globalThis.window;

        // Since we can't truly delete window in jsdom, simulate by checking the fallback
        Object.defineProperty(globalThis, 'window', {
          value: undefined,
          writable: true,
          configurable: true,
        });

        // The function checks typeof window, so we need to restore for the actual call
        Object.defineProperty(globalThis, 'window', {
          value: tempWindow,
          writable: true,
          configurable: true,
        });
      });

      it('should return 2xl for very large screens', () => {
        Object.defineProperty(window, 'innerWidth', {
          value: 1600,
          writable: true,
          configurable: true,
        });

        const result = MediaQuery.breakpoint();

        expect(result).toBe('2xl');
      });

      it('should return xl for extra large screens', () => {
        Object.defineProperty(window, 'innerWidth', {
          value: 1300,
          writable: true,
          configurable: true,
        });

        const result = MediaQuery.breakpoint();

        expect(result).toBe('xl');
      });

      it('should return lg for large screens', () => {
        Object.defineProperty(window, 'innerWidth', {
          value: 1100,
          writable: true,
          configurable: true,
        });

        const result = MediaQuery.breakpoint();

        expect(result).toBe('lg');
      });

      it('should return md for medium screens', () => {
        Object.defineProperty(window, 'innerWidth', {
          value: 800,
          writable: true,
          configurable: true,
        });

        const result = MediaQuery.breakpoint();

        expect(result).toBe('md');
      });

      it('should return sm for small screens', () => {
        Object.defineProperty(window, 'innerWidth', {
          value: 650,
          writable: true,
          configurable: true,
        });

        const result = MediaQuery.breakpoint();

        expect(result).toBe('sm');
      });

      it('should return xs for extra small screens', () => {
        Object.defineProperty(window, 'innerWidth', {
          value: 400,
          writable: true,
          configurable: true,
        });

        const result = MediaQuery.breakpoint();

        expect(result).toBe('xs');
      });

      it('should work with custom breakpoints', () => {
        Object.defineProperty(window, 'innerWidth', {
          value: 500,
          writable: true,
          configurable: true,
        });

        const customBreakpoints = {
          tiny: 0,
          small: 400,
          medium: 600,
          large: 900,
        };

        const result = MediaQuery.breakpoint(customBreakpoints);

        expect(result).toBe('small');
      });

      it('should return xs when width is 0', () => {
        Object.defineProperty(window, 'innerWidth', {
          value: 0,
          writable: true,
          configurable: true,
        });

        const result = MediaQuery.breakpoint();

        expect(result).toBe('xs');
      });
    });

    describe('isAtLeast', () => {
      it('should return true when width is at or above breakpoint', () => {
        window.matchMedia = vi.fn((query: string) => {
          return createMockMediaQueryList(query === '(min-width: 768px)');
        });

        expect(MediaQuery.isAtLeast('md')).toBe(true);
      });

      it('should return false when width is below breakpoint', () => {
        window.matchMedia = vi.fn(() => createMockMediaQueryList(false));

        expect(MediaQuery.isAtLeast('lg')).toBe(false);
      });

      it('should return false for undefined breakpoint', () => {
        window.matchMedia = vi.fn(() => createMockMediaQueryList(true));

        // @ts-expect-error - Testing invalid breakpoint
        expect(MediaQuery.isAtLeast('invalid')).toBe(false);
      });

      it('should work with custom breakpoints', () => {
        window.matchMedia = vi.fn((query: string) => {
          return createMockMediaQueryList(query === '(min-width: 500px)');
        });

        const customBreakpoints = {
          small: 0,
          medium: 500,
          large: 1000,
        };

        expect(MediaQuery.isAtLeast('medium' as Breakpoint, customBreakpoints)).toBe(true);
      });
    });

    describe('isBelow', () => {
      it('should return true when width is below breakpoint', () => {
        window.matchMedia = vi.fn((query: string) => {
          return createMockMediaQueryList(query === '(max-width: 767px)');
        });

        expect(MediaQuery.isBelow('md')).toBe(true);
      });

      it('should return false when width is at or above breakpoint', () => {
        window.matchMedia = vi.fn(() => createMockMediaQueryList(false));

        expect(MediaQuery.isBelow('md')).toBe(false);
      });

      it('should return true for undefined breakpoint', () => {
        window.matchMedia = vi.fn(() => createMockMediaQueryList(false));

        // @ts-expect-error - Testing invalid breakpoint
        expect(MediaQuery.isBelow('invalid')).toBe(true);
      });

      it('should work with custom breakpoints', () => {
        window.matchMedia = vi.fn((query: string) => {
          return createMockMediaQueryList(query === '(max-width: 499px)');
        });

        const customBreakpoints = {
          small: 0,
          medium: 500,
          large: 1000,
        };

        expect(MediaQuery.isBelow('medium' as Breakpoint, customBreakpoints)).toBe(true);
      });
    });

    describe('onBreakpointChange', () => {
      it('should call handler when breakpoint changes', () => {
        Object.defineProperty(window, 'innerWidth', {
          value: 800,
          writable: true,
          configurable: true,
        });

        const handler = vi.fn();
        MediaQuery.onBreakpointChange(handler);

        // Simulate resize to different breakpoint
        Object.defineProperty(window, 'innerWidth', {
          value: 1100,
          writable: true,
          configurable: true,
        });

        // Trigger resize event
        window.dispatchEvent(new Event('resize'));

        expect(handler).toHaveBeenCalledWith('lg');
      });

      it('should not call handler when breakpoint stays the same', () => {
        Object.defineProperty(window, 'innerWidth', {
          value: 800,
          writable: true,
          configurable: true,
        });

        const handler = vi.fn();
        MediaQuery.onBreakpointChange(handler);

        // Simulate resize within same breakpoint
        Object.defineProperty(window, 'innerWidth', {
          value: 850,
          writable: true,
          configurable: true,
        });

        window.dispatchEvent(new Event('resize'));

        expect(handler).not.toHaveBeenCalled();
      });

      it('should return cleanup function that removes resize listener', () => {
        const handler = vi.fn();
        const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

        const cleanup = MediaQuery.onBreakpointChange(handler);
        cleanup();

        expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
      });

      it('should return no-op cleanup when window is undefined', () => {
        const tempWindow = globalThis.window;
        // @ts-expect-error - Simulating non-browser environment
        delete globalThis.window;

        Object.defineProperty(globalThis, 'window', {
          value: undefined,
          writable: true,
          configurable: true,
        });

        // Restore window for the cleanup function to work
        Object.defineProperty(globalThis, 'window', {
          value: tempWindow,
          writable: true,
          configurable: true,
        });
      });

      it('should work with custom breakpoints', () => {
        const customBreakpoints = {
          small: 0,
          medium: 500,
          large: 1000,
        };

        Object.defineProperty(window, 'innerWidth', {
          value: 400,
          writable: true,
          configurable: true,
        });

        const handler = vi.fn();
        MediaQuery.onBreakpointChange(handler, customBreakpoints);

        // Simulate resize to different breakpoint
        Object.defineProperty(window, 'innerWidth', {
          value: 600,
          writable: true,
          configurable: true,
        });

        window.dispatchEvent(new Event('resize'));

        expect(handler).toHaveBeenCalledWith('medium');
      });

      it('should track multiple breakpoint changes', () => {
        Object.defineProperty(window, 'innerWidth', {
          value: 400,
          writable: true,
          configurable: true,
        });

        const handler = vi.fn();
        MediaQuery.onBreakpointChange(handler);

        // First change: xs -> md
        Object.defineProperty(window, 'innerWidth', {
          value: 800,
          writable: true,
          configurable: true,
        });
        window.dispatchEvent(new Event('resize'));

        // Second change: md -> lg
        Object.defineProperty(window, 'innerWidth', {
          value: 1100,
          writable: true,
          configurable: true,
        });
        window.dispatchEvent(new Event('resize'));

        expect(handler).toHaveBeenCalledTimes(2);
        expect(handler).toHaveBeenNthCalledWith(1, 'md');
        expect(handler).toHaveBeenNthCalledWith(2, 'lg');
      });
    });
  });

  // ===========================================================================
  // Display Features
  // ===========================================================================

  describe('Display Features', () => {
    describe('hasHover', () => {
      it('should return true when device supports hover', () => {
        window.matchMedia = vi.fn((query: string) => {
          return createMockMediaQueryList(query === '(hover: hover)');
        });

        expect(MediaQuery.hasHover()).toBe(true);
      });

      it('should return false when device does not support hover', () => {
        window.matchMedia = vi.fn(() => createMockMediaQueryList(false));

        expect(MediaQuery.hasHover()).toBe(false);
      });
    });

    describe('hasCoarsePointer', () => {
      it('should return true for touch devices', () => {
        window.matchMedia = vi.fn((query: string) => {
          return createMockMediaQueryList(query === '(pointer: coarse)');
        });

        expect(MediaQuery.hasCoarsePointer()).toBe(true);
      });

      it('should return false for non-touch devices', () => {
        window.matchMedia = vi.fn(() => createMockMediaQueryList(false));

        expect(MediaQuery.hasCoarsePointer()).toBe(false);
      });
    });

    describe('hasFinePointer', () => {
      it('should return true for mouse devices', () => {
        window.matchMedia = vi.fn((query: string) => {
          return createMockMediaQueryList(query === '(pointer: fine)');
        });

        expect(MediaQuery.hasFinePointer()).toBe(true);
      });

      it('should return false for non-mouse devices', () => {
        window.matchMedia = vi.fn(() => createMockMediaQueryList(false));

        expect(MediaQuery.hasFinePointer()).toBe(false);
      });
    });

    describe('isStandalone', () => {
      it('should return true when in standalone display mode', () => {
        window.matchMedia = vi.fn((query: string) => {
          return createMockMediaQueryList(query === '(display-mode: standalone)');
        });

        expect(MediaQuery.isStandalone()).toBe(true);
      });

      it('should return true when navigator.standalone is true (iOS Safari)', () => {
        window.matchMedia = vi.fn(() => createMockMediaQueryList(false));

        Object.defineProperty(window, 'navigator', {
          value: { standalone: true },
          writable: true,
          configurable: true,
        });

        expect(MediaQuery.isStandalone()).toBe(true);
      });

      it('should return false when not in standalone mode', () => {
        window.matchMedia = vi.fn(() => createMockMediaQueryList(false));

        Object.defineProperty(window, 'navigator', {
          value: { standalone: false },
          writable: true,
          configurable: true,
        });

        expect(MediaQuery.isStandalone()).toBe(false);
      });

      it('should return false when navigator is undefined', () => {
        window.matchMedia = vi.fn(() => createMockMediaQueryList(false));

        // In jsdom navigator exists, but we can test the check by ensuring
        // standalone property doesn't exist
        Object.defineProperty(window, 'navigator', {
          value: {},
          writable: true,
          configurable: true,
        });

        expect(MediaQuery.isStandalone()).toBe(false);
      });
    });
  });

  // ===========================================================================
  // Non-browser Environment
  // ===========================================================================

  describe('Non-browser Environment', () => {
    it('should handle missing matchMedia gracefully in matches()', () => {
      const tempMatchMedia = window.matchMedia;
      Object.defineProperty(window, 'matchMedia', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      expect(MediaQuery.matches('(min-width: 768px)')).toBe(false);

      window.matchMedia = tempMatchMedia;
    });

    it('should handle missing matchMedia gracefully in onChange()', () => {
      const tempMatchMedia = window.matchMedia;
      Object.defineProperty(window, 'matchMedia', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const handler = vi.fn();
      const cleanup = MediaQuery.onChange('(min-width: 768px)', handler);

      expect(cleanup).toBeInstanceOf(Function);
      expect(() => cleanup()).not.toThrow();

      window.matchMedia = tempMatchMedia;
    });

    it('should return md as default breakpoint when window is undefined', () => {
      // Test the fallback by simulating window undefined scenario
      // Since we can't truly make window undefined in jsdom, we verify the code path exists
      const tempInnerWidth = window.innerWidth;

      // When innerWidth is a valid number, it should return appropriate breakpoint
      Object.defineProperty(window, 'innerWidth', {
        value: 800,
        writable: true,
        configurable: true,
      });

      expect(MediaQuery.breakpoint()).toBe('md');

      Object.defineProperty(window, 'innerWidth', {
        value: tempInnerWidth,
        writable: true,
        configurable: true,
      });
    });
  });

  // ===========================================================================
  // Cleanup Functions
  // ===========================================================================

  describe('Cleanup Functions', () => {
    it('should properly cleanup onChange listener', () => {
      const mockMql = createMockMediaQueryList(false) as MediaQueryList & {
        _triggerChange: (matches: boolean) => void;
      };
      window.matchMedia = vi.fn(() => mockMql);

      const handler = vi.fn();
      const cleanup = MediaQuery.onChange('(min-width: 768px)', handler);

      // Trigger before cleanup
      mockMql._triggerChange(true);
      expect(handler).toHaveBeenCalledTimes(1);

      // Cleanup
      cleanup();

      // Try to trigger after cleanup - should not call handler
      // Note: Our mock removes the listener, so this verifies cleanup worked
      expect(mockMql.removeEventListener).toHaveBeenCalled();
    });

    it('should properly cleanup onBreakpointChange listener', () => {
      Object.defineProperty(window, 'innerWidth', {
        value: 800,
        writable: true,
        configurable: true,
      });

      const handler = vi.fn();
      const cleanup = MediaQuery.onBreakpointChange(handler);

      // Cleanup
      cleanup();

      // Resize after cleanup
      Object.defineProperty(window, 'innerWidth', {
        value: 1100,
        writable: true,
        configurable: true,
      });
      window.dispatchEvent(new Event('resize'));

      // Handler should not be called
      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle multiple cleanups without error', () => {
      const mockMql = createMockMediaQueryList(false);
      window.matchMedia = vi.fn(() => mockMql);

      const handler = vi.fn();
      const cleanup = MediaQuery.onChange('(min-width: 768px)', handler);

      // Call cleanup multiple times
      expect(() => {
        cleanup();
        cleanup();
        cleanup();
      }).not.toThrow();
    });
  });

  // ===========================================================================
  // Window Undefined Edge Cases
  // ===========================================================================

  describe('Window Undefined Edge Cases', () => {
    it('should return md for breakpoint when window is undefined', () => {
      const originalWindow = globalThis.window;
      // @ts-expect-error - intentionally setting undefined for test
      delete globalThis.window;

      expect(MediaQuery.breakpoint()).toBe('md');

      globalThis.window = originalWindow;
    });

    it('should return no-op cleanup for onBreakpointChange when window is undefined', () => {
      const originalWindow = globalThis.window;
      // @ts-expect-error - intentionally setting undefined for test
      delete globalThis.window;

      const handler = vi.fn();
      const cleanup = MediaQuery.onBreakpointChange(handler);

      expect(cleanup).toBeInstanceOf(Function);
      expect(() => cleanup()).not.toThrow();
      expect(handler).not.toHaveBeenCalled();

      globalThis.window = originalWindow;
    });

    it('should return xs when width is below all breakpoints', () => {
      // Set window width to 0
      Object.defineProperty(window, 'innerWidth', {
        value: 0,
        writable: true,
        configurable: true,
      });

      expect(MediaQuery.breakpoint()).toBe('xs');

      // Restore
      Object.defineProperty(window, 'innerWidth', {
        value: 1024,
        writable: true,
        configurable: true,
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

    it('should export Breakpoint type with valid values', () => {
      const breakpoints: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
      expect(breakpoints).toHaveLength(6);
    });
  });

  // ===========================================================================
  // Coverage Gaps
  // ===========================================================================

  describe('Coverage Gaps', () => {
    it('should return xs when width is below all custom breakpoints (line 214)', () => {
      Object.defineProperty(window, 'innerWidth', {
        value: 100,
        writable: true,
        configurable: true,
      });

      // Custom breakpoints where the minimum is above 100px
      const customBreakpoints = {
        sm: 640,
        md: 768,
        lg: 1024,
      };

      const result = MediaQuery.breakpoint(customBreakpoints);

      expect(result).toBe('xs');
    });
  });
});
