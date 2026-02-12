// noinspection JSUnusedGlobalSymbols - Example file

/**
 * Feature Detection Example - Browser Capability Checks and Progressive Enhancement
 *
 * This example demonstrates:
 * - Detecting browser capabilities before using APIs
 * - Progressive enhancement patterns
 * - Graceful fallbacks for unsupported features
 * - Building feature-aware components
 * - Conditional polyfill loading
 *
 * @packageDocumentation
 */

import { FeatureDetect, type FeatureReport } from '@zappzarapp/browser-utils/features';

// =============================================================================
// Types
// =============================================================================

/**
 * Application feature requirements.
 */
interface FeatureRequirements {
  readonly required: ReadonlyArray<keyof FeatureReport>;
  readonly optional: ReadonlyArray<keyof FeatureReport>;
}

/**
 * Feature compatibility result.
 */
interface CompatibilityResult {
  readonly compatible: boolean;
  readonly missing: ReadonlyArray<keyof FeatureReport>;
  readonly available: ReadonlyArray<keyof FeatureReport>;
  readonly report: FeatureReport;
}

/**
 * Storage strategy based on available features.
 */
type StorageStrategy = 'localStorage' | 'sessionStorage' | 'indexedDB' | 'memory';

// =============================================================================
// Basic Usage
// =============================================================================

/**
 * Check individual browser features.
 */
function basicFeatureChecks(): void {
  console.log('--- Basic Feature Checks ---');

  // Storage APIs
  console.log('localStorage:', FeatureDetect.localStorage());
  console.log('sessionStorage:', FeatureDetect.sessionStorage());
  console.log('cookies:', FeatureDetect.cookies());
  console.log('indexedDB:', FeatureDetect.indexedDB());

  // Modern APIs
  console.log('serviceWorker:', FeatureDetect.serviceWorker());
  console.log('notifications:', FeatureDetect.notifications());
  console.log('geolocation:', FeatureDetect.geolocation());

  // Clipboard
  console.log('clipboard (write):', FeatureDetect.clipboard());
  console.log('clipboard (read):', FeatureDetect.clipboardRead());

  // Input
  console.log('touch:', FeatureDetect.touch());

  // Graphics
  console.log('webGL:', FeatureDetect.webGL());
  console.log('webGL2:', FeatureDetect.webGL2());

  // Web Components
  console.log('customElements:', FeatureDetect.customElements());
  console.log('shadowDOM:', FeatureDetect.shadowDOM());

  // Observers
  console.log('intersectionObserver:', FeatureDetect.intersectionObserver());
  console.log('resizeObserver:', FeatureDetect.resizeObserver());
  console.log('mutationObserver:', FeatureDetect.mutationObserver());

  // Core APIs
  console.log('fetch:', FeatureDetect.fetch());
  console.log('promise:', FeatureDetect.promise());
  console.log('webSocket:', FeatureDetect.webSocket());
}

/**
 * Get a complete feature report.
 */
function getCompleteReport(): void {
  console.log('\n--- Complete Feature Report ---');

  const report = FeatureDetect.all();

  // Count supported features
  const entries = Object.entries(report) as Array<[keyof FeatureReport, boolean]>;
  const supported = entries.filter(([, value]) => value);
  const unsupported = entries.filter(([, value]) => !value);

  console.log(`Supported: ${supported.length}/${entries.length}`);
  console.log('Supported features:', supported.map(([key]) => key).join(', '));

  if (unsupported.length > 0) {
    console.log('Unsupported features:', unsupported.map(([key]) => key).join(', '));
  }
}

// =============================================================================
// Compatibility Checking
// =============================================================================

/**
 * Check if browser meets application requirements.
 */
function checkCompatibility(requirements: FeatureRequirements): CompatibilityResult {
  const report = FeatureDetect.all();

  const missing: Array<keyof FeatureReport> = [];
  const available: Array<keyof FeatureReport> = [];

  // Check required features
  for (const feature of requirements.required) {
    if (report[feature]) {
      available.push(feature);
    } else {
      missing.push(feature);
    }
  }

  // Check optional features
  for (const feature of requirements.optional) {
    if (report[feature]) {
      available.push(feature);
    }
  }

  return {
    compatible: missing.length === 0,
    missing,
    available,
    report,
  };
}

/**
 * Example: Check application compatibility.
 */
