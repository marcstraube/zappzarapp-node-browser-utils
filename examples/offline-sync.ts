// noinspection JSUnusedGlobalSymbols - Example file

/**
 * Offline Sync Example - Offline-first data synchronization queue
 *
 * This example demonstrates:
 * - Creating an offline queue with IndexedDB persistence
 * - Automatic sync when coming back online
 * - Network status monitoring
 * - Conflict resolution strategies
 * - Building a todo app with offline support
 * - Real-time sync status UI updates
 * - Error handling and retry logic
 *
 * @packageDocumentation
 */

import { type CleanupFn } from '@zappzarapp/browser-utils/core';
import {
  OfflineQueue,
  type OfflineQueueInstance,
  type ConflictResolution,
} from '@zappzarapp/browser-utils/offline';
import { NetworkStatus } from '@zappzarapp/browser-utils/network';
import { Logger } from '@zappzarapp/browser-utils/logging';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * API request to be synced.
 */
interface ApiRequest {
  readonly endpoint: string;
  readonly method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  readonly body: unknown;
  readonly timestamp: number;
}

/**
 * Todo item for offline todo app.
 */
interface TodoItem {
  readonly id: string;
  readonly title: string;
  readonly completed: boolean;
  readonly createdAt: number;
  readonly updatedAt: number;
}

/**
 * Document for offline document editor.
 */
interface Document {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly version: number;
  readonly lastModifiedBy: string;
  readonly updatedAt: number;
}

/**
 * Sync status for UI display.
 */
interface SyncStatus {
  readonly online: boolean;
  readonly pending: number;
  readonly syncing: boolean;
  readonly lastSyncTime: number | null;
  readonly error: string | null;
}

// =============================================================================
// Basic Usage
// =============================================================================

/**
 * Basic offline queue usage.
 */
