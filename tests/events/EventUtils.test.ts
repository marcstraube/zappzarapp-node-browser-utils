import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventUtils } from '../../src/events/index.js';

describe('EventUtils', () => {
  // ===========================================================================
  // once()
  // ===========================================================================

  describe('once()', () => {
    let target: HTMLDivElement;

    beforeEach(() => {
      target = document.createElement('div');
      document.body.appendChild(target);
    });

    afterEach(() => {
      document.body.innerHTML = '';
    });

    it('should add event listener that triggers once', () => {
      const handler = vi.fn();
      EventUtils.once(target, 'click', handler);

      target.dispatchEvent(new MouseEvent('click'));
      target.dispatchEvent(new MouseEvent('click'));
      target.dispatchEvent(new MouseEvent('click'));

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should pass event object to handler', () => {
      const handler = vi.fn();
      EventUtils.once(target, 'click', handler);

      const event = new MouseEvent('click');
      target.dispatchEvent(event);

      expect(handler).toHaveBeenCalledWith(event);
    });

    it('should return cleanup function', () => {
      const handler = vi.fn();
      const cleanup = EventUtils.once(target, 'click', handler);

      expect(typeof cleanup).toBe('function');
    });

    it('should remove listener when cleanup is called before trigger', () => {
      const handler = vi.fn();
      const cleanup = EventUtils.once(target, 'click', handler);

      cleanup();
      target.dispatchEvent(new MouseEvent('click'));

      expect(handler).not.toHaveBeenCalled();
    });

    it('should work with capture option', () => {
      const handler = vi.fn();
      const child = document.createElement('span');
      target.appendChild(child);

      EventUtils.once(target, 'click', handler, { capture: true });

      child.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should work with passive option', () => {
      const handler = vi.fn();
      EventUtils.once(target, 'scroll', handler, { passive: true });

      target.dispatchEvent(new Event('scroll'));

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should auto-remove after first trigger', () => {
      const handler = vi.fn();
      EventUtils.once(target, 'click', handler);

      target.dispatchEvent(new MouseEvent('click'));

      // Dispatch again to verify the listener is removed
      target.dispatchEvent(new MouseEvent('click'));

      // Handler should only have been called once (in the first dispatch)
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should work with Window as target', () => {
      const handler = vi.fn();
      const cleanup = EventUtils.once(window, 'resize', handler);

      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new Event('resize'));

      expect(handler).toHaveBeenCalledTimes(1);
      cleanup();
    });

    it('should work with Document as target', () => {
      const handler = vi.fn();
      const cleanup = EventUtils.once(document, 'visibilitychange', handler);

      document.dispatchEvent(new Event('visibilitychange'));
      document.dispatchEvent(new Event('visibilitychange'));

      expect(handler).toHaveBeenCalledTimes(1);
      cleanup();
    });

    it('should cleanup be safe to call multiple times', () => {
      const handler = vi.fn();
      const cleanup = EventUtils.once(target, 'click', handler);

      cleanup();
      expect(() => cleanup()).not.toThrow();
    });
  });

  // ===========================================================================
  // delegate()
  // ===========================================================================

  describe('delegate()', () => {
    let container: HTMLDivElement;

    beforeEach(() => {
      container = document.createElement('div');
      container.innerHTML = `
        <button class="btn primary">Primary</button>
        <button class="btn secondary">Secondary</button>
        <span class="text">Not a button</span>
        <div class="nested">
          <button class="btn nested-btn">Nested</button>
        </div>
      `;
      document.body.appendChild(container);
    });

    afterEach(() => {
      document.body.innerHTML = '';
    });

    it('should delegate events to matching elements', () => {
      const handler = vi.fn();
      EventUtils.delegate(container, '.btn', 'click', handler);

      const primaryBtn = container.querySelector('.primary')!;
      primaryBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should pass event and matched target to handler', () => {
      const handler = vi.fn();
      EventUtils.delegate(container, '.btn', 'click', handler);

      const primaryBtn = container.querySelector('.primary')!;
      const event = new MouseEvent('click', { bubbles: true });
      primaryBtn.dispatchEvent(event);

      expect(handler).toHaveBeenCalledWith(event, primaryBtn);
    });

    it('should not trigger for non-matching elements', () => {
      const handler = vi.fn();
      EventUtils.delegate(container, '.btn', 'click', handler);

      const span = container.querySelector('.text')!;
      span.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(handler).not.toHaveBeenCalled();
    });

    it('should work with nested elements', () => {
      const handler = vi.fn();
      EventUtils.delegate(container, '.btn', 'click', handler);

      const nestedBtn = container.querySelector('.nested-btn')!;
      nestedBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should find closest matching ancestor', () => {
      const handler = vi.fn();
      EventUtils.delegate(container, '.nested', 'click', handler);

      const nestedBtn = container.querySelector('.nested-btn')!;
      nestedBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      const nestedDiv = container.querySelector('.nested')!;
      expect(handler).toHaveBeenCalledWith(expect.any(MouseEvent), nestedDiv);
    });

    it('should return cleanup function', () => {
      const handler = vi.fn();
      const cleanup = EventUtils.delegate(container, '.btn', 'click', handler);

      expect(typeof cleanup).toBe('function');
    });

    it('should remove listener when cleanup is called', () => {
      const handler = vi.fn();
      const cleanup = EventUtils.delegate(container, '.btn', 'click', handler);

      cleanup();

      const primaryBtn = container.querySelector('.primary')!;
      primaryBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(handler).not.toHaveBeenCalled();
    });

    it('should not trigger for elements outside container', () => {
      const handler = vi.fn();
      const outsideBtn = document.createElement('button');
      outsideBtn.className = 'btn';
      document.body.appendChild(outsideBtn);

      EventUtils.delegate(container, '.btn', 'click', handler);

      outsideBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(handler).not.toHaveBeenCalled();
    });

    it('should work with complex selectors', () => {
      const handler = vi.fn();
      EventUtils.delegate(container, '.btn.primary', 'click', handler);

      const primaryBtn = container.querySelector('.primary')!;
      const secondaryBtn = container.querySelector('.secondary')!;

      primaryBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      secondaryBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple delegated events', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      EventUtils.delegate(container, '.primary', 'click', handler1);
      EventUtils.delegate(container, '.secondary', 'click', handler2);

      const primaryBtn = container.querySelector('.primary')!;
      const secondaryBtn = container.querySelector('.secondary')!;

      primaryBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      secondaryBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should work with event listener options', () => {
      const handler = vi.fn();
      EventUtils.delegate(container, '.btn', 'click', handler, { capture: true });

      const primaryBtn = container.querySelector('.primary')!;
      primaryBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should handle null event target', () => {
      const handler = vi.fn();
      EventUtils.delegate(container, '.btn', 'custom', handler);

      const customEvent = new CustomEvent('custom', { bubbles: true });
      Object.defineProperty(customEvent, 'target', { value: null });

      container.dispatchEvent(customEvent);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // onOutsideClick()
  // ===========================================================================

  describe('onOutsideClick()', () => {
    let element: HTMLDivElement;
    let outside: HTMLDivElement;

    beforeEach(() => {
      element = document.createElement('div');
      element.className = 'dropdown';
      outside = document.createElement('div');
      outside.className = 'outside';

      document.body.appendChild(element);
      document.body.appendChild(outside);
    });

    afterEach(() => {
      document.body.innerHTML = '';
    });

    it('should trigger handler when clicking outside element', () => {
      const handler = vi.fn();
      EventUtils.onOutsideClick(element, handler);

      outside.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should not trigger handler when clicking inside element', () => {
      const handler = vi.fn();
      EventUtils.onOutsideClick(element, handler);

      element.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(handler).not.toHaveBeenCalled();
    });

    it('should not trigger handler when clicking inside child of element', () => {
      const handler = vi.fn();
      const child = document.createElement('span');
      element.appendChild(child);

      EventUtils.onOutsideClick(element, handler);

      child.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(handler).not.toHaveBeenCalled();
    });

    it('should pass event object to handler', () => {
      const handler = vi.fn();
      EventUtils.onOutsideClick(element, handler);

      const event = new MouseEvent('click', { bubbles: true });
      outside.dispatchEvent(event);

      expect(handler).toHaveBeenCalledWith(event);
    });

    it('should return cleanup function', () => {
      const handler = vi.fn();
      const cleanup = EventUtils.onOutsideClick(element, handler);

      expect(typeof cleanup).toBe('function');
    });

    it('should remove listener when cleanup is called', () => {
      const handler = vi.fn();
      const cleanup = EventUtils.onOutsideClick(element, handler);

      cleanup();
      outside.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(handler).not.toHaveBeenCalled();
    });

    describe('touch option', () => {
      it('should trigger on touchstart when touch option is true', () => {
        const handler = vi.fn();
        EventUtils.onOutsideClick(element, handler, { touch: true });

        outside.dispatchEvent(new TouchEvent('touchstart', { bubbles: true }));

        expect(handler).toHaveBeenCalledTimes(1);
      });

      it('should not trigger on touchstart when touch option is false', () => {
        const handler = vi.fn();
        EventUtils.onOutsideClick(element, handler, { touch: false });

        outside.dispatchEvent(new TouchEvent('touchstart', { bubbles: true }));

        expect(handler).not.toHaveBeenCalled();
      });

      it('should not trigger on touchstart by default', () => {
        const handler = vi.fn();
        EventUtils.onOutsideClick(element, handler);

        outside.dispatchEvent(new TouchEvent('touchstart', { bubbles: true }));

        expect(handler).not.toHaveBeenCalled();
      });

      it('should remove touch listener on cleanup', () => {
        const handler = vi.fn();
        const cleanup = EventUtils.onOutsideClick(element, handler, { touch: true });

        cleanup();
        outside.dispatchEvent(new TouchEvent('touchstart', { bubbles: true }));

        expect(handler).not.toHaveBeenCalled();
      });

      it('should not trigger touchstart inside element', () => {
        const handler = vi.fn();
        EventUtils.onOutsideClick(element, handler, { touch: true });

        element.dispatchEvent(new TouchEvent('touchstart', { bubbles: true }));

        expect(handler).not.toHaveBeenCalled();
      });
    });

    describe('exclude option', () => {
      let excluded: HTMLDivElement;

      beforeEach(() => {
        excluded = document.createElement('div');
        excluded.className = 'excluded';
        document.body.appendChild(excluded);
      });

      it('should not trigger when clicking excluded element', () => {
        const handler = vi.fn();
        EventUtils.onOutsideClick(element, handler, { exclude: [excluded] });

        excluded.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(handler).not.toHaveBeenCalled();
      });

      it('should not trigger when clicking child of excluded element', () => {
        const handler = vi.fn();
        const child = document.createElement('span');
        excluded.appendChild(child);

        EventUtils.onOutsideClick(element, handler, { exclude: [excluded] });

        child.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(handler).not.toHaveBeenCalled();
      });

      it('should support multiple excluded elements', () => {
        const handler = vi.fn();
        const excluded2 = document.createElement('div');
        document.body.appendChild(excluded2);

        EventUtils.onOutsideClick(element, handler, { exclude: [excluded, excluded2] });

        excluded.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        excluded2.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(handler).not.toHaveBeenCalled();
      });

      it('should still trigger for non-excluded outside elements', () => {
        const handler = vi.fn();
        EventUtils.onOutsideClick(element, handler, { exclude: [excluded] });

        outside.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(handler).toHaveBeenCalledTimes(1);
      });

      it('should work with empty exclude array', () => {
        const handler = vi.fn();
        EventUtils.onOutsideClick(element, handler, { exclude: [] });

        outside.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(handler).toHaveBeenCalledTimes(1);
      });
    });

    describe('edge cases', () => {
      it('should handle null event target', () => {
        const handler = vi.fn();
        EventUtils.onOutsideClick(element, handler);

        const event = new MouseEvent('click', { bubbles: true });
        Object.defineProperty(event, 'target', { value: null });

        document.dispatchEvent(event);

        expect(handler).not.toHaveBeenCalled();
      });

      it('should use capture phase for click listener', () => {
        const handler = vi.fn();
        const cleanup = EventUtils.onOutsideClick(element, handler);

        // Create a nested structure
        const nested = document.createElement('div');
        outside.appendChild(nested);

        nested.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(handler).toHaveBeenCalledTimes(1);
        cleanup();
      });

      it('should work with touch and exclude combined', () => {
        const handler = vi.fn();
        const excluded = document.createElement('div');
        document.body.appendChild(excluded);

        EventUtils.onOutsideClick(element, handler, {
          touch: true,
          exclude: [excluded],
        });

        excluded.dispatchEvent(new TouchEvent('touchstart', { bubbles: true }));
        expect(handler).not.toHaveBeenCalled();

        outside.dispatchEvent(new TouchEvent('touchstart', { bubbles: true }));
        expect(handler).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ===========================================================================
  // onKey()
  // ===========================================================================

  describe('onKey()', () => {
    let target: HTMLDivElement;

    beforeEach(() => {
      target = document.createElement('div');
      target.tabIndex = 0;
      document.body.appendChild(target);
    });

    afterEach(() => {
      document.body.innerHTML = '';
    });

    it('should trigger handler for matching key', () => {
      const handler = vi.fn();
      EventUtils.onKey(target, 'Escape', handler);

      target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should not trigger handler for non-matching key', () => {
      const handler = vi.fn();
      EventUtils.onKey(target, 'Escape', handler);

      target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

      expect(handler).not.toHaveBeenCalled();
    });

    it('should pass keyboard event to handler', () => {
      const handler = vi.fn();
      EventUtils.onKey(target, 'Enter', handler);

      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      target.dispatchEvent(event);

      expect(handler).toHaveBeenCalledWith(event);
    });

    it('should return cleanup function', () => {
      const handler = vi.fn();
      const cleanup = EventUtils.onKey(target, 'Escape', handler);

      expect(typeof cleanup).toBe('function');
    });

    it('should remove listener when cleanup is called', () => {
      const handler = vi.fn();
      const cleanup = EventUtils.onKey(target, 'Escape', handler);

      cleanup();
      target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

      expect(handler).not.toHaveBeenCalled();
    });

    describe('modifier keys', () => {
      it('should require ctrl key when ctrl option is true', () => {
        const handler = vi.fn();
        EventUtils.onKey(target, 's', handler, { ctrl: true });

        target.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }));
        expect(handler).not.toHaveBeenCalled();

        target.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true }));
        expect(handler).toHaveBeenCalledTimes(1);
      });

      it('should require shift key when shift option is true', () => {
        const handler = vi.fn();
        EventUtils.onKey(target, 'a', handler, { shift: true });

        target.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
        expect(handler).not.toHaveBeenCalled();

        target.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', shiftKey: true }));
        expect(handler).toHaveBeenCalledTimes(1);
      });

      it('should require alt key when alt option is true', () => {
        const handler = vi.fn();
        EventUtils.onKey(target, 'x', handler, { alt: true });

        target.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
        expect(handler).not.toHaveBeenCalled();

        target.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', altKey: true }));
        expect(handler).toHaveBeenCalledTimes(1);
      });

      it('should require meta key when meta option is true', () => {
        const handler = vi.fn();
        EventUtils.onKey(target, 'c', handler, { meta: true });

        target.dispatchEvent(new KeyboardEvent('keydown', { key: 'c' }));
        expect(handler).not.toHaveBeenCalled();

        target.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', metaKey: true }));
        expect(handler).toHaveBeenCalledTimes(1);
      });

      it('should require multiple modifiers when specified', () => {
        const handler = vi.fn();
        EventUtils.onKey(target, 's', handler, { ctrl: true, shift: true });

        target.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true }));
        expect(handler).not.toHaveBeenCalled();

        target.dispatchEvent(new KeyboardEvent('keydown', { key: 's', shiftKey: true }));
        expect(handler).not.toHaveBeenCalled();

        target.dispatchEvent(
          new KeyboardEvent('keydown', { key: 's', ctrlKey: true, shiftKey: true })
        );
        expect(handler).toHaveBeenCalledTimes(1);
      });

      it('should require all four modifiers when specified', () => {
        const handler = vi.fn();
        EventUtils.onKey(target, 'a', handler, { ctrl: true, shift: true, alt: true, meta: true });

        target.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'a',
            ctrlKey: true,
            shiftKey: true,
            altKey: true,
          })
        );
        expect(handler).not.toHaveBeenCalled();

        target.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'a',
            ctrlKey: true,
            shiftKey: true,
            altKey: true,
            metaKey: true,
          })
        );
        expect(handler).toHaveBeenCalledTimes(1);
      });
    });

    describe('preventDefault option', () => {
      it('should call preventDefault when option is true', () => {
        const handler = vi.fn();
        EventUtils.onKey(target, 'Enter', handler, { preventDefault: true });

        const event = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true });
        const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

        target.dispatchEvent(event);

        expect(preventDefaultSpy).toHaveBeenCalled();
      });

      it('should not call preventDefault by default', () => {
        const handler = vi.fn();
        EventUtils.onKey(target, 'Enter', handler);

        const event = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true });
        const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

        target.dispatchEvent(event);

        expect(preventDefaultSpy).not.toHaveBeenCalled();
      });

      it('should not call preventDefault when option is false', () => {
        const handler = vi.fn();
        EventUtils.onKey(target, 'Enter', handler, { preventDefault: false });

        const event = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true });
        const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

        target.dispatchEvent(event);

        expect(preventDefaultSpy).not.toHaveBeenCalled();
      });
    });

    describe('capture option', () => {
      it('should use capture phase when capture is true', () => {
        const handler = vi.fn();
        const child = document.createElement('span');
        target.appendChild(child);

        EventUtils.onKey(target, 'a', handler, { capture: true });

        child.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));

        expect(handler).toHaveBeenCalledTimes(1);
      });

      it('should use bubble phase by default', () => {
        const handler = vi.fn();
        EventUtils.onKey(target, 'a', handler);

        target.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));

        expect(handler).toHaveBeenCalledTimes(1);
      });

      it('should properly clean up capture listener', () => {
        const handler = vi.fn();
        const cleanup = EventUtils.onKey(target, 'a', handler, { capture: true });

        cleanup();
        target.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));

        expect(handler).not.toHaveBeenCalled();
      });
    });

    describe('edge cases', () => {
      it('should work with special keys', () => {
        const handler = vi.fn();

        const specialKeys = ['ArrowUp', 'ArrowDown', 'Tab', 'Space', 'Backspace', 'Delete'];

        specialKeys.forEach((key) => {
          EventUtils.onKey(target, key, handler);
          target.dispatchEvent(new KeyboardEvent('keydown', { key }));
        });

        expect(handler).toHaveBeenCalledTimes(specialKeys.length);
      });

      it('should handle rapid key presses', () => {
        const handler = vi.fn();
        EventUtils.onKey(target, 'a', handler);

        for (let i = 0; i < 100; i++) {
          target.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
        }

        expect(handler).toHaveBeenCalledTimes(100);
      });

      it('should work with Window as target', () => {
        const handler = vi.fn();
        const cleanup = EventUtils.onKey(window, 'Escape', handler);

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

        expect(handler).toHaveBeenCalledTimes(1);
        cleanup();
      });

      it('should work with Document as target', () => {
        const handler = vi.fn();
        const cleanup = EventUtils.onKey(document, 'Escape', handler);

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

        expect(handler).toHaveBeenCalledTimes(1);
        cleanup();
      });

      it('should handle undefined options', () => {
        const handler = vi.fn();
        EventUtils.onKey(target, 'a', handler, undefined);

        target.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));

        expect(handler).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ===========================================================================
  // on()
  // ===========================================================================

  describe('on()', () => {
    let target: HTMLDivElement;

    beforeEach(() => {
      target = document.createElement('div');
      document.body.appendChild(target);
    });

    afterEach(() => {
      document.body.innerHTML = '';
    });

    it('should add handler to multiple events', () => {
      const handler = vi.fn();
      EventUtils.on(target, ['click', 'focus', 'blur'], handler);

      target.dispatchEvent(new MouseEvent('click'));
      target.dispatchEvent(new FocusEvent('focus'));
      target.dispatchEvent(new FocusEvent('blur'));

      expect(handler).toHaveBeenCalledTimes(3);
    });

    it('should pass event object to handler', () => {
      const handler = vi.fn();
      EventUtils.on(target, ['click'], handler);

      const event = new MouseEvent('click');
      target.dispatchEvent(event);

      expect(handler).toHaveBeenCalledWith(event);
    });

    it('should return cleanup function', () => {
      const handler = vi.fn();
      const cleanup = EventUtils.on(target, ['click'], handler);

      expect(typeof cleanup).toBe('function');
    });

    it('should remove all listeners when cleanup is called', () => {
      const handler = vi.fn();
      const cleanup = EventUtils.on(target, ['click', 'focus', 'blur'], handler);

      cleanup();

      target.dispatchEvent(new MouseEvent('click'));
      target.dispatchEvent(new FocusEvent('focus'));
      target.dispatchEvent(new FocusEvent('blur'));

      expect(handler).not.toHaveBeenCalled();
    });

    it('should work with event listener options', () => {
      const handler = vi.fn();
      EventUtils.on(target, ['scroll'], handler, { passive: true });

      target.dispatchEvent(new Event('scroll'));

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should work with capture option', () => {
      const handler = vi.fn();
      const child = document.createElement('span');
      target.appendChild(child);

      EventUtils.on(target, ['click'], handler, { capture: true });

      child.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should handle empty events array', () => {
      const handler = vi.fn();
      const cleanup = EventUtils.on(target, [], handler);

      target.dispatchEvent(new MouseEvent('click'));

      expect(handler).not.toHaveBeenCalled();
      expect(() => cleanup()).not.toThrow();
    });

    it('should handle single event in array', () => {
      const handler = vi.fn();
      EventUtils.on(target, ['click'], handler);

      target.dispatchEvent(new MouseEvent('click'));

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should allow adding same event type multiple times', () => {
      const handler = vi.fn();
      EventUtils.on(target, ['click', 'click'], handler);

      target.dispatchEvent(new MouseEvent('click'));

      // Browser typically dedupes same handler, but arrays allow duplicates
      expect(handler).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Cleanup Functions
  // ===========================================================================

  describe('Cleanup Functions', () => {
    let target: HTMLDivElement;

    beforeEach(() => {
      target = document.createElement('div');
      document.body.appendChild(target);
    });

    afterEach(() => {
      document.body.innerHTML = '';
    });

    it('once cleanup should remove listener completely', () => {
      const handler = vi.fn();
      const cleanup = EventUtils.once(target, 'click', handler);

      cleanup();

      // Should not trigger even once
      target.dispatchEvent(new MouseEvent('click'));
      expect(handler).not.toHaveBeenCalled();
    });

    it('delegate cleanup should stop delegation', () => {
      const handler = vi.fn();
      const btn = document.createElement('button');
      btn.className = 'test-btn';
      target.appendChild(btn);

      const cleanup = EventUtils.delegate(target, '.test-btn', 'click', handler);

      cleanup();

      btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(handler).not.toHaveBeenCalled();
    });

    it('onOutsideClick cleanup should stop outside click detection', () => {
      const handler = vi.fn();
      const outside = document.createElement('div');
      document.body.appendChild(outside);

      const cleanup = EventUtils.onOutsideClick(target, handler);

      cleanup();

      outside.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(handler).not.toHaveBeenCalled();
    });

    it('onKey cleanup should stop key listening', () => {
      const handler = vi.fn();
      const cleanup = EventUtils.onKey(target, 'Escape', handler);

      cleanup();

      target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(handler).not.toHaveBeenCalled();
    });

    it('on cleanup should remove all event listeners', () => {
      const handler = vi.fn();
      const cleanup = EventUtils.on(target, ['click', 'mouseenter', 'mouseleave'], handler);

      cleanup();

      target.dispatchEvent(new MouseEvent('click'));
      target.dispatchEvent(new MouseEvent('mouseenter'));
      target.dispatchEvent(new MouseEvent('mouseleave'));
      expect(handler).not.toHaveBeenCalled();
    });

    it('cleanup should be safe to call multiple times', () => {
      const handler = vi.fn();
      const cleanup = EventUtils.once(target, 'click', handler);

      cleanup();
      expect(() => cleanup()).not.toThrow();
      expect(() => cleanup()).not.toThrow();
    });

    it('cleanup functions should be independent', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      const cleanup1 = EventUtils.once(target, 'click', handler1);
      const cleanup2 = EventUtils.once(target, 'click', handler2);

      cleanup1();

      target.dispatchEvent(new MouseEvent('click'));

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledTimes(1);

      cleanup2();
    });
  });
});
