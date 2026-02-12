// noinspection JSUnusedGlobalSymbols,JSUnusedLocalSymbols - Example file

/**
 * WebSocket Chat Example
 *
 * Demonstrates a real-time chat application using WebSocketManager with:
 * - Automatic reconnection with exponential backoff
 * - Message queuing during disconnections
 * - Connection state management
 * - Type-safe message handling
 * - Heartbeat/ping-pong for connection health
 *
 * @example
 * This example creates a chat client that maintains a persistent
 * connection to a WebSocket server, automatically reconnects on
 * disconnection, and provides a clean API for sending/receiving messages.
 */

import { WebSocketManager, type WebSocketInstance, type ConnectionState } from '../src/websocket';
import type { CleanupFn } from '../src/core';

// ============================================================================
// Types
// ============================================================================

/** Chat message structure */
interface ChatMessage {
  readonly id: string;
  readonly type: 'message' | 'join' | 'leave' | 'typing';
  readonly userId: string;
  readonly username: string;
  readonly content?: string;
  readonly timestamp: number;
}

/** Server response envelope */
interface ServerResponse<T = unknown> {
  readonly type: string;
  readonly payload: T;
  readonly serverTime: number;
}

/** Chat room state */
interface ChatRoom {
  readonly id: string;
  readonly name: string;
  readonly users: ReadonlyArray<{ id: string; username: string }>;
}

// ============================================================================
// Chat Client Implementation
// ============================================================================

/**
 * Chat client that wraps WebSocketManager for real-time messaging.
 */
class ChatClient {
  private readonly ws: WebSocketInstance;
  private readonly cleanupFns: CleanupFn[] = [];
  private currentRoom: ChatRoom | null = null;
  private readonly userId: string;
  private readonly username: string;

  // Event callbacks
  private onMessageCallback?: (message: ChatMessage) => void;
  private onRoomUpdateCallback?: (room: ChatRoom) => void;
  private onStateChangeCallback?: (state: ConnectionState) => void;
  private onErrorCallback?: (error: string) => void;

  constructor(serverUrl: string, userId: string, username: string) {
    this.userId = userId;
    this.username = username;

    // Create WebSocket connection with auto-reconnection
    this.ws = WebSocketManager.create({
      url: serverUrl,

      // Enable automatic reconnection
      reconnect: true,
      maxReconnectAttempts: 10,

      // Exponential backoff: 1s, 1.5s, 2.25s, ... up to 30s
      reconnectDelay: 1000,
      maxReconnectDelay: 30000,
      reconnectMultiplier: 1.5,

      // Heartbeat every 30 seconds to detect stale connections
      heartbeatInterval: 30000,
      heartbeatMessage: () => ({
        type: 'ping',
        timestamp: Date.now(),
      }),

      // Queue messages while disconnected (up to 50)
      queueMessages: true,
      maxQueueSize: 50,
    });

    this.setupEventHandlers();
  }

  /**
   * Set up WebSocket event handlers.
   */
  private setupEventHandlers(): void {
    // Handle connection open
    const cleanupOpen = this.ws.onOpen(() => {
      console.log('[Chat] Connected to server');

      // Re-authenticate on reconnection
      this.authenticate();

      // Rejoin room if we were in one
      if (this.currentRoom) {
        this.joinRoom(this.currentRoom.id);
      }
    });
    this.cleanupFns.push(cleanupOpen);

    // Handle connection close
    const cleanupClose = this.ws.onClose((code, reason) => {
      console.log(`[Chat] Disconnected: ${code} - ${reason || 'No reason provided'}`);
    });
    this.cleanupFns.push(cleanupClose);

    // Handle errors
    const cleanupError = this.ws.onError(() => {
      const errorMsg = 'WebSocket connection error';
      console.error('[Chat]', errorMsg);
      this.onErrorCallback?.(errorMsg);
    });
    this.cleanupFns.push(cleanupError);

    // Handle incoming messages
    const cleanupMessage = this.ws.onMessage<ServerResponse>((data) => {
      this.handleServerMessage(data);
    });
    this.cleanupFns.push(cleanupMessage);

    // Handle state changes
    const cleanupState = this.ws.onStateChange((state) => {
      console.log(`[Chat] Connection state: ${state}`);
      this.onStateChangeCallback?.(state);
    });
    this.cleanupFns.push(cleanupState);
  }

  /**
   * Handle incoming server messages.
   */
  private handleServerMessage(response: ServerResponse): void {
    switch (response.type) {
      case 'message':
      case 'join':
      case 'leave':
      case 'typing':
        this.onMessageCallback?.(response.payload as ChatMessage);
        break;

      case 'room_update':
        this.currentRoom = response.payload as ChatRoom;
        this.onRoomUpdateCallback?.(this.currentRoom);
        break;

      case 'error':
        this.onErrorCallback?.(String(response.payload));
        break;

      case 'pong':
        // Heartbeat response - connection is healthy
        break;

      default:
        console.log('[Chat] Unknown message type:', response.type);
    }
  }

  /**
   * Send authentication message to server.
   */
  private authenticate(): void {
    this.ws.send({
      type: 'auth',
      payload: {
        userId: this.userId,
        username: this.username,
        token: this.getAuthToken(),
      },
    });
  }

