// noinspection JSUnusedGlobalSymbols,JSUnusedLocalSymbols - Example file

/**
 * Event Utilities Example - Common Event Handling Patterns
 *
 * This example demonstrates:
 * - One-time event listeners that auto-remove after firing
 * - Event delegation for dynamic lists and tables
 * - Outside click detection for dropdowns and modals
 * - Keyboard shortcuts with modifier keys
 * - Multi-event listeners for unified input handling
 * - Composing multiple event patterns together
 *
 * @packageDocumentation
 */

import { type CleanupFn } from '@zappzarapp/browser-utils/core';
import { EventUtils } from '@zappzarapp/browser-utils/events';

// =============================================================================
// Types
// =============================================================================

/**
 * Dropdown menu configuration.
 */
interface DropdownConfig {
  readonly trigger: HTMLElement;
  readonly menu: HTMLElement;
  readonly onOpen?: () => void;
  readonly onClose?: () => void;
}

/**
 * Keyboard shortcut definition.
 */
interface KeyboardShortcut {
  readonly key: string;
  readonly ctrl?: boolean;
  readonly shift?: boolean;
  readonly alt?: boolean;
  readonly meta?: boolean;
  readonly description: string;
  readonly action: (event: KeyboardEvent) => void;
}

/**
 * Context menu item for the right-click menu example.
 */
interface ContextMenuItem {
  readonly label: string;
  readonly action: (target: Element) => void;
  readonly icon?: string;
}

/**
 * Todo item for the delegation example.
 */
interface TodoItem {
  readonly id: string;
  readonly text: string;
  completed: boolean;
}

/**
 * Table sort direction.
 */
type SortDirection = 'asc' | 'desc' | 'none';

// =============================================================================
// One-Time Listeners
// =============================================================================

/**
 * Create a one-time welcome dialog that dismisses on first click.
 *
 * Common pattern for onboarding overlays, cookie consent banners,
 * or first-run tutorials that should only appear once per session.
 */
