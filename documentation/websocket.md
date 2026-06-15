# WebSocket Utilities

Type-safe WebSocket wrapper with automatic reconnection, message queuing, and an
optional SSE/polling fallback for environments that block WebSocket.

## Quick Start

```typescript
import {
  WebSocketManager,
  WebSocketError,
} from '@zappzarapp/browser-utils/websocket';

const ws = WebSocketManager.create({
  url: 'wss://api.example.com/ws',
  reconnect: true,
  queueMessages: true,
});

ws.onMessage((data) => {
  console.log('Received:', data);
});

ws.connect();
ws.send({ type: 'subscribe', channel: 'updates' });
```

## WebSocketManager

### Static Methods

| Method            | Returns             | Description                                |
| ----------------- | ------------------- | ------------------------------------------ |
| `isSupported()`   | `boolean`           | Check if WebSocket is available            |
| `isValidUrl(url)` | `boolean`           | Check if URL uses ws:// or wss:// protocol |
| `create(config)`  | `WebSocketInstance` | Create new WebSocket instance              |

### Configuration

```typescript
const ws = WebSocketManager.create({
  url: 'wss://api.example.com/ws', // WebSocket URL (required)
  protocols: ['v1.protocol'], // Subprotocols (optional)
  reconnect: true, // Auto-reconnect on disconnect (default: true)
  maxReconnectAttempts: 10, // Max reconnection attempts (default: 10)
  reconnectDelay: 1000, // Base reconnect delay ms (default: 1000)
  maxReconnectDelay: 30000, // Max reconnect delay ms (default: 30000)
  reconnectMultiplier: 1.5, // Exponential backoff multiplier (default: 1.5)
  heartbeatInterval: 0, // Heartbeat ping interval ms, 0 = disabled (default: 0)
  heartbeatMessage: 'ping', // Heartbeat payload, string or () => unknown (default: 'ping')
  queueMessages: true, // Queue messages when disconnected (default: true)
  maxQueueSize: 100, // Max queued messages (default: 100)
  binaryType: 'arraybuffer', // Binary data type (default: 'blob')
  fallback: 'sse', // Fallback transport: 'polling' | 'sse' | 'none' (default: 'none')
  fallbackUrl: 'https://api.example.com/sse', // HTTP(S) receive endpoint (required if fallback set)
  fallbackSendUrl: 'https://api.example.com/send', // HTTP(S) send endpoint (default: fallbackUrl)
  pollInterval: 3000, // Poll interval ms for 'polling' fallback (default: 3000)
});
```

