// noinspection JSUnusedGlobalSymbols - Example file

/**
 * Broadcast Channel Sync Example - Cross-tab state synchronization
 *
 * This example demonstrates:
 * - Setting up broadcast channels for multi-tab communication
 * - Type-safe message passing between browser tabs
 * - Synchronizing application state across tabs
 * - Leader election for coordinated actions
 * - Session management across tabs
 * - Cleanup patterns with CleanupFn
 *
 * @packageDocumentation
 */

import { type CleanupFn } from '@zappzarapp/browser-utils/core';
import {
  BroadcastManager,
  type BroadcastMessage,
  type BroadcastManagerInstance,
} from '@zappzarapp/browser-utils/broadcast';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Application state that is synchronized across tabs.
 */
interface AppState {
  readonly theme: 'light' | 'dark' | 'system';
  readonly language: string;
  readonly sidebarOpen: boolean;
  readonly notificationsEnabled: boolean;
}

/**
 * User session information.
 */
interface UserSession {
  readonly userId: string;
  readonly username: string;
  readonly token: string;
  readonly expiresAt: number;
}

/**
 * State update message payload.
 */
interface StateUpdatePayload {
  readonly key: keyof AppState;
  readonly value: AppState[keyof AppState];
  readonly timestamp: number;
}

/**
 * Session event types.
 */
type SessionEventType = 'login' | 'logout' | 'refresh' | 'expired';

/**
 * Session event payload.
 */
interface SessionEventPayload {
  readonly event: SessionEventType;
  readonly session?: UserSession;
  readonly reason?: string;
}

/**
 * Leader election message.
 */
interface LeaderMessage {
  readonly action: 'claim' | 'release' | 'heartbeat' | 'query';
  readonly priority: number;
}

// =============================================================================
// Basic Usage
// =============================================================================

/**
 * Check if Broadcast Channel API is available.
 */
function checkBroadcastSupport(): boolean {
  console.log('--- Broadcast Channel Support ---');

  const isSupported = BroadcastManager.isSupported();

  if (isSupported) {
    console.log('BroadcastChannel API is supported');
  } else {
    console.log('BroadcastChannel API is NOT supported');
    console.log('Cross-tab synchronization will not work');
  }

  return isSupported;
}

/**
 * Result of setting up a broadcast channel with listeners.
 */
interface BroadcastSetup {
  readonly broadcast: BroadcastManagerInstance;
  readonly cleanup: CleanupFn;
}

/**
 * Basic message sending and receiving.
 */
function basicBroadcastExample(): BroadcastSetup {
  console.log('\n--- Basic Broadcast ---');

  // Create a broadcast manager
  const broadcast = BroadcastManager.create('basic-example');
  console.log(`Created broadcast channel: ${broadcast.channelName}`);
  console.log(`Instance ID: ${broadcast.id}`);

  // Listen for messages of a specific type
  const cleanupGreeting = broadcast.on<{ message: string }>('greeting', (msg) => {
    console.log(`Received greeting from ${msg.senderId}: ${msg.payload.message}`);
  });

  // Send a message (will be received by other tabs)
  broadcast.send('greeting', { message: 'Hello from this tab!' });
  console.log('Sent greeting message');

  // Note: Messages are NOT received by the sender tab
  // They are only delivered to OTHER tabs/windows on the same channel

  // Return both broadcast and cleanup for proper resource management
  return {
    broadcast,
    cleanup: () => {
      cleanupGreeting();
      broadcast.close();
    },
  };
}

// =============================================================================
// State Synchronization
// =============================================================================

/**
 * State synchronization manager for keeping state consistent across tabs.
 */
class StateSyncManager {
  private broadcast: BroadcastManagerInstance;
  private state: AppState;
  private readonly cleanups: CleanupFn[] = [];
  private readonly onStateChange?: (state: AppState, key: keyof AppState) => void;

  constructor(options: {
    channelName?: string;
    initialState: AppState;
    onStateChange?: (state: AppState, key: keyof AppState) => void;
  }) {
    this.state = { ...options.initialState };
    this.onStateChange = options.onStateChange;
    this.broadcast = BroadcastManager.create(options.channelName ?? 'app-state');

    this.setupListeners();
    this.requestSync();
  }

