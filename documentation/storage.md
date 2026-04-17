# Storage Manager

Type-safe localStorage wrapper with LRU eviction and automatic quota management.

## Quick Start

```typescript
import { StorageManager } from '@zappzarapp/browser-utils/storage';

interface UserPrefs {
  theme: 'light' | 'dark';
  language: string;
}

const storage = StorageManager.create<UserPrefs>({ prefix: 'myApp' });
storage.set('prefs', { theme: 'dark', language: 'en' });
const prefs = storage.get('prefs');
```

## Classes

| Class / Type           | Description                                         |
| ---------------------- | --------------------------------------------------- |
| `StorageManager`       | Type-safe localStorage wrapper with LRU eviction    |
| `StorageConfig`        | Immutable configuration for storage managers        |
| `BaseStorageManager`   | Abstract base class for storage implementations     |
| `MemoryStorage`        | In-memory fallback when localStorage is unavailable |
| `StorageStats`         | Statistics about storage state                      |
| `StorageConfigOptions` | Options for creating StorageConfig                  |

## Configuration Options

| Option              | Type                            | Default          | Description                                       |
| ------------------- | ------------------------------- | ---------------- | ------------------------------------------------- |
| `prefix`            | `string`                        | `'storage'`      | Key prefix for all entries (alphanumeric)         |
| `maxEntries`        | `number`                        | `50`             | Maximum entries before LRU eviction (1-10000)     |
| `minSafeEntries`    | `number`                        | `5`              | Minimum entries to keep during emergency eviction |
| `logger`            | `Logger \| LoggerConfigOptions` | Silent           | Logger for debug output                           |
| `useMemoryFallback` | `boolean`                       | `true`           | Use memory storage when localStorage unavailable  |
| `serializer`        | `(value: unknown) => string`    | `JSON.stringify` | Custom function to serialize values               |
| `deserializer`      | `(raw: string) => unknown`      | `JSON.parse`     | Custom function to deserialize values             |

## Factory Methods

### StorageManager.create()

```typescript
// Default configuration
const storage = StorageManager.create<MyData>();

// Custom configuration
const customStorage = StorageManager.create<MyData>({
  prefix: 'myApp',
  maxEntries: 100,
  useMemoryFallback: true,
});
```

### StorageManager.withDebugLogging()

```typescript
// Development mode with debug logging
const storage = StorageManager.withDebugLogging<MyData>('myApp');
```

### StorageManager.fromConfig()

```typescript
// Create from existing config
const config = StorageConfig.create({ prefix: 'myApp' });
const storage = StorageManager.fromConfig<MyData>(config);
```

## Usage Examples

### Basic CRUD Operations

```typescript
const storage = StorageManager.create<UserData>({ prefix: 'app' });

// Set value
storage.set('user', { id: 1, name: 'Alice' });

// Get value
const user = storage.get('user'); // UserData | null

// Check existence
if (storage.has('user')) {
  // ...
}

// Remove value
storage.remove('user');

// Get all keys
const keys = storage.keys(); // string[]

// Clear all entries
storage.clear();
```

### Result-Based Error Handling

```typescript
import { Result } from '@zappzarapp/browser-utils/core';
import { StorageManager } from '@zappzarapp/browser-utils/storage';

const storage = StorageManager.create<MyData>({ prefix: 'app' });

const result = storage.getResult('settings');

if (Result.isOk(result)) {
  console.log('Settings:', result.value);
} else {
  console.error('Failed:', result.error.message);
}
```

### Statistics

```typescript
const stats = storage.stats();
// {
//   count: 10,
//   isMemoryFallback: false,
//   prefix: 'app',
//   maxEntries: 50
// }
```

### Fluent Configuration

```typescript
const config = StorageConfig.create({ prefix: 'app' })
  .withMaxEntries(100)
  .withMinSafeEntries(10)
  .withLogger(Logger.development('[Storage]'));

const storage = StorageManager.fromConfig<MyData>(config);
```

### Getting All Entries

```typescript
// Get all entries sorted by timestamp (newest first)
const entries = storage.entries();
// Array<{ key: string; value: T; timestamp: number }>
```

## Custom Serialization

By default values are serialized with `JSON.stringify` / `JSON.parse`. To
preserve non-JSON-native types (Date, Map, Set, RegExp, etc.) provide custom
`serializer` and `deserializer` functions.

```typescript
const config = StorageConfig.create({
  prefix: 'app',
  serializer: (value) =>
    JSON.stringify(value, (_key, v) =>
      v instanceof Date ? { __date: v.toISOString() } : v
    ),
  deserializer: (raw) =>
    JSON.parse(raw, (_key, v) => (v?.__date ? new Date(v.__date) : v)),
});

const storage = StorageManager.fromConfig<MyData>(config);
```

The `serializer` receives the full `StorageEntry<T>` object (with `data` and
`timestamp`). The `deserializer` must return a value that matches the
`StorageEntry<T>` shape.

## Cross-Tab Synchronization

`StorageManager` supports listening for storage changes from other tabs/windows
via the browser's `storage` event. This event only fires when `localStorage` is
modified by another browsing context with the same origin.

```typescript
const storage = StorageManager.create<UserPrefs>({ prefix: 'myApp' });

// Listen for changes from other tabs
const cleanup = storage.onExternalChange((event) => {
  console.log(`Key "${event.key}" changed`);
  console.log('Old value:', event.oldValue);
  console.log('New value:', event.newValue);

  if (event.key === 'prefs' && event.newValue) {
    applyPreferences(event.newValue);
  }
});

// Stop listening
cleanup();
```

### StorageChangeEvent\<T\>

| Property   | Type        | Description                  |
| ---------- | ----------- | ---------------------------- |
| `key`      | `string`    | Key that changed (no prefix) |
| `newValue` | `T \| null` | New value (null if removed)  |
| `oldValue` | `T \| null` | Previous value (null if new) |

**Note:** In memory fallback mode, `onExternalChange` returns a no-op cleanup
function since cross-tab sync requires native `localStorage`.

## LRU Eviction

The storage manager automatically evicts the oldest entries when:

1. **Entry Limit Reached**: When `maxEntries` is exceeded, oldest entries are
   removed
2. **Quota Exceeded**: When localStorage quota is full, entries are evicted down
   to `minSafeEntries`

```typescript
const storage = StorageManager.create<string>({
  prefix: 'cache',
  maxEntries: 100, // Keep max 100 entries
  minSafeEntries: 10, // In emergency, keep at least 10
});
```

## Availability Check

```typescript
// Check if localStorage is available
if (StorageManager.isLocalStorageAvailable()) {
  // Use localStorage
} else {
  // Using memory fallback or disabled
}
```

## Security Considerations

1. **Key Validation** - Keys are validated to prevent injection attacks
2. **Prefix Isolation** - All keys are prefixed to avoid conflicts with other
   applications
3. **No Sensitive Data** - Do not store sensitive data (passwords, tokens) in
   localStorage
4. **XSS Vulnerability** - localStorage is accessible to any JavaScript on the
   page
5. **Memory Fallback** - In private browsing mode, data is only stored in memory
