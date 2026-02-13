import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UrlBuilder } from '../../src/url/index.js';
import { UrlError, ValidationError, Result } from '../../src/core/index.js';

describe('UrlBuilder', () => {
  let originalWindow: typeof globalThis.window;

  beforeEach(() => {
    originalWindow = globalThis.window;
  });

  afterEach(() => {
    globalThis.window = originalWindow;
  });

  // ===========================================================================
  // Factory Methods
  // ===========================================================================

  describe('from', () => {
    it('should create UrlBuilder from valid URL string', () => {
      const builder = UrlBuilder.from('https://example.com');

      expect(builder).toBeInstanceOf(UrlBuilder);
      expect(builder.toString()).toBe('https://example.com/');
    });

    it('should create UrlBuilder from URL with path', () => {
      const builder = UrlBuilder.from('https://example.com/api/users');

      expect(builder.pathname).toBe('/api/users');
    });

    it('should create UrlBuilder from URL with query parameters', () => {
      const builder = UrlBuilder.from('https://example.com?page=1&limit=10');

      expect(builder.search).toBe('?page=1&limit=10');
      expect(builder.getParam('page')).toBe('1');
      expect(builder.getParam('limit')).toBe('10');
    });

    it('should create UrlBuilder from URL with hash', () => {
      const builder = UrlBuilder.from('https://example.com#section-1');

      expect(builder.hash).toBe('#section-1');
    });

    it('should create UrlBuilder with base URL', () => {
      const builder = UrlBuilder.from('/api/users', 'https://example.com');

      expect(builder.toString()).toBe('https://example.com/api/users');
    });

    it('should throw ValidationError for invalid URL format', () => {
      // ':::invalid:::' does not match any allowed protocol, so ValidationError is thrown
      expect(() => UrlBuilder.from(':::invalid:::')).toThrow(ValidationError);
    });

    it('should throw ValidationError for javascript: protocol', () => {
      expect(() => UrlBuilder.from('javascript:alert(1)')).toThrow(ValidationError);
    });

    it('should throw ValidationError for data: protocol', () => {
      expect(() => UrlBuilder.from('data:text/html,<script>alert(1)</script>')).toThrow(
        ValidationError
      );
    });

    it('should throw ValidationError for vbscript: protocol', () => {
      expect(() => UrlBuilder.from('vbscript:msgbox("xss")')).toThrow(ValidationError);
    });

    it('should throw ValidationError for empty URL', () => {
      expect(() => UrlBuilder.from('')).toThrow(ValidationError);
    });

    it('should throw UrlError for URL that passes protocol check but fails URL parsing', () => {
      // noinspection HttpUrlsUsage -- intentionally testing invalid HTTP URL
      expect(() => UrlBuilder.from('http://[invalid')).toThrow(UrlError);
    });

    it('should handle URL with port', () => {
      const builder = UrlBuilder.from('https://example.com:8080/api');

      expect(builder.port).toBe('8080');
      expect(builder.host).toBe('example.com:8080');
    });

    it('should handle URL with username and password', () => {
      const builder = UrlBuilder.from('https://user:pass@example.com');

      expect(builder.hostname).toBe('example.com');
    });
  });

  describe('fromResult', () => {
    it('should return Ok for valid URL', () => {
      const result = UrlBuilder.fromResult('https://example.com');

      expect(Result.isOk(result)).toBe(true);
      expect(Result.unwrap(result).toString()).toBe('https://example.com/');
    });

    it('should return Ok with base URL', () => {
      const result = UrlBuilder.fromResult('/api', 'https://example.com');

      expect(Result.isOk(result)).toBe(true);
      expect(Result.unwrap(result).toString()).toBe('https://example.com/api');
    });

    it('should return Err for invalid URL format', () => {
      // ':::invalid:::' does not match any allowed protocol, so ValidationError is returned
      const result = UrlBuilder.fromResult(':::invalid:::');

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result)).toBeInstanceOf(ValidationError);
    });

    it('should return Err for dangerous protocol', () => {
      const result = UrlBuilder.fromResult('javascript:alert(1)');

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result)).toBeInstanceOf(ValidationError);
    });

    it('should return Err for empty URL', () => {
      const result = UrlBuilder.fromResult('');

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result)).toBeInstanceOf(ValidationError);
    });

    it('should not throw on invalid input', () => {
      expect(() => UrlBuilder.fromResult('javascript:evil()')).not.toThrow();
    });

    it('should return Err with UrlError for URL that passes protocol check but fails parsing', () => {
      // noinspection HttpUrlsUsage -- intentionally testing invalid HTTP URL
      const result = UrlBuilder.fromResult('http://[invalid');

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result)).toBeInstanceOf(UrlError);
    });
  });

  describe('current', () => {
    it('should create UrlBuilder from window.location', () => {
      Object.defineProperty(globalThis, 'window', {
        value: {
          location: {
            href: 'https://example.com/page?query=1#hash',
          },
        },
        writable: true,
        configurable: true,
      });

      const builder = UrlBuilder.current();

      expect(builder.toString()).toBe('https://example.com/page?query=1#hash');
    });

    it('should throw Error when not in browser environment', () => {
      // @ts-expect-error - Testing non-browser environment
      globalThis.window = undefined;

      expect(() => UrlBuilder.current()).toThrow(
        'UrlBuilder.current() requires browser environment'
      );
    });

    it('should throw Error when window.location is undefined', () => {
      Object.defineProperty(globalThis, 'window', {
        value: {},
        writable: true,
        configurable: true,
      });

      expect(() => UrlBuilder.current()).toThrow(
        'UrlBuilder.current() requires browser environment'
      );
    });
  });

  describe('currentResult', () => {
    it('should return Ok with current URL in browser environment', () => {
      Object.defineProperty(globalThis, 'window', {
        value: {
          location: {
            href: 'https://example.com/test',
          },
        },
        writable: true,
        configurable: true,
      });

      const result = UrlBuilder.currentResult();

      expect(Result.isOk(result)).toBe(true);
      expect(Result.unwrap(result).toString()).toBe('https://example.com/test');
    });

    it('should return Err when not in browser environment', () => {
      // @ts-expect-error - Testing non-browser environment
      globalThis.window = undefined;

      const result = UrlBuilder.currentResult();

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result)).toBeInstanceOf(UrlError);
    });

    it('should return Err when window.location is undefined', () => {
      Object.defineProperty(globalThis, 'window', {
        value: {},
        writable: true,
        configurable: true,
      });

      const result = UrlBuilder.currentResult();

      expect(Result.isErr(result)).toBe(true);
    });

    it('should not throw on error', () => {
      // @ts-expect-error - Testing non-browser environment
      globalThis.window = undefined;

      expect(() => UrlBuilder.currentResult()).not.toThrow();
    });
  });

  describe('fromURL', () => {
    it('should create UrlBuilder from URL object', () => {
      const url = new URL('https://example.com/path?query=value#hash');
      const builder = UrlBuilder.fromURL(url);

      expect(builder.toString()).toBe('https://example.com/path?query=value#hash');
    });

    it('should create independent copy of URL', () => {
      const url = new URL('https://example.com/path');
      const builder = UrlBuilder.fromURL(url);

      // Modify original URL
      url.pathname = '/changed';

      // Builder should not be affected
      expect(builder.pathname).toBe('/path');
    });
  });

  // ===========================================================================
  // Fluent API
  // ===========================================================================

  describe('withPath', () => {
    it('should set pathname', () => {
      const builder = UrlBuilder.from('https://example.com').withPath('/api/users');

      expect(builder.pathname).toBe('/api/users');
    });

    it('should return new instance (immutable)', () => {
      const original = UrlBuilder.from('https://example.com');
      const modified = original.withPath('/new');

      expect(original.pathname).toBe('/');
      expect(modified.pathname).toBe('/new');
      expect(original).not.toBe(modified);
    });

    it('should preserve other URL components', () => {
      const builder = UrlBuilder.from('https://example.com/old?foo=bar#hash').withPath('/new');

      expect(builder.search).toBe('?foo=bar');
      expect(builder.hash).toBe('#hash');
    });
  });

  describe('withQuery', () => {
    it('should set query string with leading ?', () => {
      const builder = UrlBuilder.from('https://example.com').withQuery('?page=1&limit=10');

      expect(builder.search).toBe('?page=1&limit=10');
    });

    it('should set query string without leading ?', () => {
      const builder = UrlBuilder.from('https://example.com').withQuery('page=1&limit=10');

      expect(builder.search).toBe('?page=1&limit=10');
    });

    it('should replace existing query', () => {
      const builder = UrlBuilder.from('https://example.com?old=value').withQuery('new=value');

      expect(builder.search).toBe('?new=value');
      expect(builder.getParam('old')).toBeNull();
    });

    it('should return new instance (immutable)', () => {
      const original = UrlBuilder.from('https://example.com');
      const modified = original.withQuery('foo=bar');

      expect(original.search).toBe('');
      expect(modified.search).toBe('?foo=bar');
    });
  });

  describe('withParam', () => {
    it('should set a query parameter', () => {
      const builder = UrlBuilder.from('https://example.com').withParam('page', '1');

      expect(builder.getParam('page')).toBe('1');
    });

    it('should replace existing parameter', () => {
      const builder = UrlBuilder.from('https://example.com?page=1').withParam('page', '2');

      expect(builder.getParam('page')).toBe('2');
    });

    it('should be chainable', () => {
      const builder = UrlBuilder.from('https://example.com')
        .withParam('page', '1')
        .withParam('limit', '10')
        .withParam('sort', 'name');

      expect(builder.getParam('page')).toBe('1');
      expect(builder.getParam('limit')).toBe('10');
      expect(builder.getParam('sort')).toBe('name');
    });

    it('should return new instance (immutable)', () => {
      const original = UrlBuilder.from('https://example.com');
      const modified = original.withParam('key', 'value');

      expect(original.hasParam('key')).toBe(false);
      expect(modified.hasParam('key')).toBe(true);
    });
  });

  describe('withAppendedParam', () => {
    it('should append parameter (allow duplicates)', () => {
      const builder = UrlBuilder.from('https://example.com?tag=a').withAppendedParam('tag', 'b');

      expect(builder.getAllParams('tag')).toEqual(['a', 'b']);
    });

    it('should preserve order', () => {
      const builder = UrlBuilder.from('https://example.com')
        .withAppendedParam('tag', 'first')
        .withAppendedParam('tag', 'second')
        .withAppendedParam('tag', 'third');

      expect(builder.getAllParams('tag')).toEqual(['first', 'second', 'third']);
    });

    it('should return new instance (immutable)', () => {
      const original = UrlBuilder.from('https://example.com?tag=a');
      const modified = original.withAppendedParam('tag', 'b');

      expect(original.getAllParams('tag')).toEqual(['a']);
      expect(modified.getAllParams('tag')).toEqual(['a', 'b']);
    });
  });

  describe('withoutParam', () => {
    it('should remove a query parameter', () => {
      const builder = UrlBuilder.from('https://example.com?page=1&limit=10').withoutParam('page');

      expect(builder.hasParam('page')).toBe(false);
      expect(builder.hasParam('limit')).toBe(true);
    });

    it('should remove all values for parameter', () => {
      const builder = UrlBuilder.from('https://example.com?tag=a&tag=b').withoutParam('tag');

      expect(builder.getAllParams('tag')).toEqual([]);
    });

    it('should handle non-existent parameter', () => {
      const builder = UrlBuilder.from('https://example.com?foo=bar').withoutParam('nonexistent');

      expect(builder.search).toBe('?foo=bar');
    });

    it('should return new instance (immutable)', () => {
      const original = UrlBuilder.from('https://example.com?page=1');
      const modified = original.withoutParam('page');

      expect(original.hasParam('page')).toBe(true);
      expect(modified.hasParam('page')).toBe(false);
    });
  });

  describe('withParams', () => {
    it('should set multiple parameters', () => {
      const builder = UrlBuilder.from('https://example.com').withParams({
        page: '1',
        limit: '10',
        sort: 'name',
      });

      expect(builder.getParam('page')).toBe('1');
      expect(builder.getParam('limit')).toBe('10');
      expect(builder.getParam('sort')).toBe('name');
    });

    it('should replace existing parameters', () => {
      const builder = UrlBuilder.from('https://example.com?page=1&old=value').withParams({
        page: '2',
        new: 'value',
      });

      expect(builder.getParam('page')).toBe('2');
      expect(builder.getParam('old')).toBe('value'); // Not replaced
      expect(builder.getParam('new')).toBe('value');
    });

    it('should handle empty object', () => {
      const builder = UrlBuilder.from('https://example.com?foo=bar').withParams({});

      expect(builder.search).toBe('?foo=bar');
    });

    it('should return new instance (immutable)', () => {
      const original = UrlBuilder.from('https://example.com');
      const modified = original.withParams({ key: 'value' });

      expect(original.hasParam('key')).toBe(false);
      expect(modified.hasParam('key')).toBe(true);
    });
  });

  describe('withoutQuery', () => {
    it('should remove all query parameters', () => {
      const builder = UrlBuilder.from('https://example.com?page=1&limit=10').withoutQuery();

      expect(builder.search).toBe('');
    });

    it('should preserve other components', () => {
      const builder = UrlBuilder.from('https://example.com/path?query=1#hash').withoutQuery();

      expect(builder.pathname).toBe('/path');
      expect(builder.hash).toBe('#hash');
    });

    it('should return new instance (immutable)', () => {
      const original = UrlBuilder.from('https://example.com?foo=bar');
      const modified = original.withoutQuery();

      expect(original.search).toBe('?foo=bar');
      expect(modified.search).toBe('');
    });
  });

  describe('withHash', () => {
    it('should set hash with leading #', () => {
      const builder = UrlBuilder.from('https://example.com').withHash('#section-1');

      expect(builder.hash).toBe('#section-1');
    });

    it('should set hash without leading #', () => {
      const builder = UrlBuilder.from('https://example.com').withHash('section-1');

      expect(builder.hash).toBe('#section-1');
    });

    it('should replace existing hash', () => {
      const builder = UrlBuilder.from('https://example.com#old').withHash('new');

      expect(builder.hash).toBe('#new');
    });

    it('should return new instance (immutable)', () => {
      const original = UrlBuilder.from('https://example.com');
      const modified = original.withHash('test');

      expect(original.hash).toBe('');
      expect(modified.hash).toBe('#test');
    });
  });

  describe('withoutHash', () => {
    it('should remove hash', () => {
      const builder = UrlBuilder.from('https://example.com#section').withoutHash();

      expect(builder.hash).toBe('');
    });

    it('should preserve other components', () => {
      const builder = UrlBuilder.from('https://example.com/path?query=1#hash').withoutHash();

      expect(builder.pathname).toBe('/path');
      expect(builder.search).toBe('?query=1');
    });

    it('should return new instance (immutable)', () => {
      const original = UrlBuilder.from('https://example.com#hash');
      const modified = original.withoutHash();

      expect(original.hash).toBe('#hash');
      expect(modified.hash).toBe('');
    });
  });

  describe('withProtocol', () => {
    it('should set protocol with colon', () => {
      const builder = UrlBuilder.from('http://example.com').withProtocol('https:');

      expect(builder.protocol).toBe('https:');
    });

    it('should set protocol without colon', () => {
      const builder = UrlBuilder.from('http://example.com').withProtocol('https');

      expect(builder.protocol).toBe('https:');
    });

    it('should return new instance (immutable)', () => {
      const original = UrlBuilder.from('http://example.com');
      const modified = original.withProtocol('https');

      expect(original.protocol).toBe('http:');
      expect(modified.protocol).toBe('https:');
    });

    it('should throw ValidationError for dangerous protocol', () => {
      const builder = UrlBuilder.from('https://example.com');

      expect(() => builder.withProtocol('javascript')).toThrow(ValidationError);
    });
  });

  describe('withHost', () => {
    it('should set host', () => {
      const builder = UrlBuilder.from('https://old.com').withHost('new.com');

      expect(builder.host).toBe('new.com');
      expect(builder.hostname).toBe('new.com');
    });

    it('should set host with port', () => {
      const builder = UrlBuilder.from('https://example.com').withHost('new.com:8080');

      expect(builder.host).toBe('new.com:8080');
      expect(builder.hostname).toBe('new.com');
      expect(builder.port).toBe('8080');
    });

    it('should return new instance (immutable)', () => {
      const original = UrlBuilder.from('https://old.com');
      const modified = original.withHost('new.com');

      expect(original.hostname).toBe('old.com');
      expect(modified.hostname).toBe('new.com');
    });
  });

  describe('withPort', () => {
    it('should set port as string', () => {
      const builder = UrlBuilder.from('https://example.com').withPort('8080');

      expect(builder.port).toBe('8080');
    });

    it('should set port as number', () => {
      const builder = UrlBuilder.from('https://example.com').withPort(3000);

      expect(builder.port).toBe('3000');
    });

    it('should update host property', () => {
      const builder = UrlBuilder.from('https://example.com').withPort(8080);

      expect(builder.host).toBe('example.com:8080');
    });

    it('should return new instance (immutable)', () => {
      const original = UrlBuilder.from('https://example.com');
      const modified = original.withPort(8080);

      expect(original.port).toBe('');
      expect(modified.port).toBe('8080');
    });
  });

  // ===========================================================================
  // Accessors
  // ===========================================================================

  describe('Accessors', () => {
    const testUrl = 'https://user:pass@example.com:8080/path/to/resource?foo=bar&baz=qux#section';

    it('should return protocol', () => {
      const builder = UrlBuilder.from(testUrl);

      expect(builder.protocol).toBe('https:');
    });

    it('should return hostname', () => {
      const builder = UrlBuilder.from(testUrl);

      expect(builder.hostname).toBe('example.com');
    });

    it('should return host (with port)', () => {
      const builder = UrlBuilder.from(testUrl);

      expect(builder.host).toBe('example.com:8080');
    });

    it('should return port', () => {
      const builder = UrlBuilder.from(testUrl);

      expect(builder.port).toBe('8080');
    });

    it('should return pathname', () => {
      const builder = UrlBuilder.from(testUrl);

      expect(builder.pathname).toBe('/path/to/resource');
    });

    it('should return search', () => {
      const builder = UrlBuilder.from(testUrl);

      expect(builder.search).toBe('?foo=bar&baz=qux');
    });

    it('should return hash', () => {
      const builder = UrlBuilder.from(testUrl);

      expect(builder.hash).toBe('#section');
    });

    it('should return origin', () => {
      const builder = UrlBuilder.from(testUrl);

      expect(builder.origin).toBe('https://example.com:8080');
    });

    it('should return href', () => {
      const builder = UrlBuilder.from('https://example.com/path');

      expect(builder.href).toBe('https://example.com/path');
    });
  });

  describe('getParam', () => {
    it('should return parameter value', () => {
      const builder = UrlBuilder.from('https://example.com?foo=bar');

      expect(builder.getParam('foo')).toBe('bar');
    });

    it('should return null for non-existent parameter', () => {
      const builder = UrlBuilder.from('https://example.com');

      expect(builder.getParam('missing')).toBeNull();
    });

    it('should return first value for multiple values', () => {
      const builder = UrlBuilder.from('https://example.com?tag=a&tag=b');

      expect(builder.getParam('tag')).toBe('a');
    });
  });

  describe('getAllParams', () => {
    it('should return all values for parameter', () => {
      const builder = UrlBuilder.from('https://example.com?tag=a&tag=b&tag=c');

      expect(builder.getAllParams('tag')).toEqual(['a', 'b', 'c']);
    });

    it('should return single value as array', () => {
      const builder = UrlBuilder.from('https://example.com?foo=bar');

      expect(builder.getAllParams('foo')).toEqual(['bar']);
    });

    it('should return empty array for non-existent parameter', () => {
      const builder = UrlBuilder.from('https://example.com');

      expect(builder.getAllParams('missing')).toEqual([]);
    });
  });

  describe('hasParam', () => {
    it('should return true for existing parameter', () => {
      const builder = UrlBuilder.from('https://example.com?foo=bar');

      expect(builder.hasParam('foo')).toBe(true);
    });

    it('should return false for non-existent parameter', () => {
      const builder = UrlBuilder.from('https://example.com?foo=bar');

      expect(builder.hasParam('missing')).toBe(false);
    });

    it('should return true for empty value parameter', () => {
      const builder = UrlBuilder.from('https://example.com?empty=');

      expect(builder.hasParam('empty')).toBe(true);
    });
  });

  describe('params', () => {
    it('should return all parameters as record', () => {
      const builder = UrlBuilder.from('https://example.com?foo=bar&baz=qux');

      expect(builder.params()).toEqual({ foo: 'bar', baz: 'qux' });
    });

    it('should return empty object for no parameters', () => {
      const builder = UrlBuilder.from('https://example.com');

      expect(builder.params()).toEqual({});
    });

    it('should use last value for duplicate parameters', () => {
      const builder = UrlBuilder.from('https://example.com?foo=first&foo=last');

      // URLSearchParams.forEach returns last value when using set semantics
      const params = builder.params();
      expect(params.foo).toBe('last');
    });
  });

  // ===========================================================================
  // Output Methods
  // ===========================================================================

  describe('toString', () => {
    it('should return full URL string', () => {
      const builder = UrlBuilder.from('https://example.com/path?query=value#hash');

      expect(builder.toString()).toBe('https://example.com/path?query=value#hash');
    });

    it('should reflect modifications', () => {
      const builder = UrlBuilder.from('https://example.com')
        .withPath('/api')
        .withParam('page', '1')
        .withHash('section');

      expect(builder.toString()).toBe('https://example.com/api?page=1#section');
    });
  });

  describe('toURL', () => {
    it('should return URL object', () => {
      const builder = UrlBuilder.from('https://example.com/path');

      const url = builder.toURL();

      expect(url).toBeInstanceOf(URL);
      expect(url.href).toBe('https://example.com/path');
    });

    it('should return independent copy', () => {
      const builder = UrlBuilder.from('https://example.com/path');
      const url1 = builder.toURL();
      const url2 = builder.toURL();

      url1.pathname = '/changed';

      expect(url2.pathname).toBe('/path');
    });
  });

  // ===========================================================================
  // Immutability
  // ===========================================================================

  describe('Immutability', () => {
    it('should not modify original when chaining', () => {
      const original = UrlBuilder.from('https://example.com');

      const modified = original.withPath('/path').withParam('key', 'value').withHash('section');

      expect(original.pathname).toBe('/');
      expect(original.search).toBe('');
      expect(original.hash).toBe('');
      expect(modified.pathname).toBe('/path');
      expect(modified.search).toBe('?key=value');
      expect(modified.hash).toBe('#section');
    });

    it('should allow branching from same base', () => {
      const base = UrlBuilder.from('https://example.com');

      const branch1 = base.withPath('/path1');
      const branch2 = base.withPath('/path2');

      expect(base.pathname).toBe('/');
      expect(branch1.pathname).toBe('/path1');
      expect(branch2.pathname).toBe('/path2');
    });
  });

  // ===========================================================================
  // Security Tests
  // ===========================================================================

  describe('Security', () => {
    it('should reject javascript: protocol', () => {
      expect(() => UrlBuilder.from('javascript:alert(document.cookie)')).toThrow(ValidationError);
    });

    it('should reject JavaScript: protocol (case insensitive)', () => {
      expect(() => UrlBuilder.from('JavaScript:alert(1)')).toThrow(ValidationError);
    });

    it('should reject JAVASCRIPT: protocol (uppercase)', () => {
      expect(() => UrlBuilder.from('JAVASCRIPT:alert(1)')).toThrow(ValidationError);
    });

    it('should reject data: protocol', () => {
      expect(() => UrlBuilder.from('data:text/html,<script>alert(1)</script>')).toThrow(
        ValidationError
      );
    });

    it('should reject vbscript: protocol', () => {
      expect(() => UrlBuilder.from('vbscript:execute()')).toThrow(ValidationError);
    });

    it('should allow http: protocol', () => {
      expect(() => UrlBuilder.from('http://example.com')).not.toThrow();
    });

    it('should allow https: protocol', () => {
      expect(() => UrlBuilder.from('https://example.com')).not.toThrow();
    });

    it('should reject file: protocol (not in default allowlist)', () => {
      // file: is not in the default allowed protocols (http, https, ws, wss, mailto, ftp, ftps)
      expect(() => UrlBuilder.from('file:///path/to/file')).toThrow(ValidationError);
    });

    it('should allow ftp: protocol', () => {
      expect(() => UrlBuilder.from('ftp://ftp.example.com')).not.toThrow();
    });

    it('should allow mailto: protocol', () => {
      expect(() => UrlBuilder.from('mailto:user@example.com')).not.toThrow();
    });

    it('should reject tel: protocol (not in default allowlist)', () => {
      // tel: is not in the default allowed protocols (http, https, ws, wss, mailto, ftp, ftps)
      expect(() => UrlBuilder.from('tel:+1234567890')).toThrow(ValidationError);
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle URL with empty path', () => {
      const builder = UrlBuilder.from('https://example.com');

      expect(builder.pathname).toBe('/');
    });

    it('should handle URL with multiple query parameters with same name', () => {
      const builder = UrlBuilder.from('https://example.com?a=1&a=2&a=3');

      expect(builder.getAllParams('a')).toEqual(['1', '2', '3']);
    });

    it('should handle encoded characters in URL', () => {
      const builder = UrlBuilder.from('https://example.com/path%20with%20spaces');

      expect(builder.pathname).toBe('/path%20with%20spaces');
    });

    it('should handle unicode in URL', () => {
      const builder = UrlBuilder.from('https://example.com/path?name=%E4%B8%AD%E6%96%87');

      expect(builder.getParam('name')).toBe('\u4e2d\u6587');
    });

    it('should handle empty query parameter value', () => {
      const builder = UrlBuilder.from('https://example.com?empty=');

      expect(builder.getParam('empty')).toBe('');
    });

    it('should handle special characters in hash', () => {
      const builder = UrlBuilder.from('https://example.com#section-1.2.3');

      expect(builder.hash).toBe('#section-1.2.3');
    });

    it('should handle IPv6 addresses', () => {
      const builder = UrlBuilder.from('https://[::1]:8080/path');

      expect(builder.hostname).toBe('[::1]');
      expect(builder.port).toBe('8080');
    });

    it('should handle localhost', () => {
      const builder = UrlBuilder.from('http://localhost:3000/api');

      expect(builder.hostname).toBe('localhost');
      expect(builder.port).toBe('3000');
    });
  });
});
