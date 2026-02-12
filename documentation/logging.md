# Logger

Immutable, environment-aware logging with configurable log levels.

## Quick Start

```typescript
import { Logger, LogLevel } from '@zappzarapp/browser-utils/logging';

// Development logger (all levels)
const log = Logger.development('[MyApp]');
log.debug('Debug info');
log.info('Information');
log.warn('Warning');
log.error('Error!');

// Production logger (only warn and error)
const prodLog = Logger.production('[MyApp]');
```

## Classes and Types

| Export                | Description                                       |
| --------------------- | ------------------------------------------------- |
| `Logger`              | Immutable logger with configurable levels         |
| `LoggerConfig`        | Immutable configuration for Logger instances      |
| `LogLevel`            | Log level enum (Debug, Info, Warn, Error, Silent) |
| `logLevelName`        | Function to get level name string                 |
| `createLogger`        | Factory function for standalone log functions     |
| `ConsoleAdapter`      | Interface for custom console implementations      |
| `LoggerConfigOptions` | Options for creating LoggerConfig                 |

## Log Levels

| Level    | Value | Description                          |
| -------- | ----- | ------------------------------------ |
| `Debug`  | 0     | Detailed debugging information       |
| `Info`   | 1     | General application flow information |
| `Warn`   | 2     | Potentially harmful situations       |
| `Error`  | 3     | Error events                         |
| `Silent` | 4     | No logging at all                    |

## Configuration Options

| Option       | Type             | Default              | Description                   |
| ------------ | ---------------- | -------------------- | ----------------------------- |
| `level`      | `LogLevel`       | `LogLevel.Warn`      | Minimum log level to output   |
| `prefix`     | `string`         | `''`                 | Prefix for all log messages   |
| `timestamps` | `boolean`        | `false`              | Include timestamps in output  |
| `console`    | `ConsoleAdapter` | `globalThis.console` | Custom console implementation |

## Factory Methods

### Logger.development()

All log levels enabled, ideal for development:

```typescript
const log = Logger.development('[MyApp]');
log.debug('This will be shown');
```

### Logger.production()

Only warnings and errors, no debug noise:

```typescript
const log = Logger.production('[MyApp]');
log.debug('This will NOT be shown');
log.warn('This will be shown');
```

### Logger.silent()

No output at all, useful for testing:

```typescript
const log = Logger.silent();
log.error('Nothing will be shown');
```

### Logger.create()

Custom configuration:

```typescript
const log = Logger.create({
  level: LogLevel.Info,
  prefix: '[Custom]',
  timestamps: true,
});
```

## Usage Examples

### Basic Logging

```typescript
const log = Logger.development('[MyApp]');

log.debug('Variable value:', someVar);
log.info('Operation completed');
log.warn('Deprecated feature used');
log.error('Failed to connect', error);
```

### Standalone Functions

```typescript
import { createLogger } from '@zappzarapp/browser-utils/logging';

const { debug, info, warn, error } = createLogger({ prefix: '[MyApp]' });

debug('Debug message');
error('Error occurred!');
```

### Fluent API

Create new logger instances with modified settings:

```typescript
const baseLog = Logger.production('[App]');

// Create child logger with different prefix
const dbLog = baseLog.withPrefix('[Database]');

// Create logger with timestamps
const verboseLog = baseLog.withTimestamps(true);

// Create logger with different level
const debugLog = baseLog.withLevel(LogLevel.Debug);
```

### Check Log Level

```typescript
const log = Logger.production();

if (log.isEnabled(LogLevel.Debug)) {
  // Expensive debug operation
  log.debug('Detailed:', computeExpensiveDebugInfo());
}
```

### Custom Console Adapter

```typescript
const customConsole: ConsoleAdapter = {
  log: (...args) => sendToServer('log', args),
  warn: (...args) => sendToServer('warn', args),
  error: (...args) => sendToServer('error', args),
};

const log = Logger.create({
  level: LogLevel.Warn,
  console: customConsole,
});
```

### LoggerConfig

```typescript
import {
  LoggerConfig,
  Logger,
  LogLevel,
} from '@zappzarapp/browser-utils/logging';

// Create reusable config
const config = LoggerConfig.create({
  level: LogLevel.Info,
  prefix: '[SharedConfig]',
  timestamps: true,
});

// Use with logger
const log = Logger.fromConfig(config);

// Modify config immutably
const debugConfig = config.withLevel(LogLevel.Debug);
```

## Environment-Based Configuration

```typescript
const log =
  process.env.NODE_ENV === 'production'
    ? Logger.production('[MyApp]')
    : Logger.development('[MyApp]');
```

## Output Format

With timestamps and prefix enabled:

```text
[2024-01-15T10:30:45.123Z] [MyApp] [INFO] User logged in
[2024-01-15T10:30:46.456Z] [MyApp] [WARN] Session expiring soon
```
