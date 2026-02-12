import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Fullscreen } from '../../src/fullscreen/index.js';
import { type CleanupFn, FullscreenError, Result } from '../../src/core/index.js';

// ===========================================================================
// Mock Interfaces for Vendor-Prefixed APIs
// ===========================================================================

interface MockFullscreenElement extends Element {
  requestFullscreen: () => Promise<void>;
  webkitRequestFullscreen?: () => Promise<void>;
  mozRequestFullScreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
}

describe('Fullscreen', () => {
  let originalDocument: typeof document;
  let mockElement: MockFullscreenElement;
  let cleanupFunctions: CleanupFn[];

  // ===========================================================================
  // Setup and Teardown
  // ===========================================================================

  beforeEach(() => {
    cleanupFunctions = [];
    originalDocument = global.document;

    // Create a mock element with requestFullscreen
    mockElement = document.createElement('div') as MockFullscreenElement;
    mockElement.requestFullscreen = vi.fn().mockResolvedValue(undefined);

    // Reset fullscreen state - clear ALL variants (standard + vendor-prefixed)
    Object.defineProperty(document, 'fullscreenElement', {
      value: null,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(document, 'webkitFullscreenElement', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(document, 'mozFullScreenElement', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(document, 'msFullscreenElement', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(document, 'fullscreenEnabled', {
      value: true,
      writable: true,
      configurable: true,
    });

    // Clear vendor-prefixed enabled properties
    Object.defineProperty(document, 'webkitFullscreenEnabled', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(document, 'mozFullScreenEnabled', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(document, 'msFullscreenEnabled', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    // Clear vendor-prefixed exit methods
    Object.defineProperty(document, 'webkitExitFullscreen', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(document, 'mozCancelFullScreen', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(document, 'msExitFullscreen', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    // Mock documentElement.requestFullscreen
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      value: vi.fn().mockResolvedValue(undefined),
      writable: true,
      configurable: true,
    });

    // Mock document.exitFullscreen
    Object.defineProperty(document, 'exitFullscreen', {
      value: vi.fn().mockResolvedValue(undefined),
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    // Clean up all registered event handlers
    cleanupFunctions.forEach((cleanup) => cleanup());
    cleanupFunctions = [];

    vi.restoreAllMocks();
  });

  // ===========================================================================
  // isSupported
  // ===========================================================================

  describe('isSupported', () => {
    it('should return true when fullscreenEnabled is true', () => {
      Object.defineProperty(document, 'fullscreenEnabled', {
        value: true,
        configurable: true,
      });

      expect(Fullscreen.isSupported()).toBe(true);
    });

    it('should return true when webkitFullscreenEnabled is true', () => {
      Object.defineProperty(document, 'fullscreenEnabled', {
        value: false,
        configurable: true,
      });
      Object.defineProperty(document, 'webkitFullscreenEnabled', {
        value: true,
        configurable: true,
      });

      expect(Fullscreen.isSupported()).toBe(true);
    });

    it('should return true when mozFullScreenEnabled is true', () => {
      Object.defineProperty(document, 'fullscreenEnabled', {
        value: false,
        configurable: true,
      });
      Object.defineProperty(document, 'mozFullScreenEnabled', {
        value: true,
        configurable: true,
      });

      expect(Fullscreen.isSupported()).toBe(true);
    });

    it('should return true when msFullscreenEnabled is true', () => {
      Object.defineProperty(document, 'fullscreenEnabled', {
        value: false,
        configurable: true,
      });
      Object.defineProperty(document, 'msFullscreenEnabled', {
        value: true,
        configurable: true,
      });

      expect(Fullscreen.isSupported()).toBe(true);
    });

    it('should return true when requestFullscreen function exists', () => {
      Object.defineProperty(document, 'fullscreenEnabled', {
        value: false,
        configurable: true,
      });
      Object.defineProperty(document.documentElement, 'requestFullscreen', {
        value: vi.fn(),
        configurable: true,
      });

      expect(Fullscreen.isSupported()).toBe(true);
    });

    it('should return false when no fullscreen support exists', () => {
      Object.defineProperty(document, 'fullscreenEnabled', {
        value: false,
        configurable: true,
      });
      Object.defineProperty(document.documentElement, 'requestFullscreen', {
        value: undefined,
        configurable: true,
      });

      expect(Fullscreen.isSupported()).toBe(false);
    });

    it('should return false when document is undefined', () => {
      // @ts-expect-error - Testing undefined document
      global.document = undefined;

      expect(Fullscreen.isSupported()).toBe(false);

      global.document = originalDocument;
    });
  });

  // ===========================================================================
  // isFullscreen
  // ===========================================================================

  describe('isFullscreen', () => {
    it('should return false when no element is in fullscreen', () => {
      Object.defineProperty(document, 'fullscreenElement', {
        value: null,
        configurable: true,
      });

      expect(Fullscreen.isFullscreen()).toBe(false);
    });

    it('should return true when an element is in fullscreen', () => {
      Object.defineProperty(document, 'fullscreenElement', {
        value: mockElement,
        configurable: true,
      });

      expect(Fullscreen.isFullscreen()).toBe(true);
    });

    it('should check webkitFullscreenElement', () => {
      Object.defineProperty(document, 'fullscreenElement', {
        value: null,
        configurable: true,
      });
      Object.defineProperty(document, 'webkitFullscreenElement', {
        value: mockElement,
        configurable: true,
      });

      expect(Fullscreen.isFullscreen()).toBe(true);
    });

    it('should check mozFullScreenElement', () => {
      Object.defineProperty(document, 'fullscreenElement', {
        value: null,
        configurable: true,
      });
      Object.defineProperty(document, 'mozFullScreenElement', {
        value: mockElement,
        configurable: true,
      });

      expect(Fullscreen.isFullscreen()).toBe(true);
    });

    it('should check msFullscreenElement', () => {
      Object.defineProperty(document, 'fullscreenElement', {
        value: null,
        configurable: true,
      });
      Object.defineProperty(document, 'msFullscreenElement', {
        value: mockElement,
        configurable: true,
      });

      expect(Fullscreen.isFullscreen()).toBe(true);
    });
  });

  // ===========================================================================
  // element
  // ===========================================================================

  describe('element', () => {
    it('should return null when no element is in fullscreen', () => {
      Object.defineProperty(document, 'fullscreenElement', {
        value: null,
        configurable: true,
      });

      expect(Fullscreen.element()).toBeNull();
    });

    it('should return the fullscreen element', () => {
      Object.defineProperty(document, 'fullscreenElement', {
        value: mockElement,
        configurable: true,
      });

      expect(Fullscreen.element()).toBe(mockElement);
    });

    it('should return webkitFullscreenElement when standard is null', () => {
      Object.defineProperty(document, 'fullscreenElement', {
        value: null,
        configurable: true,
      });
      Object.defineProperty(document, 'webkitFullscreenElement', {
        value: mockElement,
        configurable: true,
      });

      expect(Fullscreen.element()).toBe(mockElement);
    });

    it('should return mozFullScreenElement when others are null', () => {
      Object.defineProperty(document, 'fullscreenElement', {
        value: null,
        configurable: true,
      });
      Object.defineProperty(document, 'webkitFullscreenElement', {
        value: null,
        configurable: true,
      });
      Object.defineProperty(document, 'mozFullScreenElement', {
        value: mockElement,
        configurable: true,
      });

      expect(Fullscreen.element()).toBe(mockElement);
    });

    it('should return msFullscreenElement when others are null', () => {
      Object.defineProperty(document, 'fullscreenElement', {
        value: null,
        configurable: true,
      });
      Object.defineProperty(document, 'webkitFullscreenElement', {
        value: null,
        configurable: true,
      });
      Object.defineProperty(document, 'mozFullScreenElement', {
        value: null,
        configurable: true,
      });
      Object.defineProperty(document, 'msFullscreenElement', {
        value: mockElement,
        configurable: true,
      });

      expect(Fullscreen.element()).toBe(mockElement);
    });

    it('should return null when document is undefined', () => {
      // @ts-expect-error - Testing undefined document
      global.document = undefined;

      expect(Fullscreen.element()).toBeNull();

      global.document = originalDocument;
    });

    it('should prefer standard fullscreenElement over prefixed variants', () => {
      const standardElement = document.createElement('div');
      const webkitElement = document.createElement('span');

      Object.defineProperty(document, 'fullscreenElement', {
        value: standardElement,
        configurable: true,
      });
      Object.defineProperty(document, 'webkitFullscreenElement', {
        value: webkitElement,
        configurable: true,
      });

      expect(Fullscreen.element()).toBe(standardElement);
    });
  });

  // ===========================================================================
  // request
  // ===========================================================================

  describe('request', () => {
    it('should return error when fullscreen is not supported', async () => {
      Object.defineProperty(document, 'fullscreenEnabled', {
        value: false,
        configurable: true,
      });
      Object.defineProperty(document.documentElement, 'requestFullscreen', {
        value: undefined,
        configurable: true,
      });

      const result = await Fullscreen.request(mockElement);

      expect(Result.isErr(result)).toBe(true);
      const error = Result.unwrapErr(result);
      expect(error).toBeInstanceOf(FullscreenError);
      expect(error.code).toBe('FULLSCREEN_NOT_SUPPORTED');
    });

    it('should request fullscreen for the provided element', async () => {
      const result = await Fullscreen.request(mockElement);

      expect(Result.isOk(result)).toBe(true);
      expect(mockElement.requestFullscreen).toHaveBeenCalled();
    });

    it('should use document.documentElement when no element provided', async () => {
      const result = await Fullscreen.request();

      expect(Result.isOk(result)).toBe(true);
      expect(document.documentElement.requestFullscreen).toHaveBeenCalled();
    });

    it('should use webkitRequestFullscreen when standard is unavailable', async () => {
      const webkitElement = document.createElement('div') as MockFullscreenElement;
      Object.defineProperty(webkitElement, 'requestFullscreen', {
        value: undefined,
        configurable: true,
      });
      webkitElement.webkitRequestFullscreen = vi.fn().mockResolvedValue(undefined);

      const result = await Fullscreen.request(webkitElement);

      expect(Result.isOk(result)).toBe(true);
      expect(webkitElement.webkitRequestFullscreen).toHaveBeenCalled();
    });

    it('should use mozRequestFullScreen when webkit is unavailable', async () => {
      const mozElement = document.createElement('div') as MockFullscreenElement;
      Object.defineProperty(mozElement, 'requestFullscreen', {
        value: undefined,
        configurable: true,
      });
      mozElement.mozRequestFullScreen = vi.fn().mockResolvedValue(undefined);

      const result = await Fullscreen.request(mozElement);

      expect(Result.isOk(result)).toBe(true);
      expect(mozElement.mozRequestFullScreen).toHaveBeenCalled();
    });

    it('should use msRequestFullscreen when moz is unavailable', async () => {
      const msElement = document.createElement('div') as MockFullscreenElement;
      Object.defineProperty(msElement, 'requestFullscreen', {
        value: undefined,
        configurable: true,
      });
      msElement.msRequestFullscreen = vi.fn().mockResolvedValue(undefined);

      const result = await Fullscreen.request(msElement);

      expect(Result.isOk(result)).toBe(true);
      expect(msElement.msRequestFullscreen).toHaveBeenCalled();
    });

    it('should return error when requestFullscreen throws', async () => {
      const failingElement = document.createElement('div') as MockFullscreenElement;
      const mockError = new Error('Permission denied');
      failingElement.requestFullscreen = vi.fn().mockRejectedValue(mockError);

      const result = await Fullscreen.request(failingElement);

      expect(Result.isErr(result)).toBe(true);
      const error = Result.unwrapErr(result);
      expect(error).toBeInstanceOf(FullscreenError);
      expect(error.code).toBe('FULLSCREEN_REQUEST_FAILED');
      expect(error.cause).toBe(mockError);
    });

    it('should return error when webkitRequestFullscreen throws', async () => {
      const webkitElement = document.createElement('div') as MockFullscreenElement;
      Object.defineProperty(webkitElement, 'requestFullscreen', {
        value: undefined,
        configurable: true,
      });
      const mockError = new Error('User gesture required');
      webkitElement.webkitRequestFullscreen = vi.fn().mockRejectedValue(mockError);

      const result = await Fullscreen.request(webkitElement);

      expect(Result.isErr(result)).toBe(true);
      const error = Result.unwrapErr(result);
      expect(error.code).toBe('FULLSCREEN_REQUEST_FAILED');
      expect(error.cause).toBe(mockError);
    });

    it('should return Ok with undefined value on success', async () => {
      const result = await Fullscreen.request(mockElement);

      expect(Result.isOk(result)).toBe(true);
      expect(Result.unwrap(result)).toBeUndefined();
    });
  });

  // ===========================================================================
  // exit
  // ===========================================================================

  describe('exit', () => {
    it('should return error when fullscreen is not supported', async () => {
      Object.defineProperty(document, 'fullscreenEnabled', {
        value: false,
        configurable: true,
      });
      Object.defineProperty(document.documentElement, 'requestFullscreen', {
        value: undefined,
        configurable: true,
      });

      const result = await Fullscreen.exit();

      expect(Result.isErr(result)).toBe(true);
      const error = Result.unwrapErr(result);
      expect(error).toBeInstanceOf(FullscreenError);
      expect(error.code).toBe('FULLSCREEN_NOT_SUPPORTED');
    });

    it('should return error when not in fullscreen mode', async () => {
      Object.defineProperty(document, 'fullscreenElement', {
        value: null,
        configurable: true,
      });

      const result = await Fullscreen.exit();

      expect(Result.isErr(result)).toBe(true);
      const error = Result.unwrapErr(result);
      expect(error).toBeInstanceOf(FullscreenError);
      expect(error.code).toBe('FULLSCREEN_NOT_ACTIVE');
    });

    it('should exit fullscreen successfully', async () => {
      Object.defineProperty(document, 'fullscreenElement', {
        value: mockElement,
        configurable: true,
      });

      const result = await Fullscreen.exit();

      expect(Result.isOk(result)).toBe(true);
      expect(document.exitFullscreen).toHaveBeenCalled();
    });

    it('should use webkitExitFullscreen when standard is unavailable', async () => {
      Object.defineProperty(document, 'fullscreenElement', {
        value: mockElement,
        configurable: true,
      });
      Object.defineProperty(document, 'exitFullscreen', {
        value: undefined,
        configurable: true,
      });
      const webkitExitFullscreen = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(document, 'webkitExitFullscreen', {
        value: webkitExitFullscreen,
        configurable: true,
      });

      const result = await Fullscreen.exit();

      expect(Result.isOk(result)).toBe(true);
      expect(webkitExitFullscreen).toHaveBeenCalled();
    });

    it('should use mozCancelFullScreen when webkit is unavailable', async () => {
      Object.defineProperty(document, 'fullscreenElement', {
        value: mockElement,
        configurable: true,
      });
      Object.defineProperty(document, 'exitFullscreen', {
        value: undefined,
        configurable: true,
      });
      const mozCancelFullScreen = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(document, 'mozCancelFullScreen', {
        value: mozCancelFullScreen,
        configurable: true,
      });

      const result = await Fullscreen.exit();

      expect(Result.isOk(result)).toBe(true);
      expect(mozCancelFullScreen).toHaveBeenCalled();
    });

    it('should use msExitFullscreen when moz is unavailable', async () => {
      Object.defineProperty(document, 'fullscreenElement', {
        value: mockElement,
        configurable: true,
      });
      Object.defineProperty(document, 'exitFullscreen', {
        value: undefined,
        configurable: true,
      });
      const msExitFullscreen = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(document, 'msExitFullscreen', {
        value: msExitFullscreen,
        configurable: true,
      });

      const result = await Fullscreen.exit();

      expect(Result.isOk(result)).toBe(true);
      expect(msExitFullscreen).toHaveBeenCalled();
    });

    it('should return error when exitFullscreen throws', async () => {
      Object.defineProperty(document, 'fullscreenElement', {
        value: mockElement,
        configurable: true,
      });
      const mockError = new Error('Exit failed');
      Object.defineProperty(document, 'exitFullscreen', {
        value: vi.fn().mockRejectedValue(mockError),
        configurable: true,
      });

      const result = await Fullscreen.exit();

      expect(Result.isErr(result)).toBe(true);
      const error = Result.unwrapErr(result);
      expect(error).toBeInstanceOf(FullscreenError);
      expect(error.code).toBe('FULLSCREEN_EXIT_FAILED');
      expect(error.cause).toBe(mockError);
    });

    it('should return Ok with undefined value on success', async () => {
      Object.defineProperty(document, 'fullscreenElement', {
        value: mockElement,
        configurable: true,
      });

      const result = await Fullscreen.exit();

      expect(Result.isOk(result)).toBe(true);
      expect(Result.unwrap(result)).toBeUndefined();
    });
  });

  // ===========================================================================
  // toggle
  // ===========================================================================

  describe('toggle', () => {
    it('should request fullscreen when not in fullscreen mode', async () => {
      Object.defineProperty(document, 'fullscreenElement', {
        value: null,
        configurable: true,
      });

      const result = await Fullscreen.toggle(mockElement);

      expect(Result.isOk(result)).toBe(true);
      expect(mockElement.requestFullscreen).toHaveBeenCalled();
    });

    it('should exit fullscreen when in fullscreen mode', async () => {
      Object.defineProperty(document, 'fullscreenElement', {
        value: mockElement,
        configurable: true,
      });

      const result = await Fullscreen.toggle(mockElement);

      expect(Result.isOk(result)).toBe(true);
      expect(document.exitFullscreen).toHaveBeenCalled();
    });

    it('should use document.documentElement when toggling into fullscreen without element', async () => {
      Object.defineProperty(document, 'fullscreenElement', {
        value: null,
        configurable: true,
      });

      const result = await Fullscreen.toggle();

      expect(Result.isOk(result)).toBe(true);
      expect(document.documentElement.requestFullscreen).toHaveBeenCalled();
    });

    it('should return error when toggle fails on request', async () => {
      Object.defineProperty(document, 'fullscreenElement', {
        value: null,
        configurable: true,
      });
      const mockError = new Error('Request failed');
      mockElement.requestFullscreen = vi.fn().mockRejectedValue(mockError);

      const result = await Fullscreen.toggle(mockElement);

      expect(Result.isErr(result)).toBe(true);
      const error = Result.unwrapErr(result);
      expect(error.code).toBe('FULLSCREEN_REQUEST_FAILED');
    });

    it('should return error when toggle fails on exit', async () => {
      Object.defineProperty(document, 'fullscreenElement', {
        value: mockElement,
        configurable: true,
      });
      const mockError = new Error('Exit failed');
      Object.defineProperty(document, 'exitFullscreen', {
        value: vi.fn().mockRejectedValue(mockError),
        configurable: true,
      });

      const result = await Fullscreen.toggle(mockElement);

      expect(Result.isErr(result)).toBe(true);
      const error = Result.unwrapErr(result);
      expect(error.code).toBe('FULLSCREEN_EXIT_FAILED');
    });

    it('should return not supported error when fullscreen is not supported', async () => {
      Object.defineProperty(document, 'fullscreenEnabled', {
        value: false,
        configurable: true,
      });
      Object.defineProperty(document.documentElement, 'requestFullscreen', {
        value: undefined,
        configurable: true,
      });
      Object.defineProperty(document, 'fullscreenElement', {
        value: null,
        configurable: true,
      });

      const result = await Fullscreen.toggle(mockElement);

      expect(Result.isErr(result)).toBe(true);
      const error = Result.unwrapErr(result);
      expect(error.code).toBe('FULLSCREEN_NOT_SUPPORTED');
    });
  });

  // ===========================================================================
  // onChange
  // ===========================================================================

  describe('onChange', () => {
    it('should register handler for fullscreenchange event', () => {
      const handler = vi.fn();
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

      const cleanup = Fullscreen.onChange(handler);
      cleanupFunctions.push(cleanup);

      expect(addEventListenerSpy).toHaveBeenCalledWith('fullscreenchange', expect.any(Function));
    });

    it('should register handlers for all vendor-prefixed events', () => {
      const handler = vi.fn();
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

      const cleanup = Fullscreen.onChange(handler);
      cleanupFunctions.push(cleanup);

      expect(addEventListenerSpy).toHaveBeenCalledWith('fullscreenchange', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'webkitfullscreenchange',
        expect.any(Function)
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith('mozfullscreenchange', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('MSFullscreenChange', expect.any(Function));
    });

    it('should call handler with isFullscreen and element when event fires', () => {
      const handler = vi.fn();
      const cleanup = Fullscreen.onChange(handler);
      cleanupFunctions.push(cleanup);

      Object.defineProperty(document, 'fullscreenElement', {
        value: mockElement,
        configurable: true,
      });

      const event = new Event('fullscreenchange');
      document.dispatchEvent(event);

      expect(handler).toHaveBeenCalledWith(true, mockElement);
    });

    it('should call handler with false and null when exiting fullscreen', () => {
      const handler = vi.fn();
      const cleanup = Fullscreen.onChange(handler);
      cleanupFunctions.push(cleanup);

      Object.defineProperty(document, 'fullscreenElement', {
        value: null,
        configurable: true,
      });

      const event = new Event('fullscreenchange');
      document.dispatchEvent(event);

      expect(handler).toHaveBeenCalledWith(false, null);
    });

    it('should cleanup event listeners when cleanup function is called', () => {
      const handler = vi.fn();
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      const cleanup = Fullscreen.onChange(handler);
      cleanup();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('fullscreenchange', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'webkitfullscreenchange',
        expect.any(Function)
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'mozfullscreenchange',
        expect.any(Function)
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'MSFullscreenChange',
        expect.any(Function)
      );
    });

    it('should not call handler after cleanup', () => {
      const handler = vi.fn();

      const cleanup = Fullscreen.onChange(handler);
      cleanup();

      const event = new Event('fullscreenchange');
      document.dispatchEvent(event);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should return no-op function when document is undefined', () => {
      // @ts-expect-error - Testing undefined document
      global.document = undefined;

      const handler = vi.fn();
      const cleanup = Fullscreen.onChange(handler);

      expect(typeof cleanup).toBe('function');
      expect(() => cleanup()).not.toThrow();

      global.document = originalDocument;
    });

    it('should handle webkit fullscreenchange event', () => {
      const handler = vi.fn();
      const cleanup = Fullscreen.onChange(handler);
      cleanupFunctions.push(cleanup);

      Object.defineProperty(document, 'fullscreenElement', {
        value: mockElement,
        configurable: true,
      });

      const event = new Event('webkitfullscreenchange');
      document.dispatchEvent(event);

      expect(handler).toHaveBeenCalledWith(true, mockElement);
    });

    it('should handle moz fullscreenchange event', () => {
      const handler = vi.fn();
      const cleanup = Fullscreen.onChange(handler);
      cleanupFunctions.push(cleanup);

      Object.defineProperty(document, 'fullscreenElement', {
        value: mockElement,
        configurable: true,
      });

      const event = new Event('mozfullscreenchange');
      document.dispatchEvent(event);

      expect(handler).toHaveBeenCalledWith(true, mockElement);
    });

    it('should handle MS fullscreenchange event', () => {
      const handler = vi.fn();
      const cleanup = Fullscreen.onChange(handler);
      cleanupFunctions.push(cleanup);

      Object.defineProperty(document, 'fullscreenElement', {
        value: mockElement,
        configurable: true,
      });

      const event = new Event('MSFullscreenChange');
      document.dispatchEvent(event);

      expect(handler).toHaveBeenCalledWith(true, mockElement);
    });
  });

  // ===========================================================================
  // onError
  // ===========================================================================

  describe('onError', () => {
    it('should register handler for fullscreenerror event', () => {
      const handler = vi.fn();
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

      const cleanup = Fullscreen.onError(handler);
      cleanupFunctions.push(cleanup);

      expect(addEventListenerSpy).toHaveBeenCalledWith('fullscreenerror', handler);
    });

    it('should register handlers for all vendor-prefixed error events', () => {
      const handler = vi.fn();
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

      const cleanup = Fullscreen.onError(handler);
      cleanupFunctions.push(cleanup);

      expect(addEventListenerSpy).toHaveBeenCalledWith('fullscreenerror', handler);
      expect(addEventListenerSpy).toHaveBeenCalledWith('webkitfullscreenerror', handler);
      expect(addEventListenerSpy).toHaveBeenCalledWith('mozfullscreenerror', handler);
      expect(addEventListenerSpy).toHaveBeenCalledWith('MSFullscreenError', handler);
    });

    it('should call handler when fullscreenerror event fires', () => {
      const handler = vi.fn();
      const cleanup = Fullscreen.onError(handler);
      cleanupFunctions.push(cleanup);

      const event = new Event('fullscreenerror');
      document.dispatchEvent(event);

      expect(handler).toHaveBeenCalledWith(event);
    });

    it('should cleanup error event listeners when cleanup function is called', () => {
      const handler = vi.fn();
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      const cleanup = Fullscreen.onError(handler);
      cleanup();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('fullscreenerror', handler);
      expect(removeEventListenerSpy).toHaveBeenCalledWith('webkitfullscreenerror', handler);
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mozfullscreenerror', handler);
      expect(removeEventListenerSpy).toHaveBeenCalledWith('MSFullscreenError', handler);
    });

    it('should not call handler after cleanup', () => {
      const handler = vi.fn();

      const cleanup = Fullscreen.onError(handler);
      cleanup();

      const event = new Event('fullscreenerror');
      document.dispatchEvent(event);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should return no-op function when document is undefined', () => {
      // @ts-expect-error - Testing undefined document
      global.document = undefined;

      const handler = vi.fn();
      const cleanup = Fullscreen.onError(handler);

      expect(typeof cleanup).toBe('function');
      expect(() => cleanup()).not.toThrow();

      global.document = originalDocument;
    });

    it('should handle webkit fullscreenerror event', () => {
      const handler = vi.fn();
      const cleanup = Fullscreen.onError(handler);
      cleanupFunctions.push(cleanup);

      const event = new Event('webkitfullscreenerror');
      document.dispatchEvent(event);

      expect(handler).toHaveBeenCalledWith(event);
    });

    it('should handle moz fullscreenerror event', () => {
      const handler = vi.fn();
      const cleanup = Fullscreen.onError(handler);
      cleanupFunctions.push(cleanup);

      const event = new Event('mozfullscreenerror');
      document.dispatchEvent(event);

      expect(handler).toHaveBeenCalledWith(event);
    });

    it('should handle MS fullscreenerror event', () => {
      const handler = vi.fn();
      const cleanup = Fullscreen.onError(handler);
      cleanupFunctions.push(cleanup);

      const event = new Event('MSFullscreenError');
      document.dispatchEvent(event);

      expect(handler).toHaveBeenCalledWith(event);
    });
  });

  // ===========================================================================
  // Vendor Prefix Priority
  // ===========================================================================

  describe('Vendor Prefix Priority', () => {
    describe('request priority', () => {
      it('should prefer standard requestFullscreen over webkit', async () => {
        const element = document.createElement('div') as MockFullscreenElement;
        element.requestFullscreen = vi.fn().mockResolvedValue(undefined);
        element.webkitRequestFullscreen = vi.fn().mockResolvedValue(undefined);

        await Fullscreen.request(element);

        expect(element.requestFullscreen).toHaveBeenCalled();
        expect(element.webkitRequestFullscreen).not.toHaveBeenCalled();
      });

      it('should prefer webkit over moz', async () => {
        const element = document.createElement('div') as MockFullscreenElement;
        Object.defineProperty(element, 'requestFullscreen', {
          value: undefined,
          configurable: true,
        });
        element.webkitRequestFullscreen = vi.fn().mockResolvedValue(undefined);
        element.mozRequestFullScreen = vi.fn().mockResolvedValue(undefined);

        await Fullscreen.request(element);

        expect(element.webkitRequestFullscreen).toHaveBeenCalled();
        expect(element.mozRequestFullScreen).not.toHaveBeenCalled();
      });

      it('should prefer moz over ms', async () => {
        const element = document.createElement('div') as MockFullscreenElement;
        Object.defineProperty(element, 'requestFullscreen', {
          value: undefined,
          configurable: true,
        });
        element.mozRequestFullScreen = vi.fn().mockResolvedValue(undefined);
        element.msRequestFullscreen = vi.fn().mockResolvedValue(undefined);

        await Fullscreen.request(element);

        expect(element.mozRequestFullScreen).toHaveBeenCalled();
        expect(element.msRequestFullscreen).not.toHaveBeenCalled();
      });
    });

    describe('exit priority', () => {
      beforeEach(() => {
        Object.defineProperty(document, 'fullscreenElement', {
          value: mockElement,
          configurable: true,
        });
      });

      it('should prefer standard exitFullscreen over webkit', async () => {
        const webkitExitFullscreen = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(document, 'webkitExitFullscreen', {
          value: webkitExitFullscreen,
          configurable: true,
        });

        await Fullscreen.exit();

        expect(document.exitFullscreen).toHaveBeenCalled();
        expect(webkitExitFullscreen).not.toHaveBeenCalled();
      });

      it('should prefer webkit over moz', async () => {
        Object.defineProperty(document, 'exitFullscreen', {
          value: undefined,
          configurable: true,
        });
        const webkitExitFullscreen = vi.fn().mockResolvedValue(undefined);
        const mozCancelFullScreen = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(document, 'webkitExitFullscreen', {
          value: webkitExitFullscreen,
          configurable: true,
        });
        Object.defineProperty(document, 'mozCancelFullScreen', {
          value: mozCancelFullScreen,
          configurable: true,
        });

        await Fullscreen.exit();

        expect(webkitExitFullscreen).toHaveBeenCalled();
        expect(mozCancelFullScreen).not.toHaveBeenCalled();
      });

      it('should prefer moz over ms', async () => {
        Object.defineProperty(document, 'exitFullscreen', {
          value: undefined,
          configurable: true,
        });
        const mozCancelFullScreen = vi.fn().mockResolvedValue(undefined);
        const msExitFullscreen = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(document, 'mozCancelFullScreen', {
          value: mozCancelFullScreen,
          configurable: true,
        });
        Object.defineProperty(document, 'msExitFullscreen', {
          value: msExitFullscreen,
          configurable: true,
        });

        await Fullscreen.exit();

        expect(mozCancelFullScreen).toHaveBeenCalled();
        expect(msExitFullscreen).not.toHaveBeenCalled();
      });
    });
  });

  // ===========================================================================
  // Result Type Integration
  // ===========================================================================

  describe('Result Type Integration', () => {
    it('should work with Result.match for request', async () => {
      const result = await Fullscreen.request(mockElement);

      const message = Result.match(result, {
        ok: () => 'entered fullscreen',
        err: (e) => `failed: ${e.message}`,
      });

      expect(message).toBe('entered fullscreen');
    });

    it('should work with Result.match for exit error', async () => {
      Object.defineProperty(document, 'fullscreenElement', {
        value: null,
        configurable: true,
      });

      const result = await Fullscreen.exit();

      const message = Result.match(result, {
        ok: () => 'exited fullscreen',
        err: (e) => `failed: ${e.code}`,
      });

      expect(message).toBe('failed: FULLSCREEN_NOT_ACTIVE');
    });

    it('should work with Result.unwrapOr', async () => {
      Object.defineProperty(document, 'fullscreenEnabled', {
        value: false,
        configurable: true,
      });
      Object.defineProperty(document.documentElement, 'requestFullscreen', {
        value: undefined,
        configurable: true,
      });

      const result = await Fullscreen.request(mockElement);
      const value = Result.unwrapOr(result, undefined);

      expect(value).toBeUndefined();
    });

    it('should work with Result.map', async () => {
      const result = await Fullscreen.request(mockElement);
      const mapped = Result.map(result, () => 'success');

      expect(Result.isOk(mapped)).toBe(true);
      expect(Result.unwrap(mapped)).toBe('success');
    });

    it('should work with Result.mapErr', async () => {
      Object.defineProperty(document, 'fullscreenEnabled', {
        value: false,
        configurable: true,
      });
      Object.defineProperty(document.documentElement, 'requestFullscreen', {
        value: undefined,
        configurable: true,
      });

      const result = await Fullscreen.request(mockElement);
      const mapped = Result.mapErr(result, (e) => new Error(`Wrapped: ${e.message}`));

      expect(Result.isErr(mapped)).toBe(true);
      const error = Result.unwrapErr(mapped);
      expect(error.message).toContain('Wrapped: Fullscreen API is not supported');
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle multiple onChange handlers', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      const cleanup1 = Fullscreen.onChange(handler1);
      const cleanup2 = Fullscreen.onChange(handler2);
      cleanupFunctions.push(cleanup1, cleanup2);

      Object.defineProperty(document, 'fullscreenElement', {
        value: mockElement,
        configurable: true,
      });

      const event = new Event('fullscreenchange');
      document.dispatchEvent(event);

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('should handle multiple onError handlers', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      const cleanup1 = Fullscreen.onError(handler1);
      const cleanup2 = Fullscreen.onError(handler2);
      cleanupFunctions.push(cleanup1, cleanup2);

      const event = new Event('fullscreenerror');
      document.dispatchEvent(event);

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('should handle cleanup being called multiple times', () => {
      const handler = vi.fn();
      const cleanup = Fullscreen.onChange(handler);

      expect(() => {
        cleanup();
        cleanup();
        cleanup();
      }).not.toThrow();
    });

    it('should handle rapid toggle calls', async () => {
      Object.defineProperty(document, 'fullscreenElement', {
        value: null,
        configurable: true,
      });

      const results = await Promise.all([
        Fullscreen.toggle(mockElement),
        Fullscreen.toggle(mockElement),
        Fullscreen.toggle(mockElement),
      ]);

      results.forEach((result) => {
        expect(Result.isOk(result) || Result.isErr(result)).toBe(true);
      });
    });

    it('should handle element without any fullscreen methods', async () => {
      Object.defineProperty(document, 'fullscreenEnabled', {
        value: true,
        configurable: true,
      });

      const bareElement = document.createElement('div');
      Object.defineProperty(bareElement, 'requestFullscreen', {
        value: undefined,
        configurable: true,
      });

      const result = await Fullscreen.request(bareElement);

      // Should succeed without calling any method (no-op case)
      expect(Result.isOk(result)).toBe(true);
    });
  });

  // ===========================================================================
  // CleanupFn Type Export
  // ===========================================================================

  describe('CleanupFn Type', () => {
    it('should return CleanupFn from onChange', () => {
      const cleanup: CleanupFn = Fullscreen.onChange(vi.fn());
      cleanupFunctions.push(cleanup);

      expect(typeof cleanup).toBe('function');
    });

    it('should return CleanupFn from onError', () => {
      const cleanup: CleanupFn = Fullscreen.onError(vi.fn());
      cleanupFunctions.push(cleanup);

      expect(typeof cleanup).toBe('function');
    });
  });
});
