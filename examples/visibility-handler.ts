// noinspection JSUnusedGlobalSymbols,JSUnusedLocalSymbols - Example file

/**
 * Visibility Handler Example - Page Visibility for Video/Audio Control
 *
 * This example demonstrates:
 * - Pausing/resuming media when page visibility changes
 * - Saving application state when user leaves
 * - Optimizing performance by pausing animations
 * - Analytics tracking for session time
 * - Background task management
 *
 * @packageDocumentation
 */

import { type CleanupFn } from '@zappzarapp/browser-utils/core';
import { VisibilityManager } from '@zappzarapp/browser-utils/visibility';

// =============================================================================
// Types
// =============================================================================

/**
 * Media player state for saving/restoring playback position.
 */
interface MediaState {
  readonly currentTime: number;
  readonly playing: boolean;
  readonly volume: number;
}

/**
 * Session analytics data.
 */
interface SessionAnalytics {
  visibleTime: number;
  hiddenTime: number;
  tabSwitches: number;
  lastVisibleAt: number;
  lastHiddenAt: number;
}

/**
 * Background task that can be paused/resumed.
 */
interface BackgroundTask {
  readonly id: string;
  readonly interval: number;
  readonly callback: () => void;
}

// =============================================================================
// Media Control
// =============================================================================

/**
 * Create a visibility-aware media controller.
 * Automatically pauses media when the page is hidden and resumes when visible.
 */
function createMediaController(media: HTMLMediaElement): {
  readonly play: () => Promise<void>;
  readonly pause: () => void;
  readonly cleanup: CleanupFn;
} {
  // Track if user explicitly paused (don't auto-resume in that case)
  let userPaused = false;
  let wasPlaying = false;

  /**
   * Handle page becoming hidden.
   */
  function onHidden(): void {
    // Only track if media was playing before hiding
    wasPlaying = !media.paused && !userPaused;

    if (wasPlaying) {
      console.log('[Media] Page hidden, pausing playback');
      media.pause();
    }
  }

  /**
   * Handle page becoming visible.
   */
  function onVisible(): void {
    // Only resume if media was playing before page was hidden
    if (wasPlaying && !userPaused) {
      console.log('[Media] Page visible, resuming playback');
      void media.play().catch((error) => {
        console.warn('[Media] Auto-play blocked:', error);
      });
    }
    wasPlaying = false;
  }

  // Set up visibility listeners
  // noinspection JSVoidFunctionReturnValueUsed - onHidden/onVisible return CleanupFn
  const cleanupHidden: CleanupFn = VisibilityManager.onHidden(onHidden);
  const cleanupVisible: CleanupFn = VisibilityManager.onVisible(onVisible);

  // Track user-initiated pause/play
  const handlePause = (): void => {
    if (VisibilityManager.isVisible()) {
      userPaused = true;
    }
  };

  const handlePlay = (): void => {
    userPaused = false;
  };

  media.addEventListener('pause', handlePause);
  media.addEventListener('play', handlePlay);

  return {
    play: async () => {
      userPaused = false;
      await media.play();
    },

    pause: () => {
      userPaused = true;
      media.pause();
    },

    cleanup: () => {
      cleanupHidden();
      cleanupVisible();
      media.removeEventListener('pause', handlePause);
      media.removeEventListener('play', handlePlay);
    },
  };
}

/**
 * Example: Set up video player with visibility handling.
 */
function setupVideoPlayer(videoElement: HTMLVideoElement): CleanupFn {
  console.log('--- Video Player Setup ---');

  const controller = createMediaController(videoElement);

  // Add play/pause button handlers
  const playButton = document.querySelector<HTMLButtonElement>('#play-btn');
  const pauseButton = document.querySelector<HTMLButtonElement>('#pause-btn');

  const handlePlayClick = (): void => {
    void controller.play();
  };

  const handlePauseClick = (): void => {
    controller.pause();
  };

  playButton?.addEventListener('click', handlePlayClick);
  pauseButton?.addEventListener('click', handlePauseClick);

  console.log('Video player ready with visibility handling');

  return () => {
    controller.cleanup();
    playButton?.removeEventListener('click', handlePlayClick);
    pauseButton?.removeEventListener('click', handlePauseClick);
  };
}

// =============================================================================
// Animation Control
// =============================================================================

/**
 * Create a visibility-aware animation controller.
 * Pauses CSS animations and requestAnimationFrame loops when page is hidden.
 */
