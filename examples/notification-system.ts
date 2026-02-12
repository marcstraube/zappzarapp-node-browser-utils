// noinspection JSUnusedGlobalSymbols - Example file

/**
 * Notification System Example - Browser notifications with permission handling
 *
 * This example demonstrates:
 * - Checking notification API support
 * - Requesting notification permission
 * - Showing basic notifications
 * - Showing notifications with event handlers
 * - Service Worker notifications (for background)
 * - Managing active notifications
 * - Result-based error handling
 *
 * **Note:** Browser notifications require user permission and may be blocked
 * by browsers or operating systems. Always provide a fallback UI.
 *
 * @packageDocumentation
 */

import { Result, type CleanupFn } from '@zappzarapp/browser-utils/core';
import { BrowserNotification } from '@zappzarapp/browser-utils/notification';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Notification priority levels.
 */
type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * Application notification configuration.
 */
interface NotificationConfig {
  readonly title: string;
  readonly body?: string;
  readonly icon?: string;
  readonly tag?: string;
  readonly priority?: NotificationPriority;
  readonly autoClose?: number; // milliseconds
  readonly onClick?: () => void;
}

/**
 * Notification history entry.
 */
interface NotificationHistoryEntry {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly timestamp: number;
  readonly priority: NotificationPriority;
  readonly read: boolean;
}

// =============================================================================
// Support and Permission Checks
// =============================================================================

/**
 * Check if browser notifications are supported.
 */
function checkNotificationSupport(): boolean {
  console.log('--- Notification Support Check ---');

  const isSupported = BrowserNotification.isSupported();

  if (isSupported) {
    console.log('Browser notifications are supported');
  } else {
    console.log('Browser notifications are NOT supported');
    console.log('Consider using in-app toast notifications as fallback');
  }

  return isSupported;
}

/**
 * Display current notification permission status.
 */
function displayPermissionStatus(): void {
  console.log('\n--- Permission Status ---');

  const permission = BrowserNotification.permission();
  console.log(`Current permission: ${permission}`);

  if (BrowserNotification.isGranted()) {
    console.log('Notifications are enabled');
  } else if (BrowserNotification.isDenied()) {
    console.log('Notifications are blocked');
    console.log('User must enable notifications in browser settings');
  } else {
    console.log('Permission not yet requested');
  }
}

// =============================================================================
// Permission Request
// =============================================================================

/**
 * Request notification permission from the user.
 * Returns true if permission was granted.
 */
async function requestNotificationPermission(): Promise<boolean> {
  console.log('\n--- Requesting Permission ---');

  // Check if already granted
  if (BrowserNotification.isGranted()) {
    console.log('Permission already granted');
    return true;
  }

  // Check if already denied
  if (BrowserNotification.isDenied()) {
    console.log('Permission was previously denied');
    console.log('Cannot re-request - user must change in browser settings');
    return false;
  }

  // Request permission
  console.log('Requesting notification permission...');
  const result = await BrowserNotification.requestPermission();

  if (Result.isOk(result)) {
    if (result.value === 'granted') {
      console.log('Permission granted!');
      return true;
    } else {
      console.log('Permission not granted:', result.value);
      return false;
    }
  } else {
    console.error('Permission request failed:', result.error.message);
    return false;
  }
}

// =============================================================================
// Basic Notifications
// =============================================================================

/**
 * Show a simple notification.
 */
async function showSimpleNotification(): Promise<void> {
  console.log('\n--- Simple Notification ---');

  const result = await BrowserNotification.show('Hello!', {
    body: 'This is a simple browser notification.',
    icon: '/icon-192.png',
  });

  if (Result.isOk(result)) {
    console.log('Notification shown successfully');
    console.log('Active notifications:', BrowserNotification.activeCount());
  } else {
    console.error('Failed to show notification:', result.error.message);
  }
}

/**
 * Show a notification with a specific tag.
 * Notifications with the same tag replace each other.
 */
async function showTaggedNotification(tag: string, count: number): Promise<void> {
  console.log(`\n--- Tagged Notification (${tag}) ---`);

  const result = await BrowserNotification.show('New Messages', {
    body: `You have ${count} unread message${count > 1 ? 's' : ''}`,
    tag, // Same tag replaces previous notification
    icon: '/icon-192.png',
    badge: '/badge-72.png',
  });

  if (Result.isOk(result)) {
    console.log(`Notification with tag '${tag}' shown/updated`);
  } else {
    console.error('Failed:', result.error.message);
  }
}

