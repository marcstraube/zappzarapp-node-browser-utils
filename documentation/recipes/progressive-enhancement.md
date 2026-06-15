# Recipe: Progressive Enhancement

Detect what the browser and connection actually support, then pick the best
available implementation and fall back cleanly when a capability is missing.
FeatureDetect reports capabilities, NetworkStatus adapts to connection quality,
and MediaQuery respects user preferences.

## Modules Used

| Module     | Role                                              |
| ---------- | ------------------------------------------------- |
| `features` | Detect API availability (storage, clipboard, ...) |
| `network`  | Adapt to connection quality and Save-Data         |
| `media`    | Respect user preferences (reduced motion, theme)  |

## Strategy

```text
FeatureDetect.indexedDB()  --yes--> IndexedDB backend
        |
        no
        v
FeatureDetect.localStorage() --yes--> localStorage backend
        |
        no
        v
        in-memory fallback (this session only)
```

Detection runs once at startup. Each capability resolves to a concrete
implementation, so the rest of the app calls a stable interface and never
branches on `typeof window` again.

## Step-by-Step Setup

### 1. Inspect Capabilities Once

```typescript
import { FeatureDetect } from '@zappzarapp/browser-utils/features';

const caps = FeatureDetect.all(); // full FeatureReport

// Or probe individually
const canPersist = FeatureDetect.indexedDB() || FeatureDetect.localStorage();
const canCopy = FeatureDetect.clipboard();
```

### 2. Choose a Storage Backend

```typescript
import { FeatureDetect } from '@zappzarapp/browser-utils/features';
import { IndexedDBManager } from '@zappzarapp/browser-utils/indexeddb';

interface KeyValueStore {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string): Promise<void>;
}

async function createStore(): Promise<KeyValueStore> {
  if (FeatureDetect.indexedDB()) {
    const db = await IndexedDBManager.open({
      name: 'app',
      version: 1,
      stores: { kv: { keyPath: 'key' } },
    });
    return {
      async get(key) {
        const row = await db.get<{ key: string; value: string }>('kv', key);
        return row?.value;
      },
      async set(key, value) {
        await db.put('kv', { key, value });
      },
    };
  }

  if (FeatureDetect.localStorage()) {
    return {
      get: (key) => Promise.resolve(localStorage.getItem(key) ?? undefined),
      set: (key, value) => Promise.resolve(localStorage.setItem(key, value)),
    };
  }

  // Last resort: volatile, lives only for this session
  const memory = new Map<string, string>();
  return {
    get: (key) => Promise.resolve(memory.get(key)),
    set: (key, value) => Promise.resolve(void memory.set(key, value)),
  };
}
```

### 3. Adapt to Connection Quality

```typescript
import { NetworkStatus } from '@zappzarapp/browser-utils/network';

function shouldPrefetch(): boolean {
  const info = NetworkStatus.getInfo();
  if (!info.online || info.saveData) {
    return false; // offline or user opted into Save-Data
  }
  return info.effectiveType !== '2g' && info.effectiveType !== 'slow-2g';
}

// React to changes -- pause background work on a weak connection
NetworkStatus.onConnectionChange((info) => {
  if (info.saveData || info.effectiveType === '2g') {
    pauseBackgroundSync();
  } else {
    resumeBackgroundSync();
  }
});
```

### 4. Respect User Preferences

```typescript
import { MediaQuery } from '@zappzarapp/browser-utils/media';

const transitionMs = MediaQuery.prefersReducedMotion() ? 0 : 200;

applyTheme(MediaQuery.prefersDarkMode() ? 'dark' : 'light');

// Update live when the user changes their system theme
MediaQuery.onChange('(prefers-color-scheme: dark)', (dark) => {
  applyTheme(dark ? 'dark' : 'light');
});
```

## Complete Example: Capability-Aware Bootstrap

```typescript
import { FeatureDetect } from '@zappzarapp/browser-utils/features';
import { NetworkStatus } from '@zappzarapp/browser-utils/network';
import { MediaQuery } from '@zappzarapp/browser-utils/media';

interface AppConfig {
  readonly persistent: boolean;
  readonly clipboard: boolean;
  readonly prefetch: boolean;
  readonly animate: boolean;
  readonly theme: 'dark' | 'light';
}

function resolveConfig(): AppConfig {
  const info = NetworkStatus.getInfo();
  const slow = info.effectiveType === '2g' || info.effectiveType === 'slow-2g';

  return {
    persistent: FeatureDetect.indexedDB() || FeatureDetect.localStorage(),
    clipboard: FeatureDetect.clipboard(),
    prefetch: info.online && !info.saveData && !slow,
    animate: !MediaQuery.prefersReducedMotion(),
    theme: MediaQuery.prefersDarkMode() ? 'dark' : 'light',
  };
}

async function copyWithFallback(text: string): Promise<void> {
  if (FeatureDetect.clipboard()) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // Surface a manual copy affordance instead of failing silently
  showManualCopyDialog(text);
}
```

### Usage

```typescript
const config = resolveConfig();

if (config.prefetch) {
  void prefetchNextPage();
}

document.documentElement.dataset.theme = config.theme;

if (!config.persistent) {
  showBanner(
    'Your browser cannot save data locally; changes are session-only.'
  );
}
```

## Notes

- Probe with FeatureDetect rather than user-agent sniffing: it tests the actual
  API, so it stays correct as browsers change.
- Detect once at startup and resolve to concrete implementations. Repeated
  `typeof`/`in` checks scattered through the code drift out of sync.
- Always provide a fallback path. A missing capability should degrade the
  experience, never break it.
