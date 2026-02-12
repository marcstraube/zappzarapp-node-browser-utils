# Encrypted Storage

AES-GCM encrypted localStorage wrapper with PBKDF2 key derivation for secure
client-side data storage.

## Quick Start

```typescript
import { EncryptedStorage } from '@zappzarapp/browser-utils/encryption';

// Create encrypted storage (async factory)
const storage = await EncryptedStorage.create({
  password: 'secure-password-here',
  prefix: 'myApp',
});

// Store encrypted data
await storage.set('credentials', { apiKey: 'secret-key' });

// Retrieve and decrypt
const data = await storage.get<{ apiKey: string }>('credentials');
console.log(data?.apiKey);

// Always destroy when done (clears key from memory)
storage.destroy();
```

## EncryptedStorage

### Static Methods

| Method                | Returns                     | Description                          |
| --------------------- | --------------------------- | ------------------------------------ |
| `create(config)`      | `Promise<EncryptedStorage>` | Create encrypted storage instance    |
| `isCryptoAvailable()` | `boolean`                   | Check if Web Crypto API is available |

### Instance Methods

| Method            | Returns                 | Description                             |
| ----------------- | ----------------------- | --------------------------------------- |
| `set(key, value)` | `Promise<void>`         | Encrypt and store a value               |
| `get(key)`        | `Promise<T \| null>`    | Retrieve and decrypt a value            |
| `has(key)`        | `boolean`               | Check if a key exists                   |
| `remove(key)`     | `void`                  | Remove an entry                         |
| `clear()`         | `void`                  | Remove all entries (keeps salt)         |
| `keys()`          | `readonly string[]`     | Get all keys (without prefix)           |
| `stats()`         | `EncryptedStorageStats` | Get storage statistics                  |
| `destroy()`       | `void`                  | Destroy instance, clear key from memory |

## Configuration Options

```typescript
interface EncryptedStorageConfig {
  /** Password for key derivation (min 12 characters) */
  password: string;

  /** Prefix for all storage keys (default: 'encrypted') */
  prefix?: string;

  /** PBKDF2 iterations (default: 600,000, min: 10,000) */
  iterations?: number;

  /** Custom storage backend for testing (default: localStorage) */
  storage?: Storage;
}
```

| Option       | Type      | Default        | Description                                |
| ------------ | --------- | -------------- | ------------------------------------------ |
| `password`   | `string`  | Required       | Password for key derivation (min 12 chars) |
| `prefix`     | `string`  | `'encrypted'`  | Key prefix for all entries                 |
| `iterations` | `number`  | `600000`       | PBKDF2 iterations (min 10,000)             |
| `storage`    | `Storage` | `localStorage` | Custom storage backend                     |

## Usage Examples

### Basic Encrypted Storage

```typescript
const storage = await EncryptedStorage.create({
  password: 'my-secure-password',
  prefix: 'app',
});

// Store sensitive data
await storage.set('user', {
  id: 123,
  token: 'bearer-token',
  preferences: { theme: 'dark' },
});

// Retrieve data
const user = await storage.get<{ id: number; token: string }>('user');
if (user) {
  console.log('User ID:', user.id);
}

// Check existence
if (storage.has('user')) {
  console.log('User data exists');
}

// Remove specific entry
storage.remove('user');

// Clear all encrypted data
storage.clear();
```

### Higher Security Configuration

```typescript
// Use more PBKDF2 iterations for sensitive applications
// Note: Higher iterations = slower but more secure
const storage = await EncryptedStorage.create({
  password: 'very-secure-password-123!',
  prefix: 'secure',
  iterations: 600_000, // OWASP recommended minimum for PBKDF2-SHA256
});
```

### Check Crypto Availability

```typescript
if (EncryptedStorage.isCryptoAvailable()) {
  const storage = await EncryptedStorage.create({
    password: 'password',
  });
  // Use encrypted storage
} else {
  console.warn('Web Crypto API not available');
  // Use fallback or warn user
}
```

### Storage Statistics

```typescript
const storage = await EncryptedStorage.create({
  password: 'password',
  prefix: 'myApp',
});

await storage.set('item1', { data: 'value1' });
await storage.set('item2', { data: 'value2' });

const stats = storage.stats();
// {
//   count: 2,
//   prefix: 'myApp',
//   iterations: 600000,
//   isDestroyed: false
// }
```

### Proper Cleanup

