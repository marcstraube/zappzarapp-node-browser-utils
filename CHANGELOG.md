# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.2](https://github.com/marcstraube/zappzarapp-browser-utils/compare/v1.0.1...v1.0.2) (2026-02-13)


### Bug Fixes

* **build:** resolve ERR_UNSUPPORTED_DIR_IMPORT in ESM output ([#12](https://github.com/marcstraube/zappzarapp-browser-utils/issues/12)) ([fc614eb](https://github.com/marcstraube/zappzarapp-browser-utils/commit/fc614eb6a419f1073b543bd74920bd3e4247a099))
* **ci:** align CI job names with branch protection required checks ([9a6d3f0](https://github.com/marcstraube/zappzarapp-browser-utils/commit/9a6d3f0b7228859fecce36b238885d2be949045a))
* **hooks:** prevent post-merge hook failure on no dependency changes ([#16](https://github.com/marcstraube/zappzarapp-browser-utils/issues/16)) ([f022780](https://github.com/marcstraube/zappzarapp-browser-utils/commit/f02278044086f86b8ec2d4b72d0b69cf1b238c62))

## [1.0.1] - 2026-02-13

### Security

- **validation**: Fix ReDoS vulnerability in MIME type regex (`\S+` → `[^\s;]+`)
  ([CWE-1333](https://cwe.mitre.org/data/definitions/1333.html))
- **validation**: Fix incomplete string sanitization — add global flag to
  forbidden character replacement
  ([CWE-116](https://cwe.mitre.org/data/definitions/116.html))
- **request**: Fix incomplete URL scheme check — case-insensitive protocol
  comparison and add `vbscript:` to blocklist
  ([CWE-20](https://cwe.mitre.org/data/definitions/20.html))

## [1.0.0] - 2026-02-12

Initial stable release with 35 modules providing comprehensive browser
utilities. ESM-only, tree-shakeable via subpath exports, zero dependencies.

### Security

- **url**: `UrlBuilder.withProtocol()` validates protocol against allowlist,
  rejecting dangerous protocols like `javascript:`
- **websocket**: `WebSocketManager` heartbeat wraps `heartbeatMessage()` calls
  in try-catch and routes errors to registered error handlers
- **clipboard**: `ClipboardManager.writeTextFallback()` uses try-finally to
  ensure textarea is removed from DOM even if `focus()`/`select()` throws
- **network**: `RetryQueue` constructor validates `baseDelay > 0` and
  `maxDelay > 0`, throwing `NetworkError` with code `NETWORK_INVALID_OPTIONS`
- **device**: `isWindows()`, `isMacOS()`, `isLinux()` use
  `navigator.userAgentData.platform` with `navigator.platform` fallback
- **device**: `orientationAngle()` no longer falls back to deprecated
  `window.orientation`; returns `0` when Screen Orientation API is unavailable

### Added

#### Core

- **core**: Foundation types, Result monad for error handling, Validator for
  input validation, and error classes (BrowserUtilsError, ValidationError,
  StorageError, ClipboardError, NetworkError, FullscreenError,
  NotificationError, CookieError, UrlError, GeolocationError)
- **core/validation**: Centralized `CacheValidator` for cache-specific key rules
  (allows `:` and `/`, max 256 characters)

#### Storage

- **storage**: Type-safe localStorage management with LRU eviction, memory
  fallback, and namespacing via `StorageManager` and `StorageConfig`
- **session**: SessionStorage management with `SessionStorageManager`, mirroring
  storage module API
- **cookie**: Cookie management with secure defaults (Secure, SameSite) via
  `CookieManager` and `CookieOptions`
- **indexeddb**: IndexedDB wrapper for large data storage with
  `IndexedDBManager`, transaction support, and store configuration

#### DOM Utilities

- **html**: HTML escaping via `HtmlEscaper` and DOM helpers via `DomHelper`
- **sanitize**: HTML sanitization utilities via `HtmlSanitizer` with
  DOMPurify-style configuration
- **scroll**: Scroll utilities via `ScrollUtils` for smooth scrolling and
  position tracking
- **focus**: Focus management via `FocusTrap` and `FocusUtils` for modal dialogs
  and accessible navigation
- **fullscreen**: Fullscreen API wrapper via `Fullscreen` class with
  cross-browser support
- **form**: Form serialization via `FormSerializer`, validation via
  `FormValidator`, and utilities via `FormUtils`

#### Events

- **events**: Event utilities including `debounce`, `throttle`, and `EventUtils`
  for delegation
- **keyboard**: Keyboard shortcut management via `KeyboardShortcut`,
  `ShortcutManager`, and `ShortcutGroup`
- **idle**: requestIdleCallback utilities via `IdleCallback` with task queue
  support

#### Observers

- **observe**: Observer wrappers including `IntersectionObserverWrapper`,
  `ResizeObserverWrapper`, and `MutationObserverWrapper`

#### Network and Communication

- **network**: Network status detection via `NetworkStatus` and retry queue via
  `RetryQueue` with exponential backoff
- **websocket**: WebSocket management via `WebSocketManager` with auto-reconnect
  and connection state tracking
- **broadcast**: Cross-tab communication via `BroadcastManager` using
  BroadcastChannel API
- **request**: HTTP request interceptor via `RequestInterceptor` with middleware
  support, authentication, and timing
- **offline**: Offline-first queue via `OfflineQueue` for background sync with
  conflict resolution

#### Browser APIs

- **clipboard**: Clipboard API wrapper via `ClipboardManager` with fallback
  support
- **notification**: Browser notification API via `BrowserNotification` with
  permission handling
- **geolocation**: Geolocation API wrapper via `GeolocationManager` with options
  for accuracy and timeout
- **visibility**: Page Visibility API via `VisibilityManager` for detecting tab
  visibility changes

#### Device and Environment

- **device**: Device information detection via `DeviceInfo` including
  orientation, screen size, and touch support
- **features**: Browser feature detection via `FeatureDetect` with comprehensive
  capability reporting
- **media**: Media query utilities via `MediaQuery` for responsive design with
  breakpoint management

#### URL and Navigation

- **url**: URL building via `UrlBuilder`, query parameter handling via
  `QueryParams`, and history management via `HistoryManager`

#### Logging and Monitoring

- **logging**: Console logging with configurable levels via `Logger` and
  `LoggerConfig`
- **performance**: Performance monitoring via `PerformanceMonitor` for tracking
  Core Web Vitals and custom metrics

#### Security

- **csp**: Content Security Policy utilities via `CspUtils` for violation
  monitoring and nonce generation
- **encryption**: Client-side encryption via `EncryptedStorage` with AES-GCM and
  PBKDF2 key derivation

#### Caching

- **cache**: Cache API wrapper via `CacheManager` for request/response caching
  with expiration and size limits

#### Accessibility

- **a11y**: Accessibility utilities with `AriaUtils` for safe ARIA attribute
  management, `LiveAnnouncer` for screen reader live region announcements,
  `ReducedMotion` for `prefers-reduced-motion` detection and monitoring, and
  `SkipLink` for accessible skip navigation links

#### Download

- **download**: File download utilities via `Downloader` and `DownloadOptions`
  for generating and triggering file downloads

[1.0.1]:
  https://github.com/marcstraube/zappzarapp-browser-utils/compare/v1.0.0...v1.0.1
[1.0.0]:
  https://github.com/marcstraube/zappzarapp-browser-utils/releases/tag/v1.0.0
