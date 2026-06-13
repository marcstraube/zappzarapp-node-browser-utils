/**
 * The color parsing boundary — the only place that accepts untrusted strings.
 *
 * Supports hex (`#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`), `rgb()/rgba()` and
 * `hsl()/hsla()` in both the classic comma syntax and the modern CSS Color 4
 * space-separated syntax with an optional `/ alpha` component. Everything
 * produces the canonical {@link Rgba} hub.
 *
 * Security: input is length-bounded and matched with linear, non-backtracking
 * regexes; out-of-range channels are normalised (clamped), and raw input is
 * never reflected in error messages (see {@link ColorError}).
 *
 * @example
 * ```TypeScript
 * import { parseColor, parseColorResult, isValidColor } from '@zappzarapp/browser-utils/color';
 *
 * parseColor('#3498db');               // { r: 52, g: 152, b: 219, a: 1 }
 * parseColor('rgb(255 0 0 / 50%)');    // { r: 255, g: 0, b: 0, a: 0.5 }
 * isValidColor('hsl(120, 50%, 50%)');  // true
 * ```
 */
import { Result, ColorError } from '../core/index.js';
import { makeRgba, type Rgba } from './Rgba.js';
import { hslToRgba } from './convert.js';

/** Upper bound on input length, guarding against pathological inputs. */
const MAX_INPUT_LENGTH = 64;

const HEX_RE = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const FN_RE = /^([a-z]+)\(\s*(.*?)\s*\)$/i;
const WORD_RE = /^[a-z]+$/i;
const NUMBER_TOKEN_RE = /^[+-]?(?:\d+\.?\d*|\.\d+)(%)?$/;
const HUE_TOKEN_RE = /^([+-]?(?:\d+\.?\d*|\.\d+))(?:deg)?$/i;
const PERCENT_TOKEN_RE = /^([+-]?(?:\d+\.?\d*|\.\d+))%$/;

/** Recognisable color functions that are deferred to a later version. */
const UNSUPPORTED_SPACES = new Set(['oklch', 'oklab', 'lab', 'lch', 'hwb', 'color']);

interface NumberToken {
  readonly value: number;
  readonly isPercent: boolean;
}

interface SplitArgs {
  /** Exactly three channel tokens. */
  readonly channels: readonly [string, string, string];
  /** Alpha token, or `null` when absent. */
  readonly alpha: string | null;
}

/**
 * Parse a color string into the canonical {@link Rgba} hub.
 *
 * @param input Color string in any supported format.
 * @returns The parsed color.
 * @throws {ColorError} `COLOR_INVALID_FORMAT` for malformed input, or
 *   `COLOR_UNSUPPORTED_SPACE` for a recognisable but unsupported color space.
 */
export function parseColor(input: string): Rgba {
  const result = parseColorResult(input);
  if (Result.isErr(result)) {
    throw result.error;
  }
  return result.value;
}

/**
 * Parse a color string without throwing.
 *
 * @param input Color string in any supported format.
 * @returns `Result.ok(Rgba)` on success, otherwise `Result.err(ColorError)`.
 */
export function parseColorResult(input: string): Result<Rgba, ColorError> {
  if (typeof input !== 'string') {
    return Result.err(ColorError.invalidFormat());
  }

  const trimmed = input.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_INPUT_LENGTH) {
    return Result.err(ColorError.invalidFormat());
  }

  if (trimmed.charAt(0) === '#') {
    return parseHex(trimmed);
  }

  const fn = FN_RE.exec(trimmed);
  if (fn !== null) {
    // Groups 1 and 2 are mandatory in FN_RE, so they are present on a match.
    const name = (fn[1] as string).toLowerCase();
    const args = fn[2] as string;
    if (name === 'rgb' || name === 'rgba') {
      return parseRgbFunction(args);
    }
    if (name === 'hsl' || name === 'hsla') {
      return parseHslFunction(args);
    }
    if (UNSUPPORTED_SPACES.has(name)) {
      return Result.err(ColorError.unsupportedSpace(name));
    }
    return Result.err(ColorError.invalidFormat());
  }

  // A bare word can only be a named color, which is not supported in v1.
  if (WORD_RE.test(trimmed)) {
    return Result.err(ColorError.unsupportedSpace('named colors'));
  }

  return Result.err(ColorError.invalidFormat());
}

/**
 * Report whether a string is a parseable color.
 *
 * @param input Candidate color string.
 * @returns `true` if {@link parseColorResult} would succeed.
 */
export function isValidColor(input: string): boolean {
  return Result.isOk(parseColorResult(input));
}

// ===========================================================================
// Hex
// ===========================================================================

/** Expand a single hex nibble to a 0–255 channel (`a` → `0xaa` → 170). */
function expandNibble(nibble: string): number {
  return parseInt(nibble, 16) * 17;
}

function parseHex(input: string): Result<Rgba, ColorError> {
  const match = HEX_RE.exec(input);
  const hex = match?.[1];
  if (hex === undefined) {
    return Result.err(ColorError.invalidFormat());
  }

  if (hex.length === 3 || hex.length === 4) {
    const r = expandNibble(hex.charAt(0));
    const g = expandNibble(hex.charAt(1));
    const b = expandNibble(hex.charAt(2));
    const a = hex.length === 4 ? expandNibble(hex.charAt(3)) / 255 : 1;
    return Result.ok(makeRgba(r, g, b, a));
  }

  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
  return Result.ok(makeRgba(r, g, b, a));
}

