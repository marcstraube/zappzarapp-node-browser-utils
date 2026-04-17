import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OfflineQueue } from '../../src/offline/index.js';
import { IndexedDBManager } from '../../src/indexeddb/index.js';
import { NetworkStatus } from '../../src/network/index.js';

/**
 * Integration: OfflineQueue + IndexedDB + NetworkStatus
 *
 * Tests the full offline-first sync lifecycle:
 * - Items queued while offline persist in IndexedDB
 * - Sync triggers when network comes back online
 * - Failed items retry with proper error handling
 *
 * Note: These tests use real timers because IndexedDB operations are async
 * and fake timers interfere with the internal promise resolution.
 */

describe('OfflineQueue + IndexedDB + NetworkStatus', () => {
  let navigatorDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: true },
      writable: true,
      configurable: true,
    });
  });

  afterEach(async () => {
    vi.restoreAllMocks();

    if (navigatorDescriptor) {
      Object.defineProperty(globalThis, 'navigator', navigatorDescriptor);
    }

    // Clean up test databases
    await IndexedDBManager.deleteDatabase('offlinequeue-integration');
    await IndexedDBManager.deleteDatabase('offlinequeue-sync');
    await IndexedDBManager.deleteDatabase('offlinequeue-retry');
    await IndexedDBManager.deleteDatabase('offlinequeue-priority');
  });

  function goOffline(): void {
    Object.defineProperty(globalThis.navigator, 'onLine', { value: false, configurable: true });
    window.dispatchEvent(new Event('offline'));
  }

  function goOnline(): void {
    Object.defineProperty(globalThis.navigator, 'onLine', { value: true, configurable: true });
    window.dispatchEvent(new Event('online'));
  }

  function waitFor(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  it('should persist items in IndexedDB and sync when online', async () => {
    const processed: string[] = [];
    const queue = await OfflineQueue.create<string>({
      name: 'integration',
      autoSync: false,
      processor: async (data) => {
        processed.push(data);
      },
    });

    await queue.add('item-1');
    await queue.add('item-2');

    expect(await queue.size()).toBe(2);

    await queue.sync();

    expect(processed).toEqual(['item-1', 'item-2']);
    expect(await queue.size()).toBe(0);

    queue.destroy();
  });

  it('should skip sync when offline and process when back online', async () => {
    const processed: string[] = [];
    const queue = await OfflineQueue.create<string>({
      name: 'sync',
      autoSync: true,
      syncDelay: 50,
      processor: async (data) => {
        processed.push(data);
      },
    });

    goOffline();

    await queue.add('offline-item');
    expect(await queue.size()).toBe(1);

    // Manual sync should be a no-op while offline
    await queue.sync();
    expect(processed).toHaveLength(0);

    // Come back online — autoSync should schedule sync
    goOnline();
    await waitFor(200);

    expect(processed).toEqual(['offline-item']);
    expect(await queue.size()).toBe(0);

    queue.destroy();
  });

  it('should retry failed items up to maxRetries', async () => {
    let attempts = 0;
    const errors: string[] = [];

    const queue = await OfflineQueue.create<string>({
      name: 'retry',
      autoSync: false,
      maxRetries: 2,
      processor: async () => {
        attempts++;
        throw new Error('processing failed');
      },
    });

    queue.onError((error) => {
      errors.push(error.message);
    });

    await queue.add('failing-item');

    // First sync attempt
    await queue.sync();
    expect(attempts).toBe(1);

    // Second sync — retryCount incremented
    await queue.sync();
    expect(attempts).toBe(2);

    // Third sync — should be removed (exceeded maxRetries)
    await queue.sync();

    expect(await queue.size()).toBe(0);
    expect(errors.length).toBeGreaterThan(0);

    queue.destroy();
  });

  it('should process items respecting priority order', async () => {
    const processed: string[] = [];
    const queue = await OfflineQueue.create<string>({
      name: 'priority',
      autoSync: false,
      processor: async (data) => {
        processed.push(data);
      },
    });

    // Add with different priorities (lower = higher priority)
    await queue.add('low', 10);
    await queue.add('high', 1);
    await queue.add('medium', 5);

    await queue.sync();

    expect(processed).toEqual(['high', 'medium', 'low']);

    queue.destroy();
  });

  it('should report network status accurately during sync lifecycle', () => {
    expect(NetworkStatus.isOnline()).toBe(true);

    goOffline();
    expect(NetworkStatus.isOnline()).toBe(false);
    expect(NetworkStatus.isOffline()).toBe(true);

    goOnline();
    expect(NetworkStatus.isOnline()).toBe(true);
    expect(NetworkStatus.isOffline()).toBe(false);
  });
});
