import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserNotification } from '../../src/notification/index.js';
import { NotificationError, Result } from '../../src/core/index.js';

/**
 * Create a mock Notification constructor for testing.
 */
function createMockNotification(): {
  MockNotification: typeof Notification;
  instances: Array<{
    title: string;
    options?: NotificationOptions;
    onclick: ((this: Notification, ev: Event) => unknown) | null;
    onclose: ((this: Notification, ev: Event) => unknown) | null;
    onerror: ((this: Notification, ev: Event) => unknown) | null;
    onshow: ((this: Notification, ev: Event) => unknown) | null;
    close: () => void;
  }>;
} {
  const instances: Array<{
    title: string;
    options?: NotificationOptions;
    onclick: ((this: Notification, ev: Event) => unknown) | null;
    onclose: ((this: Notification, ev: Event) => unknown) | null;
    onerror: ((this: Notification, ev: Event) => unknown) | null;
    onshow: ((this: Notification, ev: Event) => unknown) | null;
    close: () => void;
  }> = [];

  const MockNotification = function (
    this: Notification,
    title: string,
    options?: NotificationOptions
  ) {
    const instance = {
      title,
      options,
      onclick: null as ((this: Notification, ev: Event) => unknown) | null,
      onclose: null as ((this: Notification, ev: Event) => unknown) | null,
      onerror: null as ((this: Notification, ev: Event) => unknown) | null,
      onshow: null as ((this: Notification, ev: Event) => unknown) | null,
      close: vi.fn(),
    };
    instances.push(instance);
    Object.assign(this, instance);
  } as unknown as typeof Notification;

  // Add static properties
  Object.defineProperty(MockNotification, 'permission', {
    value: 'default' as NotificationPermission,
    writable: true,
    configurable: true,
  });

  MockNotification.requestPermission = vi
    .fn()
    .mockResolvedValue('granted' as NotificationPermission);

  return { MockNotification, instances };
}

