// noinspection JSUnusedGlobalSymbols - Example file

/**
 * Device Info Example - Device/viewport information and orientation
 *
 * This example demonstrates:
 * - Detecting device type (mobile, tablet, desktop)
 * - Operating system detection (iOS, Android, Windows, macOS, Linux)
 * - Getting screen and viewport dimensions
 * - Handling orientation changes
 * - Locking/unlocking screen orientation
 * - Getting device capabilities (memory, CPU cores, etc.)
 * - Building responsive components based on device info
 *
 * @packageDocumentation
 */

import { type CleanupFn } from '@zappzarapp/browser-utils/core';
import {
  DeviceInfo,
  type Orientation,
  type OrientationType,
  type Size,
} from '@zappzarapp/browser-utils/device';
import { Logger } from '@zappzarapp/browser-utils/logging';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Comprehensive device profile.
 */
interface DeviceProfile {
  readonly type: 'mobile' | 'tablet' | 'desktop';
  readonly os: 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'unknown';
  readonly touchEnabled: boolean;
  readonly screen: Size;
  readonly viewport: Size;
  readonly pixelRatio: number;
  readonly orientation: Orientation;
  readonly memory: number | null;
  readonly cpuCores: number;
  readonly languages: readonly string[];
  readonly online: boolean;
}

/**
 * Responsive breakpoint configuration.
 */
interface Breakpoints {
  readonly mobile: number;
  readonly tablet: number;
  readonly desktop: number;
}

// =============================================================================
// Device Type Detection
// =============================================================================

/**
 * Detect and display device type information.
 */
function detectDeviceType(): void {
  console.log('--- Device Type Detection ---');

  const isMobile = DeviceInfo.isMobile();
  const isTablet = DeviceInfo.isTablet();
  const isDesktop = DeviceInfo.isDesktop();
  const isTouch = DeviceInfo.isTouchDevice();

  console.log(`Mobile: ${isMobile}`);
  console.log(`Tablet: ${isTablet}`);
  console.log(`Desktop: ${isDesktop}`);
  console.log(`Touch-enabled: ${isTouch}`);

  // Determine primary device type
  let deviceType: string;
  if (isMobile) {
    deviceType = 'Mobile Phone';
  } else if (isTablet) {
    deviceType = 'Tablet';
  } else {
    deviceType = 'Desktop/Laptop';
  }

  console.log(`\nPrimary device type: ${deviceType}`);
}

/**
 * Detect operating system.
 */
function detectOperatingSystem(): void {
  console.log('\n--- Operating System Detection ---');

  const osInfo = {
    iOS: DeviceInfo.isIOS(),
    Android: DeviceInfo.isAndroid(),
    Windows: DeviceInfo.isWindows(),
    macOS: DeviceInfo.isMacOS(),
    Linux: DeviceInfo.isLinux(),
  };

  console.log('OS Detection Results:');
  for (const [os, detected] of Object.entries(osInfo)) {
    if (detected) {
      console.log(`  [x] ${os}`);
    } else {
      console.log(`  [ ] ${os}`);
    }
  }

  // Determine primary OS
  const detectedOs = Object.entries(osInfo).find(([, detected]) => detected)?.[0] ?? 'Unknown';
  console.log(`\nDetected OS: ${detectedOs}`);

  // Platform-specific tips
  if (osInfo.iOS) {
    console.log('Tip: Consider iOS-specific gestures and haptic feedback');
  } else if (osInfo.Android) {
    console.log('Tip: Handle Android back button and material design patterns');
  }
}

// =============================================================================
// Screen and Viewport Information
// =============================================================================

/**
 * Display screen and viewport dimensions.
 */
function displayScreenInfo(): void {
  console.log('\n--- Screen & Viewport Information ---');

  const screen = DeviceInfo.screenSize();
  const viewport = DeviceInfo.viewportSize();
  const available = DeviceInfo.availableScreenSize();
  const pixelRatio = DeviceInfo.pixelRatio();

  console.log('Physical Screen:');
  console.log(`  Width: ${screen.width}px`);
  console.log(`  Height: ${screen.height}px`);

  console.log('\nAvailable Screen (minus system UI):');
  console.log(`  Width: ${available.width}px`);
  console.log(`  Height: ${available.height}px`);

  console.log('\nViewport (visible area):');
  console.log(`  Width: ${viewport.width}px`);
  console.log(`  Height: ${viewport.height}px`);

  console.log(`\nDevice Pixel Ratio: ${pixelRatio}x`);

  // Calculate actual pixel dimensions
  const actualWidth = viewport.width * pixelRatio;
  const actualHeight = viewport.height * pixelRatio;
  console.log(`Actual pixels: ${actualWidth} x ${actualHeight}`);

  // Recommend image sizes
  console.log('\nRecommended image sizes for current viewport:');
  console.log(`  Standard (1x): ${viewport.width}px wide`);
  console.log(`  Retina (${pixelRatio}x): ${actualWidth}px wide`);
}

