import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FocusTrap, FocusTrapInstance } from '../../src/focus/index.js';

/**
 * Make elements visible in jsdom by setting offsetWidth/offsetHeight.
 * jsdom doesn't do layout, so these are 0 by default.
 */
function makeElementsVisible(container: Element): void {
  const elements = container.querySelectorAll('*');
  for (const el of elements) {
    Object.defineProperty(el, 'offsetWidth', { value: 100, configurable: true });
    Object.defineProperty(el, 'offsetHeight', { value: 20, configurable: true });
  }
  Object.defineProperty(container, 'offsetWidth', { value: 100, configurable: true });
  Object.defineProperty(container, 'offsetHeight', { value: 100, configurable: true });
}

describe('FocusTrap', () => {
  let container: HTMLDivElement;
  let outsideButton: HTMLButtonElement;
  const activeTraps: FocusTrapInstance[] = [];

  /**
   * Create a focus trap and track it for cleanup.
   */
  function createTrackedTrap(
    element: HTMLElement,
    options?: Parameters<typeof FocusTrap.create>[1]
  ): FocusTrapInstance {
    const trap = FocusTrap.create(element, options);
    activeTraps.push(trap);
    return trap;
  }

  beforeEach(() => {
    // Create container for focus trap
    container = document.createElement('div');
    container.innerHTML = `
      <button id="first">First</button>
      <input id="input" type="text" />
      <button id="last">Last</button>
    `;
    document.body.appendChild(container);
    makeElementsVisible(container);

    // Create element outside the trap
    outsideButton = document.createElement('button');
    outsideButton.id = 'outside';
    outsideButton.textContent = 'Outside';
    document.body.appendChild(outsideButton);
    // Make outside button visible too
    Object.defineProperty(outsideButton, 'offsetWidth', { value: 100, configurable: true });
    Object.defineProperty(outsideButton, 'offsetHeight', { value: 20, configurable: true });
  });

  afterEach(() => {
    // Deactivate all traps to clean up event listeners BEFORE removing containers
    for (const trap of activeTraps) {
      if (trap.isActive()) {
        trap.deactivate();
      }
    }
    activeTraps.length = 0;

    // Safely remove elements if they exist in the DOM
    if (container.parentNode) {
      container.remove();
    }
    if (outsideButton.parentNode) {
      outsideButton.remove();
    }
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // Factory Method
  // ===========================================================================

  describe('create', () => {
    it('should create a focus trap instance', () => {
      const trap = createTrackedTrap(container);

      expect(trap).toBeDefined();
      expect(typeof trap.activate).toBe('function');
      expect(typeof trap.deactivate).toBe('function');
      expect(typeof trap.pause).toBe('function');
      expect(typeof trap.unpause).toBe('function');
      expect(typeof trap.isActive).toBe('function');
      expect(typeof trap.isPaused).toBe('function');
    });

    it('should create focus trap with default options', () => {
      const trap = createTrackedTrap(container);

      expect(trap.isActive()).toBe(false);
      expect(trap.isPaused()).toBe(false);
    });

    it('should create focus trap with custom options', () => {
      const onEscapeDeactivate = vi.fn();

      const trap = createTrackedTrap(container, {
        initialFocus: '#input',
        returnFocus: true,
        escapeDeactivates: true,
        onEscapeDeactivate,
        allowOutsideClick: false,
      });

      expect(trap).toBeDefined();
    });
  });

  // ===========================================================================
  // activate()
  // ===========================================================================

  describe('activate', () => {
    it('should activate the focus trap', () => {
      const trap = createTrackedTrap(container);

      trap.activate();

      expect(trap.isActive()).toBe(true);
    });

    it('should focus first focusable element by default', async () => {
      const trap = createTrackedTrap(container);

      trap.activate();

      // Wait for requestAnimationFrame
      await new Promise((resolve) => requestAnimationFrame(resolve));

      expect(document.activeElement?.id).toBe('first');
    });

    it('should focus specified element via selector', async () => {
      const trap = createTrackedTrap(container, {
        initialFocus: '#input',
      });

      trap.activate();

      await new Promise((resolve) => requestAnimationFrame(resolve));

      expect(document.activeElement?.id).toBe('input');
    });

    it('should focus specified element via HTMLElement', async () => {
      const input = container.querySelector('#input') as HTMLInputElement;
      const trap = createTrackedTrap(container, {
        initialFocus: input,
      });

      trap.activate();

      await new Promise((resolve) => requestAnimationFrame(resolve));

      expect(document.activeElement?.id).toBe('input');
    });

    it('should focus first focusable when initialFocus element is not focusable', async () => {
      const div = document.createElement('div');
      div.id = 'non-focusable';
      container.appendChild(div);

      const trap = createTrackedTrap(container, {
        initialFocus: div,
      });

      trap.activate();

      await new Promise((resolve) => requestAnimationFrame(resolve));

      expect(document.activeElement?.id).toBe('first');
    });

    it('should focus first focusable when initialFocus selector returns null', async () => {
      const trap = createTrackedTrap(container, {
        initialFocus: '#nonexistent',
      });

      trap.activate();

      await new Promise((resolve) => requestAnimationFrame(resolve));

      expect(document.activeElement?.id).toBe('first');
    });

    it('should not activate if already active', () => {
      const trap = createTrackedTrap(container);

      trap.activate();
      expect(trap.isActive()).toBe(true);

      // Second activation should be ignored
      trap.activate();
      expect(trap.isActive()).toBe(true);
    });

    it('should not set focus if deactivated before requestAnimationFrame', async () => {
      const trap = createTrackedTrap(container);

      outsideButton.focus();
      expect(document.activeElement).toBe(outsideButton);

      trap.activate();
      trap.deactivate();

      await new Promise((resolve) => requestAnimationFrame(resolve));

      // Focus should remain on outside button since trap was deactivated
      expect(document.activeElement).toBe(outsideButton);
    });
  });

  // ===========================================================================
  // deactivate()
  // ===========================================================================

  describe('deactivate', () => {
    it('should deactivate the focus trap', () => {
      const trap = createTrackedTrap(container);

      trap.activate();
      expect(trap.isActive()).toBe(true);

      trap.deactivate();
      expect(trap.isActive()).toBe(false);
    });

    it('should reset paused state on deactivate', () => {
      const trap = createTrackedTrap(container);

      trap.activate();
      trap.pause();
      expect(trap.isPaused()).toBe(true);

      trap.deactivate();
      expect(trap.isPaused()).toBe(false);
    });

    it('should return focus to previously focused element when returnFocus is true', async () => {
      outsideButton.focus();
      expect(document.activeElement).toBe(outsideButton);

      const trap = createTrackedTrap(container, { returnFocus: true });

      trap.activate();
      await new Promise((resolve) => requestAnimationFrame(resolve));

      expect(document.activeElement?.id).toBe('first');

      trap.deactivate();

      expect(document.activeElement).toBe(outsideButton);
    });

    it('should not return focus when returnFocus is false', async () => {
      outsideButton.focus();

      const trap = createTrackedTrap(container, { returnFocus: false });

      trap.activate();
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const firstButton = container.querySelector('#first') as HTMLButtonElement;
      expect(document.activeElement).toBe(firstButton);

      trap.deactivate();

      // Focus should stay on the first button (or wherever it was)
      expect(document.activeElement).toBe(firstButton);
    });

    it('should not deactivate if not active', () => {
      const trap = createTrackedTrap(container);

      expect(trap.isActive()).toBe(false);

      // Should not throw
      expect(() => trap.deactivate()).not.toThrow();
      expect(trap.isActive()).toBe(false);
    });

    it('should remove event listeners on deactivate', async () => {
      const trap = createTrackedTrap(container, { escapeDeactivates: true });

      trap.activate();
      await new Promise((resolve) => requestAnimationFrame(resolve));

      trap.deactivate();

      // Pressing Escape should not re-trigger deactivation logic
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);

      expect(trap.isActive()).toBe(false);
    });
  });

  // ===========================================================================
  // pause() / unpause()
  // ===========================================================================

  describe('pause', () => {
    it('should pause the focus trap', () => {
      const trap = createTrackedTrap(container);

      trap.activate();
      trap.pause();

      expect(trap.isPaused()).toBe(true);
    });

    it('should not pause if not active', () => {
      const trap = createTrackedTrap(container);

      trap.pause();

      expect(trap.isPaused()).toBe(false);
    });
  });

  describe('unpause', () => {
    it('should unpause the focus trap', () => {
      const trap = createTrackedTrap(container);

      trap.activate();
      trap.pause();
      expect(trap.isPaused()).toBe(true);

      trap.unpause();
      expect(trap.isPaused()).toBe(false);
    });

    it('should not unpause if not active', () => {
      const trap = createTrackedTrap(container);

      trap.unpause();

      expect(trap.isPaused()).toBe(false);
    });
  });

  // ===========================================================================
  // isActive() / isPaused()
  // ===========================================================================

  describe('isActive', () => {
    it('should return false initially', () => {
      const trap = createTrackedTrap(container);

      expect(trap.isActive()).toBe(false);
    });

    it('should return true after activation', () => {
      const trap = createTrackedTrap(container);

      trap.activate();

      expect(trap.isActive()).toBe(true);
    });

    it('should return false after deactivation', () => {
      const trap = createTrackedTrap(container);

      trap.activate();
      trap.deactivate();

      expect(trap.isActive()).toBe(false);
    });
  });

  describe('isPaused', () => {
    it('should return false initially', () => {
      const trap = createTrackedTrap(container);

      expect(trap.isPaused()).toBe(false);
    });

    it('should return true after pause', () => {
      const trap = createTrackedTrap(container);

      trap.activate();
      trap.pause();

      expect(trap.isPaused()).toBe(true);
    });

    it('should return false after unpause', () => {
      const trap = createTrackedTrap(container);

      trap.activate();
      trap.pause();
      trap.unpause();

      expect(trap.isPaused()).toBe(false);
    });
  });

  // ===========================================================================
  // Tab Key Trapping
  // ===========================================================================

  describe('Tab Key Trapping', () => {
    it('should wrap focus from last to first on Tab', async () => {
      const trap = createTrackedTrap(container);

      trap.activate();
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const lastButton = container.querySelector('#last') as HTMLButtonElement;
      lastButton.focus();

      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(tabEvent);

      expect(document.activeElement?.id).toBe('first');
    });

    it('should wrap focus from first to last on Shift+Tab', async () => {
      const trap = createTrackedTrap(container);

      trap.activate();
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const firstButton = container.querySelector('#first') as HTMLButtonElement;
      firstButton.focus();

      const shiftTabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(shiftTabEvent);

      expect(document.activeElement?.id).toBe('last');
    });

    it('should handle Tab when focus is outside container', async () => {
      const trap = createTrackedTrap(container);

      trap.activate();
      await new Promise((resolve) => requestAnimationFrame(resolve));

      // Simulate focus being outside (e.g., programmatically set)
      outsideButton.focus();

      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(tabEvent);

      expect(document.activeElement?.id).toBe('first');
    });

    it('should handle Shift+Tab when focus is outside container', async () => {
      const trap = createTrackedTrap(container);

      trap.activate();
      await new Promise((resolve) => requestAnimationFrame(resolve));

      // Simulate focus being outside
      outsideButton.focus();

      const shiftTabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(shiftTabEvent);

      expect(document.activeElement?.id).toBe('last');
    });

    it('should prevent Tab when no focusable elements', async () => {
      const emptyContainer = document.createElement('div');
      document.body.appendChild(emptyContainer);

      const trap = createTrackedTrap(emptyContainer);

      trap.activate();
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      });

      const preventDefaultSpy = vi.spyOn(tabEvent, 'preventDefault');
      document.dispatchEvent(tabEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();

      emptyContainer.remove();
    });

    it('should not trap Tab when paused', async () => {
      const trap = createTrackedTrap(container);

      trap.activate();
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const lastButton = container.querySelector('#last') as HTMLButtonElement;
      lastButton.focus();

      trap.pause();

      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      });

      const preventDefaultSpy = vi.spyOn(tabEvent, 'preventDefault');
      document.dispatchEvent(tabEvent);

      // When paused, the handler returns early, so default is not prevented
      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Escape Key Deactivation
  // ===========================================================================

  describe('Escape Key Deactivation', () => {
    it('should deactivate on Escape when escapeDeactivates is true', async () => {
      const trap = createTrackedTrap(container, { escapeDeactivates: true });

      trap.activate();
      await new Promise((resolve) => requestAnimationFrame(resolve));

      expect(trap.isActive()).toBe(true);

      const escapeEvent = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(escapeEvent);

      expect(trap.isActive()).toBe(false);
    });

    it('should not deactivate on Escape when escapeDeactivates is false', async () => {
      const trap = createTrackedTrap(container, { escapeDeactivates: false });

      trap.activate();
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const escapeEvent = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(escapeEvent);

      expect(trap.isActive()).toBe(true);
    });

    it('should call onEscapeDeactivate callback', async () => {
      const onEscapeDeactivate = vi.fn();
      const trap = createTrackedTrap(container, {
        escapeDeactivates: true,
        onEscapeDeactivate,
      });

      trap.activate();
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const escapeEvent = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(escapeEvent);

      expect(onEscapeDeactivate).toHaveBeenCalledTimes(1);
    });

    it('should not call onEscapeDeactivate when escapeDeactivates is false', async () => {
      const onEscapeDeactivate = vi.fn();
      const trap = createTrackedTrap(container, {
        escapeDeactivates: false,
        onEscapeDeactivate,
      });

      trap.activate();
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const escapeEvent = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(escapeEvent);

      expect(onEscapeDeactivate).not.toHaveBeenCalled();
    });

    it('should not deactivate on Escape when paused', async () => {
      const trap = createTrackedTrap(container, { escapeDeactivates: true });

      trap.activate();
      await new Promise((resolve) => requestAnimationFrame(resolve));

      trap.pause();

      const escapeEvent = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(escapeEvent);

      expect(trap.isActive()).toBe(true);
    });

    it('should prevent default on Escape', async () => {
      const trap = createTrackedTrap(container, { escapeDeactivates: true });

      trap.activate();
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const escapeEvent = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      });

      const preventDefaultSpy = vi.spyOn(escapeEvent, 'preventDefault');
      document.dispatchEvent(escapeEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Focus Restoration
  // ===========================================================================

  describe('Focus Restoration', () => {
    it('should restore focus to previously focused element on deactivate', async () => {
      outsideButton.focus();
      expect(document.activeElement).toBe(outsideButton);

      const trap = createTrackedTrap(container, { returnFocus: true });

      trap.activate();
      await new Promise((resolve) => requestAnimationFrame(resolve));

      trap.deactivate();

      expect(document.activeElement).toBe(outsideButton);
    });

    it('should not restore focus when returnFocus is false', async () => {
      outsideButton.focus();

      const trap = createTrackedTrap(container, { returnFocus: false });

      trap.activate();
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const firstButton = container.querySelector('#first') as HTMLButtonElement;
      trap.deactivate();

      expect(document.activeElement).toBe(firstButton);
    });

    it('should handle when previouslyFocused is not an HTMLElement', async () => {
      // Focus document body or similar
      document.body.focus();

      const trap = createTrackedTrap(container, { returnFocus: true });

      trap.activate();
      await new Promise((resolve) => requestAnimationFrame(resolve));

      // Should not throw when deactivating
      expect(() => trap.deactivate()).not.toThrow();
    });
  });

  // ===========================================================================
  // Initial Focus Targeting
  // ===========================================================================

  describe('Initial Focus Targeting', () => {
    it('should focus element by selector string', async () => {
      const trap = createTrackedTrap(container, { initialFocus: '#input' });

      trap.activate();
      await new Promise((resolve) => requestAnimationFrame(resolve));

      expect(document.activeElement?.id).toBe('input');
    });

    it('should focus element by HTMLElement reference', async () => {
      const input = container.querySelector('#input') as HTMLInputElement;
      const trap = createTrackedTrap(container, { initialFocus: input });

      trap.activate();
      await new Promise((resolve) => requestAnimationFrame(resolve));

      expect(document.activeElement).toBe(input);
    });

    it('should fallback to first focusable when initialFocus is null', async () => {
      const trap = createTrackedTrap(container, { initialFocus: null });

      trap.activate();
      await new Promise((resolve) => requestAnimationFrame(resolve));

      expect(document.activeElement?.id).toBe('first');
    });

    it('should fallback to first focusable when selector matches non-focusable element', async () => {
      container.innerHTML = `
        <div id="div">Not focusable</div>
        <button id="button">Button</button>
      `;
      makeElementsVisible(container);

      const trap = createTrackedTrap(container, { initialFocus: '#div' });

      trap.activate();
      await new Promise((resolve) => requestAnimationFrame(resolve));

      expect(document.activeElement?.id).toBe('button');
    });
  });

  // ===========================================================================
  // allowOutsideClick Option
  // ===========================================================================

  describe('allowOutsideClick Option', () => {
    it('should allow outside clicks when allowOutsideClick is true (default)', async () => {
      const trap = createTrackedTrap(container, { allowOutsideClick: true });

      trap.activate();
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });

      const preventDefaultSpy = vi.spyOn(clickEvent, 'preventDefault');
      outsideButton.dispatchEvent(clickEvent);

      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });

    it('should prevent outside clicks when allowOutsideClick is false', async () => {
      const trap = createTrackedTrap(container, { allowOutsideClick: false });

      trap.activate();
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });

      const preventDefaultSpy = vi.spyOn(clickEvent, 'preventDefault');
      outsideButton.dispatchEvent(clickEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should allow inside clicks when allowOutsideClick is false', async () => {
      const trap = createTrackedTrap(container, { allowOutsideClick: false });

      trap.activate();
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const firstButton = container.querySelector('#first') as HTMLButtonElement;

      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });

      const preventDefaultSpy = vi.spyOn(clickEvent, 'preventDefault');
      firstButton.dispatchEvent(clickEvent);

      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });

    it('should not prevent outside clicks when paused', async () => {
      const trap = createTrackedTrap(container, { allowOutsideClick: false });

      trap.activate();
      await new Promise((resolve) => requestAnimationFrame(resolve));

      trap.pause();

      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });

      const preventDefaultSpy = vi.spyOn(clickEvent, 'preventDefault');
      outsideButton.dispatchEvent(clickEvent);

      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Focus In Handler
  // ===========================================================================

  describe('Focus In Handler', () => {
    it('should bring focus back when focus escapes to outside element', async () => {
      const trap = createTrackedTrap(container);

      trap.activate();
      await new Promise((resolve) => requestAnimationFrame(resolve));

      // Dispatch focusin on outside element
      const focusInEvent = new FocusEvent('focusin', {
        bubbles: true,
        cancelable: true,
      });

      Object.defineProperty(focusInEvent, 'target', {
        value: outsideButton,
        writable: false,
      });

      document.dispatchEvent(focusInEvent);

      // Focus should be brought back to first focusable
      expect(document.activeElement?.id).toBe('first');
    });

    it('should not interfere when focus is within container', async () => {
      const trap = createTrackedTrap(container);

      trap.activate();
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const input = container.querySelector('#input') as HTMLInputElement;
      input.focus();

      const focusInEvent = new FocusEvent('focusin', {
        bubbles: true,
        cancelable: true,
      });

      Object.defineProperty(focusInEvent, 'target', {
        value: input,
        writable: false,
      });

      document.dispatchEvent(focusInEvent);

      expect(document.activeElement).toBe(input);
    });

    it('should not handle focusin when paused', async () => {
      const trap = createTrackedTrap(container);

      trap.activate();
      await new Promise((resolve) => requestAnimationFrame(resolve));

      trap.pause();

      outsideButton.focus();

      const focusInEvent = new FocusEvent('focusin', {
        bubbles: true,
        cancelable: true,
      });

      Object.defineProperty(focusInEvent, 'target', {
        value: outsideButton,
        writable: false,
      });

      document.dispatchEvent(focusInEvent);

      // Focus should remain on outside button since trap is paused
      expect(document.activeElement).toBe(outsideButton);
    });

    it('should handle null target in focusin event', async () => {
      const trap = createTrackedTrap(container);

      trap.activate();
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const focusInEvent = new FocusEvent('focusin', {
        bubbles: true,
        cancelable: true,
      });

      Object.defineProperty(focusInEvent, 'target', {
        value: null,
        writable: false,
      });

      // Should not throw
      expect(() => document.dispatchEvent(focusInEvent)).not.toThrow();
    });
  });

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  describe('Cleanup', () => {
    it('should remove all event listeners on deactivate', async () => {
      const trap = createTrackedTrap(container, {
        escapeDeactivates: true,
        allowOutsideClick: false,
      });

      trap.activate();
      await new Promise((resolve) => requestAnimationFrame(resolve));

      trap.deactivate();

      // Verify event listeners are removed by ensuring handlers don't run
      const escapeEvent = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      });

      const preventDefaultSpy = vi.spyOn(escapeEvent, 'preventDefault');
      document.dispatchEvent(escapeEvent);

      // Since trap is deactivated, preventDefault should not be called
      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });

    it('should clean up click handler when allowOutsideClick is false', async () => {
      const trap = createTrackedTrap(container, { allowOutsideClick: false });

      trap.activate();
      await new Promise((resolve) => requestAnimationFrame(resolve));

      trap.deactivate();

      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });

      const preventDefaultSpy = vi.spyOn(clickEvent, 'preventDefault');
      outsideButton.dispatchEvent(clickEvent);

      // Click should not be prevented after deactivation
      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle container with single focusable element', async () => {
      container.innerHTML = '<button id="only">Only</button>';
      makeElementsVisible(container);

      const trap = createTrackedTrap(container);

      trap.activate();
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const onlyButton = container.querySelector('#only') as HTMLButtonElement;
      expect(document.activeElement).toBe(onlyButton);

      // Tab should keep focus on same element
      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(tabEvent);

      expect(document.activeElement).toBe(onlyButton);
    });

    it('should handle container with no focusable elements', async () => {
      container.innerHTML = '<div><span>No focusables</span></div>';

      const trap = createTrackedTrap(container);

      trap.activate();
      await new Promise((resolve) => requestAnimationFrame(resolve));

      // Should not throw
      expect(trap.isActive()).toBe(true);
    });

    it('should handle rapid activate/deactivate cycles', async () => {
      const trap = createTrackedTrap(container);

      trap.activate();
      trap.deactivate();
      trap.activate();
      trap.deactivate();
      trap.activate();

      expect(trap.isActive()).toBe(true);

      await new Promise((resolve) => requestAnimationFrame(resolve));

      trap.deactivate();
      expect(trap.isActive()).toBe(false);
    });

    it('should handle focus on deeply nested elements', async () => {
      container.innerHTML = `
        <div>
          <div>
            <div>
              <button id="nested">Nested Button</button>
            </div>
          </div>
        </div>
      `;
      makeElementsVisible(container);

      const trap = createTrackedTrap(container);

      trap.activate();
      await new Promise((resolve) => requestAnimationFrame(resolve));

      expect(document.activeElement?.id).toBe('nested');
    });

    it('should work with multiple focus traps (switching between them)', async () => {
      const container2 = document.createElement('div');
      container2.innerHTML = '<button id="other">Other</button>';
      document.body.appendChild(container2);
      makeElementsVisible(container2);

      const trap1 = createTrackedTrap(container);
      const trap2 = createTrackedTrap(container2);

      // Activate trap1
      trap1.activate();
      await new Promise((resolve) => requestAnimationFrame(resolve));

      expect(trap1.isActive()).toBe(true);
      expect(trap2.isActive()).toBe(false);
      expect(document.activeElement?.id).toBe('first');

      // Deactivate trap1 before activating trap2 to avoid conflicts
      trap1.deactivate();

      // Now activate trap2
      trap2.activate();
      await new Promise((resolve) => requestAnimationFrame(resolve));

      expect(trap1.isActive()).toBe(false);
      expect(trap2.isActive()).toBe(true);
      expect(document.activeElement?.id).toBe('other');

      trap2.deactivate();

      container2.remove();
    });
  });

  // ===========================================================================
  // Various Focusable Elements
  // ===========================================================================

  describe('Various Focusable Elements', () => {
    it('should work with input, button, a, textarea, select', async () => {
      container.innerHTML = `
        <input id="input" type="text" />
        <button id="button">Button</button>
        <a id="link" href="#">Link</a>
        <textarea id="textarea"></textarea>
        <select id="select"><option>Option</option></select>
      `;
      makeElementsVisible(container);

      const trap = createTrackedTrap(container);

      trap.activate();
      await new Promise((resolve) => requestAnimationFrame(resolve));

      // Should focus first (input)
      expect(document.activeElement?.id).toBe('input');

      // Navigate to last
      const select = container.querySelector('#select') as HTMLSelectElement;
      select.focus();

      // Tab should wrap to first
      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(tabEvent);

      expect(document.activeElement?.id).toBe('input');
    });

    it('should work with elements that have tabindex', async () => {
      container.innerHTML = `
        <div id="div1" tabindex="0">Div 1</div>
        <div id="div2" tabindex="1">Div 2</div>
        <div id="div3" tabindex="2">Div 3</div>
      `;
      makeElementsVisible(container);

      const trap = createTrackedTrap(container);

      trap.activate();
      await new Promise((resolve) => requestAnimationFrame(resolve));

      // Should focus first in DOM order
      expect(document.activeElement?.id).toBe('div1');
    });

    it('should skip elements with tabindex=-1', async () => {
      container.innerHTML = `
        <button id="btn1">Button 1</button>
        <button id="skip" tabindex="-1">Skip</button>
        <button id="btn2">Button 2</button>
      `;
      makeElementsVisible(container);

      const trap = createTrackedTrap(container);

      trap.activate();
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const btn1 = container.querySelector('#btn1') as HTMLButtonElement;
      btn1.focus();

      // Note: The trap doesn't actually move focus on Tab (browser does),
      // it only handles wrapping. This test verifies the skip element
      // is not in the focusables list.
      const btn2 = container.querySelector('#btn2') as HTMLButtonElement;
      btn2.focus();

      // Shift+Tab from btn2 should wrap to btn1 (skipping #skip)
      const shiftTabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      });

      // At last focusable (btn2), going backwards
      document.dispatchEvent(shiftTabEvent);

      // Focus should remain on btn2 since browser handles actual tab,
      // trap only wraps at boundaries. Let's test the wrap case.
      btn1.focus();
      document.dispatchEvent(shiftTabEvent);

      // Should wrap to last (btn2)
      expect(document.activeElement?.id).toBe('btn2');
    });
  });

  // ===========================================================================
  // Coverage Gaps
  // ===========================================================================

  describe('Coverage Gaps', () => {
    it('should return early from handleTab when container is not in document (line 134)', async () => {
      const trap = createTrackedTrap(container);

      trap.activate();
      await new Promise((resolve) => requestAnimationFrame(resolve));

      // Remove container from DOM while trap is still active
      container.remove();

      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      });

      const preventDefaultSpy = vi.spyOn(tabEvent, 'preventDefault');

      // Should not throw - handleTab returns early
      expect(() => document.dispatchEvent(tabEvent)).not.toThrow();

      // preventDefault should not be called since handler returned early
      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });

    it('should return early from handleFocusIn when container is not in document (line 166)', async () => {
      const trap = createTrackedTrap(container);

      trap.activate();
      await new Promise((resolve) => requestAnimationFrame(resolve));

      // Remove container from DOM while trap is still active
      container.remove();

      const focusInEvent = new FocusEvent('focusin', {
        bubbles: true,
        cancelable: true,
      });

      Object.defineProperty(focusInEvent, 'target', {
        value: outsideButton,
        writable: false,
      });

      // Should not throw - handleFocusIn returns early
      expect(() => document.dispatchEvent(focusInEvent)).not.toThrow();
    });

    it('should return early from handleClick when container is not in document (line 181)', async () => {
      const trap = createTrackedTrap(container, { allowOutsideClick: false });

      trap.activate();
      await new Promise((resolve) => requestAnimationFrame(resolve));

      // Remove container from DOM while trap is still active
      container.remove();

      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });

      const preventDefaultSpy = vi.spyOn(clickEvent, 'preventDefault');
      outsideButton.dispatchEvent(clickEvent);

      // preventDefault should not be called since handler returned early
      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });
  });
});
