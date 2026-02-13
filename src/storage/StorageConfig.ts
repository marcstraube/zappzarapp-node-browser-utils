/**
 * Storage Configuration Value Object.
 *
 * Immutable configuration for StorageManager instances.
 * All values are validated on creation.
 *
 * @example
 * ```TypeScript
 * // Factory methods
 * const config = StorageConfig.create({ prefix: 'myApp', maxEntries: 100 });
 *
 * // Defaults
 * const defaults = StorageConfig.defaults();
 *
 * // Fluent API
 * const modified = config.withMaxEntries(200).withPrefix('newApp');
 * ```
 */
import { Validator, noopLogger, type LoggerLike } from '../core/index.js';

/**
 * Options for creating StorageConfig.
 */
export interface StorageConfigOptions {
  /**
   * Key prefix for all storage entries.
   * Must be alphanumeric, starting with a letter.
   * @default 'storage'
   */
  readonly prefix?: string;

  /**
   * Maximum number of entries to keep.
   * Oldest entries are evicted when limit is reached (LRU).
   * @default 50
   */
  readonly maxEntries?: number;

  /**
   * Minimum entries to keep during emergency eviction (quota exceeded).
   * @default 5
   */
  readonly minSafeEntries?: number;

  /**
   * Logger instance satisfying the {@link LoggerLike} interface.
   * Any object with debug/info/warn/error methods works.
   * @default Silent no-op logger
   */
  readonly logger?: LoggerLike;

  /**
   * Whether to use memory fallback when localStorage is unavailable.
   * @default true
   */
  readonly useMemoryFallback?: boolean;
}

export class StorageConfig {
  readonly prefix: string;
  readonly maxEntries: number;
  readonly minSafeEntries: number;
  readonly logger: LoggerLike;
  readonly useMemoryFallback: boolean;

  private constructor(
    prefix: string,
    maxEntries: number,
    minSafeEntries: number,
    logger: LoggerLike,
    useMemoryFallback: boolean
  ) {
    this.prefix = prefix;
    this.maxEntries = maxEntries;
    this.minSafeEntries = minSafeEntries;
    this.logger = logger;
    this.useMemoryFallback = useMemoryFallback;
  }

  // =========================================================================
  // Factory Methods
  // =========================================================================

  /**
   * Create storage configuration with validation.
   * @throws {ValidationError} If any option is invalid
   */
  static create(options: StorageConfigOptions = {}): StorageConfig {
    const prefix = options.prefix ?? 'storage';
    Validator.storagePrefix(prefix);

    const maxEntries = options.maxEntries ?? 50;
    Validator.numberInRange('maxEntries', maxEntries, 1, 10000);

    const minSafeEntries = options.minSafeEntries ?? 5;
    Validator.numberInRange('minSafeEntries', minSafeEntries, 0, maxEntries);

    const logger = options.logger ?? noopLogger;

    const useMemoryFallback = options.useMemoryFallback ?? true;

    return new StorageConfig(prefix, maxEntries, minSafeEntries, logger, useMemoryFallback);
  }

  /**
   * Create default configuration.
   */
  static defaults(): StorageConfig {
    return StorageConfig.create();
  }

  /**
   * Create configuration with debug logging using the browser console.
   */
  static withDebugLogging(prefix: string): StorageConfig {
    const tag = `[${prefix}]`;
    return StorageConfig.create({
      prefix,
      logger: {
        /* eslint-disable no-console -- Debug logging intentionally uses all console methods */
        debug: (...args: unknown[]) => console.debug(tag, ...args),
        info: (...args: unknown[]) => console.info(tag, ...args),
        warn: (...args: unknown[]) => console.warn(tag, ...args),
        error: (...args: unknown[]) => console.error(tag, ...args),
        /* eslint-enable no-console */
      },
    });
  }

  // =========================================================================
  // Fluent API
  // =========================================================================

  /**
   * Create new config with different prefix.
   */
  withPrefix(prefix: string): StorageConfig {
    Validator.storagePrefix(prefix);
    return new StorageConfig(
      prefix,
      this.maxEntries,
      this.minSafeEntries,
      this.logger,
      this.useMemoryFallback
    );
  }

  /**
   * Create new config with different max entries.
   */
  withMaxEntries(maxEntries: number): StorageConfig {
    Validator.numberInRange('maxEntries', maxEntries, 1, 10000);
    return new StorageConfig(
      this.prefix,
      maxEntries,
      Math.min(this.minSafeEntries, maxEntries),
      this.logger,
      this.useMemoryFallback
    );
  }

  /**
   * Create new config with different min safe entries.
   */
  withMinSafeEntries(minSafeEntries: number): StorageConfig {
    Validator.numberInRange('minSafeEntries', minSafeEntries, 0, this.maxEntries);
    return new StorageConfig(
      this.prefix,
      this.maxEntries,
      minSafeEntries,
      this.logger,
      this.useMemoryFallback
    );
  }

  /**
   * Create new config with different logger.
   */
  withLogger(logger: LoggerLike): StorageConfig {
    return new StorageConfig(
      this.prefix,
      this.maxEntries,
      this.minSafeEntries,
      logger,
      this.useMemoryFallback
    );
  }

  /**
   * Create new config with memory fallback enabled/disabled.
   */
  withMemoryFallback(enabled: boolean): StorageConfig {
    return new StorageConfig(
      this.prefix,
      this.maxEntries,
      this.minSafeEntries,
      this.logger,
      enabled
    );
  }
}
