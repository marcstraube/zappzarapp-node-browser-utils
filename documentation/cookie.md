# Cookie Manager

Secure cookie management with security-first defaults.

## Quick Start

```typescript
import { CookieManager, CookieOptions } from '@zappzarapp/browser-utils/cookie';

// Set a persistent cookie (30 days)
CookieManager.set('theme', 'dark', CookieOptions.persistent('theme', 30));

// Get a cookie
const theme = CookieManager.get('theme'); // 'dark' | null

// Remove a cookie
CookieManager.remove('theme');
```

## Exports

| Export               | Description                                   |
| -------------------- | --------------------------------------------- |
| `CookieManager`      | Static methods for cookie CRUD operations     |
| `CookieOptions`      | Immutable configuration for cookie attributes |
| `CookieOptionsInput` | Options interface for creating CookieOptions  |
| `SameSiteValue`      | Type: `'Strict' \| 'Lax' \| 'None'`           |

## CookieOptions

### Security Defaults

| Attribute  | Default    | Description               |
| ---------- | ---------- | ------------------------- |
| `secure`   | `true`     | HTTPS only                |
| `sameSite` | `'Strict'` | Strongest CSRF protection |
| `path`     | `'/'`      | Available site-wide       |

### Factory Methods

```typescript
import { CookieOptions } from '@zappzarapp/browser-utils/cookie';

// Session cookie (expires when browser closes)
const session = CookieOptions.session('sessionId');

// Persistent cookie (30 days)
const persistent = CookieOptions.persistent('prefs', 30);

// Custom options
const custom = CookieOptions.create({
  name: 'token',
  expires: 7, // 7 days
  path: '/api',
  domain: '.example.com',
  secure: true,
  sameSite: 'Lax',
});
```

### Fluent API

```typescript
const options = CookieOptions.session('token')
  .withExpires(7) // 7 days
  .withPath('/api')
  .withDomain('.example.com')
  .withSecure(true)
  .withSameSite('Lax');
```

### SameSite Explained

| Value    | Description                                                                |
| -------- | -------------------------------------------------------------------------- |
| `Strict` | Cookie never sent cross-site. Best for auth cookies.                       |
| `Lax`    | Sent on top-level navigation (clicking links). Default in modern browsers. |
| `None`   | Always sent (requires Secure). Use only when necessary for cross-site.     |

## CookieManager

### Set a Cookie

```typescript
// With options
CookieManager.set('theme', 'dark', CookieOptions.persistent('theme', 30));

// With inline options
CookieManager.set('lang', 'en', { name: 'lang', expires: 365 });
```

### Get a Cookie

```typescript
const value = CookieManager.get('theme'); // string | null
```

### Check if Cookie Exists

```typescript
if (CookieManager.has('theme')) {
  // Cookie exists
}
```

### Remove a Cookie

```typescript
// Basic removal
CookieManager.remove('theme');

// With path/domain (must match original cookie)
CookieManager.remove('theme', { path: '/api', domain: '.example.com' });
```

### Get All Cookies

```typescript
const all = CookieManager.all();
// { theme: 'dark', lang: 'en', ... }

const keys = CookieManager.keys();
// ['theme', 'lang', ...]
```

### Clear All Cookies

```typescript
CookieManager.clear();

// With specific path
CookieManager.clear({ path: '/api' });
```

### Check if Cookies Enabled

```typescript
if (CookieManager.isEnabled()) {
  // Cookies are available
}
```

## Result-Based Error Handling

```typescript
import { Result } from '@zappzarapp/browser-utils/core';
import { CookieManager } from '@zappzarapp/browser-utils/cookie';

// Set with Result
const setResult = CookieManager.setResult('key', 'value');
if (Result.isErr(setResult)) {
  console.error('Failed to set cookie:', setResult.error.message);
}

// Get with Result
const getResult = CookieManager.getResult('key');
if (Result.isOk(getResult)) {
  console.log('Value:', getResult.value);
}
```

## Usage Examples

### Session Cookie

```typescript
const options = CookieOptions.session('sessionId');
CookieManager.set('PHPSESSID', sessionId, options);
```

### Remember Me Cookie

```typescript
const options = CookieOptions.persistent('remember', 30); // 30 days
CookieManager.set('remember_me', token, options);
```

### API Token Cookie

```typescript
const options = CookieOptions.create({
  name: 'api_token',
  expires: 1, // 1 day
  path: '/api',
  sameSite: 'Strict',
});
CookieManager.set('api_token', token, options);
```

### Cross-Site Cookie (Third-Party)

```typescript
// Only when truly needed for cross-site functionality
const options = CookieOptions.create({
  name: 'tracking',
  sameSite: 'None',
  secure: true, // Required with SameSite=None
});
CookieManager.set('tracking', id, options);
```

## Security Considerations

1. **Always use Secure flag** - Prevents interception over HTTP. Default is
   `true`.

2. **Prefer SameSite=Strict** - Strongest CSRF protection. Default is
   `'Strict'`.

3. **Avoid SameSite=None** - Only use if truly needed for cross-site
   functionality.

4. **Short expiry for sensitive cookies** - Session cookies should expire with
   the browser session.

5. **Limit Path scope** - Use specific paths when cookie is only needed for
   certain routes.

6. **HttpOnly for server cookies** - Cookies set by JavaScript are always
   accessible to JavaScript. Use server-side cookies with HttpOnly for
   authentication.

7. **Warning for insecure cookies** - Setting a non-secure cookie on HTTPS
   triggers a console warning.

8. **Name/Value validation** - Cookie names and values are validated to prevent
   injection attacks.

9. **Path/Domain validation** - Cookie `path` and `domain` values are validated
   to prevent injection of additional cookie attributes via crafted values.
