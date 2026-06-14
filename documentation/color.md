# Color

Pure, tree-shakeable utilities for parsing, converting, validating,
manipulating, and measuring the contrast of colors. Every operation revolves
around the canonical immutable `Rgba` hub: parsing produces an `Rgba`, and
formatting consumes one.

**No picker UI** — color selection is covered by the native
`<input type="color">`; this module is pure color logic.

## Quick Start

```typescript
import {
  parseColor,
  toHex,
  toHslString,
  lighten,
  mix,
  contrastRatio,
  isReadableOn,
} from '@zappzarapp/browser-utils/color';

const brand = parseColor('#3498db'); // { r: 52, g: 152, b: 219, a: 1 }

toHslString(brand); // 'hsl(204, 70%, 53%)'
toHex(lighten(brand, 0.1)); // a lighter shade
toHex(mix(brand, parseColor('#ffffff'))); // blend halfway toward white

contrastRatio(brand, parseColor('#ffffff')); // ~2.6
isReadableOn(brand, parseColor('#ffffff')); // false (fails WCAG AA)
```

## The `Rgba` hub

```typescript
interface Rgba {
  readonly r: number; // 0–255 integer
  readonly g: number; // 0–255 integer
  readonly b: number; // 0–255 integer
  readonly a: number; // 0–1 float
}
```

All parsers return an `Rgba`; all formatters and manipulators take one. This
keeps conversions simple (string ⇄ `Rgba` ⇄ string) and gives a single point
where channel ranges are enforced.

## Supported formats

| Format           | Examples                                                                  |
| ---------------- | ------------------------------------------------------------------------- |
| Hex              | `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa` (case-insensitive)                |
| `rgb()`/`rgba()` | `rgb(255, 0, 0)`, `rgba(255, 0, 0, 0.5)`, `rgb(50%, 0%, 100%)`            |
| Modern `rgb()`   | `rgb(255 0 0)`, `rgb(255 0 0 / 50%)`                                      |
| `hsl()`/`hsla()` | `hsl(120, 50%, 50%)`, `hsla(120, 50%, 50%, 0.5)`, `hsl(120deg, 50%, 50%)` |
| Modern `hsl()`   | `hsl(120 50% 50%)`, `hsl(120 50% 50% / 0.5)`                              |

**Not supported in v1:** named CSS colors (e.g. `red`), `oklch()`, `oklab()`,
`lab()`, `lch()`, `hwb()`, and the `color()` function. These are _recognised_
rather than rejected — parsing one returns a `COLOR_UNSUPPORTED_SPACE` error
(not `COLOR_INVALID_FORMAT`), so a real-but-unsupported color is distinguishable
from malformed input.

### Normalization policy

Input is parsed leniently but securely:

- Surrounding/internal whitespace is tolerated; hex case is normalized.
- Out-of-range values are **clamped**: `rgb(256, -1, 300)` → `255, 0, 255`; hue
  `400°` → `40°`; `s 150%` → `100%`; alpha `1.5` → `1`.
- Mixing `<number>` and `<percentage>` across the three `rgb()` channels is
  rejected; so is mixing commas and the `/` separator in one value.
- Input is length-bounded, and raw input is **never** reflected in error
  messages.

## API

### Parsing & validation

| Function                  | Returns                    | Description                             |
| ------------------------- | -------------------------- | --------------------------------------- |
| `parseColor(input)`       | `Rgba`                     | Parse, throwing `ColorError` on failure |
| `parseColorResult(input)` | `Result<Rgba, ColorError>` | Parse without throwing                  |
| `isValidColor(input)`     | `boolean`                  | Predicate — is the string parseable?    |

### Formatting

| Function             | Returns  | Description                                        |
| -------------------- | -------- | -------------------------------------------------- |
| `toHex(color)`       | `string` | `#rrggbb`, or `#rrggbbaa` when `a < 1` (lowercase) |
| `toRgbString(color)` | `string` | `rgb(...)`, or `rgba(...)` when `a < 1`            |
| `toHslString(color)` | `string` | `hsl(...)`, or `hsla(...)` when `a < 1`            |

### Conversion

| Function           | Returns | Description                            |
| ------------------ | ------- | -------------------------------------- |
| `rgbaToHsl(color)` | `Hsl`   | Convert to HSL (unrounded `h`/`s`/`l`) |
| `hslToRgba(hsl)`   | `Rgba`  | Convert HSL back to the canonical hub  |

### Manipulation

| Function                     | Returns | Description                                      |
| ---------------------------- | ------- | ------------------------------------------------ |
| `lighten(color, amount)`     | `Rgba`  | Raise HSL lightness by `amount` (0–1)            |
| `darken(color, amount)`      | `Rgba`  | Lower HSL lightness by `amount` (0–1)            |
| `mix(color, other, weight?)` | `Rgba`  | Linear interpolation; `weight` 0–1 (default 0.5) |
| `withAlpha(color, alpha)`    | `Rgba`  | Replace the alpha channel (0–1)                  |

These are **total**: they operate on an already-valid `Rgba`, clamp their
numeric arguments, and never throw.

### Contrast & luminance

| Function                         | Returns   | Description                                    |
| -------------------------------- | --------- | ---------------------------------------------- |
| `relativeLuminance(color)`       | `number`  | WCAG relative luminance, 0 (black) – 1 (white) |
| `contrastRatio(a, b)`            | `number`  | WCAG contrast ratio, 1 – 21                    |
| `isReadableOn(fg, bg, options?)` | `boolean` | Does the pair meet a WCAG threshold?           |

`isReadableOn` options: `{ level?: 'AA' | 'AAA'; size?: 'normal' | 'large' }`
(defaults `'AA'` / `'normal'`). Thresholds: AA normal 4.5, AA large 3.0, AAA
normal 7.0, AAA large 4.5. Alpha is ignored — composite over a background first
if you need to account for transparency.

## Error handling

The module follows the package's
[dual error-handling convention](error-handling.md): a throwing variant
(`parseColor`) and a `Result`-based variant (`parseColorResult`). `ColorError`
is exported from the `core` subpath, like the other error types.

```typescript
import { parseColorResult } from '@zappzarapp/browser-utils/color';
import { Result, ColorError } from '@zappzarapp/browser-utils/core';

const result = parseColorResult(userInput);
if (Result.isErr(result)) {
  if (result.error.code === 'COLOR_UNSUPPORTED_SPACE') {
    // e.g. the user pasted an oklch() value
  } else {
    // COLOR_INVALID_FORMAT — malformed input
  }
} else {
  applyColor(result.value);
}

// Throwing variant
try {
  const color = parseColor(userInput);
} catch (error) {
  if (error instanceof ColorError) {
    console.error(error.toFormattedString());
  }
}
```

| Code                      | Meaning                                                  |
| ------------------------- | -------------------------------------------------------- |
| `COLOR_INVALID_FORMAT`    | Input is not a recognisable color in any supported form  |
| `COLOR_UNSUPPORTED_SPACE` | A real but currently unsupported space (oklch, named, …) |

## Accessibility

`contrastRatio` and `isReadableOn` pair naturally with the
[a11y module](a11y.md): validate that text colors meet WCAG AA/AAA against their
background before rendering, and announce theme changes via `LiveAnnouncer`.

```typescript
import { isReadableOn, parseColor } from '@zappzarapp/browser-utils/color';

const text = parseColor('#595959');
const background = parseColor('#ffffff');

if (!isReadableOn(text, background, { level: 'AA', size: 'normal' })) {
  // Pick a darker text color
}
```
