# Session Storage Manager

Type-safe sessionStorage wrapper with LRU eviction. Data persists only for the
browser session.

## Quick Start

```typescript
import { SessionStorageManager } from '@zappzarapp/browser-utils/session';

interface SessionData {
  token: string;
  userId: number;
}

const session = SessionStorageManager.create<SessionData>({ prefix: 'myApp' });
session.set('auth', { token: 'abc123', userId: 42 });
const auth = session.get('auth');
```

## Classes

| Class / Type            | Description                                        |
| ----------------------- | -------------------------------------------------- |
| `SessionStorageManager` | Type-safe sessionStorage wrapper with LRU eviction |
| `SessionStorageStats`   | Statistics about session storage state             |

## Configuration Options

Same as StorageManager - uses `StorageConfigOptions`:

| Option              | Type                            | Default     | Description                                |
| ------------------- | ------------------------------- | ----------- | ------------------------------------------ |
| `prefix`            | `string`                        | `'storage'` | Key prefix for all entries                 |
| `maxEntries`        | `number`                        | `50`        | Maximum entries before LRU eviction        |
| `minSafeEntries`    | `number`                        | `5`         | Minimum entries during emergency eviction  |
| `logger`            | `Logger \| LoggerConfigOptions` | Silent      | Logger for debug output                    |
| `useMemoryFallback` | `boolean`                       | `true`      | Use memory when sessionStorage unavailable |

## Factory Methods

### SessionStorageManager.create()

```typescript
// Default configuration
const session = SessionStorageManager.create<MyData>();

// Custom configuration
const session = SessionStorageManager.create<MyData>({
  prefix: 'myApp',
  maxEntries: 25,
});
```

### SessionStorageManager.withDebugLogging()

```typescript
const session = SessionStorageManager.withDebugLogging<MyData>('myApp');
```

### SessionStorageManager.fromConfig()

```typescript
import { StorageConfig } from '@zappzarapp/browser-utils/storage';
import { SessionStorageManager } from '@zappzarapp/browser-utils/session';

const config = StorageConfig.create({ prefix: 'myApp', maxEntries: 30 });
const session = SessionStorageManager.fromConfig<MyData>(config);
```

## Usage Examples

### Basic Operations

```typescript
const session = SessionStorageManager.create<CartItem[]>({ prefix: 'shop' });

// Store session data
session.set('cart', [{ id: 1, qty: 2 }]);

// Retrieve data
const cart = session.get('cart');

// Check existence
if (session.has('cart')) {
  // Process cart
}

// Remove item
session.remove('cart');

// Get all keys
const keys = session.keys();

// Clear all session data
session.clear();
```

### Result-Based Error Handling

```typescript
import { Result } from '@zappzarapp/browser-utils/core';
import { SessionStorageManager } from '@zappzarapp/browser-utils/session';

const session = SessionStorageManager.create<UserSession>({ prefix: 'app' });

const result = session.getResult('currentUser');

if (Result.isOk(result)) {
  if (result.value !== null) {
    console.log('User:', result.value);
  }
} else {
  console.error('Error:', result.error.message);
}
```

### Statistics

```typescript
const stats = session.stats();
// {
//   count: 5,
//   isMemoryFallback: false,
//   prefix: 'shop',
//   maxEntries: 50
// }
```

## Differences from StorageManager

| Feature     | StorageManager     | SessionStorageManager   |
| ----------- | ------------------ | ----------------------- |
| Persistence | Until cleared      | Until tab/window closes |
| Tab sharing | Shared across tabs | Isolated per tab        |
| Use case    | User preferences   | Temporary session data  |

## Availability Check

```typescript
if (SessionStorageManager.isSessionStorageAvailable()) {
  // sessionStorage is available
} else {
  // Using memory fallback or disabled
}
```

## Security Considerations

1. **Session Isolation** - Data is isolated per tab, not shared across tabs
2. **XSS Vulnerability** - Data is accessible to any JavaScript on the page
3. **No Sensitive Data** - Avoid storing passwords or sensitive tokens
4. **Automatic Cleanup** - Data is cleared when the browser tab closes
5. **Memory Fallback** - In private browsing, data may only persist in memory
