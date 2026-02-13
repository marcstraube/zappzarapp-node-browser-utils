/**
 * WebSocket Manager - Robust WebSocket wrapper with automatic reconnection.
 *
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Connection state management
 * - Message queuing during reconnection
 * - Heartbeat/ping-pong support
 * - Event-based API
 * - Type-safe message handling
 *
 * @remarks
 * ## Connection Lifecycle
 *
 * ```text
 * ┌─────────────┐
 * │ disconnected│◄────────────────────────────────┐
 * └──────┬──────┘                                 │
 *        │ connect()                              │
 *        ▼                                        │
 * ┌─────────────┐                                 │
 * │ connecting  │                                 │
 * └──────┬──────┘                                 │
 *        │ WebSocket.OPEN                         │
 *        ▼                                        │
 * ┌─────────────┐                                 │
 * │  connected  │◄────────────────┐               │
 * └──────┬──────┘                 │               │
 *        │                        │               │
 *        │ close() / error /      │               │
 *        │ server disconnect      │               │
 *        ▼                        │               │
 * ┌─────────────┐                 │               │
 * │disconnecting│                 │               │
 * └──────┬──────┘                 │               │
 *        │                        │               │
 *        │ WebSocket.CLOSE        │               │
 *        ▼                        │               │
 * ┌─────────────┐                 │               │
 * │ disconnected│                 │               │
 * └──────┬──────┘                 │               │
 *        │                        │               │
 *        │ reconnect=true AND     │               │
 *        │ !intentionalClose      │               │
 *        ▼                        │               │
 * ┌─────────────┐                 │               │
 * │reconnecting │                 │               │
 * └──────┬──────┘                 │               │
 *        │                        │               │
 *        │ Backoff delay          │               │
 *        │ (exponential)          │               │
 *        ▼                        │               │
 *        ├──► Retry < max? ───────┤               │
 *        │         yes                            │
 *        ├──► Retry >= max? ─────────────────────►┘
 *                  no
 * ```
 *
 * ## Reconnection Flow
 *
 * ```text
 * Disconnect detected
 *         │
 *         ▼
 *    intentional? ──yes──► disconnected (no retry)
 *         │ no
 *         ▼
 *   reconnect=true? ──no──► disconnected (no retry)
 *         │ yes
 *         ▼
 *  attempts < max? ──no──► disconnected (max reached)
 *         │ yes
 *         ▼
 *   state = reconnecting
 *         │
 *         ▼
 *   Calculate delay = min(
 *     reconnectDelay * (multiplier ^ (attempts - 1)),
 *     maxReconnectDelay
 *   )
 *         │
 *         ▼
 *    Wait delay ms
 *         │
 *         ▼
 *    connect() ──success──► connected (attempts = 0)
 *         │
 *         └──fail──► Repeat from start
 * ```
 *
 * ## Heartbeat Flow
 *
 * ```text
 * connected state
 *       │
 *       ▼
 * heartbeatInterval > 0? ──no──► (no heartbeat)
 *       │ yes
 *       ▼
 * Start interval timer
 *       │
 *       └──► Every heartbeatInterval ms:
 *               │
 *               ▼
 *          readyState = OPEN? ──no──► Skip
 *               │ yes
 *               ▼
 *          Send heartbeatMessage
 *               │
 *               └──► Repeat
 *
 * On disconnect/close:
 *  → Clear interval timer
 * ```
 *
 * ## Message Queuing Flow
 *
 * ```text
 * send(data) called
 *       │
 *       ▼
 * readyState = OPEN? ──yes──► Send immediately → Done
 *       │ no
 *       ▼
 * queueMessages=true? ──no──► Return false (message lost)
 *       │ yes
 *       ▼
 * queue.length < maxQueueSize? ──no──► Return false (queue full)
 *       │ yes
 *       ▼
 * Add to messageQueue[] → Return true
 *       │
 *       └──► When connection restored:
 *               │
 *               ▼
 *          Flush queue (FIFO order)
 *               │
 *               ▼
 *          For each message:
 *            readyState = OPEN? ──yes──► Send message
 *                  │ no
 *                  └──► Put back in queue, stop flushing
 * ```
 *
 * @example
 * ```TypeScript
 * // Create connection
 * const ws = WebSocketManager.create({
 *   url: 'wss://api.example.com/ws',
 *   reconnect: true,
 *   maxReconnectAttempts: 5,
 * });
 *
 * // Event handlers
 * ws.onOpen(() => console.log('Connected'));
 * ws.onClose(() => console.log('Disconnected'));
 * ws.onError((error) => console.error('Error:', error));
 * ws.onMessage((data) => console.log('Received:', data));
 *
 * // Send messages
 * ws.send({ type: 'hello', payload: 'world' });
 *
 * // Close connection
 * ws.close();
 * ```
 */
