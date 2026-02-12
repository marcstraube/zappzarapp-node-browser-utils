/**
 * Performance module - Performance API wrapper with Core Web Vitals.
 *
 * @example
 * ```TypeScript
 * import { PerformanceMonitor } from '@zappzarapp/browser-utils/performance';
 *
 * // Create marks and measures
 * PerformanceMonitor.mark('start');
 * await doWork();
 * PerformanceMonitor.mark('end');
 * const measure = PerformanceMonitor.measure('work', 'start', 'end');
 *
 * // Get Core Web Vitals
 * const metrics = PerformanceMonitor.getMetrics();
 *
 * // Listen for LCP updates
 * const cleanup = PerformanceMonitor.onMetric('lcp', (value) => {
 *   console.log('LCP:', value);
 * });
 * ```
 *
 * @packageDocumentation
 */

export { PerformanceMonitor } from './PerformanceMonitor.js';
export type {
  PerformanceMonitorInstance,
  PerformanceMetrics,
  MetricType,
  MetricHandler,
} from './PerformanceMonitor.js';