function compatibilityCheckExample(): void {
  console.log('\n--- Compatibility Check ---');

  // Define what your app needs
  const requirements: FeatureRequirements = {
    required: ['localStorage', 'fetch', 'promise'],
    optional: ['notifications', 'serviceWorker', 'indexedDB'],
  };

  const result = checkCompatibility(requirements);

  if (result.compatible) {
    console.log('Browser is compatible with all required features');
    console.log(
      'Available optional features:',
      result.available.filter((f) => requirements.optional.includes(f))
    );
  } else {
    console.warn('Browser is missing required features:', result.missing);
    console.log('Consider showing a browser upgrade message');
  }
}

// =============================================================================
// Progressive Enhancement
// =============================================================================

/**
 * Choose the best storage strategy based on available features.
 */
function chooseStorageStrategy(): StorageStrategy {
  // Prefer IndexedDB for large data
  if (FeatureDetect.indexedDB()) {
    return 'indexedDB';
  }

  // Fall back to localStorage
  if (FeatureDetect.localStorage()) {
    return 'localStorage';
  }

  // Try sessionStorage (more restricted)
  if (FeatureDetect.sessionStorage()) {
    return 'sessionStorage';
  }

  // Last resort: in-memory storage
  return 'memory';
}

/**
 * Create a storage adapter based on available features.
 */
function createStorageAdapter(): {
  readonly strategy: StorageStrategy;
  readonly set: (key: string, value: string) => void;
  readonly get: (key: string) => string | null;
  readonly remove: (key: string) => void;
} {
  const strategy = chooseStorageStrategy();
  const memoryStore = new Map<string, string>();

  console.log(`Using storage strategy: ${strategy}`);

  switch (strategy) {
    case 'localStorage':
      return {
        strategy,
        set: (key, value) => localStorage.setItem(key, value),
        get: (key) => localStorage.getItem(key),
        remove: (key) => localStorage.removeItem(key),
      };

    case 'sessionStorage':
      return {
        strategy,
        set: (key, value) => sessionStorage.setItem(key, value),
        get: (key) => sessionStorage.getItem(key),
        remove: (key) => sessionStorage.removeItem(key),
      };

    case 'indexedDB':
      // For simplicity, fall back to localStorage in this example
      // In a real app, you'd implement async IndexedDB operations
      return {
        strategy,
        set: (key, value) => localStorage.setItem(key, value),
        get: (key) => localStorage.getItem(key),
        remove: (key) => localStorage.removeItem(key),
      };

    case 'memory':
    default:
      return {
        strategy,
        set: (key, value) => memoryStore.set(key, value),
        get: (key) => memoryStore.get(key) ?? null,
        remove: (key) => memoryStore.delete(key),
      };
  }
}

/**
 * Example: Progressive storage enhancement.
 */
function progressiveStorageExample(): void {
  console.log('\n--- Progressive Storage Enhancement ---');

  const storage = createStorageAdapter();

  storage.set('test-key', 'test-value');
  console.log('Stored value:', storage.get('test-key'));
  storage.remove('test-key');
  console.log('After removal:', storage.get('test-key'));
}

// =============================================================================
// Clipboard Enhancement
// =============================================================================

/**
 * Copy text with fallback for older browsers.
 */
async function copyToClipboard(text: string): Promise<boolean> {
  // Try modern Clipboard API first
  if (FeatureDetect.clipboard()) {
    try {
      await navigator.clipboard.writeText(text);
      console.log('Copied using Clipboard API');
      return true;
    } catch (error) {
      console.warn('Clipboard API failed:', error);
    }
  }

  // Fallback: Use deprecated execCommand
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);

    if (success) {
      console.log('Copied using execCommand fallback');
      return true;
    }
  } catch (error) {
    console.warn('execCommand fallback failed:', error);
  }

  console.error('Could not copy to clipboard');
  return false;
}

/**
 * Example: Copy button with progressive enhancement.
 */
function clipboardExample(): void {
  console.log('\n--- Clipboard Enhancement ---');

  const copyButton = document.querySelector<HTMLButtonElement>('[data-copy]');
  if (copyButton === null) {
    console.log('No copy button found in DOM');
    return;
  }

  const textToCopy = copyButton.dataset['copy'] ?? '';

  copyButton.addEventListener('click', () => {
    void copyToClipboard(textToCopy).then((success) => {
      if (success) {
        copyButton.textContent = 'Copied!';
        setTimeout(() => {
          copyButton.textContent = 'Copy';
        }, 2000);
      }
    });
  });
}

