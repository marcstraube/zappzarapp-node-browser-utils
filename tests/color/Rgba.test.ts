import { describe, it, expect } from 'vitest';
import { clampChannel, clampAlpha, makeRgba } from '../../src/color/Rgba.js';

describe('clampChannel', () => {
  it('should keep an in-range integer unchanged', () => {
    expect(clampChannel(128)).toBe(128);
  });

  it('should round to the nearest integer', () => {
    expect(clampChannel(127.4)).toBe(127);
    expect(clampChannel(127.6)).toBe(128);
  });

  it('should clamp above 255 to 255', () => {
    expect(clampChannel(256)).toBe(255);
    expect(clampChannel(1000)).toBe(255);
  });

  it('should clamp below 0 to 0', () => {
    expect(clampChannel(-1)).toBe(0);
  });

  it('should keep the exact boundaries 0 and 255', () => {
    expect(clampChannel(0)).toBe(0);
    expect(clampChannel(255)).toBe(255);
  });

  it('should collapse non-finite input to 0', () => {
    expect(clampChannel(Number.NaN)).toBe(0);
    expect(clampChannel(Number.POSITIVE_INFINITY)).toBe(0);
    expect(clampChannel(Number.NEGATIVE_INFINITY)).toBe(0);
  });
});

describe('clampAlpha', () => {
  it('should keep an in-range float unchanged', () => {
    expect(clampAlpha(0.5)).toBe(0.5);
  });

  it('should not round', () => {
    expect(clampAlpha(0.123456)).toBe(0.123456);
  });

  it('should clamp above 1 to 1', () => {
    expect(clampAlpha(1.5)).toBe(1);
  });

  it('should clamp below 0 to 0', () => {
    expect(clampAlpha(-0.2)).toBe(0);
  });

  it('should keep the exact boundaries 0 and 1', () => {
    expect(clampAlpha(0)).toBe(0);
    expect(clampAlpha(1)).toBe(1);
  });

  it('should collapse non-finite input to 1 (opaque)', () => {
    expect(clampAlpha(Number.NaN)).toBe(1);
    expect(clampAlpha(Number.POSITIVE_INFINITY)).toBe(1);
  });
});

describe('makeRgba', () => {
  it('should clamp and round every channel', () => {
    expect(makeRgba(256, -1, 127.6, 1.5)).toEqual({ r: 255, g: 0, b: 128, a: 1 });
  });

  it('should produce a plain object with exactly r/g/b/a', () => {
    expect(Object.keys(makeRgba(1, 2, 3, 0.5)).sort()).toEqual(['a', 'b', 'g', 'r']);
  });
});
