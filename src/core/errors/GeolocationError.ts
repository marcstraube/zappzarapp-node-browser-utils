/**
 * Geolocation Error for browser geolocation operations.
 *
 * Thrown when geolocation operations fail due to:
 * - Not supported
 * - Permission denied
 * - Position unavailable
 * - Timeout
 *
 * @example
 * ```TypeScript
 * const result = await GeolocationManager.getCurrentPositionResult();
 * if (Result.isErr(result)) {
 *   if (result.error.code === 'GEOLOCATION_PERMISSION_DENIED') {
 *     // User denied geolocation permission
 *   }
 * }
 * ```
 */
import { BrowserUtilsError } from './BrowserUtilsError.js';

export type GeolocationErrorCode =
  | 'GEOLOCATION_NOT_SUPPORTED'
  | 'GEOLOCATION_PERMISSION_DENIED'
  | 'GEOLOCATION_POSITION_UNAVAILABLE'
  | 'GEOLOCATION_TIMEOUT';

export class GeolocationError extends BrowserUtilsError {
  readonly code: GeolocationErrorCode;

  constructor(code: GeolocationErrorCode, message: string, cause?: unknown) {
    super(message, cause);
    this.code = code;
  }

  // =========================================================================
  // Factory Methods
  // =========================================================================

  /**
   * Geolocation API is not supported.
   */
  static notSupported(): GeolocationError {
    return new GeolocationError(
      'GEOLOCATION_NOT_SUPPORTED',
      'Geolocation API is not supported in this browser'
    );
  }

  /**
   * Geolocation permission was denied.
   */
  static permissionDenied(cause?: unknown): GeolocationError {
    return new GeolocationError(
      'GEOLOCATION_PERMISSION_DENIED',
      'Geolocation permission was denied',
      cause
    );
  }

  /**
   * Position information is unavailable.
   */
  static positionUnavailable(cause?: unknown): GeolocationError {
    return new GeolocationError(
      'GEOLOCATION_POSITION_UNAVAILABLE',
      'Geolocation position is unavailable',
      cause
    );
  }

  /**
   * Geolocation request timed out.
   */
  static timeout(cause?: unknown): GeolocationError {
    return new GeolocationError('GEOLOCATION_TIMEOUT', 'Geolocation request timed out', cause);
  }

  /**
   * Create error from GeolocationPositionError.
   */
  static fromPositionError(error: GeolocationPositionError): GeolocationError {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return GeolocationError.permissionDenied(error);
      case error.POSITION_UNAVAILABLE:
        return GeolocationError.positionUnavailable(error);
      case error.TIMEOUT:
        return GeolocationError.timeout(error);
      default:
        return GeolocationError.positionUnavailable(error);
    }
  }
}