  /**
   * Set up message listeners.
   */
  private setupListeners(): void {
    // Listen for state updates from other tabs
    this.cleanups.push(
      this.broadcast.on<StateUpdatePayload>('state:update', (msg) => {
        console.log(`[StateSync] Received update from ${msg.senderId}:`, msg.payload);
        this.applyUpdate(msg.payload);
      })
    );

    // Listen for sync requests from new tabs
    this.cleanups.push(
      this.broadcast.on<void>('state:request', (msg) => {
        console.log(`[StateSync] Sync requested by ${msg.senderId}`);
        this.broadcastFullState();
      })
    );

    // Listen for full state broadcasts
    this.cleanups.push(
      this.broadcast.on<AppState>('state:full', (msg) => {
        console.log(`[StateSync] Received full state from ${msg.senderId}`);
        this.replaceState(msg.payload);
      })
    );
  }

  /**
   * Request full state sync from other tabs.
   */
  private requestSync(): void {
    this.broadcast.send('state:request', undefined);
    console.log('[StateSync] Requested state sync');
  }

  /**
   * Broadcast the full current state.
   */
  private broadcastFullState(): void {
    this.broadcast.send('state:full', this.state);
  }

  /**
   * Apply a state update.
   */
  private applyUpdate(payload: StateUpdatePayload): void {
    const currentValue = this.state[payload.key];
    if (currentValue === payload.value) {
      return; // No change needed
    }

    this.state = {
      ...this.state,
      [payload.key]: payload.value,
    };

    this.onStateChange?.(this.state, payload.key);
  }

  /**
   * Replace the entire state.
   */
  private replaceState(newState: AppState): void {
    const changed = Object.keys(newState).some(
      (key) => this.state[key as keyof AppState] !== newState[key as keyof AppState]
    );

    if (!changed) return;

    this.state = { ...newState };
    console.log('[StateSync] State replaced:', this.state);
  }

  /**
   * Update a state value and broadcast to other tabs.
   */
  update<K extends keyof AppState>(key: K, value: AppState[K]): void {
    if (this.state[key] === value) {
      return; // No change
    }

    this.state = {
      ...this.state,
      [key]: value,
    };

    const payload: StateUpdatePayload = {
      key,
      value,
      timestamp: Date.now(),
    };

    this.broadcast.send('state:update', payload);
    console.log(`[StateSync] Updated ${key}:`, value);

    this.onStateChange?.(this.state, key);
  }

  /**
   * Get current state.
   */
  getState(): AppState {
    return { ...this.state };
  }

  /**
   * Get a specific state value.
   */
  get<K extends keyof AppState>(key: K): AppState[K] {
    return this.state[key];
  }

  /**
   * Cleanup and close the channel.
   */
  destroy(): void {
    for (const cleanup of this.cleanups) {
      cleanup();
    }
    this.cleanups.length = 0;
    this.broadcast.close();
    console.log('[StateSync] Destroyed');
  }
}

// =============================================================================
// Session Synchronization
// =============================================================================

/**
 * Session manager that keeps authentication state synchronized across tabs.
 */
class SessionSyncManager {
  private broadcast: BroadcastManagerInstance;
  private session: UserSession | null = null;
  private readonly cleanups: CleanupFn[] = [];
  private readonly onSessionChange?: (session: UserSession | null, event: SessionEventType) => void;

  constructor(
    options: {
      channelName?: string;
      onSessionChange?: (session: UserSession | null, event: SessionEventType) => void;
    } = {}
  ) {
    this.onSessionChange = options.onSessionChange;
    this.broadcast = BroadcastManager.create(options.channelName ?? 'session');

    this.setupListeners();
    this.requestSession();
  }

  /**
   * Set up session event listeners.
   */
  private setupListeners(): void {
    this.cleanups.push(
      this.broadcast.on<SessionEventPayload>('session:event', (msg) => {
        console.log(`[Session] Event from ${msg.senderId}:`, msg.payload.event);
        this.handleSessionEvent(msg.payload);
      })
    );

    this.cleanups.push(
      this.broadcast.on<void>('session:request', () => {
        if (this.session) {
          this.broadcastSession('refresh');
        }
      })
    );
  }