async function basicUsageExample(): Promise<void> {
  console.log('--- Basic Offline Queue Usage ---');

  // Check if offline queue is supported (requires IndexedDB)
  if (!OfflineQueue.isSupported()) {
    console.error('OfflineQueue requires IndexedDB which is not available');
    return;
  }

  console.log('OfflineQueue is supported');

  // Create an offline queue with a processor function
  const queue = await OfflineQueue.create<ApiRequest>({
    name: 'api-requests',
    processor: async (request) => {
      // This function is called when it's time to sync each item
      console.log(`Syncing: ${request.method} ${request.endpoint}`);

      // Make the actual API call
      const response = await fetch(request.endpoint, {
        method: request.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request.body),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log(`Synced: ${request.method} ${request.endpoint}`);
    },
    maxRetries: 3, // Retry up to 3 times
    syncDelay: 1000, // Wait 1 second between sync attempts
    autoSync: true, // Automatically sync when online
  });

  // Subscribe to sync events
  const cleanupSync = queue.onSync((item) => {
    console.log(`Item synced successfully: ${item.id}`);
  });

  // Subscribe to error events
  const cleanupError = queue.onError((error, item) => {
    console.error(`Item failed: ${item.id}`, error.message);
  });

  // Add items to the queue (works offline)
  await queue.add({
    endpoint: '/api/todos',
    method: 'POST',
    body: { title: 'Buy groceries', completed: false },
    timestamp: Date.now(),
  });

  console.log('Added item to queue');

  // Get queue stats
  const stats = await queue.getStats();
  console.log('Queue stats:', stats);

  // Check pending items
  const pending = await queue.getAll();
  console.log('Pending items:', pending.length);

  // Cleanup
  cleanupSync();
  cleanupError();
  queue.destroy();
}

// =============================================================================
// Offline Todo App
// =============================================================================

/**
 * A todo app with full offline support.
 */
class OfflineTodoApp {
  private readonly queue: OfflineQueueInstance<ApiRequest>;
  private readonly logger: ReturnType<typeof Logger.create>;
  private readonly cleanupFns: CleanupFn[] = [];
  private todos: TodoItem[] = [];
  private syncStatus: SyncStatus = {
    online: NetworkStatus.isOnline(),
    pending: 0,
    syncing: false,
    lastSyncTime: null,
    error: null,
  };

  // Event callbacks
  private onTodosChange?: (todos: readonly TodoItem[]) => void;
  private onStatusChange?: (status: SyncStatus) => void;

  private constructor(queue: OfflineQueueInstance<ApiRequest>) {
    this.queue = queue;
    this.logger = Logger.create({
      prefix: '[OfflineTodo]',
      level: 1, // Info
    });

    this.setupEventHandlers();
  }

  /**
   * Create an offline todo app instance.
   */
  static async create(): Promise<OfflineTodoApp> {
    const queue = await OfflineQueue.create<ApiRequest>({
      name: 'todo-sync',
      processor: async (request) => {
        const response = await fetch(request.endpoint, {
          method: request.method,
          headers: { 'Content-Type': 'application/json' },
          body: request.body !== null ? JSON.stringify(request.body) : undefined,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
      },
      maxRetries: 5,
      syncDelay: 2000,
      autoSync: true,
    });

    return new OfflineTodoApp(queue);
  }

  private setupEventHandlers(): void {
    // Handle successful sync
    const cleanupSync = this.queue.onSync((item) => {
      this.logger.info(`Synced: ${item.data.method} ${item.data.endpoint}`);
      void this.updateStatus();
    });
    this.cleanupFns.push(cleanupSync);

    // Handle sync errors
    const cleanupError = this.queue.onError((error, item) => {
      this.logger.error(`Failed: ${item.data.endpoint} - ${error.message}`);
      this.syncStatus = { ...this.syncStatus, error: error.message };
      void this.updateStatus();
    });
    this.cleanupFns.push(cleanupError);

    // Monitor network status
    const cleanupOnline = NetworkStatus.onOnline(() => {
      this.logger.info('Back online - syncing...');
      void this.updateStatus();
    });
    this.cleanupFns.push(cleanupOnline);

    const cleanupOffline = NetworkStatus.onOffline(() => {
      this.logger.warn('Gone offline');
      void this.updateStatus();
    });
    this.cleanupFns.push(cleanupOffline);
  }

  /**
   * Add a new todo item.
   */
  async addTodo(title: string): Promise<TodoItem> {
    const todo: TodoItem = {
      id: crypto.randomUUID(),
      title,
      completed: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Optimistically add to local state
    this.todos.push(todo);
    this.notifyTodosChange();

    // Queue for sync
    await this.queue.add({
      endpoint: '/api/todos',
      method: 'POST',
      body: todo,
      timestamp: Date.now(),
    });

    await this.updateStatus();
    this.logger.info(`Added todo: ${title}`);

    return todo;
  }

  /**
   * Update a todo item.
   */
  async updateTodo(
    id: string,
    updates: Partial<Pick<TodoItem, 'title' | 'completed'>>
  ): Promise<void> {
    const index = this.todos.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new Error(`Todo not found: ${id}`);
    }

    // Optimistically update local state
    this.todos[index] = {
      ...this.todos[index]!,
      ...updates,
      updatedAt: Date.now(),
    };
    this.notifyTodosChange();

    // Queue for sync
    await this.queue.add({
      endpoint: `/api/todos/${id}`,
      method: 'PATCH',
      body: updates,
      timestamp: Date.now(),
    });

    await this.updateStatus();
    this.logger.info(`Updated todo: ${id}`);
  }

  /**
   * Toggle todo completion.
   */
  async toggleTodo(id: string): Promise<void> {
    const todo = this.todos.find((t) => t.id === id);
    if (todo === undefined) {
      throw new Error(`Todo not found: ${id}`);
    }

    await this.updateTodo(id, { completed: !todo.completed });
  }

  /**
   * Delete a todo item.
   */
  async deleteTodo(id: string): Promise<void> {
    // Optimistically remove from local state
    this.todos = this.todos.filter((t) => t.id !== id);
    this.notifyTodosChange();

    // Queue for sync
    await this.queue.add({
      endpoint: `/api/todos/${id}`,
      method: 'DELETE',
      body: null,
      timestamp: Date.now(),
    });

    await this.updateStatus();
    this.logger.info(`Deleted todo: ${id}`);
  }

  /**
   * Get all todos.
   */
  getTodos(): readonly TodoItem[] {
    return this.todos;
  }

  /**
   * Get current sync status.
   */
  getStatus(): SyncStatus {
    return this.syncStatus;
  }

  /**
   * Force sync now.
   */
  async syncNow(): Promise<void> {
    if (NetworkStatus.isOffline()) {
      this.logger.warn('Cannot sync while offline');
      return;
    }

    this.logger.info('Forcing sync...');
    await this.queue.sync();
    await this.updateStatus();
  }

  /**
   * Register todos change callback.
   */
  onTodosChanged(callback: (todos: readonly TodoItem[]) => void): CleanupFn {
    this.onTodosChange = callback;
    // Call immediately with current state
    callback(this.todos);
    return () => {
      this.onTodosChange = undefined;
    };
  }

  /**
   * Register status change callback.
   */
  onSyncStatusChanged(callback: (status: SyncStatus) => void): CleanupFn {
    this.onStatusChange = callback;
    // Call immediately with current state
    callback(this.syncStatus);
    return () => {
      this.onStatusChange = undefined;
    };
  }

  /**
   * Destroy the app and cleanup resources.
   */
  destroy(): void {
    for (const cleanup of this.cleanupFns) {
      cleanup();
    }
    this.cleanupFns.length = 0;
    this.queue.destroy();
    this.logger.info('App destroyed');
  }

  private notifyTodosChange(): void {
    this.onTodosChange?.(this.todos);
  }

  private async updateStatus(): Promise<void> {
    const stats = await this.queue.getStats();

    this.syncStatus = {
      online: NetworkStatus.isOnline(),
      pending: stats.size,
      syncing: stats.isSyncing,
      lastSyncTime: stats.size === 0 ? Date.now() : this.syncStatus.lastSyncTime,
      error: null,
    };

    this.onStatusChange?.(this.syncStatus);
  }
}

/**
 * Example: Using the offline todo app.
 */
async function offlineTodoExample(): Promise<void> {
  console.log('\n--- Offline Todo App ---');

  const app = await OfflineTodoApp.create();

  // Subscribe to changes
  const cleanupTodos = app.onTodosChanged((todos) => {
    console.log(
      'Todos:',
      todos.map((t) => `${t.completed ? '[x]' : '[ ]'} ${t.title}`)
    );
  });

  const cleanupStatus = app.onSyncStatusChanged((status) => {
    console.log(
      `Sync: ${status.online ? 'online' : 'offline'}, ` +
        `${status.pending} pending, ` +
        `${status.syncing ? 'syncing...' : 'idle'}`
    );
  });

  // Add some todos
  await app.addTodo('Learn TypeScript');
  await app.addTodo('Build offline app');
  await app.addTodo('Test sync functionality');

  // Toggle one
  const todos = app.getTodos();
  if (todos.length > 0) {
    await app.toggleTodo(todos[0]!.id);
  }

  // Show current state
  console.log('Current status:', app.getStatus());

  // Cleanup
  cleanupTodos();
  cleanupStatus();
  app.destroy();
}

// =============================================================================
// Conflict Resolution
// =============================================================================

/**
 * Document sync with conflict resolution.
 */
async function conflictResolutionExample(): Promise<void> {
  console.log('\n--- Conflict Resolution ---');

  // Custom conflict resolver for documents
  const conflictResolver = (local: Document, remote: Document): ConflictResolution<Document> => {
    // Version-based conflict resolution
    if (local.version > remote.version) {
      console.log('Keeping local (higher version)');
      return 'keep-local';
    } else if (remote.version > local.version) {
      console.log('Keeping remote (higher version)');
      return 'keep-remote';
    }

    // Same version - merge based on timestamp
    if (local.updatedAt > remote.updatedAt) {
      console.log('Keeping local (more recent)');
      return 'keep-local';
    } else if (remote.updatedAt > local.updatedAt) {
      console.log('Keeping remote (more recent)');
      return 'keep-remote';
    }

    // Exact same time - merge content
    console.log('Merging documents');
    return {
      merged: {
        ...remote,
        content: `${local.content}\n\n---\n\n${remote.content}`,
        version: Math.max(local.version, remote.version) + 1,
        updatedAt: Date.now(),
      },
    };
  };

  // Create queue with custom conflict resolver
  const queue = await OfflineQueue.create<Document>({
    name: 'documents',
    processor: async (doc) => {
      console.log(`Syncing document: ${doc.title}`);
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 100));
    },
    conflictResolver,
    maxRetries: 3,
  });

  // Subscribe to conflict events
  const cleanupConflict = queue.onConflict((resolution, local, remote) => {
    console.log('Conflict resolved:', resolution);
    console.log('  Local:', local.title, 'v' + local.version);
    console.log('  Remote:', remote.title, 'v' + remote.version);
  });

  // Test conflict resolution
  const localDoc: Document = {
    id: 'doc-1',
    title: 'My Document',
    content: 'Local changes here',
    version: 2,
    lastModifiedBy: 'user-a',
    updatedAt: Date.now(),
  };

  const remoteDoc: Document = {
    id: 'doc-1',
    title: 'My Document',
    content: 'Remote changes here',
    version: 2,
    lastModifiedBy: 'user-b',
    updatedAt: Date.now() - 1000, // Older
  };

  // Resolve the conflict
  const resolution = queue.resolveConflict(localDoc, remoteDoc);
  console.log('Resolution result:', resolution);

  cleanupConflict();
  queue.destroy();
}

// =============================================================================
// Sync Status UI
// =============================================================================

/**
 * Build a sync status indicator UI.
 */
function syncStatusUIExample(): void {
  console.log('\n--- Sync Status UI ---');

  // Simulated UI update function
  function updateSyncUI(status: SyncStatus): void {
    const indicator = document.getElementById('sync-indicator');
    const text = document.getElementById('sync-text');

    if (indicator === null || text === null) {
      // For demo, just log
      console.log('UI Update:');
      console.log(`  Icon: ${getStatusIcon(status)}`);
      console.log(`  Text: ${getStatusText(status)}`);
      console.log(`  Color: ${getStatusColor(status)}`);
      return;
    }

    indicator.className = `sync-indicator ${getStatusClass(status)}`;
    indicator.textContent = getStatusIcon(status);
    text.textContent = getStatusText(status);
    text.style.color = getStatusColor(status);
  }

  function getStatusIcon(status: SyncStatus): string {
    if (!status.online) return 'cloud_off';
    if (status.syncing) return 'sync';
    if (status.pending > 0) return 'cloud_queue';
    if (status.error !== null) return 'error';
    return 'cloud_done';
  }

  function getStatusText(status: SyncStatus): string {
    if (!status.online) return 'Offline';
    if (status.syncing) return 'Syncing...';
    if (status.pending > 0) return `${status.pending} changes pending`;
    if (status.error !== null) return `Sync error: ${status.error}`;
    return 'All changes saved';
  }

  function getStatusColor(status: SyncStatus): string {
    if (!status.online) return '#9e9e9e'; // Gray
    if (status.error !== null) return '#f44336'; // Red
    if (status.pending > 0) return '#ff9800'; // Orange
    return '#4caf50'; // Green
  }

  function getStatusClass(status: SyncStatus): string {
    if (!status.online) return 'offline';
    if (status.syncing) return 'syncing';
    if (status.error !== null) return 'error';
    if (status.pending > 0) return 'pending';
    return 'synced';
  }

  // Demo different states
  const states: SyncStatus[] = [
    { online: true, pending: 0, syncing: false, lastSyncTime: Date.now(), error: null },
    { online: true, pending: 3, syncing: false, lastSyncTime: null, error: null },
    { online: true, pending: 3, syncing: true, lastSyncTime: null, error: null },
    { online: false, pending: 3, syncing: false, lastSyncTime: null, error: null },
    { online: true, pending: 1, syncing: false, lastSyncTime: null, error: 'Network timeout' },
  ];

  console.log('Simulating sync status changes:');
  for (const state of states) {
    updateSyncUI(state);
    console.log('---');
  }
}

// =============================================================================
// Real-World Integration
// =============================================================================

/**
 * Example: Integrating offline sync with a form.
 */
async function formIntegrationExample(): Promise<void> {
  console.log('\n--- Form Integration ---');

  const queue = await OfflineQueue.create<ApiRequest>({
    name: 'form-submissions',
    processor: async (request) => {
      const response = await fetch(request.endpoint, {
        method: request.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request.body),
      });

      if (!response.ok) {
        throw new Error(`Submission failed: ${response.status}`);
      }
    },
    maxRetries: 5,
    autoSync: true,
  });

  // Simulated form submission handler
  async function handleFormSubmit(formData: Record<string, string>): Promise<void> {
    console.log('Form submitted:', formData);

    // Add to offline queue
    await queue.add(
      {
        endpoint: '/api/submit',
        method: 'POST',
        body: formData,
        timestamp: Date.now(),
      },
      0 // Priority (lower = higher priority)
    );

    const stats = await queue.getStats();

    if (stats.isOnline) {
      console.log('Submitting immediately...');
    } else {
      console.log('Saved for later - will submit when back online');
    }
  }

  // Example form submissions
  await handleFormSubmit({
    name: 'John Doe',
    email: 'john@example.com',
    message: 'Hello!',
  });

  await handleFormSubmit({
    name: 'Jane Smith',
    email: 'jane@example.com',
    message: 'Hi there!',
  });

  // Show queue state
  const pending = await queue.getAll();
  console.log('Pending submissions:', pending.length);

  queue.destroy();
}

