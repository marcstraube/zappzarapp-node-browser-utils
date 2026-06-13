import { describe, it, expect } from 'vitest';
import { lighten, darken, mix, withAlpha } from '../../src/color/index.js';
import { makeRgba } from '../../src/color/Rgba.js';
import { rgbaToHsl } from '../../src/color/convert.js';

const mid = makeRgba(100, 100, 100, 1);

describe('lighten', () => {
  it('should increase lightness', () => {
    expect(rgbaToHsl(lighten(mid, 0.2)).l).toBeGreaterThan(rgbaToHsl(mid).l);
  });

  it('should be a near-identity at amount 0', () => {
    const result = lighten(mid, 0);
    expect(Math.abs(result.r - mid.r)).toBeLessThanOrEqual(1);
  });

  it('should clamp at white and never overshoot', () => {
    expect(lighten(makeRgba(255, 255, 255, 1), 0.5)).toEqual(makeRgba(255, 255, 255, 1));
    expect(lighten(mid, 5)).toEqual(makeRgba(255, 255, 255, 1));
  });

  it('should preserve alpha', () => {
    expect(lighten(makeRgba(100, 100, 100, 0.4), 0.2).a).toBe(0.4);
  });

  it('should treat a non-finite amount as 0 (no change)', () => {
    const result = lighten(mid, Number.NaN);
    expect(Math.abs(result.r - mid.r)).toBeLessThanOrEqual(1);
  });
});

describe('darken', () => {
  it('should decrease lightness', () => {
    expect(rgbaToHsl(darken(mid, 0.2)).l).toBeLessThan(rgbaToHsl(mid).l);
  });

  it('should clamp at black and never undershoot', () => {
    expect(darken(makeRgba(0, 0, 0, 1), 0.5)).toEqual(makeRgba(0, 0, 0, 1));
    expect(darken(mid, 5)).toEqual(makeRgba(0, 0, 0, 1));
  });

  it('should preserve alpha', () => {
    expect(darken(makeRgba(100, 100, 100, 0.4), 0.2).a).toBe(0.4);
  });
});

describe('mix', () => {
  const black = makeRgba(0, 0, 0, 1);
  const white = makeRgba(255, 255, 255, 1);

  it('should return the first color exactly at weight 0', () => {
    expect(mix(black, white, 0)).toEqual(black);
  });

  it('should return the second color exactly at weight 1', () => {
    expect(mix(black, white, 1)).toEqual(white);
  });

  it('should default to an even mix at weight 0.5', () => {
    expect(mix(black, white)).toEqual(makeRgba(128, 128, 128, 1));
  });

  it('should interpolate at an arbitrary weight', () => {
    expect(mix(makeRgba(0, 0, 0, 1), makeRgba(100, 200, 50, 1), 0.5)).toEqual(
      makeRgba(50, 100, 25, 1)
    );
  });

  it('should mix alpha too', () => {
    expect(mix(makeRgba(0, 0, 0, 0), makeRgba(0, 0, 0, 1), 0.5).a).toBe(0.5);
  });

  it('should clamp the weight to 0–1', () => {
    expect(mix(black, white, -1)).toEqual(black);
    expect(mix(black, white, 2)).toEqual(white);
  });

  it('should treat a non-finite weight as 0', () => {
    expect(mix(black, white, Number.NaN)).toEqual(black);
  });
});

describe('withAlpha', () => {
  it('should set the alpha and preserve rgb', () => {
    expect(withAlpha(makeRgba(10, 20, 30, 1), 0.25)).toEqual(makeRgba(10, 20, 30, 0.25));
  });

  it('should clamp alpha into 0–1', () => {
    expect(withAlpha(makeRgba(10, 20, 30, 1), 5).a).toBe(1);
    expect(withAlpha(makeRgba(10, 20, 30, 1), -5).a).toBe(0);
  });

  it('should collapse a non-finite alpha to opaque', () => {
    expect(withAlpha(makeRgba(10, 20, 30, 0.5), Number.NaN).a).toBe(1);
  });
});
