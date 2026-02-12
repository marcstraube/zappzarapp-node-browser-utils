/**
 * IndexedDBManager Tests.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { IndexedDBManager, IndexedDBError } from '../../src/indexeddb/index.js';

/**
 * Creates a mock IDBRequest that can be configured to succeed or fail.
 */
function createMockRequest<T>(result?: T): IDBRequest<T> {
  return {
    result: result as T,
    error: null as DOMException | null,
    onsuccess: null as ((this: IDBRequest<T>, ev: Event) => void) | null,
    onerror: null as ((this: IDBRequest<T>, ev: Event) => void) | null,
    readyState: 'pending' as IDBRequestReadyState,
    source: null,
    transaction: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as IDBRequest<T>;
}

/**
 * Creates a mock IDBObjectStore.
 */
function createMockObjectStore(data: Map<IDBValidKey, unknown> = new Map()): IDBObjectStore {
  const indexNames = {
    contains: vi.fn().mockReturnValue(false),
    length: 0,
  } as unknown as DOMStringList;

  return {
    name: 'testStore',
    keyPath: 'id',
    indexNames,
    autoIncrement: false,
    transaction: null as unknown,
    add: vi.fn((value: unknown, key?: IDBValidKey) => {
      const req = createMockRequest(key ?? (value as { id: IDBValidKey }).id);
      setTimeout(() => {
        data.set(key ?? (value as { id: IDBValidKey }).id, value);
        req.onsuccess?.call(req, new Event('success'));
      }, 0);
      return req;
    }),
    put: vi.fn((value: unknown, key?: IDBValidKey) => {
      const req = createMockRequest(key ?? (value as { id: IDBValidKey }).id);
      setTimeout(() => {
        data.set(key ?? (value as { id: IDBValidKey }).id, value);
        req.onsuccess?.call(req, new Event('success'));
      }, 0);
      return req;
    }),
    get: vi.fn((key: IDBValidKey) => {
      const req = createMockRequest(data.get(key));
      setTimeout(() => req.onsuccess?.call(req, new Event('success')), 0);
      return req;
    }),
    delete: vi.fn((key: IDBValidKey) => {
      const req = createMockRequest<undefined>(undefined);
      setTimeout(() => {
        data.delete(key);
        req.onsuccess?.call(req, new Event('success'));
      }, 0);
      return req;
    }),
    clear: vi.fn(() => {
      const req = createMockRequest<undefined>(undefined);
      setTimeout(() => {
        data.clear();
        req.onsuccess?.call(req, new Event('success'));
      }, 0);
      return req;
    }),
    getAll: vi.fn(() => {
      const req = createMockRequest(Array.from(data.values()));
      setTimeout(() => req.onsuccess?.call(req, new Event('success')), 0);
      return req;
    }),
    count: vi.fn(() => {
      const req = createMockRequest(data.size);
      setTimeout(() => req.onsuccess?.call(req, new Event('success')), 0);
      return req;
    }),
    createIndex: vi.fn(),
    deleteIndex: vi.fn(),
    index: vi.fn(),
    openCursor: vi.fn(),
    openKeyCursor: vi.fn(),
    getAllKeys: vi.fn(),
    getKey: vi.fn(),
  } as unknown as IDBObjectStore;
}

/**
 * Creates a mock IDBTransaction that auto-completes.
 */
function createMockTransaction(
  stores: Map<string, IDBObjectStore>,
  autoComplete = true
): IDBTransaction {
  let onCompleteHandler: ((this: IDBTransaction, ev: Event) => void) | null = null;

  const transaction = {
    db: null as unknown,
    mode: 'readwrite' as IDBTransactionMode,
    durability: 'default' as IDBTransactionDurability,
    error: null as DOMException | null,
    objectStoreNames: { length: stores.size } as DOMStringList,
    get oncomplete(): ((this: IDBTransaction, ev: Event) => void) | null {
      return onCompleteHandler;
    },
    set oncomplete(handler: ((this: IDBTransaction, ev: Event) => void) | null) {
      onCompleteHandler = handler;
      // Auto-trigger oncomplete when handler is set (simulating transaction completion)
      if (autoComplete && handler) {
        setTimeout(
          () => handler.call(transaction as unknown as IDBTransaction, new Event('complete')),
          0
        );
      }
    },
    onerror: null as ((this: IDBTransaction, ev: Event) => void) | null,
    onabort: null as ((this: IDBTransaction, ev: Event) => void) | null,
    objectStore: vi.fn((name: string) => {
      const store = stores.get(name);
      if (!store) {
        throw new Error(`Store ${name} not found`);
      }
      return store;
    }),
    abort: vi.fn(),
    commit: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as IDBTransaction;

  return transaction;
}

/**
 * Creates a mock IDBDatabase.
 */
function createMockDatabase(name: string, version: number): IDBDatabase {
  const objectStoreNames = new Set<string>();
  const stores = new Map<string, IDBObjectStore>();

  return {
    name,
    version,
    objectStoreNames: {
      contains: (storeName: string) => objectStoreNames.has(storeName),
      length: objectStoreNames.size,
      item: vi.fn(),
      [Symbol.iterator]: () => objectStoreNames.values(),
    } as unknown as DOMStringList,
    onabort: null,
    onclose: null,
    onerror: null,
    onversionchange: null,
    close: vi.fn(),
    createObjectStore: vi.fn((storeName: string, options?: IDBObjectStoreParameters) => {
      objectStoreNames.add(storeName);
      const store = createMockObjectStore();
      (store as unknown as { keyPath: string | string[] | null }).keyPath =
        options?.keyPath ?? null;
      (store as unknown as { autoIncrement: boolean }).autoIncrement =
        options?.autoIncrement ?? false;
      stores.set(storeName, store);
      return store;
    }),
    deleteObjectStore: vi.fn((storeName: string) => {
      objectStoreNames.delete(storeName);
      stores.delete(storeName);
    }),
    transaction: vi.fn((storeNames: string | string[]) => {
      const names = Array.isArray(storeNames) ? storeNames : [storeNames];
      const txStores = new Map<string, IDBObjectStore>();
      for (const n of names) {
        const store = stores.get(n);
        if (store) {
          txStores.set(n, store);
        } else {
          txStores.set(n, createMockObjectStore());
        }
      }
      return createMockTransaction(txStores);
    }),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as IDBDatabase;
}

/**
 * Creates a mock IDBOpenDBRequest.
 */
function createMockOpenRequest(db: IDBDatabase): IDBOpenDBRequest {
  return {
    result: db,
    error: null as DOMException | null,
    onsuccess: null as ((this: IDBOpenDBRequest, ev: Event) => void) | null,
    onerror: null as ((this: IDBOpenDBRequest, ev: Event) => void) | null,
    onupgradeneeded: null as ((this: IDBOpenDBRequest, ev: IDBVersionChangeEvent) => void) | null,
    onblocked: null as ((this: IDBOpenDBRequest, ev: Event) => void) | null,
    readyState: 'pending' as IDBRequestReadyState,
    source: null,
    transaction: createMockTransaction(new Map()),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as IDBOpenDBRequest;
}

/**
 * Creates a mock indexedDB factory.
 */
function createMockIndexedDB(): IDBFactory {
  return {
    open: vi.fn((name: string, version?: number) => {
      const db = createMockDatabase(name, version ?? 1);
      const request = createMockOpenRequest(db);

      setTimeout(() => {
        // Trigger upgrade if needed
        if (request.onupgradeneeded) {
          const event = {
            target: request,
            oldVersion: 0,
            newVersion: version ?? 1,
          } as unknown as IDBVersionChangeEvent;
          request.onupgradeneeded.call(request, event);
        }
        request.onsuccess?.call(request, new Event('success'));
      }, 0);

      return request;
    }),
    deleteDatabase: vi.fn(() => {
      const request = createMockRequest<undefined>(undefined);
      setTimeout(() => request.onsuccess?.call(request, new Event('success')), 0);
      return request as unknown as IDBOpenDBRequest;
    }),
    cmp: vi.fn(),
    databases: vi.fn(),
  } as unknown as IDBFactory;
}

describe('IndexedDBManager', () => {
  describe('IndexedDBError', () => {
    it('should create NOT_SUPPORTED error', () => {
      const error = IndexedDBError.notSupported();
      expect(error.code).toBe('NOT_SUPPORTED');
      expect(error.message).toBe('IndexedDB is not supported in this environment');
    });

    it('should create OPEN_FAILED error', () => {
      const cause = new Error('test');
      const error = IndexedDBError.openFailed('testdb', cause);
      expect(error.code).toBe('OPEN_FAILED');
      expect(error.message).toBe('Failed to open database "testdb"');
      expect(error.cause).toBe(cause);
    });

    it('should create STORE_NOT_FOUND error', () => {
      const error = IndexedDBError.storeNotFound('users');
      expect(error.code).toBe('STORE_NOT_FOUND');
      expect(error.message).toBe('Object store "users" not found');
    });

    it('should create TRANSACTION_FAILED error', () => {
      const cause = new Error('abort');
      const error = IndexedDBError.transactionFailed(cause);
      expect(error.code).toBe('TRANSACTION_FAILED');
      expect(error.message).toBe('Transaction failed');
      expect(error.cause).toBe(cause);
    });

    it('should create OPERATION_FAILED error', () => {
      const error = IndexedDBError.operationFailed('put');
      expect(error.code).toBe('OPERATION_FAILED');
      expect(error.message).toBe('Operation "put" failed');
    });

    it('should create VERSION_ERROR error', () => {
      const error = IndexedDBError.versionError('Version downgrade');
      expect(error.code).toBe('VERSION_ERROR');
      expect(error.message).toBe('Version downgrade');
    });

    it('should create BLOCKED error', () => {
      const error = IndexedDBError.blocked();
      expect(error.code).toBe('BLOCKED');
      expect(error.message).toBe('Database upgrade blocked by open connections');
    });

    it('should be instanceof Error', () => {
      const error = IndexedDBError.notSupported();
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('isSupported', () => {
    it('should return boolean indicating IndexedDB support', () => {
      // happy-dom doesn't support IndexedDB, so we just test that it returns a boolean
      expect(typeof IndexedDBManager.isSupported()).toBe('boolean');
    });

    it('should return false when indexedDB is undefined', () => {
      const original = globalThis.indexedDB;
      // @ts-expect-error - Testing undefined
      delete globalThis.indexedDB;

      expect(IndexedDBManager.isSupported()).toBe(false);

      if (original) {
        globalThis.indexedDB = original;
      }
    });
  });

  describe('open', () => {
    it('should throw when IndexedDB is not supported', async () => {
      const original = globalThis.indexedDB;
      // @ts-expect-error - Testing undefined
      delete globalThis.indexedDB;

      await expect(
        IndexedDBManager.open({
          name: 'test',
          version: 1,
          stores: {},
        })
      ).rejects.toThrow(IndexedDBError);

      globalThis.indexedDB = original;
    });
  });

  describe('openResult', () => {
    it('should return error result when IndexedDB is not supported', async () => {
      const original = globalThis.indexedDB;
      // @ts-expect-error - Testing undefined
      delete globalThis.indexedDB;

      const result = await IndexedDBManager.openResult({
        name: 'test',
        version: 1,
        stores: {},
      });

      expect(result._tag).toBe('Err');

      globalThis.indexedDB = original;
    });
  });

  describe('deleteDatabase', () => {
    it('should throw when IndexedDB is not supported', async () => {
      const original = globalThis.indexedDB;
      // @ts-expect-error - Testing undefined
      delete globalThis.indexedDB;

      await expect(IndexedDBManager.deleteDatabase('test')).rejects.toThrow(IndexedDBError);

      globalThis.indexedDB = original;
    });
  });

  // Integration tests require a real IndexedDB implementation
  // Skip in environments without IndexedDB support (e.g., happy-dom)
  describe.skipIf(!IndexedDBManager.isSupported())('Integration', () => {
    const TEST_DB_NAME = 'test_db_' + Date.now();

    afterEach(async () => {
      // Clean up test database
      try {
        await IndexedDBManager.deleteDatabase(TEST_DB_NAME);
      } catch {
        // Ignore cleanup errors
      }
    });

    it('should open a database and perform CRUD operations', async () => {
      const db = await IndexedDBManager.open({
        name: TEST_DB_NAME,
        version: 1,
        stores: {
          users: { keyPath: 'id' },
        },
      });

      expect(db.name).toBe(TEST_DB_NAME);
      expect(db.version).toBe(1);

      // Put
      const key = await db.put('users', { id: 1, name: 'John' });
      expect(key).toBe(1);

      // Get
      const user = await db.get<{ id: number; name: string }>('users', 1);
      expect(user).toEqual({ id: 1, name: 'John' });

      // Count
      const count = await db.count('users');
      expect(count).toBe(1);

      // GetAll
      const allUsers = await db.getAll<{ id: number; name: string }>('users');
      expect(allUsers).toHaveLength(1);
      expect(allUsers[0]).toEqual({ id: 1, name: 'John' });

      // Delete
      await db.delete('users', 1);
      const deleted = await db.get('users', 1);
      expect(deleted).toBeUndefined();

      // Clear
      await db.put('users', { id: 2, name: 'Jane' });
      await db.clear('users');
      const afterClear = await db.count('users');
      expect(afterClear).toBe(0);

      db.close();
    });

    it('should handle add operation', async () => {
      const db = await IndexedDBManager.open({
        name: TEST_DB_NAME,
        version: 1,
        stores: {
          items: { keyPath: 'id' },
        },
      });

      const key = await db.add('items', { id: 100, value: 'test' });
      expect(key).toBe(100);

      db.close();
    });

    it('should handle transactions', async () => {
      const db = await IndexedDBManager.open({
        name: TEST_DB_NAME,
        version: 1,
        stores: {
          accounts: { keyPath: 'id' },
        },
      });

      await db.transaction(['accounts'], 'readwrite', async (tx) => {
        await tx.put('accounts', { id: 1, balance: 100 });
        await tx.put('accounts', { id: 2, balance: 200 });
      });

      const count = await db.count('accounts');
      expect(count).toBe(2);

      db.close();
    });

    it('should create indexes', async () => {
      const db = await IndexedDBManager.open({
        name: TEST_DB_NAME,
        version: 1,
        stores: {
          products: {
            keyPath: 'id',
            indexes: {
              byName: { keyPath: 'name' },
              byPrice: { keyPath: 'price' },
            },
          },
        },
      });

      await db.put('products', { id: 1, name: 'Widget', price: 9.99 });

      db.close();
    });

    it('should handle auto-increment stores', async () => {
      const db = await IndexedDBManager.open({
        name: TEST_DB_NAME,
        version: 1,
        stores: {
          logs: { autoIncrement: true },
        },
      });

      const key1 = await db.add('logs', { message: 'First log' });
      const key2 = await db.add('logs', { message: 'Second log' });

      expect(key1).toBe(1);
      expect(key2).toBe(2);

      db.close();
    });
  });

  // Mocked tests for full coverage when IndexedDB is not available
  describe('Mocked IndexedDB', () => {
    let originalIndexedDB: IDBFactory | undefined;

    beforeEach(() => {
      originalIndexedDB = globalThis.indexedDB;
    });

    afterEach(() => {
      if (originalIndexedDB) {
        globalThis.indexedDB = originalIndexedDB;
      } else {
        // @ts-expect-error - Restore undefined state
        delete globalThis.indexedDB;
      }
      vi.restoreAllMocks();
    });

    describe('open with mock', () => {
      it('should open database and return instance with correct name and version', async () => {
        globalThis.indexedDB = createMockIndexedDB();

        const db = await IndexedDBManager.open({
          name: 'testDB',
          version: 1,
          stores: {
            users: { keyPath: 'id' },
          },
        });

        expect(db.name).toBe('testDB');
        expect(db.version).toBe(1);
        db.close();
      });

      it('should create object stores during upgrade', async () => {
        const mockIDB = createMockIndexedDB();
        globalThis.indexedDB = mockIDB;

        const db = await IndexedDBManager.open({
          name: 'testDB',
          version: 1,
          stores: {
            users: { keyPath: 'id', autoIncrement: true },
            settings: { keyPath: 'key' },
          },
        });

        expect(mockIDB.open).toHaveBeenCalledWith('testDB', 1);
        db.close();
      });

      it('should create indexes on stores', async () => {
        globalThis.indexedDB = createMockIndexedDB();

        const db = await IndexedDBManager.open({
          name: 'testDB',
          version: 1,
          stores: {
            products: {
              keyPath: 'id',
              indexes: {
                byName: { keyPath: 'name', unique: true },
                byCategory: { keyPath: 'category', multiEntry: true },
              },
            },
          },
        });

        db.close();
      });

      it('should handle open error', async () => {
        globalThis.indexedDB = {
          open: vi.fn(() => {
            const request = createMockOpenRequest(createMockDatabase('test', 1));
            (request as { error: DOMException | null }).error = new DOMException('Open failed');
            setTimeout(() => request.onerror?.call(request, new Event('error')), 0);
            return request;
          }),
          deleteDatabase: vi.fn(),
          cmp: vi.fn(),
          databases: vi.fn(),
        } as unknown as IDBFactory;

        await expect(
          IndexedDBManager.open({
            name: 'testDB',
            version: 1,
            stores: {},
          })
        ).rejects.toThrow(IndexedDBError);
      });

      it('should handle blocked event', async () => {
        globalThis.indexedDB = {
          open: vi.fn(() => {
            const request = createMockOpenRequest(createMockDatabase('test', 1));
            setTimeout(
              () => request.onblocked?.call(request, new Event('blocked') as IDBVersionChangeEvent),
              0
            );
            return request;
          }),
          deleteDatabase: vi.fn(),
          cmp: vi.fn(),
          databases: vi.fn(),
        } as unknown as IDBFactory;

        await expect(
          IndexedDBManager.open({
            name: 'testDB',
            version: 2,
            stores: {},
          })
        ).rejects.toThrow(IndexedDBError);
      });

      it('should handle existing stores during upgrade', async () => {
        const existingStoreNames = new Set(['users']);
        const existingStore = createMockObjectStore();
        let objectStoreCallCount = 0;

        globalThis.indexedDB = {
          open: vi.fn((name: string, version?: number) => {
            const db = createMockDatabase(name, version ?? 1);
            // Mock existing store names using a Set-like interface
            Object.defineProperty(db, 'objectStoreNames', {
              value: {
                contains: (n: string) => existingStoreNames.has(n),
                length: existingStoreNames.size,
                item: vi.fn(),
                [Symbol.iterator]: () => existingStoreNames.values(),
              },
              writable: true,
            });

            const request = createMockOpenRequest(db);
            // Create a proper mock transaction that returns the existing store
            const upgradeTransaction = {
              objectStore: vi.fn((storeName: string) => {
                objectStoreCallCount++;
                if (existingStoreNames.has(storeName)) {
                  return existingStore;
                }
                throw new Error(`Store ${storeName} not found`);
              }),
              mode: 'versionchange' as IDBTransactionMode,
              db,
              error: null,
              abort: vi.fn(),
            };
            (request as unknown as { transaction: typeof upgradeTransaction }).transaction =
              upgradeTransaction;

            setTimeout(() => {
              if (request.onupgradeneeded) {
                const event = {
                  target: request,
                  oldVersion: 0,
                  newVersion: version ?? 1,
                } as unknown as IDBVersionChangeEvent;
                request.onupgradeneeded.call(request, event);
              }
              request.onsuccess?.call(request, new Event('success'));
            }, 0);

            return request;
          }),
          deleteDatabase: vi.fn(),
          cmp: vi.fn(),
          databases: vi.fn(),
        } as unknown as IDBFactory;

        const db = await IndexedDBManager.open({
          name: 'testDB',
          version: 2,
          stores: {
            users: { keyPath: 'id' }, // Existing store
            settings: { keyPath: 'key' }, // New store
          },
        });

        // Verify that objectStore was called for the existing 'users' store
        expect(objectStoreCallCount).toBe(1);

        db.close();
      });

      it('should skip creating existing indexes', async () => {
        globalThis.indexedDB = {
          open: vi.fn((name: string, version?: number) => {
            const db = createMockDatabase(name, version ?? 1);
            const request = createMockOpenRequest(db);

            // Override createObjectStore to return store with existing index
            db.createObjectStore = vi.fn(() => {
              const store = createMockObjectStore();
              (store.indexNames as unknown as { contains: (n: string) => boolean }).contains = (
                n: string
              ) => n === 'existingIndex';
              return store;
            });

            setTimeout(() => {
              if (request.onupgradeneeded) {
                const event = {
                  target: request,
                  oldVersion: 0,
                  newVersion: version ?? 1,
                } as unknown as IDBVersionChangeEvent;
                request.onupgradeneeded.call(request, event);
              }
              request.onsuccess?.call(request, new Event('success'));
            }, 0);

            return request;
          }),
          deleteDatabase: vi.fn(),
          cmp: vi.fn(),
          databases: vi.fn(),
        } as unknown as IDBFactory;

        const db = await IndexedDBManager.open({
          name: 'testDB',
          version: 1,
          stores: {
            products: {
              keyPath: 'id',
              indexes: {
                existingIndex: { keyPath: 'name' }, // Should be skipped
                newIndex: { keyPath: 'category' }, // Should be created
              },
            },
          },
        });

        db.close();
      });
    });

    describe('openResult with mock', () => {
      it('should return Ok result on success', async () => {
        globalThis.indexedDB = createMockIndexedDB();

        const result = await IndexedDBManager.openResult({
          name: 'testDB',
          version: 1,
          stores: {},
        });

        expect(result._tag).toBe('Ok');
        if (result._tag === 'Ok') {
          result.value.close();
        }
      });

      it('should return Err result with IndexedDBError on failure', async () => {
        globalThis.indexedDB = {
          open: vi.fn(() => {
            const request = createMockOpenRequest(createMockDatabase('test', 1));
            (request as { error: DOMException | null }).error = new DOMException('Open failed');
            setTimeout(() => request.onerror?.call(request, new Event('error')), 0);
            return request;
          }),
          deleteDatabase: vi.fn(),
          cmp: vi.fn(),
          databases: vi.fn(),
        } as unknown as IDBFactory;

        const result = await IndexedDBManager.openResult({
          name: 'testDB',
          version: 1,
          stores: {},
        });

        expect(result._tag).toBe('Err');
        if (result._tag === 'Err') {
          expect(result.error).toBeInstanceOf(IndexedDBError);
        }
      });

      it('should wrap non-IndexedDBError in IndexedDBError', async () => {
        globalThis.indexedDB = {
          open: vi.fn(() => {
            throw new Error('Unexpected error');
          }),
          deleteDatabase: vi.fn(),
          cmp: vi.fn(),
          databases: vi.fn(),
        } as unknown as IDBFactory;

        const result = await IndexedDBManager.openResult({
          name: 'testDB',
          version: 1,
          stores: {},
        });

        expect(result._tag).toBe('Err');
        if (result._tag === 'Err') {
          expect(result.error).toBeInstanceOf(IndexedDBError);
          expect(result.error.code).toBe('OPEN_FAILED');
        }
      });
    });

    describe('deleteDatabase with mock', () => {
      it('should delete database successfully', async () => {
        const mockIDB = createMockIndexedDB();
        globalThis.indexedDB = mockIDB;

        await IndexedDBManager.deleteDatabase('testDB');

        expect(mockIDB.deleteDatabase).toHaveBeenCalledWith('testDB');
      });

      it('should handle delete error', async () => {
        globalThis.indexedDB = {
          open: vi.fn(),
          deleteDatabase: vi.fn(() => {
            const request = createMockRequest<undefined>(undefined) as unknown as IDBOpenDBRequest;
            (request as unknown as { onerror: ((ev: Event) => void) | null }).onerror = null;
            (request as unknown as { onblocked: ((ev: Event) => void) | null }).onblocked = null;
            (request as { error: DOMException | null }).error = new DOMException('Delete failed');
            setTimeout(
              () =>
                (request as unknown as { onerror: ((ev: Event) => void) | null }).onerror?.(
                  new Event('error')
                ),
              0
            );
            return request;
          }),
          cmp: vi.fn(),
          databases: vi.fn(),
        } as unknown as IDBFactory;

        await expect(IndexedDBManager.deleteDatabase('testDB')).rejects.toThrow(IndexedDBError);
      });

      it('should handle blocked event during delete', async () => {
        globalThis.indexedDB = {
          open: vi.fn(),
          deleteDatabase: vi.fn(() => {
            const request = createMockRequest<undefined>(undefined) as unknown as IDBOpenDBRequest;
            (request as unknown as { onerror: ((ev: Event) => void) | null }).onerror = null;
            (request as unknown as { onblocked: ((ev: Event) => void) | null }).onblocked = null;
            setTimeout(
              () =>
                (request as unknown as { onblocked: ((ev: Event) => void) | null }).onblocked?.(
                  new Event('blocked')
                ),
              0
            );
            return request;
          }),
          cmp: vi.fn(),
          databases: vi.fn(),
        } as unknown as IDBFactory;

        await expect(IndexedDBManager.deleteDatabase('testDB')).rejects.toThrow(IndexedDBError);
      });
    });

    describe('createInstance operations', () => {
      it('should perform get operation', async () => {
        globalThis.indexedDB = createMockIndexedDB();

        const db = await IndexedDBManager.open({
          name: 'testDB',
          version: 1,
          stores: {
            users: { keyPath: 'id' },
          },
        });

        const result = await db.get<{ id: number }>('users', 1);
        expect(result).toBeUndefined();

        db.close();
      });

      it('should perform put operation', async () => {
        globalThis.indexedDB = createMockIndexedDB();

        const db = await IndexedDBManager.open({
          name: 'testDB',
          version: 1,
          stores: {
            users: { keyPath: 'id' },
          },
        });

        const key = await db.put('users', { id: 1, name: 'John' });
        expect(key).toBe(1);

        db.close();
      });

      it('should perform add operation', async () => {
        globalThis.indexedDB = createMockIndexedDB();

        const db = await IndexedDBManager.open({
          name: 'testDB',
          version: 1,
          stores: {
            users: { keyPath: 'id' },
          },
        });

        const key = await db.add('users', { id: 2, name: 'Jane' });
        expect(key).toBe(2);

        db.close();
      });

      it('should perform delete operation', async () => {
        globalThis.indexedDB = createMockIndexedDB();

        const db = await IndexedDBManager.open({
          name: 'testDB',
          version: 1,
          stores: {
            users: { keyPath: 'id' },
          },
        });

        await db.delete('users', 1);

        db.close();
      });

      it('should perform clear operation', async () => {
        globalThis.indexedDB = createMockIndexedDB();

        const db = await IndexedDBManager.open({
          name: 'testDB',
          version: 1,
          stores: {
            users: { keyPath: 'id' },
          },
        });

        await db.clear('users');

        db.close();
      });

      it('should perform getAll operation', async () => {
        globalThis.indexedDB = createMockIndexedDB();

        const db = await IndexedDBManager.open({
          name: 'testDB',
          version: 1,
          stores: {
            users: { keyPath: 'id' },
          },
        });

        const result = await db.getAll<{ id: number }>('users');
        expect(Array.isArray(result)).toBe(true);

        db.close();
      });

      it('should perform count operation', async () => {
        globalThis.indexedDB = createMockIndexedDB();

        const db = await IndexedDBManager.open({
          name: 'testDB',
          version: 1,
          stores: {
            users: { keyPath: 'id' },
          },
        });

        const count = await db.count('users');
        expect(typeof count).toBe('number');

        db.close();
      });

      it('should handle request error in executeInTransaction', async () => {
        globalThis.indexedDB = {
          open: vi.fn((name: string, version?: number) => {
            const db = createMockDatabase(name, version ?? 1);

            // Override transaction to return store that fails on operations
            db.transaction = vi.fn(() => {
              const failingStore = createMockObjectStore();
              failingStore.get = vi.fn(() => {
                const req = createMockRequest(undefined);
                (req as { error: DOMException | null }).error = new DOMException('Get failed');
                setTimeout(() => req.onerror?.call(req, new Event('error')), 0);
                return req;
              });

              return createMockTransaction(new Map([['users', failingStore]]));
            });

            const request = createMockOpenRequest(db);
            setTimeout(() => {
              if (request.onupgradeneeded) {
                const event = {
                  target: request,
                  oldVersion: 0,
                  newVersion: version ?? 1,
                } as unknown as IDBVersionChangeEvent;
                request.onupgradeneeded.call(request, event);
              }
              request.onsuccess?.call(request, new Event('success'));
            }, 0);

            return request;
          }),
          deleteDatabase: vi.fn(),
          cmp: vi.fn(),
          databases: vi.fn(),
        } as unknown as IDBFactory;

        const db = await IndexedDBManager.open({
          name: 'testDB',
          version: 1,
          stores: {
            users: { keyPath: 'id' },
          },
        });

        await expect(db.get('users', 1)).rejects.toThrow(IndexedDBError);

        db.close();
      });

      it('should handle transaction error in executeInTransaction', async () => {
        globalThis.indexedDB = {
          open: vi.fn((name: string, version?: number) => {
            const db = createMockDatabase(name, version ?? 1);

            db.transaction = vi.fn(() => {
              const store = createMockObjectStore();
              // Override store.get to not call onsuccess (simulating pending state)
              store.get = vi.fn(() =>
                // Don't call onsuccess - let transaction error handle it
                createMockRequest(undefined)
              );
              const tx = createMockTransaction(new Map([['users', store]]), false);
              // Trigger transaction error after a short delay
              setTimeout(() => {
                (tx as unknown as { error: DOMException }).error = new DOMException(
                  'Transaction error'
                );
                tx.onerror?.call(tx, new Event('error'));
              }, 5);
              return tx;
            });

            const request = createMockOpenRequest(db);
            setTimeout(() => {
              if (request.onupgradeneeded) {
                const event = {
                  target: request,
                  oldVersion: 0,
                  newVersion: version ?? 1,
                } as unknown as IDBVersionChangeEvent;
                request.onupgradeneeded.call(request, event);
              }
              request.onsuccess?.call(request, new Event('success'));
            }, 0);

            return request;
          }),
          deleteDatabase: vi.fn(),
          cmp: vi.fn(),
          databases: vi.fn(),
        } as unknown as IDBFactory;

        const db = await IndexedDBManager.open({
          name: 'testDB',
          version: 1,
          stores: {
            users: { keyPath: 'id' },
          },
        });

        await expect(db.get('users', 1)).rejects.toThrow(IndexedDBError);

        db.close();
      });

      it('should handle exception in executeInTransaction', async () => {
        globalThis.indexedDB = {
          open: vi.fn((name: string, version?: number) => {
            const db = createMockDatabase(name, version ?? 1);

            db.transaction = vi.fn(() => {
              throw new Error('Transaction creation failed');
            });

            const request = createMockOpenRequest(db);
            setTimeout(() => {
              if (request.onupgradeneeded) {
                const event = {
                  target: request,
                  oldVersion: 0,
                  newVersion: version ?? 1,
                } as unknown as IDBVersionChangeEvent;
                request.onupgradeneeded.call(request, event);
              }
              request.onsuccess?.call(request, new Event('success'));
            }, 0);

            return request;
          }),
          deleteDatabase: vi.fn(),
          cmp: vi.fn(),
          databases: vi.fn(),
        } as unknown as IDBFactory;

        const db = await IndexedDBManager.open({
          name: 'testDB',
          version: 1,
          stores: {
            users: { keyPath: 'id' },
          },
        });

        await expect(db.get('users', 1)).rejects.toThrow(IndexedDBError);

        db.close();
      });
    });

    describe('transaction method', () => {
      it('should execute transaction with single store name', async () => {
        globalThis.indexedDB = createMockIndexedDB();

        const db = await IndexedDBManager.open({
          name: 'testDB',
          version: 1,
          stores: {
            users: { keyPath: 'id' },
          },
        });

        const result = await db.transaction('users', 'readwrite', async (tx) => {
          await tx.put('users', { id: 1, name: 'John' });
          return 'success';
        });

        expect(result).toBe('success');

        db.close();
      });

      it('should execute transaction with multiple store names', async () => {
        globalThis.indexedDB = createMockIndexedDB();

        const db = await IndexedDBManager.open({
          name: 'testDB',
          version: 1,
          stores: {
            users: { keyPath: 'id' },
            settings: { keyPath: 'key' },
          },
        });

        const result = await db.transaction(['users', 'settings'], 'readwrite', async (tx) => {
          await tx.put('users', { id: 1, name: 'John' });
          await tx.put('settings', { key: 'theme', value: 'dark' });
          return 'done';
        });

        expect(result).toBe('done');

        db.close();
      });

      it('should handle transaction callback error', async () => {
        globalThis.indexedDB = createMockIndexedDB();

        const db = await IndexedDBManager.open({
          name: 'testDB',
          version: 1,
          stores: {
            users: { keyPath: 'id' },
          },
        });

        await expect(
          db.transaction('users', 'readwrite', async () => {
            throw new Error('Callback error');
          })
        ).rejects.toThrow(IndexedDBError);

        db.close();
      });

      it('should handle transaction creation exception', async () => {
        globalThis.indexedDB = {
          open: vi.fn((name: string, version?: number) => {
            const db = createMockDatabase(name, version ?? 1);

            // First call succeeds (for instance operations), subsequent fail
            let callCount = 0;
            const originalTransaction = db.transaction;
            db.transaction = vi.fn((...args: [string | string[], IDBTransactionMode?]) => {
              callCount++;
              if (callCount > 5) {
                throw new Error('Transaction creation failed');
              }
              return originalTransaction.apply(db, args);
            });

            const request = createMockOpenRequest(db);
            setTimeout(() => {
              if (request.onupgradeneeded) {
                const event = {
                  target: request,
                  oldVersion: 0,
                  newVersion: version ?? 1,
                } as unknown as IDBVersionChangeEvent;
                request.onupgradeneeded.call(request, event);
              }
              request.onsuccess?.call(request, new Event('success'));
            }, 0);

            return request;
          }),
          deleteDatabase: vi.fn(),
          cmp: vi.fn(),
          databases: vi.fn(),
        } as unknown as IDBFactory;

        const db = await IndexedDBManager.open({
          name: 'testDB',
          version: 1,
          stores: {
            users: { keyPath: 'id' },
          },
        });

        // Exhaust the call count
        try {
          await db.get('users', 1);
        } catch {
          /* ignore */
        }
        try {
          await db.get('users', 1);
        } catch {
          /* ignore */
        }
        try {
          await db.get('users', 1);
        } catch {
          /* ignore */
        }
        try {
          await db.get('users', 1);
        } catch {
          /* ignore */
        }
        try {
          await db.get('users', 1);
        } catch {
          /* ignore */
        }

        await expect(db.transaction('users', 'readwrite', async () => 'result')).rejects.toThrow(
          IndexedDBError
        );

        db.close();
      });

      it('should handle transaction onerror', async () => {
        globalThis.indexedDB = {
          open: vi.fn((name: string, version?: number) => {
            const db = createMockDatabase(name, version ?? 1);

            db.transaction = vi.fn(() => {
              const store = createMockObjectStore();
              // Make store.put not resolve, keeping the promise pending
              store.put = vi.fn(() =>
                // Don't call onsuccess - leave pending
                createMockRequest<IDBValidKey>(1)
              );
              const tx = createMockTransaction(new Map([['users', store]]), false);
              // Trigger transaction error before anything completes
              setTimeout(() => {
                (tx as unknown as { error: DOMException }).error = new DOMException(
                  'Transaction failed'
                );
                tx.onerror?.call(tx, new Event('error'));
              }, 5);
              return tx;
            });

            const request = createMockOpenRequest(db);
            setTimeout(() => {
              if (request.onupgradeneeded) {
                const event = {
                  target: request,
                  oldVersion: 0,
                  newVersion: version ?? 1,
                } as unknown as IDBVersionChangeEvent;
                request.onupgradeneeded.call(request, event);
              }
              request.onsuccess?.call(request, new Event('success'));
            }, 0);

            return request;
          }),
          deleteDatabase: vi.fn(),
          cmp: vi.fn(),
          databases: vi.fn(),
        } as unknown as IDBFactory;

        const db = await IndexedDBManager.open({
          name: 'testDB',
          version: 1,
          stores: {
            users: { keyPath: 'id' },
          },
        });

        await expect(
          db.transaction('users', 'readwrite', async (tx) => {
            await tx.put('users', { id: 1, name: 'John' });
            return 'result';
          })
        ).rejects.toThrow(IndexedDBError);

        db.close();
      });
    });

    describe('TransactionContext operations', () => {
      it('should perform all context operations within transaction', async () => {
        globalThis.indexedDB = createMockIndexedDB();

        const db = await IndexedDBManager.open({
          name: 'testDB',
          version: 1,
          stores: {
            users: { keyPath: 'id' },
          },
        });

        await db.transaction('users', 'readwrite', async (tx) => {
          // Test all TransactionContext methods
          await tx.put('users', { id: 1, name: 'John' });
          await tx.add('users', { id: 2, name: 'Jane' });

          const user = await tx.get<{ id: number; name: string }>('users', 1);
          expect(user).toBeDefined();

          const all = await tx.getAll<{ id: number; name: string }>('users');
          expect(Array.isArray(all)).toBe(true);

          const count = await tx.count('users');
          expect(typeof count).toBe('number');

          await tx.delete('users', 1);
          await tx.clear('users');
        });

        db.close();
      });
    });

    describe('promisifyRequest error handling', () => {
      it('should reject with IndexedDBError when a put request fails', async () => {
        globalThis.indexedDB = {
          open: vi.fn((name: string, version?: number) => {
            const db = createMockDatabase(name, version ?? 1);

            // Override transaction to return store with failing put
            db.transaction = vi.fn(() => {
              const failingStore = createMockObjectStore();
              failingStore.put = vi.fn((): IDBRequest => {
                const req = createMockRequest(undefined);
                (req as { error: DOMException | null }).error = new DOMException('Write failed');
                setTimeout(() => req.onerror?.call(req, new Event('error')), 0);
                return req;
              });

              return createMockTransaction(new Map([['users', failingStore]]));
            });

            const request = createMockOpenRequest(db);
            setTimeout(() => {
              if (request.onupgradeneeded) {
                const event = {
                  target: request,
                  oldVersion: 0,
                  newVersion: version ?? 1,
                } as unknown as IDBVersionChangeEvent;
                request.onupgradeneeded.call(request, event);
              }
              request.onsuccess?.call(request, new Event('success'));
            }, 0);

            return request;
          }),
          deleteDatabase: vi.fn(),
          cmp: vi.fn(),
          databases: vi.fn(),
        } as unknown as IDBFactory;

        const db = await IndexedDBManager.open({
          name: 'testDB',
          version: 1,
          stores: {
            users: { keyPath: 'id' },
          },
        });

        await expect(db.put('users', { id: 1, name: 'Test' })).rejects.toThrow(IndexedDBError);

        db.close();
      });
    });
  });
});
