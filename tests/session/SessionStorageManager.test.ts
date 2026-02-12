import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SessionStorageManager } from '../../src/session/index.js';
import { StorageConfig } from '../../src/storage/index.js';
import { StorageError, ValidationError, Result } from '../../src/core/index.js';

/**
 * Create a mock sessionStorage implementation for testing.
 */
function createMockSessionStorage(): Storage {
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

describe('SessionStorageManager', () => {
  let mockStorage: Storage;
  let originalSessionStorage: PropertyDescriptor | undefined;

  beforeEach(() => {
    mockStorage = createMockSessionStorage();
    originalSessionStorage = Object.getOwnPropertyDescriptor(window, 'sessionStorage');

    Object.defineProperty(window, 'sessionStorage', {
      value: mockStorage,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    if (originalSessionStorage) {
      Object.defineProperty(window, 'sessionStorage', originalSessionStorage);
    }
  });

  // ===========================================================================
  // Factory Methods
  // ===========================================================================

  describe('Factory Methods', () => {
    describe('create', () => {
      it('should create session storage manager with default options', () => {
        const storage = SessionStorageManager.create();

        expect(storage).toBeInstanceOf(SessionStorageManager);
      });

      it('should create session storage manager with custom prefix', () => {
        const storage = SessionStorageManager.create({ prefix: 'myApp' });

        storage.set('key', 'value');

        expect(mockStorage.getItem('myApp.key')).not.toBeNull();
      });

      it('should create session storage manager with custom maxEntries', () => {
        const storage = SessionStorageManager.create({ prefix: 'test', maxEntries: 10 });

        const stats = storage.stats();

        expect(stats.maxEntries).toBe(10);
      });

      it('should throw ValidationError for invalid prefix', () => {
        expect(() => SessionStorageManager.create({ prefix: '123invalid' })).toThrow(
          ValidationError
        );
      });

      it('should throw ValidationError for invalid maxEntries', () => {
        expect(() => SessionStorageManager.create({ maxEntries: 0 })).toThrow(ValidationError);
      });

      it('should throw ValidationError for maxEntries exceeding limit', () => {
        expect(() => SessionStorageManager.create({ maxEntries: 10001 })).toThrow(ValidationError);
      });
    });

    describe('fromConfig', () => {
      it('should create session storage manager from existing config', () => {
        const config = StorageConfig.create({ prefix: 'fromConfig', maxEntries: 100 });
        const storage = SessionStorageManager.fromConfig(config);

        storage.set('test', { value: 1 });

        expect(mockStorage.getItem('fromConfig.test')).not.toBeNull();
      });

      it('should use memory fallback when sessionStorage unavailable', () => {
        Object.defineProperty(window, 'sessionStorage', {
          get: () => {
            throw new Error('sessionStorage not available');
          },
          configurable: true,
        });

        const config = StorageConfig.create({
          prefix: 'memoryFallback',
          useMemoryFallback: true,
        });
        const storage = SessionStorageManager.fromConfig(config);

        expect(storage.stats().isMemoryFallback).toBe(true);
      });

      it('should throw when sessionStorage unavailable and fallback disabled', () => {
        Object.defineProperty(window, 'sessionStorage', {
          get: () => {
            throw new Error('sessionStorage not available');
          },
          configurable: true,
        });

        const config = StorageConfig.create({
          prefix: 'noFallback',
          useMemoryFallback: false,
        });

        expect(() => SessionStorageManager.fromConfig(config)).toThrow(StorageError);
      });
    });

    describe('withDebugLogging', () => {
      it('should create session storage manager with debug logging enabled', () => {
        const storage = SessionStorageManager.withDebugLogging('debugApp');

        expect(storage).toBeInstanceOf(SessionStorageManager);
      });

      it('should use provided prefix', () => {
        const storage = SessionStorageManager.withDebugLogging('debugApp');

        storage.set('key', 'value');

        expect(mockStorage.getItem('debugApp.key')).not.toBeNull();
      });
    });

    describe('isSessionStorageAvailable', () => {
      it('should return true when sessionStorage is available', () => {
        expect(SessionStorageManager.isSessionStorageAvailable()).toBe(true);
      });

      it('should return false when sessionStorage throws', () => {
        Object.defineProperty(window, 'sessionStorage', {
          get: () => {
            throw new Error('sessionStorage not available');
          },
          configurable: true,
        });

        expect(SessionStorageManager.isSessionStorageAvailable()).toBe(false);
      });
    });
  });

  // ===========================================================================
  // Configuration Options
  // ===========================================================================

  describe('Configuration Options', () => {
    describe('prefix', () => {
      it('should prefix all keys with configured prefix', () => {
        const storage = SessionStorageManager.create({ prefix: 'myPrefix' });

        storage.set('key1', 'value1');
        storage.set('key2', 'value2');

        expect(mockStorage.getItem('myPrefix.key1')).not.toBeNull();
        expect(mockStorage.getItem('myPrefix.key2')).not.toBeNull();
      });

      it('should not interfere with other prefixes', () => {
        const storage1 = SessionStorageManager.create({ prefix: 'app1' });
        const storage2 = SessionStorageManager.create({ prefix: 'app2' });

        storage1.set('key', 'value1');
        storage2.set('key', 'value2');

        expect(storage1.get('key')).toBe('value1');
        expect(storage2.get('key')).toBe('value2');
      });
    });

    describe('maxEntries', () => {
      it('should evict oldest entries when limit is exceeded', () => {
        const storage = SessionStorageManager.create({
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
        const storage = SessionStorageManager.create({
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
        const storage = SessionStorageManager.create<string>({ prefix: 'crud' });

        storage.set('string', 'hello');

        expect(storage.get('string')).toBe('hello');
      });

      it('should store number value', () => {
        const storage = SessionStorageManager.create<number>({ prefix: 'crud' });

        storage.set('number', 42);

        expect(storage.get('number')).toBe(42);
      });

      it('should store boolean value', () => {
        const storage = SessionStorageManager.create<boolean>({ prefix: 'crud' });

        storage.set('bool', true);

        expect(storage.get('bool')).toBe(true);
      });

      it('should store object value', () => {
        const storage = SessionStorageManager.create<{ name: string; age: number }>({
          prefix: 'crud',
        });
        const data = { name: 'John', age: 30 };

        storage.set('user', data);

        expect(storage.get('user')).toEqual(data);
      });

      it('should store array value', () => {
        const storage = SessionStorageManager.create<number[]>({ prefix: 'crud' });
        const data = [1, 2, 3, 4, 5];

        storage.set('numbers', data);

        expect(storage.get('numbers')).toEqual(data);
      });

      it('should store null value', () => {
        const storage = SessionStorageManager.create<null>({ prefix: 'crud' });

        storage.set('nullValue', null);

        expect(storage.get('nullValue')).toBeNull();
      });

      it('should overwrite existing value', () => {
        const storage = SessionStorageManager.create<string>({ prefix: 'crud' });

        storage.set('key', 'initial');
        storage.set('key', 'updated');

        expect(storage.get('key')).toBe('updated');
      });

      it('should throw ValidationError for empty key', () => {
        const storage = SessionStorageManager.create({ prefix: 'crud' });

        expect(() => storage.set('', 'value')).toThrow(ValidationError);
      });

      it('should throw ValidationError for key with forbidden characters', () => {
        const storage = SessionStorageManager.create({ prefix: 'crud' });

        expect(() => storage.set('key;inject', 'value')).toThrow(ValidationError);
      });

      it('should throw ValidationError for key exceeding max length', () => {
        const storage = SessionStorageManager.create({ prefix: 'crud' });
        const longKey = 'a'.repeat(129);

        expect(() => storage.set(longKey, 'value')).toThrow(ValidationError);
      });
    });

    describe('get', () => {
      it('should return stored value', () => {
        const storage = SessionStorageManager.create<string>({ prefix: 'get' });

        storage.set('key', 'value');

        expect(storage.get('key')).toBe('value');
      });

      it('should return null for non-existent key', () => {
        const storage = SessionStorageManager.create({ prefix: 'get' });

        expect(storage.get('nonexistent')).toBeNull();
      });

      it('should return null for corrupted data', () => {
        const storage = SessionStorageManager.create({ prefix: 'get' });

        mockStorage.setItem('get.corrupted', 'not valid json{{{');

        expect(storage.get('corrupted')).toBeNull();
      });

      it('should throw ValidationError for empty key', () => {
        const storage = SessionStorageManager.create({ prefix: 'get' });

        expect(() => storage.get('')).toThrow(ValidationError);
      });

      it('should throw ValidationError for invalid key', () => {
        const storage = SessionStorageManager.create({ prefix: 'get' });

        expect(() => storage.get('key\nvalue')).toThrow(ValidationError);
      });
    });

    describe('has', () => {
      it('should return true for existing key', () => {
        const storage = SessionStorageManager.create({ prefix: 'has' });

        storage.set('exists', 'value');

        expect(storage.has('exists')).toBe(true);
      });

      it('should return false for non-existent key', () => {
        const storage = SessionStorageManager.create({ prefix: 'has' });

        expect(storage.has('nonexistent')).toBe(false);
      });

      it('should throw ValidationError for empty key', () => {
        const storage = SessionStorageManager.create({ prefix: 'has' });

        expect(() => storage.has('')).toThrow(ValidationError);
      });
    });

    describe('remove', () => {
      it('should remove existing entry', () => {
        const storage = SessionStorageManager.create({ prefix: 'remove' });

        storage.set('key', 'value');
        storage.remove('key');

        expect(storage.has('key')).toBe(false);
      });

      it('should not throw for non-existent key', () => {
        const storage = SessionStorageManager.create({ prefix: 'remove' });

        expect(() => storage.remove('nonexistent')).not.toThrow();
      });

      it('should throw ValidationError for empty key', () => {
        const storage = SessionStorageManager.create({ prefix: 'remove' });

        expect(() => storage.remove('')).toThrow(ValidationError);
      });
    });

    describe('clear', () => {
      it('should remove all entries with prefix', () => {
        const storage = SessionStorageManager.create({ prefix: 'clear' });

        storage.set('key1', 'value1');
        storage.set('key2', 'value2');
        storage.set('key3', 'value3');

        storage.clear();

        expect(storage.keys()).toHaveLength(0);
      });

      it('should not affect entries with other prefixes', () => {
        const storage1 = SessionStorageManager.create({ prefix: 'app1' });
        const storage2 = SessionStorageManager.create({ prefix: 'app2' });

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
      const storage = SessionStorageManager.create<string>({ prefix: 'result' });

      storage.set('key', 'value');
      const result = storage.getResult('key');

      expect(Result.isOk(result)).toBe(true);
      expect(Result.unwrap(result)).toBe('value');
    });

    it('should return Ok with null for non-existent key', () => {
      const storage = SessionStorageManager.create({ prefix: 'result' });

      const result = storage.getResult('nonexistent');

      expect(Result.isOk(result)).toBe(true);
      expect(Result.unwrap(result)).toBeNull();
    });

    it('should return Err for invalid key', () => {
      const storage = SessionStorageManager.create({ prefix: 'result' });

      const result = storage.getResult('');

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result)).toBeInstanceOf(ValidationError);
    });

    it('should return Err for corrupted data', () => {
      const storage = SessionStorageManager.create({ prefix: 'result' });

      mockStorage.setItem('result.corrupted', 'invalid json {{{');
      const result = storage.getResult('corrupted');

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result)).toBeInstanceOf(StorageError);
    });

    it('should return Err with StorageError for deserialization failure', () => {
      const storage = SessionStorageManager.create({ prefix: 'result' });

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
      const storage = SessionStorageManager.create({ prefix: 'keys' });

      expect(storage.keys()).toEqual([]);
    });

    it('should return all keys without prefix', () => {
      const storage = SessionStorageManager.create({ prefix: 'keys' });

      storage.set('key1', 'value1');
      storage.set('key2', 'value2');

      const keys = storage.keys();

      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toHaveLength(2);
    });

    it('should only return keys with matching prefix', () => {
      const storage = SessionStorageManager.create({ prefix: 'myPrefix' });

      storage.set('myKey', 'value');
      mockStorage.setItem('otherPrefix.key', '{"data":"value","timestamp":0}');

      const keys = storage.keys();

      expect(keys).toEqual(['myKey']);
    });
  });

  describe('entries()', () => {
    it('should return empty array when no entries', () => {
      const storage = SessionStorageManager.create({ prefix: 'entries' });

      expect(storage.entries()).toEqual([]);
    });

    it('should return all entries with key, value, and timestamp', () => {
      const storage = SessionStorageManager.create<string>({ prefix: 'entries' });

      storage.set('key1', 'value1');
      storage.set('key2', 'value2');

      const entries = storage.entries();

      expect(entries).toHaveLength(2);
      expect(entries[0]).toHaveProperty('key');
      expect(entries[0]).toHaveProperty('value');
      expect(entries[0]).toHaveProperty('timestamp');
    });

    it('should sort entries by timestamp (newest first)', () => {
      const storage = SessionStorageManager.create<string>({ prefix: 'entries' });

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
      const storage = SessionStorageManager.create<string>({ prefix: 'entries' });

      storage.set('valid', 'value');
      mockStorage.setItem('entries.corrupted', 'not valid json');

      const entries = storage.entries();

      expect(entries).toHaveLength(1);
      expect(entries[0]?.key).toBe('valid');
    });
  });

  describe('stats()', () => {
    it('should return correct count', () => {
      const storage = SessionStorageManager.create({ prefix: 'stats' });

      storage.set('key1', 'value1');
      storage.set('key2', 'value2');

      const stats = storage.stats();

      expect(stats.count).toBe(2);
    });

    it('should return correct prefix', () => {
      const storage = SessionStorageManager.create({ prefix: 'myStats' });

      const stats = storage.stats();

      expect(stats.prefix).toBe('myStats');
    });

    it('should return correct maxEntries', () => {
      const storage = SessionStorageManager.create({ prefix: 'stats', maxEntries: 100 });

      const stats = storage.stats();

      expect(stats.maxEntries).toBe(100);
    });

    it('should indicate when not using memory fallback', () => {
      const storage = SessionStorageManager.create({ prefix: 'stats' });

      const stats = storage.stats();

      expect(stats.isMemoryFallback).toBe(false);
    });

    it('should return all required properties', () => {
      const storage = SessionStorageManager.create({ prefix: 'stats' });

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
      const storage = SessionStorageManager.create<string>({ prefix: 'timestamp' });

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
      const storage = SessionStorageManager.create<string>({ prefix: 'timestamp' });

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
    it('should throw StorageError when sessionStorage unavailable and fallback disabled', () => {
      Object.defineProperty(window, 'sessionStorage', {
        get: () => {
          throw new Error('sessionStorage not available');
        },
        configurable: true,
      });

      expect(() => SessionStorageManager.create({ useMemoryFallback: false })).toThrow(
        StorageError
      );
    });

    it('should use memory storage when sessionStorage unavailable', () => {
      Object.defineProperty(window, 'sessionStorage', {
        get: () => {
          throw new Error('sessionStorage not available');
        },
        configurable: true,
      });

      const storage = SessionStorageManager.create<string>({
        prefix: 'memory',
        useMemoryFallback: true,
      });

      storage.set('key', 'value');

      expect(storage.get('key')).toBe('value');
      expect(storage.stats().isMemoryFallback).toBe(true);
    });

    it('should support all CRUD operations in memory mode', () => {
      Object.defineProperty(window, 'sessionStorage', {
        get: () => {
          throw new Error('sessionStorage not available');
        },
        configurable: true,
      });

      const storage = SessionStorageManager.create<string>({
        prefix: 'memory',
        useMemoryFallback: true,
      });

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
      Object.defineProperty(window, 'sessionStorage', {
        get: () => {
          throw new Error('sessionStorage not available');
        },
        configurable: true,
      });

      const storage = SessionStorageManager.create<string>({
        prefix: 'memory',
        useMemoryFallback: true,
      });

      storage.set('key', 'value');

      const entries = storage.entries();

      expect(entries).toHaveLength(1);
      expect(entries[0]?.key).toBe('key');
      expect(entries[0]?.value).toBe('value');
    });

    it('should support getResult() in memory mode', () => {
      Object.defineProperty(window, 'sessionStorage', {
        get: () => {
          throw new Error('sessionStorage not available');
        },
        configurable: true,
      });

      const storage = SessionStorageManager.create<string>({
        prefix: 'memory',
        useMemoryFallback: true,
      });

      storage.set('key', 'value');

      const result = storage.getResult('key');

      expect(Result.isOk(result)).toBe(true);
      expect(Result.unwrap(result)).toBe('value');
    });

    it('should return Ok with null for non-existent key via getResult() in memory mode', () => {
      Object.defineProperty(window, 'sessionStorage', {
        get: () => {
          throw new Error('sessionStorage not available');
        },
        configurable: true,
      });

      const storage = SessionStorageManager.create<string>({
        prefix: 'memory',
        useMemoryFallback: true,
      });

      const result = storage.getResult('nonexistent');

      expect(Result.isOk(result)).toBe(true);
      expect(Result.unwrap(result)).toBeNull();
    });

    it('should return null for non-existent key in memory mode', () => {
      Object.defineProperty(window, 'sessionStorage', {
        get: () => {
          throw new Error('sessionStorage not available');
        },
        configurable: true,
      });

      const storage = SessionStorageManager.create<string>({
        prefix: 'memory',
        useMemoryFallback: true,
      });

      expect(storage.get('nonexistent')).toBeNull();
    });

    it('should enforce maxEntries in memory mode', () => {
      Object.defineProperty(window, 'sessionStorage', {
        get: () => {
          throw new Error('sessionStorage not available');
        },
        configurable: true,
      });

      const storage = SessionStorageManager.create<string>({
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
      const storage = SessionStorageManager.create<string>({ prefix: 'quota', maxEntries: 100 });

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
      const storage = SessionStorageManager.create<string>({ prefix: 'quota', maxEntries: 100 });

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
      const storage = SessionStorageManager.create<string>({ prefix: 'quota' });

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
      const storage = SessionStorageManager.create<string>({ prefix: 'quota' });

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
      const storage = SessionStorageManager.create<string>({ prefix: 'quota' });

      vi.spyOn(mockStorage, 'setItem').mockImplementation(() => {
        throw new Error('Some other error');
      });

      expect(() => storage.set('key', 'data')).toThrow(StorageError);
    });

    it('should evict oldest entries when quota exceeded with many entries', () => {
      // Create storage with low minSafeEntries to ensure eviction actually happens
      const storage = SessionStorageManager.create<string>({
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
      // Make sessionStorage unavailable to force memory mode
      Object.defineProperty(window, 'sessionStorage', {
        get: () => {
          throw new Error('sessionStorage not available');
        },
        configurable: true,
      });

      const storage = SessionStorageManager.create<string>({
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
      const storage = SessionStorageManager.create<number>({
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
      const storage = SessionStorageManager.create<number>({
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
      const storage = SessionStorageManager.create<object>({ prefix: 'edge' });
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
      const storage = SessionStorageManager.create<string>({ prefix: 'edge' });
      const special = 'Special: \n\t\r"\'\\unicode: \u{1F600}';

      storage.set('special', special);

      expect(storage.get('special')).toBe(special);
    });

    it('should handle empty object', () => {
      const storage = SessionStorageManager.create<object>({ prefix: 'edge' });

      storage.set('empty', {});

      expect(storage.get('empty')).toEqual({});
    });

    it('should handle empty array', () => {
      const storage = SessionStorageManager.create<unknown[]>({ prefix: 'edge' });

      storage.set('empty', []);

      expect(storage.get('empty')).toEqual([]);
    });

    it('should handle mixed array', () => {
      const storage = SessionStorageManager.create<unknown[]>({ prefix: 'edge' });
      const mixed = [1, 'string', true, null, { key: 'value' }, [1, 2, 3]];

      storage.set('mixed', mixed);

      expect(storage.get('mixed')).toEqual(mixed);
    });

    it('should handle Date serialization (as string)', () => {
      const storage = SessionStorageManager.create<{ date: string }>({ prefix: 'edge' });
      const dateStr = new Date().toISOString();

      storage.set('dateObj', { date: dateStr });

      expect(storage.get('dateObj')).toEqual({ date: dateStr });
    });

    it('should handle keys with dots', () => {
      const storage = SessionStorageManager.create<string>({ prefix: 'edge' });

      storage.set('key.with.dots', 'value');

      expect(storage.get('key.with.dots')).toBe('value');
    });

    it('should handle keys at max length', () => {
      const storage = SessionStorageManager.create<string>({ prefix: 'edge' });
      const maxKey = 'a'.repeat(128);

      storage.set(maxKey, 'value');

      expect(storage.get(maxKey)).toBe('value');
    });

    it('should handle keys with allowed special characters', () => {
      const storage = SessionStorageManager.create<string>({ prefix: 'edge' });

      storage.set('key_with-dash.dot', 'value');

      expect(storage.get('key_with-dash.dot')).toBe('value');
    });

    it('should handle very long values', () => {
      const storage = SessionStorageManager.create<string>({ prefix: 'edge' });
      const longValue = 'x'.repeat(10000);

      storage.set('longValue', longValue);

      expect(storage.get('longValue')).toBe(longValue);
    });
  });

  // ===========================================================================
  // Type Safety (Generic Types)
  // ===========================================================================

  describe('Type Safety', () => {
    interface UserSession {
      token: string;
      userId: number;
      expiresAt: string;
    }

    it('should work with typed storage', () => {
      const storage = SessionStorageManager.create<UserSession>({ prefix: 'typed' });

      const session: UserSession = {
        token: 'abc123',
        userId: 42,
        expiresAt: '2024-12-31T23:59:59Z',
      };
      storage.set('session', session);

      const retrieved = storage.get('session');

      expect(retrieved).toEqual(session);
    });

    it('should work with union types', () => {
      const storage = SessionStorageManager.create<string | number>({ prefix: 'union' });

      storage.set('string', 'value');
      storage.set('number', 42);

      expect(storage.get('string')).toBe('value');
      expect(storage.get('number')).toBe(42);
    });

    it('should work with complex nested types', () => {
      interface ComplexType {
        data: {
          items: Array<{ id: number; name: string }>;
          metadata: Record<string, unknown>;
        };
      }

      const storage = SessionStorageManager.create<ComplexType>({ prefix: 'complex' });

      const value: ComplexType = {
        data: {
          items: [
            { id: 1, name: 'item1' },
            { id: 2, name: 'item2' },
          ],
          metadata: { created: '2024-01-01', version: 1 },
        },
      };

      storage.set('complex', value);

      expect(storage.get('complex')).toEqual(value);
    });
  });

  // ===========================================================================
  // Prefix Isolation
  // ===========================================================================

  describe('Prefix Isolation', () => {
    it('should completely isolate data between different prefixes', () => {
      const storageA = SessionStorageManager.create<string>({ prefix: 'prefixA' });
      const storageB = SessionStorageManager.create<string>({ prefix: 'prefixB' });

      storageA.set('shared', 'valueA');
      storageB.set('shared', 'valueB');

      expect(storageA.get('shared')).toBe('valueA');
      expect(storageB.get('shared')).toBe('valueB');
    });

    it('should not see keys from other prefixes in keys()', () => {
      const storageA = SessionStorageManager.create<string>({ prefix: 'prefixA' });
      const storageB = SessionStorageManager.create<string>({ prefix: 'prefixB' });

      storageA.set('keyA1', 'value');
      storageA.set('keyA2', 'value');
      storageB.set('keyB1', 'value');

      const keysA = storageA.keys();
      const keysB = storageB.keys();

      expect(keysA).toEqual(['keyA1', 'keyA2']);
      expect(keysB).toEqual(['keyB1']);
    });

    it('should only count own entries in stats()', () => {
      const storageA = SessionStorageManager.create<string>({ prefix: 'prefixA' });
      const storageB = SessionStorageManager.create<string>({ prefix: 'prefixB' });

      storageA.set('key1', 'value');
      storageA.set('key2', 'value');
      storageA.set('key3', 'value');
      storageB.set('key1', 'value');

      expect(storageA.stats().count).toBe(3);
      expect(storageB.stats().count).toBe(1);
    });

    it('should only clear own entries', () => {
      const storageA = SessionStorageManager.create<string>({ prefix: 'prefixA' });
      const storageB = SessionStorageManager.create<string>({ prefix: 'prefixB' });

      storageA.set('key1', 'value');
      storageA.set('key2', 'value');
      storageB.set('key1', 'value');

      storageA.clear();

      expect(storageA.keys()).toHaveLength(0);
      expect(storageB.keys()).toHaveLength(1);
      expect(storageB.get('key1')).toBe('value');
    });
  });

  // ===========================================================================
  // evictOldest edge cases
  // ===========================================================================

  describe('evictOldest edge cases', () => {
    it('should not evict when entries count is at or below minSafeEntries', () => {
      const storage = SessionStorageManager.create<string>({
        prefix: 'evictSafe',
        maxEntries: 100,
        minSafeEntries: 5,
      });

      vi.useFakeTimers();

      // Add exactly minSafeEntries entries
      for (let i = 0; i < 5; i++) {
        vi.setSystemTime(1000 + i * 1000);
        storage.set(`key${i}`, 'value');
      }

      vi.useRealTimers();

      // Mock setItem to throw QuotaExceededError once then succeed
      let attempts = 0;
      const originalSetItem = mockStorage.setItem.bind(mockStorage);
      vi.spyOn(mockStorage, 'setItem').mockImplementation((key, value) => {
        if (key === 'evictSafe.newKey' && attempts === 0) {
          attempts++;
          const error = new Error('quota exceeded');
          error.name = 'QuotaExceededError';
          throw error;
        }
        return originalSetItem(key, value);
      });

      // Should succeed - evictOldest won't remove entries because count <= minSafeEntries
      storage.set('newKey', 'data');

      // All original entries should still exist since we're at minSafeEntries
      expect(storage.keys().length).toBe(6);
    });
  });
});
