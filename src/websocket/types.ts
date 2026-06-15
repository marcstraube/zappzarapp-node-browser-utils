/**
 * Shared type definitions for the WebSocket module.
 *
 * Extracted so transports and the manager can share them without importing each
 * other (avoids a circular dependency between the manager and its transports).
 */

/**
 * Binary type for WebSocket.
 */
export type BinaryType = 'blob' | 'arraybuffer';

/**
 * Binary data types that can be sent via WebSocket.
 */
export type BinaryData = ArrayBuffer | ArrayBufferView | Blob;

/**
 * WebSocket connection states.
 */
export type ConnectionState =
  | 'connecting'
  | 'connected'
  | 'disconnecting'
  | 'disconnected'
  | 'reconnecting';
