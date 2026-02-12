# Error Handling: Throwing vs Result-based API

This library offers two styles for error handling. Choose based on your
preference.

## Throwing API (Traditional)

Uses exceptions for error handling. Simpler for straightforward cases.

```typescript
import { IndexedDBManager } from '@zappzarapp/browser-utils/indexeddb';

async function saveUser(user: User): Promise<void> {
  try {
    const db = await IndexedDBManager.open({
      name: 'myApp',
      version: 1,
      stores: { users: { keyPath: 'id' } },
    });
    await db.put('users', user);
    db.close();
  } catch (error) {
    if (error instanceof IndexedDBError) {
      console.error(`Database error [${error.code}]:`, error.message);
    }
    throw error;
  }
}
```

## Result-based API (Explicit)

Returns `Result<T, E>` instead of throwing. Makes error states explicit in
types.

```typescript
import { IndexedDBManager } from '@zappzarapp/browser-utils/indexeddb';

async function saveUser(user: User): Promise<Result<void, IndexedDBError>> {
  const dbResult = await IndexedDBManager.openResult({
    name: 'myApp',
    version: 1,
    stores: { users: { keyPath: 'id' } },
  });

  if (dbResult.isErr()) {
    return Result.err(dbResult.error);
  }

  const db = dbResult.value;
  await db.put('users', user);
  db.close();
  return Result.ok(undefined);
}

// Usage with pattern matching
const result = await saveUser({ id: 1, name: 'Alice' });
result.match({
  ok: () => console.log('User saved'),
  err: (e) => console.error(`Failed: ${e.code}`),
});
```

## When to Use Each

| Scenario                     | Recommended API |
| ---------------------------- | --------------- |
| Simple scripts               | Throwing        |
| UI with error boundaries     | Throwing        |
| Functional programming style | Result-based    |
| Complex error recovery logic | Result-based    |
| APIs that must not throw     | Result-based    |
| Pipeline/chain operations    | Result-based    |

## Available Result Methods

Methods ending with `Result` return `Result<T, E>`:

- `IndexedDBManager.openResult()` — Open database without throwing
- `StorageManager.getResult()` — Get value with explicit error
- `CookieManager.getResult()` — Parse cookie with Result
