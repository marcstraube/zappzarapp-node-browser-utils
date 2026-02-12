# CSP Utilities

Content Security Policy detection and utilities for working within CSP
restrictions.

## Quick Start

```typescript
import { CspUtils } from '@zappzarapp/browser-utils/csp';

// Check what's allowed by CSP
if (CspUtils.allowsInlineScript()) {
  runInlineScript();
} else {
  loadExternalScript();
}

// Generate nonce for CSP headers
const nonce = CspUtils.generateNonce();
```

## CspUtils

### Detection Methods

| Method                 | Returns   | Description                           |
| ---------------------- | --------- | ------------------------------------- |
| `allowsInlineScript()` | `boolean` | Check if inline scripts are allowed   |
| `allowsEval()`         | `boolean` | Check if eval/new Function is allowed |
| `allowsInlineStyle()`  | `boolean` | Check if inline styles are allowed    |
| `clearCache()`         | `void`    | Clear detection cache                 |

### Utility Methods

| Method                                            | Returns                        | Description                  |
| ------------------------------------------------- | ------------------------------ | ---------------------------- |
| `generateNonce(length?)`                          | `string`                       | Generate cryptographic nonce |
| `calculateHash(content)`                          | `Promise<string \| undefined>` | Calculate SHA-256 hash       |
| `onViolation(handler)`                            | `CleanupFn`                    | Listen for CSP violations    |
| `isUrlAllowedByDirective(url, origin, directive)` | `boolean`                      | Check URL against directive  |

### Types

```typescript
type CspDirective =
  | 'default-src'
  | 'script-src'
  | 'style-src'
  | 'img-src'
  | 'connect-src'
  | 'font-src'
  | 'object-src'
  | 'media-src'
  | 'frame-src';
// ... and more

interface CspViolationDetail {
  readonly violatedDirective: string;
  readonly effectiveDirective: string;
  readonly blockedUri: string;
  readonly documentUri: string;
  readonly originalPolicy: string;
  readonly sample?: string;
  readonly lineNumber?: number;
  readonly columnNumber?: number;
  readonly sourceFile?: string;
}
```

## Usage Examples

### Feature Detection

```typescript
// Check before using eval-dependent features
if (CspUtils.allowsEval()) {
  // Use eval-based approach (e.g., template engines)
  const template = compileWithEval(templateString);
} else {
  // Use pre-compiled or string-based approach
  const template = precompiledTemplate;
}

// Check before inline styles
if (CspUtils.allowsInlineStyle()) {
  element.style.cssText = dynamicStyles;
} else {
  element.className = preDefinedClass;
}
```

### Generate Nonces

```typescript
// Server generates nonce and adds to CSP header
const nonce = CspUtils.generateNonce();
// Content-Security-Policy: script-src 'nonce-${nonce}'

// Use nonce in script tags
const script = document.createElement('script');
script.nonce = nonce;
script.src = '/dynamic-script.js';
document.head.appendChild(script);
```

### Calculate Script Hash

```typescript
// Calculate hash for CSP hash-source
const scriptContent = 'console.log("Hello");';
const hash = await CspUtils.calculateHash(scriptContent);
// hash = 'sha256-...'

// Add to CSP: script-src 'sha256-...'
```

### Monitor CSP Violations

```typescript
// Development: log violations
const cleanup = CspUtils.onViolation((detail) => {
  console.warn('CSP Violation:', {
    directive: detail.violatedDirective,
    blocked: detail.blockedUri,
    source: detail.sourceFile,
    line: detail.lineNumber,
  });
});

// Production: report violations
CspUtils.onViolation((detail) => {
  fetch('/api/csp-report', {
    method: 'POST',
    body: JSON.stringify(detail),
  });
});
```

### Check URL Against Directive

```typescript
const selfOrigin = window.location.origin;
const directive = "'self' https://cdn.example.com";

// Check if script URL is allowed
const allowed = CspUtils.isUrlAllowedByDirective(
  'https://cdn.example.com/script.js',
  selfOrigin,
  directive
);

if (allowed) {
  loadScript('https://cdn.example.com/script.js');
}
```

### Cache Management

```typescript
// Clear cache when CSP may have changed
// (e.g., after page navigation in SPA)
CspUtils.clearCache();

// Re-check capabilities
const canEval = CspUtils.allowsEval();
```

### Conditional Loading

```typescript
async function loadTemplate(name: string): Promise<Template> {
  if (CspUtils.allowsEval()) {
    // Load and compile at runtime
    const source = await fetch(`/templates/${name}.hbs`).then((r) => r.text());
    return Handlebars.compile(source);
  } else {
    // Load pre-compiled
    const module = await import(`/templates/${name}.js`);
    return module.default;
  }
}
```

## Directive Values

### Common Keywords

| Keyword            | Description                             |
| ------------------ | --------------------------------------- |
| `'none'`           | Block all                               |
| `'self'`           | Same origin only                        |
| `'unsafe-inline'`  | Allow inline scripts/styles             |
| `'unsafe-eval'`    | Allow eval/Function constructor         |
| `'strict-dynamic'` | Trust scripts loaded by trusted scripts |

### Source Types

| Source        | Example           | Description           |
| ------------- | ----------------- | --------------------- |
| Host          | `cdn.example.com` | Specific host         |
| Wildcard host | `*.example.com`   | Any subdomain         |
| Scheme        | `https:`          | Any https URL         |
| Nonce         | `'nonce-abc123'`  | Specific nonce value  |
| Hash          | `'sha256-...'`    | Specific content hash |

## Server-Side Integration

CSP utilities complement server-side CSP headers:

```typescript
// Server (PHP/Node/etc.) generates CSP header
// Content-Security-Policy: script-src 'self' 'nonce-xxx'

// Client detects and adapts
if (!CspUtils.allowsInlineScript()) {
  // Use external scripts or nonce
}
```

## Security Considerations

1. **Detection is Heuristic** - Browser makes final CSP decisions
2. **Cryptographic Nonces** - Uses `crypto.getRandomValues()` for nonce
   generation
3. **Cache Invalidation** - Call `clearCache()` if CSP may change during session
4. **Violation Reporting** - Use `onViolation()` to monitor for issues
5. **Hash Algorithm** - Uses SHA-256, recommended by CSP specification
