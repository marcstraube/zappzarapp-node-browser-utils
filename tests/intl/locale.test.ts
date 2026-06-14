import { describe, it, expect } from 'vitest';
import { resolveLocale } from '../../src/intl/index.js';

describe('resolveLocale', () => {
  it('should return an exact match', () => {
    expect(resolveLocale(['de', 'en'], 'en')).toBe('en');
  });

  it('should match case-insensitively and keep the supported casing', () => {
    expect(resolveLocale(['en-US'], 'EN-us')).toBe('en-US');
  });

  it('should match by primary language (de-AT -> de)', () => {
    expect(resolveLocale(['de', 'en'], 'de-AT')).toBe('de');
  });

  it('should match a region variant by language (en-US -> en-GB)', () => {
    expect(resolveLocale(['de-DE', 'en-GB'], 'en-US')).toBe('en-GB');
  });

  it('should honour requested order, skipping unmatched tags', () => {
    expect(resolveLocale(['de', 'en'], ['fr', 'en'])).toBe('en');
  });

  it('should fall back to the first supported locale when nothing matches', () => {
    expect(resolveLocale(['de', 'en'], 'fr')).toBe('de');
  });

  it('should accept a single string or a list', () => {
    expect(resolveLocale(['de', 'en'], 'de')).toBe('de');
    expect(resolveLocale(['de', 'en'], ['de'])).toBe('de');
  });

  it('should fall back when the requested list is empty', () => {
    expect(resolveLocale(['de', 'en'], [])).toBe('de');
  });

  it('should return "" when supported is empty', () => {
    expect(resolveLocale([], 'en')).toBe('');
  });

  it('should never throw on malformed tags (total)', () => {
    expect(resolveLocale(['en'], 'not a locale!!')).toBe('en');
  });
});
