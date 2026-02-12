# Security Guide

This library follows security-by-design principles. See
[SECURITY.md](../SECURITY.md) for the full vulnerability disclosure policy.

## Principles

- **Cryptographic randomness** via `crypto.getRandomValues()` (never
  `Math.random()`)
- **Input validation** on all external data (storage keys, URLs, filenames)
- **No unsafe patterns** (`eval()`, `Function()`, `innerHTML`,
  `document.write()`)
- **Secure defaults** for all APIs

## Encrypted Storage (PBKDF2)

Key derivation uses **600,000 PBKDF2-SHA256 iterations** by default (OWASP 2023
recommendation). Custom values must meet the minimum of 10,000:

```typescript
import { EncryptedStorage } from '@zappzarapp/browser-utils/encryption';

// Default: 600,000 iterations (recommended)
const storage = await EncryptedStorage.create({
  password: userPassword,
  prefix: 'secure',
});

// Custom (must be >= 100,000)
const custom = await EncryptedStorage.create({
  password: userPassword,
  prefix: 'secure',
  iterations: 1_000_000,
});
```

Passwords must be at least **12 characters**. Client-side encryption protects
data at rest in localStorage but cannot protect against XSS.

## HTML Sanitization

Use `HtmlSanitizer.sanitize()` for user content. The library uses DOMParser for
safe HTML processing (no regex fallbacks):

```typescript
import { HtmlSanitizer } from '@zappzarapp/browser-utils/sanitize';

// Removes dangerous elements and attributes
const safe = HtmlSanitizer.sanitize(userHtml);

// Strip all HTML tags
const text = HtmlSanitizer.stripTags(userHtml);
```

## DOM Manipulation

`DomHelper.create()` filters URL-bearing attributes (`href`, `src`, `action`,
`formaction`) to block dangerous protocols (`javascript:`, `data:`,
`vbscript:`). Non-URL attributes like `class`, `id`, and `role` are passed
through without protocol filtering.

## Cookie Security

Cookies default to `Secure`, `SameSite=Lax`, and `HttpOnly` where applicable.
Cookie names and paths are validated against injection attacks.
