import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  Logger,
  createLogger,
  LogLevel,
  LoggerConfig,
  type ConsoleAdapter,
} from '../../src/logging/index.js';

/**
 * Creates a mock console adapter for testing.
 */
function createMockConsole(): ConsoleAdapter & {
  log: ReturnType<typeof vi.fn<(...args: unknown[]) => void>>;
  warn: ReturnType<typeof vi.fn<(...args: unknown[]) => void>>;
  error: ReturnType<typeof vi.fn<(...args: unknown[]) => void>>;
} {
  return {
    log: vi.fn<(...args: unknown[]) => void>(),
    warn: vi.fn<(...args: unknown[]) => void>(),
    error: vi.fn<(...args: unknown[]) => void>(),
  };
}

describe('Logger', () => {
  describe('factory methods', () => {
    describe('create', () => {
      it('should create a logger with default options', () => {
        const logger = Logger.create();

        expect(logger.level).toBe(LogLevel.Warn);
        expect(logger.prefix).toBe('');
      });

      it('should create a logger with custom level', () => {
        const logger = Logger.create({ level: LogLevel.Debug });

        expect(logger.level).toBe(LogLevel.Debug);
      });

      it('should create a logger with custom prefix', () => {
        const logger = Logger.create({ prefix: '[MyApp]' });

        expect(logger.prefix).toBe('[MyApp]');
      });

      it('should create a logger with all custom options', () => {
        const mockConsole = createMockConsole();
        const logger = Logger.create({
          level: LogLevel.Info,
          prefix: '[Test]',
          timestamps: true,
          console: mockConsole,
        });

        expect(logger.level).toBe(LogLevel.Info);
        expect(logger.prefix).toBe('[Test]');
      });
    });

    describe('development', () => {
      it('should create a logger with Debug level', () => {
        const logger = Logger.development();

        expect(logger.level).toBe(LogLevel.Debug);
      });

      it('should create a logger with optional prefix', () => {
        const logger = Logger.development('[Dev]');

        expect(logger.prefix).toBe('[Dev]');
      });

      it('should create a logger without prefix when not provided', () => {
        const logger = Logger.development();

        expect(logger.prefix).toBe('');
      });
    });

    describe('production', () => {
      it('should create a logger with Warn level', () => {
        const logger = Logger.production();

        expect(logger.level).toBe(LogLevel.Warn);
      });

      it('should create a logger with optional prefix', () => {
        const logger = Logger.production('[Prod]');

        expect(logger.prefix).toBe('[Prod]');
      });

      it('should filter debug and info messages', () => {
        const mockConsole = createMockConsole();
        const logger = Logger.production().withConsole(mockConsole);

        logger.debug('debug message');
        logger.info('info message');

        expect(mockConsole.log).not.toHaveBeenCalled();
      });
    });

    describe('silent', () => {
      it('should create a logger with Silent level', () => {
        const logger = Logger.silent();

        expect(logger.level).toBe(LogLevel.Silent);
      });

      it('should not output any messages', () => {
        const mockConsole = createMockConsole();
        const logger = Logger.silent().withConsole(mockConsole);

        logger.debug('debug');
        logger.info('info');
        logger.warn('warn');
        logger.error('error');

        expect(mockConsole.log).not.toHaveBeenCalled();
        expect(mockConsole.warn).not.toHaveBeenCalled();
        expect(mockConsole.error).not.toHaveBeenCalled();
      });
    });

    describe('fromConfig', () => {
      it('should create a logger from an existing config', () => {
        const config = LoggerConfig.create({ level: LogLevel.Debug, prefix: '[FromConfig]' });
        const logger = Logger.fromConfig(config);

        expect(logger.level).toBe(LogLevel.Debug);
        expect(logger.prefix).toBe('[FromConfig]');
      });
    });
  });

  describe('configuration access', () => {
    describe('level', () => {
      it('should return the current log level', () => {
        const logger = Logger.create({ level: LogLevel.Error });

        expect(logger.level).toBe(LogLevel.Error);
      });
    });

    describe('prefix', () => {
      it('should return the current prefix', () => {
        const logger = Logger.create({ prefix: '[Test]' });

        expect(logger.prefix).toBe('[Test]');
      });

      it('should return empty string when no prefix set', () => {
        const logger = Logger.create();

        expect(logger.prefix).toBe('');
      });
    });

    describe('isEnabled', () => {
      it('should return true when level is at or above threshold', () => {
        const logger = Logger.create({ level: LogLevel.Warn });

        expect(logger.isEnabled(LogLevel.Warn)).toBe(true);
        expect(logger.isEnabled(LogLevel.Error)).toBe(true);
      });

      it('should return false when level is below threshold', () => {
        const logger = Logger.create({ level: LogLevel.Warn });

        expect(logger.isEnabled(LogLevel.Debug)).toBe(false);
        expect(logger.isEnabled(LogLevel.Info)).toBe(false);
      });

      it('should return true for all levels when Debug', () => {
        const logger = Logger.create({ level: LogLevel.Debug });

        expect(logger.isEnabled(LogLevel.Debug)).toBe(true);
        expect(logger.isEnabled(LogLevel.Info)).toBe(true);
        expect(logger.isEnabled(LogLevel.Warn)).toBe(true);
        expect(logger.isEnabled(LogLevel.Error)).toBe(true);
      });

      it('should return false for all levels when Silent', () => {
        const logger = Logger.create({ level: LogLevel.Silent });

        expect(logger.isEnabled(LogLevel.Debug)).toBe(false);
        expect(logger.isEnabled(LogLevel.Info)).toBe(false);
        expect(logger.isEnabled(LogLevel.Warn)).toBe(false);
        expect(logger.isEnabled(LogLevel.Error)).toBe(false);
      });
    });
  });

  describe('fluent API (immutability)', () => {
    describe('withLevel', () => {
      it('should return a new logger instance', () => {
        const original = Logger.create({ level: LogLevel.Warn });
        const modified = original.withLevel(LogLevel.Debug);

        expect(modified).not.toBe(original);
      });

      it('should not modify the original logger', () => {
        const original = Logger.create({ level: LogLevel.Warn });
        original.withLevel(LogLevel.Debug);

        expect(original.level).toBe(LogLevel.Warn);
      });

      it('should apply the new level to the new logger', () => {
        const original = Logger.create({ level: LogLevel.Warn });
        const modified = original.withLevel(LogLevel.Debug);

        expect(modified.level).toBe(LogLevel.Debug);
      });

      it('should preserve other settings', () => {
        const original = Logger.create({ level: LogLevel.Warn, prefix: '[Test]' });
        const modified = original.withLevel(LogLevel.Debug);

        expect(modified.prefix).toBe('[Test]');
      });
    });

    describe('withPrefix', () => {
      it('should return a new logger instance', () => {
        const original = Logger.create({ prefix: '[Original]' });
        const modified = original.withPrefix('[Modified]');

        expect(modified).not.toBe(original);
      });

      it('should not modify the original logger', () => {
        const original = Logger.create({ prefix: '[Original]' });
        original.withPrefix('[Modified]');

        expect(original.prefix).toBe('[Original]');
      });

      it('should apply the new prefix to the new logger', () => {
        const original = Logger.create({ prefix: '[Original]' });
        const modified = original.withPrefix('[Modified]');

        expect(modified.prefix).toBe('[Modified]');
      });

      it('should preserve other settings', () => {
        const original = Logger.create({ level: LogLevel.Debug, prefix: '[Original]' });
        const modified = original.withPrefix('[Modified]');

        expect(modified.level).toBe(LogLevel.Debug);
      });
    });

    describe('withTimestamps', () => {
      it('should return a new logger instance', () => {
        const original = Logger.create();
        const modified = original.withTimestamps(true);

        expect(modified).not.toBe(original);
      });

      it('should preserve other settings', () => {
        const original = Logger.create({ level: LogLevel.Info, prefix: '[Test]' });
        const modified = original.withTimestamps(true);

        expect(modified.level).toBe(LogLevel.Info);
        expect(modified.prefix).toBe('[Test]');
      });
    });

    describe('withConsole', () => {
      it('should return a new logger instance', () => {
        const original = Logger.create();
        const mockConsole = createMockConsole();
        const modified = original.withConsole(mockConsole);

        expect(modified).not.toBe(original);
      });

      it('should use the new console for logging', () => {
        const mockConsole = createMockConsole();
        const logger = Logger.development().withConsole(mockConsole);

        logger.info('test message');

        expect(mockConsole.log).toHaveBeenCalled();
      });
    });

    describe('chaining', () => {
      it('should support chaining multiple fluent methods', () => {
        const mockConsole = createMockConsole();
        const logger = Logger.create()
          .withLevel(LogLevel.Debug)
          .withPrefix('[Chained]')
          .withTimestamps(true)
          .withConsole(mockConsole);

        expect(logger.level).toBe(LogLevel.Debug);
        expect(logger.prefix).toBe('[Chained]');
      });
    });
  });

  describe('logging methods', () => {
    let mockConsole: ReturnType<typeof createMockConsole>;
    let logger: Logger;

    beforeEach(() => {
      mockConsole = createMockConsole();
      logger = Logger.development().withConsole(mockConsole);
    });

    describe('debug', () => {
      it('should call console.log for debug messages', () => {
        logger.debug('debug message');

        expect(mockConsole.log).toHaveBeenCalled();
      });

      it('should include message in output', () => {
        logger.debug('debug message');

        const call = mockConsole.log.mock.calls[0];
        expect(call).toContain('debug message');
      });

      it('should support multiple arguments', () => {
        logger.debug('message', { data: 123 }, ['array']);

        const call = mockConsole.log.mock.calls[0];
        expect(call).toContain('message');
        expect(call).toContainEqual({ data: 123 });
        expect(call).toContainEqual(['array']);
      });

      it('should not output when level is higher than Debug', () => {
        const warnLogger = Logger.production().withConsole(mockConsole);

        warnLogger.debug('should not appear');

        expect(mockConsole.log).not.toHaveBeenCalled();
      });
    });

    describe('info', () => {
      it('should call console.log for info messages', () => {
        logger.info('info message');

        expect(mockConsole.log).toHaveBeenCalled();
      });

      it('should include message in output', () => {
        logger.info('info message');

        const call = mockConsole.log.mock.calls[0];
        expect(call).toContain('info message');
      });

      it('should support multiple arguments', () => {
        logger.info('message', 42, true);

        const call = mockConsole.log.mock.calls[0];
        expect(call).toContain('message');
        expect(call).toContain(42);
        expect(call).toContain(true);
      });

      it('should not output when level is higher than Info', () => {
        const warnLogger = Logger.production().withConsole(mockConsole);

        warnLogger.info('should not appear');

        expect(mockConsole.log).not.toHaveBeenCalled();
      });
    });

    describe('warn', () => {
      it('should call console.warn for warning messages', () => {
        logger.warn('warning message');

        expect(mockConsole.warn).toHaveBeenCalled();
      });

      it('should include message in output', () => {
        logger.warn('warning message');

        const call = mockConsole.warn.mock.calls[0];
        expect(call).toContain('warning message');
      });

      it('should support multiple arguments', () => {
        logger.warn('message', new Error('test'));

        const call = mockConsole.warn.mock.calls[0];
        expect(call).toContain('message');
      });

      it('should output even in production mode', () => {
        const prodLogger = Logger.production().withConsole(mockConsole);

        prodLogger.warn('production warning');

        expect(mockConsole.warn).toHaveBeenCalled();
      });

      it('should not output when level is Error', () => {
        const errorLogger = Logger.create({ level: LogLevel.Error }).withConsole(mockConsole);

        errorLogger.warn('should not appear');

        expect(mockConsole.warn).not.toHaveBeenCalled();
      });
    });

    describe('error', () => {
      it('should call console.error for error messages', () => {
        logger.error('error message');

        expect(mockConsole.error).toHaveBeenCalled();
      });

      it('should include message in output', () => {
        logger.error('error message');

        const call = mockConsole.error.mock.calls[0];
        expect(call).toContain('error message');
      });

      it('should support Error objects', () => {
        const error = new Error('test error');
        logger.error('An error occurred:', error);

        const call = mockConsole.error.mock.calls[0];
        expect(call).toContain('An error occurred:');
        expect(call).toContain(error);
      });

      it('should output even in production mode', () => {
        const prodLogger = Logger.production().withConsole(mockConsole);

        prodLogger.error('production error');

        expect(mockConsole.error).toHaveBeenCalled();
      });

      it('should not output when level is Silent', () => {
        const silentLogger = Logger.silent().withConsole(mockConsole);

        silentLogger.error('should not appear');

        expect(mockConsole.error).not.toHaveBeenCalled();
      });
    });
  });

  describe('log level filtering', () => {
    let mockConsole: ReturnType<typeof createMockConsole>;

    beforeEach(() => {
      mockConsole = createMockConsole();
    });

    it('should output all levels when set to Debug', () => {
      const logger = Logger.create({ level: LogLevel.Debug }).withConsole(mockConsole);

      logger.debug('debug');
      logger.info('info');
      logger.warn('warn');
      logger.error('error');

      expect(mockConsole.log).toHaveBeenCalledTimes(2); // debug and info
      expect(mockConsole.warn).toHaveBeenCalledTimes(1);
      expect(mockConsole.error).toHaveBeenCalledTimes(1);
    });

    it('should filter debug when set to Info', () => {
      const logger = Logger.create({ level: LogLevel.Info }).withConsole(mockConsole);

      logger.debug('debug');
      logger.info('info');
      logger.warn('warn');
      logger.error('error');

      expect(mockConsole.log).toHaveBeenCalledTimes(1); // only info
      expect(mockConsole.warn).toHaveBeenCalledTimes(1);
      expect(mockConsole.error).toHaveBeenCalledTimes(1);
    });

    it('should filter debug and info when set to Warn', () => {
      const logger = Logger.create({ level: LogLevel.Warn }).withConsole(mockConsole);

      logger.debug('debug');
      logger.info('info');
      logger.warn('warn');
      logger.error('error');

      expect(mockConsole.log).not.toHaveBeenCalled();
      expect(mockConsole.warn).toHaveBeenCalledTimes(1);
      expect(mockConsole.error).toHaveBeenCalledTimes(1);
    });

    it('should filter debug, info, and warn when set to Error', () => {
      const logger = Logger.create({ level: LogLevel.Error }).withConsole(mockConsole);

      logger.debug('debug');
      logger.info('info');
      logger.warn('warn');
      logger.error('error');

      expect(mockConsole.log).not.toHaveBeenCalled();
      expect(mockConsole.warn).not.toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalledTimes(1);
    });

    it('should filter all levels when set to Silent', () => {
      const logger = Logger.create({ level: LogLevel.Silent }).withConsole(mockConsole);

      logger.debug('debug');
      logger.info('info');
      logger.warn('warn');
      logger.error('error');

      expect(mockConsole.log).not.toHaveBeenCalled();
      expect(mockConsole.warn).not.toHaveBeenCalled();
      expect(mockConsole.error).not.toHaveBeenCalled();
    });
  });

  describe('prefix handling', () => {
    let mockConsole: ReturnType<typeof createMockConsole>;

    beforeEach(() => {
      mockConsole = createMockConsole();
    });

    it('should include prefix in log output', () => {
      const logger = Logger.development('[MyApp]').withConsole(mockConsole);

      logger.info('test message');

      const call = mockConsole.log.mock.calls[0];
      expect(call).toContain('[MyApp]');
    });

    it('should include prefix in warn output', () => {
      const logger = Logger.development('[MyApp]').withConsole(mockConsole);

      logger.warn('test warning');

      const call = mockConsole.warn.mock.calls[0];
      expect(call).toContain('[MyApp]');
    });

    it('should include prefix in error output', () => {
      const logger = Logger.development('[MyApp]').withConsole(mockConsole);

      logger.error('test error');

      const call = mockConsole.error.mock.calls[0];
      expect(call).toContain('[MyApp]');
    });

    it('should not include prefix when empty', () => {
      const logger = Logger.development().withConsole(mockConsole);

      logger.info('test message');

      const call = mockConsole.log.mock.calls[0] ?? [];
      // Should not have empty prefix, only level indicator and message
      expect(call.filter((arg: unknown) => arg === '')).toHaveLength(0);
    });
  });

  describe('timestamp handling', () => {
    let mockConsole: ReturnType<typeof createMockConsole>;

    beforeEach(() => {
      mockConsole = createMockConsole();
    });

    it('should include timestamp when enabled', () => {
      const logger = Logger.create({ level: LogLevel.Debug, timestamps: true }).withConsole(
        mockConsole
      );

      logger.info('test message');

      const call = mockConsole.log.mock.calls[0] ?? [];
      // Timestamp format: [YYYY-MM-DDTHH:MM:SS.sssZ]
      const hasTimestamp = call.some(
        (arg: unknown) => typeof arg === 'string' && /\[\d{4}-\d{2}-\d{2}T/.test(arg)
      );
      expect(hasTimestamp).toBe(true);
    });

    it('should not include timestamp when disabled', () => {
      const logger = Logger.create({ level: LogLevel.Debug, timestamps: false }).withConsole(
        mockConsole
      );

      logger.info('test message');

      const call = mockConsole.log.mock.calls[0] ?? [];
      const hasTimestamp = call.some(
        (arg: unknown) => typeof arg === 'string' && /\[\d{4}-\d{2}-\d{2}T/.test(arg)
      );
      expect(hasTimestamp).toBe(false);
    });
  });

  describe('level indicator in output', () => {
    let mockConsole: ReturnType<typeof createMockConsole>;

    beforeEach(() => {
      mockConsole = createMockConsole();
    });

    it('should include [DEBUG] indicator for debug messages', () => {
      const logger = Logger.development().withConsole(mockConsole);

      logger.debug('test');

      const call = mockConsole.log.mock.calls[0];
      expect(call).toContain('[DEBUG]');
    });

    it('should include [INFO] indicator for info messages', () => {
      const logger = Logger.development().withConsole(mockConsole);

      logger.info('test');

      const call = mockConsole.log.mock.calls[0];
      expect(call).toContain('[INFO]');
    });
  });
});

describe('createLogger', () => {
  let mockConsole: ReturnType<typeof createMockConsole>;

  beforeEach(() => {
    mockConsole = createMockConsole();
  });

  it('should return an object with debug, info, warn, error functions', () => {
    const logger = createLogger();

    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
  });

  it('should create a logger with the provided options', () => {
    const logger = createLogger({
      level: LogLevel.Debug,
      prefix: '[Test]',
      console: mockConsole,
    });

    logger.info('test message');

    expect(mockConsole.log).toHaveBeenCalled();
    const call = mockConsole.log.mock.calls[0];
    expect(call).toContain('[Test]');
  });

  it('should respect log level filtering', () => {
    const logger = createLogger({
      level: LogLevel.Warn,
      console: mockConsole,
    });

    logger.debug('debug');
    logger.info('info');
    logger.warn('warn');
    logger.error('error');

    expect(mockConsole.log).not.toHaveBeenCalled();
    expect(mockConsole.warn).toHaveBeenCalledTimes(1);
    expect(mockConsole.error).toHaveBeenCalledTimes(1);
  });

  it('should support standalone function usage', () => {
    const { debug, info, warn, error } = createLogger({
      level: LogLevel.Debug,
      console: mockConsole,
    });

    debug('debug message');
    info('info message');
    warn('warn message');
    error('error message');

    expect(mockConsole.log).toHaveBeenCalledTimes(2);
    expect(mockConsole.warn).toHaveBeenCalledTimes(1);
    expect(mockConsole.error).toHaveBeenCalledTimes(1);
  });
});
