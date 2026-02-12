// noinspection JSUnusedGlobalSymbols - Example file

/**
 * Encrypted Storage Example - Secure localStorage for sensitive data
 *
 * This example demonstrates:
 * - Creating encrypted storage with AES-GCM encryption
 * - Storing and retrieving sensitive data securely
 * - Password-based key derivation (PBKDF2)
 * - Proper cleanup and lifecycle management
 * - Error handling for encryption operations
 * - Building a secure credential manager
 *
 * Security features:
 * - AES-256-GCM encryption (authenticated encryption)
 * - PBKDF2 key derivation with 100,000 iterations
 * - Unique IV per encryption operation
 * - Secure salt storage for key derivation
 * - Non-extractable CryptoKey (memory protection)
 *
 * @packageDocumentation
 */

import { EncryptionError } from '@zappzarapp/browser-utils/core';
import {
  EncryptedStorage,
  type EncryptedStorageInstance,
  type EncryptedStorageStats,
} from '@zappzarapp/browser-utils/encryption';
import { Logger } from '@zappzarapp/browser-utils/logging';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * User credentials to store securely.
 */
interface UserCredentials {
  readonly username: string;
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAt: number;
}

/**
 * API key configuration.
 */
interface ApiKeyConfig {
  readonly service: string;
  readonly apiKey: string;
  readonly apiSecret?: string;
  readonly createdAt: string;
}

/**
 * Sensitive user settings.
 */
interface SecureSettings {
  readonly twoFactorSecret?: string;
  readonly encryptionPreference: 'always' | 'sensitive-only';
  readonly backupEnabled: boolean;
}

// =============================================================================
// Basic Usage
// =============================================================================

/**
 * Basic encrypted storage operations.
 */
async function basicUsageExample(): Promise<void> {
  console.log('--- Basic Encrypted Storage Usage ---');

  // Check if Web Crypto is available (required for encryption)
  if (!EncryptedStorage.isCryptoAvailable()) {
    console.error('Web Crypto API is not available');
    return;
  }

  // Create encrypted storage with a password
  // In production, get this from user input or a secure key store
  const storage = await EncryptedStorage.create({
    password: 'my-secure-password-12345',
    prefix: 'secureApp',
  });

  try {
    // Store sensitive credentials (encrypted automatically)
    const credentials: UserCredentials = {
      username: 'alice@example.com',
      accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      refreshToken: 'dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...',
      expiresAt: Date.now() + 3600000, // 1 hour
    };

    await storage.set('credentials', credentials);
    console.log('Stored encrypted credentials');

    // Retrieve and decrypt credentials
    const retrieved = await storage.get<UserCredentials>('credentials');
    if (retrieved !== null) {
      console.log('Retrieved credentials for:', retrieved.username);
      console.log('Token expires:', new Date(retrieved.expiresAt).toISOString());
    }

    // Check if key exists
    console.log('Has credentials:', storage.has('credentials'));

    // Get all encrypted keys
    console.log('Stored keys:', storage.keys());

    // Get storage statistics
    const stats: EncryptedStorageStats = storage.stats();
    console.log('Stats:', stats);

    // Remove sensitive data when no longer needed
    storage.remove('credentials');
    console.log('Removed credentials');
  } finally {
    // Always destroy storage instance when done to clear key from memory
    storage.destroy();
    console.log('Storage destroyed - crypto key cleared from memory');
  }
}

// =============================================================================
// Secure Credential Manager
// =============================================================================

/**
 * A credential manager that securely stores API keys and tokens.
 * Demonstrates a real-world use case for encrypted storage.
 */
class SecureCredentialManager {
  private storage: EncryptedStorageInstance | null = null;
  private readonly logger = Logger.create({
    prefix: '[CredentialManager]',
    level: 1, // Info
  });

  /**
   * Initialize the credential manager with a master password.
   *
   * @param masterPassword - Password for encryption (user-provided)
   */
  async initialize(masterPassword: string): Promise<void> {
    if (this.storage !== null) {
      this.logger.warn('Already initialized, destroying previous instance');
      this.storage.destroy();
    }

    try {
      this.storage = await EncryptedStorage.create({
        password: masterPassword,
        prefix: 'credentials',
        iterations: 100_000, // Balance security vs. performance
      });

      this.logger.info('Credential manager initialized');
    } catch (error) {
      if (error instanceof EncryptionError) {
        this.logger.error(`Encryption error: ${error.code}`);
      }
      throw error;
    }
  }

