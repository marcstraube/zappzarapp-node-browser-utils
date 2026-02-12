# Visibility Manager

Page Visibility API wrapper for detecting and responding to document visibility
changes.

## Quick Start

```typescript
import { VisibilityManager } from '@zappzarapp/browser-utils/visibility';

// Check current state
if (VisibilityManager.isVisible()) {
  console.log('Page is visible');
}

// Listen for changes
const cleanup = VisibilityManager.onChange((state) => {
  console.log('Visibility changed to:', state);
});

// Cleanup when done
cleanup();
```

## Features

| Feature               | Description                                      |
| --------------------- | ------------------------------------------------ |
| State Detection       | Check if document is visible or hidden           |
| Change Events         | Subscribe to visibility state changes            |
| Specific State Events | Separate handlers for visible and hidden states  |
| Automatic Cleanup     | All subscriptions return cleanup functions       |
| SSR Safe              | Returns safe defaults when document is undefined |

## API Reference

### VisibilityManager.isVisible()

Check if the document is currently visible.

```typescript
if (VisibilityManager.isVisible()) {
  // Start animations, fetch data, etc.
}
```

**Returns:** `boolean` - True if document visibility state is 'visible'

### VisibilityManager.isHidden()

Check if the document is currently hidden.

```typescript
if (VisibilityManager.isHidden()) {
  // Pause background operations
}
```

**Returns:** `boolean` - True if document visibility state is 'hidden'

### VisibilityManager.getState()

Get the current document visibility state.

```typescript
const state = VisibilityManager.getState();
// 'visible' or 'hidden'
```

**Returns:** `DocumentVisibilityState` - The current visibility state

### VisibilityManager.onChange()

Listen for any visibility state changes.

```typescript
const cleanup = VisibilityManager.onChange((state) => {
  if (state === 'visible') {
    console.log('Welcome back!');
    refreshData();
  } else {
    console.log('User left the page');
    pauseActivity();
  }
});

// Later: stop listening
cleanup();
```

**Parameters:**

| Parameter | Type                                       | Description                        |
| --------- | ------------------------------------------ | ---------------------------------- |
| `handler` | `(state: DocumentVisibilityState) => void` | Callback with new visibility state |

**Returns:** `CleanupFn` - Function to remove the listener

### VisibilityManager.onVisible()

Listen for when the document becomes visible.

```typescript
const cleanup = VisibilityManager.onVisible(() => {
  console.log('Page became visible');
  resumeVideo();
  reconnectWebSocket();
});

// Later: stop listening
cleanup();
```

**Parameters:**

| Parameter | Type         | Description                            |
| --------- | ------------ | -------------------------------------- |
| `handler` | `() => void` | Callback when document becomes visible |

**Returns:** `CleanupFn` - Function to remove the listener

### VisibilityManager.onHidden()

Listen for when the document becomes hidden.

```typescript
const cleanup = VisibilityManager.onHidden(() => {
  console.log('Page became hidden');
  pauseVideo();
  saveProgress();
});

// Later: stop listening
cleanup();
```

**Parameters:**

| Parameter | Type         | Description                           |
| --------- | ------------ | ------------------------------------- |
| `handler` | `() => void` | Callback when document becomes hidden |

**Returns:** `CleanupFn` - Function to remove the listener

## Usage Examples

### Video Player Control

```typescript
function setupVideoVisibility(videoElement: HTMLVideoElement) {
  const cleanupHidden = VisibilityManager.onHidden(() => {
    if (!videoElement.paused) {
      videoElement.pause();
      videoElement.dataset.autoPaused = 'true';
    }
  });

  const cleanupVisible = VisibilityManager.onVisible(() => {
    if (videoElement.dataset.autoPaused === 'true') {
      videoElement.play();
      delete videoElement.dataset.autoPaused;
    }
  });

  return () => {
    cleanupHidden();
    cleanupVisible();
  };
}
```

### Analytics Tracking

