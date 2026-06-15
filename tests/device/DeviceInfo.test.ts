import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  DeviceInfo,
  type Orientation,
  type OrientationLockType,
  type OrientationState,
  type OrientationType,
  type Size,
} from '../../src/device/index.js';
import type { CleanupFn } from '../../src/core/index.js';

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

/**
 * Define a property on `globalThis` using the standard test descriptor
 * (writable + configurable), so it can be reset in `afterEach`.
 */
function defineGlobal(name: string, value: unknown): void {
  Object.defineProperty(globalThis, name, {
    value,
    writable: true,
    configurable: true,
  });
}

/**
 * Create a mock `ScreenOrientation` with overridable defaults.
 */
function mockOrientation(overrides: Partial<ScreenOrientation> = {}): ScreenOrientation {
  return {
    type: 'landscape-primary',
    angle: 0,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    ...overrides,
  } as unknown as ScreenOrientation;
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
      defineGlobal('window', undefined);
      defineGlobal('navigator', undefined);
      defineGlobal('screen', undefined);
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

    it('isOrientationSupported should return false', () => {
      expect(DeviceInfo.isOrientationSupported()).toBe(false);
    });

    it('getOrientation should return undefined', () => {
      expect(DeviceInfo.getOrientation()).toBeUndefined();
    });

    it('onOrientationChange should return no-op cleanup function', () => {
      const handler = vi.fn();
      const cleanup = DeviceInfo.onOrientationChange(handler);
      expect(typeof cleanup).toBe('function');
      cleanup();
      expect(handler).not.toHaveBeenCalled();
    });

    it('lockOrientation should throw error', async () => {
      await expect(DeviceInfo.lockOrientation('portrait')).rejects.toThrow(
        'Screen Orientation API is not supported'
      );
    });

    it('unlockOrientation should not throw', () => {
      expect(() => DeviceInfo.unlockOrientation()).not.toThrow();
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
        defineGlobal('window', mockWindow);
        defineGlobal('navigator', createMockNavigator({ maxTouchPoints: 0 }));
        defineGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));

        expect(DeviceInfo.isTouchDevice()).toBe(true);
      });

      it('should return true when maxTouchPoints > 0', () => {
        defineGlobal('window', createMockWindow());
        defineGlobal('navigator', createMockNavigator({ maxTouchPoints: 5 }));
        defineGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));

        expect(DeviceInfo.isTouchDevice()).toBe(true);
      });

      it('should return true when pointer: coarse media query matches', () => {
        defineGlobal('window', createMockWindow());
        defineGlobal('navigator', createMockNavigator({ maxTouchPoints: 0 }));
        defineGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));

        expect(DeviceInfo.isTouchDevice()).toBe(true);
      });

      it('should return false for non-touch desktop', () => {
        // Create window WITHOUT ontouchstart
        const mockWindow = createMockWindow();
        delete (mockWindow as Record<string, unknown>).ontouchstart;

        defineGlobal('window', mockWindow);
        defineGlobal('navigator', createMockNavigator({ maxTouchPoints: 0 }));
        // Override global matchMedia to return non-touch
        defineGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));

        expect(DeviceInfo.isTouchDevice()).toBe(false);
      });
    });

    describe('isMobile', () => {
      it('should return true for iPhone user agent', () => {
        defineGlobal('navigator', createMockNavigator({ userAgent: USER_AGENTS.iPhone }));
        defineGlobal('window', createMockWindow({ innerWidth: 375 }));

        expect(DeviceInfo.isMobile()).toBe(true);
      });

      it('should return true for iPad user agent', () => {
        defineGlobal('navigator', createMockNavigator({ userAgent: USER_AGENTS.iPad }));

        expect(DeviceInfo.isMobile()).toBe(true);
      });

      it('should return true for iPod user agent', () => {
        defineGlobal('navigator', createMockNavigator({ userAgent: USER_AGENTS.iPod }));

        expect(DeviceInfo.isMobile()).toBe(true);
      });

      it('should return true for Android phone user agent', () => {
        defineGlobal('navigator', createMockNavigator({ userAgent: USER_AGENTS.androidPhone }));

        expect(DeviceInfo.isMobile()).toBe(true);
      });

      it('should return true for Android tablet user agent', () => {
        defineGlobal('navigator', createMockNavigator({ userAgent: USER_AGENTS.androidTablet }));

        expect(DeviceInfo.isMobile()).toBe(true);
      });

      it('should return true for webOS user agent', () => {
        defineGlobal('navigator', createMockNavigator({ userAgent: USER_AGENTS.webOS }));

        expect(DeviceInfo.isMobile()).toBe(true);
      });

      it('should return true for BlackBerry user agent', () => {
        defineGlobal('navigator', createMockNavigator({ userAgent: USER_AGENTS.blackberry }));

        expect(DeviceInfo.isMobile()).toBe(true);
      });

      it('should return true for Windows Phone user agent', () => {
        defineGlobal('navigator', createMockNavigator({ userAgent: USER_AGENTS.windowsPhone }));

        expect(DeviceInfo.isMobile()).toBe(true);
      });

      it('should return true for narrow screen width (< 768px)', () => {
        defineGlobal('navigator', createMockNavigator({ userAgent: USER_AGENTS.macOSChrome }));
        defineGlobal('window', createMockWindow({ innerWidth: 767 }));

        expect(DeviceInfo.isMobile()).toBe(true);
      });

      it('should return false for desktop user agent with wide screen', () => {
        defineGlobal('navigator', createMockNavigator({ userAgent: USER_AGENTS.macOSChrome }));
        defineGlobal('window', createMockWindow({ innerWidth: 1920 }));

        expect(DeviceInfo.isMobile()).toBe(false);
      });
    });

    describe('isTablet', () => {
      it('should return true for iPad user agent', () => {
        defineGlobal('navigator', createMockNavigator({ userAgent: USER_AGENTS.iPad }));
        defineGlobal('window', createMockWindow({ innerWidth: 1024, innerHeight: 768 }));

        expect(DeviceInfo.isTablet()).toBe(true);
      });

      it('should return true for iPadOS 13+ (Macintosh with touch)', () => {
        defineGlobal(
          'navigator',
          createMockNavigator({
            userAgent: USER_AGENTS.iPadOS13,
            maxTouchPoints: 5,
          })
        );
        defineGlobal(
          'window',
          createMockWindow({ ontouchstart: null, innerWidth: 1024, innerHeight: 768 })
        );
        defineGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));

        expect(DeviceInfo.isTablet()).toBe(true);
      });

      it('should return true for Android tablet (android without mobile)', () => {
        defineGlobal('navigator', createMockNavigator({ userAgent: USER_AGENTS.androidTablet }));
        defineGlobal('window', createMockWindow({ innerWidth: 1024, innerHeight: 768 }));

        expect(DeviceInfo.isTablet()).toBe(true);
      });

      it('should return true for tablet-sized touch device (600-1366px)', () => {
        defineGlobal(
          'navigator',
          createMockNavigator({
            userAgent: USER_AGENTS.linuxChrome,
            maxTouchPoints: 5,
          })
        );
        defineGlobal(
          'window',
          createMockWindow({ ontouchstart: null, innerWidth: 800, innerHeight: 1200 })
        );
        defineGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));

        expect(DeviceInfo.isTablet()).toBe(true);
      });

      it('should return false for Android phone', () => {
        defineGlobal('navigator', createMockNavigator({ userAgent: USER_AGENTS.androidPhone }));
        defineGlobal('window', createMockWindow({ innerWidth: 375, innerHeight: 812 }));

        expect(DeviceInfo.isTablet()).toBe(false);
      });

      it('should return false for desktop without touch', () => {
        // Create window WITHOUT ontouchstart
        const mockWindow = createMockWindow({ innerWidth: 1920, innerHeight: 1080 });
        delete (mockWindow as Record<string, unknown>).ontouchstart;

        defineGlobal(
          'navigator',
          createMockNavigator({
            userAgent: USER_AGENTS.macOSChrome,
            maxTouchPoints: 0,
          })
        );
        defineGlobal('window', mockWindow);
        defineGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));

        expect(DeviceInfo.isTablet()).toBe(false);
      });
    });

    describe('isDesktop', () => {
      it('should return true for desktop browser', () => {
        // Create window WITHOUT ontouchstart
        const mockWindow = createMockWindow({ innerWidth: 1920, innerHeight: 1080 });
        delete (mockWindow as Record<string, unknown>).ontouchstart;

        defineGlobal(
          'navigator',
          createMockNavigator({
            userAgent: USER_AGENTS.macOSChrome,
            maxTouchPoints: 0,
          })
        );
        defineGlobal('window', mockWindow);
        defineGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));

        expect(DeviceInfo.isDesktop()).toBe(true);
      });

      it('should return false for mobile device', () => {
        defineGlobal('navigator', createMockNavigator({ userAgent: USER_AGENTS.iPhone }));
        defineGlobal('window', createMockWindow({ innerWidth: 375 }));

        expect(DeviceInfo.isDesktop()).toBe(false);
      });

      it('should return false for tablet', () => {
        defineGlobal('navigator', createMockNavigator({ userAgent: USER_AGENTS.iPad }));
        defineGlobal('window', createMockWindow({ innerWidth: 1024, innerHeight: 768 }));

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
        defineGlobal('navigator', createMockNavigator({ userAgent: USER_AGENTS.iPhone }));

        expect(DeviceInfo.isIOS()).toBe(true);
      });

      it('should return true for iPad', () => {
        defineGlobal('navigator', createMockNavigator({ userAgent: USER_AGENTS.iPad }));

        expect(DeviceInfo.isIOS()).toBe(true);
      });

      it('should return true for iPod', () => {
        defineGlobal('navigator', createMockNavigator({ userAgent: USER_AGENTS.iPod }));

        expect(DeviceInfo.isIOS()).toBe(true);
      });

      it('should return true for iPadOS 13+ (Macintosh with touch)', () => {
        defineGlobal(
          'navigator',
          createMockNavigator({
            userAgent: USER_AGENTS.iPadOS13,
            maxTouchPoints: 5,
          })
        );
        defineGlobal('window', createMockWindow({ ontouchstart: null }));
        defineGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));

        expect(DeviceInfo.isIOS()).toBe(true);
      });

      it('should return false for Android', () => {
        defineGlobal('navigator', createMockNavigator({ userAgent: USER_AGENTS.androidPhone }));

        expect(DeviceInfo.isIOS()).toBe(false);
      });

      it('should return false for macOS desktop', () => {
        defineGlobal(
          'navigator',
          createMockNavigator({
            userAgent: USER_AGENTS.macOSChrome,
            maxTouchPoints: 0,
          })
        );
        defineGlobal('window', createMockWindow());
        defineGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));

        expect(DeviceInfo.isIOS()).toBe(false);
      });
    });

    describe('isAndroid', () => {
      it('should return true for Android phone', () => {
        defineGlobal('navigator', createMockNavigator({ userAgent: USER_AGENTS.androidPhone }));

        expect(DeviceInfo.isAndroid()).toBe(true);
      });

      it('should return true for Android tablet', () => {
        defineGlobal('navigator', createMockNavigator({ userAgent: USER_AGENTS.androidTablet }));

        expect(DeviceInfo.isAndroid()).toBe(true);
      });

      it('should return false for iOS', () => {
        defineGlobal('navigator', createMockNavigator({ userAgent: USER_AGENTS.iPhone }));

        expect(DeviceInfo.isAndroid()).toBe(false);
      });

      it('should return false for desktop', () => {
        defineGlobal('navigator', createMockNavigator({ userAgent: USER_AGENTS.macOSChrome }));

        expect(DeviceInfo.isAndroid()).toBe(false);
      });
    });

    describe('isWindows', () => {
      it('should return true for Windows platform', () => {
        defineGlobal(
          'navigator',
          createMockNavigator({
            userAgent: USER_AGENTS.windowsChrome,
            platform: PLATFORMS.windows,
          })
        );

        expect(DeviceInfo.isWindows()).toBe(true);
      });

      it('should prefer userAgentData.platform over navigator.platform', () => {
        defineGlobal('navigator', {
          ...createMockNavigator({
            userAgent: USER_AGENTS.windowsChrome,
            platform: PLATFORMS.linux,
          }),
          userAgentData: { platform: 'Windows' },
        });

        expect(DeviceInfo.isWindows()).toBe(true);
      });

      it('should return false for macOS', () => {
        defineGlobal(
          'navigator',
          createMockNavigator({
            userAgent: USER_AGENTS.macOSChrome,
            platform: PLATFORMS.macOS,
          })
        );

        expect(DeviceInfo.isWindows()).toBe(false);
      });

      it('should return false for Linux', () => {
        defineGlobal(
          'navigator',
          createMockNavigator({
            userAgent: USER_AGENTS.linuxChrome,
            platform: PLATFORMS.linux,
          })
        );

        expect(DeviceInfo.isWindows()).toBe(false);
      });
    });

    describe('isMacOS', () => {
      it('should return true for macOS platform', () => {
        defineGlobal(
          'navigator',
          createMockNavigator({
            userAgent: USER_AGENTS.macOSChrome,
            platform: PLATFORMS.macOS,
            maxTouchPoints: 0,
          })
        );
        defineGlobal('window', createMockWindow());
        defineGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));

        expect(DeviceInfo.isMacOS()).toBe(true);
      });

      it('should prefer userAgentData.platform over navigator.platform', () => {
        defineGlobal('navigator', {
          ...createMockNavigator({
            userAgent: USER_AGENTS.macOSChrome,
            platform: PLATFORMS.linux,
            maxTouchPoints: 0,
          }),
          userAgentData: { platform: 'macOS' },
        });
        defineGlobal('window', createMockWindow());
        defineGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));

        expect(DeviceInfo.isMacOS()).toBe(true);
      });

      it('should return false for iOS (even though platform contains mac)', () => {
        defineGlobal(
          'navigator',
          createMockNavigator({
            userAgent: USER_AGENTS.iPhone,
            platform: PLATFORMS.iPhone,
          })
        );

        expect(DeviceInfo.isMacOS()).toBe(false);
      });

      it('should return false for iPadOS 13+ (Macintosh with touch)', () => {
        defineGlobal(
          'navigator',
          createMockNavigator({
            userAgent: USER_AGENTS.iPadOS13,
            platform: PLATFORMS.macOS,
            maxTouchPoints: 5,
          })
        );
        defineGlobal('window', createMockWindow({ ontouchstart: null }));
        defineGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));

        expect(DeviceInfo.isMacOS()).toBe(false);
      });

      it('should return false for Windows', () => {
        defineGlobal(
          'navigator',
          createMockNavigator({
            userAgent: USER_AGENTS.windowsChrome,
            platform: PLATFORMS.windows,
          })
        );

        expect(DeviceInfo.isMacOS()).toBe(false);
      });
    });

    describe('isLinux', () => {
      it('should return true for Linux platform', () => {
        defineGlobal(
          'navigator',
          createMockNavigator({
            userAgent: USER_AGENTS.linuxChrome,
            platform: PLATFORMS.linux,
          })
        );

        expect(DeviceInfo.isLinux()).toBe(true);
      });

      it('should prefer userAgentData.platform over navigator.platform', () => {
        defineGlobal('navigator', {
          ...createMockNavigator({
            userAgent: USER_AGENTS.linuxChrome,
            platform: PLATFORMS.windows,
          }),
          userAgentData: { platform: 'Linux' },
        });

        expect(DeviceInfo.isLinux()).toBe(true);
      });

      it('should return false for Android (even though platform is Linux)', () => {
        defineGlobal(
          'navigator',
          createMockNavigator({
            userAgent: USER_AGENTS.androidPhone,
            platform: PLATFORMS.android,
          })
        );

        expect(DeviceInfo.isLinux()).toBe(false);
      });

      it('should return false for macOS', () => {
        defineGlobal(
          'navigator',
          createMockNavigator({
            userAgent: USER_AGENTS.macOSChrome,
            platform: PLATFORMS.macOS,
          })
        );

        expect(DeviceInfo.isLinux()).toBe(false);
      });

      it('should return false for Windows', () => {
        defineGlobal(
          'navigator',
          createMockNavigator({
            userAgent: USER_AGENTS.windowsChrome,
            platform: PLATFORMS.windows,
          })
        );

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
        defineGlobal('screen', createMockScreen({ width: 1920, height: 1080 }));

        const size = DeviceInfo.screenSize();

        expect(size).toEqual({ width: 1920, height: 1080 });
      });

      it('should return different dimensions for mobile', () => {
        defineGlobal('screen', createMockScreen({ width: 375, height: 812 }));

        const size = DeviceInfo.screenSize();

        expect(size).toEqual({ width: 375, height: 812 });
      });
    });

    describe('viewportSize', () => {
      it('should return viewport dimensions', () => {
        defineGlobal('window', createMockWindow({ innerWidth: 1920, innerHeight: 1080 }));

        const size = DeviceInfo.viewportSize();

        expect(size).toEqual({ width: 1920, height: 1080 });
      });

      it('should return different dimensions for mobile', () => {
        defineGlobal('window', createMockWindow({ innerWidth: 375, innerHeight: 667 }));

        const size = DeviceInfo.viewportSize();

        expect(size).toEqual({ width: 375, height: 667 });
      });
    });

    describe('availableScreenSize', () => {
      it('should return available screen dimensions', () => {
        defineGlobal('screen', createMockScreen({ availWidth: 1920, availHeight: 1040 }));

        const size = DeviceInfo.availableScreenSize();

        expect(size).toEqual({ width: 1920, height: 1040 });
      });

      it('should account for taskbar', () => {
        defineGlobal(
          'screen',
          createMockScreen({
            width: 1920,
            height: 1080,
            availWidth: 1920,
            availHeight: 1040,
          })
        );

        const screenSize = DeviceInfo.screenSize();
        const availableSize = DeviceInfo.availableScreenSize();

        expect(availableSize.height).toBeLessThan(screenSize.height);
      });
    });

    describe('pixelRatio', () => {
      it('should return device pixel ratio', () => {
        defineGlobal('window', createMockWindow({ devicePixelRatio: 2 }));

        expect(DeviceInfo.pixelRatio()).toBe(2);
      });

      it('should return 1 as default when not defined', () => {
        defineGlobal('window', createMockWindow({ devicePixelRatio: undefined }));

        expect(DeviceInfo.pixelRatio()).toBe(1);
      });

      it('should handle high DPI displays', () => {
        defineGlobal('window', createMockWindow({ devicePixelRatio: 3 }));

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
        defineGlobal(
          'screen',
          createMockScreen({
            orientation: mockOrientation({ type: 'portrait-primary' }),
          })
        );

        expect(DeviceInfo.isOrientationSupported()).toBe(true);
      });

      it('should return false when screen.orientation is not available', () => {
        defineGlobal('screen', createMockScreen({ orientation: undefined }));

        expect(DeviceInfo.isOrientationSupported()).toBe(false);
      });

      it('should return false when screen is undefined', () => {
        defineGlobal('screen', undefined);

        expect(DeviceInfo.isOrientationSupported()).toBe(false);
      });
    });

    describe('getOrientation', () => {
      const states = [
        { type: 'portrait-primary', angle: 0, orientation: 'portrait' },
        { type: 'landscape-primary', angle: 90, orientation: 'landscape' },
        { type: 'portrait-secondary', angle: 180, orientation: 'portrait' },
        { type: 'landscape-secondary', angle: 270, orientation: 'landscape' },
      ] as const satisfies readonly OrientationState[];

      it.each(states)(
        'should expose $type as an immutable state with derived orientation',
        ({ type, angle, orientation }) => {
          defineGlobal(
            'screen',
            createMockScreen({
              orientation: mockOrientation({ type, angle }),
            })
          );

          expect(DeviceInfo.getOrientation()).toEqual({ type, angle, orientation });
        }
      );

      it('should return undefined when not supported', () => {
        defineGlobal('screen', createMockScreen({ orientation: undefined }));

        expect(DeviceInfo.getOrientation()).toBeUndefined();
      });

      it('should return undefined when screen is undefined', () => {
        defineGlobal('screen', undefined);

        expect(DeviceInfo.getOrientation()).toBeUndefined();
      });
    });

    describe('onOrientationChange', () => {
      it('should add a change listener to screen.orientation', () => {
        const addEventListener = vi.fn();
        const removeEventListener = vi.fn();

        defineGlobal(
          'screen',
          createMockScreen({
            orientation: mockOrientation({
              type: 'portrait-primary',
              addEventListener,
              removeEventListener,
            }),
          })
        );

        const handler = vi.fn();
        const cleanup = DeviceInfo.onOrientationChange(handler);

        expect(addEventListener).toHaveBeenCalledWith('change', expect.any(Function));

        cleanup();

        expect(removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
      });

      it('should return a no-op cleanup when not supported', () => {
        defineGlobal('screen', createMockScreen({ orientation: undefined }));

        const handler = vi.fn();
        const cleanup = DeviceInfo.onOrientationChange(handler);

        expect(typeof cleanup).toBe('function');
        cleanup(); // Should not throw
        expect(handler).not.toHaveBeenCalled();
      });

      it('should call handler with the new state on change', () => {
        let capturedHandler: (() => void) | undefined;
        const addEventListener = vi.fn((_event, handler) => {
          capturedHandler = handler as () => void;
        });

        let currentType = 'portrait-primary';
        let currentAngle = 0;

        defineGlobal('screen', {
          ...createMockScreen(),
          get orientation() {
            return {
              get type() {
                return currentType;
              },
              get angle() {
                return currentAngle;
              },
              addEventListener,
              removeEventListener: vi.fn(),
            };
          },
        });

        const handler = vi.fn();
        DeviceInfo.onOrientationChange(handler);

        // No call until the native change event fires
        expect(handler).not.toHaveBeenCalled();

        // Simulate a native orientation change
        currentType = 'landscape-primary';
        currentAngle = 90;
        capturedHandler?.();

        expect(handler).toHaveBeenCalledWith({
          type: 'landscape-primary',
          angle: 90,
          orientation: 'landscape',
        });
      });
    });

    describe('lockOrientation', () => {
      it('should resolve when lock succeeds', async () => {
        const lock = vi.fn().mockResolvedValue(undefined);

        defineGlobal(
          'screen',
          createMockScreen({
            orientation: mockOrientation({ type: 'portrait-primary', lock, unlock: vi.fn() }),
          })
        );

        await expect(DeviceInfo.lockOrientation('portrait')).resolves.toBeUndefined();
        expect(lock).toHaveBeenCalledWith('portrait');
      });

      it('should throw when lock fails', async () => {
        const lock = vi.fn().mockRejectedValue(new Error('Lock not supported'));

        defineGlobal(
          'screen',
          createMockScreen({
            orientation: mockOrientation({ type: 'portrait-primary', lock, unlock: vi.fn() }),
          })
        );

        await expect(DeviceInfo.lockOrientation('landscape')).rejects.toThrow('Lock not supported');
      });

      it('should throw when screen.orientation not available', async () => {
        defineGlobal('screen', createMockScreen({ orientation: undefined }));

        await expect(DeviceInfo.lockOrientation('portrait')).rejects.toThrow(
          'Screen Orientation API is not supported'
        );
      });

      it('should support all orientation lock types', async () => {
        const lock = vi.fn().mockResolvedValue(undefined);

        defineGlobal(
          'screen',
          createMockScreen({
            orientation: mockOrientation({ type: 'portrait-primary', lock, unlock: vi.fn() }),
          })
        );

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

    describe('unlockOrientation', () => {
      it('should call unlock on screen.orientation', () => {
        const unlock = vi.fn();

        defineGlobal(
          'screen',
          createMockScreen({
            orientation: mockOrientation({ type: 'portrait-primary', lock: vi.fn(), unlock }),
          })
        );

        DeviceInfo.unlockOrientation();

        expect(unlock).toHaveBeenCalled();
      });

      it('should not throw when screen.orientation not available', () => {
        defineGlobal('screen', createMockScreen({ orientation: undefined }));

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
        defineGlobal(
          'navigator',
          createMockNavigator({ languages: ['en-US', 'en', 'de'] as readonly string[] })
        );

        expect(DeviceInfo.languages()).toEqual(['en-US', 'en', 'de']);
      });

      it('should fallback to navigator.language when languages not available', () => {
        defineGlobal('navigator', {
          ...createMockNavigator(),
          languages: undefined,
          language: 'fr-FR',
        });

        expect(DeviceInfo.languages()).toEqual(['fr-FR']);
      });

      it('should filter out falsy values in fallback', () => {
        defineGlobal('navigator', {
          ...createMockNavigator(),
          languages: undefined,
          language: '',
        });

        expect(DeviceInfo.languages()).toEqual([]);
      });
    });

    describe('language', () => {
      it('should return navigator.language', () => {
        defineGlobal('navigator', createMockNavigator({ language: 'de-DE' }));

        expect(DeviceInfo.language()).toBe('de-DE');
      });

      it('should fallback to en when language not available', () => {
        defineGlobal('navigator', {
          ...createMockNavigator(),
          language: undefined,
        });

        expect(DeviceInfo.language()).toBe('en');
      });
    });

    describe('isOnline', () => {
      it('should return true when online', () => {
        defineGlobal('navigator', createMockNavigator({ onLine: true }));

        expect(DeviceInfo.isOnline()).toBe(true);
      });

      it('should return false when offline', () => {
        defineGlobal('navigator', createMockNavigator({ onLine: false }));

        expect(DeviceInfo.isOnline()).toBe(false);
      });
    });

    describe('hardwareConcurrency', () => {
      it('should return navigator.hardwareConcurrency', () => {
        defineGlobal('navigator', createMockNavigator({ hardwareConcurrency: 16 }));

        expect(DeviceInfo.hardwareConcurrency()).toBe(16);
      });

      it('should fallback to 1 when not available', () => {
        defineGlobal('navigator', {
          ...createMockNavigator(),
          hardwareConcurrency: undefined,
        });

        expect(DeviceInfo.hardwareConcurrency()).toBe(1);
      });
    });

    describe('deviceMemory', () => {
      it('should return deviceMemory when available', () => {
        defineGlobal('navigator', {
          ...createMockNavigator(),
          deviceMemory: 8,
        });

        expect(DeviceInfo.deviceMemory()).toBe(8);
      });

      it('should return null when deviceMemory not available', () => {
        defineGlobal('navigator', createMockNavigator());

        expect(DeviceInfo.deviceMemory()).toBeNull();
      });

      it('should handle low memory devices', () => {
        defineGlobal('navigator', {
          ...createMockNavigator(),
          deviceMemory: 0.5,
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

    it('should export OrientationState interface', () => {
      const state: OrientationState = {
        type: 'portrait-primary',
        angle: 0,
        orientation: 'portrait',
      };
      expect(state.type).toBe('portrait-primary');
      expect(state.angle).toBe(0);
      expect(state.orientation).toBe('portrait');
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
      defineGlobal('window', {
        ...createMockWindow(),
        matchMedia: undefined,
      });
      defineGlobal('navigator', createMockNavigator({ maxTouchPoints: 0 }));
      defineGlobal('matchMedia', undefined);

      // Should not throw and return false
      expect(DeviceInfo.isTouchDevice()).toBe(false);
    });

    it('should handle window with missing innerWidth (mobile check)', () => {
      defineGlobal('navigator', createMockNavigator({ userAgent: USER_AGENTS.macOSChrome }));
      defineGlobal('window', {
        ...createMockWindow(),
        innerWidth: undefined,
      });

      // Should not throw
      expect(DeviceInfo.isMobile()).toBe(false);
    });

    it('should handle window without devicePixelRatio', () => {
      defineGlobal('window', {
        ...createMockWindow(),
        devicePixelRatio: null,
      });

      expect(DeviceInfo.pixelRatio()).toBe(1);
    });
  });
});
