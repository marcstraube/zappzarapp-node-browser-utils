// noinspection JSUnusedGlobalSymbols,JSUnusedLocalSymbols - Example file

/**
 * Logging Setup Example - Configurable Application Logging
 *
 * This example demonstrates:
 * - Factory methods for quick logger setup (development, production, silent)
 * - Custom logger configuration with `Logger.create()`
 * - Log levels and filtering (debug, info, warn, error)
 * - Prefixed and timestamped log output
 * - Fluent `with*()` methods for deriving child loggers
 * - Standalone `createLogger()` function for destructured usage
 * - Custom console adapters for testing and remote reporting
 * - Multi-module application logging architecture
 *
 * @packageDocumentation
 */

import {
  Logger,
  createLogger,
  LogLevel,
  logLevelName,
  type LoggerConfigOptions,
  type ConsoleAdapter,
} from '@zappzarapp/browser-utils/logging';

// =============================================================================
// Types
// =============================================================================

/**
 * Application environment configuration.
 */
interface AppEnvironment {
  readonly mode: 'development' | 'staging' | 'production';
  readonly verbose: boolean;
  readonly logTimestamps: boolean;
}

/**
 * Module-specific logger registry entry.
 */
interface LoggerEntry {
  readonly name: string;
  readonly logger: Logger;
}

/**
 * Structured log record for remote reporting.
 */
interface LogRecord {
  readonly timestamp: string;
  readonly level: string;
  readonly module: string;
  readonly message: string;
}

// =============================================================================
// Factory Methods - Quick Logger Setup
// =============================================================================

/**
 * Demonstrate the built-in factory methods for creating loggers.
 */
function factoryMethodsExample(): void {
  console.log('=== Factory Methods ===\n');

  // Development logger: all log levels enabled (Debug and above)
  const devLog = Logger.development('[App]');
  devLog.debug('Detailed debugging information');
  devLog.info('Application started on port 3000');
  devLog.warn('Deprecated API detected');
  devLog.error('Failed to connect to database');

  console.log('');

  // Production logger: only warnings and errors
  const prodLog = Logger.production('[App]');
  prodLog.debug('This will NOT appear'); // Filtered out
  prodLog.info('This will NOT appear'); // Filtered out
  prodLog.warn('High memory usage detected');
  prodLog.error('Payment processing failed');

  console.log('');

  // Silent logger: no output at all (useful for tests)
  const silentLog = Logger.silent();
  silentLog.debug('Nothing will print');
  silentLog.error('Not even errors');

  console.log('Factory methods demo complete\n');
}

// =============================================================================
// Custom Configuration
// =============================================================================

/**
 * Demonstrate `Logger.create()` for fine-grained configuration.
 */
function customConfigurationExample(): void {
  console.log('=== Custom Configuration ===\n');

  // Info level with prefix and timestamps
  const apiLogger = Logger.create({
    level: LogLevel.Info,
    prefix: '[API]',
    timestamps: true,
  });

  apiLogger.debug('Request headers:', { auth: 'Bearer ***' }); // Filtered
  apiLogger.info('GET /api/users - 200 OK');
  apiLogger.warn('Rate limit approaching: 95/100');
  apiLogger.error('POST /api/orders - 500 Internal Server Error');

  console.log('');

  // Error-only logger for a noisy subsystem
  const parserLogger = Logger.create({
    level: LogLevel.Error,
    prefix: '[Parser]',
  });

  parserLogger.warn('Unexpected token'); // Filtered
  parserLogger.error('Syntax error at line 42, column 7');

  console.log('Custom configuration demo complete\n');
}

// =============================================================================
// Log Levels
// =============================================================================

/**
 * Demonstrate log level filtering.
 * Hierarchy: Debug (0) < Info (1) < Warn (2) < Error (3) < Silent (4).
 */
function logLevelsExample(): void {
  console.log('=== Log Levels ===\n');

  const levels = [LogLevel.Debug, LogLevel.Info, LogLevel.Warn, LogLevel.Error, LogLevel.Silent];

  console.log('Available log levels:');
  for (const level of levels) {
    console.log(`  ${logLevelName(level)} = ${level}`);
  }

  // Demonstrate filtering at each threshold
  const thresholds = [LogLevel.Debug, LogLevel.Info, LogLevel.Warn, LogLevel.Error];

  for (const threshold of thresholds) {
    const logger = Logger.create({ level: threshold });

    console.log(`\nLogger at ${logLevelName(threshold)} level:`);
    for (const msgLevel of [LogLevel.Debug, LogLevel.Info, LogLevel.Warn, LogLevel.Error]) {
      const passes = logger.isEnabled(msgLevel);
      console.log(`  ${logLevelName(msgLevel)}: ${passes ? 'SHOWN' : 'filtered'}`);
    }
  }

  console.log('\nLog levels demo complete\n');
}