  /**
   * Request session from other tabs.
   */
  private requestSession(): void {
    this.broadcast.send('session:request', undefined);
  }

  /**
   * Handle session events from other tabs.
   */
  private handleSessionEvent(payload: SessionEventPayload): void {
    switch (payload.event) {
      case 'login':
      case 'refresh':
        if (payload.session) {
          this.session = payload.session;
          this.onSessionChange?.(this.session, payload.event);
        }
        break;

      case 'logout':
      case 'expired':
        this.session = null;
        this.onSessionChange?.(null, payload.event);
        break;
    }
  }

  /**
   * Broadcast a session event.
   */
  private broadcastSession(event: SessionEventType, reason?: string): void {
    const payload: SessionEventPayload = {
      event,
      session: this.session ?? undefined,
      reason,
    };

    this.broadcast.send('session:event', payload);
  }

  /**
   * Log in - sets session and notifies all tabs.
   */
  login(session: UserSession): void {
    this.session = session;
    this.broadcastSession('login');
    this.onSessionChange?.(session, 'login');
    console.log(`[Session] Logged in: ${session.username}`);
  }

  /**
   * Log out - clears session and notifies all tabs.
   */
  logout(reason?: string): void {
    this.session = null;
    this.broadcastSession('logout', reason);
    this.onSessionChange?.(null, 'logout');
    console.log('[Session] Logged out');
  }

  /**
   * Refresh session - updates token and notifies all tabs.
   */
  refresh(newSession: UserSession): void {
    this.session = newSession;
    this.broadcastSession('refresh');
    this.onSessionChange?.(newSession, 'refresh');
    console.log('[Session] Session refreshed');
  }

  /**
   * Mark session as expired.
   */
  expire(reason?: string): void {
    this.session = null;
    this.broadcastSession('expired', reason);
    this.onSessionChange?.(null, 'expired');
    console.log('[Session] Session expired');
  }

  /**
   * Get current session.
   */
  getSession(): UserSession | null {
    return this.session;
  }

  /**
   * Check if logged in.
   */
  isLoggedIn(): boolean {
    return this.session !== null && this.session.expiresAt > Date.now();
  }

  /**
   * Cleanup.
   */
  destroy(): void {
    for (const cleanup of this.cleanups) {
      cleanup();
    }
    this.broadcast.close();
    console.log('[Session] Destroyed');
  }
}

// =============================================================================
// Leader Election
// =============================================================================

/**
 * Leader election manager for coordinating actions across tabs.
 * Only one tab should perform certain operations (e.g., background sync).
 */
class LeaderElection {
  private broadcast: BroadcastManagerInstance;
  private readonly tabId: string;
  private readonly priority: number;
  private isLeader = false;
  private leaderTabId: string | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private electionTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly cleanups: CleanupFn[] = [];
  private readonly onLeaderChange?: (isLeader: boolean) => void;

  constructor(
    options: {
      channelName?: string;
      onLeaderChange?: (isLeader: boolean) => void;
    } = {}
  ) {
    this.onLeaderChange = options.onLeaderChange;
    this.broadcast = BroadcastManager.create(options.channelName ?? 'leader-election');
    this.tabId = this.broadcast.id;
    // Random priority with timestamp for tie-breaking
    this.priority = Date.now() + Math.random();

    this.setupListeners();
    this.startElection();
  }

