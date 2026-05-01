// noinspection JSUnusedGlobalSymbols,JSUnusedLocalSymbols - Example file

/**
 * Media Queries Example - Responsive Design and User Preference Detection
 *
 * This example demonstrates:
 * - Checking media query matches and listening for changes
 * - Detecting user preferences (dark mode, reduced motion, high contrast)
 * - Device type detection (mobile, tablet, desktop)
 * - Screen orientation checks (portrait, landscape)
 * - Responsive breakpoint management and change listeners
 * - Display feature detection (hover, pointer type)
 * - Building adaptive UI components
 * - Implementing a dark mode toggle with system preference sync
 *
 * @packageDocumentation
 */

import { type CleanupFn } from '@zappzarapp/browser-utils/core';
import { type Breakpoint, MediaQuery } from '@zappzarapp/browser-utils/media';

// =============================================================================
// Types
// =============================================================================

/**
 * Theme configuration for dark/light mode.
 */
interface ThemeConfig {
  readonly mode: 'light' | 'dark' | 'system';
  readonly highContrast: boolean;
  readonly reducedMotion: boolean;
}

/**
 * Responsive layout configuration based on breakpoints.
 */
interface LayoutConfig {
  readonly columns: number;
  readonly sidebarVisible: boolean;
  readonly navStyle: 'hamburger' | 'tabs' | 'sidebar';
  readonly cardSize: 'compact' | 'standard' | 'expanded';
}

/**
 * Device capability profile for adaptive UI decisions.
 */
interface DeviceProfile {
  readonly type: 'mobile' | 'tablet' | 'desktop';
  readonly orientation: 'portrait' | 'landscape';
  readonly hasHover: boolean;
  readonly pointerType: 'coarse' | 'fine' | 'none';
  readonly breakpoint: Breakpoint;
}

// =============================================================================
// Basic Media Query Checks
// =============================================================================

/**
 * Example: Check if specific media queries match.
 * Demonstrates direct usage of MediaQuery.matches() for one-time checks.
 */
function checkMediaQueries(): void {
  console.log('--- Media Query Checks ---');

  console.log('Wide screen (>= 1200px):', MediaQuery.matches('(min-width: 1200px)'));
  console.log(
    'Large touch device:',
    MediaQuery.matches('(min-width: 1024px) and (pointer: coarse)')
  );
  console.log('Retina display:', MediaQuery.matches('(min-resolution: 2dppx)'));
}

/**
 * Example: Listen for media query changes.
 * Demonstrates MediaQuery.onChange() for reactive updates.
 */
function watchMediaQuery(query: string, label: string): CleanupFn {
  // Check initial state
  const initialMatch = MediaQuery.matches(query);
  console.log(`[${label}] Initial: ${initialMatch ? 'matches' : 'no match'}`);

  // Listen for changes and return cleanup
  return MediaQuery.onChange(query, (matches) => {
    console.log(`[${label}] Changed: ${matches ? 'matches' : 'no match'}`);
  });
}

// =============================================================================
// User Preference Detection
// =============================================================================

/**
 * Detect all user preferences at once.
 * Useful for initial page setup or preference summaries.
 */
function detectUserPreferences(): ThemeConfig {
  const isDark = MediaQuery.prefersDarkMode();
  const isHighContrast = MediaQuery.prefersHighContrast();
  const isReducedMotion = MediaQuery.prefersReducedMotion();

  console.log('[Prefs] dark:', isDark, '| contrast:', isHighContrast, '| motion:', isReducedMotion);

  return {
    mode: isDark ? 'dark' : 'light',
    highContrast: isHighContrast,
    reducedMotion: isReducedMotion,
  };
}

/**
 * Listen for preference changes and apply them.
 * Sets up listeners for dark mode and reduced motion changes.
 */
