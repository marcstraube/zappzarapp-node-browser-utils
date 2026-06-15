import { describe, it, expect } from 'vitest';
import { parseColor, parseColorResult, isValidColor } from '../../src/color/index.js';
import { ColorError, Result } from '../../src/core/index.js';

const errorOf = (input: string): ColorError => {
  const result = parseColorResult(input);
  if (Result.isOk(result)) {
    throw new Error(`expected an error for ${JSON.stringify(input)}`);
  }
  return result.error;
};

describe('parseColor (hex)', () => {
  it('should parse 6-digit hex', () => {
    expect(parseColor('#3498db')).toEqual({ r: 52, g: 152, b: 219, a: 1 });
  });

  it('should parse uppercase hex case-insensitively', () => {
    expect(parseColor('#3498DB')).toEqual({ r: 52, g: 152, b: 219, a: 1 });
  });

  it('should parse 8-digit hex with alpha', () => {
    expect(parseColor('#ff000080')).toEqual({ r: 255, g: 0, b: 0, a: 128 / 255 });
  });

  it('should expand 3-digit shorthand via nibble*17', () => {
    expect(parseColor('#abc')).toEqual({ r: 170, g: 187, b: 204, a: 1 });
  });

  it('should expand 4-digit shorthand including alpha', () => {
    expect(parseColor('#abcd')).toEqual({ r: 170, g: 187, b: 204, a: (13 * 17) / 255 });
  });

  it('should map #fff to white and #000 to black', () => {
    expect(parseColor('#fff')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseColor('#000')).toEqual({ r: 0, g: 0, b: 0, a: 1 });
  });
});

describe('parseColor (rgb, comma syntax)', () => {
  it('should parse rgb integers', () => {
    expect(parseColor('rgb(255, 0, 128)')).toEqual({ r: 255, g: 0, b: 128, a: 1 });
  });

  it('should tolerate irregular whitespace', () => {
    expect(parseColor('rgb(  255 ,0,   128 )')).toEqual({ r: 255, g: 0, b: 128, a: 1 });
  });

  it('should parse rgba with alpha', () => {
    expect(parseColor('rgba(255, 0, 0, 0.5)')).toEqual({ r: 255, g: 0, b: 0, a: 0.5 });
  });

  it('should parse percentage channels', () => {
    expect(parseColor('rgb(50%, 0%, 100%)')).toEqual({ r: 128, g: 0, b: 255, a: 1 });
  });

  it('should parse percentage alpha', () => {
    expect(parseColor('rgba(0, 0, 0, 50%)')).toEqual({ r: 0, g: 0, b: 0, a: 0.5 });
  });

  it('should clamp out-of-range channels and alpha', () => {
    expect(parseColor('rgb(256, -1, 300)')).toEqual({ r: 255, g: 0, b: 255, a: 1 });
    expect(parseColor('rgba(0, 0, 0, 1.5)')).toEqual({ r: 0, g: 0, b: 0, a: 1 });
  });
});

describe('parseColor (rgb, modern syntax)', () => {
  it('should parse space-separated channels', () => {
    expect(parseColor('rgb(255 0 128)')).toEqual({ r: 255, g: 0, b: 128, a: 1 });
  });

  it('should parse channels with slash alpha', () => {
    expect(parseColor('rgb(255 0 0 / 50%)')).toEqual({ r: 255, g: 0, b: 0, a: 0.5 });
    expect(parseColor('rgb(255 0 0 / 0.5)')).toEqual({ r: 255, g: 0, b: 0, a: 0.5 });
  });

  it('should accept the rgba name with modern syntax too', () => {
    expect(parseColor('rgba(0 128 255)')).toEqual({ r: 0, g: 128, b: 255, a: 1 });
  });
});

