// noinspection JSUnusedGlobalSymbols,JSUnusedLocalSymbols - Example file

/**
 * Keyboard Shortcuts Example - Shortcut registration and management
 *
 * This example demonstrates:
 * - Registering keyboard shortcuts
 * - Using predefined shortcut patterns
 * - Creating custom key combinations
 * - Grouping shortcuts for bulk cleanup
 * - Modal/dialog escape handling
 * - Preventing default browser behavior
 *
 * @packageDocumentation
 */

import { type CleanupFn } from '@zappzarapp/browser-utils/core';
import {
  KeyboardShortcut,
  ShortcutManager,
  ShortcutGroup,
  type ShortcutHandlerOptions,
} from '@zappzarapp/browser-utils/keyboard';

// =============================================================================
// Basic Shortcut Registration
// =============================================================================

/**
 * Register a single keyboard shortcut.
 */
function basicShortcutExample(): CleanupFn {
  console.log('--- Basic Shortcut ---');

  // Create a Ctrl+S shortcut for saving
  const saveShortcut = KeyboardShortcut.ctrlKey('s');

  // Register the handler
  const cleanup = ShortcutManager.on(saveShortcut, () => {
    console.log('Save triggered!');
    // Your save logic here...
    saveDocument();
  });

  console.log(`Registered: ${saveShortcut.toString()}`); // "Ctrl+S"
  console.log(`Mac style: ${saveShortcut.toMacString()}`); // "^S"

  return cleanup;
}

/**
 * Example save function.
 */
function saveDocument(): void {
  console.log('Document saved!');
}

// =============================================================================
// Predefined Shortcut Patterns
// =============================================================================

/**
 * Use factory methods for common shortcuts.
 */
function predefinedShortcutsExample(): CleanupFn[] {
  console.log('\n--- Predefined Shortcuts ---');

  const cleanups: CleanupFn[] = [];

  // Ctrl+Key shortcuts
  cleanups.push(
    ShortcutManager.on(KeyboardShortcut.ctrlKey('n'), () => {
      console.log('New document');
    })
  );

  cleanups.push(
    ShortcutManager.on(KeyboardShortcut.ctrlKey('o'), () => {
      console.log('Open document');
    })
  );

  cleanups.push(
    ShortcutManager.on(KeyboardShortcut.ctrlKey('p'), () => {
      console.log('Print document');
    })
  );

  // Ctrl+Shift+Key shortcuts
  cleanups.push(
    ShortcutManager.on(KeyboardShortcut.ctrlShift('s'), () => {
      console.log('Save As...');
    })
  );

  cleanups.push(
    ShortcutManager.on(KeyboardShortcut.ctrlShift('z'), () => {
      console.log('Redo');
    })
  );

  // Alt+Key shortcuts
  cleanups.push(
    ShortcutManager.on(KeyboardShortcut.altKey('f'), () => {
      console.log('Open File menu');
    })
  );

  // Simple key (no modifiers)
  cleanups.push(
    ShortcutManager.on(KeyboardShortcut.key('F1'), () => {
      console.log('Show help');
    })
  );

  cleanups.push(
    ShortcutManager.on(KeyboardShortcut.key('F11'), () => {
      console.log('Toggle fullscreen');
    })
  );

  return cleanups;
}

// =============================================================================
// Custom Key Combinations
// =============================================================================

/**
 * Create custom key combinations.
 */
function customShortcutsExample(): CleanupFn[] {
  console.log('\n--- Custom Shortcuts ---');

  const cleanups: CleanupFn[] = [];

  // Ctrl+Alt+Key
  cleanups.push(
    ShortcutManager.on(KeyboardShortcut.create({ key: 'd', ctrlKey: true, altKey: true }), () => {
      console.log('Developer tools');
    })
  );

  // Ctrl+Shift+Alt+Key (complex combination)
  cleanups.push(
    ShortcutManager.on(
      KeyboardShortcut.create({
        key: 'r',
        ctrlKey: true,
        shiftKey: true,
        altKey: true,
      }),
      () => {
        console.log('Super refresh!');
      }
    )
  );

  // Meta key (Cmd on Mac)
  cleanups.push(
    ShortcutManager.on(KeyboardShortcut.metaKey('k'), () => {
      console.log('Quick command palette');
    })
  );

  // Arrow keys
  cleanups.push(
    ShortcutManager.on(KeyboardShortcut.create({ key: 'ArrowLeft', ctrlKey: true }), () => {
      console.log('Navigate previous');
    })
  );

  cleanups.push(
    ShortcutManager.on(KeyboardShortcut.create({ key: 'ArrowRight', ctrlKey: true }), () => {
      console.log('Navigate next');
    })
  );

  return cleanups;
}