See [Transport Fallback](#transport-fallback) for the transport behavior and the
server contract each fallback expects.

## WebSocketInstance

### Methods

| Method                     | Returns      | Description                                                           |
| -------------------------- | ------------ | --------------------------------------------------------------------- |
| `connect()`                | `void`       | Connect to the server (WebSocket, or fallback if configured)          |
| `close(code?, reason?)`    | `void`       | Close the connection                                                  |
| `send(data)`               | `boolean`    | Send a message (JSON-serialized unless a string); true if sent/queued |
| `sendBinary(data)`         | `boolean`    | Send binary data (WebSocket only; returns false on a fallback)        |
| `setBinaryType(type)`      | `void`       | Set the binary receive type (`'blob'` \| `'arraybuffer'`)             |
| `getBinaryType()`          | `BinaryType` | Get the current binary receive type                                   |
| `onOpen(handler)`          | `CleanupFn`  | Listen for connection open                                            |
| `onClose(handler)`         | `CleanupFn`  | Listen for connection close                                           |
| `onError(handler)`         | `CleanupFn`  | Listen for errors                                                     |
| `onMessage(handler)`       | `CleanupFn`  | Listen for messages                                                   |
| `onBinaryMessage(handler)` | `CleanupFn`  | Listen for binary messages (WebSocket only)                           |
| `onStateChange(handler)`   | `CleanupFn`  | Listen for state changes                                              |

### Properties

| Property            | Type                    | Description                                                    |
| ------------------- | ----------------------- | -------------------------------------------------------------- |
| `url`               | `string`                | WebSocket URL                                                  |
| `state`             | `WebSocketState`        | Current connection state                                       |
| `reconnectAttempts` | `number`                | Current reconnect attempt count                                |
| `activeTransport`   | `TransportKind \| null` | Live transport: `'websocket'`, `'sse'`, `'polling'`, or `null` |

### States

```typescript
type WebSocketState =
  | 'disconnected' // Not connected
  | 'connecting' // Connection in progress
  | 'connected' // Connected and ready
  | 'reconnecting'; // Reconnecting after disconnect
```

## Usage Examples

### Basic Connection

```typescript
const ws = WebSocketManager.create({
  url: 'wss://api.example.com/ws',
});

ws.onOpen(() => {
  console.log('Connected!');
  ws.send({ type: 'hello' });
});

ws.onMessage((data) => {
  console.log('Message:', data);
});

ws.onClose((code, reason) => {
  console.log(`Closed: ${code} - ${reason}`);
});

ws.connect();
```

### Auto-Reconnection

```typescript
const ws = WebSocketManager.create({
  url: 'wss://api.example.com/ws',
  reconnect: true,
  maxReconnectAttempts: 5,
  reconnectDelay: 2000,
});

ws.onStateChange((state) => {
  switch (state) {
    case 'connected':
      hideReconnectBanner();
      break;
    case 'reconnecting':
      showReconnectBanner(`Attempt ${ws.reconnectAttempts}`);
      break;
    case 'disconnected':
      if (ws.reconnectAttempts >= 5) {
        showError('Connection lost');
      }
      break;
  }
});

ws.connect();
```

### Message Queuing

```typescript
const ws = WebSocketManager.create({
  url: 'wss://api.example.com/ws',
  queueMessages: true,
  reconnect: true,
});

// Messages sent while disconnected are queued
// and sent automatically when reconnected
ws.send({ type: 'update', data: formData });
ws.send({ type: 'sync', timestamp: Date.now() });

ws.connect(); // Queued messages sent after connection
```

### Typed Messages

```typescript
interface ServerMessage {
  type: 'update' | 'error' | 'notification';
  payload: unknown;
}

interface ClientMessage {
  type: 'subscribe' | 'unsubscribe' | 'action';
  channel?: string;
  data?: unknown;
}

const ws = WebSocketManager.create({
  url: 'wss://api.example.com/ws',
});

ws.onMessage((data: ServerMessage) => {
  switch (data.type) {
    case 'update':
      handleUpdate(data.payload);
      break;
    case 'notification':
      showNotification(data.payload);
      break;
  }
});

// Type-safe send
// noinspection JSAnnotator
const message: ClientMessage = { type: 'subscribe', channel: 'news' };
ws.send(message);
```

### Binary Data

```typescript
const ws = WebSocketManager.create({
  url: 'wss://api.example.com/ws',
  binaryType: 'arraybuffer',
});

// Binary frames are delivered to onBinaryMessage (and also to onMessage).
ws.onBinaryMessage((data) => {
  if (data instanceof ArrayBuffer) {
    const view = new Uint8Array(data);
    processBytes(view);
  }
});

// Send binary data with sendBinary() — send() would JSON-serialize it.
// Binary is WebSocket-only; sendBinary() returns false on a fallback transport.
const buffer = new ArrayBuffer(16);
ws.sendBinary(buffer);
```

### Cleanup

```typescript
const ws = WebSocketManager.create({
  url: 'wss://api.example.com/ws',
});

// Store cleanup functions
const cleanups = [
  ws.onOpen(() => console.log('Open')),
  ws.onMessage((data) => handleMessage(data)),
  ws.onClose(() => console.log('Closed')),
];

ws.connect();

// Later: cleanup all handlers
cleanups.forEach((cleanup) => cleanup());
ws.close();
```

## Transport Fallback

Some environments block WebSocket connections (strict proxies, corporate
firewalls). Set `fallback` to keep a live channel over **Server-Sent Events** or
**HTTP polling**, using the exact same event-based API — your app code never
branches on transport.

```typescript
const ws = WebSocketManager.create({
  url: 'wss://api.example.com/ws',
  fallback: 'sse',
  fallbackUrl: 'https://api.example.com/sse',
  fallbackSendUrl: 'https://api.example.com/send', // optional; defaults to fallbackUrl
});

ws.onMessage((data) => console.log(data)); // same handler regardless of transport
ws.onStateChange(() => console.log('via', ws.activeTransport)); // 'websocket' | 'sse' | 'polling'
ws.connect();
```

### Selection behavior

`connect()` tries WebSocket first. If WebSocket is unavailable, or the
connection errors/closes before it ever opens, the manager switches to the
configured fallback. Once WebSocket has connected at least once, later drops are
treated as transient and reconnects stay on WebSocket. Reconnect backoff,
message queuing, and the state machine apply to every transport.

> Automatic upgrade back to WebSocket while running on a fallback is not yet
> implemented — once fallen back, the connection stays on the fallback
> transport.

### Server contract

This is a browser-only library: it provides the client transports, but **your
server must implement the matching endpoints**. There is no proprietary protocol
— just plain HTTP.

| Fallback    | Receive (`fallbackUrl`)                                                            | Send (`fallbackSendUrl`)                       |
| ----------- | ---------------------------------------------------------------------------------- | ---------------------------------------------- |
| `'sse'`     | `GET` serving a `text/event-stream`; each event's `data` becomes a message         | `POST` with the serialized message as the body |
| `'polling'` | `GET` returning the next queued message as the body (empty body = nothing pending) | `POST` with the serialized message as the body |

Inbound text is JSON-parsed exactly like WebSocket text frames; non-JSON stays a
string.

### Limitations

- **Binary is WebSocket-only.** SSE and polling are text channels:
  `sendBinary()` returns `false` and no binary messages are received while on a
  fallback.
- **Heartbeats are WebSocket-only.** On polling the poll itself is the liveness
  check, and SSE streams are server-driven.

## WebSocketError

### Error Codes

| Code                | Description                              |
| ------------------- | ---------------------------------------- |
| `NOT_SUPPORTED`     | WebSocket not available                  |
| `CONNECTION_FAILED` | Failed to establish connection           |
| `SEND_FAILED`       | Failed to send message                   |
| `INVALID_STATE`     | Operation not valid in current state     |
| `INVALID_URL`       | URL does not use ws:// or wss:// scheme  |
| `INVALID_CONFIG`    | Fallback enabled without a `fallbackUrl` |

## Security Considerations

1. **Use WSS** - Always use `wss://` (secure WebSocket) in production
2. **Validate Messages** - Validate all incoming messages before processing
3. **Authentication** - Use tokens or cookies for authentication, not URL params
4. **Rate Limiting** - Implement rate limiting for outgoing messages
5. **Reconnection Limits** - Set reasonable `maxReconnectAttempts` to prevent
   infinite loops
