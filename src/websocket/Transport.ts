/**
 * Transport abstraction for the WebSocket manager.
 *
 * A transport owns a single underlying connection (native WebSocket, SSE stream,
 * or HTTP polling loop) and translates its lifecycle and inbound data into the
 * manager's callbacks. Transport-agnostic concerns (state machine, reconnect
 * backoff, message queue, JSON parse/serialize, handler fan-out) live in the
 * manager layer, not here.
 *
 * @remarks
 * The manager assigns the callback properties before calling {@link Transport.connect}.
 * Outbound payloads arrive at {@link Transport.send} already serialized to a string;
 * binary payloads go through {@link Transport.sendBinary}, which only the WebSocket
 * transport supports (SSE and polling are text-only channels).
 */
import type { BinaryData, BinaryType } from './types.js';

/**
 * The kind of transport currently backing a connection.
 */
export type TransportKind = 'websocket' | 'sse' | 'polling';

/**
 * A single connection transport behind the manager's event API.
 */
export interface Transport {
  /** Which transport this is. */
  readonly kind: TransportKind;
  /** Whether binary frames can be sent over this transport. */
  readonly supportsBinary: boolean;

  /** Called when the underlying connection opens. */
  onOpen: () => void;
  /** Called when the underlying connection closes. */
  onClose: (code: number, reason: string) => void;
  /** Called on a transport-level error. */
  onError: (error: Event) => void;
  /** Called for each inbound message (raw; the manager parses JSON / routes binary). */
  onMessage: (data: unknown, event?: MessageEvent) => void;

  /** Open the underlying connection. */
  connect(): void;
  /** Send an already-serialized string payload. Returns false on failure. */
  send(data: string): boolean;
  /** Send a binary payload. Returns false when unsupported or on failure. */
  sendBinary(data: BinaryData): boolean;
  /** Set the binary receive type (WebSocket only; a no-op on text transports). */
  setBinaryType(type: BinaryType): void;
  /** Tear down the underlying connection and clear any internal timers. */
  close(code?: number, reason?: string): void;
}

/**
 * No-op callback used as a default before the manager wires up its handlers.
 */
export const noopTransportCallback = (): void => {
  // Intentionally empty: replaced by the manager before connect().
};
