import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocketTransport } from '../../src/websocket/WebSocketTransport.js';
import { WebSocketError } from '../../src/core/index.js';

/**
 * Minimal WebSocket mock exposing the readyState constants and the lifecycle
 * handlers the transport assigns.
 */
class MockWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  static instances: MockWebSocket[] = [];

  readyState: number = MockWebSocket.CONNECTING;
  binaryType = 'blob';
  send = vi.fn();
  close = vi.fn();

  onopen: (() => void) | null = null;
  onclose: ((event: { code: number; reason: string }) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(
    public url: string,
    public protocols?: string | string[]
  ) {
    MockWebSocket.instances.push(this);
  }
}

describe('WebSocketTransport', () => {
  let originalWebSocket: typeof WebSocket;

  beforeEach(() => {
    MockWebSocket.instances = [];
    originalWebSocket = globalThis.WebSocket;
    globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket;
  });

  afterEach(() => {
    globalThis.WebSocket = originalWebSocket;
    vi.restoreAllMocks();
  });

  const lastWs = (): MockWebSocket => {
    const instance = MockWebSocket.instances.at(-1);
    if (instance === undefined) throw new Error('no WebSocket created');
    return instance;
  };

  it('should forward lifecycle events to its callbacks', () => {
    const transport = new WebSocketTransport('wss://example.com', undefined, 'blob');
    const onOpen = vi.fn();
    const onClose = vi.fn();
    const onError = vi.fn();
    const onMessage = vi.fn();
    transport.onOpen = onOpen;
    transport.onClose = onClose;
    transport.onError = onError;
    transport.onMessage = onMessage;

    transport.connect();
    const ws = lastWs();

    ws.onopen?.();
    ws.onclose?.({ code: 1000, reason: 'done' });
    ws.onerror?.(new Event('error'));
    const messageEvent = new MessageEvent('message', { data: 'hi' });
    ws.onmessage?.(messageEvent);

    expect(onOpen).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledWith(1000, 'done');
    expect(onError).toHaveBeenCalledWith(expect.any(Event));
    expect(onMessage).toHaveBeenCalledWith('hi', messageEvent);
  });

  it('should wrap construction failures in a WebSocketError', () => {
    globalThis.WebSocket = vi.fn(() => {
      throw new Error('blocked');
    }) as unknown as typeof WebSocket;

    const transport = new WebSocketTransport('wss://example.com', undefined, 'blob');

    expect(() => transport.connect()).toThrow(WebSocketError);
  });

  it('should send only when the socket is open', () => {
    const transport = new WebSocketTransport('wss://example.com', undefined, 'blob');
    transport.connect();
    const ws = lastWs();

    ws.readyState = MockWebSocket.CONNECTING;
    expect(transport.send('early')).toBe(false);

    ws.readyState = MockWebSocket.OPEN;
    expect(transport.send('payload')).toBe(true);
    expect(ws.send).toHaveBeenCalledWith('payload');
  });

  it('should report a failure when send throws', () => {
    const transport = new WebSocketTransport('wss://example.com', undefined, 'blob');
    transport.connect();
    const ws = lastWs();
    ws.readyState = MockWebSocket.OPEN;
    ws.send.mockImplementation(() => {
      throw new Error('closed');
    });

    expect(transport.send('payload')).toBe(false);
  });

  it('should send binary frames only when open', () => {
    const transport = new WebSocketTransport('wss://example.com', undefined, 'arraybuffer');
    transport.connect();
    const ws = lastWs();

    ws.readyState = MockWebSocket.CONNECTING;
    expect(transport.sendBinary(new ArrayBuffer(4))).toBe(false);

    ws.readyState = MockWebSocket.OPEN;
    const buffer = new ArrayBuffer(4);
    expect(transport.sendBinary(buffer)).toBe(true);
    expect(ws.send).toHaveBeenCalledWith(buffer);
  });

  it('should apply binaryType to the live socket after connect', () => {
    const transport = new WebSocketTransport('wss://example.com', undefined, 'blob');
    transport.connect();
    const ws = lastWs();

    transport.setBinaryType('arraybuffer');

    expect(ws.binaryType).toBe('arraybuffer');
  });

  it('should remember binaryType set before connect and apply it on connect (line 88)', () => {
    const transport = new WebSocketTransport('wss://example.com', undefined, 'blob');

    // No socket yet: the `if (this.ws)` guard's false branch is taken.
    expect(() => transport.setBinaryType('arraybuffer')).not.toThrow();

    transport.connect();
    expect(lastWs().binaryType).toBe('arraybuffer');
  });

  it('should close the socket only when not already closed', () => {
    const transport = new WebSocketTransport('wss://example.com', undefined, 'blob');
    transport.connect();
    const ws = lastWs();
    ws.readyState = MockWebSocket.OPEN;

    transport.close(1001, 'bye');
    expect(ws.close).toHaveBeenCalledWith(1001, 'bye');

    ws.close.mockClear();
    ws.readyState = MockWebSocket.CLOSED;
    transport.close();
    expect(ws.close).not.toHaveBeenCalled();
  });
});
