/**
 * Logger Configuration Value Object.
 *
 * Immutable configuration for Logger instances.
 * Use factory methods or fluent API to create configurations.
 *
 * @example
 * ```TypeScript
 * // Factory methods
 * const devConfig = LoggerConfig.development();
 * const prodConfig = LoggerConfig.production();
 *
 * // Custom config
 * const config = LoggerConfig.create({ prefix: '[MyApp]', level: LogLevel.Warn });
 *
 * // Fluent API
 * const modified = config.withPrefix('[NewPrefix]').withLevel(LogLevel.Debug);
 * ```
 */
import { LogLevel } from './LogLevel.js';

/**
 * Console interface for dependency injection.
 */
export interface ConsoleAdapter {
  log(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

/**
 * Options for creating LoggerConfig.
 */
export interface LoggerConfigOptions {
  /**
   * Minimum log level to output.
   * @default LogLevel.Warn (production) or LogLevel.Debug (development)
   */
  readonly level?: LogLevel;

  /**
   * Prefix for all log messages.
   * @example '[MyApp]', '[Storage]'
   */
  readonly prefix?: string;

  /**
   * Whether to include timestamps in log output.
   * @default false
   */
  readonly timestamps?: boolean;

  /**
   * Custom console implementation (for testing or custom output).
   * @default globalThis.console
   */
  readonly console?: ConsoleAdapter;
}

/**
 * Immutable logger configuration.
 */
export class LoggerConfig {
  readonly level: LogLevel;
  readonly prefix: string;
  readonly timestamps: boolean;
  readonly console: ConsoleAdapter;

  private constructor(options: Required<LoggerConfigOptions>) {
    this.level = options.level;
    this.prefix = options.prefix;
    this.timestamps = options.timestamps;
    this.console = options.console;
  }

  // =========================================================================
  // Factory Methods
  // =========================================================================

  /**
   * Create a custom logger configuration.
   */
  static create(options: LoggerConfigOptions = {}): LoggerConfig {
    return new LoggerConfig({
      level: options.level ?? LogLevel.Warn,
      prefix: options.prefix ?? '',
      timestamps: options.timestamps ?? false,
      console: options.console ?? globalThis.console,
    });
  }

  /**
   * Create configuration for development.
   * All log levels enabled, no timestamps (browser devtools add them).
   */
  static development(prefix?: string): LoggerConfig {
    return LoggerConfig.create({
      level: LogLevel.Debug,
      prefix,
      timestamps: false,
    });
  }

  /**
   * Create configuration for production.
   * Only warnings and errors, no debug noise.
   */
  static production(prefix?: string): LoggerConfig {
    return LoggerConfig.create({
      level: LogLevel.Warn,
      prefix,
      timestamps: false,
    });
  }

  /**
   * Create silent configuration (no output).
   * Useful for testing when you don't want console spam.
   */
  static silent(): LoggerConfig {
    return LoggerConfig.create({
      level: LogLevel.Silent,
    });
  }

  // =========================================================================
  // Fluent API (with* methods return new instance)
  // =========================================================================

  /**
   * Create new config with different log level.
   */
  withLevel(level: LogLevel): LoggerConfig {
    return new LoggerConfig({
      level,
      prefix: this.prefix,
      timestamps: this.timestamps,
      console: this.console,
    });
  }

  /**
   * Create new config with different prefix.
   */
  withPrefix(prefix: string): LoggerConfig {
    return new LoggerConfig({
      level: this.level,
      prefix,
      timestamps: this.timestamps,
      console: this.console,
    });
  }

  /**
   * Create new config with timestamps enabled/disabled.
   */
  withTimestamps(enabled: boolean): LoggerConfig {
    return new LoggerConfig({
      level: this.level,
      prefix: this.prefix,
      timestamps: enabled,
      console: this.console,
    });
  }

  /**
   * Create new config with custom console.
   */
  withConsole(console: ConsoleAdapter): LoggerConfig {
    return new LoggerConfig({
      level: this.level,
      prefix: this.prefix,
      timestamps: this.timestamps,
      console,
    });
  }
}
