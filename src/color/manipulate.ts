/**
 * Color manipulation — lighten, darken, mix, and alpha adjustment.
 *
 * These functions are pure and total: they operate on already-valid {@link Rgba}
 * colors and clamp their numeric arguments rather than throwing, so they never
 * fail. Non-finite arguments collapse to a safe default.
 */
import { makeRgba, type Rgba } from './Rgba.js';
import { rgbaToHsl, hslToRgba } from './convert.js';

/** Clamp an amount/weight argument to 0–1; non-finite collapses to 0. */
function clampUnit(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

/**
 * Lighten a color by moving its HSL lightness toward 100%.
 *
 * @param color Source color.
 * @param amount Fraction 0–1; `0.1` adds 10 percentage points of lightness.
 * @returns A new, lighter color (alpha preserved).
 */
export function lighten(color: Rgba, amount: number): Rgba {
  const hsl = rgbaToHsl(color);
  return hslToRgba({ ...hsl, l: hsl.l + clampUnit(amount) * 100 });
}

/**
 * Darken a color by moving its HSL lightness toward 0%.
 *
 * @param color Source color.
 * @param amount Fraction 0–1; `0.1` removes 10 percentage points of lightness.
 * @returns A new, darker color (alpha preserved).
 */
export function darken(color: Rgba, amount: number): Rgba {
  const hsl = rgbaToHsl(color);
  return hslToRgba({ ...hsl, l: hsl.l - clampUnit(amount) * 100 });
}

/**
 * Mix two colors by linear interpolation in sRGB channel space.
 *
 * @param color Start color (returned when `weight` is 0).
 * @param other End color (returned when `weight` is 1).
 * @param weight Fraction 0–1 toward `other`. Defaults to `0.5` (even mix).
 * @returns The interpolated color.
 */
export function mix(color: Rgba, other: Rgba, weight = 0.5): Rgba {
  const w = clampUnit(weight);
  const lerp = (from: number, to: number): number => from * (1 - w) + to * w;
  return makeRgba(
    lerp(color.r, other.r),
    lerp(color.g, other.g),
    lerp(color.b, other.b),
    lerp(color.a, other.a)
  );
}

/**
 * Return a copy of a color with a replaced alpha channel.
 *
 * @param color Source color.
 * @param alpha New alpha, clamped to 0–1 (non-finite collapses to opaque).
 * @returns A new color with the given alpha and unchanged RGB.
 */
export function withAlpha(color: Rgba, alpha: number): Rgba {
  return makeRgba(color.r, color.g, color.b, alpha);
}
