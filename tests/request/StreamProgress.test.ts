/**
 * StreamProgress Tests.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  trackDownloadProgress,
  trackUploadProgress,
  createProgressMiddleware,
  type ProgressInfo,
  type InterceptedResponse,
  type MutableRequestConfig,
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

  describe('trackUploadProgress', () => {
    /**
     * Consume a ReadableStream and return all collected bytes.
     */
    async function consumeStream(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
      const reader = stream.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const totalLength = chunks.reduce((sum, c) => sum + c.byteLength, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.byteLength;
      }
      return result;
    }

    it('should track progress for Blob body with known size', async () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      const blob = new Blob([data]);
      const events: ProgressInfo[] = [];

      const stream = trackUploadProgress(blob, (progress) => {
        events.push(progress);
      });

      await consumeStream(stream);

      expect(events.length).toBeGreaterThan(0);
      const lastEvent = events[events.length - 1]!;
      expect(lastEvent.loaded).toBe(5);
      expect(lastEvent.total).toBe(5);
      expect(lastEvent.percentage).toBe(100);
    });

    it('should track progress for string body with known size', async () => {
      const body = 'Hello, World!';
      const expectedSize = new TextEncoder().encode(body).byteLength;
      const events: ProgressInfo[] = [];

      const stream = trackUploadProgress(body, (progress) => {
        events.push(progress);
      });

      await consumeStream(stream);

      const lastEvent = events[events.length - 1]!;
      expect(lastEvent.loaded).toBe(expectedSize);
      expect(lastEvent.total).toBe(expectedSize);
      expect(lastEvent.percentage).toBe(100);
    });

    it('should track progress for ArrayBuffer body with known size', async () => {
      const buffer = new ArrayBuffer(64);
      const events: ProgressInfo[] = [];

      const stream = trackUploadProgress(buffer, (progress) => {
        events.push(progress);
      });

      await consumeStream(stream);

      const lastEvent = events[events.length - 1]!;
      expect(lastEvent.loaded).toBe(64);
      expect(lastEvent.total).toBe(64);
      expect(lastEvent.percentage).toBe(100);
    });

    it('should track progress for Uint8Array body with known size', async () => {
      const data = new Uint8Array(128);
      const events: ProgressInfo[] = [];

      const stream = trackUploadProgress(data, (progress) => {
        events.push(progress);
      });

      await consumeStream(stream);

      const lastEvent = events[events.length - 1]!;
      expect(lastEvent.loaded).toBe(128);
      expect(lastEvent.total).toBe(128);
      expect(lastEvent.percentage).toBe(100);
    });

    it('should track progress for URLSearchParams with known size', async () => {
      const params = new URLSearchParams({ key: 'value', foo: 'bar' });
      const expectedSize = new TextEncoder().encode(params.toString()).byteLength;
      const events: ProgressInfo[] = [];

      const stream = trackUploadProgress(params, (progress) => {
        events.push(progress);
      });

      await consumeStream(stream);

      const lastEvent = events[events.length - 1]!;
      expect(lastEvent.loaded).toBe(expectedSize);
      expect(lastEvent.total).toBe(expectedSize);
      expect(lastEvent.percentage).toBe(100);
    });

    it('should report null total for ReadableStream body', async () => {
      const source = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3]));
          controller.close();
        },
      });
      const events: ProgressInfo[] = [];

      const stream = trackUploadProgress(source, (progress) => {
        events.push(progress);
      });

      await consumeStream(stream);

      for (const event of events) {
        expect(event.total).toBeNull();
        expect(event.percentage).toBeNull();
      }
      expect(events[events.length - 1]!.loaded).toBe(3);
    });

    it('should handle empty Blob body', async () => {
      const blob = new Blob([]);
      const events: ProgressInfo[] = [];

      const stream = trackUploadProgress(blob, (progress) => {
        events.push(progress);
      });

      await consumeStream(stream);

      expect(events.length).toBeGreaterThan(0);
      const lastEvent = events[events.length - 1]!;
      expect(lastEvent.loaded).toBe(0);
      expect(lastEvent.total).toBe(0);
      expect(lastEvent.percentage).toBe(100);
    });

    it('should handle empty string body', async () => {
      const events: ProgressInfo[] = [];

      const stream = trackUploadProgress('', (progress) => {
        events.push(progress);
      });

      await consumeStream(stream);

      const lastEvent = events[events.length - 1]!;
      expect(lastEvent.loaded).toBe(0);
      expect(lastEvent.total).toBe(0);
      expect(lastEvent.percentage).toBe(100);
    });

    it('should propagate cancellation to the source stream', async () => {
      const cancelFn = vi.fn();
      const source = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array(10));
        },
        cancel: cancelFn,
      });

      const stream = trackUploadProgress(source, vi.fn());
      const reader = stream.getReader();

      await reader.read();
      await reader.cancel('aborted');

      expect(cancelFn).toHaveBeenCalledWith('aborted');
    });

    it('should preserve data integrity through the stream', async () => {
      const original = new TextEncoder().encode('Upload data integrity test');
      const blob = new Blob([original]);

      const stream = trackUploadProgress(blob, vi.fn());
      const result = await consumeStream(stream);

      expect(new TextDecoder().decode(result)).toBe('Upload data integrity test');
    });

    it('should emit final progress event with 100% on stream end', async () => {
      const data = new Uint8Array(50);
      const blob = new Blob([data]);
      const events: ProgressInfo[] = [];

      const stream = trackUploadProgress(blob, (progress) => {
        events.push(progress);
      });

      await consumeStream(stream);

      const lastEvent = events[events.length - 1]!;
      expect(lastEvent.percentage).toBe(100);
    });

    it('should handle multi-byte UTF-8 strings correctly', async () => {
      const body = 'Hallo Welt! 🌍';
      const expectedSize = new TextEncoder().encode(body).byteLength;
      const events: ProgressInfo[] = [];

      const stream = trackUploadProgress(body, (progress) => {
        events.push(progress);
      });

      await consumeStream(stream);

      const lastEvent = events[events.length - 1]!;
      expect(lastEvent.total).toBe(expectedSize);
      expect(lastEvent.loaded).toBe(expectedSize);
    });
  });

  describe('createProgressMiddleware', () => {
    it('should return a middleware with only onResponse when download only', () => {
      const middleware = createProgressMiddleware({
        onDownloadProgress: vi.fn(),
      });

      expect(middleware.onResponse).toBeTypeOf('function');
      expect(middleware.onRequest).toBeUndefined();
      expect(middleware.onError).toBeUndefined();
    });

    it('should return a middleware with only onRequest when upload only', () => {
      const middleware = createProgressMiddleware({
        onUploadProgress: vi.fn(),
      });

      expect(middleware.onRequest).toBeTypeOf('function');
      expect(middleware.onResponse).toBeUndefined();
      expect(middleware.onError).toBeUndefined();
    });

    it('should return a middleware with both handlers when both provided', () => {
      const middleware = createProgressMiddleware({
        onDownloadProgress: vi.fn(),
        onUploadProgress: vi.fn(),
      });

      expect(middleware.onRequest).toBeTypeOf('function');
      expect(middleware.onResponse).toBeTypeOf('function');
      expect(middleware.onError).toBeUndefined();
    });

    it('should return empty middleware when no options provided', () => {
      const middleware = createProgressMiddleware({});

      expect(middleware.onRequest).toBeUndefined();
      expect(middleware.onResponse).toBeUndefined();
    });

    it('should wrap request body with upload progress tracking', async () => {
      const events: ProgressInfo[] = [];
      const middleware = createProgressMiddleware({
        onUploadProgress: (progress) => events.push(progress),
      });

      const config: MutableRequestConfig = {
        url: 'https://example.com/upload',
        method: 'POST',
        headers: new Headers(),
        body: new Blob([new Uint8Array(100)]),
      };

      const result = middleware.onRequest!(config) as MutableRequestConfig;

      expect(result.body).not.toBe(config.body);
      expect(result.body).toBeInstanceOf(ReadableStream);
      expect(result.url).toBe('https://example.com/upload');
      expect(result.method).toBe('POST');

      // Consume the stream to trigger progress
      const reader = (result.body as ReadableStream<Uint8Array>).getReader();
      while (true) {
        const { done } = await reader.read();
        if (done) break;
      }

      expect(events.length).toBeGreaterThan(0);
      expect(events[events.length - 1]!.percentage).toBe(100);
    });

    it('should not wrap null body in upload middleware', () => {
      const middleware = createProgressMiddleware({
        onUploadProgress: vi.fn(),
      });

      const config: MutableRequestConfig = {
        url: 'https://example.com/data',
        method: 'GET',
        headers: new Headers(),
        body: null,
      };

      const result = middleware.onRequest!(config) as MutableRequestConfig;

      expect(result.body).toBeNull();
      expect(result).toEqual(config);
    });

    it('should not wrap undefined body in upload middleware', () => {
      const middleware = createProgressMiddleware({
        onUploadProgress: vi.fn(),
      });

      const config: MutableRequestConfig = {
        url: 'https://example.com/data',
        method: 'GET',
        headers: new Headers(),
      };

      const result = middleware.onRequest!(config) as MutableRequestConfig;

      expect(result.body).toBeUndefined();
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
