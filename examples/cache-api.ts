// noinspection JSUnusedGlobalSymbols - Example file

/**
 * Cache API Example - HTTP caching with stale-while-revalidate
 *
 * This example demonstrates:
 * - Creating and configuring cache managers
 * - TTL-based cache expiration
 * - Stale-while-revalidate pattern for optimal UX
 * - Cache invalidation by key, pattern, and tags
 * - Cache statistics and monitoring
 * - LRU eviction when cache is full
 * - Result-based error handling
 *
 * @packageDocumentation
 */

import {
  CacheManager,
  type CacheManagerInstance,
  type CacheConfig,
  type CacheSetOptions,
  type CacheStats,
} from '@zappzarapp/browser-utils/cache';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * User data from API.
 */
interface User {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: 'admin' | 'user' | 'guest';
  readonly lastActive: string;
}

/**
 * Product data from API.
 */
interface Product {
  readonly id: string;
  readonly name: string;
  readonly price: number;
  readonly category: string;
  readonly inStock: boolean;
}

/**
 * API response wrapper.
 */
interface ApiResponse<T> {
  readonly data: T;
  readonly timestamp: string;
}

// =============================================================================
// Basic Usage
// =============================================================================

/**
 * Basic cache creation and usage.
 */
async function basicCacheExample(): Promise<void> {
  console.log('--- Basic Cache Usage ---');

  // Create a simple cache
  const cache = CacheManager.create<string>({ maxSize: 100 });

  // Set a value
  await cache.set('greeting', 'Hello, World!');
  console.log('Set: greeting = "Hello, World!"');

  // Get the value
  const result = await cache.get('greeting');
  if (result) {
    console.log('Get: greeting =', result.value);
    console.log('  isStale:', result.isStale);
    console.log('  createdAt:', new Date(result.meta.createdAt).toISOString());
  }

  // Check existence
  console.log('Has greeting:', cache.has('greeting'));
  console.log('Has unknown:', cache.has('unknown'));

  // Delete
  await cache.delete('greeting');
  console.log('Deleted greeting');
  console.log('Has greeting:', cache.has('greeting'));

  // Cleanup
  cache.destroy();
}

// =============================================================================
// TTL (Time-To-Live)
// =============================================================================

/**
 * Using TTL for automatic cache expiration.
 */
async function ttlExample(): Promise<void> {
  console.log('\n--- TTL Expiration ---');

  // Cache with default TTL
  const cache = CacheManager.create<string>({
    maxSize: 100,
    defaultTtl: 5000, // 5 seconds default
  });

  // Set with default TTL
  await cache.set('default-ttl', 'Uses default 5s TTL');
  console.log('Set: default-ttl (5s TTL)');

  // Set with custom TTL
  await cache.set('custom-ttl', 'Custom 2s TTL', { ttl: 2000 });
  console.log('Set: custom-ttl (2s TTL)');

  // Set with no expiration
  await cache.set('no-expiry', 'Never expires', { ttl: undefined });
  console.log('Set: no-expiry (no TTL)');

  // Check immediately
  console.log('Immediate check:');
  console.log('  default-ttl:', cache.has('default-ttl'));
  console.log('  custom-ttl:', cache.has('custom-ttl'));
  console.log('  no-expiry:', cache.has('no-expiry'));

  // Wait and check again
  await sleep(2500);
  console.log('After 2.5 seconds:');
  console.log('  default-ttl:', cache.has('default-ttl')); // Still valid
  console.log('  custom-ttl:', cache.has('custom-ttl')); // Expired
  console.log('  no-expiry:', cache.has('no-expiry')); // Still valid

  cache.destroy();
}

/**
 * Sleep helper.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =============================================================================
// Stale-While-Revalidate
// =============================================================================

/**
 * Stale-while-revalidate pattern for optimal user experience.
 */