```typescript
function setupVisibilityTracking() {
  let visibleStart = Date.now();
  let totalVisibleTime = 0;

  const cleanup = VisibilityManager.onChange((state) => {
    if (state === 'visible') {
      visibleStart = Date.now();
    } else {
      totalVisibleTime += Date.now() - visibleStart;
      analytics.track('page_hidden', {
        visibleDuration: Date.now() - visibleStart,
        totalVisibleTime,
      });
    }
  });

  // Track on page unload
  window.addEventListener('beforeunload', () => {
    if (VisibilityManager.isVisible()) {
      totalVisibleTime += Date.now() - visibleStart;
    }
    analytics.track('page_leave', { totalVisibleTime });
  });

  return cleanup;
}
```

### WebSocket Reconnection

```typescript
function setupWebSocketVisibility(socket: WebSocket, url: string) {
  let wasConnected = false;

  const cleanup = VisibilityManager.onChange((state) => {
    if (state === 'hidden') {
      // Remember connection state before potentially disconnecting
      wasConnected = socket.readyState === WebSocket.OPEN;
    } else if (state === 'visible') {
      // Reconnect if we were connected before
      if (wasConnected && socket.readyState !== WebSocket.OPEN) {
        socket = new WebSocket(url);
      }
    }
  });

  return cleanup;
}
```

### Conditional Data Fetching

```typescript
function setupPolling(fetchData: () => Promise<void>, intervalMs: number) {
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const startPolling = () => {
    if (intervalId === null) {
      fetchData(); // Fetch immediately on becoming visible
      intervalId = setInterval(fetchData, intervalMs);
    }
  };

  const stopPolling = () => {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  // Start if currently visible
  if (VisibilityManager.isVisible()) {
    startPolling();
  }

  const cleanupVisible = VisibilityManager.onVisible(startPolling);
  const cleanupHidden = VisibilityManager.onHidden(stopPolling);

  return () => {
    cleanupVisible();
    cleanupHidden();
    stopPolling();
  };
}
```

### React Hook Example

```typescript
import { useEffect, useState } from 'react';
import { VisibilityManager } from '@zappzarapp/browser-utils/visibility';

function usePageVisibility() {
  const [isVisible, setIsVisible] = useState(VisibilityManager.isVisible());

  useEffect(() => {
    const cleanup = VisibilityManager.onChange((state) => {
      setIsVisible(state === 'visible');
    });

    return cleanup;
  }, []);

  return isVisible;
}

// Usage
function MyComponent() {
  const isVisible = usePageVisibility();

  useEffect(() => {
    if (isVisible) {
      // Resume activity
    } else {
      // Pause activity
    }
  }, [isVisible]);

  return <div>{isVisible ? 'Active' : 'Paused'}</div>;
}
```

## Common Use Cases

| Use Case             | Description                                   |
| -------------------- | --------------------------------------------- |
| Media Playback       | Pause video/audio when tab is hidden          |
| Animation Control    | Stop animations to save CPU/battery           |
| Data Polling         | Stop polling when hidden, resume when visible |
| WebSocket Management | Reconnect on visibility after idle disconnect |
| Analytics            | Track time spent on page                      |
| Notifications        | Show notifications when tab becomes visible   |
| Auto-save            | Save progress when user switches tabs         |
| Session Management   | Refresh session tokens when becoming visible  |

## SSR Compatibility

The VisibilityManager is SSR-safe. When `document` is undefined:

- `isVisible()` returns `false`
- `isHidden()` returns `true`
- `getState()` returns `'hidden'`
- Event handlers return no-op cleanup functions

## Browser Support

| Feature                  | Chrome | Firefox | Safari | Edge |
| ------------------------ | ------ | ------- | ------ | ---- |
| Page Visibility API      | 33+    | 18+     | 7+     | 12+  |
| visibilitychange event   | 33+    | 18+     | 7+     | 12+  |
| document.hidden          | 33+    | 18+     | 7+     | 12+  |
| document.visibilityState | 33+    | 18+     | 7+     | 12+  |

**Note:** All major browsers have supported the Page Visibility API for many
years.