import { WebSocketError, type WebSocketErrorCode, type CleanupFn } from '../core/index.js';

export { WebSocketError };
export type { WebSocketErrorCode };

/**
 * WebSocket connection states.
 */
export type ConnectionState =
  | 'connecting'
  | 'connected'
  | 'disconnecting'
  | 'disconnected'
  | 'reconnecting';

/**
 * Binary type for WebSocket.
 */
export type BinaryType = 'blob' | 'arraybuffer';

/**
 * Binary data types that can be sent via WebSocket.
 */
export type BinaryData = ArrayBuffer | ArrayBufferView | Blob;

/**
 * WebSocket manager configuration.
 */
export interface WebSocketConfig {
  /** WebSocket URL (must start with ws:// or wss://) */
  readonly url: string;
  /** Sub-protocols */
  readonly protocols?: string | string[];
  /** Enable automatic reconnection */
  readonly reconnect?: boolean;
  /** Maximum reconnection attempts (0 = unlimited) */
  readonly maxReconnectAttempts?: number;
  /** Initial reconnect delay in ms */
  readonly reconnectDelay?: number;
  /** Maximum reconnect delay in ms */
  readonly maxReconnectDelay?: number;
  /** Reconnect delay multiplier */
  readonly reconnectMultiplier?: number;
  /** Heartbeat interval in ms (0 = disabled) */
  readonly heartbeatInterval?: number;
  /** Heartbeat message */
  readonly heartbeatMessage?: string | (() => unknown);
  /** Queue messages while disconnected */
  readonly queueMessages?: boolean;
  /** Maximum queued messages */
  readonly maxQueueSize?: number;
  /** Binary type for receiving binary data ('blob' or 'arraybuffer') */
  readonly binaryType?: BinaryType;
}

/**
 * WebSocket manager instance.
 */
export interface WebSocketInstance {
  /** Current connection state */
  readonly state: ConnectionState;
  /** WebSocket URL */
  readonly url: string;
  /** Number of reconnection attempts */
  readonly reconnectAttempts: number;

  /** Connect to the WebSocket server */
  connect(): void;
  /** Send a message (JSON serialized if object) */
  send(data: unknown): boolean;
  /** Send binary data directly */
  sendBinary(data: BinaryData): boolean;
  /** Close the connection */
  close(code?: number, reason?: string): void;

  /** Set binary type for receiving data */
  setBinaryType(type: BinaryType): void;
  /** Get current binary type */
  getBinaryType(): BinaryType;

  /** Register open handler */
  onOpen(handler: () => void): CleanupFn;
  /** Register close handler */
  onClose(handler: (code: number, reason: string) => void): CleanupFn;
  /** Register error handler */
  onError(handler: (error: Event) => void): CleanupFn;
  /** Register message handler */
  onMessage<T = unknown>(handler: (data: T, event: MessageEvent) => void): CleanupFn;
  /** Register binary message handler */
  onBinaryMessage(handler: (data: ArrayBuffer | Blob) => void): CleanupFn;
  /** Register state change handler */
  onStateChange(handler: (state: ConnectionState) => void): CleanupFn;
}

/**
 * Default configuration values.
 */
const DEFAULT_CONFIG = {
  reconnect: true,
  maxReconnectAttempts: 10,
  reconnectDelay: 1000,
  maxReconnectDelay: 30000,
  reconnectMultiplier: 1.5,
  heartbeatInterval: 0,
  queueMessages: true,
  maxQueueSize: 100,
  binaryType: 'blob' as BinaryType,
} as const satisfies Partial<WebSocketConfig>;

