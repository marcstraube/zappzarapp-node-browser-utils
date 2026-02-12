// noinspection JSUnusedGlobalSymbols - Example file

/**
 * Idle Tasks Example - Background Processing with requestIdleCallback
 *
 * This example demonstrates:
 * - Scheduling work during browser idle time
 * - Processing large datasets without blocking the UI
 * - Running task queues across idle periods
 * - Batching updates for better performance
 * - Deferred function execution
 *
 * Use idle callbacks for low-priority work that can be done when the browser
 * has spare time, keeping the main thread responsive for user interactions.
 *
 * @packageDocumentation
 */

import { type CleanupFn } from '@zappzarapp/browser-utils/core';
import { IdleCallback, type IdleDeadline } from '@zappzarapp/browser-utils/idle';

// =============================================================================
// Types
// =============================================================================

/**
 * Analytics event to process.
 */
interface AnalyticsEvent {
  readonly type: string;
  readonly timestamp: number;
  readonly data: Record<string, unknown>;
}

/**
 * Image to prefetch.
 */
interface ImagePrefetchItem {
  readonly url: string;
  readonly priority: 'high' | 'normal' | 'low';
}

/**
 * Cache cleanup task.
 */
interface CacheEntry {
  readonly key: string;
  readonly expiresAt: number;
  readonly size: number;
}

// =============================================================================
// Basic Usage
// =============================================================================

/**
 * Check if requestIdleCallback is supported.
 */
function checkIdleSupport(): void {
  console.log('--- Idle Callback Support ---');

  if (IdleCallback.isSupported()) {
    console.log('requestIdleCallback is natively supported');
  } else {
    console.log('Using setTimeout fallback for idle callbacks');
  }
}

/**
 * Schedule a simple idle task.
 */
function basicIdleTaskExample(): CleanupFn {
  console.log('\n--- Basic Idle Task ---');

  // Schedule work when browser is idle
  const cancel = IdleCallback.request((deadline) => {
    console.log('Idle callback executed!');
    console.log('Time remaining:', deadline.timeRemaining().toFixed(2), 'ms');
    console.log('Did timeout:', deadline.didTimeout);

    // Do some work
    console.log('Performing low-priority task...');
  });

  console.log('Task scheduled, will run when browser is idle');

  // Return cancel function (call to abort if needed)
  return cancel;
}

/**
 * Schedule idle task with timeout.
 */
function idleWithTimeoutExample(): CleanupFn {
  console.log('\n--- Idle Task with Timeout ---');

  // Task will run within 2 seconds, even if browser isn't idle
  const cancel = IdleCallback.request(
    (deadline) => {
      if (deadline.didTimeout) {
        console.log('Task ran due to timeout (browser was busy)');
      } else {
        console.log('Task ran during idle time');
      }
      console.log('Time remaining:', deadline.timeRemaining().toFixed(2), 'ms');
    },
    { timeout: 2000 } // Max 2 seconds wait
  );

  console.log('Task scheduled with 2 second timeout');

  return cancel;
}

/**
 * Use promise-based idle request.
 */
async function idlePromiseExample(): Promise<void> {
  console.log('\n--- Idle Promise ---');

  console.log('Waiting for idle time...');
  const deadline = await IdleCallback.requestPromise({ timeout: 1000 });

  console.log('Browser is idle!');
  console.log('Time remaining:', deadline.timeRemaining().toFixed(2), 'ms');

  // Do work in the idle period
  let workDone = 0;
  while (deadline.timeRemaining() > 0 && workDone < 10) {
    // Simulate work
    workDone++;
  }

  console.log('Completed', workDone, 'units of work');
}

// =============================================================================
// Task Queue
// =============================================================================

/**
 * Run multiple tasks across idle periods.
 */
function taskQueueExample(): CleanupFn {
  console.log('\n--- Task Queue ---');

  // Define multiple low-priority tasks
  const tasks = [
    () => console.log('[Task 1] Updating analytics'),
    () => console.log('[Task 2] Prefetching resources'),
    () => console.log('[Task 3] Cleaning cache'),
    () => console.log('[Task 4] Syncing state'),
    () => console.log('[Task 5] Logging metrics'),
  ];

  console.log('Queuing', tasks.length, 'tasks to run during idle time');

  // Run all tasks across idle periods
  const cancel = IdleCallback.runTasks(tasks, {
    timeout: 5000, // Ensure all tasks complete within 5 seconds
    minTimeRemaining: 2, // Need at least 2ms to start a task
  });

  console.log('Tasks queued, will execute during idle periods');

  return cancel;
}

