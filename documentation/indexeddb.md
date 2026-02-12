# IndexedDB Utilities

Promise-based IndexedDB wrapper with type-safe operations and transaction
support.

## Quick Start

```typescript
import {
  IndexedDBManager,
  IndexedDBError,
} from '@zappzarapp/browser-utils/indexeddb';

// Open database with stores
const db = await IndexedDBManager.open({
  name: 'my-app',
  version: 1,
  stores: {
    users: { keyPath: 'id' },
    settings: { keyPath: 'key' },
  },
});

// CRUD operations
await db.put('users', { id: 1, name: 'John' });
const user = await db.get<User>('users', 1);
await db.delete('users', 1);
```

## IndexedDBManager

### Static Methods

| Method                 | Returns                      | Description                              |
| ---------------------- | ---------------------------- | ---------------------------------------- |
| `isSupported()`        | `boolean`                    | Check if IndexedDB is available          |
| `open(config)`         | `Promise<IndexedDBInstance>` | Open/create database                     |
| `openResult(config)`   | `Promise<Result<...>>`       | Open with Result type for error handling |
| `deleteDatabase(name)` | `Promise<void>`              | Delete entire database                   |

### Database Configuration

```typescript
const db = await IndexedDBManager.open({
  name: 'my-app', // Database name
  version: 1, // Schema version (increment to upgrade)
  stores: {
    // Object store definitions
    users: {
      keyPath: 'id', // Primary key field
      autoIncrement: false, // Auto-generate keys
      indexes: {
        byEmail: { keyPath: 'email', unique: true },
        byCreated: { keyPath: 'createdAt' },
      },
    },
    logs: {
      autoIncrement: true, // No keyPath, auto-generate keys
    },
  },
  onUpgrade: (db, oldVersion, newVersion) => {
    // Custom upgrade logic
    console.log(`Upgrading from ${oldVersion} to ${newVersion}`);
  },
});
```

## IndexedDBInstance

### Methods

| Method                                | Returns                   | Description                         |
| ------------------------------------- | ------------------------- | ----------------------------------- |
| `get(store, key)`                     | `Promise<T \| undefined>` | Get record by key                   |
| `getAll(store, query?, count?)`       | `Promise<T[]>`            | Get all matching records            |
| `put(store, value, key?)`             | `Promise<IDBValidKey>`    | Insert or update record             |
| `add(store, value, key?)`             | `Promise<IDBValidKey>`    | Insert new record (fails if exists) |
| `delete(store, key)`                  | `Promise<void>`           | Delete record by key                |
| `clear(store)`                        | `Promise<void>`           | Delete all records in store         |
| `count(store, query?)`                | `Promise<number>`         | Count records                       |
| `transaction(stores, mode, callback)` | `Promise<void>`           | Run transaction                     |
| `close()`                             | `void`                    | Close database connection           |

### Properties

| Property  | Type     | Description            |
| --------- | -------- | ---------------------- |
| `name`    | `string` | Database name          |
| `version` | `number` | Current schema version |

## Usage Examples

### Basic CRUD

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

const db = await IndexedDBManager.open({
  name: 'app',
  version: 1,
  stores: { users: { keyPath: 'id' } },
});

// Create
await db.put('users', { id: 1, name: 'Alice', email: 'alice@example.com' });

// Read
const user = await db.get<User>('users', 1);
console.log(user?.name); // 'Alice'

// Update (same as create with put)
await db.put('users', {
  id: 1,
  name: 'Alice Smith',
  email: 'alice@example.com',
});

// Delete
await db.delete('users', 1);

// Read all
const allUsers = await db.getAll<User>('users');
```

### Transactions

```typescript
// Multiple operations in one transaction (atomic)
await db.transaction(['users', 'logs'], 'readwrite', async (tx) => {
  await tx.put('users', { id: 1, name: 'Bob', balance: 100 });
  await tx.put('users', { id: 2, name: 'Carol', balance: 100 });
  await tx.put('logs', { action: 'init', timestamp: Date.now() });
});

// If any operation fails, all are rolled back
```

### Auto-Increment Keys

```typescript
const db = await IndexedDBManager.open({
  name: 'app',
  version: 1,
  stores: {
    logs: { autoIncrement: true },
  },
});

const key1 = await db.add('logs', { message: 'First log' });
const key2 = await db.add('logs', { message: 'Second log' });
console.log(key1, key2); // 1, 2
```

### With Indexes

```typescript
const db = await IndexedDBManager.open({
  name: 'app',
  version: 1,
  stores: {
    products: {
      keyPath: 'id',
      indexes: {
        byCategory: { keyPath: 'category' },
        byPrice: { keyPath: 'price' },
      },
    },
  },
});

await db.put('products', {
  id: 1,
  name: 'Widget',
  category: 'tools',
  price: 9.99,
});
```

### Error Handling with Result

```typescript
import { Result } from '@zappzarapp/browser-utils/core';

const result = await IndexedDBManager.openResult({
  name: 'app',
  version: 1,
  stores: { data: { keyPath: 'id' } },
});

if (Result.isErr(result)) {
  switch (result.error.code) {
    case 'NOT_SUPPORTED':
      useFallbackStorage();
      break;
    case 'BLOCKED':
      showMessage('Please close other tabs');
      break;
    default:
      console.error('Database error:', result.error);
  }
} else {
  const db = result.value;
  // Use database
}
```

### Schema Migration

```typescript
const db = await IndexedDBManager.open({
  name: 'app',
  version: 2, // Increment version to trigger upgrade
  stores: {
    users: {
      keyPath: 'id',
      indexes: {
        byEmail: { keyPath: 'email', unique: true },
        // New index in version 2
        byRole: { keyPath: 'role' },
      },
    },
  },
  onUpgrade: (db, oldVersion, newVersion) => {
    if (oldVersion < 2) {
      // Migration logic for version 2
      console.log('Adding role index');
    }
  },
});
```

## IndexedDBError

### Error Codes

| Code                 | Description                                    |
| -------------------- | ---------------------------------------------- |
| `NOT_SUPPORTED`      | IndexedDB not available in environment         |
| `OPEN_FAILED`        | Failed to open database                        |
| `STORE_NOT_FOUND`    | Object store does not exist                    |
| `TRANSACTION_FAILED` | Transaction aborted or failed                  |
| `OPERATION_FAILED`   | Individual operation (get/put/delete) failed   |
| `VERSION_ERROR`      | Version number issue (e.g., downgrade attempt) |
| `BLOCKED`            | Upgrade blocked by open connections            |

## Security Considerations

1. **Same-Origin Only** - IndexedDB is bound to the page origin
2. **No Encryption** - Data is stored in plain text; encrypt sensitive data
   before storing
3. **Quota Limits** - Browsers may limit storage; handle quota errors gracefully
4. **User Data** - Can be cleared by users; don't rely on it for critical data
