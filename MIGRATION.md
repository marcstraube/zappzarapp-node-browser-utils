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

### No public API changes

2.0 introduces **no breaking changes to the runtime API** of the published
modules. The package remains **ESM-only** (as it has been since 1.x) — it cannot
be `require()`'d from CommonJS. Import paths and exports are unchanged.

### For contributors

The development toolchain moved to **pnpm 11** (pinned via the `packageManager`
field). With Corepack enabled, the correct version is used automatically:

```sh
corepack enable
pnpm install
```

This does not affect consumers of the published package.
