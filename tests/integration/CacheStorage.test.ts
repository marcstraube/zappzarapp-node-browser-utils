import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CacheManager } from '../../src/cache/index.js';
import { StorageManager } from '../../src/storage/index.js';

/**
 * Integration: CacheManager + StorageManager
 *
 * Tests the layered caching pattern:
 * - CacheManager provides fast in-memory cache with TTL and SWR
 * - StorageManager provides persistent localStorage fallback
 * - Together they form a two-tier cache with offline support
 */

interface UserData {
  readonly id: number;
  readonly name: string;
}

function createMockLocalStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear(): void {
      store.clear();
    },
    getItem(key: string): string | null {
      return store.get(key) ?? null;
    },
    key(index: number): string | null {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string): void {
      store.delete(key);
    },
    setItem(key: string, value: string): void {
      store.set(key, value);
    },
  };
}

describe('CacheManager + StorageManager', () => {
  let mockStorage: Storage;
  let originalLocalStorage: PropertyDescriptor | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    mockStorage = createMockLocalStorage();
    originalLocalStorage = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      value: mockStorage,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    if (originalLocalStorage) {
      Object.defineProperty(window, 'localStorage', originalLocalStorage);
    }
  });

  it('should use cache for fast access and storage for persistence', async () => {
    const cache = CacheManager.create<UserData>({ maxSize: 100 });
    const storage = StorageManager.create<UserData>({ prefix: 'users' });

    const user: UserData = { id: 1, name: 'Alice' };

    // Write to both tiers
    await cache.set('user:1', user, { ttl: 60_000 });
    storage.set('user1', user);

    // Fast path: read from cache
    const cached = await cache.get('user:1');
    expect(cached?.value).toEqual(user);

    // Persistence path: read from storage
    const persisted = storage.get('user1');
    expect(persisted).toEqual(user);

    cache.destroy();
  });

  it('should fall back to storage when cache misses', async () => {
    const cache = CacheManager.create<UserData>({ maxSize: 100 });
    const storage = StorageManager.create<UserData>({ prefix: 'users' });

    const user: UserData = { id: 2, name: 'Bob' };
    storage.set('user2', user);

    // Cache miss
    const cached = await cache.get('user:2');
    expect(cached).toBeUndefined();

    // Fall back to storage
    const persisted = storage.get('user2');
    expect(persisted).toEqual(user);

    // Populate cache from storage
    if (persisted !== null) {
      await cache.set('user:2', persisted, { ttl: 30_000 });
    }

    // Now cache has it
    const reCached = await cache.get('user:2');
    expect(reCached?.value).toEqual(user);

    cache.destroy();
  });

  it('should serve stale cache while revalidating and update storage', async () => {
    const cache = CacheManager.create<UserData>({
      maxSize: 100,
      defaultStaleAfter: 100,
      defaultTtl: 60_000,
    });
    const storage = StorageManager.create<UserData>({ prefix: 'users' });

    const staleUser: UserData = { id: 3, name: 'Charlie' };
    const freshUser: UserData = { id: 3, name: 'Charlie Updated' };

    // Seed cache and storage
    await cache.set('user:3', staleUser);
    storage.set('user3', staleUser);

    // Advance past staleAfter threshold
    vi.advanceTimersByTime(200);

    // SWR: get stale value immediately, revalidate in background
    const result = await cache.get('user:3', {
      staleWhileRevalidate: true,
      revalidate: async () => {
        // Simulate API fetch + update storage
        storage.set('user3', freshUser);
        return freshUser;
      },
    });

    expect(result?.value).toEqual(staleUser);
    expect(result?.isStale).toBe(true);

    // Let revalidation complete
    await vi.advanceTimersByTimeAsync(10);

    // Cache is now updated
    const updated = await cache.get('user:3');
    expect(updated?.value).toEqual(freshUser);

    // Storage was also updated during revalidation
    expect(storage.get('user3')).toEqual(freshUser);

    cache.destroy();
  });

  it('should survive cache eviction with storage as backup', async () => {
    const cache = CacheManager.create<UserData>({ maxSize: 2 });
    const storage = StorageManager.create<UserData>({ prefix: 'users' });

    const users: UserData[] = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Charlie' },
    ];

    // Write all to storage, but cache only holds 2
    for (const user of users) {
      await cache.set(`user:${user.id}`, user);
      storage.set(`user${user.id}`, user);
    }

    // Cache evicted the oldest entry
    const stats = cache.getStats();
    expect(stats.evictions).toBeGreaterThan(0);

    // But storage still has all
    for (const user of users) {
      expect(storage.get(`user${user.id}`)).toEqual(user);
    }

    cache.destroy();
  });

  it('should coordinate invalidation across cache and storage', async () => {
    const cache = CacheManager.create<UserData>({ maxSize: 100 });
    const storage = StorageManager.create<UserData>({ prefix: 'users' });

    const user: UserData = { id: 4, name: 'Diana' };

    await cache.set('user:4', user, { tags: ['users'] });
    storage.set('user4', user);

    // Invalidate by tag in cache
    const invalidated = await cache.invalidateByTag('users');
    expect(invalidated).toBe(1);

    // Cache is empty
    expect(await cache.get('user:4')).toBeUndefined();

    // Storage still has the data (manual cleanup needed)
    expect(storage.get('user4')).toEqual(user);

    // Clean up storage separately
    storage.remove('user4');
    expect(storage.get('user4')).toBeNull();

    cache.destroy();
  });
});
