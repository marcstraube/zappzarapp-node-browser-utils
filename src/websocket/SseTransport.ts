/**
 * Server-Sent Events (SSE) fallback transport.
 *
 * Receives server-pushed messages over an `EventSource` stream and sends messages
 * with `fetch` POST. Used when WebSocket is unavailable or blocked.
 *
 * @remarks
 * ## Server contract
 *
 * - **Receive:** the `fallbackUrl` must serve a `text/event-stream` (SSE) response.
 *   Each event's `data` is delivered to the manager (JSON-parsed like WebSocket text
 *   frames).
 * - **Send:** each {@link SseTransport.send} issues an HTTP `POST` to the send URL
 *   with the serialized message as the request body.
 *
 * Binary frames are not supported (SSE is a UTF-8 text channel). On any SSE error the
 * stream is closed and a close is emitted so the manager's reconnect backoff drives
 * recovery uniformly, rather than racing `EventSource`'s own auto-reconnect.
 */
import { type Transport, noopTransportCallback } from './Transport.js';
import type { BinaryData } from './types.js';

/**
 * Transport backed by `EventSource` (receive) and `fetch` POST (send).
 */
export class SseTransport implements Transport {
  readonly kind = 'sse' as const;
  readonly supportsBinary = false;

  onOpen: () => void = noopTransportCallback;
  onClose: (code: number, reason: string) => void = noopTransportCallback;
  onError: (error: Event) => void = noopTransportCallback;
  onMessage: (data: unknown, event?: MessageEvent) => void = noopTransportCallback;

  private source: EventSource | null = null;
  private closeEmitted = false;

  constructor(
    private readonly receiveUrl: string,
    private readonly sendUrl: string
  ) {}

  connect(): void {
    this.closeEmitted = false;
    this.source = new EventSource(this.receiveUrl);

    this.source.onopen = (): void => {
      this.onOpen();
    };

    this.source.onmessage = (event: MessageEvent): void => {
      this.onMessage(event.data, event);
    };

    this.source.onerror = (event: Event): void => {
      this.onError(event);
      // Drive reconnect through the manager instead of EventSource's auto-retry.
      this.teardown();
      this.emitClose(1006, 'SSE connection error');
    };
  }

  send(data: string): boolean {
    if (this.closeEmitted) return false;
    try {
      void fetch(this.sendUrl, { method: 'POST', body: data }).catch((e: unknown) => {
        this.onError(e instanceof Event ? e : new Event('error'));
      });
      return true;
    } catch {
      return false;
    }
  }

  sendBinary(_data: BinaryData): boolean {
    // SSE is a text-only channel; binary frames are unsupported.
    return false;
  }

  setBinaryType(): void {
    // No-op: binary is unsupported on SSE.
  }

  close(code = 1000, reason = ''): void {
    this.teardown();
    this.emitClose(code, reason);
  }

  private teardown(): void {
    if (this.source) {
      this.source.close();
      this.source = null;
    }
  }

  private emitClose(code: number, reason: string): void {
    if (this.closeEmitted) return;
    this.closeEmitted = true;
    this.onClose(code, reason);
  }
}
