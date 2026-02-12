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
}

export class KeyboardShortcut {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
  readonly metaKey: boolean;

  private constructor(def: Required<ShortcutDefinition>) {
    this.key = def.key;
    this.ctrlKey = def.ctrlKey;
    this.shiftKey = def.shiftKey;
    this.altKey = def.altKey;
    this.metaKey = def.metaKey;
  }

  // =========================================================================
  // Factory Methods
  // =========================================================================

  /**
   * Create a custom shortcut.
   */
  static create(def: ShortcutDefinition): KeyboardShortcut {
    return new KeyboardShortcut({
      key: def.key,
      ctrlKey: def.ctrlKey ?? false,
      shiftKey: def.shiftKey ?? false,
      altKey: def.altKey ?? false,
      metaKey: def.metaKey ?? false,
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

    if (this.ctrlKey) {
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
    if (this.metaKey) {
      parts.push('⌘');
    }

    parts.push(this.key.length === 1 ? this.key.toUpperCase() : this.key);

    return parts.join('');
  }
}
