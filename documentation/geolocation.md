# Geolocation Manager

Promise-based wrapper for the browser Geolocation API with Result-based error
handling.

## Quick Start

```typescript
import { Result } from '@zappzarapp/browser-utils/core';
import {
  GeolocationManager,
  GeolocationError,
} from '@zappzarapp/browser-utils/geolocation';

// Check support first
if (GeolocationManager.isSupported()) {
  // Get current position
  const position = await GeolocationManager.getCurrentPosition();
  console.log(position.coords.latitude, position.coords.longitude);
}
```

## GeolocationManager

### Static Methods

| Method                                                    | Returns                                                  | Description                            |
| --------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------- |
| `isSupported()`                                           | `boolean`                                                | Check if Geolocation API is available  |
| `getCurrentPosition(options?)`                            | `Promise<GeolocationPosition>`                           | Get current position (throws on error) |
| `getCurrentPositionResult(options?)`                      | `Promise<Result<GeolocationPosition, GeolocationError>>` | Get position with Result type          |
| `watchPosition(handler, options?)`                        | `CleanupFn`                                              | Watch position changes                 |
| `watchPositionWithError(handler, errorHandler, options?)` | `CleanupFn`                                              | Watch with error handling              |

## Geolocation Options

```typescript
interface GeolocationOptions {
  /** Enable high accuracy mode (GPS). May be slower and use more power. */
  enableHighAccuracy?: boolean;

  /** Maximum time in milliseconds to wait for a position. */
  timeout?: number;

  /** Maximum age in milliseconds of a cached position. */
  maximumAge?: number;
}
```

| Option               | Type      | Default  | Description                           |
| -------------------- | --------- | -------- | ------------------------------------- |
| `enableHighAccuracy` | `boolean` | `false`  | Request high accuracy (GPS)           |
| `timeout`            | `number`  | Infinity | Max wait time in ms                   |
| `maximumAge`         | `number`  | `0`      | Accept cached position up to this age |

## Usage Examples

### Get Current Position

```typescript
// Simple usage (throws on error)
try {
  const position = await GeolocationManager.getCurrentPosition();
  console.log('Latitude:', position.coords.latitude);
  console.log('Longitude:', position.coords.longitude);
  console.log('Accuracy:', position.coords.accuracy, 'meters');
} catch (error) {
  if (error instanceof GeolocationError) {
    console.error('Geolocation failed:', error.code, error.message);
  }
}
```

### Result-Based Error Handling

```typescript
import { Result } from '@zappzarapp/browser-utils/core';
import {
  GeolocationManager,
  GeolocationError,
} from '@zappzarapp/browser-utils/geolocation';

const result = await GeolocationManager.getCurrentPositionResult();

if (Result.isOk(result)) {
  const { latitude, longitude } = result.value.coords;
  console.log(`Location: ${latitude}, ${longitude}`);
} else {
  switch (result.error.code) {
    case 'GEOLOCATION_PERMISSION_DENIED':
      showMessage('Please enable location permissions');
      break;
    case 'GEOLOCATION_POSITION_UNAVAILABLE':
      showMessage('Could not determine your location');
      break;
    case 'GEOLOCATION_TIMEOUT':
      showMessage('Location request timed out');
      break;
    case 'GEOLOCATION_NOT_SUPPORTED':
      showMessage('Geolocation is not supported');
      break;
  }
}
```

### High Accuracy Mode

```typescript
// Request GPS-level accuracy
const position = await GeolocationManager.getCurrentPosition({
  enableHighAccuracy: true,
  timeout: 10000, // 10 second timeout
  maximumAge: 0, // Don't use cached position
});

// High accuracy provides better precision but:
// - Takes longer to acquire
// - Uses more battery
// - May not work indoors
console.log('Accuracy:', position.coords.accuracy, 'meters');
```

### Watch Position Changes

```typescript
// Start watching (returns cleanup function)
const stopWatching = GeolocationManager.watchPosition((position) => {
  console.log(
    'New position:',
    position.coords.latitude,
    position.coords.longitude
  );
  updateMapMarker(position);
});

// Stop watching when done
document.getElementById('stop-btn')?.addEventListener('click', () => {
  stopWatching();
});
```

### Watch with Error Handling

```typescript
const stopWatching = GeolocationManager.watchPositionWithError(
  // Success handler
  (position) => {
    updateLocation(position.coords);
  },
  // Error handler
  (error) => {
    switch (error.code) {
      case 'GEOLOCATION_PERMISSION_DENIED':
        showError('Location access was denied');
        stopWatching();
        break;
      case 'GEOLOCATION_POSITION_UNAVAILABLE':
        showError('Location temporarily unavailable');
        break;
      case 'GEOLOCATION_TIMEOUT':
        showError('Location request timed out');
        break;
    }
  },
  // Options
  {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 30000, // Accept 30-second old cached positions
  }
);
```