  /**
   * Get authentication token (placeholder - implement your auth logic).
   */
  private getAuthToken(): string {
    // In a real app, get this from your auth system
    return `user_${this.userId}_token`;
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * Connect to the chat server.
   */
  connect(): void {
    this.ws.connect();
  }

  /**
   * Disconnect from the chat server.
   */
  disconnect(): void {
    // Leave room before disconnecting
    if (this.currentRoom) {
      this.leaveRoom();
    }

    // Close connection (prevents auto-reconnect)
    this.ws.close(1000, 'User disconnect');
  }

  /**
   * Join a chat room.
   */
  joinRoom(roomId: string): void {
    this.ws.send({
      type: 'join_room',
      payload: { roomId },
    });
  }

  /**
   * Leave the current chat room.
   */
  leaveRoom(): void {
    if (this.currentRoom) {
      this.ws.send({
        type: 'leave_room',
        payload: { roomId: this.currentRoom.id },
      });
      this.currentRoom = null;
    }
  }

  /**
   * Send a chat message.
   */
  sendMessage(content: string): boolean {
    if (!this.currentRoom) {
      console.warn('[Chat] Cannot send message: not in a room');
      return false;
    }

    return this.ws.send({
      type: 'message',
      payload: {
        roomId: this.currentRoom.id,
        content,
        timestamp: Date.now(),
      },
    });
  }

  /**
   * Send typing indicator.
   */
  sendTyping(isTyping: boolean): void {
    if (!this.currentRoom) return;

    this.ws.send({
      type: 'typing',
      payload: {
        roomId: this.currentRoom.id,
        isTyping,
      },
    });
  }

  /**
   * Get current connection state.
   */
  get connectionState(): ConnectionState {
    return this.ws.state;
  }

  /**
   * Get current reconnect attempt count.
   */
  get reconnectAttempts(): number {
    return this.ws.reconnectAttempts;
  }

  /**
   * Check if connected.
   */
  get isConnected(): boolean {
    return this.ws.state === 'connected';
  }

  /**
   * Get current room.
   */
  get room(): ChatRoom | null {
    return this.currentRoom;
  }

  // ==========================================================================
  // Event Registration
  // ==========================================================================

  /**
   * Register message handler.
   */
  onMessage(callback: (message: ChatMessage) => void): CleanupFn {
    this.onMessageCallback = callback;
    return () => {
      this.onMessageCallback = undefined;
    };
  }

  /**
   * Register room update handler.
   */
  onRoomUpdate(callback: (room: ChatRoom) => void): CleanupFn {
    this.onRoomUpdateCallback = callback;
    return () => {
      this.onRoomUpdateCallback = undefined;
    };
  }

  /**
   * Register state change handler.
   */
  onConnectionStateChange(callback: (state: ConnectionState) => void): CleanupFn {
    this.onStateChangeCallback = callback;
    return () => {
      this.onStateChangeCallback = undefined;
    };
  }

  /**
   * Register error handler.
   */
  onError(callback: (error: string) => void): CleanupFn {
    this.onErrorCallback = callback;
    return () => {
      this.onErrorCallback = undefined;
    };
  }

  /**
   * Clean up all resources.
   */
  destroy(): void {
    this.cleanupFns.forEach((cleanup) => cleanup());
    this.cleanupFns.length = 0;
    this.disconnect();
  }
}

// ============================================================================
// Usage Example
// ============================================================================

/**
 * Example: Simple chat UI integration
 */
function createChatUI(): void {
  // Create chat client
  const chat = new ChatClient('wss://chat.example.com/ws', 'user-123', 'Alice');

  // UI Elements (placeholders - replace with your actual DOM elements)
  const messagesContainer = document.getElementById('messages');
  const messageInput = document.getElementById('message-input') as HTMLInputElement;
  const sendButton = document.getElementById('send-button');
  const statusIndicator = document.getElementById('status');

  // Handle incoming messages
  chat.onMessage((message) => {
    if (!messagesContainer) return;

    const messageEl = document.createElement('div');
    messageEl.className = `message message-${message.type}`;

    switch (message.type) {
      case 'message':
        messageEl.innerHTML = `
          <strong>${message.username}:</strong>
          <span>${message.content}</span>
          <time>${new Date(message.timestamp).toLocaleTimeString()}</time>
        `;
        break;
      case 'join':
        messageEl.textContent = `${message.username} joined the room`;
        break;
      case 'leave':
        messageEl.textContent = `${message.username} left the room`;
        break;
      case 'typing':
        messageEl.textContent = `${message.username} is typing...`;
        messageEl.className += ' typing-indicator';
        break;
    }

    messagesContainer.appendChild(messageEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  });

  // Handle connection state changes
  chat.onConnectionStateChange((state) => {
    if (!statusIndicator) return;

    statusIndicator.className = `status status-${state}`;
    statusIndicator.textContent = {
      connecting: 'Connecting...',
      connected: 'Connected',
      disconnecting: 'Disconnecting...',
      disconnected: 'Disconnected',
      reconnecting: `Reconnecting (attempt ${chat.reconnectAttempts})...`,
    }[state];
  });

  // Handle errors
  chat.onError((error) => {
    console.error('Chat error:', error);
    // Show error notification to user
  });

  // Send message on button click
  sendButton?.addEventListener('click', () => {
    const content = messageInput?.value.trim();
    if (content) {
      if (chat.sendMessage(content)) {
        messageInput.value = '';
      }
    }
  });

  // Send message on Enter key
  messageInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendButton?.click();
    }
  });

  // Send typing indicator
  let typingTimeout: ReturnType<typeof setTimeout> | null = null;
  messageInput?.addEventListener('input', () => {
    chat.sendTyping(true);

    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    typingTimeout = setTimeout(() => {
      chat.sendTyping(false);
    }, 1000);
  });

  // Connect and join room
  chat.connect();
  chat.joinRoom('general');

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    chat.destroy();
  });
}

// Initialize when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createChatUI);
  } else {
    createChatUI();
  }
}

export { ChatClient, type ChatMessage, type ChatRoom };
