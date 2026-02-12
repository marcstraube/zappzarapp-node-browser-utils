import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CookieManager, CookieOptions } from '../../src/cookie/index.js';
import { CookieError, ValidationError, Result } from '../../src/core/index.js';

/**
 * Mock document.cookie for testing.
 * Simulates browser cookie storage behavior.
 */
function createMockDocumentCookie(): {
  get: () => string;
  set: (value: string) => void;
  clear: () => void;
  store: Map<string, string>;
} {
  const store = new Map<string, string>();

  return {
    store,
    get(): string {
      return Array.from(store.entries())
        .map(([name, value]) => `${name}=${value}`)
        .join('; ');
    },
    set(value: string): void {
      // Parse the cookie string
      const parts = value.split(';');
      const [nameValue, ...attributes] = parts;
      if (!nameValue) return;
      const eqIndex = nameValue.indexOf('=');
      const name = nameValue.substring(0, eqIndex);
      const cookieValue = nameValue.substring(eqIndex + 1);

      // Check for expiration in the past (delete cookie)
      const expiresAttr = attributes.find((a) => a.trim().toLowerCase().startsWith('expires='));
      if (expiresAttr) {
        const expiresValue = expiresAttr.split('=')[1];
        if (!expiresValue) return;
        const expiresDate = new Date(expiresValue);
        if (expiresDate.getTime() <= Date.now()) {
          store.delete(name);
          return;
        }
      }

      store.set(name, cookieValue);
    },
    clear(): void {
      store.clear();
    },
  };
}

