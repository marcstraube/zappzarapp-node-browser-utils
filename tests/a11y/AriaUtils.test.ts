import { describe, it, expect, beforeEach } from 'vitest';
import { AriaUtils } from '../../src/a11y/index.js';
import { ValidationError } from '../../src/core/index.js';

describe('AriaUtils', () => {
  let element: HTMLDivElement;

  beforeEach(() => {
    element = document.createElement('div');
  });

  // ===========================================================================
  // set
  // ===========================================================================

  describe('set', () => {
    it('should set an ARIA attribute', () => {
      AriaUtils.set(element, 'expanded', 'true');
      expect(element.getAttribute('aria-expanded')).toBe('true');
    });

    it('should set aria-label', () => {
      AriaUtils.set(element, 'label', 'Close dialog');
      expect(element.getAttribute('aria-label')).toBe('Close dialog');
    });

    it('should set aria-hidden', () => {
      AriaUtils.set(element, 'hidden', 'true');
      expect(element.getAttribute('aria-hidden')).toBe('true');
    });

    it('should overwrite existing value', () => {
      AriaUtils.set(element, 'expanded', 'true');
      AriaUtils.set(element, 'expanded', 'false');
      expect(element.getAttribute('aria-expanded')).toBe('false');
    });

    it('should throw ValidationError for unknown attribute', () => {
      expect(() => AriaUtils.set(element, 'notreal', 'true')).toThrow(ValidationError);
    });

    it('should throw ValidationError for empty attribute', () => {
      expect(() => AriaUtils.set(element, '', 'true')).toThrow(ValidationError);
    });
  });

  // ===========================================================================
  // get
  // ===========================================================================

  describe('get', () => {
    it('should get an ARIA attribute value', () => {
      element.setAttribute('aria-expanded', 'true');
      expect(AriaUtils.get(element, 'expanded')).toBe('true');
    });

    it('should return null for unset attribute', () => {
      expect(AriaUtils.get(element, 'expanded')).toBeNull();
    });

    it('should throw ValidationError for invalid attribute', () => {
      expect(() => AriaUtils.get(element, 'notreal')).toThrow(ValidationError);
    });
  });

  // ===========================================================================
  // remove
  // ===========================================================================

  describe('remove', () => {
    it('should remove an ARIA attribute', () => {
      element.setAttribute('aria-expanded', 'true');
      AriaUtils.remove(element, 'expanded');
      expect(element.getAttribute('aria-expanded')).toBeNull();
    });

    it('should not throw for already-absent attribute', () => {
      expect(() => AriaUtils.remove(element, 'expanded')).not.toThrow();
    });

    it('should throw ValidationError for invalid attribute', () => {
      expect(() => AriaUtils.remove(element, 'fake')).toThrow(ValidationError);
    });
  });

  // ===========================================================================
  // toggle
  // ===========================================================================

  describe('toggle', () => {
    it('should toggle from true to false', () => {
      element.setAttribute('aria-expanded', 'true');
      const result = AriaUtils.toggle(element, 'expanded');
      expect(result).toBe('false');
      expect(element.getAttribute('aria-expanded')).toBe('false');
    });

    it('should toggle from false to true', () => {
      element.setAttribute('aria-expanded', 'false');
      const result = AriaUtils.toggle(element, 'expanded');
      expect(result).toBe('true');
      expect(element.getAttribute('aria-expanded')).toBe('true');
    });

    it('should set to true when attribute is not present', () => {
      const result = AriaUtils.toggle(element, 'expanded');
      expect(result).toBe('true');
      expect(element.getAttribute('aria-expanded')).toBe('true');
    });

    it('should throw ValidationError for invalid attribute', () => {
      expect(() => AriaUtils.toggle(element, 'bogus')).toThrow(ValidationError);
    });
  });

  // ===========================================================================
  // setRole
  // ===========================================================================

  describe('setRole', () => {
    it('should set a valid role', () => {
      AriaUtils.setRole(element, 'dialog');
      expect(element.getAttribute('role')).toBe('dialog');
    });

    it('should set button role', () => {
      AriaUtils.setRole(element, 'button');
      expect(element.getAttribute('role')).toBe('button');
    });

    it('should set navigation role', () => {
      AriaUtils.setRole(element, 'navigation');
      expect(element.getAttribute('role')).toBe('navigation');
    });

    it('should throw ValidationError for invalid role', () => {
      expect(() => AriaUtils.setRole(element, 'notarole')).toThrow(ValidationError);
    });

    it('should throw ValidationError for empty role', () => {
      expect(() => AriaUtils.setRole(element, '')).toThrow(ValidationError);
    });
  });

  // ===========================================================================
  // getRole
  // ===========================================================================

  describe('getRole', () => {
    it('should get the role attribute', () => {
      element.setAttribute('role', 'dialog');
      expect(AriaUtils.getRole(element)).toBe('dialog');
    });

    it('should return null when no role set', () => {
      expect(AriaUtils.getRole(element)).toBeNull();
    });
  });

  // ===========================================================================
  // removeRole
  // ===========================================================================

  describe('removeRole', () => {
    it('should remove the role attribute', () => {
      element.setAttribute('role', 'dialog');
      AriaUtils.removeRole(element);
      expect(element.getAttribute('role')).toBeNull();
    });

    it('should not throw for element without role', () => {
      expect(() => AriaUtils.removeRole(element)).not.toThrow();
    });
  });

  // ===========================================================================
  // validateAttribute
  // ===========================================================================

  describe('validateAttribute', () => {
    it('should accept all common ARIA attributes', () => {
      const commonAttrs = [
        'label',
        'labelledby',
        'describedby',
        'hidden',
        'expanded',
        'checked',
        'selected',
        'disabled',
        'required',
        'live',
        'busy',
        'controls',
        'modal',
      ];

      for (const attr of commonAttrs) {
        expect(() => AriaUtils.validateAttribute(attr)).not.toThrow();
      }
    });
  });
});
