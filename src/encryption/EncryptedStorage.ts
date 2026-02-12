/**
 * Encrypted Storage - Secure localStorage wrapper with AES-GCM encryption.
 *
 * Features:
 * - AES-GCM encryption using Web Crypto API
 * - PBKDF2 key derivation from password
 * - Configurable iterations (default: 600,000)
 * - Unique IV per encryption
 * - Salt storage for key derivation
 * - Same interface as StorageManager (get, set, remove, clear)
 * - Proper cleanup/destroy method
 * - Security-first design
 *
 * @example
 * ```TypeScript
 * // Create encrypted storage
 * const storage = await EncryptedStorage.create({
 *   password: 'secure-password',
 *   prefix: 'myApp',
 * });
 *
 * // Use like regular storage (but async)
 * await storage.set('secret', { apiKey: '...' });
 * const data = await storage.get('secret');
 *
 * // Always destroy when done
 * storage.destroy();
 * ```
 */
import { EncryptionError, Validator, ValidationError } from '../core';

// ============================================================================
// Constants
// ============================================================================

/**
 * Default number of PBKDF2 iterations.
 * Follows OWASP 2023 recommendation for PBKDF2-SHA256.
 */
const DEFAULT_ITERATIONS = 600_000;

/**
 * Minimum allowed iterations for security.
 */
const MIN_ITERATIONS = 10_000;

/**
 * Salt length in bytes.
 */
const SALT_LENGTH = 16;

/**
 * IV (Initialization Vector) length in bytes for AES-GCM.
 */
const IV_LENGTH = 12;

/**
 * AES key length in bits.
 */
const AES_KEY_LENGTH = 256;

/**
 * Storage key suffix for the salt.
 */
const SALT_SUFFIX = '__salt__';

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration options for EncryptedStorage.
 */
export interface EncryptedStorageConfig {
  /**
   * Password for key derivation.
   * Must be at least 12 characters.
   */
  readonly password: string;

  /**
   * Prefix for all storage keys.
   * @default 'encrypted'
   */
  readonly prefix?: string;

  /**
   * Number of PBKDF2 iterations.
   * Higher is more secure but slower.
   * @default 600_000
   */
  readonly iterations?: number;

  /**
   * Minimum number of character classes required in the password.
   * Character classes: lowercase (a-z), uppercase (A-Z), digits (0-9), special characters.
   * Must be between 1 and 4.
   * @default 2
   */
  readonly minCharacterClasses?: number;

  /**
   * Custom storage backend (for testing).
   * @default localStorage
   */
  readonly storage?: Storage;
}

/**
 * Entry format stored in localStorage.
 */
interface EncryptedEntry {
  /** Base64-encoded IV */
  readonly iv: string;
  /** Base64-encoded ciphertext */
  readonly data: string;
  /** Timestamp when entry was stored */
  readonly timestamp: number;
}

/**
 * Statistics about encrypted storage state.
 */
export interface EncryptedStorageStats {
  /** Number of encrypted entries */
  readonly count: number;
  /** Storage key prefix */
  readonly prefix: string;
  /** PBKDF2 iterations used */
  readonly iterations: number;
  /** Whether storage has been destroyed */
  readonly isDestroyed: boolean;
}

/**
 * EncryptedStorage instance interface.
 */
export interface EncryptedStorageInstance {
  /**
   * Store an encrypted value.
   */
  set<T>(key: string, value: T): Promise<void>;

  /**
   * Retrieve and decrypt a value.
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Check if a key exists.
   */
  has(key: string): boolean;

  /**
   * Remove an entry.
   */
  remove(key: string): void;

  /**
   * Remove all entries with this prefix.
   */
  clear(): void;

  /**
   * Get all keys (without prefix).
   */
  keys(): readonly string[];

  /**
   * Get storage statistics.
   */
  stats(): EncryptedStorageStats;

  /**
   * Destroy the instance and clear sensitive data from memory.
   */
  destroy(): void;
}

// ============================================================================
// Implementation
// ============================================================================

export class EncryptedStorage implements EncryptedStorageInstance {
  private readonly storage: Storage;
  private readonly prefix: string;
  private readonly iterations: number;
  private cryptoKey: CryptoKey | null;
  private destroyed: boolean = false;

