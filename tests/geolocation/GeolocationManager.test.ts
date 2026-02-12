import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GeolocationManager } from '../../src/geolocation/index.js';
import { GeolocationError, Result } from '../../src/core/index.js';

/**
 * Create a mock GeolocationPosition for testing.
 */
function createMockPosition(
  overrides?: Partial<Omit<GeolocationCoordinates, 'toJSON'>>
): GeolocationPosition {
  const baseCoords = {
    latitude: 52.52,
    longitude: 13.405,
    altitude: null,
    accuracy: 100,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
    ...overrides,
  };
  const coords: GeolocationCoordinates = {
    ...baseCoords,
    toJSON(): object {
      return {
        latitude: baseCoords.latitude,
        longitude: baseCoords.longitude,
        altitude: baseCoords.altitude,
        accuracy: baseCoords.accuracy,
        altitudeAccuracy: baseCoords.altitudeAccuracy,
        heading: baseCoords.heading,
        speed: baseCoords.speed,
      };
    },
  };

  return {
    coords,
    timestamp: Date.now(),
    toJSON(): object {
      return {
        coords: this.coords.toJSON(),
        timestamp: this.timestamp,
      };
    },
  };
}

/**
 * Create a mock GeolocationPositionError for testing.
 */
function createMockPositionError(
  code: number,
  message: string = 'Mock error'
): GeolocationPositionError {
  const error = {
    code,
    message,
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
  };
  return error as GeolocationPositionError;
}

