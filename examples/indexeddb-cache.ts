// noinspection JSUnusedGlobalSymbols - Example file with exported demo functions

/**
 * IndexedDB Cache Example
 *
 * Demonstrates offline data caching with IndexedDBManager:
 * - Caching API responses for offline access
 * - TTL-based cache expiration
 * - Cache-first with network fallback strategy
 * - Batch operations using transactions
 * - Type-safe data storage
 *
 * @example
 * This example creates a caching layer that stores API responses
 * in IndexedDB, allowing your app to work offline and reducing
 * network requests for frequently accessed data.
 */

import { IndexedDBManager, type IndexedDBInstance, type DatabaseConfig } from '../src/indexeddb';
import { NetworkStatus } from '../src/network';

// ============================================================================
// Types
// ============================================================================

/** Cached item metadata */
interface CacheEntry<T> {
  /** Unique cache key */
  readonly key: string;
  /** Cached data */
  readonly data: T;
  /** Timestamp when cached */
  readonly cachedAt: number;
  /** TTL in milliseconds (null = never expires) */
  readonly ttl: number | null;
  /** ETag for conditional requests */
  readonly etag?: string;
  /** Last-Modified header value */
  readonly lastModified?: string;
}

/** API response structure */
interface ApiResponse<T> {
  readonly data: T;
  readonly etag?: string;
  readonly lastModified?: string;
}

/** Pending sync item */
interface PendingSyncItem<T> {
  /** Unique ID */
  readonly id: string;
  /** API endpoint */
  readonly url: string;
  /** HTTP method */
  readonly method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Request body */
  readonly body: T;
  /** Timestamp when queued */
  readonly queuedAt: number;
  /** Number of retry attempts */
  readonly retryCount: number;
}

/** Product data example */
interface Product {
  readonly id: string;
  readonly name: string;
  readonly price: number;
  readonly category: string;
  readonly updatedAt: string;
}

// ============================================================================
// Database Configuration
// ============================================================================

/**
 * Database schema for the cache.
 */
const CACHE_DB_CONFIG: DatabaseConfig = {
  name: 'app-cache',
  version: 1,
  stores: {
    // Main cache store
    cache: {
      keyPath: 'key',
      indexes: {
        // Index for TTL-based cleanup
        cachedAt: { keyPath: 'cachedAt', unique: false },
      },
    },
    // Pending sync queue for offline mutations
    pendingSync: {
      keyPath: 'id',
      indexes: {
        queuedAt: { keyPath: 'queuedAt', unique: false },
      },
    },
    // Metadata store for app state
    metadata: {
      keyPath: 'key',
    },
  },
};

// ============================================================================
// Cache Manager Implementation
// ============================================================================

/**
 * Generic caching layer with offline support.
 */
class CacheManager {
  private db: IndexedDBInstance | null = null;
  private readonly defaultTtl: number;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Create a cache manager.
   * @param defaultTtl Default TTL in milliseconds (default: 1 hour)
   */
  constructor(defaultTtl: number = 60 * 60 * 1000) {
    this.defaultTtl = defaultTtl;
  }

