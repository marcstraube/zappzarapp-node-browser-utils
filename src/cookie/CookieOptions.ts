/**
 * Cookie Options - Immutable configuration for cookies.
 *
 * Security-first defaults:
 * - Secure: true (HTTPS only)
 * - SameSite: Strict (CSRF protection)
 * - HttpOnly: false (accessible to JS, set true for auth cookies)
 *
 * @example
 * ```TypeScript
 * // Session cookie (expires when browser closes)
 * const session = CookieOptions.session('sessionId');
 *
 * // Persistent cookie (30 days)
 * const persistent = CookieOptions.persistent('prefs', 30);
 *
 * // Custom options with fluent API
 * const custom = CookieOptions.create({ name: 'token' })
 *   .withPath('/api')
 *   .withSameSite('Lax')
 *   .withSecure(true);
 * ```
 */
import { Validator, ValidationError } from '../core';

export type SameSiteValue = 'Strict' | 'Lax' | 'None';

export interface CookieOptionsInput {
  /** Cookie name (required) */
  readonly name: string;
  /** Expiration date or number of days from now */
  readonly expires?: Date | number;
  /** Cookie path (default: '/') */
  readonly path?: string;
  /** Cookie domain */
  readonly domain?: string;
  /** HTTPS only (default: true) */
  readonly secure?: boolean;
  /** SameSite policy (default: 'Strict') */
  readonly sameSite?: SameSiteValue;
}

export class CookieOptions {
  readonly name: string;
  readonly expires: Date | undefined;
  readonly path: string;
  readonly domain: string | undefined;
  readonly secure: boolean;
  readonly sameSite: SameSiteValue;

  private constructor(
    name: string,
    expires: Date | undefined,
    path: string,
    domain: string | undefined,
    secure: boolean,
    sameSite: SameSiteValue
  ) {
    this.name = name;
    this.expires = expires;
    this.path = path;
    this.domain = domain;
    this.secure = secure;
    this.sameSite = sameSite;
  }

  // =========================================================================
  // Factory Methods
  // =========================================================================

  /**
   * Create cookie options with the given configuration.
   * @throws {ValidationError} If name is invalid
   */
  static create(options: CookieOptionsInput): CookieOptions {
    Validator.cookieName(options.name);

    const path = options.path ?? '/';
    CookieOptions.validatePath(path);

    if (options.domain !== undefined) {
      CookieOptions.validateDomain(options.domain);
    }

    let expires: Date | undefined;
    if (options.expires !== undefined) {
      expires =
        typeof options.expires === 'number'
          ? CookieOptions.daysFromNow(options.expires)
          : options.expires;
    }

    return new CookieOptions(
      options.name,
      expires,
      path,
      options.domain,
      options.secure ?? true,
      options.sameSite ?? 'Strict'
    );
  }

  /**
   * Create session cookie options (no expiration).
   * Cookie expires when browser closes.
   */
  static session(name: string): CookieOptions {
    Validator.cookieName(name);
    return new CookieOptions(name, undefined, '/', undefined, true, 'Strict');
  }

  /**
   * Create persistent cookie options.
   * @param name Cookie name
   * @param days Number of days until expiration
   */
  static persistent(name: string, days: number): CookieOptions {
    Validator.cookieName(name);
    return new CookieOptions(name, CookieOptions.daysFromNow(days), '/', undefined, true, 'Strict');
  }

  // =========================================================================
  // Fluent API (returns new instance)
  // =========================================================================

  /**
   * Create new options with different expiration.
   */
  withExpires(expires: Date | number): CookieOptions {
    const expiresDate = typeof expires === 'number' ? CookieOptions.daysFromNow(expires) : expires;
    return new CookieOptions(
      this.name,
      expiresDate,
      this.path,
      this.domain,
      this.secure,
      this.sameSite
    );
  }

  /**
   * Create new options with different path.
   */
  withPath(path: string): CookieOptions {
    return new CookieOptions(
      this.name,
      this.expires,
      path,
      this.domain,
      this.secure,
      this.sameSite
    );
  }

  /**
   * Create new options with different domain.
   */
  withDomain(domain: string): CookieOptions {
    return new CookieOptions(
      this.name,
      this.expires,
      this.path,
      domain,
      this.secure,
      this.sameSite
    );
  }

  /**
   * Create new options with different secure flag.
   */
  withSecure(secure: boolean): CookieOptions {
    return new CookieOptions(
      this.name,
      this.expires,
      this.path,
      this.domain,
      secure,
      this.sameSite
    );
  }

  /**
   * Create new options with different SameSite value.
   */
  withSameSite(sameSite: SameSiteValue): CookieOptions {
    return new CookieOptions(
      this.name,
      this.expires,
      this.path,
      this.domain,
      this.secure,
      sameSite
    );
  }

  // =========================================================================
  // Serialization
  // =========================================================================

  /**
   * Convert options to cookie string attributes (without name=value).
   */
  toAttributeString(): string {
    const parts: string[] = [];

    if (this.expires !== undefined) {
      parts.push(`expires=${this.expires.toUTCString()}`);
    }

    parts.push(`path=${this.path}`);

    if (this.domain !== undefined) {
      parts.push(`domain=${this.domain}`);
    }

    if (this.secure) {
      parts.push('secure');
    }

    parts.push(`samesite=${this.sameSite}`);

    return parts.join('; ');
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  /**
   * Validate cookie path (must start with '/', no semicolons or control chars).
   */
  private static validatePath(path: string): void {
    if (!path.startsWith('/')) {
      throw ValidationError.invalidFormat('cookiePath', path, 'must start with /');
    }
    if (/[;\x00-\x1f\x7f]/.test(path)) {
      throw ValidationError.containsForbiddenChars('cookiePath', path, 'semicolons, control chars');
    }
  }

  /**
   * Validate cookie domain (no semicolons, spaces, or control chars).
   */
  private static validateDomain(domain: string): void {
    if (!domain) {
      throw ValidationError.empty('cookieDomain');
    }
    if (/[;\s\x00-\x1f\x7f]/.test(domain)) {
      throw ValidationError.containsForbiddenChars(
        'cookieDomain',
        domain,
        'semicolons, spaces, control chars'
      );
    }
  }

  private static daysFromNow(days: number): Date {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    return date;
  }
}
