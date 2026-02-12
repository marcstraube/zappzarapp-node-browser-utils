// noinspection JSUnusedGlobalSymbols - Example file

/**
 * Geolocation Tracker Example - Location tracking with error handling
 *
 * This example demonstrates:
 * - Getting current position with promise-based API
 * - Result-based error handling (no exceptions)
 * - Continuous position tracking with watchPosition
 * - Proper error handling for permission, timeout, and availability
 * - Building a location history tracker
 * - Distance calculation between coordinates
 * - Geofencing (detecting entry/exit from areas)
 *
 * @packageDocumentation
 */

import { Result, GeolocationError, type CleanupFn } from '@zappzarapp/browser-utils/core';
import { GeolocationManager } from '@zappzarapp/browser-utils/geolocation';
import { StorageManager } from '@zappzarapp/browser-utils/storage';
import { Logger } from '@zappzarapp/browser-utils/logging';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Simplified location point.
 */
interface LocationPoint {
  readonly latitude: number;
  readonly longitude: number;
  readonly accuracy: number;
  readonly timestamp: number;
}

/**
 * Location with additional metadata.
 */
interface TrackedLocation extends LocationPoint {
  readonly altitude: number | null;
  readonly speed: number | null;
  readonly heading: number | null;
}

/**
 * Geofence definition.
 */
interface Geofence {
  readonly id: string;
  readonly name: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly radiusMeters: number;
}

/**
 * Geofence event type.
 */
type GeofenceEvent = 'enter' | 'exit' | 'dwell';

// =============================================================================
// Basic Usage
// =============================================================================

/**
 * Basic geolocation usage with promise API.
 */
