/**
 * Color utilities — pure, tree-shakeable functions for parsing, converting,
 * validating, manipulating, and measuring the contrast of colors.
 *
 * All operations revolve around the canonical {@link Rgba} hub: parsing produces
 * an `Rgba`, formatting consumes one.
 *
 * `ColorError` is intentionally not re-exported here — import it from
 * `@zappzarapp/browser-utils/core`, alongside the other error types.
 */
export type { Rgba } from './Rgba.js';
export type { Hsl } from './convert.js';

export { parseColor, parseColorResult, isValidColor } from './parse.js';
export { rgbaToHsl, hslToRgba } from './convert.js';
export { toHex, toRgbString, toHslString } from './format.js';
export { lighten, darken, mix, withAlpha } from './manipulate.js';
export { relativeLuminance, contrastRatio, isReadableOn } from './contrast.js';
export type { ContrastLevel, ContrastSize, ReadabilityOptions } from './contrast.js';
