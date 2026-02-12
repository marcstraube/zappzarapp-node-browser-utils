/**
 * Core type definitions shared across all modules.
 */

/**
 * Function that cleans up resources (removes listeners, timers, etc.).
 * Returned by functions that register listeners or allocate resources.
 */
export type CleanupFn = () => void;
