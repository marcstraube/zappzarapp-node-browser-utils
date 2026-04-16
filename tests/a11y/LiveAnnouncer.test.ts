import { describe, it, expect, vi, afterEach } from 'vitest';
import { LiveAnnouncer } from '../../src/a11y/index.js';

describe('LiveAnnouncer', () => {
  afterEach(() => {
    // Clean up any remaining live regions
    document.querySelectorAll('[aria-live]').forEach((el) => el.remove());
  });

  // ===========================================================================
  // create
  // ===========================================================================

  describe('create', () => {
    it('should create live regions in the DOM', () => {
      const announcer = LiveAnnouncer.create();

      const polite = document.querySelector('[aria-live="polite"]');
      const assertive = document.querySelector('[aria-live="assertive"]');

      expect(polite).not.toBeNull();
      expect(assertive).not.toBeNull();

      announcer.destroy();
    });

    it('should create visually hidden regions', () => {
      const announcer = LiveAnnouncer.create();

      const polite = document.querySelector('[aria-live="polite"]') as HTMLElement;
      expect(polite.style.position).toBe('absolute');
      expect(polite.style.width).toBe('1px');
      expect(polite.style.height).toBe('1px');
      expect(polite.style.overflow).toBe('hidden');
      expect(polite.style.padding).toBe('0px');
      expect(polite.style.margin).toBe('-1px');
      expect(polite.style.whiteSpace).toBe('nowrap');
      expect(polite.style.border).toBe('0px');
      expect(polite.style.clip).toBe('rect(0, 0, 0, 0)');

      announcer.destroy();
    });

    it('should set role=status on regions', () => {
      const announcer = LiveAnnouncer.create();

      const polite = document.querySelector('[aria-live="polite"]');
      expect(polite?.getAttribute('role')).toBe('status');

      announcer.destroy();
    });

    it('should set aria-atomic=true on regions', () => {
      const announcer = LiveAnnouncer.create();

      const polite = document.querySelector('[aria-live="polite"]');
      expect(polite?.getAttribute('aria-atomic')).toBe('true');

      announcer.destroy();
    });
  });

  // ===========================================================================
  // announce
  // ===========================================================================

  describe('announce', () => {
    it('should announce polite message after delay', () => {
      vi.useFakeTimers();

      const announcer = LiveAnnouncer.create();
      announcer.announce('Item added');

      // Before delay, region should be empty (cleared first)
      const polite = document.querySelector('[aria-live="polite"]');
      expect(polite?.textContent).toBe('');

      vi.advanceTimersByTime(100);

      expect(polite?.textContent).toBe('Item added');

      announcer.destroy();
      vi.useRealTimers();
    });

    it('should announce assertive message in assertive region', () => {
      vi.useFakeTimers();

      const announcer = LiveAnnouncer.create();
      announcer.announce('Error occurred', 'assertive');

      vi.advanceTimersByTime(100);

      const assertive = document.querySelector('[aria-live="assertive"]');
      expect(assertive?.textContent).toBe('Error occurred');

      announcer.destroy();
      vi.useRealTimers();
    });

    it('should default to polite politeness', () => {
      vi.useFakeTimers();

      const announcer = LiveAnnouncer.create();
      announcer.announce('Default polite');

      vi.advanceTimersByTime(100);

      const polite = document.querySelector('[aria-live="polite"]');
      expect(polite?.textContent).toBe('Default polite');

      const assertive = document.querySelector('[aria-live="assertive"]');
      expect(assertive?.textContent).toBe('');

      announcer.destroy();
      vi.useRealTimers();
    });

    it('should not announce after destroy', () => {
      vi.useFakeTimers();

      const announcer = LiveAnnouncer.create();
      announcer.destroy();
      announcer.announce('Should not appear');

      vi.advanceTimersByTime(100);

      // Regions should be removed from DOM
      expect(document.querySelector('[aria-live="polite"]')).toBeNull();

      vi.useRealTimers();
    });

    it('should handle destroy during pending announcement', () => {
      vi.useFakeTimers();

      const announcer = LiveAnnouncer.create();
      announcer.announce('Pending message');

      // Destroy before the delay fires
      announcer.destroy();

      // Advance timer - should not throw
      expect(() => vi.advanceTimersByTime(100)).not.toThrow();

      vi.useRealTimers();
    });
  });

  // ===========================================================================
  // clear
  // ===========================================================================

  describe('clear', () => {
    it('should clear both regions', () => {
      vi.useFakeTimers();

      const announcer = LiveAnnouncer.create();
      announcer.announce('Polite message');
      announcer.announce('Assertive message', 'assertive');

      vi.advanceTimersByTime(100);

      announcer.clear();

      const polite = document.querySelector('[aria-live="polite"]');
      const assertive = document.querySelector('[aria-live="assertive"]');
      expect(polite?.textContent).toBe('');
      expect(assertive?.textContent).toBe('');

      announcer.destroy();
      vi.useRealTimers();
    });

    it('should not throw after destroy', () => {
      const announcer = LiveAnnouncer.create();
      announcer.destroy();
      expect(() => announcer.clear()).not.toThrow();
    });
  });

  // ===========================================================================
  // destroy
  // ===========================================================================

  describe('destroy', () => {
    it('should remove live regions from DOM', () => {
      const announcer = LiveAnnouncer.create();

      expect(document.querySelector('[aria-live="polite"]')).not.toBeNull();

      announcer.destroy();

      expect(document.querySelector('[aria-live="polite"]')).toBeNull();
      expect(document.querySelector('[aria-live="assertive"]')).toBeNull();
    });

    it('should be safe to call multiple times', () => {
      const announcer = LiveAnnouncer.create();

      expect(() => {
        announcer.destroy();
        announcer.destroy();
        announcer.destroy();
      }).not.toThrow();
    });
  });
});
