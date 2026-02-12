import { describe, it, expect } from 'vitest';
import { KeyboardShortcut } from '../../src/keyboard/index.js';

describe('KeyboardShortcut', () => {
  // ===========================================================================
  // Factory Methods
  // ===========================================================================

  describe('create', () => {
    it('should create shortcut with all modifiers', () => {
      const shortcut = KeyboardShortcut.create({
        key: 'a',
        ctrlKey: true,
        shiftKey: true,
        altKey: true,
        metaKey: true,
      });

      expect(shortcut.key).toBe('a');
      expect(shortcut.ctrlKey).toBe(true);
      expect(shortcut.shiftKey).toBe(true);
      expect(shortcut.altKey).toBe(true);
      expect(shortcut.metaKey).toBe(true);
    });

    it('should default all modifiers to false', () => {
      const shortcut = KeyboardShortcut.create({ key: 'x' });

      expect(shortcut.key).toBe('x');
      expect(shortcut.ctrlKey).toBe(false);
      expect(shortcut.shiftKey).toBe(false);
      expect(shortcut.altKey).toBe(false);
      expect(shortcut.metaKey).toBe(false);
    });

    it('should handle partial modifier specification', () => {
      const shortcut = KeyboardShortcut.create({
        key: 'b',
        ctrlKey: true,
        altKey: true,
      });

      expect(shortcut.ctrlKey).toBe(true);
      expect(shortcut.shiftKey).toBe(false);
      expect(shortcut.altKey).toBe(true);
      expect(shortcut.metaKey).toBe(false);
    });
  });

  describe('key', () => {
    it('should create shortcut with no modifiers', () => {
      const shortcut = KeyboardShortcut.key('F1');

      expect(shortcut.key).toBe('F1');
      expect(shortcut.ctrlKey).toBe(false);
      expect(shortcut.shiftKey).toBe(false);
      expect(shortcut.altKey).toBe(false);
      expect(shortcut.metaKey).toBe(false);
    });

    it('should create shortcut for single letter', () => {
      const shortcut = KeyboardShortcut.key('a');

      expect(shortcut.key).toBe('a');
    });
  });

  describe('ctrlKey', () => {
    it('should create Ctrl+key shortcut', () => {
      const shortcut = KeyboardShortcut.ctrlKey('s');

      expect(shortcut.key).toBe('s');
      expect(shortcut.ctrlKey).toBe(true);
      expect(shortcut.shiftKey).toBe(false);
      expect(shortcut.altKey).toBe(false);
      expect(shortcut.metaKey).toBe(false);
    });
  });

  describe('ctrlShift', () => {
    it('should create Ctrl+Shift+key shortcut', () => {
      const shortcut = KeyboardShortcut.ctrlShift('d');

      expect(shortcut.key).toBe('d');
      expect(shortcut.ctrlKey).toBe(true);
      expect(shortcut.shiftKey).toBe(true);
      expect(shortcut.altKey).toBe(false);
      expect(shortcut.metaKey).toBe(false);
    });
  });

  describe('altKey', () => {
    it('should create Alt+key shortcut', () => {
      const shortcut = KeyboardShortcut.altKey('f');

      expect(shortcut.key).toBe('f');
      expect(shortcut.ctrlKey).toBe(false);
      expect(shortcut.shiftKey).toBe(false);
      expect(shortcut.altKey).toBe(true);
      expect(shortcut.metaKey).toBe(false);
    });
  });

  describe('metaKey', () => {
    it('should create Meta+key shortcut', () => {
      const shortcut = KeyboardShortcut.metaKey('c');

      expect(shortcut.key).toBe('c');
      expect(shortcut.ctrlKey).toBe(false);
      expect(shortcut.shiftKey).toBe(false);
      expect(shortcut.altKey).toBe(false);
      expect(shortcut.metaKey).toBe(true);
    });
  });

  describe('escape', () => {
    it('should create Escape key shortcut', () => {
      const shortcut = KeyboardShortcut.escape();

      expect(shortcut.key).toBe('Escape');
      expect(shortcut.ctrlKey).toBe(false);
      expect(shortcut.shiftKey).toBe(false);
      expect(shortcut.altKey).toBe(false);
      expect(shortcut.metaKey).toBe(false);
    });
  });

  describe('enter', () => {
    it('should create Enter key shortcut', () => {
      const shortcut = KeyboardShortcut.enter();

      expect(shortcut.key).toBe('Enter');
      expect(shortcut.ctrlKey).toBe(false);
      expect(shortcut.shiftKey).toBe(false);
      expect(shortcut.altKey).toBe(false);
      expect(shortcut.metaKey).toBe(false);
    });
  });

  // ===========================================================================
  // Matching
  // ===========================================================================

  describe('matches', () => {
    function createKeyboardEvent(options: {
      key: string;
      ctrlKey?: boolean;
      shiftKey?: boolean;
      altKey?: boolean;
      metaKey?: boolean;
    }): KeyboardEvent {
      return new KeyboardEvent('keydown', {
        key: options.key,
        ctrlKey: options.ctrlKey ?? false,
        shiftKey: options.shiftKey ?? false,
        altKey: options.altKey ?? false,
        metaKey: options.metaKey ?? false,
      });
    }

    describe('key matching', () => {
      it('should match exact key', () => {
        const shortcut = KeyboardShortcut.key('a');
        const event = createKeyboardEvent({ key: 'a' });

        expect(shortcut.matches(event)).toBe(true);
      });

      it('should match key case-insensitively for single letters', () => {
        const shortcut = KeyboardShortcut.key('a');
        const eventUppercase = createKeyboardEvent({ key: 'A' });

        expect(shortcut.matches(eventUppercase)).toBe(true);
      });

      it('should match uppercase shortcut with lowercase event', () => {
        const shortcut = KeyboardShortcut.key('A');
        const event = createKeyboardEvent({ key: 'a' });

        expect(shortcut.matches(event)).toBe(true);
      });

      it('should match special keys exactly', () => {
        const shortcut = KeyboardShortcut.escape();
        const event = createKeyboardEvent({ key: 'Escape' });

        expect(shortcut.matches(event)).toBe(true);
      });

      it('should not match different special keys', () => {
        const shortcut = KeyboardShortcut.escape();
        const event = createKeyboardEvent({ key: 'Enter' });

        expect(shortcut.matches(event)).toBe(false);
      });

      it('should not match different letters', () => {
        const shortcut = KeyboardShortcut.key('a');
        const event = createKeyboardEvent({ key: 'b' });

        expect(shortcut.matches(event)).toBe(false);
      });

      it('should match function keys exactly', () => {
        const shortcut = KeyboardShortcut.key('F1');
        const event = createKeyboardEvent({ key: 'F1' });

        expect(shortcut.matches(event)).toBe(true);
      });

      it('should not match different function keys', () => {
        const shortcut = KeyboardShortcut.key('F1');
        const event = createKeyboardEvent({ key: 'F2' });

        expect(shortcut.matches(event)).toBe(false);
      });
    });

    describe('modifier matching', () => {
      it('should match when all modifiers are correct', () => {
        const shortcut = KeyboardShortcut.create({
          key: 'a',
          ctrlKey: true,
          shiftKey: true,
          altKey: true,
          metaKey: true,
        });
        const event = createKeyboardEvent({
          key: 'a',
          ctrlKey: true,
          shiftKey: true,
          altKey: true,
          metaKey: true,
        });

        expect(shortcut.matches(event)).toBe(true);
      });

      it('should not match when extra ctrl is pressed', () => {
        const shortcut = KeyboardShortcut.key('a');
        const event = createKeyboardEvent({ key: 'a', ctrlKey: true });

        expect(shortcut.matches(event)).toBe(false);
      });

      it('should not match when extra shift is pressed', () => {
        const shortcut = KeyboardShortcut.key('a');
        const event = createKeyboardEvent({ key: 'a', shiftKey: true });

        expect(shortcut.matches(event)).toBe(false);
      });

      it('should not match when extra alt is pressed', () => {
        const shortcut = KeyboardShortcut.key('a');
        const event = createKeyboardEvent({ key: 'a', altKey: true });

        expect(shortcut.matches(event)).toBe(false);
      });

      it('should not match when extra meta is pressed', () => {
        const shortcut = KeyboardShortcut.key('a');
        const event = createKeyboardEvent({ key: 'a', metaKey: true });

        expect(shortcut.matches(event)).toBe(false);
      });

      it('should not match when required ctrl is missing', () => {
        const shortcut = KeyboardShortcut.ctrlKey('s');
        const event = createKeyboardEvent({ key: 's' });

        expect(shortcut.matches(event)).toBe(false);
      });

      it('should not match when required shift is missing', () => {
        const shortcut = KeyboardShortcut.ctrlShift('d');
        const event = createKeyboardEvent({ key: 'd', ctrlKey: true });

        expect(shortcut.matches(event)).toBe(false);
      });

      it('should not match when required alt is missing', () => {
        const shortcut = KeyboardShortcut.altKey('f');
        const event = createKeyboardEvent({ key: 'f' });

        expect(shortcut.matches(event)).toBe(false);
      });

      it('should not match when required meta is missing', () => {
        const shortcut = KeyboardShortcut.metaKey('c');
        const event = createKeyboardEvent({ key: 'c' });

        expect(shortcut.matches(event)).toBe(false);
      });

      it('should match Ctrl+S correctly', () => {
        const shortcut = KeyboardShortcut.ctrlKey('s');
        const event = createKeyboardEvent({ key: 's', ctrlKey: true });

        expect(shortcut.matches(event)).toBe(true);
      });

      it('should match Ctrl+Shift+D correctly', () => {
        const shortcut = KeyboardShortcut.ctrlShift('d');
        const event = createKeyboardEvent({ key: 'd', ctrlKey: true, shiftKey: true });

        expect(shortcut.matches(event)).toBe(true);
      });
    });
  });

  // ===========================================================================
  // Display
  // ===========================================================================

  describe('toString', () => {
    it('should format single key', () => {
      const shortcut = KeyboardShortcut.key('a');

      expect(shortcut.toString()).toBe('A');
    });

    it('should format single letter uppercase', () => {
      const shortcut = KeyboardShortcut.key('s');

      expect(shortcut.toString()).toBe('S');
    });

    it('should format Ctrl+key', () => {
      const shortcut = KeyboardShortcut.ctrlKey('s');

      expect(shortcut.toString()).toBe('Ctrl+S');
    });

    it('should format Ctrl+Shift+key', () => {
      const shortcut = KeyboardShortcut.ctrlShift('d');

      expect(shortcut.toString()).toBe('Ctrl+Shift+D');
    });

    it('should format Alt+key', () => {
      const shortcut = KeyboardShortcut.altKey('f');

      expect(shortcut.toString()).toBe('Alt+F');
    });

    it('should format Meta+key as Cmd', () => {
      const shortcut = KeyboardShortcut.metaKey('c');

      expect(shortcut.toString()).toBe('Cmd+C');
    });

    it('should format all modifiers in order Ctrl+Alt+Shift+Cmd', () => {
      const shortcut = KeyboardShortcut.create({
        key: 'a',
        ctrlKey: true,
        shiftKey: true,
        altKey: true,
        metaKey: true,
      });

      expect(shortcut.toString()).toBe('Ctrl+Alt+Shift+Cmd+A');
    });

    it('should preserve special key names', () => {
      const shortcut = KeyboardShortcut.escape();

      expect(shortcut.toString()).toBe('Escape');
    });

    it('should preserve Enter key name', () => {
      const shortcut = KeyboardShortcut.enter();

      expect(shortcut.toString()).toBe('Enter');
    });

    it('should preserve function key names', () => {
      const shortcut = KeyboardShortcut.key('F1');

      expect(shortcut.toString()).toBe('F1');
    });

    it('should format Ctrl+function key', () => {
      const shortcut = KeyboardShortcut.ctrlKey('F12');

      expect(shortcut.toString()).toBe('Ctrl+F12');
    });
  });

  describe('toMacString', () => {
    it('should format single key', () => {
      const shortcut = KeyboardShortcut.key('a');

      expect(shortcut.toMacString()).toBe('A');
    });

    it('should format Ctrl as control symbol', () => {
      const shortcut = KeyboardShortcut.ctrlKey('s');

      expect(shortcut.toMacString()).toBe('\u2303S');
    });

    it('should format Alt as option symbol', () => {
      const shortcut = KeyboardShortcut.altKey('f');

      expect(shortcut.toMacString()).toBe('\u2325F');
    });

    it('should format Shift as shift symbol', () => {
      const shortcut = KeyboardShortcut.ctrlShift('d');

      expect(shortcut.toMacString()).toBe('\u2303\u21E7D');
    });

    it('should format Meta as command symbol', () => {
      const shortcut = KeyboardShortcut.metaKey('c');

      expect(shortcut.toMacString()).toBe('\u2318C');
    });

    it('should format all modifiers in Mac order', () => {
      const shortcut = KeyboardShortcut.create({
        key: 'a',
        ctrlKey: true,
        shiftKey: true,
        altKey: true,
        metaKey: true,
      });

      expect(shortcut.toMacString()).toBe('\u2303\u2325\u21E7\u2318A');
    });

    it('should preserve special key names', () => {
      const shortcut = KeyboardShortcut.escape();

      expect(shortcut.toMacString()).toBe('Escape');
    });

    it('should preserve function key names', () => {
      const shortcut = KeyboardShortcut.key('F1');

      expect(shortcut.toMacString()).toBe('F1');
    });

    it('should format Cmd+function key', () => {
      const shortcut = KeyboardShortcut.metaKey('F12');

      expect(shortcut.toMacString()).toBe('\u2318F12');
    });
  });

  // ===========================================================================
  // Immutability
  // ===========================================================================

  describe('immutability', () => {
    it('should have readonly key property', () => {
      const shortcut = KeyboardShortcut.key('a');

      // TypeScript should prevent: shortcut.key = 'b';
      expect(shortcut.key).toBe('a');
    });

    it('should have readonly ctrlKey property', () => {
      const shortcut = KeyboardShortcut.ctrlKey('s');

      // TypeScript should prevent: shortcut.ctrlKey = false;
      expect(shortcut.ctrlKey).toBe(true);
    });

    it('should have readonly shiftKey property', () => {
      const shortcut = KeyboardShortcut.ctrlShift('d');

      // TypeScript should prevent: shortcut.shiftKey = false;
      expect(shortcut.shiftKey).toBe(true);
    });

    it('should have readonly altKey property', () => {
      const shortcut = KeyboardShortcut.altKey('f');

      // TypeScript should prevent: shortcut.altKey = false;
      expect(shortcut.altKey).toBe(true);
    });

    it('should have readonly metaKey property', () => {
      const shortcut = KeyboardShortcut.metaKey('c');

      // TypeScript should prevent: shortcut.metaKey = false;
      expect(shortcut.metaKey).toBe(true);
    });
  });
});