function watchUserPreferences(onUpdate: (config: ThemeConfig) => void): CleanupFn {
  let currentConfig = detectUserPreferences();
  onUpdate(currentConfig);

  const cleanupDarkMode = MediaQuery.onDarkModeChange((isDark) => {
    console.log('[Preferences] Dark mode changed:', isDark);
    currentConfig = { ...currentConfig, mode: isDark ? 'dark' : 'light' };
    onUpdate(currentConfig);
  });

  const cleanupReducedMotion = MediaQuery.onReducedMotionChange((prefersReduced) => {
    console.log('[Preferences] Reduced motion changed:', prefersReduced);
    currentConfig = { ...currentConfig, reducedMotion: prefersReduced };
    onUpdate(currentConfig);
  });

  return () => {
    cleanupDarkMode();
    cleanupReducedMotion();
  };
}

// =============================================================================
// Dark Mode Toggle
// =============================================================================

/**
 * Create a dark mode toggle that syncs with system preference.
 * Allows user override while still reacting to system changes.
 */
function createDarkModeToggle(container: HTMLElement): {
  readonly getMode: () => 'light' | 'dark' | 'system';
  readonly setMode: (mode: 'light' | 'dark' | 'system') => void;
  readonly cleanup: CleanupFn;
} {
  let userMode: 'light' | 'dark' | 'system' = 'system';

  function resolveTheme(): 'light' | 'dark' {
    return userMode === 'system' ? (MediaQuery.prefersDarkMode() ? 'dark' : 'light') : userMode;
  }

  function applyTheme(): void {
    const effective = resolveTheme();
    container.setAttribute('data-theme', effective);
    container.classList.toggle('dark', effective === 'dark');
    container.classList.toggle('light', effective === 'light');
    console.log(`[DarkMode] Applied: ${effective} (mode: ${userMode})`);
  }

  applyTheme();

  // React to system changes only when mode is 'system'
  const cleanupSystemChange = MediaQuery.onDarkModeChange(() => {
    if (userMode === 'system') applyTheme();
  });

  return {
    getMode: () => userMode,

    setMode: (mode) => {
      userMode = mode;
      applyTheme();
      try {
        localStorage.setItem('theme-mode', mode);
      } catch {
        /* noop */
      }
    },

    cleanup: () => {
      cleanupSystemChange();
    },
  };
}

// =============================================================================
// Device Type Detection
// =============================================================================

/**
 * Build a complete device profile from media query checks.
 */
function getDeviceProfile(): DeviceProfile {
  // Determine device type
  let type: DeviceProfile['type'];
  if (MediaQuery.isMobile()) {
    type = 'mobile';
  } else if (MediaQuery.isTablet()) {
    type = 'tablet';
  } else {
    type = 'desktop';
  }

  // Determine pointer type
  let pointerType: DeviceProfile['pointerType'];
  if (MediaQuery.hasFinePointer()) {
    pointerType = 'fine';
  } else if (MediaQuery.hasCoarsePointer()) {
    pointerType = 'coarse';
  } else {
    pointerType = 'none';
  }

  const profile: DeviceProfile = {
    type,
    orientation: MediaQuery.isPortrait() ? 'portrait' : 'landscape',
    hasHover: MediaQuery.hasHover(),
    pointerType,
    breakpoint: MediaQuery.breakpoint(),
  };

  console.log('[Device]', profile);

  return profile;
}

/**
 * Adapt interaction patterns based on device capabilities.
 * Returns behavior flags for UI components.
 */
function getInteractionHints(profile: DeviceProfile): {
  readonly tooltipTrigger: 'hover' | 'tap';
  readonly scrollBehavior: 'smooth' | 'auto';
  readonly tapTargetSize: 'standard' | 'large';
  readonly menuStyle: 'dropdown' | 'bottom-sheet';
} {
  return {
    tooltipTrigger: profile.hasHover ? 'hover' : 'tap',
    scrollBehavior: MediaQuery.prefersReducedMotion() ? 'auto' : 'smooth',
    tapTargetSize: profile.pointerType === 'coarse' ? 'large' : 'standard',
    menuStyle: profile.type === 'mobile' ? 'bottom-sheet' : 'dropdown',
  };
}