  /**
   * Initialize the cache database.
   */
  async init(): Promise<void> {
    if (this.db) return;

    this.db = await IndexedDBManager.open(CACHE_DB_CONFIG);

    // Start periodic cleanup
    this.startCleanup();

    // Listen for online events to sync pending items
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.processPendingSync());
    }

    console.log('[Cache] Initialized');
  }

  /**
   * Get an item from cache.
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.db) {
      throw new Error('Cache not initialized. Call init() first.');
    }

    const entry = await this.db.get<CacheEntry<T>>('cache', key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      await this.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set an item in cache.
   */
  async set<T>(
    key: string,
    data: T,
    options: {
      ttl?: number | null;
      etag?: string;
      lastModified?: string;
    } = {}
  ): Promise<void> {
    if (!this.db) {
      throw new Error('Cache not initialized. Call init() first.');
    }

    const entry: CacheEntry<T> = {
      key,
      data,
      cachedAt: Date.now(),
      ttl: options.ttl ?? this.defaultTtl,
      etag: options.etag,
      lastModified: options.lastModified,
    };

    await this.db.put('cache', entry);
  }

  /**
   * Delete an item from cache.
   */
  async delete(key: string): Promise<void> {
    if (!this.db) return;
    await this.db.delete('cache', key);
  }

  /**
   * Clear all cached items.
   */
  async clear(): Promise<void> {
    if (!this.db) return;
    await this.db.clear('cache');
    console.log('[Cache] Cleared all items');
  }

  /**
   * Get cache metadata (e.g., etag, lastModified) for conditional requests.
   */
  async getMetadata(key: string): Promise<{ etag?: string; lastModified?: string } | null> {
    if (!this.db) return null;

    const entry = await this.db.get<CacheEntry<unknown>>('cache', key);
    if (!entry || this.isExpired(entry)) {
      return null;
    }

    return {
      etag: entry.etag,
      lastModified: entry.lastModified,
    };
  }

  /**
   * Check if a cache entry is expired.
   */
  private isExpired(entry: CacheEntry<unknown>): boolean {
    if (entry.ttl === null) {
      return false; // Never expires
    }
    return Date.now() > entry.cachedAt + entry.ttl;
  }

  /**
   * Start periodic cleanup of expired items.
   */
  private startCleanup(intervalMs: number = 5 * 60 * 1000): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired().catch(console.error);
    }, intervalMs);
  }

  /**
   * Remove all expired cache entries.
   */
  async cleanupExpired(): Promise<number> {
    if (!this.db) return 0;

    const allEntries = await this.db.getAll<CacheEntry<unknown>>('cache');
    const expiredKeys = allEntries
      .filter((entry) => this.isExpired(entry))
      .map((entry) => entry.key);

    if (expiredKeys.length === 0) return 0;

    // Delete expired entries in a transaction
    await this.db.transaction('cache', 'readwrite', async (tx) => {
      for (const key of expiredKeys) {
        await tx.delete('cache', key);
      }
    });

    console.log(`[Cache] Cleaned up ${expiredKeys.length} expired entries`);
    return expiredKeys.length;
  }

  // ==========================================================================
  // Pending Sync Queue (for offline mutations)
  // ==========================================================================

  /**
   * Queue a mutation for later sync.
   */
  async queueSync<T>(
    url: string,
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    body: T
  ): Promise<string> {
    if (!this.db) {
      throw new Error('Cache not initialized. Call init() first.');
    }

    const item: PendingSyncItem<T> = {
      id: crypto.randomUUID(),
      url,
      method,
      body,
      queuedAt: Date.now(),
      retryCount: 0,
    };

    await this.db.add('pendingSync', item);
    console.log(`[Cache] Queued sync item: ${method} ${url}`);

    return item.id;
  }

  /**
   * Process pending sync items when online.
   */
  async processPendingSync(): Promise<void> {
    if (!this.db) return;

    const isOnline = NetworkStatus.isOnline();
    if (!isOnline) {
      console.log('[Cache] Offline, skipping sync');
      return;
    }

    const pendingItems = await this.db.getAll<PendingSyncItem<unknown>>('pendingSync');

    for (const item of pendingItems) {
      try {
        const response = await fetch(item.url, {
          method: item.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.body),
        });

        if (response.ok) {
          await this.db.delete('pendingSync', item.id);
          console.log(`[Cache] Synced: ${item.method} ${item.url}`);
        } else if (response.status >= 400 && response.status < 500) {
          // Client error - don't retry
          await this.db.delete('pendingSync', item.id);
          console.error(`[Cache] Sync failed (client error): ${response.status}`);
        } else {
          // Server error - increment retry count
          const updatedItem: PendingSyncItem<unknown> = {
            ...item,
            retryCount: item.retryCount + 1,
          };
          await this.db.put('pendingSync', updatedItem);
        }
      } catch (error) {
        console.error(`[Cache] Sync error for ${item.url}:`, error);
        // Will retry on next sync
      }
    }
  }

  /**
   * Get count of pending sync items.
   */
  async getPendingSyncCount(): Promise<number> {
    if (!this.db) return 0;
    return this.db.count('pendingSync');
  }

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  /**
   * Close the database and cleanup resources.
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.db) {
      this.db.close();
      this.db = null;
    }

    console.log('[Cache] Destroyed');
  }
}

// ============================================================================
// API Client with Caching
// ============================================================================

/**
 * API client with built-in caching and offline support.
 */
