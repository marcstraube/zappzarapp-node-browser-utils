import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NetworkStatus, type NetworkInfo } from '../../src/network/index.js';

/**
 * Create a mock NetworkInformation object for testing.
 */
function createMockConnection(
  options: {
    type?: string;
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
  } = {}
): EventTarget & {
  type?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
} {
  const eventTarget = new EventTarget();

  return Object.assign(eventTarget, {
    type: options.type,
    effectiveType: options.effectiveType,
    downlink: options.downlink,
    rtt: options.rtt,
    saveData: options.saveData,
  });
}

describe('NetworkStatus', () => {
  let originalNavigator: PropertyDescriptor | undefined;
  let originalWindow: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  });

  afterEach(() => {
    vi.restoreAllMocks();

    if (originalNavigator) {
      Object.defineProperty(globalThis, 'navigator', originalNavigator);
    }

    if (originalWindow) {
      Object.defineProperty(globalThis, 'window', originalWindow);
    }
  });

  // ===========================================================================
  // Status Checks
  // ===========================================================================

  describe('isOnline', () => {
    it('should return true when navigator.onLine is true', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: true },
        writable: true,
        configurable: true,
      });

      expect(NetworkStatus.isOnline()).toBe(true);
    });

    it('should return false when navigator.onLine is false', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: false },
        writable: true,
        configurable: true,
      });

      expect(NetworkStatus.isOnline()).toBe(false);
    });

    it('should return true when navigator is undefined (non-browser environment)', () => {
      delete (globalThis as Record<string, unknown>).navigator;

      expect(NetworkStatus.isOnline()).toBe(true);
    });
  });

  describe('isOffline', () => {
    it('should return false when online', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: true },
        writable: true,
        configurable: true,
      });

      expect(NetworkStatus.isOffline()).toBe(false);
    });

    it('should return true when offline', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: false },
        writable: true,
        configurable: true,
      });

      expect(NetworkStatus.isOffline()).toBe(true);
    });

    it('should be the inverse of isOnline', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: true },
        writable: true,
        configurable: true,
      });

      expect(NetworkStatus.isOffline()).toBe(!NetworkStatus.isOnline());
    });
  });

  // ===========================================================================
  // Connection Type Detection
  // ===========================================================================

  describe('connectionType', () => {
    it('should return wifi when type is wifi', () => {
      const connection = createMockConnection({ type: 'wifi' });

      Object.defineProperty(globalThis, 'navigator', {
        value: { connection },
        writable: true,
        configurable: true,
      });

      expect(NetworkStatus.connectionType()).toBe('wifi');
    });

    it('should return cellular when type is cellular', () => {
      const connection = createMockConnection({ type: 'cellular' });

      Object.defineProperty(globalThis, 'navigator', {
        value: { connection },
        writable: true,
        configurable: true,
      });

      expect(NetworkStatus.connectionType()).toBe('cellular');
    });

    it('should return ethernet when type is ethernet', () => {
      const connection = createMockConnection({ type: 'ethernet' });

      Object.defineProperty(globalThis, 'navigator', {
        value: { connection },
        writable: true,
        configurable: true,
      });

      expect(NetworkStatus.connectionType()).toBe('ethernet');
    });

    it('should return bluetooth when type is bluetooth', () => {
      const connection = createMockConnection({ type: 'bluetooth' });

      Object.defineProperty(globalThis, 'navigator', {
        value: { connection },
        writable: true,
        configurable: true,
      });

      expect(NetworkStatus.connectionType()).toBe('bluetooth');
    });

    it('should return wimax when type is wimax', () => {
      const connection = createMockConnection({ type: 'wimax' });

      Object.defineProperty(globalThis, 'navigator', {
        value: { connection },
        writable: true,
        configurable: true,
      });

      expect(NetworkStatus.connectionType()).toBe('wimax');
    });

    it('should return other when type is other', () => {
      const connection = createMockConnection({ type: 'other' });

      Object.defineProperty(globalThis, 'navigator', {
        value: { connection },
        writable: true,
        configurable: true,
      });

      expect(NetworkStatus.connectionType()).toBe('other');
    });

    it('should return none when type is none', () => {
      const connection = createMockConnection({ type: 'none' });

      Object.defineProperty(globalThis, 'navigator', {
        value: { connection },
        writable: true,
        configurable: true,
      });

      expect(NetworkStatus.connectionType()).toBe('none');
    });

    it('should return unknown when type is unknown', () => {
      const connection = createMockConnection({ type: 'unknown' });

      Object.defineProperty(globalThis, 'navigator', {
        value: { connection },
        writable: true,
        configurable: true,
      });

      expect(NetworkStatus.connectionType()).toBe('unknown');
    });

    it('should return unknown when connection is not available', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: true },
        writable: true,
        configurable: true,
      });

      expect(NetworkStatus.connectionType()).toBe('unknown');
    });

    it('should return unknown when type is undefined', () => {
      const connection = createMockConnection({});

      Object.defineProperty(globalThis, 'navigator', {
        value: { connection },
        writable: true,
        configurable: true,
      });

      expect(NetworkStatus.connectionType()).toBe('unknown');
    });

    it('should return unknown for unrecognized type', () => {
      const connection = createMockConnection({ type: 'satellite' });

      Object.defineProperty(globalThis, 'navigator', {
        value: { connection },
        writable: true,
        configurable: true,
      });

      expect(NetworkStatus.connectionType()).toBe('unknown');
    });
  });

  // ===========================================================================
  // getConnection
  // ===========================================================================

  describe('getConnection', () => {
    it('should return navigator.connection when available', () => {
      const connection = createMockConnection({ type: 'wifi' });

      Object.defineProperty(globalThis, 'navigator', {
        value: { connection },
        writable: true,
        configurable: true,
      });

      expect(NetworkStatus.getConnection()).toBe(connection);
    });

    it('should return navigator.mozConnection when connection is not available', () => {
      const mozConnection = createMockConnection({ type: 'cellular' });

      Object.defineProperty(globalThis, 'navigator', {
        value: { mozConnection },
        writable: true,
        configurable: true,
      });

      expect(NetworkStatus.getConnection()).toBe(mozConnection);
    });

    it('should return navigator.webkitConnection when others are not available', () => {
      const webkitConnection = createMockConnection({ type: 'ethernet' });

      Object.defineProperty(globalThis, 'navigator', {
        value: { webkitConnection },
        writable: true,
        configurable: true,
      });

      expect(NetworkStatus.getConnection()).toBe(webkitConnection);
    });

    it('should prefer connection over mozConnection', () => {
      const connection = createMockConnection({ type: 'wifi' });
      const mozConnection = createMockConnection({ type: 'cellular' });

      Object.defineProperty(globalThis, 'navigator', {
        value: { connection, mozConnection },
        writable: true,
        configurable: true,
      });

      expect(NetworkStatus.getConnection()).toBe(connection);
    });

    it('should return null when no connection API is available', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: true },
        writable: true,
        configurable: true,
      });

      expect(NetworkStatus.getConnection()).toBeNull();
    });

    it('should return null when navigator is undefined', () => {
      delete (globalThis as Record<string, unknown>).navigator;

      expect(NetworkStatus.getConnection()).toBeNull();
    });
  });

  // ===========================================================================
  // getInfo
  // ===========================================================================

  describe('getInfo', () => {
    it('should return basic info when connection is not available', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: true },
        writable: true,
        configurable: true,
      });

      const info = NetworkStatus.getInfo();

      expect(info.online).toBe(true);
      expect(info.type).toBe('unknown');
      expect(info.effectiveType).toBeUndefined();
      expect(info.downlink).toBeUndefined();
      expect(info.rtt).toBeUndefined();
      expect(info.saveData).toBeUndefined();
    });

    it('should return full info when connection is available', () => {
      const connection = createMockConnection({
        type: 'wifi',
        effectiveType: '4g',
        downlink: 10.5,
        rtt: 50,
        saveData: false,
      });

      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: true, connection },
        writable: true,
        configurable: true,
      });

      const info = NetworkStatus.getInfo();

      expect(info.online).toBe(true);
      expect(info.type).toBe('wifi');
      expect(info.effectiveType).toBe('4g');
      expect(info.downlink).toBe(10.5);
      expect(info.rtt).toBe(50);
      expect(info.saveData).toBe(false);
    });

    it('should return offline status correctly', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: false },
        writable: true,
        configurable: true,
      });

      const info = NetworkStatus.getInfo();

      expect(info.online).toBe(false);
    });

    it('should return saveData as true when enabled', () => {
      const connection = createMockConnection({
        type: 'cellular',
        saveData: true,
      });

      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: true, connection },
        writable: true,
        configurable: true,
      });

      const info = NetworkStatus.getInfo();

      expect(info.saveData).toBe(true);
    });

    it('should handle 2g effective type', () => {
      const connection = createMockConnection({
        type: 'cellular',
        effectiveType: '2g',
      });

      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: true, connection },
        writable: true,
        configurable: true,
      });

      const info = NetworkStatus.getInfo();

      expect(info.effectiveType).toBe('2g');
    });

    it('should handle 3g effective type', () => {
      const connection = createMockConnection({
        type: 'cellular',
        effectiveType: '3g',
      });

      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: true, connection },
        writable: true,
        configurable: true,
      });

      const info = NetworkStatus.getInfo();

      expect(info.effectiveType).toBe('3g');
    });

    it('should handle slow-2g effective type', () => {
      const connection = createMockConnection({
        type: 'cellular',
        effectiveType: 'slow-2g',
      });

      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: true, connection },
        writable: true,
        configurable: true,
      });

      const info = NetworkStatus.getInfo();

      expect(info.effectiveType).toBe('slow-2g');
    });
  });

  // ===========================================================================
  // Event Handlers
  // ===========================================================================

  describe('onStatusChange', () => {
    it('should call handler with true when online event fires', () => {
      const handler = vi.fn();

      NetworkStatus.onStatusChange(handler);

      window.dispatchEvent(new Event('online'));

      expect(handler).toHaveBeenCalledWith(true);
    });

    it('should call handler with false when offline event fires', () => {
      const handler = vi.fn();

      NetworkStatus.onStatusChange(handler);

      window.dispatchEvent(new Event('offline'));

      expect(handler).toHaveBeenCalledWith(false);
    });

    it('should return cleanup function that removes both listeners', () => {
      const handler = vi.fn();

      const cleanup = NetworkStatus.onStatusChange(handler);
      cleanup();

      window.dispatchEvent(new Event('online'));
      window.dispatchEvent(new Event('offline'));

      expect(handler).not.toHaveBeenCalled();
    });

    it('should return noop cleanup when window is undefined', () => {
      delete (globalThis as Record<string, unknown>).window;

      const handler = vi.fn();
      const cleanup = NetworkStatus.onStatusChange(handler);

      expect(typeof cleanup).toBe('function');
      expect(() => cleanup()).not.toThrow();
    });

    it('should handle multiple status changes', () => {
      const handler = vi.fn();

      NetworkStatus.onStatusChange(handler);

      window.dispatchEvent(new Event('online'));
      window.dispatchEvent(new Event('offline'));
      window.dispatchEvent(new Event('online'));

      expect(handler).toHaveBeenCalledTimes(3);
      expect(handler).toHaveBeenNthCalledWith(1, true);
      expect(handler).toHaveBeenNthCalledWith(2, false);
      expect(handler).toHaveBeenNthCalledWith(3, true);
    });

    it('should support multiple handlers', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      NetworkStatus.onStatusChange(handler1);
      NetworkStatus.onStatusChange(handler2);

      window.dispatchEvent(new Event('online'));

      expect(handler1).toHaveBeenCalledWith(true);
      expect(handler2).toHaveBeenCalledWith(true);
    });
  });

  describe('onOnline', () => {
    it('should call handler when online event fires', () => {
      const handler = vi.fn();

      NetworkStatus.onOnline(handler);

      window.dispatchEvent(new Event('online'));

      expect(handler).toHaveBeenCalled();
    });

    it('should not call handler when offline event fires', () => {
      const handler = vi.fn();

      NetworkStatus.onOnline(handler);

      window.dispatchEvent(new Event('offline'));

      expect(handler).not.toHaveBeenCalled();
    });

    it('should return cleanup function that removes listener', () => {
      const handler = vi.fn();

      const cleanup = NetworkStatus.onOnline(handler);
      cleanup();

      window.dispatchEvent(new Event('online'));

      expect(handler).not.toHaveBeenCalled();
    });

    it('should return noop cleanup when window is undefined', () => {
      delete (globalThis as Record<string, unknown>).window;

      const handler = vi.fn();
      const cleanup = NetworkStatus.onOnline(handler);

      expect(typeof cleanup).toBe('function');
      expect(() => cleanup()).not.toThrow();
    });
  });

  describe('onOffline', () => {
    it('should call handler when offline event fires', () => {
      const handler = vi.fn();

      NetworkStatus.onOffline(handler);

      window.dispatchEvent(new Event('offline'));

      expect(handler).toHaveBeenCalled();
    });

    it('should not call handler when online event fires', () => {
      const handler = vi.fn();

      NetworkStatus.onOffline(handler);

      window.dispatchEvent(new Event('online'));

      expect(handler).not.toHaveBeenCalled();
    });

    it('should return cleanup function that removes listener', () => {
      const handler = vi.fn();

      const cleanup = NetworkStatus.onOffline(handler);
      cleanup();

      window.dispatchEvent(new Event('offline'));

      expect(handler).not.toHaveBeenCalled();
    });

    it('should return noop cleanup when window is undefined', () => {
      delete (globalThis as Record<string, unknown>).window;

      const handler = vi.fn();
      const cleanup = NetworkStatus.onOffline(handler);

      expect(typeof cleanup).toBe('function');
      expect(() => cleanup()).not.toThrow();
    });
  });

  describe('onConnectionChange', () => {
    it('should call handler when connection change event fires', () => {
      const connection = createMockConnection({
        type: 'wifi',
        effectiveType: '4g',
        downlink: 10,
        rtt: 50,
        saveData: false,
      });

      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: true, connection },
        writable: true,
        configurable: true,
      });

      const handler = vi.fn();

      NetworkStatus.onConnectionChange(handler);

      connection.dispatchEvent(new Event('change'));

      expect(handler).toHaveBeenCalled();
      const info: NetworkInfo = handler.mock.calls[0]![0];
      expect(info.online).toBe(true);
      expect(info.type).toBe('wifi');
    });

    it('should return cleanup function that removes listener', () => {
      const connection = createMockConnection({ type: 'wifi' });

      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: true, connection },
        writable: true,
        configurable: true,
      });

      const handler = vi.fn();

      const cleanup = NetworkStatus.onConnectionChange(handler);
      cleanup();

      connection.dispatchEvent(new Event('change'));

      expect(handler).not.toHaveBeenCalled();
    });

    it('should return noop cleanup when connection is not available', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: true },
        writable: true,
        configurable: true,
      });

      const handler = vi.fn();
      const cleanup = NetworkStatus.onConnectionChange(handler);

      expect(typeof cleanup).toBe('function');
      expect(() => cleanup()).not.toThrow();
    });

    it('should provide current network info in handler', () => {
      const connection = createMockConnection({
        type: 'cellular',
        effectiveType: '3g',
        downlink: 1.5,
        rtt: 300,
        saveData: true,
      });

      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: true, connection },
        writable: true,
        configurable: true,
      });

      const handler = vi.fn();

      NetworkStatus.onConnectionChange(handler);
      connection.dispatchEvent(new Event('change'));

      const info: NetworkInfo = handler.mock.calls[0]![0];

      expect(info.type).toBe('cellular');
      expect(info.effectiveType).toBe('3g');
      expect(info.downlink).toBe(1.5);
      expect(info.rtt).toBe(300);
      expect(info.saveData).toBe(true);
    });
  });

  // ===========================================================================
  // Support Detection
  // ===========================================================================

  describe('isNetworkInfoSupported', () => {
    it('should return true when Network Information API is available', () => {
      const connection = createMockConnection({ type: 'wifi' });

      Object.defineProperty(globalThis, 'navigator', {
        value: { connection },
        writable: true,
        configurable: true,
      });

      expect(NetworkStatus.isNetworkInfoSupported()).toBe(true);
    });

    it('should return false when Network Information API is not available', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: true },
        writable: true,
        configurable: true,
      });

      expect(NetworkStatus.isNetworkInfoSupported()).toBe(false);
    });

    it('should return true when mozConnection is available', () => {
      const mozConnection = createMockConnection({ type: 'cellular' });

      Object.defineProperty(globalThis, 'navigator', {
        value: { mozConnection },
        writable: true,
        configurable: true,
      });

      expect(NetworkStatus.isNetworkInfoSupported()).toBe(true);
    });

    it('should return true when webkitConnection is available', () => {
      const webkitConnection = createMockConnection({ type: 'ethernet' });

      Object.defineProperty(globalThis, 'navigator', {
        value: { webkitConnection },
        writable: true,
        configurable: true,
      });

      expect(NetworkStatus.isNetworkInfoSupported()).toBe(true);
    });

    it('should return false when navigator is undefined', () => {
      delete (globalThis as Record<string, unknown>).navigator;

      expect(NetworkStatus.isNetworkInfoSupported()).toBe(false);
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle rapid online/offline changes', () => {
      const handler = vi.fn();

      NetworkStatus.onStatusChange(handler);

      for (let i = 0; i < 10; i++) {
        window.dispatchEvent(new Event(i % 2 === 0 ? 'online' : 'offline'));
      }

      expect(handler).toHaveBeenCalledTimes(10);
    });

    it('should handle cleanup being called multiple times', () => {
      const handler = vi.fn();

      const cleanup = NetworkStatus.onStatusChange(handler);
      cleanup();
      cleanup(); // Should not throw

      window.dispatchEvent(new Event('online'));

      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle connection with zero downlink', () => {
      const connection = createMockConnection({
        type: 'none',
        downlink: 0,
      });

      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: false, connection },
        writable: true,
        configurable: true,
      });

      const info = NetworkStatus.getInfo();

      expect(info.downlink).toBe(0);
    });

    it('should handle connection with zero rtt', () => {
      const connection = createMockConnection({
        type: 'ethernet',
        rtt: 0,
      });

      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: true, connection },
        writable: true,
        configurable: true,
      });

      const info = NetworkStatus.getInfo();

      expect(info.rtt).toBe(0);
    });

    it('should handle partial connection info', () => {
      const connection = createMockConnection({
        type: 'wifi',
        // No effectiveType, downlink, rtt, or saveData
      });

      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: true, connection },
        writable: true,
        configurable: true,
      });

      const info = NetworkStatus.getInfo();

      expect(info.type).toBe('wifi');
      expect(info.effectiveType).toBeUndefined();
      expect(info.downlink).toBeUndefined();
      expect(info.rtt).toBeUndefined();
      expect(info.saveData).toBeUndefined();
    });
  });

  // ===========================================================================
  // Module Export
  // ===========================================================================

  describe('Module Export', () => {
    it('should export NetworkStatus as const object', () => {
      expect(typeof NetworkStatus).toBe('object');
      expect(NetworkStatus).toBeDefined();
    });

    it('should have all expected methods', () => {
      expect(typeof NetworkStatus.isOnline).toBe('function');
      expect(typeof NetworkStatus.isOffline).toBe('function');
      expect(typeof NetworkStatus.connectionType).toBe('function');
      expect(typeof NetworkStatus.getInfo).toBe('function');
      expect(typeof NetworkStatus.onStatusChange).toBe('function');
      expect(typeof NetworkStatus.onOnline).toBe('function');
      expect(typeof NetworkStatus.onOffline).toBe('function');
      expect(typeof NetworkStatus.onConnectionChange).toBe('function');
      expect(typeof NetworkStatus.isNetworkInfoSupported).toBe('function');
      expect(typeof NetworkStatus.getConnection).toBe('function');
    });
  });
});