// =============================================================================
// Orientation Handling
// =============================================================================

/**
 * Watch for orientation changes and adjust layout.
 */
function watchOrientation(
  onOrientationChange: (orientation: 'portrait' | 'landscape') => void
): CleanupFn {
  // Report initial orientation
  const initial = MediaQuery.isPortrait() ? 'portrait' : 'landscape';
  console.log('[Orientation] Initial:', initial);
  onOrientationChange(initial);

  // Listen for orientation changes
  return MediaQuery.onChange('(orientation: portrait)', (isPortrait) => {
    const orientation = isPortrait ? 'portrait' : 'landscape';
    console.log('[Orientation] Changed to:', orientation);
    onOrientationChange(orientation);
  });
}

// =============================================================================
// Responsive Breakpoints
// =============================================================================

/**
 * Determine layout configuration based on the current breakpoint.
 */
function getLayoutForBreakpoint(bp: Breakpoint): LayoutConfig {
  switch (bp) {
    case 'xs':
      return { columns: 1, sidebarVisible: false, navStyle: 'hamburger', cardSize: 'compact' };
    case 'sm':
      return { columns: 2, sidebarVisible: false, navStyle: 'hamburger', cardSize: 'compact' };
    case 'md':
      return { columns: 2, sidebarVisible: false, navStyle: 'tabs', cardSize: 'standard' };
    case 'lg':
      return { columns: 3, sidebarVisible: true, navStyle: 'sidebar', cardSize: 'standard' };
    case 'xl':
    case '2xl':
      return { columns: 4, sidebarVisible: true, navStyle: 'sidebar', cardSize: 'expanded' };
  }
}

/**
 * Create a responsive layout manager that reacts to breakpoint changes.
 */
function createResponsiveLayout(container: HTMLElement): {
  readonly getLayout: () => LayoutConfig;
  readonly cleanup: CleanupFn;
} {
  let currentLayout = getLayoutForBreakpoint(MediaQuery.breakpoint());

  /**
   * Apply layout configuration to the container element.
   */
  function applyLayout(layout: LayoutConfig): void {
    container.style.setProperty('--columns', String(layout.columns));
    container.setAttribute('data-nav-style', layout.navStyle);
    container.setAttribute('data-card-size', layout.cardSize);

    const sidebar = container.querySelector<HTMLElement>('.sidebar');
    if (sidebar !== null) {
      sidebar.style.display = layout.sidebarVisible ? 'block' : 'none';
    }

    console.log('[Layout] Applied:', layout);
  }

  applyLayout(currentLayout);

  const cleanup = MediaQuery.onBreakpointChange((newBreakpoint) => {
    console.log(`[Layout] Breakpoint changed to: ${newBreakpoint}`);
    currentLayout = getLayoutForBreakpoint(newBreakpoint);
    applyLayout(currentLayout);
  });

  return { getLayout: () => currentLayout, cleanup };
}

/**
 * Conditional content loading based on breakpoint.
 * Only loads heavy resources on larger screens.
 */
function conditionalContentLoader(): void {
  if (MediaQuery.isAtLeast('lg')) {
    const hero = document.querySelector<HTMLImageElement>('.hero-image');
    if (hero !== null) hero.src = hero.dataset['srcLarge'] ?? hero.src;
  }

  if (MediaQuery.isBelow('md')) {
    document
      .querySelectorAll<HTMLElement>('.data-table')
      .forEach((t) => t.classList.add('card-view'));
  }

  console.log(`[Content] Loaded for breakpoint: ${MediaQuery.breakpoint()}`);
}

// =============================================================================
// Display Feature Detection
// =============================================================================

/**
 * Configure UI elements based on pointer and hover capabilities.
 */
