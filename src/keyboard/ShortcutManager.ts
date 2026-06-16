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
 * Shortcut handler.
 *
 * Receives the originating {@link KeyboardEvent}. Return `false` to decline the
 * key: the manager then skips `preventDefault`/`stopPropagation`, leaves the
 * event for other listeners, and (with `once`) keeps the handler registered —
 * the shortcut behaves as if it had not matched this time. Any other return
 * value (incl. `undefined`) consumes the key per the handler options.
 *
 * The return type is `unknown` rather than `void | boolean` so existing
 * value-returning handlers (e.g. `async`/Promise-returning) stay assignable;
 * only a literal `false` declines.
 */
export type ShortcutHandler = (event: KeyboardEvent) => unknown;

/**
 * Determine whether an event target is an editable element: `<input>`,
 * `<textarea>`, `<select>`, or an element inside a `[contenteditable]` host
 * (nested elements included; `contenteditable="false"` does not count).
 */
function isEditableTarget(target: EventTarget | null): boolean {
  // Element (not HTMLElement) so e.g. an SVG inside a contenteditable host counts.
  if (!(target instanceof Element)) {
    return false;
  }

  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    return true;
  }

  // contenteditable is an enumerated attribute; its value is case-insensitive.
  const editableHost = target.closest('[contenteditable]');
  return (
    editableHost !== null && editableHost.getAttribute('contenteditable')?.toLowerCase() !== 'false'
  );
}

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

  /**
   * Skip the shortcut when the event target is an editable element
   * (`<input>`, `<textarea>`, `<select>`, or a `[contenteditable]` host incl.
   * nested elements). The handler is not called and the key is left untouched.
   * Enable this for app-wide bare-key shortcuts so they don't fire while typing.
   * @default false
   */
  readonly ignoreEditableTargets?: boolean;
}

import type { CleanupFn } from '../core/index.js';

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
    handler: ShortcutHandler,
    options: ShortcutHandlerOptions = {}
  ): CleanupFn {
    const kbd = shortcut instanceof KeyboardShortcut ? shortcut : KeyboardShortcut.create(shortcut);

    const {
      preventDefault = true,
      stopPropagation = false,
      stopImmediatePropagation = false,
      capture = false,
      once = false,
      ignoreEditableTargets = false,
    } = options;

    let isActive = true;

    const listener = (event: KeyboardEvent): void => {
      if (!isActive || !kbd.matches(event)) {
        return;
      }
      if (ignoreEditableTargets && isEditableTarget(event.target)) {
        return;
      }

      // Run the handler first so it can decline the key by returning false.
      if (handler(event) === false) {
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
  onEscape(handler: ShortcutHandler): CleanupFn {
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
  onEnter(handler: ShortcutHandler, options: ShortcutHandlerOptions = {}): CleanupFn {
    return ShortcutManager.on(KeyboardShortcut.enter(), handler, options);
  },

  /**
   * Create a handler group for easy bulk cleanup.
   *
   * Pass `defaultOptions` to apply them to every shortcut added to the group
   * (per-`add` options take precedence). Use this to opt an app-wide shortcut
   * surface into editable-target skipping once instead of per shortcut.
   *
   * @example
   * ```TypeScript
   * const group = ShortcutManager.createGroup({ ignoreEditableTargets: true });
   * group.add(KeyboardShortcut.key('r'), rotate);   // skipped while typing
   * group.add(KeyboardShortcut.ctrlKey('s'), save);
   *
   * // Later: cleanup all at once
   * group.cleanup();
   * ```
   */
  createGroup(defaultOptions?: ShortcutHandlerOptions): ShortcutGroup {
    return new ShortcutGroup(defaultOptions);
  },
};

/**
 * Group of shortcuts for bulk management.
 */
export class ShortcutGroup {
  private readonly cleanups: CleanupFn[] = [];

  /**
   * @param defaultOptions - Options applied to every {@link add} call
   *   (per-`add` options take precedence). Does not affect {@link addEscape}.
   */
  constructor(private readonly defaultOptions: ShortcutHandlerOptions = {}) {}

  /**
   * Add a shortcut to this group. Group `defaultOptions` apply unless overridden
   * by `options`.
   */
  add(
    shortcut: KeyboardShortcut | ShortcutDefinition,
    handler: ShortcutHandler,
    options?: ShortcutHandlerOptions
  ): this {
    this.cleanups.push(
      ShortcutManager.on(shortcut, handler, { ...this.defaultOptions, ...options })
    );
    return this;
  }

  /**
   * Add an Escape handler to this group. Deliberately exempt from the group's
   * `defaultOptions` (e.g. `ignoreEditableTargets`) so Escape still fires while
   * focus is in an input — the common "close modal while typing" case.
   */
  addEscape(handler: ShortcutHandler): this {
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
