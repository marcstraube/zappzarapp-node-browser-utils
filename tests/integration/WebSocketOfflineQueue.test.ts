import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocketManager } from '../../src/websocket/index.js';

/**
 * Integration: WebSocket + OfflineQueue
 *
 * Tests the combined flow of WebSocketManager's built-in message queue
 * and reconnection logic:
 * - Messages queued while disconnected
 * - Queued messages flushed on reconnect
 * - Disconnect mid-flush preserves remaining messages
 * - Concurrent reconnect + queue operations
 */

type MockWsInstance = {
  readyState: number;
  binaryType: string;
  close: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  onopen: (() => void) | null;
  onclose: ((e: { code: number; reason: string }) => void) | null;
  onerror: ((e: Event) => void) | null;
  onmessage: ((e: { data: string | ArrayBuffer | Blob }) => void) | null;
};

describe('WebSocket + OfflineQueue', () => {
  let mockWsInstance: MockWsInstance;
  let originalWs: typeof WebSocket;

  beforeEach(() => {
    vi.useFakeTimers();

    const MockWebSocket = vi.fn().mockImplementation(function () {
      const instance = {
        readyState: 0,
        binaryType: 'blob',
        close: vi.fn(),
        send: vi.fn(),
        onopen: null as (() => void) | null,
        onclose: null as unknown as MockWsInstance['onclose'],
        onerror: null as unknown as MockWsInstance['onerror'],
        onmessage: null as unknown as MockWsInstance['onmessage'],
      };
      mockWsInstance = instance;
      return instance;
    });
    // @ts-expect-error - Mock WebSocket constants
    MockWebSocket.CONNECTING = 0;
    // @ts-expect-error - Mock WebSocket constants
    MockWebSocket.OPEN = 1;
    // @ts-expect-error - Mock WebSocket constants
    MockWebSocket.CLOSING = 2;
    // @ts-expect-error - Mock WebSocket constants
    MockWebSocket.CLOSED = 3;

    originalWs = globalThis.WebSocket;
    globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket;
  });

  afterEach(() => {
    vi.useRealTimers();
    globalThis.WebSocket = originalWs;
  });

  function simulateOpen(instance: MockWsInstance = mockWsInstance): void {
    instance.readyState = 1;
    instance.onopen?.();
  }

  function simulateClose(
    instance: MockWsInstance = mockWsInstance,
    code = 1006,
    reason = ''
  ): void {
    instance.readyState = 3;
    instance.onclose?.({ code, reason });
  }

  it('should queue messages while WebSocket is disconnected', () => {
    const ws = WebSocketManager.create({
      url: 'wss://example.com',
      queueMessages: true,
      maxQueueSize: 50,
      reconnect: false,
    });

    expect(ws.send({ type: 'msg', id: 1 })).toBe(true);
    expect(ws.send({ type: 'msg', id: 2 })).toBe(true);
    expect(ws.send({ type: 'msg', id: 3 })).toBe(true);

    // Verify messages were queued by connecting and checking flush
    ws.connect();
    simulateOpen();
    expect(mockWsInstance.send).toHaveBeenCalledTimes(3);
  });

  it('should flush queued messages on reconnect in FIFO order', () => {
    const ws = WebSocketManager.create({
      url: 'wss://example.com',
      queueMessages: true,
      reconnect: false,
    });

    ws.send({ type: 'first' });
    ws.send({ type: 'second' });
    ws.send({ type: 'third' });

    ws.connect();
    simulateOpen();

    expect(mockWsInstance.send).toHaveBeenCalledTimes(3);
    expect(mockWsInstance.send).toHaveBeenNthCalledWith(1, '{"type":"first"}');
    expect(mockWsInstance.send).toHaveBeenNthCalledWith(2, '{"type":"second"}');
    expect(mockWsInstance.send).toHaveBeenNthCalledWith(3, '{"type":"third"}');
  });

  it('should reconnect and flush queued messages after unexpected disconnect', async () => {
    const ws = WebSocketManager.create({
      url: 'wss://example.com',
      reconnect: true,
      reconnectDelay: 100,
      maxReconnectAttempts: 3,
      queueMessages: true,
    });

    ws.connect();
    simulateOpen();
    expect(ws.state).toBe('connected');

    simulateClose();

    ws.send({ type: 'queued-during-reconnect', id: 1 });
    ws.send({ type: 'queued-during-reconnect', id: 2 });
    expect(ws.state).toBe('reconnecting');

    await vi.advanceTimersByTimeAsync(100);
    simulateOpen();

    expect(ws.state).toBe('connected');
    expect(mockWsInstance.send).toHaveBeenCalledWith('{"type":"queued-during-reconnect","id":1}');
    expect(mockWsInstance.send).toHaveBeenCalledWith('{"type":"queued-during-reconnect","id":2}');
  });

  it('should stop flushing and preserve remaining messages on disconnect mid-flush', () => {
    const ws = WebSocketManager.create({
      url: 'wss://example.com',
      queueMessages: true,
      reconnect: false,
    });

    ws.send({ id: 1 });
    ws.send({ id: 2 });
    ws.send({ id: 3 });

    ws.connect();

    // Mock send to fail on second call, simulating connection drop during flush
    let sendCount = 0;
    mockWsInstance.send.mockImplementation(() => {
      sendCount++;
      if (sendCount >= 2) {
        mockWsInstance.readyState = 3;
        throw new Error('Connection closed');
      }
    });

    simulateOpen();

    expect(sendCount).toBe(2);

    mockWsInstance.send.mockReset();
    mockWsInstance.send.mockImplementation(() => {});

    // Reconnect — remaining messages should be flushed
    ws.connect();
    simulateOpen();

    const sentMessages = mockWsInstance.send.mock.calls.map((call: unknown[]) => call[0] as string);
    expect(sentMessages).toContain('{"id":2}');
    expect(sentMessages).toContain('{"id":3}');
  });

  it('should handle concurrent queue operations during reconnect cycle', async () => {
    const stateChanges: string[] = [];

    const ws = WebSocketManager.create({
      url: 'wss://example.com',
      reconnect: true,
      reconnectDelay: 50,
      maxReconnectAttempts: 5,
      queueMessages: true,
      maxQueueSize: 100,
    });

    ws.onStateChange((s) => stateChanges.push(s));

    ws.connect();
    simulateOpen();

    ws.send({ phase: 'connected', id: 1 });

    simulateClose();

    ws.send({ phase: 'reconnecting', id: 2 });
    ws.send({ phase: 'reconnecting', id: 3 });

    await vi.advanceTimersByTimeAsync(50);

    ws.send({ phase: 'connecting', id: 4 });

    simulateOpen();

    const sentMessages = mockWsInstance.send.mock.calls.map((call: unknown[]) => call[0] as string);
    expect(sentMessages).toContain('{"phase":"reconnecting","id":2}');
    expect(sentMessages).toContain('{"phase":"reconnecting","id":3}');
    expect(sentMessages).toContain('{"phase":"connecting","id":4}');

    expect(stateChanges).toContain('connected');
    expect(stateChanges).toContain('reconnecting');
  });

  it('should respect maxQueueSize during offline period', () => {
    const ws = WebSocketManager.create({
      url: 'wss://example.com',
      queueMessages: true,
      maxQueueSize: 3,
      reconnect: false,
    });

    expect(ws.send({ id: 1 })).toBe(true);
    expect(ws.send({ id: 2 })).toBe(true);
    expect(ws.send({ id: 3 })).toBe(true);
    expect(ws.send({ id: 4 })).toBe(false);
  });

  it('should not queue messages when queueMessages is disabled', () => {
    const ws = WebSocketManager.create({
      url: 'wss://example.com',
      queueMessages: false,
      reconnect: false,
    });

    expect(ws.send({ id: 1 })).toBe(false);
  });

  it('should reset reconnect attempts on successful reconnection', async () => {
    const ws = WebSocketManager.create({
      url: 'wss://example.com',
      reconnect: true,
      reconnectDelay: 50,
      maxReconnectAttempts: 10,
    });

    ws.connect();
    simulateOpen();
    expect(ws.reconnectAttempts).toBe(0);

    simulateClose();
    expect(ws.state).toBe('reconnecting');
    expect(ws.reconnectAttempts).toBe(1);

    await vi.advanceTimersByTimeAsync(50);
    simulateOpen();

    expect(ws.state).toBe('connected');
    expect(ws.reconnectAttempts).toBe(0);
  });

  it('should give up reconnecting after max attempts', async () => {
    const ws = WebSocketManager.create({
      url: 'wss://example.com',
      reconnect: true,
      reconnectDelay: 10,
      reconnectMultiplier: 1,
      maxReconnectAttempts: 2,
    });

    ws.connect();
    simulateOpen();
    simulateClose();

    await vi.advanceTimersByTimeAsync(10);
    simulateClose();

    await vi.advanceTimersByTimeAsync(10);
    simulateClose();

    expect(ws.state).toBe('disconnected');
  });
});