// =============================================================================
// Processing Large Datasets
// =============================================================================

/**
 * Process analytics events during idle time.
 */
function processAnalyticsExample(): CleanupFn {
  console.log('\n--- Analytics Processing ---');

  // Simulate a batch of analytics events
  const events: AnalyticsEvent[] = Array.from({ length: 50 }, (_, i) => ({
    type: ['click', 'view', 'scroll', 'input'][i % 4] ?? 'unknown',
    timestamp: Date.now() - (50 - i) * 1000,
    data: { index: i, page: '/example' },
  }));

  console.log('Processing', events.length, 'analytics events in idle time');

  let processed = 0;
  const batchSize = 10;

  /**
   * Process a batch of events.
   */
  function processBatch(deadline: IdleDeadline): void {
    // Process events while we have time
    while (deadline.timeRemaining() > 1 && processed < events.length) {
      const batch = events.slice(processed, processed + batchSize);

      // Simulate processing
      for (const event of batch) {
        // In a real app, you'd send to analytics service
        void event; // Use the event
      }

      processed += batch.length;
      console.log(`[Analytics] Processed ${processed}/${events.length} events`);
    }

    // If more events remain, schedule another idle callback
    if (processed < events.length) {
      IdleCallback.request(processBatch);
    } else {
      console.log('[Analytics] All events processed');
    }
  }

  // Start processing
  return IdleCallback.request(processBatch);
}

/**
 * Process items using the built-in processInIdle helper.
 */
async function processInIdleExample(): Promise<void> {
  console.log('\n--- Process In Idle Helper ---');

  // Generate items to process
  const items = Array.from({ length: 100 }, (_, i) => ({
    id: i,
    value: Math.random(),
  }));

  console.log('Processing', items.length, 'items in idle time...');

  let processedCount = 0;

  await IdleCallback.processInIdle(
    items,
    (item, index) => {
      // Process each item
      // In a real app, this might update DOM, calculate values, etc.
      void item; // Use the item
      processedCount++;

      if ((index + 1) % 25 === 0) {
        console.log(`[Progress] ${index + 1}/${items.length} items processed`);
      }
    },
    { timeout: 5000 }
  );

  console.log('All items processed:', processedCount);
}

// =============================================================================
// Image Prefetching
// =============================================================================

/**
 * Prefetch images during idle time.
 */