// =============================================================================
// Notifications with Event Handlers
// =============================================================================

/**
 * Show a notification with click handling.
 */
async function showClickableNotification(): Promise<void> {
  console.log('\n--- Clickable Notification ---');

  const result = await BrowserNotification.showWithHandlers('New Order!', {
    body: 'Click to view order details',
    icon: '/icon-192.png',
    requireInteraction: true, // Keep notification until user interacts

    onClick: (event) => {
      console.log('Notification clicked!', event);
      // Focus the window and navigate
      window.focus();
      // Navigate to order page (example)
      console.log('Would navigate to: /orders/12345');
    },

    onClose: () => {
      console.log('Notification closed');
    },

    onError: (event) => {
      console.error('Notification error:', event);
    },

    onShow: () => {
      console.log('Notification displayed');
    },
  });

  if (Result.isOk(result)) {
    console.log('Interactive notification shown');
  } else {
    console.error('Failed:', result.error.message);
  }
}

/**
 * Show a notification that auto-closes after a delay.
 */
async function showAutoClosingNotification(delayMs: number): Promise<void> {
  console.log(`\n--- Auto-Closing Notification (${delayMs}ms) ---`);

  const result = await BrowserNotification.show('Quick Alert', {
    body: 'This notification will close automatically',
    icon: '/icon-192.png',
  });

  if (Result.isOk(result)) {
    const notification = result.value;
    console.log('Notification shown, will auto-close in', delayMs, 'ms');

    // Auto-close after delay
    setTimeout(() => {
      BrowserNotification.close(notification);
      console.log('Notification auto-closed');
    }, delayMs);
  } else {
    console.error('Failed:', result.error.message);
  }
}

// =============================================================================
// Service Worker Notifications
// =============================================================================

/**
 * Show a notification via Service Worker.
 * These work even when the page is not focused.
 */
