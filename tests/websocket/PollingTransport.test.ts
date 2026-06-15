import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PollingTransport } from '../../src/websocket/PollingTransport.js';

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const okResponse = (body: string): Response =>
  ({ ok: true, text: (): Promise<string> => Promise.resolve(body) }) as unknown as Response;

const flush = async (): Promise<void> => {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
  }
};

describe('PollingTransport', () => {
  let originalFetch: typeof fetch;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    originalFetch = globalThis.fetch;
    fetchMock = vi.fn().mockResolvedValue(okResponse(''));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should open on the first poll and deliver non-empty bodies', async () => {
    fetchMock.mockResolvedValueOnce(okResponse('hello'));
    const transport = new PollingTransport('https://recv', 'https://send', 1000);
    const onOpen = vi.fn();
    const onMessage = vi.fn();
    transport.onOpen = onOpen;
    transport.onMessage = onMessage;

    transport.connect();
    await flush();

    expect(onOpen).toHaveBeenCalledOnce();
    expect(onMessage).toHaveBeenCalledWith('hello');

    transport.close();
  });

  it('should skip delivery for an empty body but keep polling', async () => {
    fetchMock.mockResolvedValueOnce(okResponse(''));
    const transport = new PollingTransport('https://recv', 'https://send', 1000);
    const onMessage = vi.fn();
    transport.onMessage = onMessage;

    transport.connect();
    await flush();

    expect(onMessage).not.toHaveBeenCalled();

    transport.close();
  });

  it('should POST messages and report success', () => {
    const transport = new PollingTransport('https://recv', 'https://send', 1000);

    expect(transport.send('hello')).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith('https://send', { method: 'POST', body: 'hello' });
  });

  it('should not send after the transport is closed (line 61)', () => {
    const transport = new PollingTransport('https://recv', 'https://send', 1000);
    transport.close();

    expect(transport.send('late')).toBe(false);
  });

  it('should forward an Event rejection from the POST as-is (line 64 true)', async () => {
    const event = new Event('error');
    fetchMock.mockRejectedValueOnce(event);
    const transport = new PollingTransport('https://recv', 'https://send', 1000);
    const onError = vi.fn();
    transport.onError = onError;

    transport.send('hello');
    await flush();

    expect(onError).toHaveBeenCalledWith(event);
  });

  it('should wrap a non-Event rejection from the POST (line 64 false)', async () => {
    fetchMock.mockRejectedValueOnce('boom');
    const transport = new PollingTransport('https://recv', 'https://send', 1000);
    const onError = vi.fn();
    transport.onError = onError;

    transport.send('hello');
    await flush();

    expect(onError).toHaveBeenCalledWith(expect.any(Event));
  });

  it('should fail and emit close when a poll request rejects', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network'));
    const transport = new PollingTransport('https://recv', 'https://send', 1000);
    const onError = vi.fn();
    const onClose = vi.fn();
    transport.onError = onError;
    transport.onClose = onClose;

    transport.connect();
    await flush();

    expect(onError).toHaveBeenCalledWith(expect.any(Event));
    expect(onClose).toHaveBeenCalledWith(1006, 'Polling request failed');
  });

  it('should fail and emit close on a non-ok poll response', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false } as unknown as Response);
    const transport = new PollingTransport('https://recv', 'https://send', 1000);
    const onClose = vi.fn();
    transport.onClose = onClose;

    transport.connect();
    await flush();

    expect(onClose).toHaveBeenCalledWith(1006, 'Polling request failed');
  });

  it('should ignore a poll that resolves after the connection changed (line 95)', async () => {
    const get = deferred<Response>();
    fetchMock.mockReturnValueOnce(get.promise);
    const transport = new PollingTransport('https://recv', 'https://send', 1000);
    const onOpen = vi.fn();
    const onMessage = vi.fn();
    transport.onOpen = onOpen;
    transport.onMessage = onMessage;

    transport.connect(); // poll for generation 1, GET pending
    transport.close(); // teardown bumps the generation
    get.resolve(okResponse('stale'));
    await flush();

    // The resumed poll sees a newer generation and bails out before onOpen.
    expect(onOpen).not.toHaveBeenCalled();
    expect(onMessage).not.toHaveBeenCalled();
  });

  it('should ignore a body read that resolves after the connection changed (line 115)', async () => {
    const text = deferred<string>();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: (): Promise<string> => text.promise,
    } as unknown as Response);
    const transport = new PollingTransport('https://recv', 'https://send', 1000);
    const onOpen = vi.fn();
    const onMessage = vi.fn();
    transport.onOpen = onOpen;
    transport.onMessage = onMessage;

    transport.connect();
    await flush(); // GET resolved, onOpen fired, text() pending
    transport.close(); // generation bumped while reading the body
    text.resolve('stale');
    await flush();

    expect(onOpen).toHaveBeenCalledOnce();
    expect(onMessage).not.toHaveBeenCalled();
  });

  it('should ignore a rejected poll from a previous connection (line 131)', async () => {
    const get = deferred<Response>();
    fetchMock.mockReturnValueOnce(get.promise);
    const transport = new PollingTransport('https://recv', 'https://send', 1000);
    const onError = vi.fn();
    const onClose = vi.fn();
    transport.onError = onError;
    transport.onClose = onClose;

    transport.connect(); // poll for generation 1, GET pending
    transport.close(); // teardown + close emitted (generation bumped)
    get.reject(new Error('late failure'));
    await flush();

    // fail() runs for the stale generation, so it does not re-report.
    expect(onError).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('should emit close only once across repeated close calls (line 146)', () => {
    const transport = new PollingTransport('https://recv', 'https://send', 1000);
    const onClose = vi.fn();
    transport.onClose = onClose;

    transport.connect();
    transport.close();
    transport.close();

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('should refuse binary frames', () => {
    const transport = new PollingTransport('https://recv', 'https://send', 1000);
    expect(transport.sendBinary(new ArrayBuffer(2))).toBe(false);
    expect(() => transport.setBinaryType()).not.toThrow();
  });
});
