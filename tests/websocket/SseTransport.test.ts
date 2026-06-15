import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SseTransport } from '../../src/websocket/SseTransport.js';

/**
 * Minimal EventSource mock capturing the handlers the transport assigns.
 */
class MockEventSource {
  static instances: MockEventSource[] = [];

  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  close = vi.fn();

  constructor(public url: string) {
    MockEventSource.instances.push(this);
  }
}

const flush = async (): Promise<void> => {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
  }
};

describe('SseTransport', () => {
  let originalEventSource: typeof EventSource;
  let originalFetch: typeof fetch;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    MockEventSource.instances = [];
    originalEventSource = globalThis.EventSource;
    originalFetch = globalThis.fetch;
    globalThis.EventSource = MockEventSource as unknown as typeof EventSource;
    fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.EventSource = originalEventSource;
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  const lastEs = (): MockEventSource => {
    const instance = MockEventSource.instances.at(-1);
    if (instance === undefined) throw new Error('no EventSource created');
    return instance;
  };

  it('should forward open and message events', () => {
    const transport = new SseTransport('https://recv', 'https://send');
    const onOpen = vi.fn();
    const onMessage = vi.fn();
    transport.onOpen = onOpen;
    transport.onMessage = onMessage;

    transport.connect();
    const es = lastEs();
    es.onopen?.();
    const event = new MessageEvent('message', { data: 'payload' });
    es.onmessage?.(event);

    expect(onOpen).toHaveBeenCalledOnce();
    expect(onMessage).toHaveBeenCalledWith('payload', event);
  });

  it('should tear down and emit a close on stream error', () => {
    const transport = new SseTransport('https://recv', 'https://send');
    const onError = vi.fn();
    const onClose = vi.fn();
    transport.onError = onError;
    transport.onClose = onClose;

    transport.connect();
    const es = lastEs();
    es.onerror?.(new Event('error'));

    expect(onError).toHaveBeenCalledWith(expect.any(Event));
    expect(es.close).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledWith(1006, 'SSE connection error');
  });

  it('should POST messages and report success', () => {
    const transport = new SseTransport('https://recv', 'https://send');
    transport.connect();

    expect(transport.send('hello')).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith('https://send', { method: 'POST', body: 'hello' });
  });

  it('should not send after the transport is closed (line 64)', () => {
    const transport = new SseTransport('https://recv', 'https://send');
    transport.connect();
    transport.close();

    expect(transport.send('late')).toBe(false);
  });

  it('should forward an Event rejection from the POST as-is (line 67 true)', async () => {
    const event = new Event('error');
    fetchMock.mockRejectedValueOnce(event);
    const transport = new SseTransport('https://recv', 'https://send');
    const onError = vi.fn();
    transport.onError = onError;
    transport.connect();

    transport.send('hello');
    await flush();

    expect(onError).toHaveBeenCalledWith(event);
  });

  it('should wrap a non-Event rejection from the POST (line 67 false)', async () => {
    fetchMock.mockRejectedValueOnce('boom');
    const transport = new SseTransport('https://recv', 'https://send');
    const onError = vi.fn();
    transport.onError = onError;
    transport.connect();

    transport.send('hello');
    await flush();

    expect(onError).toHaveBeenCalledWith(expect.any(Event));
  });

  it('should tolerate close before connect (line 90)', () => {
    const transport = new SseTransport('https://recv', 'https://send');
    const onClose = vi.fn();
    transport.onClose = onClose;

    // No EventSource was created, so teardown's `if (this.source)` is false.
    expect(() => transport.close(1000, 'bye')).not.toThrow();
    expect(onClose).toHaveBeenCalledWith(1000, 'bye');
  });

  it('should emit close only once across repeated close calls (line 97)', () => {
    const transport = new SseTransport('https://recv', 'https://send');
    const onClose = vi.fn();
    transport.onClose = onClose;

    transport.connect();
    transport.close();
    transport.close();

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('should refuse binary frames', () => {
    const transport = new SseTransport('https://recv', 'https://send');
    expect(transport.sendBinary(new ArrayBuffer(2))).toBe(false);
    expect(() => transport.setBinaryType()).not.toThrow();
  });
});
