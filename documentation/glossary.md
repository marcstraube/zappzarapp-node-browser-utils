# Browser Utils Glossary

This glossary explains browser and web development terms used throughout the
library documentation.

## A

### AES-GCM (Advanced Encryption Standard - Galois/Counter Mode)

A symmetric encryption algorithm that provides both confidentiality and
authenticity. AES-GCM is the recommended mode for authenticated encryption in
the Web Crypto API, using a 256-bit key and 96-bit initialization vector (IV).

**Security note:** Always use a unique IV for each encryption operation. The IV
does not need to be secret but must never be reused with the same key.

**Used in:** [encryption module](encryption.md)

## B

### Background Sync

A web platform feature that allows web applications to defer actions until the
user has stable network connectivity. While the full Background Sync API
requires a Service Worker, offline-first patterns can be implemented using
IndexedDB for persistence and online/offline event listeners for
synchronization.

**Used in:** [offline module](offline.md)

### BroadcastChannel API

A browser API that enables simple communication between browsing contexts
(windows, tabs, iframes) of the same origin. Messages are broadcast to all
contexts subscribed to the same channel name.

**Security note:** All contexts on the same origin can subscribe to any channel
name. Do not transmit sensitive data without additional encryption.

**Used in:** [broadcast module](broadcast.md)

## C

### Clipboard API

A modern browser API for reading and writing text and other data to the system
clipboard. Requires user permission and typically needs to be triggered by a
user gesture. Replaces the deprecated `document.execCommand('copy')`.

**Used in:** [clipboard module](clipboard.md)

### CSP (Content Security Policy)

An HTTP header that controls which resources (scripts, styles, images, etc.) a
browser is allowed to load for a page. This library is designed to work with
strict CSP by avoiding inline scripts, `eval()`, and dynamic code execution.

**Related:** XSS prevention

### CSRF (Cross-Site Request Forgery)

An attack that tricks a user's browser into making unwanted requests to a site
where they're authenticated. The `SameSite` cookie attribute helps prevent CSRF
attacks.

**Used in:** [cookie module](cookie.md)

## D

### Debounce

A technique that delays the execution of a function until a specified time has
passed since the last invocation. Useful for handling rapid events like typing
or window resizing.

**Example use case:** Search-as-you-type, only triggering after the user stops
typing.

**Used in:** [events module](events.md)

### DOM (Document Object Model)

A programming interface for HTML documents. The DOM represents the page as a
tree of nodes that can be manipulated with JavaScript. This library provides
safe DOM helpers to prevent XSS vulnerabilities.

**Used in:** [html module](html.md)

## F

### Fetch API

A modern browser API for making HTTP requests, replacing the older
XMLHttpRequest. Fetch provides a cleaner, promise-based interface for network
requests with support for streaming, AbortController for cancellation, and
better error handling.

**Used in:** [request module](request.md)

### Focus Trap

A technique that constrains keyboard focus within a specific container element,
typically used for modals and dialogs to ensure accessibility. Users cannot Tab
outside the trapped region.

**Used in:** [focus module](focus.md)

### Fullscreen API

A browser API that allows elements to be displayed in full-screen mode,
typically used for video players, games, and presentations.

**Used in:** [fullscreen module](fullscreen.md)

## G

### Geolocation API

A browser API that allows web applications to access the device's geographic
location. Requires explicit user permission and provides coordinates (latitude,
longitude), accuracy, altitude, heading, and speed information.

**Security note:** Location data is highly sensitive personal information.
Always request permission only when needed, explain why location is required,
and handle permission denial gracefully.

**Used in:** [geolocation module](geolocation.md)

## H

### HttpOnly

A cookie attribute that prevents JavaScript from accessing the cookie. Cookies
marked `HttpOnly` can only be read by the server, protecting against XSS-based
cookie theft.

**Note:** This library cannot read or write `HttpOnly` cookies (by design).

## I

### IndexedDB

A low-level browser API for storing large amounts of structured data, including
files and blobs. Unlike localStorage, IndexedDB supports transactions, indexes,
and can store complex objects without serialization limits.

**Security note:** IndexedDB data is stored unencrypted on disk. Do not store
sensitive data without additional encryption. Data is scoped to origin but
accessible to any script running on that origin.

**Used in:** [indexeddb module](indexeddb.md), [offline module](offline.md)

### INP (Interaction to Next Paint)

A Core Web Vital metric that measures the worst interaction latency during a
page's lifecycle. INP captures the time from user input (click, tap, keypress)
to the next visual update (paint). A good INP score is under 200ms.

**Used in:** [performance module](performance.md)

### Interceptor (Request Interceptor)

A middleware pattern that intercepts HTTP requests and responses to add
cross-cutting concerns such as authentication headers, logging, error handling,
or request/response transformation. The interceptor sits between the application
code and the network layer.

**Used in:** [request module](request.md)

### IntersectionObserver

A browser API that asynchronously observes changes in the intersection of a
target element with an ancestor element or the viewport. Used for lazy loading,
infinite scroll, and visibility tracking.

**Used in:** [observe module](observe.md)

## L

### localStorage

A Web Storage API that provides persistent key-value storage in the browser.
Data persists even after the browser is closed and has no expiration. Limited to
~5MB per origin. Not encrypted.

**Security note:** Do not store sensitive data (tokens, passwords, PII) in
localStorage as it is accessible to any JavaScript running on the page.

**Used in:** [storage module](storage.md)

### LRU (Least Recently Used)

