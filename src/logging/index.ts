export { Logger, createLogger } from './Logger.js';
export { LoggerConfig } from './LoggerConfig.js';
export type { LoggerConfigOptions, ConsoleAdapter } from './LoggerConfig.js';
export { LogLevel, logLevelName } from './LogLevel.js';

// Re-export core logger interface (canonical location: core/)
export type { LoggerLike } from '../core/logger.js';