export const WebSocketManager = {
  /**
   * Check if WebSocket is supported.
   *
   * @example
   * ```TypeScript
   * if (WebSocketManager.isSupported()) {
   *   const ws = WebSocketManager.create({ url: 'wss://api.example.com/ws' });
   * } else {
   *   console.warn('WebSocket not supported, using polling fallback');
   * }
   * ```
   */
  isSupported(): boolean {
    return typeof WebSocket !== 'undefined';
  },

  /**
   * Validate WebSocket URL.
   *
   * @example
   * ```TypeScript
   * const userUrl = 'wss://api.example.com/ws';
   * if (!WebSocketManager.isValidUrl(userUrl)) {
   *   throw new Error('Invalid WebSocket URL');
   * }
   * ```
   */
  isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'ws:' || parsed.protocol === 'wss:';
    } catch {
      return false;
    }
  },

  /**
   * Create a WebSocket manager instance.
   *
   * @param config WebSocket configuration
   * @returns WebSocket manager instance
   *
   * @example Basic connection with event handlers
   * ```TypeScript
   * const ws = WebSocketManager.create({
   *   url: 'wss://api.example.com/ws',
   * });
   *
   * ws.onOpen(() => console.log('Connected'));
   * ws.onMessage((data) => console.log('Received:', data));
   * ws.connect();
   * ```
   *
   * @example With automatic reconnection
   * ```TypeScript
   * const ws = WebSocketManager.create({
   *   url: 'wss://api.example.com/ws',
   *   reconnect: true,
   *   maxReconnectAttempts: 5,
   *   reconnectDelay: 1000,
   *   reconnectMultiplier: 2.0, // Exponential backoff
   * });
   *
   * ws.onStateChange((state) => {
   *   if (state === 'reconnecting') {
   *     console.log(`Reconnecting... (attempt ${ws.reconnectAttempts})`);
   *   }
   * });
   * ```
   *
   * @example With heartbeat to keep connection alive
   * ```TypeScript
   * const ws = WebSocketManager.create({
   *   url: 'wss://api.example.com/ws',
   *   heartbeatInterval: 30000, // Send ping every 30 seconds
   *   heartbeatMessage: () => ({ type: 'ping', timestamp: Date.now() }),
   * });
   * ```
   *
   * @example Message queuing during disconnection
   * ```TypeScript
   * const ws = WebSocketManager.create({
   *   url: 'wss://api.example.com/ws',
   *   queueMessages: true,
   *   maxQueueSize: 50,
   * });
   *
   * // Messages sent while disconnected are queued
   * ws.send({ type: 'update', data: 'value' }); // Queued if disconnected
   * // Automatically sent when connection is restored
   * ```
   *
   * @example Type-safe message handling
   * ```TypeScript
   * interface ServerMessage {
   *   type: 'update' | 'notification';
   *   payload: unknown;
   * }
   *
   * const ws = WebSocketManager.create({ url: 'wss://api.example.com/ws' });
   *
   * ws.onMessage<ServerMessage>((message) => {
   *   switch (message.type) {
   *     case 'update':
   *       handleUpdate(message.payload);
   *       break;
   *     case 'notification':
   *       showNotification(message.payload);
   *       break;
   *   }
   * });
   * ```
   */
  create(config: WebSocketConfig): WebSocketInstance {
    if (!WebSocketManager.isSupported()) {
      throw WebSocketError.notSupported();
    }

    if (!WebSocketManager.isValidUrl(config.url)) {
      throw WebSocketError.invalidUrl(config.url);
    }

    const options = { ...DEFAULT_CONFIG, ...config };

    let ws: WebSocket | null = null;
    let state: ConnectionState = 'disconnected';
    let reconnectAttempts = 0;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
    const messageQueue: unknown[] = [];
    let intentionalClose = false;
    let currentBinaryType: BinaryType = options.binaryType;

    // Event handlers
    const openHandlers = new Set<() => void>();
    const closeHandlers = new Set<(code: number, reason: string) => void>();
    const errorHandlers = new Set<(error: Event) => void>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic message handler requires any for type flexibility
    const messageHandlers = new Set<(data: any, event: MessageEvent) => void>();
    const binaryMessageHandlers = new Set<(data: ArrayBuffer | Blob) => void>();
    const stateChangeHandlers = new Set<(state: ConnectionState) => void>();

    const setState = (newState: ConnectionState): void => {
      if (state !== newState) {
        state = newState;
        stateChangeHandlers.forEach((handler) => handler(newState));
      }
    };

    const clearTimers = (): void => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
    };

    const startHeartbeat = (): void => {
      if (options.heartbeatInterval <= 0) return;

      heartbeatInterval = setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN) {
          try {
            const message =
              typeof options.heartbeatMessage === 'function'
                ? options.heartbeatMessage()
                : (options.heartbeatMessage ?? 'ping');

            ws.send(typeof message === 'string' ? message : JSON.stringify(message));
          } catch (e) {
            errorHandlers.forEach((handler) =>
              handler(e instanceof Event ? e : new Event('error'))
            );
          }
        }
      }, options.heartbeatInterval);
    };

    const flushQueue = (): void => {
      while (messageQueue.length > 0 && ws?.readyState === WebSocket.OPEN) {
        const data = messageQueue.shift();
        try {
          ws.send(typeof data === 'string' ? data : JSON.stringify(data));
        } catch {
          // Put message back in queue
          messageQueue.unshift(data);
          break;
        }
      }
    };

    const scheduleReconnect = (): void => {
      if (!options.reconnect || intentionalClose) return;

      if (options.maxReconnectAttempts > 0 && reconnectAttempts >= options.maxReconnectAttempts) {
        setState('disconnected');
        return;
      }

      setState('reconnecting');
      reconnectAttempts++;

      const delay = Math.min(
        options.reconnectDelay * Math.pow(options.reconnectMultiplier, reconnectAttempts - 1),
        options.maxReconnectDelay
      );

      reconnectTimeout = setTimeout(() => {
        connect();
      }, delay);
    };

    /**
     * Check if data is binary (ArrayBuffer or Blob).
     */
    const isBinaryData = (data: unknown): data is ArrayBuffer | Blob => {
      return data instanceof ArrayBuffer || data instanceof Blob;
    };

    const connect = (): void => {
      if (ws?.readyState === WebSocket.OPEN || ws?.readyState === WebSocket.CONNECTING) {
        return;
      }

      intentionalClose = false;
      setState('connecting');

      try {
        ws = new WebSocket(config.url, config.protocols);
        ws.binaryType = currentBinaryType;

        ws.onopen = (): void => {
          setState('connected');
          reconnectAttempts = 0;
          startHeartbeat();
          flushQueue();
          openHandlers.forEach((handler) => handler());
        };

        ws.onclose = (event): void => {
          clearTimers();
          closeHandlers.forEach((handler) => handler(event.code, event.reason));

          if (!intentionalClose) {
            scheduleReconnect();
          } else {
            setState('disconnected');
          }
        };

        ws.onerror = (event): void => {
          errorHandlers.forEach((handler) => handler(event));
        };

        ws.onmessage = (event): void => {
          const data: unknown = event.data;

          // Handle binary data
          if (isBinaryData(data)) {
            binaryMessageHandlers.forEach((handler) => handler(data));
            // Also pass to regular message handlers
            messageHandlers.forEach((handler) => handler(data, event));
            return;
          }

          // Try to parse JSON for string messages
          let parsedData: unknown = data;
          if (typeof data === 'string') {
            try {
              parsedData = JSON.parse(data);
            } catch {
              // Keep as string
            }
          }

          messageHandlers.forEach((handler) => handler(parsedData, event));
        };
      } catch (e) {
        setState('disconnected');
        throw WebSocketError.connectionFailed(config.url, e);
      }
    };

    return {
      get state(): ConnectionState {
        return state;
      },

      get url(): string {
        return config.url;
      },

      get reconnectAttempts(): number {
        return reconnectAttempts;
      },

      connect,

      send(data: unknown): boolean {
        if (ws?.readyState === WebSocket.OPEN) {
          try {
            ws.send(typeof data === 'string' ? data : JSON.stringify(data));
            return true;
          } catch {
            return false;
          }
        }

        // Queue message if enabled
        if (options.queueMessages && messageQueue.length < options.maxQueueSize) {
          messageQueue.push(data);
          return true;
        }

        return false;
      },

      sendBinary(data: BinaryData): boolean {
        if (ws?.readyState === WebSocket.OPEN) {
          try {
            ws.send(data);
            return true;
          } catch {
            return false;
          }
        }
        return false;
      },

      setBinaryType(type: BinaryType): void {
        currentBinaryType = type;
        if (ws) {
          ws.binaryType = type;
        }
      },

      getBinaryType(): BinaryType {
        return currentBinaryType;
      },

      close(code = 1000, reason = ''): void {
        intentionalClose = true;
        clearTimers();
        messageQueue.length = 0;

        if (ws && ws.readyState !== WebSocket.CLOSED) {
          setState('disconnecting');
          ws.close(code, reason);
        } else {
          setState('disconnected');
        }
      },

      onOpen(handler: () => void): CleanupFn {
        openHandlers.add(handler);
        return () => openHandlers.delete(handler);
      },

      onClose(handler: (code: number, reason: string) => void): CleanupFn {
        closeHandlers.add(handler);
        return () => closeHandlers.delete(handler);
      },

      onError(handler: (error: Event) => void): CleanupFn {
        errorHandlers.add(handler);
        return () => errorHandlers.delete(handler);
      },

      onMessage<T = unknown>(handler: (data: T, event: MessageEvent) => void): CleanupFn {
        messageHandlers.add(handler);
        return () => messageHandlers.delete(handler);
      },

      onBinaryMessage(handler: (data: ArrayBuffer | Blob) => void): CleanupFn {
        binaryMessageHandlers.add(handler);
        return () => binaryMessageHandlers.delete(handler);
      },

      onStateChange(handler: (state: ConnectionState) => void): CleanupFn {
        stateChangeHandlers.add(handler);
        return () => stateChangeHandlers.delete(handler);
      },
    };
  },
} as const;
