# Performance Monitor

Performance API wrapper with Core Web Vitals support.

## Quick Start

```typescript
import { PerformanceMonitor } from '@zappzarapp/browser-utils/performance';

// Create an instance
const monitor = PerformanceMonitor.create();

// Create marks and measures
monitor.mark('start');
await doWork();
monitor.mark('end');
const measure = monitor.measure('work', 'start', 'end');
console.log(`Work took ${measure?.duration}ms`);

// Get Core Web Vitals (including INP)
const metrics = monitor.getMetrics();
console.log('TTFB:', metrics.ttfb, 'FCP:', metrics.fcp, 'INP:', metrics.inp);
```

## Features

| Feature              | Description                                      |
| -------------------- | ------------------------------------------------ |
| Core Web Vitals      | FCP, LCP, FID, CLS, INP, TTFB metrics            |
| Performance Marks    | Create and manage performance marks              |
| Performance Measures | Measure duration between marks                   |
| PerformanceObserver  | Subscribe to metric updates in real-time         |
| Graceful Fallback    | Safe no-op when Performance API is not available |

## Types

| Type                         | Description                                               |
| ---------------------------- | --------------------------------------------------------- |
| `PerformanceMonitorInstance` | Instance returned by `PerformanceMonitor.create()`        |
| `PerformanceMetrics`         | Object containing Core Web Vitals metrics                 |
| `MetricType`                 | Metric types: `'fcp' \| 'lcp' \| 'fid' \| 'cls' \| 'inp'` |
| `MetricHandler`              | Callback function `(value: number) => void`               |
| `CleanupFn`                  | Function to unsubscribe from metric updates               |

## API Reference

### PerformanceMonitor.create()

Create a new performance monitor instance. Each instance has its own state
(marks, measures, metric observers).

```typescript
const monitor = PerformanceMonitor.create();
```

**Returns:** `PerformanceMonitorInstance`

### PerformanceMonitor.isSupported()

Check if the Performance API is available (static method).

```typescript
if (PerformanceMonitor.isSupported()) {
  const monitor = PerformanceMonitor.create();
}
```

**Returns:** `boolean` - True if Performance API is available

### Instance Methods

#### monitor.mark()

Create a performance mark.

```typescript
monitor.mark('api-call-start');
await fetchData();
monitor.mark('api-call-end');
```

**Parameters:**

| Parameter | Type     | Description |
| --------- | -------- | ----------- |
| `name`    | `string` | Mark name   |

#### monitor.measure()

Create a performance measure between two marks.

```typescript
const measure = monitor.measure('api-call', 'api-call-start', 'api-call-end');
if (measure) {
  console.log(`API call took ${measure.duration}ms`);
}
```

**Parameters:**

| Parameter   | Type     | Description                                              |
| ----------- | -------- | -------------------------------------------------------- |
| `name`      | `string` | Measure name                                             |
| `startMark` | `string` | Start mark name (optional, defaults to navigation start) |
| `endMark`   | `string` | End mark name (optional, defaults to current time)       |

**Returns:** `PerformanceMeasure | undefined`

#### monitor.getMetrics()

Get current Core Web Vitals metrics.

```typescript
const metrics = monitor.getMetrics();
// {
//   fcp?: number,   // First Contentful Paint (ms)
//   lcp?: number,   // Largest Contentful Paint (ms)
//   fid?: number,   // First Input Delay (ms)
//   cls?: number,   // Cumulative Layout Shift (unitless)
//   inp?: number,   // Interaction to Next Paint (ms)
//   ttfb?: number   // Time to First Byte (ms)
// }
```

**Returns:** `PerformanceMetrics` - Object with available metrics

#### monitor.getEntries()

Get performance entries, optionally filtered by type.

```typescript
// Get all entries
const allEntries = monitor.getEntries();

// Get navigation entries only
const navEntries = monitor.getEntries('navigation');

// Get resource timing entries
const resourceEntries = monitor.getEntries('resource');
```

**Parameters:**

| Parameter | Type     | Description                  |
| --------- | -------- | ---------------------------- |
| `type`    | `string` | Entry type filter (optional) |

**Returns:** `PerformanceEntryList`

#### monitor.onMetric()

Subscribe to metric updates using PerformanceObserver.

```typescript
// Listen for LCP updates
const cleanup = monitor.onMetric('lcp', (value) => {
  console.log('LCP:', value, 'ms');
  analytics.track('lcp', { value });
});

// Listen for INP updates
const inpCleanup = monitor.onMetric('inp', (value) => {
  console.log('INP:', value, 'ms');
});

// Later: cleanup when done
cleanup();
inpCleanup();
```

**Parameters:**

| Parameter | Type            | Description                                                    |
| --------- | --------------- | -------------------------------------------------------------- |
| `type`    | `MetricType`    | Metric to observe: `'fcp' \| 'lcp' \| 'fid' \| 'cls' \| 'inp'` |
| `handler` | `MetricHandler` | Callback function `(value: number) => void`                    |

