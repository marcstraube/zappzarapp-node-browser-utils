# Feature Detection

Check browser capabilities and API availability.

## Quick Start

```typescript
import { FeatureDetect } from '@zappzarapp/browser-utils/features';

// Check individual features
if (FeatureDetect.localStorage()) {
  // Use localStorage safely
}

// Get all features at once
const features = FeatureDetect.all();
console.log(features);
// { localStorage: true, sessionStorage: true, cookies: true, ... }
```

## API Reference

| Method                   | Returns         | Description                                 |
| ------------------------ | --------------- | ------------------------------------------- |
| `localStorage()`         | `boolean`       | Check if localStorage is available          |
| `sessionStorage()`       | `boolean`       | Check if sessionStorage is available        |
| `cookies()`              | `boolean`       | Check if cookies are enabled                |
| `indexedDB()`            | `boolean`       | Check if IndexedDB is available             |
| `clipboard()`            | `boolean`       | Check if Clipboard API (write) is available |
| `clipboardRead()`        | `boolean`       | Check if Clipboard API (read) is available  |
| `touch()`                | `boolean`       | Check if device supports touch events       |
| `geolocation()`          | `boolean`       | Check if Geolocation API is available       |
| `notifications()`        | `boolean`       | Check if Notifications API is available     |
| `serviceWorker()`        | `boolean`       | Check if Service Worker is available        |
| `webSocket()`            | `boolean`       | Check if WebSocket is available             |
| `fetch()`                | `boolean`       | Check if Fetch API is available             |
| `promise()`              | `boolean`       | Check if Promise is available               |
| `webGL()`                | `boolean`       | Check if WebGL is available                 |
| `webGL2()`               | `boolean`       | Check if WebGL 2 is available               |
| `customElements()`       | `boolean`       | Check if Custom Elements are available      |
| `shadowDOM()`            | `boolean`       | Check if Shadow DOM is available            |
| `intersectionObserver()` | `boolean`       | Check if IntersectionObserver is available  |
| `resizeObserver()`       | `boolean`       | Check if ResizeObserver is available        |
| `mutationObserver()`     | `boolean`       | Check if MutationObserver is available      |
| `all()`                  | `FeatureReport` | Get complete feature report                 |

## Types

### FeatureReport

```typescript
interface FeatureReport {
  readonly localStorage: boolean;
  readonly sessionStorage: boolean;
  readonly cookies: boolean;
  readonly clipboard: boolean;
  readonly clipboardRead: boolean;
  readonly touch: boolean;
  readonly geolocation: boolean;
  readonly notifications: boolean;
  readonly serviceWorker: boolean;
  readonly webGL: boolean;
  readonly webGL2: boolean;
  readonly indexedDB: boolean;
  readonly webSocket: boolean;
  readonly fetch: boolean;
  readonly promise: boolean;
  readonly customElements: boolean;
  readonly shadowDOM: boolean;
  readonly intersectionObserver: boolean;
  readonly resizeObserver: boolean;
  readonly mutationObserver: boolean;
}
```

## Usage Examples

### Progressive Enhancement

```typescript
// Enable features based on support
if (FeatureDetect.serviceWorker()) {
  navigator.serviceWorker.register('/sw.js');
}

if (FeatureDetect.notifications()) {
  enableNotificationButton();
}
```

### Feature-Based Polyfill Loading

```typescript
const features = FeatureDetect.all();

const polyfills: Promise<void>[] = [];

if (!features.intersectionObserver) {
  polyfills.push(import('intersection-observer'));
}

if (!features.fetch) {
  polyfills.push(import('whatwg-fetch'));
}

await Promise.all(polyfills);
```

### Capability Reporting

```typescript
// Log browser capabilities for debugging
function reportCapabilities(): void {
  const features = FeatureDetect.all();

  console.table(features);

  const unsupported = Object.entries(features)
    .filter(([, supported]) => !supported)
    .map(([name]) => name);

  if (unsupported.length > 0) {
    console.warn('Unsupported features:', unsupported);
  }
}
```

## Security Considerations

1. **Storage Detection** - Storage checks perform actual write/read operations
   with test keys that are immediately removed
2. **Cookie Detection** - Cookie test is automatically cleaned up after
   detection
3. **No Sensitive Data** - Feature detection does not access or expose any user
   data
