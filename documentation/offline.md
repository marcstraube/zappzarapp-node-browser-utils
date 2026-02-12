# Offline Queue

Queue operations for offline-first applications with IndexedDB persistence and
automatic synchronization.

## Quick Start

```typescript
import {
  OfflineQueue,
  OfflineQueueError,
} from '@zappzarapp/browser-utils/offline';

// Create queue with processor
const queue = await OfflineQueue.create<ApiRequest>({
  name: 'api-requests',
  processor: async (item) => {
    await fetch(item.url, { method: item.method, body: item.body });
  },
});

// Add items (persisted in IndexedDB)
await queue.add({ url: '/api/data', method: 'POST', body: '{}' });

// Items sync automatically when online
queue.onSync((item) => console.log('Synced:', item.data));

// Clean up when done
queue.destroy();
```

## OfflineQueue

### Static Methods

| Method           | Returns                            | Description                     |
| ---------------- | ---------------------------------- | ------------------------------- |
| `isSupported()`  | `boolean`                          | Check if IndexedDB is available |
| `create(config)` | `Promise<OfflineQueueInstance<T>>` | Create a new offline queue      |

### Instance Methods

| Method                           | Returns                              | Description                    |
| -------------------------------- | ------------------------------------ | ------------------------------ |
| `add(data, priority?)`           | `Promise<QueueItem<T>>`              | Add item to queue              |
| `remove(id)`                     | `Promise<boolean>`                   | Remove item by ID              |
| `peek()`                         | `Promise<QueueItem<T> \| undefined>` | Get next item without removing |
| `clear()`                        | `Promise<void>`                      | Remove all items               |
| `size()`                         | `Promise<number>`                    | Get queue size                 |
| `getAll()`                       | `Promise<readonly QueueItem<T>[]>`   | Get all items                  |
| `getStats()`                     | `Promise<QueueStats>`                | Get queue statistics           |
| `sync()`                         | `Promise<void>`                      | Manually trigger sync          |
| `onSync(handler)`                | `CleanupFn`                          | Subscribe to sync events       |
| `onError(handler)`               | `CleanupFn`                          | Subscribe to error events      |
| `onConflict(handler)`            | `CleanupFn`                          | Subscribe to conflict events   |
| `resolveConflict(local, remote)` | `ConflictResolution<T>`              | Resolve data conflict          |
| `destroy()`                      | `void`                               | Destroy queue and cleanup      |

### Instance Properties

| Property | Type     | Description |
| -------- | -------- | ----------- |
| `name`   | `string` | Queue name  |

## Configuration Options

```typescript
interface OfflineQueueConfig<T> {
  /** Queue name (used as database name) */
  name: string;

  /** Function to process queue items when online */
  processor: (item: T) => Promise<void>;

  /** Conflict resolution strategy (default: last-write-wins) */
  conflictResolver?: (local: T, remote: T) => ConflictResolution<T>;

  /** Maximum retry attempts before item is discarded (default: 3) */
  maxRetries?: number;

  /** Delay between sync attempts in ms (default: 1000) */
  syncDelay?: number;

  /** Auto-sync when coming online (default: true) */
  autoSync?: boolean;
}
```

| Option             | Type                         | Default         | Description                      |
| ------------------ | ---------------------------- | --------------- | -------------------------------- |
| `name`             | `string`                     | Required        | Queue name / database name       |
| `processor`        | `(item: T) => Promise<void>` | Required        | Function to process items        |
| `conflictResolver` | `ConflictResolver<T>`        | Last-write-wins | Conflict resolution strategy     |
| `maxRetries`       | `number`                     | `3`             | Max retries before discard       |
| `syncDelay`        | `number`                     | `1000`          | Delay between sync attempts (ms) |
| `autoSync`         | `boolean`                    | `true`          | Auto-sync when coming online     |

## Usage Examples

### Basic Queue Operations

```typescript
interface Task {
  action: string;
  payload: unknown;
}

const queue = await OfflineQueue.create<Task>({
  name: 'tasks',
  processor: async (task) => {
    await api.execute(task.action, task.payload);
  },
});

// Add items
const item = await queue.add({
  action: 'createUser',
  payload: { name: 'Alice' },
});
console.log('Item ID:', item.id);
console.log('Created at:', new Date(item.createdAt));

// Check queue size
const size = await queue.size();
console.log('Queue size:', size);

// Peek at next item
const next = await queue.peek();
if (next) {
  console.log('Next item:', next.data);
}

// Get all items
const allItems = await queue.getAll();
allItems.forEach((item) => console.log(item.data));

// Remove specific item
await queue.remove(item.id);

// Clear entire queue
await queue.clear();
```