  /**
   * Set up message listeners.
   */
  private setupListeners(): void {
    this.cleanups.push(
      this.broadcast.on<LeaderMessage>('leader', (msg) => {
        this.handleLeaderMessage(msg);
      })
    );

    // Handle tab visibility changes
    if (typeof document !== 'undefined') {
      const handleVisibilityChange = (): void => {
        if (document.visibilityState === 'visible' && !this.isLeader) {
          this.queryLeader();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      this.cleanups.push(() => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      });
    }
  }

  /**
   * Handle leader messages.
   */
  private handleLeaderMessage(msg: BroadcastMessage<LeaderMessage>): void {
    const { action, priority } = msg.payload;

    switch (action) {
      case 'claim':
        // Another tab is claiming leadership
        if (this.isLeader && this.priority > priority) {
          // We have higher priority, reclaim
          this.claimLeadership();
        } else if (this.priority < priority) {
          // They have higher priority
          this.acceptNewLeader(msg.senderId);
        }
        break;

      case 'heartbeat':
        // Leader is still alive
        this.leaderTabId = msg.senderId;
        this.resetElectionTimeout();
        break;

      case 'release':
        // Leader is stepping down
        if (msg.senderId === this.leaderTabId) {
          this.leaderTabId = null;
          this.startElection();
        }
        break;

      case 'query':
        // New tab is asking who the leader is
        if (this.isLeader) {
          this.sendHeartbeat();
        }
        break;
    }
  }

  /**
   * Start an election.
   */
  private startElection(): void {
    console.log('[Leader] Starting election...');

    // Wait a random time before claiming to avoid collisions
    const delay = Math.random() * 500 + 100;

    this.electionTimeout = setTimeout(() => {
      if (!this.leaderTabId) {
        this.claimLeadership();
      }
    }, delay);
  }

  /**
   * Claim leadership.
   */
  private claimLeadership(): void {
    this.isLeader = true;
    this.leaderTabId = this.tabId;

    this.broadcast.send<LeaderMessage>('leader', {
      action: 'claim',
      priority: this.priority,
    });

    this.startHeartbeat();
    this.onLeaderChange?.(true);
    console.log('[Leader] This tab is now the leader');
  }

  /**
   * Accept a new leader.
   */
  private acceptNewLeader(newLeaderId: string): void {
    if (this.isLeader) {
      this.isLeader = false;
      this.stopHeartbeat();
      this.onLeaderChange?.(false);
      console.log('[Leader] Stepped down, new leader:', newLeaderId);
    }
    this.leaderTabId = newLeaderId;
    this.resetElectionTimeout();
  }

  /**
   * Query who the current leader is.
   */
  private queryLeader(): void {
    this.broadcast.send<LeaderMessage>('leader', {
      action: 'query',
      priority: this.priority,
    });
  }

  /**
   * Start sending heartbeats.
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 2000);
  }

  /**
   * Send a heartbeat.
   */
  private sendHeartbeat(): void {
    this.broadcast.send<LeaderMessage>('leader', {
      action: 'heartbeat',
      priority: this.priority,
    });
  }

  /**
   * Stop sending heartbeats.
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Reset the election timeout.
   */
  private resetElectionTimeout(): void {
    if (this.electionTimeout) {
      clearTimeout(this.electionTimeout);
    }

    // If we don't hear from the leader in 5 seconds, start a new election
    this.electionTimeout = setTimeout(() => {
      console.log('[Leader] Leader timeout, starting new election');
      this.leaderTabId = null;
      this.startElection();
    }, 5000);
  }

  /**
   * Check if this tab is the leader.
   */
  isLeaderTab(): boolean {
    return this.isLeader;
  }

  /**
   * Get the current leader's tab ID.
   */
  getLeaderId(): string | null {
    return this.leaderTabId;
  }

  /**
   * Voluntarily release leadership.
   */
  release(): void {
    if (this.isLeader) {
      this.broadcast.send<LeaderMessage>('leader', {
        action: 'release',
        priority: this.priority,
      });
      this.isLeader = false;
      this.stopHeartbeat();
      this.onLeaderChange?.(false);
      console.log('[Leader] Released leadership');
    }
  }

  /**
   * Cleanup.
   */
  destroy(): void {
    this.release();

    if (this.electionTimeout) {
      clearTimeout(this.electionTimeout);
    }

    for (const cleanup of this.cleanups) {
      cleanup();
    }

    this.broadcast.close();
    console.log('[Leader] Destroyed');
  }
}

// =============================================================================
// Notification Aggregator
// =============================================================================

/**
 * Aggregate notifications across tabs to avoid duplicates.
 */
class NotificationAggregator {
  private broadcast: BroadcastManagerInstance;
  private readonly shownNotifications = new Set<string>();
  private readonly cleanups: CleanupFn[] = [];

