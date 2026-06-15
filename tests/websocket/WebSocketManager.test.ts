/**
 * WebSocketManager Tests.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocketManager, WebSocketError } from '../../src/websocket/index.js';

describe('WebSocketManager', () => {
  describe('WebSocketError', () => {
    it('should create NOT_SUPPORTED error', () => {
      const error = WebSocketError.notSupported();
      expect(error.code).toBe('NOT_SUPPORTED');
      expect(error.message).toBe('WebSocket is not supported in this environment');
    });

    it('should create CONNECTION_FAILED error', () => {
      const cause = new Error('connection refused');
      const error = WebSocketError.connectionFailed('wss://example.com', cause);
      expect(error.code).toBe('CONNECTION_FAILED');
      expect(error.message).toBe('Failed to connect to "wss://example.com"');
      expect(error.cause).toBe(cause);
    });

    it('should create SEND_FAILED error', () => {
      const error = WebSocketError.sendFailed();
      expect(error.code).toBe('SEND_FAILED');
      expect(error.message).toBe('Failed to send message');
    });

    it('should create INVALID_STATE error', () => {
      const error = WebSocketError.invalidState('CLOSED');
      expect(error.code).toBe('INVALID_STATE');
      expect(error.message).toBe('Invalid WebSocket state: CLOSED');
    });

    it('should create INVALID_URL error', () => {
      // noinspection HttpUrlsUsage - Testing invalid URL error
      const error = WebSocketError.invalidUrl('http://invalid.com');
      expect(error.code).toBe('INVALID_URL');
      // noinspection HttpUrlsUsage - Testing invalid URL error message
      expect(error.message).toBe('Invalid WebSocket URL: "http://invalid.com"');
    });

    it('should be instanceof Error', () => {
      const error = WebSocketError.notSupported();
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('isSupported', () => {
    it('should return true when WebSocket is available', () => {
      expect(WebSocketManager.isSupported()).toBe(true);
    });

    it('should return false when WebSocket is undefined', () => {
      const original = globalThis.WebSocket;
      // @ts-expect-error - Testing undefined
      delete globalThis.WebSocket;

      expect(WebSocketManager.isSupported()).toBe(false);

      globalThis.WebSocket = original;
    });
  });

  describe('isValidUrl', () => {
    it('should return true for ws:// URLs', () => {
      expect(WebSocketManager.isValidUrl('ws://localhost:8080')).toBe(true);
    });

    it('should return true for wss:// URLs', () => {
      expect(WebSocketManager.isValidUrl('wss://secure.example.com')).toBe(true);
    });

    // noinspection HttpUrlsUsage - Testing HTTP URL validation
    it('should return false for http:// URLs', () => {
      expect(WebSocketManager.isValidUrl('http://example.com')).toBe(false);
    });

    it('should return false for https:// URLs', () => {
      expect(WebSocketManager.isValidUrl('https://example.com')).toBe(false);
    });

    it('should return false for invalid URLs', () => {
      expect(WebSocketManager.isValidUrl('not-a-url')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(WebSocketManager.isValidUrl('')).toBe(false);
    });
  });

  describe('create', () => {
    it('should throw when WebSocket is not supported', () => {
      const original = globalThis.WebSocket;
      // @ts-expect-error - Testing undefined
      delete globalThis.WebSocket;

      expect(() =>
        WebSocketManager.create({
          url: 'wss://example.com',
        })
      ).toThrow(WebSocketError);

      globalThis.WebSocket = original;
    });

    it('should throw for invalid URL', () => {
      expect(() =>
        WebSocketManager.create({
          url: 'http://example.com',
        })
      ).toThrow(WebSocketError);
    });

    it('should create instance with correct initial state', () => {
      const mockWs = vi.fn().mockImplementation(function () {
        return {
          readyState: 0,
          close: vi.fn(),
          send: vi.fn(),
        };
      });
      const originalWs = globalThis.WebSocket;
      globalThis.WebSocket = mockWs as unknown as typeof WebSocket;

      const ws = WebSocketManager.create({
        url: 'wss://example.com',
      });

      expect(ws.state).toBe('disconnected');
      expect(ws.url).toBe('wss://example.com');
      expect(ws.reconnectAttempts).toBe(0);

      globalThis.WebSocket = originalWs;
    });
  });

  describe('WebSocketInstance', () => {
    let mockWsInstance: {
      readyState: number;
      binaryType: string;
      close: ReturnType<typeof vi.fn>;
      send: ReturnType<typeof vi.fn>;
      onopen: (() => void) | null;
      onclose: ((e: { code: number; reason: string }) => void) | null;
      onerror: ((e: Event) => void) | null;
      onmessage: ((e: { data: string | ArrayBuffer | Blob }) => void) | null;
    };
    let originalWs: typeof WebSocket;

    beforeEach(() => {
      mockWsInstance = {
        readyState: 0, // CONNECTING
        binaryType: 'blob',
        close: vi.fn(),
        send: vi.fn(),
        onopen: null,
        onclose: null,
        onerror: null,
        onmessage: null,
      };

      const MockWebSocket = vi.fn().mockImplementation(function () {
        return mockWsInstance;
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
      globalThis.WebSocket = originalWs;
    });

    it('should register and call open handlers', () => {
      const ws = WebSocketManager.create({
        url: 'wss://example.com',
        reconnect: false,
      });

      const openHandler = vi.fn();
      ws.onOpen(openHandler);

      ws.connect();
      mockWsInstance.readyState = 1; // OPEN
      mockWsInstance.onopen?.();

      expect(openHandler).toHaveBeenCalled();
    });

    it('should register and call close handlers', () => {
      const ws = WebSocketManager.create({
        url: 'wss://example.com',
        reconnect: false,
      });

      const closeHandler = vi.fn();
      ws.onClose(closeHandler);

      ws.connect();
      mockWsInstance.onclose?.({ code: 1000, reason: 'Normal closure' });

      expect(closeHandler).toHaveBeenCalledWith(1000, 'Normal closure');
    });

    it('should register and call error handlers', () => {
      const ws = WebSocketManager.create({
        url: 'wss://example.com',
        reconnect: false,
      });

      const errorHandler = vi.fn();
      ws.onError(errorHandler);

      ws.connect();
      const errorEvent = new Event('error');
      mockWsInstance.onerror?.(errorEvent);

      expect(errorHandler).toHaveBeenCalledWith(errorEvent);
    });

    it('should register and call message handlers', () => {
      const ws = WebSocketManager.create({
        url: 'wss://example.com',
        reconnect: false,
      });

      const messageHandler = vi.fn();
      ws.onMessage(messageHandler);

      ws.connect();
      mockWsInstance.readyState = 1;
      mockWsInstance.onopen?.();
      mockWsInstance.onmessage?.({ data: '{"type":"test"}' });

      expect(messageHandler).toHaveBeenCalledWith(
        { type: 'test' },
        expect.objectContaining({ data: '{"type":"test"}' })
      );
    });

    it('should register and call state change handlers', () => {
      const ws = WebSocketManager.create({
        url: 'wss://example.com',
        reconnect: false,
      });

      const stateHandler = vi.fn();
      ws.onStateChange(stateHandler);

      ws.connect();

      expect(stateHandler).toHaveBeenCalledWith('connecting');
    });

    it('should remove handlers with cleanup function', () => {
      const ws = WebSocketManager.create({
        url: 'wss://example.com',
        reconnect: false,
      });

      const openHandler = vi.fn();
      const cleanup = ws.onOpen(openHandler);

      cleanup();

      ws.connect();
      mockWsInstance.readyState = 1;
      mockWsInstance.onopen?.();

      expect(openHandler).not.toHaveBeenCalled();
    });

    it('should send messages when connected', () => {
      const ws = WebSocketManager.create({
        url: 'wss://example.com',
        reconnect: false,
      });

      ws.connect();
      mockWsInstance.readyState = 1; // OPEN
      mockWsInstance.onopen?.();

      const result = ws.send({ type: 'hello' });

      expect(result).toBe(true);
      expect(mockWsInstance.send).toHaveBeenCalledWith('{"type":"hello"}');
    });

    it('should send string messages without serialization', () => {
      const ws = WebSocketManager.create({
        url: 'wss://example.com',
        reconnect: false,
      });

      ws.connect();
      mockWsInstance.readyState = 1;
      mockWsInstance.onopen?.();

      ws.send('plain text');

      expect(mockWsInstance.send).toHaveBeenCalledWith('plain text');
    });

    it('should queue messages when disconnected', () => {
      const ws = WebSocketManager.create({
        url: 'wss://example.com',
        reconnect: false,
        queueMessages: true,
      });

      const result = ws.send({ type: 'queued' });

      expect(result).toBe(true);
      expect(mockWsInstance.send).not.toHaveBeenCalled();
    });

    it('should close connection', () => {
      const ws = WebSocketManager.create({
        url: 'wss://example.com',
        reconnect: false,
      });

      ws.connect();
      mockWsInstance.readyState = 1;
      mockWsInstance.onopen?.();

      ws.close(1000, 'Done');

      expect(mockWsInstance.close).toHaveBeenCalledWith(1000, 'Done');
    });

    it('should parse JSON messages', () => {
      const ws = WebSocketManager.create({
        url: 'wss://example.com',
        reconnect: false,
      });

      const messageHandler = vi.fn();
      ws.onMessage(messageHandler);

      ws.connect();
      mockWsInstance.onmessage?.({ data: '{"foo":"bar"}' });

      expect(messageHandler).toHaveBeenCalledWith(
        { foo: 'bar' },
        expect.objectContaining({ data: '{"foo":"bar"}' })
      );
    });

    it('should keep non-JSON messages as strings', () => {
      const ws = WebSocketManager.create({
        url: 'wss://example.com',
        reconnect: false,
      });

      const messageHandler = vi.fn();
      ws.onMessage(messageHandler);

      ws.connect();
      mockWsInstance.onmessage?.({ data: 'plain text message' });

      expect(messageHandler).toHaveBeenCalledWith(
        'plain text message',
        expect.objectContaining({ data: 'plain text message' })
      );
    });

    it('should return false when send fails due to exception', () => {
      const ws = WebSocketManager.create({
        url: 'wss://example.com',
        reconnect: false,
      });

      ws.connect();
      mockWsInstance.readyState = 1; // OPEN
      mockWsInstance.onopen?.();
      mockWsInstance.send.mockImplementation(() => {
        throw new Error('Send failed');
      });

      const result = ws.send({ type: 'test' });

      expect(result).toBe(false);
    });

    it('should return false when queue is full', () => {
      const ws = WebSocketManager.create({
        url: 'wss://example.com',
        reconnect: false,
        queueMessages: true,
        maxQueueSize: 2,
      });

      // Queue 2 messages (maxQueueSize)
      expect(ws.send({ msg: 1 })).toBe(true);
      expect(ws.send({ msg: 2 })).toBe(true);

      // Queue is now full, this should return false
      const result = ws.send({ msg: 3 });

      expect(result).toBe(false);
    });

    it('should set state to disconnected when close called on null websocket', () => {
      const ws = WebSocketManager.create({
        url: 'wss://example.com',
        reconnect: false,
      });

      // Close without ever connecting - ws is null, state is already 'disconnected'
      // The close method should handle this gracefully (line 378-379)
      ws.close();

      // State should still be disconnected (no change, but no error either)
      expect(ws.state).toBe('disconnected');
    });

    it('should put message back in queue when flushQueue send fails', () => {
      const ws = WebSocketManager.create({
        url: 'wss://example.com',
        reconnect: false,
        queueMessages: true,
      });

      // Queue a message before connecting
      ws.send({ type: 'queued' });

      ws.connect();
      mockWsInstance.readyState = 1; // OPEN

      // Make send throw on flush
      let sendCallCount = 0;
      mockWsInstance.send.mockImplementation(() => {
        sendCallCount++;
        if (sendCallCount === 1) {
          throw new Error('Send failed');
        }
      });

      // Trigger onopen which calls flushQueue
      mockWsInstance.onopen?.();

      // Now set send to succeed
      mockWsInstance.send.mockImplementation(() => {});

      // Send another message - if queued message is still there, this should work
      const result = ws.send({ type: 'new' });
      expect(result).toBe(true);
    });

    it('should not reconnect when intentionally closed', () => {
      vi.useFakeTimers();

      const ws = WebSocketManager.create({
        url: 'wss://example.com',
        reconnect: true,
        reconnectDelay: 1000,
      });

      const stateHandler = vi.fn();
      ws.onStateChange(stateHandler);

      ws.connect();
      mockWsInstance.readyState = 1;
      mockWsInstance.onopen?.();

      // Intentionally close
      ws.close();
      mockWsInstance.readyState = 3; // CLOSED
      mockWsInstance.onclose?.({ code: 1000, reason: '' });

      // Advance timers - should not trigger reconnect
      vi.advanceTimersByTime(5000);

      expect(stateHandler).not.toHaveBeenCalledWith('reconnecting');

      vi.useRealTimers();
    });

    it('should reconnect after unintentional close', () => {
      vi.useFakeTimers();

      const ws = WebSocketManager.create({
        url: 'wss://example.com',
        reconnect: true,
        reconnectDelay: 1000,
      });

      const stateHandler = vi.fn();
      ws.onStateChange(stateHandler);

      ws.connect();
      mockWsInstance.readyState = 1;
      mockWsInstance.onopen?.();

      // Simulate unintentional close (server closed connection)
      mockWsInstance.readyState = 3;
      mockWsInstance.onclose?.({ code: 1006, reason: 'Connection lost' });

      expect(stateHandler).toHaveBeenCalledWith('reconnecting');
      expect(ws.reconnectAttempts).toBe(1);

      vi.useRealTimers();
    });

    it('should stop reconnecting after max attempts', () => {
      vi.useFakeTimers();

      const ws = WebSocketManager.create({
        url: 'wss://example.com',
        reconnect: true,
        maxReconnectAttempts: 2,
        reconnectDelay: 100,
      });

      const stateHandler = vi.fn();
      ws.onStateChange(stateHandler);

      ws.connect();
      mockWsInstance.readyState = 1;
      mockWsInstance.onopen?.();

      // First unintentional close
      mockWsInstance.readyState = 3;
      mockWsInstance.onclose?.({ code: 1006, reason: '' });
      expect(ws.reconnectAttempts).toBe(1);

      // Trigger reconnect timeout
      vi.advanceTimersByTime(100);
      mockWsInstance.readyState = 3;
      mockWsInstance.onclose?.({ code: 1006, reason: '' });
      expect(ws.reconnectAttempts).toBe(2);

      // Third attempt should stop
      vi.advanceTimersByTime(200);
      mockWsInstance.readyState = 3;
      mockWsInstance.onclose?.({ code: 1006, reason: '' });

      // Should be disconnected after max attempts
      expect(stateHandler).toHaveBeenCalledWith('disconnected');

      vi.useRealTimers();
    });

    it('should not connect if already connecting', () => {
      const ws = WebSocketManager.create({
        url: 'wss://example.com',
        reconnect: false,
      });

      ws.connect();
      mockWsInstance.readyState = 0; // CONNECTING

      // Try to connect again
      ws.connect();

      // Should only have been called once
      expect(globalThis.WebSocket).toHaveBeenCalledTimes(1);
    });

    it('should not connect if already open', () => {
      const ws = WebSocketManager.create({
        url: 'wss://example.com',
        reconnect: false,
      });

      ws.connect();
      mockWsInstance.readyState = 1; // OPEN
      mockWsInstance.onopen?.();

      // Try to connect again
      ws.connect();

      // Should only have been called once
      expect(globalThis.WebSocket).toHaveBeenCalledTimes(1);
    });

    it('should send heartbeat with function message', () => {
      vi.useFakeTimers();

      const heartbeatFn = vi.fn().mockReturnValue({ type: 'heartbeat', ts: 123 });

      const ws = WebSocketManager.create({
        url: 'wss://example.com',
        reconnect: false,
        heartbeatInterval: 1000,
        heartbeatMessage: heartbeatFn,
      });

      ws.connect();
      mockWsInstance.readyState = 1;
      mockWsInstance.onopen?.();

      // Advance timer to trigger heartbeat
      vi.advanceTimersByTime(1000);

      expect(heartbeatFn).toHaveBeenCalled();
      expect(mockWsInstance.send).toHaveBeenCalledWith('{"type":"heartbeat","ts":123}');

      ws.close();
      vi.useRealTimers();
    });

    it('should send heartbeat with string message', () => {
      vi.useFakeTimers();

      const ws = WebSocketManager.create({
        url: 'wss://example.com',
        reconnect: false,
        heartbeatInterval: 1000,
        heartbeatMessage: 'ping',
      });

      ws.connect();
      mockWsInstance.readyState = 1;
      mockWsInstance.onopen?.();

      // Advance timer to trigger heartbeat
      vi.advanceTimersByTime(1000);

      expect(mockWsInstance.send).toHaveBeenCalledWith('ping');

      ws.close();
      vi.useRealTimers();
    });

    it('should send default ping heartbeat when message not specified', () => {
      vi.useFakeTimers();

      const ws = WebSocketManager.create({
        url: 'wss://example.com',
        reconnect: false,
        heartbeatInterval: 1000,
      });

      ws.connect();
      mockWsInstance.readyState = 1;
      mockWsInstance.onopen?.();

      // Advance timer to trigger heartbeat
      vi.advanceTimersByTime(1000);

      expect(mockWsInstance.send).toHaveBeenCalledWith('ping');

      ws.close();
      vi.useRealTimers();
    });

    it('should flush queued messages on connect', () => {
      const ws = WebSocketManager.create({
        url: 'wss://example.com',
        reconnect: false,
        queueMessages: true,
      });

      // Queue messages before connecting
      ws.send({ type: 'msg1' });
      ws.send('msg2');

      ws.connect();
      mockWsInstance.readyState = 1;
      mockWsInstance.onopen?.();

      expect(mockWsInstance.send).toHaveBeenCalledWith('{"type":"msg1"}');
      expect(mockWsInstance.send).toHaveBeenCalledWith('msg2');
    });

    it('should clear message queue on close', () => {
      const ws = WebSocketManager.create({
        url: 'wss://example.com',
        reconnect: false,
        queueMessages: true,
      });

      // Queue messages
      ws.send({ type: 'msg1' });
      ws.send({ type: 'msg2' });

      // Close should clear queue
      ws.close();

      // Connect - queue should be empty
      ws.connect();
      mockWsInstance.readyState = 1;
      mockWsInstance.onopen?.();

      // Only the onopen handler's flushQueue should have been called, but queue was cleared
      // mockWsInstance.send should not have been called with queued messages
      expect(mockWsInstance.send).not.toHaveBeenCalled();
    });

    it('should handle non-string message data without parsing', () => {
      const ws = WebSocketManager.create({
        url: 'wss://example.com',
        reconnect: false,
      });

      const messageHandler = vi.fn();
      ws.onMessage(messageHandler);

      ws.connect();
      // Simulate receiving binary data (ArrayBuffer, Blob, etc)
      const binaryData = new ArrayBuffer(8);
      mockWsInstance.onmessage?.({ data: binaryData });

      expect(messageHandler).toHaveBeenCalledWith(
        binaryData,
        expect.objectContaining({ data: binaryData })
      );
    });

    it('should cleanup close handler', () => {
      const ws = WebSocketManager.create({
        url: 'wss://example.com',
        reconnect: false,
      });

      const closeHandler = vi.fn();
      const cleanup = ws.onClose(closeHandler);

      cleanup();

      ws.connect();
      mockWsInstance.onclose?.({ code: 1000, reason: '' });

      expect(closeHandler).not.toHaveBeenCalled();
    });

    it('should cleanup error handler', () => {
      const ws = WebSocketManager.create({
        url: 'wss://example.com',
        reconnect: false,
      });

      const errorHandler = vi.fn();
      const cleanup = ws.onError(errorHandler);

      cleanup();

      ws.connect();
      mockWsInstance.onerror?.(new Event('error'));

      expect(errorHandler).not.toHaveBeenCalled();
    });

    it('should cleanup message handler', () => {
      const ws = WebSocketManager.create({
        url: 'wss://example.com',
        reconnect: false,
      });

      const messageHandler = vi.fn();
      const cleanup = ws.onMessage(messageHandler);

      cleanup();

      ws.connect();
      mockWsInstance.onmessage?.({ data: 'test' });

      expect(messageHandler).not.toHaveBeenCalled();
    });

    it('should cleanup state change handler', () => {
      const ws = WebSocketManager.create({
        url: 'wss://example.com',
        reconnect: false,
      });

      const stateHandler = vi.fn();
      const cleanup = ws.onStateChange(stateHandler);

      cleanup();

      ws.connect();

      expect(stateHandler).not.toHaveBeenCalled();
    });

    describe('Binary Support', () => {
      it('should have default binaryType of blob', () => {
        const ws = WebSocketManager.create({
          url: 'wss://example.com',
          reconnect: false,
        });

        expect(ws.getBinaryType()).toBe('blob');
      });

      it('should respect binaryType config option', () => {
        const ws = WebSocketManager.create({
          url: 'wss://example.com',
          reconnect: false,
          binaryType: 'arraybuffer',
        });

        expect(ws.getBinaryType()).toBe('arraybuffer');
      });

      it('should set binaryType on websocket when connecting', () => {
        const ws = WebSocketManager.create({
          url: 'wss://example.com',
          reconnect: false,
          binaryType: 'arraybuffer',
        });

        ws.connect();

        expect(mockWsInstance.binaryType).toBe('arraybuffer');
      });

      it('should update binaryType with setBinaryType', () => {
        const ws = WebSocketManager.create({
          url: 'wss://example.com',
          reconnect: false,
        });

        ws.setBinaryType('arraybuffer');

        expect(ws.getBinaryType()).toBe('arraybuffer');
      });

      it('should update binaryType on active connection', () => {
        const ws = WebSocketManager.create({
          url: 'wss://example.com',
          reconnect: false,
        });

        ws.connect();
        mockWsInstance.readyState = 1;
        mockWsInstance.onopen?.();

        ws.setBinaryType('arraybuffer');

        expect(mockWsInstance.binaryType).toBe('arraybuffer');
      });

      it('should send binary ArrayBuffer data', () => {
        const ws = WebSocketManager.create({
          url: 'wss://example.com',
          reconnect: false,
        });

        ws.connect();
        mockWsInstance.readyState = 1;
        mockWsInstance.onopen?.();

        const buffer = new ArrayBuffer(8);
        const result = ws.sendBinary(buffer);

        expect(result).toBe(true);
        expect(mockWsInstance.send).toHaveBeenCalledWith(buffer);
      });

      it('should send binary ArrayBufferView data', () => {
        const ws = WebSocketManager.create({
          url: 'wss://example.com',
          reconnect: false,
        });

        ws.connect();
        mockWsInstance.readyState = 1;
        mockWsInstance.onopen?.();

        const view = new Uint8Array([1, 2, 3, 4]);
        const result = ws.sendBinary(view);

        expect(result).toBe(true);
        expect(mockWsInstance.send).toHaveBeenCalledWith(view);
      });

      it('should send Blob data', () => {
        const ws = WebSocketManager.create({
          url: 'wss://example.com',
          reconnect: false,
        });

        ws.connect();
        mockWsInstance.readyState = 1;
        mockWsInstance.onopen?.();

        const blob = new Blob(['test'], { type: 'text/plain' });
        const result = ws.sendBinary(blob);

        expect(result).toBe(true);
        expect(mockWsInstance.send).toHaveBeenCalledWith(blob);
      });

      it('should return false when sendBinary called while disconnected', () => {
        const ws = WebSocketManager.create({
          url: 'wss://example.com',
          reconnect: false,
        });

        const buffer = new ArrayBuffer(8);
        const result = ws.sendBinary(buffer);

        expect(result).toBe(false);
      });

      it('should return false when sendBinary called before the socket opens', () => {
        const ws = WebSocketManager.create({
          url: 'wss://example.com',
          reconnect: false,
        });

        ws.connect();
        // Socket is created but still CONNECTING (readyState 0).
        const result = ws.sendBinary(new ArrayBuffer(8));

        expect(result).toBe(false);
      });

      it('should return false when sendBinary throws', () => {
        const ws = WebSocketManager.create({
          url: 'wss://example.com',
          reconnect: false,
        });

        ws.connect();
        mockWsInstance.readyState = 1;
        mockWsInstance.onopen?.();
        mockWsInstance.send.mockImplementation(() => {
          throw new Error('Send failed');
        });

        const buffer = new ArrayBuffer(8);
        const result = ws.sendBinary(buffer);

        expect(result).toBe(false);
      });

      it('should call onBinaryMessage handler for ArrayBuffer', () => {
        const ws = WebSocketManager.create({
          url: 'wss://example.com',
          reconnect: false,
          binaryType: 'arraybuffer',
        });

        const binaryHandler = vi.fn();
        ws.onBinaryMessage(binaryHandler);

        ws.connect();
        mockWsInstance.readyState = 1;
        mockWsInstance.onopen?.();

        const buffer = new ArrayBuffer(8);
        mockWsInstance.onmessage?.({ data: buffer });

        expect(binaryHandler).toHaveBeenCalledWith(buffer);
      });

      it('should call onBinaryMessage handler for Blob', () => {
        const ws = WebSocketManager.create({
          url: 'wss://example.com',
          reconnect: false,
        });

        const binaryHandler = vi.fn();
        ws.onBinaryMessage(binaryHandler);

        ws.connect();
        mockWsInstance.readyState = 1;
        mockWsInstance.onopen?.();

        const blob = new Blob(['test']);
        mockWsInstance.onmessage?.({ data: blob });

        expect(binaryHandler).toHaveBeenCalledWith(blob);
      });

      it('should also call onMessage handler for binary data', () => {
        const ws = WebSocketManager.create({
          url: 'wss://example.com',
          reconnect: false,
          binaryType: 'arraybuffer',
        });

        const messageHandler = vi.fn();
        const binaryHandler = vi.fn();
        ws.onMessage(messageHandler);
        ws.onBinaryMessage(binaryHandler);

        ws.connect();
        mockWsInstance.readyState = 1;
        mockWsInstance.onopen?.();

        const buffer = new ArrayBuffer(8);
        mockWsInstance.onmessage?.({ data: buffer });

        expect(binaryHandler).toHaveBeenCalledWith(buffer);
        expect(messageHandler).toHaveBeenCalledWith(
          buffer,
          expect.objectContaining({ data: buffer })
        );
      });

      it('should cleanup onBinaryMessage handler', () => {
        const ws = WebSocketManager.create({
          url: 'wss://example.com',
          reconnect: false,
        });

        const binaryHandler = vi.fn();
        const cleanup = ws.onBinaryMessage(binaryHandler);

        cleanup();

        ws.connect();
        mockWsInstance.readyState = 1;
        mockWsInstance.onopen?.();

        const buffer = new ArrayBuffer(8);
        mockWsInstance.onmessage?.({ data: buffer });

        expect(binaryHandler).not.toHaveBeenCalled();
      });

      it('should not call binary handlers for string data', () => {
        const ws = WebSocketManager.create({
          url: 'wss://example.com',
          reconnect: false,
        });

        const binaryHandler = vi.fn();
        const messageHandler = vi.fn();
        ws.onBinaryMessage(binaryHandler);
        ws.onMessage(messageHandler);

        ws.connect();
        mockWsInstance.readyState = 1;
        mockWsInstance.onopen?.();

        mockWsInstance.onmessage?.({ data: 'text message' });

        expect(binaryHandler).not.toHaveBeenCalled();
        expect(messageHandler).toHaveBeenCalledWith('text message', expect.anything());
      });
    });

    it('should use exponential backoff for reconnect delay', () => {
      vi.useFakeTimers();

      const ws = WebSocketManager.create({
        url: 'wss://example.com',
        reconnect: true,
        reconnectDelay: 1000,
        reconnectMultiplier: 2,
        maxReconnectDelay: 10000,
        maxReconnectAttempts: 5,
      });

      ws.connect();
      mockWsInstance.readyState = 1;
      mockWsInstance.onopen?.();

      // First disconnect
      mockWsInstance.readyState = 3;
      mockWsInstance.onclose?.({ code: 1006, reason: '' });

      // First reconnect delay should be 1000ms
      vi.advanceTimersByTime(999);
      expect(globalThis.WebSocket).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(1);
      expect(globalThis.WebSocket).toHaveBeenCalledTimes(2);

      // Second disconnect
      mockWsInstance.readyState = 3;
      mockWsInstance.onclose?.({ code: 1006, reason: '' });

      // Second delay should be 2000ms (1000 * 2^1)
      vi.advanceTimersByTime(1999);
      expect(globalThis.WebSocket).toHaveBeenCalledTimes(2);
      vi.advanceTimersByTime(1);
      expect(globalThis.WebSocket).toHaveBeenCalledTimes(3);

      ws.close();
      vi.useRealTimers();
    });

    it('should cap reconnect delay at maxReconnectDelay', () => {
      vi.useFakeTimers();

      const ws = WebSocketManager.create({
        url: 'wss://example.com',
        reconnect: true,
        reconnectDelay: 5000,
        reconnectMultiplier: 10, // Would create huge delays
        maxReconnectDelay: 10000, // But capped at 10s
        maxReconnectAttempts: 3,
      });

      ws.connect();
      mockWsInstance.readyState = 1;
      mockWsInstance.onopen?.();

      // First disconnect
      mockWsInstance.readyState = 3;
      mockWsInstance.onclose?.({ code: 1006, reason: '' });

      // First delay: 5000ms
      vi.advanceTimersByTime(5000);
      expect(globalThis.WebSocket).toHaveBeenCalledTimes(2);

      // Second disconnect
      mockWsInstance.readyState = 3;
      mockWsInstance.onclose?.({ code: 1006, reason: '' });

      // Second delay: would be 50000ms but capped at 10000ms
      vi.advanceTimersByTime(10000);
      expect(globalThis.WebSocket).toHaveBeenCalledTimes(3);

      ws.close();
      vi.useRealTimers();
    });

    it('should reset reconnect attempts on successful connection', () => {
      vi.useFakeTimers();

      const ws = WebSocketManager.create({
        url: 'wss://example.com',
        reconnect: true,
        reconnectDelay: 100,
        maxReconnectAttempts: 5,
      });

      ws.connect();
      mockWsInstance.readyState = 1;
      mockWsInstance.onopen?.();

      // Disconnect
      mockWsInstance.readyState = 3;
      mockWsInstance.onclose?.({ code: 1006, reason: '' });
      expect(ws.reconnectAttempts).toBe(1);

      // Reconnect succeeds
      vi.advanceTimersByTime(100);
      mockWsInstance.readyState = 1;
      mockWsInstance.onopen?.();

      // Attempts should be reset
      expect(ws.reconnectAttempts).toBe(0);

      ws.close();
      vi.useRealTimers();
    });

    it('should create websocket with protocols', () => {
      const ws = WebSocketManager.create({
        url: 'wss://example.com',
        protocols: ['graphql-ws', 'subscriptions-transport-ws'],
        reconnect: false,
      });

      ws.connect();

      expect(globalThis.WebSocket).toHaveBeenCalledWith('wss://example.com', [
        'graphql-ws',
        'subscriptions-transport-ws',
      ]);
    });

    it('should call error handlers when heartbeatMessage function throws', () => {
      vi.useFakeTimers();

      const heartbeatFn = vi.fn().mockImplementation(() => {
        throw new Error('heartbeat generation failed');
      });

      const ws = WebSocketManager.create({
        url: 'wss://example.com',
        reconnect: false,
        heartbeatInterval: 1000,
        heartbeatMessage: heartbeatFn,
      });

      const errorHandler = vi.fn();
      ws.onError(errorHandler);

      ws.connect();
      mockWsInstance.readyState = 1;
      mockWsInstance.onopen?.();

      // Advance timer to trigger heartbeat
      vi.advanceTimersByTime(1000);

      expect(heartbeatFn).toHaveBeenCalled();
      expect(errorHandler).toHaveBeenCalledWith(expect.any(Event));

      ws.close();
      vi.useRealTimers();
    });

    it('should not send heartbeat when connection is not open', () => {
      vi.useFakeTimers();

      const ws = WebSocketManager.create({
        url: 'wss://example.com',
        reconnect: false,
        heartbeatInterval: 1000,
      });

      ws.connect();
      mockWsInstance.readyState = 1;
      mockWsInstance.onopen?.();

      // Close connection
      mockWsInstance.readyState = 3;

      // Advance timer - should not send heartbeat since not open
      vi.advanceTimersByTime(1000);

      // First call is from flushQueue potentially, check specific ping calls
      const pingCalls = mockWsInstance.send.mock.calls.filter((call) => call[0] === 'ping');
      expect(pingCalls).toHaveLength(0);

      ws.close();
      vi.useRealTimers();
    });

    it('should throw WebSocketError when WebSocket constructor fails', () => {
      // Replace the mock to throw on construction
      const ThrowingWebSocket = vi.fn().mockImplementation(function () {
        throw new Error('Connection refused');
      });
      // @ts-expect-error - Mock WebSocket constants
      ThrowingWebSocket.CONNECTING = 0;
      // @ts-expect-error - Mock WebSocket constants
      ThrowingWebSocket.OPEN = 1;
      // @ts-expect-error - Mock WebSocket constants
      ThrowingWebSocket.CLOSING = 2;
      // @ts-expect-error - Mock WebSocket constants
      ThrowingWebSocket.CLOSED = 3;

      globalThis.WebSocket = ThrowingWebSocket as unknown as typeof WebSocket;

      const ws = WebSocketManager.create({
        url: 'wss://example.com',
        reconnect: false,
      });

      const stateHandler = vi.fn();
      ws.onStateChange(stateHandler);

      expect(() => ws.connect()).toThrow(WebSocketError);
      expect(() => ws.connect()).toThrow('Failed to connect');
      expect(stateHandler).toHaveBeenCalledWith('disconnected');
    });
  });

  describe('Transport Fallback', () => {
    interface MockWs {
      readyState: number;
      binaryType: string;
      close: ReturnType<typeof vi.fn>;
      send: ReturnType<typeof vi.fn>;
      onopen: (() => void) | null;
      onclose: ((e: { code: number; reason: string }) => void) | null;
      onerror: ((e: Event) => void) | null;
      onmessage: ((e: { data: unknown }) => void) | null;
    }

    let wsInstances: MockWs[];
    let esInstances: MockEventSource[];
    let fetchMock: ReturnType<typeof vi.fn>;
    let originalWs: typeof WebSocket;
    let originalEventSource: typeof EventSource;
    let originalFetch: typeof fetch;

    class MockEventSource {
      onopen: ((e: Event) => void) | null = null;
      onmessage: ((e: MessageEvent) => void) | null = null;
      onerror: ((e: Event) => void) | null = null;
      close = vi.fn();

      constructor(public url: string) {
        esInstances.push(this);
      }
    }

    const makeWs = (): MockWs => ({
      readyState: 0,
      binaryType: 'blob',
      close: vi.fn(),
      send: vi.fn(),
      onopen: null,
      onclose: null,
      onerror: null,
      onmessage: null,
    });

    const httpResponse = (body: string, ok = true): Response =>
      ({ ok, text: (): Promise<string> => Promise.resolve(body) }) as unknown as Response;

    const flush = async (): Promise<void> => {
      for (let i = 0; i < 5; i++) {
        await Promise.resolve();
      }
    };

    const removeWebSocket = (): void => {
      // @ts-expect-error - Testing WebSocket-unavailable environments
      delete globalThis.WebSocket;
    };

    const lastWs = (): MockWs => {
      const instance = wsInstances.at(-1);
      if (instance === undefined) throw new Error('no WebSocket created');
      return instance;
    };

    const lastEs = (): MockEventSource => {
      const instance = esInstances.at(-1);
      if (instance === undefined) throw new Error('no EventSource created');
      return instance;
    };

    beforeEach(() => {
      wsInstances = [];
      esInstances = [];

      const MockWebSocket = vi.fn().mockImplementation(function (this: void) {
        const instance = makeWs();
        wsInstances.push(instance);
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

      originalEventSource = globalThis.EventSource;
      globalThis.EventSource = MockEventSource as unknown as typeof EventSource;

      originalFetch = globalThis.fetch;
      fetchMock = vi.fn().mockResolvedValue(httpResponse(''));
      globalThis.fetch = fetchMock as unknown as typeof fetch;
    });

    afterEach(() => {
      globalThis.WebSocket = originalWs;
      globalThis.EventSource = originalEventSource;
      globalThis.fetch = originalFetch;
      vi.useRealTimers();
    });

    const codeOf = (fn: () => unknown): string | undefined => {
      try {
        fn();
      } catch (e) {
        return (e as WebSocketError).code;
      }
      return undefined;
    };

    describe('configuration validation', () => {
      it('should throw INVALID_CONFIG when fallback is set without fallbackUrl', () => {
        expect(
          codeOf(() => WebSocketManager.create({ url: 'wss://example.com', fallback: 'sse' }))
        ).toBe('INVALID_CONFIG');
        expect(
          codeOf(() => WebSocketManager.create({ url: 'wss://example.com', fallback: 'polling' }))
        ).toBe('INVALID_CONFIG');
      });

      it('should throw INVALID_URL when fallbackUrl is not http(s)', () => {
        expect(
          codeOf(() =>
            WebSocketManager.create({
              url: 'wss://example.com',
              fallback: 'sse',
              fallbackUrl: 'ws://example.com/sse',
            })
          )
        ).toBe('INVALID_URL');
      });

      it('should throw INVALID_URL when fallbackSendUrl is not http(s)', () => {
        expect(
          codeOf(() =>
            WebSocketManager.create({
              url: 'wss://example.com',
              fallback: 'sse',
              fallbackUrl: 'https://example.com/sse',
              fallbackSendUrl: 'ftp://example.com/send',
            })
          )
        ).toBe('INVALID_URL');
      });

      it('should accept a valid fallback configuration', () => {
        expect(() =>
          WebSocketManager.create({
            url: 'wss://example.com',
            fallback: 'sse',
            fallbackUrl: 'https://example.com/sse',
          })
        ).not.toThrow();
      });
    });

    describe('transport selection', () => {
      it('should use the SSE fallback when WebSocket is unsupported', () => {
        removeWebSocket();

        const ws = WebSocketManager.create({
          url: 'wss://example.com',
          fallback: 'sse',
          fallbackUrl: 'https://example.com/sse',
        });
        const openHandler = vi.fn();
        ws.onOpen(openHandler);

        ws.connect();
        expect(ws.activeTransport).toBe('sse');

        lastEs().onopen?.(new Event('open'));
        expect(openHandler).toHaveBeenCalled();
        expect(ws.state).toBe('connected');
      });

      it('should use the polling fallback when WebSocket is unsupported', () => {
        removeWebSocket();

        const ws = WebSocketManager.create({
          url: 'wss://example.com',
          fallback: 'polling',
          fallbackUrl: 'https://example.com/poll',
        });

        ws.connect();
        expect(ws.activeTransport).toBe('polling');
      });

      it('should fall back when the WebSocket closes before opening', () => {
        const ws = WebSocketManager.create({
          url: 'wss://example.com',
          fallback: 'polling',
          fallbackUrl: 'https://example.com/poll',
        });

        ws.connect();
        expect(ws.activeTransport).toBe('websocket');

        // Connection errors and closes before ever opening (e.g. blocked by proxy).
        lastWs().onclose?.({ code: 1006, reason: 'blocked' });
        expect(ws.activeTransport).toBe('polling');
      });

      it('should fall back when the WebSocket constructor throws', () => {
        const ThrowingWebSocket = vi.fn().mockImplementation(function (this: void) {
          throw new Error('blocked');
        });
        // @ts-expect-error - Mock WebSocket constants
        ThrowingWebSocket.CONNECTING = 0;
        // @ts-expect-error - Mock WebSocket constants
        ThrowingWebSocket.OPEN = 1;
        // @ts-expect-error - Mock WebSocket constants
        ThrowingWebSocket.CLOSING = 2;
        // @ts-expect-error - Mock WebSocket constants
        ThrowingWebSocket.CLOSED = 3;
        globalThis.WebSocket = ThrowingWebSocket as unknown as typeof WebSocket;

        const ws = WebSocketManager.create({
          url: 'wss://example.com',
          fallback: 'polling',
          fallbackUrl: 'https://example.com/poll',
        });

        ws.connect();
        expect(ws.activeTransport).toBe('polling');
      });

      it('should stay on WebSocket once it connects, even with a fallback configured', () => {
        const ws = WebSocketManager.create({
          url: 'wss://example.com',
          fallback: 'sse',
          fallbackUrl: 'https://example.com/sse',
        });

        ws.connect();
        lastWs().readyState = 1;
        lastWs().onopen?.();
        expect(ws.activeTransport).toBe('websocket');
        expect(ws.state).toBe('connected');

        // A later drop is treated as transient: reconnect stays on WebSocket.
        lastWs().readyState = 3;
        lastWs().onclose?.({ code: 1006, reason: 'lost' });
        expect(ws.activeTransport).toBe('websocket');
      });
    });

    describe('SSE transport', () => {
      const createSse = (
        config: Partial<Parameters<typeof WebSocketManager.create>[0]> = {}
      ): ReturnType<typeof WebSocketManager.create> => {
        removeWebSocket();
        return WebSocketManager.create({
          url: 'wss://example.com',
          fallback: 'sse',
          fallbackUrl: 'https://example.com/sse',
          ...config,
        });
      };

      it('should deliver SSE messages parsed as JSON with a MessageEvent', () => {
        const ws = createSse({ heartbeatInterval: 1000 });
        const messageHandler = vi.fn();
        ws.onMessage(messageHandler);

        ws.connect();
        lastEs().onopen?.(new Event('open'));
        lastEs().onmessage?.(new MessageEvent('message', { data: '{"a":1}' }));

        expect(messageHandler).toHaveBeenCalledWith({ a: 1 }, expect.any(MessageEvent));
      });

      it('should POST messages to the fallback URL by default', () => {
        const ws = createSse();
        ws.connect();
        lastEs().onopen?.(new Event('open'));

        ws.send({ hello: 'world' });
        expect(fetchMock).toHaveBeenCalledWith(
          'https://example.com/sse',
          expect.objectContaining({ method: 'POST', body: JSON.stringify({ hello: 'world' }) })
        );
      });

      it('should POST messages to a separate fallbackSendUrl when provided', () => {
        const ws = createSse({ fallbackSendUrl: 'https://example.com/send' });
        ws.connect();
        lastEs().onopen?.(new Event('open'));

        ws.send('hi');
        expect(fetchMock).toHaveBeenCalledWith(
          'https://example.com/send',
          expect.objectContaining({ method: 'POST', body: 'hi' })
        );
      });

      it('should not support binary sends', () => {
        const ws = createSse();
        ws.connect();
        lastEs().onopen?.(new Event('open'));

        expect(ws.sendBinary(new ArrayBuffer(8))).toBe(false);
      });

      it('should treat setBinaryType as a no-op on SSE', () => {
        const ws = createSse();
        ws.connect();
        lastEs().onopen?.(new Event('open'));

        expect(() => ws.setBinaryType('arraybuffer')).not.toThrow();
        expect(ws.getBinaryType()).toBe('arraybuffer');
      });

      it('should reconnect after an SSE error', () => {
        const ws = createSse({ reconnect: true, reconnectDelay: 1000 });
        const stateHandler = vi.fn();
        ws.onStateChange(stateHandler);

        ws.connect();
        lastEs().onopen?.(new Event('open'));
        lastEs().onerror?.(new Event('error'));

        expect(lastEs().close).toHaveBeenCalled();
        expect(stateHandler).toHaveBeenCalledWith('reconnecting');
      });

      it('should report errors when a send POST rejects', async () => {
        const ws = createSse();
        const errorHandler = vi.fn();
        ws.onError(errorHandler);

        ws.connect();
        lastEs().onopen?.(new Event('open'));

        fetchMock.mockRejectedValueOnce(new Error('post failed'));
        ws.send('boom');
        await flush();

        expect(errorHandler).toHaveBeenCalled();
      });

      it('should return false when a send throws synchronously', () => {
        const ws = createSse();
        ws.connect();
        lastEs().onopen?.(new Event('open'));

        fetchMock.mockImplementationOnce(() => {
          throw new Error('sync failure');
        });
        expect(ws.send('x')).toBe(false);
      });

      it('should close cleanly when the connection is closed', () => {
        const ws = createSse();
        const closeHandler = vi.fn();
        ws.onClose(closeHandler);

        ws.connect();
        lastEs().onopen?.(new Event('open'));
        ws.close();

        expect(lastEs().close).toHaveBeenCalled();
        expect(ws.state).toBe('disconnected');
        expect(closeHandler).toHaveBeenCalled();
      });
    });

    describe('polling transport', () => {
      const createPolling = (
        config: Partial<Parameters<typeof WebSocketManager.create>[0]> = {}
      ): ReturnType<typeof WebSocketManager.create> => {
        removeWebSocket();
        return WebSocketManager.create({
          url: 'wss://example.com',
          fallback: 'polling',
          fallbackUrl: 'https://example.com/poll',
          pollInterval: 1000,
          ...config,
        });
      };

      it('should poll for messages and respect the poll interval', async () => {
        vi.useFakeTimers();
        fetchMock.mockResolvedValue(httpResponse('{"n":1}'));

        const ws = createPolling();
        const messageHandler = vi.fn();
        const openHandler = vi.fn();
        ws.onMessage(messageHandler);
        ws.onOpen(openHandler);

        ws.connect();
        await flush();

        expect(openHandler).toHaveBeenCalled();
        expect(ws.state).toBe('connected');
        expect(messageHandler).toHaveBeenCalledWith({ n: 1 }, expect.any(MessageEvent));
        expect(fetchMock).toHaveBeenCalledTimes(1);

        await vi.advanceTimersByTimeAsync(1000);
        expect(fetchMock).toHaveBeenCalledTimes(2);
      });

      it('should keep polling when the response body is empty', async () => {
        vi.useFakeTimers();
        fetchMock.mockResolvedValue(httpResponse(''));

        const ws = createPolling();
        const messageHandler = vi.fn();
        ws.onMessage(messageHandler);

        ws.connect();
        await flush();

        expect(ws.state).toBe('connected');
        expect(messageHandler).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(1000);
        expect(fetchMock).toHaveBeenCalledTimes(2);
      });

      it('should POST messages when sending', async () => {
        vi.useFakeTimers();
        fetchMock.mockResolvedValue(httpResponse(''));

        const ws = createPolling();
        ws.connect();
        await flush();

        ws.send('ping');
        expect(fetchMock).toHaveBeenCalledWith(
          'https://example.com/poll',
          expect.objectContaining({ method: 'POST', body: 'ping' })
        );
      });

      it('should reconnect when a poll request rejects', async () => {
        vi.useFakeTimers();
        fetchMock.mockRejectedValue(new Error('network'));

        const ws = createPolling({ reconnect: true, reconnectDelay: 500 });
        const stateHandler = vi.fn();
        ws.onStateChange(stateHandler);

        ws.connect();
        await flush();

        expect(stateHandler).toHaveBeenCalledWith('reconnecting');
      });

      it('should reconnect when a poll response is not ok', async () => {
        vi.useFakeTimers();
        fetchMock.mockResolvedValue(httpResponse('', false));

        const ws = createPolling({ reconnect: true, reconnectDelay: 500 });
        const stateHandler = vi.fn();
        ws.onStateChange(stateHandler);

        ws.connect();
        await flush();

        expect(stateHandler).toHaveBeenCalledWith('reconnecting');
      });

      it('should stop polling after close', async () => {
        vi.useFakeTimers();
        fetchMock.mockResolvedValue(httpResponse(''));

        const ws = createPolling({ reconnect: false });
        ws.connect();
        await flush();

        const callsAfterConnect = fetchMock.mock.calls.length;
        ws.close();
        await vi.advanceTimersByTimeAsync(3000);

        expect(fetchMock.mock.calls.length).toBe(callsAfterConnect);
        expect(ws.state).toBe('disconnected');
      });

      it('should not support binary sends', async () => {
        vi.useFakeTimers();
        fetchMock.mockResolvedValue(httpResponse(''));

        const ws = createPolling();
        ws.connect();
        await flush();

        expect(ws.sendBinary(new ArrayBuffer(8))).toBe(false);
      });

      it('should report errors when a send POST rejects', async () => {
        vi.useFakeTimers();
        // GET polls resolve; the POST send rejects.
        fetchMock.mockImplementation((_url: string, options?: RequestInit) =>
          options?.method === 'POST'
            ? Promise.reject(new Error('post failed'))
            : Promise.resolve(httpResponse(''))
        );

        const ws = createPolling();
        const errorHandler = vi.fn();
        ws.onError(errorHandler);
        ws.connect();
        await flush();

        ws.send('boom');
        await flush();

        expect(errorHandler).toHaveBeenCalled();
      });

      it('should return false when a send throws synchronously', async () => {
        vi.useFakeTimers();
        fetchMock.mockImplementation((_url: string, options?: RequestInit) => {
          if (options?.method === 'POST') throw new Error('sync failure');
          return Promise.resolve(httpResponse(''));
        });

        const ws = createPolling();
        ws.connect();
        await flush();

        expect(ws.send('x')).toBe(false);
      });

      it('should reconnect when reading the response body fails', async () => {
        vi.useFakeTimers();
        fetchMock.mockResolvedValue({
          ok: true,
          text: (): Promise<string> => Promise.reject(new Error('read failed')),
        } as unknown as Response);

        const ws = createPolling({ reconnect: true, reconnectDelay: 500 });
        const stateHandler = vi.fn();
        ws.onStateChange(stateHandler);
        ws.connect();
        await flush();

        expect(stateHandler).toHaveBeenCalledWith('reconnecting');
      });
    });

    describe('message queue with fallback', () => {
      it('should flush queued messages once the fallback connects', () => {
        removeWebSocket();
        fetchMock.mockResolvedValue(httpResponse(''));

        const ws = WebSocketManager.create({
          url: 'wss://example.com',
          fallback: 'sse',
          fallbackUrl: 'https://example.com/sse',
          queueMessages: true,
        });

        // Queued while disconnected.
        ws.send({ q: 1 });
        ws.connect();
        lastEs().onopen?.(new Event('open'));

        expect(fetchMock).toHaveBeenCalledWith(
          'https://example.com/sse',
          expect.objectContaining({ method: 'POST', body: JSON.stringify({ q: 1 }) })
        );
      });
    });
  });
});
