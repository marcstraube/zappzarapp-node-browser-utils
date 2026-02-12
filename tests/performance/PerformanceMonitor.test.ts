import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  PerformanceMonitor,
  type PerformanceMonitorInstance,
  type PerformanceMetrics,
  type MetricType,
  type MetricHandler,
} from '../../src/performance/index.js';
import type { CleanupFn } from '../../src/core/index.js';

/**
 * Mock PerformanceObserver class.
 * Methods observe/disconnect are called by the code under test.
 */
class MockPerformanceObserver implements Pick<PerformanceObserver, 'observe' | 'disconnect'> {
  private readonly callback: PerformanceObserverCallback;
  private observedTypes: string[] = [];

  static instances: MockPerformanceObserver[] = [];
  static supportedEntryTypes: string[] = [
    'paint',
    'largest-contentful-paint',
    'first-input',
    'layout-shift',
    'event',
    'navigation',
  ];

  constructor(callback: PerformanceObserverCallback) {
    this.callback = callback;
    MockPerformanceObserver.instances.push(this);
  }

  observe(options: PerformanceObserverInit): void {
    if (options.type) {
      this.observedTypes.push(options.type);
    }
  }

  disconnect(): void {
    this.observedTypes = [];
  }

  // Test helper to trigger entries
  _trigger(entries: PerformanceEntry[]): void {
    const list: PerformanceObserverEntryList = {
      getEntries: () => entries,
      getEntriesByType: (type: string) => entries.filter((e) => e.entryType === type),
      getEntriesByName: (name: string) => entries.filter((e) => e.name === name),
    };
    this.callback(list, this as unknown as PerformanceObserver);
  }

  _getObservedTypes(): string[] {
    return this.observedTypes;
  }

  static _reset(): void {
    MockPerformanceObserver.instances = [];
  }

  static _getLastInstance(): MockPerformanceObserver | undefined {
    return MockPerformanceObserver.instances[MockPerformanceObserver.instances.length - 1];
  }
}

// Ensure mock methods are recognized as used (called by code under test via globalThis.PerformanceObserver)
void MockPerformanceObserver.prototype.observe;
void MockPerformanceObserver.prototype.disconnect;

/**
 * Create mock performance entry
 */
function createMockEntry(
  type: string,
  name: string,
  startTime: number,
  extras?: Record<string, unknown>
): PerformanceEntry {
  return {
    entryType: type,
    name,
    startTime,
    duration: 0,
    toJSON: () => ({}),
    ...extras,
  } as PerformanceEntry;
}

/**
 * Create mock paint entry
 */
function createPaintEntry(name: string, startTime: number): PerformanceEntry {
  return createMockEntry('paint', name, startTime);
}

/**
 * Create mock LCP entry
 */
function createLCPEntry(startTime: number): PerformanceEntry {
  return createMockEntry('largest-contentful-paint', 'largest-contentful-paint', startTime);
}

/**
 * Create mock FID entry
 */
function createFIDEntry(startTime: number, processingStart: number): PerformanceEntry {
  return createMockEntry('first-input', 'first-input', startTime, { processingStart });
}

/**
 * Create mock CLS entry
 */
function createCLSEntry(value: number, hadRecentInput = false): PerformanceEntry {
  return createMockEntry('layout-shift', 'layout-shift', 0, { value, hadRecentInput });
}

/**
 * Create mock INP (event) entry
 */
function createINPEntry(duration: number): PerformanceEntry {
  return createMockEntry('event', 'click', 0, { duration });
}

/**
 * Create mock navigation timing entry
 */
function createNavigationEntry(responseStart: number): PerformanceNavigationTiming {
  return {
    entryType: 'navigation',
    name: '',
    startTime: 0,
    duration: 0,
    responseStart,
    toJSON: () => ({}),
  } as PerformanceNavigationTiming;
}

