import { describe, it, expect } from 'vitest';
import { StorageConfig } from '../../src/storage/index.js';
import { Logger } from '../../src/logging/index.js';
import { ValidationError, noopLogger, type LoggerLike } from '../../src/core/index.js';

describe('StorageConfig', () => {
  describe('create', () => {
    it('should create with default options', () => {
      const config = StorageConfig.create();

      expect(config.prefix).toBe('storage');
      expect(config.maxEntries).toBe(50);
      expect(config.minSafeEntries).toBe(5);
      expect(config.useMemoryFallback).toBe(true);
    });

    it('should create with custom prefix', () => {
      const config = StorageConfig.create({ prefix: 'myApp' });

      expect(config.prefix).toBe('myApp');
    });

    it('should create with custom maxEntries', () => {
      const config = StorageConfig.create({ maxEntries: 100 });

      expect(config.maxEntries).toBe(100);
    });

    it('should create with custom minSafeEntries', () => {
      const config = StorageConfig.create({ minSafeEntries: 10 });

      expect(config.minSafeEntries).toBe(10);
    });

    it('should create with custom useMemoryFallback', () => {
      const config = StorageConfig.create({ useMemoryFallback: false });

      expect(config.useMemoryFallback).toBe(false);
    });

    it('should accept Logger instance', () => {
      const logger = Logger.development('test');
      const config = StorageConfig.create({ logger });

      expect(config.logger).toBe(logger);
    });

    it('should accept LoggerLike object', () => {
      const customLogger: LoggerLike = {
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
      };
      const config = StorageConfig.create({ logger: customLogger });

      expect(config.logger).toBe(customLogger);
    });

    it('should use noopLogger when no logger provided', () => {
      const config = StorageConfig.create();

      expect(config.logger).toBe(noopLogger);
    });

    it('should throw for invalid prefix', () => {
      expect(() => StorageConfig.create({ prefix: '' })).toThrow(ValidationError);
    });

    it('should throw for prefix starting with number', () => {
      expect(() => StorageConfig.create({ prefix: '123' })).toThrow(ValidationError);
    });

    it('should throw for maxEntries below minimum', () => {
      expect(() => StorageConfig.create({ maxEntries: 0 })).toThrow(ValidationError);
    });

    it('should throw for maxEntries above maximum', () => {
      expect(() => StorageConfig.create({ maxEntries: 10001 })).toThrow(ValidationError);
    });

    it('should throw for minSafeEntries above maxEntries', () => {
      expect(() =>
        StorageConfig.create({
          maxEntries: 10,
          minSafeEntries: 20,
        })
      ).toThrow(ValidationError);
    });
  });

  describe('defaults', () => {
    it('should create default configuration', () => {
      const config = StorageConfig.defaults();

      expect(config.prefix).toBe('storage');
      expect(config.maxEntries).toBe(50);
    });
  });

  describe('withDebugLogging', () => {
    it('should create config with debug logging', () => {
      const config = StorageConfig.withDebugLogging('myApp');

      expect(config.prefix).toBe('myApp');
      expect(config.logger).toBeDefined();
      expect(typeof config.logger.debug).toBe('function');
      expect(typeof config.logger.info).toBe('function');
      expect(typeof config.logger.warn).toBe('function');
      expect(typeof config.logger.error).toBe('function');
    });
  });

  describe('withPrefix', () => {
    it('should create new config with different prefix', () => {
      const original = StorageConfig.create({ prefix: 'oldApp' });
      const modified = original.withPrefix('newApp');

      expect(modified.prefix).toBe('newApp');
      expect(original.prefix).toBe('oldApp');
    });

    it('should preserve other settings', () => {
      const original = StorageConfig.create({
        prefix: 'oldApp',
        maxEntries: 100,
        useMemoryFallback: false,
      });
      const modified = original.withPrefix('newApp');

      expect(modified.maxEntries).toBe(100);
      expect(modified.useMemoryFallback).toBe(false);
    });

    it('should validate new prefix', () => {
      const config = StorageConfig.create();

      expect(() => config.withPrefix('')).toThrow(ValidationError);
    });
  });

  describe('withMaxEntries', () => {
    it('should create new config with different maxEntries', () => {
      const original = StorageConfig.create({ maxEntries: 50 });
      const modified = original.withMaxEntries(200);

      expect(modified.maxEntries).toBe(200);
      expect(original.maxEntries).toBe(50);
    });

    it('should adjust minSafeEntries if necessary', () => {
      const original = StorageConfig.create({
        maxEntries: 100,
        minSafeEntries: 20,
      });
      const modified = original.withMaxEntries(10);

      expect(modified.maxEntries).toBe(10);
      expect(modified.minSafeEntries).toBe(10);
    });

    it('should validate new maxEntries', () => {
      const config = StorageConfig.create();

      expect(() => config.withMaxEntries(0)).toThrow(ValidationError);
    });
  });

  describe('withMinSafeEntries', () => {
    it('should create new config with different minSafeEntries', () => {
      const original = StorageConfig.create({ minSafeEntries: 5 });
      const modified = original.withMinSafeEntries(10);

      expect(modified.minSafeEntries).toBe(10);
      expect(original.minSafeEntries).toBe(5);
    });

    it('should preserve other settings', () => {
      const original = StorageConfig.create({
        prefix: 'myApp',
        maxEntries: 100,
      });
      const modified = original.withMinSafeEntries(15);

      expect(modified.prefix).toBe('myApp');
      expect(modified.maxEntries).toBe(100);
    });

    it('should validate new minSafeEntries', () => {
      const config = StorageConfig.create({ maxEntries: 10 });

      expect(() => config.withMinSafeEntries(20)).toThrow(ValidationError);
    });
  });

  describe('withLogger', () => {
    it('should create new config with different logger', () => {
      const original = StorageConfig.create();
      const newLogger = Logger.development('test');
      const modified = original.withLogger(newLogger);

      expect(modified.logger).toBe(newLogger);
      expect(original.logger).not.toBe(newLogger);
    });

    it('should preserve other settings', () => {
      const original = StorageConfig.create({
        prefix: 'myApp',
        maxEntries: 100,
      });
      const modified = original.withLogger(Logger.silent());

      expect(modified.prefix).toBe('myApp');
      expect(modified.maxEntries).toBe(100);
    });
  });

  describe('withMemoryFallback', () => {
    it('should create new config with memory fallback enabled', () => {
      const original = StorageConfig.create({ useMemoryFallback: false });
      const modified = original.withMemoryFallback(true);

      expect(modified.useMemoryFallback).toBe(true);
      expect(original.useMemoryFallback).toBe(false);
    });

    it('should create new config with memory fallback disabled', () => {
      const original = StorageConfig.create({ useMemoryFallback: true });
      const modified = original.withMemoryFallback(false);

      expect(modified.useMemoryFallback).toBe(false);
      expect(original.useMemoryFallback).toBe(true);
    });

    it('should preserve other settings', () => {
      const original = StorageConfig.create({
        prefix: 'myApp',
        maxEntries: 100,
      });
      const modified = original.withMemoryFallback(false);

      expect(modified.prefix).toBe('myApp');
      expect(modified.maxEntries).toBe(100);
    });
  });

  describe('immutability', () => {
    it('should not modify original config', () => {
      const original = StorageConfig.create({
        prefix: 'app',
        maxEntries: 50,
        minSafeEntries: 5,
        useMemoryFallback: true,
      });

      original.withPrefix('newApp');
      original.withMaxEntries(100);
      original.withMinSafeEntries(10);
      original.withMemoryFallback(false);
      original.withLogger(Logger.silent());

      expect(original.prefix).toBe('app');
      expect(original.maxEntries).toBe(50);
      expect(original.minSafeEntries).toBe(5);
      expect(original.useMemoryFallback).toBe(true);
    });
  });
});
