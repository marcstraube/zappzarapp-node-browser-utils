/**
 * Native WebSocket transport.
 *
 * Wraps a single `WebSocket` connection and forwards its lifecycle and inbound
 * data to the manager. This is the preferred transport; SSE and polling are only
 * used as fallbacks when WebSocket is unavailable or fails to connect.
 */
import { WebSocketError } from '../core/index.js';
import { type Transport, noopTransportCallback } from './Transport.js';
import type { BinaryData, BinaryType } from './types.js';

/**
 * Transport backed by the native `WebSocket` API.
 */
export class WebSocketTransport implements Transport {
  readonly kind = 'websocket' as const;
  readonly supportsBinary = true;

  onOpen: () => void = noopTransportCallback;
  onClose: (code: number, reason: string) => void = noopTransportCallback;
  onError: (error: Event) => void = noopTransportCallback;
  onMessage: (data: unknown, event?: MessageEvent) => void = noopTransportCallback;

  private ws: WebSocket | null = null;
  private binaryType: BinaryType;

  constructor(
    private readonly url: string,
    private readonly protocols: string | string[] | undefined,
    binaryType: BinaryType
  ) {
    this.binaryType = binaryType;
  }

  connect(): void {
    // The manager owns connection-state guarding and only calls connect() when the
    // previous socket (if any) has closed, so no idempotency check is needed here.
    try {
      this.ws = new WebSocket(this.url, this.protocols);
      this.ws.binaryType = this.binaryType;

      this.ws.onopen = (): void => {
        this.onOpen();
      };

      this.ws.onclose = (event): void => {
        this.onClose(event.code, event.reason);
      };

      this.ws.onerror = (event): void => {
        this.onError(event);
      };

      this.ws.onmessage = (event): void => {
        this.onMessage(event.data, event);
      };
    } catch (e) {
      throw WebSocketError.connectionFailed(this.url, e);
    }
  }

  send(data: string): boolean {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(data);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  sendBinary(data: BinaryData): boolean {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(data as string | ArrayBuffer | Blob);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  setBinaryType(type: BinaryType): void {
    this.binaryType = type;
    if (this.ws) {
      this.ws.binaryType = type;
    }
  }

  close(code = 1000, reason = ''): void {
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
      this.ws.close(code, reason);
    }
  }
}
