/**
 * Cache throughput benchmarks.
 *
 * CacheManager uses a single eviction strategy (LRU). These benchmarks measure
 * read/write throughput and the cost of an eviction-triggering write at
 * capacity. All operations are pure JavaScript, so the numbers track the V8
 * engine and translate directly to the browser.
 *
 * Run with: pnpm bench
 */
import { bench, describe } from 'vitest';
import { CacheManager } from '../src/cache/index.js';

const SIZE = 1000;

describe('CacheManager (LRU)', () => {
  // Pre-populated cache for read benchmarks.
  const readCache = CacheManager.create<number>({ maxSize: SIZE });
  for (let i = 0; i < SIZE; i++) {
    void readCache.set(`key-${i}`, i);
  }
  let cursor = 0;

  bench('get (hit)', async () => {
    await readCache.get(`key-${cursor++ % SIZE}`);
  });

  bench('get (miss)', async () => {
    await readCache.get('absent-key');
  });

  bench('set (no eviction)', async () => {
    await readCache.set(`key-${cursor++ % SIZE}`, cursor);
  });

  // A cache held exactly at capacity: every insert evicts the LRU entry.
  const evictCache = CacheManager.create<number>({ maxSize: SIZE });
  for (let i = 0; i < SIZE; i++) {
    void evictCache.set(`key-${i}`, i);
  }
  let evictKey = SIZE;

  bench('set (with LRU eviction at capacity)', async () => {
    await evictCache.set(`key-${evictKey++}`, evictKey);
  });
});
