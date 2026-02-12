import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QueryParams } from '../../src/url/index.js';

describe('QueryParams', () => {
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

  describe('create', () => {
    it('should create empty QueryParams', () => {
      const params = QueryParams.create();

      expect(params.isEmpty).toBe(true);
      expect(params.size).toBe(0);
    });

    it('should create independent instances', () => {
      const params1 = QueryParams.create();
      const params2 = QueryParams.create();

      const modified = params1.set('key', 'value');

      expect(modified.has('key')).toBe(true);
      expect(params2.has('key')).toBe(false);
    });
  });

  describe('parse', () => {
    it('should parse query string with leading ?', () => {
      const params = QueryParams.parse('?foo=bar&baz=qux');

      expect(params.get('foo')).toBe('bar');
      expect(params.get('baz')).toBe('qux');
    });

    it('should parse query string without leading ?', () => {
      const params = QueryParams.parse('foo=bar&baz=qux');

      expect(params.get('foo')).toBe('bar');
      expect(params.get('baz')).toBe('qux');
    });

    it('should handle empty query string', () => {
      const params = QueryParams.parse('');

      expect(params.isEmpty).toBe(true);
    });

    it('should handle query with just ?', () => {
      const params = QueryParams.parse('?');

      expect(params.isEmpty).toBe(true);
    });

    it('should handle multiple values for same key', () => {
      const params = QueryParams.parse('tag=a&tag=b&tag=c');

      expect(params.getAll('tag')).toEqual(['a', 'b', 'c']);
    });

    it('should handle empty values', () => {
      const params = QueryParams.parse('empty=&another=value');

      expect(params.get('empty')).toBe('');
      expect(params.get('another')).toBe('value');
    });

    it('should handle encoded values', () => {
      const params = QueryParams.parse('name=John%20Doe&city=New%20York');

      expect(params.get('name')).toBe('John Doe');
      expect(params.get('city')).toBe('New York');
    });

    it('should handle special characters', () => {
      const params = QueryParams.parse('query=hello%26world&path=%2Ftest');

      expect(params.get('query')).toBe('hello&world');
      expect(params.get('path')).toBe('/test');
    });
  });

  describe('current', () => {
    it('should parse from window.location.search', () => {
      Object.defineProperty(globalThis, 'window', {
        value: {
          location: {
            search: '?page=1&limit=10',
          },
        },
        writable: true,
        configurable: true,
      });

      const params = QueryParams.current();

      expect(params.get('page')).toBe('1');
      expect(params.get('limit')).toBe('10');
    });

    it('should return empty params when not in browser', () => {
      // @ts-expect-error - Testing non-browser environment
      globalThis.window = undefined;

      const params = QueryParams.current();

      expect(params.isEmpty).toBe(true);
    });

    it('should return empty params when window.location undefined', () => {
      Object.defineProperty(globalThis, 'window', {
        value: {},
        writable: true,
        configurable: true,
      });

      const params = QueryParams.current();

      expect(params.isEmpty).toBe(true);
    });
  });

  describe('fromObject', () => {
    it('should create from object with string values', () => {
      const params = QueryParams.fromObject({
        page: '1',
        limit: '10',
        sort: 'name',
      });

      expect(params.get('page')).toBe('1');
      expect(params.get('limit')).toBe('10');
      expect(params.get('sort')).toBe('name');
    });

    it('should create from object with array values', () => {
      const params = QueryParams.fromObject({
        tags: ['a', 'b', 'c'],
      });

      expect(params.getAll('tags')).toEqual(['a', 'b', 'c']);
    });

    it('should handle mixed string and array values', () => {
      const params = QueryParams.fromObject({
        single: 'value',
        multiple: ['a', 'b'],
      });

      expect(params.get('single')).toBe('value');
      expect(params.getAll('multiple')).toEqual(['a', 'b']);
    });

    it('should handle empty object', () => {
      const params = QueryParams.fromObject({});

      expect(params.isEmpty).toBe(true);
    });

    it('should handle empty array value', () => {
      const params = QueryParams.fromObject({
        empty: [],
      });

      expect(params.has('empty')).toBe(false);
    });
  });

  // ===========================================================================
  // Static Utilities
  // ===========================================================================

  describe('toObject (static)', () => {
    it('should parse query string to object', () => {
      const obj = QueryParams.toObject('foo=bar&baz=qux');

      expect(obj).toEqual({ foo: 'bar', baz: 'qux' });
    });

    it('should return arrays for multiple values', () => {
      const obj = QueryParams.toObject('tag=a&tag=b&tag=c');

      expect(obj).toEqual({ tag: ['a', 'b', 'c'] });
    });

    it('should handle mixed single and multiple values', () => {
      const obj = QueryParams.toObject('single=value&multi=a&multi=b');

      expect(obj).toEqual({
        single: 'value',
        multi: ['a', 'b'],
      });
    });
  });

  describe('stringify', () => {
    it('should convert object to query string', () => {
      const query = QueryParams.stringify({
        page: '1',
        limit: '10',
      });

      expect(query).toBe('page=1&limit=10');
    });

    it('should handle array values', () => {
      const query = QueryParams.stringify({
        tags: ['a', 'b'],
      });

      expect(query).toBe('tags=a&tags=b');
    });

    it('should encode special characters', () => {
      const query = QueryParams.stringify({
        name: 'John Doe',
        query: 'hello&world',
      });

      expect(query).toContain('name=John+Doe');
      expect(query).toContain('query=hello%26world');
    });

    it('should handle empty object', () => {
      const query = QueryParams.stringify({});

      expect(query).toBe('');
    });
  });

  // ===========================================================================
  // Fluent API
  // ===========================================================================

  describe('set', () => {
    it('should set a parameter', () => {
      const params = QueryParams.create().set('key', 'value');

      expect(params.get('key')).toBe('value');
    });

    it('should replace existing parameter', () => {
      const params = QueryParams.parse('key=old').set('key', 'new');

      expect(params.get('key')).toBe('new');
    });

    it('should return new instance (immutable)', () => {
      const original = QueryParams.create();
      const modified = original.set('key', 'value');

      expect(original.has('key')).toBe(false);
      expect(modified.has('key')).toBe(true);
      expect(original).not.toBe(modified);
    });

    it('should be chainable', () => {
      const params = QueryParams.create().set('a', '1').set('b', '2').set('c', '3');

      expect(params.get('a')).toBe('1');
      expect(params.get('b')).toBe('2');
      expect(params.get('c')).toBe('3');
    });
  });

  describe('append', () => {
    it('should append parameter (allow duplicates)', () => {
      const params = QueryParams.parse('tag=a').append('tag', 'b');

      expect(params.getAll('tag')).toEqual(['a', 'b']);
    });

    it('should add first value when key does not exist', () => {
      const params = QueryParams.create().append('key', 'value');

      expect(params.get('key')).toBe('value');
    });

    it('should return new instance (immutable)', () => {
      const original = QueryParams.parse('tag=a');
      const modified = original.append('tag', 'b');

      expect(original.getAll('tag')).toEqual(['a']);
      expect(modified.getAll('tag')).toEqual(['a', 'b']);
    });

    it('should preserve order', () => {
      const params = QueryParams.create()
        .append('tag', 'first')
        .append('tag', 'second')
        .append('tag', 'third');

      expect(params.getAll('tag')).toEqual(['first', 'second', 'third']);
    });
  });

  describe('delete', () => {
    it('should delete a parameter', () => {
      const params = QueryParams.parse('foo=bar&baz=qux').delete('foo');

      expect(params.has('foo')).toBe(false);
      expect(params.has('baz')).toBe(true);
    });

    it('should delete all values for a key', () => {
      const params = QueryParams.parse('tag=a&tag=b&tag=c').delete('tag');

      expect(params.getAll('tag')).toEqual([]);
    });

    it('should handle non-existent key', () => {
      const params = QueryParams.parse('foo=bar').delete('missing');

      expect(params.get('foo')).toBe('bar');
    });

    it('should return new instance (immutable)', () => {
      const original = QueryParams.parse('foo=bar');
      const modified = original.delete('foo');

      expect(original.has('foo')).toBe(true);
      expect(modified.has('foo')).toBe(false);
    });
  });

  describe('setAll', () => {
    it('should set multiple parameters', () => {
      const params = QueryParams.create().setAll({
        a: '1',
        b: '2',
        c: '3',
      });

      expect(params.get('a')).toBe('1');
      expect(params.get('b')).toBe('2');
      expect(params.get('c')).toBe('3');
    });

    it('should replace existing parameters', () => {
      const params = QueryParams.parse('a=old').setAll({
        a: 'new',
        b: 'value',
      });

      expect(params.get('a')).toBe('new');
      expect(params.get('b')).toBe('value');
    });

    it('should handle empty object', () => {
      const params = QueryParams.parse('foo=bar').setAll({});

      expect(params.get('foo')).toBe('bar');
    });

    it('should return new instance (immutable)', () => {
      const original = QueryParams.create();
      const modified = original.setAll({ key: 'value' });

      expect(original.has('key')).toBe(false);
      expect(modified.has('key')).toBe(true);
    });
  });

  describe('merge', () => {
    it('should merge with another QueryParams', () => {
      const params1 = QueryParams.parse('a=1');
      const params2 = QueryParams.parse('b=2');

      const merged = params1.merge(params2);

      expect(merged.get('a')).toBe('1');
      expect(merged.get('b')).toBe('2');
    });

    it('should merge with object', () => {
      const params = QueryParams.parse('a=1').merge({
        b: '2',
        c: '3',
      });

      expect(params.get('a')).toBe('1');
      expect(params.get('b')).toBe('2');
      expect(params.get('c')).toBe('3');
    });

    it('should handle array values in merge', () => {
      const params = QueryParams.parse('a=1').merge({
        tags: ['x', 'y', 'z'],
      });

      expect(params.getAll('tags')).toEqual(['x', 'y', 'z']);
    });

    it('should replace values when merging', () => {
      const params = QueryParams.parse('a=1&tags=old').merge({
        a: '2',
        tags: ['new1', 'new2'],
      });

      expect(params.get('a')).toBe('2');
      expect(params.getAll('tags')).toEqual(['new1', 'new2']);
    });

    it('should return new instance (immutable)', () => {
      const original = QueryParams.parse('a=1');
      const merged = original.merge({ b: '2' });

      expect(original.has('b')).toBe(false);
      expect(merged.has('b')).toBe(true);
    });
  });

  describe('clear', () => {
    it('should remove all parameters', () => {
      const params = QueryParams.parse('a=1&b=2&c=3').clear();

      expect(params.isEmpty).toBe(true);
      expect(params.size).toBe(0);
    });

    it('should return new instance', () => {
      const original = QueryParams.parse('foo=bar');
      const cleared = original.clear();

      expect(original.has('foo')).toBe(true);
      expect(cleared.has('foo')).toBe(false);
    });
  });

  // ===========================================================================
  // Accessors
  // ===========================================================================

  describe('get', () => {
    it('should return parameter value', () => {
      const params = QueryParams.parse('foo=bar');

      expect(params.get('foo')).toBe('bar');
    });

    it('should return null for non-existent parameter', () => {
      const params = QueryParams.create();

      expect(params.get('missing')).toBeNull();
    });

    it('should return first value for multiple values', () => {
      const params = QueryParams.parse('tag=first&tag=second');

      expect(params.get('tag')).toBe('first');
    });
  });

  describe('getAll', () => {
    it('should return all values for parameter', () => {
      const params = QueryParams.parse('tag=a&tag=b&tag=c');

      expect(params.getAll('tag')).toEqual(['a', 'b', 'c']);
    });

    it('should return single value as array', () => {
      const params = QueryParams.parse('foo=bar');

      expect(params.getAll('foo')).toEqual(['bar']);
    });

    it('should return empty array for non-existent parameter', () => {
      const params = QueryParams.create();

      expect(params.getAll('missing')).toEqual([]);
    });
  });

  describe('has', () => {
    it('should return true for existing parameter', () => {
      const params = QueryParams.parse('foo=bar');

      expect(params.has('foo')).toBe(true);
    });

    it('should return false for non-existent parameter', () => {
      const params = QueryParams.create();

      expect(params.has('missing')).toBe(false);
    });

    it('should return true for parameter with empty value', () => {
      const params = QueryParams.parse('empty=');

      expect(params.has('empty')).toBe(true);
    });
  });

  describe('keys', () => {
    it('should return all unique keys', () => {
      const params = QueryParams.parse('a=1&b=2&c=3');

      expect(params.keys()).toEqual(['a', 'b', 'c']);
    });

    it('should include keys with multiple values once each', () => {
      const params = QueryParams.parse('tag=a&tag=b&single=value');
      const keys = params.keys();

      // Keys includes tag twice because of how URLSearchParams.keys() works
      expect(keys).toContain('tag');
      expect(keys).toContain('single');
    });

    it('should return empty array for empty params', () => {
      const params = QueryParams.create();

      expect(params.keys()).toEqual([]);
    });
  });

  describe('values', () => {
    it('should return all values', () => {
      const params = QueryParams.parse('a=1&b=2&c=3');

      expect(params.values()).toEqual(['1', '2', '3']);
    });

    it('should include all values for duplicate keys', () => {
      const params = QueryParams.parse('tag=a&tag=b');

      expect(params.values()).toEqual(['a', 'b']);
    });

    it('should return empty array for empty params', () => {
      const params = QueryParams.create();

      expect(params.values()).toEqual([]);
    });
  });

  describe('entries', () => {
    it('should return all entries', () => {
      const params = QueryParams.parse('a=1&b=2');

      expect(params.entries()).toEqual([
        ['a', '1'],
        ['b', '2'],
      ]);
    });

    it('should include all entries for duplicate keys', () => {
      const params = QueryParams.parse('tag=a&tag=b');

      expect(params.entries()).toEqual([
        ['tag', 'a'],
        ['tag', 'b'],
      ]);
    });

    it('should return empty array for empty params', () => {
      const params = QueryParams.create();

      expect(params.entries()).toEqual([]);
    });
  });

  describe('size', () => {
    it('should return number of parameters', () => {
      const params = QueryParams.parse('a=1&b=2&c=3');

      expect(params.size).toBe(3);
    });

    it('should count duplicate keys separately', () => {
      const params = QueryParams.parse('tag=a&tag=b&tag=c');

      expect(params.size).toBe(3);
    });

    it('should return 0 for empty params', () => {
      const params = QueryParams.create();

      expect(params.size).toBe(0);
    });
  });

  describe('isEmpty', () => {
    it('should return true for empty params', () => {
      const params = QueryParams.create();

      expect(params.isEmpty).toBe(true);
    });

    it('should return false for non-empty params', () => {
      const params = QueryParams.parse('foo=bar');

      expect(params.isEmpty).toBe(false);
    });
  });

  // ===========================================================================
  // Output Methods
  // ===========================================================================

  describe('toString', () => {
    it('should return query string without leading ?', () => {
      const params = QueryParams.parse('foo=bar&baz=qux');

      expect(params.toString()).toBe('foo=bar&baz=qux');
    });

    it('should return empty string for empty params', () => {
      const params = QueryParams.create();

      expect(params.toString()).toBe('');
    });

    it('should encode special characters', () => {
      const params = QueryParams.create().set('name', 'John Doe');

      expect(params.toString()).toBe('name=John+Doe');
    });
  });

  describe('toQueryString', () => {
    it('should return query string with leading ?', () => {
      const params = QueryParams.parse('foo=bar');

      expect(params.toQueryString()).toBe('?foo=bar');
    });

    it('should return empty string for empty params', () => {
      const params = QueryParams.create();

      expect(params.toQueryString()).toBe('');
    });
  });

  describe('toObject', () => {
    it('should convert to plain object', () => {
      const params = QueryParams.parse('foo=bar&baz=qux');

      expect(params.toObject()).toEqual({
        foo: 'bar',
        baz: 'qux',
      });
    });

    it('should return arrays for multiple values', () => {
      const params = QueryParams.parse('tag=a&tag=b&single=value');

      expect(params.toObject()).toEqual({
        tag: ['a', 'b'],
        single: 'value',
      });
    });

    it('should return empty object for empty params', () => {
      const params = QueryParams.create();

      expect(params.toObject()).toEqual({});
    });
  });

  describe('toURLSearchParams', () => {
    it('should return URLSearchParams object', () => {
      const params = QueryParams.parse('foo=bar&baz=qux');

      const urlParams = params.toURLSearchParams();

      expect(urlParams).toBeInstanceOf(URLSearchParams);
      expect(urlParams.get('foo')).toBe('bar');
      expect(urlParams.get('baz')).toBe('qux');
    });

    it('should return independent copy', () => {
      const params = QueryParams.parse('foo=bar');
      const urlParams1 = params.toURLSearchParams();
      const urlParams2 = params.toURLSearchParams();

      urlParams1.set('foo', 'changed');

      expect(urlParams2.get('foo')).toBe('bar');
    });
  });

  // ===========================================================================
  // Iteration
  // ===========================================================================

  describe('forEach', () => {
    it('should iterate over all entries', () => {
      const params = QueryParams.parse('a=1&b=2&c=3');
      const entries: Array<[string, string]> = [];

      params.forEach((value, key) => {
        entries.push([key, value]);
      });

      expect(entries).toEqual([
        ['a', '1'],
        ['b', '2'],
        ['c', '3'],
      ]);
    });

    it('should iterate over duplicate keys', () => {
      const params = QueryParams.parse('tag=a&tag=b');
      const values: string[] = [];

      params.forEach((value) => {
        values.push(value);
      });

      expect(values).toEqual(['a', 'b']);
    });
  });

  describe('Symbol.iterator', () => {
    it('should be iterable with for...of', () => {
      const params = QueryParams.parse('a=1&b=2');
      const entries: Array<[string, string]> = [];

      for (const entry of params) {
        entries.push(entry);
      }

      expect(entries).toEqual([
        ['a', '1'],
        ['b', '2'],
      ]);
    });

    it('should work with spread operator', () => {
      const params = QueryParams.parse('a=1&b=2');

      const entries = [...params];

      expect(entries).toEqual([
        ['a', '1'],
        ['b', '2'],
      ]);
    });

    it('should work with Array.from', () => {
      const params = QueryParams.parse('a=1&b=2');

      const entries = Array.from(params);

      expect(entries).toEqual([
        ['a', '1'],
        ['b', '2'],
      ]);
    });
  });

  // ===========================================================================
  // Immutability
  // ===========================================================================

  describe('Immutability', () => {
    it('should not modify original when chaining', () => {
      const original = QueryParams.parse('a=1');

      const modified = original.set('b', '2').append('c', '3').delete('a');

      expect(original.get('a')).toBe('1');
      expect(original.has('b')).toBe(false);
      expect(original.has('c')).toBe(false);
      expect(modified.has('a')).toBe(false);
      expect(modified.get('b')).toBe('2');
      expect(modified.get('c')).toBe('3');
    });

    it('should allow branching from same base', () => {
      const base = QueryParams.parse('base=value');

      const branch1 = base.set('key', 'value1');
      const branch2 = base.set('key', 'value2');

      expect(branch1.get('key')).toBe('value1');
      expect(branch2.get('key')).toBe('value2');
      expect(base.has('key')).toBe(false);
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle plus signs in values', () => {
      const params = QueryParams.parse('q=hello+world');

      expect(params.get('q')).toBe('hello world');
    });

    it('should handle equals signs in values', () => {
      const params = QueryParams.parse('equation=a%3Db%3Dc');

      expect(params.get('equation')).toBe('a=b=c');
    });

    it('should handle ampersands in values', () => {
      const params = QueryParams.parse('text=a%26b');

      expect(params.get('text')).toBe('a&b');
    });

    it('should handle unicode characters', () => {
      const params = QueryParams.parse('name=%E4%B8%AD%E6%96%87');

      expect(params.get('name')).toBe('\u4e2d\u6587');
    });

    it('should handle very long values', () => {
      const longValue = 'x'.repeat(10000);
      const params = QueryParams.create().set('long', longValue);

      expect(params.get('long')).toBe(longValue);
    });

    it('should handle many parameters', () => {
      const obj: Record<string, string> = {};
      for (let i = 0; i < 100; i++) {
        obj[`key${i}`] = `value${i}`;
      }
      const params = QueryParams.fromObject(obj);

      expect(params.size).toBe(100);
      expect(params.get('key50')).toBe('value50');
    });

    it('should handle keys with dots', () => {
      const params = QueryParams.parse('user.name=John');

      expect(params.get('user.name')).toBe('John');
    });

    it('should handle keys with brackets', () => {
      const params = QueryParams.parse('items%5B0%5D=first');

      expect(params.get('items[0]')).toBe('first');
    });
  });
});