function createAnimationController(): {
  readonly register: (element: HTMLElement) => void;
  readonly unregister: (element: HTMLElement) => void;
  readonly cleanup: CleanupFn;
} {
  const animatedElements = new Set<HTMLElement>();
  const savedStates = new Map<HTMLElement, string>();

  /**
   * Pause all animations.
   */
  function pauseAnimations(): void {
    console.log('[Animations] Pausing animations');

    for (const element of animatedElements) {
      // Save current animation state
      const style = getComputedStyle(element);
      savedStates.set(element, style.animationPlayState);

      // Pause animation
      element.style.animationPlayState = 'paused';
    }
  }

  /**
   * Resume all animations.
   */
  function resumeAnimations(): void {
    console.log('[Animations] Resuming animations');

    for (const element of animatedElements) {
      // Restore animation state
      const savedState = savedStates.get(element);
      element.style.animationPlayState = savedState ?? 'running';
    }

    savedStates.clear();
  }

  // Set up visibility listeners
  const cleanupHidden = VisibilityManager.onHidden(pauseAnimations);
  const cleanupVisible = VisibilityManager.onVisible(resumeAnimations);

  return {
    register: (element: HTMLElement) => {
      animatedElements.add(element);

      // If page is currently hidden, pause immediately
      if (VisibilityManager.isHidden()) {
        element.style.animationPlayState = 'paused';
      }
    },

    unregister: (element: HTMLElement) => {
      animatedElements.delete(element);
      savedStates.delete(element);
    },

    cleanup: () => {
      cleanupHidden();
      cleanupVisible();
      animatedElements.clear();
      savedStates.clear();
    },
  };
}

/**
 * Create a visibility-aware requestAnimationFrame loop.
 */
function createAnimationLoop(callback: (deltaTime: number) => void): {
  readonly start: () => void;
  readonly stop: () => void;
  readonly cleanup: CleanupFn;
} {
  let running = false;
  let animationFrameId: number | null = null;
  let lastTime = 0;
  let pausedTime = 0;

  /**
   * Animation loop tick.
   */
  function tick(currentTime: number): void {
    if (!running) return;

    // Calculate delta time, accounting for pause duration
    const deltaTime = lastTime === 0 ? 0 : currentTime - lastTime - pausedTime;
    lastTime = currentTime;
    pausedTime = 0;

    // Call user callback
    callback(Math.max(0, deltaTime));

    // Schedule next frame
    animationFrameId = requestAnimationFrame(tick);
  }

  /**
   * Start the animation loop.
   */
  function start(): void {
    if (running) return;

    running = true;
    lastTime = 0;
    animationFrameId = requestAnimationFrame(tick);
    console.log('[Animation Loop] Started');
  }

  /**
   * Stop the animation loop.
   */
  function stop(): void {
    running = false;

    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    console.log('[Animation Loop] Stopped');
  }

  // Track pause time when hidden
  let hiddenAt = 0;

  const cleanupHidden = VisibilityManager.onHidden(() => {
    if (running) {
      hiddenAt = performance.now();
      console.log('[Animation Loop] Paused (page hidden)');
    }
  });

  const cleanupVisible = VisibilityManager.onVisible(() => {
    if (running && hiddenAt > 0) {
      pausedTime = performance.now() - hiddenAt;
      hiddenAt = 0;
      console.log(`[Animation Loop] Resumed (paused for ${Math.round(pausedTime)}ms)`);
    }
  });

  return {
    start,
    stop,
    cleanup: () => {
      stop();
      cleanupHidden();
      cleanupVisible();
    },
  };
}

// =============================================================================
// Session Analytics
// =============================================================================

/**
 * Create a visibility-based session analytics tracker.
 */
