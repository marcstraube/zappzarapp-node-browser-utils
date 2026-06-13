/**
 * WCAG contrast and luminance utilities.
 *
 * Pure and total. Alpha is ignored — WCAG contrast is defined for opaque colors,
 * so callers should composite over a background first if needed.
 *
 * Ties in with the `a11y` module: use {@link isReadableOn} to check whether text
 * meets WCAG AA/AAA contrast against its background.
 */
import { type Rgba } from './Rgba.js';
import { srgbChannelToLinear } from './convert.js';

/** WCAG conformance level. */
export type ContrastLevel = 'AA' | 'AAA';

/** Text size category, which changes the required contrast ratio. */
export type ContrastSize = 'normal' | 'large';

/** Options for {@link isReadableOn}. */
export interface ReadabilityOptions {
  /** WCAG level to check against. Defaults to `'AA'`. */
  readonly level?: ContrastLevel;
  /** Text size category. Defaults to `'normal'`. */
  readonly size?: ContrastSize;
}

/** Minimum contrast ratios per WCAG 2.x. */
const THRESHOLDS: Record<ContrastLevel, Record<ContrastSize, number>> = {
  AA: { normal: 4.5, large: 3 },
  AAA: { normal: 7, large: 4.5 },
};

/**
 * Compute the WCAG relative luminance of a color.
 *
 * @param color Source color (alpha ignored).
 * @returns Relative luminance in `0` (black) to `1` (white).
 */
export function relativeLuminance(color: Rgba): number {
  const r = srgbChannelToLinear(color.r / 255);
  const g = srgbChannelToLinear(color.g / 255);
  const b = srgbChannelToLinear(color.b / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Compute the WCAG contrast ratio between two colors.
 *
 * The result is symmetric in its arguments.
 *
 * @param color First color.
 * @param other Second color.
 * @returns Contrast ratio from `1` (identical) to `21` (black vs white).
 */
export function contrastRatio(color: Rgba, other: Rgba): number {
  const l1 = relativeLuminance(color);
  const l2 = relativeLuminance(other);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check whether a foreground color is readable on a background per WCAG.
 *
 * @param foreground Text color.
 * @param background Background color.
 * @param options WCAG `level` (default `'AA'`) and `size` (default `'normal'`).
 * @returns `true` if the contrast ratio meets or exceeds the required threshold.
 */
export function isReadableOn(
  foreground: Rgba,
  background: Rgba,
  options: ReadabilityOptions = {}
): boolean {
  const level = options.level ?? 'AA';
  const size = options.size ?? 'normal';
  return contrastRatio(foreground, background) >= THRESHOLDS[level][size];
}