// =============================================================================
// Prefix and Timestamps
// =============================================================================

/**
 * Demonstrate prefix and timestamp formatting in log output.
 */
function prefixAndTimestampsExample(): void {
  console.log('=== Prefix and Timestamps ===\n');

  // No prefix, no timestamps (minimal output)
  const minimal = Logger.create({ level: LogLevel.Debug });
  minimal.info('Plain message without prefix or timestamp');

  // Prefix only (common for browser apps)
  const prefixed = Logger.create({ level: LogLevel.Debug, prefix: '[Storage]' });
  prefixed.info('Item saved to localStorage');
  prefixed.warn('Storage quota at 80%');

  // Both prefix and timestamps (full context)
  const full = Logger.create({
    level: LogLevel.Debug,
    prefix: '[Auth]',
    timestamps: true,
  });
  full.debug('Validating JWT token');
  full.info('User authenticated:', { userId: 'usr_abc123' });
  full.warn('Token expires in 5 minutes');
  full.error('Authentication failed: invalid signature');

  console.log('\nPrefix and timestamps demo complete\n');
}

// =============================================================================
// Fluent API - Deriving Loggers
// =============================================================================

/**
 * Demonstrate fluent `with*()` methods for creating derived loggers.
 * Every call returns a new instance; the original is unchanged.
 */
function fluentApiExample(): void {
  console.log('=== Fluent API ===\n');

  const base = Logger.development('[App]');

  // Derive a logger with timestamps
  const withTimestamps = base.withTimestamps(true);
  withTimestamps.info('This message has timestamps');
  base.info('Original logger is unaffected');

  console.log('');

  // Derive loggers with different prefixes for sub-modules
  const dbLogger = base.withPrefix('[App:DB]');
  dbLogger.info('Connected to PostgreSQL');
  dbLogger.debug('Query executed in 12ms');

  const migrationLogger = base.withPrefix('[App:DB:Migration]');
  migrationLogger.info('Running migration 003_add_users_table');

  console.log('');

  // Change log level for a derived logger
  const quietLogger = base.withLevel(LogLevel.Error);
  quietLogger.warn('Filtered out');
  quietLogger.error('Only errors pass through');

  console.log('');

  // Chain multiple with*() calls
  const specialized = base
    .withPrefix('[App:WebSocket]')
    .withTimestamps(true)
    .withLevel(LogLevel.Info);

  specialized.debug('Frame received'); // Filtered (below Info)
  specialized.info('Connected to wss://api.example.com');
  specialized.warn('Reconnecting in 5s...');

  console.log('\nBase logger level:', logLevelName(base.level));
  console.log('Base logger prefix:', base.prefix || '(none)');
  console.log('Specialized logger level:', logLevelName(specialized.level));
  console.log('Specialized logger prefix:', specialized.prefix);

  console.log('\nFluent API demo complete\n');
}

// =============================================================================
// Standalone createLogger() Function
// =============================================================================

/**
 * Demonstrate `createLogger()` which returns destructurable log functions.
 */
function standaloneLoggerExample(): void {
  console.log('=== Standalone createLogger() ===\n');

  // Basic usage with destructuring
  const { debug, info, warn, error } = createLogger({
    level: LogLevel.Debug,
    prefix: '[Router]',
  });

  debug('Matching route:', '/users/:id');
  info('Route matched:', { path: '/users/42', handler: 'getUserById' });
  warn('Slow route handler detected:', '320ms');
  error('Route not found:', '/api/v2/unknown');

  console.log('');

  // With timestamps for server-style logging
  const serverLog = createLogger({
    level: LogLevel.Info,
    prefix: '[Server]',
    timestamps: true,
  });

  serverLog.info('Listening on :8080');
  serverLog.warn('TLS certificate expires in 7 days');

  console.log('\nStandalone createLogger() demo complete\n');
}

// =============================================================================
// Custom Console Adapter
// =============================================================================

/**
 * Demonstrate injecting a custom console adapter for testing or reporting.
 */
