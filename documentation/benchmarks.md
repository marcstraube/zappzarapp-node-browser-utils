# Performance Benchmarks

Measured numbers for the operations where a benchmark is meaningful, plus the
methodology for the ones that are not.

Two of the four areas below produce honest, reproducible numbers in a Node
runtime: **bundle size** (the exact shipped bytes) and **CPU-bound work** (cache
logic on V8, AES-GCM on Web Crypto -- the same engines the browser uses).
**Storage throughput** depends on real browser APIs (localStorage, IndexedDB)
that have no faithful Node equivalent, so it is described qualitatively rather
than measured against mocks.

> Absolute timings depend on the machine and runtime. Treat them as relative
> guidance, and reproduce locally with the commands at the end for numbers that
> reflect your own environment.

## Environment

| Field   | Value                        |
| ------- | ---------------------------- |
| Runtime | Node.js 24, V8               |
| Tooling | Vitest 4.1 (`bench`)         |
| Crypto  | Web Crypto (`crypto.subtle`) |
| OS      | Linux x64                    |
| Date    | 2026-06-15                   |

## Bundle Size

Per entry point, minified and gzipped, measured with `size-limit`. The library
is fully tree-shakeable, so an app pays only for the modules it imports -- the
total is the worst case of importing everything.

| Module         | Gzipped (kB) |
| -------------- | -----------: |
| `core`         |         4.91 |
| `storage`      |         4.46 |
| `session`      |         4.29 |
| `encryption`   |         4.06 |
| `cache`        |         3.78 |
| `url`          |         3.76 |
| `request`      |         3.45 |
| `cookie`       |         3.44 |
| `offline`      |         3.20 |
| `form`         |         3.13 |
| `clipboard`    |         2.91 |
| `download`     |         2.77 |
| `color`        |         2.30 |
| `websocket`    |         2.28 |
| `network`      |         2.19 |
| `csp`          |         1.99 |
| `a11y`         |         1.98 |
| `html`         |         1.58 |
| `observe`      |         1.51 |
| `indexeddb`    |         1.42 |
| `scroll`       |         1.19 |
| `intl`         |         1.16 |
| `events`       |         1.02 |
| `fullscreen`   |         1.01 |
| `focus`        |         1.01 |
| `notification` |         1.01 |
| `performance`  |         0.98 |
| `broadcast`    |         0.98 |
| `device`       |         0.89 |
| `geolocation`  |         0.85 |
| `sanitize`     |         0.78 |
| `logging`      |         0.74 |
| `keyboard`     |         0.71 |
| `media`        |         0.70 |
| `features`     |         0.70 |
| `idle`         |         0.63 |
| `visibility`   |         0.23 |
| **Total**      |    **74.00** |

Smaller is the common case: a typical app importing a handful of modules ships a
few kilobytes, not the full total.

## Cache Throughput

`CacheManager` is in-memory and pure JavaScript, so these numbers track V8 and
carry over to the browser. It uses a single eviction strategy, **LRU**; the
final row shows the cost of an insert at capacity, which evicts the
least-recently-used entry.

| Operation                  | Throughput (ops/s) | Mean    |
| -------------------------- | -----------------: | ------- |
| `get` (hit)                |         ~2,400,000 | ~0.4 µs |
| `get` (miss)               |         ~4,140,000 | ~0.2 µs |
| `set` (no eviction)        |         ~2,500,000 | ~0.4 µs |
| `set` (LRU evict at limit) |            ~96,700 | ~10 µs  |

Reads and non-evicting writes are sub-microsecond. Eviction is ~25× slower
because the LRU scan walks the entries to find the oldest -- still ~10 µs, and
only paid once the cache is full.

## Encryption Overhead

The `encryption` module encrypts with AES-GCM-256 through the Web Crypto API.
These numbers isolate that primitive -- the same `crypto.subtle.encrypt` /
`decrypt` calls the module makes -- across payload sizes, excluding the
surrounding storage I/O. Web Crypto is hardware-accelerated (AES-NI), so cost
scales with payload size rather than per-call overhead.

| Payload | Encrypt (ops/s) | Decrypt (ops/s) | Mean (encrypt) |
| ------- | --------------: | --------------: | -------------- |
| 1 KB    |         ~53,800 |         ~51,200 | ~0.019 ms      |
| 10 KB   |         ~42,400 |         ~44,200 | ~0.024 ms      |
| 100 KB  |         ~21,600 |         ~19,500 | ~0.046 ms      |
| 1 MB    |          ~3,360 |          ~3,380 | ~0.298 ms      |

Encryption and decryption cost is effectively symmetric. Small payloads (the
common case for `EncryptedStorage` entries) run in tens of microseconds; a 1 MB
blob still encrypts in well under a millisecond.

## Storage Throughput

Storage performance (`StorageManager`, `SessionStorageManager`, IndexedDB)
cannot be measured honestly in Node: these are browser APIs, available under
test only as in-memory mocks (happy-dom, fake-indexeddb) whose timings bear no
relation to a real browser's synchronous disk-backed `localStorage` or
transactional IndexedDB. Publishing mock numbers would mislead, so this section
describes characteristics instead.

| Backend                 | Access       | Characteristics                                                                                      |
| ----------------------- | ------------ | ---------------------------------------------------------------------------------------------------- |
| `StorageManager`        | Synchronous  | Disk-backed `localStorage`; blocks the main thread; ~5 MB origin quota; LRU eviction on quota errors |
| `SessionStorageManager` | Synchronous  | Per-tab `sessionStorage`; cleared on tab close                                                       |
| `indexeddb`             | Asynchronous | Transactional; large quotas; off the main thread; higher per-op latency than `localStorage`          |

Guidance: prefer `localStorage` for small, hot values where synchronous access
is convenient; use IndexedDB for large or structured data where blocking the
main thread is unacceptable. Real cross-backend throughput numbers require a
browser harness (e.g. Playwright) and are tracked as a follow-up.

## Reproducing

```bash
# Bundle size (per module, gzipped)
pnpm size

# Cache and encryption micro-benchmarks
pnpm bench
```

Benchmark sources live in [`benchmarks/`](../benchmarks); bundle-size limits are
configured in `.size-limit.json`.
