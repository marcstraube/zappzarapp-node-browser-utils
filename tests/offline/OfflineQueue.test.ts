/**
 * OfflineQueue Tests.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  OfflineQueue,
  OfflineQueueError,
  type OfflineQueueInstance,
} from '../../src/offline/index.js';
import { IndexedDBManager } from '../../src/indexeddb/index.js';

// =============================================================================
// Mock Helpers
// =============================================================================

/**
 * Creates a mock IDBRequest that resolves synchronously.
 */
function createMockRequest<T>(result?: T): IDBRequest<T> {
  const req = {
    result: result as T,
    error: null as DOMException | null,
    onsuccess: null as ((this: IDBRequest<T>, ev: Event) => void) | null,
    onerror: null as ((this: IDBRequest<T>, ev: Event) => void) | null,
    readyState: 'done' as IDBRequestReadyState,
    source: null,
    transaction: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as IDBRequest<T>;

  // Trigger success synchronously via microtask
  queueMicrotask(() => {
    req.onsuccess?.call(req, new Event('success'));
  });

  return req;
}

/**
 * Creates a mock IDBObjectStore with synchronous operations.
 */
function createMockObjectStore(data: Map<IDBValidKey, unknown> = new Map()): IDBObjectStore {
  const indexNames = {
    contains: vi.fn().mockReturnValue(false),
    length: 0,
  } as unknown as DOMStringList;

  return {
    name: 'queue',
    keyPath: 'id',
    indexNames,
    autoIncrement: false,
    transaction: null as unknown,
    add: vi.fn((value: unknown, key?: IDBValidKey) => {
      const k = key ?? (value as { id: IDBValidKey }).id;
      data.set(k, value);
      return createMockRequest(k);
    }),
    put: vi.fn((value: unknown, key?: IDBValidKey) => {
      const k = key ?? (value as { id: IDBValidKey }).id;
      data.set(k, value);
      return createMockRequest(k);
    }),
    get: vi.fn((key: IDBValidKey) => {
      return createMockRequest(data.get(key));
    }),
    delete: vi.fn((key: IDBValidKey) => {
      data.delete(key);
      return createMockRequest<undefined>(undefined);
    }),
    clear: vi.fn(() => {
      data.clear();
      return createMockRequest<undefined>(undefined);
    }),
    getAll: vi.fn(() => {
      return createMockRequest(Array.from(data.values()));
    }),
    count: vi.fn(() => {
      return createMockRequest(data.size);
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
 * Creates a mock IDBTransaction.
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
      if (autoComplete && handler) {
        queueMicrotask(() =>
          handler.call(transaction as unknown as IDBTransaction, new Event('complete'))
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
  const storeData = new Map<string, Map<IDBValidKey, unknown>>();

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
      const data = new Map<IDBValidKey, unknown>();
      storeData.set(storeName, data);
      const store = createMockObjectStore(data);
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
      storeData.delete(storeName);
    }),
    transaction: vi.fn((storeNames: string | string[]) => {
      const names = Array.isArray(storeNames) ? storeNames : [storeNames];
      const txStores = new Map<string, IDBObjectStore>();
      for (const n of names) {
        let store = stores.get(n);
        if (!store) {
          const data = storeData.get(n) ?? new Map<IDBValidKey, unknown>();
          storeData.set(n, data);
          store = createMockObjectStore(data);
          stores.set(n, store);
        }
        txStores.set(n, store);
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

      queueMicrotask(() => {
        if (request.onupgradeneeded) {
          const event = {
            target: request,
            oldVersion: 0,
            newVersion: version ?? 1,
          } as unknown as IDBVersionChangeEvent;
          request.onupgradeneeded.call(request, event);
        }
        request.onsuccess?.call(request, new Event('success'));
      });

      return request;
    }),
    deleteDatabase: vi.fn(() => {
      const request = createMockRequest<undefined>(undefined);
      return request as unknown as IDBOpenDBRequest;
    }),
    cmp: vi.fn(),
    databases: vi.fn(),
  } as unknown as IDBFactory;
}

/**
 * Helper to flush microtasks.
 */
async function flushMicrotasks(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

// =============================================================================
// Test Data Types
// =============================================================================

interface TestData {
  action: string;
  payload: string;
}

// =============================================================================
// Tests
// =============================================================================

describe('OfflineQueue', () => {
  let originalIndexedDB: IDBFactory | undefined;
  let originalNavigator: PropertyDescriptor | undefined;
  let originalWindow: PropertyDescriptor | undefined;
  let originalCrypto: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalIndexedDB = globalThis.indexedDB;
    originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    originalCrypto = Object.getOwnPropertyDescriptor(globalThis, 'crypto');

    // Set up default mocks
    globalThis.indexedDB = createMockIndexedDB();
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: true },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();

    if (originalIndexedDB) {
      globalThis.indexedDB = originalIndexedDB;
    } else {
      // @ts-expect-error - Restore undefined state
      delete globalThis.indexedDB;
    }

    if (originalNavigator) {
      Object.defineProperty(globalThis, 'navigator', originalNavigator);
    }

    if (originalWindow) {
      Object.defineProperty(globalThis, 'window', originalWindow);
    }

    if (originalCrypto) {
      Object.defineProperty(globalThis, 'crypto', originalCrypto);
    }
  });

  // ===========================================================================
  // OfflineQueueError
  // ===========================================================================

  describe('OfflineQueueError', () => {
    it('should create NOT_SUPPORTED error', () => {
      const error = OfflineQueueError.notSupported();
      expect(error.code).toBe('NOT_SUPPORTED');
      expect(error.message).toBe('OfflineQueue requires IndexedDB support which is not available');
    });

    it('should create DATABASE_ERROR error with operation name', () => {
      const cause = new Error('Database failure');
      const error = OfflineQueueError.databaseError('add', cause);
      expect(error.code).toBe('DATABASE_ERROR');
      expect(error.message).toBe('Database operation "add" failed');
      expect(error.cause).toBe(cause);
    });

    it('should create PROCESSOR_ERROR error', () => {
      const cause = new Error('Processing failed');
      const error = OfflineQueueError.processorError(cause);
      expect(error.code).toBe('PROCESSOR_ERROR');
      expect(error.message).toBe('Queue item processor failed');
      expect(error.cause).toBe(cause);
    });

    it('should create CRYPTO_UNAVAILABLE error', () => {
      const error = OfflineQueueError.cryptoUnavailable();
      expect(error.code).toBe('CRYPTO_UNAVAILABLE');
      expect(error.message).toContain('Crypto API is not available');
    });

    it('should create QUEUE_DESTROYED error', () => {
      const error = OfflineQueueError.queueDestroyed();
      expect(error.code).toBe('QUEUE_DESTROYED');
      expect(error.message).toBe('Queue has been destroyed');
    });

    it('should be instanceof Error', () => {
      const error = OfflineQueueError.notSupported();
      expect(error).toBeInstanceOf(Error);
    });
  });

  // ===========================================================================
  // isSupported
  // ===========================================================================

  describe('isSupported', () => {
    it('should return true when IndexedDB is available', () => {
      globalThis.indexedDB = createMockIndexedDB();
      expect(OfflineQueue.isSupported()).toBe(true);
    });

    it('should return false when IndexedDB is not available', () => {
      // @ts-expect-error - Testing undefined
      delete globalThis.indexedDB;
      expect(OfflineQueue.isSupported()).toBe(false);
    });

    it('should delegate to IndexedDBManager.isSupported', () => {
      const spy = vi.spyOn(IndexedDBManager, 'isSupported');
      OfflineQueue.isSupported();
      expect(spy).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // create
  // ===========================================================================

  describe('create', () => {
    it('should throw when IndexedDB is not supported', async () => {
      // @ts-expect-error - Testing undefined
      delete globalThis.indexedDB;

      await expect(
        OfflineQueue.create({
          name: 'test-queue',
          processor: async () => {},
        })
      ).rejects.toThrow(OfflineQueueError);
    });

    it('should create queue with default options', async () => {
      const queue = await OfflineQueue.create<TestData>({
        name: 'test-queue',
        processor: async () => {},
        autoSync: false,
      });

      expect(queue.name).toBe('test-queue');
      queue.destroy();
    });

    it('should create queue with custom options', async () => {
      const queue = await OfflineQueue.create<TestData>({
        name: 'custom-queue',
        processor: async () => {},
        maxRetries: 5,
        syncDelay: 2000,
        autoSync: false,
        conflictResolver: () => 'keep-remote',
      });

      expect(queue.name).toBe('custom-queue');
      queue.destroy();
    });

    it('should handle database open error', async () => {
      globalThis.indexedDB = {
        open: vi.fn(() => {
          const request = createMockOpenRequest(createMockDatabase('test', 1));
          (request as { error: DOMException | null }).error = new DOMException('Open failed');
          queueMicrotask(() => request.onerror?.call(request, new Event('error')));
          return request;
        }),
        deleteDatabase: vi.fn(),
        cmp: vi.fn(),
        databases: vi.fn(),
      } as unknown as IDBFactory;

      await expect(
        OfflineQueue.create({
          name: 'test-queue',
          processor: async () => {},
        })
      ).rejects.toThrow(OfflineQueueError);
    });
  });

  // ===========================================================================
  // add
  // ===========================================================================

  describe('add', () => {
    let queue: OfflineQueueInstance<TestData>;

    beforeEach(async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: false },
        writable: true,
        configurable: true,
      });

      queue = await OfflineQueue.create<TestData>({
        name: 'test-queue',
        processor: async () => {},
        autoSync: false,
      });
    });

    afterEach(() => {
      queue.destroy();
    });

    it('should add item with default priority', async () => {
      const item = await queue.add({ action: 'create', payload: 'test' });

      expect(item.id).toBeDefined();
      expect(item.data).toEqual({ action: 'create', payload: 'test' });
      expect(item.priority).toBe(0);
      expect(item.retryCount).toBe(0);
      expect(item.createdAt).toBeDefined();
    });

    it('should add item with custom priority', async () => {
      const item = await queue.add({ action: 'urgent', payload: 'data' }, -10);
      expect(item.priority).toBe(-10);
    });

    it('should throw when queue is destroyed', async () => {
      queue.destroy();

      await expect(queue.add({ action: 'test', payload: 'data' })).rejects.toThrow(
        OfflineQueueError
      );
    });

    it('should throw CryptoError when crypto is unavailable', async () => {
      queue.destroy();

      // Remove crypto API
      // @ts-expect-error - Testing undefined
      delete globalThis.crypto;

      queue = await OfflineQueue.create<TestData>({
        name: 'test-queue-no-crypto',
        processor: async () => {},
        autoSync: false,
      });

      await expect(queue.add({ action: 'test', payload: 'data' })).rejects.toThrow(
        OfflineQueueError
      );
    });
  });

  // ===========================================================================
  // remove
  // ===========================================================================

  describe('remove', () => {
    let queue: OfflineQueueInstance<TestData>;

    beforeEach(async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: false },
        writable: true,
        configurable: true,
      });

      queue = await OfflineQueue.create<TestData>({
        name: 'test-queue',
        processor: async () => {},
        autoSync: false,
      });
    });

    afterEach(() => {
      queue.destroy();
    });

    it('should remove existing item and return true', async () => {
      const item = await queue.add({ action: 'test', payload: 'data' });
      const result = await queue.remove(item.id);
      expect(result).toBe(true);
    });

    it('should return false for non-existent item', async () => {
      const result = await queue.remove('non-existent-id');
      expect(result).toBe(false);
    });

    it('should throw when queue is destroyed', async () => {
      queue.destroy();
      await expect(queue.remove('some-id')).rejects.toThrow(OfflineQueueError);
    });
  });

  // ===========================================================================
  // peek
  // ===========================================================================

  describe('peek', () => {
    let queue: OfflineQueueInstance<TestData>;

    beforeEach(async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: false },
        writable: true,
        configurable: true,
      });

      queue = await OfflineQueue.create<TestData>({
        name: 'test-queue',
        processor: async () => {},
        autoSync: false,
      });
    });

    afterEach(() => {
      queue.destroy();
    });

    it('should return undefined for empty queue', async () => {
      const item = await queue.peek();
      expect(item).toBeUndefined();
    });

    it('should return highest priority item', async () => {
      await queue.add({ action: 'low', payload: 'low-priority' }, 10);
      await queue.add({ action: 'high', payload: 'high-priority' }, -5);
      await queue.add({ action: 'medium', payload: 'medium-priority' }, 0);

      const item = await queue.peek();
      expect(item?.data.action).toBe('high');
    });

    it('should not remove item from queue', async () => {
      await queue.add({ action: 'test', payload: 'data' });
      await queue.peek();
      const size = await queue.size();
      expect(size).toBe(1);
    });

    it('should throw when queue is destroyed', async () => {
      queue.destroy();
      await expect(queue.peek()).rejects.toThrow(OfflineQueueError);
    });
  });

  // ===========================================================================
  // clear
  // ===========================================================================

  describe('clear', () => {
    let queue: OfflineQueueInstance<TestData>;

    beforeEach(async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: false },
        writable: true,
        configurable: true,
      });

      queue = await OfflineQueue.create<TestData>({
        name: 'test-queue',
        processor: async () => {},
        autoSync: false,
      });
    });

    afterEach(() => {
      queue.destroy();
    });

    it('should remove all items from queue', async () => {
      await queue.add({ action: 'test1', payload: 'data1' });
      await queue.add({ action: 'test2', payload: 'data2' });
      await queue.add({ action: 'test3', payload: 'data3' });

      await queue.clear();

      const size = await queue.size();
      expect(size).toBe(0);
    });

    it('should work on empty queue', async () => {
      await queue.clear();
      const size = await queue.size();
      expect(size).toBe(0);
    });

    it('should throw when queue is destroyed', async () => {
      queue.destroy();
      await expect(queue.clear()).rejects.toThrow(OfflineQueueError);
    });
  });

  // ===========================================================================
  // size
  // ===========================================================================

  describe('size', () => {
    let queue: OfflineQueueInstance<TestData>;

    beforeEach(async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: false },
        writable: true,
        configurable: true,
      });

      queue = await OfflineQueue.create<TestData>({
        name: 'test-queue',
        processor: async () => {},
        autoSync: false,
      });
    });

    afterEach(() => {
      queue.destroy();
    });

    it('should return 0 for empty queue', async () => {
      const size = await queue.size();
      expect(size).toBe(0);
    });

    it('should return correct count after adding items', async () => {
      await queue.add({ action: 'test1', payload: 'data1' });
      await queue.add({ action: 'test2', payload: 'data2' });

      const size = await queue.size();
      expect(size).toBe(2);
    });

    it('should throw when queue is destroyed', async () => {
      queue.destroy();
      await expect(queue.size()).rejects.toThrow(OfflineQueueError);
    });
  });

  // ===========================================================================
  // getAll
  // ===========================================================================

  describe('getAll', () => {
    let queue: OfflineQueueInstance<TestData>;

    beforeEach(async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: false },
        writable: true,
        configurable: true,
      });

      queue = await OfflineQueue.create<TestData>({
        name: 'test-queue',
        processor: async () => {},
        autoSync: false,
      });
    });

    afterEach(() => {
      queue.destroy();
    });

    it('should return empty array for empty queue', async () => {
      const items = await queue.getAll();
      expect(items).toEqual([]);
    });

    it('should return all items sorted by priority', async () => {
      await queue.add({ action: 'medium', payload: 'medium' }, 0);
      await queue.add({ action: 'high', payload: 'high' }, -10);
      await queue.add({ action: 'low', payload: 'low' }, 10);

      const items = await queue.getAll();

      expect(items).toHaveLength(3);
      expect(items[0]?.data.action).toBe('high');
      expect(items[1]?.data.action).toBe('medium');
      expect(items[2]?.data.action).toBe('low');
    });

    it('should throw when queue is destroyed', async () => {
      queue.destroy();
      await expect(queue.getAll()).rejects.toThrow(OfflineQueueError);
    });
  });

  // ===========================================================================
  // getStats
  // ===========================================================================

  describe('getStats', () => {
    let queue: OfflineQueueInstance<TestData>;

    beforeEach(async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: false },
        writable: true,
        configurable: true,
      });

      queue = await OfflineQueue.create<TestData>({
        name: 'test-queue',
        processor: async () => {},
        autoSync: false,
      });
    });

    afterEach(() => {
      queue.destroy();
    });

    it('should return correct stats for empty queue', async () => {
      const stats = await queue.getStats();

      expect(stats.size).toBe(0);
      expect(stats.failedCount).toBe(0);
      expect(stats.isSyncing).toBe(false);
      expect(stats.isOnline).toBe(false);
    });

    it('should return correct size count', async () => {
      await queue.add({ action: 'test1', payload: 'data1' });
      await queue.add({ action: 'test2', payload: 'data2' });

      const stats = await queue.getStats();
      expect(stats.size).toBe(2);
    });

    it('should return correct online status', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: true },
        writable: true,
        configurable: true,
      });

      const stats = await queue.getStats();
      expect(stats.isOnline).toBe(true);
    });

    it('should throw when queue is destroyed', async () => {
      queue.destroy();
      await expect(queue.getStats()).rejects.toThrow(OfflineQueueError);
    });
  });

  // ===========================================================================
  // sync
  // ===========================================================================

  describe('sync', () => {
    it('should process all items when online', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: true },
        writable: true,
        configurable: true,
      });

      const processor = vi.fn();
      const queue = await OfflineQueue.create<TestData>({
        name: 'test-queue',
        processor,
        autoSync: false,
      });

      await queue.add({ action: 'test1', payload: 'data1' });
      await queue.add({ action: 'test2', payload: 'data2' });

      await queue.sync();
      await flushMicrotasks();

      expect(processor).toHaveBeenCalledTimes(2);

      const size = await queue.size();
      expect(size).toBe(0);

      queue.destroy();
    });

    it('should not process items when offline', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: false },
        writable: true,
        configurable: true,
      });

      const processor = vi.fn();
      const queue = await OfflineQueue.create<TestData>({
        name: 'test-queue',
        processor,
        autoSync: false,
      });

      await queue.add({ action: 'test', payload: 'data' });
      await queue.sync();

      expect(processor).not.toHaveBeenCalled();

      const size = await queue.size();
      expect(size).toBe(1);

      queue.destroy();
    });

    it('should throw when queue is destroyed', async () => {
      const queue = await OfflineQueue.create<TestData>({
        name: 'test-queue',
        processor: async () => {},
        autoSync: false,
      });

      queue.destroy();

      await expect(queue.sync()).rejects.toThrow(OfflineQueueError);
    });

    it('should handle processor errors and retry', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: true },
        writable: true,
        configurable: true,
      });

      let callCount = 0;
      const processor = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 2) {
          throw new Error('Processing failed');
        }
      });

      const errorHandler = vi.fn();

      const queue = await OfflineQueue.create<TestData>({
        name: 'test-queue',
        processor,
        autoSync: false,
        maxRetries: 3,
      });

      queue.onError(errorHandler);

      await queue.add({ action: 'test', payload: 'data' });

      // First sync - should fail
      await queue.sync();
      await flushMicrotasks();

      expect(errorHandler).toHaveBeenCalled();

      // Second sync - should succeed
      await queue.sync();
      await flushMicrotasks();

      const size = await queue.size();
      expect(size).toBe(0);

      queue.destroy();
    });

    it('should remove item after max retries', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: true },
        writable: true,
        configurable: true,
      });

      const processor = vi.fn().mockRejectedValue(new Error('Always fails'));
      const errorHandler = vi.fn();

      const queue = await OfflineQueue.create<TestData>({
        name: 'test-queue',
        processor,
        autoSync: false,
        maxRetries: 2,
      });

      queue.onError(errorHandler);

      await queue.add({ action: 'test', payload: 'data' });

      // First sync - retry count 1
      await queue.sync();
      await flushMicrotasks();

      // Second sync - retry count 2 (max), should be removed
      await queue.sync();
      await flushMicrotasks();

      const size = await queue.size();
      expect(size).toBe(0);

      queue.destroy();
    });

    it('should process items in priority order', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: true },
        writable: true,
        configurable: true,
      });

      const processedItems: string[] = [];
      const processor = vi.fn().mockImplementation((data: TestData) => {
        processedItems.push(data.action);
      });

      const queue = await OfflineQueue.create<TestData>({
        name: 'test-queue',
        processor,
        autoSync: false,
      });

      await queue.add({ action: 'low', payload: 'low' }, 10);
      await queue.add({ action: 'high', payload: 'high' }, -10);
      await queue.add({ action: 'medium', payload: 'medium' }, 0);

      await queue.sync();
      await flushMicrotasks();

      expect(processedItems).toEqual(['high', 'medium', 'low']);

      queue.destroy();
    });
  });

  // ===========================================================================
  // Event Handlers
  // ===========================================================================

  describe('onSync', () => {
    it('should call handler when item is successfully synced', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: true },
        writable: true,
        configurable: true,
      });

      const syncHandler = vi.fn();
      const queue = await OfflineQueue.create<TestData>({
        name: 'test-queue',
        processor: async () => {},
        autoSync: false,
      });

      queue.onSync(syncHandler);

      await queue.add({ action: 'test', payload: 'data' });
      await queue.sync();
      await flushMicrotasks();

      expect(syncHandler).toHaveBeenCalled();
      expect(syncHandler.mock.calls[0]?.[0].data).toEqual({ action: 'test', payload: 'data' });

      queue.destroy();
    });

    it('should return cleanup function', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: true },
        writable: true,
        configurable: true,
      });

      const syncHandler = vi.fn();
      const queue = await OfflineQueue.create<TestData>({
        name: 'test-queue',
        processor: async () => {},
        autoSync: false,
      });

      const cleanup = queue.onSync(syncHandler);
      cleanup();

      await queue.add({ action: 'test', payload: 'data' });
      await queue.sync();
      await flushMicrotasks();

      expect(syncHandler).not.toHaveBeenCalled();

      queue.destroy();
    });
  });

  describe('onError', () => {
    it('should call handler when processing fails', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: true },
        writable: true,
        configurable: true,
      });

      const errorHandler = vi.fn();
      const queue = await OfflineQueue.create<TestData>({
        name: 'test-queue',
        processor: async () => {
          throw new Error('Processing failed');
        },
        autoSync: false,
        maxRetries: 1,
      });

      queue.onError(errorHandler);

      await queue.add({ action: 'test', payload: 'data' });
      await queue.sync();
      await flushMicrotasks();

      expect(errorHandler).toHaveBeenCalled();
      expect(errorHandler.mock.calls[0]?.[0]).toBeInstanceOf(OfflineQueueError);

      queue.destroy();
    });

    it('should return cleanup function', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: true },
        writable: true,
        configurable: true,
      });

      const errorHandler = vi.fn();
      const queue = await OfflineQueue.create<TestData>({
        name: 'test-queue',
        processor: async () => {
          throw new Error('Processing failed');
        },
        autoSync: false,
        maxRetries: 1,
      });

      const cleanup = queue.onError(errorHandler);
      cleanup();

      await queue.add({ action: 'test', payload: 'data' });
      await queue.sync();
      await flushMicrotasks();

      expect(errorHandler).not.toHaveBeenCalled();

      queue.destroy();
    });
  });

  describe('onConflict', () => {
    it('should call handler when resolving conflict', async () => {
      const conflictHandler = vi.fn();
      const queue = await OfflineQueue.create<TestData>({
        name: 'test-queue',
        processor: async () => {},
        autoSync: false,
        conflictResolver: () => 'keep-local',
      });

      queue.onConflict(conflictHandler);

      const local = { action: 'local', payload: 'local-data' };
      const remote = { action: 'remote', payload: 'remote-data' };

      queue.resolveConflict(local, remote);

      expect(conflictHandler).toHaveBeenCalledWith('keep-local', local, remote);

      queue.destroy();
    });

    it('should return cleanup function', async () => {
      const conflictHandler = vi.fn();
      const queue = await OfflineQueue.create<TestData>({
        name: 'test-queue',
        processor: async () => {},
        autoSync: false,
      });

      const cleanup = queue.onConflict(conflictHandler);
      cleanup();

      queue.resolveConflict(
        { action: 'local', payload: 'local' },
        { action: 'remote', payload: 'remote' }
      );

      expect(conflictHandler).not.toHaveBeenCalled();

      queue.destroy();
    });
  });

  // ===========================================================================
  // resolveConflict
  // ===========================================================================

  describe('resolveConflict', () => {
    it('should use default last-write-wins strategy', async () => {
      const queue = await OfflineQueue.create<TestData>({
        name: 'test-queue',
        processor: async () => {},
        autoSync: false,
      });

      const result = queue.resolveConflict(
        { action: 'local', payload: 'local' },
        { action: 'remote', payload: 'remote' }
      );

      expect(result).toBe('keep-local');

      queue.destroy();
    });

    it('should use custom conflict resolver returning keep-remote', async () => {
      const queue = await OfflineQueue.create<TestData>({
        name: 'test-queue',
        processor: async () => {},
        autoSync: false,
        conflictResolver: () => 'keep-remote',
      });

      const result = queue.resolveConflict(
        { action: 'local', payload: 'local' },
        { action: 'remote', payload: 'remote' }
      );

      expect(result).toBe('keep-remote');

      queue.destroy();
    });

    it('should use custom conflict resolver returning merged', async () => {
      const queue = await OfflineQueue.create<TestData>({
        name: 'test-queue',
        processor: async () => {},
        autoSync: false,
        conflictResolver: (local, remote) => ({
          merged: { action: `${local.action}-${remote.action}`, payload: 'merged' },
        }),
      });

      const result = queue.resolveConflict(
        { action: 'local', payload: 'local' },
        { action: 'remote', payload: 'remote' }
      );

      expect(result).toEqual({
        merged: { action: 'local-remote', payload: 'merged' },
      });

      queue.destroy();
    });
  });

  // ===========================================================================
  // destroy
  // ===========================================================================

  describe('destroy', () => {
    it('should clean up resources', async () => {
      const queue = await OfflineQueue.create<TestData>({
        name: 'test-queue',
        processor: async () => {},
        autoSync: false,
      });

      queue.destroy();

      await expect(queue.add({ action: 'test', payload: 'data' })).rejects.toThrow(
        OfflineQueueError
      );
    });

    it('should be safe to call multiple times', async () => {
      const queue = await OfflineQueue.create<TestData>({
        name: 'test-queue',
        processor: async () => {},
        autoSync: false,
      });

      queue.destroy();
      queue.destroy(); // Should not throw

      await expect(queue.add({ action: 'test', payload: 'data' })).rejects.toThrow();
    });

    it('should remove network listener', async () => {
      const queue = await OfflineQueue.create<TestData>({
        name: 'test-queue',
        processor: async () => {},
        autoSync: true,
      });

      queue.destroy();

      // Simulate going online after destroy
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: true },
        writable: true,
        configurable: true,
      });

      // Should not throw or cause issues
      window.dispatchEvent(new Event('online'));
    });

    it('should clear all event handlers', async () => {
      const syncHandler = vi.fn();
      const errorHandler = vi.fn();
      const conflictHandler = vi.fn();

      const queue = await OfflineQueue.create<TestData>({
        name: 'test-queue',
        processor: async () => {},
        autoSync: false,
      });

      queue.onSync(syncHandler);
      queue.onError(errorHandler);
      queue.onConflict(conflictHandler);

      queue.destroy();

      // Handlers should be cleared
    });
  });

  // ===========================================================================
  // Auto-sync Behavior
  // ===========================================================================

  describe('Auto-sync behavior', () => {
    it('should sync when coming back online', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: false },
        writable: true,
        configurable: true,
      });

      const processor = vi.fn();
      const queue = await OfflineQueue.create<TestData>({
        name: 'test-queue',
        processor,
        autoSync: true,
        syncDelay: 0,
      });

      await queue.add({ action: 'test', payload: 'data' });
      expect(processor).not.toHaveBeenCalled();

      // Go online
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: true },
        writable: true,
        configurable: true,
      });

      // Trigger online event
      window.dispatchEvent(new Event('online'));

      // Wait for sync to complete
      await flushMicrotasks();
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(processor).toHaveBeenCalled();

      queue.destroy();
    });

    it('should not auto-sync when autoSync is disabled', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: true },
        writable: true,
        configurable: true,
      });

      const processor = vi.fn();
      const queue = await OfflineQueue.create<TestData>({
        name: 'test-queue',
        processor,
        autoSync: false,
      });

      await queue.add({ action: 'test', payload: 'data' });
      await flushMicrotasks();

      // Even though online, should not auto-sync
      expect(processor).not.toHaveBeenCalled();

      queue.destroy();
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle empty string error message in processor', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: true },
        writable: true,
        configurable: true,
      });

      const queue = await OfflineQueue.create<TestData>({
        name: 'test-queue',
        processor: async () => {
          throw '';
        },
        autoSync: false,
        maxRetries: 1,
      });

      const errorHandler = vi.fn();
      queue.onError(errorHandler);

      await queue.add({ action: 'test', payload: 'data' });
      await queue.sync();
      await flushMicrotasks();

      expect(errorHandler).toHaveBeenCalled();

      queue.destroy();
    });

    it('should handle non-Error thrown in processor', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: true },
        writable: true,
        configurable: true,
      });

      const queue = await OfflineQueue.create<TestData>({
        name: 'test-queue',
        processor: async () => {
          throw { custom: 'error' };
        },
        autoSync: false,
        maxRetries: 1,
      });

      const errorHandler = vi.fn();
      queue.onError(errorHandler);

      await queue.add({ action: 'test', payload: 'data' });
      await queue.sync();
      await flushMicrotasks();

      expect(errorHandler).toHaveBeenCalled();

      queue.destroy();
    });

    it('should rethrow non-CryptoError from generateUUID', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: false },
        writable: true,
        configurable: true,
      });

      const queue = await OfflineQueue.create<TestData>({
        name: 'test-queue-rethrow',
        processor: async () => {},
        autoSync: false,
      });

      // Mock crypto.randomUUID to throw a non-CryptoError
      Object.defineProperty(globalThis, 'crypto', {
        value: {
          randomUUID: () => {
            throw new TypeError('unexpected crypto failure');
          },
        },
        configurable: true,
      });

      await expect(queue.add({ action: 'test', payload: 'data' })).rejects.toThrow(TypeError);

      queue.destroy();
    });

    it('should handle concurrent add operations', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: false },
        writable: true,
        configurable: true,
      });

      const queue = await OfflineQueue.create<TestData>({
        name: 'test-queue',
        processor: async () => {},
        autoSync: false,
      });

      // Add multiple items concurrently
      const promises = [
        queue.add({ action: 'test1', payload: 'data1' }),
        queue.add({ action: 'test2', payload: 'data2' }),
        queue.add({ action: 'test3', payload: 'data3' }),
      ];

      await Promise.all(promises);

      const size = await queue.size();
      expect(size).toBe(3);

      queue.destroy();
    });

    it('should handle sync interruption when going offline', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: true },
        writable: true,
        configurable: true,
      });

      let processCount = 0;
      const processor = vi.fn().mockImplementation(async () => {
        processCount++;
        if (processCount === 2) {
          // Go offline during processing
          Object.defineProperty(globalThis, 'navigator', {
            value: { onLine: false },
            writable: true,
            configurable: true,
          });
        }
      });

      const queue = await OfflineQueue.create<TestData>({
        name: 'test-queue',
        processor,
        autoSync: false,
      });

      await queue.add({ action: 'test1', payload: 'data1' });
      await queue.add({ action: 'test2', payload: 'data2' });
      await queue.add({ action: 'test3', payload: 'data3' });

      await queue.sync();
      await flushMicrotasks();

      // Should have stopped after second item when going offline
      expect(processor).toHaveBeenCalledTimes(2);

      queue.destroy();
    });

    it('should handle sync interruption when destroyed', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: true },
        writable: true,
        configurable: true,
      });

      let processCount = 0;
      const queueRef: { current: OfflineQueueInstance<TestData> | null } = { current: null };

      const processor = vi.fn().mockImplementation(async () => {
        processCount++;
        if (processCount === 2) {
          // Destroy during processing
          queueRef.current?.destroy();
        }
      });

      const queue = await OfflineQueue.create<TestData>({
        name: 'test-queue',
        processor,
        autoSync: false,
      });
      queueRef.current = queue;

      await queue.add({ action: 'test1', payload: 'data1' });
      await queue.add({ action: 'test2', payload: 'data2' });
      await queue.add({ action: 'test3', payload: 'data3' });

      await queue.sync();
      await flushMicrotasks();

      // Should have stopped after second item when destroyed
      expect(processor).toHaveBeenCalledTimes(2);
    });
  });

  // ===========================================================================
  // Database Error Handling
  // ===========================================================================

  describe('Database Error Handling', () => {
    function createFailingDb(overrides: Record<string, unknown> = {}) {
      return {
        name: 'test',
        version: 1,
        get: vi.fn().mockResolvedValue(undefined),
        put: vi.fn().mockResolvedValue('key'),
        add: vi.fn().mockResolvedValue('key'),
        delete: vi.fn().mockResolvedValue(undefined),
        clear: vi.fn().mockResolvedValue(undefined),
        getAll: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        transaction: vi.fn(),
        close: vi.fn(),
        ...overrides,
      };
    }

    it('should wrap database error in add', async () => {
      const mockDb = createFailingDb({
        add: vi.fn().mockRejectedValue(new Error('DB add failed')),
      });

      vi.spyOn(IndexedDBManager, 'open').mockResolvedValue(
        mockDb as unknown as Parameters<typeof OfflineQueue.create>[0] extends infer C
          ? C extends { processor: infer P }
            ? P
            : never
          : never as never
      );

      const queue = await OfflineQueue.create<TestData>({
        name: 'error-add',
        processor: async () => {},
        autoSync: false,
      });

      await expect(queue.add({ action: 'test', payload: 'data' })).rejects.toThrow(
        OfflineQueueError
      );

      queue.destroy();
      vi.mocked(IndexedDBManager.open).mockRestore();
    });

    it('should wrap database error in remove', async () => {
      const mockDb = createFailingDb({
        get: vi.fn().mockRejectedValue(new Error('DB get failed')),
      });

      vi.spyOn(IndexedDBManager, 'open').mockResolvedValue(mockDb as never);

      const queue = await OfflineQueue.create<TestData>({
        name: 'error-remove',
        processor: async () => {},
        autoSync: false,
      });

      await expect(queue.remove('some-id')).rejects.toThrow(OfflineQueueError);

      queue.destroy();
      vi.mocked(IndexedDBManager.open).mockRestore();
    });

    it('should wrap database error in peek', async () => {
      const mockDb = createFailingDb({
        getAll: vi.fn().mockRejectedValue(new Error('DB getAll failed')),
      });

      vi.spyOn(IndexedDBManager, 'open').mockResolvedValue(mockDb as never);

      const queue = await OfflineQueue.create<TestData>({
        name: 'error-peek',
        processor: async () => {},
        autoSync: false,
      });

      await expect(queue.peek()).rejects.toThrow(OfflineQueueError);

      queue.destroy();
      vi.mocked(IndexedDBManager.open).mockRestore();
    });

    it('should wrap database error in clear', async () => {
      const mockDb = createFailingDb({
        clear: vi.fn().mockRejectedValue(new Error('DB clear failed')),
      });

      vi.spyOn(IndexedDBManager, 'open').mockResolvedValue(mockDb as never);

      const queue = await OfflineQueue.create<TestData>({
        name: 'error-clear',
        processor: async () => {},
        autoSync: false,
      });

      await expect(queue.clear()).rejects.toThrow(OfflineQueueError);

      queue.destroy();
      vi.mocked(IndexedDBManager.open).mockRestore();
    });

    it('should wrap database error in size', async () => {
      const mockDb = createFailingDb({
        count: vi.fn().mockRejectedValue(new Error('DB count failed')),
      });

      vi.spyOn(IndexedDBManager, 'open').mockResolvedValue(mockDb as never);

      const queue = await OfflineQueue.create<TestData>({
        name: 'error-size',
        processor: async () => {},
        autoSync: false,
      });

      await expect(queue.size()).rejects.toThrow(OfflineQueueError);

      queue.destroy();
      vi.mocked(IndexedDBManager.open).mockRestore();
    });

    it('should wrap database error in getAll', async () => {
      const mockDb = createFailingDb({
        getAll: vi.fn().mockRejectedValue(new Error('DB getAll failed')),
      });

      vi.spyOn(IndexedDBManager, 'open').mockResolvedValue(mockDb as never);

      const queue = await OfflineQueue.create<TestData>({
        name: 'error-getAll',
        processor: async () => {},
        autoSync: false,
      });

      await expect(queue.getAll()).rejects.toThrow(OfflineQueueError);

      queue.destroy();
      vi.mocked(IndexedDBManager.open).mockRestore();
    });

    it('should wrap database error in getStats', async () => {
      const mockDb = createFailingDb({
        getAll: vi.fn().mockRejectedValue(new Error('DB getAll failed')),
      });

      vi.spyOn(IndexedDBManager, 'open').mockResolvedValue(mockDb as never);

      const queue = await OfflineQueue.create<TestData>({
        name: 'error-getStats',
        processor: async () => {},
        autoSync: false,
      });

      await expect(queue.getStats()).rejects.toThrow(OfflineQueueError);

      queue.destroy();
      vi.mocked(IndexedDBManager.open).mockRestore();
    });

    it('should include error code DATABASE_ERROR for db failures', async () => {
      const mockDb = createFailingDb({
        add: vi.fn().mockRejectedValue(new Error('DB failed')),
      });

      vi.spyOn(IndexedDBManager, 'open').mockResolvedValue(mockDb as never);

      const queue = await OfflineQueue.create<TestData>({
        name: 'error-code-test',
        processor: async () => {},
        autoSync: false,
      });

      try {
        await queue.add({ action: 'test', payload: 'data' });
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(OfflineQueueError);
        expect((e as OfflineQueueError).code).toBe('DATABASE_ERROR');
      }

      queue.destroy();
      vi.mocked(IndexedDBManager.open).mockRestore();
    });
  });

  // ===========================================================================
  // AutoSync with Online at Create Time
  // ===========================================================================

  describe('AutoSync with Online at Create Time', () => {
    it('should schedule initial sync when autoSync=true and online', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: true },
        writable: true,
        configurable: true,
      });

      const processor = vi.fn();
      const queue = await OfflineQueue.create<TestData>({
        name: 'autosync-init',
        processor,
        autoSync: true,
        syncDelay: 0,
      });

      await queue.add({ action: 'test', payload: 'data' });

      // Wait for sync to be scheduled and executed
      await new Promise((resolve) => setTimeout(resolve, 50));
      await flushMicrotasks();

      expect(processor).toHaveBeenCalled();

      queue.destroy();
    });

    it('should schedule sync on add when autoSync=true and online', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: true },
        writable: true,
        configurable: true,
      });

      const processor = vi.fn();
      const queue = await OfflineQueue.create<TestData>({
        name: 'autosync-add',
        processor,
        autoSync: true,
        syncDelay: 0,
      });

      await queue.add({ action: 'test', payload: 'data' });

      await new Promise((resolve) => setTimeout(resolve, 50));
      await flushMicrotasks();

      expect(processor).toHaveBeenCalledTimes(1);

      queue.destroy();
    });
  });

  // ===========================================================================
  // getStats with failed items
  // ===========================================================================

  describe('getStats with failed items', () => {
    it('should count items with retryCount > 0 as failed', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: true },
        writable: true,
        configurable: true,
      });

      const processor = vi.fn().mockRejectedValueOnce(new Error('fail'));
      const queue = await OfflineQueue.create<TestData>({
        name: 'stats-failed',
        processor,
        autoSync: false,
        maxRetries: 5,
      });

      await queue.add({ action: 'test', payload: 'data' });

      // First sync - should fail and increment retryCount
      await queue.sync();
      await flushMicrotasks();

      const stats = await queue.getStats();
      expect(stats.failedCount).toBe(1);
      expect(stats.size).toBe(1);

      queue.destroy();
    });
  });

  // ===========================================================================
  // Rate Limiting
  // ===========================================================================

  describe('Rate Limiting', () => {
    it('should process items within rate limit window', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: true },
        writable: true,
        configurable: true,
      });

      const processedItems: string[] = [];
      const processor = vi.fn().mockImplementation((data: TestData) => {
        processedItems.push(data.action);
      });

      const queue = await OfflineQueue.create<TestData>({
        name: 'rate-limit-basic',
        processor,
        autoSync: false,
        rateLimit: { maxRequestsPerWindow: 3, windowMs: 5000 },
      });

      await queue.add({ action: 'item1', payload: 'data1' });
      await queue.add({ action: 'item2', payload: 'data2' });

      await queue.sync();
      await flushMicrotasks();

      // Both items should process within rate limit of 3
      expect(processedItems).toEqual(['item1', 'item2']);
      expect(processor).toHaveBeenCalledTimes(2);

      queue.destroy();
    });

    it('should delay processing when rate limit is exceeded', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(10000));

      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: true },
        writable: true,
        configurable: true,
      });

      const processedItems: string[] = [];
      const processor = vi.fn().mockImplementation((data: TestData) => {
        processedItems.push(data.action);
      });

      const queue = await OfflineQueue.create<TestData>({
        name: 'rate-limit-delay',
        processor,
        autoSync: false,
        rateLimit: { maxRequestsPerWindow: 2, windowMs: 5000 },
      });

      await queue.add({ action: 'item1', payload: 'data1' });
      await queue.add({ action: 'item2', payload: 'data2' });
      await queue.add({ action: 'item3', payload: 'data3' });

      // Start sync without awaiting - it will block on delay() setTimeout
      void queue.sync();

      // Run all timers to completion - advances clock past rate limit delays
      await vi.runAllTimersAsync();

      // All three items should have been processed
      expect(processedItems).toEqual(['item1', 'item2', 'item3']);

      queue.destroy();
      vi.useRealTimers();
    });

    it('should schedule sync and break when still rate limited after delay', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(10000));

      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: true },
        writable: true,
        configurable: true,
      });

      const processedItems: string[] = [];
      const processor = vi.fn().mockImplementation((data: TestData) => {
        processedItems.push(data.action);
      });

      const queue = await OfflineQueue.create<TestData>({
        name: 'rate-limit-break',
        processor,
        autoSync: false,
        syncDelay: 500,
        rateLimit: { maxRequestsPerWindow: 1, windowMs: 10000 },
      });

      await queue.add({ action: 'item1', payload: 'data1' });
      await queue.add({ action: 'item2', payload: 'data2' });

      // Start sync - processes first item, then rate limited for second
      // delay() waits, re-check still fails (window is 10s), scheduleSync + break
      void queue.sync();

      // Run all timers - advances past rate limit delay + scheduleSync delays
      await vi.runAllTimersAsync();

      expect(processedItems).toEqual(['item1', 'item2']);

      queue.destroy();
      vi.useRealTimers();
    });

    it('should record operation timestamps and clean old ones', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(10000));

      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: true },
        writable: true,
        configurable: true,
      });

      const syncHandler = vi.fn();
      const processor = vi.fn();

      const queue = await OfflineQueue.create<TestData>({
        name: 'rate-limit-timestamps',
        processor,
        autoSync: false,
        rateLimit: { maxRequestsPerWindow: 1, windowMs: 3000 },
      });

      queue.onSync(syncHandler);

      // Add and sync first item at t=10000
      await queue.add({ action: 'item1', payload: 'data1' });
      // First sync has only 1 item within limit - can await directly
      await queue.sync();

      expect(syncHandler).toHaveBeenCalledTimes(1);

      // Add second item at t=10000 - still within rate limit window
      await queue.add({ action: 'item2', payload: 'data2' });

      // Start sync - will be rate limited, delay(), then scheduleSync
      void queue.sync();

      // Run all timers - advances clock past rate limit window, processes item
      await vi.runAllTimersAsync();

      // Second item should succeed because timestamp expired and was cleaned
      expect(syncHandler).toHaveBeenCalledTimes(2);

      queue.destroy();
      vi.useRealTimers();
    });
  });

  // ===========================================================================
  // Module Export
  // ===========================================================================

  describe('Module Export', () => {
    it('should export OfflineQueue as const object', () => {
      expect(typeof OfflineQueue).toBe('object');
      expect(OfflineQueue).toBeDefined();
    });

    it('should have all expected methods', () => {
      expect(typeof OfflineQueue.isSupported).toBe('function');
      expect(typeof OfflineQueue.create).toBe('function');
    });

    it('should export OfflineQueueError', () => {
      expect(OfflineQueueError).toBeDefined();
      expect(typeof OfflineQueueError).toBe('function');
    });
  });
});
