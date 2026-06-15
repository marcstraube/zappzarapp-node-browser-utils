/**
 * HTTP polling fallback transport.
 *
 * Receives messages by polling an endpoint with `fetch` GET on an interval and sends
 * messages with `fetch` POST. Used when WebSocket is unavailable or blocked and SSE
 * is not desired.
 *
 * @remarks
 * ## Server contract
 *
 * - **Receive:** each poll issues an HTTP `GET` to the `fallbackUrl`. A non-empty
 *   response body is delivered to the manager as one message (JSON-parsed like
 *   WebSocket text frames); an empty body means "no message this tick". The server is
 *   expected to return the next queued message (or a batch the app decodes).
 * - **Send:** each {@link PollingTransport.send} issues an HTTP `POST` to the send URL
 *   with the serialized message as the request body.
 *
 * The transport is considered connected after the first successful poll, so "connected"
 * reflects that the endpoint is reachable. Any failed poll closes the transport and lets
 * the manager's reconnect backoff drive recovery. Binary frames are not supported.
 */
import { type Transport, noopTransportCallback } from './Transport.js';
import type { BinaryData } from './types.js';

/**
 * Transport backed by `fetch` GET polling (receive) and `fetch` POST (send).
 */
export class PollingTransport implements Transport {
  readonly kind = 'polling' as const;
  readonly supportsBinary = false;

  onOpen: () => void = noopTransportCallback;
  onClose: (code: number, reason: string) => void = noopTransportCallback;
  onError: (error: Event) => void = noopTransportCallback;
  onMessage: (data: unknown, event?: MessageEvent) => void = noopTransportCallback;

  private timer: ReturnType<typeof setTimeout> | null = null;
  private hasOpened = false;
  private closeEmitted = false;
  /**
   * Connection generation. Bumped on every connect/teardown so that in-flight polls
   * started for a previous connection (still suspended on an `await`) bail out instead
   * of firing callbacks after close or onto a newer connection.
   */
  private generation = 0;

  constructor(
    private readonly receiveUrl: string,
    private readonly sendUrl: string,
    private readonly pollInterval: number
  ) {}

  connect(): void {
    this.closeEmitted = false;
    this.hasOpened = false;
    this.generation += 1;
    void this.poll(this.generation);
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
    // Polling is a text-only channel; binary frames are unsupported.
    return false;
  }

  setBinaryType(): void {
    // No-op: binary is unsupported on polling.
  }

  close(code = 1000, reason = ''): void {
    this.teardown();
    this.emitClose(code, reason);
  }

  private async poll(generation: number): Promise<void> {
    let response: Response;
    try {
      response = await fetch(this.receiveUrl, { method: 'GET' });
    } catch (e) {
      this.fail(generation, e);
      return;
    }

    if (generation !== this.generation) return;

    if (!response.ok) {
      this.fail(generation, new Event('error'));
      return;
    }

    if (!this.hasOpened) {
      this.hasOpened = true;
      this.onOpen();
    }

    let body: string;
    try {
      body = await response.text();
    } catch (e) {
      this.fail(generation, e);
      return;
    }

    if (generation !== this.generation) return;

    if (body !== '') {
      this.onMessage(body);
    }

    this.scheduleNext(generation);
  }

  private scheduleNext(generation: number): void {
    this.timer = setTimeout(() => {
      void this.poll(generation);
    }, this.pollInterval);
  }

  private fail(generation: number, cause: unknown): void {
    if (generation !== this.generation) return;
    this.onError(cause instanceof Event ? cause : new Event('error'));
    this.teardown();
    this.emitClose(1006, 'Polling request failed');
  }

  private teardown(): void {
    this.generation += 1;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private emitClose(code: number, reason: string): void {
    if (this.closeEmitted) return;
    this.closeEmitted = true;
    this.onClose(code, reason);
  }
}