function createSessionAnalytics(): {
  readonly getStats: () => Readonly<SessionAnalytics>;
  readonly reset: () => void;
  readonly cleanup: CleanupFn;
} {
  const stats: SessionAnalytics = {
    visibleTime: 0,
    hiddenTime: 0,
    tabSwitches: 0,
    lastVisibleAt: VisibilityManager.isVisible() ? Date.now() : 0,
    lastHiddenAt: VisibilityManager.isHidden() ? Date.now() : 0,
  };

  const cleanupHidden = VisibilityManager.onHidden(() => {
    // Calculate visible time
    if (stats.lastVisibleAt > 0) {
      stats.visibleTime += Date.now() - stats.lastVisibleAt;
    }

    stats.lastHiddenAt = Date.now();
    stats.lastVisibleAt = 0;
    stats.tabSwitches++;

    console.log('[Analytics] Tab hidden, visible time:', Math.round(stats.visibleTime / 1000), 's');
  });

  const cleanupVisible = VisibilityManager.onVisible(() => {
    // Calculate hidden time
    if (stats.lastHiddenAt > 0) {
      stats.hiddenTime += Date.now() - stats.lastHiddenAt;
    }

    stats.lastVisibleAt = Date.now();
    stats.lastHiddenAt = 0;

    console.log('[Analytics] Tab visible, hidden time:', Math.round(stats.hiddenTime / 1000), 's');
  });

  return {
    getStats: () => {
      // Calculate current session time
      const now = Date.now();
      const currentVisible = stats.lastVisibleAt > 0 ? now - stats.lastVisibleAt : 0;
      const currentHidden = stats.lastHiddenAt > 0 ? now - stats.lastHiddenAt : 0;

      return {
        ...stats,
        visibleTime: stats.visibleTime + currentVisible,
        hiddenTime: stats.hiddenTime + currentHidden,
      };
    },

    reset: () => {
      stats.visibleTime = 0;
      stats.hiddenTime = 0;
      stats.tabSwitches = 0;
      stats.lastVisibleAt = VisibilityManager.isVisible() ? Date.now() : 0;
      stats.lastHiddenAt = VisibilityManager.isHidden() ? Date.now() : 0;
    },

    cleanup: () => {
      cleanupHidden();
      cleanupVisible();
    },
  };
}

// =============================================================================
// Background Tasks
// =============================================================================

/**
 * Create a visibility-aware background task manager.
 * Pauses scheduled tasks when page is hidden to save resources.
 */
function createBackgroundTaskManager(): {
  readonly add: (task: BackgroundTask) => CleanupFn;
  readonly pause: () => void;
  readonly resume: () => void;
  readonly cleanup: CleanupFn;
} {
  const tasks = new Map<
    string,
    { task: BackgroundTask; timerId: ReturnType<typeof setInterval> | null }
  >();
  let paused = false;

  /**
   * Start a task's interval.
   */
  function startTask(task: BackgroundTask): ReturnType<typeof setInterval> {
    return setInterval(task.callback, task.interval);
  }

  /**
   * Stop all tasks.
   */
  function stopAllTasks(): void {
    for (const entry of tasks.values()) {
      if (entry.timerId !== null) {
        clearInterval(entry.timerId);
        entry.timerId = null;
      }
    }
  }

  /**
   * Start all tasks.
   */
  function startAllTasks(): void {
    for (const entry of tasks.values()) {
      if (entry.timerId === null) {
        entry.timerId = startTask(entry.task);
      }
    }
  }

  // Auto-pause when hidden
  const cleanupHidden = VisibilityManager.onHidden(() => {
    if (!paused) {
      console.log('[Tasks] Pausing background tasks (page hidden)');
      stopAllTasks();
    }
  });

  const cleanupVisible = VisibilityManager.onVisible(() => {
    if (!paused) {
      console.log('[Tasks] Resuming background tasks (page visible)');
      startAllTasks();
    }
  });

  return {
    add: (task: BackgroundTask) => {
      // Start immediately if page is visible and not paused
      const timerId = VisibilityManager.isVisible() && !paused ? startTask(task) : null;
      tasks.set(task.id, { task, timerId });

      console.log(`[Tasks] Added task: ${task.id} (interval: ${task.interval}ms)`);

      // Return cleanup function
      return () => {
        const entry = tasks.get(task.id);
        if (entry !== undefined && entry.timerId !== null) {
          clearInterval(entry.timerId);
        }
        tasks.delete(task.id);
        console.log(`[Tasks] Removed task: ${task.id}`);
      };
    },

    pause: () => {
      paused = true;
      stopAllTasks();
      console.log('[Tasks] Manually paused all tasks');
    },

    resume: () => {
      paused = false;
      if (VisibilityManager.isVisible()) {
        startAllTasks();
      }
      console.log('[Tasks] Manually resumed all tasks');
    },

    cleanup: () => {
      cleanupHidden();
      cleanupVisible();
      stopAllTasks();
      tasks.clear();
    },
  };
}

// =============================================================================
// Auto-Save
// =============================================================================

/**
 * Create an auto-save handler that saves when user leaves the page.
 */
function createAutoSave<T>(getData: () => T, save: (data: T) => void | Promise<void>): CleanupFn {
  const handleHidden = async (): Promise<void> => {
    console.log('[AutoSave] Page hidden, saving state...');

    try {
      const data = getData();
      await save(data);
      console.log('[AutoSave] State saved successfully');
    } catch (error) {
      console.error('[AutoSave] Failed to save state:', error);
    }
  };

  return VisibilityManager.onHidden(() => {
    void handleHidden();
  });
}

