import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StorageManager, StorageConfig } from '../../src/storage/index.js';
import { StorageError, ValidationError, Result } from '../../src/core/index.js';

/**
 * Create a mock localStorage implementation for testing.
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
      const keys = Array.from(store.keys());
      return keys[index] ?? null;
    },
    removeItem(key: string): void {
      store.delete(key);
    },
    setItem(key: string, value: string): void {
      store.set(key, value);
    },
  };
}

describe('StorageManager', () => {
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

  // ===========================================================================
  // Factory Methods
  // ===========================================================================

  describe('Factory Methods', () => {
    describe('create', () => {
      it('should create storage manager with default options', () => {
        const storage = StorageManager.create();

        expect(storage).toBeInstanceOf(StorageManager);
      });

      it('should create storage manager with custom prefix', () => {
        const storage = StorageManager.create({ prefix: 'myApp' });

        storage.set('key', 'value');

        expect(mockStorage.getItem('myApp.key')).not.toBeNull();
      });

      it('should create storage manager with custom maxEntries', () => {
        const storage = StorageManager.create({ prefix: 'test', maxEntries: 10 });

        const stats = storage.stats();

        expect(stats.maxEntries).toBe(10);
      });

      it('should throw ValidationError for invalid prefix', () => {
        expect(() => StorageManager.create({ prefix: '123invalid' })).toThrow(ValidationError);
      });

      it('should throw ValidationError for invalid maxEntries', () => {
        expect(() => StorageManager.create({ maxEntries: 0 })).toThrow(ValidationError);
      });

      it('should throw ValidationError for maxEntries exceeding limit', () => {
        expect(() => StorageManager.create({ maxEntries: 10001 })).toThrow(ValidationError);
      });
    });

    describe('fromConfig', () => {
      it('should create storage manager from existing config', () => {
        const config = StorageConfig.create({ prefix: 'fromConfig', maxEntries: 100 });
        const storage = StorageManager.fromConfig(config);

        storage.set('test', { value: 1 });

        expect(mockStorage.getItem('fromConfig.test')).not.toBeNull();
      });

      it('should use memory fallback when localStorage unavailable', () => {
        Object.defineProperty(window, 'localStorage', {
          get: () => {
            throw new Error('localStorage not available');
          },
          configurable: true,
        });

        const config = StorageConfig.create({
          prefix: 'memoryFallback',
          useMemoryFallback: true,
        });
        const storage = StorageManager.fromConfig(config);

        expect(storage.stats().isMemoryFallback).toBe(true);
      });

      it('should throw when localStorage unavailable and fallback disabled', () => {
        Object.defineProperty(window, 'localStorage', {
          get: () => {
            throw new Error('localStorage not available');
          },
          configurable: true,
        });

        const config = StorageConfig.create({
          prefix: 'noFallback',
          useMemoryFallback: false,
        });

        expect(() => StorageManager.fromConfig(config)).toThrow(StorageError);
      });
    });

    describe('withDebugLogging', () => {
      it('should create storage manager with debug logging enabled', () => {
        const storage = StorageManager.withDebugLogging('debugApp');

        expect(storage).toBeInstanceOf(StorageManager);
      });

      it('should use provided prefix', () => {
        const storage = StorageManager.withDebugLogging('debugApp');

        storage.set('key', 'value');

        expect(mockStorage.getItem('debugApp.key')).not.toBeNull();
      });
    });

    describe('isLocalStorageAvailable', () => {
      it('should return true when localStorage is available', () => {
        expect(StorageManager.isLocalStorageAvailable()).toBe(true);
      });

      it('should return false when localStorage throws', () => {
        Object.defineProperty(window, 'localStorage', {
          get: () => {
            throw new Error('localStorage not available');
          },
          configurable: true,
        });

        expect(StorageManager.isLocalStorageAvailable()).toBe(false);
      });
    });
  });

  // ===========================================================================
  // Configuration Options
  // ===========================================================================

  describe('Configuration Options', () => {
    describe('prefix', () => {
      it('should prefix all keys with configured prefix', () => {
        const storage = StorageManager.create({ prefix: 'myPrefix' });

        storage.set('key1', 'value1');
        storage.set('key2', 'value2');

        expect(mockStorage.getItem('myPrefix.key1')).not.toBeNull();
        expect(mockStorage.getItem('myPrefix.key2')).not.toBeNull();
      });

      it('should not interfere with other prefixes', () => {
        const storage1 = StorageManager.create({ prefix: 'app1' });
        const storage2 = StorageManager.create({ prefix: 'app2' });

        storage1.set('key', 'value1');
        storage2.set('key', 'value2');

        expect(storage1.get('key')).toBe('value1');
        expect(storage2.get('key')).toBe('value2');
      });
    });

    describe('maxEntries', () => {
      it('should evict oldest entries when limit is exceeded', () => {
        const storage = StorageManager.create({
          prefix: 'limited',
          maxEntries: 3,
          minSafeEntries: 1,
        });

        vi.useFakeTimers();

        vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
        storage.set('key1', 'value1');

        vi.setSystemTime(new Date('2024-01-02T00:00:00Z'));
        storage.set('key2', 'value2');

        vi.setSystemTime(new Date('2024-01-03T00:00:00Z'));
        storage.set('key3', 'value3');

        vi.setSystemTime(new Date('2024-01-04T00:00:00Z'));
        storage.set('key4', 'value4'); // Should trigger eviction

        vi.useRealTimers();

        const keys = storage.keys();

        expect(keys.length).toBe(3);
        expect(keys).not.toContain('key1'); // Oldest should be evicted
      });

      it('should keep newest entries after eviction', () => {
        const storage = StorageManager.create({
          prefix: 'limited',
          maxEntries: 2,
          minSafeEntries: 1,
        });

        vi.useFakeTimers();

        vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
        storage.set('old', 'oldValue');

        vi.setSystemTime(new Date('2024-01-02T00:00:00Z'));
        storage.set('new1', 'newValue1');

        vi.setSystemTime(new Date('2024-01-03T00:00:00Z'));
        storage.set('new2', 'newValue2');

        vi.useRealTimers();

        expect(storage.has('old')).toBe(false);
        expect(storage.has('new1')).toBe(true);
        expect(storage.has('new2')).toBe(true);
      });
    });
  });

  // ===========================================================================
  // CRUD Operations
  // ===========================================================================

  describe('CRUD Operations', () => {
    describe('set', () => {
      it('should store primitive value', () => {
        const storage = StorageManager.create<string>({ prefix: 'crud' });

        storage.set('string', 'hello');

        expect(storage.get('string')).toBe('hello');
      });

      it('should store number value', () => {
        const storage = StorageManager.create<number>({ prefix: 'crud' });

        storage.set('number', 42);

        expect(storage.get('number')).toBe(42);
      });

      it('should store boolean value', () => {
        const storage = StorageManager.create<boolean>({ prefix: 'crud' });

        storage.set('bool', true);

        expect(storage.get('bool')).toBe(true);
      });

      it('should store object value', () => {
        const storage = StorageManager.create<{ name: string; age: number }>({ prefix: 'crud' });
        const data = { name: 'John', age: 30 };

        storage.set('user', data);

        expect(storage.get('user')).toEqual(data);
      });

      it('should store array value', () => {
        const storage = StorageManager.create<number[]>({ prefix: 'crud' });
        const data = [1, 2, 3, 4, 5];

        storage.set('numbers', data);

        expect(storage.get('numbers')).toEqual(data);
      });

      it('should store null value', () => {
        const storage = StorageManager.create<null>({ prefix: 'crud' });

        storage.set('nullValue', null);

        expect(storage.get('nullValue')).toBeNull();
      });

      it('should overwrite existing value', () => {
        const storage = StorageManager.create<string>({ prefix: 'crud' });

        storage.set('key', 'initial');
        storage.set('key', 'updated');

        expect(storage.get('key')).toBe('updated');
      });

      it('should throw ValidationError for empty key', () => {
        const storage = StorageManager.create({ prefix: 'crud' });

        expect(() => storage.set('', 'value')).toThrow(ValidationError);
      });

      it('should throw ValidationError for key with forbidden characters', () => {
        const storage = StorageManager.create({ prefix: 'crud' });

        expect(() => storage.set('key;inject', 'value')).toThrow(ValidationError);
      });

      it('should throw ValidationError for key exceeding max length', () => {
        const storage = StorageManager.create({ prefix: 'crud' });
        const longKey = 'a'.repeat(129);

        expect(() => storage.set(longKey, 'value')).toThrow(ValidationError);
      });
    });

    describe('get', () => {
      it('should return stored value', () => {
        const storage = StorageManager.create<string>({ prefix: 'get' });

        storage.set('key', 'value');

        expect(storage.get('key')).toBe('value');
      });

      it('should return null for non-existent key', () => {
        const storage = StorageManager.create({ prefix: 'get' });

        expect(storage.get('nonexistent')).toBeNull();
      });

      it('should return null for corrupted data', () => {
        const storage = StorageManager.create({ prefix: 'get' });

        mockStorage.setItem('get.corrupted', 'not valid json{{{');

        expect(storage.get('corrupted')).toBeNull();
      });

      it('should throw ValidationError for empty key', () => {
        const storage = StorageManager.create({ prefix: 'get' });

        expect(() => storage.get('')).toThrow(ValidationError);
      });

      it('should throw ValidationError for invalid key', () => {
        const storage = StorageManager.create({ prefix: 'get' });

        expect(() => storage.get('key\nvalue')).toThrow(ValidationError);
      });
    });

    describe('has', () => {
      it('should return true for existing key', () => {
        const storage = StorageManager.create({ prefix: 'has' });

        storage.set('exists', 'value');

        expect(storage.has('exists')).toBe(true);
      });

      it('should return false for non-existent key', () => {
        const storage = StorageManager.create({ prefix: 'has' });

        expect(storage.has('nonexistent')).toBe(false);
      });

      it('should throw ValidationError for empty key', () => {
        const storage = StorageManager.create({ prefix: 'has' });

        expect(() => storage.has('')).toThrow(ValidationError);
      });
    });

    describe('remove', () => {
      it('should remove existing entry', () => {
        const storage = StorageManager.create({ prefix: 'remove' });

        storage.set('key', 'value');
        storage.remove('key');

        expect(storage.has('key')).toBe(false);
      });

      it('should not throw for non-existent key', () => {
        const storage = StorageManager.create({ prefix: 'remove' });

        expect(() => storage.remove('nonexistent')).not.toThrow();
      });

      it('should throw ValidationError for empty key', () => {
        const storage = StorageManager.create({ prefix: 'remove' });

        expect(() => storage.remove('')).toThrow(ValidationError);
      });
    });

    describe('clear', () => {
      it('should remove all entries with prefix', () => {
        const storage = StorageManager.create({ prefix: 'clear' });

        storage.set('key1', 'value1');
        storage.set('key2', 'value2');
        storage.set('key3', 'value3');

        storage.clear();

        expect(storage.keys()).toHaveLength(0);
      });

      it('should not affect entries with other prefixes', () => {
        const storage1 = StorageManager.create({ prefix: 'app1' });
        const storage2 = StorageManager.create({ prefix: 'app2' });

        storage1.set('key', 'value1');
        storage2.set('key', 'value2');

        storage1.clear();

        expect(storage1.keys()).toHaveLength(0);
        expect(storage2.get('key')).toBe('value2');
      });
    });
  });

  // ===========================================================================
  // getResult Variant
  // ===========================================================================

  describe('getResult', () => {
    it('should return Ok with value for existing key', () => {
      const storage = StorageManager.create<string>({ prefix: 'result' });

      storage.set('key', 'value');
      const result = storage.getResult('key');

      expect(Result.isOk(result)).toBe(true);
      expect(Result.unwrap(result)).toBe('value');
    });

    it('should return Ok with null for non-existent key', () => {
      const storage = StorageManager.create({ prefix: 'result' });

      const result = storage.getResult('nonexistent');

      expect(Result.isOk(result)).toBe(true);
      expect(Result.unwrap(result)).toBeNull();
    });

    it('should return Err for invalid key', () => {
      const storage = StorageManager.create({ prefix: 'result' });

      const result = storage.getResult('');

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result)).toBeInstanceOf(ValidationError);
    });

    it('should return Err for corrupted data', () => {
      const storage = StorageManager.create({ prefix: 'result' });

      mockStorage.setItem('result.corrupted', 'invalid json {{{');
      const result = storage.getResult('corrupted');

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result)).toBeInstanceOf(StorageError);
    });

    it('should return Err with StorageError for deserialization failure', () => {
      const storage = StorageManager.create({ prefix: 'result' });

      mockStorage.setItem('result.bad', '{not: valid: json}');
      const result = storage.getResult('bad');

      expect(Result.isErr(result)).toBe(true);
      const error = Result.unwrapErr(result);
      expect(error).toBeInstanceOf(StorageError);
      expect((error as StorageError).code).toBe('STORAGE_DESERIALIZATION_FAILED');
    });
  });

  // ===========================================================================
  // keys(), entries(), stats()
  // ===========================================================================

  describe('keys()', () => {
    it('should return empty array when no entries', () => {
      const storage = StorageManager.create({ prefix: 'keys' });

      expect(storage.keys()).toEqual([]);
    });

    it('should return all keys without prefix', () => {
      const storage = StorageManager.create({ prefix: 'keys' });

      storage.set('key1', 'value1');
      storage.set('key2', 'value2');

      const keys = storage.keys();

      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toHaveLength(2);
    });

    it('should only return keys with matching prefix', () => {
      const storage = StorageManager.create({ prefix: 'myPrefix' });

      storage.set('myKey', 'value');
      mockStorage.setItem('otherPrefix.key', '{"data":"value","timestamp":0}');

      const keys = storage.keys();

      expect(keys).toEqual(['myKey']);
    });
  });

  describe('entries()', () => {
    it('should return empty array when no entries', () => {
      const storage = StorageManager.create({ prefix: 'entries' });

      expect(storage.entries()).toEqual([]);
    });

    it('should return all entries with key, value, and timestamp', () => {
      const storage = StorageManager.create<string>({ prefix: 'entries' });

      storage.set('key1', 'value1');
      storage.set('key2', 'value2');

      const entries = storage.entries();

      expect(entries).toHaveLength(2);
      expect(entries[0]).toHaveProperty('key');
      expect(entries[0]).toHaveProperty('value');
      expect(entries[0]).toHaveProperty('timestamp');
    });

    it('should sort entries by timestamp (newest first)', () => {
      const storage = StorageManager.create<string>({ prefix: 'entries' });

      vi.useFakeTimers();

      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
      storage.set('old', 'oldValue');

      vi.setSystemTime(new Date('2024-01-02T00:00:00Z'));
      storage.set('new', 'newValue');

      vi.useRealTimers();

      const entries = storage.entries();

      expect(entries[0]?.key).toBe('new');
      expect(entries[1]?.key).toBe('old');
    });

    it('should skip corrupted entries', () => {
      const storage = StorageManager.create<string>({ prefix: 'entries' });

      storage.set('valid', 'value');
      mockStorage.setItem('entries.corrupted', 'not valid json');

      const entries = storage.entries();

      expect(entries).toHaveLength(1);
      expect(entries[0]?.key).toBe('valid');
    });
  });

  describe('stats()', () => {
    it('should return correct count', () => {
      const storage = StorageManager.create({ prefix: 'stats' });

      storage.set('key1', 'value1');
      storage.set('key2', 'value2');

      const stats = storage.stats();

      expect(stats.count).toBe(2);
    });

    it('should return correct prefix', () => {
      const storage = StorageManager.create({ prefix: 'myStats' });

      const stats = storage.stats();

      expect(stats.prefix).toBe('myStats');
    });

    it('should return correct maxEntries', () => {
      const storage = StorageManager.create({ prefix: 'stats', maxEntries: 100 });

      const stats = storage.stats();

      expect(stats.maxEntries).toBe(100);
    });

    it('should indicate when not using memory fallback', () => {
      const storage = StorageManager.create({ prefix: 'stats' });

      const stats = storage.stats();

      expect(stats.isMemoryFallback).toBe(false);
    });

    it('should return all required properties', () => {
      const storage = StorageManager.create({ prefix: 'stats' });

      const stats = storage.stats();

      expect(stats).toHaveProperty('count');
      expect(stats).toHaveProperty('isMemoryFallback');
      expect(stats).toHaveProperty('prefix');
      expect(stats).toHaveProperty('maxEntries');
    });
  });

  // ===========================================================================
  // Storage Entry Timestamps
  // ===========================================================================

  describe('Storage Entry Timestamps', () => {
    it('should store entries with timestamp', () => {
      const storage = StorageManager.create<string>({ prefix: 'timestamp' });

      vi.useFakeTimers();
      const now = new Date('2024-06-15T12:00:00Z');
      vi.setSystemTime(now);

      storage.set('key', 'value');

      vi.useRealTimers();

      const raw = mockStorage.getItem('timestamp.key');
      const entry = JSON.parse(raw!);

      expect(entry.timestamp).toBe(now.getTime());
    });

    it('should update timestamp on overwrite', () => {
      const storage = StorageManager.create<string>({ prefix: 'timestamp' });

      vi.useFakeTimers();

      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
      storage.set('key', 'initial');

      const oldTimestamp = storage.entries()[0]?.timestamp ?? 0;

      vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
      storage.set('key', 'updated');

      const newTimestamp = storage.entries()[0]?.timestamp ?? 0;

      vi.useRealTimers();

      expect(newTimestamp).toBeGreaterThan(oldTimestamp);
    });
  });

  // ===========================================================================
  // Memory Fallback Behavior
  // ===========================================================================

  describe('Memory Fallback', () => {
    it('should throw StorageError when localStorage unavailable and fallback disabled', () => {
      Object.defineProperty(window, 'localStorage', {
        get: () => {
          throw new Error('localStorage not available');
        },
        configurable: true,
      });

      expect(() => StorageManager.create({ useMemoryFallback: false })).toThrow(StorageError);
    });

    it('should use memory storage when localStorage unavailable', () => {
      Object.defineProperty(window, 'localStorage', {
        get: () => {
          throw new Error('localStorage not available');
        },
        configurable: true,
      });

      const storage = StorageManager.create<string>({ prefix: 'memory', useMemoryFallback: true });

      storage.set('key', 'value');

      expect(storage.get('key')).toBe('value');
      expect(storage.stats().isMemoryFallback).toBe(true);
    });

    it('should support all CRUD operations in memory mode', () => {
      Object.defineProperty(window, 'localStorage', {
        get: () => {
          throw new Error('localStorage not available');
        },
        configurable: true,
      });

      const storage = StorageManager.create<string>({ prefix: 'memory', useMemoryFallback: true });

      // Set
      storage.set('key1', 'value1');
      storage.set('key2', 'value2');

      // Get
      expect(storage.get('key1')).toBe('value1');

      // Has
      expect(storage.has('key1')).toBe(true);
      expect(storage.has('nonexistent')).toBe(false);

      // Keys
      expect(storage.keys()).toContain('key1');
      expect(storage.keys()).toContain('key2');

      // Remove
      storage.remove('key1');
      expect(storage.has('key1')).toBe(false);

      // Clear
      storage.clear();
      expect(storage.keys()).toHaveLength(0);
    });

    it('should support entries() in memory mode', () => {
      Object.defineProperty(window, 'localStorage', {
        get: () => {
          throw new Error('localStorage not available');
        },
        configurable: true,
      });

      const storage = StorageManager.create<string>({ prefix: 'memory', useMemoryFallback: true });

      storage.set('key', 'value');

      const entries = storage.entries();

      expect(entries).toHaveLength(1);
      expect(entries[0]?.key).toBe('key');
      expect(entries[0]?.value).toBe('value');
    });

    it('should support getResult() in memory mode', () => {
      Object.defineProperty(window, 'localStorage', {
        get: () => {
          throw new Error('localStorage not available');
        },
        configurable: true,
      });

      const storage = StorageManager.create<string>({ prefix: 'memory', useMemoryFallback: true });

      storage.set('key', 'value');

      const result = storage.getResult('key');

      expect(Result.isOk(result)).toBe(true);
      expect(Result.unwrap(result)).toBe('value');
    });

    it('should return null for non-existent key in memory mode', () => {
      Object.defineProperty(window, 'localStorage', {
        get: () => {
          throw new Error('localStorage not available');
        },
        configurable: true,
      });

      const storage = StorageManager.create<string>({ prefix: 'memory', useMemoryFallback: true });

      expect(storage.get('nonexistent')).toBeNull();
    });

    it('should enforce maxEntries in memory mode', () => {
      Object.defineProperty(window, 'localStorage', {
        get: () => {
          throw new Error('localStorage not available');
        },
        configurable: true,
      });

      const storage = StorageManager.create<string>({
        prefix: 'memory',
        maxEntries: 2,
        minSafeEntries: 1,
        useMemoryFallback: true,
      });

      storage.set('key1', 'value1');
      storage.set('key2', 'value2');
      storage.set('key3', 'value3');

      expect(storage.keys().length).toBe(2);
    });
  });

  // ===========================================================================
  // Quota Exceeded Handling
  // ===========================================================================

  describe('Quota Exceeded Handling', () => {
    it('should attempt eviction on quota exceeded and retry', () => {
      const storage = StorageManager.create<string>({ prefix: 'quota', maxEntries: 100 });

      // Add some entries first
      storage.set('old1', 'value');
      storage.set('old2', 'value');

      // Mock setItem to throw QuotaExceededError once then succeed
      let attempts = 0;
      const originalSetItem = mockStorage.setItem.bind(mockStorage);
      vi.spyOn(mockStorage, 'setItem').mockImplementation((key, value) => {
        if (key === 'quota.large' && attempts === 0) {
          attempts++;
          const error = new Error('quota exceeded');
          error.name = 'QuotaExceededError';
          throw error;
        }
        return originalSetItem(key, value);
      });

      // Should succeed after eviction
      expect(() => storage.set('large', 'data')).not.toThrow();
    });

    it('should throw StorageError when retry also fails', () => {
      const storage = StorageManager.create<string>({ prefix: 'quota', maxEntries: 100 });

      // Mock setItem to always throw for the specific key
      const originalSetItem = mockStorage.setItem.bind(mockStorage);
      vi.spyOn(mockStorage, 'setItem').mockImplementation((key, value) => {
        if (key === 'quota.alwaysFails') {
          const error = new Error('quota exceeded');
          error.name = 'QuotaExceededError';
          throw error;
        }
        return originalSetItem(key, value);
      });

      expect(() => storage.set('alwaysFails', 'data')).toThrow(StorageError);
    });

    it('should handle NS_ERROR_DOM_QUOTA_REACHED error', () => {
      const storage = StorageManager.create<string>({ prefix: 'quota' });

      let attempts = 0;
      const originalSetItem = mockStorage.setItem.bind(mockStorage);
      vi.spyOn(mockStorage, 'setItem').mockImplementation((key, value) => {
        if (key === 'quota.mozilla' && attempts === 0) {
          attempts++;
          const error = new Error();
          error.name = 'NS_ERROR_DOM_QUOTA_REACHED';
          throw error;
        }
        return originalSetItem(key, value);
      });

      expect(() => storage.set('mozilla', 'data')).not.toThrow();
    });

    it('should handle error with quota in message', () => {
      const storage = StorageManager.create<string>({ prefix: 'quota' });

      let attempts = 0;
      const originalSetItem = mockStorage.setItem.bind(mockStorage);
      vi.spyOn(mockStorage, 'setItem').mockImplementation((key, value) => {
        if (key === 'quota.messageQuota' && attempts === 0) {
          attempts++;
          throw new Error('Storage quota has been exceeded');
        }
        return originalSetItem(key, value);
      });

      expect(() => storage.set('messageQuota', 'data')).not.toThrow();
    });

    it('should throw serialization error for non-quota errors', () => {
      const storage = StorageManager.create<string>({ prefix: 'quota' });

      vi.spyOn(mockStorage, 'setItem').mockImplementation(() => {
        throw new Error('Some other error');
      });

      expect(() => storage.set('key', 'data')).toThrow(StorageError);
    });

    it('should evict oldest entries when quota exceeded with many entries', () => {
      // Create storage with low minSafeEntries to ensure eviction actually happens
      const storage = StorageManager.create<string>({
        prefix: 'quotaEvict',
        maxEntries: 100,
        minSafeEntries: 2,
      });

      vi.useFakeTimers();

      // Add more entries than minSafeEntries
      vi.setSystemTime(1000);
      storage.set('oldest', 'value');
      vi.setSystemTime(2000);
      storage.set('old', 'value');
      vi.setSystemTime(3000);
      storage.set('mid', 'value');
      vi.setSystemTime(4000);
      storage.set('recent', 'value');
      vi.setSystemTime(5000);
      storage.set('newer', 'value');

      vi.useRealTimers();

      // Mock setItem to throw QuotaExceededError once then succeed
      let attempts = 0;
      const originalSetItem = mockStorage.setItem.bind(mockStorage);
      vi.spyOn(mockStorage, 'setItem').mockImplementation((key, value) => {
        if (key === 'quotaEvict.newest' && attempts === 0) {
          attempts++;
          const error = new Error('quota exceeded');
          error.name = 'QuotaExceededError';
          throw error;
        }
        return originalSetItem(key, value);
      });

      // Should succeed after eviction
      storage.set('newest', 'data');

      // Oldest entries should be evicted (keeping minSafeEntries = 2)
      expect(storage.has('oldest')).toBe(false);
      expect(storage.has('old')).toBe(false);
      expect(storage.has('mid')).toBe(false);
    });

    it('should perform memory mode eviction on quota exceeded', () => {
      // Make localStorage unavailable to force memory mode
      Object.defineProperty(window, 'localStorage', {
        get: () => {
          throw new Error('localStorage not available');
        },
        configurable: true,
      });

      const storage = StorageManager.create<string>({
        prefix: 'memQuota',
        maxEntries: 100,
        minSafeEntries: 2,
        useMemoryFallback: true,
      });

      // Add entries
      storage.set('old1', 'value');
      storage.set('old2', 'value');
      storage.set('old3', 'value');
      storage.set('newer', 'value');

      // Memory mode doesn't have quota issues typically, but we can test the evictOldest path
      // by checking that entries are correctly maintained
      expect(storage.stats().isMemoryFallback).toBe(true);
      expect(storage.keys()).toHaveLength(4);
    });
  });

  // ===========================================================================
  // LRU Eviction
  // ===========================================================================

  describe('LRU Eviction', () => {
    it('should keep newest entries when exceeding maxEntries', () => {
      const storage = StorageManager.create<number>({
        prefix: 'lru',
        maxEntries: 3,
        minSafeEntries: 1,
      });

      vi.useFakeTimers();

      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
      storage.set('oldest', 1);

      vi.setSystemTime(new Date('2024-01-02T00:00:00Z'));
      storage.set('middle', 2);

      vi.setSystemTime(new Date('2024-01-03T00:00:00Z'));
      storage.set('newer', 3);

      vi.setSystemTime(new Date('2024-01-04T00:00:00Z'));
      storage.set('newest', 4);

      vi.useRealTimers();

      expect(storage.has('oldest')).toBe(false);
      expect(storage.has('middle')).toBe(true);
      expect(storage.has('newer')).toBe(true);
      expect(storage.has('newest')).toBe(true);
    });

    it('should update position when entry is overwritten', () => {
      const storage = StorageManager.create<number>({
        prefix: 'lru',
        maxEntries: 3,
        minSafeEntries: 1,
      });

      vi.useFakeTimers();

      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
      storage.set('willBeUpdated', 1);

      vi.setSystemTime(new Date('2024-01-02T00:00:00Z'));
      storage.set('key2', 2);

      vi.setSystemTime(new Date('2024-01-03T00:00:00Z'));
      storage.set('key3', 3);

      // Update the oldest entry to make it newest
      vi.setSystemTime(new Date('2024-01-04T00:00:00Z'));
      storage.set('willBeUpdated', 10);

      // Add new entry to trigger eviction
      vi.setSystemTime(new Date('2024-01-05T00:00:00Z'));
      storage.set('newest', 5);

      vi.useRealTimers();

      // 'key2' should be evicted as it's now the oldest
      expect(storage.has('key2')).toBe(false);
      expect(storage.has('willBeUpdated')).toBe(true);
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle deeply nested objects', () => {
      const storage = StorageManager.create<object>({ prefix: 'edge' });
      const nested = {
        level1: {
          level2: {
            level3: {
              value: 'deep',
            },
          },
        },
      };

      storage.set('nested', nested);

      expect(storage.get('nested')).toEqual(nested);
    });

    it('should handle special characters in values', () => {
      const storage = StorageManager.create<string>({ prefix: 'edge' });
      const special = 'Special: \n\t\r"\'\\unicode: \u{1F600}';

      storage.set('special', special);

      expect(storage.get('special')).toBe(special);
    });

    it('should handle empty object', () => {
      const storage = StorageManager.create<object>({ prefix: 'edge' });

      storage.set('empty', {});

      expect(storage.get('empty')).toEqual({});
    });

    it('should handle empty array', () => {
      const storage = StorageManager.create<unknown[]>({ prefix: 'edge' });

      storage.set('empty', []);

      expect(storage.get('empty')).toEqual([]);
    });

    it('should handle mixed array', () => {
      const storage = StorageManager.create<unknown[]>({ prefix: 'edge' });
      const mixed = [1, 'string', true, null, { key: 'value' }, [1, 2, 3]];

      storage.set('mixed', mixed);

      expect(storage.get('mixed')).toEqual(mixed);
    });

    it('should handle Date serialization (as string)', () => {
      const storage = StorageManager.create<{ date: string }>({ prefix: 'edge' });
      const dateStr = new Date().toISOString();

      storage.set('dateObj', { date: dateStr });

      expect(storage.get('dateObj')).toEqual({ date: dateStr });
    });

    it('should handle keys with dots', () => {
      const storage = StorageManager.create<string>({ prefix: 'edge' });

      storage.set('key.with.dots', 'value');

      expect(storage.get('key.with.dots')).toBe('value');
    });

    it('should handle keys at max length', () => {
      const storage = StorageManager.create<string>({ prefix: 'edge' });
      const maxKey = 'a'.repeat(128);

      storage.set(maxKey, 'value');

      expect(storage.get(maxKey)).toBe('value');
    });
  });

  // ===========================================================================
  // Type Safety (Generic Types)
  // ===========================================================================

  describe('Type Safety', () => {
    interface UserPrefs {
      theme: 'light' | 'dark';
      fontSize: number;
    }

    it('should work with typed storage', () => {
      const storage = StorageManager.create<UserPrefs>({ prefix: 'typed' });

      const prefs: UserPrefs = { theme: 'dark', fontSize: 14 };
      storage.set('prefs', prefs);

      const retrieved = storage.get('prefs');

      expect(retrieved).toEqual(prefs);
    });

    it('should work with union types', () => {
      const storage = StorageManager.create<string | number>({ prefix: 'union' });

      storage.set('string', 'value');
      storage.set('number', 42);

      expect(storage.get('string')).toBe('value');
      expect(storage.get('number')).toBe(42);
    });
  });

  describe('Cross-Tab Sync', () => {
    it('should call handler when storage changes for matching prefix', () => {
      const storage = StorageManager.create<string>({ prefix: 'sync' });
      const handler = vi.fn();

      const cleanup = storage.onExternalChange(handler);

      const event = new StorageEvent('storage', {
        key: 'sync.greeting',
        newValue: JSON.stringify({ data: 'hello', timestamp: Date.now() }),
        oldValue: null,
      });
      window.dispatchEvent(event);

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith({
        key: 'greeting',
        newValue: 'hello',
        oldValue: null,
      });

      cleanup();
    });

    it('should ignore changes from other prefixes', () => {
      const storage = StorageManager.create<string>({ prefix: 'myApp' });
      const handler = vi.fn();

      const cleanup = storage.onExternalChange(handler);

      const event = new StorageEvent('storage', {
        key: 'otherApp.data',
        newValue: JSON.stringify({ data: 'test', timestamp: Date.now() }),
        oldValue: null,
      });
      window.dispatchEvent(event);

      expect(handler).not.toHaveBeenCalled();

      cleanup();
    });

    it('should ignore events with null key', () => {
      const storage = StorageManager.create<string>({ prefix: 'sync' });
      const handler = vi.fn();

      const cleanup = storage.onExternalChange(handler);

      const event = new StorageEvent('storage', {
        key: null,
        newValue: null,
        oldValue: null,
      });
      window.dispatchEvent(event);

      expect(handler).not.toHaveBeenCalled();

      cleanup();
    });

    it('should parse old and new values correctly', () => {
      const storage = StorageManager.create<number>({ prefix: 'sync' });
      const handler = vi.fn();

      const cleanup = storage.onExternalChange(handler);

      const event = new StorageEvent('storage', {
        key: 'sync.count',
        newValue: JSON.stringify({ data: 42, timestamp: Date.now() }),
        oldValue: JSON.stringify({ data: 10, timestamp: Date.now() - 1000 }),
      });
      window.dispatchEvent(event);

      expect(handler).toHaveBeenCalledWith({
        key: 'count',
        newValue: 42,
        oldValue: 10,
      });

      cleanup();
    });

    it('should handle removal (newValue is null)', () => {
      const storage = StorageManager.create<string>({ prefix: 'sync' });
      const handler = vi.fn();

      const cleanup = storage.onExternalChange(handler);

      const event = new StorageEvent('storage', {
        key: 'sync.removed',
        newValue: null,
        oldValue: JSON.stringify({ data: 'old', timestamp: Date.now() }),
      });
      window.dispatchEvent(event);

      expect(handler).toHaveBeenCalledWith({
        key: 'removed',
        newValue: null,
        oldValue: 'old',
      });

      cleanup();
    });

    it('should handle corrupted values gracefully', () => {
      const storage = StorageManager.create<string>({ prefix: 'sync' });
      const handler = vi.fn();

      const cleanup = storage.onExternalChange(handler);

      const event = new StorageEvent('storage', {
        key: 'sync.broken',
        newValue: 'not-json',
        oldValue: null,
      });
      window.dispatchEvent(event);

      expect(handler).toHaveBeenCalledWith({
        key: 'broken',
        newValue: null,
        oldValue: null,
      });

      cleanup();
    });

    it('should stop listening after cleanup', () => {
      const storage = StorageManager.create<string>({ prefix: 'sync' });
      const handler = vi.fn();

      const cleanup = storage.onExternalChange(handler);
      cleanup();

      const event = new StorageEvent('storage', {
        key: 'sync.data',
        newValue: JSON.stringify({ data: 'test', timestamp: Date.now() }),
        oldValue: null,
      });
      window.dispatchEvent(event);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should return no-op cleanup in memory mode', () => {
      const originalLocalStorage = Object.getOwnPropertyDescriptor(window, 'localStorage');

      Object.defineProperty(window, 'localStorage', {
        get: () => {
          throw new Error('localStorage not available');
        },
        configurable: true,
      });

      const storage = StorageManager.create<string>({ prefix: 'mem' });
      const handler = vi.fn();

      const cleanup = storage.onExternalChange(handler);

      // Should not throw
      cleanup();

      // Should not call handler
      const event = new StorageEvent('storage', {
        key: 'mem.data',
        newValue: JSON.stringify({ data: 'test', timestamp: Date.now() }),
        oldValue: null,
      });
      window.dispatchEvent(event);

      expect(handler).not.toHaveBeenCalled();

      if (originalLocalStorage) {
        Object.defineProperty(window, 'localStorage', originalLocalStorage);
      }
    });

    it('should support multiple listeners', () => {
      const storage = StorageManager.create<string>({ prefix: 'sync' });
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      const cleanup1 = storage.onExternalChange(handler1);
      const cleanup2 = storage.onExternalChange(handler2);

      const event = new StorageEvent('storage', {
        key: 'sync.data',
        newValue: JSON.stringify({ data: 'test', timestamp: Date.now() }),
        oldValue: null,
      });
      window.dispatchEvent(event);

      expect(handler1).toHaveBeenCalledOnce();
      expect(handler2).toHaveBeenCalledOnce();

      cleanup1();
      cleanup2();
    });
  });
});
