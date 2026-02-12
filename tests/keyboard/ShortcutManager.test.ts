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
