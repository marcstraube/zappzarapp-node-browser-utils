/**
 * Color-space conversions between the canonical {@link Rgba} hub and HSL, plus
 * the sRGB linearisation used for luminance.
 *
 * These functions are pure and total — they operate on already-valid numeric
 * input and never throw.
 */
import { makeRgba, type Rgba } from './Rgba.js';

/**
 * HSL representation. `h` in degrees `0–360`, `s`/`l` as percentages `0–100`,
 * `a` (alpha) as a float `0–1`.
 *
 * @remarks
 * {@link rgbaToHsl} returns unrounded floats so downstream maths (e.g.
 * lightening) stays precise; round only when formatting for display.
 */
export interface Hsl {
  /** Hue in degrees, 0–360. */
  readonly h: number;
  /** Saturation percentage, 0–100. */
  readonly s: number;
  /** Lightness percentage, 0–100. */
  readonly l: number;
  /** Alpha, 0–1. */
  readonly a: number;
}

/**
 * Normalise a hue (in degrees) into the `[0, 360)` range.
 *
 * @internal
 */
export function normalizeHue(hue: number): number {
  if (!Number.isFinite(hue)) {
    return 0;
  }
  return ((hue % 360) + 360) % 360;
}

/**
 * Convert a canonical {@link Rgba} color to {@link Hsl}.
 *
 * @param color Source color.
 * @returns Equivalent HSL with unrounded `h`/`s`/`l` and the alpha carried through.
 */
export function rgbaToHsl(color: Rgba): Hsl {
  const r = color.r / 255;
  const g = color.g / 255;
  const b = color.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    // Achromatic (grey): hue and saturation are undefined → 0.
    return { h: 0, s: 0, l: l * 100, a: color.a };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h: number;
  if (max === r) {
    h = (g - b) / d + (g < b ? 6 : 0);
  } else if (max === g) {
    h = (b - r) / d + 2;
  } else {
    h = (r - g) / d + 4;
  }
  h *= 60;

  return { h, s: s * 100, l: l * 100, a: color.a };
}

/**
 * @internal
 */
function hue2rgb(p: number, q: number, t: number): number {
  let tn = t;
  if (tn < 0) {
    tn += 1;
  }
  if (tn > 1) {
    tn -= 1;
  }
  if (tn < 1 / 6) {
    return p + (q - p) * 6 * tn;
  }
  if (tn < 1 / 2) {
    return q;
  }
  if (tn < 2 / 3) {
    return p + (q - p) * (2 / 3 - tn) * 6;
  }
  return p;
}

/**
 * Convert an {@link Hsl} color to the canonical {@link Rgba} hub.
 *
 * Out-of-range inputs are normalised: hue wraps into `[0, 360)`, saturation and
 * lightness clamp to `0–100`.
 *
 * @param hsl Source HSL color.
 * @returns Equivalent RGBA with integer channels and the alpha carried through.
 */
export function hslToRgba(hsl: Hsl): Rgba {
  const h = normalizeHue(hsl.h) / 360;
  const s = Math.min(100, Math.max(0, hsl.s)) / 100;
  const l = Math.min(100, Math.max(0, hsl.l)) / 100;

  if (s === 0) {
    const grey = l * 255;
    return makeRgba(grey, grey, grey, hsl.a);
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  const r = hue2rgb(p, q, h + 1 / 3);
  const g = hue2rgb(p, q, h);
  const b = hue2rgb(p, q, h - 1 / 3);

  return makeRgba(r * 255, g * 255, b * 255, hsl.a);
}

/**
 * Linearise a single gamma-encoded sRGB channel (0–1) per the WCAG definition.
 *
 * @internal
 */
export function srgbChannelToLinear(channel: number): number {
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}