describe('PerformanceMonitor', () => {
  let originalPerformance: typeof performance | undefined;
  let originalPerformanceObserver: typeof PerformanceObserver | undefined;
  let mockPerformance: {
    mark: ReturnType<typeof vi.fn>;
    measure: ReturnType<typeof vi.fn>;
    clearMarks: ReturnType<typeof vi.fn>;
    clearMeasures: ReturnType<typeof vi.fn>;
    getEntries: ReturnType<typeof vi.fn>;
    getEntriesByType: ReturnType<typeof vi.fn>;
    getEntriesByName: ReturnType<typeof vi.fn>;
    now: ReturnType<typeof vi.fn>;
  };
  let monitor: PerformanceMonitorInstance;

  beforeEach(() => {
    // Save originals
    originalPerformance = globalThis.performance;
    originalPerformanceObserver = globalThis.PerformanceObserver;

    // Create mock performance
    mockPerformance = {
      mark: vi.fn(),
      measure: vi.fn().mockReturnValue({ duration: 100, name: 'test', startTime: 0 }),
      clearMarks: vi.fn(),
      clearMeasures: vi.fn(),
      getEntries: vi.fn().mockReturnValue([]),
      getEntriesByType: vi.fn().mockReturnValue([]),
      getEntriesByName: vi.fn().mockReturnValue([]),
      now: vi.fn().mockReturnValue(0),
    };

    globalThis.performance = mockPerformance as unknown as Performance;
    globalThis.PerformanceObserver =
      MockPerformanceObserver as unknown as typeof PerformanceObserver;
    Object.defineProperty(globalThis.PerformanceObserver, 'supportedEntryTypes', {
      value: MockPerformanceObserver.supportedEntryTypes,
      configurable: true,
    });

    MockPerformanceObserver._reset();
    monitor = PerformanceMonitor.create();
  });

  afterEach(() => {
    if (originalPerformance) {
      globalThis.performance = originalPerformance;
    }
    if (originalPerformanceObserver) {
      globalThis.PerformanceObserver = originalPerformanceObserver;
    }
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // Factory
  // ===========================================================================

  describe('Factory', () => {
    it('should create isolated instances', () => {
      const monitor1 = PerformanceMonitor.create();
      const monitor2 = PerformanceMonitor.create();

      // Collect LCP on monitor1
      monitor1.onMetric('lcp', () => {});
      const observer = MockPerformanceObserver._getLastInstance();
      observer?._trigger([createLCPEntry(1000)]);

      // monitor2 should not have the LCP value
      const metrics1 = monitor1.getMetrics();
      const metrics2 = monitor2.getMetrics();

      expect(metrics1.lcp).toBe(1000);
      expect(metrics2.lcp).toBeUndefined();
    });

    it('should have static isSupported()', () => {
      expect(PerformanceMonitor.isSupported()).toBe(true);
    });
  });

  // ===========================================================================
  // Core API
  // ===========================================================================

  describe('Core API', () => {
    describe('isSupported()', () => {
      it('should return true when Performance API is available', () => {
        expect(monitor.isSupported()).toBe(true);
      });

      it('should return false when performance is undefined', () => {
        // @ts-expect-error - intentionally setting undefined for test
        globalThis.performance = undefined;

        expect(monitor.isSupported()).toBe(false);
      });

      it('should return false when performance.mark is not a function', () => {
        globalThis.performance = {} as Performance;

        expect(monitor.isSupported()).toBe(false);
      });
    });

    describe('mark()', () => {
      it('should create a performance mark', () => {
        monitor.mark('test-mark');

        expect(mockPerformance.mark).toHaveBeenCalledWith('test-mark');
      });

      it('should do nothing when not supported', () => {
        // @ts-expect-error - intentionally setting undefined for test
        globalThis.performance = undefined;

        expect(() => monitor.mark('test-mark')).not.toThrow();
      });
    });

    describe('measure()', () => {
      it('should create a performance measure', () => {
        const result = monitor.measure('test-measure', 'start', 'end');

        expect(mockPerformance.measure).toHaveBeenCalledWith('test-measure', 'start', 'end');
        expect(result).toBeDefined();
        expect(result?.name).toBe('test');
      });

      it('should work without start and end marks', () => {
        monitor.measure('test-measure');

        expect(mockPerformance.measure).toHaveBeenCalledWith('test-measure', undefined, undefined);
      });

      it('should return undefined when not supported', () => {
        // @ts-expect-error - intentionally setting undefined for test
        globalThis.performance = undefined;

        const result = monitor.measure('test-measure');

        expect(result).toBeUndefined();
      });

      it('should return undefined when measure throws', () => {
        mockPerformance.measure.mockImplementation(() => {
          throw new Error('Mark not found');
        });

        const result = monitor.measure('test-measure', 'invalid-mark');

        expect(result).toBeUndefined();
      });
    });

    describe('getMetrics()', () => {
      it('should return empty object when not supported', () => {
        // @ts-expect-error - intentionally setting undefined for test
        globalThis.performance = undefined;

        const metrics = monitor.getMetrics();

        expect(metrics).toEqual({});
      });

      it('should include TTFB from navigation timing', () => {
        mockPerformance.getEntriesByType.mockImplementation((type: string) => {
          if (type === 'navigation') {
            return [createNavigationEntry(150)];
          }
          return [];
        });

        const metrics = monitor.getMetrics();

        expect(metrics.ttfb).toBe(150);
      });

      it('should include FCP from paint entries', () => {
        mockPerformance.getEntriesByType.mockImplementation((type: string) => {
          if (type === 'paint') {
            return [
              createPaintEntry('first-paint', 100),
              createPaintEntry('first-contentful-paint', 200),
            ];
          }
          return [];
        });

        const metrics = monitor.getMetrics();

        expect(metrics.fcp).toBe(200);
      });

      it('should return collected metrics', () => {
        // Trigger FCP via observer
        monitor.onMetric('fcp', () => {});
        const observer = MockPerformanceObserver._getLastInstance();
        observer?._trigger([createPaintEntry('first-contentful-paint', 250)]);

        const metrics = monitor.getMetrics();

        expect(metrics.fcp).toBe(250);
      });
    });

    describe('getEntries()', () => {
      it('should return all entries when no type specified', () => {
        const entries = [createMockEntry('mark', 'test', 0)];
        mockPerformance.getEntries.mockReturnValue(entries);

        const result = monitor.getEntries();

        expect(result).toEqual(entries);
      });

      it('should return entries by type when type specified', () => {
        const entries = [createMockEntry('mark', 'test', 0)];
        mockPerformance.getEntriesByType.mockReturnValue(entries);

        const result = monitor.getEntries('mark');

        expect(mockPerformance.getEntriesByType).toHaveBeenCalledWith('mark');
        expect(result).toEqual(entries);
      });

      it('should return empty array when not supported', () => {
        // @ts-expect-error - intentionally setting undefined for test
        globalThis.performance = undefined;

        const result = monitor.getEntries();

        expect(result).toEqual([]);
      });
    });

    describe('onMetric()', () => {
      it('should create observer for FCP', () => {
        monitor.onMetric('fcp', () => {});

        const observer = MockPerformanceObserver._getLastInstance();
        expect(observer?._getObservedTypes()).toContain('paint');
      });

      it('should create observer for LCP', () => {
        monitor.onMetric('lcp', () => {});

        const observer = MockPerformanceObserver._getLastInstance();
        expect(observer?._getObservedTypes()).toContain('largest-contentful-paint');
      });

      it('should create observer for FID', () => {
        monitor.onMetric('fid', () => {});

        const observer = MockPerformanceObserver._getLastInstance();
        expect(observer?._getObservedTypes()).toContain('first-input');
      });

      it('should create observer for CLS', () => {
        monitor.onMetric('cls', () => {});

        const observer = MockPerformanceObserver._getLastInstance();
        expect(observer?._getObservedTypes()).toContain('layout-shift');
      });

      it('should create observer for INP', () => {
        monitor.onMetric('inp', () => {});

        const observer = MockPerformanceObserver._getLastInstance();
        expect(observer?._getObservedTypes()).toContain('event');
      });

      it('should call handler when metric is collected', () => {
        const handler = vi.fn();
        monitor.onMetric('lcp', handler);

        const observer = MockPerformanceObserver._getLastInstance();
        observer?._trigger([createLCPEntry(1500)]);

        expect(handler).toHaveBeenCalledWith(1500);
      });

      it('should call handler with FID value', () => {
        const handler = vi.fn();
        monitor.onMetric('fid', handler);

        const observer = MockPerformanceObserver._getLastInstance();
        observer?._trigger([createFIDEntry(100, 150)]);

        expect(handler).toHaveBeenCalledWith(50); // processingStart - startTime
      });

      it('should accumulate CLS values', () => {
        const handler = vi.fn();
        monitor.onMetric('cls', handler);

        const observer = MockPerformanceObserver._getLastInstance();
        observer?._trigger([createCLSEntry(0.1)]);
        observer?._trigger([createCLSEntry(0.05)]);

        expect(handler).toHaveBeenCalledTimes(2);
        expect(handler).toHaveBeenNthCalledWith(1, 0.1);
        // Use toBeCloseTo for floating-point comparison
        expect(handler.mock.calls[1]![0]).toBeCloseTo(0.15, 10);
      });

      it('should ignore CLS entries with recent input', () => {
        const handler = vi.fn();
        monitor.onMetric('cls', handler);

        const observer = MockPerformanceObserver._getLastInstance();
        observer?._trigger([createCLSEntry(0.1, true)]); // hadRecentInput = true

        expect(handler).not.toHaveBeenCalled();
      });

      it('should track worst INP value', () => {
        const handler = vi.fn();
        monitor.onMetric('inp', handler);

        const observer = MockPerformanceObserver._getLastInstance();
        observer?._trigger([createINPEntry(50)]);
        observer?._trigger([createINPEntry(200)]);
        observer?._trigger([createINPEntry(100)]);

        // Should be called 3 times, but the second and third should report max
        expect(handler).toHaveBeenCalledTimes(3);
        expect(handler).toHaveBeenNthCalledWith(1, 50);
        expect(handler).toHaveBeenNthCalledWith(2, 200);
        // Third call: value 100 < current 200, so updateCollectedMetrics doesn't update,
        // but notifyHandlers sends the stored INP value (200)
        expect(handler).toHaveBeenNthCalledWith(3, 200);
      });

      it('should ignore INP entries with zero duration', () => {
        const handler = vi.fn();
        monitor.onMetric('inp', handler);

        const observer = MockPerformanceObserver._getLastInstance();
        observer?._trigger([createINPEntry(0)]);

        expect(handler).not.toHaveBeenCalled();
      });

      it('should return cleanup function', () => {
        const handler = vi.fn();
        const cleanup = monitor.onMetric('lcp', handler);

        expect(cleanup).toBeInstanceOf(Function);
      });

      it('should disconnect observer when last handler removed', () => {
        const handler1 = vi.fn();
        const handler2 = vi.fn();

        const cleanup1 = monitor.onMetric('lcp', handler1);
        monitor.onMetric('lcp', handler2);

        expect(MockPerformanceObserver.instances.length).toBe(1);

        cleanup1();

        // Observer should still be active (handler2 remains)
        const observer = MockPerformanceObserver._getLastInstance();
        observer?._trigger([createLCPEntry(1000)]);

        expect(handler1).not.toHaveBeenCalled();
        expect(handler2).toHaveBeenCalledWith(1000);
      });

      it('should fully disconnect observer when all handlers removed', () => {
        const handler = vi.fn();
        const cleanup = monitor.onMetric('lcp', handler);

        expect(MockPerformanceObserver.instances.length).toBe(1);

        // Remove the only handler
        cleanup();

        // Observer should be disconnected and removed
        // Creating a new subscription should create a new observer
        monitor.onMetric('lcp', () => {});
        expect(MockPerformanceObserver.instances.length).toBe(2);
      });

      it('should call handler immediately if metric already collected', () => {
        // First, collect LCP
        const handler1 = vi.fn();
        monitor.onMetric('lcp', handler1);
        const observer = MockPerformanceObserver._getLastInstance();
        observer?._trigger([createLCPEntry(1200)]);

        // Now subscribe with new handler
        const handler2 = vi.fn();
        monitor.onMetric('lcp', handler2);

        // handler2 should be called immediately with existing value
        expect(handler2).toHaveBeenCalledWith(1200);
      });

      it('should return no-op cleanup when PerformanceObserver not available', () => {
        // @ts-expect-error - intentionally setting undefined for test
        globalThis.PerformanceObserver = undefined;

        const handler = vi.fn();
        const cleanup = monitor.onMetric('lcp', handler);

        expect(cleanup).toBeInstanceOf(Function);
        cleanup(); // Should not throw
      });

      it('should handle FCP observer correctly', () => {
        const handler = vi.fn();
        monitor.onMetric('fcp', handler);

        const observer = MockPerformanceObserver._getLastInstance();
        // Trigger with first-paint (should be ignored for FCP)
        observer?._trigger([createPaintEntry('first-paint', 100)]);

        expect(handler).not.toHaveBeenCalled();

        // Trigger with first-contentful-paint
        observer?._trigger([createPaintEntry('first-contentful-paint', 200)]);

        expect(handler).toHaveBeenCalledWith(200);
      });

      it('should reuse observer for same metric type', () => {
        monitor.onMetric('lcp', () => {});
        monitor.onMetric('lcp', () => {});

        expect(MockPerformanceObserver.instances.length).toBe(1);
      });
    });

    describe('clearMarks()', () => {
      it('should clear all marks when no name provided', () => {
        monitor.clearMarks();

        expect(mockPerformance.clearMarks).toHaveBeenCalledWith();
      });

      it('should clear specific mark when name provided', () => {
        monitor.clearMarks('test-mark');

        expect(mockPerformance.clearMarks).toHaveBeenCalledWith('test-mark');
      });

      it('should do nothing when not supported', () => {
        // @ts-expect-error - intentionally setting undefined for test
        globalThis.performance = undefined;

        expect(() => monitor.clearMarks()).not.toThrow();
      });
    });

    describe('clearMeasures()', () => {
      it('should clear all measures when no name provided', () => {
        monitor.clearMeasures();

        expect(mockPerformance.clearMeasures).toHaveBeenCalledWith();
      });

      it('should clear specific measure when name provided', () => {
        monitor.clearMeasures('test-measure');

        expect(mockPerformance.clearMeasures).toHaveBeenCalledWith('test-measure');
      });

      it('should do nothing when not supported', () => {
        // @ts-expect-error - intentionally setting undefined for test
        globalThis.performance = undefined;

        expect(() => monitor.clearMeasures()).not.toThrow();
      });
    });
  });

  // ===========================================================================
  // Internal Helpers
  // ===========================================================================

  describe('Internal Helpers', () => {
    describe('getTTFB()', () => {
      it('should return TTFB from navigation timing', () => {
        mockPerformance.getEntriesByType.mockReturnValue([createNavigationEntry(200)]);

        const ttfb = monitor.getTTFB();

        expect(ttfb).toBe(200);
      });

      it('should return undefined when no navigation entry', () => {
        mockPerformance.getEntriesByType.mockReturnValue([]);

        const ttfb = monitor.getTTFB();

        expect(ttfb).toBeUndefined();
      });

      it('should return undefined when responseStart is 0', () => {
        mockPerformance.getEntriesByType.mockReturnValue([createNavigationEntry(0)]);

        const ttfb = monitor.getTTFB();

        expect(ttfb).toBeUndefined();
      });

      it('should return undefined when not supported', () => {
        // @ts-expect-error - intentionally setting undefined for test
        globalThis.performance = undefined;

        const ttfb = monitor.getTTFB();

        expect(ttfb).toBeUndefined();
      });
    });

    describe('getFCP()', () => {
      it('should return FCP from paint entries', () => {
        mockPerformance.getEntriesByType.mockReturnValue([
          createPaintEntry('first-paint', 100),
          createPaintEntry('first-contentful-paint', 150),
        ]);

        const fcp = monitor.getFCP();

        expect(fcp).toBe(150);
      });

      it('should return undefined when no FCP entry', () => {
        mockPerformance.getEntriesByType.mockReturnValue([createPaintEntry('first-paint', 100)]);

        const fcp = monitor.getFCP();

        expect(fcp).toBeUndefined();
      });

      it('should return undefined when not supported', () => {
        // @ts-expect-error - intentionally setting undefined for test
        globalThis.performance = undefined;

        const fcp = monitor.getFCP();

        expect(fcp).toBeUndefined();
      });
    });

    describe('_reset()', () => {
      it('should clear collected metrics', () => {
        // Collect some metrics
        monitor.onMetric('lcp', () => {});
        const observer = MockPerformanceObserver._getLastInstance();
        observer?._trigger([createLCPEntry(1000)]);

        monitor._reset();

        const metrics = monitor.getMetrics();
        expect(metrics.lcp).toBeUndefined();
      });

      it('should disconnect all observers', () => {
        monitor.onMetric('lcp', () => {});
        monitor.onMetric('fcp', () => {});

        expect(MockPerformanceObserver.instances.length).toBe(2);

        monitor._reset();

        // Handlers should be cleared, so new subscriptions create new observers
        monitor.onMetric('lcp', () => {});
        expect(MockPerformanceObserver.instances.length).toBe(3);
      });
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle PerformanceObserver.supportedEntryTypes not being available', () => {
      // Save original for restoration
      const originalTypes = MockPerformanceObserver.supportedEntryTypes;

      Object.defineProperty(globalThis.PerformanceObserver, 'supportedEntryTypes', {
        get: () => {
          throw new Error('Not supported');
        },
        configurable: true,
      });

      const handler = vi.fn();
      const cleanup = monitor.onMetric('lcp', handler);

      expect(cleanup).toBeInstanceOf(Function);

      // Restore
      Object.defineProperty(globalThis.PerformanceObserver, 'supportedEntryTypes', {
        value: originalTypes,
        configurable: true,
      });
    });

    it('should handle observer creation failure gracefully', () => {
      const OriginalObserver = globalThis.PerformanceObserver;
      const FailingObserver = function () {
        throw new Error('Observer creation failed');
      };
      FailingObserver.supportedEntryTypes = ['largest-contentful-paint'];
      globalThis.PerformanceObserver = FailingObserver as unknown as typeof PerformanceObserver;

      const handler = vi.fn();
      const cleanup = monitor.onMetric('lcp', handler);

      expect(cleanup).toBeInstanceOf(Function);

      globalThis.PerformanceObserver = OriginalObserver;
    });

    it('should handle FID entry without processingStart', () => {
      const handler = vi.fn();
      monitor.onMetric('fid', handler);

      const observer = MockPerformanceObserver._getLastInstance();
      // Entry without processingStart
      observer?._trigger([createMockEntry('first-input', 'first-input', 100)]);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle empty supportedEntryTypes array', () => {
      // Save original for restoration
      const originalTypes = MockPerformanceObserver.supportedEntryTypes;

      Object.defineProperty(globalThis.PerformanceObserver, 'supportedEntryTypes', {
        value: [],
        configurable: true,
      });

      const handler = vi.fn();
      const cleanup = monitor.onMetric('lcp', handler);

      expect(cleanup).toBeInstanceOf(Function);
      expect(MockPerformanceObserver.instances.length).toBe(0);

      // Restore
      Object.defineProperty(globalThis.PerformanceObserver, 'supportedEntryTypes', {
        value: originalTypes,
        configurable: true,
      });
    });

    it('should handle non-array supportedEntryTypes', () => {
      // Save original for restoration
      const originalTypes = MockPerformanceObserver.supportedEntryTypes;

      Object.defineProperty(globalThis.PerformanceObserver, 'supportedEntryTypes', {
        value: null, // Not an array
        configurable: true,
      });

      const handler = vi.fn();
      const cleanup = monitor.onMetric('lcp', handler);

      expect(cleanup).toBeInstanceOf(Function);
      expect(MockPerformanceObserver.instances.length).toBe(0);

      // Restore
      Object.defineProperty(globalThis.PerformanceObserver, 'supportedEntryTypes', {
        value: originalTypes,
        configurable: true,
      });
    });
  });

  // ===========================================================================
  // Type Exports
  // ===========================================================================

  describe('Type Exports', () => {
    it('should export PerformanceMetrics type', () => {
      const metrics: PerformanceMetrics = { fcp: 100, lcp: 200, inp: 50 };
      expect(metrics.fcp).toBe(100);
      expect(metrics.inp).toBe(50);
    });

    it('should export MetricType type', () => {
      const type: MetricType = 'inp';
      expect(type).toBe('inp');
    });

    it('should export MetricHandler type', () => {
      const handler: MetricHandler = (value) => {
        expect(value).toBeGreaterThan(0);
      };
      handler(100);
    });

    it('should export CleanupFn type', () => {
      const cleanup: CleanupFn = () => {};
      expect(cleanup).toBeInstanceOf(Function);
    });

    it('should export PerformanceMonitorInstance type', () => {
      expect((monitor as PerformanceMonitorInstance).isSupported).toBeInstanceOf(Function);
    });
  });

  // ===========================================================================
  // Coverage Gaps
  // ===========================================================================

  describe('Coverage Gaps', () => {
    it('should return early from notifyHandlers when no handlers exist', () => {
      const handler = vi.fn();

      // Register handler to create the observer
      const cleanup = monitor.onMetric('lcp', handler);

      // Get the observer before cleanup removes it
      const observer = MockPerformanceObserver._getLastInstance();

      // Remove the handler (and cleanup the handler set)
      cleanup();

      // Now trigger the observer - processEntry will call notifyHandlers
      // but there are no handlers, so it should return early
      expect(() => {
        observer?._trigger([createLCPEntry(500)]);
      }).not.toThrow();

      // Handler should not have been called after cleanup
      handler.mockClear();
      observer?._trigger([createLCPEntry(600)]);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should use accumulated CLS value in notifyHandlers for cls metric', () => {
      const handler = vi.fn();

      monitor.onMetric('cls', handler);

      const observer = MockPerformanceObserver._getLastInstance();

      // Trigger first CLS entry - updateCollectedMetrics sets cls = 0.1
      observer?._trigger([createCLSEntry(0.1)]);
      expect(handler).toHaveBeenCalledWith(0.1);

      // Trigger second CLS entry - cls accumulates to 0.15
      observer?._trigger([createCLSEntry(0.05)]);
      expect(handler.mock.calls[1]![0]).toBeCloseTo(0.15, 10);
    });

    it('should handle INP entry without duration property', () => {
      const handler = vi.fn();
      monitor.onMetric('inp', handler);

      const observer = MockPerformanceObserver._getLastInstance();
      // Entry without duration (duration is 0 from createMockEntry default)
      observer?._trigger([createMockEntry('event', 'click', 0)]);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should track INP in getMetrics', () => {
      monitor.onMetric('inp', () => {});
      const observer = MockPerformanceObserver._getLastInstance();
      observer?._trigger([createINPEntry(120)]);

      const metrics = monitor.getMetrics();
      expect(metrics.inp).toBe(120);
    });
  });
});
