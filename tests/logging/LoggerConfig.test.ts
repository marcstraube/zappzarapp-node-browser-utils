import { describe, it, expect } from 'vitest';
import { LoggerConfig, LogLevel } from '../../src/logging/index.js';

describe('LoggerConfig', () => {
  describe('create', () => {
    it('should use default values when no options provided', () => {
      const config = LoggerConfig.create();

      expect(config.level).toBe(LogLevel.Warn);
      expect(config.prefix).toBe('');
      expect(config.timestamps).toBe(false);
    });

    it('should accept custom options', () => {
      const config = LoggerConfig.create({
        level: LogLevel.Debug,
        prefix: '[Test]',
        timestamps: true,
      });

      expect(config.level).toBe(LogLevel.Debug);
      expect(config.prefix).toBe('[Test]');
      expect(config.timestamps).toBe(true);
    });
  });

  describe('development', () => {
    it('should set Debug level and no timestamps', () => {
      const config = LoggerConfig.development();

      expect(config.level).toBe(LogLevel.Debug);
      expect(config.timestamps).toBe(false);
    });
  });

  describe('production', () => {
    it('should set Warn level and no timestamps', () => {
      const config = LoggerConfig.production();

      expect(config.level).toBe(LogLevel.Warn);
      expect(config.timestamps).toBe(false);
    });
  });

  describe('silent', () => {
    it('should set Silent level', () => {
      const config = LoggerConfig.silent();

      expect(config.level).toBe(LogLevel.Silent);
    });
  });
});
