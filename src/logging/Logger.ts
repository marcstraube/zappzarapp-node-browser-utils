/**
 * Immutable Logger with configurable log levels.
 *
 * Features:
 * - Immutable configuration (thread-safe)
 * - Log level filtering
 * - Optional prefix and timestamps
 * - Dependency injection for testing
 * - Factory methods for common configurations
 *
 * **API Pattern:** Factory methods (private constructor).
 *
 * **Recommended Usage:**
 * - Use `Logger.development()` or `Logger.production()` for quick setup
 * - Use `Logger.create()` for custom configurations
 * - Use `createLogger()` standalone function for destructured logging functions
 * - Use fluent `with*()` methods to derive new loggers with modified settings
 *
 * @example
 * ```TypeScript
 * // Quick start (recommended for most use cases)
 * const log = Logger.development('[MyApp]');
 * log.debug('Debug info');  // Shown in development
 * log.error('Critical!');   // Always shown
 *
 * // Production (recommended for production builds)
 * const prodLog = Logger.production('[MyApp]');
 * prodLog.debug('Debug');   // Filtered out
 * prodLog.warn('Warning');  // Shown
 *
 * // Custom configuration (for advanced use cases)
 * const custom = Logger.create({
 *   level: LogLevel.Info,
 *   prefix: '[Custom]',
 *   timestamps: true,
 * });
 *
 * // Standalone functions (alternative API)
 * const { debug, info, warn, error } = createLogger({ prefix: '[MyApp]' });
 * ```
 */
import type { LoggerLike } from '../core';
import { LogLevel, logLevelName } from './LogLevel.js';
import { LoggerConfig, type LoggerConfigOptions, type ConsoleAdapter } from './LoggerConfig.js';

export class Logger implements LoggerLike {
  private readonly config: LoggerConfig;

  private constructor(config: LoggerConfig) {
    this.config = config;
  }

  // =========================================================================
  // Factory Methods
  // =========================================================================

  /**
   * Create a logger with custom configuration.
   */
  static create(options: LoggerConfigOptions = {}): Logger {
    return new Logger(LoggerConfig.create(options));
  }

  /**
   * Create a logger from an existing config.
   */
  static fromConfig(config: LoggerConfig): Logger {
    return new Logger(config);
  }

  /**
   * Create a development logger (all levels enabled).
   */
  static development(prefix?: string): Logger {
    return new Logger(LoggerConfig.development(prefix));
  }

  /**
   * Create a production logger (only warn and error).
   */
  static production(prefix?: string): Logger {
    return new Logger(LoggerConfig.production(prefix));
  }

  /**
   * Create a silent logger (no output).
   */
  static silent(): Logger {
    return new Logger(LoggerConfig.silent());
  }

  // =========================================================================
  // Configuration Access
  // =========================================================================

  /**
   * Get current log level.
   */
  get level(): LogLevel {
    return this.config.level;
  }

  /**
   * Get current prefix.
   */
  get prefix(): string {
    return this.config.prefix;
  }

  /**
   * Check if a log level would be output.
   */
  isEnabled(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  // =========================================================================
  // Fluent API (returns new Logger instance)
  // =========================================================================

  /**
   * Create new logger with different level.
   */
  withLevel(level: LogLevel): Logger {
    return new Logger(this.config.withLevel(level));
  }

  /**
   * Create new logger with different prefix.
   */
  withPrefix(prefix: string): Logger {
    return new Logger(this.config.withPrefix(prefix));
  }

  /**
   * Create new logger with timestamps enabled/disabled.
   */
  withTimestamps(enabled: boolean): Logger {
    return new Logger(this.config.withTimestamps(enabled));
  }

  /**
   * Create new logger with custom console.
   */
  withConsole(console: ConsoleAdapter): Logger {
    return new Logger(this.config.withConsole(console));
  }

  // =========================================================================
  // Logging Methods
  // =========================================================================

  /**
   * Log debug message (development only).
   */
  debug(...args: unknown[]): void {
    this.log(LogLevel.Debug, args);
  }

  /**
   * Log info message.
   */
  info(...args: unknown[]): void {
    this.log(LogLevel.Info, args);
  }

  /**
   * Log warning message.
   */
  warn(...args: unknown[]): void {
    this.log(LogLevel.Warn, args);
  }

  /**
   * Log error message.
   */
  error(...args: unknown[]): void {
    this.log(LogLevel.Error, args);
  }

  // =========================================================================
  // Internal
  // =========================================================================

  /**
   * Core logging implementation.
   */
  private log(level: LogLevel, args: unknown[]): void {
    if (level < this.config.level) {
      return;
    }

    const formattedArgs = this.formatArgs(level, args);

    switch (level) {
      case LogLevel.Debug:
      case LogLevel.Info:
        this.config.console.log(...formattedArgs);
        break;
      case LogLevel.Warn:
        this.config.console.warn(...formattedArgs);
        break;
      case LogLevel.Error:
        this.config.console.error(...formattedArgs);
        break;
    }
  }

  /**
   * Format arguments with prefix and optional timestamp.
   */
  private formatArgs(level: LogLevel, args: unknown[]): unknown[] {
    const parts: unknown[] = [];

    if (this.config.timestamps) {
      parts.push(`[${new Date().toISOString()}]`);
    }

    if (this.config.prefix) {
      parts.push(this.config.prefix);
    }

    // Add level indicator for non-console-native levels
    if (this.config.timestamps || level === LogLevel.Debug || level === LogLevel.Info) {
      parts.push(`[${logLevelName(level)}]`);
    }

    return [...parts, ...args];
  }
}

// =========================================================================
// Convenience Function
// =========================================================================

/**
 * Create standalone logging functions.
 *
 * @example
 * ```TypeScript
 * const { debug, info, warn, error } = createLogger({ prefix: '[MyApp]' });
 * debug('Debug message');
 * error('Error!');
 * ```
 */
export function createLogger(options: LoggerConfigOptions = {}): {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
} {
  const logger = Logger.create(options);
  return {
    debug: (...args) => logger.debug(...args),
    info: (...args) => logger.info(...args),
    warn: (...args) => logger.warn(...args),
    error: (...args) => logger.error(...args),
  };
}