describe('BrowserNotification', () => {
  let originalNotification: typeof Notification | undefined;
  let originalNavigator: typeof navigator;
  let mockNotification: ReturnType<typeof createMockNotification>;

  beforeEach(() => {
    // Save original Notification
    originalNotification = typeof Notification !== 'undefined' ? Notification : undefined;
    originalNavigator = navigator;

    // Setup mock
    mockNotification = createMockNotification();

    Object.defineProperty(globalThis, 'Notification', {
      value: mockNotification.MockNotification,
      writable: true,
      configurable: true,
    });

    // Close all active notifications between tests
    BrowserNotification.closeAll();
  });

  afterEach(() => {
    // Restore original Notification
    if (originalNotification) {
      Object.defineProperty(globalThis, 'Notification', {
        value: originalNotification,
        writable: true,
        configurable: true,
      });
    } else {
      // @ts-expect-error - intentionally deleting for cleanup
      delete globalThis.Notification;
    }

    // Restore navigator
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });

    vi.restoreAllMocks();
  });

  // ===========================================================================
  // isSupported
  // ===========================================================================

  describe('isSupported', () => {
    it('should return true when Notification is defined', () => {
      expect(BrowserNotification.isSupported()).toBe(true);
    });

    it('should return false when Notification is undefined', () => {
      // @ts-expect-error - intentionally deleting for test
      delete globalThis.Notification;

      expect(BrowserNotification.isSupported()).toBe(false);
    });
  });

  // ===========================================================================
  // permission
  // ===========================================================================

  describe('permission', () => {
    it('should return current permission status', () => {
      Object.defineProperty(mockNotification.MockNotification, 'permission', {
        value: 'granted',
        configurable: true,
      });

      expect(BrowserNotification.permission()).toBe('granted');
    });

    it('should return denied when not supported', () => {
      // @ts-expect-error - intentionally deleting for test
      delete globalThis.Notification;

      expect(BrowserNotification.permission()).toBe('denied');
    });

    it('should return default for default permission', () => {
      Object.defineProperty(mockNotification.MockNotification, 'permission', {
        value: 'default',
        configurable: true,
      });

      expect(BrowserNotification.permission()).toBe('default');
    });

    it('should return denied for denied permission', () => {
      Object.defineProperty(mockNotification.MockNotification, 'permission', {
        value: 'denied',
        configurable: true,
      });

      expect(BrowserNotification.permission()).toBe('denied');
    });
  });

  // ===========================================================================
  // isGranted
  // ===========================================================================

  describe('isGranted', () => {
    it('should return true when permission is granted', () => {
      Object.defineProperty(mockNotification.MockNotification, 'permission', {
        value: 'granted',
        configurable: true,
      });

      expect(BrowserNotification.isGranted()).toBe(true);
    });

    it('should return false when permission is denied', () => {
      Object.defineProperty(mockNotification.MockNotification, 'permission', {
        value: 'denied',
        configurable: true,
      });

      expect(BrowserNotification.isGranted()).toBe(false);
    });

    it('should return false when permission is default', () => {
      Object.defineProperty(mockNotification.MockNotification, 'permission', {
        value: 'default',
        configurable: true,
      });

      expect(BrowserNotification.isGranted()).toBe(false);
    });
  });

  // ===========================================================================
  // isDenied
  // ===========================================================================

  describe('isDenied', () => {
    it('should return true when permission is denied', () => {
      Object.defineProperty(mockNotification.MockNotification, 'permission', {
        value: 'denied',
        configurable: true,
      });

      expect(BrowserNotification.isDenied()).toBe(true);
    });

    it('should return false when permission is granted', () => {
      Object.defineProperty(mockNotification.MockNotification, 'permission', {
        value: 'granted',
        configurable: true,
      });

      expect(BrowserNotification.isDenied()).toBe(false);
    });

    it('should return false when permission is default', () => {
      Object.defineProperty(mockNotification.MockNotification, 'permission', {
        value: 'default',
        configurable: true,
      });

      expect(BrowserNotification.isDenied()).toBe(false);
    });

    it('should return true when not supported', () => {
      // @ts-expect-error - intentionally deleting for test
      delete globalThis.Notification;

      expect(BrowserNotification.isDenied()).toBe(true);
    });
  });

  // ===========================================================================
  // requestPermission
  // ===========================================================================

  describe('requestPermission', () => {
    it('should return Ok with granted permission', async () => {
      mockNotification.MockNotification.requestPermission = vi.fn().mockResolvedValue('granted');

      const result = await BrowserNotification.requestPermission();

      expect(Result.isOk(result)).toBe(true);
      expect(Result.unwrap(result)).toBe('granted');
    });

    it('should return Ok with default permission', async () => {
      mockNotification.MockNotification.requestPermission = vi.fn().mockResolvedValue('default');

      const result = await BrowserNotification.requestPermission();

      expect(Result.isOk(result)).toBe(true);
      expect(Result.unwrap(result)).toBe('default');
    });

    it('should return Err with permissionDenied when denied', async () => {
      mockNotification.MockNotification.requestPermission = vi.fn().mockResolvedValue('denied');

      const result = await BrowserNotification.requestPermission();

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result)).toBeInstanceOf(NotificationError);
      expect(Result.unwrapErr(result).code).toBe('NOTIFICATION_PERMISSION_DENIED');
    });

    it('should return Err when not supported', async () => {
      // @ts-expect-error - intentionally deleting for test
      delete globalThis.Notification;

      const result = await BrowserNotification.requestPermission();

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result)).toBeInstanceOf(NotificationError);
      expect(Result.unwrapErr(result).code).toBe('NOTIFICATION_NOT_SUPPORTED');
    });

    it('should return Err when requestPermission throws', async () => {
      mockNotification.MockNotification.requestPermission = vi
        .fn()
        .mockRejectedValue(new Error('Permission request failed'));

      const result = await BrowserNotification.requestPermission();

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result)).toBeInstanceOf(NotificationError);
      expect(Result.unwrapErr(result).code).toBe('NOTIFICATION_SHOW_FAILED');
    });
  });

  // ===========================================================================
  // show
  // ===========================================================================

  describe('show', () => {
    it('should create notification when permission is granted', async () => {
      Object.defineProperty(mockNotification.MockNotification, 'permission', {
        value: 'granted',
        configurable: true,
      });

      const result = await BrowserNotification.show('Test Title', {
        body: 'Test Body',
      });

      expect(Result.isOk(result)).toBe(true);
      expect(mockNotification.instances.length).toBe(1);
      expect(mockNotification.instances[0]?.title).toBe('Test Title');
      expect(mockNotification.instances[0]?.options?.body).toBe('Test Body');
    });

    it('should create notification with all options', async () => {
      Object.defineProperty(mockNotification.MockNotification, 'permission', {
        value: 'granted',
        configurable: true,
      });

      const options: NotificationOptions = {
        body: 'Test Body',
        icon: '/icon.png',
        badge: '/badge.png',
        tag: 'test-tag',
        data: { custom: 'data' },
        requireInteraction: true,
        silent: false,
      };

      const result = await BrowserNotification.show('Test Title', options);

      expect(Result.isOk(result)).toBe(true);
      expect(mockNotification.instances[0]?.options).toEqual(options);
    });

    it('should request permission when permission is default', async () => {
      Object.defineProperty(mockNotification.MockNotification, 'permission', {
        value: 'default',
        writable: true,
        configurable: true,
      });

      mockNotification.MockNotification.requestPermission = vi.fn().mockImplementation(async () => {
        Object.defineProperty(mockNotification.MockNotification, 'permission', {
          value: 'granted',
          writable: true,
          configurable: true,
        });
        return 'granted';
      });

      const result = await BrowserNotification.show('Test Title');

      expect(Result.isOk(result)).toBe(true);
      expect(mockNotification.MockNotification.requestPermission).toHaveBeenCalled();
    });

    it('should return Err when permission is denied', async () => {
      Object.defineProperty(mockNotification.MockNotification, 'permission', {
        value: 'denied',
        configurable: true,
      });

      const result = await BrowserNotification.show('Test Title');

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result).code).toBe('NOTIFICATION_PERMISSION_DENIED');
    });

    it('should return Err when permission request is denied', async () => {
      Object.defineProperty(mockNotification.MockNotification, 'permission', {
        value: 'default',
        configurable: true,
      });

      mockNotification.MockNotification.requestPermission = vi.fn().mockResolvedValue('denied');

      const result = await BrowserNotification.show('Test Title');

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result).code).toBe('NOTIFICATION_PERMISSION_DENIED');
    });

    it('should return Err when permission request returns default', async () => {
      Object.defineProperty(mockNotification.MockNotification, 'permission', {
        value: 'default',
        configurable: true,
      });

      mockNotification.MockNotification.requestPermission = vi.fn().mockResolvedValue('default');

      const result = await BrowserNotification.show('Test Title');

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result).code).toBe('NOTIFICATION_PERMISSION_DENIED');
    });

    it('should return Err when not supported', async () => {
      // @ts-expect-error - intentionally deleting for test
      delete globalThis.Notification;

      const result = await BrowserNotification.show('Test Title');

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result).code).toBe('NOTIFICATION_NOT_SUPPORTED');
    });

    it('should return Err when notification constructor throws', async () => {
      Object.defineProperty(mockNotification.MockNotification, 'permission', {
        value: 'granted',
        configurable: true,
      });

      // Make constructor throw
      const ThrowingNotification = function () {
        throw new Error('Notification creation failed');
      } as unknown as typeof Notification;
      Object.defineProperty(ThrowingNotification, 'permission', {
        value: 'granted',
        configurable: true,
      });

      Object.defineProperty(globalThis, 'Notification', {
        value: ThrowingNotification,
        writable: true,
        configurable: true,
      });

      const result = await BrowserNotification.show('Test Title');

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result).code).toBe('NOTIFICATION_SHOW_FAILED');
    });

    it('should track active notifications', async () => {
      Object.defineProperty(mockNotification.MockNotification, 'permission', {
        value: 'granted',
        configurable: true,
      });

      await BrowserNotification.show('Test 1');
      await BrowserNotification.show('Test 2');

      expect(BrowserNotification.activeCount()).toBe(2);
    });

    it('should remove notification from tracking when closed', async () => {
      Object.defineProperty(mockNotification.MockNotification, 'permission', {
        value: 'granted',
        configurable: true,
      });

      const result = await BrowserNotification.show('Test');

      expect(BrowserNotification.activeCount()).toBe(1);

      // Simulate close event
      const notification = Result.unwrap(result);
      notification.onclose?.(new Event('close'));

      expect(BrowserNotification.activeCount()).toBe(0);
    });

    it('should return Err when permission request fails', async () => {
      Object.defineProperty(mockNotification.MockNotification, 'permission', {
        value: 'default',
        configurable: true,
      });

      mockNotification.MockNotification.requestPermission = vi
        .fn()
        .mockRejectedValue(new Error('Request failed'));

      const result = await BrowserNotification.show('Test Title');

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result).code).toBe('NOTIFICATION_SHOW_FAILED');
    });
  });

  // ===========================================================================
  // showWithHandlers
  // ===========================================================================

  describe('showWithHandlers', () => {
    beforeEach(() => {
      Object.defineProperty(mockNotification.MockNotification, 'permission', {
        value: 'granted',
        configurable: true,
      });
    });

    it('should create notification and attach onClick handler', async () => {
      const onClick = vi.fn();

      const result = await BrowserNotification.showWithHandlers('Test', {
        onClick,
      });

      expect(Result.isOk(result)).toBe(true);

      const notification = Result.unwrap(result);
      // Simulate click event
      notification.onclick?.(new Event('click'));

      expect(onClick).toHaveBeenCalled();
    });

    it('should create notification and attach onClose handler', async () => {
      const onClose = vi.fn();

      const result = await BrowserNotification.showWithHandlers('Test', {
        onClose,
      });

      expect(Result.isOk(result)).toBe(true);

      const notification = Result.unwrap(result);
      // Simulate close event
      notification.onclose?.(new Event('close'));

      expect(onClose).toHaveBeenCalled();
    });

    it('should call both original and custom onClose handlers', async () => {
      const onClose = vi.fn();

      const result = await BrowserNotification.showWithHandlers('Test', {
        onClose,
      });

      expect(Result.isOk(result)).toBe(true);

      // The notification should still be removed from tracking when closed
      expect(BrowserNotification.activeCount()).toBe(1);

      const notification = Result.unwrap(result);
      notification.onclose?.(new Event('close'));

      // Both handlers should have been called
      expect(onClose).toHaveBeenCalled();
      expect(BrowserNotification.activeCount()).toBe(0);
    });

    it('should create notification and attach onError handler', async () => {
      const onError = vi.fn();

      const result = await BrowserNotification.showWithHandlers('Test', {
        onError,
      });

      expect(Result.isOk(result)).toBe(true);

      const notification = Result.unwrap(result);
      // Simulate error event
      notification.onerror?.(new Event('error'));

      expect(onError).toHaveBeenCalled();
    });

    it('should create notification and attach onShow handler', async () => {
      const onShow = vi.fn();

      const result = await BrowserNotification.showWithHandlers('Test', {
        onShow,
      });

      expect(Result.isOk(result)).toBe(true);

      const notification = Result.unwrap(result);
      // Simulate show event
      notification.onshow?.(new Event('show'));

      expect(onShow).toHaveBeenCalled();
    });

    it('should attach all handlers at once', async () => {
      const onClick = vi.fn();
      const onClose = vi.fn();
      const onError = vi.fn();
      const onShow = vi.fn();

      const result = await BrowserNotification.showWithHandlers('Test', {
        body: 'Test body',
        onClick,
        onClose,
        onError,
        onShow,
      });

      expect(Result.isOk(result)).toBe(true);

      const notification = Result.unwrap(result);

      notification.onclick?.(new Event('click'));
      notification.onclose?.(new Event('close'));
      notification.onerror?.(new Event('error'));
      notification.onshow?.(new Event('show'));

      expect(onClick).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
      expect(onError).toHaveBeenCalled();
      expect(onShow).toHaveBeenCalled();
    });

    it('should pass notification options correctly', async () => {
      await BrowserNotification.showWithHandlers('Test', {
        body: 'Test body',
        icon: '/icon.png',
        onClick: vi.fn(),
      });

      expect(mockNotification.instances[0]?.options?.body).toBe('Test body');
      expect(mockNotification.instances[0]?.options?.icon).toBe('/icon.png');
    });

    it('should return Err when show fails', async () => {
      Object.defineProperty(mockNotification.MockNotification, 'permission', {
        value: 'denied',
        configurable: true,
      });

      const result = await BrowserNotification.showWithHandlers('Test', {
        onClick: vi.fn(),
      });

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result).code).toBe('NOTIFICATION_PERMISSION_DENIED');
    });

    it('should work without any handlers', async () => {
      const result = await BrowserNotification.showWithHandlers('Test', {
        body: 'Just options, no handlers',
      });

      expect(Result.isOk(result)).toBe(true);
    });
  });

  // ===========================================================================
  // close
  // ===========================================================================

  describe('close', () => {
    beforeEach(() => {
      Object.defineProperty(mockNotification.MockNotification, 'permission', {
        value: 'granted',
        configurable: true,
      });
    });

    it('should close notification', async () => {
      const result = await BrowserNotification.show('Test');

      expect(Result.isOk(result)).toBe(true);

      const notification = Result.unwrap(result);
      BrowserNotification.close(notification);

      expect(notification.close).toHaveBeenCalled();
    });

    it('should remove notification from tracking', async () => {
      const result = await BrowserNotification.show('Test');

      expect(BrowserNotification.activeCount()).toBe(1);

      const notification = Result.unwrap(result);
      BrowserNotification.close(notification);

      expect(BrowserNotification.activeCount()).toBe(0);
    });
  });

  // ===========================================================================
  // closeAll
  // ===========================================================================

  describe('closeAll', () => {
    beforeEach(() => {
      Object.defineProperty(mockNotification.MockNotification, 'permission', {
        value: 'granted',
        configurable: true,
      });
    });

    it('should close all active notifications', async () => {
      const result1 = await BrowserNotification.show('Test 1');
      const result2 = await BrowserNotification.show('Test 2');
      const result3 = await BrowserNotification.show('Test 3');

      expect(BrowserNotification.activeCount()).toBe(3);

      BrowserNotification.closeAll();

      expect(BrowserNotification.activeCount()).toBe(0);
      expect(Result.unwrap(result1).close).toHaveBeenCalled();
      expect(Result.unwrap(result2).close).toHaveBeenCalled();
      expect(Result.unwrap(result3).close).toHaveBeenCalled();
    });

    it('should work when no active notifications', () => {
      expect(BrowserNotification.activeCount()).toBe(0);

      expect(() => BrowserNotification.closeAll()).not.toThrow();

      expect(BrowserNotification.activeCount()).toBe(0);
    });
  });

  // ===========================================================================
  // activeCount
  // ===========================================================================

  describe('activeCount', () => {
    beforeEach(() => {
      Object.defineProperty(mockNotification.MockNotification, 'permission', {
        value: 'granted',
        configurable: true,
      });
    });

    it('should return 0 when no notifications', () => {
      expect(BrowserNotification.activeCount()).toBe(0);
    });

    it('should return correct count after creating notifications', async () => {
      await BrowserNotification.show('Test 1');
      expect(BrowserNotification.activeCount()).toBe(1);

      await BrowserNotification.show('Test 2');
      expect(BrowserNotification.activeCount()).toBe(2);
    });

    it('should decrease count after closing', async () => {
      const result = await BrowserNotification.show('Test');

      expect(BrowserNotification.activeCount()).toBe(1);

      BrowserNotification.close(Result.unwrap(result));

      expect(BrowserNotification.activeCount()).toBe(0);
    });
  });

  // ===========================================================================
  // showViaServiceWorker
  // ===========================================================================

  describe('showViaServiceWorker', () => {
    let mockServiceWorker: {
      ready: Promise<{
        showNotification: ReturnType<typeof vi.fn>;
      }>;
    };

    beforeEach(() => {
      Object.defineProperty(mockNotification.MockNotification, 'permission', {
        value: 'granted',
        configurable: true,
      });

      mockServiceWorker = {
        ready: Promise.resolve({
          showNotification: vi.fn().mockResolvedValue(undefined),
        }),
      };

      Object.defineProperty(globalThis, 'navigator', {
        value: {
          ...originalNavigator,
          serviceWorker: mockServiceWorker,
        },
        writable: true,
        configurable: true,
      });
    });

    it('should show notification via service worker when granted', async () => {
      const result = await BrowserNotification.showViaServiceWorker('Test', {
        body: 'Test body',
      });

      expect(Result.isOk(result)).toBe(true);
      const registration = await mockServiceWorker.ready;
      expect(registration.showNotification).toHaveBeenCalledWith('Test', {
        body: 'Test body',
      });
    });

    it('should request permission if not granted', async () => {
      Object.defineProperty(mockNotification.MockNotification, 'permission', {
        value: 'default',
        writable: true,
        configurable: true,
      });

      mockNotification.MockNotification.requestPermission = vi.fn().mockImplementation(async () => {
        Object.defineProperty(mockNotification.MockNotification, 'permission', {
          value: 'granted',
          writable: true,
          configurable: true,
        });
        return 'granted';
      });

      const result = await BrowserNotification.showViaServiceWorker('Test');

      expect(Result.isOk(result)).toBe(true);
      expect(mockNotification.MockNotification.requestPermission).toHaveBeenCalled();
    });

    it('should return Err when not supported', async () => {
      // @ts-expect-error - intentionally deleting for test
      delete globalThis.Notification;

      const result = await BrowserNotification.showViaServiceWorker('Test');

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result).code).toBe('NOTIFICATION_NOT_SUPPORTED');
    });

    it('should return Err when service worker not supported', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      });

      const result = await BrowserNotification.showViaServiceWorker('Test');

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result).code).toBe('NOTIFICATION_NOT_SUPPORTED');
    });

    it('should return Err when permission denied', async () => {
      Object.defineProperty(mockNotification.MockNotification, 'permission', {
        value: 'default',
        configurable: true,
      });

      mockNotification.MockNotification.requestPermission = vi.fn().mockResolvedValue('denied');

      const result = await BrowserNotification.showViaServiceWorker('Test');

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result).code).toBe('NOTIFICATION_PERMISSION_DENIED');
    });

    it('should return Err when permission request fails', async () => {
      Object.defineProperty(mockNotification.MockNotification, 'permission', {
        value: 'default',
        configurable: true,
      });

      mockNotification.MockNotification.requestPermission = vi
        .fn()
        .mockRejectedValue(new Error('Request failed'));

      const result = await BrowserNotification.showViaServiceWorker('Test');

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result).code).toBe('NOTIFICATION_PERMISSION_DENIED');
    });

    it('should return Err when showNotification fails', async () => {
      mockServiceWorker.ready = Promise.resolve({
        showNotification: vi.fn().mockRejectedValue(new Error('Show failed')),
      });

      const result = await BrowserNotification.showViaServiceWorker('Test');

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result).code).toBe('NOTIFICATION_SHOW_FAILED');
    });

    it('should return Err when service worker ready fails', async () => {
      mockServiceWorker.ready = Promise.reject(new Error('SW not ready'));

      const result = await BrowserNotification.showViaServiceWorker('Test');

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result).code).toBe('NOTIFICATION_SHOW_FAILED');
    });
  });

  // ===========================================================================
  // Permission States
  // ===========================================================================

  describe('Permission States', () => {
    it('should handle granted permission state', async () => {
      Object.defineProperty(mockNotification.MockNotification, 'permission', {
        value: 'granted',
        configurable: true,
      });

      expect(BrowserNotification.permission()).toBe('granted');
      expect(BrowserNotification.isGranted()).toBe(true);
      expect(BrowserNotification.isDenied()).toBe(false);

      const result = await BrowserNotification.show('Test');
      expect(Result.isOk(result)).toBe(true);
    });

    it('should handle denied permission state', async () => {
      Object.defineProperty(mockNotification.MockNotification, 'permission', {
        value: 'denied',
        configurable: true,
      });

      expect(BrowserNotification.permission()).toBe('denied');
      expect(BrowserNotification.isGranted()).toBe(false);
      expect(BrowserNotification.isDenied()).toBe(true);

      const result = await BrowserNotification.show('Test');
      expect(Result.isErr(result)).toBe(true);
    });

    it('should handle default permission state', async () => {
      Object.defineProperty(mockNotification.MockNotification, 'permission', {
        value: 'default',
        configurable: true,
      });

      expect(BrowserNotification.permission()).toBe('default');
      expect(BrowserNotification.isGranted()).toBe(false);
      expect(BrowserNotification.isDenied()).toBe(false);
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    beforeEach(() => {
      Object.defineProperty(mockNotification.MockNotification, 'permission', {
        value: 'granted',
        configurable: true,
      });
    });

    it('should handle empty title', async () => {
      const result = await BrowserNotification.show('');

      expect(Result.isOk(result)).toBe(true);
      expect(mockNotification.instances[0]?.title).toBe('');
    });

    it('should handle undefined options', async () => {
      const result = await BrowserNotification.show('Test');

      expect(Result.isOk(result)).toBe(true);
    });

    it('should handle closing already closed notification', async () => {
      const result = await BrowserNotification.show('Test');

      const notification = Result.unwrap(result);

      BrowserNotification.close(notification);
      expect(BrowserNotification.activeCount()).toBe(0);

      // Closing again should not throw
      expect(() => BrowserNotification.close(notification)).not.toThrow();
    });

    it('should handle closeAll multiple times', async () => {
      await BrowserNotification.show('Test');

      BrowserNotification.closeAll();
      expect(BrowserNotification.activeCount()).toBe(0);

      expect(() => BrowserNotification.closeAll()).not.toThrow();
    });

    it('should handle special characters in title and body', async () => {
      const title = 'Test <script>alert("xss")</script>';
      const body = 'Body with \n newlines \t and tabs';

      const result = await BrowserNotification.show(title, { body });

      expect(Result.isOk(result)).toBe(true);
      expect(mockNotification.instances[0]?.title).toBe(title);
      expect(mockNotification.instances[0]?.options?.body).toBe(body);
    });

    it('should handle unicode in title and body', async () => {
      const title = 'Test \u{1F600} \u{1F389}';
      const body = '\u4E2D\u6587 \u65E5\u672C\u8A9E';

      const result = await BrowserNotification.show(title, { body });

      expect(Result.isOk(result)).toBe(true);
      expect(mockNotification.instances[0]?.title).toBe(title);
      expect(mockNotification.instances[0]?.options?.body).toBe(body);
    });
  });
});
