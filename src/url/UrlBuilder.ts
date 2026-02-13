/**
 * URL Builder - Immutable URL construction and manipulation.
 *
 * Features:
 * - Immutable: all methods return new instances
 * - Fluent API for chaining
 * - Security: validates against dangerous protocols
 * - Type-safe URL manipulation
 *
 * @example
 * ```TypeScript
 * // Build from scratch
 * const url = UrlBuilder.from('https://example.com')
 *   .withPath('/api/users')
 *   .withParam('page', '1')
 *   .withParam('limit', '10')
 *   .toString();
 * // => 'https://example.com/api/users?page=1&limit=10'
 *
 * // Modify current URL
 * const current = UrlBuilder.current()
 *   .withoutParam('debug')
 *   .withHash('section-1');
 *
 * // Parse and modify
 * const parsed = UrlBuilder.from(existingUrl)
 *   .withPath('/new-path')
 *   .toURL();
 * ```
 */
import { Result, UrlError, Validator, ValidationError } from '../core/index.js';

export class UrlBuilder {
  private readonly url: URL;

  private constructor(url: URL) {
    this.url = url;
  }

  // =========================================================================
  // Factory Methods
  // =========================================================================

  /**
   * Create UrlBuilder from URL string.
   * @throws {ValidationError} If URL uses dangerous protocol
   * @throws {UrlError} If URL is invalid
   */
  static from(url: string, base?: string): UrlBuilder {
    Validator.urlSafe(url);

    try {
      const parsed = new URL(url, base);
      return new UrlBuilder(parsed);
    } catch {
      throw UrlError.invalidFormat(url);
    }
  }

  /**
   * Create UrlBuilder from URL string with Result (no exceptions).
   */
  static fromResult(url: string, base?: string): Result<UrlBuilder, ValidationError | UrlError> {
    const safeResult = Validator.urlSafeResult(url);
    if (Result.isErr(safeResult)) {
      return safeResult;
    }

    try {
      const parsed = new URL(url, base);
      return Result.ok(new UrlBuilder(parsed));
    } catch {
      return Result.err(UrlError.invalidFormat(url));
    }
  }

  /**
   * Create UrlBuilder from current window.location.
   * @throws {Error} If not in browser environment
   */
  static current(): UrlBuilder {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition -- Browser environment check
    if (typeof window === 'undefined' || !window.location) {
      throw new Error('UrlBuilder.current() requires browser environment');
    }
    return new UrlBuilder(new URL(window.location.href));
  }

  /**
   * Create UrlBuilder from current location with Result.
   */
  static currentResult(): Result<UrlBuilder, UrlError> {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition -- Browser environment check
    if (typeof window === 'undefined' || !window.location) {
      return Result.err(UrlError.navigationFailed(new Error('Not in browser environment')));
    }
    return Result.ok(new UrlBuilder(new URL(window.location.href)));
  }

  /**
   * Create UrlBuilder from URL object.
   */
  static fromURL(url: URL): UrlBuilder {
    return new UrlBuilder(new URL(url.href));
  }

  // =========================================================================
  // Fluent API (returns new instances)
  // =========================================================================

  /**
   * Set the pathname.
   */
  withPath(path: string): UrlBuilder {
    const newUrl = new URL(this.url.href);
    newUrl.pathname = path;
    return new UrlBuilder(newUrl);
  }

  /**
   * Set the entire search/query string.
   */
  withQuery(query: string): UrlBuilder {
    const newUrl = new URL(this.url.href);
    newUrl.search = query.startsWith('?') ? query : `?${query}`;
    return new UrlBuilder(newUrl);
  }

  /**
   * Set or add a query parameter.
   */
  withParam(name: string, value: string): UrlBuilder {
    const newUrl = new URL(this.url.href);
    newUrl.searchParams.set(name, value);
    return new UrlBuilder(newUrl);
  }

  /**
   * Add a query parameter (allows duplicates).
   */
  withAppendedParam(name: string, value: string): UrlBuilder {
    const newUrl = new URL(this.url.href);
    newUrl.searchParams.append(name, value);
    return new UrlBuilder(newUrl);
  }