// =============================================================================
// Orientation Handling
// =============================================================================

/**
 * Display current orientation information.
 */
function displayOrientationInfo(): void {
  console.log('\n--- Orientation Information ---');

  const orientation = DeviceInfo.orientation();
  const angle = DeviceInfo.orientationAngle();
  const isSupported = DeviceInfo.isOrientationSupported();
  const orientationType = DeviceInfo.getOrientation();

  console.log(`Orientation API supported: ${isSupported}`);
  console.log(`Current orientation: ${orientation}`);
  console.log(`Orientation angle: ${angle} degrees`);

  if (orientationType !== undefined) {
    console.log(`Full orientation type: ${orientationType}`);
  }

  // Explain angles
  console.log('\nOrientation angles:');
  console.log('  0 or 360: Portrait primary (normal)');
  console.log('  90: Landscape primary (rotated left)');
  console.log('  180: Portrait secondary (upside down)');
  console.log('  270 or -90: Landscape secondary (rotated right)');
}

/**
 * Monitor orientation changes (simplified portrait/landscape).
 */
function monitorOrientationChange(): CleanupFn {
  console.log('\n--- Orientation Change Monitor ---');

  const cleanup = DeviceInfo.onOrientationChange((orientation: Orientation) => {
    console.log(`[Orientation] Changed to: ${orientation}`);

    // Respond to orientation change
    if (orientation === 'landscape') {
      console.log('  Tip: Consider hiding navigation for more space');
    } else {
      console.log('  Tip: Full navigation visible');
    }
  });

  console.log('Monitoring orientation changes...');
  console.log('Rotate your device to see events');

  return cleanup;
}

/**
 * Monitor full orientation type changes.
 */
function monitorOrientationTypeChange(): CleanupFn {
  console.log('\n--- Full Orientation Type Monitor ---');

  if (!DeviceInfo.isOrientationSupported()) {
    console.log('Screen Orientation API not supported');
    return () => {};
  }

  const cleanup = DeviceInfo.onOrientationTypeChange((type: OrientationType) => {
    console.log(`[Orientation] Type changed to: ${type}`);

    // More specific handling
    switch (type) {
      case 'portrait-primary':
        console.log('  Normal portrait mode');
        break;
      case 'portrait-secondary':
        console.log('  Upside-down portrait mode');
        break;
      case 'landscape-primary':
        console.log('  Landscape with home button on right');
        break;
      case 'landscape-secondary':
        console.log('  Landscape with home button on left');
        break;
    }
  });

  console.log('Monitoring full orientation type changes...');

  return cleanup;
}

/**
 * Demonstrate orientation locking.
 */
async function orientationLockExample(): Promise<void> {
  console.log('\n--- Orientation Lock ---');

  if (!DeviceInfo.isOrientationSupported()) {
    console.log('Orientation lock not supported');
    return;
  }

  console.log('Note: Orientation lock typically requires fullscreen mode');

  try {
    // Try to lock to landscape
    await DeviceInfo.lockOrientation('landscape');
    console.log('Locked to landscape mode');

    // Wait a bit then unlock
    setTimeout(() => {
      DeviceInfo.unlockOrientation();
      console.log('Orientation unlocked');
    }, 5000);
  } catch (error) {
    console.log('Lock failed (this is normal without fullscreen)');
    console.log('Error:', error instanceof Error ? error.message : String(error));
  }
}

// =============================================================================
// Device Capabilities
// =============================================================================

/**
 * Display device capabilities and hardware info.
 */