  /**
   * Store an API key securely.
   */
  async storeApiKey(service: string, apiKey: string, apiSecret?: string): Promise<void> {
    this.ensureInitialized();

    const config: ApiKeyConfig = {
      service,
      apiKey,
      apiSecret,
      createdAt: new Date().toISOString(),
    };

    await this.storage!.set(`api:${service}`, config);
    this.logger.info(`Stored API key for: ${service}`);
  }

  /**
   * Retrieve an API key.
   */
  async getApiKey(service: string): Promise<ApiKeyConfig | null> {
    this.ensureInitialized();

    const config = await this.storage!.get<ApiKeyConfig>(`api:${service}`);
    if (config !== null) {
      this.logger.debug(`Retrieved API key for: ${service}`);
    }
    return config;
  }

  /**
   * Remove an API key.
   */
  removeApiKey(service: string): void {
    this.ensureInitialized();
    this.storage!.remove(`api:${service}`);
    this.logger.info(`Removed API key for: ${service}`);
  }

  /**
   * Store user credentials (tokens).
   */
  async storeCredentials(credentials: UserCredentials): Promise<void> {
    this.ensureInitialized();
    await this.storage!.set('userCredentials', credentials);
    this.logger.info('Stored user credentials');
  }

  /**
   * Get user credentials if they exist and are not expired.
   */
  async getCredentials(): Promise<UserCredentials | null> {
    this.ensureInitialized();

    const credentials = await this.storage!.get<UserCredentials>('userCredentials');

    if (credentials === null) {
      return null;
    }

    // Check if token is expired
    if (Date.now() >= credentials.expiresAt) {
      this.logger.warn('Credentials expired, removing');
      this.storage!.remove('userCredentials');
      return null;
    }

    return credentials;
  }

  /**
   * List all stored services.
   */
  listServices(): readonly string[] {
    this.ensureInitialized();

    return this.storage!.keys()
      .filter((key) => key.startsWith('api:'))
      .map((key) => key.slice(4)); // Remove 'api:' prefix
  }

  /**
   * Clear all stored credentials.
   */
  clearAll(): void {
    this.ensureInitialized();
    this.storage!.clear();
    this.logger.info('Cleared all credentials');
  }

  /**
   * Destroy the manager and clear sensitive data from memory.
   */
  destroy(): void {
    if (this.storage !== null) {
      this.storage.destroy();
      this.storage = null;
      this.logger.info('Credential manager destroyed');
    }
  }

  /**
   * Check if the manager is locked (not initialized).
   */
  get isLocked(): boolean {
    return this.storage === null;
  }

  private ensureInitialized(): void {
    if (this.storage === null) {
      throw new Error('Credential manager not initialized. Call initialize() first.');
    }
  }
}

/**
 * Example usage of the credential manager.
 */
async function credentialManagerExample(): Promise<void> {
  console.log('\n--- Secure Credential Manager ---');

  const manager = new SecureCredentialManager();

  try {
    // Initialize with master password
    await manager.initialize('my-master-password-12345');

    // Store various API keys
    await manager.storeApiKey('github', 'ghp_xxxxxxxxxxxx');
    await manager.storeApiKey('stripe', 'sk_live_xxxxxx', 'whsec_xxxxxx');
    await manager.storeApiKey(
      'aws',
      'AKIAIOSFODNN7EXAMPLE',
      'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
    );

    console.log('Stored services:', manager.listServices());

    // Retrieve a specific API key
    const githubKey = await manager.getApiKey('github');
    if (githubKey !== null) {
      console.log(`GitHub API key created at: ${githubKey.createdAt}`);
    }

    // Store user credentials
    await manager.storeCredentials({
      username: 'developer@example.com',
      accessToken: 'access-token-here',
      refreshToken: 'refresh-token-here',
      expiresAt: Date.now() + 86400000, // 24 hours
    });

    // Check credentials
    const credentials = await manager.getCredentials();
    if (credentials !== null) {
      console.log('User logged in as:', credentials.username);
    }
  } finally {
    // Always destroy when done
    manager.destroy();
  }
}

// =============================================================================
// Error Handling
// =============================================================================

/**
 * Demonstrate proper error handling for encryption operations.
 */
