// noinspection JSUnusedGlobalSymbols - Example file

/**
 * Network Retry Queue Example
 *
 * Demonstrates how to build a robust offline-capable data sync system using
 * the RetryQueue and NetworkStatus utilities. This pattern is essential for
 * Progressive Web Apps (PWAs) and mobile-first applications.
 *
 * Features demonstrated:
 * - Automatic retry with exponential backoff
 * - Offline queue persistence
 * - Network status monitoring
 * - UI feedback for sync status
 * - Graceful degradation
 */

import { RetryQueue, type RetryStats } from '@zappzarapp/browser-utils/network';
import { NetworkStatus } from '@zappzarapp/browser-utils/network';
import { StorageManager } from '@zappzarapp/browser-utils/storage';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface SyncItem {
  readonly id: string;
  readonly type: 'create' | 'update' | 'delete';
  readonly endpoint: string;
  readonly payload: unknown;
  readonly timestamp: number;
}

interface SyncManagerOptions {
  /** Base URL for API requests */
  readonly apiBase: string;
  /** Storage prefix for pending items */
  readonly storagePrefix?: string;
  /** Maximum retry attempts */
  readonly maxRetries?: number;
  /** Callback when sync status changes */
  readonly onStatusChange?: (status: SyncStatus) => void;
  /** Callback when item syncs successfully */
  readonly onItemSynced?: (item: SyncItem) => void;
  /** Callback when item fails permanently */
  readonly onItemFailed?: (item: SyncItem, error: Error) => void;
}

interface SyncStatus {
  readonly online: boolean;
  readonly pending: number;
  readonly syncing: boolean;
  readonly lastSync: Date | null;
}

interface SyncManager {
  /** Add an item to the sync queue */
  add(item: Omit<SyncItem, 'id' | 'timestamp'>): Promise<string>;
  /** Force sync all pending items */
  syncNow(): Promise<void>;
  /** Get current sync status */
  getStatus(): SyncStatus;
  /** Get all pending items */
  getPendingItems(): readonly SyncItem[];
  /** Clear all pending items */
  clearPending(): void;
  /** Destroy manager and clean up */
  destroy(): void;
}

// -----------------------------------------------------------------------------
// Sync Manager Implementation
// -----------------------------------------------------------------------------

/**
 * Create a sync manager for offline-capable data synchronization.
 *
 * @example
 * ```typescript
 * const sync = createSyncManager({
 *   apiBase: 'https://api.example.com',
 *   onStatusChange: (status) => updateUI(status),
 *   onItemSynced: (item) => console.log('Synced:', item.id),
 * });
 *
 * // Add items to sync (works offline)
 * await sync.add({
 *   type: 'create',
 *   endpoint: '/posts',
 *   payload: { title: 'Hello', body: 'World' },
 * });
 *
 * // Check status
 * console.log(sync.getStatus());
 * ```
 */
