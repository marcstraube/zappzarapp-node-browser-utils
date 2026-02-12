import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryStorage } from '../../src/storage/index.js';

describe('MemoryStorage', () => {
  let storage: MemoryStorage<unknown>;

  beforeEach(() => {
    storage = new MemoryStorage(10);
  });

  describe('basic operations', () => {
    it('should set and get entries', () => {
      storage.set('key', 'value');

      const entry = storage.get('key');
      expect(entry?.data).toBe('value');
    });

    it('should return undefined for non-existent key', () => {
      expect(storage.get('missing')).toBeUndefined();
    });

    it('should check if key exists', () => {
      storage.set('key', 'value');

      expect(storage.has('key')).toBe(true);
      expect(storage.has('missing')).toBe(false);
    });

    it('should delete entries', () => {
      storage.set('key', 'value');

      expect(storage.delete('key')).toBe(true);
      expect(storage.has('key')).toBe(false);
    });

    it('should return false when deleting non-existent key', () => {
      expect(storage.delete('missing')).toBe(false);
    });

    it('should store entries with timestamp', () => {
      const before = Date.now();
      storage.set('key', 'value');
      const after = Date.now();

      const entry = storage.get('key');
      expect(entry?.timestamp).toBeGreaterThanOrEqual(before);
      expect(entry?.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('keys', () => {
    it('should return all keys', () => {
      storage.set('a', 1);
      storage.set('b', 2);
      storage.set('c', 3);

      const keys = storage.keys();
      expect(keys).toHaveLength(3);
      expect(keys).toContain('a');
      expect(keys).toContain('b');
      expect(keys).toContain('c');
    });

    it('should return empty array for empty storage', () => {
      expect(storage.keys()).toEqual([]);
    });
  });

  describe('entries', () => {
    it('should return all entries sorted by timestamp (newest first)', () => {
      vi.useFakeTimers();
      vi.setSystemTime(1000);
      storage.set('old', 'old');
      vi.setSystemTime(2000);
      storage.set('mid', 'mid');
      vi.setSystemTime(3000);
      storage.set('new', 'new');
      vi.useRealTimers();

      const entries = storage.entries();
      expect(entries[0]?.key).toBe('new');
      expect(entries[1]?.key).toBe('mid');
      expect(entries[2]?.key).toBe('old');
    });

    it('should return empty array for empty storage', () => {
      expect(storage.entries()).toEqual([]);
    });
  });

  describe('size', () => {
    it('should return number of entries', () => {
      expect(storage.size).toBe(0);

      storage.set('a', 1);
      expect(storage.size).toBe(1);

      storage.set('b', 2);
      expect(storage.size).toBe(2);
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      storage.set('a', 1);
      storage.set('b', 2);

      storage.clear();

      expect(storage.size).toBe(0);
      expect(storage.has('a')).toBe(false);
      expect(storage.has('b')).toBe(false);
    });
  });

  describe('LRU eviction', () => {
    it('should enforce max entries limit', () => {
      const smallStorage = new MemoryStorage<number>(3);

      vi.useFakeTimers();
      vi.setSystemTime(1000);
      smallStorage.set('a', 1);
      vi.setSystemTime(2000);
      smallStorage.set('b', 2);
      vi.setSystemTime(3000);
      smallStorage.set('c', 3);
      vi.setSystemTime(4000);
      smallStorage.set('d', 4);
      vi.useRealTimers();

      expect(smallStorage.size).toBe(3);
      expect(smallStorage.has('a')).toBe(false);
      expect(smallStorage.has('b')).toBe(true);
      expect(smallStorage.has('c')).toBe(true);
      expect(smallStorage.has('d')).toBe(true);
    });
  });

  describe('evictOldest', () => {
    it('should evict oldest entries keeping minKeep newest', () => {
      vi.useFakeTimers();
      vi.setSystemTime(1000);
      storage.set('oldest', 1);
      vi.setSystemTime(2000);
      storage.set('old', 2);
      vi.setSystemTime(3000);
      storage.set('mid', 3);
      vi.setSystemTime(4000);
      storage.set('recent', 4);
      vi.setSystemTime(5000);
      storage.set('newest', 5);
      vi.useRealTimers();

      const evictedCount = storage.evictOldest(2);

      expect(evictedCount).toBe(3);
      expect(storage.size).toBe(2);
      expect(storage.has('newest')).toBe(true);
      expect(storage.has('recent')).toBe(true);
      expect(storage.has('mid')).toBe(false);
      expect(storage.has('old')).toBe(false);
      expect(storage.has('oldest')).toBe(false);
    });

    it('should return 0 when size is less than or equal to minKeep', () => {
      storage.set('a', 1);
      storage.set('b', 2);

      const evictedCount = storage.evictOldest(5);

      expect(evictedCount).toBe(0);
      expect(storage.size).toBe(2);
    });

    it('should return 0 when storage is empty', () => {
      const evictedCount = storage.evictOldest(5);

      expect(evictedCount).toBe(0);
    });

    it('should evict all when minKeep is 0', () => {
      storage.set('a', 1);
      storage.set('b', 2);
      storage.set('c', 3);

      const evictedCount = storage.evictOldest(0);

      expect(evictedCount).toBe(3);
      expect(storage.size).toBe(0);
    });
  });
});
