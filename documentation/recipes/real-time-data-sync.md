# Recipe: Real-Time Data Sync

Keep shared state in sync across clients and browser tabs for live
collaboration. WebSocket carries remote changes, CacheManager serves instant
reads, IndexedDB persists across reloads, and BroadcastManager mirrors updates
to other tabs without extra server traffic.

## Modules Used

| Module      | Role                                            |
| ----------- | ----------------------------------------------- |
| `websocket` | Push and receive changes from the server        |
| `cache`     | In-memory state for instant reads               |
| `indexeddb` | Persist state so it survives reloads            |
| `broadcast` | Mirror changes to other tabs in the same origin |

## Architecture

```text
Local Edit
    |
    v
CacheManager (instant read/write)
    |
    +---> IndexedDB (persist)
    |
    +---> WebSocketManager.send ---> server ---> other clients
    |
    +---> BroadcastManager.send ---> other tabs (same browser)

Remote Change
    |
    v
WebSocketManager.onMessage ---> CacheManager + IndexedDB ---> UI
                                      |
                                      +---> BroadcastManager (mirror to tabs)
```

A change made in one tab reaches the server through WebSocket and other tabs
through BroadcastChannel in the same step, so local tabs update immediately
instead of waiting for the server to echo the change back.

## Step-by-Step Setup

### 1. Persist State in IndexedDB

```typescript
import { IndexedDBManager } from '@zappzarapp/browser-utils/indexeddb';

interface Doc {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly revision: number;
  readonly updatedAt: number;
}

const db = await IndexedDBManager.open({
  name: 'collab',
  version: 1,
  stores: {
    docs: { keyPath: 'id', indexes: { byUpdatedAt: { keyPath: 'updatedAt' } } },
  },
});
```

### 2. Create the In-Memory Cache

```typescript
import { CacheManager } from '@zappzarapp/browser-utils/cache';

const docCache = CacheManager.create<Doc>({
  maxSize: 200,
  defaultTtl: 600_000, // 10 minutes
});
```

### 3. Mirror Changes Across Tabs

```typescript
import { BroadcastManager } from '@zappzarapp/browser-utils/broadcast';

const channel = BroadcastManager.create('collab-docs');

// Apply changes from other tabs to local state
channel.on<Doc>('doc-changed', async (message) => {
  await docCache.set(message.payload.id, message.payload);
  await db.put('docs', message.payload);
});
```

`message` carries `payload`, `senderId`, and `timestamp`; the sender skips its
own messages automatically, so a tab never reprocesses its own change.

### 4. Connect the WebSocket

```typescript
import { WebSocketManager } from '@zappzarapp/browser-utils/websocket';

const ws = WebSocketManager.create({
  url: 'wss://collab.example.com/ws',
  reconnect: true,
  maxReconnectAttempts: 20,
  reconnectDelay: 1000,
  maxReconnectDelay: 30_000,
  heartbeatInterval: 30_000,
  heartbeatMessage: () => ({ type: 'ping' }),
  queueMessages: true, // buffer outgoing changes while reconnecting
});

// onMessage auto-parses JSON payloads
ws.onMessage<{ type: string; doc: Doc }>(async (event) => {
  if (event.type === 'doc-changed') {
    await docCache.set(event.doc.id, event.doc);
    await db.put('docs', event.doc);
    channel.send('doc-changed', event.doc); // fan out to local tabs
  }
});

ws.connect();
```

## Complete Example: Collaborative Document Store

```typescript
import { IndexedDBManager } from '@zappzarapp/browser-utils/indexeddb';
import { CacheManager } from '@zappzarapp/browser-utils/cache';
import { BroadcastManager } from '@zappzarapp/browser-utils/broadcast';
import { WebSocketManager } from '@zappzarapp/browser-utils/websocket';

interface Doc {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly revision: number;
  readonly updatedAt: number;
}

async function createDocStore() {
  const db = await IndexedDBManager.open({
    name: 'collab',
    version: 1,
    stores: { docs: { keyPath: 'id' } },
  });

  const cache = CacheManager.create<Doc>({ maxSize: 200, defaultTtl: 600_000 });
  const channel = BroadcastManager.create('collab-docs');
  const ws = WebSocketManager.create({
    url: 'wss://collab.example.com/ws',
    reconnect: true,
    queueMessages: true,
  });

  // Shared path for any incoming change, local or remote
  const apply = async (doc: Doc): Promise<void> => {
    await cache.set(doc.id, doc);
    await db.put('docs', doc);
  };

  ws.onMessage<{ type: string; doc: Doc }>(async (event) => {
    if (event.type === 'doc-changed') {
      await apply(event.doc);
      channel.send('doc-changed', event.doc);
    }
  });

  channel.on<Doc>('doc-changed', (message) => apply(message.payload));

  ws.connect();

  return {
    /** Read a doc: cache first, IndexedDB fallback. */
    async get(id: string): Promise<Doc | undefined> {
      const hit = await cache.get(id, {
        staleWhileRevalidate: true,
        revalidate: async () => (await db.get<Doc>('docs', id)) as Doc,
      });
      return hit?.value;
    },

    /** Edit a doc: update locally, then sync to server and tabs. */
    async edit(doc: Doc): Promise<void> {
      const next: Doc = {
        ...doc,
        revision: doc.revision + 1,
        updatedAt: Date.now(),
      };
      await apply(next); // optimistic local update
      ws.send({ type: 'doc-changed', doc: next }); // queued if reconnecting
      channel.send('doc-changed', next); // other tabs update now
    },

    destroy(): void {
      ws.close();
      channel.close();
      cache.destroy();
      db.close();
    },
  };
}
```

### Usage

```typescript
const store = await createDocStore();

const doc = await store.get('doc-1');

if (doc) {
  await store.edit({ ...doc, body: 'Updated in real time' });
}

// On app shutdown
store.destroy();
```

## Cleanup

Dispose resources in reverse order of creation:

```typescript
function destroy(): void {
  ws.close(); // 1. Stop receiving remote changes
  channel.close(); // 2. Detach from the tab channel
  cache.destroy(); // 3. Clear in-memory state
  db.close(); // 4. Close the database
}
```

Each module's teardown is idempotent -- calling `close()` or `destroy()` more
than once is safe.
