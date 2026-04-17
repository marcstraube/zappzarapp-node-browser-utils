import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EncryptedStorage } from '../../src/encryption/index.js';
import { StorageManager } from '../../src/storage/index.js';

/**
 * Integration: EncryptedStorage + StorageManager
 *
 * Both use localStorage independently. Tests verify:
 * - Namespace isolation (different prefixes don't interfere)
 * - Concurrent read/write without corruption
 * - Clear operations are scoped to prefix
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

describe('EncryptedStorage + StorageManager', () => {
  let mockStorage: Storage;
  let originalLocalStorage: PropertyDescriptor | undefined;

  beforeEach(() => {
    mockStorage = createMockLocalStorage();
    originalLocalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockStorage,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    if (originalLocalStorage) {
      Object.defineProperty(globalThis, 'localStorage', originalLocalStorage);
    }
  });

  it('should coexist with separate prefixes without interference', async () => {
    const encrypted = await EncryptedStorage.create({
      password: 'secure-password-123',
      prefix: 'enc',
      storage: mockStorage,
    });
    const plain = StorageManager.create<string>({ prefix: 'plain' });

    await encrypted.set('secret', 'classified');
    plain.set('public', 'visible');

    expect(plain.get('public')).toBe('visible');
    expect(await encrypted.get<string>('secret')).toBe('classified');

    encrypted.destroy();
  });

  it('should not expose plaintext through plain storage manager', async () => {
    const encrypted = await EncryptedStorage.create({
      password: 'secure-password-123',
      prefix: 'enc',
      storage: mockStorage,
    });

    const secret = { sensitive: true, message: 'top-secret' };
    await encrypted.set('secret', secret);

    // Reading raw localStorage entries via plain StorageManager should never
    // return the original plaintext object
    const plain = StorageManager.create<unknown>({ prefix: 'enc' });
    const keys = plain.keys();

    for (const key of keys) {
      const value = plain.get(key);
      // Value may be null (unparseable) or an opaque ciphertext string,
      // but never the original plaintext
      if (value !== null) {
        expect(value).not.toEqual(secret);
        expect(JSON.stringify(value)).not.toContain('top-secret');
      }
    }

    encrypted.destroy();
  });

  it('should scope clear operations to own prefix', async () => {
    const encrypted = await EncryptedStorage.create({
      password: 'secure-password-123',
      prefix: 'enc',
      storage: mockStorage,
    });
    const plain = StorageManager.create<string>({ prefix: 'plain' });

    await encrypted.set('secret', 'data');
    plain.set('item', 'value');

    plain.clear();

    expect(plain.keys()).toHaveLength(0);
    expect(await encrypted.get<string>('secret')).toBe('data');

    encrypted.destroy();
  });

  it('should handle concurrent writes to shared localStorage', async () => {
    const encrypted = await EncryptedStorage.create({
      password: 'secure-password-123',
      prefix: 'enc',
      storage: mockStorage,
    });
    const plain = StorageManager.create<number>({ prefix: 'plain' });

    await Promise.all([encrypted.set('a', 'encrypted-a'), encrypted.set('b', 'encrypted-b')]);
    plain.set('x', 1);
    plain.set('y', 2);

    expect(await encrypted.get<string>('a')).toBe('encrypted-a');
    expect(await encrypted.get<string>('b')).toBe('encrypted-b');
    expect(plain.get('x')).toBe(1);
    expect(plain.get('y')).toBe(2);

    encrypted.destroy();
  });
});
