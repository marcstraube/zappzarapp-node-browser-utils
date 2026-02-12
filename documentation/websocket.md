# WebSocket Utilities

Type-safe WebSocket wrapper with automatic reconnection and message queuing.

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
  reconnectInterval: 1000, // Base reconnect delay ms (default: 1000)
  maxReconnectInterval: 30000, // Max reconnect delay ms (default: 30000)
  queueMessages: true, // Queue messages when disconnected (default: false)
  binaryType: 'arraybuffer', // Binary data type (default: 'blob')
});
```

## WebSocketInstance

### Methods

| Method                       | Returns     | Description                                |
| ---------------------------- | ----------- | ------------------------------------------ |
| `connect()`                  | `void`      | Connect to WebSocket server                |
| `disconnect(code?, reason?)` | `void`      | Disconnect from server                     |
| `close(code?, reason?)`      | `void`      | Alias for disconnect                       |
| `send(data)`                 | `boolean`   | Send message (returns true if sent/queued) |
| `onOpen(handler)`            | `CleanupFn` | Listen for connection open                 |
| `onClose(handler)`           | `CleanupFn` | Listen for connection close                |
| `onError(handler)`           | `CleanupFn` | Listen for errors                          |
| `onMessage(handler)`         | `CleanupFn` | Listen for messages                        |
| `onStateChange(handler)`     | `CleanupFn` | Listen for state changes                   |

### Properties

| Property            | Type             | Description                     |
| ------------------- | ---------------- | ------------------------------- |
| `url`               | `string`         | WebSocket URL                   |
| `state`             | `WebSocketState` | Current connection state        |
| `reconnectAttempts` | `number`         | Current reconnect attempt count |

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
  reconnectInterval: 2000,
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

ws.onMessage((data) => {
  if (data instanceof ArrayBuffer) {
    const view = new Uint8Array(data);
    processBytes(view);
  }
});

// Send binary data
const buffer = new ArrayBuffer(16);
ws.send(buffer);
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
ws.disconnect();
```

## WebSocketError

### Error Codes

| Code                | Description                             |
| ------------------- | --------------------------------------- |
| `NOT_SUPPORTED`     | WebSocket not available                 |
| `CONNECTION_FAILED` | Failed to establish connection          |
| `SEND_FAILED`       | Failed to send message                  |
| `INVALID_STATE`     | Operation not valid in current state    |
| `INVALID_URL`       | URL does not use ws:// or wss:// scheme |

## Security Considerations

1. **Use WSS** - Always use `wss://` (secure WebSocket) in production
2. **Validate Messages** - Validate all incoming messages before processing
3. **Authentication** - Use tokens or cookies for authentication, not URL params
4. **Rate Limiting** - Implement rate limiting for outgoing messages
5. **Reconnection Limits** - Set reasonable `maxReconnectAttempts` to prevent
   infinite loops