async function basicUsageExample(): Promise<void> {
  console.log('--- Basic Geolocation Usage ---');

  // Check if geolocation is supported
  if (!GeolocationManager.isSupported()) {
    console.error('Geolocation is not supported in this browser');
    return;
  }

  console.log('Geolocation is supported');

  // Get current position (throws on error)
  try {
    const position = await GeolocationManager.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000, // 10 seconds
      maximumAge: 60000, // Accept cached position up to 1 minute old
    });

    console.log('Current position:');
    console.log(`  Latitude: ${position.coords.latitude}`);
    console.log(`  Longitude: ${position.coords.longitude}`);
    console.log(`  Accuracy: ${position.coords.accuracy} meters`);
    console.log(`  Timestamp: ${new Date(position.timestamp).toISOString()}`);

    if (position.coords.altitude !== null) {
      console.log(`  Altitude: ${position.coords.altitude} meters`);
    }
  } catch (error) {
    if (error instanceof GeolocationError) {
      handleGeolocationError(error);
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

/**
 * Handle geolocation errors with specific messages.
 */
function handleGeolocationError(error: GeolocationError): void {
  switch (error.code) {
    case 'GEOLOCATION_NOT_SUPPORTED':
      console.error('Geolocation is not supported by this browser');
      break;
    case 'GEOLOCATION_PERMISSION_DENIED':
      console.error('Location permission was denied. Please enable it in browser settings.');
      break;
    case 'GEOLOCATION_POSITION_UNAVAILABLE':
      console.error('Location information is unavailable. Check your device GPS.');
      break;
    case 'GEOLOCATION_TIMEOUT':
      console.error('Location request timed out. Try moving to an area with better signal.');
      break;
    default:
      console.error('Unknown geolocation error:', error.message);
  }
}

// =============================================================================
// Result-Based Error Handling
// =============================================================================

/**
 * Using Result API for explicit error handling without exceptions.
 */
async function resultBasedExample(): Promise<void> {
  console.log('\n--- Result-Based Error Handling ---');

  // Get position using Result API (never throws)
  const result = await GeolocationManager.getCurrentPositionResult({
    enableHighAccuracy: true,
    timeout: 5000,
  });

  if (Result.isOk(result)) {
    const position = result.value;
    console.log(`Position: ${position.coords.latitude}, ${position.coords.longitude}`);
    console.log(`Accuracy: ${position.coords.accuracy} meters`);
  } else {
    const error = result.error;
    console.error(`Geolocation failed: ${error.code}`);

    // Handle specific error cases
    if (error.code === 'GEOLOCATION_PERMISSION_DENIED') {
      // Show permission request UI
      showPermissionRequest();
    } else if (error.code === 'GEOLOCATION_TIMEOUT') {
      // Retry with longer timeout
      console.log('Retrying with longer timeout...');
      const retryResult = await GeolocationManager.getCurrentPositionResult({
        timeout: 30000,
      });

      if (Result.isOk(retryResult)) {
        console.log('Retry successful!');
      }
    }
  }
}

/**
 * Show permission request UI (placeholder).
 */
function showPermissionRequest(): void {
  console.log('UI: Please enable location permission to use this feature');
  // In a real app, show a modal or banner explaining why location is needed
}

// =============================================================================
// Continuous Tracking
// =============================================================================

/**
 * Watch position changes continuously.
 */
function continuousTrackingExample(): CleanupFn {
  console.log('\n--- Continuous Position Tracking ---');

  if (!GeolocationManager.isSupported()) {
    console.error('Geolocation not supported');
    return () => {};
  }

  console.log('Starting position tracking...');

  // Track positions with cleanup
  const cleanup = GeolocationManager.watchPositionWithError(
    (position) => {
      // Success handler - called on each position update
      console.log(
        `Position update: ${position.coords.latitude.toFixed(6)}, ` +
          `${position.coords.longitude.toFixed(6)} ` +
          `(accuracy: ${position.coords.accuracy.toFixed(1)}m)`
      );
    },
    (error) => {
      // Error handler - called when tracking fails
      console.error(`Tracking error: ${error.code}`);
      handleGeolocationError(error);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 0, // Always get fresh position
      timeout: 10000,
    }
  );

  console.log('Tracking started. Call cleanup() to stop.');

  // Return cleanup function to stop tracking
  return cleanup;
}

// =============================================================================
// Location History Tracker
// =============================================================================

/**
 * A location tracker that records position history.
 */
class LocationTracker {
  private readonly storage: ReturnType<typeof StorageManager.create<TrackedLocation[]>>;
  private readonly logger: ReturnType<typeof Logger.create>;
  private cleanupFn: CleanupFn | null = null;
  private readonly history: TrackedLocation[] = [];
  private readonly maxHistorySize: number;
  private onLocationCallback?: (location: TrackedLocation) => void;
  private onErrorCallback?: (error: GeolocationError) => void;

  constructor(options: { maxHistorySize?: number; storagePrefix?: string } = {}) {
    this.maxHistorySize = options.maxHistorySize ?? 100;

    this.storage = StorageManager.create({
      prefix: options.storagePrefix ?? 'locationTracker',
    });

    this.logger = Logger.create({
      prefix: '[LocationTracker]',
      level: 1, // Info
    });

    // Load existing history from storage
    const saved = this.storage.get('history');
    if (saved !== null) {
      this.history.push(...saved);
      this.logger.info(`Loaded ${this.history.length} locations from storage`);
    }
  }

  /**
   * Start tracking location.
   */
  start(): void {
    if (!GeolocationManager.isSupported()) {
      this.logger.error('Geolocation not supported');
      return;
    }

    if (this.cleanupFn !== null) {
      this.logger.warn('Already tracking');
      return;
    }

    this.logger.info('Starting location tracking');

    this.cleanupFn = GeolocationManager.watchPositionWithError(
      (position) => this.handlePosition(position),
      (error) => this.handleError(error),
      {
        enableHighAccuracy: true,
        maximumAge: 5000, // Accept positions up to 5 seconds old
        timeout: 30000,
      }
    );
  }

  /**
   * Stop tracking location.
   */
  stop(): void {
    if (this.cleanupFn !== null) {
      this.cleanupFn();
      this.cleanupFn = null;
      this.logger.info('Stopped location tracking');
    }
  }

  /**
   * Get current tracking state.
   */
  get isTracking(): boolean {
    return this.cleanupFn !== null;
  }

  /**
   * Get location history.
   */
  getHistory(): readonly TrackedLocation[] {
    return this.history;
  }

  /**
   * Get the most recent location.
   */
  getLastLocation(): TrackedLocation | null {
    return this.history.length > 0 ? this.history[this.history.length - 1]! : null;
  }

  /**
   * Calculate total distance traveled in meters.
   */
  getTotalDistance(): number {
    if (this.history.length < 2) {
      return 0;
    }

    let total = 0;
    for (let i = 1; i < this.history.length; i++) {
      const prev = this.history[i - 1]!;
      const curr = this.history[i]!;
      total += calculateDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
    }

    return total;
  }

  /**
   * Clear history.
   */
  clearHistory(): void {
    this.history.length = 0;
    this.storage.remove('history');
    this.logger.info('History cleared');
  }

  /**
   * Register location update callback.
   */
  onLocation(callback: (location: TrackedLocation) => void): CleanupFn {
    this.onLocationCallback = callback;
    return () => {
      this.onLocationCallback = undefined;
    };
  }

  /**
   * Register error callback.
   */
  onError(callback: (error: GeolocationError) => void): CleanupFn {
    this.onErrorCallback = callback;
    return () => {
      this.onErrorCallback = undefined;
    };
  }

  /**
   * Destroy tracker and cleanup resources.
   */
  destroy(): void {
    this.stop();
    this.logger.info('Tracker destroyed');
  }

  private handlePosition(position: GeolocationPosition): void {
    const location: TrackedLocation = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude,
      speed: position.coords.speed,
      heading: position.coords.heading,
      timestamp: position.timestamp,
    };

    // Add to history
    this.history.push(location);

    // Trim history if too large
    while (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }

    // Persist to storage
    this.storage.set('history', this.history);

    // Notify callback
    this.onLocationCallback?.(location);

    this.logger.debug(
      `Location: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
    );
  }

  private handleError(error: GeolocationError): void {
    this.logger.error(`Location error: ${error.code}`);
    this.onErrorCallback?.(error);
  }
}

/**
 * Example: Using the location tracker.
 */
function locationTrackerExample(): void {
  console.log('\n--- Location Tracker ---');

  const tracker = new LocationTracker({
    maxHistorySize: 50,
    storagePrefix: 'myAppTracker',
  });

  // Register callbacks
  const cleanupLocation = tracker.onLocation((location) => {
    console.log(`New location: ${location.latitude}, ${location.longitude}`);
    console.log(`  Accuracy: ${location.accuracy}m`);
    if (location.speed !== null) {
      console.log(`  Speed: ${(location.speed * 3.6).toFixed(1)} km/h`);
    }
  });

  const cleanupError = tracker.onError((error) => {
    console.error(`Tracker error: ${error.code}`);
  });

  // Start tracking
  tracker.start();
  console.log('Tracking:', tracker.isTracking);

  // After some time...
  setTimeout(() => {
    console.log('History size:', tracker.getHistory().length);
    console.log('Total distance:', tracker.getTotalDistance().toFixed(2), 'meters');

    // Stop and cleanup
    tracker.stop();
    cleanupLocation();
    cleanupError();
    tracker.destroy();
  }, 10000);
}

// =============================================================================
// Distance Calculation
// =============================================================================

/**
 * Calculate distance between two coordinates using Haversine formula.
 *
 * @param lat1 - First latitude
 * @param lon1 - First longitude
 * @param lat2 - Second latitude
 * @param lon2 - Second longitude
 * @returns Distance in meters
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Example: Distance calculation between cities.
 */
function distanceExample(): void {
  console.log('\n--- Distance Calculation ---');

  // Example coordinates
  const newYork = { lat: 40.7128, lon: -74.006 };
  const losAngeles = { lat: 34.0522, lon: -118.2437 };
  const london = { lat: 51.5074, lon: -0.1278 };
  const tokyo = { lat: 35.6762, lon: 139.6503 };

  const nyToLa = calculateDistance(newYork.lat, newYork.lon, losAngeles.lat, losAngeles.lon);
  console.log(`New York to Los Angeles: ${(nyToLa / 1000).toFixed(2)} km`);

  const nyToLondon = calculateDistance(newYork.lat, newYork.lon, london.lat, london.lon);
  console.log(`New York to London: ${(nyToLondon / 1000).toFixed(2)} km`);

  const londonToTokyo = calculateDistance(london.lat, london.lon, tokyo.lat, tokyo.lon);
  console.log(`London to Tokyo: ${(londonToTokyo / 1000).toFixed(2)} km`);
}

// =============================================================================
// Geofencing
// =============================================================================

/**
 * A simple geofence manager for location-based triggers.
 */
class GeofenceManager {
  private readonly geofences = new Map<string, Geofence>();
  private readonly insideFences = new Set<string>();
  private onEventCallback?: (event: GeofenceEvent, fence: Geofence) => void;

  /**
   * Add a geofence.
   */
  addGeofence(fence: Geofence): void {
    this.geofences.set(fence.id, fence);
    console.log(`Added geofence: ${fence.name} (${fence.radiusMeters}m radius)`);
  }

  /**
   * Remove a geofence.
   */
  removeGeofence(id: string): void {
    this.geofences.delete(id);
    this.insideFences.delete(id);
  }

  /**
   * Check location against all geofences.
   */
  checkLocation(latitude: number, longitude: number): void {
    for (const fence of this.geofences.values()) {
      const distance = calculateDistance(latitude, longitude, fence.latitude, fence.longitude);

      const isInside = distance <= fence.radiusMeters;
      const wasInside = this.insideFences.has(fence.id);

      if (isInside && !wasInside) {
        // Entered geofence
        this.insideFences.add(fence.id);
        this.onEventCallback?.('enter', fence);
      } else if (!isInside && wasInside) {
        // Exited geofence
        this.insideFences.delete(fence.id);
        this.onEventCallback?.('exit', fence);
      }
    }
  }

  /**
   * Get list of geofences currently inside.
   */
  getInsideFences(): readonly Geofence[] {
    return Array.from(this.insideFences)
      .map((id) => this.geofences.get(id))
      .filter((fence): fence is Geofence => fence !== undefined);
  }

  /**
   * Register geofence event callback.
   */
  onEvent(callback: (event: GeofenceEvent, fence: Geofence) => void): CleanupFn {
    this.onEventCallback = callback;
    return () => {
      this.onEventCallback = undefined;
    };
  }

  /**
   * Clear all geofences.
   */
  clear(): void {
    this.geofences.clear();
    this.insideFences.clear();
  }
}

/**
 * Example: Geofencing with location tracking.
 */
function geofencingExample(): void {
  console.log('\n--- Geofencing Example ---');

  const geofenceManager = new GeofenceManager();

  // Define some geofences
  geofenceManager.addGeofence({
    id: 'office',
    name: 'Office Building',
    latitude: 40.7484,
    longitude: -73.9857,
    radiusMeters: 100,
  });

  geofenceManager.addGeofence({
    id: 'home',
    name: 'Home',
    latitude: 40.758,
    longitude: -73.9855,
    radiusMeters: 50,
  });

  geofenceManager.addGeofence({
    id: 'coffee-shop',
    name: 'Favorite Coffee Shop',
    latitude: 40.7505,
    longitude: -73.9934,
    radiusMeters: 30,
  });

  // Register event handler
  const cleanup = geofenceManager.onEvent((event, fence) => {
    console.log(`Geofence ${event}: ${fence.name}`);

    if (event === 'enter' && fence.id === 'office') {
      console.log('Welcome to work! Starting work timer...');
    } else if (event === 'exit' && fence.id === 'office') {
      console.log('Leaving work. Have a good evening!');
    }
  });

  // Simulate movement
  console.log('Simulating movement...');

  // Near office
  geofenceManager.checkLocation(40.7485, -73.9858);

  // Enter office
  geofenceManager.checkLocation(40.7484, -73.9857);

  // Leave office
  geofenceManager.checkLocation(40.7495, -73.985);

  // Near coffee shop
  geofenceManager.checkLocation(40.7504, -73.9935);

  console.log(
    'Currently inside:',
    geofenceManager.getInsideFences().map((f) => f.name)
  );

  cleanup();
}

// =============================================================================
// UI Integration Example
// =============================================================================

/**
 * Example: Integrating geolocation with a map UI.
 */
async function mapIntegrationExample(): Promise<void> {
  console.log('\n--- Map UI Integration ---');

  // This example shows how you might integrate with a map library
  // (Google Maps, Mapbox, Leaflet, etc.)

  if (!GeolocationManager.isSupported()) {
    console.log('Show fallback: manual address entry');
    return;
  }

  // Show loading indicator
  console.log('UI: Showing loading spinner...');

  const result = await GeolocationManager.getCurrentPositionResult({
    enableHighAccuracy: true,
    timeout: 10000,
  });

  // Hide loading indicator
  console.log('UI: Hiding loading spinner');

  if (Result.isOk(result)) {
    const { latitude, longitude, accuracy } = result.value.coords;

    console.log('UI: Centering map on user location');
    console.log(`  Center: ${latitude}, ${longitude}`);
    console.log(`  Zoom based on accuracy: ${accuracy < 100 ? 'high' : 'medium'}`);

    // Example map operations (pseudo-code)
    // map.setCenter({ lat: latitude, lng: longitude });
    // map.setZoom(accuracy < 100 ? 17 : 14);
    // marker.setPosition({ lat: latitude, lng: longitude });

    // Add accuracy circle
    console.log(`  Accuracy circle radius: ${accuracy}m`);
    // new Circle({ center, radius: accuracy, ... });
  } else {
    console.log('UI: Showing location permission prompt');
    console.log(`Error: ${result.error.code}`);

    // Show appropriate UI based on error
    if (result.error.code === 'GEOLOCATION_PERMISSION_DENIED') {
      console.log('UI: Show "Enable Location" button with instructions');
    } else {
      console.log('UI: Show manual address entry as fallback');
    }
  }
}

// =============================================================================
// Run All Examples
// =============================================================================

/**
 * Run all geolocation examples.
 */
export async function runGeolocationExamples(): Promise<void> {
  console.log('=== Geolocation Tracker Examples ===\n');

  await basicUsageExample();
  await resultBasedExample();

  // Note: These examples require actual location access
  // Uncomment to test with real geolocation:
  // const cleanup = continuousTrackingExample();
  // setTimeout(cleanup, 30000); // Stop after 30 seconds

  // locationTrackerExample();

  distanceExample();
  geofencingExample();
  await mapIntegrationExample();

  console.log('\n=== Geolocation Examples Complete ===');
}

// Export for module usage
export {
  LocationTracker,
  GeofenceManager,
  calculateDistance,
  continuousTrackingExample,
  locationTrackerExample,
  type LocationPoint,
  type TrackedLocation,
  type Geofence,
  type GeofenceEvent,
};

// Uncomment to run directly
// runGeolocationExamples().catch(console.error);
