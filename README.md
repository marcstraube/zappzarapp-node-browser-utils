# ⚡ @zappzarapp/browser-utils

[![npm version](https://img.shields.io/npm/v/@zappzarapp/browser-utils.svg)](https://www.npmjs.com/package/@zappzarapp/browser-utils)
[![Node.js Version](https://img.shields.io/node/v/@zappzarapp/browser-utils.svg)](https://www.npmjs.com/package/@zappzarapp/browser-utils)
[![License](https://img.shields.io/npm/l/@zappzarapp/browser-utils.svg)](https://www.npmjs.com/package/@zappzarapp/browser-utils)
[![CI](https://github.com/marcstraube/zappzarapp-browser-utils/actions/workflows/ci.yml/badge.svg)](https://github.com/marcstraube/zappzarapp-browser-utils/actions/workflows/ci.yml)

Zero-dependency browser utilities with security-first design — type-safe,
tree-shakeable, and fully tested.

## Highlights

- **All-in-one** — 35 browser modules in a single, tree-shakeable package
- **Type-safe** — strict TypeScript with generics throughout
- **Zero dependencies** — no runtime dependencies
- **Secure by default** — cryptographic randomness, input validation, XSS
  prevention
- **Dual error handling** — throwing and Result-based APIs
- **Quality-backed** — 3950+ tests, strict ESLint, full coverage

## Modules

### Storage & Data

| Module     | Key Classes             | Description                       |
| ---------- | ----------------------- | --------------------------------- |
| storage    | `StorageManager`        | localStorage with LRU eviction    |
| session    | `SessionStorageManager` | sessionStorage wrapper            |
| cookie     | `CookieManager`         | Secure cookie management          |
| indexeddb  | `IndexedDBManager`      | IndexedDB async wrapper           |
| cache      | `CacheManager`          | HTTP-style stale-while-revalidate |
| encryption | `EncryptedStorage`      | AES-GCM with PBKDF2               |

### DOM & UI

| Module     | Key Classes                       | Description                  |
| ---------- | --------------------------------- | ---------------------------- |
| html       | `DomHelper`, `HtmlEscaper`        | DOM helpers, HTML escaping   |
| focus      | `FocusTrap`                       | Focus trapping for modals    |
| scroll     | `ScrollManager`                   | Scroll utilities and locking |
| fullscreen | `FullscreenManager`               | Fullscreen API wrapper       |
| form       | `FormValidator`, `FormSerializer` | Validation and serialization |

### Events & Input

| Module   | Key Classes                              | Description                 |
| -------- | ---------------------------------------- | --------------------------- |
| events   | `EventDelegator`, `debounce`, `throttle` | Event delegation and timing |
| keyboard | `ShortcutManager`                        | Keyboard shortcuts          |
| idle     | `IdleCallback`                           | requestIdleCallback wrapper |

### Observers

| Module  | Key Classes                                            | Description                    |
| ------- | ------------------------------------------------------ | ------------------------------ |
| observe | `IntersectionObserverWrapper`, `ResizeObserverWrapper` | Intersection, Resize, Mutation |

### Network & Communication

| Module    | Key Classes                   | Description                   |
| --------- | ----------------------------- | ----------------------------- |
| network   | `RetryQueue`, `NetworkStatus` | Retry queue with backoff      |
| offline   | `OfflineQueue`                | IndexedDB-backed offline sync |
| websocket | `WebSocketManager`            | WebSocket with auto-reconnect |
| request   | `RequestInterceptor`          | Fetch middleware and auth     |
| url       | `UrlBuilder`                  | URL building, query params    |
| broadcast | `BroadcastManager`            | Cross-tab messaging           |

### Device & Environment

| Module      | Key Classes          | Description                |
| ----------- | -------------------- | -------------------------- |
| device      | `DeviceInfo`         | Device detection           |
| features    | `FeatureDetect`      | Browser feature detection  |
| media       | `MediaQuery`         | Media queries, breakpoints |
| visibility  | `VisibilityManager`  | Page Visibility API        |
| geolocation | `GeolocationManager` | Geolocation API wrapper    |
| performance | `PerformanceMonitor` | Core Web Vitals monitoring |

### Security

| Module    | Key Classes        | Description               |
| --------- | ------------------ | ------------------------- |
| csp       | `CspDetector`      | CSP detection and helpers |
| sanitize  | `HtmlSanitizer`    | HTML sanitization         |
| clipboard | `ClipboardManager` | Secure clipboard access   |

### Utility

| Module       | Key Classes                              | Description                 |
| ------------ | ---------------------------------------- | --------------------------- |
| logging      | `Logger`                                 | Console logging with levels |
| notification | `NotificationManager`                    | Browser notifications       |
| download     | `FileDownload`                           | File download triggers      |
| a11y         | `AriaUtils`, `LiveAnnouncer`, `SkipLink` | Accessibility utilities     |
| core         | `Result`, `Validator`, `debounce`        | Types, errors, validation   |

## Requirements

- **Node.js** >= 20
- **ESM-only** — cannot be `require()`'d from CommonJS

## Installation

```bash
npm install @zappzarapp/browser-utils
# or
pnpm add @zappzarapp/browser-utils
```

## Quick Start

### Storage Manager

```typescript
import { StorageManager } from '@zappzarapp/browser-utils/storage';

interface UserData {
  id: string;
  name: string;
}

const storage = StorageManager.create<UserData>({
  prefix: 'myApp',
  maxEntries: 100,
});

storage.set('user-1', { id: '1', name: 'Alice' });
const user = storage.get('user-1');
```

### Keyboard Shortcuts

```typescript
import { ShortcutManager } from '@zappzarapp/browser-utils/keyboard';

const shortcuts = ShortcutManager.create();

shortcuts.register({
  key: 's',
  ctrlKey: true,
  handler: () => saveDocument(),
});

shortcuts.destroy();
```

### Network Retry Queue

```typescript
import { RetryQueue } from '@zappzarapp/browser-utils/network';

const queue = RetryQueue.create({
  maxRetries: 3,
  backoffStrategy: 'exponential',
  networkAware: true,
});

const result = await queue.add({
  operation: () => fetch('/api/data').then((r) => r.json()),
});
```

### Lazy Loading with Observers

```typescript
import { IntersectionObserverWrapper } from '@zappzarapp/browser-utils/observe';

const cleanup = IntersectionObserverWrapper.lazyLoad(
  document.querySelectorAll('img[data-src]'),
  (img) => {
    img.src = img.dataset.src!;
  }
);
```

## Documentation

| Module                                      | Module                                        |
| ------------------------------------------- | --------------------------------------------- |
| [a11y](documentation/a11y.md)               | [keyboard](documentation/keyboard.md)         |
| [broadcast](documentation/broadcast.md)     | [logging](documentation/logging.md)           |
| [cache](documentation/cache.md)             | [media](documentation/media.md)               |
| [clipboard](documentation/clipboard.md)     | [network](documentation/network.md)           |
| [cookie](documentation/cookie.md)           | [notification](documentation/notification.md) |
| [core](documentation/core.md)               | [observe](documentation/observe.md)           |
| [csp](documentation/csp.md)                 | [offline](documentation/offline.md)           |
| [device](documentation/device.md)           | [performance](documentation/performance.md)   |
| [download](documentation/download.md)       | [request](documentation/request.md)           |
| [encryption](documentation/encryption.md)   | [sanitize](documentation/sanitize.md)         |
| [events](documentation/events.md)           | [scroll](documentation/scroll.md)             |
| [features](documentation/features.md)       | [session](documentation/session.md)           |
| [focus](documentation/focus.md)             | [storage](documentation/storage.md)           |
| [form](documentation/form.md)               | [url](documentation/url.md)                   |
| [fullscreen](documentation/fullscreen.md)   | [visibility](documentation/visibility.md)     |
| [geolocation](documentation/geolocation.md) | [websocket](documentation/websocket.md)       |
| [idle](documentation/idle.md)               | [glossary](documentation/glossary.md)         |

**Guides:** [Browser Support](documentation/browser-support.md) ·
[Error Handling](documentation/error-handling.md) ·
[Security Guide](documentation/security-guide.md)

Generate API docs locally with `pnpm run docs`.

## Versioning

This project follows [Semantic Versioning](https://semver.org/).

## Security

See [SECURITY.md](./SECURITY.md) for vulnerability disclosure policy and
supported versions.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and guidelines.

## License

MIT
