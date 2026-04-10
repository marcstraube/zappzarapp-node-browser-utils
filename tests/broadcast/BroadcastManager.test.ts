/**
 * BroadcastManager Tests.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BroadcastManager, BroadcastError } from '../../src/broadcast/index.js';

describe('BroadcastManager', () => {
  describe('BroadcastError', () => {
    it('should create NOT_SUPPORTED error', () => {
      const error = BroadcastError.notSupported();
      expect(error.code).toBe('NOT_SUPPORTED');
      expect(error.message).toBe('BroadcastChannel is not supported in this environment');
    });

    it('should create CHANNEL_CLOSED error', () => {
      const error = BroadcastError.channelClosed('my-channel');
      expect(error.code).toBe('CHANNEL_CLOSED');
      expect(error.message).toBe('Broadcast channel "my-channel" is closed');
    });

    it('should create SEND_FAILED error', () => {
      const cause = new Error('postMessage failed');
      const error = BroadcastError.sendFailed(cause);
      expect(error.code).toBe('SEND_FAILED');
      expect(error.message).toBe('Failed to send broadcast message');
      expect(error.cause).toBe(cause);
    });

    it('should be instanceof Error', () => {
      const error = BroadcastError.notSupported();
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('isSupported', () => {
    it('should return true when BroadcastChannel is available', () => {
      expect(BroadcastManager.isSupported()).toBe(true);
    });

    it('should return false when BroadcastChannel is undefined', () => {
      const original = globalThis.BroadcastChannel;
      // @ts-expect-error - Testing undefined
      delete globalThis.BroadcastChannel;

      expect(BroadcastManager.isSupported()).toBe(false);

      globalThis.BroadcastChannel = original;
    });
  });

  describe('create', () => {
    it('should throw when BroadcastChannel is not supported', () => {
      const original = globalThis.BroadcastChannel;
      // @ts-expect-error - Testing undefined
      delete globalThis.BroadcastChannel;

      expect(() => BroadcastManager.create('test-channel')).toThrow(BroadcastError);

      globalThis.BroadcastChannel = original;
    });

    it('should create instance with correct channel name', () => {
      const broadcast = BroadcastManager.create('test-channel');

      expect(broadcast.channelName).toBe('test-channel');

      broadcast.close();
    });

    it('should create instance with unique ID', () => {
      const broadcast1 = BroadcastManager.create('test-channel');
      const broadcast2 = BroadcastManager.create('test-channel');

      expect(broadcast1.id).toBeDefined();
      expect(broadcast2.id).toBeDefined();
      expect(broadcast1.id).not.toBe(broadcast2.id);

      broadcast1.close();
      broadcast2.close();
    });

    it('should generate valid UUID format', () => {
      const broadcast = BroadcastManager.create('test-channel');

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(broadcast.id).toMatch(uuidRegex);

      broadcast.close();
    });
  });

  describe('BroadcastManagerInstance', () => {
    let mockChannel: {
      postMessage: ReturnType<typeof vi.fn>;
      close: ReturnType<typeof vi.fn>;
      onmessage: ((e: MessageEvent) => void) | null;
      onmessageerror: ((e: MessageEvent) => void) | null;
    };
    let originalBroadcastChannel: typeof BroadcastChannel;

    beforeEach(() => {
      mockChannel = {
        postMessage: vi.fn(),
        close: vi.fn(),
        onmessage: null,
        onmessageerror: null,
      };

      const MockBroadcastChannel = vi.fn().mockImplementation(function () {
        return mockChannel;
      });

      originalBroadcastChannel = globalThis.BroadcastChannel;
      globalThis.BroadcastChannel = MockBroadcastChannel as unknown as typeof BroadcastChannel;
    });

    afterEach(() => {
      globalThis.BroadcastChannel = originalBroadcastChannel;
    });

    it('should send message with correct format', () => {
      const broadcast = BroadcastManager.create('test-channel');

      broadcast.send('test-type', { data: 'value' });

      expect(mockChannel.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'test-type',
          payload: { data: 'value' },
          senderId: broadcast.id,
          timestamp: expect.any(Number),
        })
      );

      broadcast.close();
    });

    it('should throw when sending on closed channel', () => {
      const broadcast = BroadcastManager.create('test-channel');
      broadcast.close();

      expect(() => broadcast.send('test-type', {})).toThrow(BroadcastError);
      expect(() => broadcast.send('test-type', {})).toThrow('closed');
    });

    it('should throw when postMessage fails', () => {
      const broadcast = BroadcastManager.create('test-channel');

      mockChannel.postMessage.mockImplementation(() => {
        throw new Error('DataCloneError');
      });

      expect(() => broadcast.send('test-type', {})).toThrow(BroadcastError);

      broadcast.close();
    });

    it('should call type-specific handlers', () => {
      const broadcast = BroadcastManager.create('test-channel');

      const handler = vi.fn();
      broadcast.on('my-type', handler);

      // Simulate receiving a message
      const message = {
        type: 'my-type',
        payload: { value: 42 },
        timestamp: Date.now(),
        senderId: 'other-tab',
      };
      mockChannel.onmessage?.(new MessageEvent('message', { data: message }));

      expect(handler).toHaveBeenCalledWith(message);

      broadcast.close();
    });

    it('should not call handler for different type', () => {
      const broadcast = BroadcastManager.create('test-channel');

      const handler = vi.fn();
      broadcast.on('my-type', handler);

      // Simulate receiving a different message type
      const message = {
        type: 'other-type',
        payload: { value: 42 },
        timestamp: Date.now(),
        senderId: 'other-tab',
      };
      mockChannel.onmessage?.(new MessageEvent('message', { data: message }));

      expect(handler).not.toHaveBeenCalled();

      broadcast.close();
    });

    it('should call onAny handlers for all message types', () => {
      const broadcast = BroadcastManager.create('test-channel');

      const handler = vi.fn();
      broadcast.onAny(handler);

      // Simulate receiving messages of different types
      const message1 = {
        type: 'type-a',
        payload: { a: 1 },
        timestamp: Date.now(),
        senderId: 'other-tab',
      };
      const message2 = {
        type: 'type-b',
        payload: { b: 2 },
        timestamp: Date.now(),
        senderId: 'other-tab',
      };

      mockChannel.onmessage?.(new MessageEvent('message', { data: message1 }));
      mockChannel.onmessage?.(new MessageEvent('message', { data: message2 }));

      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenCalledWith(message1);
      expect(handler).toHaveBeenCalledWith(message2);

      broadcast.close();
    });

    it('should call both type-specific and onAny handlers', () => {
      const broadcast = BroadcastManager.create('test-channel');

      const typeHandler = vi.fn();
      const anyHandler = vi.fn();

      broadcast.on('my-type', typeHandler);
      broadcast.onAny(anyHandler);

      const message = {
        type: 'my-type',
        payload: { value: 42 },
        timestamp: Date.now(),
        senderId: 'other-tab',
      };
      mockChannel.onmessage?.(new MessageEvent('message', { data: message }));

      expect(typeHandler).toHaveBeenCalledWith(message);
      expect(anyHandler).toHaveBeenCalledWith(message);

      broadcast.close();
    });

    it('should remove type handler with cleanup function', () => {
      const broadcast = BroadcastManager.create('test-channel');

      const handler = vi.fn();
      const cleanup = broadcast.on('my-type', handler);

      cleanup();

      const message = {
        type: 'my-type',
        payload: { value: 42 },
        timestamp: Date.now(),
        senderId: 'other-tab',
      };
      mockChannel.onmessage?.(new MessageEvent('message', { data: message }));

      expect(handler).not.toHaveBeenCalled();

      broadcast.close();
    });

    it('should remove onAny handler with cleanup function', () => {
      const broadcast = BroadcastManager.create('test-channel');

      const handler = vi.fn();
      const cleanup = broadcast.onAny(handler);

      cleanup();

      const message = {
        type: 'my-type',
        payload: { value: 42 },
        timestamp: Date.now(),
        senderId: 'other-tab',
      };
      mockChannel.onmessage?.(new MessageEvent('message', { data: message }));

      expect(handler).not.toHaveBeenCalled();

      broadcast.close();
    });

    it('should handle multiple handlers for same type', () => {
      const broadcast = BroadcastManager.create('test-channel');

      const handler1 = vi.fn();
      const handler2 = vi.fn();

      broadcast.on('my-type', handler1);
      broadcast.on('my-type', handler2);

      const message = {
        type: 'my-type',
        payload: { value: 42 },
        timestamp: Date.now(),
        senderId: 'other-tab',
      };
      mockChannel.onmessage?.(new MessageEvent('message', { data: message }));

      expect(handler1).toHaveBeenCalledWith(message);
      expect(handler2).toHaveBeenCalledWith(message);

      broadcast.close();
    });

    it('should remove only specific handler when cleanup called', () => {
      const broadcast = BroadcastManager.create('test-channel');

      const handler1 = vi.fn();
      const handler2 = vi.fn();

      const cleanup1 = broadcast.on('my-type', handler1);
      broadcast.on('my-type', handler2);

      cleanup1();

      const message = {
        type: 'my-type',
        payload: { value: 42 },
        timestamp: Date.now(),
        senderId: 'other-tab',
      };
      mockChannel.onmessage?.(new MessageEvent('message', { data: message }));

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledWith(message);

      broadcast.close();
    });

    it('should close channel and clear handlers', () => {
      const broadcast = BroadcastManager.create('test-channel');

      const handler = vi.fn();
      broadcast.on('my-type', handler);

      broadcast.close();

      expect(mockChannel.close).toHaveBeenCalled();
    });

    it('should handle close called multiple times', () => {
      const broadcast = BroadcastManager.create('test-channel');

      broadcast.close();
      broadcast.close(); // Should not throw

      expect(mockChannel.close).toHaveBeenCalledTimes(1);
    });

    it('should ignore invalid messages', () => {
      const broadcast = BroadcastManager.create('test-channel');

      const handler = vi.fn();
      broadcast.onAny(handler);

      // Non-object data
      mockChannel.onmessage?.(new MessageEvent('message', { data: 'string' }));
      mockChannel.onmessage?.(new MessageEvent('message', { data: null }));
      mockChannel.onmessage?.(new MessageEvent('message', { data: 123 }));

      // Missing fields
      mockChannel.onmessage?.(new MessageEvent('message', { data: { type: 'test' } })); // Missing payload, timestamp, senderId
      mockChannel.onmessage?.(new MessageEvent('message', { data: { type: 'test', payload: {} } })); // Missing timestamp, senderId

      // Invalid types
      mockChannel.onmessage?.(
        new MessageEvent('message', {
          data: { type: 123, payload: {}, timestamp: Date.now(), senderId: 'id' },
        })
      );

      expect(handler).not.toHaveBeenCalled();

      broadcast.close();
    });

    it('should handle valid message with all required fields', () => {
      const broadcast = BroadcastManager.create('test-channel');

      const handler = vi.fn();
      broadcast.onAny(handler);

      const validMessage = {
        type: 'test',
        payload: {},
        timestamp: Date.now(),
        senderId: 'test-id',
      };
      mockChannel.onmessage?.(new MessageEvent('message', { data: validMessage }));

      expect(handler).toHaveBeenCalledWith(validMessage);

      broadcast.close();
    });

    it('should clean up type map when last handler removed', () => {
      const broadcast = BroadcastManager.create('test-channel');

      const handler = vi.fn();
      const cleanup = broadcast.on('my-type', handler);

      cleanup();

      // Add a new handler for same type - should work
      const newHandler = vi.fn();
      broadcast.on('my-type', newHandler);

      const message = {
        type: 'my-type',
        payload: {},
        timestamp: Date.now(),
        senderId: 'other-tab',
      };
      mockChannel.onmessage?.(new MessageEvent('message', { data: message }));

      expect(newHandler).toHaveBeenCalled();

      broadcast.close();
    });

    it('should correctly handle typed message payload', () => {
      const broadcast = BroadcastManager.create('test-channel');

      interface UserPayload {
        userId: string;
        name: string;
      }

      const handler = vi.fn<(msg: { type: string; payload: UserPayload }) => void>();
      broadcast.on<UserPayload>('user-login', handler);

      const message = {
        type: 'user-login',
        payload: { userId: '123', name: 'John' },
        timestamp: Date.now(),
        senderId: 'other-tab',
      };
      mockChannel.onmessage?.(new MessageEvent('message', { data: message }));

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: { userId: '123', name: 'John' },
        })
      );

      broadcast.close();
    });

    it('should include timestamp in sent messages', () => {
      const broadcast = BroadcastManager.create('test-channel');

      const beforeSend = Date.now();
      broadcast.send('test', { data: 'value' });
      const afterSend = Date.now();

      const call = mockChannel.postMessage.mock.calls[0];
      expect(call).toBeDefined();

      const sentMessage = call![0] as { timestamp: number };
      expect(sentMessage.timestamp).toBeGreaterThanOrEqual(beforeSend);
      expect(sentMessage.timestamp).toBeLessThanOrEqual(afterSend);

      broadcast.close();
    });

    it('should include senderId matching instance id', () => {
      const broadcast = BroadcastManager.create('test-channel');

      broadcast.send('test', { data: 'value' });

      const call = mockChannel.postMessage.mock.calls[0];
      expect(call).toBeDefined();

      const sentMessage = call![0] as { senderId: string };
      expect(sentMessage.senderId).toBe(broadcast.id);

      broadcast.close();
    });

    it('should handle message with null payload', () => {
      const broadcast = BroadcastManager.create('test-channel');

      const handler = vi.fn();
      broadcast.on('test', handler);

      const message = {
        type: 'test',
        payload: null,
        timestamp: Date.now(),
        senderId: 'other-tab',
      };
      mockChannel.onmessage?.(new MessageEvent('message', { data: message }));

      expect(handler).toHaveBeenCalledWith(message);

      broadcast.close();
    });

    it('should handle message with undefined payload', () => {
      const broadcast = BroadcastManager.create('test-channel');

      const handler = vi.fn();
      broadcast.on('test', handler);

      const message = {
        type: 'test',
        payload: undefined,
        timestamp: Date.now(),
        senderId: 'other-tab',
      };
      mockChannel.onmessage?.(new MessageEvent('message', { data: message }));

      expect(handler).toHaveBeenCalledWith(message);

      broadcast.close();
    });

    it('should reject message with missing timestamp field', () => {
      const broadcast = BroadcastManager.create('test-channel');

      const handler = vi.fn();
      broadcast.onAny(handler);

      const invalidMessage = {
        type: 'test',
        payload: {},
        senderId: 'other-tab',
        // missing timestamp
      };
      mockChannel.onmessage?.(new MessageEvent('message', { data: invalidMessage }));

      expect(handler).not.toHaveBeenCalled();

      broadcast.close();
    });

    it('should reject message with missing senderId field', () => {
      const broadcast = BroadcastManager.create('test-channel');

      const handler = vi.fn();
      broadcast.onAny(handler);

      const invalidMessage = {
        type: 'test',
        payload: {},
        timestamp: Date.now(),
        // missing senderId
      };
      mockChannel.onmessage?.(new MessageEvent('message', { data: invalidMessage }));

      expect(handler).not.toHaveBeenCalled();

      broadcast.close();
    });

    it('should reject message with non-string type', () => {
      const broadcast = BroadcastManager.create('test-channel');

      const handler = vi.fn();
      broadcast.onAny(handler);

      const invalidMessage = {
        type: null,
        payload: {},
        timestamp: Date.now(),
        senderId: 'other-tab',
      };
      mockChannel.onmessage?.(new MessageEvent('message', { data: invalidMessage }));

      expect(handler).not.toHaveBeenCalled();

      broadcast.close();
    });

    it('should reject message with non-number timestamp', () => {
      const broadcast = BroadcastManager.create('test-channel');

      const handler = vi.fn();
      broadcast.onAny(handler);

      const invalidMessage = {
        type: 'test',
        payload: {},
        timestamp: 'not-a-number',
        senderId: 'other-tab',
      };
      mockChannel.onmessage?.(new MessageEvent('message', { data: invalidMessage }));

      expect(handler).not.toHaveBeenCalled();

      broadcast.close();
    });

    it('should reject message with non-string senderId', () => {
      const broadcast = BroadcastManager.create('test-channel');

      const handler = vi.fn();
      broadcast.onAny(handler);

      const invalidMessage = {
        type: 'test',
        payload: {},
        timestamp: Date.now(),
        senderId: 12345,
      };
      mockChannel.onmessage?.(new MessageEvent('message', { data: invalidMessage }));

      expect(handler).not.toHaveBeenCalled();

      broadcast.close();
    });
  });

  describe('ID generation fallbacks', () => {
    let originalBroadcastChannel: typeof BroadcastChannel;
    let mockChannel: {
      postMessage: ReturnType<typeof vi.fn>;
      close: ReturnType<typeof vi.fn>;
      onmessage: ((e: MessageEvent) => void) | null;
    };

    beforeEach(() => {
      mockChannel = {
        postMessage: vi.fn(),
        close: vi.fn(),
        onmessage: null,
      };

      const MockBroadcastChannel = vi.fn().mockImplementation(function () {
        return mockChannel;
      });

      originalBroadcastChannel = globalThis.BroadcastChannel;
      globalThis.BroadcastChannel = MockBroadcastChannel as unknown as typeof BroadcastChannel;
    });

    afterEach(() => {
      globalThis.BroadcastChannel = originalBroadcastChannel;
    });

    it('should generate a unique ID for each instance', () => {
      const instances = Array.from({ length: 5 }, () => BroadcastManager.create('test-channel'));

      const ids = instances.map((i) => i.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(5);

      instances.forEach((i) => i.close());
    });

    it('should have an ID that is a non-empty string', () => {
      const broadcast = BroadcastManager.create('test-channel');

      expect(typeof broadcast.id).toBe('string');
      expect(broadcast.id.length).toBeGreaterThan(0);

      broadcast.close();
    });
  });

  // ===========================================================================
  // Coverage Gaps
  // ===========================================================================

  describe('Coverage Gaps', () => {
    it('should create CRYPTO_UNAVAILABLE error via cryptoUnavailable() (lines 62-67)', () => {
      const error = BroadcastError.cryptoUnavailable();

      expect(error).toBeInstanceOf(BroadcastError);
      expect(error.code).toBe('CRYPTO_UNAVAILABLE');
      expect(error.message).toContain('Crypto API is not available');
    });

    it('should throw BroadcastError when crypto is unavailable during create (lines 132-136)', () => {
      const originalCrypto = globalThis.crypto;
      // @ts-expect-error - intentionally removing crypto for test
      delete globalThis.crypto;

      try {
        expect(() => BroadcastManager.create('test-channel')).toThrow(BroadcastError);
        expect(() => BroadcastManager.create('test-channel')).toThrow(
          'Crypto API is not available'
        );
      } finally {
        globalThis.crypto = originalCrypto;
      }
    });

    it('should re-throw non-CryptoError errors from generateId unchanged (line 135)', () => {
      // Save original and mock crypto.randomUUID to throw a non-CryptoError
      const originalRandomUUID = globalThis.crypto.randomUUID;
      const originalGetRandomValues = globalThis.crypto.getRandomValues;

      Object.defineProperty(globalThis.crypto, 'randomUUID', {
        value: () => {
          throw new TypeError('Unexpected test error');
        },
        configurable: true,
      });
      Object.defineProperty(globalThis.crypto, 'getRandomValues', {
        value: undefined,
        configurable: true,
      });

      try {
        expect(() => BroadcastManager.create('test-channel')).toThrow(TypeError);
        expect(() => BroadcastManager.create('test-channel')).toThrow('Unexpected test error');
      } finally {
        Object.defineProperty(globalThis.crypto, 'randomUUID', {
          value: originalRandomUUID,
          configurable: true,
        });
        Object.defineProperty(globalThis.crypto, 'getRandomValues', {
          value: originalGetRandomValues,
          configurable: true,
        });
      }
    });
  });
});
