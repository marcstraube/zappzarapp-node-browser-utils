/**
 * In-Memory Storage Implementation.
 *
 * Provides a Map-based storage that mimics localStorage API.
 * Used as fallback when localStorage is unavailable (private browsing, etc.).
 *
 * Features:
 * - Same API as localStorage
 * - LRU eviction support
 * - No persistence (data lost on page refresh)
 */

/**
 * Storage entry with timestamp for LRU tracking.
 */
export interface StorageEntry<T> {
  readonly data: T;
  readonly timestamp: number;
}

export class MemoryStorage<T> {
  private readonly store = new Map<string, StorageEntry<T>>();
  private readonly maxEntries: number;

  constructor(maxEntries: number) {
    this.maxEntries = maxEntries;
  }

  /**
   * Get entry by key.
   */
  get(key: string): StorageEntry<T> | undefined {
    return this.store.get(key);
  }

  /**
   * Set entry with current timestamp.
   */
  set(key: string, data: T): void {
    this.store.set(key, {
      data,
      timestamp: Date.now(),
    });
    this.enforceLimit();
  }

  /**
   * Check if key exists.
   */
  has(key: string): boolean {
    return this.store.has(key);
  }

  /**
   * Delete entry by key.
   */
  delete(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Get all keys.
   */
  keys(): string[] {
    return Array.from(this.store.keys());
  }

  /**
   * Get all entries sorted by timestamp (newest first).
   */
  entries(): Array<{ key: string; entry: StorageEntry<T> }> {
    return Array.from(this.store.entries())
      .map(([key, entry]) => ({ key, entry }))
      .sort((a, b) => b.entry.timestamp - a.entry.timestamp);
  }

  /**
   * Get number of entries.
   */
  get size(): number {
    return this.store.size;
  }

  /**
   * Clear all entries.
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Enforce max entries limit using LRU eviction.
   */
  private enforceLimit(): void {
    if (this.store.size <= this.maxEntries) {
      return;
    }

    // Sort by timestamp and keep newest
    const sorted = this.entries();
    const toKeep = sorted.slice(0, this.maxEntries);

    this.store.clear();
    for (const { key, entry } of toKeep) {
      this.store.set(key, entry);
    }
  }

  /**
   * Evict oldest entries, keeping only minKeep newest.
   */
  evictOldest(minKeep: number): number {
    if (this.store.size <= minKeep) {
      return 0;
    }

    const sorted = this.entries();
    const toKeep = sorted.slice(0, minKeep);
    const evictedCount = this.store.size - toKeep.length;

    this.store.clear();
    for (const { key, entry } of toKeep) {
      this.store.set(key, entry);
    }

    return evictedCount;
  }
}
