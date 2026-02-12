# Broadcast Manager

Type-safe cross-tab communication via the BroadcastChannel API.

## Quick Start

```typescript
import { BroadcastManager } from '@zappzarapp/browser-utils/broadcast';

// Tab 1: Create broadcast manager and listen
const broadcast = BroadcastManager.create('my-app');

broadcast.on<{ count: number }>('counter', (message) => {
  console.log(
    `Tab ${message.senderId} updated counter to:`,
    message.payload.count
  );
});

// Tab 2: Send a message
const broadcast2 = BroadcastManager.create('my-app');
broadcast2.send('counter', { count: 42 });
```

## BroadcastManager

### Static Methods

| Method            | Returns                    | Description                            |
| ----------------- | -------------------------- | -------------------------------------- |
| `isSupported()`   | `boolean`                  | Check if BroadcastChannel is available |
| `create(channel)` | `BroadcastManagerInstance` | Create broadcast manager for a channel |

### BroadcastManagerInstance

#### Properties

| Property      | Type     | Description                        |
| ------------- | -------- | ---------------------------------- |
| `channelName` | `string` | Name of the broadcast channel      |
| `id`          | `string` | Unique ID of this manager instance |

#### Methods

| Method                | Returns     | Description                          |
| --------------------- | ----------- | ------------------------------------ |
| `send(type, payload)` | `void`      | Send message to all other tabs       |
| `on(type, handler)`   | `CleanupFn` | Subscribe to specific message type   |
| `onAny(handler)`      | `CleanupFn` | Subscribe to all messages            |
| `close()`             | `void`      | Close channel and clean up resources |

### Types

```typescript
interface BroadcastMessage<T = unknown> {
  /** Message type identifier for filtering */
  readonly type: string;
  /** Message payload data */
  readonly payload: T;
  /** Timestamp when message was sent (ms since epoch) */
  readonly timestamp: number;
  /** Unique ID of the sender instance */
  readonly senderId: string;
}

interface BroadcastManagerInstance {
  readonly channelName: string;
  readonly id: string;
  send<T>(type: string, payload: T): void;
  on<T>(
    type: string,
    handler: (message: BroadcastMessage<T>) => void
  ): CleanupFn;
  onAny(handler: (message: BroadcastMessage) => void): CleanupFn;
  close(): void;
}
```

## Usage Examples

### Basic Communication

```typescript
// Tab 1: Listen for messages
const broadcast = BroadcastManager.create('my-app');

broadcast.on<{ userId: string }>('login', (msg) => {
  console.log(`User ${msg.payload.userId} logged in from tab ${msg.senderId}`);
});

// Tab 2: Send a message
const broadcast2 = BroadcastManager.create('my-app');
broadcast2.send('login', { userId: 'user123' });
```

### Sync State Between Tabs

```typescript
interface AppState {
  theme: 'light' | 'dark';
  language: string;
  lastUpdated: number;
}

const broadcast = BroadcastManager.create('app-state');

// Listen for state updates from other tabs
broadcast.on<AppState>('state-update', (msg) => {
  // Ignore messages from self (based on timestamp or senderId)
  if (msg.senderId !== broadcast.id) {
    applyState(msg.payload);
  }
});

// Broadcast state changes to other tabs
function updateState(state: AppState): void {
  applyState(state);
  broadcast.send('state-update', state);
}
```

### Listen to All Messages

```typescript
const broadcast = BroadcastManager.create('debug-channel');

const cleanup = broadcast.onAny((msg) => {
  console.log(`[${msg.type}] from ${msg.senderId}:`, msg.payload);
});

// Later: stop listening
cleanup();
```

### User Session Management

```typescript
interface SessionEvent {
  action: 'logout' | 'refresh-token' | 'session-expired';
  timestamp: number;
}

const broadcast = BroadcastManager.create('session');

// Logout all tabs when user logs out in one tab
broadcast.on<SessionEvent>('session', (msg) => {
  switch (msg.payload.action) {
    case 'logout':
      performLogout();
      break;
    case 'refresh-token':
      refreshAuthToken();
      break;
    case 'session-expired':
      redirectToLogin();
      break;
  }
});

// When user clicks logout
function handleLogout(): void {
  broadcast.send('session', { action: 'logout', timestamp: Date.now() });
  performLogout();
}
```