function customConsoleAdapterExample(): void {
  console.log('=== Custom Console Adapter ===\n');

  // Buffer adapter: collects log messages in memory (useful for testing)
  const buffer: string[] = [];
  const bufferConsole: ConsoleAdapter = {
    log: (...args: unknown[]) => buffer.push(`LOG: ${args.join(' ')}`),
    warn: (...args: unknown[]) => buffer.push(`WARN: ${args.join(' ')}`),
    error: (...args: unknown[]) => buffer.push(`ERROR: ${args.join(' ')}`),
  };

  const bufferedLogger = Logger.create({
    level: LogLevel.Debug,
    prefix: '[Buffered]',
    console: bufferConsole,
  });

  bufferedLogger.info('First message');
  bufferedLogger.warn('Second message');
  bufferedLogger.error('Third message');

  console.log('Captured messages:');
  for (const entry of buffer) {
    console.log(`  ${entry}`);
  }

  console.log('');

  // Reporting adapter: captures warnings/errors for monitoring
  const records: LogRecord[] = [];
  const reportingConsole: ConsoleAdapter = {
    log: (...args: unknown[]) => console.log(...args),
    warn: (...args: unknown[]) => {
      console.warn(...args);
      records.push({
        timestamp: new Date().toISOString(),
        level: 'WARN',
        module: 'app',
        message: args.map(String).join(' '),
      });
    },
    error: (...args: unknown[]) => {
      console.error(...args);
      records.push({
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        module: 'app',
        message: args.map(String).join(' '),
      });
    },
  };

  const reportingLogger = Logger.create({
    level: LogLevel.Debug,
    prefix: '[Reporting]',
    console: reportingConsole,
  });

  reportingLogger.info('Normal operation');
  reportingLogger.warn('Disk space low');
  reportingLogger.error('Service unavailable');

  console.log('\nCaptured records for remote reporting:', records.length);
  console.log('Custom console adapter demo complete\n');
}

// =============================================================================
// Practical Example: Multi-Module Application
// =============================================================================

/**
 * Create an application-wide logging setup with per-module loggers.
 * Each module gets its own prefix while sharing the same base config.
 */
function createAppLoggers(env: AppEnvironment): {
  readonly root: Logger;
  readonly auth: Logger;
  readonly api: Logger;
  readonly storage: Logger;
  readonly ui: Logger;
  readonly registry: readonly LoggerEntry[];
} {
  const baseLevel = (() => {
    switch (env.mode) {
      case 'development':
        return LogLevel.Debug;
      case 'staging':
        return env.verbose ? LogLevel.Debug : LogLevel.Info;
      case 'production':
        return LogLevel.Warn;
    }
  })();

  const root = Logger.create({
    level: baseLevel,
    prefix: '[App]',
    timestamps: env.logTimestamps,
  });

  // Derive module-specific loggers using the fluent API
  const auth = root.withPrefix('[Auth]');
  const api = root.withPrefix('[API]');
  const storage = root.withPrefix('[Storage]');
  const ui = root.withPrefix('[UI]');

  const registry: LoggerEntry[] = [
    { name: 'root', logger: root },
    { name: 'auth', logger: auth },
    { name: 'api', logger: api },
    { name: 'storage', logger: storage },
    { name: 'ui', logger: ui },
  ];

  return { root, auth, api, storage, ui, registry };
}

/**
 * Simulate a realistic application startup with multiple loggers.
 */
function applicationStartupExample(): void {
  console.log('=== Multi-Module Application ===\n');

  const loggers = createAppLoggers({
    mode: 'development',
    verbose: true,
    logTimestamps: true,
  });

  console.log('Registered loggers:');
  for (const entry of loggers.registry) {
    console.log(
      `  ${entry.name}: level=${logLevelName(entry.logger.level)}, prefix="${entry.logger.prefix}"`
    );
  }
  console.log('');

  // Simulate application startup
  loggers.root.info('Application starting...');
  loggers.auth.debug('Loading auth configuration');
  loggers.auth.info('OAuth2 provider configured:', 'Google');
  loggers.api.info('API client initialized');
  loggers.api.debug('Base URL: https://api.example.com/v1');
  loggers.storage.info('Storage adapter: IndexedDB');
  loggers.storage.warn('Migration pending: v4 -> v5');
  loggers.ui.info('UI framework initialized');
  loggers.root.info('Application ready');

  console.log('');

  // Simulate runtime activity and errors
  loggers.api.info('GET /api/users - 200 (45ms)');
  loggers.auth.warn('Token expires in 5 minutes, scheduling refresh');
  loggers.api.error('POST /api/orders - 503 Service Unavailable');
  loggers.root.error('Order creation failed, notifying user');

  console.log('\n--- Switching to Production Mode ---\n');

  // Same calls with production loggers (debug and info are filtered)
  const prodLoggers = createAppLoggers({
    mode: 'production',
    verbose: false,
    logTimestamps: false,
  });

  prodLoggers.root.info('Filtered in production');
  prodLoggers.api.debug('Filtered in production');
  prodLoggers.storage.warn('Storage quota at 85%');
  prodLoggers.auth.error('Session expired for user: usr_xyz789');

  console.log('\nMulti-module application demo complete\n');
}

// =============================================================================
// Practical Example: Environment-Aware Logger Factory
// =============================================================================