  private constructor(storage: Storage, prefix: string, iterations: number, cryptoKey: CryptoKey) {
    this.storage = storage;
    this.prefix = prefix;
    this.iterations = iterations;
    this.cryptoKey = cryptoKey;
  }

  // =========================================================================
  // Factory Methods
  // =========================================================================

  /**
   * Create an encrypted storage instance.
   *
   * @param config - Configuration options
   * @returns Promise resolving to EncryptedStorage instance
   * @throws {EncryptionError} When crypto is unavailable or key derivation fails
   * @throws {ValidationError} When configuration is invalid
   */
  static async create(config: EncryptedStorageConfig): Promise<EncryptedStorage> {
    // Validate crypto availability
    if (!EncryptedStorage.isCryptoAvailable()) {
      throw EncryptionError.cryptoUnavailable();
    }

    // Validate config
    EncryptedStorage.validateConfig(config);

    const storage = config.storage ?? EncryptedStorage.getDefaultStorage();
    const prefix = config.prefix ?? 'encrypted';
    const iterations = config.iterations ?? DEFAULT_ITERATIONS;

    // Get or create salt
    const salt = EncryptedStorage.getOrCreateSalt(storage, prefix);

    // Derive key from password
    const cryptoKey = await EncryptedStorage.deriveKey(config.password, salt, iterations);

    return new EncryptedStorage(storage, prefix, iterations, cryptoKey);
  }

  /**
   * Check if Web Crypto API is available.
   */
  static isCryptoAvailable(): boolean {
    const cryptoApi = globalThis.crypto;
    if (typeof cryptoApi === 'undefined') {
      return false;
    }
    return (
      typeof cryptoApi.subtle !== 'undefined' && typeof cryptoApi.getRandomValues === 'function'
    );
  }

  // =========================================================================
  // Public Methods
  // =========================================================================

