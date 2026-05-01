/**
 * Stream Progress - Upload and download progress tracking for fetch requests.
 *
 * Wraps request/response body ReadableStreams to report progress via callback.
 * Works standalone or as RequestInterceptor middleware.
 *
 * @example Download progress (standalone)
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
 * @example Upload progress (standalone)
 * ```TypeScript
 * const body = new Blob([largeData]);
 * const trackedBody = trackUploadProgress(body, (progress) => {
 *   console.log(`Uploaded: ${progress.percentage ?? '?'}%`);
 * });
 * await fetch('https://example.com/upload', { method: 'POST', body: trackedBody });
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
 *   onUploadProgress: (progress) => {
 *     console.log(`Uploaded: ${progress.percentage ?? '?'}%`);
 *   },
 * }));
 * ```
 */
import type {
  InterceptedResponse,
  MutableRequestConfig,
  RequestMiddleware,
} from './RequestInterceptor.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Progress information reported during upload or download.
 */
export interface ProgressInfo {
  /** Bytes transferred so far */
  readonly loaded: number;
  /** Total bytes expected, or null if unknown */
  readonly total: number | null;
  /** Transfer percentage (0-100), or null if total is unknown */
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
  readonly onDownloadProgress?: ProgressCallback;
  /** Callback invoked on each uploaded chunk */
  readonly onUploadProgress?: ProgressCallback;
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
 * Create a ReadableStream that wraps a source reader and reports progress.
 */
function createProgressStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  total: number | null,
  onProgress: ProgressCallback
): ReadableStream<Uint8Array> {
  let loaded = 0;

  return new ReadableStream<Uint8Array>({
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

  const stream = createProgressStream(response.body.getReader(), total, onProgress);

  return new Response(stream, {
    headers: response.headers,
    status: response.status,
    statusText: response.statusText,
  });
}

// =============================================================================
// Upload Progress
// =============================================================================

/**
 * Get the byte size of a request body, if deterministic.
 * Returns null for types where size cannot be determined without consuming the body
 * (FormData, ReadableStream).
 */
function getBodySize(body: BodyInit): number | null {
  if (body instanceof Blob) {
    return body.size;
  }
  if (body instanceof ArrayBuffer) {
    return body.byteLength;
  }
  if (ArrayBuffer.isView(body)) {
    return body.byteLength;
  }
  if (typeof body === 'string') {
    return new TextEncoder().encode(body).byteLength;
  }
  if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) {
    return new TextEncoder().encode(body.toString()).byteLength;
  }
  // ReadableStream, FormData — size unknown
  return null;
}

/**
 * Convert a BodyInit value to a ReadableStream.
 * Returns an empty stream for empty bodies (e.g. empty string, empty Blob).
 */
function bodyToStream(body: BodyInit): ReadableStream<Uint8Array> {
  if (body instanceof ReadableStream) {
    return body as ReadableStream<Uint8Array>;
  }
  const responseBody = new Response(body).body;
  if (responseBody === null) {
    return new ReadableStream<Uint8Array>({
      start(controller): void {
        controller.close();
      },
    });
  }
  return responseBody;
}

/**
 * Wrap a request body to track upload progress.
 *
 * Returns a ReadableStream that reports progress to the callback as chunks
 * are read. The total size is determined from the body type when possible
 * (Blob, ArrayBuffer, string, URLSearchParams); for ReadableStream and
 * FormData bodies, total is null.
 *
 * The returned stream supports cancellation — cancelling it propagates
 * to the original body stream.
 *
 * @param body - The request body to track
 * @param onProgress - Callback invoked on each chunk sent
 * @returns A ReadableStream with progress-tracked body
 */
export function trackUploadProgress(
  body: BodyInit,
  onProgress: ProgressCallback
): ReadableStream<Uint8Array> {
  const total = getBodySize(body);
  const source = bodyToStream(body);

  return createProgressStream(source.getReader(), total, onProgress);
}

// =============================================================================
// Middleware
// =============================================================================

/**
 * Create a RequestMiddleware that tracks upload and/or download progress.
 *
 * When `onUploadProgress` is provided, the middleware wraps the request body
 * in the `onRequest` phase. When `onDownloadProgress` is provided, it wraps
 * the response body in the `onResponse` phase. Both can be used simultaneously.
 *
 * @param options - Progress middleware options
 * @returns A RequestMiddleware instance
 */
export function createProgressMiddleware(options: ProgressMiddlewareOptions): RequestMiddleware {
  const result: {
    onRequest?: (config: MutableRequestConfig) => MutableRequestConfig;
    onResponse?: (response: InterceptedResponse) => InterceptedResponse;
  } = {};

  if (options.onUploadProgress !== undefined) {
    const onProgress = options.onUploadProgress;
    result.onRequest = (config: MutableRequestConfig): MutableRequestConfig => {
      if (config.body != null) {
        return { ...config, body: trackUploadProgress(config.body, onProgress) };
      }
      return config;
    };
  }

  if (options.onDownloadProgress !== undefined) {
    const onProgress = options.onDownloadProgress;
    result.onResponse = (response: InterceptedResponse): InterceptedResponse => {
      const trackedResponse = trackDownloadProgress(response.response, onProgress);

      return {
        response: trackedResponse,
        url: response.url,
        duration: response.duration,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      };
    };
  }

  return result;
}
