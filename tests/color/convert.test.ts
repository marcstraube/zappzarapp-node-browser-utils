import { describe, it, expect } from 'vitest';
import {
  rgbaToHsl,
  hslToRgba,
  normalizeHue,
  srgbChannelToLinear,
} from '../../src/color/convert.js';
import { makeRgba } from '../../src/color/Rgba.js';

describe('rgbaToHsl', () => {
  it('should convert pure red', () => {
    const hsl = rgbaToHsl(makeRgba(255, 0, 0, 1));
    expect(hsl.h).toBe(0);
    expect(hsl.s).toBe(100);
    expect(hsl.l).toBe(50);
    expect(hsl.a).toBe(1);
  });

  it('should convert pure green (hue 120)', () => {
    const hsl = rgbaToHsl(makeRgba(0, 255, 0, 1));
    expect(hsl.h).toBe(120);
    expect(hsl.s).toBe(100);
    expect(hsl.l).toBe(50);
  });

  it('should convert pure blue (hue 240)', () => {
    expect(rgbaToHsl(makeRgba(0, 0, 255, 1)).h).toBe(240);
  });

  it('should report saturation 0 for greys (achromatic)', () => {
    const hsl = rgbaToHsl(makeRgba(128, 128, 128, 1));
    expect(hsl.s).toBe(0);
    expect(hsl.h).toBe(0);
  });

  it('should convert black (l=0) and white (l=100)', () => {
    expect(rgbaToHsl(makeRgba(0, 0, 0, 1)).l).toBe(0);
    expect(rgbaToHsl(makeRgba(255, 255, 255, 1)).l).toBe(100);
  });

  it('should carry alpha through', () => {
    expect(rgbaToHsl(makeRgba(255, 0, 0, 0.4)).a).toBe(0.4);
  });

  it('should compute hue when blue is the max channel and g < b (wrap branch)', () => {
    // magenta-ish: max is r==b? use a color where max=b and g<b to hit (g<b?6:0)
    const hsl = rgbaToHsl(makeRgba(255, 0, 128, 1));
    expect(hsl.h).toBeGreaterThan(300);
    expect(hsl.h).toBeLessThan(360);
  });
});

describe('hslToRgba', () => {
  it('should convert pure red back', () => {
    expect(hslToRgba({ h: 0, s: 100, l: 50, a: 1 })).toEqual(makeRgba(255, 0, 0, 1));
  });

  it('should convert green and blue back', () => {
    expect(hslToRgba({ h: 120, s: 100, l: 50, a: 1 })).toEqual(makeRgba(0, 255, 0, 1));
    expect(hslToRgba({ h: 240, s: 100, l: 50, a: 1 })).toEqual(makeRgba(0, 0, 255, 1));
  });

  it('should produce grey for saturation 0', () => {
    expect(hslToRgba({ h: 0, s: 0, l: 50, a: 1 })).toEqual(makeRgba(128, 128, 128, 1));
  });

  it('should clamp out-of-range s/l and normalise hue', () => {
    // hue 480 -> 120 (green), s 150 -> 100, l -10 -> 0 (black)
    expect(hslToRgba({ h: 480, s: 150, l: -10, a: 1 })).toEqual(makeRgba(0, 0, 0, 1));
  });

  it('should hit the l >= 0.5 branch (light colors)', () => {
    expect(hslToRgba({ h: 0, s: 100, l: 75, a: 1 })).toEqual(makeRgba(255, 128, 128, 1));
  });

  it('should convert high hues (magenta at 300, exercising the hue wrap)', () => {
    expect(hslToRgba({ h: 300, s: 100, l: 50, a: 1 })).toEqual(makeRgba(255, 0, 255, 1));
  });

  it('should carry alpha through', () => {
    expect(hslToRgba({ h: 0, s: 100, l: 50, a: 0.3 }).a).toBe(0.3);
  });
});

describe('round-trip rgba -> hsl -> rgba', () => {
  const samples = [
    makeRgba(255, 0, 0, 1),
    makeRgba(0, 255, 0, 1),
    makeRgba(0, 0, 255, 1),
    makeRgba(52, 152, 219, 1),
    makeRgba(231, 76, 60, 0.5),
    makeRgba(46, 204, 113, 1),
    makeRgba(128, 128, 128, 1),
    makeRgba(0, 0, 0, 1),
    makeRgba(255, 255, 255, 1),
  ];

  it('should round-trip each sample within ±1 per channel', () => {
    for (const c of samples) {
      const back = hslToRgba(rgbaToHsl(c));
      expect(Math.abs(back.r - c.r)).toBeLessThanOrEqual(1);
      expect(Math.abs(back.g - c.g)).toBeLessThanOrEqual(1);
      expect(Math.abs(back.b - c.b)).toBeLessThanOrEqual(1);
      expect(back.a).toBe(c.a);
    }
  });

  it('should round-trip primaries exactly', () => {
    for (const c of [makeRgba(255, 0, 0, 1), makeRgba(0, 255, 0, 1), makeRgba(0, 0, 255, 1)]) {
      expect(hslToRgba(rgbaToHsl(c))).toEqual(c);
    }
  });
});

describe('normalizeHue', () => {
  it('should keep an in-range hue', () => {
    expect(normalizeHue(200)).toBe(200);
  });

  it('should wrap hues above 360', () => {
    expect(normalizeHue(400)).toBe(40);
    expect(normalizeHue(720)).toBe(0);
  });

  it('should wrap negative hues', () => {
    expect(normalizeHue(-30)).toBe(330);
  });

  it('should treat the 360 boundary as 0', () => {
    expect(normalizeHue(360)).toBe(0);
  });

  it('should collapse non-finite input to 0', () => {
    expect(normalizeHue(Number.NaN)).toBe(0);
  });
});

describe('srgbChannelToLinear', () => {
  it('should map 0 to 0 and 1 to 1', () => {
    expect(srgbChannelToLinear(0)).toBe(0);
    expect(srgbChannelToLinear(1)).toBeCloseTo(1, 10);
  });

  it('should use the linear branch at and below 0.03928', () => {
    expect(srgbChannelToLinear(0.03928)).toBeCloseTo(0.03928 / 12.92, 12);
  });

  it('should use the power branch above 0.03928', () => {
    const c = 0.5;
    expect(srgbChannelToLinear(c)).toBeCloseTo(((c + 0.055) / 1.055) ** 2.4, 12);
  });
});
