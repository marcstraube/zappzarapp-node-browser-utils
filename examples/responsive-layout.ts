// noinspection JSUnusedGlobalSymbols - Example file

/**
 * Responsive Layout Example
 *
 * Demonstrates how to use MediaQuery utilities for building
 * responsive, accessible web applications that adapt to:
 * - Screen size breakpoints
 * - User preferences (dark mode, reduced motion)
 * - Device capabilities (touch, hover)
 *
 * @packageDocumentation
 */

import { MediaQuery, type Breakpoint } from '@zappzarapp/browser-utils/media';

// =============================================================================
// Types
// =============================================================================

/** Layout configuration per breakpoint */
interface LayoutConfig {
  readonly columns: number;
  readonly sidebarVisible: boolean;
  readonly navigationStyle: 'hamburger' | 'horizontal' | 'sidebar';
}

/** Theme configuration */
interface ThemeConfig {
  readonly mode: 'light' | 'dark';
  readonly reducedMotion: boolean;
  readonly highContrast: boolean;
}

// =============================================================================
// Breakpoint-Based Layout
// =============================================================================

/**
 * Get layout configuration based on current breakpoint.
 * Adapts the UI structure for different screen sizes.
 */
function getLayoutConfig(): LayoutConfig {
  const breakpoint = MediaQuery.breakpoint();

  const layoutMap: Record<Breakpoint, LayoutConfig> = {
    xs: { columns: 1, sidebarVisible: false, navigationStyle: 'hamburger' },
    sm: { columns: 1, sidebarVisible: false, navigationStyle: 'hamburger' },
    md: { columns: 2, sidebarVisible: false, navigationStyle: 'horizontal' },
    lg: { columns: 3, sidebarVisible: true, navigationStyle: 'horizontal' },
    xl: { columns: 4, sidebarVisible: true, navigationStyle: 'sidebar' },
    '2xl': { columns: 4, sidebarVisible: true, navigationStyle: 'sidebar' },
  };

  return layoutMap[breakpoint];
}

/**
 * Apply layout configuration to the DOM.
 */
function applyLayout(config: LayoutConfig): void {
  const gridContainer = document.querySelector('.grid-container');
  const sidebar = document.querySelector('.sidebar');
  const navigation = document.querySelector('.navigation');

  if (gridContainer instanceof HTMLElement) {
    gridContainer.style.gridTemplateColumns = `repeat(${config.columns}, 1fr)`;
  }

  if (sidebar instanceof HTMLElement) {
    sidebar.hidden = !config.sidebarVisible;
  }

  if (navigation instanceof HTMLElement) {
    navigation.dataset.style = config.navigationStyle;
  }
}

// =============================================================================
// User Preference Detection
// =============================================================================

/**
 * Get current theme configuration based on user preferences.
 * Respects system settings for accessibility and visual comfort.
 */
function getThemeConfig(): ThemeConfig {
  return {
    mode: MediaQuery.prefersDarkMode() ? 'dark' : 'light',
    reducedMotion: MediaQuery.prefersReducedMotion(),
    highContrast: MediaQuery.prefersHighContrast(),
  };
}

/**
 * Apply theme configuration to the document.
 */
function applyTheme(config: ThemeConfig): void {
  const root = document.documentElement;

  // Apply color scheme
  root.dataset.theme = config.mode;

  // Disable animations for users who prefer reduced motion
  if (config.reducedMotion) {
    root.classList.add('reduce-motion');
  } else {
    root.classList.remove('reduce-motion');
  }

  // Increase contrast for users who need it
  if (config.highContrast) {
    root.classList.add('high-contrast');
  } else {
    root.classList.remove('high-contrast');
  }
}

// =============================================================================
// Device-Specific Optimizations
// =============================================================================

/**
 * Configure interaction handlers based on device capabilities.
 * Optimizes for touch vs. mouse input.
 */
function configureInteractions(): void {
  const isTouch = MediaQuery.hasCoarsePointer();
  const hasHover = MediaQuery.hasHover();

  // Adjust touch targets for touch devices
  if (isTouch) {
    document.body.classList.add('touch-device');
    // Increase button sizes, add touch-friendly spacing
  }

  // Enable hover effects only on devices that support them
  if (hasHover) {
    document.body.classList.add('hover-enabled');
  }

  // Handle PWA standalone mode
  if (MediaQuery.isStandalone()) {
    document.body.classList.add('pwa-standalone');
    // Hide browser-specific UI elements
  }
}

// =============================================================================
// Responsive Event Listeners
// =============================================================================

/** Cleanup functions for all listeners */
const cleanupFunctions: Array<() => void> = [];

/**
 * Set up all responsive listeners.
 * Returns a cleanup function to remove all listeners.
 */
