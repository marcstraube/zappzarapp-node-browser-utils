/**
 * Accessibility Utilities Example
 *
 * Demonstrates how to use the a11y module for ARIA attribute management,
 * screen reader announcements, reduced motion detection, and skip navigation.
 *
 * Features demonstrated:
 * - Safe ARIA attribute management with validation
 * - Screen reader live region announcements
 * - Reduced motion preference detection and monitoring
 * - Skip navigation links for keyboard users
 */

import { AriaUtils, LiveAnnouncer, ReducedMotion, SkipLink } from '@zappzarapp/browser-utils/a11y';
import type { LiveAnnouncerInstance } from '@zappzarapp/browser-utils/a11y';

// -----------------------------------------------------------------------------
// AriaUtils: Disclosure Widget
// -----------------------------------------------------------------------------

/**
 * Create an accessible disclosure (show/hide) widget.
 *
 * @example
 * ```html
 * <button id="faq-toggle">FAQ</button>
 * <div id="faq-content" hidden>...</div>
 * ```
 * ```typescript
 * createDisclosure('faq-toggle', 'faq-content');
 * ```
 */
function createDisclosure(buttonId: string, contentId: string): void {
  const button = document.getElementById(buttonId);
  const content = document.getElementById(contentId);
  if (button === null || content === null) return;

  // Set initial ARIA state
  AriaUtils.set(button, 'expanded', 'false');
  AriaUtils.set(button, 'controls', contentId);
  content.hidden = true;

  button.addEventListener('click', () => {
    // Toggle ARIA state (returns new value)
    const newValue = AriaUtils.toggle(button, 'expanded');
    content.hidden = newValue === 'false';
  });
}

// -----------------------------------------------------------------------------
// AriaUtils: Tab Panel
// -----------------------------------------------------------------------------

/**
 * Set up ARIA roles and attributes for a tabbed interface.
 */
function setupTabPanel(tabList: HTMLElement, tabs: HTMLElement[], panels: HTMLElement[]): void {
  // Set roles
  AriaUtils.setRole(tabList, 'tablist');

  tabs.forEach((tab, index) => {
    AriaUtils.setRole(tab, 'tab');
    AriaUtils.set(tab, 'selected', index === 0 ? 'true' : 'false');

    const panel = panels[index];
    if (panel !== undefined) {
      AriaUtils.set(tab, 'controls', panel.id);
      AriaUtils.setRole(panel, 'tabpanel');
      AriaUtils.set(panel, 'labelledby', tab.id);
      panel.hidden = index !== 0;
    }
  });

  // Handle tab activation
  tabList.addEventListener('click', (event) => {
    const clickedTab = (event.target as HTMLElement).closest('[role="tab"]');
    if (clickedTab === null) return;

    tabs.forEach((tab, index) => {
      const isSelected = tab === clickedTab;
      AriaUtils.set(tab, 'selected', isSelected ? 'true' : 'false');

      const panel = panels[index];
      if (panel !== undefined) {
        panel.hidden = !isSelected;
      }
    });
  });
}

// -----------------------------------------------------------------------------
// LiveAnnouncer: Dynamic Content Announcements
// -----------------------------------------------------------------------------

/**
 * Create a todo list with screen reader announcements for state changes.
 */
function createAnnouncedTodoList(container: HTMLElement): {
  add(text: string): void;
  remove(index: number): void;
  destroy(): void;
} {
  const announcer = LiveAnnouncer.create();
  const items: string[] = [];

  function render(): void {
    container.innerHTML = '';
    items.forEach((text, index) => {
      const li = document.createElement('li');
      li.textContent = text;

      const removeBtn = document.createElement('button');
      removeBtn.textContent = 'Remove';
      removeBtn.addEventListener('click', () => remove(index));

      li.appendChild(removeBtn);
      container.appendChild(li);
    });
  }

  function add(text: string): void {
    items.push(text);
    render();
    // Polite announcement — waits for current speech
    announcer.announce(`Added "${text}" to list. ${items.length} items total.`);
  }

  function remove(index: number): void {
    const removed = items.splice(index, 1)[0];
    render();
    if (removed !== undefined) {
      announcer.announce(`Removed "${removed}" from list. ${items.length} items remaining.`);
    }
  }

  return {
    add,
    remove,
    destroy(): void {
      announcer.destroy();
    },
  };
}

// -----------------------------------------------------------------------------
// LiveAnnouncer: Form Validation Feedback
// -----------------------------------------------------------------------------

/**
 * Announce form validation errors to screen readers.
 */
