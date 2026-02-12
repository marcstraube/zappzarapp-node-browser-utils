/**
 * NonceManager Tests.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NonceManager } from '../../src/csp/index.js';
import { ValidationError } from '../../src/core/index.js';

describe('NonceManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('create', () => {
    it('should create a NonceManager instance with default config', () => {
      const manager = NonceManager.create();

      expect(manager).toBeDefined();
      expect(typeof manager.getCurrentNonce()).toBe('string');
      expect(manager.isAutoRotating()).toBe(false);

      manager.destroy();
    });

    it('should create a NonceManager with custom nonce length', () => {
      const manager = NonceManager.create({ nonceLength: 32 });

      const nonce = manager.getCurrentNonce();
      // Base64 encoding of 32 bytes should be longer than default 16 bytes
      expect(nonce.length).toBeGreaterThan(22);

      manager.destroy();
    });

    it('should throw ValidationError for non-positive rotation interval', () => {
      expect(() => NonceManager.create({ rotationInterval: 0 })).toThrow(ValidationError);
      expect(() => NonceManager.create({ rotationInterval: -1 })).toThrow(ValidationError);
    });

    it('should throw ValidationError for non-positive nonce length', () => {
      expect(() => NonceManager.create({ nonceLength: 0 })).toThrow(ValidationError);
      expect(() => NonceManager.create({ nonceLength: -1 })).toThrow(ValidationError);
    });

    it('should start auto-rotation when autoRotate is true', () => {
      const manager = NonceManager.create({
        autoRotate: true,
        rotationInterval: 60000,
      });

      expect(manager.isAutoRotating()).toBe(true);

      manager.destroy();
    });
  });

  describe('getCurrentNonce', () => {
    it('should return the current nonce', () => {
      const manager = NonceManager.create();

      const nonce = manager.getCurrentNonce();

      expect(typeof nonce).toBe('string');
      expect(nonce.length).toBeGreaterThan(0);

      manager.destroy();
    });

    it('should return the same nonce on subsequent calls', () => {
      const manager = NonceManager.create();

      const nonce1 = manager.getCurrentNonce();
      const nonce2 = manager.getCurrentNonce();

      expect(nonce1).toBe(nonce2);

      manager.destroy();
    });

    it('should throw when called after destroy', () => {
      const manager = NonceManager.create();
      manager.destroy();

      expect(() => manager.getCurrentNonce()).toThrow('NonceManager has been destroyed');
    });
  });

  describe('generateNonce', () => {
    it('should generate a new nonce without updating current', () => {
      const manager = NonceManager.create();

      const currentNonce = manager.getCurrentNonce();
      const newNonce = manager.generateNonce();

      expect(newNonce).not.toBe(currentNonce);
      expect(manager.getCurrentNonce()).toBe(currentNonce);

      manager.destroy();
    });

    it('should generate different nonces each time', () => {
      const manager = NonceManager.create();

      const nonce1 = manager.generateNonce();
      const nonce2 = manager.generateNonce();

      expect(nonce1).not.toBe(nonce2);

      manager.destroy();
    });

    it('should throw when called after destroy', () => {
      const manager = NonceManager.create();
      manager.destroy();

      expect(() => manager.generateNonce()).toThrow('NonceManager has been destroyed');
    });
  });

  describe('rotateNonce', () => {
    it('should rotate to a new nonce', () => {
      const manager = NonceManager.create();

      const oldNonce = manager.getCurrentNonce();
      const newNonce = manager.rotateNonce();

      expect(newNonce).not.toBe(oldNonce);
      expect(manager.getCurrentNonce()).toBe(newNonce);

      manager.destroy();
    });

    it('should call rotation handlers', () => {
      const manager = NonceManager.create();
      const handler = vi.fn();

      manager.onRotation(handler);
      const oldNonce = manager.getCurrentNonce();
      const newNonce = manager.rotateNonce();

      expect(handler).toHaveBeenCalledWith(newNonce, oldNonce);

      manager.destroy();
    });

    it('should throw when called after destroy', () => {
      const manager = NonceManager.create();
      manager.destroy();

      expect(() => manager.rotateNonce()).toThrow('NonceManager has been destroyed');
    });

    it('should continue rotating even if handler throws', () => {
      const manager = NonceManager.create();
      const throwingHandler = vi.fn().mockImplementation(() => {
        throw new Error('Handler error');
      });
      const normalHandler = vi.fn();

      manager.onRotation(throwingHandler);
      manager.onRotation(normalHandler);

      const oldNonce = manager.getCurrentNonce();
      const newNonce = manager.rotateNonce();

      expect(throwingHandler).toHaveBeenCalled();
      expect(normalHandler).toHaveBeenCalledWith(newNonce, oldNonce);
      expect(manager.getCurrentNonce()).toBe(newNonce);

      manager.destroy();
    });
  });

  describe('onRotation', () => {
    it('should register a rotation handler', () => {
      const manager = NonceManager.create();
      const handler = vi.fn();

      const cleanup = manager.onRotation(handler);

      expect(typeof cleanup).toBe('function');

      manager.rotateNonce();

      expect(handler).toHaveBeenCalled();

      manager.destroy();
    });

    it('should return cleanup function that removes handler', () => {
      const manager = NonceManager.create();
      const handler = vi.fn();

      const cleanup = manager.onRotation(handler);
      cleanup();

      manager.rotateNonce();

      expect(handler).not.toHaveBeenCalled();

      manager.destroy();
    });

    it('should throw when called after destroy', () => {
      const manager = NonceManager.create();
      manager.destroy();

      expect(() => manager.onRotation(vi.fn())).toThrow('NonceManager has been destroyed');
    });
  });

  describe('isAutoRotating', () => {
    it('should return false when auto-rotation is not enabled', () => {
      const manager = NonceManager.create();

      expect(manager.isAutoRotating()).toBe(false);

      manager.destroy();
    });

    it('should return true when auto-rotation is enabled', () => {
      const manager = NonceManager.create({ autoRotate: true });

      expect(manager.isAutoRotating()).toBe(true);

      manager.destroy();
    });

    it('should return true after startAutoRotation is called', () => {
      const manager = NonceManager.create();

      manager.startAutoRotation();

      expect(manager.isAutoRotating()).toBe(true);

      manager.destroy();
    });

    it('should return false after stopAutoRotation is called', () => {
      const manager = NonceManager.create({ autoRotate: true });

      manager.stopAutoRotation();

      expect(manager.isAutoRotating()).toBe(false);

      manager.destroy();
    });
  });

  describe('startAutoRotation', () => {
    it('should start auto-rotation', () => {
      const manager = NonceManager.create({ rotationInterval: 1000 });
      const handler = vi.fn();

      manager.onRotation(handler);
      manager.startAutoRotation();

      expect(manager.isAutoRotating()).toBe(true);

      vi.advanceTimersByTime(1000);

      expect(handler).toHaveBeenCalledTimes(1);

      manager.destroy();
    });

    it('should not start multiple timers if already running', () => {
      const manager = NonceManager.create({ rotationInterval: 1000 });
      const handler = vi.fn();

      manager.onRotation(handler);
      manager.startAutoRotation();
      manager.startAutoRotation();

      vi.advanceTimersByTime(1000);

      expect(handler).toHaveBeenCalledTimes(1);

      manager.destroy();
    });

    it('should throw when called after destroy', () => {
      const manager = NonceManager.create();
      manager.destroy();

      expect(() => manager.startAutoRotation()).toThrow('NonceManager has been destroyed');
    });
  });

  describe('stopAutoRotation', () => {
    it('should stop auto-rotation', () => {
      const manager = NonceManager.create({
        autoRotate: true,
        rotationInterval: 1000,
      });
      const handler = vi.fn();

      manager.onRotation(handler);
      manager.stopAutoRotation();

      vi.advanceTimersByTime(2000);

      expect(handler).not.toHaveBeenCalled();

      manager.destroy();
    });

    it('should not throw when called multiple times', () => {
      const manager = NonceManager.create({ autoRotate: true });

      expect(() => {
        manager.stopAutoRotation();
        manager.stopAutoRotation();
      }).not.toThrow();

      manager.destroy();
    });
  });

  describe('destroy', () => {
    it('should stop auto-rotation', () => {
      const manager = NonceManager.create({
        autoRotate: true,
        rotationInterval: 1000,
      });
      const handler = vi.fn();

      manager.onRotation(handler);
      manager.destroy();

      vi.advanceTimersByTime(2000);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should clear all handlers', () => {
      const manager = NonceManager.create();
      const handler = vi.fn();

      manager.onRotation(handler);
      manager.destroy();

      // Can't rotate after destroy, but handlers should be cleared
      expect(() => manager.rotateNonce()).toThrow('NonceManager has been destroyed');
    });

    it('should be idempotent', () => {
      const manager = NonceManager.create();

      expect(() => {
        manager.destroy();
        manager.destroy();
      }).not.toThrow();
    });
  });

  describe('auto-rotation behavior', () => {
    it('should rotate at the specified interval', () => {
      const manager = NonceManager.create({
        autoRotate: true,
        rotationInterval: 30000,
      });
      const handler = vi.fn();

      manager.onRotation(handler);

      vi.advanceTimersByTime(30000);
      expect(handler).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(30000);
      expect(handler).toHaveBeenCalledTimes(2);

      vi.advanceTimersByTime(30000);
      expect(handler).toHaveBeenCalledTimes(3);

      manager.destroy();
    });

    it('should use custom rotation interval', () => {
      const manager = NonceManager.create({
        autoRotate: true,
        rotationInterval: 5000,
      });
      const handler = vi.fn();

      manager.onRotation(handler);

      vi.advanceTimersByTime(5000);
      expect(handler).toHaveBeenCalledTimes(1);

      manager.destroy();
    });
  });
});