describe('GeolocationManager', () => {
  let originalNavigator: typeof navigator;
  let mockGeolocation: {
    getCurrentPosition: ReturnType<typeof vi.fn>;
    watchPosition: ReturnType<typeof vi.fn>;
    clearWatch: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    originalNavigator = navigator;

    mockGeolocation = {
      getCurrentPosition: vi.fn(),
      watchPosition: vi.fn().mockReturnValue(1),
      clearWatch: vi.fn(),
    };

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        ...originalNavigator,
        geolocation: mockGeolocation,
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
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
    it('should return true when geolocation is available', () => {
      expect(GeolocationManager.isSupported()).toBe(true);
    });

    it('should return false when navigator is undefined', () => {
      // @ts-expect-error - intentionally deleting for test
      delete globalThis.navigator;

      expect(GeolocationManager.isSupported()).toBe(false);
    });

    it('should return false when geolocation is not in navigator', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      });

      expect(GeolocationManager.isSupported()).toBe(false);
    });
  });

  // ===========================================================================
  // getCurrentPosition
  // ===========================================================================

  describe('getCurrentPosition', () => {
    it('should resolve with position on success', async () => {
      const mockPosition = createMockPosition();

      mockGeolocation.getCurrentPosition.mockImplementation((success: PositionCallback) => {
        success(mockPosition);
      });

      const position = await GeolocationManager.getCurrentPosition();

      expect(position.coords.latitude).toBe(52.52);
      expect(position.coords.longitude).toBe(13.405);
    });

    it('should pass options to getCurrentPosition', async () => {
      const mockPosition = createMockPosition();
      const options = {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success: PositionCallback) => {
        success(mockPosition);
      });

      await GeolocationManager.getCurrentPosition(options);

      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        options
      );
    });

    it('should reject with GeolocationError when not supported', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      });

      await expect(GeolocationManager.getCurrentPosition()).rejects.toThrow(GeolocationError);

      try {
        await GeolocationManager.getCurrentPosition();
      } catch (error) {
        expect(error).toBeInstanceOf(GeolocationError);
        expect((error as GeolocationError).code).toBe('GEOLOCATION_NOT_SUPPORTED');
      }
    });

    it('should reject with permission denied error', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation(
        (_success: PositionCallback, error: PositionErrorCallback) => {
          error(createMockPositionError(1, 'Permission denied'));
        }
      );

      await expect(GeolocationManager.getCurrentPosition()).rejects.toThrow(GeolocationError);

      try {
        await GeolocationManager.getCurrentPosition();
      } catch (error) {
        expect(error).toBeInstanceOf(GeolocationError);
        expect((error as GeolocationError).code).toBe('GEOLOCATION_PERMISSION_DENIED');
      }
    });

    it('should reject with position unavailable error', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation(
        (_success: PositionCallback, error: PositionErrorCallback) => {
          error(createMockPositionError(2, 'Position unavailable'));
        }
      );

      await expect(GeolocationManager.getCurrentPosition()).rejects.toThrow(GeolocationError);

      try {
        await GeolocationManager.getCurrentPosition();
      } catch (error) {
        expect(error).toBeInstanceOf(GeolocationError);
        expect((error as GeolocationError).code).toBe('GEOLOCATION_POSITION_UNAVAILABLE');
      }
    });

    it('should reject with timeout error', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation(
        (_success: PositionCallback, error: PositionErrorCallback) => {
          error(createMockPositionError(3, 'Timeout'));
        }
      );

      await expect(GeolocationManager.getCurrentPosition()).rejects.toThrow(GeolocationError);

      try {
        await GeolocationManager.getCurrentPosition();
      } catch (error) {
        expect(error).toBeInstanceOf(GeolocationError);
        expect((error as GeolocationError).code).toBe('GEOLOCATION_TIMEOUT');
      }
    });

    it('should handle unknown error code', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation(
        (_success: PositionCallback, error: PositionErrorCallback) => {
          error(createMockPositionError(99, 'Unknown error'));
        }
      );

      await expect(GeolocationManager.getCurrentPosition()).rejects.toThrow(GeolocationError);

      try {
        await GeolocationManager.getCurrentPosition();
      } catch (error) {
        expect(error).toBeInstanceOf(GeolocationError);
        expect((error as GeolocationError).code).toBe('GEOLOCATION_POSITION_UNAVAILABLE');
      }
    });
  });

  // ===========================================================================
  // getCurrentPositionResult
  // ===========================================================================

  describe('getCurrentPositionResult', () => {
    it('should return Ok with position on success', async () => {
      const mockPosition = createMockPosition();

      mockGeolocation.getCurrentPosition.mockImplementation((success: PositionCallback) => {
        success(mockPosition);
      });

      const result = await GeolocationManager.getCurrentPositionResult();

      expect(Result.isOk(result)).toBe(true);
      expect(Result.unwrap(result).coords.latitude).toBe(52.52);
    });

    it('should pass options to getCurrentPositionResult', async () => {
      const mockPosition = createMockPosition();
      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success: PositionCallback) => {
        success(mockPosition);
      });

      await GeolocationManager.getCurrentPositionResult(options);

      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        options
      );
    });

    it('should return Err when not supported', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      });

      const result = await GeolocationManager.getCurrentPositionResult();

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result)).toBeInstanceOf(GeolocationError);
      expect(Result.unwrapErr(result).code).toBe('GEOLOCATION_NOT_SUPPORTED');
    });

    it('should return Err with permission denied', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation(
        (_success: PositionCallback, error: PositionErrorCallback) => {
          error(createMockPositionError(1));
        }
      );

      const result = await GeolocationManager.getCurrentPositionResult();

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result).code).toBe('GEOLOCATION_PERMISSION_DENIED');
    });

    it('should return Err with position unavailable', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation(
        (_success: PositionCallback, error: PositionErrorCallback) => {
          error(createMockPositionError(2));
        }
      );

      const result = await GeolocationManager.getCurrentPositionResult();

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result).code).toBe('GEOLOCATION_POSITION_UNAVAILABLE');
    });

    it('should return Err with timeout', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation(
        (_success: PositionCallback, error: PositionErrorCallback) => {
          error(createMockPositionError(3));
        }
      );

      const result = await GeolocationManager.getCurrentPositionResult();

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result).code).toBe('GEOLOCATION_TIMEOUT');
    });

    it('should handle non-GeolocationError exceptions', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await GeolocationManager.getCurrentPositionResult();

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result).code).toBe('GEOLOCATION_POSITION_UNAVAILABLE');
    });
  });

  // ===========================================================================
  // watchPosition
  // ===========================================================================

  describe('watchPosition', () => {
    it('should call handler with position updates', () => {
      const mockPosition = createMockPosition();
      const handler = vi.fn();

      mockGeolocation.watchPosition.mockImplementation((success: PositionCallback) => {
        success(mockPosition);
        return 1;
      });

      GeolocationManager.watchPosition(handler);

      expect(handler).toHaveBeenCalledWith(mockPosition);
    });

    it('should pass options to watchPosition', () => {
      const handler = vi.fn();
      const options = {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      };

      GeolocationManager.watchPosition(handler, options);

      expect(mockGeolocation.watchPosition).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        options
      );
    });

    it('should return cleanup function that clears watch', () => {
      const handler = vi.fn();
      mockGeolocation.watchPosition.mockReturnValue(42);

      const cleanup = GeolocationManager.watchPosition(handler);

      expect(typeof cleanup).toBe('function');

      cleanup();

      expect(mockGeolocation.clearWatch).toHaveBeenCalledWith(42);
    });

    it('should return no-op cleanup when not supported', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      });

      const handler = vi.fn();
      const cleanup = GeolocationManager.watchPosition(handler);

      expect(typeof cleanup).toBe('function');
      expect(() => cleanup()).not.toThrow();
    });

    it('should silently ignore errors in watch mode', () => {
      const handler = vi.fn();

      mockGeolocation.watchPosition.mockImplementation(
        (_success: PositionCallback, error: PositionErrorCallback) => {
          error(createMockPositionError(1));
          return 1;
        }
      );

      // Should not throw
      expect(() => GeolocationManager.watchPosition(handler)).not.toThrow();
    });

    it('should call handler multiple times for position updates', () => {
      const positions = [
        createMockPosition({ latitude: 52.52, longitude: 13.405 }),
        createMockPosition({ latitude: 48.8566, longitude: 2.3522 }),
      ];
      const handler = vi.fn();
      let successCallback: PositionCallback;

      mockGeolocation.watchPosition.mockImplementation((success: PositionCallback) => {
        successCallback = success;
        return 1;
      });

      GeolocationManager.watchPosition(handler);

      // Simulate multiple position updates
      successCallback!(positions[0]!);
      successCallback!(positions[1]!);

      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenNthCalledWith(1, positions[0]);
      expect(handler).toHaveBeenNthCalledWith(2, positions[1]);
    });
  });

  // ===========================================================================
  // watchPositionWithError
  // ===========================================================================

  describe('watchPositionWithError', () => {
    it('should call handler with position updates', () => {
      const mockPosition = createMockPosition();
      const handler = vi.fn();
      const errorHandler = vi.fn();

      mockGeolocation.watchPosition.mockImplementation((success: PositionCallback) => {
        success(mockPosition);
        return 1;
      });

      GeolocationManager.watchPositionWithError(handler, errorHandler);

      expect(handler).toHaveBeenCalledWith(mockPosition);
      expect(errorHandler).not.toHaveBeenCalled();
    });

    it('should call errorHandler on errors', () => {
      const handler = vi.fn();
      const errorHandler = vi.fn();

      mockGeolocation.watchPosition.mockImplementation(
        (_success: PositionCallback, error: PositionErrorCallback) => {
          error(createMockPositionError(1));
          return 1;
        }
      );

      GeolocationManager.watchPositionWithError(handler, errorHandler);

      expect(handler).not.toHaveBeenCalled();
      expect(errorHandler).toHaveBeenCalled();
      expect(errorHandler.mock.calls[0]![0]).toBeInstanceOf(GeolocationError);
      expect(errorHandler.mock.calls[0]![0].code).toBe('GEOLOCATION_PERMISSION_DENIED');
    });

    it('should pass options to watchPosition', () => {
      const handler = vi.fn();
      const errorHandler = vi.fn();
      const options = {
        enableHighAccuracy: false,
        timeout: 30000,
        maximumAge: 1000,
      };

      GeolocationManager.watchPositionWithError(handler, errorHandler, options);

      expect(mockGeolocation.watchPosition).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        options
      );
    });

    it('should return cleanup function that clears watch', () => {
      const handler = vi.fn();
      const errorHandler = vi.fn();
      mockGeolocation.watchPosition.mockReturnValue(123);

      const cleanup = GeolocationManager.watchPositionWithError(handler, errorHandler);

      cleanup();

      expect(mockGeolocation.clearWatch).toHaveBeenCalledWith(123);
    });

    it('should call errorHandler when not supported', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      });

      const handler = vi.fn();
      const errorHandler = vi.fn();

      const cleanup = GeolocationManager.watchPositionWithError(handler, errorHandler);

      expect(errorHandler).toHaveBeenCalled();
      expect(errorHandler.mock.calls[0]![0]).toBeInstanceOf(GeolocationError);
      expect(errorHandler.mock.calls[0]![0].code).toBe('GEOLOCATION_NOT_SUPPORTED');

      // Cleanup should still work
      expect(() => cleanup()).not.toThrow();
    });

    it('should handle position unavailable error', () => {
      const handler = vi.fn();
      const errorHandler = vi.fn();

      mockGeolocation.watchPosition.mockImplementation(
        (_success: PositionCallback, error: PositionErrorCallback) => {
          error(createMockPositionError(2));
          return 1;
        }
      );

      GeolocationManager.watchPositionWithError(handler, errorHandler);

      expect(errorHandler.mock.calls[0]![0].code).toBe('GEOLOCATION_POSITION_UNAVAILABLE');
    });

    it('should handle timeout error', () => {
      const handler = vi.fn();
      const errorHandler = vi.fn();

      mockGeolocation.watchPosition.mockImplementation(
        (_success: PositionCallback, error: PositionErrorCallback) => {
          error(createMockPositionError(3));
          return 1;
        }
      );

      GeolocationManager.watchPositionWithError(handler, errorHandler);

      expect(errorHandler.mock.calls[0]![0].code).toBe('GEOLOCATION_TIMEOUT');
    });
  });
});