### Shopping Cart Sync

```typescript
interface CartItem {
  id: string;
  quantity: number;
}

interface CartUpdate {
  items: CartItem[];
  total: number;
}

const broadcast = BroadcastManager.create('shopping-cart');

// Sync cart across tabs
broadcast.on<CartUpdate>('cart-update', (msg) => {
  updateLocalCart(msg.payload.items);
  updateCartBadge(msg.payload.total);
});

function addToCart(item: CartItem): void {
  const updatedCart = addItemToCart(item);
  broadcast.send('cart-update', {
    items: updatedCart.items,
    total: updatedCart.total,
  });
}
```

### Multiple Message Types

```typescript
const broadcast = BroadcastManager.create('app');

// Type-specific handlers
const cleanups = [
  broadcast.on<{ theme: 'light' | 'dark' }>('theme-change', (msg) => {
    applyTheme(msg.payload.theme);
  }),
  broadcast.on<{ locale: string }>('locale-change', (msg) => {
    changeLocale(msg.payload.locale);
  }),
  broadcast.on<{ message: string }>('notification', (msg) => {
    showNotification(msg.payload.message);
  }),
];

// Cleanup all listeners
function destroy(): void {
  cleanups.forEach((cleanup) => cleanup());
  broadcast.close();
}
```

### Feature Detection

```typescript
if (BroadcastManager.isSupported()) {
  const broadcast = BroadcastManager.create('my-app');
  // Use broadcast channel
} else {
  console.warn(
    'BroadcastChannel not supported, falling back to localStorage events'
  );
  // Implement localStorage-based fallback
}
```

### Cleanup on Page Unload

```typescript
const broadcast = BroadcastManager.create('my-app');

// Setup listeners
broadcast.on('state-update', handleStateUpdate);
broadcast.on('user-action', handleUserAction);

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  broadcast.close();
});
```

## BroadcastError

### Error Codes

| Code                 | Description                                  |
| -------------------- | -------------------------------------------- |
| `NOT_SUPPORTED`      | BroadcastChannel is not available            |
| `CHANNEL_CLOSED`     | Cannot send/receive, channel has been closed |
| `SEND_FAILED`        | Failed to post message to channel            |
| `CRYPTO_UNAVAILABLE` | Crypto API not available for ID generation   |

### Error Handling

```typescript
import {
  BroadcastManager,
  BroadcastError,
} from '@zappzarapp/browser-utils/broadcast';

try {
  const broadcast = BroadcastManager.create('my-app');
  broadcast.send('event', { data: 'value' });
} catch (error) {
  if (error instanceof BroadcastError) {
    switch (error.code) {
      case 'NOT_SUPPORTED':
        useFallbackCommunication();
        break;
      case 'CHANNEL_CLOSED':
        reopenChannel();
        break;
      default:
        console.error('Broadcast error:', error.message);
    }
  }
}
```

## Browser Support

The BroadcastChannel API is widely supported in modern browsers:

| Browser         | Support                 |
| --------------- | ----------------------- |
| Chrome          | Supported (since v54)   |
| Edge            | Supported (since v79)   |
| Firefox         | Supported (since v38)   |
| Safari          | Supported (since v15.4) |
| Opera           | Supported (since v41)   |
| Mobile browsers | Widely supported        |

## Security Considerations

1. **Same-Origin Policy** - BroadcastChannel only works between same-origin
   contexts (same protocol, host, and port)
2. **No Cross-Origin** - Messages cannot be sent to or received from different
   origins
3. **Cryptographic IDs** - Sender IDs are generated using `crypto.randomUUID()`
   or `crypto.getRandomValues()` for secure identification
4. **Input Validation** - Messages are validated for expected structure before
   processing
5. **No Sensitive Data** - Avoid broadcasting sensitive data as any same-origin
   page can listen
6. **Cleanup Resources** - Always call `close()` when done to prevent resource
   leaks