async function staleWhileRevalidateExample(): Promise<void> {
  console.log('\n--- Stale-While-Revalidate ---');

  const cache = CacheManager.create<User>({
    maxSize: 100,
    defaultTtl: 60000, // 1 minute until expired
    defaultStaleAfter: 10000, // 10 seconds until stale
  });

  // Simulated API fetch
  let fetchCount = 0;
  const fetchUser = async (id: string): Promise<User> => {
    fetchCount++;
    console.log(`  [API] Fetching user ${id} (fetch #${fetchCount})`);
    await sleep(100); // Simulate network delay
    return {
      id,
      name: `User ${id}`,
      email: `user${id}@example.com`,
      role: 'user',
      lastActive: new Date().toISOString(),
    };
  };

  // First fetch - cache miss, fetches from API
  console.log('First request (cache miss):');
  const user1 = await fetchUser('123');
  await cache.set('user:123', user1);
  console.log('  Cached user:', user1.name);

  // Immediate request - cache hit (fresh)
  console.log('\nImmediate request (fresh cache hit):');
  const result2 = await cache.get('user:123');
  console.log('  From cache:', result2?.value.name);
  console.log('  isStale:', result2?.isStale);

  // Wait until stale but not expired
  console.log('\nWaiting 11 seconds (until stale)...');
  await sleep(11000);

  // Request with SWR - returns stale data immediately, revalidates in background
  console.log('SWR request (stale cache hit):');
  const result3 = await cache.get('user:123', {
    staleWhileRevalidate: true,
    revalidate: () => fetchUser('123'),
    revalidateOptions: { ttl: 60000, staleAfter: 10000 },
  });
  console.log('  Immediate return:', result3?.value.name);
  console.log('  isStale:', result3?.isStale);
  console.log('  (Background revalidation started)');

  // Wait for revalidation to complete
  await sleep(200);
  console.log('\nAfter revalidation:');
  const result4 = await cache.get('user:123');
  console.log('  From cache:', result4?.value.name);
  console.log('  isStale:', result4?.isStale);
  console.log(`  Total API fetches: ${fetchCount}`);

  cache.destroy();
}

// =============================================================================
// Cache Invalidation
// =============================================================================

/**
 * Various cache invalidation strategies.
 */
async function invalidationExample(): Promise<void> {
  console.log('\n--- Cache Invalidation ---');

  const cache = CacheManager.create<Product>({ maxSize: 100 });

  // Populate cache with tagged entries
  const products: Product[] = [
    { id: '1', name: 'Widget A', price: 10, category: 'widgets', inStock: true },
    { id: '2', name: 'Widget B', price: 20, category: 'widgets', inStock: false },
    { id: '3', name: 'Gadget A', price: 30, category: 'gadgets', inStock: true },
    { id: '4', name: 'Gadget B', price: 40, category: 'gadgets', inStock: true },
  ];

  for (const product of products) {
    await cache.set(`product:${product.id}`, product, {
      tags: [product.category, product.inStock ? 'in-stock' : 'out-of-stock'],
    });
  }
  console.log('Cached 4 products with tags');
  console.log('Keys:', cache.keys());

  // Invalidate by specific key
  await cache.delete('product:1');
  console.log('\nAfter deleting product:1:');
  console.log('Keys:', cache.keys());

  // Invalidate by pattern
  const patternCount = await cache.invalidateByPattern(/^product:2/);
  console.log(`\nInvalidated ${patternCount} entries matching /^product:2/`);
  console.log('Keys:', cache.keys());

  // Invalidate by tag
  const tagCount = await cache.invalidateByTag('gadgets');
  console.log(`\nInvalidated ${tagCount} entries with tag "gadgets"`);
  console.log('Keys:', cache.keys());

  // Clear all
  await cache.clear();
  console.log('\nAfter clear:');
  console.log('Keys:', cache.keys());

  cache.destroy();
}

// =============================================================================
// Cache Statistics
// =============================================================================

/**
 * Monitoring cache performance with statistics.
 */
