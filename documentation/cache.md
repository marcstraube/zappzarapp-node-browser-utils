# Cache Manager

HTTP-style caching with stale-while-revalidate support and LRU eviction.

## Quick Start

```typescript
import { CacheManager } from '@zappzarapp/browser-utils/cache';

// Create cache
const cache = CacheManager.create<UserData>({ maxSize: 100 });

// Set with TTL
await cache.set('user:1', userData, { ttl: 60000 }); // 1 minute TTL

// Get with stale-while-revalidate
const result = await cache.get('user:1', {
  staleWhileRevalidate: true,
  revalidate: async () => fetchUserFromApi(1),
});

if (result) {
  console.log('User:', result.value);
  if (result.isStale) {
    console.log('Served stale data, revalidation in progress');
  }
}

// Cleanup
cache.destroy();
```

## CacheManager

### Factory Methods

| Method                 | Returns                                       | Description                             |
| ---------------------- | --------------------------------------------- | --------------------------------------- |
| `create(config)`       | `CacheManagerInstance<T>`                     | Create a new cache manager              |
| `createResult(config)` | `Result<CacheManagerInstance<T>, CacheError>` | Create with Result-based error handling |

### Configuration

```typescript
const cache = CacheManager.create<MyData>({
  maxSize: 1000, // Maximum entries (default: 1000)
  defaultTtl: 60000, // Default TTL in ms (default: undefined = no expiration)
  defaultStaleAfter: 30000, // Default stale time for SWR (default: undefined)
  cleanupInterval: 60000, // Auto-cleanup interval in ms (default: undefined)
  onEvict: (key, value) => {
    // Callback when entry is evicted
    console.log(`Evicted: ${key}`);
  },
});
```

## CacheManagerInstance

### Methods

| Method                          | Returns                                   | Description                         |
| ------------------------------- | ----------------------------------------- | ----------------------------------- |
| `get(key, options?)`            | `Promise<CacheGetResult<T> \| undefined>` | Get cached value (async)            |
| `getSync(key)`                  | `CacheGetResult<T> \| undefined`          | Get cached value (sync)             |
| `set(key, value, options?)`     | `Promise<void>`                           | Set cached value (async)            |
| `setSync(key, value, options?)` | `void`                                    | Set cached value (sync)             |
| `has(key)`                      | `boolean`                                 | Check if key exists and not expired |
| `delete(key)`                   | `Promise<boolean>`                        | Delete entry (async)                |
| `deleteSync(key)`               | `boolean`                                 | Delete entry (sync)                 |
| `invalidateByPattern(pattern)`  | `Promise<number>`                         | Invalidate entries matching pattern |
| `invalidateByTag(tag)`          | `Promise<number>`                         | Invalidate entries with tag         |
| `clear()`                       | `Promise<void>`                           | Clear all entries                   |
| `getStats()`                    | `CacheStats`                              | Get cache statistics                |
| `resetStats()`                  | `void`                                    | Reset statistics counters           |
| `keys()`                        | `string[]`                                | Get all cache keys                  |
| `getMeta(key)`                  | `CacheEntryMeta \| undefined`             | Get entry metadata                  |
| `destroy()`                     | `void`                                    | Destroy cache and clean up          |

### Types

```typescript
interface CacheSetOptions {
  /** Time-to-live in milliseconds */
  readonly ttl?: number;
  /** Tags for group invalidation */
  readonly tags?: readonly string[];
  /** Time until entry becomes stale (for SWR) */
  readonly staleAfter?: number;
}

interface CacheGetOptions<T> {
  /** Enable stale-while-revalidate pattern */
  readonly staleWhileRevalidate?: boolean;
  /** Function to fetch fresh data when stale */
  readonly revalidate?: () => Promise<T>;
  /** Options for storing revalidated data */
  readonly revalidateOptions?: CacheSetOptions;
  /** Callback invoked with fresh data when background revalidation completes */
  readonly onRevalidate?: (value: T) => void;
}

interface CacheGetResult<T> {
  /** The cached value */
  readonly value: T;
  /** Whether the value is stale */
  readonly isStale: boolean;
  /** Entry metadata */
  readonly meta: CacheEntryMeta;
}

interface CacheEntryMeta {
  /** Creation timestamp */
  readonly createdAt: number;
  /** Expiration timestamp */
  readonly expiresAt?: number;
  /** Last access timestamp for LRU */
  readonly accessedAt: number;
  /** Tags for group invalidation */
  readonly tags: readonly string[];
  /** Stale threshold timestamp */
  readonly staleAt?: number;
}

interface CacheStats {
  readonly hits: number; // Cache hits
  readonly misses: number; // Cache misses
  readonly staleHits: number; // Stale hits (SWR)
  readonly size: number; // Current entries
  readonly maxSize: number; // Maximum entries
  readonly evictions: number; // LRU evictions
  readonly invalidations: number; // Manual invalidations
}
```

