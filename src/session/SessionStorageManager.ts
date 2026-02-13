/**
 * Session Storage Manager - Type-safe sessionStorage wrapper with LRU eviction.
 *
 * Similar to StorageManager but uses sessionStorage instead of localStorage.
 * Data persists only for the browser session (cleared when tab closes).
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
 * const session = SessionStorageManager.create<UserSession>({ prefix: 'myApp' });
 * session.set('session', { token: 'abc123' });
 * const data = session.get('session');
 *
 * // With Result API (no exceptions)
 * const result = session.getResult('session');
 * if (Result.isOk(result)) {
 *   console.log(result.value);
 * }
 * ```
 */
import {
  BaseStorageManager,
  type BaseStorageStats,
  StorageConfig,
  type StorageConfigOptions,
} from '../storage/index.js';

/**
 * Statistics about session storage state.
 */
export type SessionStorageStats = BaseStorageStats;

export class SessionStorageManager<T = unknown> extends BaseStorageManager<T> {
  private constructor(config: StorageConfig, useMemory: boolean) {
    super(config, useMemory);
  }

  // =========================================================================
  // Abstract Implementation
  // =========================================================================

  protected getNativeStorage(): Storage {
    return sessionStorage;
  }

  // =========================================================================
  // Factory Methods
  // =========================================================================

  /**
   * Create a session storage manager with the given configuration.
   */
  static create<T>(options: StorageConfigOptions = {}): SessionStorageManager<T> {
    return BaseStorageManager.initStorage(
      StorageConfig.create(options),
      () => SessionStorageManager.isSessionStorageAvailable(),
      'sessionStorage',
      (config, useMemory) => new SessionStorageManager<T>(config, useMemory)
    );
  }

  /**
   * Create a session storage manager from existing config.
   */
  static fromConfig<T>(config: StorageConfig): SessionStorageManager<T> {
    return BaseStorageManager.initStorage(
      config,
      () => SessionStorageManager.isSessionStorageAvailable(),
      'sessionStorage',
      (c, useMemory) => new SessionStorageManager<T>(c, useMemory)
    );
  }

  /**
   * Create a session storage manager with debug logging.
   */
  static withDebugLogging<T>(prefix: string): SessionStorageManager<T> {
    return SessionStorageManager.fromConfig<T>(StorageConfig.withDebugLogging(prefix));
  }

  /**
   * Check if sessionStorage is available.
   */
  static isSessionStorageAvailable(): boolean {
    return BaseStorageManager.checkStorageAvailable(() => sessionStorage, '__session_test__');
  }
}
