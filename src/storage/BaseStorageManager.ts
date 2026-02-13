/**
 * Base Storage Manager - Abstract base class for storage managers.
 *
 * Provides common functionality for localStorage and sessionStorage wrappers.
 * Subclasses only need to provide the native storage instance.
 *
 * **API Pattern:** Abstract class with protected constructor, extended by
 * `StorageManager` (localStorage) and `SessionStorageManager` (sessionStorage).
 *
 * **For Extension:** If you need to create a custom storage manager (e.g., for
 * a custom storage backend), extend this class and implement `getNativeStorage()`.
 * Import from `@zappzarapp/browser-utils/storage`.
 *
 * @see StorageManager - localStorage implementation
 * @see SessionStorageManager - sessionStorage implementation
 */
import { Result, StorageError, ValidationError, Validator } from '../core/index.js';
import { MemoryStorage, type StorageEntry } from './MemoryStorage.js';
import { StorageConfig } from './StorageConfig.js';

/**
 * Type guard that validates whether an unknown parsed value has the expected
 * {@link StorageEntry} shape (i.e., contains a `data` property and a numeric `timestamp`).
 *
 * Used after `JSON.parse` to detect corrupted or structurally invalid storage entries
 * before accessing their properties.
 *
 * @param value - The value to check, typically the result of `JSON.parse`.
 * @returns `true` if the value conforms to the `StorageEntry<T>` shape.
 */
export function isStorageEntry<T>(value: unknown): value is StorageEntry<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'data' in value &&
    'timestamp' in value &&
    typeof (value as Record<string, unknown>)['timestamp'] === 'number'
  );
}

/**
 * Statistics about storage state.
 */
export interface BaseStorageStats {
  /** Number of entries */
  readonly count: number;
  /** Whether using memory fallback */
  readonly isMemoryFallback: boolean;
  /** Storage prefix */
  readonly prefix: string;
  /** Maximum entries allowed */
  readonly maxEntries: number;
}

/**
 * Abstract base class for storage managers.
 * Implements common logic for localStorage and sessionStorage wrappers.
 *
 * @remarks
 * Values are serialized via `JSON.stringify` and deserialized via `JSON.parse`.
 * Types without native JSON representation (Date, Map, Set, RegExp, etc.)
 * will lose their type information. Use plain objects and primitives, or
 * convert values before storing and after retrieval.
 */
export abstract class BaseStorageManager<T = unknown> {
  protected readonly config: StorageConfig;
  protected readonly memoryStorage: MemoryStorage<T>;
  protected readonly isMemoryMode: boolean;

  /**
   * Get the native storage instance (localStorage or sessionStorage).
   */
  protected abstract getNativeStorage(): Storage;

  /**
   * Shared factory logic for creating storage manager instances.
   * @internal
   */
  protected static initStorage<M>(
    config: StorageConfig,
    isAvailable: () => boolean,
    storageName: string,
    construct: (config: StorageConfig, useMemory: boolean) => M
  ): M {
    const useMemory = !isAvailable();

    if (useMemory && config.useMemoryFallback) {
      config.logger.warn(`${storageName} unavailable, using in-memory storage`);
    } else if (useMemory && !config.useMemoryFallback) {
      throw StorageError.unavailable(`${storageName} not available and memory fallback disabled`);
    }

    return construct(config, useMemory && config.useMemoryFallback);
  }