### Priority Queue

```typescript
// Lower priority number = processed first
await queue.add({ action: 'urgent' }, 0); // Highest priority
await queue.add({ action: 'normal' }, 10); // Normal priority
await queue.add({ action: 'low' }, 100); // Low priority

// Items are processed in priority order
const next = await queue.peek();
console.log(next?.data.action); // 'urgent'
```

### Event Handling

```typescript
const queue = await OfflineQueue.create<ApiCall>({
  name: 'api-calls',
  processor: sendToServer,
});

// Subscribe to successful syncs
const unsubSync = queue.onSync((item) => {
  console.log('Successfully synced:', item.id);
  updateUI(item.data);
});

// Subscribe to errors
const unsubError = queue.onError((error, item) => {
  console.error('Sync failed:', error.message);
  console.log('Failed item:', item.data);
  console.log('Retry count:', item.retryCount);

  if (item.lastError) {
    console.log('Last error:', item.lastError);
  }
});

// Unsubscribe when done
unsubSync();
unsubError();
```

### Custom Conflict Resolution

```typescript
interface Document {
  id: string;
  content: string;
  updatedAt: number;
  version: number;
}

const queue = await OfflineQueue.create<Document>({
  name: 'documents',
  processor: async (doc) => {
    const remote = await api.getDocument(doc.id);

    if (remote && remote.version > doc.version) {
      // Conflict detected - use resolver
      const resolution = queue.resolveConflict(doc, remote);

      switch (resolution) {
        case 'keep-local':
          await api.saveDocument(doc);
          break;
        case 'keep-remote':
          // Don't save, remote is newer
          break;
        default:
          // Merged result
          await api.saveDocument(resolution.merged);
      }
    } else {
      await api.saveDocument(doc);
    }
  },
  conflictResolver: (local, remote) => {
    // Keep whichever is newer
    if (local.updatedAt > remote.updatedAt) {
      return 'keep-local';
    }
    if (remote.updatedAt > local.updatedAt) {
      return 'keep-remote';
    }
    // Same timestamp - merge by combining content
    return {
      merged: {
        ...remote,
        content: `${local.content}\n---\n${remote.content}`,
        updatedAt: Date.now(),
        version: Math.max(local.version, remote.version) + 1,
      },
    };
  },
});

// Subscribe to conflict events
queue.onConflict((resolution, local, remote) => {
  console.log('Conflict resolved:', resolution);
  console.log('Local version:', local.version);
  console.log('Remote version:', remote.version);
});
```

### Manual Sync Control

```typescript
const queue = await OfflineQueue.create({
  name: 'sync-queue',
  processor: processItem,
  autoSync: false, // Disable automatic sync
});

// Add items while offline
await queue.add({ data: 'item1' });
await queue.add({ data: 'item2' });

// Manually trigger sync when ready
document.getElementById('sync-btn')?.addEventListener('click', async () => {
  const stats = await queue.getStats();

  if (!stats.isOnline) {
    showMessage('You are offline');
    return;
  }

  if (stats.isSyncing) {
    showMessage('Sync already in progress');
    return;
  }

  await queue.sync();
  showMessage('Sync complete');
});
```

### Queue Statistics

```typescript
const stats = await queue.getStats();
// {
//   size: 5,           // Total items in queue
//   failedCount: 1,    // Items that failed at least once
//   isSyncing: false,  // Currently syncing?
//   isOnline: true     // Network online?
// }

// Display status to user
if (stats.size > 0) {
  showStatus(`${stats.size} items pending sync`);
}

if (stats.failedCount > 0) {
  showWarning(`${stats.failedCount} items need attention`);
}
```

### Retry Configuration

```typescript
const queue = await OfflineQueue.create({
  name: 'resilient-queue',
  processor: unreliableApiCall,
  maxRetries: 5, // Retry up to 5 times
  syncDelay: 2000, // Wait 2 seconds between sync attempts
});

// Items that fail will be retried up to maxRetries times
// After max retries, item is removed and error event is emitted
queue.onError((error, item) => {
  if (item.retryCount >= 5) {
    // Item has been discarded after max retries
    logPermanentFailure(item);
  }
});
```

### Complete Example: Offline-First Form

