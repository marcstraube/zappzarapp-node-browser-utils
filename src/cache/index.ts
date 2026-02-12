/**
 * Cache module - HTTP-style caching with stale-while-revalidate support.
 *
 * @example
 * ```TypeScript
 * import { CacheManager } from '@zappzarapp/browser-utils/cache';
 *
 * const cache = CacheManager.create<UserData>({
 *   maxSize: 500,
 *   defaultTtl: 60000,
 * });
 *
 * // Set with TTL
 * await cache.set('user:1', userData, { ttl: 30000 });
 *
 * // Get with stale-while-revalidate
 * const result = await cache.get('user:1', {
 *   staleWhileRevalidate: true,
 *   revalidate: async () => fetchUser(1),
 * });
 *
 * // Cleanup
 * cache.destroy();
 * ```
 */
export { CacheManager, CacheError } from './CacheManager.js';
export type {
  CacheErrorCode,
  CacheEntryMeta,
  CacheSetOptions,
  CacheGetOptions,
  CacheGetResult,
  CacheStats,
  CacheConfig,
  CacheManagerInstance,
} from './CacheManager.js';
