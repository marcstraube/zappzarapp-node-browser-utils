# Device Detection

Device type, OS detection, screen information, and orientation utilities.

## Quick Start

```typescript
import { DeviceInfo } from '@zappzarapp/browser-utils/device';

// Device type detection
if (DeviceInfo.isMobile()) {
  enableMobileUI();
}

// Platform detection
if (DeviceInfo.isIOS()) {
  handleIOSQuirks();
}

// Screen information
const viewport = DeviceInfo.viewportSize();
console.log(`Viewport: ${viewport.width}x${viewport.height}`);

// Orientation changes
const cleanup = DeviceInfo.onOrientationChange((orientation) => {
  console.log(`Orientation: ${orientation}`);
});
```

## API Reference

### Device Type

| Method            | Returns   | Description                           |
| ----------------- | --------- | ------------------------------------- |
| `isTouchDevice()` | `boolean` | Check if device supports touch events |
| `isMobile()`      | `boolean` | Check if device appears to be mobile  |
| `isTablet()`      | `boolean` | Check if device appears to be tablet  |
| `isDesktop()`     | `boolean` | Check if device appears to be desktop |

### OS Detection

| Method        | Returns   | Description                        |
| ------------- | --------- | ---------------------------------- |
| `isIOS()`     | `boolean` | Check if device is running iOS     |
| `isAndroid()` | `boolean` | Check if device is running Android |
| `isWindows()` | `boolean` | Check if device is running Windows |
| `isMacOS()`   | `boolean` | Check if device is running macOS   |
| `isLinux()`   | `boolean` | Check if device is running Linux   |

### Screen and Viewport

| Method                  | Returns  | Description                               |
| ----------------------- | -------- | ----------------------------------------- |
| `screenSize()`          | `Size`   | Get physical screen dimensions            |
| `viewportSize()`        | `Size`   | Get visible viewport dimensions           |
| `availableScreenSize()` | `Size`   | Get available screen size (minus taskbar) |
| `pixelRatio()`          | `number` | Get device pixel ratio                    |

### Orientation

| Method                         | Returns            | Description                             |
| ------------------------------ | ------------------ | --------------------------------------- |
| `orientation()`                | `Orientation`      | Get current orientation                 |
| `orientationAngle()`           | `number`           | Get orientation angle (0, 90, 180, 270) |
| `onOrientationChange(handler)` | `CleanupFn`        | Listen for orientation changes          |
| `lockOrientation(orientation)` | `Promise<boolean>` | Lock orientation (if supported)         |
| `unlockOrientation()`          | `void`             | Unlock orientation                      |

### Browser Features

| Method                  | Returns             | Description                            |
| ----------------------- | ------------------- | -------------------------------------- |
| `languages()`           | `readonly string[]` | Get preferred languages                |
| `language()`            | `string`            | Get primary language                   |
| `isOnline()`            | `boolean`           | Check if online                        |
| `hardwareConcurrency()` | `number`            | Get number of logical processors       |
| `deviceMemory()`        | `number \| null`    | Get device memory in GB (if available) |

## Types

```typescript
type Orientation = 'portrait' | 'landscape';

interface Size {
  readonly width: number;
  readonly height: number;
}
```

## Usage Examples

### Responsive Device Detection

```typescript
function getDeviceCategory(): 'mobile' | 'tablet' | 'desktop' {
  if (DeviceInfo.isMobile()) return 'mobile';
  if (DeviceInfo.isTablet()) return 'tablet';
  return 'desktop';
}

// Adjust UI based on device
function initUI(): void {
  const category = getDeviceCategory();

  switch (category) {
    case 'mobile':
      enableSwipeNavigation();
      hideComplexFeatures();
      break;
    case 'tablet':
      enableTouchOptimizations();
      showPartialFeatures();
      break;
    case 'desktop':
      enableKeyboardShortcuts();
      showFullFeatures();
      break;
  }
}
```

### Platform-Specific Handling