// ===========================================================================
// GeolocationError
// ===========================================================================

describe('GeolocationError', () => {
  describe('constructor', () => {
    it('should create error with code and message', () => {
      const error = new GeolocationError(
        'GEOLOCATION_NOT_SUPPORTED',
        'Geolocation is not supported'
      );

      expect(error.code).toBe('GEOLOCATION_NOT_SUPPORTED');
      expect(error.message).toBe('Geolocation is not supported');
      expect(error.name).toBe('GeolocationError');
    });

    it('should create error with cause', () => {
      const cause = new Error('Original error');
      const error = new GeolocationError(
        'GEOLOCATION_PERMISSION_DENIED',
        'Permission denied',
        cause
      );

      expect(error.cause).toBe(cause);
    });
  });

  describe('factory methods', () => {
    it('should create notSupported error', () => {
      const error = GeolocationError.notSupported();

      expect(error.code).toBe('GEOLOCATION_NOT_SUPPORTED');
      expect(error.message).toContain('not supported');
    });

    it('should create permissionDenied error', () => {
      const error = GeolocationError.permissionDenied();

      expect(error.code).toBe('GEOLOCATION_PERMISSION_DENIED');
      expect(error.message).toContain('denied');
    });

    it('should create permissionDenied error with cause', () => {
      const cause = new Error('User denied');
      const error = GeolocationError.permissionDenied(cause);

      expect(error.cause).toBe(cause);
    });

    it('should create positionUnavailable error', () => {
      const error = GeolocationError.positionUnavailable();

      expect(error.code).toBe('GEOLOCATION_POSITION_UNAVAILABLE');
      expect(error.message).toContain('unavailable');
    });

    it('should create positionUnavailable error with cause', () => {
      const cause = new Error('GPS off');
      const error = GeolocationError.positionUnavailable(cause);

      expect(error.cause).toBe(cause);
    });

    it('should create timeout error', () => {
      const error = GeolocationError.timeout();

      expect(error.code).toBe('GEOLOCATION_TIMEOUT');
      expect(error.message).toContain('timed out');
    });

    it('should create timeout error with cause', () => {
      const cause = new Error('Request timed out');
      const error = GeolocationError.timeout(cause);

      expect(error.cause).toBe(cause);
    });
  });

  describe('fromPositionError', () => {
    it('should create permission denied error from code 1', () => {
      const positionError = createMockPositionError(1);
      const error = GeolocationError.fromPositionError(positionError);

      expect(error.code).toBe('GEOLOCATION_PERMISSION_DENIED');
      expect(error.cause).toBe(positionError);
    });

    it('should create position unavailable error from code 2', () => {
      const positionError = createMockPositionError(2);
      const error = GeolocationError.fromPositionError(positionError);

      expect(error.code).toBe('GEOLOCATION_POSITION_UNAVAILABLE');
      expect(error.cause).toBe(positionError);
    });

    it('should create timeout error from code 3', () => {
      const positionError = createMockPositionError(3);
      const error = GeolocationError.fromPositionError(positionError);

      expect(error.code).toBe('GEOLOCATION_TIMEOUT');
      expect(error.cause).toBe(positionError);
    });

    it('should create position unavailable error from unknown code', () => {
      const positionError = createMockPositionError(99);
      const error = GeolocationError.fromPositionError(positionError);

      expect(error.code).toBe('GEOLOCATION_POSITION_UNAVAILABLE');
      expect(error.cause).toBe(positionError);
    });
  });

  describe('inheritance', () => {
    it('should be instanceof Error', () => {
      const error = GeolocationError.notSupported();

      expect(error).toBeInstanceOf(Error);
    });

    it('should be instanceof GeolocationError', () => {
      const error = GeolocationError.notSupported();

      expect(error).toBeInstanceOf(GeolocationError);
    });

    it('should have toFormattedString method', () => {
      const error = GeolocationError.notSupported();
      const formatted = error.toFormattedString();

      expect(formatted).toContain('GEOLOCATION_NOT_SUPPORTED');
      expect(formatted).toContain('not supported');
    });
  });
});
