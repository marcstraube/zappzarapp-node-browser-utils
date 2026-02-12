import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  DeviceInfo,
  type Orientation,
  type OrientationLockType,
  type OrientationType,
  type Size,
} from '../../src/device';
import type { CleanupFn } from '../../src/core';

/**
 * User agent strings for various devices.
 */
const USER_AGENTS = {
  // Mobile devices
  iPhone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  iPad: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  iPod: 'Mozilla/5.0 (iPod touch; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
  iPadOS13:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1 Safari/605.1.15',
  androidPhone:
    'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
  androidTablet:
    'Mozilla/5.0 (Linux; Android 12; SM-T870) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
  webOS:
    'Mozilla/5.0 (webOS/2.0; U; en-US) AppleWebKit/532.2 (KHTML, like Gecko) Version/1.0 Safari/532.2 Pre/1.1',
  blackberry:
    'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.1.0.74 Mobile Safari/534.11+',
  windowsPhone:
    'Mozilla/5.0 (Windows Phone 10.0; Android 6.0.1; Microsoft; Lumia 950) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Mobile Safari/537.36 Edge/15.14977',

  // Desktop browsers
  macOSChrome:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
  macOSSafari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15',
  windowsChrome:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
  windowsEdge:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36 Edg/116.0.1938.69',
  linuxChrome:
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
  linuxFirefox: 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/117.0',
} as const;

/**
 * Platform strings for various operating systems.
 */
const PLATFORMS = {
  macOS: 'MacIntel',
  windows: 'Win32',
  linux: 'Linux x86_64',
  iPhone: 'iPhone',
  iPad: 'iPad',
  android: 'Linux armv7l',
} as const;

/**
 * Create mock navigator object.
 */
function createMockNavigator(overrides: Partial<Navigator> = {}): Navigator {
  return {
    userAgent: USER_AGENTS.macOSChrome,
    platform: PLATFORMS.macOS,
    maxTouchPoints: 0,
    languages: ['en-US', 'en'],
    language: 'en-US',
    onLine: true,
    hardwareConcurrency: 8,
    ...overrides,
  } as Navigator;
}

/**
 * Create mock screen object.
 */
function createMockScreen(overrides: Partial<Screen> = {}): Screen {
  return {
    width: 1920,
    height: 1080,
    availWidth: 1920,
    availHeight: 1040,
    orientation: {
      type: 'landscape-primary',
      angle: 0,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      lock: vi.fn().mockResolvedValue(undefined),
      unlock: vi.fn(),
    } as unknown as ScreenOrientation,
    ...overrides,
  } as Screen;
}

/**
 * Create mock window object.
 * @param options.isTouch - If true, includes ontouchstart property (simulates touch device)
 */
function createMockWindow(
  overrides: Partial<Window> = {},
  options: { isTouch?: boolean } = {}
): Partial<Window> {
  const base: Partial<Window> = {
    innerWidth: 1920,
    innerHeight: 1080,
    devicePixelRatio: 2,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    matchMedia: vi.fn().mockReturnValue({ matches: false }),
    ...overrides,
  };

  // Only add ontouchstart if simulating touch device
  // 'ontouchstart' in window is the check, so presence of property matters
  if (options.isTouch) {
    (base as Record<string, unknown>).ontouchstart = null;
  }

  return base;
}