// =============================================================================
// Shortcut Groups
// =============================================================================

/**
 * Use ShortcutGroup for organized shortcut management.
 */
function shortcutGroupExample(): ShortcutGroup {
  console.log('\n--- Shortcut Groups ---');

  // Create a group for editor shortcuts
  const editorGroup = ShortcutManager.createGroup();

  // Add shortcuts to the group (fluent API)
  editorGroup
    .add(KeyboardShortcut.ctrlKey('b'), () => {
      console.log('Toggle bold');
    })
    .add(KeyboardShortcut.ctrlKey('i'), () => {
      console.log('Toggle italic');
    })
    .add(KeyboardShortcut.ctrlKey('u'), () => {
      console.log('Toggle underline');
    })
    .add(KeyboardShortcut.ctrlShift('x'), () => {
      console.log('Toggle strikethrough');
    });

  console.log(`Editor group has ${editorGroup.size} shortcuts`);

  // Group can be cleaned up all at once
  // editorGroup.cleanup();

  return editorGroup;
}

/**
 * Multiple groups for different contexts.
 */
function multipleGroupsExample(): { navigation: ShortcutGroup; editing: ShortcutGroup } {
  // Navigation shortcuts
  const navigation = ShortcutManager.createGroup();
  navigation
    .add(KeyboardShortcut.ctrlKey('Home'), () => console.log('Go to top'))
    .add(KeyboardShortcut.ctrlKey('End'), () => console.log('Go to bottom'))
    .add(KeyboardShortcut.key('PageUp'), () => console.log('Page up'))
    .add(KeyboardShortcut.key('PageDown'), () => console.log('Page down'));

  // Editing shortcuts
  const editing = ShortcutManager.createGroup();
  editing
    .add(KeyboardShortcut.ctrlKey('c'), () => console.log('Copy'))
    .add(KeyboardShortcut.ctrlKey('v'), () => console.log('Paste'))
    .add(KeyboardShortcut.ctrlKey('x'), () => console.log('Cut'))
    .add(KeyboardShortcut.ctrlKey('z'), () => console.log('Undo'));

  return { navigation, editing };
}

// =============================================================================
// Modal/Dialog Escape Handling
// =============================================================================

/**
 * Handle Escape key for modals.
 * Uses capture phase and auto-cleanup after first trigger.
 */
function modalEscapeExample(): void {
  console.log('\n--- Modal Escape Handling ---');

  // Simulated modal state
  let isModalOpen = false;

  function openModal(): void {
    console.log('Modal opened');
    isModalOpen = true;

    // Register escape handler (auto-removes after trigger)
    ShortcutManager.onEscape(() => {
      closeModal();
    });
  }

  function closeModal(): void {
    console.log('Modal closed via Escape');
    isModalOpen = false;
  }

  // Example: Open modal with Ctrl+M
  ShortcutManager.on(KeyboardShortcut.ctrlKey('m'), () => {
    if (!isModalOpen) {
      openModal();
    }
  });
}

/**
 * Nested modal handling with proper escape order.
 */