function imagePrefetchExample(): CleanupFn {
  console.log('\n--- Image Prefetching ---');

  // Images to prefetch (sorted by priority)
  const images: ImagePrefetchItem[] = [
    { url: '/images/hero.jpg', priority: 'high' },
    { url: '/images/feature-1.jpg', priority: 'normal' },
    { url: '/images/feature-2.jpg', priority: 'normal' },
    { url: '/images/footer-bg.jpg', priority: 'low' },
    { url: '/images/pattern.png', priority: 'low' },
  ];

  // Sort by priority
  const sortedImages = [...images].sort((a, b) => {
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  console.log('Prefetching', sortedImages.length, 'images');

  // Create prefetch tasks
  const tasks = sortedImages.map((img) => () => {
    console.log(`[Prefetch] Loading: ${img.url} (${img.priority})`);

    // In a real app, you'd actually load the image:
    // const image = new Image();
    // image.src = img.url;
  });

  return IdleCallback.runTasks(tasks, {
    timeout: 10000, // Allow up to 10 seconds
    minTimeRemaining: 5, // Need at least 5ms to start a prefetch
  });
}

// =============================================================================
// Cache Cleanup
// =============================================================================

/**
 * Clean up expired cache entries during idle time.
 */
function cacheCleanupExample(): CleanupFn {
  console.log('\n--- Cache Cleanup ---');

  // Simulated cache entries
  const cacheEntries: CacheEntry[] = Array.from({ length: 100 }, (_, i) => ({
    key: `cache_${i}`,
    expiresAt: Date.now() + (i % 2 === 0 ? -1000 : 10000), // Half expired
    size: Math.floor(Math.random() * 1000) + 100,
  }));

  const now = Date.now();
  let checked = 0;
  let removed = 0;
  let freedBytes = 0;

  console.log('Checking', cacheEntries.length, 'cache entries for cleanup');

  /**
   * Clean up entries in batches.
   */
  function cleanupBatch(deadline: IdleDeadline): void {
    while (deadline.timeRemaining() > 0.5 && checked < cacheEntries.length) {
      const entry = cacheEntries[checked];
      if (entry !== undefined && entry.expiresAt < now) {
        // In a real app, you'd delete from actual cache:
        // await cache.delete(entry.key);
        removed++;
        freedBytes += entry.size;
      }
      checked++;
    }

    if (checked < cacheEntries.length) {
      IdleCallback.request(cleanupBatch);
    } else {
      console.log(
        `[Cache] Cleanup complete: ${removed} entries removed, ${freedBytes} bytes freed`
      );
    }
  }

  return IdleCallback.request(cleanupBatch);
}

// =============================================================================
// Deferred Functions
// =============================================================================

/**
 * Demonstrate deferred function execution.
 */
function deferredFunctionExample(): void {
  console.log('\n--- Deferred Functions ---');

  // Create a deferred version of a function
  // Note: defer() expects (...args: unknown[]) => void, so we use a type assertion
  const logMessage = (message: string, level: string): void => {
    console.log(`[${level.toUpperCase()}] ${message}`);
  };

  // Wrap it to defer execution (cast needed for typed functions)
  const deferredLog = IdleCallback.defer(logMessage as (...args: unknown[]) => void, {
    timeout: 1000,
  });

  // These will execute during idle time (not immediately)
  console.log('Scheduling deferred logs...');
  deferredLog('This runs during idle time', 'info');
  deferredLog('So does this', 'debug');

  console.log('Logs scheduled (will appear when browser is idle)');
}

// =============================================================================
// Batched Updates
// =============================================================================

/**
 * Demonstrate batched updates during idle time.
 */
function batchedUpdatesExample(): { cleanup: CleanupFn } {
  console.log('\n--- Batched Updates ---');

  // State that needs to be saved
  let pendingUpdates = 0;

  // Create a batched save function
  const batchedSave = IdleCallback.batch(
    () => {
      console.log(`[Batch] Saving ${pendingUpdates} updates`);
      // In a real app, you'd save to localStorage or send to server
      pendingUpdates = 0;
    },
    { timeout: 2000 } // Save within 2 seconds
  );

  // Simulate rapid updates (like typing)
  console.log('Simulating rapid updates...');

  for (let i = 0; i < 10; i++) {
    pendingUpdates++;
    batchedSave.schedule(); // All calls batched into one idle callback
  }

  console.log('10 updates scheduled, will be saved in single batch');

  return {
    cleanup: () => {
      // Force immediate save and cancel pending
      batchedSave.flush();
    },
  };
}

// =============================================================================
// Deadline-Aware Processing
// =============================================================================

/**
 * Demonstrate deadline-aware work splitting.
 */
function deadlineAwareExample(): CleanupFn {
  console.log('\n--- Deadline-Aware Processing ---');

  // Large dataset to process
  const items = Array.from({ length: 1000 }, (_, i) => i);
  let index = 0;
  let totalTime = 0;

  /**
   * Process items respecting the deadline.
   */
  function processWithDeadline(deadline: IdleDeadline): void {
    const startTime = performance.now();

    // Check time remaining before each item
    while (index < items.length) {
      // Use runIfTime helper to check if we should continue
      const shouldContinue = IdleCallback.runIfTime(
        deadline,
        () => {
          // Simulate processing (very quick)
          void items[index];
          index++;
        },
        0.1 // Need at least 0.1ms
      );

      if (!shouldContinue) {
        break;
      }
    }

    totalTime += performance.now() - startTime;

    if (index < items.length) {
      // More work to do
      console.log(`[Deadline] Processed ${index}/${items.length} items, yielding...`);
      IdleCallback.request(processWithDeadline);
    } else {
      console.log(
        `[Deadline] Complete! Processed ${items.length} items in ${totalTime.toFixed(2)}ms total`
      );
    }
  }

  console.log('Starting deadline-aware processing of 1000 items');

  return IdleCallback.request(processWithDeadline);
}

// =============================================================================
// Real-World Patterns
// =============================================================================

/**
 * Create an idle task manager for an application.
 */
function createIdleTaskManager(): {
  readonly queueTask: (name: string, task: () => void, priority?: number) => void;
  readonly getQueueSize: () => number;
  readonly flush: () => void;
  readonly cleanup: CleanupFn;
} {
  interface QueuedTask {
    readonly name: string;
    readonly task: () => void;
    readonly priority: number;
    readonly queuedAt: number;
  }

  const queue: QueuedTask[] = [];
  let isProcessing = false;
  let cancelCurrent: CleanupFn | null = null;

  /**
   * Process queued tasks.
   */
  function processQueue(deadline: IdleDeadline): void {
    // Sort by priority (higher = more important)
    queue.sort((a, b) => b.priority - a.priority);

    while (queue.length > 0 && (deadline.timeRemaining() > 1 || deadline.didTimeout)) {
      const item = queue.shift()!;

      try {
        console.log(`[TaskManager] Running: ${item.name}`);
        item.task();
      } catch (error) {
        console.error(`[TaskManager] Task "${item.name}" failed:`, error);
      }
    }

    if (queue.length > 0) {
      cancelCurrent = IdleCallback.request(processQueue, { timeout: 5000 });
    } else {
      isProcessing = false;
      cancelCurrent = null;
      console.log('[TaskManager] Queue empty');
    }
  }

  /**
   * Ensure processing is running.
   */
  function ensureProcessing(): void {
    if (!isProcessing && queue.length > 0) {
      isProcessing = true;
      cancelCurrent = IdleCallback.request(processQueue, { timeout: 5000 });
    }
  }

  return {
    queueTask: (name, task, priority = 0) => {
      queue.push({
        name,
        task,
        priority,
        queuedAt: Date.now(),
      });
      console.log(`[TaskManager] Queued: ${name} (priority: ${priority})`);
      ensureProcessing();
    },

    getQueueSize: () => queue.length,

    flush: () => {
      console.log('[TaskManager] Flushing', queue.length, 'tasks synchronously');
      while (queue.length > 0) {
        const item = queue.shift()!;
        try {
          item.task();
        } catch (error) {
          console.error(`Task "${item.name}" failed:`, error);
        }
      }
      isProcessing = false;
    },

    cleanup: () => {
      if (cancelCurrent !== null) {
        cancelCurrent();
      }
      queue.length = 0;
      isProcessing = false;
    },
  };
}

/**
 * Example: Using the idle task manager.
 */
function taskManagerExample(): CleanupFn {
  console.log('\n--- Idle Task Manager ---');

  const manager = createIdleTaskManager();

  // Queue various tasks with different priorities
  manager.queueTask('analytics', () => console.log('  Sending analytics'), 1);
  manager.queueTask('prefetch', () => console.log('  Prefetching resources'), 0);
  manager.queueTask('critical-log', () => console.log('  Logging critical data'), 2);
  manager.queueTask('cleanup', () => console.log('  Cleaning temp data'), -1);

  console.log('Queue size:', manager.getQueueSize());

  return manager.cleanup;
}

// =============================================================================
// Run All Examples
// =============================================================================

/**
 * Run all idle callback examples.
 * @returns Cleanup function to cancel pending idle tasks
 */
export async function runIdleTasksExamples(): Promise<CleanupFn> {
  console.log('=== Idle Tasks Examples ===\n');

  const cleanups: CleanupFn[] = [];

  checkIdleSupport();
  cleanups.push(basicIdleTaskExample());
  cleanups.push(idleWithTimeoutExample());

  // Wait for promise example
  await idlePromiseExample();

  cleanups.push(taskQueueExample());
  cleanups.push(processAnalyticsExample());

  // Wait for processInIdle example
  await processInIdleExample();

  cleanups.push(imagePrefetchExample());
  cleanups.push(cacheCleanupExample());

  deferredFunctionExample();

  const batched = batchedUpdatesExample();
  cleanups.push(batched.cleanup);

  cleanups.push(deadlineAwareExample());
  cleanups.push(taskManagerExample());

  console.log('\n=== Idle Tasks Examples Complete ===');
  console.log(
    `Registered ${cleanups.length} cleanup functions (call to cancel pending idle tasks)`
  );

  // Return cleanup function that cancels all pending idle tasks
  return (): void => {
    cleanups.forEach((cleanup) => cleanup());
  };
}

// =============================================================================
// Exports
// =============================================================================

export {
  checkIdleSupport,
  basicIdleTaskExample,
  idleWithTimeoutExample,
  idlePromiseExample,
  taskQueueExample,
  processAnalyticsExample,
  processInIdleExample,
  imagePrefetchExample,
  cacheCleanupExample,
  deferredFunctionExample,
  batchedUpdatesExample,
  deadlineAwareExample,
  createIdleTaskManager,
  taskManagerExample,
  type AnalyticsEvent,
  type ImagePrefetchItem,
  type CacheEntry,
};

// Uncomment to run directly
// void runIdleTasksExamples();