  /**
   * Check if a storage backend is available.
   * @internal
   */
  protected static checkStorageAvailable(getStorage: () => Storage, testKey: string): boolean {
    try {
      const storage = getStorage();
      storage.setItem(testKey, '1');
      storage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  protected constructor(config: StorageConfig, useMemory: boolean) {
    this.config = config;
    this.memoryStorage = new MemoryStorage<T>(config.maxEntries);
    this.isMemoryMode = useMemory;
  }

  // =========================================================================
  // Core API
  // =========================================================================

  /**
   * Store a value.
   * @throws {ValidationError} If key is invalid
   * @throws {StorageError} If storage fails
   */
  set(key: string, value: T): void {
    Validator.storageKey(key);

    const entry: StorageEntry<T> = {
      data: value,
      timestamp: Date.now(),
    };

    if (this.isMemoryMode) {
      this.memoryStorage.set(key, value);
      this.config.logger.debug('Stored (memory):', key);
      return;
    }

    const fullKey = this.getFullKey(key);
    const storage = this.getNativeStorage();

    try {
      const serialized = JSON.stringify(entry);
      storage.setItem(fullKey, serialized);
      this.enforceLimits();
      this.config.logger.debug('Stored:', key);
    } catch (e) {
      if (this.isQuotaError(e)) {
        this.config.logger.warn('Quota exceeded, evicting oldest entries');
        this.evictOldest();

        // Retry once
        try {
          storage.setItem(fullKey, JSON.stringify(entry));
          this.config.logger.debug('Stored after eviction:', key);
        } catch (retryError) {
          throw StorageError.quotaExceeded(key, retryError);
        }
      } else {
        throw StorageError.serializationFailed(key, e);
      }
    }
  }

  /**
   * Retrieve a value.
   * @returns Value or null if not found
   * @throws {ValidationError} If key is invalid
   */
  get(key: string): T | null {
    Validator.storageKey(key);

    if (this.isMemoryMode) {
      const entry = this.memoryStorage.get(key);
      return entry?.data ?? null;
    }

    const fullKey = this.getFullKey(key);
    const raw = this.getNativeStorage().getItem(fullKey);

    if (raw === null) {
      return null;
    }

    try {
      const parsed: unknown = JSON.parse(raw);

      if (!isStorageEntry<T>(parsed)) {
        this.config.logger.error('Invalid storage entry structure:', key);
        return null;
      }

      return parsed.data;
    } catch (e) {
      this.config.logger.error('Failed to parse stored value:', key, e);
      return null;
    }
  }

  /**
   * Retrieve a value with Result (no exceptions).
   */
  getResult(key: string): Result<T | null, ValidationError | StorageError> {
    const keyResult = Validator.storageKeyResult(key);
    if (Result.isErr(keyResult)) {
      return keyResult;
    }

    if (this.isMemoryMode) {
      const entry = this.memoryStorage.get(key);
      // Null fallback is defensive - entries always have data
      return Result.ok(entry?.data /* v8 ignore next */ ?? null);
    }

    const fullKey = this.getFullKey(key);
    const raw = this.getNativeStorage().getItem(fullKey);

    if (raw === null) {
      return Result.ok(null);
    }

    try {
      const parsed: unknown = JSON.parse(raw);

      if (!isStorageEntry<T>(parsed)) {
        return Result.err(StorageError.corrupted(key, 'invalid storage entry structure'));
      }

      return Result.ok(parsed.data);
    } catch (e) {
      return Result.err(StorageError.deserializationFailed(key, e));
    }
  }

  /**
   * Check if a key exists.
   */
  has(key: string): boolean {
    Validator.storageKey(key);

    if (this.isMemoryMode) {
      return this.memoryStorage.has(key);
    }

    return this.getNativeStorage().getItem(this.getFullKey(key)) !== null;
  }

  /**
   * Remove a value.
   */
  remove(key: string): void {
    Validator.storageKey(key);

    if (this.isMemoryMode) {
      this.memoryStorage.delete(key);
      this.config.logger.debug('Removed (memory):', key);
      return;
    }

    this.getNativeStorage().removeItem(this.getFullKey(key));
    this.config.logger.debug('Removed:', key);
  }

  /**
   * Get all keys (without prefix).
   */
  keys(): string[] {
    if (this.isMemoryMode) {
      return this.memoryStorage.keys();
    }

    const keys: string[] = [];
    const prefix = `${this.config.prefix}.`;
    const storage = this.getNativeStorage();

    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key?.startsWith(prefix) === true) {
        keys.push(key.substring(prefix.length));
      }
    }

    return keys;
  }

  /**
   * Get all entries sorted by timestamp (newest first).
   */
  entries(): Array<{ key: string; value: T; timestamp: number }> {
    if (this.isMemoryMode) {
      return this.memoryStorage.entries().map(({ key, entry }) => ({
        key,
        value: entry.data,
        timestamp: entry.timestamp,
      }));
    }

    const entries: Array<{ key: string; value: T; timestamp: number }> = [];
    const storage = this.getNativeStorage();

    for (const key of this.keys()) {
      try {
        const raw = storage.getItem(this.getFullKey(key));
        if (raw !== null) {
          const parsed: unknown = JSON.parse(raw);

          if (!isStorageEntry<T>(parsed)) {
            // Skip entries with invalid structure
            continue;
          }

          entries.push({ key, value: parsed.data, timestamp: parsed.timestamp });
        }
      } catch {
        // Skip corrupted entries
      }
    }

    return entries.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Clear all entries with this prefix.
   */
  clear(): void {
    if (this.isMemoryMode) {
      this.memoryStorage.clear();
      this.config.logger.debug('Cleared (memory)');
      return;
    }

    const storage = this.getNativeStorage();
    const keysToRemove = this.keys().map((k) => this.getFullKey(k));
    for (const key of keysToRemove) {
      storage.removeItem(key);
    }

    this.config.logger.debug(`Cleared ${keysToRemove.length} entries`);
  }

  /**
   * Get storage statistics.
   */
  stats(): BaseStorageStats {
    return {
      count: this.isMemoryMode ? this.memoryStorage.size : this.keys().length,
      isMemoryFallback: this.isMemoryMode,
      prefix: this.config.prefix,
      maxEntries: this.config.maxEntries,
    };
  }

  // =========================================================================
  // Internal
  // =========================================================================

  protected getFullKey(key: string): string {
    return `${this.config.prefix}.${key}`;
  }

  protected isQuotaError(e: unknown): boolean {
    return (
      e instanceof Error &&
      (e.name === 'QuotaExceededError' ||
        e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        e.message.includes('quota'))
    );
  }

  protected enforceLimits(): void {
    const entries = this.entries();

    if (entries.length <= this.config.maxEntries) {
      return;
    }

    const storage = this.getNativeStorage();
    const toRemove = entries.slice(this.config.maxEntries);
    for (const { key } of toRemove) {
      storage.removeItem(this.getFullKey(key));
    }

    if (toRemove.length > 0) {
      this.config.logger.debug(`Evicted ${toRemove.length} old entries (limit)`);
    }
  }

  protected evictOldest(): void {
    // Memory mode path - unreachable since quota errors only occur with native storage
    /* v8 ignore next 5 */
    if (this.isMemoryMode) {
      const evicted = this.memoryStorage.evictOldest(this.config.minSafeEntries);
      this.config.logger.debug(`Emergency eviction (memory): ${evicted} entries`);
      return;
    }

    const entries = this.entries();

    if (entries.length <= this.config.minSafeEntries) {
      return;
    }

    const storage = this.getNativeStorage();
    const toRemove = entries.slice(this.config.minSafeEntries);
    for (const { key } of toRemove) {
      storage.removeItem(this.getFullKey(key));
    }

    this.config.logger.debug(`Emergency eviction: ${toRemove.length} entries`);
  }
}