describe('CookieManager', () => {
  let mockCookie: ReturnType<typeof createMockDocumentCookie>;
  let originalDocument: PropertyDescriptor | undefined;
  let originalWindow: PropertyDescriptor | undefined;

  beforeEach(() => {
    mockCookie = createMockDocumentCookie();

    // Mock document.cookie
    originalDocument = Object.getOwnPropertyDescriptor(global, 'document');
    Object.defineProperty(global, 'document', {
      value: {
        get cookie() {
          return mockCookie.get();
        },
        set cookie(value: string) {
          mockCookie.set(value);
        },
      },
      writable: true,
      configurable: true,
    });

    // Mock window.location for HTTPS warnings
    originalWindow = Object.getOwnPropertyDescriptor(global, 'window');
    Object.defineProperty(global, 'window', {
      value: {
        location: {
          protocol: 'http:',
        },
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    mockCookie.clear();

    if (originalDocument) {
      Object.defineProperty(global, 'document', originalDocument);
    } else {
      // @ts-expect-error - cleaning up global
      delete global.document;
    }

    if (originalWindow) {
      Object.defineProperty(global, 'window', originalWindow);
    } else {
      // @ts-expect-error - cleaning up global
      delete global.window;
    }

    vi.restoreAllMocks();
  });

  // ===========================================================================
  // CRUD Operations - set()
  // ===========================================================================

  describe('set', () => {
    it('should set a simple cookie', () => {
      CookieManager.set('testCookie', 'testValue');

      expect(mockCookie.store.has(encodeURIComponent('testCookie'))).toBe(true);
      expect(mockCookie.store.get(encodeURIComponent('testCookie'))).toBe(
        encodeURIComponent('testValue')
      );
    });

    it('should set a cookie with CookieOptions instance', () => {
      const options = CookieOptions.create({
        name: 'optionsCookie',
        path: '/api',
        secure: true,
        sameSite: 'Lax',
      });

      CookieManager.set('optionsCookie', 'optionsValue', options);

      expect(mockCookie.store.has(encodeURIComponent('optionsCookie'))).toBe(true);
    });

    it('should set a cookie with plain options object', () => {
      CookieManager.set('plainCookie', 'plainValue', {
        name: 'plainCookie',
        path: '/custom',
      });

      expect(mockCookie.store.has(encodeURIComponent('plainCookie'))).toBe(true);
    });

    it('should use secure defaults when no options provided', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      CookieManager.set('defaultsCookie', 'value');

      expect(mockCookie.store.has(encodeURIComponent('defaultsCookie'))).toBe(true);
      // Should not warn on HTTP
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should encode cookie name and value', () => {
      CookieManager.set('my-cookie', 'value with spaces');

      expect(mockCookie.store.has('my-cookie')).toBe(true);
      expect(mockCookie.store.get('my-cookie')).toBe('value%20with%20spaces');
    });

    it('should overwrite existing cookie', () => {
      CookieManager.set('overwrite', 'initial');
      CookieManager.set('overwrite', 'updated');

      expect(CookieManager.get('overwrite')).toBe('updated');
    });

    it('should throw ValidationError for empty name', () => {
      expect(() => CookieManager.set('', 'value')).toThrow(ValidationError);
    });

    it('should throw ValidationError for name with spaces', () => {
      expect(() => CookieManager.set('cookie name', 'value')).toThrow(ValidationError);
    });

    it('should throw ValidationError for name with separators', () => {
      expect(() => CookieManager.set('cookie;name', 'value')).toThrow(ValidationError);
      expect(() => CookieManager.set('cookie=name', 'value')).toThrow(ValidationError);
    });

    it('should throw ValidationError for name with control characters', () => {
      expect(() => CookieManager.set('cookie\x00name', 'value')).toThrow(ValidationError);
    });

    it('should throw ValidationError for name exceeding max length', () => {
      const longName = 'a'.repeat(257);

      expect(() => CookieManager.set(longName, 'value')).toThrow(ValidationError);
    });

    it('should throw ValidationError for value with semicolons', () => {
      expect(() => CookieManager.set('cookie', 'value;injection')).toThrow(ValidationError);
    });

    it('should throw ValidationError for value with control characters', () => {
      expect(() => CookieManager.set('cookie', 'value\x00')).toThrow(ValidationError);
    });

    it('should throw ValidationError for value exceeding max length', () => {
      const longValue = 'a'.repeat(4097);

      expect(() => CookieManager.set('cookie', longValue)).toThrow(ValidationError);
    });

    it('should allow empty value', () => {
      CookieManager.set('emptyValue', '');

      expect(CookieManager.get('emptyValue')).toBe('');
    });

    it('should throw CookieError when cookies are disabled', () => {
      // Mock isEnabled to return false
      const originalIsEnabled = CookieManager.isEnabled;
      Object.defineProperty(CookieManager, 'isEnabled', {
        value: () => false,
        configurable: true,
      });

      try {
        expect(() => CookieManager.set('cookie', 'value')).toThrow(CookieError);
      } finally {
        Object.defineProperty(CookieManager, 'isEnabled', {
          value: originalIsEnabled,
          configurable: true,
        });
      }
    });
  });

  // ===========================================================================
  // HTTPS Warning
  // ===========================================================================

  describe('HTTPS Warning', () => {
    it('should warn when setting insecure cookie on HTTPS', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      Object.defineProperty(global, 'window', {
        value: {
          location: {
            protocol: 'https:',
          },
        },
        writable: true,
        configurable: true,
      });

      CookieManager.set('insecureCookie', 'value', {
        name: 'insecureCookie',
        secure: false,
      });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Setting insecure cookie'));
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('insecureCookie'));
    });

    it('should not warn when setting secure cookie on HTTPS', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      Object.defineProperty(global, 'window', {
        value: {
          location: {
            protocol: 'https:',
          },
        },
        writable: true,
        configurable: true,
      });

      CookieManager.set('secureCookie', 'value', {
        name: 'secureCookie',
        secure: true,
      });

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should not warn when setting insecure cookie on HTTP', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      Object.defineProperty(global, 'window', {
        value: {
          location: {
            protocol: 'http:',
          },
        },
        writable: true,
        configurable: true,
      });

      CookieManager.set('httpCookie', 'value', {
        name: 'httpCookie',
        secure: false,
      });

      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // CRUD Operations - get()
  // ===========================================================================

  describe('get', () => {
    it('should get an existing cookie value', () => {
      CookieManager.set('getCookie', 'getValue');

      const value = CookieManager.get('getCookie');

      expect(value).toBe('getValue');
    });

    it('should return null for non-existent cookie', () => {
      const value = CookieManager.get('nonExistent');

      expect(value).toBeNull();
    });

    it('should decode URL-encoded values', () => {
      CookieManager.set('encodedCookie', 'value with spaces');

      const value = CookieManager.get('encodedCookie');

      expect(value).toBe('value with spaces');
    });

    it('should throw ValidationError for empty name', () => {
      expect(() => CookieManager.get('')).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid name', () => {
      expect(() => CookieManager.get('cookie name')).toThrow(ValidationError);
    });

    it('should handle multiple cookies', () => {
      CookieManager.set('cookie1', 'value1');
      CookieManager.set('cookie2', 'value2');
      CookieManager.set('cookie3', 'value3');

      expect(CookieManager.get('cookie1')).toBe('value1');
      expect(CookieManager.get('cookie2')).toBe('value2');
      expect(CookieManager.get('cookie3')).toBe('value3');
    });
  });

  // ===========================================================================
  // CRUD Operations - has()
  // ===========================================================================

  describe('has', () => {
    it('should return true for existing cookie', () => {
      CookieManager.set('hasCookie', 'value');

      expect(CookieManager.has('hasCookie')).toBe(true);
    });

    it('should return false for non-existent cookie', () => {
      expect(CookieManager.has('nonExistent')).toBe(false);
    });

    it('should throw ValidationError for empty name', () => {
      expect(() => CookieManager.has('')).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid name', () => {
      expect(() => CookieManager.has('cookie=name')).toThrow(ValidationError);
    });
  });

  // ===========================================================================
  // CRUD Operations - remove()
  // ===========================================================================

  describe('remove', () => {
    it('should remove an existing cookie', () => {
      CookieManager.set('removeCookie', 'value');

      expect(CookieManager.has('removeCookie')).toBe(true);

      CookieManager.remove('removeCookie');

      expect(CookieManager.has('removeCookie')).toBe(false);
    });

    it('should not throw for non-existent cookie', () => {
      expect(() => CookieManager.remove('nonExistent')).not.toThrow();
    });

    it('should throw ValidationError for empty name', () => {
      expect(() => CookieManager.remove('')).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid name', () => {
      expect(() => CookieManager.remove('cookie;name')).toThrow(ValidationError);
    });

    it('should use default path when not specified', () => {
      CookieManager.set('pathCookie', 'value');
      CookieManager.remove('pathCookie');

      expect(CookieManager.has('pathCookie')).toBe(false);
    });

    it('should accept custom path option', () => {
      CookieManager.set('customPathCookie', 'value', { name: 'customPathCookie', path: '/custom' });
      CookieManager.remove('customPathCookie', { path: '/custom' });

      expect(CookieManager.has('customPathCookie')).toBe(false);
    });

    it('should accept custom domain option', () => {
      CookieManager.set('domainCookie', 'value', {
        name: 'domainCookie',
        domain: 'example.com',
      });
      CookieManager.remove('domainCookie', { domain: 'example.com' });

      expect(CookieManager.has('domainCookie')).toBe(false);
    });
  });

  // ===========================================================================
  // CRUD Operations - all()
  // ===========================================================================

  describe('all', () => {
    it('should return empty object when no cookies exist', () => {
      const cookies = CookieManager.all();

      expect(cookies).toEqual({});
    });

    it('should return all cookies as a record', () => {
      CookieManager.set('cookie1', 'value1');
      CookieManager.set('cookie2', 'value2');
      CookieManager.set('cookie3', 'value3');

      const cookies = CookieManager.all();

      expect(cookies).toEqual({
        cookie1: 'value1',
        cookie2: 'value2',
        cookie3: 'value3',
      });
    });

    it('should decode URL-encoded names and values', () => {
      CookieManager.set('my-cookie', 'value with spaces');

      const cookies = CookieManager.all();

      expect(cookies['my-cookie']).toBe('value with spaces');
    });

    it('should handle empty document.cookie', () => {
      const cookies = CookieManager.all();

      expect(cookies).toEqual({});
    });
  });

  // ===========================================================================
  // CRUD Operations - keys()
  // ===========================================================================

  describe('keys', () => {
    it('should return empty array when no cookies exist', () => {
      const keys = CookieManager.keys();

      expect(keys).toEqual([]);
    });

    it('should return all cookie names', () => {
      CookieManager.set('key1', 'value1');
      CookieManager.set('key2', 'value2');
      CookieManager.set('key3', 'value3');

      const keys = CookieManager.keys();

      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
      expect(keys).toHaveLength(3);
    });
  });

  // ===========================================================================
  // CRUD Operations - clear()
  // ===========================================================================

  describe('clear', () => {
    it('should remove all cookies', () => {
      CookieManager.set('clear1', 'value1');
      CookieManager.set('clear2', 'value2');
      CookieManager.set('clear3', 'value3');

      expect(CookieManager.keys()).toHaveLength(3);

      CookieManager.clear();

      expect(CookieManager.keys()).toHaveLength(0);
    });

    it('should not throw when no cookies exist', () => {
      expect(() => CookieManager.clear()).not.toThrow();
    });

    it('should accept custom path option', () => {
      CookieManager.set('pathClear', 'value', { name: 'pathClear', path: '/custom' });

      CookieManager.clear({ path: '/custom' });

      expect(CookieManager.has('pathClear')).toBe(false);
    });

    it('should accept custom domain option', () => {
      CookieManager.set('domainClear', 'value', {
        name: 'domainClear',
        domain: 'example.com',
      });

      CookieManager.clear({ domain: 'example.com' });

      expect(CookieManager.has('domainClear')).toBe(false);
    });
  });

  // ===========================================================================
  // Result Variants - setResult()
  // ===========================================================================

  describe('setResult', () => {
    it('should return Ok for valid cookie', () => {
      const result = CookieManager.setResult('resultCookie', 'resultValue');

      expect(Result.isOk(result)).toBe(true);
      expect(CookieManager.get('resultCookie')).toBe('resultValue');
    });

    it('should return Err for invalid name', () => {
      const result = CookieManager.setResult('', 'value');

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result)).toBeInstanceOf(ValidationError);
    });

    it('should return Err for invalid value', () => {
      const result = CookieManager.setResult('cookie', 'value;injection');

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result)).toBeInstanceOf(ValidationError);
    });

    it('should return Err when cookies are disabled', () => {
      const originalIsEnabled = CookieManager.isEnabled;
      Object.defineProperty(CookieManager, 'isEnabled', {
        value: () => false,
        configurable: true,
      });

      try {
        const result = CookieManager.setResult('cookie', 'value');

        expect(Result.isErr(result)).toBe(true);
        expect(Result.unwrapErr(result)).toBeInstanceOf(CookieError);
        expect((Result.unwrapErr(result) as CookieError).code).toBe('COOKIE_DISABLED');
      } finally {
        Object.defineProperty(CookieManager, 'isEnabled', {
          value: originalIsEnabled,
          configurable: true,
        });
      }
    });

    it('should accept CookieOptions instance', () => {
      const options = CookieOptions.create({ name: 'optionsResult', path: '/api' });
      const result = CookieManager.setResult('optionsResult', 'value', options);

      expect(Result.isOk(result)).toBe(true);
    });

    it('should accept plain options object', () => {
      const result = CookieManager.setResult('plainResult', 'value', {
        name: 'plainResult',
        secure: false,
      });

      expect(Result.isOk(result)).toBe(true);
    });
  });

  // ===========================================================================
  // Result Variants - getResult()
  // ===========================================================================

  describe('getResult', () => {
    it('should return Ok with value for existing cookie', () => {
      CookieManager.set('getResultCookie', 'getValue');

      const result = CookieManager.getResult('getResultCookie');

      expect(Result.isOk(result)).toBe(true);
      expect(Result.unwrap(result)).toBe('getValue');
    });

    it('should return Ok with null for non-existent cookie', () => {
      const result = CookieManager.getResult('nonExistent');

      expect(Result.isOk(result)).toBe(true);
      expect(Result.unwrap(result)).toBeNull();
    });

    it('should return Err for invalid name', () => {
      const result = CookieManager.getResult('');

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result)).toBeInstanceOf(ValidationError);
    });

    it('should return Err for name with forbidden characters', () => {
      const result = CookieManager.getResult('cookie name');

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result)).toBeInstanceOf(ValidationError);
    });
  });

  // ===========================================================================
  // Utility Methods - isEnabled()
  // ===========================================================================

  describe('isEnabled', () => {
    it('should return true when cookies are enabled', () => {
      expect(CookieManager.isEnabled()).toBe(true);
    });

    it('should return false when document is undefined', () => {
      const originalDocument = Object.getOwnPropertyDescriptor(global, 'document');

      // @ts-expect-error - testing undefined document
      delete global.document;

      expect(CookieManager.isEnabled()).toBe(false);

      if (originalDocument) {
        Object.defineProperty(global, 'document', originalDocument);
      }
    });

    it('should return false when setting cookie throws', () => {
      Object.defineProperty(global, 'document', {
        value: {
          get cookie() {
            return '';
          },
          set cookie(_value: string) {
            throw new Error('Cookies disabled');
          },
        },
        writable: true,
        configurable: true,
      });

      expect(CookieManager.isEnabled()).toBe(false);
    });

    it('should clean up test cookie after checking', () => {
      // After isEnabled check, test cookie should be removed
      CookieManager.isEnabled();

      expect(mockCookie.store.has('__cookie_test__')).toBe(false);
    });
  });

  // ===========================================================================
  // Internal Methods - findCookie()
  // ===========================================================================

  describe('findCookie', () => {
    it('should find cookie by name', () => {
      CookieManager.set('findMe', 'foundValue');

      const value = CookieManager.findCookie('findMe');

      expect(value).toBe('foundValue');
    });

    it('should return null for non-existent cookie', () => {
      const value = CookieManager.findCookie('notFound');

      expect(value).toBeNull();
    });

    it('should return null when document is undefined', () => {
      const originalDocument = Object.getOwnPropertyDescriptor(global, 'document');

      // @ts-expect-error - testing undefined document
      delete global.document;

      const value = CookieManager.findCookie('test');

      expect(value).toBeNull();

      if (originalDocument) {
        Object.defineProperty(global, 'document', originalDocument);
      }
    });

    it('should return null when document.cookie is empty', () => {
      // Cookie store is empty by default
      const value = CookieManager.findCookie('empty');

      expect(value).toBeNull();
    });

    it('should handle encoded cookie names', () => {
      CookieManager.set('my-cookie', 'myValue');

      const value = CookieManager.findCookie('my-cookie');

      expect(value).toBe('myValue');
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle cookie value with equals sign', () => {
      CookieManager.set('equalsValue', 'key=value');

      const value = CookieManager.get('equalsValue');

      expect(value).toBe('key=value');
    });

    it('should handle cookie value with special URL-encoded characters', () => {
      CookieManager.set('specialChars', 'hello%20world');

      const value = CookieManager.get('specialChars');

      // The value gets double-encoded and then decoded
      expect(value).toBe('hello%20world');
    });

    it('should handle empty cookie value', () => {
      CookieManager.set('emptyVal', '');

      expect(CookieManager.has('emptyVal')).toBe(true);
      expect(CookieManager.get('emptyVal')).toBe('');
    });

    it('should handle cookie name with underscore', () => {
      CookieManager.set('cookie_name', 'value');

      expect(CookieManager.get('cookie_name')).toBe('value');
    });

    it('should handle cookie name with hyphen', () => {
      CookieManager.set('cookie-name', 'value');

      expect(CookieManager.get('cookie-name')).toBe('value');
    });

    it('should handle cookie name with numbers', () => {
      CookieManager.set('cookie123', 'value');

      expect(CookieManager.get('cookie123')).toBe('value');
    });

    it('should handle Unicode values', () => {
      CookieManager.set('unicodeCookie', 'Hello World');

      expect(CookieManager.get('unicodeCookie')).toBe('Hello World');
    });

    it('should handle value at max length (4096 chars)', () => {
      const maxValue = 'a'.repeat(4096);

      CookieManager.set('maxValueCookie', maxValue);

      expect(CookieManager.get('maxValueCookie')).toBe(maxValue);
    });

    it('should handle name at max length (256 chars)', () => {
      const maxName = 'a'.repeat(256);

      CookieManager.set(maxName, 'value');

      expect(CookieManager.get(maxName)).toBe('value');
    });

    it('should skip empty pairs and pairs without equals in all()', () => {
      // Override document.cookie to return malformed cookie string with empty pairs and no-equals
      Object.defineProperty(global, 'document', {
        value: {
          get cookie() {
            return 'name1=value1; ; noequalspair; name2=value2';
          },
          set cookie(_value: string) {
            // no-op
          },
        },
        writable: true,
        configurable: true,
      });

      const cookies = CookieManager.all();

      expect(cookies['name1']).toBe('value1');
      expect(cookies['name2']).toBe('value2');
      expect(Object.keys(cookies)).toHaveLength(2);
    });

    it('should skip pairs without equals in findCookie()', () => {
      Object.defineProperty(global, 'document', {
        value: {
          get cookie() {
            return 'noequalspair; target=found';
          },
          set cookie(_value: string) {
            // no-op
          },
        },
        writable: true,
        configurable: true,
      });

      expect(CookieManager.findCookie('target')).toBe('found');
    });

    it('should return null from findCookie() when cookie name does not match any pair', () => {
      Object.defineProperty(global, 'document', {
        value: {
          get cookie() {
            return 'other=value; another=val2';
          },
          set cookie(_value: string) {
            // no-op
          },
        },
        writable: true,
        configurable: true,
      });

      expect(CookieManager.findCookie('nonexistent')).toBeNull();
    });
  });

  // ===========================================================================
  // Security Defaults Verification
  // ===========================================================================

  describe('Security Defaults', () => {
    it('should use Secure=true by default', () => {
      // This is verified by checking that no warning is issued on HTTPS
      // when using default options
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      Object.defineProperty(global, 'window', {
        value: {
          location: {
            protocol: 'https:',
          },
        },
        writable: true,
        configurable: true,
      });

      CookieManager.set('secureDefault', 'value');

      // No warning means Secure=true by default
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should use SameSite=Strict by default', () => {
      // Verify through CookieOptions that default is Strict
      const options = CookieOptions.create({ name: 'test' });

      expect(options.sameSite).toBe('Strict');
    });
  });

  // ===========================================================================
  // Document Undefined Scenarios
  // ===========================================================================

  describe('Document Undefined Scenarios', () => {
    it('should handle all() when document is undefined', () => {
      const originalDocument = Object.getOwnPropertyDescriptor(global, 'document');

      // @ts-expect-error - testing undefined document
      delete global.document;

      const cookies = CookieManager.all();

      expect(cookies).toEqual({});

      if (originalDocument) {
        Object.defineProperty(global, 'document', originalDocument);
      }
    });

    it('should handle keys() when document is undefined', () => {
      const originalDocument = Object.getOwnPropertyDescriptor(global, 'document');

      // @ts-expect-error - testing undefined document
      delete global.document;

      const keys = CookieManager.keys();

      expect(keys).toEqual([]);

      if (originalDocument) {
        Object.defineProperty(global, 'document', originalDocument);
      }
    });
  });

  // ===========================================================================
  // Cookie Expiration
  // ===========================================================================

  describe('Cookie Expiration', () => {
    it('should set cookie with expiration date', () => {
      vi.useFakeTimers();
      const now = new Date('2024-06-15T12:00:00Z');
      vi.setSystemTime(now);

      const options = CookieOptions.persistent('expiryCookie', 7);
      CookieManager.set('expiryCookie', 'value', options);

      vi.useRealTimers();

      expect(CookieManager.has('expiryCookie')).toBe(true);
    });

    it('should handle session cookies (no expiration)', () => {
      const options = CookieOptions.session('sessionCookie');
      CookieManager.set('sessionCookie', 'value', options);

      expect(CookieManager.has('sessionCookie')).toBe(true);
    });
  });

  // ===========================================================================
  // Integration with CookieOptions
  // ===========================================================================

  describe('Integration with CookieOptions', () => {
    it('should work with CookieOptions.session()', () => {
      const options = CookieOptions.session('integrationSession');
      CookieManager.set('integrationSession', 'sessionValue', options);

      expect(CookieManager.get('integrationSession')).toBe('sessionValue');
    });

    it('should work with CookieOptions.persistent()', () => {
      const options = CookieOptions.persistent('integrationPersistent', 30);
      CookieManager.set('integrationPersistent', 'persistentValue', options);

      expect(CookieManager.get('integrationPersistent')).toBe('persistentValue');
    });

    it('should work with fluent API options', () => {
      const options = CookieOptions.create({ name: 'fluentCookie' })
        .withPath('/api')
        .withSameSite('Lax')
        .withSecure(false);

      CookieManager.set('fluentCookie', 'fluentValue', options);

      expect(CookieManager.get('fluentCookie')).toBe('fluentValue');
    });
  });
});