class CachedApiClient {
  private readonly cache: CacheManager;
  private readonly baseUrl: string;

  constructor(baseUrl: string, cacheTtl?: number) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.cache = new CacheManager(cacheTtl);
  }

  /**
   * Initialize the API client.
   */
  async init(): Promise<void> {
    await this.cache.init();
  }

  /**
   * Fetch data with cache-first strategy.
   * Returns cached data immediately, then optionally revalidates.
   */
  async fetch<T>(
    endpoint: string,
    options: {
      ttl?: number;
      forceRefresh?: boolean;
      staleWhileRevalidate?: boolean;
    } = {}
  ): Promise<ApiResponse<T>> {
    const cacheKey = `${this.baseUrl}${endpoint}`;
    const isOnline = NetworkStatus.isOnline();

    // Try cache first (unless force refresh)
    if (!options.forceRefresh) {
      const cached = await this.cache.get<T>(cacheKey);
      if (cached !== null) {
        // If stale-while-revalidate is enabled and online, refresh in background
        if (options.staleWhileRevalidate && isOnline) {
          this.revalidate<T>(endpoint, cacheKey, options.ttl).catch(console.error);
        }
        return { data: cached };
      }
    }

    // If offline and no cache, throw error
    if (!isOnline) {
      throw new Error('Offline and no cached data available');
    }

    // Fetch from network
    return this.fetchFromNetwork<T>(endpoint, cacheKey, options.ttl);
  }

  /**
   * Fetch fresh data from network.
   */
  private async fetchFromNetwork<T>(
    endpoint: string,
    cacheKey: string,
    ttl?: number
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    // Get cache metadata for conditional request
    const metadata = await this.cache.getMetadata(cacheKey);
    const headers: HeadersInit = {};

    if (metadata?.etag) {
      headers['If-None-Match'] = metadata.etag;
    }
    if (metadata?.lastModified) {
      headers['If-Modified-Since'] = metadata.lastModified;
    }

    const response = await fetch(url, { headers });

    // 304 Not Modified - use cached data
    if (response.status === 304) {
      const cached = await this.cache.get<T>(cacheKey);
      if (cached !== null) {
        return { data: cached };
      }
    }

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data: T = await response.json();
    const etag = response.headers.get('ETag') ?? undefined;
    const lastModified = response.headers.get('Last-Modified') ?? undefined;

    // Cache the response
    await this.cache.set(cacheKey, data, { ttl, etag, lastModified });

    return { data, etag, lastModified };
  }

  /**
   * Revalidate cache in background.
   */
  private async revalidate<T>(endpoint: string, cacheKey: string, ttl?: number): Promise<void> {
    try {
      await this.fetchFromNetwork<T>(endpoint, cacheKey, ttl);
      console.log(`[API] Revalidated: ${endpoint}`);
    } catch (error) {
      console.warn(`[API] Revalidation failed for ${endpoint}:`, error);
    }
  }

  /**
   * Send a mutation (POST/PUT/PATCH/DELETE) with offline support.
   */
  async mutate<TRequest, TResponse = void>(
    endpoint: string,
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    body: TRequest
  ): Promise<TResponse | null> {
    const url = `${this.baseUrl}${endpoint}`;
    const isOnline = NetworkStatus.isOnline();

    if (!isOnline) {
      // Queue for later sync
      await this.cache.queueSync(url, method, body);
      console.log(`[API] Offline - queued ${method} ${endpoint}`);
      return null;
    }

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    // Invalidate related cache entries
    await this.invalidateCache(endpoint);

    if (response.status === 204) {
      return null as TResponse;
    }

    return response.json();
  }

  /**
   * Invalidate cache entries matching a pattern.
   */
  private async invalidateCache(endpoint: string): Promise<void> {
    // Extract resource type from endpoint (e.g., /products/123 -> /products)
    const resourcePath = endpoint.replace(/\/[^/]+$/, '');
    const cacheKey = `${this.baseUrl}${resourcePath}`;

    // Delete the list cache
    await this.cache.delete(cacheKey);

    // Also delete the specific item cache
    const itemCacheKey = `${this.baseUrl}${endpoint}`;
    await this.cache.delete(itemCacheKey);
  }

  /**
   * Get pending sync count.
   */
  async getPendingSyncCount(): Promise<number> {
    return this.cache.getPendingSyncCount();
  }

  /**
   * Process pending sync items.
   */
  async syncPending(): Promise<void> {
    await this.cache.processPendingSync();
  }

  /**
   * Clear all cached data.
   */
  async clearCache(): Promise<void> {
    await this.cache.clear();
  }

  /**
   * Cleanup resources.
   */
  destroy(): void {
    this.cache.destroy();
  }
}