describe('parseColor (hsl)', () => {
  it('should parse hsl red', () => {
    expect(parseColor('hsl(0, 100%, 50%)')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
  });

  it('should parse hsl blue with modern syntax', () => {
    expect(parseColor('hsl(240 100% 50%)')).toEqual({ r: 0, g: 0, b: 255, a: 1 });
  });

  it('should parse hsla with alpha', () => {
    expect(parseColor('hsla(0, 100%, 50%, 0.5)')).toEqual({ r: 255, g: 0, b: 0, a: 0.5 });
  });

  it('should accept a deg unit on the hue', () => {
    expect(parseColor('hsl(120deg, 100%, 50%)')).toEqual({ r: 0, g: 255, b: 0, a: 1 });
  });

  it('should normalise out-of-range hue and clamp s/l', () => {
    // hue 360 -> 0 (red), s 150% -> 100, l 50%
    expect(parseColor('hsl(360, 150%, 50%)')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
  });

  it('should parse slash alpha in modern hsl', () => {
    expect(parseColor('hsl(0 100% 50% / 50%)')).toEqual({ r: 255, g: 0, b: 0, a: 0.5 });
  });
});

describe('parseColorResult', () => {
  it('should return Ok for a valid color', () => {
    const result = parseColorResult('#fff');
    expect(Result.isOk(result)).toBe(true);
  });

  it('should return Err for an invalid color', () => {
    const result = parseColorResult('nope!');
    expect(Result.isErr(result)).toBe(true);
  });
});

describe('parseColor invalid input (COLOR_INVALID_FORMAT)', () => {
  const invalid = [
    ['empty string', ''],
    ['whitespace only', '   '],
    ['hex without #', '0099ff'],
    ['hex wrong length (2)', '#ab'],
    ['hex wrong length (5)', '#abcde'],
    ['hex wrong length (7)', '#1234567'],
    ['non-hex chars', '#gghhii'],
    ['rgb with too few channels', 'rgb(1, 2)'],
    ['rgb with too many channels', 'rgb(1, 2, 3, 4, 5)'],
    ['rgb empty channel', 'rgb(1,,3)'],
    ['rgb mixed percent and number', 'rgb(50%, 128, 0%)'],
    ['rgb with none keyword', 'rgb(none, 0, 0)'],
    ['rgb empty args', 'rgb()'],
    ['mixed comma and slash', 'rgb(255, 0, 0 / 0.5)'],
    ['modern rgb with 4 space channels', 'rgb(255 0 0 50)'],
    ['double slash', 'rgb(255 0 0 / 0.5 / 0.5)'],
    ['empty slash alpha', 'rgb(255 0 0 /)'],
    ['hsl with bare (non-%) saturation', 'hsl(0, 50, 50%)'],
    ['hsl with bare lightness', 'hsl(0, 50%, 50)'],
    ['hsl with invalid hue token', 'hsl(abc, 50%, 50%)'],
    ['hsl empty args', 'hsl()'],
    ['rgb with invalid slash alpha', 'rgb(255 0 0 / abc)'],
    ['hsl with invalid slash alpha', 'hsl(0 100% 50% / abc)'],
    ['unknown function', 'foo(1, 2, 3)'],
    ['bare number', '12345'],
    ['nan-ish token', 'rgb(NaN, 0, 0)'],
  ] as const;

  it.each(invalid)('should reject %s', (_label, input) => {
    expect(() => parseColor(input)).toThrow(ColorError);
    expect(errorOf(input).code).toBe('COLOR_INVALID_FORMAT');
    expect(isValidColor(input)).toBe(false);
  });

  it('should reject non-string input defensively', () => {
    // @ts-expect-error testing runtime guard against non-string input
    expect(() => parseColor(42)).toThrow(ColorError);
    // @ts-expect-error testing runtime guard against non-string input
    expect(Result.isErr(parseColorResult(null))).toBe(true);
  });

  it('should reject over-length input', () => {
    const tooLong = `rgb(${'1'.repeat(70)}, 0, 0)`;
    expect(errorOf(tooLong).code).toBe('COLOR_INVALID_FORMAT');
  });

  it('should not leak the raw input in the error message', () => {
    expect(errorOf('javascript:alert(1)').message).toBe('Invalid color format');
  });
});

describe('parseColor unsupported spaces (COLOR_UNSUPPORTED_SPACE)', () => {
  it.each([['oklch'], ['oklab'], ['lab'], ['lch'], ['hwb'], ['color']])(
    'should reject the %s() function as unsupported',
    (space) => {
      expect(errorOf(`${space}(1 2 3)`).code).toBe('COLOR_UNSUPPORTED_SPACE');
    }
  );

  it('should treat a bare word as an unsupported named color', () => {
    const error = errorOf('rebeccapurple');
    expect(error.code).toBe('COLOR_UNSUPPORTED_SPACE');
    expect(error.message).toBe('Unsupported color space: named colors');
  });
});

describe('isValidColor', () => {
  it('should mirror parseColorResult success', () => {
    const cases = ['#fff', '#3498db', 'rgb(1,2,3)', 'hsl(0,0%,0%)', 'bad', '', 'oklch(1 2 3)'];
    for (const input of cases) {
      expect(isValidColor(input)).toBe(Result.isOk(parseColorResult(input)));
    }
  });
});
