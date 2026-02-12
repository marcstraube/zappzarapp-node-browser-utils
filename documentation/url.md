# URL Utilities

Immutable URL building, query parameter handling, and browser history
management.

## Quick Start

```typescript
import {
  UrlBuilder,
  QueryParams,
  HistoryManager,
} from '@zappzarapp/browser-utils/url';

// Build URL
const url = UrlBuilder.from('https://example.com')
  .withPath('/api/users')
  .withParam('page', '1')
  .toString();
// 'https://example.com/api/users?page=1'

// Parse query string
const params = QueryParams.parse('?foo=1&bar=2');
const foo = params.get('foo'); // '1'

// Push to history
HistoryManager.push('/page/2', { page: 2 });
```

## Exports

| Export            | Description                                 |
| ----------------- | ------------------------------------------- |
| `UrlBuilder`      | Immutable URL construction and manipulation |
| `QueryParams`     | Parse and build URL query strings           |
| `HistoryManager`  | Browser History API wrapper                 |
| `QueryParamValue` | Type: `string \| string[]`                  |
| `HistoryState`    | Type for history state objects              |
| `CleanupFn`       | Cleanup function type                       |

## UrlBuilder

### Factory Methods

```typescript
// From URL string
const builder = UrlBuilder.from('https://example.com/path');

// From current location
const current = UrlBuilder.current();

// From URL object
const fromUrl = UrlBuilder.fromURL(new URL('https://example.com'));

// With Result (no exceptions)
const result = UrlBuilder.fromResult('https://example.com');
```

### Fluent API

All methods return new instances (immutable):

```typescript
const url = UrlBuilder.from('https://example.com')
  .withPath('/api/users')
  .withParam('page', '1')
  .withParam('limit', '10')
  .withParams({ sort: 'name', order: 'asc' })
  .withHash('section-1')
  .toString();
```

### Methods

```typescript
const builder = UrlBuilder.from('https://example.com/path?existing=1');

// Path
builder.withPath('/new-path');

// Query parameters
builder.withQuery('?foo=1&bar=2');
builder.withParam('key', 'value');
builder.withAppendedParam('key', 'value2'); // Allows duplicates
builder.withParams({ a: '1', b: '2' });
builder.withoutParam('key');
builder.withoutQuery();

// Hash/fragment
builder.withHash('section');
builder.withoutHash();

// Host/protocol
builder.withProtocol('http');
builder.withHost('api.example.com');
builder.withPort(8080);
```

### Accessors

```typescript
const builder = UrlBuilder.from('https://example.com:8080/path?foo=1#hash');

builder.protocol; // 'https:'
builder.hostname; // 'example.com'
builder.host; // 'example.com:8080'
builder.port; // '8080'
builder.pathname; // '/path'
builder.search; // '?foo=1'
builder.hash; // '#hash'
builder.origin; // 'https://example.com:8080'
builder.href; // Full URL string

// Query param access
builder.getParam('foo'); // '1'
builder.getAllParams('foo'); // ['1']
builder.hasParam('foo'); // true
builder.params(); // { foo: '1' }
```

### Output

```typescript
builder.toString(); // URL string
builder.toURL(); // URL object
```

## QueryParams

### Factory Methods

```typescript
// Empty
const params = QueryParams.create();

// Parse query string
const parsed = QueryParams.parse('?foo=1&bar=2');

// From current location
const current = QueryParams.current();

// From object
const fromObj = QueryParams.fromObject({
  page: '1',
  tags: ['a', 'b'], // Arrays supported
});
```

### Static Utilities

```typescript
// Parse to object
const obj = QueryParams.toObject('?foo=1&bar=2');
// { foo: '1', bar: '2' }

// Stringify object
const str = QueryParams.stringify({ page: '1', limit: '10' });
// 'page=1&limit=10'
```

### Fluent API (Immutable)

```typescript
const params = QueryParams.create()
  .set('page', '1')
  .set('limit', '10')
  .append('tag', 'a')
  .append('tag', 'b')
  .delete('page')
  .setAll({ sort: 'name', order: 'asc' })
  .merge({ filter: 'active' })
  .clear();
```

### Accessors

```typescript
params.get('page'); // string | null
params.getAll('tag'); // string[]
params.has('page'); // boolean
params.keys(); // string[]
params.values(); // string[]
params.entries(); // [string, string][]
params.size; // number
params.isEmpty; // boolean
```

### Output

```typescript
params.toString(); // 'page=1&limit=10'
params.toQueryString(); // '?page=1&limit=10' or ''
params.toObject(); // Record<string, string | string[]>
params.toURLSearchParams(); // URLSearchParams
```

## HistoryManager

### Navigation

```typescript
// Push new entry
HistoryManager.push('/page/2', { page: 2 });

// Replace current entry
HistoryManager.replace('/page/1', { page: 1 });

// Navigate
HistoryManager.back();
HistoryManager.forward();
HistoryManager.go(-2); // Go back 2 entries
```

### State Access

```typescript
// Get current state
const state = HistoryManager.currentState<MyState>();

// Get history length
const length = HistoryManager.length();

// Scroll restoration
const mode = HistoryManager.scrollRestoration();
HistoryManager.setScrollRestoration('manual');
```

### Event Handlers

```typescript
// Listen for popstate (back/forward)
const cleanup = HistoryManager.onPopState<MyState>((state, event) => {
  console.log('Navigated to:', state);
});

// Listen for hash changes
const cleanup = HistoryManager.onHashChange((newHash, oldHash, event) => {
  console.log(`Hash changed: ${oldHash} -> ${newHash}`);
});

// Cleanup when done
cleanup();
```

### Support Detection

```typescript
if (HistoryManager.isSupported()) {
  // History API is available
}
```

### Result-Based API

```typescript
const result = HistoryManager.pushResult('/page/2', { page: 2 });

if (Result.isErr(result)) {
  console.error('Navigation failed:', result.error.message);
}
```

## Usage Examples

### API URL Building

```typescript
function buildApiUrl(endpoint: string, params: Record<string, string>): string {
  return UrlBuilder.from(API_BASE)
    .withPath(endpoint)
    .withParams(params)
    .toString();
}

const url = buildApiUrl('/users', { page: '1', limit: '10' });
```

### SPA Navigation

```typescript
function navigateTo(path: string, state?: HistoryState): void {
  HistoryManager.push(path, state);
  renderPage(path, state);
}

// Listen for back/forward
HistoryManager.onPopState((state) => {
  renderPage(window.location.pathname, state);
});
```

### Filter State in URL

```typescript
function updateFilters(filters: Record<string, string>): void {
  const url = UrlBuilder.current().withParams(filters).toString();

  HistoryManager.replace(url, { filters });
}

function getFiltersFromUrl(): Record<string, string> {
  return QueryParams.current().toObject() as Record<string, string>;
}
```

## Security Considerations

1. **URL Validation** - `UrlBuilder.from()` validates URLs against dangerous
   protocols (javascript:, data:, vbscript:)

2. **History State Validation** - State objects are validated to be serializable
   (no circular references)

3. **Safe URL Building** - Use `UrlBuilder.fromResult()` for untrusted URLs to
   handle validation errors gracefully