// ===========================================================================
// Function syntax (rgb / hsl)
// ===========================================================================

/** Classic comma syntax: `r, g, b` or `r, g, b, a`. */
function splitCommaArgs(args: string): SplitArgs | null {
  const parts = args.split(',').map((part) => part.trim());
  if (parts.some((part) => part === '') || parts.length < 3 || parts.length > 4) {
    return null;
  }
  // Length is 3 or 4 here, so the first three entries are present.
  const channels = parts.slice(0, 3) as [string, string, string];
  const alpha = parts.length === 4 ? parts.slice(3).join('') : null;
  return { channels, alpha };
}

/** Modern syntax: space-separated channels with an optional `/ alpha`. */
function splitModernArgs(args: string, hasSlash: boolean): SplitArgs | null {
  let channelPart = args;
  let alpha: string | null = null;
  if (hasSlash) {
    const slashIndex = args.indexOf('/');
    if (args.indexOf('/', slashIndex + 1) !== -1) {
      return null;
    }
    channelPart = args.slice(0, slashIndex);
    alpha = args.slice(slashIndex + 1).trim();
    if (alpha === '') {
      return null;
    }
  }

  const tokens = channelPart.trim().split(/\s+/);
  if (tokens.length !== 3) {
    return null;
  }
  return { channels: tokens as [string, string, string], alpha };
}

/**
 * Split function arguments into three channel tokens plus an optional alpha,
 * accepting both the classic comma syntax and the modern space/`slash` syntax.
 * Mixing commas and the slash separator is rejected (per the CSS grammar).
 */
function splitColorArgs(args: string): SplitArgs | null {
  if (args.trim() === '') {
    return null;
  }

  const hasComma = args.includes(',');
  const hasSlash = args.includes('/');
  if (hasComma && hasSlash) {
    return null;
  }

  return hasComma ? splitCommaArgs(args) : splitModernArgs(args, hasSlash);
}

function parseNumberToken(token: string): NumberToken | null {
  const match = NUMBER_TOKEN_RE.exec(token);
  if (match === null) {
    return null;
  }
  // The regex guarantees a finite numeric form; range/finiteness invariants are
  // enforced downstream by makeRgba / normalizeHue / hslToRgba.
  return { value: parseFloat(token), isPercent: match[1] === '%' };
}

/** Parse an alpha token (number 0–1 or percentage) to a 0–1 float. */
function parseAlpha(token: string): number | null {
  const parsed = parseNumberToken(token);
  if (parsed === null) {
    return null;
  }
  return parsed.isPercent ? parsed.value / 100 : parsed.value;
}

function parseRgbFunction(args: string): Result<Rgba, ColorError> {
  const split = splitColorArgs(args);
  if (split === null) {
    return Result.err(ColorError.invalidFormat());
  }

  const [rToken, gToken, bToken] = split.channels;
  const r = parseNumberToken(rToken);
  const g = parseNumberToken(gToken);
  const b = parseNumberToken(bToken);
  if (r === null || g === null || b === null) {
    return Result.err(ColorError.invalidFormat());
  }

  // CSS forbids mixing <number> and <percentage> across the three channels.
  const percentCount = [r, g, b].filter((token) => token.isPercent).length;
  if (percentCount !== 0 && percentCount !== 3) {
    return Result.err(ColorError.invalidFormat());
  }

  const toChannel = (token: NumberToken): number =>
    token.isPercent ? (token.value / 100) * 255 : token.value;

  let alpha = 1;
  if (split.alpha !== null) {
    const parsedAlpha = parseAlpha(split.alpha);
    if (parsedAlpha === null) {
      return Result.err(ColorError.invalidFormat());
    }
    alpha = parsedAlpha;
  }

  return Result.ok(makeRgba(toChannel(r), toChannel(g), toChannel(b), alpha));
}

function parseHueToken(token: string): number | null {
  // parseFloat reads the leading number and ignores any "deg" suffix; the range
  // is normalised later by normalizeHue.
  return HUE_TOKEN_RE.test(token) ? parseFloat(token) : null;
}

function parsePercentToken(token: string): number | null {
  // parseFloat reads the leading number and ignores the trailing "%"; the range
  // is clamped later by hslToRgba.
  return PERCENT_TOKEN_RE.test(token) ? parseFloat(token) : null;
}

function parseHslFunction(args: string): Result<Rgba, ColorError> {
  const split = splitColorArgs(args);
  if (split === null) {
    return Result.err(ColorError.invalidFormat());
  }

  const [hueToken, saturationToken, lightnessToken] = split.channels;
  const hue = parseHueToken(hueToken);
  const saturation = parsePercentToken(saturationToken);
  const lightness = parsePercentToken(lightnessToken);
  if (hue === null || saturation === null || lightness === null) {
    return Result.err(ColorError.invalidFormat());
  }

  let alpha = 1;
  if (split.alpha !== null) {
    const parsedAlpha = parseAlpha(split.alpha);
    if (parsedAlpha === null) {
      return Result.err(ColorError.invalidFormat());
    }
    alpha = parsedAlpha;
  }

  return Result.ok(hslToRgba({ h: hue, s: saturation, l: lightness, a: alpha }));
}
