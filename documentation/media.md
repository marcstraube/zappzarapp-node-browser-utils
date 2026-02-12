# Media Query Utilities

Responsive design utilities for media query matching and user preferences.

## Quick Start

```typescript
import { MediaQuery } from '@zappzarapp/browser-utils/media';

// Check media query
if (MediaQuery.matches('(min-width: 768px)')) {
  // Desktop layout
}

// Dark mode detection
if (MediaQuery.prefersDarkMode()) {
  applyDarkTheme();
}

// Listen for changes
const cleanup = MediaQuery.onDarkModeChange((isDark) => {
  updateTheme(isDark ? 'dark' : 'light');
});
```

## API Reference

### Core API

| Method                     | Returns     | Description                    |
| -------------------------- | ----------- | ------------------------------ |
| `matches(query)`           | `boolean`   | Check if media query matches   |
| `onChange(query, handler)` | `CleanupFn` | Listen for media query changes |

### User Preferences

| Method                           | Returns     | Description                                |
| -------------------------------- | ----------- | ------------------------------------------ |
| `prefersDarkMode()`              | `boolean`   | Check if user prefers dark color scheme    |
| `prefersLightMode()`             | `boolean`   | Check if user prefers light color scheme   |
| `prefersReducedMotion()`         | `boolean`   | Check if user prefers reduced motion       |
| `prefersReducedTransparency()`   | `boolean`   | Check if user prefers reduced transparency |
| `prefersHighContrast()`          | `boolean`   | Check if user prefers high contrast        |
| `onDarkModeChange(handler)`      | `CleanupFn` | Listen for dark mode changes               |
| `onReducedMotionChange(handler)` | `CleanupFn` | Listen for reduced motion changes          |

### Device Type

| Method          | Returns   | Description                                 |
| --------------- | --------- | ------------------------------------------- |
| `isMobile()`    | `boolean` | Check if device appears to be mobile        |
| `isTablet()`    | `boolean` | Check if device appears to be tablet        |
| `isDesktop()`   | `boolean` | Check if device appears to be desktop       |
| `isPortrait()`  | `boolean` | Check if screen is in portrait orientation  |
| `isLandscape()` | `boolean` | Check if screen is in landscape orientation |

### Breakpoints

| Method                                      | Returns      | Description                              |
| ------------------------------------------- | ------------ | ---------------------------------------- |
| `breakpoint(breakpoints?)`                  | `Breakpoint` | Get current breakpoint name              |
| `isAtLeast(breakpoint, breakpoints?)`       | `boolean`    | Check if width is at or above breakpoint |
| `isBelow(breakpoint, breakpoints?)`         | `boolean`    | Check if width is below breakpoint       |
| `onBreakpointChange(handler, breakpoints?)` | `CleanupFn`  | Listen for breakpoint changes            |

### Display Features

| Method               | Returns   | Description                                |
| -------------------- | --------- | ------------------------------------------ |
| `hasHover()`         | `boolean` | Check if device supports hover             |
| `hasCoarsePointer()` | `boolean` | Check if device has coarse pointer (touch) |
| `hasFinePointer()`   | `boolean` | Check if device has fine pointer (mouse)   |
| `isStandalone()`     | `boolean` | Check if app is in standalone mode (PWA)   |

## Types

```typescript
type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
```

## Default Breakpoints

| Breakpoint | Min Width |
| ---------- | --------- |
| `xs`       | 0px       |
| `sm`       | 640px     |
| `md`       | 768px     |
| `lg`       | 1024px    |
| `xl`       | 1280px    |
| `2xl`      | 1536px    |

## Usage Examples

### Responsive Component

```typescript
function ResponsiveLayout(): void {
  const breakpoint = MediaQuery.breakpoint();

  if (MediaQuery.isMobile()) {
    renderMobileLayout();
  } else if (MediaQuery.isTablet()) {
    renderTabletLayout();
  } else {
    renderDesktopLayout();
  }
}

// React to breakpoint changes
const cleanup = MediaQuery.onBreakpointChange((bp) => {
  console.log(`Breakpoint changed to: ${bp}`);
  ResponsiveLayout();
});
```

### Dark Mode Support

```typescript
function initTheme(): void {
  // Set initial theme
  const isDark = MediaQuery.prefersDarkMode();
  document.documentElement.dataset.theme = isDark ? 'dark' : 'light';

  // Listen for system changes
  MediaQuery.onDarkModeChange((isDark) => {
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  });
}
```

### Reduced Motion Support

```typescript
function animate(element: HTMLElement): void {
  if (MediaQuery.prefersReducedMotion()) {
    // Skip animation, apply final state
    element.style.opacity = '1';
    return;
  }

  // Full animation
  element.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: 300,
    easing: 'ease-out',
  });
}

// Listen for preference changes
MediaQuery.onReducedMotionChange((prefersReduced) => {
  if (prefersReduced) {
    pauseAllAnimations();
  } else {
    resumeAnimations();
  }
});
```

### Custom Breakpoints

```typescript
const customBreakpoints = {
  mobile: 0,
  tablet: 600,
  desktop: 1200,
  wide: 1800,
};

const bp = MediaQuery.breakpoint(customBreakpoints);

if (MediaQuery.isAtLeast('desktop', customBreakpoints)) {
  showSidebar();
}

MediaQuery.onBreakpointChange((breakpoint) => {
  console.log('Current breakpoint:', breakpoint);
}, customBreakpoints);
```

### Touch Device Detection

```typescript
function setupInteraction(): void {
  if (MediaQuery.hasCoarsePointer()) {
    // Touch device - use larger touch targets
    document.body.classList.add('touch-device');
  }

  if (MediaQuery.hasHover()) {
    // Device supports hover - enable hover effects
    document.body.classList.add('has-hover');
  }
}
```

### PWA Detection

```typescript
function initApp(): void {
  if (MediaQuery.isStandalone()) {
    // Running as installed PWA
    hideInstallPrompt();
    enableOfflineFeatures();
  } else {
    // Running in browser
    showInstallPrompt();
  }
}
```

### Orientation-Based Layout

```typescript
function updateLayout(): void {
  if (MediaQuery.isPortrait()) {
    enableVerticalLayout();
  } else {
    enableHorizontalLayout();
  }
}

// Listen for orientation changes via resize
const cleanup = MediaQuery.onChange('(orientation: portrait)', (isPortrait) => {
  updateLayout();
});
```

## Accessibility Considerations

1. **Reduced Motion** - Always check `prefersReducedMotion()` before animations
2. **High Contrast** - Respect `prefersHighContrast()` for better visibility
3. **Color Scheme** - Support both light and dark modes
4. **Touch Targets** - Use `hasCoarsePointer()` to size interactive elements
   appropriately