function displayDeviceCapabilities(): void {
  console.log('\n--- Device Capabilities ---');

  const cpuCores = DeviceInfo.hardwareConcurrency();
  const memory = DeviceInfo.deviceMemory();
  const languages = DeviceInfo.languages();
  const primaryLanguage = DeviceInfo.language();
  const isOnline = DeviceInfo.isOnline();

  console.log('Hardware:');
  console.log(`  CPU cores: ${cpuCores}`);
  console.log(`  Device memory: ${memory !== null ? `${memory} GB` : 'Not available'}`);

  console.log('\nNetwork:');
  console.log(`  Online: ${isOnline}`);

  console.log('\nLocalization:');
  console.log(`  Primary language: ${primaryLanguage}`);
  console.log(`  All languages: ${languages.join(', ')}`);

  // Performance tier based on capabilities
  let performanceTier: 'low' | 'medium' | 'high';
  if (cpuCores >= 8 && (memory === null || memory >= 8)) {
    performanceTier = 'high';
  } else if (cpuCores >= 4 && (memory === null || memory >= 4)) {
    performanceTier = 'medium';
  } else {
    performanceTier = 'low';
  }

  console.log(`\nPerformance tier: ${performanceTier}`);
  console.log('  This can be used to adjust animation complexity, etc.');
}

// =============================================================================
// Comprehensive Device Profile
// =============================================================================

/**
 * Build a complete device profile.
 */
function buildDeviceProfile(): DeviceProfile {
  console.log('\n--- Building Device Profile ---');

  // Determine device type
  let type: 'mobile' | 'tablet' | 'desktop';
  if (DeviceInfo.isMobile()) {
    type = 'mobile';
  } else if (DeviceInfo.isTablet()) {
    type = 'tablet';
  } else {
    type = 'desktop';
  }

  // Determine OS
  let os: DeviceProfile['os'];
  if (DeviceInfo.isIOS()) {
    os = 'ios';
  } else if (DeviceInfo.isAndroid()) {
    os = 'android';
  } else if (DeviceInfo.isWindows()) {
    os = 'windows';
  } else if (DeviceInfo.isMacOS()) {
    os = 'macos';
  } else if (DeviceInfo.isLinux()) {
    os = 'linux';
  } else {
    os = 'unknown';
  }

  const profile: DeviceProfile = {
    type,
    os,
    touchEnabled: DeviceInfo.isTouchDevice(),
    screen: DeviceInfo.screenSize(),
    viewport: DeviceInfo.viewportSize(),
    pixelRatio: DeviceInfo.pixelRatio(),
    orientation: DeviceInfo.orientation(),
    memory: DeviceInfo.deviceMemory(),
    cpuCores: DeviceInfo.hardwareConcurrency(),
    languages: DeviceInfo.languages(),
    online: DeviceInfo.isOnline(),
  };

  console.log('Device Profile:');
  console.log(JSON.stringify(profile, null, 2));

  return profile;
}

// =============================================================================
// Responsive Component
// =============================================================================

/**
 * A responsive component manager that adapts to device characteristics.
 */
class ResponsiveManager {
  private readonly logger: ReturnType<typeof Logger.create>;
  private readonly breakpoints: Breakpoints;
  private readonly cleanups: CleanupFn[] = [];
  private profile: DeviceProfile;

  constructor(breakpoints?: Partial<Breakpoints>) {
    this.logger = Logger.create({
      prefix: '[Responsive]',
      level: 1,
    });

    this.breakpoints = {
      mobile: breakpoints?.mobile ?? 480,
      tablet: breakpoints?.tablet ?? 768,
      desktop: breakpoints?.desktop ?? 1024,
    };

    this.profile = this.captureProfile();
    this.setupListeners();

    this.logger.info('Responsive manager initialized');
  }

  /**
   * Capture current device profile.
   */
  private captureProfile(): DeviceProfile {
    let type: 'mobile' | 'tablet' | 'desktop';
    if (DeviceInfo.isMobile()) {
      type = 'mobile';
    } else if (DeviceInfo.isTablet()) {
      type = 'tablet';
    } else {
      type = 'desktop';
    }

    let os: DeviceProfile['os'];
    if (DeviceInfo.isIOS()) {
      os = 'ios';
    } else if (DeviceInfo.isAndroid()) {
      os = 'android';
    } else if (DeviceInfo.isWindows()) {
      os = 'windows';
    } else if (DeviceInfo.isMacOS()) {
      os = 'macos';
    } else if (DeviceInfo.isLinux()) {
      os = 'linux';
    } else {
      os = 'unknown';
    }

    return {
      type,
      os,
      touchEnabled: DeviceInfo.isTouchDevice(),
      screen: DeviceInfo.screenSize(),
      viewport: DeviceInfo.viewportSize(),
      pixelRatio: DeviceInfo.pixelRatio(),
      orientation: DeviceInfo.orientation(),
      memory: DeviceInfo.deviceMemory(),
      cpuCores: DeviceInfo.hardwareConcurrency(),
      languages: DeviceInfo.languages(),
      online: DeviceInfo.isOnline(),
    };
  }

