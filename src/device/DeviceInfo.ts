/**
 * Device Info - Device and browser detection utilities.
 *
 * Features:
 * - Device type detection (mobile, tablet, desktop)
 * - OS detection (iOS, Android)
 * - Screen and viewport information
 * - Orientation detection with event handling
 *
 * @example
 * ```TypeScript
 * // Device type
 * if (DeviceInfo.isMobile()) {
 *   // Mobile-specific UI
 * }
 *
 * // Platform detection
 * if (DeviceInfo.isIOS()) {
 *   // iOS-specific behavior
 * }
 *
 * // Screen info
 * const screen = DeviceInfo.screenSize();
 * const viewport = DeviceInfo.viewportSize();
 *
 * // Orientation
 * const cleanup = DeviceInfo.onOrientationChange((orientation) => {
 *   console.log(orientation); // 'portrait' | 'landscape'
 * });
 * ```
 */

import type { CleanupFn } from '../core/index.js';

/** Minimal User-Agent Client Hints type (Chromium-only as of 2026) */
interface NavigatorUAData {
  readonly platform: string;
}

/**
 * Get platform string via fallback chain:
 * navigator.userAgentData.platform → navigator.platform
 */
function getPlatformString(): string {
  if (typeof navigator === 'undefined') return '';

  const uaData = (navigator as Navigator & { userAgentData?: NavigatorUAData }).userAgentData;
  if (uaData !== undefined && uaData.platform !== '') return uaData.platform;

  // noinspection JSDeprecatedSymbols — Fallback for Firefox/Safari (no userAgentData support)
  return navigator.platform;
}

export type Orientation = 'portrait' | 'landscape';

/**
 * Full orientation type from the Screen Orientation API.
 */
export type OrientationType =
  | 'portrait-primary'
  | 'portrait-secondary'
  | 'landscape-primary'
  | 'landscape-secondary';

/**
 * Orientation lock types supported by the Screen Orientation API.
 */
export type OrientationLockType =
  | 'any'
  | 'natural'
  | 'landscape'
  | 'portrait'
  | 'portrait-primary'
  | 'portrait-secondary'
  | 'landscape-primary'
  | 'landscape-secondary';

export interface Size {
  readonly width: number;
  readonly height: number;
}

