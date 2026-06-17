/**
 * Keyboard Shortcut Value Object.
 *
 * Immutable representation of a keyboard shortcut.
 * Provides type-safe shortcut definition and matching.
 *
 * @example
 * ```TypeScript
 * // Factory methods
 * const save = KeyboardShortcut.ctrlKey('s');
 * const devTools = KeyboardShortcut.ctrlShift('d');
 * const help = KeyboardShortcut.key('F1');
 *
 * // Custom
 * const custom = KeyboardShortcut.create({ key: 'k', ctrlKey: true, altKey: true });
 *
 * // Check if event matches
 * if (shortcut.matches(event)) {
 *   handleShortcut();
 * }
 * ```
 */

/**
 * Shortcut definition.
 */
export interface ShortcutDefinition {
  /** Key to match (case-insensitive for letters) */
  readonly key: string;
  /** Require Ctrl key */
  readonly ctrlKey?: boolean;
  /** Require Shift key */
  readonly shiftKey?: boolean;
  /** Require Alt key */
  readonly altKey?: boolean;
  /** Require Meta key (Cmd on Mac) */
  readonly metaKey?: boolean;
  /**
   * Match when **either** Ctrl or Meta is held (other modifiers still exact).
   * Supersedes `ctrlKey`/`metaKey`. Express "Cmd-or-Ctrl+Z" with one shortcut.
   */
  readonly cmdOrCtrl?: boolean;
}

export class KeyboardShortcut {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
  readonly metaKey: boolean;
  readonly cmdOrCtrl: boolean;

  private constructor(def: Required<ShortcutDefinition>) {
    this.key = def.key;
    this.ctrlKey = def.ctrlKey;
    this.shiftKey = def.shiftKey;
    this.altKey = def.altKey;
    this.metaKey = def.metaKey;
    this.cmdOrCtrl = def.cmdOrCtrl;
  }

  // =========================================================================
  // Factory Methods
  // =========================================================================

  /**
   * Create a custom shortcut.
   */
  static create(def: ShortcutDefinition): KeyboardShortcut {
    const cmdOrCtrl = def.cmdOrCtrl ?? false;
    return new KeyboardShortcut({
      key: def.key,
      // cmdOrCtrl supersedes ctrlKey/metaKey; force them off to keep state consistent.
      ctrlKey: cmdOrCtrl ? false : (def.ctrlKey ?? false),
      shiftKey: def.shiftKey ?? false,
      altKey: def.altKey ?? false,
      metaKey: cmdOrCtrl ? false : (def.metaKey ?? false),
      cmdOrCtrl,
    });
  }

  /**
   * Create a simple key shortcut (no modifiers).
   */
  static key(key: string): KeyboardShortcut {
    return KeyboardShortcut.create({ key });
  }

  /**
   * Create Ctrl+Key shortcut.
   */
  static ctrlKey(key: string): KeyboardShortcut {
    return KeyboardShortcut.create({ key, ctrlKey: true });
  }

  /**
   * Create Ctrl+Shift+Key shortcut.
   */
  static ctrlShift(key: string): KeyboardShortcut {
    return KeyboardShortcut.create({ key, ctrlKey: true, shiftKey: true });
  }

  /**
   * Create Alt+Key shortcut.
   */
  static altKey(key: string): KeyboardShortcut {
    return KeyboardShortcut.create({ key, altKey: true });
  }

  /**
   * Create Meta+Key shortcut (Cmd on Mac).
   */
  static metaKey(key: string): KeyboardShortcut {
    return KeyboardShortcut.create({ key, metaKey: true });
  }

  /**
   * Create a shortcut that matches Ctrl+Key **or** Cmd+Key.
   * One registration for cross-platform actions like undo (`cmdOrCtrl('z')`).
   */
  static cmdOrCtrl(key: string): KeyboardShortcut {
    return KeyboardShortcut.create({ key, cmdOrCtrl: true });
  }

  /**
   * Create a shortcut that matches Ctrl+Shift+Key **or** Cmd+Shift+Key.
   * One registration for actions like redo (`cmdOrCtrlShift('z')`).
   */
  static cmdOrCtrlShift(key: string): KeyboardShortcut {
    return KeyboardShortcut.create({ key, cmdOrCtrl: true, shiftKey: true });
  }

  /**
   * Create Escape key shortcut.
   */
  static escape(): KeyboardShortcut {
    return KeyboardShortcut.create({ key: 'Escape' });
  }

  /**
   * Create Enter key shortcut.
   */
  static enter(): KeyboardShortcut {
    return KeyboardShortcut.create({ key: 'Enter' });
  }

  // =========================================================================
  // Matching
  // =========================================================================

  /**
   * Check if a keyboard event matches this shortcut.
   */
  matches(event: KeyboardEvent): boolean {
    // Case-insensitive key matching for letters
    const keyMatches =
      event.key.length === 1
        ? event.key.toUpperCase() === this.key.toUpperCase()
        : event.key === this.key;

    if (this.cmdOrCtrl) {
      // Exactly one of Ctrl/Meta — holding both is a different chord and must not
      // match, preserving the library's exact-modifier guarantee.
      return (
        keyMatches &&
        event.ctrlKey !== event.metaKey &&
        event.shiftKey === this.shiftKey &&
        event.altKey === this.altKey
      );
    }

    return (
      keyMatches &&
      event.ctrlKey === this.ctrlKey &&
      event.shiftKey === this.shiftKey &&
      event.altKey === this.altKey &&
      event.metaKey === this.metaKey
    );
  }

  // =========================================================================
  // Display
  // =========================================================================

  /**
   * Get human-readable representation.
   */
  toString(): string {
    const parts: string[] = [];

    // cmdOrCtrl renders in this method's non-Mac flavor (Ctrl); toMacString shows Cmd.
    if (this.ctrlKey || this.cmdOrCtrl) {
      parts.push('Ctrl');
    }
    if (this.altKey) {
      parts.push('Alt');
    }
    if (this.shiftKey) {
      parts.push('Shift');
    }
    if (this.metaKey) {
      parts.push('Cmd');
    }

    parts.push(this.key.length === 1 ? this.key.toUpperCase() : this.key);

    return parts.join('+');
  }

  /**
   * Get Mac-style representation.
   */
  toMacString(): string {
    const parts: string[] = [];

    if (this.ctrlKey) {
      parts.push('⌃');
    }
    if (this.altKey) {
      parts.push('⌥');
    }
    if (this.shiftKey) {
      parts.push('⇧');
    }
    // cmdOrCtrl renders as Cmd in the Mac flavor; toString shows Ctrl.
    if (this.metaKey || this.cmdOrCtrl) {
      parts.push('⌘');
    }

    parts.push(this.key.length === 1 ? this.key.toUpperCase() : this.key);

    return parts.join('');
  }
}