function createSyncManager(options: SyncManagerOptions): SyncManager {
  const {
    apiBase,
    storagePrefix = 'sync',
    maxRetries = 5,
    onStatusChange,
    onItemSynced,
    onItemFailed,
  } = options;

  // Initialize storage for persistence
  const storage = StorageManager.create({ prefix: storagePrefix });

  // Initialize retry queue with network awareness
  const queue = RetryQueue.create({
    maxRetries,
    backoff: 'exponential',
    baseDelay: 1000,
    maxDelay: 60000,
    networkAware: true,
    jitter: true,
  });

  // State
  let syncing = false;
  let lastSync: Date | null = null;
  let pendingItems: SyncItem[] = [];
  const cleanupHandlers: Array<() => void> = [];

  // Load persisted pending items on init
  const stored = storage.get('pending') as SyncItem[] | null;
  if (stored !== null) {
    pendingItems = stored;
  }

  /**
   * Generate a unique ID for sync items.
   */
  function generateId(): string {
    return crypto.randomUUID();
  }

  /**
   * Persist pending items to storage.
   */
  function persistPending(): void {
    storage.set('pending', pendingItems);
  }

  /**
   * Notify listeners of status change.
   */
  function notifyStatusChange(): void {
    onStatusChange?.(getStatus());
  }

  /**
   * Execute a sync operation for a single item.
   */
  async function syncItem(item: SyncItem): Promise<void> {
    const method = item.type === 'delete' ? 'DELETE' : item.type === 'update' ? 'PUT' : 'POST';

    const response = await fetch(`${apiBase}${item.endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: item.type !== 'delete' ? JSON.stringify(item.payload) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  /**
   * Process all pending items through the retry queue.
   */
  async function processPending(): Promise<void> {
    if (syncing || pendingItems.length === 0) return;

    syncing = true;
    notifyStatusChange();

    // Process each pending item
    const itemsToProcess = [...pendingItems];

    for (const item of itemsToProcess) {
      try {
        await queue.add(() => syncItem(item));

        // Success - remove from pending
        pendingItems = pendingItems.filter((p) => p.id !== item.id);
        persistPending();
        onItemSynced?.(item);
        lastSync = new Date();
      } catch (err) {
        // Permanent failure after all retries
        const error = err instanceof Error ? err : new Error(String(err));
        pendingItems = pendingItems.filter((p) => p.id !== item.id);
        persistPending();
        onItemFailed?.(item, error);
      }
    }

    syncing = false;
    notifyStatusChange();
  }

  // Listen for retry events for logging/UI
  const cleanupRetry = queue.onRetry((attempt, error) => {
    console.log(`Retry attempt ${attempt}:`, error);
    notifyStatusChange();
  });
  cleanupHandlers.push(cleanupRetry);

  // Listen for network status changes
  const cleanupOnline = NetworkStatus.onOnline(() => {
    console.log('Back online - syncing pending items');
    void processPending();
  });
  cleanupHandlers.push(cleanupOnline);

  const cleanupOffline = NetworkStatus.onOffline(() => {
    console.log('Gone offline - sync paused');
    notifyStatusChange();
  });
  cleanupHandlers.push(cleanupOffline);

  // Initial sync if online
  if (NetworkStatus.isOnline() && pendingItems.length > 0) {
    void processPending();
  }

  /**
   * Add an item to the sync queue.
   */
  async function add(item: Omit<SyncItem, 'id' | 'timestamp'>): Promise<string> {
    const fullItem: SyncItem = {
      ...item,
      id: generateId(),
      timestamp: Date.now(),
    };

    pendingItems.push(fullItem);
    persistPending();
    notifyStatusChange();

    // Try to sync immediately if online
    if (NetworkStatus.isOnline()) {
      void processPending();
    }

    return fullItem.id;
  }

  /**
   * Force sync all pending items.
   */
  async function syncNow(): Promise<void> {
    if (NetworkStatus.isOffline()) {
      throw new Error('Cannot sync while offline');
    }
    await processPending();
  }

  /**
   * Get current sync status.
   */
  function getStatus(): SyncStatus {
    return {
      online: NetworkStatus.isOnline(),
      pending: pendingItems.length,
      syncing,
      lastSync,
    };
  }

  /**
   * Get all pending items.
   */
  function getPendingItems(): readonly SyncItem[] {
    return pendingItems;
  }

  /**
   * Clear all pending items.
   */
  function clearPending(): void {
    queue.clear();
    pendingItems = [];
    persistPending();
    notifyStatusChange();
  }

  /**
   * Destroy manager and clean up.
   */
  function destroy(): void {
    for (const cleanup of cleanupHandlers) {
      cleanup();
    }
    cleanupHandlers.length = 0;
    queue.destroy();
  }

  return {
    add,
    syncNow,
    getStatus,
    getPendingItems,
    clearPending,
    destroy,
  };
}

// -----------------------------------------------------------------------------
// Example: Todo App with Offline Support
// -----------------------------------------------------------------------------

interface Todo {
  readonly id: string;
  readonly title: string;
  readonly completed: boolean;
}

/**
 * Example: Setting up a todo app with offline sync.
 */
function setupTodoApp(): void {
  const form = document.querySelector<HTMLFormElement>('#todo-form');
  const input = document.querySelector<HTMLInputElement>('#todo-input');
  const list = document.querySelector<HTMLUListElement>('#todo-list');
  const statusEl = document.querySelector<HTMLElement>('#sync-status');

  if (form === null || input === null || list === null) {
    console.error('Required elements not found');
    return;
  }

  // Create sync manager
  const sync = createSyncManager({
    apiBase: '/api',
    storagePrefix: 'todos-sync',
    maxRetries: 3,

    onStatusChange: (status) => {
      if (statusEl !== null) {
        updateStatusUI(statusEl, status);
      }
    },

    onItemSynced: (item) => {
      console.log(`Todo synced: ${item.id}`);
      // Update UI to show synced state
      const todoEl = list.querySelector(`[data-id="${item.id}"]`);
      if (todoEl !== null) {
        todoEl.classList.remove('pending');
        todoEl.classList.add('synced');
      }
    },

    onItemFailed: (item, error) => {
      console.error(`Todo sync failed: ${item.id}`, error);
      // Show error in UI
      const todoEl = list.querySelector(`[data-id="${item.id}"]`);
      if (todoEl !== null) {
        todoEl.classList.remove('pending');
        todoEl.classList.add('error');
      }
    },
  });

  // Handle form submission
  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const title = input.value.trim();
    if (title === '') return;

    const id = crypto.randomUUID();
    const todo: Todo = { id, title, completed: false };

    // Optimistically add to UI
    addTodoToUI(list, todo);
    input.value = '';

    // Queue for sync
    void sync.add({
      type: 'create',
      endpoint: '/todos',
      payload: todo,
    });
  });

  // Handle todo actions (complete, delete)
  list.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const todoEl = target.closest<HTMLElement>('[data-id]');
    if (todoEl === null) return;

    const id = todoEl.dataset.id!;

    if (target.classList.contains('complete-btn')) {
      // Toggle completion
      todoEl.classList.toggle('completed');
      void sync.add({
        type: 'update',
        endpoint: `/todos/${id}`,
        payload: { completed: todoEl.classList.contains('completed') },
      });
    }

    if (target.classList.contains('delete-btn')) {
      // Delete todo
      todoEl.remove();
      void sync.add({
        type: 'delete',
        endpoint: `/todos/${id}`,
        payload: null,
      });
    }
  });
}

/**
 * Add a todo item to the UI.
 */
function addTodoToUI(list: HTMLUListElement, todo: Todo): void {
  const li = document.createElement('li');
  li.className = 'todo-item pending';
  li.dataset.id = todo.id;
  li.innerHTML = `
    <input type="checkbox" class="complete-btn" ${todo.completed ? 'checked' : ''}>
    <span class="todo-title">${escapeHtml(todo.title)}</span>
    <button type="button" class="delete-btn" aria-label="Delete">x</button>
    <span class="sync-indicator" aria-hidden="true"></span>
  `;
  list.appendChild(li);
}

/**
 * Update the sync status UI.
 */
function updateStatusUI(element: HTMLElement, status: SyncStatus): void {
  const parts: string[] = [];

  if (!status.online) {
    parts.push('Offline');
  } else if (status.syncing) {
    parts.push('Syncing...');
  } else {
    parts.push('Online');
  }

  if (status.pending > 0) {
    parts.push(`(${status.pending} pending)`);
  }

  element.textContent = parts.join(' ');
  element.className = `sync-status ${status.online ? 'online' : 'offline'}`;
}

/**
 * Simple HTML escaping.
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// -----------------------------------------------------------------------------
// Advanced Example: Queue Statistics Dashboard
// -----------------------------------------------------------------------------

/**
 * Example: Display retry queue statistics.
 */
function setupStatsDashboard(queue: RetryQueue, container: HTMLElement): () => void {
  function updateStats(): void {
    const stats: RetryStats = queue.getStats();
    container.innerHTML = `
      <dl class="stats-grid">
        <dt>Pending</dt>
        <dd>${stats.pending}</dd>
        <dt>Succeeded</dt>
        <dd>${stats.succeeded}</dd>
        <dt>Failed</dt>
        <dd>${stats.failed}</dd>
        <dt>Total Retries</dt>
        <dd>${stats.retries}</dd>
        <dt>Status</dt>
        <dd>${stats.paused ? 'Paused' : 'Active'}</dd>
      </dl>
    `;
  }

  // Update every second
  const interval = setInterval(updateStats, 1000);
  updateStats();

  // Return cleanup function
  return () => clearInterval(interval);
}

// -----------------------------------------------------------------------------
// HTML Structure (for reference)
// -----------------------------------------------------------------------------

/*
<div id="app">
  <header>
    <h1>Offline Todos</h1>
    <span id="sync-status" class="sync-status">Online</span>
  </header>

  <form id="todo-form">
    <input
      type="text"
      id="todo-input"
      placeholder="What needs to be done?"
      required
    >
    <button type="submit">Add</button>
  </form>

  <ul id="todo-list"></ul>
</div>
*/

// -----------------------------------------------------------------------------
// CSS (for reference)
// -----------------------------------------------------------------------------

/*
.sync-status {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
}

.sync-status.online {
  background: #d4edda;
  color: #155724;
}

.sync-status.offline {
  background: #f8d7da;
  color: #721c24;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border-bottom: 1px solid #eee;
}

.todo-item.pending .sync-indicator::after {
  content: '...';
  color: #f0ad4e;
}

.todo-item.synced .sync-indicator::after {
  content: '';
  color: #5cb85c;
}

.todo-item.error .sync-indicator::after {
  content: '!';
  color: #d9534f;
}

.todo-item.completed .todo-title {
  text-decoration: line-through;
  color: #999;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.stats-grid dt {
  font-weight: bold;
}

.stats-grid dd {
  margin: 0;
  text-align: right;
}
*/

// Export for module usage
export {
  createSyncManager,
  setupStatsDashboard,
  type SyncManager,
  type SyncManagerOptions,
  type SyncStatus,
  type SyncItem,
};

// Run example if this is the entry point
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', setupTodoApp);
}