async function errorHandlingExample(): Promise<void> {
  console.log('\n--- Error Handling ---');

  // Example 1: Crypto not available (won't happen in modern browsers)
  if (!EncryptedStorage.isCryptoAvailable()) {
    console.log('Crypto not available - use fallback storage or show error');
    return;
  }

  // Example 2: Invalid password (too short)
  try {
    await EncryptedStorage.create({
      password: 'short', // Too short - will throw ValidationError
      prefix: 'test',
    });
  } catch (error) {
    console.log('Caught expected error for short password:', error);
  }

  // Example 3: Proper async error handling
  let storage: EncryptedStorageInstance | null = null;
  try {
    storage = await EncryptedStorage.create({
      password: 'valid-password-12345',
      prefix: 'errorDemo',
    });

    // Try to get non-existent key (returns null, not error)
    const missing = await storage.get('nonexistent');
    console.log('Missing key returns:', missing); // null

    // Store and retrieve
    await storage.set('test', { value: 42 });
    const retrieved = await storage.get<{ value: number }>('test');
    console.log('Retrieved value:', retrieved?.value);
  } catch (error) {
    if (error instanceof EncryptionError) {
      console.error('Encryption error:', error.code, error.message);
    } else {
      console.error('Unexpected error:', error);
    }
  } finally {
    // Always cleanup
    storage?.destroy();
    console.log('Cleanup complete');
  }
}

// =============================================================================
// Password Change Pattern
// =============================================================================

/**
 * Demonstrate how to change the encryption password.
 * Requires re-encrypting all data with the new password.
 */
async function changePasswordExample(): Promise<void> {
  console.log('\n--- Password Change Pattern ---');

  const oldPassword = 'old-password-12345';
  const newPassword = 'new-password-67890';

  // Open storage with old password
  const oldStorage = await EncryptedStorage.create({
    password: oldPassword,
    prefix: 'migrate',
  });

  // Store some data
  await oldStorage.set('settings', { theme: 'dark' });
  await oldStorage.set('prefs', { lang: 'en' });

  // Read all data before migration
  const allKeys = oldStorage.keys();
  const dataToMigrate: Record<string, unknown> = {};

  for (const key of allKeys) {
    dataToMigrate[key] = await oldStorage.get(key);
  }

  console.log('Data to migrate:', Object.keys(dataToMigrate));

  // Clear old storage
  oldStorage.clear();
  oldStorage.destroy();

  // Create new storage with new password
  const newStorage = await EncryptedStorage.create({
    password: newPassword,
    prefix: 'migrate',
  });

  // Re-encrypt all data with new password
  for (const [key, value] of Object.entries(dataToMigrate)) {
    await newStorage.set(key, value);
  }

  console.log('Migration complete - all data re-encrypted');

  // Verify migration
  const settings = await newStorage.get<{ theme: string }>('settings');
  console.log('Verified settings:', settings);

  newStorage.destroy();
}

// =============================================================================
// Secure Settings Storage
// =============================================================================

/**
 * Example: Storing sensitive application settings.
 */
async function secureSettingsExample(): Promise<void> {
  console.log('\n--- Secure Settings Storage ---');

  const storage = await EncryptedStorage.create({
    password: 'app-encryption-key-12345',
    prefix: 'secureSettings',
    iterations: 150_000, // Higher iterations for extra security
  });

  try {
    // Store sensitive settings
    const settings: SecureSettings = {
      twoFactorSecret: 'JBSWY3DPEHPK3PXP', // TOTP secret
      encryptionPreference: 'always',
      backupEnabled: true,
    };

    await storage.set('userSettings', settings);
    console.log('Stored secure settings');

    // Retrieve settings
    const retrieved = await storage.get<SecureSettings>('userSettings');
    if (retrieved !== null) {
      console.log('2FA enabled:', retrieved.twoFactorSecret !== undefined);
      console.log('Encryption mode:', retrieved.encryptionPreference);
      console.log('Backup enabled:', retrieved.backupEnabled);
    }

    // Get stats
    const stats = storage.stats();
    console.log(`Storage: ${stats.count} items, ${stats.iterations} PBKDF2 iterations`);
  } finally {
    storage.destroy();
  }
}

// =============================================================================
// Run All Examples
// =============================================================================

/**
 * Run all encrypted storage examples.
 */
export async function runEncryptedStorageExamples(): Promise<void> {
  console.log('=== Encrypted Storage Examples ===\n');

  await basicUsageExample();
  await credentialManagerExample();
  await errorHandlingExample();
  await changePasswordExample();
  await secureSettingsExample();

  console.log('\n=== Encrypted Storage Examples Complete ===');
}

// Uncomment to run directly
// runEncryptedStorageExamples().catch(console.error);
