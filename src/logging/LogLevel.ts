/**
 * Log Level Enum.
 *
 * Defines the severity levels for logging.
 * Higher numeric values = more severe.
 *
 * @example
 * ```TypeScript
 * const logger = Logger.create({ level: LogLevel.Warn });
 * // Only warn and error will be logged
 * ```
 */
export const LogLevel = {
  /** Detailed debugging information. */
  Debug: 0,
  /** General information about application flow. */
  Info: 1,
  /** Potentially harmful situations. */
  Warn: 2,
  /** Error events that might still allow the application to continue. */
  Error: 3,
  /** No logging at all. */
  Silent: 4,
} as const;

export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

/**
 * Get log level name for display.
 */
export function logLevelName(level: LogLevel): string {
  switch (level) {
    case LogLevel.Debug:
      return 'DEBUG';
    case LogLevel.Info:
      return 'INFO';
    case LogLevel.Warn:
      return 'WARN';
    case LogLevel.Error:
      return 'ERROR';
    case LogLevel.Silent:
      return 'SILENT';
  }
}