function configureInputAdaptations(root: HTMLElement): void {
  console.log('--- Input Adaptations ---');

  if (MediaQuery.hasCoarsePointer()) {
    root.style.setProperty('--tap-target-size', '48px');
    root.style.setProperty('--button-min-height', '48px');
    console.log('[Input] Touch-optimized sizes applied');
  } else {
    root.style.setProperty('--tap-target-size', '32px');
    root.style.setProperty('--button-min-height', '36px');
    console.log('[Input] Pointer-optimized sizes applied');
  }

  root.classList.toggle('has-hover', MediaQuery.hasHover());
}

// =============================================================================
// Responsive Image Loader
// =============================================================================

/**
 * Load appropriately-sized images based on screen size.
 */
function setupResponsiveImages(): CleanupFn {
  function updateImages(): void {
    document.querySelectorAll<HTMLImageElement>('[data-responsive-image]').forEach((img) => {
      let src: string | undefined;
      if (MediaQuery.isBelow('sm')) src = img.dataset['srcSmall'];
      else if (MediaQuery.isBelow('lg')) src = img.dataset['srcMedium'];
      else src = img.dataset['srcLarge'];

      if (src !== undefined && img.src !== src) img.src = src;
    });
  }

  updateImages();
  return MediaQuery.onBreakpointChange(() => updateImages());
}

// =============================================================================
// Motion-Safe Animations
// =============================================================================

/**
 * Create an animation helper that respects reduced motion preferences.
 * Falls back to instant state application when reduced motion is active.
 */
function createMotionSafeAnimator(): {
  readonly animate: (
    el: HTMLElement,
    keyframes: Keyframe[],
    opts: KeyframeAnimationOptions
  ) => Animation | null;
  readonly cleanup: CleanupFn;
} {
  let reducedMotion = MediaQuery.prefersReducedMotion();

  const cleanup = MediaQuery.onReducedMotionChange((v) => {
    reducedMotion = v;
    console.log(`[Motion] Reduced motion ${v ? 'enabled' : 'disabled'}`);
  });

  return {
    animate: (el, keyframes, opts) => {
      if (reducedMotion) {
        const finalFrame = keyframes[keyframes.length - 1];
        if (finalFrame !== undefined) Object.assign(el.style, finalFrame);
        return null;
      }
      return el.animate(keyframes, opts);
    },
    cleanup,
  };
}

// =============================================================================
// Adaptive UI (Combined Example)
// =============================================================================

/**
 * Create an adaptive UI manager that monitors all media queries.
 * Combines theme, layout, and device detection with live updates.
 */
function createAdaptiveUI(root: HTMLElement): {
  readonly getSettings: () => { theme: ThemeConfig; layout: LayoutConfig; device: DeviceProfile };
  readonly cleanup: CleanupFn;
} {
  const cleanups: CleanupFn[] = [];
  let theme = detectUserPreferences();
  let device = getDeviceProfile();
  let layout = getLayoutForBreakpoint(device.breakpoint);

  function applySettings(): void {
    root.setAttribute('data-theme', theme.mode);
    root.classList.toggle('high-contrast', theme.highContrast);
    root.classList.toggle('reduced-motion', theme.reducedMotion);
    root.style.setProperty('--columns', String(layout.columns));
    root.setAttribute('data-device', device.type);
    root.setAttribute('data-orientation', device.orientation);
    console.log('[AdaptiveUI]', { theme: theme.mode, device: device.type, bp: device.breakpoint });
  }

  applySettings();
  configureInputAdaptations(root);

  cleanups.push(
    MediaQuery.onDarkModeChange((isDark) => {
      theme = { ...theme, mode: isDark ? 'dark' : 'light' };
      applySettings();
    })
  );

  cleanups.push(
    MediaQuery.onReducedMotionChange((prefersReduced) => {
      theme = { ...theme, reducedMotion: prefersReduced };
      applySettings();
    })
  );

  cleanups.push(
    MediaQuery.onBreakpointChange((bp) => {
      layout = getLayoutForBreakpoint(bp);
      device = getDeviceProfile();
      applySettings();
    })
  );

  cleanups.push(
    watchOrientation((orientation) => {
      device = { ...device, orientation };
      applySettings();
    })
  );

  return {
    getSettings: () => ({ theme, layout, device }),
    cleanup: () => {
      for (const fn of cleanups) fn();
    },
  };
}