async function statisticsExample(): Promise<void> {
  console.log('\n--- Cache Statistics ---');

  const cache = CacheManager.create<string>({
    maxSize: 5,
    defaultTtl: 1000,
  });

  // Generate some activity
  await cache.set('key1', 'value1');
  await cache.set('key2', 'value2');
  await cache.set('key3', 'value3');

  // Some hits
  await cache.get('key1');
  await cache.get('key2');
  await cache.get('key1');

  // Some misses
  await cache.get('missing1');
  await cache.get('missing2');

  // Trigger eviction
  await cache.set('key4', 'value4');
  await cache.set('key5', 'value5');
  await cache.set('key6', 'value6');
  await cache.set('key7', 'value7');

  // Invalidate some
  await cache.delete('key6');
  await cache.delete('key7');

  // Get stats
  const stats = cache.getStats();
  console.log('Cache Statistics:');
  console.log(`  Hits: ${stats.hits}`);
  console.log(`  Misses: ${stats.misses}`);
  console.log(`  Stale Hits: ${stats.staleHits}`);
  console.log(`  Size: ${stats.size} / ${stats.maxSize}`);
  console.log(`  Evictions: ${stats.evictions}`);
  console.log(`  Invalidations: ${stats.invalidations}`);

  // Calculate hit rate
  const totalRequests = stats.hits + stats.misses;
  const hitRate = totalRequests > 0 ? (stats.hits / totalRequests) * 100 : 0;
  console.log(`  Hit Rate: ${hitRate.toFixed(1)}%`);

  // Reset stats
  cache.resetStats();
  console.log('\nAfter resetStats:');
  const resetStats = cache.getStats();
  console.log(`  Hits: ${resetStats.hits}`);
  console.log(`  Misses: ${resetStats.misses}`);

  cache.destroy();
}

// =============================================================================
// LRU Eviction
// =============================================================================

/**
 * LRU (Least Recently Used) eviction when cache is full.
 */
async function lruEvictionExample(): Promise<void> {
  console.log('\n--- LRU Eviction ---');

  // Small cache to demonstrate eviction
  const cache = CacheManager.create<string>({
    maxSize: 3,
    onEvict: (key, value) => {
      console.log(`  Evicted: ${key} = "${value}"`);
    },
  });

  // Fill the cache
  await cache.set('first', 'First entry');
  await cache.set('second', 'Second entry');
  await cache.set('third', 'Third entry');
  console.log('Filled cache with 3 entries');
  console.log('Keys:', cache.keys());

  // Access first and second to make them recently used
  await cache.get('first');
  await cache.get('second');
  console.log('\nAccessed "first" and "second"');

  // Add new entry - should evict "third" (least recently used)
  console.log('\nAdding "fourth":');
  await cache.set('fourth', 'Fourth entry');
  console.log('Keys after adding fourth:', cache.keys());

  // Access fourth, then add fifth
  await cache.get('fourth');
  console.log('\nAdding "fifth":');
  await cache.set('fifth', 'Fifth entry');
  console.log('Keys after adding fifth:', cache.keys());

  console.log('\nFinal stats - Evictions:', cache.getStats().evictions);

  cache.destroy();
}

// =============================================================================
// Synchronous API
// =============================================================================

/**
 * Using synchronous cache methods.
 */
function syncApiExample(): void {
  console.log('\n--- Synchronous API ---');

  const cache = CacheManager.create<number>({ maxSize: 100 });

  // Synchronous set
  cache.setSync('counter', 0);
  console.log('Set counter = 0 (sync)');

  // Synchronous get
  const result = cache.getSync('counter');
  console.log('Get counter:', result?.value);

  // Increment pattern
  const current = cache.getSync('counter')?.value ?? 0;
  cache.setSync('counter', current + 1);
  console.log('Incremented counter:', cache.getSync('counter')?.value);

  // Synchronous delete
  cache.deleteSync('counter');
  console.log('Deleted counter');
  console.log('Has counter:', cache.has('counter'));

  cache.destroy();
}

