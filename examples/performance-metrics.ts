// noinspection JSUnusedGlobalSymbols,JSUnusedLocalSymbols - Example file

/**
 * Performance Metrics Example - Core Web Vitals and Performance Monitoring
 *
 * This example demonstrates:
 * - Collecting Core Web Vitals (FCP, LCP, FID, CLS, TTFB)
 * - Creating custom performance marks and measures
 * - Listening for real-time metric updates
 * - Building a performance dashboard
 * - Reporting metrics to analytics
 *
 * @packageDocumentation
 */

import { type CleanupFn } from '@zappzarapp/browser-utils/core';
import {
  PerformanceMonitor,
  type PerformanceMetrics,
  type MetricType,
} from '@zappzarapp/browser-utils/performance';

// =============================================================================
// Types
// =============================================================================

/**
 * Thresholds for Core Web Vitals based on Google's recommendations.
 * Values are in milliseconds for timing metrics.
 */
interface MetricThresholds {
  readonly good: number;
  readonly needsImprovement: number;
}

/**
 * Rating for a metric value.
 */
type MetricRating = 'good' | 'needs-improvement' | 'poor';

/**
 * Metric report with value and rating.
 */
interface MetricReport {
  readonly name: string;
  readonly value: number;
  readonly unit: string;
  readonly rating: MetricRating;
}

/**
 * Performance report containing all collected metrics.
 */
interface PerformanceReport {
  readonly timestamp: number;
  readonly url: string;
  readonly metrics: readonly MetricReport[];
}

// =============================================================================
// Core Web Vitals Thresholds (Google's Recommendations)
// =============================================================================

/**
 * Core Web Vitals thresholds based on Google's recommendations.
 * See: https://web.dev/vitals/
 */
const THRESHOLDS: Record<string, MetricThresholds> = {
  // First Contentful Paint: Good < 1.8s, Poor > 3s
  fcp: { good: 1800, needsImprovement: 3000 },
  // Largest Contentful Paint: Good < 2.5s, Poor > 4s
  lcp: { good: 2500, needsImprovement: 4000 },
  // First Input Delay: Good < 100ms, Poor > 300ms
  fid: { good: 100, needsImprovement: 300 },
  // Cumulative Layout Shift: Good < 0.1, Poor > 0.25 (unitless)
  cls: { good: 0.1, needsImprovement: 0.25 },
  // Time to First Byte: Good < 800ms, Poor > 1800ms
  ttfb: { good: 800, needsImprovement: 1800 },
} as const;

/**
 * Human-readable metric names.
 */
const METRIC_NAMES: Record<string, string> = {
  fcp: 'First Contentful Paint',
  lcp: 'Largest Contentful Paint',
  fid: 'First Input Delay',
  cls: 'Cumulative Layout Shift',
  ttfb: 'Time to First Byte',
} as const;

/**
 * Units for each metric.
 */
const METRIC_UNITS: Record<string, string> = {
  fcp: 'ms',
  lcp: 'ms',
  fid: 'ms',
  cls: '',
  ttfb: 'ms',
} as const;

// =============================================================================
// Rating Calculation
// =============================================================================

/**
 * Calculate the rating for a metric value.
 */
function getRating(metric: string, value: number): MetricRating {
  const threshold = THRESHOLDS[metric];

  if (threshold === undefined) {
    return 'good';
  }

  if (value <= threshold.good) {
    return 'good';
  }

  if (value <= threshold.needsImprovement) {
    return 'needs-improvement';
  }

  return 'poor';
}

/**
 * Format a metric value for display.
 */
function formatValue(metric: string, value: number): string {
  if (metric === 'cls') {
    // CLS is a unitless score, show with 3 decimal places
    return value.toFixed(3);
  }

  // Timing metrics in milliseconds
  return `${Math.round(value)}ms`;
}

// =============================================================================
// Basic Usage
// =============================================================================

/**
 * Get current Core Web Vitals metrics.
 */
function getWebVitals(): PerformanceMetrics {
  console.log('--- Core Web Vitals ---');

  // Check if Performance API is supported
  if (!PerformanceMonitor.isSupported()) {
    console.warn('Performance API is not supported');
    return {};
  }

  // Get all available metrics
  const metrics = PerformanceMonitor.getMetrics();

  // Log each metric with its rating
  for (const [key, value] of Object.entries(metrics)) {
    if (value !== undefined) {
      const name = METRIC_NAMES[key] ?? key;
      const formatted = formatValue(key, value);
      const rating = getRating(key, value);

      console.log(`${name}: ${formatted} (${rating})`);
    }
  }

  return metrics;
}

// =============================================================================
// Custom Performance Marks and Measures
// =============================================================================

/**
 * Measure the duration of an async operation.
 */