  /**
   * Setup event listeners.
   */
  private setupListeners(): void {
    // Listen for orientation changes
    const orientationCleanup = DeviceInfo.onOrientationChange((orientation) => {
      this.logger.info(`Orientation changed to: ${orientation}`);
      this.profile = this.captureProfile();
      this.onProfileChange();
    });

    this.cleanups.push(orientationCleanup);

    // Listen for resize events
    if (typeof window !== 'undefined') {
      const resizeHandler = (): void => {
        this.profile = this.captureProfile();
        this.onProfileChange();
      };

      window.addEventListener('resize', resizeHandler);
      this.cleanups.push(() => window.removeEventListener('resize', resizeHandler));
    }
  }

  /**
   * Called when profile changes.
   */
  private onProfileChange(): void {
    this.logger.debug('Profile updated');
    // In a real app, trigger UI updates here
  }

  /**
   * Get current breakpoint name.
   */
  getCurrentBreakpoint(): 'mobile' | 'tablet' | 'desktop' {
    const width = this.profile.viewport.width;

    if (width < this.breakpoints.tablet) {
      return 'mobile';
    } else if (width < this.breakpoints.desktop) {
      return 'tablet';
    } else {
      return 'desktop';
    }
  }

  /**
   * Check if current viewport matches a breakpoint.
   */
  isBreakpoint(breakpoint: 'mobile' | 'tablet' | 'desktop'): boolean {
    return this.getCurrentBreakpoint() === breakpoint;
  }

  /**
   * Get current device profile.
   */
  getProfile(): DeviceProfile {
    return this.profile;
  }

  /**
   * Get recommended layout columns based on viewport.
   */
  getRecommendedColumns(): number {
    const breakpoint = this.getCurrentBreakpoint();

    switch (breakpoint) {
      case 'mobile':
        return 1;
      case 'tablet':
        return 2;
      case 'desktop':
        return this.profile.viewport.width >= 1440 ? 4 : 3;
    }
  }

  /**
   * Get recommended image size based on device.
   */
  getRecommendedImageSize(): number {
    const breakpoint = this.getCurrentBreakpoint();
    const ratio = this.profile.pixelRatio;

    let baseSize: number;
    switch (breakpoint) {
      case 'mobile':
        baseSize = 320;
        break;
      case 'tablet':
        baseSize = 480;
        break;
      case 'desktop':
        baseSize = 800;
        break;
    }

    return Math.round(baseSize * Math.min(ratio, 2));
  }

  /**
   * Check if animations should be enabled.
   */
  shouldEnableAnimations(): boolean {
    // Disable on low-end devices or when reduced motion is preferred
    if (this.profile.cpuCores <= 2) {
      return false;
    }

    if (this.profile.memory !== null && this.profile.memory < 4) {
      return false;
    }

    return true;
  }

  /**
   * Destroy the manager.
   */
  destroy(): void {
    for (const cleanup of this.cleanups) {
      cleanup();
    }
    this.cleanups.length = 0;
    this.logger.info('Responsive manager destroyed');
  }
}

/**
 * Example: Using ResponsiveManager.
 */
function responsiveManagerExample(): CleanupFn {
  console.log('\n--- Responsive Manager Example ---');

  const responsive = new ResponsiveManager({
    mobile: 480,
    tablet: 768,
    desktop: 1024,
  });

  const profile = responsive.getProfile();
  const breakpoint = responsive.getCurrentBreakpoint();

  console.log(`Device type: ${profile.type}`);
  console.log(`OS: ${profile.os}`);
  console.log(`Current breakpoint: ${breakpoint}`);
  console.log(`Viewport: ${profile.viewport.width}x${profile.viewport.height}`);
  console.log(`Recommended columns: ${responsive.getRecommendedColumns()}`);
  console.log(`Recommended image size: ${responsive.getRecommendedImageSize()}px`);
  console.log(`Animations enabled: ${responsive.shouldEnableAnimations()}`);

  // Breakpoint checks
  console.log('\nBreakpoint checks:');
  console.log(`  Is mobile: ${responsive.isBreakpoint('mobile')}`);
  console.log(`  Is tablet: ${responsive.isBreakpoint('tablet')}`);
  console.log(`  Is desktop: ${responsive.isBreakpoint('desktop')}`);

  return () => {
    responsive.destroy();
  };
}