// =============================================================================
// Network Status Monitor
// =============================================================================

/**
 * Example: Building a network status monitor component.
 */
function networkMonitorExample(): CleanupFn {
  console.log('\n--- Network Status Monitor ---');

  const cleanups: CleanupFn[] = [];

  // Monitor online/offline events
  const cleanupOnline = NetworkStatus.onOnline(() => {
    console.log('Network: Back online!');
    // Trigger sync, show notification, etc.
  });
  cleanups.push(cleanupOnline);

  const cleanupOffline = NetworkStatus.onOffline(() => {
    console.log('Network: Gone offline');
    // Show offline indicator, pause operations, etc.
  });
  cleanups.push(cleanupOffline);

  // Monitor connection changes (if supported)
  const cleanupConnection = NetworkStatus.onConnectionChange((info) => {
    console.log('Connection changed:', info);
    console.log(`  Type: ${info.type}`);
    console.log(`  Effective: ${info.effectiveType ?? 'unknown'}`);
    console.log(`  Downlink: ${info.downlink ?? 'unknown'} Mbps`);
  });
  cleanups.push(cleanupConnection);

  // Show current status
  const info = NetworkStatus.getInfo();
  console.log('Current network status:', info);

  // Return cleanup function
  return () => {
    for (const cleanup of cleanups) {
      cleanup();
    }
    console.log('Network monitor cleanup complete');
  };
}