describe('DeviceInfo', () => {
  let originalNavigator: PropertyDescriptor | undefined;
  let originalScreen: PropertyDescriptor | undefined;
  let originalWindow: PropertyDescriptor | undefined;
  let originalMatchMedia: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    originalScreen = Object.getOwnPropertyDescriptor(globalThis, 'screen');
    originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    originalMatchMedia = Object.getOwnPropertyDescriptor(globalThis, 'matchMedia');
  });

  afterEach(() => {
    if (originalNavigator) {
      Object.defineProperty(globalThis, 'navigator', originalNavigator);
    }
    if (originalScreen) {
      Object.defineProperty(globalThis, 'screen', originalScreen);
    }
    if (originalWindow) {
      Object.defineProperty(globalThis, 'window', originalWindow);
    }
    if (originalMatchMedia) {
      Object.defineProperty(globalThis, 'matchMedia', originalMatchMedia);
    }
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // Non-Browser Environment
  // ===========================================================================

  describe('Non-Browser Environment', () => {
    beforeEach(() => {
      // Remove global objects to simulate non-browser environment
      Object.defineProperty(globalThis, 'window', {
        value: undefined,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(globalThis, 'navigator', {
        value: undefined,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(globalThis, 'screen', {
        value: undefined,
        writable: true,
        configurable: true,
      });
    });

    it('isTouchDevice should return false', () => {
      expect(DeviceInfo.isTouchDevice()).toBe(false);
    });

    it('isMobile should return false', () => {
      expect(DeviceInfo.isMobile()).toBe(false);
    });

    it('isTablet should return false', () => {
      expect(DeviceInfo.isTablet()).toBe(false);
    });

    it('isDesktop should return true (not mobile, not tablet)', () => {
      expect(DeviceInfo.isDesktop()).toBe(true);
    });

    it('isIOS should return false', () => {
      expect(DeviceInfo.isIOS()).toBe(false);
    });

    it('isAndroid should return false', () => {
      expect(DeviceInfo.isAndroid()).toBe(false);
    });

    it('isWindows should return false', () => {
      expect(DeviceInfo.isWindows()).toBe(false);
    });

    it('isMacOS should return false', () => {
      expect(DeviceInfo.isMacOS()).toBe(false);
    });

    it('isLinux should return false', () => {
      expect(DeviceInfo.isLinux()).toBe(false);
    });

    it('screenSize should return zero dimensions', () => {
      const size = DeviceInfo.screenSize();
      expect(size).toEqual({ width: 0, height: 0 });
    });

    it('viewportSize should return zero dimensions', () => {
      const size = DeviceInfo.viewportSize();
      expect(size).toEqual({ width: 0, height: 0 });
    });

    it('availableScreenSize should return zero dimensions', () => {
      const size = DeviceInfo.availableScreenSize();
      expect(size).toEqual({ width: 0, height: 0 });
    });

    it('pixelRatio should return 1', () => {
      expect(DeviceInfo.pixelRatio()).toBe(1);
    });

    it('orientation should return portrait', () => {
      expect(DeviceInfo.orientation()).toBe('portrait');
    });

    it('orientationAngle should return 0', () => {
      expect(DeviceInfo.orientationAngle()).toBe(0);
    });

    it('onOrientationChange should return no-op cleanup function', () => {
      const handler = vi.fn();
      const cleanup = DeviceInfo.onOrientationChange(handler);
      expect(typeof cleanup).toBe('function');
      cleanup();
      expect(handler).not.toHaveBeenCalled();
    });

    it('isOrientationSupported should return false', () => {
      expect(DeviceInfo.isOrientationSupported()).toBe(false);
    });

    it('getOrientation should return undefined', () => {
      expect(DeviceInfo.getOrientation()).toBeUndefined();
    });

    it('lockOrientation should throw error', async () => {
      await expect(DeviceInfo.lockOrientation('portrait')).rejects.toThrow(
        'Screen Orientation API is not supported'
      );
    });

    it('unlockOrientation should not throw', () => {
      expect(() => DeviceInfo.unlockOrientation()).not.toThrow();
    });

    it('onOrientationTypeChange should return no-op cleanup function', () => {
      const handler = vi.fn();
      const cleanup = DeviceInfo.onOrientationTypeChange(handler);
      expect(typeof cleanup).toBe('function');
      cleanup();
      expect(handler).not.toHaveBeenCalled();
    });

    it('languages should return empty array', () => {
      expect(DeviceInfo.languages()).toEqual([]);
    });

    it('language should return en', () => {
      expect(DeviceInfo.language()).toBe('en');
    });

    it('isOnline should return true', () => {
      expect(DeviceInfo.isOnline()).toBe(true);
    });

    it('hardwareConcurrency should return 1', () => {
      expect(DeviceInfo.hardwareConcurrency()).toBe(1);
    });

    it('deviceMemory should return null', () => {
      expect(DeviceInfo.deviceMemory()).toBeNull();
    });
  });

  // ===========================================================================
  // Device Type Detection
  // ===========================================================================

  describe('Device Type Detection', () => {
    describe('isTouchDevice', () => {
      it('should return true when ontouchstart is present', () => {
        const mockWindow = createMockWindow({ ontouchstart: null });
        Object.defineProperty(globalThis, 'window', {
          value: mockWindow,
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'navigator', {
          value: createMockNavigator({ maxTouchPoints: 0 }),
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'matchMedia', {
          value: vi.fn().mockReturnValue({ matches: false }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.isTouchDevice()).toBe(true);
      });

      it('should return true when maxTouchPoints > 0', () => {
        Object.defineProperty(globalThis, 'window', {
          value: createMockWindow(),
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'navigator', {
          value: createMockNavigator({ maxTouchPoints: 5 }),
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'matchMedia', {
          value: vi.fn().mockReturnValue({ matches: false }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.isTouchDevice()).toBe(true);
      });

      it('should return true when pointer: coarse media query matches', () => {
        Object.defineProperty(globalThis, 'window', {
          value: createMockWindow(),
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'navigator', {
          value: createMockNavigator({ maxTouchPoints: 0 }),
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'matchMedia', {
          value: vi.fn().mockReturnValue({ matches: true }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.isTouchDevice()).toBe(true);
      });

      it('should return false for non-touch desktop', () => {
        // Create window WITHOUT ontouchstart
        const mockWindow = createMockWindow();
        delete (mockWindow as Record<string, unknown>).ontouchstart;

        Object.defineProperty(globalThis, 'window', {
          value: mockWindow,
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'navigator', {
          value: createMockNavigator({ maxTouchPoints: 0 }),
          writable: true,
          configurable: true,
        });
        // Override global matchMedia to return non-touch
        Object.defineProperty(globalThis, 'matchMedia', {
          value: vi.fn().mockReturnValue({ matches: false }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.isTouchDevice()).toBe(false);
      });
    });

    describe('isMobile', () => {
      it('should return true for iPhone user agent', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: createMockNavigator({ userAgent: USER_AGENTS.iPhone }),
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'window', {
          value: createMockWindow({ innerWidth: 375 }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.isMobile()).toBe(true);
      });

      it('should return true for iPad user agent', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: createMockNavigator({ userAgent: USER_AGENTS.iPad }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.isMobile()).toBe(true);
      });

      it('should return true for iPod user agent', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: createMockNavigator({ userAgent: USER_AGENTS.iPod }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.isMobile()).toBe(true);
      });

      it('should return true for Android phone user agent', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: createMockNavigator({ userAgent: USER_AGENTS.androidPhone }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.isMobile()).toBe(true);
      });

      it('should return true for Android tablet user agent', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: createMockNavigator({ userAgent: USER_AGENTS.androidTablet }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.isMobile()).toBe(true);
      });

      it('should return true for webOS user agent', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: createMockNavigator({ userAgent: USER_AGENTS.webOS }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.isMobile()).toBe(true);
      });

      it('should return true for BlackBerry user agent', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: createMockNavigator({ userAgent: USER_AGENTS.blackberry }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.isMobile()).toBe(true);
      });

      it('should return true for Windows Phone user agent', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: createMockNavigator({ userAgent: USER_AGENTS.windowsPhone }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.isMobile()).toBe(true);
      });

      it('should return true for narrow screen width (< 768px)', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: createMockNavigator({ userAgent: USER_AGENTS.macOSChrome }),
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'window', {
          value: createMockWindow({ innerWidth: 767 }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.isMobile()).toBe(true);
      });

      it('should return false for desktop user agent with wide screen', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: createMockNavigator({ userAgent: USER_AGENTS.macOSChrome }),
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'window', {
          value: createMockWindow({ innerWidth: 1920 }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.isMobile()).toBe(false);
      });
    });

    describe('isTablet', () => {
      it('should return true for iPad user agent', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: createMockNavigator({ userAgent: USER_AGENTS.iPad }),
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'window', {
          value: createMockWindow({ innerWidth: 1024, innerHeight: 768 }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.isTablet()).toBe(true);
      });

      it('should return true for iPadOS 13+ (Macintosh with touch)', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: createMockNavigator({
            userAgent: USER_AGENTS.iPadOS13,
            maxTouchPoints: 5,
          }),
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'window', {
          value: createMockWindow({ ontouchstart: null, innerWidth: 1024, innerHeight: 768 }),
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'matchMedia', {
          value: vi.fn().mockReturnValue({ matches: false }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.isTablet()).toBe(true);
      });

      it('should return true for Android tablet (android without mobile)', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: createMockNavigator({ userAgent: USER_AGENTS.androidTablet }),
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'window', {
          value: createMockWindow({ innerWidth: 1024, innerHeight: 768 }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.isTablet()).toBe(true);
      });

      it('should return true for tablet-sized touch device (600-1366px)', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: createMockNavigator({
            userAgent: USER_AGENTS.linuxChrome,
            maxTouchPoints: 5,
          }),
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'window', {
          value: createMockWindow({ ontouchstart: null, innerWidth: 800, innerHeight: 1200 }),
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'matchMedia', {
          value: vi.fn().mockReturnValue({ matches: false }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.isTablet()).toBe(true);
      });

      it('should return false for Android phone', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: createMockNavigator({ userAgent: USER_AGENTS.androidPhone }),
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'window', {
          value: createMockWindow({ innerWidth: 375, innerHeight: 812 }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.isTablet()).toBe(false);
      });

      it('should return false for desktop without touch', () => {
        // Create window WITHOUT ontouchstart
        const mockWindow = createMockWindow({ innerWidth: 1920, innerHeight: 1080 });
        delete (mockWindow as Record<string, unknown>).ontouchstart;

        Object.defineProperty(globalThis, 'navigator', {
          value: createMockNavigator({
            userAgent: USER_AGENTS.macOSChrome,
            maxTouchPoints: 0,
          }),
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'window', {
          value: mockWindow,
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'matchMedia', {
          value: vi.fn().mockReturnValue({ matches: false }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.isTablet()).toBe(false);
      });
    });

    describe('isDesktop', () => {
      it('should return true for desktop browser', () => {
        // Create window WITHOUT ontouchstart
        const mockWindow = createMockWindow({ innerWidth: 1920, innerHeight: 1080 });
        delete (mockWindow as Record<string, unknown>).ontouchstart;

        Object.defineProperty(globalThis, 'navigator', {
          value: createMockNavigator({
            userAgent: USER_AGENTS.macOSChrome,
            maxTouchPoints: 0,
          }),
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'window', {
          value: mockWindow,
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'matchMedia', {
          value: vi.fn().mockReturnValue({ matches: false }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.isDesktop()).toBe(true);
      });

      it('should return false for mobile device', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: createMockNavigator({ userAgent: USER_AGENTS.iPhone }),
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'window', {
          value: createMockWindow({ innerWidth: 375 }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.isDesktop()).toBe(false);
      });

      it('should return false for tablet', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: createMockNavigator({ userAgent: USER_AGENTS.iPad }),
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'window', {
          value: createMockWindow({ innerWidth: 1024, innerHeight: 768 }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.isDesktop()).toBe(false);
      });
    });
  });

  // ===========================================================================
  // OS Detection
  // ===========================================================================

  describe('OS Detection', () => {
    describe('isIOS', () => {
      it('should return true for iPhone', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: createMockNavigator({ userAgent: USER_AGENTS.iPhone }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.isIOS()).toBe(true);
      });

      it('should return true for iPad', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: createMockNavigator({ userAgent: USER_AGENTS.iPad }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.isIOS()).toBe(true);
      });

      it('should return true for iPod', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: createMockNavigator({ userAgent: USER_AGENTS.iPod }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.isIOS()).toBe(true);
      });

      it('should return true for iPadOS 13+ (Macintosh with touch)', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: createMockNavigator({
            userAgent: USER_AGENTS.iPadOS13,
            maxTouchPoints: 5,
          }),
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'window', {
          value: createMockWindow({ ontouchstart: null }),
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'matchMedia', {
          value: vi.fn().mockReturnValue({ matches: false }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.isIOS()).toBe(true);
      });

      it('should return false for Android', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: createMockNavigator({ userAgent: USER_AGENTS.androidPhone }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.isIOS()).toBe(false);
      });

      it('should return false for macOS desktop', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: createMockNavigator({
            userAgent: USER_AGENTS.macOSChrome,
            maxTouchPoints: 0,
          }),
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'window', {
          value: createMockWindow(),
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'matchMedia', {
          value: vi.fn().mockReturnValue({ matches: false }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.isIOS()).toBe(false);
      });
    });

    describe('isAndroid', () => {
      it('should return true for Android phone', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: createMockNavigator({ userAgent: USER_AGENTS.androidPhone }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.isAndroid()).toBe(true);
      });

      it('should return true for Android tablet', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: createMockNavigator({ userAgent: USER_AGENTS.androidTablet }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.isAndroid()).toBe(true);
      });

      it('should return false for iOS', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: createMockNavigator({ userAgent: USER_AGENTS.iPhone }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.isAndroid()).toBe(false);
      });

      it('should return false for desktop', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: createMockNavigator({ userAgent: USER_AGENTS.macOSChrome }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.isAndroid()).toBe(false);
      });
    });

    describe('isWindows', () => {
      it('should return true for Windows platform', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: createMockNavigator({
            userAgent: USER_AGENTS.windowsChrome,
            platform: PLATFORMS.windows,
          }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.isWindows()).toBe(true);
      });

      it('should prefer userAgentData.platform over navigator.platform', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: {
            ...createMockNavigator({
              userAgent: USER_AGENTS.windowsChrome,
              platform: PLATFORMS.linux,
            }),
            userAgentData: { platform: 'Windows' },
          },
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.isWindows()).toBe(true);
      });

      it('should return false for macOS', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: createMockNavigator({
            userAgent: USER_AGENTS.macOSChrome,
            platform: PLATFORMS.macOS,
          }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.isWindows()).toBe(false);
      });

      it('should return false for Linux', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: createMockNavigator({
            userAgent: USER_AGENTS.linuxChrome,
            platform: PLATFORMS.linux,
          }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.isWindows()).toBe(false);
      });
    });

    describe('isMacOS', () => {
      it('should return true for macOS platform', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: createMockNavigator({
            userAgent: USER_AGENTS.macOSChrome,
            platform: PLATFORMS.macOS,
            maxTouchPoints: 0,
          }),
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'window', {
          value: createMockWindow(),
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'matchMedia', {
          value: vi.fn().mockReturnValue({ matches: false }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.isMacOS()).toBe(true);
      });

      it('should prefer userAgentData.platform over navigator.platform', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: {
            ...createMockNavigator({
              userAgent: USER_AGENTS.macOSChrome,
              platform: PLATFORMS.linux,
              maxTouchPoints: 0,
            }),
            userAgentData: { platform: 'macOS' },
          },
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'window', {
          value: createMockWindow(),
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'matchMedia', {
          value: vi.fn().mockReturnValue({ matches: false }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.isMacOS()).toBe(true);
      });

      it('should return false for iOS (even though platform contains mac)', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: createMockNavigator({
            userAgent: USER_AGENTS.iPhone,
            platform: PLATFORMS.iPhone,
          }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.isMacOS()).toBe(false);
      });

      it('should return false for iPadOS 13+ (Macintosh with touch)', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: createMockNavigator({
            userAgent: USER_AGENTS.iPadOS13,
            platform: PLATFORMS.macOS,
            maxTouchPoints: 5,
          }),
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'window', {
          value: createMockWindow({ ontouchstart: null }),
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'matchMedia', {
          value: vi.fn().mockReturnValue({ matches: false }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.isMacOS()).toBe(false);
      });

      it('should return false for Windows', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: createMockNavigator({
            userAgent: USER_AGENTS.windowsChrome,
            platform: PLATFORMS.windows,
          }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.isMacOS()).toBe(false);
      });
    });

    describe('isLinux', () => {
      it('should return true for Linux platform', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: createMockNavigator({
            userAgent: USER_AGENTS.linuxChrome,
            platform: PLATFORMS.linux,
          }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.isLinux()).toBe(true);
      });

      it('should prefer userAgentData.platform over navigator.platform', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: {
            ...createMockNavigator({
              userAgent: USER_AGENTS.linuxChrome,
              platform: PLATFORMS.windows,
            }),
            userAgentData: { platform: 'Linux' },
          },
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.isLinux()).toBe(true);
      });

      it('should return false for Android (even though platform is Linux)', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: createMockNavigator({
            userAgent: USER_AGENTS.androidPhone,
            platform: PLATFORMS.android,
          }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.isLinux()).toBe(false);
      });

      it('should return false for macOS', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: createMockNavigator({
            userAgent: USER_AGENTS.macOSChrome,
            platform: PLATFORMS.macOS,
          }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.isLinux()).toBe(false);
      });

      it('should return false for Windows', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: createMockNavigator({
            userAgent: USER_AGENTS.windowsChrome,
            platform: PLATFORMS.windows,
          }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.isLinux()).toBe(false);
      });
    });
  });

  // ===========================================================================
  // Screen & Viewport
  // ===========================================================================

  describe('Screen & Viewport', () => {
    describe('screenSize', () => {
      it('should return screen dimensions', () => {
        Object.defineProperty(globalThis, 'screen', {
          value: createMockScreen({ width: 1920, height: 1080 }),
          writable: true,
          configurable: true,
        });

        const size = DeviceInfo.screenSize();

        expect(size).toEqual({ width: 1920, height: 1080 });
      });

      it('should return different dimensions for mobile', () => {
        Object.defineProperty(globalThis, 'screen', {
          value: createMockScreen({ width: 375, height: 812 }),
          writable: true,
          configurable: true,
        });

        const size = DeviceInfo.screenSize();

        expect(size).toEqual({ width: 375, height: 812 });
      });
    });

    describe('viewportSize', () => {
      it('should return viewport dimensions', () => {
        Object.defineProperty(globalThis, 'window', {
          value: createMockWindow({ innerWidth: 1920, innerHeight: 1080 }),
          writable: true,
          configurable: true,
        });

        const size = DeviceInfo.viewportSize();

        expect(size).toEqual({ width: 1920, height: 1080 });
      });

      it('should return different dimensions for mobile', () => {
        Object.defineProperty(globalThis, 'window', {
          value: createMockWindow({ innerWidth: 375, innerHeight: 667 }),
          writable: true,
          configurable: true,
        });

        const size = DeviceInfo.viewportSize();

        expect(size).toEqual({ width: 375, height: 667 });
      });
    });

    describe('availableScreenSize', () => {
      it('should return available screen dimensions', () => {
        Object.defineProperty(globalThis, 'screen', {
          value: createMockScreen({ availWidth: 1920, availHeight: 1040 }),
          writable: true,
          configurable: true,
        });

        const size = DeviceInfo.availableScreenSize();

        expect(size).toEqual({ width: 1920, height: 1040 });
      });

      it('should account for taskbar', () => {
        Object.defineProperty(globalThis, 'screen', {
          value: createMockScreen({
            width: 1920,
            height: 1080,
            availWidth: 1920,
            availHeight: 1040,
          }),
          writable: true,
          configurable: true,
        });

        const screenSize = DeviceInfo.screenSize();
        const availableSize = DeviceInfo.availableScreenSize();

        expect(availableSize.height).toBeLessThan(screenSize.height);
      });
    });

    describe('pixelRatio', () => {
      it('should return device pixel ratio', () => {
        Object.defineProperty(globalThis, 'window', {
          value: createMockWindow({ devicePixelRatio: 2 }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.pixelRatio()).toBe(2);
      });

      it('should return 1 as default when not defined', () => {
        Object.defineProperty(globalThis, 'window', {
          value: createMockWindow({ devicePixelRatio: undefined }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.pixelRatio()).toBe(1);
      });

      it('should handle high DPI displays', () => {
        Object.defineProperty(globalThis, 'window', {
          value: createMockWindow({ devicePixelRatio: 3 }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.pixelRatio()).toBe(3);
      });
    });
  });

  // ===========================================================================
  // Orientation
  // ===========================================================================

  describe('Orientation', () => {
    describe('isOrientationSupported', () => {
      it('should return true when screen.orientation is available', () => {
        Object.defineProperty(globalThis, 'screen', {
          value: createMockScreen({
            orientation: {
              type: 'portrait-primary',
              angle: 0,
              addEventListener: vi.fn(),
              removeEventListener: vi.fn(),
            } as unknown as ScreenOrientation,
          }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.isOrientationSupported()).toBe(true);
      });

      it('should return false when screen.orientation is not available', () => {
        Object.defineProperty(globalThis, 'screen', {
          value: createMockScreen({ orientation: undefined }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.isOrientationSupported()).toBe(false);
      });

      it('should return false when screen is undefined', () => {
        Object.defineProperty(globalThis, 'screen', {
          value: undefined,
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.isOrientationSupported()).toBe(false);
      });
    });

    describe('getOrientation', () => {
      it('should return the full orientation type when supported', () => {
        Object.defineProperty(globalThis, 'screen', {
          value: createMockScreen({
            orientation: {
              type: 'portrait-primary',
              angle: 0,
              addEventListener: vi.fn(),
              removeEventListener: vi.fn(),
            } as unknown as ScreenOrientation,
          }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.getOrientation()).toBe('portrait-primary');
      });

      it('should return landscape-primary', () => {
        Object.defineProperty(globalThis, 'screen', {
          value: createMockScreen({
            orientation: {
              type: 'landscape-primary',
              angle: 0,
              addEventListener: vi.fn(),
              removeEventListener: vi.fn(),
            } as unknown as ScreenOrientation,
          }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.getOrientation()).toBe('landscape-primary');
      });

      it('should return portrait-secondary', () => {
        Object.defineProperty(globalThis, 'screen', {
          value: createMockScreen({
            orientation: {
              type: 'portrait-secondary',
              angle: 180,
              addEventListener: vi.fn(),
              removeEventListener: vi.fn(),
            } as unknown as ScreenOrientation,
          }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.getOrientation()).toBe('portrait-secondary');
      });

      it('should return landscape-secondary', () => {
        Object.defineProperty(globalThis, 'screen', {
          value: createMockScreen({
            orientation: {
              type: 'landscape-secondary',
              angle: 270,
              addEventListener: vi.fn(),
              removeEventListener: vi.fn(),
            } as unknown as ScreenOrientation,
          }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.getOrientation()).toBe('landscape-secondary');
      });

      it('should return undefined when not supported', () => {
        Object.defineProperty(globalThis, 'screen', {
          value: createMockScreen({ orientation: undefined }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.getOrientation()).toBeUndefined();
      });

      it('should return undefined when screen is undefined', () => {
        Object.defineProperty(globalThis, 'screen', {
          value: undefined,
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.getOrientation()).toBeUndefined();
      });
    });

    describe('orientation', () => {
      it('should return portrait when screen.orientation.type is portrait-primary', () => {
        Object.defineProperty(globalThis, 'window', {
          value: createMockWindow(),
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'screen', {
          value: createMockScreen({
            orientation: {
              type: 'portrait-primary',
              angle: 0,
              addEventListener: vi.fn(),
              removeEventListener: vi.fn(),
            } as unknown as ScreenOrientation,
          }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.orientation()).toBe('portrait');
      });

      it('should return portrait when screen.orientation.type is portrait-secondary', () => {
        Object.defineProperty(globalThis, 'window', {
          value: createMockWindow(),
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'screen', {
          value: createMockScreen({
            orientation: {
              type: 'portrait-secondary',
              angle: 180,
              addEventListener: vi.fn(),
              removeEventListener: vi.fn(),
            } as unknown as ScreenOrientation,
          }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.orientation()).toBe('portrait');
      });

      it('should return landscape when screen.orientation.type is landscape-primary', () => {
        Object.defineProperty(globalThis, 'window', {
          value: createMockWindow(),
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'screen', {
          value: createMockScreen({
            orientation: {
              type: 'landscape-primary',
              angle: 0,
              addEventListener: vi.fn(),
              removeEventListener: vi.fn(),
            } as unknown as ScreenOrientation,
          }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.orientation()).toBe('landscape');
      });

      it('should return landscape when screen.orientation.type is landscape-secondary', () => {
        Object.defineProperty(globalThis, 'window', {
          value: createMockWindow(),
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'screen', {
          value: createMockScreen({
            orientation: {
              type: 'landscape-secondary',
              angle: 270,
              addEventListener: vi.fn(),
              removeEventListener: vi.fn(),
            } as unknown as ScreenOrientation,
          }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.orientation()).toBe('landscape');
      });

      it('should fallback to dimension comparison when screen.orientation not available', () => {
        Object.defineProperty(globalThis, 'window', {
          value: createMockWindow({ innerWidth: 375, innerHeight: 812 }),
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'screen', {
          value: createMockScreen({ orientation: undefined }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.orientation()).toBe('portrait');
      });

      it('should return landscape when width > height (fallback)', () => {
        Object.defineProperty(globalThis, 'window', {
          value: createMockWindow({ innerWidth: 1920, innerHeight: 1080 }),
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'screen', {
          value: createMockScreen({ orientation: undefined }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.orientation()).toBe('landscape');
      });
    });

    describe('orientationAngle', () => {
      it('should return angle from screen.orientation', () => {
        Object.defineProperty(globalThis, 'screen', {
          value: createMockScreen({
            orientation: {
              type: 'landscape-primary',
              angle: 90,
              addEventListener: vi.fn(),
              removeEventListener: vi.fn(),
            } as unknown as ScreenOrientation,
          }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.orientationAngle()).toBe(90);
      });

      it('should return 0 when no orientation info available', () => {
        Object.defineProperty(globalThis, 'screen', {
          value: createMockScreen({ orientation: undefined }),
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'window', {
          value: createMockWindow(),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.orientationAngle()).toBe(0);
      });
    });

    describe('onOrientationChange', () => {
      it('should add event listener to screen.orientation', () => {
        const addEventListener = vi.fn();
        const removeEventListener = vi.fn();

        Object.defineProperty(globalThis, 'window', {
          value: createMockWindow(),
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'screen', {
          value: createMockScreen({
            orientation: {
              type: 'portrait-primary',
              angle: 0,
              addEventListener,
              removeEventListener,
            } as unknown as ScreenOrientation,
          }),
          writable: true,
          configurable: true,
        });

        const handler = vi.fn();
        const cleanup = DeviceInfo.onOrientationChange(handler);

        expect(addEventListener).toHaveBeenCalledWith('change', expect.any(Function));

        cleanup();

        expect(removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
      });

      it('should fallback to resize event when screen.orientation not available', () => {
        const addEventListener = vi.fn();
        const removeEventListener = vi.fn();

        Object.defineProperty(globalThis, 'window', {
          value: {
            ...createMockWindow(),
            addEventListener,
            removeEventListener,
          },
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'screen', {
          value: createMockScreen({ orientation: undefined }),
          writable: true,
          configurable: true,
        });

        const handler = vi.fn();
        const cleanup = DeviceInfo.onOrientationChange(handler);

        expect(addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));

        cleanup();

        expect(removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
      });

      it('should call handler when orientation changes', () => {
        let capturedHandler: (() => void) | undefined;
        const addEventListener = vi.fn((_event, handler) => {
          capturedHandler = handler as () => void;
        });

        let currentOrientationType = 'portrait-primary';

        Object.defineProperty(globalThis, 'window', {
          value: createMockWindow({ innerWidth: 375, innerHeight: 812 }),
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'screen', {
          value: {
            ...createMockScreen(),
            get orientation() {
              return {
                get type() {
                  return currentOrientationType;
                },
                angle: 0,
                addEventListener,
                removeEventListener: vi.fn(),
              };
            },
          },
          writable: true,
          configurable: true,
        });

        const handler = vi.fn();
        DeviceInfo.onOrientationChange(handler);

        // Initially portrait, no change yet
        expect(handler).not.toHaveBeenCalled();

        // Simulate orientation change
        currentOrientationType = 'landscape-primary';
        capturedHandler?.();

        expect(handler).toHaveBeenCalledWith('landscape');
      });

      it('should not call handler when orientation stays the same', () => {
        let capturedHandler: (() => void) | undefined;
        const addEventListener = vi.fn((_event, handler) => {
          capturedHandler = handler as () => void;
        });

        Object.defineProperty(globalThis, 'window', {
          value: createMockWindow(),
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'screen', {
          value: createMockScreen({
            orientation: {
              type: 'portrait-primary',
              angle: 0,
              addEventListener,
              removeEventListener: vi.fn(),
            } as unknown as ScreenOrientation,
          }),
          writable: true,
          configurable: true,
        });

        const handler = vi.fn();
        DeviceInfo.onOrientationChange(handler);

        // Trigger event without actual orientation change
        capturedHandler?.();

        expect(handler).not.toHaveBeenCalled();
      });
    });

    describe('lockOrientation', () => {
      it('should resolve when lock succeeds', async () => {
        const lock = vi.fn().mockResolvedValue(undefined);

        Object.defineProperty(globalThis, 'screen', {
          value: createMockScreen({
            orientation: {
              type: 'portrait-primary',
              angle: 0,
              lock,
              unlock: vi.fn(),
              addEventListener: vi.fn(),
              removeEventListener: vi.fn(),
            } as unknown as ScreenOrientation,
          }),
          writable: true,
          configurable: true,
        });

        await expect(DeviceInfo.lockOrientation('portrait')).resolves.toBeUndefined();
        expect(lock).toHaveBeenCalledWith('portrait');
      });

      it('should throw when lock fails', async () => {
        const lock = vi.fn().mockRejectedValue(new Error('Lock not supported'));

        Object.defineProperty(globalThis, 'screen', {
          value: createMockScreen({
            orientation: {
              type: 'portrait-primary',
              angle: 0,
              lock,
              unlock: vi.fn(),
              addEventListener: vi.fn(),
              removeEventListener: vi.fn(),
            } as unknown as ScreenOrientation,
          }),
          writable: true,
          configurable: true,
        });

        await expect(DeviceInfo.lockOrientation('landscape')).rejects.toThrow('Lock not supported');
      });

      it('should throw when screen.orientation not available', async () => {
        Object.defineProperty(globalThis, 'screen', {
          value: createMockScreen({ orientation: undefined }),
          writable: true,
          configurable: true,
        });

        await expect(DeviceInfo.lockOrientation('portrait')).rejects.toThrow(
          'Screen Orientation API is not supported'
        );
      });

      it('should support all orientation lock types', async () => {
        const lock = vi.fn().mockResolvedValue(undefined);

        Object.defineProperty(globalThis, 'screen', {
          value: createMockScreen({
            orientation: {
              type: 'portrait-primary',
              angle: 0,
              lock,
              unlock: vi.fn(),
              addEventListener: vi.fn(),
              removeEventListener: vi.fn(),
            } as unknown as ScreenOrientation,
          }),
          writable: true,
          configurable: true,
        });

        const orientations: OrientationLockType[] = [
          'any',
          'natural',
          'landscape',
          'portrait',
          'portrait-primary',
          'portrait-secondary',
          'landscape-primary',
          'landscape-secondary',
        ];

        for (const orientation of orientations) {
          await DeviceInfo.lockOrientation(orientation);
          expect(lock).toHaveBeenCalledWith(orientation);
        }
      });
    });

    describe('onOrientationTypeChange', () => {
      it('should add event listener to screen.orientation', () => {
        const addEventListener = vi.fn();
        const removeEventListener = vi.fn();

        Object.defineProperty(globalThis, 'window', {
          value: createMockWindow(),
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'screen', {
          value: createMockScreen({
            orientation: {
              type: 'portrait-primary',
              angle: 0,
              addEventListener,
              removeEventListener,
            } as unknown as ScreenOrientation,
          }),
          writable: true,
          configurable: true,
        });

        const handler = vi.fn();
        const cleanup = DeviceInfo.onOrientationTypeChange(handler);

        expect(addEventListener).toHaveBeenCalledWith('change', expect.any(Function));

        cleanup();

        expect(removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
      });

      it('should return no-op cleanup when screen.orientation not available', () => {
        Object.defineProperty(globalThis, 'window', {
          value: createMockWindow(),
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'screen', {
          value: createMockScreen({ orientation: undefined }),
          writable: true,
          configurable: true,
        });

        const handler = vi.fn();
        const cleanup = DeviceInfo.onOrientationTypeChange(handler);

        expect(typeof cleanup).toBe('function');
        cleanup(); // Should not throw
        expect(handler).not.toHaveBeenCalled();
      });

      it('should call handler with full OrientationType when orientation changes', () => {
        let capturedHandler: (() => void) | undefined;
        const addEventListener = vi.fn((_event, handler) => {
          capturedHandler = handler as () => void;
        });

        let currentOrientationType = 'portrait-primary';

        Object.defineProperty(globalThis, 'window', {
          value: createMockWindow({ innerWidth: 375, innerHeight: 812 }),
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'screen', {
          value: {
            ...createMockScreen(),
            get orientation() {
              return {
                get type() {
                  return currentOrientationType;
                },
                angle: 0,
                addEventListener,
                removeEventListener: vi.fn(),
              };
            },
          },
          writable: true,
          configurable: true,
        });

        const handler = vi.fn();
        DeviceInfo.onOrientationTypeChange(handler);

        // Initially portrait-primary, no change yet
        expect(handler).not.toHaveBeenCalled();

        // Simulate orientation change to landscape-primary
        currentOrientationType = 'landscape-primary';
        capturedHandler?.();

        expect(handler).toHaveBeenCalledWith('landscape-primary');
      });

      it('should call handler with portrait-secondary', () => {
        let capturedHandler: (() => void) | undefined;
        const addEventListener = vi.fn((_event, handler) => {
          capturedHandler = handler as () => void;
        });

        let currentOrientationType = 'portrait-primary';

        Object.defineProperty(globalThis, 'window', {
          value: createMockWindow(),
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'screen', {
          value: {
            ...createMockScreen(),
            get orientation() {
              return {
                get type() {
                  return currentOrientationType;
                },
                angle: 0,
                addEventListener,
                removeEventListener: vi.fn(),
              };
            },
          },
          writable: true,
          configurable: true,
        });

        const handler = vi.fn();
        DeviceInfo.onOrientationTypeChange(handler);

        currentOrientationType = 'portrait-secondary';
        capturedHandler?.();

        expect(handler).toHaveBeenCalledWith('portrait-secondary');
      });

      it('should call handler with landscape-secondary', () => {
        let capturedHandler: (() => void) | undefined;
        const addEventListener = vi.fn((_event, handler) => {
          capturedHandler = handler as () => void;
        });

        let currentOrientationType = 'portrait-primary';

        Object.defineProperty(globalThis, 'window', {
          value: createMockWindow(),
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'screen', {
          value: {
            ...createMockScreen(),
            get orientation() {
              return {
                get type() {
                  return currentOrientationType;
                },
                angle: 0,
                addEventListener,
                removeEventListener: vi.fn(),
              };
            },
          },
          writable: true,
          configurable: true,
        });

        const handler = vi.fn();
        DeviceInfo.onOrientationTypeChange(handler);

        currentOrientationType = 'landscape-secondary';
        capturedHandler?.();

        expect(handler).toHaveBeenCalledWith('landscape-secondary');
      });

      it('should not call handler when orientation type stays the same', () => {
        let capturedHandler: (() => void) | undefined;
        const addEventListener = vi.fn((_event, handler) => {
          capturedHandler = handler as () => void;
        });

        Object.defineProperty(globalThis, 'window', {
          value: createMockWindow(),
          writable: true,
          configurable: true,
        });
        Object.defineProperty(globalThis, 'screen', {
          value: createMockScreen({
            orientation: {
              type: 'portrait-primary',
              angle: 0,
              addEventListener,
              removeEventListener: vi.fn(),
            } as unknown as ScreenOrientation,
          }),
          writable: true,
          configurable: true,
        });

        const handler = vi.fn();
        DeviceInfo.onOrientationTypeChange(handler);

        // Trigger event without actual orientation change
        capturedHandler?.();

        expect(handler).not.toHaveBeenCalled();
      });
    });

    describe('unlockOrientation', () => {
      it('should call unlock on screen.orientation', () => {
        const unlock = vi.fn();

        Object.defineProperty(globalThis, 'screen', {
          value: createMockScreen({
            orientation: {
              type: 'portrait-primary',
              angle: 0,
              lock: vi.fn(),
              unlock,
              addEventListener: vi.fn(),
              removeEventListener: vi.fn(),
            } as unknown as ScreenOrientation,
          }),
          writable: true,
          configurable: true,
        });

        DeviceInfo.unlockOrientation();

        expect(unlock).toHaveBeenCalled();
      });

      it('should not throw when screen.orientation not available', () => {
        Object.defineProperty(globalThis, 'screen', {
          value: createMockScreen({ orientation: undefined }),
          writable: true,
          configurable: true,
        });

        expect(() => DeviceInfo.unlockOrientation()).not.toThrow();
      });
    });
  });

  // ===========================================================================
  // Browser Features
  // ===========================================================================

  describe('Browser Features', () => {
    describe('languages', () => {
      it('should return navigator.languages', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: createMockNavigator({ languages: ['en-US', 'en', 'de'] as readonly string[] }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.languages()).toEqual(['en-US', 'en', 'de']);
      });

      it('should fallback to navigator.language when languages not available', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: {
            ...createMockNavigator(),
            languages: undefined,
            language: 'fr-FR',
          },
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.languages()).toEqual(['fr-FR']);
      });

      it('should filter out falsy values in fallback', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: {
            ...createMockNavigator(),
            languages: undefined,
            language: '',
          },
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.languages()).toEqual([]);
      });
    });

    describe('language', () => {
      it('should return navigator.language', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: createMockNavigator({ language: 'de-DE' }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.language()).toBe('de-DE');
      });

      it('should fallback to en when language not available', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: {
            ...createMockNavigator(),
            language: undefined,
          },
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.language()).toBe('en');
      });
    });

    describe('isOnline', () => {
      it('should return true when online', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: createMockNavigator({ onLine: true }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.isOnline()).toBe(true);
      });

      it('should return false when offline', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: createMockNavigator({ onLine: false }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.isOnline()).toBe(false);
      });
    });

    describe('hardwareConcurrency', () => {
      it('should return navigator.hardwareConcurrency', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: createMockNavigator({ hardwareConcurrency: 16 }),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.hardwareConcurrency()).toBe(16);
      });

      it('should fallback to 1 when not available', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: {
            ...createMockNavigator(),
            hardwareConcurrency: undefined,
          },
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.hardwareConcurrency()).toBe(1);
      });
    });

    describe('deviceMemory', () => {
      it('should return deviceMemory when available', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: {
            ...createMockNavigator(),
            deviceMemory: 8,
          },
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.deviceMemory()).toBe(8);
      });

      it('should return null when deviceMemory not available', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: createMockNavigator(),
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.deviceMemory()).toBeNull();
      });

      it('should handle low memory devices', () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: {
            ...createMockNavigator(),
            deviceMemory: 0.5,
          },
          writable: true,
          configurable: true,
        });

        expect(DeviceInfo.deviceMemory()).toBe(0.5);
      });
    });
  });

  // ===========================================================================
  // Type Exports
  // ===========================================================================

  describe('Type Exports', () => {
    it('should export CleanupFn type', () => {
      const cleanup: CleanupFn = () => {};
      expect(typeof cleanup).toBe('function');
    });

    it('should export Orientation type', () => {
      const portrait: Orientation = 'portrait';
      const landscape: Orientation = 'landscape';
      expect(portrait).toBe('portrait');
      expect(landscape).toBe('landscape');
    });

    it('should export OrientationType', () => {
      const portraitPrimary: OrientationType = 'portrait-primary';
      const portraitSecondary: OrientationType = 'portrait-secondary';
      const landscapePrimary: OrientationType = 'landscape-primary';
      const landscapeSecondary: OrientationType = 'landscape-secondary';
      expect(portraitPrimary).toBe('portrait-primary');
      expect(portraitSecondary).toBe('portrait-secondary');
      expect(landscapePrimary).toBe('landscape-primary');
      expect(landscapeSecondary).toBe('landscape-secondary');
    });

    it('should export OrientationLockType', () => {
      const lockTypes: OrientationLockType[] = [
        'any',
        'natural',
        'landscape',
        'portrait',
        'portrait-primary',
        'portrait-secondary',
        'landscape-primary',
        'landscape-secondary',
      ];
      expect(lockTypes).toHaveLength(8);
    });

    it('should export Size interface', () => {
      const size: Size = { width: 100, height: 200 };
      expect(size.width).toBe(100);
      expect(size.height).toBe(200);
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle matchMedia not being defined', () => {
      Object.defineProperty(globalThis, 'window', {
        value: {
          ...createMockWindow(),
          matchMedia: undefined,
        },
        writable: true,
        configurable: true,
      });
      Object.defineProperty(globalThis, 'navigator', {
        value: createMockNavigator({ maxTouchPoints: 0 }),
        writable: true,
        configurable: true,
      });
      Object.defineProperty(globalThis, 'matchMedia', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      // Should not throw and return false
      expect(DeviceInfo.isTouchDevice()).toBe(false);
    });

    it('should handle window with missing innerWidth (mobile check)', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: createMockNavigator({ userAgent: USER_AGENTS.macOSChrome }),
        writable: true,
        configurable: true,
      });
      Object.defineProperty(globalThis, 'window', {
        value: {
          ...createMockWindow(),
          innerWidth: undefined,
        },
        writable: true,
        configurable: true,
      });

      // Should not throw
      expect(DeviceInfo.isMobile()).toBe(false);
    });

    it('should handle window without devicePixelRatio', () => {
      Object.defineProperty(globalThis, 'window', {
        value: {
          ...createMockWindow(),
          devicePixelRatio: null,
        },
        writable: true,
        configurable: true,
      });

      expect(DeviceInfo.pixelRatio()).toBe(1);
    });
  });
});
