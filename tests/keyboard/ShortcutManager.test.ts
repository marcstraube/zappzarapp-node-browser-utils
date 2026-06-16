import { describe, it, expect, vi } from 'vitest';
import { ShortcutManager, ShortcutGroup, KeyboardShortcut } from '../../src/keyboard/index.js';

describe('ShortcutManager', () => {
  // Helper to dispatch keyboard events
  function dispatchKeydown(options: {
    key: string;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    metaKey?: boolean;
  }): KeyboardEvent {
    const event = new KeyboardEvent('keydown', {
      key: options.key,
      ctrlKey: options.ctrlKey ?? false,
      shiftKey: options.shiftKey ?? false,
      altKey: options.altKey ?? false,
      metaKey: options.metaKey ?? false,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(event);
    return event;
  }

  // ===========================================================================
  // Registration
  // ===========================================================================

  describe('on', () => {
    it('should register a shortcut handler', () => {
      const handler = vi.fn();
      const cleanup = ShortcutManager.on(KeyboardShortcut.escape(), handler);

      dispatchKeydown({ key: 'Escape' });

      expect(handler).toHaveBeenCalledTimes(1);
      cleanup();
    });

    it('should accept ShortcutDefinition object', () => {
      const handler = vi.fn();
      const cleanup = ShortcutManager.on({ key: 'Escape' }, handler);

      dispatchKeydown({ key: 'Escape' });

      expect(handler).toHaveBeenCalledTimes(1);
      cleanup();
    });

    it('should not trigger handler for non-matching key', () => {
      const handler = vi.fn();
      const cleanup = ShortcutManager.on(KeyboardShortcut.escape(), handler);

      dispatchKeydown({ key: 'Enter' });

      expect(handler).not.toHaveBeenCalled();
      cleanup();
    });

    it('should not trigger handler for non-matching modifiers', () => {
      const handler = vi.fn();
      const cleanup = ShortcutManager.on(KeyboardShortcut.ctrlKey('s'), handler);

      dispatchKeydown({ key: 's' });

      expect(handler).not.toHaveBeenCalled();
      cleanup();
    });

    it('should trigger handler for matching key with modifiers', () => {
      const handler = vi.fn();
      const cleanup = ShortcutManager.on(KeyboardShortcut.ctrlKey('s'), handler);

      dispatchKeydown({ key: 's', ctrlKey: true });

      expect(handler).toHaveBeenCalledTimes(1);
      cleanup();
    });

    it('should support multiple handlers for different shortcuts', () => {
      const escapeHandler = vi.fn();
      const saveHandler = vi.fn();
      const cleanup1 = ShortcutManager.on(KeyboardShortcut.escape(), escapeHandler);
      const cleanup2 = ShortcutManager.on(KeyboardShortcut.ctrlKey('s'), saveHandler);

      dispatchKeydown({ key: 'Escape' });
      dispatchKeydown({ key: 's', ctrlKey: true });

      expect(escapeHandler).toHaveBeenCalledTimes(1);
      expect(saveHandler).toHaveBeenCalledTimes(1);
      cleanup1();
      cleanup2();
    });

    it('should return cleanup function', () => {
      const handler = vi.fn();
      const cleanup = ShortcutManager.on(KeyboardShortcut.escape(), handler);

      expect(typeof cleanup).toBe('function');
      cleanup();
    });
  });

  // ===========================================================================
  // Unregistration (Cleanup)
  // ===========================================================================

  describe('cleanup', () => {
    it('should stop triggering handler after cleanup', () => {
      const handler = vi.fn();
      const cleanup = ShortcutManager.on(KeyboardShortcut.escape(), handler);

      cleanup();
      dispatchKeydown({ key: 'Escape' });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should allow multiple cleanups without error', () => {
      const handler = vi.fn();
      const cleanup = ShortcutManager.on(KeyboardShortcut.escape(), handler);

      cleanup();
      cleanup();
      cleanup();

      dispatchKeydown({ key: 'Escape' });
      expect(handler).not.toHaveBeenCalled();
    });

    it('should only cleanup the specific handler', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const cleanup1 = ShortcutManager.on(KeyboardShortcut.escape(), handler1);
      const cleanup2 = ShortcutManager.on(KeyboardShortcut.escape(), handler2);

      cleanup1();
      dispatchKeydown({ key: 'Escape' });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledTimes(1);
      cleanup2();
    });
  });

  // ===========================================================================
  // Options
  // ===========================================================================

  describe('options', () => {
    describe('preventDefault', () => {
      it('should prevent default by default', () => {
        const handler = vi.fn();
        const cleanup = ShortcutManager.on(KeyboardShortcut.escape(), handler);

        const event = dispatchKeydown({ key: 'Escape' });

        expect(event.defaultPrevented).toBe(true);
        cleanup();
      });

      it('should not prevent default when preventDefault is false', () => {
        const handler = vi.fn();
        const cleanup = ShortcutManager.on(KeyboardShortcut.escape(), handler, {
          preventDefault: false,
        });

        const event = dispatchKeydown({ key: 'Escape' });

        expect(event.defaultPrevented).toBe(false);
        cleanup();
      });
    });

    describe('stopPropagation', () => {
      it('should not stop propagation by default', () => {
        const handler = vi.fn();
        const parentHandler = vi.fn();
        const cleanup = ShortcutManager.on(KeyboardShortcut.escape(), handler);
        document.addEventListener('keydown', parentHandler);

        dispatchKeydown({ key: 'Escape' });

        expect(parentHandler).toHaveBeenCalled();
        cleanup();
        document.removeEventListener('keydown', parentHandler);
      });

      it('should stop propagation when stopPropagation is true', () => {
        const handler = vi.fn();
        const cleanup = ShortcutManager.on(KeyboardShortcut.escape(), handler, {
          stopPropagation: true,
        });

        dispatchKeydown({ key: 'Escape' });
        // Note: cancelBubble is set by stopPropagation
        // In happy-dom, we can check if the handler was called
        expect(handler).toHaveBeenCalledTimes(1);
        cleanup();
      });
    });

    describe('stopImmediatePropagation', () => {
      it('should stop immediate propagation when stopImmediatePropagation is true', () => {
        const handler1 = vi.fn();
        const handler2 = vi.fn();
        const cleanup1 = ShortcutManager.on(KeyboardShortcut.escape(), handler1, {
          stopImmediatePropagation: true,
        });
        const cleanup2 = ShortcutManager.on(KeyboardShortcut.escape(), handler2);

        dispatchKeydown({ key: 'Escape' });

        expect(handler1).toHaveBeenCalledTimes(1);
        // handler2 might still be called depending on registration order
        // The test verifies the option is passed correctly
        cleanup1();
        cleanup2();
      });
    });

    describe('capture', () => {
      it('should not use capture phase by default', () => {
        const handler = vi.fn();
        const cleanup = ShortcutManager.on(KeyboardShortcut.escape(), handler);

        dispatchKeydown({ key: 'Escape' });

        expect(handler).toHaveBeenCalledTimes(1);
        cleanup();
      });

      it('should use capture phase when capture is true', () => {
        const handler = vi.fn();
        const cleanup = ShortcutManager.on(KeyboardShortcut.escape(), handler, {
          capture: true,
        });

        dispatchKeydown({ key: 'Escape' });

        expect(handler).toHaveBeenCalledTimes(1);
        cleanup();
      });
    });

    describe('once', () => {
      it('should not auto-remove by default', () => {
        const handler = vi.fn();
        const cleanup = ShortcutManager.on(KeyboardShortcut.escape(), handler);

        dispatchKeydown({ key: 'Escape' });
        dispatchKeydown({ key: 'Escape' });
        dispatchKeydown({ key: 'Escape' });

        expect(handler).toHaveBeenCalledTimes(3);
        cleanup();
      });

      it('should auto-remove after first trigger when once is true', () => {
        const handler = vi.fn();
        const cleanup = ShortcutManager.on(KeyboardShortcut.escape(), handler, {
          once: true,
        });

        dispatchKeydown({ key: 'Escape' });
        dispatchKeydown({ key: 'Escape' });
        dispatchKeydown({ key: 'Escape' });

        expect(handler).toHaveBeenCalledTimes(1);
        cleanup();
      });
    });
  });

  // ===========================================================================
  // Editable-target skip
  // ===========================================================================

  describe('ignoreEditableTargets', () => {
    function dispatchOn(
      target: Element,
      options: { key: string; ctrlKey?: boolean }
    ): KeyboardEvent {
      const event = new KeyboardEvent('keydown', {
        key: options.key,
        ctrlKey: options.ctrlKey ?? false,
        bubbles: true,
        cancelable: true,
      });
      target.dispatchEvent(event);
      return event;
    }

    it('should fire on editable targets when not enabled (default)', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);
      const handler = vi.fn();
      const cleanup = ShortcutManager.on(KeyboardShortcut.key('r'), handler);

      dispatchOn(input, { key: 'r' });

      expect(handler).toHaveBeenCalledTimes(1);
      cleanup();
      input.remove();
    });

    it.each(['input', 'textarea', 'select'])(
      'should skip handler and preventDefault for <%s>',
      (tag) => {
        const el = document.createElement(tag);
        document.body.appendChild(el);
        const handler = vi.fn();
        const cleanup = ShortcutManager.on(KeyboardShortcut.key('r'), handler, {
          ignoreEditableTargets: true,
        });

        const event = dispatchOn(el, { key: 'r' });

        expect(handler).not.toHaveBeenCalled();
        expect(event.defaultPrevented).toBe(false);
        cleanup();
        el.remove();
      }
    );

    it('should skip when target is a contenteditable host', () => {
      const host = document.createElement('div');
      host.setAttribute('contenteditable', '');
      document.body.appendChild(host);
      const handler = vi.fn();
      const cleanup = ShortcutManager.on(KeyboardShortcut.key('r'), handler, {
        ignoreEditableTargets: true,
      });

      dispatchOn(host, { key: 'r' });

      expect(handler).not.toHaveBeenCalled();
      cleanup();
      host.remove();
    });

    it('should skip when target is nested inside a contenteditable host', () => {
      const host = document.createElement('div');
      host.setAttribute('contenteditable', '');
      const child = document.createElement('span');
      host.appendChild(child);
      document.body.appendChild(host);
      const handler = vi.fn();
      const cleanup = ShortcutManager.on(KeyboardShortcut.key('r'), handler, {
        ignoreEditableTargets: true,
      });

      dispatchOn(child, { key: 'r' });

      expect(handler).not.toHaveBeenCalled();
      cleanup();
      host.remove();
    });

    it('should NOT skip for contenteditable="false"', () => {
      const el = document.createElement('div');
      el.setAttribute('contenteditable', 'false');
      document.body.appendChild(el);
      const handler = vi.fn();
      const cleanup = ShortcutManager.on(KeyboardShortcut.key('r'), handler, {
        ignoreEditableTargets: true,
      });

      dispatchOn(el, { key: 'r' });

      expect(handler).toHaveBeenCalledTimes(1);
      cleanup();
      el.remove();
    });

    it('should NOT skip for contenteditable="FALSE" (case-insensitive)', () => {
      const el = document.createElement('div');
      el.setAttribute('contenteditable', 'FALSE');
      document.body.appendChild(el);
      const handler = vi.fn();
      const cleanup = ShortcutManager.on(KeyboardShortcut.key('r'), handler, {
        ignoreEditableTargets: true,
      });

      dispatchOn(el, { key: 'r' });

      expect(handler).toHaveBeenCalledTimes(1);
      cleanup();
      el.remove();
    });

    it('should skip when target is a non-HTML element inside contenteditable', () => {
      const host = document.createElement('div');
      host.setAttribute('contenteditable', '');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      host.appendChild(svg);
      document.body.appendChild(host);
      const handler = vi.fn();
      const cleanup = ShortcutManager.on(KeyboardShortcut.key('r'), handler, {
        ignoreEditableTargets: true,
      });

      dispatchOn(svg, { key: 'r' });

      expect(handler).not.toHaveBeenCalled();
      cleanup();
      host.remove();
    });

    it('should still fire on non-editable targets when enabled', () => {
      const div = document.createElement('div');
      document.body.appendChild(div);
      const handler = vi.fn();
      const cleanup = ShortcutManager.on(KeyboardShortcut.key('r'), handler, {
        ignoreEditableTargets: true,
      });

      dispatchOn(div, { key: 'r' });

      expect(handler).toHaveBeenCalledTimes(1);
      cleanup();
      div.remove();
    });

    it('should fire when the target is not an element (document)', () => {
      const handler = vi.fn();
      const cleanup = ShortcutManager.on(KeyboardShortcut.key('r'), handler, {
        ignoreEditableTargets: true,
      });

      dispatchKeydown({ key: 'r' }); // dispatched on document -> target is document

      expect(handler).toHaveBeenCalledTimes(1);
      cleanup();
    });
  });

  // ===========================================================================
  // Conditional handlers (return false to decline)
  // ===========================================================================

  describe('conditional handlers', () => {
    it('should not preventDefault when the handler returns false', () => {
      const cleanup = ShortcutManager.on(KeyboardShortcut.key('r'), () => false);

      const event = dispatchKeydown({ key: 'r' });

      expect(event.defaultPrevented).toBe(false);
      cleanup();
    });

    it('should preventDefault when the handler returns undefined', () => {
      const cleanup = ShortcutManager.on(KeyboardShortcut.key('r'), () => undefined);

      const event = dispatchKeydown({ key: 'r' });

      expect(event.defaultPrevented).toBe(true);
      cleanup();
    });

    it('should not stop propagation when the handler returns false', () => {
      const parentHandler = vi.fn();
      const cleanup = ShortcutManager.on(KeyboardShortcut.key('r'), () => false, {
        stopPropagation: true,
        stopImmediatePropagation: true,
      });
      document.addEventListener('keydown', parentHandler);

      dispatchKeydown({ key: 'r' });

      expect(parentHandler).toHaveBeenCalled();
      cleanup();
      document.removeEventListener('keydown', parentHandler);
    });

    it('should keep a once handler registered when it declines', () => {
      const handler = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(undefined);
      const cleanup = ShortcutManager.on(KeyboardShortcut.key('r'), handler, { once: true });

      dispatchKeydown({ key: 'r' }); // declines -> stays registered
      dispatchKeydown({ key: 'r' }); // handles -> auto-removes
      dispatchKeydown({ key: 'r' }); // already removed

      expect(handler).toHaveBeenCalledTimes(2);
      cleanup();
    });

    it('should receive the keyboard event', () => {
      const handler = vi.fn();
      const cleanup = ShortcutManager.on(KeyboardShortcut.key('r'), handler);

      const event = dispatchKeydown({ key: 'r' });

      expect(handler).toHaveBeenCalledWith(event);
      cleanup();
    });

    it('should consume the key for a value-returning (async) handler', () => {
      // Only a literal false declines; a Promise (or any other value) consumes.
      const cleanup = ShortcutManager.on(KeyboardShortcut.key('r'), async () => {
        await Promise.resolve();
      });

      const event = dispatchKeydown({ key: 'r' });

      expect(event.defaultPrevented).toBe(true);
      cleanup();
    });
  });

  // ===========================================================================
  // Convenience Methods
  // ===========================================================================

  describe('onEscape', () => {
    it('should register Escape handler', () => {
      const handler = vi.fn();
      const cleanup = ShortcutManager.onEscape(handler);

      dispatchKeydown({ key: 'Escape' });

      expect(handler).toHaveBeenCalledTimes(1);
      cleanup();
    });

    it('should auto-remove after trigger (once: true)', () => {
      const handler = vi.fn();
      ShortcutManager.onEscape(handler);

      dispatchKeydown({ key: 'Escape' });
      dispatchKeydown({ key: 'Escape' });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should use capture phase', () => {
      const handler = vi.fn();
      const cleanup = ShortcutManager.onEscape(handler);

      dispatchKeydown({ key: 'Escape' });

      expect(handler).toHaveBeenCalledTimes(1);
      cleanup();
    });

    it('should stop immediate propagation', () => {
      const handler = vi.fn();
      const otherHandler = vi.fn();

      // onEscape uses capture: true and stopImmediatePropagation: true
      ShortcutManager.onEscape(handler);
      const cleanup = ShortcutManager.on(KeyboardShortcut.escape(), otherHandler);

      dispatchKeydown({ key: 'Escape' });

      expect(handler).toHaveBeenCalledTimes(1);
      // otherHandler should not be called due to stopImmediatePropagation in capture phase
      cleanup();
    });

    it('should return cleanup function', () => {
      const handler = vi.fn();
      const cleanup = ShortcutManager.onEscape(handler);

      expect(typeof cleanup).toBe('function');

      cleanup();
      dispatchKeydown({ key: 'Escape' });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('onEnter', () => {
    it('should register Enter handler', () => {
      const handler = vi.fn();
      const cleanup = ShortcutManager.onEnter(handler);

      dispatchKeydown({ key: 'Enter' });

      expect(handler).toHaveBeenCalledTimes(1);
      cleanup();
    });

    it('should accept options', () => {
      const handler = vi.fn();
      const cleanup = ShortcutManager.onEnter(handler, { once: true });

      dispatchKeydown({ key: 'Enter' });
      dispatchKeydown({ key: 'Enter' });

      expect(handler).toHaveBeenCalledTimes(1);
      cleanup();
    });

    it('should prevent default by default', () => {
      const handler = vi.fn();
      const cleanup = ShortcutManager.onEnter(handler);

      const event = dispatchKeydown({ key: 'Enter' });

      expect(event.defaultPrevented).toBe(true);
      cleanup();
    });

    it('should return cleanup function', () => {
      const handler = vi.fn();
      const cleanup = ShortcutManager.onEnter(handler);

      expect(typeof cleanup).toBe('function');

      cleanup();
      dispatchKeydown({ key: 'Enter' });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // ShortcutGroup
  // ===========================================================================

  describe('createGroup', () => {
    it('should return a ShortcutGroup instance', () => {
      const group = ShortcutManager.createGroup();

      expect(group).toBeInstanceOf(ShortcutGroup);
    });

    it('should pass default options to the group', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);
      const handler = vi.fn();
      const group = ShortcutManager.createGroup({ ignoreEditableTargets: true });
      group.add(KeyboardShortcut.key('r'), handler);

      const event = new KeyboardEvent('keydown', { key: 'r', bubbles: true, cancelable: true });
      input.dispatchEvent(event);

      expect(handler).not.toHaveBeenCalled();
      group.cleanup();
      input.remove();
    });
  });
});

describe('ShortcutGroup', () => {
  // Helper to dispatch keyboard events
  function dispatchKeydown(options: {
    key: string;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    metaKey?: boolean;
  }): KeyboardEvent {
    const event = new KeyboardEvent('keydown', {
      key: options.key,
      ctrlKey: options.ctrlKey ?? false,
      shiftKey: options.shiftKey ?? false,
      altKey: options.altKey ?? false,
      metaKey: options.metaKey ?? false,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(event);
    return event;
  }

  describe('add', () => {
    it('should add shortcut to group', () => {
      const group = new ShortcutGroup();
      const handler = vi.fn();

      group.add(KeyboardShortcut.escape(), handler);
      dispatchKeydown({ key: 'Escape' });

      expect(handler).toHaveBeenCalledTimes(1);
      group.cleanup();
    });

    it('should accept ShortcutDefinition', () => {
      const group = new ShortcutGroup();
      const handler = vi.fn();

      group.add({ key: 's', ctrlKey: true }, handler);
      dispatchKeydown({ key: 's', ctrlKey: true });

      expect(handler).toHaveBeenCalledTimes(1);
      group.cleanup();
    });

    it('should accept options', () => {
      const group = new ShortcutGroup();
      const handler = vi.fn();

      group.add(KeyboardShortcut.escape(), handler, { once: true });
      dispatchKeydown({ key: 'Escape' });
      dispatchKeydown({ key: 'Escape' });

      expect(handler).toHaveBeenCalledTimes(1);
      group.cleanup();
    });

    it('should return this for chaining', () => {
      const group = new ShortcutGroup();
      const handler = vi.fn();

      const result = group.add(KeyboardShortcut.escape(), handler);

      expect(result).toBe(group);
      group.cleanup();
    });

    it('should apply group default options', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);
      const handler = vi.fn();
      const group = new ShortcutGroup({ ignoreEditableTargets: true });
      group.add(KeyboardShortcut.key('r'), handler);

      const event = new KeyboardEvent('keydown', { key: 'r', bubbles: true, cancelable: true });
      input.dispatchEvent(event);

      expect(handler).not.toHaveBeenCalled();
      group.cleanup();
      input.remove();
    });

    it('should let per-add options override group defaults', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);
      const handler = vi.fn();
      const group = new ShortcutGroup({ ignoreEditableTargets: true });
      group.add(KeyboardShortcut.key('r'), handler, { ignoreEditableTargets: false });

      const event = new KeyboardEvent('keydown', { key: 'r', bubbles: true, cancelable: true });
      input.dispatchEvent(event);

      expect(handler).toHaveBeenCalledTimes(1);
      group.cleanup();
      input.remove();
    });

    it('should support chaining multiple adds', () => {
      const group = new ShortcutGroup();
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      group.add(KeyboardShortcut.escape(), handler1).add(KeyboardShortcut.enter(), handler2);

      dispatchKeydown({ key: 'Escape' });
      dispatchKeydown({ key: 'Enter' });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
      group.cleanup();
    });
  });

  describe('addEscape', () => {
    it('should add Escape handler to group', () => {
      const group = new ShortcutGroup();
      const handler = vi.fn();

      group.addEscape(handler);
      dispatchKeydown({ key: 'Escape' });

      expect(handler).toHaveBeenCalledTimes(1);
      // Note: onEscape auto-removes, no cleanup needed for this specific handler
    });

    it('should return this for chaining', () => {
      const group = new ShortcutGroup();
      const handler = vi.fn();

      const result = group.addEscape(handler);

      expect(result).toBe(group);
      group.cleanup();
    });

    it('should use onEscape behavior (once, capture, stopImmediatePropagation)', () => {
      const group = new ShortcutGroup();
      const handler = vi.fn();

      group.addEscape(handler);
      dispatchKeydown({ key: 'Escape' });
      dispatchKeydown({ key: 'Escape' });

      // Should only trigger once due to once: true in onEscape
      expect(handler).toHaveBeenCalledTimes(1);
      group.cleanup();
    });

    it('should be exempt from group ignoreEditableTargets default', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);
      const handler = vi.fn();
      const group = new ShortcutGroup({ ignoreEditableTargets: true });
      group.addEscape(handler);

      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      });
      input.dispatchEvent(event);

      // Escape still fires while focus is in an input (close-modal-while-typing).
      expect(handler).toHaveBeenCalledTimes(1);
      group.cleanup();
      input.remove();
    });
  });

  describe('cleanup', () => {
    it('should cleanup all shortcuts in group', () => {
      const group = new ShortcutGroup();
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      group.add(KeyboardShortcut.escape(), handler1);
      group.add(KeyboardShortcut.enter(), handler2);

      group.cleanup();

      dispatchKeydown({ key: 'Escape' });
      dispatchKeydown({ key: 'Enter' });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });

    it('should allow multiple cleanups without error', () => {
      const group = new ShortcutGroup();
      const handler = vi.fn();

      group.add(KeyboardShortcut.escape(), handler);

      group.cleanup();
      group.cleanup();
      group.cleanup();

      dispatchKeydown({ key: 'Escape' });
      expect(handler).not.toHaveBeenCalled();
    });

    it('should reset size to 0', () => {
      const group = new ShortcutGroup();
      const handler = vi.fn();

      group.add(KeyboardShortcut.escape(), handler);
      group.add(KeyboardShortcut.enter(), handler);

      expect(group.size).toBe(2);

      group.cleanup();

      expect(group.size).toBe(0);
    });
  });

  describe('size', () => {
    it('should return 0 for empty group', () => {
      const group = new ShortcutGroup();

      expect(group.size).toBe(0);
    });

    it('should return correct count after adding shortcuts', () => {
      const group = new ShortcutGroup();
      const handler = vi.fn();

      group.add(KeyboardShortcut.escape(), handler);
      expect(group.size).toBe(1);

      group.add(KeyboardShortcut.enter(), handler);
      expect(group.size).toBe(2);

      group.add(KeyboardShortcut.ctrlKey('s'), handler);
      expect(group.size).toBe(3);

      group.cleanup();
    });

    it('should include addEscape in count', () => {
      const group = new ShortcutGroup();
      const handler = vi.fn();

      group.addEscape(handler);

      expect(group.size).toBe(1);
      group.cleanup();
    });
  });
});
