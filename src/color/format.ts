/**
 * Format the canonical {@link Rgba} hub back into CSS color strings.
 *
 * These functions are pure and total. The alpha-bearing form (`#rrggbbaa`,
 * `rgba()`, `hsla()`) is emitted only when the color is not fully opaque
 * (`a < 1`); otherwise the compact opaque form is used.
 */
import { type Rgba } from './Rgba.js';
import { rgbaToHsl } from './convert.js';

/** Two-digit lowercase hex for a 0–255 channel. */
function channelToHex(channel: number): string {
  return channel.toString(16).padStart(2, '0');
}

/**
 * Format a color as a lowercase hex string.
 *
 * @param color Source color.
 * @returns `#rrggbb` when opaque, or `#rrggbbaa` when `a < 1`.
 */
export function toHex(color: Rgba): string {
  const base = `#${channelToHex(color.r)}${channelToHex(color.g)}${channelToHex(color.b)}`;
  if (color.a < 1) {
    return `${base}${channelToHex(Math.round(color.a * 255))}`;
  }
  return base;
}

/**
 * Format a color as an `rgb()` / `rgba()` string.
 *
 * @param color Source color.
 * @returns `rgb(r, g, b)` when opaque, or `rgba(r, g, b, a)` when `a < 1`.
 */
export function toRgbString(color: Rgba): string {
  if (color.a < 1) {
    return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
  }
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

/**
 * Format a color as an `hsl()` / `hsla()` string with rounded components.
 *
 * @param color Source color.
 * @returns `hsl(h, s%, l%)` when opaque, or `hsla(h, s%, l%, a)` when `a < 1`.
 */
export function toHslString(color: Rgba): string {
  const hsl = rgbaToHsl(color);
  const h = Math.round(hsl.h);
  const s = Math.round(hsl.s);
  const l = Math.round(hsl.l);
  if (color.a < 1) {
    return `hsla(${h}, ${s}%, ${l}%, ${color.a})`;
  }
  return `hsl(${h}, ${s}%, ${l}%)`;
}