A cache eviction strategy that removes the least recently accessed items when
the cache reaches its capacity. This library uses LRU eviction for storage
management.

**Used in:** [storage module](storage.md)

## M

### Media Query

A CSS feature that applies styles based on device characteristics (screen width,
orientation, color scheme, etc.). The MediaQuery API allows JavaScript to
respond to media query changes.

**Used in:** [media module](media.md)

### MutationObserver

A browser API that watches for changes to the DOM tree. Can observe child
additions/removals, attribute changes, and text content modifications.

**Used in:** [observe module](observe.md)

## N

### Navigator API

A browser API that provides information about the user's browser and device,
including network status, user agent, and hardware capabilities.

**Used in:** [device module](device.md), [network module](network.md)

### Notification API

A browser API for displaying system-level notifications to users. Requires
explicit user permission and may be blocked by browser policies.

**Used in:** [notification module](notification.md)

## O

### Offline Storage

A pattern for building applications that work without network connectivity by
storing data locally (typically in IndexedDB) and synchronizing with the server
when connectivity is restored. Often combined with service workers for complete
offline support.

**Used in:** [offline module](offline.md)

## P

### Page Visibility API

A browser API that allows detection of when a page becomes visible or hidden to
the user (e.g., when switching tabs or minimizing the browser). Useful for
pausing expensive operations, stopping media playback, or reducing resource
usage when the page is not visible.

**Used in:** [visibility module](visibility.md)

### PBKDF2 (Password-Based Key Derivation Function 2)

A key derivation function that applies a pseudorandom function (typically
HMAC-SHA256) to the input password along with a salt value and repeats the
process many times (iterations) to produce a derived key. The high iteration
count makes brute-force attacks computationally expensive.

**Security note:** This library defaults to 600,000 iterations (OWASP 2023
recommendation for PBKDF2-SHA256). Custom values must be at least 10,000.

**Used in:** [encryption module](encryption.md)

### Performance API

A browser API that provides access to performance-related information including
navigation timing, resource timing, and user timing. The PerformanceObserver
interface allows monitoring Core Web Vitals metrics like FCP, LCP, FID, CLS, and
INP.

**Used in:** [performance module](performance.md)

## R

### requestIdleCallback

A browser API that schedules work to run when the browser is idle, allowing
non-critical tasks to execute without blocking user interactions. Falls back to
`setTimeout` in unsupported browsers.

**Used in:** [idle module](idle.md)

### ResizeObserver

A browser API that reports changes to an element's dimensions. More efficient
than listening to window resize events for observing element-specific size
changes.

**Used in:** [observe module](observe.md)

## S

### SameSite

A cookie attribute that controls whether cookies are sent with cross-site
requests. Values:

- `Strict`: Cookie only sent for same-site requests
- `Lax`: Cookie sent for same-site requests and top-level navigations (default)
- `None`: Cookie sent for all requests (requires `Secure`)

**Used in:** [cookie module](cookie.md)

### Secure Cookie

A cookie with the `Secure` attribute, which ensures it is only transmitted over
HTTPS connections. This library defaults to setting cookies as `Secure`.

**Used in:** [cookie module](cookie.md)

### sessionStorage

A Web Storage API that provides temporary key-value storage in the browser. Data
persists only for the duration of the page session (until the tab/window is
closed). Limited to ~5MB per origin.

**Used in:** [session module](session.md)

### Storage Event (Cross-Tab Sync)

A browser event that fires when `localStorage` is modified by another browsing
context (tab or window) of the same origin. The event provides the changed key,
old value, and new value. Changes made in the current tab do not trigger the
event.

**Used in:** [storage module](storage.md)

### Stale-While-Revalidate

A caching strategy where stale (expired) content is served immediately from
cache while a background request fetches fresh content for future use. This
pattern provides fast response times while ensuring data eventually becomes
fresh.

**Used in:** [cache module](cache.md)

## T

### Throttle

A technique that limits how often a function can be called. Unlike debounce,
throttle guarantees the function runs at a regular interval during continuous
invocations.

**Example use case:** Scroll event handling, limiting to once every 100ms.

**Used in:** [events module](events.md)

## V

### Viewport

The visible area of a web page in the browser window. The viewport size changes
when the user resizes the browser or rotates their device.

**Used in:** [device module](device.md), [scroll module](scroll.md)

## W

### Web Crypto API

A browser API that provides cryptographic primitives for secure random number
generation, hashing, encryption, decryption, signing, and key derivation.
Operations are performed in a secure context and keys can be marked as
non-extractable for additional security.

**Security note:** Always use the Web Crypto API instead of JavaScript-based
cryptographic implementations. Use `crypto.getRandomValues()` for cryptographic
randomness, never `Math.random()`.

**Used in:** [encryption module](encryption.md)

### Web Storage API

A browser API providing `localStorage` and `sessionStorage` for client-side
key-value storage. Stores strings only; objects must be serialized with
`JSON.stringify()`.

**Used in:** [storage module](storage.md), [session module](session.md)

## X

### XSS (Cross-Site Scripting)

An attack that injects malicious scripts into web pages viewed by other users.
Types include:

- **Stored XSS:** Script is permanently stored on the server
- **Reflected XSS:** Script is reflected from a URL parameter
- **DOM-based XSS:** Script manipulates the page's DOM

This library prevents XSS through HTML escaping and avoiding dangerous patterns
like `innerHTML`.

**Used in:** [html module](html.md)