async function showServiceWorkerNotification(): Promise<void> {
  console.log('\n--- Service Worker Notification ---');

  // Note: vibrate is part of the Notification API but not in TypeScript's lib.dom.d.ts
  const result = await BrowserNotification.showViaServiceWorker('Background Update', {
    body: 'Your data has been synced',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    vibrate: [200, 100, 200], // Vibration pattern
    actions: [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  } as NotificationOptions & { vibrate?: number[] });

  if (Result.isOk(result)) {
    console.log('Service Worker notification shown');
  } else {
    console.error('Failed:', result.error.message);
    console.log('Note: Service Worker must be registered');
  }
}

// =============================================================================
// Notification Manager Class
// =============================================================================

/**
 * Application notification manager with history and deduplication.
 */
class NotificationManager {
  private readonly history: NotificationHistoryEntry[] = [];
  private readonly maxHistory = 100;
  private idCounter = 0;

  /**
   * Check if notifications are available and permitted.
   */
  isAvailable(): boolean {
    return BrowserNotification.isSupported() && BrowserNotification.isGranted();
  }

  /**
   * Request permission if not already granted.
   */
  async requestPermission(): Promise<boolean> {
    if (!BrowserNotification.isSupported()) {
      return false;
    }

    if (BrowserNotification.isGranted()) {
      return true;
    }

    const result = await BrowserNotification.requestPermission();
    return Result.isOk(result) && result.value === 'granted';
  }

  /**
   * Send a notification.
   */
  async notify(config: NotificationConfig): Promise<string | null> {
    // Generate unique ID
    const id = `notif-${Date.now()}-${++this.idCounter}`;

    // Add to history
    this.addToHistory({
      id,
      title: config.title,
      body: config.body ?? '',
      timestamp: Date.now(),
      priority: config.priority ?? 'normal',
      read: false,
    });

    // Check if we can show browser notification
    if (!this.isAvailable()) {
      console.log('[NotificationManager] Browser notifications not available');
      console.log('[NotificationManager] Notification added to history:', id);
      return id; // Still return ID for history tracking
    }

    // Show browser notification
    const result = await BrowserNotification.showWithHandlers(config.title, {
      body: config.body,
      icon: config.icon,
      tag: config.tag,
      onClick: (_event) => {
        this.markAsRead(id);
        config.onClick?.();
        // Focus window on click
        window.focus();
      },
    });

    if (Result.isOk(result)) {
      // Auto-close if configured
      if (config.autoClose !== undefined && config.autoClose > 0) {
        setTimeout(() => {
          BrowserNotification.close(result.value);
        }, config.autoClose);
      }

      return id;
    }

    console.error('[NotificationManager] Failed to show notification');
    return id; // Still return ID - notification is in history
  }

  /**
   * Send a notification based on priority.
   */
  async notifyWithPriority(
    title: string,
    body: string,
    priority: NotificationPriority
  ): Promise<string | null> {
    const config: NotificationConfig = {
      title,
      body,
      priority,
    };

    // Adjust notification options based on priority
    switch (priority) {
      case 'urgent':
        return this.notify({
          ...config,
          icon: '/icon-urgent.png',
        });

      case 'high':
        return this.notify({
          ...config,
          icon: '/icon-high.png',
        });

      case 'low':
        return this.notify({
          ...config,
          autoClose: 3000, // Auto-close low priority
        });

      default:
        return this.notify(config);
    }
  }

  /**
   * Add entry to history.
   */
  private addToHistory(entry: NotificationHistoryEntry): void {
    this.history.unshift(entry);

    // Trim history if needed
    if (this.history.length > this.maxHistory) {
      this.history.pop();
    }
  }

  /**
   * Mark a notification as read.
   */
  markAsRead(id: string): void {
    const entry = this.history.find((e) => e.id === id);
    if (entry) {
      // Create new object with read=true (immutable update)
      const index = this.history.indexOf(entry);
      this.history[index] = { ...entry, read: true };
    }
  }

  /**
   * Mark all notifications as read.
   */
  markAllAsRead(): void {
    for (let i = 0; i < this.history.length; i++) {
      if (!this.history[i]!.read) {
        this.history[i] = { ...this.history[i]!, read: true };
      }
    }
  }

  /**
   * Get unread notification count.
   */
  getUnreadCount(): number {
    return this.history.filter((e) => !e.read).length;
  }

  /**
   * Get notification history.
   */
  getHistory(): readonly NotificationHistoryEntry[] {
    return this.history;
  }

  /**
   * Get unread notifications.
   */
  getUnread(): readonly NotificationHistoryEntry[] {
    return this.history.filter((e) => !e.read);
  }

  /**
   * Clear all history.
   */
  clearHistory(): void {
    this.history.length = 0;
  }

  /**
   * Close all active browser notifications.
   */
  closeAll(): void {
    BrowserNotification.closeAll();
  }
}

// =============================================================================
// UI Integration Examples
// =============================================================================

/**
 * Create a notification permission prompt UI.
 */
function createPermissionPrompt(container: HTMLElement): CleanupFn {
  // Don't show if already granted
  if (BrowserNotification.isGranted()) {
    container.innerHTML = '<p class="notification-enabled">Notifications enabled</p>';
    return () => {};
  }

  // Don't show prompt if denied (user must change in settings)
  if (BrowserNotification.isDenied()) {
    container.innerHTML = `
      <div class="notification-blocked">
        <p>Notifications are blocked</p>
        <small>Enable in browser settings to receive notifications</small>
      </div>
    `;
    return () => {};
  }

  // Show enable button
  container.innerHTML = `
    <div class="notification-prompt">
      <p>Enable notifications to stay updated</p>
      <button id="enable-notifications" class="btn-primary">
        Enable Notifications
      </button>
    </div>
  `;

  const button = container.querySelector('#enable-notifications') as HTMLButtonElement;

  const handleClick = async (): Promise<void> => {
    button.disabled = true;
    button.textContent = 'Requesting...';

    const granted = await requestNotificationPermission();

    if (granted) {
      container.innerHTML = '<p class="notification-enabled">Notifications enabled!</p>';
    } else {
      button.disabled = false;
      button.textContent = 'Enable Notifications';
      container.querySelector('p')!.textContent = 'Permission was not granted';
    }
  };

  button.addEventListener('click', handleClick);

  return () => {
    button.removeEventListener('click', handleClick);
  };
}

/**
 * Create a notification center UI.
 */
function createNotificationCenter(container: HTMLElement, manager: NotificationManager): CleanupFn {
  function render(): void {
    const history = manager.getHistory();
    const unreadCount = manager.getUnreadCount();

    container.innerHTML = `
      <div class="notification-center">
        <div class="notification-header">
          <h3>Notifications ${unreadCount > 0 ? `(${unreadCount})` : ''}</h3>
          ${
            history.length > 0
              ? '<button id="mark-all-read" class="btn-link">Mark all read</button>'
              : ''
          }
        </div>
        <div class="notification-list">
          ${
            history.length === 0
              ? '<p class="empty">No notifications</p>'
              : history
                  .slice(0, 10) // Show last 10
                  .map(
                    (entry) => `
                <div class="notification-item ${entry.read ? 'read' : 'unread'}"
                     data-id="${entry.id}">
                  <div class="notification-content">
                    <strong>${entry.title}</strong>
                    <p>${entry.body}</p>
                    <small>${formatTime(entry.timestamp)}</small>
                  </div>
                  <span class="priority-badge priority-${entry.priority}">
                    ${entry.priority}
                  </span>
                </div>
              `
                  )
                  .join('')
          }
        </div>
      </div>
    `;

    // Add event listeners
    const markAllButton = container.querySelector('#mark-all-read');
    if (markAllButton) {
      markAllButton.addEventListener('click', () => {
        manager.markAllAsRead();
        render();
      });
    }

    // Click on notification item to mark as read
    container.querySelectorAll('.notification-item.unread').forEach((item) => {
      item.addEventListener('click', () => {
        const id = (item as HTMLElement).dataset.id;
        if (id) {
          manager.markAsRead(id);
          render();
        }
      });
    });
  }

  render();

  // Return cleanup (nothing to clean in this simple example)
  return () => {};
}

/**
 * Format timestamp for display.
 */
function formatTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 60000) {
    return 'Just now';
  }

  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes}m ago`;
  }

  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}h ago`;
  }

  return new Date(timestamp).toLocaleDateString();
}