async function measureOperation<T>(name: string, operation: () => Promise<T>): Promise<T> {
  const startMark = `${name}-start`;
  const endMark = `${name}-end`;

  // Create start mark
  PerformanceMonitor.mark(startMark);

  try {
    // Execute the operation
    const result = await operation();

    // Create end mark
    PerformanceMonitor.mark(endMark);

    // Create measure between marks
    const measure = PerformanceMonitor.measure(name, startMark, endMark);

    if (measure !== undefined) {
      console.log(`[Performance] ${name}: ${Math.round(measure.duration)}ms`);
    }

    return result;
  } finally {
    // Clean up marks
    PerformanceMonitor.clearMarks(startMark);
    PerformanceMonitor.clearMarks(endMark);
  }
}

/**
 * Example: Measuring API call duration.
 */
async function measureApiCall(): Promise<void> {
  console.log('\n--- Measuring API Call ---');

  // Measure a fetch operation
  const data = await measureOperation('api-fetch', async () => {
    const response = await fetch('https://jsonplaceholder.typicode.com/posts/1');
    return response.json();
  });

  console.log('Fetched post:', data.title);
}

/**
 * Example: Measuring multiple operations.
 */
async function measureMultipleOperations(): Promise<void> {
  console.log('\n--- Measuring Multiple Operations ---');

  // Measure initialization
  await measureOperation('init-config', async () => {
    // Simulate config loading
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  // Measure data processing
  await measureOperation('process-data', async () => {
    // Simulate data processing
    const items = Array.from({ length: 10000 }, (_, i) => i);
    items.sort(() => Math.random() - 0.5);
  });

  // Measure rendering
  await measureOperation('render-ui', async () => {
    // Simulate UI rendering
    await new Promise((resolve) => setTimeout(resolve, 30));
  });
}

// =============================================================================
// Real-Time Metric Monitoring
// =============================================================================

/**
 * Set up listeners for real-time metric updates.
 */
function setupMetricListeners(): CleanupFn[] {
  console.log('\n--- Real-Time Metric Monitoring ---');

  const cleanups: CleanupFn[] = [];

  // Listen for FCP (happens early in page load)
  cleanups.push(
    PerformanceMonitor.onMetric('fcp', (value) => {
      const rating = getRating('fcp', value);
      console.log(`[FCP] ${Math.round(value)}ms (${rating})`);
    })
  );

  // Listen for LCP (may update multiple times as larger elements load)
  cleanups.push(
    PerformanceMonitor.onMetric('lcp', (value) => {
      const rating = getRating('lcp', value);
      console.log(`[LCP] ${Math.round(value)}ms (${rating})`);
    })
  );

  // Listen for FID (triggered by first user interaction)
  cleanups.push(
    PerformanceMonitor.onMetric('fid', (value) => {
      const rating = getRating('fid', value);
      console.log(`[FID] ${Math.round(value)}ms (${rating})`);
    })
  );

  // Listen for CLS (accumulates over page lifetime)
  cleanups.push(
    PerformanceMonitor.onMetric('cls', (value) => {
      const rating = getRating('cls', value);
      console.log(`[CLS] ${value.toFixed(3)} (${rating})`);
    })
  );

  console.log('Metric listeners registered. Interact with the page to see updates.');

  return cleanups;
}

// =============================================================================
// Performance Dashboard
// =============================================================================

/**
 * Create a performance metrics dashboard element.
 */
function createDashboard(container: HTMLElement): CleanupFn {
  console.log('\n--- Performance Dashboard ---');

  const dashboard = document.createElement('div');
  dashboard.className = 'performance-dashboard';
  dashboard.innerHTML = `
    <h3>Core Web Vitals</h3>
    <dl class="metrics-list">
      <div class="metric" data-metric="ttfb">
        <dt>TTFB</dt>
        <dd class="value">--</dd>
      </div>
      <div class="metric" data-metric="fcp">
        <dt>FCP</dt>
        <dd class="value">--</dd>
      </div>
      <div class="metric" data-metric="lcp">
        <dt>LCP</dt>
        <dd class="value">--</dd>
      </div>
      <div class="metric" data-metric="fid">
        <dt>FID</dt>
        <dd class="value">--</dd>
      </div>
      <div class="metric" data-metric="cls">
        <dt>CLS</dt>
        <dd class="value">--</dd>
      </div>
    </dl>
  `;

  container.appendChild(dashboard);

  const cleanups: CleanupFn[] = [];

  /**
   * Update a metric in the dashboard.
   */
  function updateMetric(metric: string, value: number): void {
    const element = dashboard.querySelector(`[data-metric="${metric}"]`);
    if (element === null) return;

    const valueEl = element.querySelector('.value');
    if (valueEl === null) return;

    const rating = getRating(metric, value);

    valueEl.textContent = formatValue(metric, value);
    element.className = `metric rating-${rating}`;
    element.setAttribute('title', METRIC_NAMES[metric] ?? metric);
  }

  // Update with initial metrics
  const initialMetrics = PerformanceMonitor.getMetrics();
  for (const [key, value] of Object.entries(initialMetrics)) {
    if (value !== undefined) {
      updateMetric(key, value);
    }
  }

  // Set up listeners for updates
  const metricTypes: MetricType[] = ['fcp', 'lcp', 'fid', 'cls'];
  for (const metric of metricTypes) {
    cleanups.push(
      PerformanceMonitor.onMetric(metric, (value) => {
        updateMetric(metric, value);
      })
    );
  }

  // Return cleanup function
  return () => {
    for (const cleanup of cleanups) {
      cleanup();
    }
    dashboard.remove();
  };
}

// =============================================================================
// Analytics Reporting
// =============================================================================

/**
 * Build a performance report for analytics.
 */
function buildReport(): PerformanceReport {
  const metrics = PerformanceMonitor.getMetrics();
  const reports: MetricReport[] = [];

  for (const [key, value] of Object.entries(metrics)) {
    if (value !== undefined) {
      reports.push({
        name: key,
        value,
        unit: METRIC_UNITS[key] ?? '',
        rating: getRating(key, value),
      });
    }
  }

  return {
    timestamp: Date.now(),
    url: window.location.href,
    metrics: reports,
  };
}

/**
 * Send performance report to analytics endpoint.
 */
async function reportToAnalytics(endpoint: string): Promise<void> {
  console.log('\n--- Reporting to Analytics ---');

  const report = buildReport();

  console.log('Performance report:', JSON.stringify(report, null, 2));

  // In a real app, send to your analytics service
  try {
    // Use sendBeacon for reliability during page unload
    if (navigator.sendBeacon !== undefined) {
      const blob = new Blob([JSON.stringify(report)], { type: 'application/json' });
      navigator.sendBeacon(endpoint, blob);
      console.log('Report sent via sendBeacon');
    } else {
      // Fallback to fetch
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
        keepalive: true,
      });
      console.log('Report sent via fetch');
    }
  } catch (error) {
    console.error('Failed to send report:', error);
  }
}