```typescript
function handlePlatformQuirks(): void {
  if (DeviceInfo.isIOS()) {
    // iOS-specific fixes
    fixIOSScrollBounce();
    handleSafeAreaInsets();
  }

  if (DeviceInfo.isAndroid()) {
    // Android-specific fixes
    handleBackButton();
  }

  if (DeviceInfo.isMacOS()) {
    // macOS-specific behavior
    enableTrackpadGestures();
  }
}
```

### Responsive Images

```typescript
function getImageSize(): 'small' | 'medium' | 'large' {
  const { width } = DeviceInfo.viewportSize();
  const pixelRatio = DeviceInfo.pixelRatio();
  const effectiveWidth = width * pixelRatio;

  if (effectiveWidth < 640) return 'small';
  if (effectiveWidth < 1280) return 'medium';
  return 'large';
}

function loadResponsiveImage(basePath: string): string {
  const size = getImageSize();
  return `${basePath}-${size}.jpg`;
}
```

### Orientation Handling

```typescript
function setupOrientationHandling(): CleanupFn {
  // Get initial orientation
  updateLayout(DeviceInfo.orientation());

  // Listen for changes
  return DeviceInfo.onOrientationChange((orientation) => {
    updateLayout(orientation);
  });
}

function updateLayout(orientation: Orientation): void {
  if (orientation === 'portrait') {
    document.body.classList.add('portrait');
    document.body.classList.remove('landscape');
  } else {
    document.body.classList.add('landscape');
    document.body.classList.remove('portrait');
  }
}
```

### Orientation Lock for Games

```typescript
async function initGame(): Promise<void> {
  // Try to lock to landscape for game
  const locked = await DeviceInfo.lockOrientation('landscape');

  if (!locked) {
    showOrientationPrompt('Please rotate your device to landscape mode');

    // Listen for correct orientation
    const cleanup = DeviceInfo.onOrientationChange((orientation) => {
      if (orientation === 'landscape') {
        hideOrientationPrompt();
        cleanup();
      }
    });
  }

  startGame();
}

// Cleanup on exit
function exitGame(): void {
  DeviceInfo.unlockOrientation();
}
```

### Performance-Based Features

```typescript
function enablePerformanceFeatures(): void {
  const cores = DeviceInfo.hardwareConcurrency();
  const memory = DeviceInfo.deviceMemory();

  if (cores >= 4 && memory !== null && memory >= 4) {
    // High-end device - enable all features
    enableParticleEffects();
    enable60FPSAnimations();
    enableHighResTextures();
  } else if (cores >= 2) {
    // Mid-range device
    enable30FPSAnimations();
    enableMediumResTextures();
  } else {
    // Low-end device
    disableAnimations();
    enableLowResTextures();
  }
}
```

### Language Detection

```typescript
function initLocalization(): void {
  const languages = DeviceInfo.languages();
  const primaryLanguage = DeviceInfo.language();

  // Try to match user's preferred languages
  const supportedLanguages = ['en', 'de', 'fr', 'es'];

  for (const lang of languages) {
    const langCode = lang.split('-')[0];
    if (supportedLanguages.includes(langCode)) {
      setAppLanguage(langCode);
      return;
    }
  }

  // Fall back to English
  setAppLanguage('en');
}
```

### Touch Device Optimization

```typescript
function optimizeForTouch(): void {
  if (DeviceInfo.isTouchDevice()) {
    // Increase tap target sizes
    document.body.classList.add('touch-optimized');

    // Replace hover effects with tap effects
    replaceHoverWithTap();

    // Enable swipe gestures
    enableSwipeGestures();
  }
}
```

## Detection Notes

1. **User Agent Detection** - Some detection relies on user agent strings which
   can be spoofed
2. **Feature Detection Preferred** - Use feature detection when possible instead
   of device detection
3. **iPadOS Detection** - iPadOS 13+ reports as Macintosh; use touch detection
   combination
4. **Tablet Detection** - Tablet detection uses combination of user agent and
   screen size
5. **Pixel Ratio** - High pixel ratio devices may have different effective
   viewport sizes