// ============================================================================
// Usage Example
// ============================================================================

/**
 * Example: Product catalog with offline support.
 */
async function productCatalogExample(): Promise<void> {
  // Create API client with 30-minute cache TTL
  const api = new CachedApiClient('https://api.example.com', 30 * 60 * 1000);
  await api.init();

  // Show pending sync count on load
  const pendingCount = await api.getPendingSyncCount();
  if (pendingCount > 0) {
    console.log(`${pendingCount} changes pending sync`);
    // Try to sync immediately if online
    await api.syncPending();
  }

  // Fetch products (cache-first with stale-while-revalidate)
  try {
    const { data: products } = await api.fetch<Product[]>('/products', {
      staleWhileRevalidate: true,
    });
    console.log('Products:', products);

    // Display products
    renderProducts(products);
  } catch (error) {
    console.error('Failed to fetch products:', error);
    // Show offline message or cached data
  }

  // Fetch single product
  try {
    const { data: product } = await api.fetch<Product>('/products/123');
    console.log('Product:', product);
  } catch (error) {
    console.error('Failed to fetch product:', error);
  }

  // Create new product (works offline)
  try {
    const newProduct: Omit<Product, 'id' | 'updatedAt'> = {
      name: 'New Widget',
      price: 29.99,
      category: 'widgets',
    };

    const result = await api.mutate<typeof newProduct, Product>('/products', 'POST', newProduct);

    if (result) {
      console.log('Created product:', result);
    } else {
      console.log('Product creation queued for sync');
    }
  } catch (error) {
    console.error('Failed to create product:', error);
  }

  // Update product (works offline)
  try {
    const result = await api.mutate<Partial<Product>, Product>('/products/123', 'PATCH', {
      price: 24.99,
    });

    if (result) {
      console.log('Updated product:', result);
    } else {
      console.log('Product update queued for sync');
    }
  } catch (error) {
    console.error('Failed to update product:', error);
  }

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    api.destroy();
  });
}

/**
 * Render products in the UI.
 */
function renderProducts(products: Product[]): void {
  const container = document.getElementById('products');
  if (!container) return;

  container.innerHTML = products
    .map(
      (product) => `
        <div class="product" data-id="${product.id}">
          <h3>${product.name}</h3>
          <p class="price">$${product.price.toFixed(2)}</p>
          <span class="category">${product.category}</span>
        </div>
      `
    )
    .join('');
}

// Initialize when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      productCatalogExample().catch(console.error);
    });
  } else {
    productCatalogExample().catch(console.error);
  }
}

export { CacheManager, CachedApiClient, type CacheEntry, type PendingSyncItem };
