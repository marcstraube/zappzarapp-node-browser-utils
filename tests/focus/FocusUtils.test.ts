import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FocusUtils } from '../../src/focus/index.js';

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
  // Also make container visible
  Object.defineProperty(container, 'offsetWidth', { value: 100, configurable: true });
  Object.defineProperty(container, 'offsetHeight', { value: 100, configurable: true });
}

/**
 * Set innerHTML and make elements visible.
 */
function setHTML(container: Element, html: string): void {
  container.innerHTML = html;
  makeElementsVisible(container);
}

describe('FocusUtils', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  // ===========================================================================
  // getFocusableElements
  // ===========================================================================

  describe('getFocusableElements', () => {
    it('should return empty array for container with no focusable elements', () => {
      container.innerHTML = '<div><span>Text</span></div>';

      const focusables = FocusUtils.getFocusableElements(container);

      expect(focusables).toEqual([]);
    });

    it('should find button elements', () => {
      container.innerHTML = '<button>Click</button>';
      makeElementsVisible(container);

      const focusables = FocusUtils.getFocusableElements(container);

      expect(focusables.length).toBe(1);
      expect(focusables[0]?.tagName.toLowerCase()).toBe('button');
    });

    it('should find input elements', () => {
      container.innerHTML = '<input type="text" />';
      makeElementsVisible(container);

      const focusables = FocusUtils.getFocusableElements(container);

      expect(focusables.length).toBe(1);
      expect(focusables[0]?.tagName.toLowerCase()).toBe('input');
    });

    it('should find textarea elements', () => {
      container.innerHTML = '<textarea></textarea>';
      makeElementsVisible(container);

      const focusables = FocusUtils.getFocusableElements(container);

      expect(focusables.length).toBe(1);
      expect(focusables[0]?.tagName.toLowerCase()).toBe('textarea');
    });

    it('should find select elements', () => {
      container.innerHTML = '<select><option>Option</option></select>';
      makeElementsVisible(container);

      const focusables = FocusUtils.getFocusableElements(container);

      expect(focusables.length).toBe(1);
      expect(focusables[0]?.tagName.toLowerCase()).toBe('select');
    });

    it('should find anchor elements with href', () => {
      container.innerHTML = '<a href="https://example.com">Link</a>';
      makeElementsVisible(container);

      const focusables = FocusUtils.getFocusableElements(container);

      expect(focusables.length).toBe(1);
      expect(focusables[0]?.tagName.toLowerCase()).toBe('a');
    });

    it('should not find anchor elements without href', () => {
      container.innerHTML = '<a>Not a link</a>';

      const focusables = FocusUtils.getFocusableElements(container);

      expect(focusables).toEqual([]);
    });

    it('should find elements with positive tabindex', () => {
      setHTML(container, '<div tabindex="0">Focusable div</div>');

      const focusables = FocusUtils.getFocusableElements(container);

      expect(focusables.length).toBe(1);
    });

    it('should not find elements with tabindex=-1', () => {
      container.innerHTML = '<div tabindex="-1">Not tabbable</div>';

      const focusables = FocusUtils.getFocusableElements(container);

      expect(focusables).toEqual([]);
    });

    it('should not find disabled button', () => {
      container.innerHTML = '<button disabled>Disabled</button>';

      const focusables = FocusUtils.getFocusableElements(container);

      expect(focusables).toEqual([]);
    });

    it('should not find disabled input', () => {
      container.innerHTML = '<input type="text" disabled />';

      const focusables = FocusUtils.getFocusableElements(container);

      expect(focusables).toEqual([]);
    });

    it('should not find disabled textarea', () => {
      container.innerHTML = '<textarea disabled></textarea>';

      const focusables = FocusUtils.getFocusableElements(container);

      expect(focusables).toEqual([]);
    });

    it('should not find disabled select', () => {
      container.innerHTML = '<select disabled><option>Option</option></select>';

      const focusables = FocusUtils.getFocusableElements(container);

      expect(focusables).toEqual([]);
    });

    it('should not find hidden input', () => {
      container.innerHTML = '<input type="hidden" />';

      const focusables = FocusUtils.getFocusableElements(container);

      expect(focusables).toEqual([]);
    });

    it('should find multiple focusable elements', () => {
      setHTML(
        container,
        `
        <button>Button 1</button>
        <input type="text" />
        <a href="#">Link</a>
        <button>Button 2</button>
      `
      );

      const focusables = FocusUtils.getFocusableElements(container);

      expect(focusables.length).toBe(4);
    });

    it('should find contenteditable elements', () => {
      setHTML(container, '<div contenteditable="true">Editable</div>');

      const focusables = FocusUtils.getFocusableElements(container);

      expect(focusables.length).toBe(1);
    });

    it('should find audio elements with controls', () => {
      // Audio elements in jsdom need explicit styling to be considered visible
      container.innerHTML =
        '<audio controls style="display: block; width: 300px; height: 54px;"></audio>';
      const audio = container.querySelector('audio')!;

      // Also set offsetWidth/offsetHeight since jsdom doesn't compute layout
      Object.defineProperty(audio, 'offsetWidth', { value: 300, configurable: true });
      Object.defineProperty(audio, 'offsetHeight', { value: 54, configurable: true });

      const focusables = FocusUtils.getFocusableElements(container);

      expect(focusables.length).toBe(1);
    });

    it('should find video elements with controls', () => {
      setHTML(container, '<video controls></video>');

      const focusables = FocusUtils.getFocusableElements(container);

      expect(focusables.length).toBe(1);
    });

    it('should find area elements with href', () => {
      setHTML(
        container,
        `
        <map name="test">
          <area href="#" alt="area" />
        </map>
      `
      );

      const focusables = FocusUtils.getFocusableElements(container);

      expect(focusables.length).toBe(1);
    });

    it('should not include container when includeContainer is false', () => {
      container.setAttribute('tabindex', '0');
      setHTML(container, '<button>Button</button>');

      const focusables = FocusUtils.getFocusableElements(container, false);

      expect(focusables.length).toBe(1);
      expect(focusables[0]?.tagName.toLowerCase()).toBe('button');
    });

    it('should include container when includeContainer is true and container is focusable', () => {
      container.setAttribute('tabindex', '0');
      setHTML(container, '<button>Button</button>');

      const focusables = FocusUtils.getFocusableElements(container, true);

      expect(focusables.length).toBe(2);
      expect(focusables[0]).toBe(container);
    });

    it('should not include container when includeContainer is true but container is not focusable', () => {
      setHTML(container, '<button>Button</button>');

      const focusables = FocusUtils.getFocusableElements(container, true);

      expect(focusables.length).toBe(1);
      expect(focusables[0]).not.toBe(container);
    });

    it('should not find elements with display:none', () => {
      container.innerHTML = '<button style="display: none;">Hidden</button>';

      const focusables = FocusUtils.getFocusableElements(container);

      expect(focusables).toEqual([]);
    });

    it('should not find elements with visibility:hidden', () => {
      container.innerHTML = '<button style="visibility: hidden;">Hidden</button>';

      const focusables = FocusUtils.getFocusableElements(container);

      expect(focusables).toEqual([]);
    });

    it('should not find elements with hidden attribute', () => {
      container.innerHTML = '<button hidden>Hidden</button>';

      const focusables = FocusUtils.getFocusableElements(container);

      expect(focusables).toEqual([]);
    });

    it('should find details summary element', () => {
      setHTML(
        container,
        `
        <details>
          <summary>Summary</summary>
          <p>Details content</p>
        </details>
      `
      );

      const focusables = FocusUtils.getFocusableElements(container);

      expect(focusables.length).toBe(1);
      expect(focusables[0]?.tagName.toLowerCase()).toBe('summary');
    });
  });

  // ===========================================================================
  // getFirstFocusable
  // ===========================================================================

  describe('getFirstFocusable', () => {
    it('should return first focusable element', () => {
      setHTML(
        container,
        `
        <button id="first">First</button>
        <button id="second">Second</button>
      `
      );

      const first = FocusUtils.getFirstFocusable(container);

      expect(first?.id).toBe('first');
    });

    it('should return null when no focusable elements', () => {
      container.innerHTML = '<div><span>Text</span></div>';

      const first = FocusUtils.getFirstFocusable(container);

      expect(first).toBeNull();
    });
  });

  // ===========================================================================
  // getLastFocusable
  // ===========================================================================

  describe('getLastFocusable', () => {
    it('should return last focusable element', () => {
      setHTML(
        container,
        `
        <button id="first">First</button>
        <button id="last">Last</button>
      `
      );

      const last = FocusUtils.getLastFocusable(container);

      expect(last?.id).toBe('last');
    });

    it('should return null when no focusable elements', () => {
      container.innerHTML = '<div><span>Text</span></div>';

      const last = FocusUtils.getLastFocusable(container);

      expect(last).toBeNull();
    });
  });

  // ===========================================================================
  // focusFirstFocusable
  // ===========================================================================

  describe('focusFirstFocusable', () => {
    it('should focus first focusable element and return true', () => {
      setHTML(
        container,
        `
        <button id="first">First</button>
        <button id="second">Second</button>
      `
      );

      const result = FocusUtils.focusFirstFocusable(container);

      expect(result).toBe(true);
      expect(document.activeElement?.id).toBe('first');
    });

    it('should return false when no focusable elements', () => {
      container.innerHTML = '<div><span>Text</span></div>';

      const result = FocusUtils.focusFirstFocusable(container);

      expect(result).toBe(false);
    });
  });

  // ===========================================================================
  // focusLastFocusable
  // ===========================================================================

  describe('focusLastFocusable', () => {
    it('should focus last focusable element and return true', () => {
      setHTML(
        container,
        `
        <button id="first">First</button>
        <button id="last">Last</button>
      `
      );

      const result = FocusUtils.focusLastFocusable(container);

      expect(result).toBe(true);
      expect(document.activeElement?.id).toBe('last');
    });

    it('should return false when no focusable elements', () => {
      container.innerHTML = '<div><span>Text</span></div>';

      const result = FocusUtils.focusLastFocusable(container);

      expect(result).toBe(false);
    });
  });

  // ===========================================================================
  // isFocusable
  // ===========================================================================

  describe('isFocusable', () => {
    it('should return true for focusable button', () => {
      const button = document.createElement('button');
      container.appendChild(button);
      makeElementsVisible(container);

      expect(FocusUtils.isFocusable(button)).toBe(true);
    });

    it('should return true for focusable input', () => {
      const input = document.createElement('input');
      container.appendChild(input);
      makeElementsVisible(container);

      expect(FocusUtils.isFocusable(input)).toBe(true);
    });

    it('should return true for focusable textarea', () => {
      const textarea = document.createElement('textarea');
      container.appendChild(textarea);
      makeElementsVisible(container);

      expect(FocusUtils.isFocusable(textarea)).toBe(true);
    });

    it('should return true for focusable select', () => {
      const select = document.createElement('select');
      container.appendChild(select);
      makeElementsVisible(container);

      expect(FocusUtils.isFocusable(select)).toBe(true);
    });

    it('should return true for anchor with href', () => {
      const anchor = document.createElement('a');
      anchor.href = 'https://example.com';
      container.appendChild(anchor);
      makeElementsVisible(container);

      expect(FocusUtils.isFocusable(anchor)).toBe(true);
    });

    it('should return false for anchor without href', () => {
      const anchor = document.createElement('a');
      container.appendChild(anchor);

      expect(FocusUtils.isFocusable(anchor)).toBe(false);
    });

    it('should return true for element with tabindex=0', () => {
      const div = document.createElement('div');
      div.setAttribute('tabindex', '0');
      container.appendChild(div);
      makeElementsVisible(container);

      expect(FocusUtils.isFocusable(div)).toBe(true);
    });

    it('should return false for element with tabindex=-1', () => {
      const div = document.createElement('div');
      div.setAttribute('tabindex', '-1');
      container.appendChild(div);

      expect(FocusUtils.isFocusable(div)).toBe(false);
    });

    it('should return false for disabled button', () => {
      const button = document.createElement('button');
      button.disabled = true;
      container.appendChild(button);

      expect(FocusUtils.isFocusable(button)).toBe(false);
    });

    it('should return false for disabled input', () => {
      const input = document.createElement('input');
      input.disabled = true;
      container.appendChild(input);

      expect(FocusUtils.isFocusable(input)).toBe(false);
    });

    it('should return false for hidden element (display:none)', () => {
      const button = document.createElement('button');
      button.style.display = 'none';
      container.appendChild(button);

      expect(FocusUtils.isFocusable(button)).toBe(false);
    });

    it('should return false for hidden element (visibility:hidden)', () => {
      const button = document.createElement('button');
      button.style.visibility = 'hidden';
      container.appendChild(button);

      expect(FocusUtils.isFocusable(button)).toBe(false);
    });

    it('should return false for element with hidden attribute', () => {
      const button = document.createElement('button');
      button.hidden = true;
      container.appendChild(button);

      expect(FocusUtils.isFocusable(button)).toBe(false);
    });

    it('should return false for plain div without tabindex', () => {
      const div = document.createElement('div');
      container.appendChild(div);

      expect(FocusUtils.isFocusable(div)).toBe(false);
    });

    it('should return false for non-HTMLElement', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      container.appendChild(svg);

      // SVG elements are not HTMLElements
      expect(FocusUtils.isFocusable(svg)).toBe(false);
    });
  });

  // ===========================================================================
  // isVisible
  // ===========================================================================

  describe('isVisible', () => {
    it('should return true for visible element', () => {
      const button = document.createElement('button');
      button.textContent = 'Button';
      container.appendChild(button);
      makeElementsVisible(container);

      expect(FocusUtils.isVisible(button)).toBe(true);
    });

    it('should return false for element with display:none', () => {
      const button = document.createElement('button');
      button.style.display = 'none';
      container.appendChild(button);

      expect(FocusUtils.isVisible(button)).toBe(false);
    });

    it('should return false for element with visibility:hidden', () => {
      const button = document.createElement('button');
      button.style.visibility = 'hidden';
      container.appendChild(button);

      expect(FocusUtils.isVisible(button)).toBe(false);
    });

    it('should return false for element with hidden attribute', () => {
      const button = document.createElement('button');
      button.hidden = true;
      container.appendChild(button);

      expect(FocusUtils.isVisible(button)).toBe(false);
    });

    it('should return false for element with zero dimensions', () => {
      const button = document.createElement('button');
      button.style.width = '0';
      button.style.height = '0';
      button.style.padding = '0';
      button.style.border = 'none';
      container.appendChild(button);

      expect(FocusUtils.isVisible(button)).toBe(false);
    });

    it('should return false for non-HTMLElement', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      container.appendChild(svg);

      expect(FocusUtils.isVisible(svg)).toBe(false);
    });
  });

  // ===========================================================================
  // isTabbable
  // ===========================================================================

  describe('isTabbable', () => {
    it('should return true for tabbable button', () => {
      const button = document.createElement('button');
      container.appendChild(button);
      makeElementsVisible(container);

      expect(FocusUtils.isTabbable(button)).toBe(true);
    });

    it('should return true for element with tabindex=0', () => {
      const div = document.createElement('div');
      div.setAttribute('tabindex', '0');
      container.appendChild(div);
      makeElementsVisible(container);

      expect(FocusUtils.isTabbable(div)).toBe(true);
    });

    it('should return false for element with tabindex=-1', () => {
      const div = document.createElement('div');
      div.setAttribute('tabindex', '-1');
      container.appendChild(div);

      expect(FocusUtils.isTabbable(div)).toBe(false);
    });

    it('should return false for disabled button', () => {
      const button = document.createElement('button');
      button.disabled = true;
      container.appendChild(button);

      expect(FocusUtils.isTabbable(button)).toBe(false);
    });

    it('should return false for hidden element', () => {
      const button = document.createElement('button');
      button.style.display = 'none';
      container.appendChild(button);

      expect(FocusUtils.isTabbable(button)).toBe(false);
    });

    it('should return false for plain div', () => {
      const div = document.createElement('div');
      container.appendChild(div);

      expect(FocusUtils.isTabbable(div)).toBe(false);
    });
  });

  // ===========================================================================
  // saveFocus
  // ===========================================================================

  describe('saveFocus', () => {
    it('should save and restore focus', () => {
      setHTML(
        container,
        `
        <button id="button1">Button 1</button>
        <button id="button2">Button 2</button>
      `
      );

      const button1 = container.querySelector('#button1') as HTMLButtonElement;
      const button2 = container.querySelector('#button2') as HTMLButtonElement;

      button1.focus();
      expect(document.activeElement).toBe(button1);

      const restoreFocus = FocusUtils.saveFocus();

      button2.focus();
      expect(document.activeElement).toBe(button2);

      restoreFocus();
      expect(document.activeElement).toBe(button1);
    });

    it('should handle restore when previously focused element is not HTMLElement', () => {
      // Focus the body (or document.body)
      document.body.focus();

      const restoreFocus = FocusUtils.saveFocus();

      setHTML(container, '<button id="button1">Button 1</button>');
      const button1 = container.querySelector('#button1') as HTMLButtonElement;
      button1.focus();

      // Calling restore should not throw
      expect(() => restoreFocus()).not.toThrow();
    });
  });

  // ===========================================================================
  // focusNext
  // ===========================================================================

  describe('focusNext', () => {
    it('should focus next focusable element', () => {
      setHTML(
        container,
        `
        <button id="button1">Button 1</button>
        <button id="button2">Button 2</button>
        <button id="button3">Button 3</button>
      `
      );

      const button1 = container.querySelector('#button1') as HTMLButtonElement;
      button1.focus();

      const result = FocusUtils.focusNext(container);

      expect(result).toBe(true);
      expect(document.activeElement?.id).toBe('button2');
    });

    it('should wrap to first element when at end', () => {
      setHTML(
        container,
        `
        <button id="button1">Button 1</button>
        <button id="button2">Button 2</button>
      `
      );

      const button2 = container.querySelector('#button2') as HTMLButtonElement;
      button2.focus();

      const result = FocusUtils.focusNext(container);

      expect(result).toBe(true);
      expect(document.activeElement?.id).toBe('button1');
    });

    it('should focus first element when no element is focused', () => {
      setHTML(
        container,
        `
        <button id="button1">Button 1</button>
        <button id="button2">Button 2</button>
      `
      );

      // Ensure nothing in container is focused
      document.body.focus();

      const result = FocusUtils.focusNext(container);

      expect(result).toBe(true);
      expect(document.activeElement?.id).toBe('button1');
    });

    it('should return true when focusing first (no current focus)', () => {
      setHTML(container, '<button id="button1">Button 1</button>');

      const result = FocusUtils.focusNext(container);

      expect(result).toBe(true);
    });
  });

  // ===========================================================================
  // focusPrevious
  // ===========================================================================

  describe('focusPrevious', () => {
    it('should focus previous focusable element', () => {
      setHTML(
        container,
        `
        <button id="button1">Button 1</button>
        <button id="button2">Button 2</button>
        <button id="button3">Button 3</button>
      `
      );

      const button2 = container.querySelector('#button2') as HTMLButtonElement;
      button2.focus();

      const result = FocusUtils.focusPrevious(container);

      expect(result).toBe(true);
      expect(document.activeElement?.id).toBe('button1');
    });

    it('should wrap to last element when at start', () => {
      setHTML(
        container,
        `
        <button id="button1">Button 1</button>
        <button id="button2">Button 2</button>
      `
      );

      const button1 = container.querySelector('#button1') as HTMLButtonElement;
      button1.focus();

      const result = FocusUtils.focusPrevious(container);

      expect(result).toBe(true);
      expect(document.activeElement?.id).toBe('button2');
    });

    it('should focus last element when no element is focused', () => {
      setHTML(
        container,
        `
        <button id="button1">Button 1</button>
        <button id="button2">Button 2</button>
      `
      );

      // Ensure nothing in container is focused
      document.body.focus();

      const result = FocusUtils.focusPrevious(container);

      expect(result).toBe(true);
      expect(document.activeElement?.id).toBe('button2');
    });

    it('should return true when focusing last (no current focus)', () => {
      setHTML(container, '<button id="button1">Button 1</button>');

      const result = FocusUtils.focusPrevious(container);

      expect(result).toBe(true);
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle empty container', () => {
      expect(FocusUtils.getFocusableElements(container)).toEqual([]);
      expect(FocusUtils.getFirstFocusable(container)).toBeNull();
      expect(FocusUtils.getLastFocusable(container)).toBeNull();
      expect(FocusUtils.focusFirstFocusable(container)).toBe(false);
      expect(FocusUtils.focusLastFocusable(container)).toBe(false);
    });

    it('should handle single focusable element', () => {
      setHTML(container, '<button id="only">Only</button>');

      expect(FocusUtils.getFocusableElements(container).length).toBe(1);
      expect(FocusUtils.getFirstFocusable(container)?.id).toBe('only');
      expect(FocusUtils.getLastFocusable(container)?.id).toBe('only');
    });

    it('should handle nested focusable elements', () => {
      setHTML(
        container,
        `
        <div>
          <div>
            <button id="nested">Nested</button>
          </div>
        </div>
      `
      );

      const focusables = FocusUtils.getFocusableElements(container);

      expect(focusables.length).toBe(1);
      expect(focusables[0]?.id).toBe('nested');
    });

    it('should maintain DOM order for focusable elements', () => {
      setHTML(
        container,
        `
        <button id="first">First</button>
        <div>
          <button id="second">Second</button>
        </div>
        <button id="third">Third</button>
      `
      );

      const focusables = FocusUtils.getFocusableElements(container);

      expect(focusables.map((el) => el.id)).toEqual(['first', 'second', 'third']);
    });

    it('should handle elements with positive tabindex', () => {
      setHTML(
        container,
        `
        <button id="btn" tabindex="1">Button</button>
        <input id="input" tabindex="2" />
      `
      );

      const focusables = FocusUtils.getFocusableElements(container);

      expect(focusables.length).toBe(2);
    });

    it('should return false for element with disabled property (covers line 126-127)', () => {
      // Create a custom element-like object that has disabled property
      // but is matched by the focusable selector
      const input = document.createElement('input');
      input.type = 'text';
      input.name = 'test';
      container.appendChild(input);
      makeElementsVisible(container);

      // First verify it's focusable when enabled
      expect(FocusUtils.isFocusable(input)).toBe(true);

      // Now disable it and verify it's not focusable
      input.disabled = true;
      expect(FocusUtils.isFocusable(input)).toBe(false);
    });

    it('should return false for visible disabled input (explicitly tests disabled check after visibility)', () => {
      // Create input that is visible but disabled
      const input = document.createElement('input');
      input.type = 'text';
      input.disabled = true;
      container.appendChild(input);

      // Make element visible so isVisible check passes
      Object.defineProperty(input, 'offsetWidth', { value: 100, configurable: true });
      Object.defineProperty(input, 'offsetHeight', { value: 20, configurable: true });

      // Should return false due to disabled property check
      expect(FocusUtils.isFocusable(input)).toBe(false);
    });

    it('should return false for visible disabled button (explicitly tests disabled check after visibility)', () => {
      // Create button that is visible but disabled
      const button = document.createElement('button');
      button.disabled = true;
      container.appendChild(button);

      // Make element visible so isVisible check passes
      Object.defineProperty(button, 'offsetWidth', { value: 100, configurable: true });
      Object.defineProperty(button, 'offsetHeight', { value: 20, configurable: true });

      // Should return false due to disabled property check
      expect(FocusUtils.isFocusable(button)).toBe(false);
    });

    it('should return false for visible disabled select (explicitly tests disabled check after visibility)', () => {
      // Create select that is visible but disabled
      const select = document.createElement('select');
      select.disabled = true;
      container.appendChild(select);

      // Make element visible so isVisible check passes
      Object.defineProperty(select, 'offsetWidth', { value: 100, configurable: true });
      Object.defineProperty(select, 'offsetHeight', { value: 20, configurable: true });

      // Should return false due to disabled property check
      expect(FocusUtils.isFocusable(select)).toBe(false);
    });

    it('should return false for visible disabled textarea (explicitly tests disabled check after visibility)', () => {
      // Create textarea that is visible but disabled
      const textarea = document.createElement('textarea');
      textarea.disabled = true;
      container.appendChild(textarea);

      // Make element visible so isVisible check passes
      Object.defineProperty(textarea, 'offsetWidth', { value: 100, configurable: true });
      Object.defineProperty(textarea, 'offsetHeight', { value: 20, configurable: true });

      // Should return false due to disabled property check
      expect(FocusUtils.isFocusable(textarea)).toBe(false);
    });

    it('should return false for element with tabindex that has disabled property', () => {
      // Create a div with tabindex (matches selector) and add disabled property
      const div = document.createElement('div');
      div.setAttribute('tabindex', '0');
      // Add disabled property to the element (simulating custom element)
      Object.defineProperty(div, 'disabled', { value: true, configurable: true });
      container.appendChild(div);

      // Make element visible
      Object.defineProperty(div, 'offsetWidth', { value: 100, configurable: true });
      Object.defineProperty(div, 'offsetHeight', { value: 20, configurable: true });

      // Should return false due to disabled property check on line 125-127
      expect(FocusUtils.isFocusable(div)).toBe(false);
    });

    it('should return false for hidden element via hidden attribute (covers line 149-150)', () => {
      const button = document.createElement('button');
      button.textContent = 'Hidden Button';
      container.appendChild(button);

      // Make it visible first
      Object.defineProperty(button, 'offsetWidth', { value: 100, configurable: true });
      Object.defineProperty(button, 'offsetHeight', { value: 30, configurable: true });

      // Verify visible first
      expect(FocusUtils.isVisible(button)).toBe(true);

      // Now hide it
      button.hidden = true;
      expect(FocusUtils.isVisible(button)).toBe(false);
    });
  });
});