function createWelcomeOverlay(container: HTMLElement): CleanupFn {
  console.log('[Welcome] Showing overlay');

  // Create overlay element
  const overlay = document.createElement('div');
  overlay.className = 'welcome-overlay';
  overlay.innerHTML = `
    <div class="welcome-content">
      <h2>Welcome!</h2>
      <p>Click anywhere to dismiss this message.</p>
    </div>
  `;
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 9999;
    display: flex; align-items: center; justify-content: center;
    background: rgba(0, 0, 0, 0.6);
  `;

  container.appendChild(overlay);

  // Use EventUtils.once to auto-remove the listener after first click
  const cleanupClick = EventUtils.once(overlay, 'click', () => {
    console.log('[Welcome] Overlay dismissed');
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 300ms ease-out';

    // Remove from DOM after fade-out
    setTimeout(() => {
      overlay.remove();
    }, 300);
  });

  return () => {
    cleanupClick();
    overlay.remove();
  };
}

/**
 * Create a one-time animation trigger that fires when an element
 * enters the viewport for the first time.
 *
 * Uses EventUtils.once with scroll to detect initial visibility,
 * then removes the listener since the animation only needs to run once.
 */
function createScrollReveal(element: HTMLElement, animationClass: string): CleanupFn {
  console.log('[ScrollReveal] Watching element for first viewport entry');

  // Check if already in viewport
  const rect = element.getBoundingClientRect();
  if (rect.top < window.innerHeight && rect.bottom > 0) {
    element.classList.add(animationClass);
    console.log('[ScrollReveal] Element already visible, animating immediately');
    return () => {
      // No-op: animation already triggered
    };
  }

  // Listen for first scroll that brings element into view
  return EventUtils.once(
    window,
    'scroll',
    () => {
      const currentRect = element.getBoundingClientRect();
      if (currentRect.top < window.innerHeight && currentRect.bottom > 0) {
        element.classList.add(animationClass);
        console.log('[ScrollReveal] Element entered viewport, triggering animation');
      }
    },
    { passive: true }
  );
}

/**
 * One-time form submission guard.
 * Prevents double-submit by disabling the button after the first click.
 */
function createSubmitGuard(form: HTMLFormElement): CleanupFn {
  const submitButton = form.querySelector<HTMLButtonElement>('button[type="submit"]');

  if (submitButton === null) {
    console.warn('[SubmitGuard] No submit button found in form');
    return () => {
      // No-op: nothing to clean up
    };
  }

  console.log('[SubmitGuard] Guarding form against double submission');

  return EventUtils.once(form, 'submit', (event) => {
    event.preventDefault();

    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';

    console.log('[SubmitGuard] Form submitted, button disabled');
  });
}

// =============================================================================
// Event Delegation
// =============================================================================

/**
 * Create a delegated todo list with add, toggle, and delete functionality.
 *
 * Event delegation is ideal here because todo items are added and removed
 * dynamically. Instead of attaching listeners to each item, we attach
 * a single listener to the container that handles all interactions.
 */
function createTodoList(container: HTMLElement): {
  readonly add: (text: string) => void;
  readonly getItems: () => readonly TodoItem[];
  readonly cleanup: CleanupFn;
} {
  console.log('[TodoList] Initializing delegated todo list');

  const items: TodoItem[] = [];
  let nextId = 1;

  // Create the list element
  const list = document.createElement('ul');
  list.className = 'todo-list';
  list.setAttribute('role', 'list');
  container.appendChild(list);

  /**
   * Render a single todo item.
   */
  function renderItem(item: TodoItem): string {
    const checkedAttr = item.completed ? 'checked' : '';
    const completedClass = item.completed ? 'todo-completed' : '';

    return `
      <li class="todo-item ${completedClass}" data-id="${item.id}">
        <input type="checkbox" class="todo-checkbox" ${checkedAttr}
               aria-label="Toggle ${item.text}" />
        <span class="todo-text">${item.text}</span>
        <button class="todo-delete" aria-label="Delete ${item.text}">&times;</button>
      </li>
    `;
  }

  /**
   * Re-render the full list.
   */
  function render(): void {
    list.innerHTML = items.map(renderItem).join('');
  }

  // Delegate checkbox toggle events
  const cleanupToggle = EventUtils.delegate(list, '.todo-checkbox', 'change', (_event, target) => {
    const listItem = target.closest('.todo-item');
    const itemId = listItem?.getAttribute('data-id');
    const item = items.find((i) => i.id === itemId);

    if (item !== undefined) {
      item.completed = !item.completed;
      listItem?.classList.toggle('todo-completed', item.completed);
      console.log(`[TodoList] Item "${item.text}" ${item.completed ? 'completed' : 'uncompleted'}`);
    }
  });

  // Delegate delete button clicks
  const cleanupDelete = EventUtils.delegate(list, '.todo-delete', 'click', (_event, target) => {
    const listItem = target.closest('.todo-item');
    const itemId = listItem?.getAttribute('data-id');
    const index = items.findIndex((i) => i.id === itemId);

    if (index !== -1) {
      const removed = items.splice(index, 1)[0];
      console.log(`[TodoList] Deleted item: "${removed?.text}"`);
      render();
    }
  });

  return {
    add: (text: string) => {
      const item: TodoItem = {
        id: `todo-${String(nextId++)}`,
        text,
        completed: false,
      };
      items.push(item);
      render();
      console.log(`[TodoList] Added item: "${text}"`);
    },

    getItems: () => items,

    cleanup: () => {
      cleanupToggle();
      cleanupDelete();
      list.remove();
    },
  };
}

/**
 * Create a sortable table with delegated click handlers on column headers.
 *
 * Demonstrates delegation with a CSS selector that targets specific
 * child elements (th[data-sort]) within a container.
 */
function createSortableTable(table: HTMLTableElement): CleanupFn {
  console.log('[SortableTable] Initializing column sort delegation');

  let currentColumn: string | null = null;
  let currentDirection: SortDirection = 'none';

  /**
   * Sort table rows by the given column index.
   */
  function sortByColumn(columnKey: string, direction: SortDirection): void {
    const tbody = table.querySelector('tbody');
    if (tbody === null) return;

    const rows = Array.from(tbody.querySelectorAll('tr'));
    const headerCells = Array.from(table.querySelectorAll('th[data-sort]'));
    const columnIndex = headerCells.findIndex((th) => th.getAttribute('data-sort') === columnKey);

    if (columnIndex === -1) return;

    // Sort rows
    rows.sort((a, b) => {
      const cellA = a.cells[columnIndex]?.textContent?.trim() ?? '';
      const cellB = b.cells[columnIndex]?.textContent?.trim() ?? '';

      // Try numeric comparison first
      const numA = Number(cellA);
      const numB = Number(cellB);

      if (!Number.isNaN(numA) && !Number.isNaN(numB)) {
        return direction === 'asc' ? numA - numB : numB - numA;
      }

      // Fall back to string comparison
      const comparison = cellA.localeCompare(cellB);
      return direction === 'asc' ? comparison : -comparison;
    });

    // Re-append sorted rows
    for (const row of rows) {
      tbody.appendChild(row);
    }

    // Update header indicators
    for (const th of headerCells) {
      th.classList.remove('sort-asc', 'sort-desc');
    }

    const activeHeader = headerCells[columnIndex];
    if (direction !== 'none' && activeHeader !== undefined) {
      activeHeader.classList.add(`sort-${direction}`);
    }

    console.log(`[SortableTable] Sorted by "${columnKey}" (${direction})`);
  }

  // Delegate click events on sortable column headers
  return EventUtils.delegate(table, 'th[data-sort]', 'click', (_event, target) => {
    const columnKey = target.getAttribute('data-sort');
    if (columnKey === null) return;

    if (currentColumn !== columnKey) {
      currentDirection = 'asc';
      currentColumn = columnKey;
    } else if (currentDirection === 'asc') {
      currentDirection = 'desc';
    } else {
      currentDirection = 'none';
      currentColumn = null;
    }

    sortByColumn(columnKey, currentDirection);
  });
}

/**
 * Create a delegated navigation menu with nested submenus.
 *
 * Uses delegation to handle clicks on menu items at any depth,
 * including dynamically added items.
 */
function createNavigationMenu(nav: HTMLElement): CleanupFn {
  console.log('[Navigation] Setting up delegated menu handlers');

  const cleanups: CleanupFn[] = [];

  // Handle menu item clicks
  const cleanupItemClick = EventUtils.delegate(nav, 'a[data-route]', 'click', (event, target) => {
    event.preventDefault();

    const route = target.getAttribute('data-route');

    // Remove active class from all items
    nav.querySelectorAll('a[data-route]').forEach((link) => {
      link.classList.remove('active');
      link.setAttribute('aria-current', 'false');
    });

    // Set active class on clicked item
    target.classList.add('active');
    target.setAttribute('aria-current', 'page');

    console.log(`[Navigation] Navigated to: ${route ?? 'unknown'}`);
  });
  cleanups.push(cleanupItemClick);

  // Handle submenu toggle buttons
  const cleanupSubmenuToggle = EventUtils.delegate(
    nav,
    'button[data-submenu]',
    'click',
    (_event, target) => {
      const submenuId = target.getAttribute('data-submenu');
      if (submenuId === null) return;

      const submenu = document.getElementById(submenuId);
      if (submenu === null) return;

      const isExpanded = target.getAttribute('aria-expanded') === 'true';
      target.setAttribute('aria-expanded', String(!isExpanded));
      submenu.hidden = isExpanded;

      console.log(`[Navigation] Submenu "${submenuId}" ${isExpanded ? 'collapsed' : 'expanded'}`);
    }
  );
  cleanups.push(cleanupSubmenuToggle);

  return () => {
    for (const cleanup of cleanups) {
      cleanup();
    }
  };
}

// =============================================================================
// Outside Click Detection
// =============================================================================

/**
 * Create a dropdown menu that closes when clicking outside.
 *
 * This is the most common use case for onOutsideClick: dismissing
 * floating UI elements (dropdowns, popovers, tooltips) when the
 * user interacts with something else.
 */
function createDropdown(config: DropdownConfig): {
  readonly open: () => void;
  readonly close: () => void;
  readonly toggle: () => void;
  readonly isOpen: () => boolean;
  readonly cleanup: CleanupFn;
} {
  const { trigger, menu, onOpen, onClose } = config;

  let isMenuOpen = false;
  let cleanupOutsideClick: CleanupFn | null = null;

  /**
   * Open the dropdown menu.
   */
  function open(): void {
    if (isMenuOpen) return;

    isMenuOpen = true;
    menu.classList.add('open');
    menu.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');

    // Start listening for outside clicks to auto-close
    cleanupOutsideClick = EventUtils.onOutsideClick(
      menu,
      () => {
        console.log('[Dropdown] Outside click detected, closing');
        close();
      },
      {
        // Exclude the trigger button so clicking it toggles instead of reopening
        exclude: [trigger],
        // Also handle touch events for mobile
        touch: true,
      }
    );

    onOpen?.();
    console.log('[Dropdown] Opened');
  }

  /**
   * Close the dropdown menu.
   */
  function close(): void {
    if (!isMenuOpen) return;

    isMenuOpen = false;
    menu.classList.remove('open');
    menu.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');

    // Stop listening for outside clicks
    cleanupOutsideClick?.();
    cleanupOutsideClick = null;

    onClose?.();
    console.log('[Dropdown] Closed');
  }

  /**
   * Toggle the dropdown open/closed.
   */
  function toggle(): void {
    if (isMenuOpen) {
      close();
    } else {
      open();
    }
  }

  // Toggle on trigger click
  const handleTriggerClick = (): void => {
    toggle();
  };

  trigger.addEventListener('click', handleTriggerClick);

  return {
    open,
    close,
    toggle,
    isOpen: () => isMenuOpen,
    cleanup: () => {
      close();
      trigger.removeEventListener('click', handleTriggerClick);
    },
  };
}

/**
 * Create a modal dialog that closes when clicking the backdrop.
 *
 * Combines onOutsideClick with keyboard handling for accessible
 * modal behavior.
 */
function createModal(dialog: HTMLElement): {
  readonly open: () => void;
  readonly close: () => void;
  readonly cleanup: CleanupFn;
} {
  console.log('[Modal] Initializing modal dialog');

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.style.cssText = `
    position: fixed; inset: 0; z-index: 999;
    background: rgba(0, 0, 0, 0.5);
    display: none;
  `;

  let cleanupOutsideClick: CleanupFn | null = null;
  let cleanupEscape: CleanupFn | null = null;

  /**
   * Open the modal dialog.
   */
  function open(): void {
    document.body.appendChild(backdrop);
    backdrop.style.display = 'block';
    dialog.hidden = false;
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');

    // Close when clicking outside the dialog content
    cleanupOutsideClick = EventUtils.onOutsideClick(dialog, () => {
      console.log('[Modal] Backdrop click detected, closing');
      close();
    });

    // Close on Escape key
    cleanupEscape = EventUtils.onKey(document, 'Escape', () => {
      console.log('[Modal] Escape pressed, closing');
      close();
    });

    // Trap focus inside the modal
    const focusable = dialog.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.focus();

    console.log('[Modal] Opened');
  }

  /**
   * Close the modal dialog.
   */
  function close(): void {
    dialog.hidden = true;
    backdrop.style.display = 'none';
    backdrop.remove();

    cleanupOutsideClick?.();
    cleanupOutsideClick = null;

    cleanupEscape?.();
    cleanupEscape = null;

    console.log('[Modal] Closed');
  }

  return {
    open,
    close,
    cleanup: () => {
      close();
    },
  };
}

/**
 * Create an inline edit field that saves on outside click
 * and cancels on Escape.
 *
 * Shows how onOutsideClick can be used for non-dismissal patterns:
 * clicking away from an editable area confirms/saves the edit.
 */
function createInlineEditor(element: HTMLElement): CleanupFn {
  console.log('[InlineEdit] Initializing inline editor');

  let isEditing = false;
  let cleanupOutsideClick: CleanupFn | null = null;
  let cleanupEscapeKey: CleanupFn | null = null;
  let originalText = '';

  /**
   * Enter edit mode.
   */
  function startEditing(): void {
    if (isEditing) return;

    isEditing = true;
    originalText = element.textContent ?? '';
    element.contentEditable = 'true';
    element.classList.add('editing');
    element.focus();

    // Select all text for easy replacement
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(element);
    selection?.removeAllRanges();
    selection?.addRange(range);

    // Save when clicking outside
    cleanupOutsideClick = EventUtils.onOutsideClick(element, () => {
      saveEdit();
    });

    // Cancel on Escape
    cleanupEscapeKey = EventUtils.onKey(element, 'Escape', () => {
      cancelEdit();
    });

    console.log('[InlineEdit] Editing started');
  }

  /**
   * Save the edited text and exit edit mode.
   */
  function saveEdit(): void {
    if (!isEditing) return;

    isEditing = false;
    element.contentEditable = 'false';
    element.classList.remove('editing');

    cleanupOutsideClick?.();
    cleanupOutsideClick = null;
    cleanupEscapeKey?.();
    cleanupEscapeKey = null;

    const newText = element.textContent ?? '';
    console.log(`[InlineEdit] Saved: "${originalText}" -> "${newText}"`);
  }

  /**
   * Cancel editing and restore original text.
   */
  function cancelEdit(): void {
    if (!isEditing) return;

    isEditing = false;
    element.textContent = originalText;
    element.contentEditable = 'false';
    element.classList.remove('editing');

    cleanupOutsideClick?.();
    cleanupOutsideClick = null;
    cleanupEscapeKey?.();
    cleanupEscapeKey = null;

    console.log('[InlineEdit] Edit cancelled, restored original text');
  }

  // Enter edit mode on double-click
  const handleDoubleClick = (): void => {
    startEditing();
  };

  element.addEventListener('dblclick', handleDoubleClick);

  return () => {
    if (isEditing) {
      cancelEdit();
    }
    element.removeEventListener('dblclick', handleDoubleClick);
  };
}

// =============================================================================
// Keyboard Shortcuts
// =============================================================================

/**
 * Create a keyboard shortcut manager for an application.
 *
 * Registers multiple shortcuts with modifier keys and provides
 * a help overlay showing all available shortcuts.
 */
function createShortcutManager(shortcuts: readonly KeyboardShortcut[]): {
  readonly showHelp: () => void;
  readonly cleanup: CleanupFn;
} {
  console.log(`[Shortcuts] Registering ${String(shortcuts.length)} keyboard shortcuts`);

  const cleanups: CleanupFn[] = [];

  // Register each shortcut
  for (const shortcut of shortcuts) {
    const cleanup = EventUtils.onKey(
      document,
      shortcut.key,
      (event) => {
        console.log(`[Shortcuts] Triggered: ${shortcut.description}`);
        shortcut.action(event);
      },
      {
        ctrl: shortcut.ctrl,
        shift: shortcut.shift,
        alt: shortcut.alt,
        meta: shortcut.meta,
        preventDefault: true,
      }
    );
    cleanups.push(cleanup);
  }

  /**
   * Display a formatted help message showing all shortcuts.
   */
  function showHelp(): void {
    console.log('[Shortcuts] Available keyboard shortcuts:');

    for (const shortcut of shortcuts) {
      const modifiers: string[] = [];
      if (shortcut.ctrl === true) modifiers.push('Ctrl');
      if (shortcut.shift === true) modifiers.push('Shift');
      if (shortcut.alt === true) modifiers.push('Alt');
      if (shortcut.meta === true) modifiers.push('Meta');
      modifiers.push(shortcut.key);

      console.log(`  ${modifiers.join(' + ')} - ${shortcut.description}`);
    }
  }

  return {
    showHelp,
    cleanup: () => {
      for (const cleanup of cleanups) {
        cleanup();
      }
      console.log('[Shortcuts] All shortcuts unregistered');
    },
  };
}

/**
 * Create a text editor with common keyboard shortcuts.
 *
 * Demonstrates onKey with various modifier combinations
 * for a realistic rich-text editing scenario.
 */
function createEditorShortcuts(editor: HTMLElement): CleanupFn {
  console.log('[Editor] Setting up editor keyboard shortcuts');

  const cleanups: CleanupFn[] = [];

  /**
   * Wrap the current selection in a formatting tag.
   * Uses the modern Selection/Range API instead of deprecated execCommand.
   */
  function wrapSelection(tagName: string): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const wrapper = document.createElement(tagName);
    range.surroundContents(wrapper);
  }

  // Ctrl+B: Bold
  cleanups.push(
    EventUtils.onKey(
      editor,
      'b',
      () => {
        wrapSelection('strong');
        console.log('[Editor] Toggle bold');
      },
      { ctrl: true, preventDefault: true }
    )
  );

  // Ctrl+I: Italic
  cleanups.push(
    EventUtils.onKey(
      editor,
      'i',
      () => {
        wrapSelection('em');
        console.log('[Editor] Toggle italic');
      },
      { ctrl: true, preventDefault: true }
    )
  );

  // Ctrl+U: Underline
  cleanups.push(
    EventUtils.onKey(
      editor,
      'u',
      () => {
        wrapSelection('u');
        console.log('[Editor] Toggle underline');
      },
      { ctrl: true, preventDefault: true }
    )
  );

  // Ctrl+Shift+S: Strikethrough
  cleanups.push(
    EventUtils.onKey(
      editor,
      'S',
      () => {
        wrapSelection('s');
        console.log('[Editor] Toggle strikethrough');
      },
      { ctrl: true, shift: true, preventDefault: true }
    )
  );

  // Escape: Blur the editor
  cleanups.push(
    EventUtils.onKey(editor, 'Escape', () => {
      editor.blur();
      console.log('[Editor] Focus released');
    })
  );

  return () => {
    for (const cleanup of cleanups) {
      cleanup();
    }
    console.log('[Editor] Shortcuts removed');
  };
}

/**
 * Create a command palette (Ctrl+K or Cmd+K) that opens a search dialog.
 *
 * This is a common pattern in modern web apps for quick navigation.
 */
function createCommandPalette(
  dialog: HTMLElement,
  input: HTMLInputElement,
  onSearch: (query: string) => void
): CleanupFn {
  console.log('[CommandPalette] Initializing');

  let isVisible = false;
  let cleanupEscape: CleanupFn | null = null;
  let cleanupOutside: CleanupFn | null = null;

  /**
   * Show the command palette.
   */
  function show(): void {
    if (isVisible) return;

    isVisible = true;
    dialog.hidden = false;
    dialog.classList.add('visible');
    input.value = '';
    input.focus();

    // Close on Escape
    cleanupEscape = EventUtils.onKey(dialog, 'Escape', () => {
      hide();
    });

    // Close on outside click
    cleanupOutside = EventUtils.onOutsideClick(dialog, () => {
      hide();
    });

    console.log('[CommandPalette] Opened');
  }

  /**
   * Hide the command palette.
   */
  function hide(): void {
    if (!isVisible) return;

    isVisible = false;
    dialog.hidden = true;
    dialog.classList.remove('visible');

    cleanupEscape?.();
    cleanupEscape = null;
    cleanupOutside?.();
    cleanupOutside = null;

    console.log('[CommandPalette] Closed');
  }

  // Ctrl+K / Cmd+K to toggle
  const cleanupCtrlK = EventUtils.onKey(
    document,
    'k',
    () => {
      if (isVisible) {
        hide();
      } else {
        show();
      }
    },
    { ctrl: true, preventDefault: true }
  );

  // Also support Cmd+K on macOS
  const cleanupMetaK = EventUtils.onKey(
    document,
    'k',
    () => {
      if (isVisible) {
        hide();
      } else {
        show();
      }
    },
    { meta: true, preventDefault: true }
  );

  // Handle search input
  const handleInput = (): void => {
    onSearch(input.value);
  };
  input.addEventListener('input', handleInput);

  // Handle Enter to select first result
  const cleanupEnter = EventUtils.onKey(
    input,
    'Enter',
    () => {
      console.log(`[CommandPalette] Submitted search: "${input.value}"`);
      hide();
    },
    { preventDefault: true }
  );

  return () => {
    hide();
    cleanupCtrlK();
    cleanupMetaK();
    cleanupEnter();
    input.removeEventListener('input', handleInput);
  };
}

// =============================================================================
// Multi-Event Listeners
// =============================================================================

/**
 * Create a unified input tracker that responds to multiple event types.
 *
 * EventUtils.on() is useful when the same handler should respond to
 * several related events (e.g., mouse + touch + pointer).
 */
function createInputTracker(element: HTMLElement): {
  readonly getPosition: () => { readonly x: number; readonly y: number } | null;
  readonly isActive: () => boolean;
  readonly cleanup: CleanupFn;
} {
  console.log('[InputTracker] Initializing unified input tracking');

  let position: { readonly x: number; readonly y: number } | null = null;
  let active = false;

  // Track start of interaction (mouse down, touch start, pointer down)
  function extractPosition(event: Event): { x: number; y: number } | null {
    if (event instanceof MouseEvent) {
      return { x: event.clientX, y: event.clientY };
    }
    if (event instanceof TouchEvent && event.touches.length > 0) {
      const touch = event.touches[0];
      if (touch !== undefined) {
        return { x: touch.clientX, y: touch.clientY };
      }
    }
    return null;
  }

  const cleanupStart = EventUtils.on(
    element,
    ['mousedown', 'touchstart', 'pointerdown'],
    (event) => {
      active = true;
      position = extractPosition(event) ?? position;
      console.log(
        `[InputTracker] Interaction started at (${String(position?.x)}, ${String(position?.y)})`
      );
    },
    { passive: true }
  );

  // Track end of interaction
  const cleanupEnd = EventUtils.on(
    element,
    ['mouseup', 'touchend', 'pointerup'],
    () => {
      active = false;
      console.log('[InputTracker] Interaction ended');
    },
    { passive: true }
  );

  // Track movement during interaction
  const cleanupMove = EventUtils.on(
    element,
    ['mousemove', 'touchmove', 'pointermove'],
    (event) => {
      if (!active) return;
      position = extractPosition(event) ?? position;
    },
    { passive: true }
  );

  return {
    getPosition: () => position,
    isActive: () => active,
    cleanup: () => {
      cleanupStart();
      cleanupEnd();
      cleanupMove();
      console.log('[InputTracker] Tracking stopped');
    },
  };
}

/**
 * Create a focus management system that tracks when the user
 * enters or leaves a region of the page.
 *
 * Uses EventUtils.on() to handle both focus and blur events
 * with the same logic, plus mouseenter/mouseleave for hover.
 */
function createFocusRegion(region: HTMLElement): {
  readonly isEngaged: () => boolean;
  readonly cleanup: CleanupFn;
} {
  console.log('[FocusRegion] Setting up engagement tracking');

  let engaged = false;

  // Track focus/hover entry
  const cleanupEnter = EventUtils.on(region, ['focusin', 'mouseenter'], () => {
    if (!engaged) {
      engaged = true;
      region.classList.add('engaged');
      console.log('[FocusRegion] User engaged with region');
    }
  });

  // Track focus/hover exit
  const cleanupLeave = EventUtils.on(region, ['focusout', 'mouseleave'], () => {
    // Small delay to handle focus moving between children
    setTimeout(() => {
      if (!region.contains(document.activeElement) && !region.matches(':hover')) {
        engaged = false;
        region.classList.remove('engaged');
        console.log('[FocusRegion] User disengaged from region');
      }
    }, 0);
  });

  return {
    isEngaged: () => engaged,
    cleanup: () => {
      cleanupEnter();
      cleanupLeave();
      region.classList.remove('engaged');
    },
  };
}

/**
 * Create a connection status monitor that listens for online/offline events.
 *
 * Uses EventUtils.on() to register a single handler for both events,
 * providing a unified callback for connectivity changes.
 */
function createConnectionMonitor(onStatusChange: (online: boolean) => void): CleanupFn {
  console.log('[Connection] Monitoring network status');

  const handleChange = (event: Event): void => {
    const online = event.type === 'online';
    console.log(`[Connection] Status changed: ${online ? 'online' : 'offline'}`);
    onStatusChange(online);
  };

  const cleanup = EventUtils.on(window, ['online', 'offline'], handleChange);

  // Log initial status
  console.log(`[Connection] Current status: ${navigator.onLine ? 'online' : 'offline'}`);

  return cleanup;
}

// =============================================================================
// Composed Patterns
// =============================================================================

/**
 * Create a context menu with delegation, outside click, and keyboard support.
 *
 * Demonstrates combining multiple EventUtils methods into a cohesive
 * interactive component.
 */
function createContextMenu(container: HTMLElement, items: readonly ContextMenuItem[]): CleanupFn {
  console.log('[ContextMenu] Initializing custom context menu');

  // Create the menu element
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.setAttribute('role', 'menu');
  menu.hidden = true;
  menu.style.cssText = 'position: fixed; z-index: 10000;';

  // Build menu items
  menu.innerHTML = items
    .map(
      (item, index) => `
      <button class="context-menu-item" data-index="${String(index)}" role="menuitem">
        ${item.icon !== undefined ? `<span class="icon">${item.icon}</span>` : ''}
        <span class="label">${item.label}</span>
      </button>
    `
    )
    .join('');

  document.body.appendChild(menu);

  let cleanupOutside: CleanupFn | null = null;
  let cleanupEscape: CleanupFn | null = null;
  let contextTarget: Element | null = null;

  /**
   * Show the context menu at the given position.
   */
  function show(x: number, y: number, target: Element): void {
    contextTarget = target;
    menu.style.left = `${String(x)}px`;
    menu.style.top = `${String(y)}px`;
    menu.hidden = false;

    // Close on outside click
    cleanupOutside = EventUtils.onOutsideClick(menu, () => {
      hide();
    });

    // Close on Escape
    cleanupEscape = EventUtils.onKey(document, 'Escape', () => {
      hide();
    });

    // Focus first item for keyboard navigation
    const firstItem = menu.querySelector<HTMLButtonElement>('.context-menu-item');
    firstItem?.focus();

    console.log(`[ContextMenu] Shown at (${String(x)}, ${String(y)})`);
  }

  /**
   * Hide the context menu.
   */
  function hide(): void {
    menu.hidden = true;
    contextTarget = null;

    cleanupOutside?.();
    cleanupOutside = null;
    cleanupEscape?.();
    cleanupEscape = null;

    console.log('[ContextMenu] Hidden');
  }

  // Listen for contextmenu event on the container
  const handleContextMenu = (event: Event): void => {
    const mouseEvent = event as MouseEvent;
    mouseEvent.preventDefault();

    const target = mouseEvent.target as Element | null;
    if (target !== null) {
      show(mouseEvent.clientX, mouseEvent.clientY, target);
    }
  };

  container.addEventListener('contextmenu', handleContextMenu);

  // Delegate clicks on menu items
  const cleanupItemClick = EventUtils.delegate(
    menu,
    '.context-menu-item',
    'click',
    (_event, target) => {
      const indexStr = target.getAttribute('data-index');
      if (indexStr === null) return;

      const index = parseInt(indexStr, 10);
      const item = items[index];

      if (item !== undefined && contextTarget !== null) {
        console.log(`[ContextMenu] Selected: "${item.label}"`);
        item.action(contextTarget);
      }

      hide();
    }
  );

  // Navigate menu items with arrow keys
  const cleanupArrowDown = EventUtils.onKey(menu, 'ArrowDown', (event) => {
    event.preventDefault();
    const current = document.activeElement as HTMLElement | null;
    const next = current?.nextElementSibling as HTMLElement | null;
    next?.focus();
  });

  const cleanupArrowUp = EventUtils.onKey(menu, 'ArrowUp', (event) => {
    event.preventDefault();
    const current = document.activeElement as HTMLElement | null;
    const prev = current?.previousElementSibling as HTMLElement | null;
    prev?.focus();
  });

  return () => {
    hide();
    container.removeEventListener('contextmenu', handleContextMenu);
    cleanupItemClick();
    cleanupArrowDown();
    cleanupArrowUp();
    menu.remove();
  };
}

// =============================================================================
// Example: Complete Application Setup
// =============================================================================

/**
 * Example: Initialize a full application with all event patterns.
 */
function initializeApp(): { cleanup: CleanupFn } {
  console.log('=== Event Utilities Example ===\n');

  const cleanups: CleanupFn[] = [];

  // 1. Welcome Overlay (one-time listener)
  console.log('\n--- One-Time Listeners ---');
  cleanups.push(createWelcomeOverlay(document.body));

  // Scroll reveal for animated sections
  const revealElements = document.querySelectorAll<HTMLElement>('[data-reveal]');
  revealElements.forEach((el) => {
    cleanups.push(createScrollReveal(el, 'revealed'));
  });

  // Submit guard for forms
  const form = document.querySelector<HTMLFormElement>('#main-form');
  if (form !== null) {
    cleanups.push(createSubmitGuard(form));
  }

  // 2. Event Delegation
  console.log('\n--- Event Delegation ---');

  // Todo list with delegated handlers
  const todoContainer = document.querySelector<HTMLElement>('#todo-app');
  if (todoContainer !== null) {
    const todoList = createTodoList(todoContainer);
    todoList.add('Learn EventUtils.delegate()');
    todoList.add('Build a sortable table');
    todoList.add('Create keyboard shortcuts');
    cleanups.push(todoList.cleanup);
  }

  // Sortable table
  const table = document.querySelector<HTMLTableElement>('#data-table');
  if (table !== null) {
    cleanups.push(createSortableTable(table));
  }

  // Navigation menu
  const nav = document.querySelector<HTMLElement>('#main-nav');
  if (nav !== null) {
    cleanups.push(createNavigationMenu(nav));
  }

  // 3. Outside Click Detection
  console.log('\n--- Outside Click Detection ---');

  // Dropdown menu
  const dropdownTrigger = document.querySelector<HTMLElement>('#dropdown-trigger');
  const dropdownMenu = document.querySelector<HTMLElement>('#dropdown-menu');
  if (dropdownTrigger !== null && dropdownMenu !== null) {
    const dropdown = createDropdown({
      trigger: dropdownTrigger,
      menu: dropdownMenu,
      onOpen: () => console.log('[App] Dropdown opened'),
      onClose: () => console.log('[App] Dropdown closed'),
    });
    cleanups.push(dropdown.cleanup);
  }

  // Modal dialog
  const modalDialog = document.querySelector<HTMLElement>('#modal');
  if (modalDialog !== null) {
    const modal = createModal(modalDialog);
    cleanups.push(modal.cleanup);

    // Open modal on button click
    const modalOpenBtn = document.querySelector<HTMLElement>('#open-modal');
    if (modalOpenBtn !== null) {
      const cleanupOpenClick = EventUtils.once(modalOpenBtn, 'click', () => {
        modal.open();
      });
      cleanups.push(cleanupOpenClick);
    }
  }

  // Inline editor
  const editableElements = document.querySelectorAll<HTMLElement>('[data-editable]');
  editableElements.forEach((el) => {
    cleanups.push(createInlineEditor(el));
  });

  // 4. Keyboard Shortcuts
  console.log('\n--- Keyboard Shortcuts ---');

  const shortcutManager = createShortcutManager([
    {
      key: 's',
      ctrl: true,
      description: 'Save document',
      action: () => console.log('[App] Saving document...'),
    },
    {
      key: 'f',
      ctrl: true,
      description: 'Find in document',
      action: () => console.log('[App] Opening search...'),
    },
    {
      key: 'p',
      ctrl: true,
      shift: true,
      description: 'Open command palette',
      action: () => console.log('[App] Command palette...'),
    },
    {
      key: '/',
      ctrl: true,
      description: 'Show keyboard shortcuts',
      action: () => shortcutManager.showHelp(),
    },
  ]);
  cleanups.push(shortcutManager.cleanup);

  // Rich text editor shortcuts
  const editorEl = document.querySelector<HTMLElement>('#editor');
  if (editorEl !== null) {
    cleanups.push(createEditorShortcuts(editorEl));
  }

  // Command palette
  const paletteDialog = document.querySelector<HTMLElement>('#command-palette');
  const paletteInput = document.querySelector<HTMLInputElement>('#command-input');
  if (paletteDialog !== null && paletteInput !== null) {
    cleanups.push(
      createCommandPalette(paletteDialog, paletteInput, (query) => {
        console.log(`[App] Searching for: "${query}"`);
      })
    );
  }

  // 5. Multi-Event Listeners
  console.log('\n--- Multi-Event Listeners ---');

  // Input tracker for a canvas/drawing area
  const canvas = document.querySelector<HTMLElement>('#drawing-area');
  if (canvas !== null) {
    const tracker = createInputTracker(canvas);
    cleanups.push(tracker.cleanup);
  }

  // Focus region tracking
  const sidebar = document.querySelector<HTMLElement>('#sidebar');
  if (sidebar !== null) {
    const focusRegion = createFocusRegion(sidebar);
    cleanups.push(focusRegion.cleanup);
  }

  // Connection monitor
  cleanups.push(
    createConnectionMonitor((online) => {
      const banner = document.querySelector<HTMLElement>('#connection-banner');
      if (banner !== null) {
        banner.textContent = online ? 'Connected' : 'No internet connection';
        banner.className = online ? 'banner-online' : 'banner-offline';
      }
    })
  );

  // 6. Context Menu (composed pattern)
  console.log('\n--- Composed Patterns ---');

  const contentArea = document.querySelector<HTMLElement>('#content');
  if (contentArea !== null) {
    cleanups.push(
      createContextMenu(contentArea, [
        {
          label: 'Copy',
          icon: '\u{1F4CB}',
          action: (target) => {
            const text = target.textContent ?? '';
            void navigator.clipboard.writeText(text);
            console.log('[App] Copied to clipboard');
          },
        },
        {
          label: 'Edit',
          icon: '\u{270F}\u{FE0F}',
          action: (target) => {
            if (target instanceof HTMLElement) {
              target.contentEditable = 'true';
              target.focus();
            }
          },
        },
        {
          label: 'Delete',
          icon: '\u{1F5D1}\u{FE0F}',
          action: (target) => {
            target.remove();
            console.log('[App] Element removed');
          },
        },
      ])
    );
  }

  console.log('\n=== Application Initialized ===');

  return {
    cleanup: () => {
      console.log('\n--- Cleaning Up ---');
      for (const fn of cleanups) {
        fn();
      }
      console.log('All event handlers cleaned up');
    },
  };
}

// =============================================================================
// Simple Usage Examples
// =============================================================================

/**
 * Example: Quick one-time click handler.
 */
function quickOnceExample(): CleanupFn {
  console.log('\n--- Quick Once Example ---');

  const button = document.querySelector<HTMLButtonElement>('#action-btn');
  if (button === null) return () => {};

  return EventUtils.once(button, 'click', () => {
    console.log('Button clicked! This handler is now removed.');
  });
}

/**
 * Example: Simple event delegation on a list.
 */
function quickDelegateExample(): CleanupFn {
  console.log('\n--- Quick Delegate Example ---');

  const list = document.querySelector<HTMLElement>('#item-list');
  if (list === null) return () => {};

  return EventUtils.delegate(list, 'li', 'click', (_event, target) => {
    console.log('List item clicked:', target.textContent);
    target.classList.toggle('selected');
  });
}

/**
 * Example: Simple keyboard shortcut.
 */
function quickKeyExample(): CleanupFn {
  console.log('\n--- Quick Key Example ---');

  return EventUtils.onKey(document, 'Escape', () => {
    console.log('Escape pressed! Closing all open panels.');
  });
}

// =============================================================================
// Exports
// =============================================================================

export {
  createWelcomeOverlay,
  createScrollReveal,
  createSubmitGuard,
  createTodoList,
  createSortableTable,
  createNavigationMenu,
  createDropdown,
  createModal,
  createInlineEditor,
  createShortcutManager,
  createEditorShortcuts,
  createCommandPalette,
  createInputTracker,
  createFocusRegion,
  createConnectionMonitor,
  createContextMenu,
  initializeApp,
  quickOnceExample,
  quickDelegateExample,
  quickKeyExample,
  type DropdownConfig,
  type KeyboardShortcut,
  type ContextMenuItem,
  type TodoItem,
  type SortDirection,
};

// Run example if this is the entry point
if (typeof document !== 'undefined') {
  // Uncomment to run:
  // document.addEventListener('DOMContentLoaded', () => {
  //   const app = initializeApp();
  //
  //   // Cleanup on page unload
  //   window.addEventListener('beforeunload', () => {
  //     app.cleanup();
  //   });
  // });
}
