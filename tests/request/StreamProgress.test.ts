/**
 * StreamProgress Tests.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  trackDownloadProgress,
  createProgressMiddleware,
  type ProgressInfo,
  type InterceptedResponse,
} from '../../src/request/index.js';

/**
 * Create a Response with a ReadableStream body from chunks.
 */
function createStreamResponse(
  chunks: Uint8Array[],
  options?: { contentLength?: number; status?: number; statusText?: string }
): Response {
  const headers = new Headers();
  if (options?.contentLength !== undefined) {
    headers.set('Content-Length', String(options.contentLength));
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers,
    status: options?.status ?? 200,
    statusText: options?.statusText ?? 'OK',
  });
}

/**
 * Create a Uint8Array of the given size filled with zeros.
 */
function createChunk(size: number): Uint8Array {
  return new Uint8Array(size);
}

describe('StreamProgress', () => {
  describe('trackDownloadProgress', () => {
    it('should report progress for each chunk with known total', async () => {
      const chunks = [createChunk(30), createChunk(30), createChunk(40)];
      const response = createStreamResponse(chunks, { contentLength: 100 });
      const events: ProgressInfo[] = [];

      const tracked = trackDownloadProgress(response, (progress) => {
        events.push(progress);
      });

      await tracked.arrayBuffer();

      expect(events).toEqual([
        { loaded: 30, total: 100, percentage: 30 },
        { loaded: 60, total: 100, percentage: 60 },
        { loaded: 100, total: 100, percentage: 100 },
        { loaded: 100, total: 100, percentage: 100 },
      ]);
    });

    it('should report null percentage when Content-Length is missing', async () => {
      const chunks = [createChunk(50), createChunk(50)];
      const response = createStreamResponse(chunks);
      const events: ProgressInfo[] = [];

      const tracked = trackDownloadProgress(response, (progress) => {
        events.push(progress);
      });

      await tracked.arrayBuffer();

      expect(events).toEqual([
        { loaded: 50, total: null, percentage: null },
        { loaded: 100, total: null, percentage: null },
        { loaded: 100, total: null, percentage: null },
      ]);
    });

    it('should handle empty body (null stream)', async () => {
      const response = new Response(null, {
        status: 204,
        statusText: 'No Content',
      });
      const events: ProgressInfo[] = [];

      const tracked = trackDownloadProgress(response, (progress) => {
        events.push(progress);
      });

      expect(tracked).toBe(response);
      expect(events).toEqual([{ loaded: 0, total: null, percentage: null }]);
    });

    it('should handle empty body with Content-Length 0', async () => {
      const response = new Response(null, {
        status: 204,
        headers: { 'Content-Length': '0' },
      });
      const events: ProgressInfo[] = [];

      const tracked = trackDownloadProgress(response, (progress) => {
        events.push(progress);
      });

      expect(tracked).toBe(response);
      expect(events).toEqual([{ loaded: 0, total: 0, percentage: 100 }]);
    });

    it('should preserve response status and headers', async () => {
      const chunks = [createChunk(10)];
      const response = createStreamResponse(chunks, {
        contentLength: 10,
        status: 206,
        statusText: 'Partial Content',
      });

      const tracked = trackDownloadProgress(response, vi.fn());

      expect(tracked.status).toBe(206);
      expect(tracked.statusText).toBe('Partial Content');
      expect(tracked.headers.get('Content-Length')).toBe('10');
    });

    it('should return a new Response (not the original)', async () => {
      const chunks = [createChunk(5)];
      const response = createStreamResponse(chunks, { contentLength: 5 });

      const tracked = trackDownloadProgress(response, vi.fn());

      expect(tracked).not.toBe(response);
    });

    it('should cap percentage at 100 when actual exceeds Content-Length', async () => {
      const chunks = [createChunk(60), createChunk(60)];
      const response = createStreamResponse(chunks, { contentLength: 100 });
      const events: ProgressInfo[] = [];

      const tracked = trackDownloadProgress(response, (progress) => {
        events.push(progress);
      });

      await tracked.arrayBuffer();

      expect(events[0]!.percentage).toBe(60);
      expect(events[1]!.percentage).toBe(100);
    });

    it('should handle single-chunk download', async () => {
      const chunks = [createChunk(100)];
      const response = createStreamResponse(chunks, { contentLength: 100 });
      const events: ProgressInfo[] = [];

      const tracked = trackDownloadProgress(response, (progress) => {
        events.push(progress);
      });

      await tracked.arrayBuffer();

      expect(events).toEqual([
        { loaded: 100, total: 100, percentage: 100 },
        { loaded: 100, total: 100, percentage: 100 },
      ]);
    });

    it('should handle invalid Content-Length (non-numeric)', async () => {
      const response = new Response(new Uint8Array(10), {
        headers: { 'Content-Length': 'invalid' },
      });
      const events: ProgressInfo[] = [];

      const tracked = trackDownloadProgress(response, (progress) => {
        events.push(progress);
      });

      await tracked.arrayBuffer();

      for (const event of events) {
        expect(event.total).toBeNull();
        expect(event.percentage).toBeNull();
      }
    });

    it('should handle negative Content-Length', async () => {
      const response = new Response(new Uint8Array(10), {
        headers: { 'Content-Length': '-5' },
      });
      const events: ProgressInfo[] = [];

      const tracked = trackDownloadProgress(response, (progress) => {
        events.push(progress);
      });

      await tracked.arrayBuffer();

      for (const event of events) {
        expect(event.total).toBeNull();
        expect(event.percentage).toBeNull();
      }
    });

    it('should handle fractional Content-Length', async () => {
      const response = new Response(new Uint8Array(10), {
        headers: { 'Content-Length': '10.5' },
      });
      const events: ProgressInfo[] = [];

      const tracked = trackDownloadProgress(response, (progress) => {
        events.push(progress);
      });

      await tracked.arrayBuffer();

      for (const event of events) {
        expect(event.total).toBeNull();
        expect(event.percentage).toBeNull();
      }
    });

    it('should propagate cancellation to the original stream', async () => {
      const cancelFn = vi.fn();
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(createChunk(10));
          // Don't close — simulate long-running stream
        },
        cancel: cancelFn,
      });

      const response = new Response(stream, {
        headers: { 'Content-Length': '1000' },
      });

      const tracked = trackDownloadProgress(response, vi.fn());
      const reader = tracked.body!.getReader();

      // Read one chunk
      await reader.read();

      // Cancel the stream
      await reader.cancel('user cancelled');

      expect(cancelFn).toHaveBeenCalledWith('user cancelled');
    });

    it('should produce readable body data', async () => {
      const data = new TextEncoder().encode('Hello, World!');
      const chunks = [data.slice(0, 5), data.slice(5)];
      const response = createStreamResponse(chunks, {
        contentLength: data.byteLength,
      });

      const tracked = trackDownloadProgress(response, vi.fn());
      const text = await tracked.text();

      expect(text).toBe('Hello, World!');
    });

    it('should emit final progress event on stream end', async () => {
      const chunks = [createChunk(50)];
      const response = createStreamResponse(chunks, { contentLength: 100 });
      const events: ProgressInfo[] = [];

      const tracked = trackDownloadProgress(response, (progress) => {
        events.push(progress);
      });

      await tracked.arrayBuffer();

      const lastEvent = events[events.length - 1]!;
      expect(lastEvent.loaded).toBe(50);
      expect(lastEvent.total).toBe(100);
      expect(lastEvent.percentage).toBe(100);
    });
  });

  describe('createProgressMiddleware', () => {
    it('should return a middleware with onResponse handler', () => {
      const middleware = createProgressMiddleware({
        onDownloadProgress: vi.fn(),
      });

      expect(middleware.onResponse).toBeTypeOf('function');
      expect(middleware.onRequest).toBeUndefined();
      expect(middleware.onError).toBeUndefined();
    });

    it('should wrap response body with progress tracking', async () => {
      const events: ProgressInfo[] = [];
      const middleware = createProgressMiddleware({
        onDownloadProgress: (progress) => events.push(progress),
      });

      const chunks = [createChunk(25), createChunk(75)];
      const originalResponse = createStreamResponse(chunks, {
        contentLength: 100,
      });

      const intercepted: InterceptedResponse = {
        response: originalResponse,
        url: 'https://example.com/file',
        duration: 50,
        status: 200,
        statusText: 'OK',
        headers: originalResponse.headers,
      };

      const result = middleware.onResponse!(intercepted) as InterceptedResponse;

      expect(result.response).not.toBe(originalResponse);
      expect(result.url).toBe('https://example.com/file');
      expect(result.duration).toBe(50);
      expect(result.status).toBe(200);
      expect(result.statusText).toBe('OK');
      expect(result.headers).toBe(intercepted.headers);

      await result.response.arrayBuffer();

      expect(events.length).toBeGreaterThan(0);
      expect(events[0]!.loaded).toBe(25);
      expect(events[0]!.total).toBe(100);
    });

    it('should preserve intercepted response metadata', () => {
      const middleware = createProgressMiddleware({
        onDownloadProgress: vi.fn(),
      });

      const originalResponse = new Response(null, { status: 204 });
      const customHeaders = new Headers({ 'X-Custom': 'value' });

      const intercepted: InterceptedResponse = {
        response: originalResponse,
        url: 'https://api.example.com/data',
        duration: 123,
        status: 204,
        statusText: 'No Content',
        headers: customHeaders,
      };

      const result = middleware.onResponse!(intercepted) as InterceptedResponse;

      expect(result.url).toBe('https://api.example.com/data');
      expect(result.duration).toBe(123);
      expect(result.status).toBe(204);
      expect(result.statusText).toBe('No Content');
      expect(result.headers).toBe(customHeaders);
    });
  });
});