**Returns:** `CleanupFn` - Function to unsubscribe

**Note:** If a metric value is already available when subscribing, the handler
is called immediately with the current value.

#### monitor.clearMarks()

Clear performance marks.

```typescript
// Clear specific mark
monitor.clearMarks('api-call-start');

// Clear all marks
monitor.clearMarks();
```

**Parameters:**

| Parameter | Type     | Description                                      |
| --------- | -------- | ------------------------------------------------ |
| `name`    | `string` | Mark name (optional, clears all if not provided) |

#### monitor.clearMeasures()

Clear performance measures.

```typescript
// Clear specific measure
monitor.clearMeasures('api-call');

// Clear all measures
monitor.clearMeasures();
```

**Parameters:**

| Parameter | Type     | Description                                         |
| --------- | -------- | --------------------------------------------------- |
| `name`    | `string` | Measure name (optional, clears all if not provided) |

## Usage Examples

### Measuring Function Execution

```typescript
const monitor = PerformanceMonitor.create();

function measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const startMark = `${name}-start`;
  const endMark = `${name}-end`;

  monitor.mark(startMark);
  return fn().finally(() => {
    monitor.mark(endMark);
    const measure = monitor.measure(name, startMark, endMark);
    if (measure) {
      console.log(`${name}: ${measure.duration.toFixed(2)}ms`);
    }
  });
}

// Usage
const data = await measureAsync('fetch-users', () => fetch('/api/users'));
```

### Monitoring Core Web Vitals

```typescript
function setupWebVitalsMonitoring() {
  const monitor = PerformanceMonitor.create();
  const cleanupFns: CleanupFn[] = [];

  // Monitor all Core Web Vitals (including INP)
  const metricTypes: MetricType[] = ['fcp', 'lcp', 'fid', 'cls', 'inp'];

  for (const type of metricTypes) {
    cleanupFns.push(
      monitor.onMetric(type, (value) => {
        sendToAnalytics(type, value);
      })
    );
  }

  // Return cleanup function
  return () => cleanupFns.forEach((fn) => fn());
}
```

### Getting All Performance Data

```typescript
const monitor = PerformanceMonitor.create();

function getPerformanceReport() {
  const metrics = monitor.getMetrics();
  const navEntries = monitor.getEntries(
    'navigation'
  ) as PerformanceNavigationTiming[];
  const resourceEntries = monitor.getEntries(
    'resource'
  ) as PerformanceResourceTiming[];

  return {
    coreWebVitals: metrics,
    navigation: navEntries[0],
    resources: resourceEntries.map((r) => ({
      name: r.name,
      duration: r.duration,
      transferSize: r.transferSize,
    })),
  };
}
```

### Instance Isolation

Each `create()` call returns an independent instance. Useful for isolating
metrics per module:

```typescript
const apiMonitor = PerformanceMonitor.create();
const uiMonitor = PerformanceMonitor.create();

// Each instance tracks its own metrics independently
apiMonitor.onMetric('fcp', (v) => console.log('API FCP:', v));
uiMonitor.onMetric('lcp', (v) => console.log('UI LCP:', v));
```

## Core Web Vitals Reference

| Metric | Name                      | Description                                   | Good Threshold |
| ------ | ------------------------- | --------------------------------------------- | -------------- |
| FCP    | First Contentful Paint    | Time until first content is painted           | < 1.8s         |
| LCP    | Largest Contentful Paint  | Time until largest content element is painted | < 2.5s         |
| FID    | First Input Delay         | Time from first input to browser response     | < 100ms        |
| CLS    | Cumulative Layout Shift   | Sum of unexpected layout shift scores         | < 0.1          |
| INP    | Interaction to Next Paint | Worst interaction latency during page life    | < 200ms        |
| TTFB   | Time to First Byte        | Time until first byte of response received    | < 800ms        |

## Browser Support

| Feature              | Chrome | Firefox | Safari | Edge |
| -------------------- | ------ | ------- | ------ | ---- |
| Performance API      | Yes    | Yes     | Yes    | Yes  |
| Performance Marks    | Yes    | Yes     | Yes    | Yes  |
| Performance Measures | Yes    | Yes     | Yes    | Yes  |
| PerformanceObserver  | Yes    | Yes     | Yes    | Yes  |
| Navigation Timing    | Yes    | Yes     | Yes    | Yes  |
| Paint Timing (FCP)   | Yes    | Yes     | Yes    | Yes  |
| LCP                  | Yes    | No      | No     | Yes  |
| FID                  | Yes    | No      | No     | Yes  |
| CLS                  | Yes    | No      | No     | Yes  |

**Note:** The module gracefully handles unsupported features by returning
`undefined` values or empty arrays.