// =============================================================================
// Typed Caching Wrapper
// =============================================================================

/**
 * Create type-safe caching wrappers for different data types.
 */
class TypedCache<T> {
  private readonly cache: CacheManagerInstance<T>;
  private readonly defaultOptions: CacheSetOptions;

  constructor(config: CacheConfig & { defaultTags?: readonly string[] }) {
    this.cache = CacheManager.create<T>(config);
    this.defaultOptions = {
      ttl: config.defaultTtl,
      staleAfter: config.defaultStaleAfter,
      tags: config.defaultTags,
    };
  }

  async get(key: string): Promise<T | undefined> {
    const result = await this.cache.get(key);
    return result?.value;
  }

  async getOrFetch(key: string, fetcher: () => Promise<T>, options?: CacheSetOptions): Promise<T> {
    // Check cache first
    const cached = await this.cache.get(key, {
      staleWhileRevalidate: true,
      revalidate: fetcher,
      revalidateOptions: options ?? this.defaultOptions,
    });

    if (cached) {
      return cached.value;
    }

    // Cache miss - fetch and cache
    const value = await fetcher();
    await this.cache.set(key, value, options ?? this.defaultOptions);
    return value;
  }

  async set(key: string, value: T, options?: CacheSetOptions): Promise<void> {
    await this.cache.set(key, value, { ...this.defaultOptions, ...options });
  }

