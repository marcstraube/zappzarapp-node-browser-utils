/**
 * Cryptographic utilities for secure random ID generation.
 *
 * @example
 * ```TypeScript
 * import { generateUUID, CryptoError } from './core/crypto';
 *
 * try {
 *   const id = generateUUID();
 *   console.log(id); // "550e8400-e29b-41d4-a716-446655440000"
 * } catch (e) {
 *   if (e instanceof CryptoError) {
 *     console.error('Crypto API unavailable');
 *   }
 * }
 * ```
 */

import { BrowserUtilsError } from './errors';

/**
 * Crypto-specific error codes.
 */
export type CryptoErrorCode = 'CRYPTO_UNAVAILABLE';

/**
 * Crypto-specific error.
 */
export class CryptoError extends BrowserUtilsError {
  constructor(
    readonly code: CryptoErrorCode,
    message: string,
    cause?: unknown
  ) {
    super(message, cause);
  }

  static unavailable(): CryptoError {
    return new CryptoError(
      'CRYPTO_UNAVAILABLE',
      'Crypto API is not available. Secure random ID generation requires crypto.randomUUID() or crypto.getRandomValues()'
    );
  }
}

/**
 * Generate a cryptographically secure UUID v4.
 *
 * Uses crypto.randomUUID() when available, falls back to crypto.getRandomValues().
 * Throws CryptoError when neither is available (security-first design).
 *
 * @returns A UUID v4 string (e.g., "550e8400-e29b-41d4-a716-446655440000")
 * @throws {CryptoError} When Crypto API is not available
 *
 * @example
 * ```TypeScript
 * const id = generateUUID();
 * ```
 */
export function generateUUID(): string {
  // Try crypto.randomUUID first (modern browsers)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback using crypto.getRandomValues
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);

    // Format as UUID v4
    const b6 = bytes[6];
    const b8 = bytes[8];
    if (b6 !== undefined && b8 !== undefined) {
      bytes[6] = (b6 & 0x0f) | 0x40; // Version 4
      bytes[8] = (b8 & 0x3f) | 0x80; // Variant 10
    }

    const hex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  // Fail secure: throw error instead of falling back to insecure Math.random()
  throw CryptoError.unavailable();
}