// =============================================================================
// Priority Queue
// =============================================================================

/**
 * Example: Using priority for queue items.
 */
async function priorityQueueExample(): Promise<void> {
  console.log('\n--- Priority Queue ---');

  const queue = await OfflineQueue.create<ApiRequest>({
    name: 'priority-demo',
    processor: async (request) => {
      console.log(`Processing: ${request.endpoint} (priority was set at queue.add)`);
    },
    autoSync: false, // Manual sync for demo
  });

  // Add items with different priorities (lower number = higher priority)
  await queue.add(
    { endpoint: '/api/low-priority', method: 'POST', body: {}, timestamp: Date.now() },
    10 // Low priority
  );

  await queue.add(
    { endpoint: '/api/high-priority', method: 'POST', body: {}, timestamp: Date.now() },
    0 // High priority - processed first
  );

  await queue.add(
    { endpoint: '/api/medium-priority', method: 'POST', body: {}, timestamp: Date.now() },
    5 // Medium priority
  );

  await queue.add(
    { endpoint: '/api/critical', method: 'POST', body: {}, timestamp: Date.now() },
    -1 // Critical - processed before high priority
  );

  // Peek at next item (should be critical)
  const next = await queue.peek();
  console.log('Next item to process:', next?.data.endpoint);

  // Get all items (sorted by priority)
  const all = await queue.getAll();
  console.log(
    'Queue order:',
    all.map((item) => item.data.endpoint)
  );

  queue.destroy();
}

// =============================================================================
// Run All Examples
// =============================================================================

/**
 * Run all offline sync examples.
 */
export async function runOfflineSyncExamples(): Promise<void> {
  console.log('=== Offline Sync Examples ===\n');

  await basicUsageExample();
  await offlineTodoExample();
  await conflictResolutionExample();
  syncStatusUIExample();
  await formIntegrationExample();

  const cleanupNetworkMonitor = networkMonitorExample();
  // Stop network monitor after demo
  cleanupNetworkMonitor();

  await priorityQueueExample();

  console.log('\n=== Offline Sync Examples Complete ===');
}

// Export for module usage
export { OfflineTodoApp, type ApiRequest, type TodoItem, type Document, type SyncStatus };

// Uncomment to run directly
// runOfflineSyncExamples().catch(console.error);
