/**
 * Canonical color representation — the hub every conversion passes through.
 *
 * All parsing produces an `Rgba`; all formatting consumes one. This keeps the
 * conversion surface small (string ⇄ `Rgba` ⇄ string) and gives a single point
 * where channel invariants are enforced.
 *
 * @remarks
 * Channels mirror CSS directly: `r`/`g`/`b` are integers in `0–255`, `a` is a
 * float in `0–1`. Instances are immutable (`readonly`).
 */
export interface Rgba {
  /** Red channel, integer 0–255. */
  readonly r: number;
  /** Green channel, integer 0–255. */
  readonly g: number;
  /** Blue channel, integer 0–255. */
  readonly b: number;
  /** Alpha channel, float 0–1. */
  readonly a: number;
}

/**
 * Clamp a value into the 0–255 channel range and round to an integer.
 *
 * Non-finite input (`NaN`, `Infinity`) collapses to `0` so an `Rgba` channel is
 * always a valid integer.
 *
 * @internal
 */
export function clampChannel(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(255, Math.max(0, Math.round(value)));
}

/**
 * Clamp an alpha value into the 0–1 range without rounding.
 *
 * Non-finite input collapses to `1` (fully opaque), the safe default.
 *
 * @internal
 */
export function clampAlpha(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }
  return Math.min(1, Math.max(0, value));
}

/**
 * Construct an immutable {@link Rgba}, clamping every channel to its valid range.
 *
 * This is the single boundary at which raw numbers become a canonical color, so
 * every producer (parsers, converters, manipulators) funnels through it.
 *
 * @internal
 */
export function makeRgba(r: number, g: number, b: number, a: number): Rgba {
  return {
    r: clampChannel(r),
    g: clampChannel(g),
    b: clampChannel(b),
    a: clampAlpha(a),
  };
}
