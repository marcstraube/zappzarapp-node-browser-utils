import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EncryptedStorage } from '../../src/encryption/index.js';
import { EncryptionError, ValidationError } from '../../src/core/index.js';

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

describe('EncryptedStorage', () => {
  let mockStorage: Storage;
  let originalLocalStorage: PropertyDescriptor | undefined;
  let originalCrypto: PropertyDescriptor | undefined;

  beforeEach(() => {
    mockStorage = createMockLocalStorage();
    originalLocalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    originalCrypto = Object.getOwnPropertyDescriptor(globalThis, 'crypto');

    Object.defineProperty(globalThis, 'localStorage', {
      value: mockStorage,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    if (originalLocalStorage) {
      Object.defineProperty(globalThis, 'localStorage', originalLocalStorage);
    } else {
      // @ts-expect-error -- Removing property for cleanup
      delete globalThis.localStorage;
    }

    if (originalCrypto) {
      Object.defineProperty(globalThis, 'crypto', originalCrypto);
    }
  });

  // ===========================================================================
  // Factory Methods
  // ===========================================================================

  describe('Factory Methods', () => {
    describe('create', () => {
      it('should create encrypted storage with valid password', async () => {
        const storage = await EncryptedStorage.create({
          password: 'secure-password-123',
          storage: mockStorage,
        });

        expect(storage).toBeInstanceOf(EncryptedStorage);
        storage.destroy();
      });

      it('should create storage using default localStorage when storage not provided', async () => {
        const storage = await EncryptedStorage.create({
          password: 'secure-password-123',
        });

        expect(storage).toBeInstanceOf(EncryptedStorage);
        storage.destroy();
      });

      it('should create storage with custom prefix', async () => {
        const storage = await EncryptedStorage.create({
          password: 'secure-password-123',
          prefix: 'myApp',
          storage: mockStorage,
        });

        await storage.set('key', 'value');

        expect(mockStorage.getItem('myApp.key')).not.toBeNull();
        storage.destroy();
      });

      it('should create storage with custom iterations', async () => {
        const storage = await EncryptedStorage.create({
          password: 'secure-password-123',
          iterations: 50000,
          storage: mockStorage,
        });

        const stats = storage.stats();
        expect(stats.iterations).toBe(50000);
        storage.destroy();
      });

      it('should use default prefix when not specified', async () => {
        const storage = await EncryptedStorage.create({
          password: 'secure-password-123',
          storage: mockStorage,
        });

        await storage.set('key', 'value');

        expect(mockStorage.getItem('encrypted.key')).not.toBeNull();
        storage.destroy();
      });

      it('should throw ValidationError for password shorter than 12 characters', async () => {
        await expect(
          EncryptedStorage.create({
            password: 'short',
            storage: mockStorage,
          })
        ).rejects.toThrow(ValidationError);
      });

      it('should throw ValidationError for empty password', async () => {
        await expect(
          EncryptedStorage.create({
            password: '',
            storage: mockStorage,
          })
        ).rejects.toThrow(ValidationError);
      });

      it('should throw ValidationError for password with insufficient character classes', async () => {
        // 'aaaaaaaaaaaa' has only 1 class (lowercase), default requires 2
        await expect(
          EncryptedStorage.create({
            password: 'aaaaaaaaaaaa',
            storage: mockStorage,
          })
        ).rejects.toThrow(ValidationError);
      });

      it('should accept password meeting default character class requirement', async () => {
        // 'password1234' has lowercase + digits = 2 classes (meets default of 2)
        const storage = await EncryptedStorage.create({
          password: 'password1234',
          storage: mockStorage,
        });
        expect(storage).toBeInstanceOf(EncryptedStorage);
        storage.destroy();
      });

      it('should enforce custom minCharacterClasses', async () => {
        // 'password1234' has 2 classes, but we require 3
        await expect(
          EncryptedStorage.create({
            password: 'password1234',
            minCharacterClasses: 3,
            storage: mockStorage,
          })
        ).rejects.toThrow(ValidationError);
      });

      it('should accept password meeting custom minCharacterClasses', async () => {
        // 'Password1234' has lowercase + uppercase + digits = 3 classes
        const storage = await EncryptedStorage.create({
          password: 'Password1234',
          minCharacterClasses: 3,
          storage: mockStorage,
        });
        expect(storage).toBeInstanceOf(EncryptedStorage);
        storage.destroy();
      });

      it('should accept password with all 4 character classes', async () => {
        // 'Password123!' has all 4 classes
        const storage = await EncryptedStorage.create({
          password: 'Password123!',
          minCharacterClasses: 4,
          storage: mockStorage,
        });
        expect(storage).toBeInstanceOf(EncryptedStorage);
        storage.destroy();
      });

      it('should allow minCharacterClasses of 1', async () => {
        // 'aaaaaaaaaaaa' has 1 class, allowed when minCharacterClasses is 1
        const storage = await EncryptedStorage.create({
          password: 'aaaaaaaaaaaa',
          minCharacterClasses: 1,
          storage: mockStorage,
        });
        expect(storage).toBeInstanceOf(EncryptedStorage);
        storage.destroy();
      });

      it('should throw ValidationError for minCharacterClasses below 1', async () => {
        await expect(
          EncryptedStorage.create({
            password: 'secure-password-123',
            minCharacterClasses: 0,
            storage: mockStorage,
          })
        ).rejects.toThrow(ValidationError);
      });

      it('should throw ValidationError for minCharacterClasses above 4', async () => {
        await expect(
          EncryptedStorage.create({
            password: 'secure-password-123',
            minCharacterClasses: 5,
            storage: mockStorage,
          })
        ).rejects.toThrow(ValidationError);
      });

      it('should throw ValidationError for non-integer minCharacterClasses', async () => {
        await expect(
          EncryptedStorage.create({
            password: 'secure-password-123',
            minCharacterClasses: 2.5,
            storage: mockStorage,
          })
        ).rejects.toThrow(ValidationError);
      });

      it('should throw ValidationError for invalid prefix', async () => {
        await expect(
          EncryptedStorage.create({
            password: 'secure-password-123',
            prefix: '123invalid',
            storage: mockStorage,
          })
        ).rejects.toThrow(ValidationError);
      });

      it('should throw ValidationError for iterations below minimum', async () => {
        await expect(
          EncryptedStorage.create({
            password: 'secure-password-123',
            iterations: 5000,
            storage: mockStorage,
          })
        ).rejects.toThrow(ValidationError);
      });

      it('should throw ValidationError for non-integer iterations', async () => {
        await expect(
          EncryptedStorage.create({
            password: 'secure-password-123',
            iterations: 10000.5,
            storage: mockStorage,
          })
        ).rejects.toThrow(ValidationError);
      });

      it('should throw EncryptionError when crypto is unavailable', async () => {
        Object.defineProperty(globalThis, 'crypto', {
          value: undefined,
          writable: true,
          configurable: true,
        });

        await expect(
          EncryptedStorage.create({
            password: 'secure-password-123',
            storage: mockStorage,
          })
        ).rejects.toThrow(EncryptionError);
      });

      it('should throw EncryptionError when crypto.subtle is unavailable', async () => {
        Object.defineProperty(globalThis, 'crypto', {
          value: { getRandomValues: crypto.getRandomValues },
          writable: true,
          configurable: true,
        });

        await expect(
          EncryptedStorage.create({
            password: 'secure-password-123',
            storage: mockStorage,
          })
        ).rejects.toThrow(EncryptionError);
      });

      it('should throw EncryptionError when localStorage is unavailable', async () => {
        Object.defineProperty(globalThis, 'localStorage', {
          get: () => {
            throw new Error('localStorage not available');
          },
          configurable: true,
        });

        await expect(
          EncryptedStorage.create({
            password: 'secure-password-123',
          })
        ).rejects.toThrow(EncryptionError);
      });

      it('should throw EncryptionError when localStorage is undefined', async () => {
        // @ts-expect-error -- Removing localStorage for testing
        delete globalThis.localStorage;

        await expect(
          EncryptedStorage.create({
            password: 'secure-password-123',
          })
        ).rejects.toThrow(EncryptionError);
      });

      it('should throw EncryptionError when localStorage getter returns undefined', async () => {
        Object.defineProperty(globalThis, 'localStorage', {
          get: () => undefined,
          configurable: true,
        });

        await expect(
          EncryptedStorage.create({
            password: 'secure-password-123',
          })
        ).rejects.toThrow(EncryptionError);
      });

      it('should throw EncryptionError when localStorage throws non-EncryptionError', async () => {
        Object.defineProperty(globalThis, 'localStorage', {
          get: () => {
            throw new TypeError('localStorage access denied');
          },
          configurable: true,
        });

        await expect(
          EncryptedStorage.create({
            password: 'secure-password-123',
          })
        ).rejects.toThrow(EncryptionError);
      });

      it('should throw EncryptionError when localStorage setItem throws during availability test', async () => {
        const brokenStorage: Storage = {
          get length() {
            return 0;
          },
          clear: vi.fn(),
          getItem: vi.fn().mockReturnValue(null),
          key: vi.fn().mockReturnValue(null),
          removeItem: vi.fn(),
          setItem: vi.fn().mockImplementation(() => {
            throw new Error('QuotaExceeded');
          }),
        };

        Object.defineProperty(globalThis, 'localStorage', {
          value: brokenStorage,
          writable: true,
          configurable: true,
        });

        await expect(
          EncryptedStorage.create({
            password: 'secure-password-123',
          })
        ).rejects.toThrow(EncryptionError);
      });

      it('should reuse existing salt on subsequent creates', async () => {
        const storage1 = await EncryptedStorage.create({
          password: 'secure-password-123',
          prefix: 'reuseSalt',
          storage: mockStorage,
        });

        await storage1.set('key', 'value');
        storage1.destroy();

        // Get the salt key from storage
        const saltBefore = mockStorage.getItem('reuseSalt__salt__');
        expect(saltBefore).not.toBeNull();

        const storage2 = await EncryptedStorage.create({
          password: 'secure-password-123',
          prefix: 'reuseSalt',
          storage: mockStorage,
        });

        // Salt should be the same
        const saltAfter = mockStorage.getItem('reuseSalt__salt__');
        expect(saltAfter).toBe(saltBefore);

        // Should be able to read the data
        const value = await storage2.get('key');
        expect(value).toBe('value');

        storage2.destroy();
      });

      it('should regenerate corrupted salt', async () => {
        // Set corrupted salt
        mockStorage.setItem('corruptSalt__salt__', 'not-valid-base64!!!');

        const storage = await EncryptedStorage.create({
          password: 'secure-password-123',
          prefix: 'corruptSalt',
          storage: mockStorage,
        });

        // Should have regenerated a valid salt
        const newSalt = mockStorage.getItem('corruptSalt__salt__');
        expect(newSalt).not.toBe('not-valid-base64!!!');

        storage.destroy();
      });
    });

    describe('isCryptoAvailable', () => {
      it('should return true when crypto is available', () => {
        expect(EncryptedStorage.isCryptoAvailable()).toBe(true);
      });

      it('should return false when crypto is undefined', () => {
        Object.defineProperty(globalThis, 'crypto', {
          value: undefined,
          writable: true,
          configurable: true,
        });

        expect(EncryptedStorage.isCryptoAvailable()).toBe(false);
      });

      it('should return false when crypto.subtle is undefined', () => {
        Object.defineProperty(globalThis, 'crypto', {
          value: { getRandomValues: crypto.getRandomValues },
          writable: true,
          configurable: true,
        });

        expect(EncryptedStorage.isCryptoAvailable()).toBe(false);
      });

      it('should return false when getRandomValues is not a function', () => {
        Object.defineProperty(globalThis, 'crypto', {
          value: { subtle: crypto.subtle, getRandomValues: 'not a function' },
          writable: true,
          configurable: true,
        });

        expect(EncryptedStorage.isCryptoAvailable()).toBe(false);
      });
    });
  });

  // ===========================================================================
  // CRUD Operations
  // ===========================================================================

  describe('CRUD Operations', () => {
    describe('set and get', () => {
      it('should store and retrieve a string value', async () => {
        const storage = await EncryptedStorage.create({
          password: 'secure-password-123',
          storage: mockStorage,
        });

        await storage.set('string', 'hello world');
        const value = await storage.get<string>('string');

        expect(value).toBe('hello world');
        storage.destroy();
      });

      it('should store and retrieve a number value', async () => {
        const storage = await EncryptedStorage.create({
          password: 'secure-password-123',
          storage: mockStorage,
        });

        await storage.set('number', 42);
        const value = await storage.get<number>('number');

        expect(value).toBe(42);
        storage.destroy();
      });

      it('should store and retrieve a boolean value', async () => {
        const storage = await EncryptedStorage.create({
          password: 'secure-password-123',
          storage: mockStorage,
        });

        await storage.set('bool', true);
        const value = await storage.get<boolean>('bool');

        expect(value).toBe(true);
        storage.destroy();
      });

      it('should store and retrieve an object value', async () => {
        const storage = await EncryptedStorage.create({
          password: 'secure-password-123',
          storage: mockStorage,
        });

        const data = { name: 'John', age: 30, active: true };
        await storage.set('user', data);
        const value = await storage.get<typeof data>('user');

        expect(value).toEqual(data);
        storage.destroy();
      });

      it('should store and retrieve an array value', async () => {
        const storage = await EncryptedStorage.create({
          password: 'secure-password-123',
          storage: mockStorage,
        });

        const data = [1, 2, 3, 4, 5];
        await storage.set('numbers', data);
        const value = await storage.get<number[]>('numbers');

        expect(value).toEqual(data);
        storage.destroy();
      });

      it('should store and retrieve null value', async () => {
        const storage = await EncryptedStorage.create({
          password: 'secure-password-123',
          storage: mockStorage,
        });

        await storage.set('nullValue', null);
        const value = await storage.get<null>('nullValue');

        expect(value).toBeNull();
        storage.destroy();
      });

      it('should overwrite existing value', async () => {
        const storage = await EncryptedStorage.create({
          password: 'secure-password-123',
          storage: mockStorage,
        });

        await storage.set('key', 'initial');
        await storage.set('key', 'updated');
        const value = await storage.get<string>('key');

        expect(value).toBe('updated');
        storage.destroy();
      });

      it('should return null for non-existent key', async () => {
        const storage = await EncryptedStorage.create({
          password: 'secure-password-123',
          storage: mockStorage,
        });

        const value = await storage.get('nonexistent');

        expect(value).toBeNull();
        storage.destroy();
      });

      it('should throw ValidationError for empty key', async () => {
        const storage = await EncryptedStorage.create({
          password: 'secure-password-123',
          storage: mockStorage,
        });

        await expect(storage.set('', 'value')).rejects.toThrow(ValidationError);
        await expect(storage.get('')).rejects.toThrow(ValidationError);
        storage.destroy();
      });

      it('should throw ValidationError for key with forbidden characters', async () => {
        const storage = await EncryptedStorage.create({
          password: 'secure-password-123',
          storage: mockStorage,
        });

        await expect(storage.set('key;inject', 'value')).rejects.toThrow(ValidationError);
        storage.destroy();
      });

      it('should throw ValidationError for key exceeding max length', async () => {
        const storage = await EncryptedStorage.create({
          password: 'secure-password-123',
          storage: mockStorage,
        });

        const longKey = 'a'.repeat(129);
        await expect(storage.set(longKey, 'value')).rejects.toThrow(ValidationError);
        storage.destroy();
      });

      it('should use unique IV for each encryption', async () => {
        const storage = await EncryptedStorage.create({
          password: 'secure-password-123',
          prefix: 'uniqueIV',
          storage: mockStorage,
        });

        await storage.set('key1', 'same value');
        await storage.set('key2', 'same value');

        const raw1 = mockStorage.getItem('uniqueIV.key1');
        const raw2 = mockStorage.getItem('uniqueIV.key2');

        const entry1 = JSON.parse(raw1!);
        const entry2 = JSON.parse(raw2!);

        // IVs should be different even for same plaintext
        expect(entry1.iv).not.toBe(entry2.iv);
        // Ciphertext should also be different due to different IV
        expect(entry1.data).not.toBe(entry2.data);

        storage.destroy();
      });

      it('should throw EncryptionError for corrupted data format', async () => {
        const storage = await EncryptedStorage.create({
          password: 'secure-password-123',
          prefix: 'corrupt',
          storage: mockStorage,
        });

        // Store corrupted data directly
        mockStorage.setItem('corrupt.badformat', JSON.stringify({ iv: 'test' }));

        await expect(storage.get('badformat')).rejects.toThrow(EncryptionError);
        storage.destroy();
      });

      it('should throw EncryptionError for null value in storage', async () => {
        const storage = await EncryptedStorage.create({
          password: 'secure-password-123',
          prefix: 'nullEntry',
          storage: mockStorage,
        });

        // Store null directly (invalid entry format)
        mockStorage.setItem('nullEntry.nullvalue', 'null');

        await expect(storage.get('nullvalue')).rejects.toThrow(EncryptionError);
        storage.destroy();
      });

      it('should throw EncryptionError for primitive value in storage', async () => {
        const storage = await EncryptedStorage.create({
          password: 'secure-password-123',
          prefix: 'primitive',
          storage: mockStorage,
        });

        // Store string directly (invalid entry format)
        mockStorage.setItem('primitive.stringvalue', '"just a string"');

        await expect(storage.get('stringvalue')).rejects.toThrow(EncryptionError);
        storage.destroy();
      });

      it('should throw EncryptionError for invalid JSON in storage', async () => {
        const storage = await EncryptedStorage.create({
          password: 'secure-password-123',
          prefix: 'corrupt',
          storage: mockStorage,
        });

        // Store invalid JSON directly
        mockStorage.setItem('corrupt.badjson', 'not valid json {{{');

        await expect(storage.get('badjson')).rejects.toThrow(EncryptionError);
        storage.destroy();
      });

      it('should throw EncryptionError when decryption fails (wrong password)', async () => {
        // Create storage with one password
        const storage1 = await EncryptedStorage.create({
          password: 'password-one-123',
          prefix: 'wrongPass',
          storage: mockStorage,
        });

        await storage1.set('secret', 'sensitive data');
        storage1.destroy();

        // Try to read with different password (will use same salt, so decryption will fail)
        // Create storage with different password but same salt
        const storage2 = await EncryptedStorage.create({
          password: 'password-two-456',
          prefix: 'wrongPass',
          storage: mockStorage,
        });

        // Decryption should fail
        await expect(storage2.get('secret')).rejects.toThrow(EncryptionError);
        storage2.destroy();
      });

      it('should handle deeply nested objects', async () => {
        const storage = await EncryptedStorage.create({
          password: 'secure-password-123',
          storage: mockStorage,
        });

        const nested = {
          level1: {
            level2: {
              level3: {
                value: 'deep',
                array: [1, 2, { nested: true }],
              },
            },
          },
        };

        await storage.set('nested', nested);
        const value = await storage.get<typeof nested>('nested');

        expect(value).toEqual(nested);
        storage.destroy();
      });

      it('should handle special characters in values', async () => {
        const storage = await EncryptedStorage.create({
          password: 'secure-password-123',
          storage: mockStorage,
        });

        const special = 'Special: \n\t\r"\'\\unicode: \u{1F600}';

        await storage.set('special', special);
        const value = await storage.get<string>('special');

        expect(value).toBe(special);
        storage.destroy();
      });
    });

    describe('has', () => {
      it('should return true for existing key', async () => {
        const storage = await EncryptedStorage.create({
          password: 'secure-password-123',
          storage: mockStorage,
        });

        await storage.set('exists', 'value');

        expect(storage.has('exists')).toBe(true);
        storage.destroy();
      });

      it('should return false for non-existent key', async () => {
        const storage = await EncryptedStorage.create({
          password: 'secure-password-123',
          storage: mockStorage,
        });

        expect(storage.has('nonexistent')).toBe(false);
        storage.destroy();
      });

      it('should throw ValidationError for empty key', async () => {
        const storage = await EncryptedStorage.create({
          password: 'secure-password-123',
          storage: mockStorage,
        });

        expect(() => storage.has('')).toThrow(ValidationError);
        storage.destroy();
      });
    });

    describe('remove', () => {
      it('should remove existing entry', async () => {
        const storage = await EncryptedStorage.create({
          password: 'secure-password-123',
          storage: mockStorage,
        });

        await storage.set('toRemove', 'value');
        expect(storage.has('toRemove')).toBe(true);

        storage.remove('toRemove');

        expect(storage.has('toRemove')).toBe(false);
        storage.destroy();
      });

      it('should not throw for non-existent key', async () => {
        const storage = await EncryptedStorage.create({
          password: 'secure-password-123',
          storage: mockStorage,
        });

        expect(() => storage.remove('nonexistent')).not.toThrow();
        storage.destroy();
      });

      it('should throw ValidationError for empty key', async () => {
        const storage = await EncryptedStorage.create({
          password: 'secure-password-123',
          storage: mockStorage,
        });

        expect(() => storage.remove('')).toThrow(ValidationError);
        storage.destroy();
      });
    });

    describe('clear', () => {
      it('should remove all entries with prefix', async () => {
        const storage = await EncryptedStorage.create({
          password: 'secure-password-123',
          prefix: 'clearTest',
          storage: mockStorage,
        });

        await storage.set('key1', 'value1');
        await storage.set('key2', 'value2');
        await storage.set('key3', 'value3');

        expect(storage.keys().length).toBe(3);

        storage.clear();

        expect(storage.keys().length).toBe(0);
        storage.destroy();
      });

      it('should not affect entries with other prefixes', async () => {
        const storage1 = await EncryptedStorage.create({
          password: 'secure-password-123',
          prefix: 'app1',
          storage: mockStorage,
        });

        const storage2 = await EncryptedStorage.create({
          password: 'secure-password-123',
          prefix: 'app2',
          storage: mockStorage,
        });

        await storage1.set('key', 'value1');
        await storage2.set('key', 'value2');

        storage1.clear();

        expect(storage1.keys().length).toBe(0);
        expect(storage2.keys().length).toBe(1);

        storage1.destroy();
        storage2.destroy();
      });

      it('should not remove the salt', async () => {
        const storage = await EncryptedStorage.create({
          password: 'secure-password-123',
          prefix: 'keepSalt',
          storage: mockStorage,
        });

        await storage.set('key', 'value');
        storage.clear();

        // Salt should still exist
        expect(mockStorage.getItem('keepSalt__salt__')).not.toBeNull();
        storage.destroy();
      });
    });

    describe('keys', () => {
      it('should return empty array when no entries', async () => {
        const storage = await EncryptedStorage.create({
          password: 'secure-password-123',
          storage: mockStorage,
        });

        expect(storage.keys()).toEqual([]);
        storage.destroy();
      });

      it('should return all keys without prefix', async () => {
        const storage = await EncryptedStorage.create({
          password: 'secure-password-123',
          prefix: 'keysTest',
          storage: mockStorage,
        });

        await storage.set('key1', 'value1');
        await storage.set('key2', 'value2');

        const keys = storage.keys();

        expect(keys).toContain('key1');
        expect(keys).toContain('key2');
        expect(keys.length).toBe(2);
        storage.destroy();
      });

      it('should only return keys with matching prefix', async () => {
        const storage = await EncryptedStorage.create({
          password: 'secure-password-123',
          prefix: 'myPrefix',
          storage: mockStorage,
        });

        await storage.set('myKey', 'value');
        mockStorage.setItem('otherPrefix.key', '{"iv":"a","data":"b","timestamp":0}');

        const keys = storage.keys();

        expect(keys).toEqual(['myKey']);
        storage.destroy();
      });

      it('should not include salt key', async () => {
        const storage = await EncryptedStorage.create({
          password: 'secure-password-123',
          prefix: 'noSalt',
          storage: mockStorage,
        });

        await storage.set('key', 'value');

        const keys = storage.keys();

        expect(keys).not.toContain('__salt__');
        expect(keys).toEqual(['key']);
        storage.destroy();
      });
    });
  });

  // ===========================================================================
  // Stats
  // ===========================================================================

  describe('stats', () => {
    it('should return correct count', async () => {
      const storage = await EncryptedStorage.create({
        password: 'secure-password-123',
        storage: mockStorage,
      });

      await storage.set('key1', 'value1');
      await storage.set('key2', 'value2');

      const stats = storage.stats();

      expect(stats.count).toBe(2);
      storage.destroy();
    });

    it('should return correct prefix', async () => {
      const storage = await EncryptedStorage.create({
        password: 'secure-password-123',
        prefix: 'myStats',
        storage: mockStorage,
      });

      const stats = storage.stats();

      expect(stats.prefix).toBe('myStats');
      storage.destroy();
    });

    it('should return correct iterations', async () => {
      const storage = await EncryptedStorage.create({
        password: 'secure-password-123',
        iterations: 50000,
        storage: mockStorage,
      });

      const stats = storage.stats();

      expect(stats.iterations).toBe(50000);
      storage.destroy();
    });

    it('should indicate when not destroyed', async () => {
      const storage = await EncryptedStorage.create({
        password: 'secure-password-123',
        storage: mockStorage,
      });

      const stats = storage.stats();

      expect(stats.isDestroyed).toBe(false);
      storage.destroy();
    });

    it('should indicate when destroyed', async () => {
      const storage = await EncryptedStorage.create({
        password: 'secure-password-123',
        storage: mockStorage,
      });

      storage.destroy();
      const stats = storage.stats();

      expect(stats.isDestroyed).toBe(true);
      expect(stats.count).toBe(0);
    });
  });

  // ===========================================================================
  // Destroy
  // ===========================================================================

  describe('destroy', () => {
    it('should prevent further operations after destroy', async () => {
      const storage = await EncryptedStorage.create({
        password: 'secure-password-123',
        storage: mockStorage,
      });

      storage.destroy();

      expect(() => storage.has('key')).toThrow(EncryptionError);
      await expect(storage.set('key', 'value')).rejects.toThrow(EncryptionError);
      await expect(storage.get('key')).rejects.toThrow(EncryptionError);
      expect(() => storage.remove('key')).toThrow(EncryptionError);
      expect(() => storage.clear()).toThrow(EncryptionError);
      expect(() => storage.keys()).toThrow(EncryptionError);
    });

    it('should throw ALREADY_DESTROYED error code', async () => {
      const storage = await EncryptedStorage.create({
        password: 'secure-password-123',
        storage: mockStorage,
      });

      storage.destroy();

      try {
        storage.has('key');
      } catch (error) {
        expect(error).toBeInstanceOf(EncryptionError);
        expect((error as EncryptionError).code).toBe('ALREADY_DESTROYED');
      }
    });

    it('should be safe to call destroy multiple times', async () => {
      const storage = await EncryptedStorage.create({
        password: 'secure-password-123',
        storage: mockStorage,
      });

      expect(() => {
        storage.destroy();
        storage.destroy();
        storage.destroy();
      }).not.toThrow();
    });
  });

  // ===========================================================================
  // Quota Exceeded Handling
  // ===========================================================================

  describe('Quota Exceeded Handling', () => {
    it('should throw EncryptionError for QuotaExceededError', async () => {
      const quotaStorage = createMockLocalStorage();
      vi.spyOn(quotaStorage, 'setItem').mockImplementation((key) => {
        if (!key.endsWith('__salt__')) {
          const error = new Error('quota exceeded');
          error.name = 'QuotaExceededError';
          throw error;
        }
      });

      const storage = await EncryptedStorage.create({
        password: 'secure-password-123',
        storage: quotaStorage,
      });

      await expect(storage.set('key', 'value')).rejects.toThrow(EncryptionError);

      try {
        await storage.set('key', 'value');
      } catch (error) {
        expect((error as EncryptionError).code).toBe('STORAGE_QUOTA_EXCEEDED');
      }

      storage.destroy();
    });

    it('should throw EncryptionError for NS_ERROR_DOM_QUOTA_REACHED', async () => {
      const quotaStorage = createMockLocalStorage();
      vi.spyOn(quotaStorage, 'setItem').mockImplementation((key) => {
        if (!key.endsWith('__salt__')) {
          const error = new Error();
          error.name = 'NS_ERROR_DOM_QUOTA_REACHED';
          throw error;
        }
      });

      const storage = await EncryptedStorage.create({
        password: 'secure-password-123',
        storage: quotaStorage,
      });

      await expect(storage.set('key', 'value')).rejects.toThrow(EncryptionError);
      storage.destroy();
    });

    it('should throw EncryptionError for quota in error message', async () => {
      const quotaStorage = createMockLocalStorage();
      vi.spyOn(quotaStorage, 'setItem').mockImplementation((key) => {
        if (!key.endsWith('__salt__')) {
          throw new Error('Storage quota has been exceeded');
        }
      });

      const storage = await EncryptedStorage.create({
        password: 'secure-password-123',
        storage: quotaStorage,
      });

      await expect(storage.set('key', 'value')).rejects.toThrow(EncryptionError);
      storage.destroy();
    });

    it('should throw generic EncryptionError for other storage errors', async () => {
      const errorStorage = createMockLocalStorage();
      vi.spyOn(errorStorage, 'setItem').mockImplementation((key) => {
        if (!key.endsWith('__salt__')) {
          throw new Error('Some other storage error');
        }
      });

      const storage = await EncryptedStorage.create({
        password: 'secure-password-123',
        storage: errorStorage,
      });

      await expect(storage.set('key', 'value')).rejects.toThrow(EncryptionError);

      try {
        await storage.set('key', 'value');
      } catch (error) {
        expect((error as EncryptionError).code).toBe('ENCRYPTION_FAILED');
      }

      storage.destroy();
    });

    it('should throw EncryptionError when storage throws non-Error value', async () => {
      const errorStorage = createMockLocalStorage();
      vi.spyOn(errorStorage, 'setItem').mockImplementation((key) => {
        if (!key.endsWith('__salt__')) {
          throw 'string error'; // Testing non-Error throw handling
        }
      });

      const storage = await EncryptedStorage.create({
        password: 'secure-password-123',
        storage: errorStorage,
      });

      await expect(storage.set('key', 'value')).rejects.toThrow(EncryptionError);

      try {
        await storage.set('key', 'value');
      } catch (error) {
        expect((error as EncryptionError).code).toBe('ENCRYPTION_FAILED');
      }

      storage.destroy();
    });
  });

  // ===========================================================================
  // Security
  // ===========================================================================

  describe('Security', () => {
    it('should not expose plaintext in storage', async () => {
      const storage = await EncryptedStorage.create({
        password: 'secure-password-123',
        prefix: 'secure',
        storage: mockStorage,
      });

      const sensitiveData = 'my-secret-api-key-12345';
      await storage.set('apiKey', sensitiveData);

      const rawData = mockStorage.getItem('secure.apiKey');

      // Raw data should not contain the plaintext
      expect(rawData).not.toContain(sensitiveData);
      expect(rawData).not.toContain('my-secret');

      storage.destroy();
    });

    it('should generate different ciphertext for same plaintext', async () => {
      const storage = await EncryptedStorage.create({
        password: 'secure-password-123',
        prefix: 'diffCipher',
        storage: mockStorage,
      });

      const plaintext = 'same-value';

      await storage.set('key1', plaintext);
      const cipher1 = mockStorage.getItem('diffCipher.key1');

      await storage.set('key2', plaintext);
      const cipher2 = mockStorage.getItem('diffCipher.key2');

      // Ciphertexts should be different due to unique IVs
      expect(cipher1).not.toBe(cipher2);

      storage.destroy();
    });

    it('should use cryptographically secure random for IV', async () => {
      const getRandomValuesSpy = vi.spyOn(crypto, 'getRandomValues');

      const storage = await EncryptedStorage.create({
        password: 'secure-password-123',
        storage: mockStorage,
      });

      await storage.set('key', 'value');

      // getRandomValues should have been called (for IV generation)
      expect(getRandomValuesSpy).toHaveBeenCalled();

      storage.destroy();
      getRandomValuesSpy.mockRestore();
    });

    it('should throw EncryptionError when key derivation fails', async () => {
      const importKeySpy = vi
        .spyOn(crypto.subtle, 'importKey')
        .mockRejectedValue(new Error('Key import failed'));

      await expect(
        EncryptedStorage.create({
          password: 'secure-password-123',
          storage: mockStorage,
        })
      ).rejects.toThrow(EncryptionError);

      importKeySpy.mockRestore();
    });

    it('should derive key using PBKDF2 with SHA-256', async () => {
      const deriveKeySpy = vi.spyOn(crypto.subtle, 'deriveKey');

      const storage = await EncryptedStorage.create({
        password: 'secure-password-123',
        iterations: 100000,
        storage: mockStorage,
      });

      expect(deriveKeySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'PBKDF2',
          iterations: 100000,
          hash: 'SHA-256',
        }),
        expect.anything(),
        expect.objectContaining({ name: 'AES-GCM', length: 256 }),
        false, // Not extractable
        ['encrypt', 'decrypt']
      );

      storage.destroy();
      deriveKeySpy.mockRestore();
    });
  });

  // ===========================================================================
  // Error Handling
  // ===========================================================================

  describe('EncryptionError', () => {
    it('should have correct error codes', () => {
      expect(EncryptionError.cryptoUnavailable().code).toBe('CRYPTO_UNAVAILABLE');
      expect(EncryptionError.keyDerivationFailed().code).toBe('KEY_DERIVATION_FAILED');
      expect(EncryptionError.encryptionFailed('key').code).toBe('ENCRYPTION_FAILED');
      expect(EncryptionError.decryptionFailed('key').code).toBe('DECRYPTION_FAILED');
      expect(EncryptionError.invalidDataFormat('key', 'reason').code).toBe('INVALID_DATA_FORMAT');
      expect(EncryptionError.storageUnavailable().code).toBe('STORAGE_UNAVAILABLE');
      expect(EncryptionError.quotaExceeded('key').code).toBe('STORAGE_QUOTA_EXCEEDED');
      expect(EncryptionError.alreadyDestroyed().code).toBe('ALREADY_DESTROYED');
    });

    it('should include key in error when relevant', () => {
      const error = EncryptionError.encryptionFailed('myKey');
      expect(error.key).toBe('myKey');
    });

    it('should include cause when provided', () => {
      const cause = new Error('original error');
      const error = EncryptionError.keyDerivationFailed(cause);
      expect(error.cause).toBe(cause);
    });

    it('should have descriptive messages', () => {
      expect(EncryptionError.cryptoUnavailable().message).toContain('Web Crypto API');
      expect(EncryptionError.storageUnavailable('test reason').message).toContain('test reason');
    });
  });
});
