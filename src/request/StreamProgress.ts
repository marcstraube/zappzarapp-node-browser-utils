/**
 * Stream Progress - Download progress tracking for fetch responses.
 *
 * Wraps a Response body ReadableStream to report download progress via callback.
 * Works standalone or as RequestInterceptor middleware.
 *
 * @example Standalone usage
 * ```TypeScript
 * const response = await fetch('https://example.com/large-file.zip');
 * const tracked = trackDownloadProgress(response, (progress) => {
 *   console.log(`${progress.loaded} / ${progress.total ?? '?'} bytes`);
 *   if (progress.percentage !== null) {
 *     updateProgressBar(progress.percentage);
 *   }
 * });
 * const blob = await tracked.blob();
 * ```
 *
 * @example With RequestInterceptor middleware
 * ```TypeScript
 * const api = RequestInterceptor.create({
 *   baseUrl: 'https://api.example.com',
 * });
 *
 * api.use(createProgressMiddleware({
 *   onDownloadProgress: (progress) => {
 *     console.log(`Downloaded: ${progress.percentage ?? '?'}%`);
 *   },
 * }));
 *
 * const response = await api.get('/files/large.zip');
 * await response.blob();
 * ```
 */
import type { InterceptedResponse, RequestMiddleware } from './RequestInterceptor.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Progress information reported during download.
 */
export interface ProgressInfo {
  /** Bytes received so far */
  readonly loaded: number;
  /** Total bytes expected (from Content-Length), or null if unknown */
  readonly total: number | null;
  /** Download percentage (0-100), or null if total is unknown */
  readonly percentage: number | null;
}

/**
 * Callback invoked on each chunk received.
 */
export type ProgressCallback = (progress: ProgressInfo) => void;

/**
 * Options for progress middleware.
 */
export interface ProgressMiddlewareOptions {
  /** Callback invoked on each downloaded chunk */
  readonly onDownloadProgress: ProgressCallback;
}

// =============================================================================
// Implementation
// =============================================================================

/**
 * Parse total bytes from Content-Length header.
 * Returns null if header is missing, empty, or not a valid positive integer.
 */
function parseContentLength(headers: Headers): number | null {
  const value = headers.get('Content-Length');
  if (value === null || value === '') {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

/**
 * Calculate percentage from loaded and total bytes.
 * Returns null if total is unknown, 100 if total is 0 (empty response).
 * Capped at 100 to handle Content-Length mismatches.
 */
function calculatePercentage(loaded: number, total: number | null): number | null {
  if (total === null) {
    return null;
  }
  if (total === 0) {
    return 100;
  }
  return Math.min(Math.round((loaded / total) * 100), 100);
}

/**
 * Wrap a Response's body stream to track download progress.
 *
 * Returns a new Response with the same status and headers but a body
 * stream that reports progress to the callback on each chunk.
 *
 * If the response has no body (e.g. 204 No Content), the callback is
 * invoked once with loaded=0 and the original response is returned.
 *
 * The progress stream supports cancellation — cancelling the returned
 * response's body will propagate to the original stream.
 *
 * @param response - The fetch Response to track
 * @param onProgress - Callback invoked on each chunk received
 * @returns A new Response with progress-tracked body
 */
export function trackDownloadProgress(response: Response, onProgress: ProgressCallback): Response {
  const total = parseContentLength(response.headers);

  if (response.body === null) {
    onProgress({
      loaded: 0,
      total,
      percentage: calculatePercentage(0, total),
    });
    return response;
  }

  let loaded = 0;
  const reader = response.body.getReader();

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller): Promise<void> {
      const { done, value } = await reader.read();

      if (done) {
        onProgress({
          loaded,
          total,
          percentage: total !== null ? 100 : null,
        });
        controller.close();
        return;
      }

      loaded += value.byteLength;

      onProgress({
        loaded,
        total,
        percentage: calculatePercentage(loaded, total),
      });

      controller.enqueue(value);
    },

    cancel(reason?: unknown): Promise<void> {
      return reader.cancel(reason);
    },
  });

  return new Response(stream, {
    headers: response.headers,
    status: response.status,
    statusText: response.statusText,
  });
}

/**
 * Create a RequestMiddleware that tracks download progress.
 *
 * The middleware wraps the response body stream in the `onResponse` phase,
 * so progress is reported as the consumer reads the body (e.g. via
 * `response.json()`, `response.blob()`, or `response.body.getReader()`).
 *
 * @param options - Progress middleware options
 * @returns A RequestMiddleware instance
 */
export function createProgressMiddleware(options: ProgressMiddlewareOptions): RequestMiddleware {
  return {
    onResponse(response: InterceptedResponse): InterceptedResponse {
      const trackedResponse = trackDownloadProgress(response.response, options.onDownloadProgress);

      return {
        response: trackedResponse,
        url: response.url,
        duration: response.duration,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      };
    },
  };
}