function initializeResponsiveListeners(): () => void {
  // Listen for breakpoint changes
  const cleanupBreakpoint = MediaQuery.onBreakpointChange((breakpoint) => {
    console.log(`Breakpoint changed to: ${breakpoint}`);
    applyLayout(getLayoutConfig());
  });
  cleanupFunctions.push(cleanupBreakpoint);

  // Listen for dark mode changes
  const cleanupDarkMode = MediaQuery.onDarkModeChange((isDark) => {
    console.log(`Dark mode: ${isDark ? 'enabled' : 'disabled'}`);
    applyTheme(getThemeConfig());
  });
  cleanupFunctions.push(cleanupDarkMode);

  // Listen for reduced motion preference changes
  const cleanupMotion = MediaQuery.onReducedMotionChange((prefersReduced) => {
    console.log(`Reduced motion: ${prefersReduced ? 'enabled' : 'disabled'}`);
    applyTheme(getThemeConfig());
  });
  cleanupFunctions.push(cleanupMotion);

  // Listen for orientation changes (useful for tablets)
  const cleanupOrientation = MediaQuery.onChange('(orientation: portrait)', (isPortrait) => {
    console.log(`Orientation: ${isPortrait ? 'portrait' : 'landscape'}`);
    // Adjust layout for orientation if needed
  });
  cleanupFunctions.push(cleanupOrientation);

  // Return cleanup function
  return () => {
    cleanupFunctions.forEach((cleanup) => cleanup());
    cleanupFunctions.length = 0;
  };
}

// =============================================================================
// Custom Breakpoints Example
// =============================================================================

/**
 * Example with custom breakpoints for a specific design system.
 */
export function useCustomBreakpoints(): void {
  const customBreakpoints = {
    mobile: 0,
    tablet: 600,
    desktop: 900,
    wide: 1200,
  };

  // Check current breakpoint with custom values
  const currentBreakpoint = MediaQuery.breakpoint(customBreakpoints);
  console.log(`Custom breakpoint: ${currentBreakpoint}`);

  // Check if at least tablet size
  if (MediaQuery.isAtLeast('tablet' as Breakpoint, customBreakpoints)) {
    console.log('Showing tablet or larger layout');
  }

  // Listen for changes with custom breakpoints
  const cleanup = MediaQuery.onBreakpointChange((bp) => {
    console.log(`Custom breakpoint changed: ${bp}`);
  }, customBreakpoints);

  // Cleanup when done
  cleanup();
}

// =============================================================================
// Direct Query Examples
// =============================================================================

/**
 * Examples of direct media query checks.
 */
export function directQueryExamples(): void {
  // Check specific screen width
  if (MediaQuery.matches('(min-width: 768px)')) {
    console.log('Screen is at least 768px wide');
  }

  // Check for retina/high-DPI display
  if (MediaQuery.matches('(min-resolution: 2dppx)')) {
    console.log('High-DPI display detected');
  }

  // Check for print media
  if (MediaQuery.matches('print')) {
    console.log('Preparing for print');
  }

  // Device type checks
  console.log('Device type:', {
    mobile: MediaQuery.isMobile(),
    tablet: MediaQuery.isTablet(),
    desktop: MediaQuery.isDesktop(),
  });

  // Orientation checks
  console.log('Orientation:', {
    portrait: MediaQuery.isPortrait(),
    landscape: MediaQuery.isLandscape(),
  });
}

// =============================================================================
// Main Initialization
// =============================================================================

/**
 * Initialize the responsive layout system.
 * Call this when your application starts.
 */
export function initResponsiveLayout(): () => void {
  // Apply initial configuration
  applyLayout(getLayoutConfig());
  applyTheme(getThemeConfig());
  configureInteractions();

  // Set up listeners for changes
  const cleanup = initializeResponsiveListeners();

  console.log('Responsive layout initialized');
  console.log('Current breakpoint:', MediaQuery.breakpoint());
  console.log('Theme:', getThemeConfig());

  return cleanup;
}

// =============================================================================
// Usage Example
// =============================================================================

/*
 * HTML structure expected by this example:
 *
 * <html data-theme="light">
 *   <body>
 *     <nav class="navigation" data-style="horizontal">...</nav>
 *     <aside class="sidebar">...</aside>
 *     <main class="grid-container">...</main>
 *   </body>
 * </html>
 *
 * CSS to complement this example:
 *
 * :root[data-theme="dark"] {
 *   --bg-color: #1a1a1a;
 *   --text-color: #ffffff;
 * }
 *
 * .reduce-motion * {
 *   animation-duration: 0s !important;
 *   transition-duration: 0s !important;
 * }
 *
 * .high-contrast {
 *   --contrast-multiplier: 1.5;
 * }
 *
 * .touch-device button {
 *   min-height: 44px;
 *   min-width: 44px;
 * }
 */

// Export for use in applications
export { getLayoutConfig, getThemeConfig, configureInteractions };
export type { LayoutConfig, ThemeConfig };
