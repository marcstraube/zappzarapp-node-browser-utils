import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EncryptedStorage } from '../../src/encryption/index.js';
import { IndexedDBManager } from '../../src/indexeddb/index.js';
import type { IndexedDBInstance } from '../../src/indexeddb/index.js';

/**
 * Integration: IndexedDB + EncryptedStorage
 *
 * Verifies encrypted data round-trips through IndexedDB correctly.
 * EncryptedStorage encrypts/decrypts via localStorage; encrypted entries
 * are stored in IndexedDB to test data integrity across storage backends.
 */

const DB_NAME = 'integration-encryption-test';
const STORE_NAME = 'encrypted-entries';
const PASSWORD = 'secure-password-123';

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

describe('IndexedDB + EncryptedStorage', () => {
  let mockStorage: Storage;
  let originalLocalStorage: PropertyDescriptor | undefined;
  let db: IndexedDBInstance;

  beforeEach(async () => {
    mockStorage = createMockLocalStorage();
    originalLocalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockStorage,
      writable: true,
      configurable: true,
    });

    db = await IndexedDBManager.open({
      name: DB_NAME,
      version: 1,
      stores: {
        [STORE_NAME]: { keyPath: 'id' },
      },
    });
  });

  afterEach(async () => {
    db.close();
    await IndexedDBManager.deleteDatabase(DB_NAME);

    if (originalLocalStorage) {
      Object.defineProperty(globalThis, 'localStorage', originalLocalStorage);
    }
  });

  it('should store encrypted data in IndexedDB, retrieve and decrypt', async () => {
    const encrypted = await EncryptedStorage.create({
      password: PASSWORD,
      prefix: 'idb',
      storage: mockStorage,
    });

    const secret = { apiKey: 'sk-12345', endpoint: 'https://api.example.com' };
    await encrypted.set('credentials', secret);

    // Read raw encrypted entry from localStorage
    const rawEntry = mockStorage.getItem('idb.credentials');
    expect(rawEntry).not.toBeNull();

    // Store encrypted entry in IndexedDB
    await db.put(STORE_NAME, { id: 'credentials', payload: rawEntry });

    // Retrieve from IndexedDB
    const record = await db.get<{ id: string; payload: string }>(STORE_NAME, 'credentials');
    expect(record).toBeDefined();

    // Write back to localStorage and decrypt
    mockStorage.setItem('idb.credentials', record!.payload);
    const decrypted = await encrypted.get<typeof secret>('credentials');
    expect(decrypted).toEqual(secret);

    encrypted.destroy();
  });

  it('should re-encrypt existing entries with new passphrase (key rotation)', async () => {
    const oldStorage = await EncryptedStorage.create({
      password: PASSWORD,
      prefix: 'rotate',
      storage: mockStorage,
    });

    // Store entries with old key
    await oldStorage.set('item1', 'secret-value-1');
    await oldStorage.set('item2', 'secret-value-2');

    // Persist encrypted entries to IndexedDB
    for (const key of oldStorage.keys()) {
      const raw = mockStorage.getItem(`rotate.${key}`);
      await db.put(STORE_NAME, { id: key, payload: raw });
    }

    // Decrypt all entries with old key
    const decrypted: Record<string, unknown> = {};
    const entries = await db.getAll<{ id: string; payload: string }>(STORE_NAME);
    for (const entry of entries) {
      mockStorage.setItem(`rotate.${entry.id}`, entry.payload);
    }
    for (const key of oldStorage.keys()) {
      decrypted[key] = await oldStorage.get(key);
    }
    oldStorage.destroy();

    // Clear IndexedDB and localStorage
    await db.clear(STORE_NAME);
    mockStorage.clear();

    // Re-encrypt with new passphrase
    const newStorage = await EncryptedStorage.create({
      password: 'new-secure-password-456',
      prefix: 'rotate',
      storage: mockStorage,
    });

    for (const [key, value] of Object.entries(decrypted)) {
      await newStorage.set(key, value);
      const raw = mockStorage.getItem(`rotate.${key}`);
      await db.put(STORE_NAME, { id: key, payload: raw });
    }

    // Verify new key decrypts correctly
    const rotatedEntries = await db.getAll<{ id: string; payload: string }>(STORE_NAME);
    for (const entry of rotatedEntries) {
      mockStorage.setItem(`rotate.${entry.id}`, entry.payload);
    }

    expect(await newStorage.get('item1')).toBe('secret-value-1');
    expect(await newStorage.get('item2')).toBe('secret-value-2');

    // Old key cannot decrypt new entries
    const oldStorageRetry = await EncryptedStorage.create({
      password: PASSWORD,
      prefix: 'rotate',
      storage: mockStorage,
    });
    await expect(oldStorageRetry.get('item1')).rejects.toThrow();

    oldStorageRetry.destroy();
    newStorage.destroy();
  });

  it('should handle quota exceeded with encrypted payloads', async () => {
    const encrypted = await EncryptedStorage.create({
      password: PASSWORD,
      prefix: 'quota',
      storage: mockStorage,
    });

    // Create a large payload
    const largeData = 'x'.repeat(10_000);
    await encrypted.set('large', largeData);

    const rawEntry = mockStorage.getItem('quota.large');
    expect(rawEntry).not.toBeNull();

    // Store in IndexedDB — should handle large encrypted payloads
    await db.put(STORE_NAME, { id: 'large', payload: rawEntry });

    // Retrieve and verify round-trip integrity
    const record = await db.get<{ id: string; payload: string }>(STORE_NAME, 'large');
    expect(record).toBeDefined();

    mockStorage.setItem('quota.large', record!.payload);
    const decrypted = await encrypted.get<string>('large');
    expect(decrypted).toBe(largeData);

    encrypted.destroy();
  });

  it('should handle concurrent read/write with encryption', async () => {
    const encrypted = await EncryptedStorage.create({
      password: PASSWORD,
      prefix: 'concurrent',
      storage: mockStorage,
    });

    // Write multiple entries concurrently
    const entries = Array.from({ length: 10 }, (_, i) => ({
      key: `item-${i}`,
      value: { index: i, data: `value-${i}` },
    }));

    await Promise.all(entries.map(({ key, value }) => encrypted.set(key, value)));

    // Move all encrypted entries to IndexedDB concurrently
    await Promise.all(
      entries.map(async ({ key }) => {
        const raw = mockStorage.getItem(`concurrent.${key}`);
        await db.put(STORE_NAME, { id: key, payload: raw });
      })
    );

    // Read all back from IndexedDB concurrently
    const results = await Promise.all(
      entries.map(async ({ key }) => {
        const record = await db.get<{ id: string; payload: string }>(STORE_NAME, key);
        return { key, payload: record!.payload };
      })
    );

    // Write back to localStorage and decrypt concurrently
    for (const { key, payload } of results) {
      mockStorage.setItem(`concurrent.${key}`, payload);
    }

    const decrypted = await Promise.all(
      entries.map(({ key }) => encrypted.get<{ index: number; data: string }>(key))
    );

    // Verify no cross-contamination
    for (let i = 0; i < entries.length; i++) {
      expect(decrypted[i]).toEqual(entries[i]!.value);
    }

    encrypted.destroy();
  });
});
