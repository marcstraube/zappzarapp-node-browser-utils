/**
 * Query Parameters - Parse and build URL query strings.
 *
 * Features:
 * - Parse query strings to objects
 * - Build query strings from objects
 * - Handle array parameters
 * - Immutable operations
 *
 * @example
 * ```TypeScript
 * // Parse query string
 * const params = QueryParams.parse('?foo=1&bar=2');
 * // => { foo: '1', bar: '2' }
 *
 * // Build query string
 * const query = QueryParams.stringify({ page: '1', limit: '10' });
 * // => 'page=1&limit=10'
 *
 * // Fluent API
 * const query = QueryParams.create()
 *   .set('page', '1')
 *   .set('limit', '10')
 *   .toString();
 * ```
 */

export type QueryParamValue = string | string[];

export class QueryParams {
  private readonly params: URLSearchParams;

  private constructor(params: URLSearchParams) {
    this.params = params;
  }

  // =========================================================================
  // Factory Methods
  // =========================================================================

  /**
   * Create empty QueryParams.
   */
  static create(): QueryParams {
    return new QueryParams(new URLSearchParams());
  }

  /**
   * Parse query string into QueryParams.
   * @param search Query string (with or without leading ?)
   */
  static parse(search: string): QueryParams {
    const cleaned = search.startsWith('?') ? search.substring(1) : search;
    return new QueryParams(new URLSearchParams(cleaned));
  }

  /**
   * Create QueryParams from current window.location.search.
   */
  static current(): QueryParams {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition -- Browser environment check
    if (typeof window === 'undefined' || !window.location) {
      return QueryParams.create();
    }
    return QueryParams.parse(window.location.search);
  }

  /**
   * Create QueryParams from object.
   */
  static fromObject(obj: Record<string, QueryParamValue>): QueryParams {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value)) {
        for (const v of value) {
          params.append(key, v);
        }
      } else {
        params.set(key, value);
      }
    }

    return new QueryParams(params);
  }

  // =========================================================================
  // Static Utilities
  // =========================================================================

  /**
   * Parse query string to plain object.
   * Multiple values for same key are returned as arrays.
   */
  static toObject(search: string): Record<string, QueryParamValue> {
    const params = QueryParams.parse(search);
    return params.toObject();
  }

  /**
   * Stringify object to query string.
   */
  static stringify(obj: Record<string, QueryParamValue>): string {
    return QueryParams.fromObject(obj).toString();
  }

  // =========================================================================
  // Fluent API (immutable)
  // =========================================================================

  /**
   * Set a parameter (replaces existing).
   */
  set(name: string, value: string): QueryParams {
    const newParams = new URLSearchParams(this.params);
    newParams.set(name, value);
    return new QueryParams(newParams);
  }

  /**
   * Append a parameter (allows duplicates).
   */
  append(name: string, value: string): QueryParams {
    const newParams = new URLSearchParams(this.params);
    newParams.append(name, value);
    return new QueryParams(newParams);
  }

  /**
   * Delete a parameter.
   */
  delete(name: string): QueryParams {
    const newParams = new URLSearchParams(this.params);
    newParams.delete(name);
    return new QueryParams(newParams);
  }

  /**
   * Set multiple parameters.
   */
  setAll(params: Record<string, string>): QueryParams {
    const newParams = new URLSearchParams(this.params);
    for (const [name, value] of Object.entries(params)) {
      newParams.set(name, value);
    }
    return new QueryParams(newParams);
  }

  /**
   * Merge with another QueryParams or object.
   */
  merge(other: QueryParams | Record<string, QueryParamValue>): QueryParams {
    const newParams = new URLSearchParams(this.params);
    const otherObj = other instanceof QueryParams ? other.toObject() : other;

    for (const [key, value] of Object.entries(otherObj)) {
      if (Array.isArray(value)) {
        newParams.delete(key);
        for (const v of value) {
          newParams.append(key, v);
        }
      } else {
        newParams.set(key, value);
      }
    }

    return new QueryParams(newParams);
  }

  /**
   * Clear all parameters.
   */
  clear(): QueryParams {
    return QueryParams.create();
  }

  // =========================================================================
  // Accessors
  // =========================================================================

  /**
   * Get a parameter value.
   */
  get(name: string): string | null {
    return this.params.get(name);
  }

  /**
   * Get all values for a parameter.
   */
  getAll(name: string): string[] {
    return this.params.getAll(name);
  }

  /**
   * Check if a parameter exists.
   */
  has(name: string): boolean {
    return this.params.has(name);
  }

  /**
   * Get all parameter keys.
   */
  keys(): string[] {
    return Array.from(this.params.keys());
  }

  /**
   * Get all parameter values.
   */
  values(): string[] {
    return Array.from(this.params.values());
  }

  /**
   * Get all parameter entries.
   */
  entries(): Array<[string, string]> {
    return Array.from(this.params.entries());
  }

  /**
   * Get number of parameters (including duplicates).
   */
  get size(): number {
    return Array.from(this.params).length;
  }

  /**
   * Check if empty.
   */
  get isEmpty(): boolean {
    return this.size === 0;
  }

  // =========================================================================
  // Output
  // =========================================================================

  /**
   * Convert to query string (without leading ?).
   */
  toString(): string {
    return this.params.toString();
  }

  /**
   * Convert to query string with leading ?.
   */
  toQueryString(): string {
    const str = this.toString();
    return str ? `?${str}` : '';
  }

  /**
   * Convert to plain object.
   * Multiple values for same key are returned as arrays.
   */
  toObject(): Record<string, QueryParamValue> {
    const result: Record<string, QueryParamValue> = {};

    for (const key of this.params.keys()) {
      const values = this.params.getAll(key);
      result[key] = values.length === 1 ? values[0]! : values;
    }

    return result;
  }

  /**
   * Convert to URLSearchParams.
   */
  toURLSearchParams(): URLSearchParams {
    return new URLSearchParams(this.params);
  }

  /**
   * Iterate over entries.
   */
  forEach(callback: (value: string, key: string) => void): void {
    this.params.forEach(callback);
  }

  /**
   * Make iterable.
   */
  [Symbol.iterator](): IterableIterator<[string, string]> {
    return this.params[Symbol.iterator]();
  }
}