## Usage Examples

### Basic Cache Operations

```typescript
const cache = CacheManager.create<string>({ maxSize: 100 });

// Set and get
await cache.set('key', 'value');
const result = await cache.get('key');
console.log(result?.value); // 'value'

// Check existence
if (cache.has('key')) {
  // Key exists and is not expired
}

// Delete
await cache.delete('key');

// Clear all
await cache.clear();
```

### TTL-Based Expiration

```typescript
const cache = CacheManager.create<UserData>({
  maxSize: 500,
  defaultTtl: 300000, // 5 minutes default
});

// Use default TTL
await cache.set('user:1', userData);

// Override TTL per entry
await cache.set('session:abc', sessionData, { ttl: 3600000 }); // 1 hour

// No expiration for specific entry
await cache.set('config', configData, { ttl: undefined });
```

### Stale-While-Revalidate Pattern

```typescript
const cache = CacheManager.create<ApiResponse>({
  maxSize: 100,
  defaultTtl: 60000, // Expires after 1 minute
  defaultStaleAfter: 30000, // Becomes stale after 30 seconds
});

// Set initial data
await cache.set('api:users', initialData);

// Get with SWR - serves stale data while fetching fresh
// Note: Concurrent requests for the same stale key trigger only one
// revalidation (stampede protection). All callers receive the stale value.
const result = await cache.get('api:users', {
  staleWhileRevalidate: true,
  revalidate: async () => {
    const response = await fetch('/api/users');
    return response.json();
  },
  revalidateOptions: { ttl: 60000 },
});

if (result) {
  // Always get data quickly
  renderUsers(result.value);

  if (result.isStale) {
    // Data is being refreshed in background
    showRefreshIndicator();
  }
}
```

### Revalidation Notification

Use `onRevalidate` to update your UI when fresh data arrives from a background
revalidation:

```typescript
const result = await cache.get('api:users', {
  staleWhileRevalidate: true,
  revalidate: () => fetch('/api/users').then((r) => r.json()),
  onRevalidate: (freshData) => {
    // Called once background fetch completes successfully
    renderUsers(freshData);
    hideRefreshIndicator();
  },
});
```

The callback is **not** called when:

