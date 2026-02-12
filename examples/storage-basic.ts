// noinspection JSUnusedGlobalSymbols - Example file

/**
 * Storage Example - Type-safe localStorage with TTL and LRU eviction
 *
 * This example demonstrates:
 * - Creating a type-safe storage manager
 * - Storing and retrieving typed data
 * - Automatic LRU eviction when limits are reached
 * - TTL (time-to-live) pattern implementation
 * - Result-based error handling (no exceptions)
 * - Debug logging for development
 *
 * @packageDocumentation
 */

import { Result } from '@zappzarapp/browser-utils/core';
import { StorageManager, type StorageStats } from '@zappzarapp/browser-utils/storage';
import { Logger } from '@zappzarapp/browser-utils/logging';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * User preferences stored in localStorage.
 */
interface UserPreferences {
  readonly theme: 'light' | 'dark' | 'system';
  readonly language: string;
  readonly fontSize: number;
  readonly notifications: boolean;
}

/**
 * Cache entry with TTL support.
 */
interface CacheEntry<T> {
  readonly data: T;
  readonly expiresAt: number;
}

/**
 * API response to cache.
 */
interface ApiResponse {
  readonly id: string;
  readonly items: ReadonlyArray<{ name: string; value: number }>;
  readonly fetchedAt: string;
}

// =============================================================================
// Basic Usage
// =============================================================================

/**
 * Create a simple storage manager with default settings.
 */
function basicUsageExample(): void {
  console.log('--- Basic Usage ---');

  // Create storage with a prefix to namespace your app's data
  const storage = StorageManager.create<UserPreferences>({
    prefix: 'myApp',
  });

  // Store user preferences
  const prefs: UserPreferences = {
    theme: 'dark',
    language: 'en',
    fontSize: 14,
    notifications: true,
  };

  storage.set('userPrefs', prefs);
  console.log('Stored user preferences');

  // Retrieve preferences (type-safe)
  const retrieved = storage.get('userPrefs');
  if (retrieved !== null) {
    console.log('Theme:', retrieved.theme);
    console.log('Language:', retrieved.language);
  }

  // Check if key exists
  console.log('Has prefs:', storage.has('userPrefs'));
  console.log('Has other:', storage.has('nonexistent'));

  // Get all keys managed by this storage instance
  console.log('All keys:', storage.keys());

  // Get storage statistics
  const stats: StorageStats = storage.stats();
  console.log('Stats:', stats);
}

// =============================================================================
// TTL Pattern
// =============================================================================

/**
 * Storage manager with TTL (time-to-live) support.
 * Wraps data in a cache entry with expiration timestamp.
 */
class TtlStorage<T> {
  private readonly storage: StorageManager<CacheEntry<T>>;

  constructor(prefix: string, maxEntries = 50) {
    this.storage = StorageManager.create<CacheEntry<T>>({
      prefix,
      maxEntries,
    });
  }

  /**
   * Store data with TTL (in seconds).
   */
  set(key: string, data: T, ttlSeconds: number): void {
    const entry: CacheEntry<T> = {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    };
    this.storage.set(key, entry);
  }

