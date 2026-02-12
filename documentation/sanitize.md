# Sanitize Utilities

HTML sanitization with optional DOMPurify integration for XSS prevention.

## Quick Start

```typescript
import { HtmlSanitizer } from '@zappzarapp/browser-utils/sanitize';

// Basic sanitization (built-in)
const safe = HtmlSanitizer.sanitize(
  '<script>alert("xss")</script><p>Hello</p>'
);
// Result: '<p>Hello</p>'

// Check if input is safe
if (HtmlSanitizer.isSafe('<p>Safe text</p>')) {
  element.innerHTML = userInput;
}
```

## HtmlSanitizer

### Methods

| Method        | Returns   | Description                                   |
| ------------- | --------- | --------------------------------------------- |
| `sanitize()`  | `string`  | Remove dangerous HTML elements and attributes |
| `isSafe()`    | `boolean` | Check if HTML is safe (no dangerous content)  |
| `stripTags()` | `string`  | Remove all HTML tags, keeping only text       |

### sanitize()

```typescript
// Basic usage - removes scripts, event handlers, etc.
const safe = HtmlSanitizer.sanitize(untrustedHtml);

// With DOMPurify (if available)
const safeWithOptions = HtmlSanitizer.sanitize(untrustedHtml, {
  allowedTags: ['p', 'b', 'i', 'a'],
  allowedAttributes: ['href', 'class'],
});

// Returns input unchanged if DOMPurify not available and options provided
const result = HtmlSanitizer.sanitize(html, options);
```

### Configuration Options

| Option              | Type       | Description                          |
| ------------------- | ---------- | ------------------------------------ |
| `allowedTags`       | `string[]` | Tags to allow (others removed)       |
| `allowedAttributes` | `string[]` | Attributes to allow (others removed) |
| `allowDataUri`      | `boolean`  | Allow data: URIs (default: false)    |

### What Gets Removed

The built-in sanitizer removes:

- `<script>` tags
- `<style>` tags
- `<iframe>` tags
- `<object>` tags
- `<embed>` tags
- `<link>` tags
- `<meta>` tags
- Event handler attributes (`onclick`, `onerror`, etc.)
- `javascript:` URLs
- `data:` URLs (unless explicitly allowed)

## Usage Examples

### Sanitize User Comments

```typescript
function displayComment(comment: string): void {
  const container = document.getElementById('comments');
  const sanitized = HtmlSanitizer.sanitize(comment);
  container.insertAdjacentHTML('beforeend', sanitized);
}
```

### Strip All HTML

```typescript
// Get plain text from HTML
const text = HtmlSanitizer.stripTags('<p>Hello <b>World</b></p>');
// Result: 'Hello World'

// Useful for previews or search indexing
const preview = HtmlSanitizer.stripTags(richContent).slice(0, 100);
```

### Validate Before Insert

```typescript
if (HtmlSanitizer.isSafe(userInput)) {
  element.innerHTML = userInput;
} else {
  // Either sanitize or show error
  element.innerHTML = HtmlSanitizer.sanitize(userInput);
  console.warn('User input contained unsafe HTML');
}
```

### With DOMPurify (Recommended)

For production use, install DOMPurify for more robust sanitization:

```bash
npm install dompurify
npm install --save-dev @types/dompurify
```

```typescript
import DOMPurify from 'dompurify';

// DOMPurify is detected automatically when imported
const safe = HtmlSanitizer.sanitize(untrustedHtml, {
  allowedTags: ['p', 'a', 'b', 'i', 'ul', 'li'],
  allowedAttributes: ['href', 'class'],
});
```

## Security Considerations

1. **Defense in Depth** - Always sanitize user-provided HTML before insertion
2. **DOMPurify Recommended** - Built-in sanitizer covers common cases; DOMPurify
   handles edge cases and browser quirks
3. **Context Matters** - Sanitized HTML is safe for `innerHTML`, but still
   validate for specific contexts (e.g., URL attributes)
4. **No Trusted Input** - Even content from your own database should be
   sanitized before display
5. **DOMParser Required** - `stripTags()` requires a browser environment with
   `DOMParser`. It throws a `SanitizeError` if `DOMParser` is unavailable (e.g.,
   in some server-side environments). No regex fallback is used, as regex-based
   HTML parsing is inherently unsafe.