// =============================================================================
// Touch Device Optimization
// =============================================================================

/**
 * Example: Touch-optimized component configuration.
 */
function touchOptimizationExample(): void {
  console.log('\n--- Touch Optimization ---');

  const isTouch = DeviceInfo.isTouchDevice();

  const config = {
    // Button sizes
    minButtonSize: isTouch ? 44 : 32, // Apple HIG recommends 44px for touch
    buttonPadding: isTouch ? 12 : 8,

    // Hover states
    useHoverEffects: !isTouch,
    useTouchFeedback: isTouch,

    // Interactions
    scrollBehavior: isTouch ? 'touch' : 'auto',
    contextMenu: isTouch ? 'long-press' : 'right-click',

    // Tooltips
    showTooltips: !isTouch, // No hover on touch devices
    showLongPressHints: isTouch,
  };

  console.log('Touch-optimized configuration:');
  console.log(JSON.stringify(config, null, 2));

  if (isTouch) {
    console.log('\nTouch device tips:');
    console.log('- Use larger tap targets (44x44px minimum)');
    console.log('- Add touch feedback for buttons');
    console.log('- Implement swipe gestures where appropriate');
    console.log('- Avoid hover-dependent interactions');
  }
}

// =============================================================================
// Platform-Specific Features
// =============================================================================

/**
 * Example: Platform-specific feature configuration.
 */
function platformSpecificExample(): void {
  console.log('\n--- Platform-Specific Features ---');

  const features = {
    // iOS-specific
    ios: {
      safeAreaInsets: true,
      hapticFeedback: true,
      standbyMode: true,
      shareSheet: true,
    },

    // Android-specific
    android: {
      backButton: true,
      materialDesign: true,
      notificationChannels: true,
      splitScreen: true,
    },

    // Desktop-specific
    desktop: {
      keyboardShortcuts: true,
      rightClickMenu: true,
      resizableWindows: true,
      dragAndDrop: true,
    },
  };

  if (DeviceInfo.isIOS()) {
    console.log('iOS features enabled:');
    console.log(JSON.stringify(features.ios, null, 2));
    console.log('\nConsider:');
    console.log('- Respect safe area insets');
    console.log('- Add haptic feedback for important actions');
    console.log('- Use system share sheet');
  } else if (DeviceInfo.isAndroid()) {
    console.log('Android features enabled:');
    console.log(JSON.stringify(features.android, null, 2));
    console.log('\nConsider:');
    console.log('- Handle hardware back button');
    console.log('- Follow Material Design guidelines');
    console.log('- Support split-screen mode');
  } else if (DeviceInfo.isDesktop()) {
    console.log('Desktop features enabled:');
    console.log(JSON.stringify(features.desktop, null, 2));
    console.log('\nConsider:');
    console.log('- Add keyboard shortcuts');
    console.log('- Support drag and drop');
    console.log('- Add right-click context menus');
  }
}

// =============================================================================
// Run All Examples
// =============================================================================

/**
 * Run all device info examples.
 */
export async function runDeviceInfoExamples(): Promise<{ cleanup: () => void }> {
  console.log('=== Device Info Examples ===\n');

  const cleanups: CleanupFn[] = [];

  detectDeviceType();
  detectOperatingSystem();
  displayScreenInfo();
  displayOrientationInfo();
  cleanups.push(monitorOrientationChange());
  cleanups.push(monitorOrientationTypeChange());
  await orientationLockExample();
  displayDeviceCapabilities();
  buildDeviceProfile();
  cleanups.push(responsiveManagerExample());
  touchOptimizationExample();
  platformSpecificExample();

  console.log('\n=== Device Info Examples Active ===');
  console.log('Rotate device or resize window to see updates');

  return {
    cleanup: (): void => {
      for (const fn of cleanups) {
        fn();
      }
      console.log('\n=== Device Info Examples Cleaned Up ===');
    },
  };
}

// Export for module usage
export { ResponsiveManager, buildDeviceProfile, type DeviceProfile, type Breakpoints };

// Uncomment to run directly
// runDeviceInfoExamples().catch(console.error);
