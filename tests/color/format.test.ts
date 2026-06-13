import { describe, it, expect } from 'vitest';
import { toHex, toRgbString, toHslString } from '../../src/color/index.js';
import { makeRgba } from '../../src/color/Rgba.js';

describe('toHex', () => {
  it('should format an opaque color as 6-digit lowercase hex', () => {
    expect(toHex(makeRgba(52, 152, 219, 1))).toBe('#3498db');
  });

  it('should zero-pad single-digit channels', () => {
    expect(toHex(makeRgba(0, 1, 2, 1))).toBe('#000102');
  });

  it('should append the alpha byte when a < 1', () => {
    expect(toHex(makeRgba(255, 0, 0, 0.5))).toBe('#ff000080');
  });

  it('should emit 6 digits at exactly a = 1 and 8 digits just below', () => {
    expect(toHex(makeRgba(255, 255, 255, 1))).toBe('#ffffff');
    expect(toHex(makeRgba(255, 255, 255, 0.999))).toHaveLength(9);
  });
});

describe('toRgbString', () => {
  it('should format an opaque color as rgb()', () => {
    expect(toRgbString(makeRgba(255, 0, 128, 1))).toBe('rgb(255, 0, 128)');
  });

  it('should format a translucent color as rgba()', () => {
    expect(toRgbString(makeRgba(255, 0, 128, 0.25))).toBe('rgba(255, 0, 128, 0.25)');
  });
});

describe('toHslString', () => {
  it('should format an opaque color as hsl() with rounded parts', () => {
    expect(toHslString(makeRgba(255, 0, 0, 1))).toBe('hsl(0, 100%, 50%)');
  });

  it('should format a translucent color as hsla()', () => {
    expect(toHslString(makeRgba(0, 0, 255, 0.5))).toBe('hsla(240, 100%, 50%, 0.5)');
  });

  it('should round hue/saturation/lightness for display', () => {
    // 52,152,219 -> ~204deg, 70%, 53%
    expect(toHslString(makeRgba(52, 152, 219, 1))).toBe('hsl(204, 70%, 53%)');
  });
});

describe('format round-trips with the parser', () => {
  it('should keep hex stable across toHex(parse)', () => {
    expect(toHex(makeRgba(18, 52, 86, 1))).toBe('#123456');
  });
});