```typescript
async function useEncryptedStorage(): Promise<void> {
  const storage = await EncryptedStorage.create({
    password: 'password',
  });

  try {
    await storage.set('temp', { sensitive: 'data' });
    const data = await storage.get('temp');
    // Process data...
  } finally {
    // Always destroy to clear the crypto key from memory
    storage.destroy();
  }
}
```

### Error Handling

```typescript
import { ValidationError } from '@zappzarapp/browser-utils/core';
import { EncryptedStorage } from '@zappzarapp/browser-utils/encryption';
import { EncryptionError } from '@zappzarapp/browser-utils/core';

try {
  const storage = await EncryptedStorage.create({
    password: 'short', // Will fail - too short
  });
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Invalid configuration:', error.message);
  } else if (error instanceof EncryptionError) {
    console.error('Encryption error:', error.message);
  }
}

// Or handle specific errors during operations
const storage = await EncryptedStorage.create({ password: 'valid-password' });

try {
  await storage.set('key', { large: 'data'.repeat(10000) });
} catch (error) {
  if (error instanceof EncryptionError) {
    switch (error.code) {
      case 'ENCRYPTION_QUOTA_EXCEEDED':
        console.error('Storage quota exceeded');
        break;
      case 'ENCRYPTION_FAILED':
        console.error('Encryption failed');
        break;
    }
  }
}
```

## Cryptographic Details

### Algorithms Used

| Component      | Algorithm     | Parameters                   |
| -------------- | ------------- | ---------------------------- |
| Key Derivation | PBKDF2-SHA256 | 600,000 iterations (default) |
| Encryption     | AES-256-GCM   | 256-bit key                  |
| IV Generation  | Random        | 12 bytes per encryption      |
| Salt           | Random        | 16 bytes, stored per prefix  |

### Storage Format

Each encrypted entry is stored as JSON:

```json
{
  "iv": "base64-encoded-12-byte-iv",
  "data": "base64-encoded-ciphertext",
  "timestamp": 1699999999999
}
```

The salt is stored separately with the key `{prefix}__salt__`.

## Security Considerations

1. **Password Strength** - Use strong passwords (min 12 characters, recommend
   16+ with mixed characters). The security of your data depends on password
   strength.

2. **Password Storage** - Never store the password in localStorage, cookies, or
   anywhere accessible to JavaScript. Prompt the user or derive from a secure
   source.

3. **XSS Vulnerability** - While data is encrypted, an XSS attack could
   intercept the password during input or call `get()` while the storage
   instance is active.

4. **Memory Exposure** - The derived key exists in memory while the instance is
   active. Always call `destroy()` when done to clear it.

5. **Salt Persistence** - The salt is stored unencrypted in localStorage. If the
   salt is lost or corrupted, existing encrypted data cannot be decrypted.

6. **No Key Recovery** - There is no password recovery mechanism. If the
   password is forgotten, encrypted data is permanently lost.

7. **Side-Channel Attacks** - Browser JavaScript is not hardened against timing
   attacks or other side-channel attacks. For highly sensitive data, consider
   server-side encryption.

8. **Iteration Count** - The default 600,000 iterations follows the OWASP 2023
   recommendation for PBKDF2-SHA256. Custom values must be at least 10,000.

9. **Quota Handling** - localStorage has limited space (~5MB). Handle
   `ENCRYPTION_QUOTA_EXCEEDED` errors gracefully.

10. **Private Browsing** - localStorage may be unavailable or ephemeral in
    private/incognito mode. Check `isCryptoAvailable()` before use.

## Browser Support

| Browser     | Support |
| ----------- | ------- |
| Chrome 37+  | Yes     |
| Firefox 34+ | Yes     |
| Safari 11+  | Yes     |
| Edge 12+    | Yes     |
| IE          | No      |

Requires Web Crypto API with:

- `crypto.subtle.importKey()`
- `crypto.subtle.deriveKey()`
- `crypto.subtle.encrypt()` / `decrypt()`
- `crypto.getRandomValues()`

## Types

```typescript
interface EncryptedStorageConfig {
  readonly password: string;
  readonly prefix?: string;
  readonly iterations?: number;
  readonly storage?: Storage;
}

interface EncryptedStorageStats {
  readonly count: number;
  readonly prefix: string;
  readonly iterations: number;
  readonly isDestroyed: boolean;
}

interface EncryptedStorageInstance {
  set<T>(key: string, value: T): Promise<void>;
  get<T>(key: string): Promise<T | null>;
  has(key: string): boolean;
  remove(key: string): void;
  clear(): void;
  keys(): readonly string[];
  stats(): EncryptedStorageStats;
  destroy(): void;
}
```