// =============================================================================
// Example: Complete Application Setup
// =============================================================================

/**
 * Example: Initialize all visibility handlers for a media-rich application.
 */
function initializeApp(): { cleanup: () => void } {
  console.log('=== Visibility Handler Example ===\n');

  const cleanups: CleanupFn[] = [];

  // 1. Video Player
  console.log('\n--- Setting up Video Player ---');
  const video = document.querySelector<HTMLVideoElement>('#main-video');
  if (video !== null) {
    cleanups.push(setupVideoPlayer(video));
  }

  // 2. Animation Controller
  console.log('\n--- Setting up Animation Controller ---');
  const animController = createAnimationController();
  cleanups.push(animController.cleanup);

  // Register animated elements
  document.querySelectorAll<HTMLElement>('.animated').forEach((el) => {
    animController.register(el);
  });

  // 3. Canvas Animation Loop
  console.log('\n--- Setting up Animation Loop ---');
  const animLoop = createAnimationLoop((_deltaTime) => {
    // Example: Update game/animation state
    // This callback won't be called while page is hidden
  });
  animLoop.start();
  cleanups.push(animLoop.cleanup);

  // 4. Session Analytics
  console.log('\n--- Setting up Session Analytics ---');
  const analytics = createSessionAnalytics();
  cleanups.push(analytics.cleanup);

  // Log stats periodically
  const statsInterval = setInterval(() => {
    if (VisibilityManager.isVisible()) {
      const stats = analytics.getStats();
      console.log('[Analytics] Stats:', {
        visibleTime: `${Math.round(stats.visibleTime / 1000)}s`,
        hiddenTime: `${Math.round(stats.hiddenTime / 1000)}s`,
        tabSwitches: stats.tabSwitches,
      });
    }
  }, 10000);
  cleanups.push(() => clearInterval(statsInterval));

  // 5. Background Tasks
  console.log('\n--- Setting up Background Tasks ---');
  const taskManager = createBackgroundTaskManager();
  cleanups.push(taskManager.cleanup);

  // Add example tasks
  cleanups.push(
    taskManager.add({
      id: 'heartbeat',
      interval: 30000,
      callback: () => console.log('[Heartbeat] Ping'),
    })
  );

  cleanups.push(
    taskManager.add({
      id: 'data-sync',
      interval: 60000,
      callback: () => console.log('[DataSync] Syncing...'),
    })
  );

  // 6. Auto-Save
  console.log('\n--- Setting up Auto-Save ---');
  const appState = { lastEdit: Date.now(), content: 'Example content' };

  cleanups.push(
    createAutoSave(
      () => appState,
      (data) => {
        // In a real app, save to localStorage or send to server
        localStorage.setItem('app-state', JSON.stringify(data));
      }
    )
  );

  // 7. Basic visibility logging
  cleanups.push(
    VisibilityManager.onChange((state) => {
      console.log(`[Visibility] State changed to: ${state}`);
    })
  );

  console.log('\n=== Application Initialized ===');
  console.log('Current visibility:', VisibilityManager.getState());

  return {
    cleanup: () => {
      console.log('\n--- Cleaning Up ---');
      for (const fn of cleanups) {
        fn();
      }
      console.log('All visibility handlers cleaned up');
    },
  };
}

// =============================================================================
// Simple Usage Examples
// =============================================================================

/**
 * Example: Basic visibility state checking.
 */
function basicUsageExample(): void {
  console.log('\n--- Basic Usage ---');

  // Check current state
  console.log('Is visible:', VisibilityManager.isVisible());
  console.log('Is hidden:', VisibilityManager.isHidden());
  console.log('Current state:', VisibilityManager.getState());
}

/**
 * Example: Simple visibility listener.
 */
function simpleListenerExample(): CleanupFn {
  console.log('\n--- Simple Listener ---');

  // Listen for any visibility change
  return VisibilityManager.onChange((state) => {
    if (state === 'visible') {
      console.log('Welcome back!');
    } else {
      console.log('See you soon!');
    }
  });
}

// =============================================================================
// Exports
// =============================================================================

export {
  createMediaController,
  createAnimationController,
  createAnimationLoop,
  createSessionAnalytics,
  createBackgroundTaskManager,
  createAutoSave,
  setupVideoPlayer,
  initializeApp,
  basicUsageExample,
  simpleListenerExample,
  type MediaState,
  type SessionAnalytics,
  type BackgroundTask,
};

// Run example if this is the entry point
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    basicUsageExample();

    // Initialize full app
    const app = initializeApp();

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      app.cleanup();
    });
  });
}