export function nestedModalsExample(): void {
  const modalStack: string[] = [];

  function openModal(name: string): void {
    console.log(`Opening modal: ${name}`);
    modalStack.push(name);

    // Each modal registers its own escape handler
    // Uses capture phase + stopImmediatePropagation to prevent outer handlers
    ShortcutManager.onEscape(() => {
      const closed = modalStack.pop();
      console.log(`Closed modal: ${closed}`);

      if (modalStack.length > 0) {
        // Re-register escape for the now-top modal
        registerEscapeForTopModal();
      }
    });
  }

  function registerEscapeForTopModal(): void {
    if (modalStack.length > 0) {
      ShortcutManager.onEscape(() => {
        const closed = modalStack.pop();
        console.log(`Closed modal: ${closed}`);
        if (modalStack.length > 0) {
          registerEscapeForTopModal();
        }
      });
    }
  }

  // Example usage
  openModal('Settings');
  openModal('Confirm Dialog');
  // Press Escape -> closes "Confirm Dialog"
  // Press Escape -> closes "Settings"
}

// =============================================================================
// Shortcut Handler Options
// =============================================================================

/**
 * Configure shortcut behavior with options.
 */
function shortcutOptionsExample(): CleanupFn[] {
  console.log('\n--- Shortcut Options ---');

  const cleanups: CleanupFn[] = [];

  // Prevent default browser behavior (default: true)
  cleanups.push(
    ShortcutManager.on(
      KeyboardShortcut.ctrlKey('s'),
      () => {
        console.log('Custom save (browser save dialog prevented)');
      },
      { preventDefault: true }
    )
  );

  // Allow default browser behavior
  cleanups.push(
    ShortcutManager.on(
      KeyboardShortcut.ctrlKey('f'),
      () => {
        console.log('Find (browser find also opens)');
      },
      { preventDefault: false }
    )
  );

  // Stop event propagation
  cleanups.push(
    ShortcutManager.on(
      KeyboardShortcut.key('Escape'),
      () => {
        console.log('Escape handled (no propagation)');
      },
      { stopPropagation: true }
    )
  );

  // One-time handler (auto-removes after first trigger)
  cleanups.push(
    ShortcutManager.on(
      KeyboardShortcut.key('F2'),
      () => {
        console.log('This only fires once!');
      },
      { once: true }
    )
  );

  // Capture phase (handles before bubbling phase)
  cleanups.push(
    ShortcutManager.on(
      KeyboardShortcut.key('F3'),
      () => {
        console.log('Captured early in event phase');
      },
      { capture: true }
    )
  );

  // Combined options
  const options: ShortcutHandlerOptions = {
    preventDefault: true,
    stopPropagation: true,
    stopImmediatePropagation: true,
    capture: true,
    once: false,
  };

  cleanups.push(
    ShortcutManager.on(
      KeyboardShortcut.ctrlShift('q'),
      () => {
        console.log('Maximum control over event handling');
      },
      options
    )
  );

  return cleanups;
}

// =============================================================================
// Enter Key Handling
// =============================================================================

/**
 * Handle Enter key for form submission or confirmation.
 */
function enterKeyExample(): CleanupFn {
  console.log('\n--- Enter Key Handling ---');

  // Simple Enter handler
  return ShortcutManager.onEnter(
    () => {
      console.log('Enter pressed - submit form or confirm action');
    },
    { preventDefault: true }
  );
}

// =============================================================================
// Application-Style Shortcut Map
// =============================================================================

/**
 * Define shortcuts in a structured way.
 */
interface ShortcutConfig {
  readonly shortcut: KeyboardShortcut;
  readonly action: () => void;
  readonly description: string;
  readonly category: string;
}

/**
 * Application shortcuts configuration.
 */
const appShortcuts: ShortcutConfig[] = [
  {
    shortcut: KeyboardShortcut.ctrlKey('n'),
    action: () => console.log('New file'),
    description: 'Create new file',
    category: 'File',
  },
  {
    shortcut: KeyboardShortcut.ctrlKey('o'),
    action: () => console.log('Open file'),
    description: 'Open file',
    category: 'File',
  },
  {
    shortcut: KeyboardShortcut.ctrlKey('s'),
    action: () => console.log('Save'),
    description: 'Save current file',
    category: 'File',
  },
  {
    shortcut: KeyboardShortcut.ctrlShift('s'),
    action: () => console.log('Save As'),
    description: 'Save as new file',
    category: 'File',
  },
  {
    shortcut: KeyboardShortcut.ctrlKey('z'),
    action: () => console.log('Undo'),
    description: 'Undo last action',
    category: 'Edit',
  },
  {
    shortcut: KeyboardShortcut.ctrlShift('z'),
    action: () => console.log('Redo'),
    description: 'Redo last action',
    category: 'Edit',
  },
  {
    shortcut: KeyboardShortcut.ctrlKey('f'),
    action: () => console.log('Find'),
    description: 'Find in document',
    category: 'Edit',
  },
  {
    shortcut: KeyboardShortcut.key('F1'),
    action: () => console.log('Help'),
    description: 'Show help',
    category: 'Help',
  },
];