- The entry is not stale (no revalidation needed)
- The revalidation function throws an error (stale data remains)
- The cache is destroyed before revalidation completes
- The revalidation is deduplicated (only the first caller's callback fires)

### Tag-Based Invalidation

```typescript
const cache = CacheManager.create<unknown>({ maxSize: 500 });

// Set entries with tags
await cache.set('user:1', user1, { tags: ['users', 'active'] });
await cache.set('user:2', user2, { tags: ['users', 'inactive'] });
await cache.set('post:1', post1, { tags: ['posts', 'user:1'] });

// Invalidate all users
const count = await cache.invalidateByTag('users');
console.log(`Invalidated ${count} user entries`);

// Invalidate all content by a specific user
await cache.invalidateByTag('user:1');
```

### Pattern-Based Invalidation

```typescript
const cache = CacheManager.create<unknown>({ maxSize: 500 });

await cache.set('user:1:profile', profile1);
await cache.set('user:1:settings', settings1);
await cache.set('user:2:profile', profile2);

// Invalidate all entries for user 1
const count = await cache.invalidateByPattern(/^user:1:/);
console.log(`Invalidated ${count} entries`);

// Invalidate all profiles
await cache.invalidateByPattern(/profile$/);
```

### Cache Statistics

```typescript
const cache = CacheManager.create<string>({ maxSize: 100 });

// Perform some operations
await cache.set('key1', 'value1');
await cache.get('key1'); // Hit
await cache.get('key2'); // Miss

// Get statistics
const stats = cache.getStats();
console.log(`Hits: ${stats.hits}`);
console.log(`Misses: ${stats.misses}`);
console.log(
  `Hit rate: ${((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(1)}%`
);
console.log(`Size: ${stats.size}/${stats.maxSize}`);
console.log(`Evictions: ${stats.evictions}`);

// Reset stats
cache.resetStats();
```

### LRU Eviction

```typescript
const cache = CacheManager.create<string>({
  maxSize: 3,
  onEvict: (key, value) => {
    console.log(`Evicted: ${key}`);
  },
});

await cache.set('a', '1');
await cache.set('b', '2');
await cache.set('c', '3');

// Access 'a' to make it recently used
await cache.get('a');

// Adding 'd' will evict 'b' (least recently used)
await cache.set('d', '4'); // Logs: "Evicted: b"
```

### Synchronous Operations

```typescript
const cache = CacheManager.create<Config>({ maxSize: 50 });

// Use sync methods for performance-critical paths
cache.setSync('config', appConfig);
const result = cache.getSync('config');

if (result) {
  applyConfig(result.value);
}

// Sync delete
cache.deleteSync('config');
```

### Result-Based Error Handling

```typescript
import { Result } from '@zappzarapp/browser-utils/core';
import { CacheManager } from '@zappzarapp/browser-utils/cache';

const result = CacheManager.createResult<string>({ maxSize: 100 });

if (result._tag === 'Ok') {
  const cache = result.value;
  await cache.set('key', 'value');
} else {
  console.error('Failed to create cache:', result.error.message);
}
```

### Automatic Cleanup

```typescript
const cache = CacheManager.create<unknown>({
  maxSize: 1000,
  defaultTtl: 60000,
  cleanupInterval: 30000, // Run cleanup every 30 seconds
});

// Expired entries are automatically removed
// No manual cleanup needed

// Remember to destroy when done
cache.destroy();
```

## CacheError

### Error Codes

| Code                  | Description                                       |
| --------------------- | ------------------------------------------------- |
| `INVALID_KEY`         | Key is empty, too long, or has invalid characters |
| `INVALID_TTL`         | TTL is not a positive number                      |
| `INVALID_SIZE`        | Max size is not a positive integer                |
| `STORAGE_FAILED`      | Storage operation failed                          |
| `REVALIDATION_FAILED` | SWR revalidation function failed                  |
| `DESTROYED`           | Cache manager has been destroyed                  |

### Error Handling

```typescript
import { CacheManager, CacheError } from '@zappzarapp/browser-utils/cache';

try {
  const cache = CacheManager.create<string>({ maxSize: 100 });
  await cache.set('invalid key!', 'value'); // Invalid characters
} catch (error) {
  if (error instanceof CacheError) {
    switch (error.code) {
      case 'INVALID_KEY':
        console.error('Invalid cache key');
        break;
      case 'DESTROYED':
        console.error('Cache was destroyed');
        break;
      default:
        console.error('Cache error:', error.message);
    }
  }
}
```

## Key Validation

Cache keys must follow these rules:

- Not empty
- Maximum 256 characters
- Only alphanumeric characters, colons, dots, hyphens, underscores, and slashes
- Pattern: `/^[\w:.\-/]+$/`

Valid keys: `user:123`, `api/users/1`, `config.theme`, `cache-key_v2`

Invalid keys: `key with spaces`, `key@special!chars`, empty string

## Security Considerations

1. **Input Validation** - All keys are validated against a strict pattern to
   prevent injection attacks
2. **Memory Limits** - `maxSize` prevents unbounded memory growth
3. **LRU Eviction** - Automatic eviction prevents memory exhaustion
4. **No Sensitive Data** - Cache is in-memory; do not cache passwords, tokens,
   or other sensitive data
5. **Cleanup** - Always call `destroy()` to clean up timers and release memory
6. **SWR Security** - Revalidation functions should handle errors gracefully;
   errors are silently ignored to serve stale data
7. **Stampede Protection** - Concurrent stale-while-revalidate requests for the
   same key are deduplicated; only one revalidation runs at a time per key
