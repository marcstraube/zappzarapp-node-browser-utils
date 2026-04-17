# Request Interceptor

Fetch API wrapper with middleware support, authentication, and request timing.

## Quick Start

```typescript
import { RequestInterceptor } from '@zappzarapp/browser-utils/request';

// Create interceptor with base URL and auth
const api = RequestInterceptor.create({
  baseUrl: 'https://api.example.com',
  auth: {
    type: 'bearer',
    token: () => localStorage.getItem('token') ?? '',
  },
});

// Make requests
const response = await api.fetch('/users');
const users = await response.json();

// Cleanup when done
api.destroy();
```

## Features

| Feature               | Description                                     |
| --------------------- | ----------------------------------------------- |
| Fetch Wrapper         | Enhanced fetch with middleware support          |
| Authentication        | Bearer, API Key, Basic, and custom auth types   |
| Request Middleware    | Transform requests before sending               |
| Response Middleware   | Transform responses after receiving             |
| Error Middleware      | Handle errors in middleware chain               |
| Request Timing        | Track request duration and performance          |
| URL Validation        | Protocol allowlist and pattern blocking         |
| Credential Protection | Prevent credential leakage to different origins |
| Content-Type Check    | Validate response MIME type against expected    |
| SSRF Protection       | Block requests to private/internal IP addresses |
| Abort Signal Merge    | Combine multiple AbortSignals into one          |

## Types

| Type                         | Description                                       |
| ---------------------------- | ------------------------------------------------- |
| `RequestInterceptorConfig`   | Configuration options for the interceptor         |
| `RequestInterceptorInstance` | Interceptor instance with fetch methods           |
| `RequestMiddleware`          | Middleware definition with request/response hooks |
| `RequestConfig`              | Immutable request configuration                   |
| `MutableRequestConfig`       | Mutable config for middleware modification        |
| `InterceptedResponse`        | Response with timing and metadata                 |
| `RequestTiming`              | Request timing information                        |
| `AuthConfig`                 | Authentication configuration                      |
| `HttpMethod`                 | HTTP method type                                  |
| `RequestError`               | Request-specific error class                      |
| `RequestErrorCode`           | Error code enum                                   |
| `combineAbortSignals`        | Utility to merge two AbortSignals into one        |

## Configuration Options

| Option                     | Type                    | Default      | Description                              |
| -------------------------- | ----------------------- | ------------ | ---------------------------------------- |
| `baseUrl`                  | `string`                | `''`         | Base URL prepended to all requests       |
| `timeout`                  | `number`                | `30000`      | Request timeout in milliseconds          |
| `defaultHeaders`           | `Record<string,string>` | `{}`         | Headers added to all requests            |
| `auth`                     | `AuthConfig`            | `null`       | Authentication configuration             |
| `throwOnError`             | `boolean`               | `false`      | Throw on non-2xx responses               |
| `allowedProtocols`         | `string[]`              | `['https:']` | Allowed URL protocols                    |
| `blockedPatterns`          | `RegExp[]`              | `[]`         | URL patterns to block                    |
| `validateCredentialOrigin` | `boolean`               | `true`       | Prevent credentials to different origins |
| `blockPrivateIPs`          | `boolean`               | `false`      | Block requests to private/internal IPs   |
| `expectedContentType`      | `string \| string[]`    | `undefined`  | Validate response Content-Type           |

## API Reference

### RequestInterceptor.isSupported()

Check if Fetch API is available.

```typescript
if (RequestInterceptor.isSupported()) {
  const api = RequestInterceptor.create({ baseUrl: 'https://api.example.com' });
}
```

**Returns:** `boolean`

### RequestInterceptor.create()

Create a new request interceptor instance.

```typescript
const api = RequestInterceptor.create({
  baseUrl: 'https://api.example.com',
  timeout: 10000,
  defaultHeaders: {
    'Content-Type': 'application/json',
  },
});
```

**Parameters:**

| Parameter | Type                       | Description           |
| --------- | -------------------------- | --------------------- |
| `config`  | `RequestInterceptorConfig` | Configuration options |

**Returns:** `RequestInterceptorInstance`

### Instance Methods

#### fetch()

Make a fetch request.

```typescript
const response = await api.fetch('/users', {
  method: 'POST',
  body: JSON.stringify({ name: 'Alice' }),
});
```

#### get(), post(), put(), patch(), delete()

Convenience methods for HTTP verbs.

```typescript
// GET request
const users = await api.get('/users');

// POST request with body
const newUser = await api.post('/users', JSON.stringify({ name: 'Alice' }));

// PUT request
await api.put('/users/1', JSON.stringify({ name: 'Bob' }));

// PATCH request
await api.patch('/users/1', JSON.stringify({ active: true }));

// DELETE request
await api.delete('/users/1');
```

#### use()