/**
 * Set up automatic reporting on page unload.
 */
function setupAutoReporting(endpoint: string): CleanupFn {
  const handleUnload = (): void => {
    void reportToAnalytics(endpoint);
  };

  // Use visibilitychange for more reliable detection
  const handleVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden') {
      void reportToAnalytics(endpoint);
    }
  };

  window.addEventListener('pagehide', handleUnload);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    window.removeEventListener('pagehide', handleUnload);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}

// =============================================================================
// Resource Timing Analysis
// =============================================================================

/**
 * Analyze resource loading times.
 */
function analyzeResourceTiming(): void {
  console.log('\n--- Resource Timing Analysis ---');

  const resources = PerformanceMonitor.getEntries('resource') as PerformanceResourceTiming[];

  if (resources.length === 0) {
    console.log('No resource timing data available');
    return;
  }

  // Group by type
  const byType = new Map<string, PerformanceResourceTiming[]>();

  for (const resource of resources) {
    const type = resource.initiatorType;
    const existing = byType.get(type) ?? [];
    existing.push(resource);
    byType.set(type, existing);
  }

  // Report stats for each type
  for (const [type, typeResources] of byType) {
    const durations = typeResources.map((r) => r.duration);
    const total = durations.reduce((a, b) => a + b, 0);
    const avg = total / durations.length;
    const max = Math.max(...durations);

    console.log(`${type}:`);
    console.log(`  Count: ${typeResources.length}`);
    console.log(`  Total: ${Math.round(total)}ms`);
    console.log(`  Average: ${Math.round(avg)}ms`);
    console.log(`  Max: ${Math.round(max)}ms`);
  }

  // Find slowest resources
  const slowest = [...resources].sort((a, b) => b.duration - a.duration).slice(0, 5);

  console.log('\nSlowest resources:');
  for (const resource of slowest) {
    const name = resource.name.split('/').pop() ?? resource.name;
    console.log(`  ${name}: ${Math.round(resource.duration)}ms`);
  }
}

// =============================================================================
// Run All Examples
// =============================================================================

/**
 * Initialize all performance monitoring features.
 */
export function initPerformanceMonitoring(): { cleanup: () => void } {
  console.log('=== Performance Metrics Example ===\n');

  const cleanups: CleanupFn[] = [];

  // Get current metrics
  getWebVitals();

  // Set up real-time monitoring
  cleanups.push(...setupMetricListeners());

  // Create dashboard if container exists
  const dashboardContainer = document.querySelector<HTMLElement>('#performance-dashboard');
  if (dashboardContainer !== null) {
    cleanups.push(createDashboard(dashboardContainer));
  }

  // Analyze resource timing
  analyzeResourceTiming();

  // Set up auto-reporting (use your actual endpoint)
  cleanups.push(setupAutoReporting('/api/metrics'));

  // Run async examples
  void (async () => {
    await measureApiCall();
    await measureMultipleOperations();
  })();

  console.log('\n=== Performance Monitoring Initialized ===');

  return {
    cleanup: () => {
      for (const fn of cleanups) {
        fn();
      }
      console.log('Performance monitoring cleaned up');
    },
  };
}

// Export utilities for use in other modules
export {
  measureOperation,
  buildReport,
  reportToAnalytics,
  getRating,
  formatValue,
  type MetricReport,
  type PerformanceReport,
  type MetricRating,
};

// Uncomment to run on page load
// document.addEventListener('DOMContentLoaded', () => initPerformanceMonitoring());
