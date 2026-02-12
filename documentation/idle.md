# Idle Callback Utilities

requestIdleCallback wrapper for scheduling low-priority work during browser idle
time.

## Quick Start

```typescript
import { IdleCallback } from '@zappzarapp/browser-utils/idle';

// Schedule work when browser is idle
const cancel = IdleCallback.request((deadline) => {
  while (deadline.timeRemaining() > 0 && hasMoreWork()) {
    doWorkChunk();
  }
});

// Run multiple tasks in idle time
const cleanup = IdleCallback.runTasks([
  () => prefetchImages(),
  () => updateAnalytics(),
  () => cleanupCache(),
]);
```

## API Reference

### Core API

| Method                                | Returns                 | Description                               |
| ------------------------------------- | ----------------------- | ----------------------------------------- |
| `isSupported()`                       | `boolean`               | Check if requestIdleCallback is supported |
| `request(callback, options?)`         | `CleanupFn`             | Request idle callback                     |
| `requestPromise(options?)`            | `Promise<IdleDeadline>` | Request as Promise                        |
| `runIfTime(deadline, task, minTime?)` | `boolean`               | Run task if enough time remaining         |

### Task Queue

| Method                                      | Returns         | Description                      |
| ------------------------------------------- | --------------- | -------------------------------- |
| `runTasks(tasks, options?)`                 | `CleanupFn`     | Run tasks across idle periods    |
| `processInIdle(items, processor, options?)` | `Promise<void>` | Process array items in idle time |

### Utilities

| Method                | Returns                       | Description                   |
| --------------------- | ----------------------------- | ----------------------------- |
| `defer(fn, options?)` | `(...args) => CleanupFn`      | Create idle-deferred function |
| `batch(fn, options?)` | `{ schedule, flush, cancel }` | Create batched idle function  |

## Types

```typescript
interface IdleDeadline {
  readonly timeRemaining: () => number; // Time remaining in ms
  readonly didTimeout: boolean; // Whether timeout expired
}

interface IdleOptions {
  readonly timeout?: number; // Max wait time before forcing execution
}

interface TaskQueueOptions extends IdleOptions {
  readonly minTimeRemaining?: number; // Min time to start task (default: 1ms)
}
```

## Usage Examples

### Deadline-Aware Work

```typescript
IdleCallback.request((deadline) => {
  // Process items while we have time
  while (deadline.timeRemaining() > 1 && items.length > 0) {
    const item = items.shift()!;
    processItem(item);
  }

  // If more items remain, schedule another callback
  if (items.length > 0) {
    IdleCallback.request(processMoreItems);
  }
});
```

### Background Data Processing

```typescript
// Process large dataset without blocking UI
async function processDataset(data: DataItem[]): Promise<void> {
  await IdleCallback.processInIdle(
    data,
    (item, index) => {
      // Process each item
      transformData(item);
      updateProgress(index / data.length);
    },
    { timeout: 5000 } // Force completion within 5 seconds
  );

  console.log('Processing complete');
}
```

### Prefetching Resources

```typescript
// Prefetch resources during idle time
const cleanup = IdleCallback.runTasks([
  () => prefetchRoute('/dashboard'),
  () => prefetchRoute('/settings'),
  () => prefetchImages(['hero.jpg', 'profile.jpg']),
  () => warmCache(),
]);

// Cancel if user navigates away
window.addEventListener('beforeunload', cleanup);
```

### Deferred Analytics

```typescript
// Defer non-critical analytics
const trackEvent = IdleCallback.defer(
  (eventName: string, data: object) => {
    analytics.track(eventName, data);
  },
  { timeout: 10000 } // Send within 10 seconds
);

// Use anywhere
button.addEventListener('click', () => {
  // Critical work first
  handleButtonClick();

  // Analytics can wait for idle time
  trackEvent('button_clicked', { buttonId: 'submit' });
});
```

### Batched Updates

```typescript
// Batch DOM updates to run during idle time
const batchedUpdate = IdleCallback.batch(() => {
  // Expensive DOM operation
  recalculateLayout();
  updateAllElements();
});

// Multiple calls are batched into one
window.addEventListener('resize', () => {
  batchedUpdate.schedule(); // Won't run immediately
});

// Force immediate execution if needed
function forceUpdate(): void {
  batchedUpdate.flush();
}

// Cancel pending update
function cancelUpdate(): void {
  batchedUpdate.cancel();
}
```

### Lazy Initialization

```typescript
// Initialize non-critical features during idle time
document.addEventListener('DOMContentLoaded', () => {
  // Critical path first
  initCriticalFeatures();

  // Non-critical can wait
  IdleCallback.runTasks([
    () => initAnalytics(),
    () => initChatWidget(),
    () => initTooltips(),
    () => setupKeyboardShortcuts(),
    () => preloadFonts(),
  ]);
});
```

### Timeout Handling

```typescript
// Ensure work completes within time limit
IdleCallback.request(
  (deadline) => {
    if (deadline.didTimeout) {
      // Browser forced execution due to timeout
      // Do minimal necessary work
      doMinimalWork();
    } else {
      // Normal idle time - do full work
      doFullWork(deadline);
    }
  },
  { timeout: 2000 } // Force after 2 seconds
);
```

### Promise-Based Usage

```typescript
async function doIdleWork(): Promise<void> {
  // Wait for idle time
  const deadline = await IdleCallback.requestPromise();

  console.log(`Got ${deadline.timeRemaining()}ms of idle time`);

  // Do work
  performBackgroundTask();
}
```

### Conditional Execution

```typescript
IdleCallback.request((deadline) => {
  // Only run expensive operation if we have enough time
  if (IdleCallback.runIfTime(deadline, expensiveOperation, 10)) {
    console.log('Operation completed');
  } else {
    // Not enough time, schedule for later
    IdleCallback.request(retryOperation);
  }
});
```

## Fallback Behavior

When `requestIdleCallback` is not supported (Safari < 16.4, older browsers):

- Falls back to `setTimeout` with 1ms delay
- Provides a synthetic deadline with 50ms time budget
- `didTimeout` is set based on timeout option

```typescript
// Works the same in all browsers
if (!IdleCallback.isSupported()) {
  console.log('Using setTimeout fallback');
}

// API is identical regardless of support
IdleCallback.request((deadline) => {
  // deadline.timeRemaining() works in both cases
  doWork();
});
```

## Performance Considerations

1. **Don't Block** - Keep individual work chunks small (< 50ms)
2. **Use Timeout** - Set timeout for time-sensitive work
3. **Check Time Remaining** - Always check `deadline.timeRemaining()` before
   expensive operations
4. **Batch Related Work** - Group related tasks to minimize callback overhead
5. **Prioritize** - Order tasks by importance in `runTasks`
6. **Cancel Unused** - Call cleanup function when tasks are no longer needed

## Best Practices

1. **Critical Path First** - Never put critical work in idle callbacks
2. **Progressive Enhancement** - App should work even if idle work is delayed
3. **User Experience** - Idle callbacks should improve, not degrade, user
   experience
4. **Testing** - Test with and without idle callback support
5. **Monitoring** - Track if timeout is frequently triggered (indicates too much
   work)