  constructor(channelName = 'notifications') {
    this.broadcast = BroadcastManager.create(channelName);
    this.setupListeners();
  }

  private setupListeners(): void {
    // Listen for notifications shown by other tabs
    this.cleanups.push(
      this.broadcast.on<{ id: string }>('notification:shown', (msg) => {
        this.shownNotifications.add(msg.payload.id);
      })
    );

    // Listen for notification dismissed
    this.cleanups.push(
      this.broadcast.on<{ id: string }>('notification:dismissed', (msg) => {
        this.shownNotifications.delete(msg.payload.id);
      })
    );
  }

  /**
   * Show a notification if not already shown by another tab.
   */
  show(id: string, title: string, options?: NotificationOptions): boolean {
    // Check if already shown
    if (this.shownNotifications.has(id)) {
      console.log(`[Notifications] Skipping duplicate: ${id}`);
      return false;
    }

    // Mark as shown and broadcast
    this.shownNotifications.add(id);
    this.broadcast.send('notification:shown', { id });

    // Show the notification
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      const notification = new Notification(title, options);
      notification.addEventListener('close', () => {
        this.dismiss(id);
      });
    }

    console.log(`[Notifications] Shown: ${id}`);
    return true;
  }

  /**
   * Dismiss a notification.
   */
  dismiss(id: string): void {
    if (this.shownNotifications.has(id)) {
      this.shownNotifications.delete(id);
      this.broadcast.send('notification:dismissed', { id });
      console.log(`[Notifications] Dismissed: ${id}`);
    }
  }

  /**
   * Cleanup.
   */
  destroy(): void {
    for (const cleanup of this.cleanups) {
      cleanup();
    }
    this.broadcast.close();
  }
}

// =============================================================================
// Run Examples
// =============================================================================

/**
 * Run all broadcast sync examples.
 */
export function runBroadcastExamples(): { cleanup: () => void } {
  console.log('=== Broadcast Channel Sync Examples ===\n');

  if (!checkBroadcastSupport()) {
    console.log('\nBroadcast Channel is not supported. Examples will not run.');
    return { cleanup: () => {} };
  }

  // Basic example
  const basicBroadcast = basicBroadcastExample();

  // State sync example
  console.log('\n--- State Synchronization ---');
  const stateSync = new StateSyncManager({
    initialState: {
      theme: 'light',
      language: 'en',
      sidebarOpen: true,
      notificationsEnabled: true,
    },
    onStateChange: (state, key) => {
      console.log(`[App] State changed - ${key}:`, state[key]);
    },
  });

  // Session sync example
  console.log('\n--- Session Synchronization ---');
  const sessionSync = new SessionSyncManager({
    onSessionChange: (session, event) => {
      if (session) {
        console.log(`[App] Session ${event}: ${session.username}`);
      } else {
        console.log(`[App] Session ${event}`);
      }
    },
  });

  // Leader election example
  console.log('\n--- Leader Election ---');
  const leaderElection = new LeaderElection({
    onLeaderChange: (isLeader) => {
      if (isLeader) {
        console.log('[App] This tab is now performing leader duties');
      } else {
        console.log('[App] This tab is a follower');
      }
    },
  });

  // Notification aggregator example
  console.log('\n--- Notification Aggregator ---');
  const notifications = new NotificationAggregator();

  console.log('\n=== Broadcast Examples Active ===');
  console.log('Open this page in another tab to see synchronization');

  // Demo: Update some state after a delay
  setTimeout(() => {
    console.log('\n[Demo] Updating theme to dark...');
    stateSync.update('theme', 'dark');
  }, 2000);

  return {
    cleanup: (): void => {
      basicBroadcast.cleanup();
      stateSync.destroy();
      sessionSync.destroy();
      leaderElection.destroy();
      notifications.destroy();
      console.log('\n=== Broadcast Examples Cleaned Up ===');
    },
  };
}

// Export for external use
export {
  StateSyncManager,
  SessionSyncManager,
  LeaderElection,
  NotificationAggregator,
  type AppState,
  type UserSession,
  type StateUpdatePayload,
  type SessionEventPayload,
};

// Uncomment to run directly
// runBroadcastExamples();
