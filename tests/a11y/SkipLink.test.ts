import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SkipLink } from '../../src/a11y/index.js';
import { ValidationError } from '../../src/core/index.js';

describe('SkipLink', () => {
  let mainContent: HTMLDivElement;

  beforeEach(() => {
    mainContent = document.createElement('div');
    mainContent.id = 'main-content';
    document.body.appendChild(mainContent);
  });

  afterEach(() => {
    mainContent.remove();
    // Clean up any remaining skip links
    document.querySelectorAll('a[href^="#"]').forEach((el) => el.remove());
  });

  // ===========================================================================
  // create
  // ===========================================================================

  describe('create', () => {
    it('should create a skip link element', () => {
      const cleanup = SkipLink.create({ targetId: 'main-content' });

      const link = document.querySelector('a[href="#main-content"]');
      expect(link).not.toBeNull();

      cleanup();
    });

    it('should use default text', () => {
      const cleanup = SkipLink.create({ targetId: 'main-content' });

      const link = document.querySelector('a[href="#main-content"]');
      expect(link?.textContent).toBe('Skip to main content');

      cleanup();
    });

    it('should use custom text', () => {
      const cleanup = SkipLink.create({
        targetId: 'main-content',
        text: 'Zum Inhalt springen',
      });

      const link = document.querySelector('a[href="#main-content"]');
      expect(link?.textContent).toBe('Zum Inhalt springen');

      cleanup();
    });

    it('should be visually hidden by default', () => {
      const cleanup = SkipLink.create({ targetId: 'main-content' });

      const link = document.querySelector('a[href="#main-content"]') as HTMLAnchorElement;
      expect(link.style.position).toBe('absolute');
      expect(link.style.left).toBe('-9999px');
      expect(link.style.overflow).toBe('hidden');

      cleanup();
    });

    it('should insert at the beginning of body', () => {
      const cleanup = SkipLink.create({ targetId: 'main-content' });

      expect(document.body.firstChild).toBe(document.querySelector('a[href="#main-content"]'));

      cleanup();
    });

    it('should apply custom className when provided', () => {
      const cleanup = SkipLink.create({
        targetId: 'main-content',
        className: 'custom-skip-link',
      });

      const link = document.querySelector('a[href="#main-content"]');
      expect(link?.className).toBe('custom-skip-link');

      cleanup();
    });

    it('should not apply default styles when className is provided', () => {
      const cleanup = SkipLink.create({
        targetId: 'main-content',
        className: 'custom-skip-link',
      });

      const link = document.querySelector('a[href="#main-content"]') as HTMLAnchorElement;
      expect(link.style.position).toBe('');

      cleanup();
    });

    it('should throw ValidationError for empty targetId', () => {
      expect(() => SkipLink.create({ targetId: '' })).toThrow(ValidationError);
    });
  });

  // ===========================================================================
  // Focus behavior
  // ===========================================================================

  describe('focus behavior', () => {
    it('should become visible on focus', () => {
      const cleanup = SkipLink.create({ targetId: 'main-content' });

      const link = document.querySelector('a[href="#main-content"]') as HTMLAnchorElement;
      link.dispatchEvent(new Event('focus'));

      expect(link.style.position).toBe('fixed');
      expect(link.style.left).toBe('8px');
      expect(link.style.top).toBe('8px');

      cleanup();
    });

    it('should become hidden on blur', () => {
      const cleanup = SkipLink.create({ targetId: 'main-content' });

      const link = document.querySelector('a[href="#main-content"]') as HTMLAnchorElement;

      // Focus then blur
      link.dispatchEvent(new Event('focus'));
      link.dispatchEvent(new Event('blur'));

      expect(link.style.position).toBe('absolute');
      expect(link.style.left).toBe('-9999px');

      cleanup();
    });
  });

  // ===========================================================================
  // Click behavior
  // ===========================================================================

  describe('click behavior', () => {
    it('should focus target element on click', () => {
      const cleanup = SkipLink.create({ targetId: 'main-content' });

      const link = document.querySelector('a[href="#main-content"]') as HTMLAnchorElement;
      const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
      link.dispatchEvent(clickEvent);

      expect(document.activeElement).toBe(mainContent);

      cleanup();
    });

    it('should add tabindex=-1 to target if not focusable', () => {
      const cleanup = SkipLink.create({ targetId: 'main-content' });

      const link = document.querySelector('a[href="#main-content"]') as HTMLAnchorElement;
      link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

      expect(mainContent.getAttribute('tabindex')).toBe('-1');

      cleanup();
    });

    it('should not add tabindex if target already has one', () => {
      mainContent.setAttribute('tabindex', '0');
      const cleanup = SkipLink.create({ targetId: 'main-content' });

      const link = document.querySelector('a[href="#main-content"]') as HTMLAnchorElement;
      link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

      expect(mainContent.getAttribute('tabindex')).toBe('0');

      cleanup();
    });

    it('should handle missing target gracefully', () => {
      mainContent.remove();
      const cleanup = SkipLink.create({ targetId: 'main-content' });

      const link = document.querySelector('a[href="#main-content"]') as HTMLAnchorElement;
      expect(() =>
        link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      ).not.toThrow();

      cleanup();
    });

    it('should prevent default navigation', () => {
      const cleanup = SkipLink.create({ targetId: 'main-content' });

      const link = document.querySelector('a[href="#main-content"]') as HTMLAnchorElement;
      const event = new MouseEvent('click', { bubbles: true, cancelable: true });
      link.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);

      cleanup();
    });
  });

  // ===========================================================================
  // cleanup
  // ===========================================================================

  describe('cleanup', () => {
    it('should remove the skip link from DOM', () => {
      const cleanup = SkipLink.create({ targetId: 'main-content' });

      expect(document.querySelector('a[href="#main-content"]')).not.toBeNull();

      cleanup();

      expect(document.querySelector('a[href="#main-content"]')).toBeNull();
    });
  });
});
