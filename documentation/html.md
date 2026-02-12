# HTML Utilities

DOM manipulation and HTML escaping utilities for XSS prevention.

## Quick Start

```typescript
import { HtmlEscaper, DomHelper } from '@zappzarapp/browser-utils/html';

// Escape user input for safe HTML insertion
const safe = HtmlEscaper.escape(userInput);
element.innerHTML = `<span>${safe}</span>`;

// Better: use textContent (automatically safe)
DomHelper.setText(element, userInput);

// Create elements safely
const span = DomHelper.create('span', { class: 'highlight' }, userInput);
```

## Exports

| Export        | Description                                       |
| ------------- | ------------------------------------------------- |
| `HtmlEscaper` | Static methods for HTML escaping and sanitization |
| `DomHelper`   | Safe DOM manipulation utilities                   |

## HtmlEscaper

### HtmlEscaper.escape()

Escape HTML special characters to prevent XSS:

```typescript
const userInput = '<script>alert("xss")</script>';
const safe = HtmlEscaper.escape(userInput);
// '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
```

### HtmlEscaper.escapeAttr()

More aggressive escaping for attribute context:

```typescript
const safe = HtmlEscaper.escapeAttr(userInput);
```

### HtmlEscaper.truncate()

Escape and truncate text for display:

```typescript
const safe = HtmlEscaper.truncate(longText, 100);
// Truncates at 100 chars and adds '...'

const custom = HtmlEscaper.truncate(text, 50, ' [more]');
```

### HtmlEscaper.tag()

Build safe HTML tags with escaped content:

```typescript
const html = HtmlEscaper.tag('span', { class: 'highlight' }, userInput);
// Content is automatically escaped

// Self-closing tag
const img = HtmlEscaper.tag('img', { src: '/image.png', alt: 'Photo' }, null);
```

**Security Features:**

- Dangerous attributes are automatically filtered (onclick, onerror, etc.)
- Attribute values are escaped
- Content is escaped

### HtmlEscaper.isSafeUrl()

Check if a URL is safe (not javascript:, data:, etc.):

```typescript
if (HtmlEscaper.isSafeUrl(url)) {
  // Safe to use
}
```

### HtmlEscaper.sanitizeUrl()

Sanitize URL for safe use in href/src:

```typescript
const safeUrl = HtmlEscaper.sanitizeUrl(userUrl);
// Returns empty string if URL is dangerous
```

## DomHelper

### Text Content

```typescript
// Set text safely (uses textContent)
DomHelper.setText(element, userInput);
```

### Create Elements

```typescript
// Create element with safe text content
const span = DomHelper.create('span', { class: 'label' }, 'Safe Text');

// Create with attributes
const link = DomHelper.create(
  'a',
  {
    href: 'https://example.com',
    target: '_blank',
  },
  'Click me'
);

// Create text node
const text = DomHelper.createText('Some text');
```

### DOM Manipulation

```typescript
// Append children (strings become text nodes)
DomHelper.append(parent, child1, 'text', child2);

// Clear element
DomHelper.clear(element);
```

### Query Selectors

```typescript
// Type-safe query
const button = DomHelper.query('button', container);

// Query all
const buttons = DomHelper.queryAll('button', container);
```

### Event Listeners

```typescript
// Add listener with automatic cleanup
const cleanup = DomHelper.on(element, 'click', (e) => {
  handleClick(e);
});

// Remove listener
cleanup();
```

### CSS Classes

```typescript
// Toggle class
DomHelper.toggleClass(element, 'active');
DomHelper.toggleClass(element, 'visible', true); // Force add

// Check class
if (DomHelper.hasClass(element, 'active')) {
}

// Add/remove classes
DomHelper.addClass(element, 'class1', 'class2');
DomHelper.removeClass(element, 'class1');
```

### Data Attributes

```typescript
DomHelper.setData(element, 'userId', '123');
const userId = DomHelper.getData(element, 'userId');
```

### Visibility

```typescript
DomHelper.show(element);
DomHelper.show(element, 'flex'); // Custom display value
DomHelper.hide(element);

if (DomHelper.isVisible(element)) {
}
```

## Usage Examples

### Safe User Content Display

```typescript
function displayComment(comment: string): void {
  const container = document.getElementById('comments')!;

  // Option 1: Using textContent (safest)
  const div = DomHelper.create('div', { class: 'comment' }, comment);

  // Option 2: Using HtmlSanitizer for rich HTML
  // import { HtmlSanitizer } from '@zappzarapp/browser-utils/sanitize';
  // HtmlSanitizer.setHtmlContent(container, sanitizedHtml);
}
```

### Safe Link Generation

```typescript
function createLink(url: string, text: string): HTMLAnchorElement | null {
  if (!HtmlEscaper.isSafeUrl(url)) {
    return null;
  }

  return DomHelper.create('a', { href: url }, text);
}
```

## Security Considerations

1. **Prefer textContent** - Use `DomHelper.setText()` or element's `textContent`
   instead of `innerHTML` whenever possible

2. **Escape All User Input** - Always escape user-provided content before HTML
   insertion

3. **Validate URLs** - Use `HtmlEscaper.isSafeUrl()` to block javascript:,
   data:, vbscript: URLs

4. **Dangerous Attributes Filtered** - `HtmlEscaper.tag()` automatically
   filters:
   - Event handlers (onclick, onerror, etc.)
   - URL attributes that could execute JavaScript (href, src, action,
     formaction)
   - Other dangerous attributes (srcdoc, xlink:href)

5. **Defense in Depth** - Combine escaping with Content Security Policy (CSP)
   headers