```typescript
import { OfflineQueue } from '@zappzarapp/browser-utils/offline';
import { NetworkStatus } from '@zappzarapp/browser-utils/network';

interface FormSubmission {
  formId: string;
  data: Record<string, string>;
  submittedAt: number;
}

class OfflineForm {
  private queue: OfflineQueueInstance<FormSubmission>;
  private statusEl: HTMLElement;

  async initialize(): Promise<void> {
    if (!OfflineQueue.isSupported()) {
      throw new Error('Offline functionality not supported');
    }

    this.queue = await OfflineQueue.create({
      name: 'form-submissions',
      processor: async (submission) => {
        const response = await fetch('/api/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submission),
        });

        if (!response.ok) {
          throw new Error(`Submit failed: ${response.status}`);
        }
      },
      maxRetries: 3,
    });

    this.queue.onSync((item) => {
      this.showStatus(`Form ${item.data.formId} submitted successfully`);
    });

    this.queue.onError((error, item) => {
      this.showStatus(`Form ${item.data.formId} failed: ${error.message}`);
    });

    // Update status on network change
    NetworkStatus.onChange((online) => {
      this.updateNetworkStatus(online);
    });
  }

  async submit(formData: Record<string, string>): Promise<void> {
    const submission: FormSubmission = {
      formId: crypto.randomUUID(),
      data: formData,
      submittedAt: Date.now(),
    };

    await this.queue.add(submission);

    const stats = await this.queue.getStats();
    if (stats.isOnline) {
      this.showStatus('Form queued and syncing...');
    } else {
      this.showStatus('Form saved offline. Will sync when online.');
    }
  }

  async getPendingCount(): Promise<number> {
    return this.queue.size();
  }

  destroy(): void {
    this.queue.destroy();
  }

  private showStatus(message: string): void {
    console.log(message);
  }

  private updateNetworkStatus(online: boolean): void {
    this.showStatus(online ? 'Online' : 'Offline');
  }
}
```

## OfflineQueueError

### Error Codes

| Code                 | Description                                |
| -------------------- | ------------------------------------------ |
| `NOT_SUPPORTED`      | IndexedDB not available                    |
| `DATABASE_ERROR`     | Database operation failed                  |
| `PROCESSOR_ERROR`    | Item processor threw an error              |
| `CRYPTO_UNAVAILABLE` | Crypto API not available for ID generation |
| `QUEUE_DESTROYED`    | Queue was destroyed                        |

### Error Properties

```typescript
class OfflineQueueError extends BrowserUtilsError {
  readonly code: OfflineQueueErrorCode;
  readonly message: string;
  readonly cause?: unknown;
}
```

## Security Considerations

1. **Data Persistence** - Queue data is stored in IndexedDB unencrypted. Do not
   queue sensitive data without encryption.

2. **Processor Security** - The processor function receives untrusted data from
   IndexedDB. Validate data before processing.

3. **Cross-Tab Access** - IndexedDB is shared across tabs. Be aware of potential
   race conditions with multiple tabs.

4. **Quota Limits** - IndexedDB has storage quotas. Handle quota errors and
   implement cleanup strategies for old items.

5. **Data Integrity** - Network failures during sync can cause partial updates.
   Design processors to be idempotent when possible.

6. **Privacy** - Queued data persists until synced. Consider data retention
   policies and provide users with clear controls.

7. **Conflict Resolution** - Default last-write-wins may lose data. Implement
   appropriate conflict resolution for your use case.

## Browser Support

| Browser     | Support | Notes                     |
| ----------- | ------- | ------------------------- |
| Chrome 24+  | Yes     | Full support              |
| Firefox 16+ | Yes     | Full support              |
| Safari 10+  | Yes     | Full support              |
| Edge 12+    | Yes     | Full support              |
| IE 10+      | Partial | Limited IndexedDB support |

### Requirements

- IndexedDB support
- Crypto API for UUID generation (`crypto.randomUUID()` or
  `crypto.getRandomValues()`)

## Types

```typescript
interface QueueItem<T> {
  readonly id: string;
  readonly data: T;
  readonly createdAt: number;
  readonly retryCount: number;
  readonly lastError?: string;
  readonly priority: number;
}

interface QueueStats {
  readonly size: number;
  readonly failedCount: number;
  readonly isSyncing: boolean;
  readonly isOnline: boolean;
}

type ConflictResolution<T> = 'keep-local' | 'keep-remote' | { merged: T };

type ConflictResolver<T> = (local: T, remote: T) => ConflictResolution<T>;

type ItemProcessor<T> = (item: T) => Promise<void>;

type SyncHandler<T> = (item: QueueItem<T>) => void;

type ErrorHandler<T> = (error: OfflineQueueError, item: QueueItem<T>) => void;

type ConflictHandler<T> = (
  resolution: ConflictResolution<T>,
  local: T,
  remote: T
) => void;

type CleanupFn = () => void;
```
