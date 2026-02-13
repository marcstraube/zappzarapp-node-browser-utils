/**
 * Storage Manager - Type-safe localStorage wrapper with LRU eviction.
 *
 * Features:
 * - Immutable configuration
 * - Type-safe generic API
 * - Automatic quota management with LRU eviction
 * - In-memory fallback for private browsing
 * - Key validation (security)
 * - Result-based error handling option
 *
 * @example
 * ```TypeScript
 * // Quick start
 * const storage = StorageManager.create<UserPrefs>({ prefix: 'myApp' });
 * storage.set('prefs', { theme: 'dark' });
 * const prefs = storage.get('prefs');
 *
 * // With Result API (no exceptions)
 * const result = storage.getResult('prefs');
 * if (Result.isOk(result)) {
 *   console.log(result.value);
 * }
 *
 * // Debug logging
 * const debug = StorageManager.withDebugLogging<MyData>('myApp');
 * ```
 */
import type { CleanupFn } from '../core/index.js';
import { BaseStorageManager, type BaseStorageStats, isStorageEntry } from './BaseStorageManager.js';
import { StorageConfig, type StorageConfigOptions } from './StorageConfig.js';

/**
 * Statistics about storage state.
 */
export type StorageStats = BaseStorageStats;

/**
 * Event emitted when storage changes from another tab/window.
 */
export interface StorageChangeEvent<T> {
  /** Key that changed (without prefix) */
  readonly key: string;
  /** New value (null if removed) */
  readonly newValue: T | null;
  /** Previous value (null if newly added) */
  readonly oldValue: T | null;
}

export class StorageManager<T = unknown> extends BaseStorageManager<T> {
  private constructor(config: StorageConfig, useMemory: boolean) {
    super(config, useMemory);
  }

  // =========================================================================
  // Abstract Implementation
  // =========================================================================

  protected getNativeStorage(): Storage {
    return localStorage;
  }

  // =========================================================================
  // Factory Methods
  // =========================================================================

  /**
   * Create a storage manager with the given configuration.
   */
  static create<T>(options: StorageConfigOptions = {}): StorageManager<T> {
    return BaseStorageManager.initStorage(
      StorageConfig.create(options),
      () => StorageManager.isLocalStorageAvailable(),
      'localStorage',
      (config, useMemory) => new StorageManager<T>(config, useMemory)
    );
  }

  /**
   * Create a storage manager from existing config.
   */
  static fromConfig<T>(config: StorageConfig): StorageManager<T> {
    return BaseStorageManager.initStorage(
      config,
      () => StorageManager.isLocalStorageAvailable(),
      'localStorage',
      (c, useMemory) => new StorageManager<T>(c, useMemory)
    );
  }

  /**
   * Create a storage manager with debug logging.
   */
  static withDebugLogging<T>(prefix: string): StorageManager<T> {
    return StorageManager.fromConfig<T>(StorageConfig.withDebugLogging(prefix));
  }

  // =========================================================================
  // Cross-Tab Sync
  // =========================================================================

  /**
   * Listen for storage changes from other tabs/windows.
   *
   * The `storage` event only fires when localStorage is modified by another
   * browsing context (tab/window) with the same origin. Changes made in the
   * current tab do not trigger the event.
   *
   * @returns Cleanup function to remove the listener
   */
  onExternalChange(handler: (event: StorageChangeEvent<T>) => void): CleanupFn {
    if (this.isMemoryMode) {
      this.config.logger.debug('Cross-tab sync unavailable in memory mode');
      return () => {};
    }

    const prefix = `${this.config.prefix}.`;

    const listener = (e: StorageEvent): void => {
      if (e.key?.startsWith(prefix) !== true) {
        return;
      }

      const key = e.key.substring(prefix.length);

      const parseValue = (raw: string | null): T | null => {
        if (raw === null) return null;
        try {
          const parsed: unknown = JSON.parse(raw);
          return isStorageEntry<T>(parsed) ? parsed.data : null;
        } catch {
          return null;
        }
      };

      handler({
        key,
        newValue: parseValue(e.newValue),
        oldValue: parseValue(e.oldValue),
      });
    };

    window.addEventListener('storage', listener);
    this.config.logger.debug('Cross-tab sync listener registered');

    return () => {
      window.removeEventListener('storage', listener);
      this.config.logger.debug('Cross-tab sync listener removed');
    };
  }

  // =========================================================================
  // Static
  // =========================================================================

  /**
   * Check if localStorage is available.
   */
  static isLocalStorageAvailable(): boolean {
    return BaseStorageManager.checkStorageAvailable(() => localStorage, '__storage_test__');
  }
}