// =============================================================================
// Graphics Enhancement
// =============================================================================

/**
 * Choose the best graphics context for canvas.
 */
function createGraphicsContext(canvas: HTMLCanvasElement): {
  readonly type: 'webgl2' | 'webgl' | '2d';
  readonly context: RenderingContext;
} | null {
  // Try WebGL 2 first (most capable)
  if (FeatureDetect.webGL2()) {
    const gl2 = canvas.getContext('webgl2');
    if (gl2 !== null) {
      console.log('Using WebGL 2 context');
      return { type: 'webgl2', context: gl2 };
    }
  }

  // Fall back to WebGL 1
  if (FeatureDetect.webGL()) {
    const gl = canvas.getContext('webgl');
    if (gl !== null) {
      console.log('Using WebGL 1 context');
      return { type: 'webgl', context: gl };
    }
  }

  // Fall back to 2D context
  const ctx2d = canvas.getContext('2d');
  if (ctx2d !== null) {
    console.log('Using 2D context (WebGL not available)');
    return { type: '2d', context: ctx2d };
  }

  console.error('No graphics context available');
  return null;
}

/**
 * Example: Create graphics context with fallback.
 */
function graphicsExample(): void {
  console.log('\n--- Graphics Enhancement ---');

  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 300;

  const graphics = createGraphicsContext(canvas);
  if (graphics !== null) {
    console.log(`Created ${graphics.type} context`);
  }
}

// =============================================================================
// Touch/Input Enhancement
// =============================================================================

/**
 * Create input handlers that work for both touch and mouse.
 */
function createUniversalInputHandler(element: HTMLElement): {
  readonly onInteractionStart: (handler: (x: number, y: number) => void) => void;
  readonly onInteractionEnd: (handler: () => void) => void;
  readonly cleanup: () => void;
} {
  const startHandlers: Array<(x: number, y: number) => void> = [];
  const endHandlers: Array<() => void> = [];

  const handleStart = (x: number, y: number): void => {
    for (const handler of startHandlers) {
      handler(x, y);
    }
  };

  const handleEnd = (): void => {
    for (const handler of endHandlers) {
      handler();
    }
  };

  // Touch handlers
  const touchStart = (e: TouchEvent): void => {
    const touch = e.touches[0];
    if (touch !== undefined) {
      handleStart(touch.clientX, touch.clientY);
    }
  };

  const touchEnd = (): void => {
    handleEnd();
  };

  // Mouse handlers (for non-touch devices)
  const mouseDown = (e: MouseEvent): void => {
    handleStart(e.clientX, e.clientY);
  };

  const mouseUp = (): void => {
    handleEnd();
  };

  // Add appropriate listeners based on device capabilities
  if (FeatureDetect.touch()) {
    console.log('Using touch event handlers');
    element.addEventListener('touchstart', touchStart, { passive: true });
    element.addEventListener('touchend', touchEnd);
  } else {
    console.log('Using mouse event handlers');
    element.addEventListener('mousedown', mouseDown);
    element.addEventListener('mouseup', mouseUp);
  }

  return {
    onInteractionStart: (handler) => startHandlers.push(handler),
    onInteractionEnd: (handler) => endHandlers.push(handler),
    cleanup: () => {
      if (FeatureDetect.touch()) {
        element.removeEventListener('touchstart', touchStart);
        element.removeEventListener('touchend', touchEnd);
      } else {
        element.removeEventListener('mousedown', mouseDown);
        element.removeEventListener('mouseup', mouseUp);
      }
    },
  };
}

/**
 * Example: Universal input handling.
 */
function inputExample(): void {
  console.log('\n--- Input Enhancement ---');

  const button = document.createElement('button');
  button.textContent = 'Press Me';

  const input = createUniversalInputHandler(button);

  input.onInteractionStart((x, y) => {
    console.log(`Interaction started at (${x}, ${y})`);
  });

  input.onInteractionEnd(() => {
    console.log('Interaction ended');
  });

  // Cleanup when done
  // input.cleanup();
}

// =============================================================================
// Notification Enhancement
// =============================================================================

/**
 * Show notification with fallback to alert.
 */
