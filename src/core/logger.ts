/**
 * Minimal logger interface for cross-module use.
 *
 * Defines the logging methods required by modules that accept a logger
 * (e.g., StorageConfig). This interface decouples consumer modules from
 * the full Logger implementation in the logging module.
 *
 * The logging module's `Logger` class implements this interface.
 * Any object with matching methods can be used as a logger.
 *
 * @example
 * ```TypeScript
 * // Any object satisfying LoggerLike works:
 * const logger: LoggerLike = {
 *   debug: (...args) => console.debug(...args),
 *   info: (...args) => console.info(...args),
 *   warn: (...args) => console.warn(...args),
 *   error: (...args) => console.error(...args),
 * };
 * ```
 */
export interface LoggerLike {
  /** Log debug message. */
  debug(...args: unknown[]): void;
  /** Log info message. */
  info(...args: unknown[]): void;
  /** Log warning message. */
  warn(...args: unknown[]): void;
  /** Log error message. */
  error(...args: unknown[]): void;
}

/**
 * No-op logger that silently discards all messages.
 * Used as the default when no logger is provided.
 */
export const noopLogger: Readonly<LoggerLike> = Object.freeze({
  debug() {},
  info() {},
  warn() {},
  error() {},
});
