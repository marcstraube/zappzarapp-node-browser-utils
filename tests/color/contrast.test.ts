import { describe, it, expect } from 'vitest';
import { relativeLuminance, contrastRatio, isReadableOn } from '../../src/color/index.js';
import { makeRgba } from '../../src/color/Rgba.js';

const black = makeRgba(0, 0, 0, 1);
const white = makeRgba(255, 255, 255, 1);

describe('relativeLuminance', () => {
  it('should be 0 for black and 1 for white', () => {
    expect(relativeLuminance(black)).toBe(0);
    expect(relativeLuminance(white)).toBeCloseTo(1, 10);
  });

  it('should use the green-weighted coefficients (green > red > blue)', () => {
    const red = relativeLuminance(makeRgba(255, 0, 0, 1));
    const green = relativeLuminance(makeRgba(0, 255, 0, 1));
    const blue = relativeLuminance(makeRgba(0, 0, 255, 1));
    expect(green).toBeGreaterThan(red);
    expect(red).toBeGreaterThan(blue);
  });

  it('should ignore alpha', () => {
    expect(relativeLuminance(makeRgba(255, 255, 255, 0.2))).toBe(relativeLuminance(white));
  });
});

describe('contrastRatio', () => {
  it('should be 21 for black against white', () => {
    expect(contrastRatio(black, white)).toBeCloseTo(21, 10);
  });

  it('should be 1 for identical colors', () => {
    expect(contrastRatio(white, white)).toBe(1);
  });

  it('should be symmetric', () => {
    expect(contrastRatio(black, white)).toBe(contrastRatio(white, black));
  });
});

describe('isReadableOn', () => {
  it('should pass black on white at default AA', () => {
    expect(isReadableOn(black, white)).toBe(true);
  });

  it('should fail a low-contrast pair', () => {
    expect(isReadableOn(makeRgba(170, 170, 170, 1), white)).toBe(false);
  });

  it('should treat the AA normal boundary (4.5) inclusively', () => {
    // #767676 on white is ~4.54:1 (passes); #777777 is ~4.48:1 (fails).
    expect(isReadableOn(makeRgba(118, 118, 118, 1), white, { level: 'AA', size: 'normal' })).toBe(
      true
    );
    expect(isReadableOn(makeRgba(119, 119, 119, 1), white, { level: 'AA', size: 'normal' })).toBe(
      false
    );
  });

  it('should require less contrast for large text', () => {
    // #8c8c8c on white is ~3.36:1 — below AA normal (4.5) but above AA large (3.0).
    const grey = makeRgba(140, 140, 140, 1);
    expect(isReadableOn(grey, white, { size: 'normal' })).toBe(false);
    expect(isReadableOn(grey, white, { size: 'large' })).toBe(true);
  });

  it('should require more contrast for AAA than AA', () => {
    const grey = makeRgba(110, 110, 110, 1);
    expect(isReadableOn(grey, white, { level: 'AA' })).toBe(true);
    expect(isReadableOn(grey, white, { level: 'AAA' })).toBe(false);
  });
});