### Check Support Before Use

```typescript
function initializeLocationFeature(): void {
  if (!GeolocationManager.isSupported()) {
    showFallback('Geolocation is not supported in your browser');
    return;
  }

  // Safe to use geolocation
  enableLocationButton();
}
```

### Complete Example: Location Tracker

```typescript
import { Result } from '@zappzarapp/browser-utils/core';
import {
  GeolocationManager,
  GeolocationError,
} from '@zappzarapp/browser-utils/geolocation';

class LocationTracker {
  private cleanup: (() => void) | null = null;

  async start(): Promise<void> {
    if (!GeolocationManager.isSupported()) {
      throw new Error('Geolocation not supported');
    }

    // Get initial position
    const result = await GeolocationManager.getCurrentPositionResult({
      enableHighAccuracy: true,
      timeout: 10000,
    });

    if (Result.isErr(result)) {
      throw new Error(`Initial position failed: ${result.error.message}`);
    }

    this.onPosition(result.value);

    // Start watching
    this.cleanup = GeolocationManager.watchPositionWithError(
      (position) => this.onPosition(position),
      (error) => this.onError(error),
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }

  stop(): void {
    if (this.cleanup) {
      this.cleanup();
      this.cleanup = null;
    }
  }

  private onPosition(position: GeolocationPosition): void {
    console.log('Position update:', {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: new Date(position.timestamp),
    });
  }

  private onError(error: GeolocationError): void {
    console.error('Position error:', error.code, error.message);
  }
}
```

## GeolocationError

### Error Codes

| Code                               | Description                      |
| ---------------------------------- | -------------------------------- |
| `GEOLOCATION_NOT_SUPPORTED`        | Geolocation API not available    |
| `GEOLOCATION_PERMISSION_DENIED`    | User denied location permission  |
| `GEOLOCATION_POSITION_UNAVAILABLE` | Position could not be determined |
| `GEOLOCATION_TIMEOUT`              | Request exceeded timeout         |

### Error Properties

```typescript
interface GeolocationError extends BrowserUtilsError {
  readonly code: GeolocationErrorCode;
  readonly message: string;
  readonly cause?: unknown;
}
```

## Position Data

The `GeolocationPosition` object returned follows the standard Web API:

```typescript
interface GeolocationPosition {
  readonly coords: {
    /** Latitude in decimal degrees */
    readonly latitude: number;
    /** Longitude in decimal degrees */
    readonly longitude: number;
    /** Accuracy in meters */
    readonly accuracy: number;
    /** Altitude in meters (may be null) */
    readonly altitude: number | null;
    /** Altitude accuracy in meters (may be null) */
    readonly altitudeAccuracy: number | null;
    /** Heading in degrees (0-360, may be null) */
    readonly heading: number | null;
    /** Speed in meters/second (may be null) */
    readonly speed: number | null;
  };
  /** Timestamp when position was acquired */
  readonly timestamp: number;
}
```

## Security Considerations

1. **HTTPS Required** - Geolocation only works on secure origins (HTTPS) in
   modern browsers. localhost is an exception for development.

2. **User Permission** - The browser will prompt the user for permission. Handle
   `GEOLOCATION_PERMISSION_DENIED` gracefully.

3. **Privacy** - Location data is sensitive. Only request it when needed and
   explain why you need it to users.

4. **Data Handling** - Avoid storing precise location data unnecessarily.
   Consider reducing precision for storage.

5. **Watch Mode Resources** - `watchPosition` continuously queries location and
   can drain battery. Always call the cleanup function when done.

## Browser Support

| Browser      | Support | Notes                           |
| ------------ | ------- | ------------------------------- |
| Chrome 5+    | Yes     | HTTPS required since Chrome 50  |
| Firefox 3.5+ | Yes     | HTTPS required since Firefox 55 |
| Safari 5+    | Yes     | HTTPS required since Safari 10  |
| Edge 12+     | Yes     | HTTPS required                  |
| IE 9+        | Yes     | Limited accuracy                |

### Mobile Considerations

- iOS: App must have location permission in addition to browser
- Android: High accuracy requires GPS enabled
- Both: Battery impact significant with `enableHighAccuracy: true`

## Types

```typescript
interface GeolocationOptions {
  readonly enableHighAccuracy?: boolean;
  readonly timeout?: number;
  readonly maximumAge?: number;
}

type GeolocationErrorCode =
  | 'GEOLOCATION_NOT_SUPPORTED'
  | 'GEOLOCATION_PERMISSION_DENIED'
  | 'GEOLOCATION_POSITION_UNAVAILABLE'
  | 'GEOLOCATION_TIMEOUT';

type CleanupFn = () => void;
```
