import { describe, it, expect } from 'vitest';
import { LogLevel, logLevelName } from '../../src/logging/index.js';

describe('LogLevel', () => {
  describe('values', () => {
    it('should have Debug as lowest level', () => {
      expect(LogLevel.Debug).toBe(0);
    });

    it('should have Info as second level', () => {
      expect(LogLevel.Info).toBe(1);
    });

    it('should have Warn as third level', () => {
      expect(LogLevel.Warn).toBe(2);
    });

    it('should have Error as fourth level', () => {
      expect(LogLevel.Error).toBe(3);
    });

    it('should have Silent as highest level', () => {
      expect(LogLevel.Silent).toBe(4);
    });

    it('should be in ascending order of severity', () => {
      expect(LogLevel.Debug).toBeLessThan(LogLevel.Info);
      expect(LogLevel.Info).toBeLessThan(LogLevel.Warn);
      expect(LogLevel.Warn).toBeLessThan(LogLevel.Error);
      expect(LogLevel.Error).toBeLessThan(LogLevel.Silent);
    });
  });
});

describe('logLevelName', () => {
  it('should return DEBUG for Debug level', () => {
    expect(logLevelName(LogLevel.Debug)).toBe('DEBUG');
  });

  it('should return INFO for Info level', () => {
    expect(logLevelName(LogLevel.Info)).toBe('INFO');
  });

  it('should return WARN for Warn level', () => {
    expect(logLevelName(LogLevel.Warn)).toBe('WARN');
  });

  it('should return ERROR for Error level', () => {
    expect(logLevelName(LogLevel.Error)).toBe('ERROR');
  });

  it('should return SILENT for Silent level', () => {
    expect(logLevelName(LogLevel.Silent)).toBe('SILENT');
  });
});
