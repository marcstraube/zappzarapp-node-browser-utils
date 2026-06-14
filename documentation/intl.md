# Intl

Tree-shakeable wrappers around the native `Intl` API: locale-aware formatting of
numbers, currency, dates, relative time, and plurals, locale-aware string
comparison, and locale negotiation. Formatters are cached, types are strict, and
errors follow the package's dual (throwing + `Result`) convention.

This module does **not** provide a translation mechanism (`t()` / message
catalogs) — that is the app's domain. It only formats values and negotiates
locales.

## Quick Start

```typescript
import {
  formatNumber,
  formatCurrency,
  formatRelativeTime,
  formatPlural,
  resolveLocale,
} from '@zappzarapp/browser-utils/intl';

formatNumber(1234.5, 'de'); // '1.234,5'
formatCurrency(1234.5, 'EUR', 'de'); // '1.234,50 €'
formatRelativeTime(-1, 'day', 'en', { numeric: 'auto' }); // 'yesterday'
formatPlural(1, 'en'); // 'one'

resolveLocale(['de', 'en'], ['fr-FR', 'en-US']); // 'en'
```

## Caching

Constructing an `Intl.*` formatter is comparatively expensive, so each function
memoizes the formatter for a given `(locale, options)` pair in an internal,
size-bounded cache. This is a pure performance optimization — it never changes
results. Call `clearIntlCache()` to drop cached formatters (e.g. for test
isolation).

## Locale negotiation

`resolveLocale(supported, requested)` is a **pure, total** function — it never
throws and never reads `navigator`. It returns the best match for the requested
locale(s) (exact, then primary-language, e.g. `de-AT` → `de`), or the first
supported locale as a guaranteed fallback.

Locale _detection_ belongs to the [`device` module](device.md); compose the two
at the app layer:

```typescript
import { resolveLocale } from '@zappzarapp/browser-utils/intl';
import { DeviceInfo } from '@zappzarapp/browser-utils/device';

const locale = resolveLocale(['de', 'en'], DeviceInfo.languages());
```

## API

| Function                                             | Returns               | Description                                |
| ---------------------------------------------------- | --------------------- | ------------------------------------------ |
| `formatNumber(value, locale?, options?)`             | `string`              | `Intl.NumberFormat`                        |
| `formatCurrency(value, currency, locale?, options?)` | `string`              | Number formatting as currency              |
| `formatDate(value, locale?, options?)`               | `string`              | `Intl.DateTimeFormat` (date)               |
| `formatTime(value, locale?, options?)`               | `string`              | Date/time formatting (hour/minute default) |
| `formatRelativeTime(value, unit, locale?, options?)` | `string`              | `Intl.RelativeTimeFormat`                  |
| `formatPlural(count, locale?, options?)`             | `Intl.LDMLPluralRule` | Plural category via `Intl.PluralRules`     |
| `compare(a, b, locale?, options?)`                   | `number`              | `Intl.Collator` comparator                 |
| `resolveLocale(supported, requested)`                | `string`              | Locale negotiation (pure, total)           |
| `clearIntlCache()`                                   | `void`                | Drop cached formatters                     |

Every formatter also has a `*Result` variant (`formatNumberResult`, …) returning
`Result<…, IntlError>`. `resolveLocale` and `clearIntlCache` have no Result form
(they cannot fail). `locale` is optional; when omitted, the host default is
used.

## Error handling

Per the [dual error-handling convention](error-handling.md): a throwing variant
and a `Result`-based variant. The only failure mode is an invalid locale or
options at formatter construction; once constructed, formatting does not fail
for ordinary values. `IntlError` is exported from
`@zappzarapp/browser-utils/core`.

```typescript
import { formatNumberResult } from '@zappzarapp/browser-utils/intl';
import { Result } from '@zappzarapp/browser-utils/core';

const result = formatNumberResult(1000, userLocale);
if (Result.isErr(result)) {
  // result.error.code is 'INTL_INVALID_LOCALE' or 'INTL_INVALID_OPTIONS'
} else {
  render(result.value);
}
```

| Code                   | Meaning                            |
| ---------------------- | ---------------------------------- |
| `INTL_INVALID_LOCALE`  | The locale is invalid/unsupported  |
| `INTL_INVALID_OPTIONS` | The formatting options are invalid |

> A `Date`/timestamp that is itself invalid (e.g. `new Date('x')`) is a
> precondition violation and throws a `RangeError`, not an `IntlError`.

## Not supported in v1

`Intl.ListFormat`, `Intl.DisplayNames`, and `Intl.Segmenter` are deferred — they
follow the same wrapper shape and can be added when needed. There is no global
"active locale" state; pass the locale explicitly.
