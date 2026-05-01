# Recipe: Resilient API Client

Build an API client that retries failed requests, caches responses, and serves
stale data while revalidating in the background.

## Modules Used

- **RequestInterceptor** -- authenticated fetch with middleware support
- **RetryQueue** -- automatic retry with exponential backoff
- **CacheManager** -- SWR caching with `onRevalidate` callback

## Architecture

```text
Request Flow:

  caller
    |
    v
  cache.get(key, { staleWhileRevalidate, revalidate, onRevalidate })
    |
    +-- HIT (fresh) --> return cached value
    |
    +-- HIT (stale) --> return stale value + trigger background revalidation
    |                        |
    |                        v
    |                    retryQueue.add(() => interceptor.fetch(...))
    |                        |
    |                        v
    |                    cache.set(key, freshData)
    |                        |
    |                        v
    |                    onRevalidate(freshData)
    |
    +-- MISS --> retryQueue.add(() => interceptor.fetch(...))
                     |
                     v
                 cache.set(key, data)
                     |
                     v
                 return data
```

## Step 1: Configure the Request Interceptor

Set up authenticated requests with a base URL and default headers.

```typescript
import { RequestInterceptor } from '@zappzarapp/browser-utils/request';

const api = RequestInterceptor.create({
  baseUrl: 'https://api.example.com',
  auth: {
    type: 'bearer',
    token: () => localStorage.getItem('access_token') ?? '',
  },
  defaultHeaders: {
    Accept: 'application/json',
  },
  timeout: 10_000,
  allowedProtocols: ['https:'],
});
```

## Step 2: Add the Retry Queue

Wrap fetch calls with automatic retry and exponential backoff.

```typescript
import { RetryQueue } from '@zappzarapp/browser-utils/network';

const queue = RetryQueue.create({
  maxRetries: 3,
  backoff: 'exponential',
  baseDelay: 1_000,
  maxDelay: 15_000,
  networkAware: true,
  jitter: true,
});

// Optional: log retry attempts
queue.onRetry((attempt) => {
  console.warn(`Retry attempt ${attempt}`);
});
```

## Step 3: Set Up the Cache

Create a cache with default TTL and stale window for SWR.

```typescript
import { CacheManager } from '@zappzarapp/browser-utils/cache';

const cache = CacheManager.create<unknown>({
  maxSize: 200,
  defaultTtl: 300_000, // 5 minutes
  defaultStaleAfter: 60_000, // stale after 1 minute, but still served
  cleanupInterval: 120_000,
});
```

## Step 4: Build the Fetcher

Combine all three modules into a single data-fetching function.

```typescript
interface FetchOptions<T> {
  /** Cache key for this request */
  readonly key: string;
  /** Called when background revalidation completes */
  readonly onRevalidate?: (value: T) => void;
  /** Per-request TTL override in ms */
  readonly ttl?: number;
}

async function fetchWithResilience<T>(
  path: string,
  options: FetchOptions<T>
): Promise<{ value: T; isStale: boolean }> {
  const { key, onRevalidate, ttl } = options;

  const fetcher = async (): Promise<T> => {
    const response = await queue.add(() => api.fetch(path));
    return response.json() as Promise<T>;
  };

  // Check cache first (returns stale data immediately if available)
  const cached = await cache.get(key, {
    staleWhileRevalidate: true,
    revalidate: fetcher,
    revalidateOptions: ttl ? { ttl } : undefined,
    onRevalidate,
  });

  if (cached) {
    return { value: cached.value as T, isStale: cached.isStale };
  }

  // Cache miss -- fetch, cache, return
  const fresh = await fetcher();
  await cache.set(key, fresh, ttl ? { ttl } : undefined);
  return { value: fresh, isStale: false };
}
```

## Complete Example: User Service

```typescript
import { RequestInterceptor } from '@zappzarapp/browser-utils/request';
import { RetryQueue } from '@zappzarapp/browser-utils/network';
import { CacheManager } from '@zappzarapp/browser-utils/cache';

interface User {
  readonly id: number;
  readonly name: string;
  readonly email: string;
}

// --- Setup ---

const api = RequestInterceptor.create({
  baseUrl: 'https://api.example.com',
  auth: { type: 'bearer', token: () => getToken() },
  timeout: 10_000,
  allowedProtocols: ['https:'],
});

const queue = RetryQueue.create({
  maxRetries: 3,
  backoff: 'exponential',
  baseDelay: 1_000,
  maxDelay: 15_000,
  networkAware: true,
  jitter: true,
});

const userCache = CacheManager.create<User>({
  maxSize: 500,
  defaultTtl: 300_000,
  defaultStaleAfter: 60_000,
  cleanupInterval: 120_000,
});

// --- Service ---

async function getUser(
  id: number,
  onUpdate?: (user: User) => void
): Promise<User> {
  const key = `user:${id}`;

  const result = await userCache.get(key, {
    staleWhileRevalidate: true,
    revalidate: async () => {
      const res = await queue.add(() => api.fetch(`/users/${id}`));
      return res.json() as Promise<User>;
    },
    onRevalidate: onUpdate,
  });

  if (result) {
    return result.value;
  }

  // Cache miss
  const res = await queue.add(() => api.fetch(`/users/${id}`));
  const user = (await res.json()) as User;
  await userCache.set(key, user);
  return user;
}

// --- Usage ---

const user = await getUser(42, (freshUser) => {
  // Called asynchronously when stale data was served and
  // background revalidation completes with fresh data.
  renderUser(freshUser);
});

renderUser(user);

// --- Cleanup ---

function destroy(): void {
  userCache.destroy();
  queue.destroy();
  api.destroy();
}
```

## Configuration Tips

### Retry Delays

| Scenario              | `backoff`       | `baseDelay` | `maxDelay` | `maxRetries` |
| --------------------- | --------------- | ----------- | ---------- | ------------ |
| User-facing API calls | `'exponential'` | `1000`      | `15000`    | `3`          |
| Background sync       | `'exponential'` | `2000`      | `60000`    | `5`          |
| Health checks         | `'constant'`    | `5000`      | `5000`     | `10`         |

Enable `jitter: true` (the default) to avoid thundering-herd effects when many
clients retry simultaneously.

### Cache TTL and SWR Windows

| Data type       | `defaultTtl` | `defaultStaleAfter` | Rationale                             |
| --------------- | ------------ | ------------------- | ------------------------------------- |
| User profiles   | 5 min        | 1 min               | Moderate change frequency             |
| Config/settings | 30 min       | 10 min              | Rarely changes, safe to serve stale   |
| Real-time feeds | 30 sec       | 10 sec              | Freshness matters, short stale window |
| Static assets   | 24 hours     | 1 hour              | Effectively immutable                 |

The `staleAfter` value controls when SWR kicks in. Set it well below `ttl` to
give background revalidation time to complete before the entry expires entirely.

### Network Awareness

With `networkAware: true` (the default), `RetryQueue` automatically pauses when
the browser goes offline and resumes on reconnection. This prevents wasting
retry attempts against an unreachable server.