  /**
   * Get data if not expired.
   * Automatically removes expired entries.
   */
  get(key: string): T | null {
    const entry = this.storage.get(key);

    if (entry === null) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.storage.remove(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Get remaining TTL in seconds (or null if expired/missing).
   */
  getTtl(key: string): number | null {
    const entry = this.storage.get(key);

    if (entry === null) {
      return null;
    }

    const remaining = Math.floor((entry.expiresAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : null;
  }

  /**
   * Clear all entries.
   */
  clear(): void {
    this.storage.clear();
  }
}

/**
 * Example: Cache API responses with TTL.
 */
function ttlStorageExample(): void {
  console.log('\n--- TTL Storage ---');

  const cache = new TtlStorage<ApiResponse>('apiCache', 100);

  // Cache an API response for 5 minutes
  const response: ApiResponse = {
    id: 'abc123',
    items: [
      { name: 'Item A', value: 100 },
      { name: 'Item B', value: 200 },
    ],
    fetchedAt: new Date().toISOString(),
  };

  cache.set('products', response, 300); // 5 minutes TTL
  console.log('Cached API response with 5 minute TTL');

  // Retrieve from cache
  const cached = cache.get('products');
  if (cached !== null) {
    console.log('Cache hit:', cached.id);
    console.log('TTL remaining:', cache.getTtl('products'), 'seconds');
  }

  // Short TTL example (expires quickly)
  cache.set('shortLived', response, 1); // 1 second TTL
  console.log('Cached with 1 second TTL');

  // After 1+ seconds, this will return null
  setTimeout(() => {
    const expired = cache.get('shortLived');
    console.log('After 1 second:', expired === null ? 'expired' : 'still valid');
  }, 1100);
}

// =============================================================================
// LRU Eviction
// =============================================================================

/**
 * Demonstrate LRU eviction when max entries is reached.
 */
function lruEvictionExample(): void {
  console.log('\n--- LRU Eviction ---');

  // Create storage with low limit to demonstrate eviction
  const storage = StorageManager.create<string>({
    prefix: 'lruDemo',
    maxEntries: 5, // Only keep 5 entries
  });

  // Add more entries than the limit
  for (let i = 1; i <= 8; i++) {
    storage.set(`item${i}`, `Value ${i}`);
    console.log(`Added item${i}`);
  }

  // Check which entries remain (should be newest 5)
  console.log('Remaining keys:', storage.keys());
  console.log('Count:', storage.stats().count);

  // Oldest entries (item1, item2, item3) should be evicted
  console.log('item1 exists:', storage.has('item1')); // false
  console.log('item5 exists:', storage.has('item5')); // true
  console.log('item8 exists:', storage.has('item8')); // true

  // Cleanup
  storage.clear();
}

// =============================================================================
// Result-Based Error Handling
// =============================================================================

/**
 * Use Result API to avoid exceptions.
 */
function resultBasedExample(): void {
  console.log('\n--- Result-Based Error Handling ---');

  const storage = StorageManager.create<UserPreferences>({
    prefix: 'resultDemo',
  });

  // Store some data first
  storage.set('prefs', {
    theme: 'light',
    language: 'de',
    fontSize: 16,
    notifications: false,
  });

  // Get with Result (no exceptions thrown)
  const result = storage.getResult('prefs');

  if (Result.isOk(result)) {
    console.log('Success:', result.value?.theme);
  } else {
    console.error('Error:', result.error.message);
  }

  // Handle missing keys gracefully
  const missingResult = storage.getResult('nonexistent');
  if (Result.isOk(missingResult)) {
    console.log('Missing key returns:', missingResult.value); // null
  }

  // Cleanup
  storage.clear();
}

// =============================================================================
// Debug Logging
// =============================================================================

/**
 * Enable debug logging for development.
 */
function debugLoggingExample(): void {
  console.log('\n--- Debug Logging ---');

  // Method 1: Use factory method
  const debugStorage = StorageManager.withDebugLogging<string>('debugDemo');

  debugStorage.set('test', 'value'); // Logs: [debugDemo] Stored: test
  debugStorage.get('test'); // Logs debug info
  debugStorage.remove('test'); // Logs: [debugDemo] Removed: test

  // Method 2: Custom logger configuration
  const customStorage = StorageManager.create<string>({
    prefix: 'custom',
    logger: {
      level: 0, // LogLevel.Debug
      prefix: '[CustomStorage]',
    },
  });

  customStorage.set('key', 'data');
  customStorage.clear();
}

// =============================================================================
// Direct Logger Usage
// =============================================================================

/**
 * Using Logger directly for custom logging.
 */
function directLoggerExample(): void {
  console.log('\n--- Direct Logger Usage ---');

  // Create a logger instance
  const logger = Logger.create({
    prefix: '[StorageApp]',
    level: 0, // LogLevel.Debug - show all messages
  });

  // Log at different levels
  logger.debug('Initializing storage system');
  logger.info('Storage ready');
  logger.warn('Storage quota at 80%');
  logger.error('Failed to persist critical data');

  // Production mode - only warnings and errors
  const prodLogger = Logger.create({
    prefix: '[Prod]',
    level: 2, // LogLevel.Warn
  });

  prodLogger.debug('This will not be shown');
  prodLogger.info('This will not be shown');
  prodLogger.warn('This will be shown');
  prodLogger.error('This will be shown');
}

// =============================================================================
// Advanced: Typed Storage Factory
// =============================================================================

/**
 * Create pre-configured storage instances for different data types.
 */
function createStorageInstances() {
  // User preferences storage
  const prefsStorage = StorageManager.create<UserPreferences>({
    prefix: 'userPrefs',
    maxEntries: 10,
  });

  // API cache with shorter limit
  const cacheStorage = StorageManager.create<ApiResponse>({
    prefix: 'apiCache',
    maxEntries: 100,
    minSafeEntries: 10, // Keep at least 10 entries during emergency eviction
  });

  // Session data (use SessionStorageManager for session-only data)
  const sessionData = StorageManager.create<Record<string, unknown>>({
    prefix: 'session',
    maxEntries: 20,
  });

  return { prefsStorage, cacheStorage, sessionData };
}

/**
 * Usage example with typed storage instances.
 */
function typedStorageExample(): void {
  console.log('\n--- Typed Storage Instances ---');

  const { prefsStorage, cacheStorage } = createStorageInstances();

  // Type-safe operations
  prefsStorage.set('current', {
    theme: 'system',
    language: 'en',
    fontSize: 14,
    notifications: true,
  });

  cacheStorage.set('latest', {
    id: 'xyz789',
    items: [{ name: 'Product', value: 50 }],
    fetchedAt: new Date().toISOString(),
  });

  console.log('Prefs count:', prefsStorage.stats().count);
  console.log('Cache count:', cacheStorage.stats().count);

  // Cleanup
  prefsStorage.clear();
  cacheStorage.clear();
}

// =============================================================================
// Run All Examples
// =============================================================================

/**
 * Run all storage examples.
 */
export function runStorageExamples(): void {
  console.log('=== Storage Examples ===\n');

  basicUsageExample();
  lruEvictionExample();
  resultBasedExample();
  debugLoggingExample();
  directLoggerExample();
  typedStorageExample();

  // TTL example runs async (has setTimeout)
  ttlStorageExample();

  console.log('\n=== Storage Examples Complete ===');
}

// Uncomment to run directly
// runStorageExamples();