// =============================================================================
// Example: Complete Application Setup
// =============================================================================

/**
 * Initialize all media query features for a responsive application.
 */
function initializeApp(): { cleanup: CleanupFn } {
  console.log('=== Media Queries Example ===\n');

  const cleanups: CleanupFn[] = [];

  // 1. Basic checks
  checkMediaQueries();

  // 2. Custom media query watcher
  cleanups.push(watchMediaQuery('(min-width: 768px)', 'Desktop Width'));

  // 3. Device profile
  const profile = getDeviceProfile();
  console.log('Interaction hints:', getInteractionHints(profile));

  // 4. Dark mode toggle
  const darkMode = createDarkModeToggle(document.documentElement);
  cleanups.push(darkMode.cleanup);
  try {
    const saved = localStorage.getItem('theme-mode');
    if (saved === 'light' || saved === 'dark' || saved === 'system') darkMode.setMode(saved);
  } catch {
    /* noop */
  }

  // 5. Responsive layout + images
  cleanups.push(createResponsiveLayout(document.documentElement).cleanup);
  cleanups.push(setupResponsiveImages());

  // 6. Motion-safe animator
  cleanups.push(createMotionSafeAnimator().cleanup);

  // 7. Adaptive UI (combines theme, layout, device)
  cleanups.push(createAdaptiveUI(document.documentElement).cleanup);

  // 8. Conditional content + orientation
  conditionalContentLoader();
  cleanups.push(watchOrientation((o) => console.log(`[App] Orientation: ${o}`)));

  console.log('\n=== Initialized ===', {
    breakpoint: MediaQuery.breakpoint(),
    device: profile.type,
    dark: MediaQuery.prefersDarkMode(),
  });

  return {
    cleanup: () => {
      console.log('\n--- Cleaning Up ---');
      for (const fn of cleanups) {
        fn();
      }
      console.log('All media query handlers cleaned up');
    },
  };
}

// =============================================================================
// Simple Usage Examples
// =============================================================================

/**
 * Example: Quick device-aware rendering decisions.
 */
function quickDeviceCheck(): void {
  if (MediaQuery.isMobile()) console.log('Rendering mobile layout');
  else if (MediaQuery.isTablet()) console.log('Rendering tablet layout');
  else if (MediaQuery.isDesktop()) console.log('Rendering desktop layout');

  if (MediaQuery.isPortrait()) console.log('Portrait mode');
  else if (MediaQuery.isLandscape()) console.log('Landscape mode');
}

/**
 * Example: Quick breakpoint check with conditional logic.
 */
function quickBreakpointCheck(): void {
  console.log('Current breakpoint:', MediaQuery.breakpoint());

  if (MediaQuery.isAtLeast('lg')) console.log('Large or above - full navigation');
  if (MediaQuery.isBelow('md')) console.log('Below medium - hiding sidebar');
}

// =============================================================================
// Exports
// =============================================================================

export {
  checkMediaQueries,
  watchMediaQuery,
  detectUserPreferences,
  watchUserPreferences,
  createDarkModeToggle,
  getDeviceProfile,
  getInteractionHints,
  watchOrientation,
  getLayoutForBreakpoint,
  createResponsiveLayout,
  conditionalContentLoader,
  configureInputAdaptations,
  setupResponsiveImages,
  createMotionSafeAnimator,
  createAdaptiveUI,
  initializeApp,
  quickDeviceCheck,
  quickBreakpointCheck,
  type ThemeConfig,
  type LayoutConfig,
  type DeviceProfile,
};

// Run example if this is the entry point
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    quickDeviceCheck();
    quickBreakpointCheck();

    // Initialize full app
    const app = initializeApp();

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      app.cleanup();
    });
  });
}