Add middleware to the request chain.

```typescript
const cleanup = api.use({
  onRequest: (config) => {
    config.headers.set('X-Request-ID', crypto.randomUUID());
    console.log('Request:', config.method, config.url);
    return config;
  },
  onResponse: (response) => {
    console.log('Response:', response.status, response.duration + 'ms');
    return response;
  },
  onError: (error, config) => {
    console.error('Error:', error.code, config.url);
  },
});

// Later: remove middleware
cleanup();
```

**Returns:** `CleanupFn`

#### onTiming()

Subscribe to request timing events.

```typescript
const cleanup = api.onTiming((timing) => {
  console.log(`${timing.method} ${timing.url}: ${timing.duration}ms`);
  if (timing.error) {
    console.error('Failed:', timing.error);
  }
});

// Later: unsubscribe
cleanup();
```

**Returns:** `CleanupFn`

#### getConfig()

Get current configuration (frozen/immutable).

```typescript
const config = api.getConfig();
console.log('Base URL:', config.baseUrl);
console.log('Timeout:', config.timeout);
```

**Returns:** `Readonly<RequestInterceptorConfig>`

#### setAuth()

Update authentication configuration.

```typescript
// Set new auth
api.setAuth({
  type: 'bearer',
  token: newToken,
});

// Remove auth
api.setAuth(null);
```

#### abortAll()

Abort all pending requests. The interceptor remains usable for new requests
after calling `abortAll()`.

```typescript
// Abort all in-flight requests
api.abortAll();

// New requests work normally after abortAll
const response = await api.fetch('/users');
```

Aborted requests will reject with a `RequestError` with code `'ABORTED'`.

#### destroy()

Destroy the interceptor and cleanup resources. Also aborts any pending requests.

```typescript
api.destroy();
// Further requests will throw
```

### RequestInterceptor.isSensitiveHeader()

Check if a header name is sensitive (should not be logged).

```typescript
RequestInterceptor.isSensitiveHeader('authorization'); // true
RequestInterceptor.isSensitiveHeader('content-type'); // false
```

### RequestInterceptor.redactHeaders()

Redact sensitive headers for safe logging.

```typescript
const headers = new Headers();
headers.set('Authorization', 'Bearer secret');
headers.set('Content-Type', 'application/json');

const safe = RequestInterceptor.redactHeaders(headers);
// { 'authorization': '[REDACTED]', 'content-type': 'application/json' }
```

## Authentication

### Bearer Token

```typescript
const api = RequestInterceptor.create({
  baseUrl: 'https://api.example.com',
  auth: {
    type: 'bearer',
    token: 'your-access-token',
    // Or use a function for dynamic tokens
    // token: () => localStorage.getItem('token') ?? '',
    // token: async () => await refreshToken(),
  },
});
```

### API Key

```typescript
const api = RequestInterceptor.create({
  baseUrl: 'https://api.example.com',
  auth: {
    type: 'api-key',
    apiKey: 'your-api-key',
    apiKeyHeader: 'X-API-Key', // default
  },
});
```

### Basic Auth

```typescript
const api = RequestInterceptor.create({
  baseUrl: 'https://api.example.com',
  auth: {
    type: 'basic',
    username: 'user',
    password: 'pass',
  },
});
```

### Custom Header

```typescript
const api = RequestInterceptor.create({
  baseUrl: 'https://api.example.com',
  auth: {
    type: 'custom',
    customHeader: {
      name: 'X-Custom-Auth',
      value: () => computeSignature(),
    },
  },
});
```

## Middleware Examples

### Logging Middleware

```typescript
api.use({
  onRequest: (config) => {
    console.log(`[${new Date().toISOString()}] ${config.method} ${config.url}`);
    return config;
  },
  onResponse: (response) => {
    console.log(
      `[${response.status}] ${response.url} (${response.duration}ms)`
    );
    return response;
  },
  onError: (error) => {
    console.error(`[ERROR] ${error.code}: ${error.message}`);
  },
});
```

### Retry Middleware

```typescript
api.use({
  onError: async (error, config) => {
    if (error.code === 'TIMEOUT' && config.metadata?.retryCount === undefined) {
      // Retry logic would need custom implementation
      console.log('Request timed out, consider retry');
    }
  },
});
```

### Request ID Middleware

```typescript
api.use({
  onRequest: (config) => {
    config.headers.set('X-Request-ID', crypto.randomUUID());
    config.headers.set('X-Correlation-ID', getCorrelationId());
    return config;
  },
});
```

### Response Transformation

```typescript
api.use({
  onResponse: (response) => {
    // Log slow requests
    if (response.duration > 1000) {
      console.warn(`Slow request: ${response.url} took ${response.duration}ms`);
    }
    return response;
  },
});
```

## Content-Type Validation