  /**
   * Store an encrypted value.
   *
   * @param key - Storage key
   * @param value - Value to encrypt and store
   * @throws {EncryptionError} When encryption fails or storage is unavailable
   * @throws {ValidationError} When key is invalid
   */
  async set<T>(key: string, value: T): Promise<void> {
    this.ensureNotDestroyed();
    this.validateKey(key);

    try {
      // Serialize value
      const plaintext = JSON.stringify(value);

      // Generate random IV
      const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

      // Encrypt
      const encodedPlaintext = new TextEncoder().encode(plaintext);
      const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        this.cryptoKey!,
        encodedPlaintext
      );

      // Create entry
      const entry: EncryptedEntry = {
        iv: EncryptedStorage.arrayBufferToBase64(iv),
        data: EncryptedStorage.arrayBufferToBase64(ciphertext),
        timestamp: Date.now(),
      };

      // Store
      const fullKey = this.getFullKey(key);
      try {
        this.storage.setItem(fullKey, JSON.stringify(entry));
      } catch (error) {
        if (EncryptedStorage.isQuotaError(error)) {
          // noinspection ExceptionCaughtLocallyJS
          throw EncryptionError.quotaExceeded(key, error);
        }
        // noinspection ExceptionCaughtLocallyJS
        throw error;
      }
    } catch (error) {
      if (error instanceof EncryptionError) {
        throw error;
      }
      throw EncryptionError.encryptionFailed(key, error);
    }
  }

  /**
   * Retrieve and decrypt a value.
   *
   * @param key - Storage key
   * @returns Decrypted value or null if not found
   * @throws {EncryptionError} When decryption fails
   * @throws {ValidationError} When key is invalid
   */
  async get<T>(key: string): Promise<T | null> {
    this.ensureNotDestroyed();
    this.validateKey(key);

    const fullKey = this.getFullKey(key);
    const raw = this.storage.getItem(fullKey);

    if (raw === null) {
      return null;
    }

    try {
      // Parse entry
      const entry = JSON.parse(raw) as EncryptedEntry;

      // Validate entry format
      if (!EncryptedStorage.isValidEntry(entry)) {
        // noinspection ExceptionCaughtLocallyJS
        throw EncryptionError.invalidDataFormat(key, 'missing required fields');
      }

      // Decode IV and ciphertext
      const ivBytes = EncryptedStorage.base64ToArrayBuffer(entry.iv);
      const ciphertextBytes = EncryptedStorage.base64ToArrayBuffer(entry.data);

      // Decrypt (convert to BufferSource for Web Crypto API)
      const plaintext = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: EncryptedStorage.toBufferSource(ivBytes) },
        this.cryptoKey!,
        EncryptedStorage.toBufferSource(ciphertextBytes)
      );

      // Decode and parse
      const decoded = new TextDecoder().decode(plaintext);
      return JSON.parse(decoded) as T;
    } catch (error) {
      if (error instanceof EncryptionError) {
        throw error;
      }
      throw EncryptionError.decryptionFailed(key, error);
    }
  }

  /**
   * Check if a key exists.
   *
   * @param key - Storage key
   * @returns True if key exists
   * @throws {ValidationError} When key is invalid
   */
  has(key: string): boolean {
    this.ensureNotDestroyed();
    this.validateKey(key);

    const fullKey = this.getFullKey(key);
    return this.storage.getItem(fullKey) !== null;
  }

  /**
   * Remove an entry.
   *
   * @param key - Storage key
   * @throws {ValidationError} When key is invalid
   */
  remove(key: string): void {
    this.ensureNotDestroyed();
    this.validateKey(key);

    const fullKey = this.getFullKey(key);
    this.storage.removeItem(fullKey);
  }

  /**
   * Remove all entries with this prefix (except salt).
   */
  clear(): void {
    this.ensureNotDestroyed();

    const keysToRemove: string[] = [];
    const prefixWithDot = `${this.prefix}.`;
    const saltKey = this.getSaltKey();

    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key !== null && key.startsWith(prefixWithDot) && key !== saltKey) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      this.storage.removeItem(key);
    }
  }

  /**
   * Get all keys (without prefix).
   *
   * @returns Array of keys
   */
  keys(): readonly string[] {
    this.ensureNotDestroyed();

    const result: string[] = [];
    const prefixWithDot = `${this.prefix}.`;

    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key !== null && key.startsWith(prefixWithDot) && !key.endsWith(SALT_SUFFIX)) {
        result.push(key.slice(prefixWithDot.length));
      }
    }

    return result;
  }

  /**
   * Get storage statistics.
   */
  stats(): EncryptedStorageStats {
    return {
      count: this.destroyed ? 0 : this.keys().length,
      prefix: this.prefix,
      iterations: this.iterations,
      isDestroyed: this.destroyed,
    };
  }

  /**
   * Destroy the instance and clear sensitive data from memory.
   * After calling this, the instance cannot be used.
   *
   * **Security:** JavaScript has no mechanism to securely wipe memory. Setting
   * `cryptoKey = null` removes the reference, allowing garbage collection,
   * but the key material may persist in memory until overwritten by the runtime.
   * The key is marked non-extractable, which limits exposure via the Web Crypto API.
   * This is an inherent limitation of the JavaScript runtime, not a code defect.
   */
  destroy(): void {
    // Clear the crypto key reference
    this.cryptoKey = null;
    this.destroyed = true;
  }

  // =========================================================================
  // Private Methods
  // =========================================================================

  private ensureNotDestroyed(): void {
    if (this.destroyed) {
      throw EncryptionError.alreadyDestroyed();
    }
  }

  private validateKey(key: string): void {
    Validator.storageKey(key);
  }

  private getFullKey(key: string): string {
    return `${this.prefix}.${key}`;
  }

  private getSaltKey(): string {
    return `${this.prefix}${SALT_SUFFIX}`;
  }

  // =========================================================================
  // Static Private Methods
  // =========================================================================

  private static validateConfig(config: EncryptedStorageConfig): void {
    // Validate password length
    if (config.password.length < 12) {
      throw ValidationError.invalidFormat('password', '(hidden)', 'at least 12 characters');
    }

    // Validate password character class complexity
    const minClasses = config.minCharacterClasses ?? 2;
    if (!Number.isInteger(minClasses) || minClasses < 1 || minClasses > 4) {
      throw ValidationError.outOfRange('minCharacterClasses', minClasses, 1, 4);
    }

    const classCount = EncryptedStorage.countCharacterClasses(config.password);
    if (classCount < minClasses) {
      throw ValidationError.insufficientComplexity('password', classCount, minClasses);
    }

    // Validate prefix if provided
    if (config.prefix !== undefined) {
      Validator.storagePrefix(config.prefix);
    }

    // Validate iterations if provided
    if (
      config.iterations !== undefined &&
      (!Number.isInteger(config.iterations) || config.iterations < MIN_ITERATIONS)
    ) {
      throw ValidationError.outOfRange('iterations', config.iterations, MIN_ITERATIONS, Infinity);
    }
  }

  /**
   * Count the number of distinct character classes in a string.
   * Classes: lowercase (a-z), uppercase (A-Z), digits (0-9), special characters.
   */
  private static countCharacterClasses(value: string): number {
    let count = 0;
    if (/[a-z]/.test(value)) count++;
    if (/[A-Z]/.test(value)) count++;
    if (/\d/.test(value)) count++;
    if (/[^a-zA-Z\d]/.test(value)) count++;
    return count;
  }

  private static getDefaultStorage(): Storage {
    // Try to access localStorage - this can throw if getter fails
    let storage: Storage;
    try {
      storage = localStorage;
      if (typeof storage === 'undefined') {
        // noinspection ExceptionCaughtLocallyJS
        throw EncryptionError.storageUnavailable('localStorage is not available');
      }
    } catch (error) {
      if (error instanceof EncryptionError) {
        throw error;
      }
      throw EncryptionError.storageUnavailable('localStorage is not available');
    }

    // Test storage availability
    try {
      const testKey = '__encryption_test__';
      storage.setItem(testKey, '1');
      storage.removeItem(testKey);
    } catch {
      throw EncryptionError.storageUnavailable('localStorage is not accessible');
    }

    return storage;
  }

  private static getOrCreateSalt(storage: Storage, prefix: string): Uint8Array {
    const saltKey = `${prefix}${SALT_SUFFIX}`;
    const existingSalt = storage.getItem(saltKey);

    if (existingSalt !== null) {
      try {
        return EncryptedStorage.base64ToArrayBuffer(existingSalt);
      } catch {
        // Salt is corrupted, create new one
      }
    }

    // Generate new salt
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    storage.setItem(saltKey, EncryptedStorage.arrayBufferToBase64(salt));
    return salt;
  }

  private static async deriveKey(
    password: string,
    salt: Uint8Array,
    iterations: number
  ): Promise<CryptoKey> {
    try {
      // Import password as key material (convert to BufferSource for Web Crypto API)
      const passwordBuffer = new TextEncoder().encode(password);
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        EncryptedStorage.toBufferSource(passwordBuffer),
        'PBKDF2',
        false,
        ['deriveKey']
      );

      // Derive AES key (convert salt to BufferSource for Web Crypto API)
      return await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: EncryptedStorage.toBufferSource(salt),
          iterations,
          hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: AES_KEY_LENGTH },
        false, // Not extractable - security best practice
        ['encrypt', 'decrypt']
      );
    } catch (error) {
      throw EncryptionError.keyDerivationFailed(error);
    }
  }

  private static isValidEntry(entry: unknown): entry is EncryptedEntry {
    if (typeof entry !== 'object' || entry === null) {
      return false;
    }

    const obj = entry as Record<string, unknown>;
    return (
      typeof obj.iv === 'string' &&
      typeof obj.data === 'string' &&
      typeof obj.timestamp === 'number'
    );
  }

  private static isQuotaError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    return (
      error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      error.message.toLowerCase().includes('quota')
    );
  }

  private static arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    // Use ArrayBuffer.isView to check if it's a typed array view
    const bytes = ArrayBuffer.isView(buffer)
      ? new Uint8Array(buffer.buffer)
      : new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]!);
    }
    return btoa(binary);
  }

  private static base64ToArrayBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Convert Uint8Array to BufferSource for Web Crypto API compatibility.
   * Required due to TypeScript 5.x stricter ArrayBuffer type checking.
   */
  private static toBufferSource(data: Uint8Array): BufferSource {
    // Create a new ArrayBuffer with the exact content
    const buffer = new ArrayBuffer(data.byteLength);
    new Uint8Array(buffer).set(data);
    return buffer;
  }
}