async function showNotification(
  title: string,
  body: string
): Promise<'notification' | 'alert' | 'none'> {
  // Try native notifications
  if (FeatureDetect.notifications()) {
    // Check/request permission
    let permission = Notification.permission;

    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    if (permission === 'granted') {
      new Notification(title, { body });
      return 'notification';
    }
  }

  // Fallback: Use in-page notification or alert
  // In a real app, you might show a toast notification
  if (typeof alert !== 'undefined') {
    alert(`${title}\n\n${body}`);
    return 'alert';
  }

  console.log(`[Notification] ${title}: ${body}`);
  return 'none';
}

/**
 * Example: Show notification with fallback.
 */
function notificationExample(): void {
  console.log('\n--- Notification Enhancement ---');

  // Check if notifications are available
  if (FeatureDetect.notifications()) {
    console.log('Native notifications available');
    console.log('Permission:', Notification.permission);
  } else {
    console.log('Using fallback notification method');
  }

  // In a real app, you'd call this on user action:
  // void showNotification('Hello!', 'This is a notification');
}

// =============================================================================
// Observer Enhancement
// =============================================================================

/**
 * Create a lazy-loading image observer with fallback.
 */
function createLazyImageLoader(): {
  readonly observe: (img: HTMLImageElement) => void;
  readonly disconnect: () => void;
} {
  // Use IntersectionObserver if available
  if (FeatureDetect.intersectionObserver()) {
    console.log('Using IntersectionObserver for lazy loading');

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const src = img.dataset['src'];
            if (src !== undefined) {
              img.src = src;
              observer.unobserve(img);
            }
          }
        }
      },
      { rootMargin: '200px' }
    );

    return {
      observe: (img) => observer.observe(img),
      disconnect: () => observer.disconnect(),
    };
  }

  // Fallback: Load all images immediately
  console.log('IntersectionObserver not available, loading images immediately');

  return {
    observe: (img) => {
      const src = img.dataset['src'];
      if (src !== undefined) {
        img.src = src;
      }
    },
    disconnect: () => {
      // No-op
    },
  };
}

/**
 * Example: Lazy loading with fallback.
 */
function lazyLoadExample(): void {
  console.log('\n--- Lazy Load Enhancement ---');

  const loader = createLazyImageLoader();

  // In a real app, you'd do:
  // document.querySelectorAll('img[data-src]').forEach(loader.observe);

  console.log('Lazy loader created with observe/unobserve methods');
  console.log('Methods available:', Object.keys(loader).join(', '));
}

// =============================================================================
// Service Worker Enhancement
// =============================================================================

/**
 * Register service worker if available.
 */
async function registerServiceWorker(scriptUrl: string): Promise<boolean> {
  if (!FeatureDetect.serviceWorker()) {
    console.log('Service Worker not supported, app will work without offline support');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.register(scriptUrl);
    console.log('Service Worker registered:', registration.scope);
    return true;
  } catch (error) {
    console.warn('Service Worker registration failed:', error);
    return false;
  }
}

/**
 * Example: Service worker registration.
 */
function serviceWorkerExample(): void {
  console.log('\n--- Service Worker Enhancement ---');

  if (FeatureDetect.serviceWorker()) {
    console.log('Service Worker available - can enable offline support');
    // In a real app:
    // void registerServiceWorker('/sw.js');
  } else {
    console.log('Service Worker not available - online only mode');
  }
}

// =============================================================================
// Run All Examples
// =============================================================================

/**
 * Run all feature detection examples.
 */
export function runFeatureDetectionExamples(): void {
  console.log('=== Feature Detection Examples ===\n');

  basicFeatureChecks();
  getCompleteReport();
  compatibilityCheckExample();
  progressiveStorageExample();
  graphicsExample();
  inputExample();
  notificationExample();
  lazyLoadExample();
  serviceWorkerExample();

  // These require DOM elements:
  // clipboardExample();

  console.log('\n=== Feature Detection Examples Complete ===');
}

// =============================================================================
// Exports
// =============================================================================

export {
  basicFeatureChecks,
  getCompleteReport,
  checkCompatibility,
  chooseStorageStrategy,
  createStorageAdapter,
  clipboardExample,
  copyToClipboard,
  createGraphicsContext,
  createUniversalInputHandler,
  showNotification,
  createLazyImageLoader,
  registerServiceWorker,
  type FeatureRequirements,
  type CompatibilityResult,
  type StorageStrategy,
};

// Uncomment to run directly
// runFeatureDetectionExamples();
