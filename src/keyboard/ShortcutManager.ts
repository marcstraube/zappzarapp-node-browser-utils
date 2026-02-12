/**
 * Keyboard Shortcut Manager.
 *
 * Manages keyboard shortcuts with automatic cleanup.
 * Provides a clean API for registering and unregistering shortcuts.
 *
 * @example
 * ```TypeScript
 * // Register shortcuts
 * const cleanup1 = ShortcutManager.on(KeyboardShortcut.escape(), () => closeModal());
 * const cleanup2 = ShortcutManager.on(KeyboardShortcut.ctrlKey('s'), () => save());
 *
 * // Cleanup when done
 * cleanup1();
 * cleanup2();
 *
 * // One-time escape handler (auto-cleanup)
 * ShortcutManager.onEscape(() => closeModal());
 *
 * // Prevent default behavior
 * ShortcutManager.on(shortcut, handler, { preventDefault: true });
 * ```
 */
import { KeyboardShortcut, type ShortcutDefinition } from './KeyboardShortcut.js';

/**
 * Options for shortcut handlers.
 */
export interface ShortcutHandlerOptions {
  /**
   * Prevent default browser behavior when shortcut matches.
   * @default true
   */
  readonly preventDefault?: boolean;

  /**
   * Stop event propagation when shortcut matches.
   * @default false
   */
  readonly stopPropagation?: boolean;

  /**
   * Stop immediate propagation when shortcut matches.
   * @default false
   */
  readonly stopImmediatePropagation?: boolean;

  /**
   * Use capture phase for event listener.
   * @default false
   */
  readonly capture?: boolean;

  /**
   * Remove handler after first trigger.
   * @default false
   */
  readonly once?: boolean;
}

import type { CleanupFn } from '../core';

export const ShortcutManager = {
  /**
   * Register a keyboard shortcut handler.
   *
   * @param shortcut - Shortcut to listen for
   * @param handler - Function to call when shortcut is triggered
   * @param options - Handler options
   * @returns Cleanup function to remove the handler
   */
  on(
    shortcut: KeyboardShortcut | ShortcutDefinition,
    handler: () => void,
    options: ShortcutHandlerOptions = {}
  ): CleanupFn {
    const kbd = shortcut instanceof KeyboardShortcut ? shortcut : KeyboardShortcut.create(shortcut);

    const {
      preventDefault = true,
      stopPropagation = false,
      stopImmediatePropagation = false,
      capture = false,
      once = false,
    } = options;

    let isActive = true;

    const listener = (event: KeyboardEvent): void => {
      if (!isActive || !kbd.matches(event)) {
        return;
      }

      if (preventDefault) {
        event.preventDefault();
      }
      if (stopPropagation) {
        event.stopPropagation();
      }
      if (stopImmediatePropagation) {
        event.stopImmediatePropagation();
      }

      handler();

      if (once) {
        cleanup();
      }
    };

    const cleanup = (): void => {
      isActive = false;
      document.removeEventListener('keydown', listener, capture);
    };

    document.addEventListener('keydown', listener, capture);

    return cleanup;
  },

  /**
   * Register an Escape key handler that auto-removes after trigger.
   * Uses capture phase and stops propagation.
   *
   * @param handler - Function to call when Escape is pressed
   * @returns Cleanup function
   */
  onEscape(handler: () => void): CleanupFn {
    return ShortcutManager.on(KeyboardShortcut.escape(), handler, {
      capture: true,
      stopImmediatePropagation: true,
      once: true,
    });
  },

  /**
   * Register an Enter key handler.
   *
   * @param handler - Function to call when Enter is pressed
   * @param options - Handler options
   * @returns Cleanup function
   */
  onEnter(handler: () => void, options: ShortcutHandlerOptions = {}): CleanupFn {
    return ShortcutManager.on(KeyboardShortcut.enter(), handler, options);
  },

  /**
   * Create a handler group for easy bulk cleanup.
   *
   * @example
   * ```TypeScript
   * const group = ShortcutManager.createGroup();
   * group.add(KeyboardShortcut.escape(), closeModal);
   * group.add(KeyboardShortcut.ctrlKey('s'), save);
   *
   * // Later: cleanup all at once
   * group.cleanup();
   * ```
   */
  createGroup(): ShortcutGroup {
    return new ShortcutGroup();
  },
};

/**
 * Group of shortcuts for bulk management.
 */
export class ShortcutGroup {
  private readonly cleanups: CleanupFn[] = [];

  /**
   * Add a shortcut to this group.
   */
  add(
    shortcut: KeyboardShortcut | ShortcutDefinition,
    handler: () => void,
    options?: ShortcutHandlerOptions
  ): this {
    this.cleanups.push(ShortcutManager.on(shortcut, handler, options));
    return this;
  }

  /**
   * Add an Escape handler to this group.
   */
  addEscape(handler: () => void): this {
    this.cleanups.push(ShortcutManager.onEscape(handler));
    return this;
  }

  /**
   * Remove all shortcuts in this group.
   */
  cleanup(): void {
    for (const fn of this.cleanups) {
      fn();
    }
    this.cleanups.length = 0;
  }

  /**
   * Get number of active shortcuts.
   */
  get size(): number {
    return this.cleanups.length;
  }
}