// =============================================================================
// Run Examples
// =============================================================================

/**
 * Run all notification examples.
 */
export async function runNotificationExamples(): Promise<{ cleanup: () => void }> {
  console.log('=== Notification System Examples ===\n');

  // Check support
  if (!checkNotificationSupport()) {
    console.log('\nNotifications not supported. Examples will not run.');
    return { cleanup: () => {} };
  }

  // Display current permission
  displayPermissionStatus();

  // Request permission if needed
  const hasPermission = await requestNotificationPermission();

  if (!hasPermission) {
    console.log('\nPermission not granted. Cannot show notifications.');
    console.log('Notification manager can still track notifications in history.');
  }

  // Create notification manager
  const manager = new NotificationManager();

  // Show examples if permission granted
  if (hasPermission) {
    // Simple notification
    await showSimpleNotification();

    // Wait a bit between notifications
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Tagged notification (simulating message count)
    await showTaggedNotification('messages', 3);

    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Update the tagged notification (same tag replaces)
    await showTaggedNotification('messages', 5);

    // Clickable notification
    await showClickableNotification();

    // Auto-closing notification
    await showAutoClosingNotification(5000);
  }

  // Add some notifications via manager
  await manager.notify({
    title: 'Welcome!',
    body: 'Thanks for enabling notifications',
    priority: 'normal',
  });

  await manager.notifyWithPriority('System Update', 'A new version is available', 'high');

  console.log('\n--- Notification History ---');
  console.log('Total:', manager.getHistory().length);
  console.log('Unread:', manager.getUnreadCount());

  console.log('\n=== Notification Examples Complete ===');
  console.log('Active browser notifications:', BrowserNotification.activeCount());

  return {
    cleanup: (): void => {
      manager.closeAll();
      console.log('All notifications closed');
    },
  };
}

// Export for external use
export {
  NotificationManager,
  createPermissionPrompt,
  createNotificationCenter,
  requestNotificationPermission,
  showServiceWorkerNotification,
  type NotificationConfig,
  type NotificationPriority,
  type NotificationHistoryEntry,
};

// Uncomment to run directly
// runNotificationExamples();