Validate that responses have the expected MIME type. Fails closed — a missing
`Content-Type` header with `expectedContentType` set will throw. Comparison is
case-insensitive; parameters like `charset` are ignored.

```typescript
// Single MIME type — applied to all requests
const api = RequestInterceptor.create({
  baseUrl: 'https://api.example.com',
  expectedContentType: 'application/json',
});

// Multiple accepted types
const api2 = RequestInterceptor.create({
  baseUrl: 'https://api.example.com',
  expectedContentType: ['application/json', 'application/ld+json'],
});

// Override per-request
const response = await api.fetch('/report.csv', {
  expectedContentType: 'text/csv',
});
```

## Combining Abort Signals

Merge two `AbortSignal` instances into one. When either signal fires, the
combined signal aborts and listeners on the other signal are cleaned up to
prevent memory leaks.

```typescript
import { combineAbortSignals } from '@zappzarapp/browser-utils/request';

const userController = new AbortController();
const timeoutController = new AbortController();

const combined = combineAbortSignals(
  userController.signal,
  timeoutController.signal
);

// Either signal aborting cancels the request
const response = await api.fetch('/data', { signal: combined });
```

## Error Handling

### Error Codes

| Code                    | Description                                   |
| ----------------------- | --------------------------------------------- |
| `FETCH_NOT_SUPPORTED`   | Fetch API not available                       |
| `INVALID_URL`           | URL validation failed                         |
| `INVALID_CONFIG`        | Invalid configuration                         |
| `REQUEST_FAILED`        | Network or fetch error                        |
| `RESPONSE_ERROR`        | Non-2xx response (when `throwOnError: true`)  |
| `MIDDLEWARE_ERROR`      | Error in middleware                           |
| `TIMEOUT`               | Request timed out                             |
| `ABORTED`               | Request was aborted                           |
| `CREDENTIAL_LEAK`       | Attempted credential leak to different origin |
| `SSRF_BLOCKED`          | Request to private/internal IP blocked        |
| `CONTENT_TYPE_MISMATCH` | Response Content-Type does not match expected |

### Error Handling Example

```typescript
import { RequestError } from '@zappzarapp/browser-utils/request';

try {
  const response = await api.fetch('/users');
} catch (error) {
  if (error instanceof RequestError) {
    switch (error.code) {
      case 'TIMEOUT':
        console.log('Request timed out');
        break;
      case 'CREDENTIAL_LEAK':
        console.error('Security: credential leak prevented');
        break;
      case 'CONTENT_TYPE_MISMATCH':
        console.error('Unexpected response type:', error.message);
        break;
      case 'SSRF_BLOCKED':
        console.error('Security: private IP blocked');
        break;
      case 'INVALID_URL':
        console.error('Invalid URL:', error.message);
        break;
      default:
        console.error('Request failed:', error.message);
    }
  }
}
```

## Security Considerations

1. **Protocol Allowlist** - Only HTTPS is allowed by default. HTTP and other
   protocols must be explicitly enabled.

2. **Credential Origin Validation** - When authentication is configured, the
   interceptor prevents sending credentials to different origins than the base
   URL.

3. **URL Pattern Blocking** - Block requests to specific URL patterns:

   ```typescript
   const api = RequestInterceptor.create({
     baseUrl: 'https://api.example.com',
     blockedPatterns: [/internal\//, /admin\//],
   });
   ```

4. **Sensitive Header Protection** - Authorization and similar headers are
   automatically redacted in logging utilities.

5. **No JavaScript/Data URLs** - The interceptor blocks `javascript:` and
   `data:` URLs as a defense-in-depth measure.

6. **SSRF Protection** - Optionally block requests to private/internal IP
   addresses (`blockPrivateIPs: true`). Covers IPv4 private ranges (10.x,
   172.16-31.x, 192.168.x), loopback (127.x, ::1), and link-local.

7. **Content-Type Validation** - Validate response MIME types to prevent
   type-confusion attacks. Fails closed (missing header throws).

## Usage with Abort Controller

```typescript
const controller = new AbortController();

// Start request
const responsePromise = api.fetch('/long-running', {
  signal: controller.signal,
});

// Abort after 5 seconds
setTimeout(() => controller.abort(), 5000);

try {
  const response = await responsePromise;
} catch (error) {
  if (error instanceof RequestError && error.code === 'ABORTED') {
    console.log('Request was aborted');
  }
}
```

## Browser Support

| Feature         | Chrome | Firefox | Safari | Edge |
| --------------- | ------ | ------- | ------ | ---- |
| Fetch API       | 42+    | 39+     | 10.1+  | 14+  |
| AbortController | 66+    | 57+     | 11.1+  | 16+  |
| Headers         | 42+    | 39+     | 10.1+  | 14+  |
| async/await     | 55+    | 52+     | 10.1+  | 14+  |
