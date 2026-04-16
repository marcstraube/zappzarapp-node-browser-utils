import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StorageManager, StorageConfig } from '../../src/storage/index.js';
import { isStorageEntry } from '../../src/storage/BaseStorageManager.js';
import { StorageError, Result } from '../../src/core/index.js';

/**
 * BaseStorageManager is abstract — test through StorageManager (localStorage).
 * These tests focus on base class logic not covered by StorageManager.test.ts:
 * - isStorageEntry type guard
 * - Memory fallback behavior
 * - Quota handling & eviction
 * - Error paths
 */

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

describe('BaseStorageManager', () => {
  let mockStorage: Storage;
  let originalLocalStorage: PropertyDescriptor | undefined;

  beforeEach(() => {
    mockStorage = createMockLocalStorage();
    originalLocalStorage = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      value: mockStorage,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    if (originalLocalStorage) {
      Object.defineProperty(window, 'localStorage', originalLocalStorage);
    }
  });

  describe('isStorageEntry', () => {
    it('should return true for valid entry', () => {
      expect(isStorageEntry({ data: 'hello', timestamp: 123 })).toBe(true);
    });

    it('should return false for null', () => {
      expect(isStorageEntry(null)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isStorageEntry('string')).toBe(false);
      expect(isStorageEntry(42)).toBe(false);
    });

    it('should return false for missing data property', () => {
      expect(isStorageEntry({ timestamp: 123 })).toBe(false);
    });

    it('should return false for missing timestamp', () => {
      expect(isStorageEntry({ data: 'hello' })).toBe(false);
    });

    it('should return false for non-number timestamp', () => {
      expect(isStorageEntry({ data: 'hello', timestamp: 'not-a-number' })).toBe(false);
    });
  });

  describe('memory fallback', () => {
    it('should use memory storage when localStorage is unavailable', () => {
      Object.defineProperty(window, 'localStorage', {
        get: () => {
          throw new Error('unavailable');
        },
        configurable: true,
      });

      const config = StorageConfig.create({ prefix: 'test', useMemoryFallback: true });
      const manager = StorageManager.create(config);

      manager.set('key', 'value');
      expect(manager.get('key')).toBe('value');

      const stats = manager.stats();
      expect(stats.isMemoryFallback).toBe(true);
    });

    it('should throw when fallback disabled and storage unavailable', () => {
      Object.defineProperty(window, 'localStorage', {
        get: () => {
          throw new Error('unavailable');
        },
        configurable: true,
      });

      const config = StorageConfig.create({ prefix: 'test', useMemoryFallback: false });
      expect(() => StorageManager.create(config)).toThrow(StorageError);
    });
  });

  describe('get with corrupted data', () => {
    it('should return null for non-JSON data', () => {
      const config = StorageConfig.create({ prefix: 'test' });
      const manager = StorageManager.create(config);

      mockStorage.setItem('test.broken', 'not-json{{{');
      expect(manager.get('broken')).toBeNull();
    });

    it('should return null for invalid entry structure', () => {
      const config = StorageConfig.create({ prefix: 'test' });
      const manager = StorageManager.create(config);

      mockStorage.setItem('test.bad', JSON.stringify({ wrong: 'shape' }));
      expect(manager.get('bad')).toBeNull();
    });
  });

  describe('getResult', () => {
    it('should return Ok for existing key', () => {
      const config = StorageConfig.create({ prefix: 'test' });
      const manager = StorageManager.create(config);

      manager.set('key', 'value');
      const result = manager.getResult('key');
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toBe('value');
      }
    });

    it('should return Ok(null) for missing key', () => {
      const config = StorageConfig.create({ prefix: 'test' });
      const manager = StorageManager.create(config);

      const result = manager.getResult('missing');
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toBeNull();
      }
    });

    it('should return Err for invalid key', () => {
      const config = StorageConfig.create({ prefix: 'test' });
      const manager = StorageManager.create(config);

      const result = manager.getResult('');
      expect(Result.isErr(result)).toBe(true);
    });

    it('should return Err for corrupted data', () => {
      const config = StorageConfig.create({ prefix: 'test' });
      const manager = StorageManager.create(config);

      mockStorage.setItem('test.corrupt', 'not-json');
      const result = manager.getResult('corrupt');
      expect(Result.isErr(result)).toBe(true);
    });

    it('should return Err for invalid entry structure', () => {
      const config = StorageConfig.create({ prefix: 'test' });
      const manager = StorageManager.create(config);

      mockStorage.setItem('test.bad', JSON.stringify({ no: 'data-field' }));
      const result = manager.getResult('bad');
      expect(Result.isErr(result)).toBe(true);
    });
  });

  describe('entries', () => {
    it('should return entries sorted by timestamp (newest first)', () => {
      vi.useFakeTimers();
      const config = StorageConfig.create({ prefix: 'test' });
      const manager = StorageManager.create(config);

      vi.setSystemTime(new Date('2024-01-01'));
      manager.set('old', 'a');
      vi.setSystemTime(new Date('2024-06-01'));
      manager.set('new', 'b');

      const entries = manager.entries();
      expect(entries[0]!.key).toBe('new');
      expect(entries[1]!.key).toBe('old');
      vi.useRealTimers();
    });

    it('should skip corrupted entries', () => {
      const config = StorageConfig.create({ prefix: 'test' });
      const manager = StorageManager.create(config);

      manager.set('good', 'value');
      mockStorage.setItem('test.bad', 'not-json');

      const entries = manager.entries();
      expect(entries).toHaveLength(1);
      expect(entries[0]!.key).toBe('good');
    });

    it('should skip entries with invalid structure', () => {
      const config = StorageConfig.create({ prefix: 'test' });
      const manager = StorageManager.create(config);

      manager.set('good', 'value');
      mockStorage.setItem('test.bad', JSON.stringify({ no: 'timestamp' }));

      const entries = manager.entries();
      expect(entries).toHaveLength(1);
    });
  });

  describe('enforceLimits', () => {
    it('should evict oldest entries when exceeding maxEntries', () => {
      vi.useFakeTimers();
      const config = StorageConfig.create({ prefix: 'test', maxEntries: 3, minSafeEntries: 1 });
      const manager = StorageManager.create(config);

      vi.setSystemTime(new Date('2024-01-01'));
      manager.set('first', 'a');
      vi.setSystemTime(new Date('2024-02-01'));
      manager.set('second', 'b');
      vi.setSystemTime(new Date('2024-03-01'));
      manager.set('third', 'c');
      vi.setSystemTime(new Date('2024-04-01'));
      manager.set('fourth', 'd');

      const keys = manager.keys();
      expect(keys).toHaveLength(3);
      expect(manager.has('first')).toBe(false);
      vi.useRealTimers();
    });
  });

  describe('quota handling', () => {
    it('should evict and retry on quota exceeded', () => {
      const config = StorageConfig.create({ prefix: 'test', minSafeEntries: 0 });
      const manager = StorageManager.create(config);

      manager.set('existing', 'data');

      // Make setItem throw quota error on first call for the new key
      let callCount = 0;
      const origSetItem = mockStorage.setItem.bind(mockStorage);
      mockStorage.setItem = (key: string, value: string) => {
        if (key === 'test.big' && callCount++ === 0) {
          const err = new DOMException('', 'QuotaExceededError');
          throw err;
        }
        origSetItem(key, value);
      };

      manager.set('big', 'large-data');
      expect(manager.get('big')).toBe('large-data');
    });
  });

  describe('isQuotaError', () => {
    it('should detect QuotaExceededError by name', () => {
      const config = StorageConfig.create({ prefix: 'test', minSafeEntries: 0 });
      const manager = StorageManager.create(config);

      let callCount = 0;
      const origSetItem = mockStorage.setItem.bind(mockStorage);
      mockStorage.setItem = (key: string, value: string) => {
        if (key === 'test.item' && callCount++ === 0) {
          const err = new DOMException('', 'QuotaExceededError');
          throw err;
        }
        origSetItem(key, value);
      };

      manager.set('item', 'val');
      expect(manager.get('item')).toBe('val');
    });

    it('should detect quota error by message', () => {
      const config = StorageConfig.create({ prefix: 'test', minSafeEntries: 0 });
      const manager = StorageManager.create(config);

      let callCount = 0;
      const origSetItem = mockStorage.setItem.bind(mockStorage);
      mockStorage.setItem = (key: string, value: string) => {
        if (key === 'test.item' && callCount++ === 0) {
          throw new Error('Storage quota exceeded');
        }
        origSetItem(key, value);
      };

      manager.set('item', 'val');
      expect(manager.get('item')).toBe('val');
    });

    it('should throw serialization error for non-quota errors', () => {
      const config = StorageConfig.create({ prefix: 'test' });
      const manager = StorageManager.create(config);

      mockStorage.setItem = () => {
        throw new Error('Some other error');
      };

      expect(() => manager.set('key', 'val')).toThrow(StorageError);
    });
  });
});
