# Migration Guide

## 1.x → 2.0

### Node.js 22+ is now required (breaking)

The minimum supported Node.js version is now **22 LTS**. Node.js 20 reached
end-of-life in April 2026 and is no longer supported.

```sh
# with nvm
nvm install 22
nvm use 22

# verify
node --version   # v22.x or newer
```

If you cannot upgrade to Node.js 22, stay on the `1.x` line. Note that `1.x` is
no longer maintained (it runs on an end-of-life runtime) — see
[SECURITY.md](./SECURITY.md).

### Orientation API (breaking)

The `DeviceInfo` orientation sub-API has been unified into a single immutable,
fully-typed `OrientationState`. One getter and one listener now share the same
shape. The legacy `window.resize` fallback was dropped — the API is built purely
on the
[Screen Orientation API](https://developer.mozilla.org/docs/Web/API/Screen_Orientation_API)
(baseline: Safari/iOS 16.4+, March 2023). When unsupported, the getter returns
`undefined` and the listener is a no-op.

```ts
interface OrientationState {
  readonly type: OrientationType; // 'portrait-primary' | 'landscape-primary' | …
  readonly angle: number; // 0 | 90 | 180 | 270
  readonly orientation: Orientation; // 'portrait' | 'landscape' (derived)
}
```

**`getOrientation()` now returns an `OrientationState`:**

```ts
// Before
const type = DeviceInfo.getOrientation(); // OrientationType | undefined

// After
const state = DeviceInfo.getOrientation(); // OrientationState | undefined
state?.type; // OrientationType
state?.angle; // number
state?.orientation; // 'portrait' | 'landscape'
```

**`onOrientationChange()` now passes an `OrientationState`:**

```ts
// Before
DeviceInfo.onOrientationChange((orientation) => {
  console.log(orientation); // 'portrait' | 'landscape'
});

// After
DeviceInfo.onOrientationChange((state) => {
  console.log(state.type, state.angle, state.orientation);
});
```

**Removed methods** — all subsumed by the two above:

| Removed                     | Replacement                                               |
| --------------------------- | --------------------------------------------------------- |
| `orientation()`             | `getOrientation()?.orientation`                           |
| `orientationAngle()`        | `getOrientation()?.angle`                                 |
| `onOrientationTypeChange()` | `onOrientationChange()` — the handler already gets `type` |

`isOrientationSupported()`, `lockOrientation()`, and `unlockOrientation()` are
unchanged.

### No other public API changes

Apart from the orientation redesign above, 2.0 introduces **no breaking changes
to the runtime API** of the published modules.

### For contributors

The development toolchain moved to **pnpm 11** (pinned via the `packageManager`
field). With Corepack enabled, the correct version is used automatically:

```sh
corepack enable
pnpm install
```

This does not affect consumers of the published package.