  /**
   * Remove a query parameter.
   */
  withoutParam(name: string): UrlBuilder {
    const newUrl = new URL(this.url.href);
    newUrl.searchParams.delete(name);
    return new UrlBuilder(newUrl);
  }

  /**
   * Set multiple query parameters.
   */
  withParams(params: Record<string, string>): UrlBuilder {
    const newUrl = new URL(this.url.href);
    for (const [name, value] of Object.entries(params)) {
      newUrl.searchParams.set(name, value);
    }
    return new UrlBuilder(newUrl);
  }

  /**
   * Clear all query parameters.
   */
  withoutQuery(): UrlBuilder {
    const newUrl = new URL(this.url.href);
    newUrl.search = '';
    return new UrlBuilder(newUrl);
  }

  /**
   * Set the hash/fragment.
   */
  withHash(hash: string): UrlBuilder {
    const newUrl = new URL(this.url.href);
    newUrl.hash = hash.startsWith('#') ? hash : `#${hash}`;
    return new UrlBuilder(newUrl);
  }

  /**
   * Remove the hash/fragment.
   */
  withoutHash(): UrlBuilder {
    const newUrl = new URL(this.url.href);
    newUrl.hash = '';
    return new UrlBuilder(newUrl);
  }

  /**
   * Set the protocol.
   */
  withProtocol(protocol: string): UrlBuilder {
    const normalized = protocol.endsWith(':') ? protocol : `${protocol}:`;
    // Validate protocol against allowlist before setting
    Validator.urlSafe(`${normalized}//x`);
    const newUrl = new URL(this.url.href);
    newUrl.protocol = normalized;
    return new UrlBuilder(newUrl);
  }

  /**
   * Set the hostname.
   */
  withHost(host: string): UrlBuilder {
    const newUrl = new URL(this.url.href);
    newUrl.host = host;
    return new UrlBuilder(newUrl);
  }

  /**
   * Set the port.
   */
  withPort(port: string | number): UrlBuilder {
    const newUrl = new URL(this.url.href);
    newUrl.port = String(port);
    return new UrlBuilder(newUrl);
  }

  // =========================================================================
  // Accessors
  // =========================================================================

  /**
   * Get the protocol (e.g., 'https:').
   */
  get protocol(): string {
    return this.url.protocol;
  }

  /**
   * Get the hostname.
   */
  get hostname(): string {
    return this.url.hostname;
  }

  /**
   * Get the host (hostname:port).
   */
  get host(): string {
    return this.url.host;
  }

  /**
   * Get the port.
   */
  get port(): string {
    return this.url.port;
  }

  /**
   * Get the pathname.
   */
  get pathname(): string {
    return this.url.pathname;
  }

  /**
   * Get the search/query string (including ?).
   */
  get search(): string {
    return this.url.search;
  }

  /**
   * Get the hash/fragment (including #).
   */
  get hash(): string {
    return this.url.hash;
  }

  /**
   * Get the origin (protocol + host).
   */
  get origin(): string {
    return this.url.origin;
  }

  /**
   * Get a query parameter value.
   */
  getParam(name: string): string | null {
    return this.url.searchParams.get(name);
  }

  /**
   * Get all values for a query parameter.
   */
  getAllParams(name: string): string[] {
    return this.url.searchParams.getAll(name);
  }

  /**
   * Check if a query parameter exists.
   */
  hasParam(name: string): boolean {
    return this.url.searchParams.has(name);
  }

  /**
   * Get all query parameters as a record.
   */
  params(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of this.url.searchParams) {
      result[key] = value;
    }
    return result;
  }

  // =========================================================================
  // Output
  // =========================================================================

  /**
   * Convert to URL string.
   */
  toString(): string {
    return this.url.href;
  }

  /**
   * Convert to URL object.
   */
  toURL(): URL {
    return new URL(this.url.href);
  }

  /**
   * Get the href.
   */
  get href(): string {
    return this.url.href;
  }
}
