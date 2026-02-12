# Examples

Practical usage examples for `@zappzarapp/browser-utils`.

## Running Examples

These examples are TypeScript files that can be:

1. **Compiled and bundled** with your build tool (Vite, webpack, etc.)
2. **Used as reference** for implementing features in your application

## Example Index

| Example                                          | Description                                    |
| ------------------------------------------------ | ---------------------------------------------- |
| [accessibility.ts](accessibility.ts)             | ARIA management, announcements, and skip links |
| [broadcast-sync.ts](broadcast-sync.ts)           | Cross-tab state synchronization                |
| [cache-api.ts](cache-api.ts)                     | HTTP caching with stale-while-revalidate       |
| [clipboard-manager.ts](clipboard-manager.ts)     | Copy/paste with fallback support               |
| [cookie-consent.ts](cookie-consent.ts)           | GDPR-compliant cookie consent handling         |
| [csp-detection.ts](csp-detection.ts)             | CSP detection and nonce handling               |
| [device-info.ts](device-info.ts)                 | Device/viewport information                    |
| [download-files.ts](download-files.ts)           | Programmatic file downloads                    |
| [encrypted-storage.ts](encrypted-storage.ts)     | Encrypted localStorage for sensitive data      |
| [feature-detection.ts](feature-detection.ts)     | Browser feature detection                      |
| [form-validation.ts](form-validation.ts)         | Form validation with real-time UI feedback     |
| [fullscreen-player.ts](fullscreen-player.ts)     | Fullscreen video/presentation                  |
| [geolocation-tracker.ts](geolocation-tracker.ts) | Location tracking with error handling          |
| [html-escaping.ts](html-escaping.ts)             | XSS prevention with HTML escaping              |
| [idle-tasks.ts](idle-tasks.ts)                   | Background tasks with requestIdleCallback      |
| [indexeddb-cache.ts](indexeddb-cache.ts)         | IndexedDB for offline data caching             |
| [infinite-scroll.ts](infinite-scroll.ts)         | Infinite scroll with IntersectionObserver      |
| [keyboard-shortcuts.ts](keyboard-shortcuts.ts)   | Keyboard shortcut registration                 |
| [modal-focus-trap.ts](modal-focus-trap.ts)       | Accessible modal with focus trap               |
| [notification-system.ts](notification-system.ts) | Browser notifications                          |
| [offline-sync.ts](offline-sync.ts)               | Offline-first data synchronization queue       |
| [performance-metrics.ts](performance-metrics.ts) | Core Web Vitals and performance monitoring     |
| [request-interceptor.ts](request-interceptor.ts) | Fetch interceptor with auth and retry          |
| [responsive-layout.ts](responsive-layout.ts)     | MediaQuery-based responsive design             |
| [retry-queue.ts](retry-queue.ts)                 | Network retry with offline support             |
| [sanitize-content.ts](sanitize-content.ts)       | HTML sanitization                              |
| [scroll-utilities.ts](scroll-utilities.ts)       | Smooth scrolling utilities                     |
| [session-storage.ts](session-storage.ts)         | Session storage for temporary data             |
| [storage-basic.ts](storage-basic.ts)             | Type-safe localStorage with TTL and LRU        |
| [url-builder.ts](url-builder.ts)                 | URL building and query params                  |
| [visibility-handler.ts](visibility-handler.ts)   | Page visibility for video/audio control        |
| [websocket-chat.ts](websocket-chat.ts)           | WebSocket chat with auto-reconnection          |

## Quick Start

```typescript
// Import what you need
import { debounce } from '@zappzarapp/browser-utils/core';
import { StorageManager } from '@zappzarapp/browser-utils/storage';
import { CookieManager } from '@zappzarapp/browser-utils/cookie';

// Or import from specific modules for tree-shaking
import { StorageManager } from '@zappzarapp/browser-utils/storage';
import { debounce } from '@zappzarapp/browser-utils/core';
// Also available via: '@zappzarapp/browser-utils/events'
```

## TypeScript Configuration

Ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"]
  }
}
```