/**
 * Create an environment-aware logger for a given module.
 */
function createEnvironmentLogger(moduleName: string): Logger {
  const isDev = typeof location !== 'undefined' && location.hostname === 'localhost';

  const options: LoggerConfigOptions = isDev
    ? { level: LogLevel.Debug, prefix: `[${moduleName}]`, timestamps: false }
    : { level: LogLevel.Warn, prefix: `[${moduleName}]`, timestamps: true };

  return Logger.create(options);
}

/**
 * Demonstrate environment-aware logger creation.
 */
function environmentLoggerExample(): void {
  console.log('=== Environment-Aware Logger ===\n');

  const logger = createEnvironmentLogger('MyModule');
  logger.debug('Debug info (shown in dev, hidden in prod)');
  logger.info('Module initialized');
  logger.warn('This will always appear');
  logger.error('Critical failure');

  console.log('\nEnvironment-aware logger demo complete\n');
}

// =============================================================================
// Practical Example: isEnabled() Guards
// =============================================================================

/**
 * Use `isEnabled()` to skip expensive log message construction
 * when the message would be filtered out anyway.
 */
function logGuardExample(): void {
  console.log('=== Log Guards with isEnabled() ===\n');

  const logger = Logger.production('[Perf]');

  const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
    id: i,
    name: `Item ${i}`,
  }));

  // With guard: skip serialization entirely when debug is disabled
  if (logger.isEnabled(LogLevel.Debug)) {
    logger.debug('Dataset:', JSON.stringify(largeDataset));
  } else {
    console.log('  Debug is disabled, skipped serializing 1000 items');
  }

  // Warnings pass through in production mode
  if (logger.isEnabled(LogLevel.Warn)) {
    logger.warn('Processing took longer than expected');
  }

  console.log('\nLog guards demo complete\n');
}

// =============================================================================
// Example: Complete Application Setup
// =============================================================================

/**
 * Initialize a complete logging setup combining all patterns above.
 */
function initializeApp(): {
  readonly loggers: ReturnType<typeof createAppLoggers>;
  readonly getModuleLogger: (name: string) => Logger;
} {
  console.log('=== Complete Application Logging Setup ===\n');

  const isDev = typeof location !== 'undefined' && location.hostname === 'localhost';
  const env: AppEnvironment = {
    mode: isDev ? 'development' : 'production',
    verbose: isDev,
    logTimestamps: !isDev,
  };

  console.log(`Environment: ${env.mode}`);
  console.log(`Log level: ${env.mode === 'development' ? 'Debug' : 'Warn'}`);
  console.log(`Timestamps: ${env.logTimestamps}`);
  console.log('');

  const loggers = createAppLoggers(env);

  // Factory for on-demand module loggers using the fluent API
  const getModuleLogger = (name: string): Logger => {
    return loggers.root.withPrefix(`[${name}]`);
  };

  loggers.root.info('Logging system initialized');
  loggers.root.debug('Registered modules:', loggers.registry.map((e) => e.name).join(', '));

  return { loggers, getModuleLogger };
}

// =============================================================================
// Simple Usage Examples
// =============================================================================

/**
 * Example: Minimal logging setup in just two lines.
 */
function minimalExample(): void {
  console.log('\n--- Minimal Setup ---');

  Logger.development('[Quick]').info('Hello from a development logger');
  Logger.production('[Quick]').warn('Hello from a production logger');
}

/**
 * Example: Using createLogger() for the most concise API.
 */
function conciseExample(): void {
  console.log('\n--- Concise API ---');

  const { info, error } = createLogger({ prefix: '[Concise]', level: LogLevel.Info });
  info('Clean and simple');
  error('Errors work too');
}

// =============================================================================
// Exports
// =============================================================================

export {
  factoryMethodsExample,
  customConfigurationExample,
  logLevelsExample,
  prefixAndTimestampsExample,
  fluentApiExample,
  standaloneLoggerExample,
  customConsoleAdapterExample,
  applicationStartupExample,
  environmentLoggerExample,
  logGuardExample,
  createAppLoggers,
  createEnvironmentLogger,
  initializeApp,
  minimalExample,
  conciseExample,
  type AppEnvironment,
  type LoggerEntry,
  type LogRecord,
};

// Run examples if this is the entry point
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    factoryMethodsExample();
    customConfigurationExample();
    logLevelsExample();
    prefixAndTimestampsExample();
    fluentApiExample();
    standaloneLoggerExample();
    customConsoleAdapterExample();
    applicationStartupExample();
    environmentLoggerExample();
    logGuardExample();
    minimalExample();
    conciseExample();

    const app = initializeApp();
    app.getModuleLogger('Payment').info('Payment module loaded');
  });
}
