/**
 * CacheManager Tests.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CacheManager, CacheError, type CacheManagerInstance } from '../../src/cache/index.js';
import { Result } from '../../src/core/index.js';

describe('CacheManager', () => {
  let cache: CacheManagerInstance<string>;

  beforeEach(() => {
    vi.useFakeTimers();
    cache = CacheManager.create<string>({ maxSize: 10 });
  });

  afterEach(() => {
    cache.destroy();
    vi.useRealTimers();
  });

  // ===========================================================================
  // CacheError Tests
  // ===========================================================================

  describe('CacheError', () => {
    it('should create INVALID_KEY error', () => {
      const error = CacheError.invalidKey('bad key');
      expect(error.code).toBe('INVALID_KEY');
      expect(error.message).toContain('bad key');
      expect(error).toBeInstanceOf(Error);
    });

    it('should create INVALID_TTL error', () => {
      const error = CacheError.invalidTtl(-100);
      expect(error.code).toBe('INVALID_TTL');
      expect(error.message).toContain('-100');
    });

    it('should create INVALID_SIZE error', () => {
      const error = CacheError.invalidSize(-5);
      expect(error.code).toBe('INVALID_SIZE');
      expect(error.message).toContain('-5');
    });

    it('should create STORAGE_FAILED error with cause', () => {
      const cause = new Error('disk full');
      const error = CacheError.storageFailed('write', cause);
      expect(error.code).toBe('STORAGE_FAILED');
      expect(error.message).toContain('write');
      expect(error.cause).toBe(cause);
    });

    it('should create REVALIDATION_FAILED error', () => {
      const cause = new Error('network error');
      const error = CacheError.revalidationFailed('user:1', cause);
      expect(error.code).toBe('REVALIDATION_FAILED');
      expect(error.message).toContain('user:1');
      expect(error.cause).toBe(cause);
    });

    it('should create DESTROYED error', () => {
      const error = CacheError.destroyed();
      expect(error.code).toBe('DESTROYED');
      expect(error.message).toContain('destroyed');
    });
  });

  // ===========================================================================
  // Factory Tests
  // ===========================================================================

  describe('create', () => {
    it('should create cache with default configuration', () => {
      const c = CacheManager.create<number>();
      expect(c).toBeDefined();
      expect(c.getStats().maxSize).toBe(1000);
      c.destroy();
    });

    it('should create cache with custom maxSize', () => {
      const c = CacheManager.create<number>({ maxSize: 50 });
      expect(c.getStats().maxSize).toBe(50);
      c.destroy();
    });

    it('should throw on invalid maxSize', () => {
      expect(() => CacheManager.create({ maxSize: -1 })).toThrow(CacheError);
      expect(() => CacheManager.create({ maxSize: 0 })).toThrow(CacheError);
      expect(() => CacheManager.create({ maxSize: 1.5 })).toThrow(CacheError);
    });

    it('should throw on invalid defaultTtl', () => {
      expect(() => CacheManager.create({ defaultTtl: -1 })).toThrow(CacheError);
      expect(() => CacheManager.create({ defaultTtl: 0 })).toThrow(CacheError);
    });

    it('should throw on invalid defaultStaleAfter', () => {
      expect(() => CacheManager.create({ defaultStaleAfter: -1 })).toThrow(CacheError);
    });

    it('should throw on invalid cleanupInterval', () => {
      expect(() => CacheManager.create({ cleanupInterval: -1 })).toThrow(CacheError);
    });

    it('should accept valid configuration', () => {
      const c = CacheManager.create({
        maxSize: 100,
        defaultTtl: 60000,
        defaultStaleAfter: 30000,
        cleanupInterval: 10000,
        onEvict: () => {},
      });
      expect(c).toBeDefined();
      c.destroy();
    });
  });

  describe('createResult', () => {
    it('should return Ok result for valid config', () => {
      const result = CacheManager.createResult<string>({ maxSize: 100 });
      expect(result._tag).toBe('Ok');
      if (result._tag === 'Ok') {
        result.value.destroy();
      }
    });

    it('should return Err result for invalid config', () => {
      const result = CacheManager.createResult<string>({ maxSize: -1 });
      expect(result._tag).toBe('Err');
      if (result._tag === 'Err') {
        expect(result.error).toBeInstanceOf(CacheError);
      }
    });
  });

  // ===========================================================================
  // Basic Operations
  // ===========================================================================

  describe('setSync and getSync', () => {
    it('should store and retrieve values', () => {
      cache.setSync('key1', 'value1');
      const result = cache.getSync('key1');
      expect(result).toBeDefined();
      expect(result?.value).toBe('value1');
      expect(result?.isStale).toBe(false);
    });

    it('should return undefined for non-existent key', () => {
      const result = cache.getSync('nonexistent');
      expect(result).toBeUndefined();
    });

    it('should update existing entries', () => {
      cache.setSync('key1', 'value1');
      cache.setSync('key1', 'value2');
      const result = cache.getSync('key1');
      expect(result?.value).toBe('value2');
    });

    it('should validate keys on set', () => {
      expect(() => cache.setSync('', 'value')).toThrow(CacheError);
      expect(() => cache.setSync('key with spaces', 'value')).toThrow(CacheError);
      expect(() => cache.setSync('key<script>', 'value')).toThrow(CacheError);
    });

    it('should validate keys on get', () => {
      expect(() => cache.getSync('')).toThrow(CacheError);
    });

    it('should accept valid key formats', () => {
      cache.setSync('user:1', 'value');
      cache.setSync('api/v1/users', 'value');
      cache.setSync('cache.key.name', 'value');
      cache.setSync('key-with-dashes', 'value');
      cache.setSync('key_with_underscores', 'value');
      expect(cache.getSync('user:1')?.value).toBe('value');
    });

    it('should reject keys exceeding max length', () => {
      const longKey = 'a'.repeat(300);
      expect(() => cache.setSync(longKey, 'value')).toThrow(CacheError);
    });
  });

  describe('async set and get', () => {
    it('should store and retrieve values asynchronously', async () => {
      await cache.set('async-key', 'async-value');
      const result = await cache.get('async-key');
      expect(result?.value).toBe('async-value');
    });
  });

  describe('delete', () => {
    it('should delete existing entries', async () => {
      cache.setSync('key1', 'value1');
      const deleted = await cache.delete('key1');
      expect(deleted).toBe(true);
      expect(cache.getSync('key1')).toBeUndefined();
    });

    it('should return false for non-existent keys', async () => {
      const deleted = await cache.delete('nonexistent');
      expect(deleted).toBe(false);
    });

    it('should delete synchronously', () => {
      cache.setSync('key1', 'value1');
      const deleted = cache.deleteSync('key1');
      expect(deleted).toBe(true);
      expect(cache.getSync('key1')).toBeUndefined();
    });
  });

  describe('has', () => {
    it('should return true for existing keys', () => {
      cache.setSync('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
    });

    it('should return false for non-existent keys', () => {
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should return false for expired keys', () => {
      cache.setSync('key1', 'value1', { ttl: 1000 });
      expect(cache.has('key1')).toBe(true);

      vi.advanceTimersByTime(1001);
      expect(cache.has('key1')).toBe(false);
    });
  });

  describe('keys', () => {
    it('should return all cache keys', () => {
      cache.setSync('key1', 'value1');
      cache.setSync('key2', 'value2');
      cache.setSync('key3', 'value3');

      const keys = cache.keys();
      expect(keys).toHaveLength(3);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
    });

    it('should return empty array for empty cache', () => {
      expect(cache.keys()).toHaveLength(0);
    });
  });

  describe('clear', () => {
    it('should remove all entries', async () => {
      cache.setSync('key1', 'value1');
      cache.setSync('key2', 'value2');

      await cache.clear();

      expect(cache.keys()).toHaveLength(0);
      expect(cache.getStats().size).toBe(0);
    });

    it('should update invalidation count', async () => {
      cache.setSync('key1', 'value1');
      cache.setSync('key2', 'value2');

      await cache.clear();

      expect(cache.getStats().invalidations).toBe(2);
    });
  });

  // ===========================================================================
  // TTL and Expiration
  // ===========================================================================

  describe('TTL expiration', () => {
    it('should expire entries after TTL', () => {
      cache.setSync('key1', 'value1', { ttl: 5000 });

      // Before expiration
      expect(cache.getSync('key1')?.value).toBe('value1');

      // After expiration
      vi.advanceTimersByTime(5001);
      expect(cache.getSync('key1')).toBeUndefined();
    });

    it('should use default TTL if configured', () => {
      const c = CacheManager.create<string>({ defaultTtl: 3000 });
      c.setSync('key1', 'value1');

      expect(c.getSync('key1')?.value).toBe('value1');

      vi.advanceTimersByTime(3001);
      expect(c.getSync('key1')).toBeUndefined();

      c.destroy();
    });

    it('should override default TTL with set options', () => {
      const c = CacheManager.create<string>({ defaultTtl: 3000 });
      c.setSync('key1', 'value1', { ttl: 10000 });

      vi.advanceTimersByTime(5000);
      expect(c.getSync('key1')?.value).toBe('value1');

      vi.advanceTimersByTime(5001);
      expect(c.getSync('key1')).toBeUndefined();

      c.destroy();
    });

    it('should not expire entries without TTL', () => {
      cache.setSync('key1', 'value1');

      vi.advanceTimersByTime(1000000);
      expect(cache.getSync('key1')?.value).toBe('value1');
    });

    it('should validate TTL in set options', () => {
      expect(() => cache.setSync('key', 'value', { ttl: -1 })).toThrow(CacheError);
      expect(() => cache.setSync('key', 'value', { ttl: 0 })).toThrow(CacheError);
      expect(() => cache.setSync('key', 'value', { ttl: NaN })).toThrow(CacheError);
      expect(() => cache.setSync('key', 'value', { ttl: Infinity })).toThrow(CacheError);
    });
  });

  describe('cleanup interval', () => {
    it('should automatically clean up expired entries', () => {
      const c = CacheManager.create<string>({
        cleanupInterval: 1000,
      });

      c.setSync('key1', 'value1', { ttl: 500 });
      c.setSync('key2', 'value2', { ttl: 2000 });

      expect(c.keys()).toHaveLength(2);

      vi.advanceTimersByTime(1001);

      // key1 should be cleaned up
      expect(c.keys()).toHaveLength(1);
      expect(c.getSync('key1')).toBeUndefined();
      expect(c.getSync('key2')?.value).toBe('value2');

      c.destroy();
    });

    it('should stop cleanup after destroy', () => {
      const c = CacheManager.create<string>({
        cleanupInterval: 1000,
      });

      c.setSync('key1', 'value1', { ttl: 500 });
      c.destroy();

      // Should not throw when cleanup timer fires
      vi.advanceTimersByTime(2000);
    });
  });

  // ===========================================================================
  // Stale-While-Revalidate
  // ===========================================================================

  describe('stale-while-revalidate', () => {
    it('should mark entries as stale after staleAfter time', () => {
      cache.setSync('key1', 'value1', { staleAfter: 2000, ttl: 5000 });

      // Not stale yet
      let result = cache.getSync('key1');
      expect(result?.isStale).toBe(false);

      // After staleAfter but before expiry
      vi.advanceTimersByTime(2001);
      result = cache.getSync('key1');
      expect(result?.value).toBe('value1');
      expect(result?.isStale).toBe(true);

      // After expiry
      vi.advanceTimersByTime(3000);
      expect(cache.getSync('key1')).toBeUndefined();
    });

    it('should trigger revalidation on stale hit', async () => {
      const revalidateFn = vi.fn().mockResolvedValue('fresh-value');

      cache.setSync('key1', 'stale-value', { staleAfter: 1000, ttl: 10000 });

      vi.advanceTimersByTime(1001);

      const result = await cache.get('key1', {
        staleWhileRevalidate: true,
        revalidate: revalidateFn,
      });

      expect(result?.value).toBe('stale-value');
      expect(result?.isStale).toBe(true);

      // Wait for revalidation to complete
      await vi.runAllTimersAsync();

      expect(revalidateFn).toHaveBeenCalledTimes(1);

      // Should now have fresh value
      const freshResult = cache.getSync('key1');
      expect(freshResult?.value).toBe('fresh-value');
    });

    it('should use revalidateOptions when storing fresh value', async () => {
      const revalidateFn = vi.fn().mockResolvedValue('fresh-value');

      cache.setSync('key1', 'stale-value', { staleAfter: 1000, ttl: 10000 });

      vi.advanceTimersByTime(1001);

      await cache.get('key1', {
        staleWhileRevalidate: true,
        revalidate: revalidateFn,
        revalidateOptions: { ttl: 5000, tags: ['revalidated'] },
      });

      await vi.runAllTimersAsync();

      const meta = cache.getMeta('key1');
      expect(meta?.tags).toContain('revalidated');
    });

    it('should handle revalidation errors silently', async () => {
      const revalidateFn = vi.fn().mockRejectedValue(new Error('Network error'));

      cache.setSync('key1', 'stale-value', { staleAfter: 1000, ttl: 10000 });

      vi.advanceTimersByTime(1001);

      const result = await cache.get('key1', {
        staleWhileRevalidate: true,
        revalidate: revalidateFn,
      });

      expect(result?.value).toBe('stale-value');

      // Wait for revalidation to fail
      await vi.runAllTimersAsync();

      // Should still have stale value
      expect(cache.getSync('key1')?.value).toBe('stale-value');
    });

    it('should not revalidate if staleWhileRevalidate is false', async () => {
      const revalidateFn = vi.fn().mockResolvedValue('fresh-value');

      cache.setSync('key1', 'stale-value', { staleAfter: 1000, ttl: 10000 });

      vi.advanceTimersByTime(1001);

      const result = await cache.get('key1', {
        staleWhileRevalidate: false,
        revalidate: revalidateFn,
      });

      expect(result?.value).toBe('stale-value');
      expect(result?.isStale).toBe(true);
      expect(revalidateFn).not.toHaveBeenCalled();
    });

    it('should not revalidate if revalidate function is not provided', async () => {
      cache.setSync('key1', 'stale-value', { staleAfter: 1000, ttl: 10000 });

      vi.advanceTimersByTime(1001);

      const result = await cache.get('key1', {
        staleWhileRevalidate: true,
      });

      expect(result?.value).toBe('stale-value');
      expect(result?.isStale).toBe(true);
    });

    it('should use default staleAfter from config', () => {
      const c = CacheManager.create<string>({
        defaultStaleAfter: 2000,
        defaultTtl: 10000,
      });

      c.setSync('key1', 'value1');

      vi.advanceTimersByTime(2001);

      const result = c.getSync('key1');
      expect(result?.isStale).toBe(true);

      c.destroy();
    });

    it('should not revalidate after cache is destroyed', async () => {
      const revalidateFn = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return 'fresh-value';
      });

      cache.setSync('key1', 'stale-value', { staleAfter: 1000, ttl: 10000 });

      vi.advanceTimersByTime(1001);

      const resultPromise = cache.get('key1', {
        staleWhileRevalidate: true,
        revalidate: revalidateFn,
      });

      // Destroy cache before revalidation completes
      cache.destroy();

      await resultPromise;
      await vi.runAllTimersAsync();

      // Revalidation should have been called but not stored
      expect(revalidateFn).toHaveBeenCalled();
    });

    it('should call onRevalidate with fresh value after background revalidation', async () => {
      const onRevalidate = vi.fn();
      const revalidateFn = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return 'fresh-value';
      });

      cache.setSync('key1', 'stale-value', { staleAfter: 1000, ttl: 10000 });

      vi.advanceTimersByTime(1001);

      const result = await cache.get('key1', {
        staleWhileRevalidate: true,
        revalidate: revalidateFn,
        onRevalidate,
      });

      expect(result?.value).toBe('stale-value');
      expect(onRevalidate).not.toHaveBeenCalled();

      await vi.runAllTimersAsync();

      expect(onRevalidate).toHaveBeenCalledTimes(1);
      expect(onRevalidate).toHaveBeenCalledWith('fresh-value');
    });

    it('should not call onRevalidate on revalidation error', async () => {
      const onRevalidate = vi.fn();
      const revalidateFn = vi.fn().mockRejectedValue(new Error('Network error'));

      cache.setSync('key1', 'stale-value', { staleAfter: 1000, ttl: 10000 });

      vi.advanceTimersByTime(1001);

      await cache.get('key1', {
        staleWhileRevalidate: true,
        revalidate: revalidateFn,
        onRevalidate,
      });

      await vi.runAllTimersAsync();

      expect(onRevalidate).not.toHaveBeenCalled();
    });

    it('should not call onRevalidate if cache is destroyed before revalidation completes', async () => {
      const onRevalidate = vi.fn();
      const revalidateFn = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return 'fresh-value';
      });

      cache.setSync('key1', 'stale-value', { staleAfter: 1000, ttl: 10000 });

      vi.advanceTimersByTime(1001);

      const resultPromise = cache.get('key1', {
        staleWhileRevalidate: true,
        revalidate: revalidateFn,
        onRevalidate,
      });

      cache.destroy();

      await resultPromise;
      await vi.runAllTimersAsync();

      expect(onRevalidate).not.toHaveBeenCalled();
    });

    it('should not call onRevalidate when entry is not stale', async () => {
      const onRevalidate = vi.fn();
      const revalidateFn = vi.fn().mockResolvedValue('fresh-value');

      cache.setSync('key1', 'value1', { staleAfter: 5000, ttl: 10000 });

      const result = await cache.get('key1', {
        staleWhileRevalidate: true,
        revalidate: revalidateFn,
        onRevalidate,
      });

      expect(result?.value).toBe('value1');
      expect(result?.isStale).toBe(false);

      await vi.runAllTimersAsync();

      expect(revalidateFn).not.toHaveBeenCalled();
      expect(onRevalidate).not.toHaveBeenCalled();
    });

    it('should call onRevalidate only once with deduplication', async () => {
      const onRevalidate = vi.fn();
      const revalidateFn = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return 'fresh-value';
      });

      cache.setSync('key1', 'stale-value', { staleAfter: 1000, ttl: 10000 });

      vi.advanceTimersByTime(1001);

      // Multiple concurrent gets with onRevalidate
      await Promise.all([
        cache.get('key1', {
          staleWhileRevalidate: true,
          revalidate: revalidateFn,
          onRevalidate,
        }),
        cache.get('key1', {
          staleWhileRevalidate: true,
          revalidate: revalidateFn,
          onRevalidate,
        }),
      ]);

      await vi.runAllTimersAsync();

      expect(revalidateFn).toHaveBeenCalledTimes(1);
      expect(onRevalidate).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // LRU Eviction
  // ===========================================================================

  describe('LRU eviction', () => {
    it('should evict least recently used entries when at capacity', () => {
      const c = CacheManager.create<string>({ maxSize: 3 });

      c.setSync('key1', 'value1');
      vi.advanceTimersByTime(100);
      c.setSync('key2', 'value2');
      vi.advanceTimersByTime(100);
      c.setSync('key3', 'value3');
      vi.advanceTimersByTime(100);

      // Access key1 to make it recently used
      c.getSync('key1');
      vi.advanceTimersByTime(100);

      // Add new entry - should evict key2 (least recently used)
      c.setSync('key4', 'value4');

      expect(c.getSync('key1')?.value).toBe('value1');
      expect(c.getSync('key2')).toBeUndefined();
      expect(c.getSync('key3')?.value).toBe('value3');
      expect(c.getSync('key4')?.value).toBe('value4');

      c.destroy();
    });

    it('should update eviction count in stats', () => {
      const c = CacheManager.create<string>({ maxSize: 2 });

      c.setSync('key1', 'value1');
      c.setSync('key2', 'value2');
      c.setSync('key3', 'value3');

      expect(c.getStats().evictions).toBe(1);

      c.destroy();
    });

    it('should call onEvict callback when evicting', () => {
      const onEvict = vi.fn();
      const c = CacheManager.create<string>({ maxSize: 2, onEvict });

      c.setSync('key1', 'value1');
      c.setSync('key2', 'value2');
      c.setSync('key3', 'value3');

      expect(onEvict).toHaveBeenCalledWith('key1', 'value1');

      c.destroy();
    });

    it('should handle eviction with empty cache gracefully', () => {
      const c = CacheManager.create<string>({ maxSize: 1 });

      // This should not throw
      c.setSync('key1', 'value1');
      expect(c.getStats().size).toBe(1);

      c.destroy();
    });

    it('should not evict when updating existing key', () => {
      const c = CacheManager.create<string>({ maxSize: 2 });

      c.setSync('key1', 'value1');
      c.setSync('key2', 'value2');

      // Update existing key - should not trigger eviction
      c.setSync('key1', 'updated');

      expect(c.getStats().evictions).toBe(0);
      expect(c.getSync('key1')?.value).toBe('updated');
      expect(c.getSync('key2')?.value).toBe('value2');

      c.destroy();
    });
  });

  // ===========================================================================
  // Tags and Pattern Invalidation
  // ===========================================================================

  describe('tag-based invalidation', () => {
    it('should store entries with tags', () => {
      cache.setSync('user:1', 'user1', { tags: ['users', 'active'] });
      const meta = cache.getMeta('user:1');
      expect(meta?.tags).toContain('users');
      expect(meta?.tags).toContain('active');
    });

    it('should invalidate all entries with a tag', async () => {
      cache.setSync('user:1', 'user1', { tags: ['users'] });
      cache.setSync('user:2', 'user2', { tags: ['users'] });
      cache.setSync('product:1', 'product1', { tags: ['products'] });

      const count = await cache.invalidateByTag('users');

      expect(count).toBe(2);
      expect(cache.getSync('user:1')).toBeUndefined();
      expect(cache.getSync('user:2')).toBeUndefined();
      expect(cache.getSync('product:1')?.value).toBe('product1');
    });

    it('should return 0 for non-existent tag', async () => {
      const count = await cache.invalidateByTag('nonexistent');
      expect(count).toBe(0);
    });

    it('should update invalidation count', async () => {
      cache.setSync('user:1', 'user1', { tags: ['users'] });
      cache.setSync('user:2', 'user2', { tags: ['users'] });

      await cache.invalidateByTag('users');

      expect(cache.getStats().invalidations).toBe(2);
    });

    it('should handle entries with multiple tags', async () => {
      cache.setSync('user:1', 'user1', { tags: ['users', 'admins'] });

      await cache.invalidateByTag('users');

      expect(cache.getSync('user:1')).toBeUndefined();
    });

    it('should update tag index when deleting entries', () => {
      cache.setSync('user:1', 'user1', { tags: ['users'] });
      cache.deleteSync('user:1');

      // Add another entry with same tag and invalidate
      cache.setSync('user:2', 'user2', { tags: ['users'] });
      cache.invalidateByTag('users');

      // Should only count the second entry
      expect(cache.getStats().invalidations).toBe(1);
    });

    it('should update tag index when entry expires', () => {
      cache.setSync('user:1', 'user1', { tags: ['users'], ttl: 1000 });

      vi.advanceTimersByTime(1001);

      // Access to trigger expiration cleanup
      cache.getSync('user:1');

      // Add new entry with same tag
      cache.setSync('user:2', 'user2', { tags: ['users'] });
      cache.invalidateByTag('users');

      expect(cache.getStats().invalidations).toBe(1);
    });
  });

  describe('pattern-based invalidation', () => {
    it('should invalidate entries matching pattern', async () => {
      cache.setSync('user:1', 'user1');
      cache.setSync('user:2', 'user2');
      cache.setSync('product:1', 'product1');

      const count = await cache.invalidateByPattern(/^user:/);

      expect(count).toBe(2);
      expect(cache.getSync('user:1')).toBeUndefined();
      expect(cache.getSync('user:2')).toBeUndefined();
      expect(cache.getSync('product:1')?.value).toBe('product1');
    });

    it('should return 0 if no entries match', async () => {
      cache.setSync('user:1', 'user1');

      const count = await cache.invalidateByPattern(/^product:/);

      expect(count).toBe(0);
    });

    it('should handle complex patterns', async () => {
      cache.setSync('api/v1/users/1', 'user1');
      cache.setSync('api/v1/users/2', 'user2');
      cache.setSync('api/v2/users/1', 'user1-v2');
      cache.setSync('api/v1/products/1', 'product1');

      const count = await cache.invalidateByPattern(/^api\/v1\/users/);

      expect(count).toBe(2);
      expect(cache.getSync('api/v1/users/1')).toBeUndefined();
      expect(cache.getSync('api/v2/users/1')?.value).toBe('user1-v2');
      expect(cache.getSync('api/v1/products/1')?.value).toBe('product1');
    });

    it('should update invalidation count', async () => {
      cache.setSync('user:1', 'user1');
      cache.setSync('user:2', 'user2');

      await cache.invalidateByPattern(/^user:/);

      expect(cache.getStats().invalidations).toBe(2);
    });

    it('should clean up tag index for invalidated entries', async () => {
      cache.setSync('user:1', 'user1', { tags: ['users'] });
      cache.setSync('user:2', 'user2', { tags: ['users'] });

      await cache.invalidateByPattern(/^user:/);

      // Tag index should be cleaned up
      const count = await cache.invalidateByTag('users');
      expect(count).toBe(0);
    });
  });

  // ===========================================================================
  // Metadata
  // ===========================================================================

  describe('getMeta', () => {
    it('should return entry metadata', () => {
      vi.setSystemTime(1000000);

      cache.setSync('key1', 'value1', {
        ttl: 5000,
        staleAfter: 2000,
        tags: ['test'],
      });

      const meta = cache.getMeta('key1');

      expect(meta).toBeDefined();
      expect(meta?.createdAt).toBe(1000000);
      expect(meta?.accessedAt).toBe(1000000);
      expect(meta?.expiresAt).toBe(1005000);
      expect(meta?.staleAt).toBe(1002000);
      expect(meta?.tags).toContain('test');
    });

    it('should return undefined for non-existent key', () => {
      expect(cache.getMeta('nonexistent')).toBeUndefined();
    });

    it('should return undefined for expired key', () => {
      cache.setSync('key1', 'value1', { ttl: 1000 });

      vi.advanceTimersByTime(1001);

      expect(cache.getMeta('key1')).toBeUndefined();
    });

    it('should update accessedAt on get', () => {
      vi.setSystemTime(1000000);
      cache.setSync('key1', 'value1');

      vi.setSystemTime(2000000);
      cache.getSync('key1');

      const meta = cache.getMeta('key1');
      expect(meta?.accessedAt).toBe(2000000);
    });
  });

  // ===========================================================================
  // Statistics
  // ===========================================================================

  describe('getStats', () => {
    it('should track cache hits', () => {
      cache.setSync('key1', 'value1');
      cache.getSync('key1');
      cache.getSync('key1');

      expect(cache.getStats().hits).toBe(2);
    });

    it('should track cache misses', () => {
      cache.getSync('nonexistent');
      cache.getSync('another');

      expect(cache.getStats().misses).toBe(2);
    });

    it('should track stale hits', () => {
      cache.setSync('key1', 'value1', { staleAfter: 1000, ttl: 5000 });

      vi.advanceTimersByTime(1001);
      cache.getSync('key1');
      cache.getSync('key1');

      const stats = cache.getStats();
      expect(stats.staleHits).toBe(2);
      expect(stats.hits).toBe(0);
    });

    it('should track expired entries as misses', () => {
      cache.setSync('key1', 'value1', { ttl: 1000 });

      vi.advanceTimersByTime(1001);
      cache.getSync('key1');

      expect(cache.getStats().misses).toBe(1);
    });

    it('should track current size', () => {
      cache.setSync('key1', 'value1');
      cache.setSync('key2', 'value2');

      expect(cache.getStats().size).toBe(2);

      cache.deleteSync('key1');

      expect(cache.getStats().size).toBe(1);
    });

    it('should return complete stats object', () => {
      const stats = cache.getStats();

      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('staleHits');
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('maxSize');
      expect(stats).toHaveProperty('evictions');
      expect(stats).toHaveProperty('invalidations');
    });
  });

  describe('resetStats', () => {
    it('should reset all statistics except size and maxSize', () => {
      cache.setSync('key1', 'value1');
      cache.getSync('key1');
      cache.getSync('nonexistent');

      cache.resetStats();

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.staleHits).toBe(0);
      expect(stats.evictions).toBe(0);
      expect(stats.invalidations).toBe(0);
      // Size should still reflect current state
      expect(stats.size).toBe(1);
      expect(stats.maxSize).toBe(10);
    });
  });

  // ===========================================================================
  // Destroy and Cleanup
  // ===========================================================================

  describe('destroy', () => {
    it('should prevent further operations after destroy', () => {
      cache.destroy();

      expect(() => cache.setSync('key', 'value')).toThrow(CacheError);
      expect(() => cache.getSync('key')).toThrow(CacheError);
      expect(() => cache.has('key')).toThrow(CacheError);
      expect(() => cache.deleteSync('key')).toThrow(CacheError);
      expect(() => cache.keys()).toThrow(CacheError);
      expect(() => cache.getMeta('key')).toThrow(CacheError);
    });

    it('should be idempotent', () => {
      cache.destroy();
      expect(() => cache.destroy()).not.toThrow();
    });

    it('should clear all data', () => {
      cache.setSync('key1', 'value1');
      cache.setSync('key2', 'value2', { tags: ['test'] });

      cache.destroy();

      // Create new cache and verify it's empty
      const newCache = CacheManager.create<string>({ maxSize: 10 });
      expect(newCache.getStats().size).toBe(0);
      newCache.destroy();
    });

    it('should stop cleanup interval', () => {
      const c = CacheManager.create<string>({
        cleanupInterval: 1000,
      });

      c.destroy();

      // Should not throw when cleanup would have run
      vi.advanceTimersByTime(5000);
    });

    it('should prevent async operations after destroy', async () => {
      cache.destroy();

      await expect(cache.get('key')).rejects.toThrow(CacheError);
      await expect(cache.set('key', 'value')).rejects.toThrow(CacheError);
      await expect(cache.delete('key')).rejects.toThrow(CacheError);
      await expect(cache.invalidateByPattern(/test/)).rejects.toThrow(CacheError);
      await expect(cache.invalidateByTag('test')).rejects.toThrow(CacheError);
      await expect(cache.clear()).rejects.toThrow(CacheError);
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('edge cases', () => {
    it('should handle undefined and null values', () => {
      const c = CacheManager.create<string | undefined | null>();

      c.setSync('undefined', undefined);
      c.setSync('null', null);

      expect(c.getSync('undefined')?.value).toBeUndefined();
      expect(c.getSync('null')?.value).toBeNull();

      c.destroy();
    });

    it('should handle complex objects', () => {
      interface ComplexData {
        id: number;
        nested: {
          value: string;
          array: number[];
        };
        date: Date;
      }

      const c = CacheManager.create<ComplexData>();

      const data: ComplexData = {
        id: 1,
        nested: {
          value: 'test',
          array: [1, 2, 3],
        },
        date: new Date('2024-01-01'),
      };

      c.setSync('complex', data);

      const result = c.getSync('complex');
      expect(result?.value).toEqual(data);

      c.destroy();
    });

    it('should handle rapid set/get operations', () => {
      for (let i = 0; i < 100; i++) {
        cache.setSync(`key${i}`, `value${i}`);
      }

      // Due to maxSize of 10, only last 10 should remain
      expect(cache.getStats().size).toBe(10);
      expect(cache.getStats().evictions).toBe(90);
    });

    it('should deduplicate concurrent stale-while-revalidate for same key', async () => {
      const revalidateFn = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return 'fresh';
      });

      cache.setSync('key1', 'initial', { staleAfter: 100, ttl: 10000 });

      vi.advanceTimersByTime(101);

      // Trigger multiple concurrent revalidations for the same key
      const promises = [
        cache.get('key1', { staleWhileRevalidate: true, revalidate: revalidateFn }),
        cache.get('key1', { staleWhileRevalidate: true, revalidate: revalidateFn }),
        cache.get('key1', { staleWhileRevalidate: true, revalidate: revalidateFn }),
      ];

      const results = await Promise.all(promises);

      // All should return stale value
      results.forEach((result) => {
        expect(result?.isStale).toBe(true);
      });

      // Only one revalidation should have been triggered (stampede protection)
      await vi.runAllTimersAsync();
      expect(revalidateFn).toHaveBeenCalledTimes(1);
    });

    it('should allow new revalidation after previous one completes', async () => {
      const staleCache = CacheManager.create<string>({
        maxSize: 10,
        defaultStaleAfter: 100,
        defaultTtl: 10000,
      });

      const revalidateFn = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return 'fresh';
      });

      staleCache.setSync('key1', 'initial');

      vi.advanceTimersByTime(101);

      // First revalidation
      await staleCache.get('key1', { staleWhileRevalidate: true, revalidate: revalidateFn });
      await vi.runAllTimersAsync();
      expect(revalidateFn).toHaveBeenCalledTimes(1);

      // Make entry stale again (defaultStaleAfter applies to revalidated entry)
      vi.advanceTimersByTime(101);

      // Second revalidation should be allowed
      await staleCache.get('key1', { staleWhileRevalidate: true, revalidate: revalidateFn });
      await vi.runAllTimersAsync();
      expect(revalidateFn).toHaveBeenCalledTimes(2);

      staleCache.destroy();
    });

    it('should handle entry replacement with different tags', async () => {
      cache.setSync('key1', 'value1', { tags: ['tag1', 'tag2'] });
      cache.setSync('key1', 'value2', { tags: ['tag3'] });

      // Old tags should not be associated anymore
      const count1 = await cache.invalidateByTag('tag1');
      expect(count1).toBe(0);

      // New tag should work
      const count2 = await cache.invalidateByTag('tag3');
      expect(count2).toBe(1);
    });

    it('should track stats correctly during async get with miss', async () => {
      const result = await cache.get('nonexistent');
      expect(result).toBeUndefined();
      expect(cache.getStats().misses).toBe(1);
    });

    it('should handle expired entry during async get', async () => {
      cache.setSync('key1', 'value1', { ttl: 1000 });

      vi.advanceTimersByTime(1001);

      const result = await cache.get('key1');
      expect(result).toBeUndefined();
      expect(cache.getStats().misses).toBe(1);
    });

    it('should reject async get with invalid key', async () => {
      await expect(cache.get('')).rejects.toThrow();
    });

    it('should reject async set with invalid key', async () => {
      await expect(cache.set('', 'value')).rejects.toThrow();
    });

    it('should reject async delete with invalid key', async () => {
      await expect(cache.delete('')).rejects.toThrow();
    });
  });

  describe('createResult', () => {
    it('should return Result.err with CacheError for non-CacheError exception', () => {
      const spy = vi.spyOn(CacheManager, 'create').mockImplementation(() => {
        throw new TypeError('unexpected error');
      });

      const result = CacheManager.createResult({ maxSize: 10 });

      expect(Result.isErr(result)).toBe(true);
      if (Result.isErr(result)) {
        expect(result.error).toBeInstanceOf(CacheError);
      }

      spy.mockRestore();
    });
  });
});