export const DeviceInfo = {
  // =========================================================================
  // Device Type
  // =========================================================================

  /**
   * Check if device supports touch events.
   */
  isTouchDevice(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches)
    );
  },

  /**
   * Check if device appears to be mobile.
   * Uses combination of screen size, touch, and user agent.
   */
  isMobile(): boolean {
    if (typeof navigator === 'undefined') {
      return false;
    }

    // Check user agent
    const ua = navigator.userAgent.toLowerCase();
    const mobileKeywords = [
      'android',
      'webos',
      'iphone',
      'ipad',
      'ipod',
      'blackberry',
      'windows phone',
    ];

    if (mobileKeywords.some((keyword) => ua.includes(keyword))) {
      return true;
    }

    // Check screen width
    return typeof window !== 'undefined' && window.innerWidth < 768;
  },

  /**
   * Check if device appears to be a tablet.
   */
  isTablet(): boolean {
    if (typeof navigator === 'undefined' || typeof window === 'undefined') {
      return false;
    }

    const ua = navigator.userAgent.toLowerCase();

    // iPad detection (including iPadOS 13+)
    if (ua.includes('ipad') || (ua.includes('macintosh') && DeviceInfo.isTouchDevice())) {
      return true;
    }

    // Android tablet detection
    if (ua.includes('android') && !ua.includes('mobile')) {
      return true;
    }

    // Size-based detection
    const width = window.innerWidth;
    const height = window.innerHeight;
    const minDimension = Math.min(width, height);
    const maxDimension = Math.max(width, height);

    return minDimension >= 600 && maxDimension <= 1366 && DeviceInfo.isTouchDevice();
  },

  /**
   * Check if device appears to be desktop.
   */
  isDesktop(): boolean {
    return !DeviceInfo.isMobile() && !DeviceInfo.isTablet();
  },

  // =========================================================================
  // OS Detection
  // =========================================================================

  /**
   * Check if device is running iOS.
   */
  isIOS(): boolean {
    if (typeof navigator === 'undefined') {
      return false;
    }

    const ua = navigator.userAgent;

    // Standard iOS detection
    if (/iPad|iPhone|iPod/.test(ua)) {
      return true;
    }

    // iPadOS 13+ detection (reports as Macintosh)
    return ua.includes('Macintosh') && DeviceInfo.isTouchDevice();
  },

  /**
   * Check if device is running Android.
   */
  isAndroid(): boolean {
    if (typeof navigator === 'undefined') {
      return false;
    }

    return /android/i.test(navigator.userAgent);
  },

  /**
   * Check if device is running Windows.
   */
  isWindows(): boolean {
    return /win/i.test(getPlatformString());
  },

  /**
   * Check if device is running macOS.
   */
  isMacOS(): boolean {
    return /mac/i.test(getPlatformString()) && !DeviceInfo.isIOS();
  },

  /**
   * Check if device is running Linux.
   */
  isLinux(): boolean {
    return /linux/i.test(getPlatformString()) && !DeviceInfo.isAndroid();
  },

  // =========================================================================
  // Screen & Viewport
  // =========================================================================

  /**
   * Get screen size (physical screen dimensions).
   */
  screenSize(): Size {
    if (typeof screen === 'undefined') {
      return { width: 0, height: 0 };
    }

    return {
      width: screen.width,
      height: screen.height,
    };
  },

  /**
   * Get viewport size (visible area).
   */
  viewportSize(): Size {
    if (typeof window === 'undefined') {
      return { width: 0, height: 0 };
    }

    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  },

  /**
   * Get available screen size (excluding taskbar, etc.).
   */
  availableScreenSize(): Size {
    if (typeof screen === 'undefined') {
      return { width: 0, height: 0 };
    }

    return {
      width: screen.availWidth,
      height: screen.availHeight,
    };
  },

  /**
   * Get device pixel ratio.
   */
  pixelRatio(): number {
    if (typeof window === 'undefined') {
      return 1;
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Older browsers may not have this property
    return window.devicePixelRatio ?? 1;
  },

  // =========================================================================
  // Orientation
  // =========================================================================

  /**
   * Check if the Screen Orientation API is supported.
   * @returns true if Screen Orientation API is available
   */
  isOrientationSupported(): boolean {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions -- Browser compatibility
    return typeof screen !== 'undefined' && !!screen.orientation;
  },

  /**
   * Get the current orientation type from the Screen Orientation API.
   * @returns The full orientation type or undefined if not supported
   */
  getOrientation(): OrientationType | undefined {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition -- Browser compatibility
    if (typeof screen === 'undefined' || !screen.orientation) {
      return undefined;
    }

    return screen.orientation.type as OrientationType;
  },

  /**
   * Get current orientation.
   */
  orientation(): Orientation {
    if (typeof window === 'undefined') {
      return 'portrait';
    }

    // Try Screen Orientation API first
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition -- Browser compatibility
    if (typeof screen !== 'undefined' && screen.orientation) {
      return screen.orientation.type.includes('portrait') ? 'portrait' : 'landscape';
    }

    // Fallback to comparing dimensions
    return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
  },

  /**
   * Get orientation angle.
   */
  orientationAngle(): number {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition -- Browser compatibility
    if (typeof screen !== 'undefined' && screen.orientation) {
      return screen.orientation.angle;
    }

    return 0;
  },

  /**
   * Listen for orientation changes (simplified portrait/landscape).
   * @param handler - Called when orientation changes
   * @returns Cleanup function
   * @deprecated Use onOrientationTypeChange for full OrientationType support
   */
  onOrientationChange(handler: (orientation: Orientation) => void): CleanupFn {
    if (typeof window === 'undefined') {
      return () => {};
    }

    let lastOrientation = DeviceInfo.orientation();

    const checkOrientation = (): void => {
      const currentOrientation = DeviceInfo.orientation();
      if (currentOrientation !== lastOrientation) {
        lastOrientation = currentOrientation;
        handler(currentOrientation);
      }
    };

    // Use Screen Orientation API if available
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition -- Browser compatibility
    if (typeof screen !== 'undefined' && screen.orientation) {
      screen.orientation.addEventListener('change', checkOrientation);
      return () => {
        screen.orientation.removeEventListener('change', checkOrientation);
      };
    }

    // Fallback to resize event
    window.addEventListener('resize', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
    };
  },

  /**
   * Listen for orientation type changes with full OrientationType.
   * Only works when Screen Orientation API is supported.
   * @param handler - Called when orientation changes with the full OrientationType
   * @returns Cleanup function
   */
  onOrientationTypeChange(handler: (orientation: OrientationType) => void): CleanupFn {
    if (typeof window === 'undefined') {
      return () => {};
    }

    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition -- Browser compatibility
    if (typeof screen === 'undefined' || !screen.orientation) {
      return () => {};
    }

    let lastOrientation = screen.orientation.type as OrientationType;

    const checkOrientation = (): void => {
      const currentOrientation = screen.orientation.type as OrientationType;
      if (currentOrientation !== lastOrientation) {
        lastOrientation = currentOrientation;
        handler(currentOrientation);
      }
    };

    screen.orientation.addEventListener('change', checkOrientation);
    return () => {
      screen.orientation.removeEventListener('change', checkOrientation);
    };
  },

  /**
   * Lock orientation to a specific type.
   * @param orientation - The orientation to lock to
   * @throws Error if orientation lock is not supported or fails
   */
  async lockOrientation(orientation: OrientationLockType): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition -- Browser compatibility
    if (typeof screen === 'undefined' || !screen.orientation) {
      throw new Error('Screen Orientation API is not supported');
    }

    // The lock method exists but may not be in TypeScript's default types
    await (
      screen.orientation as ScreenOrientation & { lock: (orientation: string) => Promise<void> }
    ).lock(orientation);
  },

  /**
   * Unlock orientation.
   */
  unlockOrientation(): void {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition -- Browser compatibility
    if (typeof screen !== 'undefined' && screen.orientation) {
      screen.orientation.unlock();
    }
  },

  // =========================================================================
  // Browser Features
  // =========================================================================

  /**
   * Get preferred language(s).
   */
  languages(): readonly string[] {
    if (typeof navigator === 'undefined') {
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Older browsers may not have navigator.languages
    return navigator.languages ?? [navigator.language].filter(Boolean);
  },

  /**
   * Get preferred language.
   */
  language(): string {
    if (typeof navigator === 'undefined') {
      return 'en';
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Older browsers may not have navigator.language
    return navigator.language ?? 'en';
  },

  /**
   * Check if online.
   */
  isOnline(): boolean {
    if (typeof navigator === 'undefined') {
      return true;
    }

    return navigator.onLine;
  },

  /**
   * Get hardware concurrency (number of logical processors).
   */
  hardwareConcurrency(): number {
    if (typeof navigator === 'undefined') {
      return 1;
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Older browsers may not have this
    return navigator.hardwareConcurrency ?? 1;
  },

  /**
   * Get device memory (if available, in GB).
   */
  deviceMemory(): number | null {
    if (typeof navigator === 'undefined') {
      return null;
    }

    return (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? null;
  },
} as const;