  async invalidate(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async invalidateByTag(tag: string): Promise<number> {
    return this.cache.invalidateByTag(tag);
  }

  getStats(): CacheStats {
    return this.cache.getStats();
  }

  destroy(): void {
    this.cache.destroy();
  }
}

/**
 * Example: User cache with automatic fetching.
 */
async function typedCacheExample(): Promise<void> {
  console.log('\n--- Typed Cache Wrapper ---');

  // Create typed cache for users
  const userCache = new TypedCache<User>({
    maxSize: 100,
    defaultTtl: 60000,
    defaultStaleAfter: 30000,
    defaultTags: ['users'],
  });

  // Simulated API
  const fetchUserFromApi = async (id: string): Promise<User> => {
    console.log(`  [API] Fetching user ${id}`);
    await sleep(50);
    return {
      id,
      name: `User ${id}`,
      email: `user${id}@example.com`,
      role: 'user',
      lastActive: new Date().toISOString(),
    };
  };

  // First call - fetches from API
  console.log('First getOrFetch:');
  const user1 = await userCache.getOrFetch('user:1', () => fetchUserFromApi('1'));
  console.log('  Result:', user1.name);

  // Second call - returns from cache
  console.log('\nSecond getOrFetch:');
  const user2 = await userCache.getOrFetch('user:1', () => fetchUserFromApi('1'));
  console.log('  Result:', user2.name);

  console.log('\nCache stats:', userCache.getStats());

  // Invalidate all users
  const invalidated = await userCache.invalidateByTag('users');
  console.log(`\nInvalidated ${invalidated} user entries`);

  userCache.destroy();
}

// =============================================================================
// API Response Caching
// =============================================================================

/**
 * Real-world example: Caching API responses.
 */
async function apiCachingExample(): Promise<void> {
  console.log('\n--- API Response Caching ---');

  // Cache for API responses
  const apiCache = CacheManager.create<ApiResponse<unknown>>({
    maxSize: 200,
    defaultTtl: 5 * 60 * 1000, // 5 minutes
    defaultStaleAfter: 60 * 1000, // 1 minute
    cleanupInterval: 60 * 1000, // Cleanup every minute
  });

  /**
   * Cached fetch function.
   */
  async function cachedFetch<T>(
    url: string,
    options?: {
      ttl?: number;
      forceRefresh?: boolean;
      tags?: readonly string[];
    }
  ): Promise<T> {
    const cacheKey = `api:${url}`;

    // Check for force refresh
    if (!options?.forceRefresh) {
      const cached = await apiCache.get(cacheKey, {
        staleWhileRevalidate: true,
        revalidate: async () => fetchFromApi<T>(url),
        revalidateOptions: { ttl: options?.ttl, tags: options?.tags },
      });

      if (cached) {
        console.log(`  [Cache] ${cached.isStale ? 'STALE' : 'HIT'}: ${url}`);
        return cached.value.data as T;
      }
    }

    // Cache miss or force refresh
    console.log(`  [Cache] MISS: ${url}`);
    const response = await fetchFromApi<T>(url);
    await apiCache.set(cacheKey, response, {
      ttl: options?.ttl,
      tags: options?.tags,
    });
    return response.data;
  }

  /**
   * Simulated API fetch.
   */
  async function fetchFromApi<T>(url: string): Promise<ApiResponse<T>> {
    console.log(`  [API] Fetching: ${url}`);
    await sleep(100);
    return {
      data: { url } as T,
      timestamp: new Date().toISOString(),
    };
  }

  // Demo: Multiple requests
  console.log('Request 1 (cache miss):');
  await cachedFetch('/users');

  console.log('\nRequest 2 (cache hit):');
  await cachedFetch('/users');

  console.log('\nRequest 3 (different endpoint):');
  await cachedFetch('/products');

  console.log('\nRequest 4 (force refresh):');
  await cachedFetch('/users', { forceRefresh: true });

  console.log('\nCache stats:', apiCache.getStats());

  apiCache.destroy();
}

// =============================================================================
// Result-Based Error Handling
// =============================================================================

/**
 * Using Result pattern for error handling.
 */
function resultBasedExample(): void {
  console.log('\n--- Result-Based Error Handling ---');

  // Create with Result wrapper
  const result = CacheManager.createResult<string>({ maxSize: 100 });

  if (result._tag === 'Ok') {
    const cache = result.value;
    console.log('Cache created successfully');

    cache.setSync('key', 'value');
    console.log('Stored value');

    cache.destroy();
  } else {
    console.error('Failed to create cache:', result.error.message);
  }

  // Invalid configuration example
  const invalidResult = CacheManager.createResult<string>({ maxSize: -1 });

  if (invalidResult._tag === 'Err') {
    console.log('\nExpected error for invalid config:');
    console.log('  Code:', invalidResult.error.code);
    console.log('  Message:', invalidResult.error.message);
  }
}

// =============================================================================
// Cleanup Interval
// =============================================================================

/**
 * Automatic cleanup of expired entries.
 */
async function cleanupIntervalExample(): Promise<void> {
  console.log('\n--- Automatic Cleanup ---');

  const cache = CacheManager.create<string>({
    maxSize: 100,
    defaultTtl: 1000, // 1 second TTL
    cleanupInterval: 500, // Cleanup every 500ms
  });

  // Add entries
  await cache.set('entry1', 'value1');
  await cache.set('entry2', 'value2');
  await cache.set('entry3', 'value3');
  console.log('Added 3 entries');
  console.log('Size:', cache.getStats().size);

  // Wait for expiration and cleanup
  await sleep(1500);
  console.log('\nAfter 1.5 seconds (cleanup should have run):');
  console.log('Size:', cache.getStats().size);

  cache.destroy();
}

// =============================================================================
// Run All Examples
// =============================================================================

/**
 * Run all cache examples.
 */
export async function runCacheExamples(): Promise<void> {
  console.log('=== Cache API Examples ===\n');

  await basicCacheExample();
  await ttlExample();
  await staleWhileRevalidateExample();
  await invalidationExample();
  await statisticsExample();
  await lruEvictionExample();
  syncApiExample();
  await typedCacheExample();
  await apiCachingExample();
  resultBasedExample();
  await cleanupIntervalExample();

  console.log('\n=== Cache API Examples Complete ===');
}

// Export for external use
export { TypedCache, type User, type Product, type ApiResponse };

// Uncomment to run directly
// runCacheExamples();