/**
 * Register all application shortcuts.
 */
function registerAppShortcuts(): ShortcutGroup {
  const group = ShortcutManager.createGroup();

  for (const config of appShortcuts) {
    group.add(config.shortcut, config.action);
  }

  console.log(`Registered ${group.size} application shortcuts`);

  return group;
}

/**
 * Generate help text from shortcut configuration.
 */
function generateShortcutHelp(): string {
  const byCategory = new Map<string, ShortcutConfig[]>();

  for (const config of appShortcuts) {
    const existing = byCategory.get(config.category) ?? [];
    existing.push(config);
    byCategory.set(config.category, existing);
  }

  let help = 'Keyboard Shortcuts\n==================\n\n';

  for (const [category, shortcuts] of byCategory) {
    help += `${category}:\n`;
    for (const config of shortcuts) {
      help += `  ${config.shortcut.toString().padEnd(15)} - ${config.description}\n`;
    }
    help += '\n';
  }

  return help;
}

// =============================================================================
// Context-Aware Shortcuts
// =============================================================================

/**
 * Enable/disable shortcuts based on application state.
 */
export class ShortcutContext {
  readonly shortcuts = new Map<string, CleanupFn>();
  private enabled = true;

  constructor(private readonly group: ShortcutGroup) {}

  /**
   * Enable all shortcuts in this context.
   */
  enable(): void {
    if (this.enabled) return;
    this.enabled = true;
    console.log('Shortcuts enabled');
  }

  /**
   * Disable all shortcuts in this context.
   */
  disable(): void {
    if (!this.enabled) return;
    this.enabled = false;
    console.log('Shortcuts disabled');
  }

  /**
   * Toggle shortcuts enabled state.
   */
  toggle(): void {
    if (this.enabled) {
      this.disable();
    } else {
      this.enable();
    }
  }

  /**
   * Check if shortcuts are enabled.
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Cleanup all shortcuts.
   */
  cleanup(): void {
    this.group.cleanup();
  }
}

// =============================================================================
// Run Examples
// =============================================================================

/**
 * Initialize all keyboard shortcuts.
 */
export function initKeyboardShortcuts(): { cleanup: () => void } {
  const cleanups: CleanupFn[] = [];
  const groups: ShortcutGroup[] = [];

  // Basic example
  cleanups.push(basicShortcutExample());

  // Predefined shortcuts
  cleanups.push(...predefinedShortcutsExample());

  // Custom shortcuts
  cleanups.push(...customShortcutsExample());

  // Shortcut group
  groups.push(shortcutGroupExample());

  // Multiple groups
  const { navigation, editing } = multipleGroupsExample();
  groups.push(navigation, editing);

  // Modal escape
  modalEscapeExample();

  // Options example
  cleanups.push(...shortcutOptionsExample());

  // Enter key
  cleanups.push(enterKeyExample());

  // Application shortcuts
  groups.push(registerAppShortcuts());

  // Show help
  console.log('\n' + generateShortcutHelp());

  return {
    cleanup: (): void => {
      // Cleanup individual shortcuts
      for (const fn of cleanups) {
        fn();
      }
      // Cleanup groups
      for (const group of groups) {
        group.cleanup();
      }
      console.log('All keyboard shortcuts cleaned up');
    },
  };
}

// Uncomment to run on page load
// document.addEventListener('DOMContentLoaded', () => initKeyboardShortcuts());
