# Browser Notifications

Web Notifications API wrapper with permission management and tracking.

## Quick Start

```typescript
import { Result } from '@zappzarapp/browser-utils/core';
import { BrowserNotification } from '@zappzarapp/browser-utils/notification';

// Check support and request permission
if (BrowserNotification.isSupported()) {
  const permResult = await BrowserNotification.requestPermission();

  if (Result.isOk(permResult) && permResult.value === 'granted') {
    // Show notification
    const result = await BrowserNotification.show('Hello!', {
      body: 'This is a notification',
      icon: '/icon.png',
    });
  }
}
```

## API Reference

### Support and Permission

| Method                | Returns                                                      | Description                             |
| --------------------- | ------------------------------------------------------------ | --------------------------------------- |
| `isSupported()`       | `boolean`                                                    | Check if Notifications API is supported |
| `permission()`        | `NotificationPermission`                                     | Get current permission status           |
| `isGranted()`         | `boolean`                                                    | Check if permission is granted          |
| `isDenied()`          | `boolean`                                                    | Check if permission is denied           |
| `requestPermission()` | `Promise<Result<NotificationPermission, NotificationError>>` | Request permission                      |

### Show Notifications

| Method                                  | Returns                                            | Description              |
| --------------------------------------- | -------------------------------------------------- | ------------------------ |
| `show(title, options?)`                 | `Promise<Result<Notification, NotificationError>>` | Show a notification      |
| `showWithHandlers(title, options)`      | `Promise<Result<Notification, NotificationError>>` | Show with event handlers |
| `showViaServiceWorker(title, options?)` | `Promise<Result<void, NotificationError>>`         | Show via Service Worker  |

### Notification Management

| Method                | Returns  | Description                        |
| --------------------- | -------- | ---------------------------------- |
| `close(notification)` | `void`   | Close a specific notification      |
| `closeAll()`          | `void`   | Close all active notifications     |
| `activeCount()`       | `number` | Get number of active notifications |

## Error Types

```typescript
// NotificationError types
NotificationError.notSupported(); // API not supported
NotificationError.permissionDenied(); // Permission denied
NotificationError.showFailed(e); // Failed to show notification
```

## Notification Options

```typescript
interface NotificationOptions {
  body?: string; // Notification body text
  icon?: string; // Icon URL
  badge?: string; // Badge URL (mobile)
  image?: string; // Image URL
  tag?: string; // Tag for grouping/replacing
  data?: unknown; // Custom data
  requireInteraction?: boolean; // Keep visible until dismissed
  silent?: boolean; // Suppress sound/vibration
  vibrate?: number[]; // Vibration pattern
  actions?: NotificationAction[]; // Action buttons (Service Worker only)
}
```

## Usage Examples

### Basic Notification

```typescript
async function notifyUser(message: string): Promise<void> {
  if (!BrowserNotification.isSupported()) {
    console.log('Notifications not supported');
    return;
  }

  const result = await BrowserNotification.show('App Name', {
    body: message,
    icon: '/icons/notification.png',
  });

  if (Result.isErr(result)) {
    console.error('Notification failed:', result.error);
  }
}
```

### Notification with Event Handlers

```typescript
async function showInteractiveNotification(): Promise<void> {
  const result = await BrowserNotification.showWithHandlers('New Message', {
    body: 'You have a new message from John',
    icon: '/icons/message.png',
    tag: 'new-message',

    onClick: (event) => {
      event.preventDefault();
      window.focus();
      navigateTo('/messages');
    },

    onClose: () => {
      console.log('Notification closed');
    },

    onError: (event) => {
      console.error('Notification error:', event);
    },

    onShow: () => {
      console.log('Notification shown');
    },
  });
}
```

### Permission Request Flow

```typescript
async function setupNotifications(): Promise<boolean> {
  if (!BrowserNotification.isSupported()) {
    showFallbackUI();
    return false;
  }

  // Check current permission
  if (BrowserNotification.isDenied()) {
    showPermissionDeniedMessage();
    return false;
  }

  if (BrowserNotification.isGranted()) {
    return true;
  }

  // Request permission
  const result = await BrowserNotification.requestPermission();

  if (Result.isErr(result)) {
    showPermissionDeniedMessage();
    return false;
  }

  return result.value === 'granted';
}
```

### Grouped Notifications

```typescript
async function showChatNotification(
  chatId: string,
  message: string
): Promise<void> {
  // Using tag to replace existing notification for same chat
  await BrowserNotification.show('New Message', {
    body: message,
    tag: `chat-${chatId}`, // Will replace previous notification with same tag
    icon: '/icons/chat.png',
  });
}
```

### Service Worker Notifications

```typescript
// For notifications when page is not focused
async function showBackgroundNotification(
  title: string,
  body: string
): Promise<void> {
  const result = await BrowserNotification.showViaServiceWorker(title, {
    body,
    icon: '/icons/app.png',
    badge: '/icons/badge.png',
    vibrate: [200, 100, 200],
    actions: [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  });

  if (Result.isErr(result)) {
    // Fall back to regular notification
    await BrowserNotification.show(title, { body });
  }
}
```

### Notification Manager

```typescript
class NotificationManager {
  async notify(title: string, options?: NotificationOptions): Promise<void> {
    // Check permission
    if (!BrowserNotification.isGranted()) {
      const permitted = await this.requestPermission();
      if (!permitted) return;
    }

    await BrowserNotification.show(title, options);
  }

  private async requestPermission(): Promise<boolean> {
    const result = await BrowserNotification.requestPermission();
    return Result.isOk(result) && result.value === 'granted';
  }

  clearAll(): void {
    BrowserNotification.closeAll();
  }

  get activeCount(): number {
    return BrowserNotification.activeCount();
  }
}
```

### Auto-Close Notification

```typescript
async function showTemporaryNotification(
  title: string,
  body: string,
  duration: number = 5000
): Promise<void> {
  const result = await BrowserNotification.show(title, { body });

  if (Result.isOk(result)) {
    setTimeout(() => {
      BrowserNotification.close(result.value);
    }, duration);
  }
}
```

## Security Considerations

1. **Permission Required** - Notifications require explicit user permission
2. **HTTPS Required** - Notifications API only works on secure origins (HTTPS)
3. **User Trust** - Request permission only when user expects notifications
4. **Spam Prevention** - Don't send excessive notifications
5. **Sensitive Data** - Avoid displaying sensitive information in notification
   body
6. **Cross-Origin** - Notification icons must be from same origin or
   CORS-enabled

## Best Practices

1. **Request Permission Contextually** - Ask for permission when the user takes
   an action that implies they want notifications
2. **Use Tags** - Group related notifications using the `tag` option
3. **Respect User Preferences** - Provide in-app settings to control
   notification types
4. **Provide Value** - Only send notifications that provide real value to the
   user
5. **Handle Permission Denial** - Have a fallback for when notifications are
   denied