function setupFormAnnouncements(form: HTMLFormElement): LiveAnnouncerInstance {
  const announcer = LiveAnnouncer.create();

  form.addEventListener('submit', (event) => {
    const errors: string[] = [];

    // Check required fields
    const requiredFields = form.querySelectorAll<HTMLInputElement>('[required]');
    requiredFields.forEach((field) => {
      if (field.value.trim() === '') {
        errors.push(`${field.labels?.[0]?.textContent ?? field.name} is required`);
        AriaUtils.set(field, 'invalid', 'true');
      } else {
        AriaUtils.remove(field, 'invalid');
      }
    });

    if (errors.length > 0) {
      event.preventDefault();
      // Assertive announcement — interrupts current speech for errors
      announcer.announce(
        `Form has ${errors.length} error${errors.length > 1 ? 's' : ''}: ${errors.join('. ')}`,
        'assertive'
      );
    } else {
      announcer.announce('Form submitted successfully');
    }
  });

  return announcer;
}

// -----------------------------------------------------------------------------
// ReducedMotion: Adaptive Animations
// -----------------------------------------------------------------------------

/**
 * Create an animation system that respects user motion preferences.
 */
function setupAdaptiveAnimations(): () => void {
  function applyMotionPreference(reduced: boolean): void {
    const root = document.documentElement;

    if (reduced) {
      // Disable or simplify animations
      root.style.setProperty('--transition-duration', '0ms');
      root.style.setProperty('--animation-duration', '0ms');
      console.log('Animations disabled — user prefers reduced motion');
    } else {
      // Enable standard animations
      root.style.setProperty('--transition-duration', '300ms');
      root.style.setProperty('--animation-duration', '500ms');
      console.log('Animations enabled');
    }
  }

  // Apply current preference
  applyMotionPreference(ReducedMotion.isReduced());

  // Listen for changes (e.g. user toggles OS setting)
  return ReducedMotion.onChange(applyMotionPreference);
}

// -----------------------------------------------------------------------------
// SkipLink: Navigation Bypass
// -----------------------------------------------------------------------------

/**
 * Set up skip navigation links for a typical page layout.
 */
function setupSkipLinks(): () => void {
  // Skip to main content (most common)
  const cleanupMain = SkipLink.create({
    targetId: 'main-content',
    text: 'Skip to main content',
  });

  // Additional skip link for search (if present)
  const searchElement = document.getElementById('search-input');
  let cleanupSearch: (() => void) | null = null;

  if (searchElement !== null) {
    cleanupSearch = SkipLink.create({
      targetId: 'search-input',
      text: 'Skip to search',
    });
  }

  return () => {
    cleanupMain();
    cleanupSearch?.();
  };
}

// -----------------------------------------------------------------------------
// Combined Example: Accessible App Shell
// -----------------------------------------------------------------------------

/**
 * Set up a complete accessible application shell.
 */
function setupAccessibleApp(): () => void {
  const cleanups: (() => void)[] = [];

  // 1. Skip navigation
  cleanups.push(setupSkipLinks());

  // 2. Adaptive animations
  cleanups.push(setupAdaptiveAnimations());

  // 3. Disclosure widgets
  createDisclosure('faq-toggle', 'faq-content');

  // 4. Tab panel
  const tabList = document.getElementById('tab-list');
  if (tabList !== null) {
    const tabs = Array.from(tabList.querySelectorAll<HTMLElement>('[data-tab]'));
    const panels = tabs
      .map((tab) => document.getElementById(tab.dataset['tab'] ?? ''))
      .filter((panel): panel is HTMLElement => panel !== null);

    setupTabPanel(tabList, tabs, panels);
  }

  // 5. Screen reader announcements for form
  const form = document.querySelector<HTMLFormElement>('#contact-form');
  if (form !== null) {
    const announcer = setupFormAnnouncements(form);
    cleanups.push(() => announcer.destroy());
  }

  // 6. Todo list with announcements
  const todoContainer = document.getElementById('todo-list');
  if (todoContainer !== null) {
    const todoList = createAnnouncedTodoList(todoContainer);
    cleanups.push(() => todoList.destroy());

    // Example usage
    todoList.add('Review accessibility checklist');
    todoList.add('Test with screen reader');
  }

  // Return combined cleanup
  return () => {
    cleanups.forEach((cleanup) => cleanup());
  };
}

// Export for module usage
export {
  createDisclosure,
  setupTabPanel,
  createAnnouncedTodoList,
  setupFormAnnouncements,
  setupAdaptiveAnimations,
  setupSkipLinks,
  setupAccessibleApp,
};

// Run example if this is the entry point
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener('unload', setupAccessibleApp());
    console.log('Accessible app shell initialized');
  });
}
