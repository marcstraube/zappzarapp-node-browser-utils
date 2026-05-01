# Recipe: Offline-First App

Build applications that work seamlessly offline by combining WebSocket for
real-time updates, OfflineQueue for operation persistence, CacheManager for fast
reads, and IndexedDB for structured storage.

## Modules Used

| Module      | Role                                        |
| ----------- | ------------------------------------------- |
| `websocket` | Real-time server communication              |
| `offline`   | Queue operations while offline, auto-sync   |
| `cache`     | In-memory cache with stale-while-revalidate |
| `indexeddb` | Persistent structured storage for app data  |

## Architecture

```text
User Action
    |
    v
CacheManager (fast read/write)
    |
    +---> IndexedDB (persistent storage)
    |
    +---> OfflineQueue (pending mutations)
              |
              +---> [online] ---> WebSocketManager (send to server)
              |
              +---> [offline] ---> queued in IndexedDB, synced later

Server Push
    |
    v
WebSocketManager ---> CacheManager ---> IndexedDB
```

Data flows through three paths:

1. **Reads** hit CacheManager first, fall back to IndexedDB, revalidate from the
   server via WebSocket.
2. **Writes** go to CacheManager and IndexedDB immediately (optimistic update),
   then into OfflineQueue for server delivery.
3. **Server pushes** arrive through WebSocket and update both CacheManager and
   IndexedDB.

## Step-by-Step Setup

### 1. Open IndexedDB for Persistent Storage

```typescript
import { IndexedDBManager } from '@zappzarapp/browser-utils/indexeddb';

interface Message {
  readonly id: string;
  readonly channel: string;
  readonly author: string;
  readonly text: string;
  readonly timestamp: number;
}

const db = await IndexedDBManager.open({
  name: 'chat-app',
  version: 1,
  stores: {
    messages: {
      keyPath: 'id',
      indexes: {
        byChannel: { keyPath: 'channel' },
        byTimestamp: { keyPath: 'timestamp' },
      },
    },
  },
});
```

### 2. Create the In-Memory Cache

```typescript
import { CacheManager } from '@zappzarapp/browser-utils/cache';

const messageCache = CacheManager.create<readonly Message[]>({
  maxSize: 50,
  defaultTtl: 300_000, // 5 minutes
  defaultStaleAfter: 60_000, // stale after 1 minute
});
```

### 3. Set Up the Offline Queue

The queue processes pending messages when the connection is available.

```typescript
import { OfflineQueue } from '@zappzarapp/browser-utils/offline';

const sendQueue = await OfflineQueue.create<Message>({
  name: 'pending-messages',
  maxRetries: 5,
  syncDelay: 2000,
  processor: async (message) => {
    // Processor is called when online -- send via WebSocket
    ws.send({ type: 'message', payload: message });
  },
});

sendQueue.onSync((item) => {
  console.log('Message delivered:', item.data.id);
});

sendQueue.onError((error) => {
  console.error('Sync failed:', error);
});
```

### 4. Connect the WebSocket

```typescript
import { WebSocketManager } from '@zappzarapp/browser-utils/websocket';

const ws = WebSocketManager.create({
  url: 'wss://chat.example.com/ws',
  reconnect: true,
  maxReconnectAttempts: 20,
  reconnectInterval: 1000,
  maxReconnectInterval: 30_000,
  queueMessages: true,
});

ws.onMessage(async (data) => {
  const event = JSON.parse(data as string);

  if (event.type === 'message') {
    const msg: Message = event.payload;

    // Persist incoming message
    await db.put('messages', msg);

    // Invalidate cached channel list so next read fetches fresh data
    await messageCache.delete(`channel:${msg.channel}`);
  }
});

ws.onStateChange((state) => {
  console.log('Connection:', state);
  if (state === 'connected') {
    sendQueue.sync(); // flush anything queued while offline
  }
});

ws.connect();
```

## Complete Example: Chat Application

Combining all modules into a minimal chat service layer.

```typescript
import { IndexedDBManager } from '@zappzarapp/browser-utils/indexeddb';
import { CacheManager } from '@zappzarapp/browser-utils/cache';
import { OfflineQueue } from '@zappzarapp/browser-utils/offline';
import { WebSocketManager } from '@zappzarapp/browser-utils/websocket';

interface Message {
  readonly id: string;
  readonly channel: string;
  readonly author: string;
  readonly text: string;
  readonly timestamp: number;
}

async function createChatService() {
  const db = await IndexedDBManager.open({
    name: 'chat-app',
    version: 1,
    stores: {
      messages: {
        keyPath: 'id',
        indexes: { byChannel: { keyPath: 'channel' } },
      },
    },
  });

  const cache = CacheManager.create<readonly Message[]>({
    maxSize: 50,
    defaultTtl: 300_000,
    defaultStaleAfter: 60_000,
  });

  const ws = WebSocketManager.create({
    url: 'wss://chat.example.com/ws',
    reconnect: true,
    queueMessages: true,
  });

  const queue = await OfflineQueue.create<Message>({
    name: 'pending-messages',
    maxRetries: 5,
    processor: async (message) => {
      ws.send({ type: 'message', payload: message });
    },
  });

  // Incoming server messages update local stores
  ws.onMessage(async (data) => {
    const event = JSON.parse(data as string);
    if (event.type === 'message') {
      await db.put('messages', event.payload);
      await cache.delete(`channel:${event.payload.channel}`);
    }
  });

  // Flush queue when reconnected
  ws.onStateChange((state) => {
    if (state === 'connected') {
      queue.sync();
    }
  });

  ws.connect();

  return {
    /** Read messages for a channel, cached with SWR fallback to IndexedDB. */
    async getMessages(channel: string): Promise<readonly Message[]> {
      const result = await cache.get(`channel:${channel}`, {
        staleWhileRevalidate: true,
        revalidate: async () => {
          const all = await db.getAll<Message>('messages');
          return all.filter((m) => m.channel === channel);
        },
      });
      return result?.value ?? [];
    },

    /** Send a message -- works offline via queue. */
    async sendMessage(channel: string, text: string): Promise<Message> {
      const message: Message = {
        id: crypto.randomUUID(),
        channel,
        author: 'current-user',
        text,
        timestamp: Date.now(),
      };

      // Optimistic update: write to DB and invalidate cache immediately
      await db.put('messages', message);
      await cache.delete(`channel:${channel}`);

      // Enqueue for server delivery (sent now if online, later if offline)
      await queue.add(message);

      return message;
    },

    /** Tear down all resources. */
    destroy(): void {
      ws.disconnect();
      queue.destroy();
      cache.destroy();
      db.close();
    },
  };
}
```

### Usage

```typescript
const chat = await createChatService();

// Read messages (cache hit or IndexedDB fallback)
const messages = await chat.getMessages('general');

// Send while online or offline -- handled transparently
await chat.sendMessage('general', 'Hello from the plane!');

// Clean up on app shutdown
chat.destroy();
```

## Cleanup

Always dispose resources in reverse order of creation to avoid dangling
references:

```typescript
function destroy(): void {
  // 1. Stop receiving data
  ws.disconnect();

  // 2. Stop processing queued items
  queue.destroy();

  // 3. Clear in-memory cache
  cache.destroy();

  // 4. Close database connection
  db.close();
}
```

Each module's cleanup is idempotent -- calling `destroy()` or `close()` multiple
times is safe.
