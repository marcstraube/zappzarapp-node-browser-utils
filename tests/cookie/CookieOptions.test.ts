import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CookieOptions, type SameSiteValue } from '../../src/cookie/index.js';
import { ValidationError } from '../../src/core/index.js';

describe('CookieOptions', () => {
  // ===========================================================================
  // Factory Methods
  // ===========================================================================

  describe('Factory Methods', () => {
    describe('create', () => {
      it('should create cookie options with minimal input (name only)', () => {
        const options = CookieOptions.create({ name: 'testCookie' });

        expect(options.name).toBe('testCookie');
        expect(options.path).toBe('/');
        expect(options.secure).toBe(true);
        expect(options.sameSite).toBe('Strict');
        expect(options.expires).toBeUndefined();
        expect(options.domain).toBeUndefined();
      });

      it('should create cookie options with all properties', () => {
        const expiresDate = new Date('2025-12-31T23:59:59Z');
        const options = CookieOptions.create({
          name: 'fullCookie',
          expires: expiresDate,
          path: '/api',
          domain: 'example.com',
          secure: false,
          sameSite: 'Lax',
        });

        expect(options.name).toBe('fullCookie');
        expect(options.expires).toEqual(expiresDate);
        expect(options.path).toBe('/api');
        expect(options.domain).toBe('example.com');
        expect(options.secure).toBe(false);
        expect(options.sameSite).toBe('Lax');
      });

      it('should convert numeric expires to Date', () => {
        vi.useFakeTimers();
        const now = new Date('2024-06-15T12:00:00Z');
        vi.setSystemTime(now);

        const options = CookieOptions.create({ name: 'expiryCookie', expires: 7 });

        vi.useRealTimers();

        expect(options.expires).toBeInstanceOf(Date);
        // 7 days from now
        const expectedTime = now.getTime() + 7 * 24 * 60 * 60 * 1000;
        expect(options.expires?.getTime()).toBe(expectedTime);
      });

      it('should use secure=true by default', () => {
        const options = CookieOptions.create({ name: 'secureCookie' });

        expect(options.secure).toBe(true);
      });

      it('should use SameSite=Strict by default', () => {
        const options = CookieOptions.create({ name: 'sameSiteCookie' });

        expect(options.sameSite).toBe('Strict');
      });

      it('should throw ValidationError for empty name', () => {
        expect(() => CookieOptions.create({ name: '' })).toThrow(ValidationError);
      });

      it('should throw ValidationError for name with spaces', () => {
        expect(() => CookieOptions.create({ name: 'cookie name' })).toThrow(ValidationError);
      });

      it('should throw ValidationError for name with separators', () => {
        expect(() => CookieOptions.create({ name: 'cookie;name' })).toThrow(ValidationError);
        expect(() => CookieOptions.create({ name: 'cookie=name' })).toThrow(ValidationError);
        expect(() => CookieOptions.create({ name: 'cookie(name)' })).toThrow(ValidationError);
      });

      it('should throw ValidationError for name with control characters', () => {
        expect(() => CookieOptions.create({ name: 'cookie\x00name' })).toThrow(ValidationError);
        expect(() => CookieOptions.create({ name: 'cookie\nname' })).toThrow(ValidationError);
      });

      it('should throw ValidationError for name exceeding max length', () => {
        const longName = 'a'.repeat(257);

        expect(() => CookieOptions.create({ name: longName })).toThrow(ValidationError);
      });
    });

    describe('session', () => {
      it('should create session cookie without expiration', () => {
        const options = CookieOptions.session('sessionCookie');

        expect(options.name).toBe('sessionCookie');
        expect(options.expires).toBeUndefined();
        expect(options.path).toBe('/');
        expect(options.secure).toBe(true);
        expect(options.sameSite).toBe('Strict');
      });

      it('should throw ValidationError for invalid name', () => {
        expect(() => CookieOptions.session('')).toThrow(ValidationError);
        expect(() => CookieOptions.session('session cookie')).toThrow(ValidationError);
      });
    });

    describe('persistent', () => {
      it('should create persistent cookie with expiration in days', () => {
        vi.useFakeTimers();
        const now = new Date('2024-06-15T12:00:00Z');
        vi.setSystemTime(now);

        const options = CookieOptions.persistent('persistentCookie', 30);

        vi.useRealTimers();

        expect(options.name).toBe('persistentCookie');
        expect(options.expires).toBeInstanceOf(Date);
        // 30 days from now
        const expectedTime = now.getTime() + 30 * 24 * 60 * 60 * 1000;
        expect(options.expires?.getTime()).toBe(expectedTime);
      });

      it('should use secure defaults', () => {
        const options = CookieOptions.persistent('persistentCookie', 7);

        expect(options.secure).toBe(true);
        expect(options.sameSite).toBe('Strict');
        expect(options.path).toBe('/');
      });

      it('should throw ValidationError for invalid name', () => {
        expect(() => CookieOptions.persistent('', 7)).toThrow(ValidationError);
        expect(() => CookieOptions.persistent('cookie name', 7)).toThrow(ValidationError);
      });

      it('should handle zero days (expire immediately)', () => {
        vi.useFakeTimers();
        const now = new Date('2024-06-15T12:00:00Z');
        vi.setSystemTime(now);

        const options = CookieOptions.persistent('zeroDays', 0);

        vi.useRealTimers();

        expect(options.expires?.getTime()).toBe(now.getTime());
      });

      it('should handle negative days (past expiration)', () => {
        vi.useFakeTimers();
        const now = new Date('2024-06-15T12:00:00Z');
        vi.setSystemTime(now);

        const options = CookieOptions.persistent('negativeDays', -1);

        vi.useRealTimers();

        const expectedTime = now.getTime() - 24 * 60 * 60 * 1000;
        expect(options.expires?.getTime()).toBe(expectedTime);
      });
    });
  });

  // ===========================================================================
  // Fluent API (with*() Methods)
  // ===========================================================================

  describe('Fluent API', () => {
    let baseOptions: CookieOptions;

    beforeEach(() => {
      baseOptions = CookieOptions.create({ name: 'testCookie' });
    });

    describe('withExpires', () => {
      it('should return new instance with Date expiration', () => {
        const expiresDate = new Date('2025-12-31T23:59:59Z');
        const newOptions = baseOptions.withExpires(expiresDate);

        expect(newOptions).not.toBe(baseOptions);
        expect(newOptions.expires).toEqual(expiresDate);
        expect(baseOptions.expires).toBeUndefined();
      });

      it('should return new instance with numeric expiration (days)', () => {
        vi.useFakeTimers();
        const now = new Date('2024-06-15T12:00:00Z');
        vi.setSystemTime(now);

        const newOptions = baseOptions.withExpires(14);

        vi.useRealTimers();

        expect(newOptions.expires).toBeInstanceOf(Date);
        const expectedTime = now.getTime() + 14 * 24 * 60 * 60 * 1000;
        expect(newOptions.expires?.getTime()).toBe(expectedTime);
      });

      it('should preserve other properties', () => {
        const customOptions = CookieOptions.create({
          name: 'custom',
          path: '/api',
          domain: 'example.com',
          secure: false,
          sameSite: 'Lax',
        });

        const newOptions = customOptions.withExpires(7);

        expect(newOptions.name).toBe('custom');
        expect(newOptions.path).toBe('/api');
        expect(newOptions.domain).toBe('example.com');
        expect(newOptions.secure).toBe(false);
        expect(newOptions.sameSite).toBe('Lax');
      });
    });

    describe('withPath', () => {
      it('should return new instance with different path', () => {
        const newOptions = baseOptions.withPath('/custom/path');

        expect(newOptions).not.toBe(baseOptions);
        expect(newOptions.path).toBe('/custom/path');
        expect(baseOptions.path).toBe('/');
      });

      it('should preserve other properties', () => {
        const customOptions = CookieOptions.create({
          name: 'custom',
          expires: new Date('2025-01-01'),
          domain: 'example.com',
          secure: false,
          sameSite: 'Lax',
        });

        const newOptions = customOptions.withPath('/new/path');

        expect(newOptions.name).toBe('custom');
        expect(newOptions.expires).toEqual(new Date('2025-01-01'));
        expect(newOptions.domain).toBe('example.com');
        expect(newOptions.secure).toBe(false);
        expect(newOptions.sameSite).toBe('Lax');
      });
    });

    describe('withDomain', () => {
      it('should return new instance with different domain', () => {
        const newOptions = baseOptions.withDomain('subdomain.example.com');

        expect(newOptions).not.toBe(baseOptions);
        expect(newOptions.domain).toBe('subdomain.example.com');
        expect(baseOptions.domain).toBeUndefined();
      });

      it('should preserve other properties', () => {
        const customOptions = CookieOptions.create({
          name: 'custom',
          expires: new Date('2025-01-01'),
          path: '/api',
          secure: false,
          sameSite: 'Lax',
        });

        const newOptions = customOptions.withDomain('api.example.com');

        expect(newOptions.name).toBe('custom');
        expect(newOptions.expires).toEqual(new Date('2025-01-01'));
        expect(newOptions.path).toBe('/api');
        expect(newOptions.secure).toBe(false);
        expect(newOptions.sameSite).toBe('Lax');
      });
    });

    describe('withSecure', () => {
      it('should return new instance with secure=false', () => {
        const newOptions = baseOptions.withSecure(false);

        expect(newOptions).not.toBe(baseOptions);
        expect(newOptions.secure).toBe(false);
        expect(baseOptions.secure).toBe(true);
      });

      it('should return new instance with secure=true', () => {
        const insecureOptions = CookieOptions.create({ name: 'test', secure: false });
        const newOptions = insecureOptions.withSecure(true);

        expect(newOptions.secure).toBe(true);
        expect(insecureOptions.secure).toBe(false);
      });

      it('should preserve other properties', () => {
        const customOptions = CookieOptions.create({
          name: 'custom',
          expires: new Date('2025-01-01'),
          path: '/api',
          domain: 'example.com',
          sameSite: 'Lax',
        });

        const newOptions = customOptions.withSecure(false);

        expect(newOptions.name).toBe('custom');
        expect(newOptions.expires).toEqual(new Date('2025-01-01'));
        expect(newOptions.path).toBe('/api');
        expect(newOptions.domain).toBe('example.com');
        expect(newOptions.sameSite).toBe('Lax');
      });
    });

    describe('withSameSite', () => {
      it('should return new instance with SameSite=Lax', () => {
        const newOptions = baseOptions.withSameSite('Lax');

        expect(newOptions).not.toBe(baseOptions);
        expect(newOptions.sameSite).toBe('Lax');
        expect(baseOptions.sameSite).toBe('Strict');
      });

      it('should return new instance with SameSite=None', () => {
        const newOptions = baseOptions.withSameSite('None');

        expect(newOptions.sameSite).toBe('None');
      });

      it('should return new instance with SameSite=Strict', () => {
        const laxOptions = CookieOptions.create({ name: 'test', sameSite: 'Lax' });
        const newOptions = laxOptions.withSameSite('Strict');

        expect(newOptions.sameSite).toBe('Strict');
        expect(laxOptions.sameSite).toBe('Lax');
      });

      it('should preserve other properties', () => {
        const customOptions = CookieOptions.create({
          name: 'custom',
          expires: new Date('2025-01-01'),
          path: '/api',
          domain: 'example.com',
          secure: false,
        });

        const newOptions = customOptions.withSameSite('None');

        expect(newOptions.name).toBe('custom');
        expect(newOptions.expires).toEqual(new Date('2025-01-01'));
        expect(newOptions.path).toBe('/api');
        expect(newOptions.domain).toBe('example.com');
        expect(newOptions.secure).toBe(false);
      });
    });

    describe('Chaining', () => {
      it('should support method chaining', () => {
        const options = CookieOptions.create({ name: 'chainTest' })
          .withPath('/api')
          .withDomain('example.com')
          .withSecure(true)
          .withSameSite('Lax')
          .withExpires(30);

        expect(options.name).toBe('chainTest');
        expect(options.path).toBe('/api');
        expect(options.domain).toBe('example.com');
        expect(options.secure).toBe(true);
        expect(options.sameSite).toBe('Lax');
        expect(options.expires).toBeInstanceOf(Date);
      });

      it('should not mutate intermediate instances', () => {
        const step1 = CookieOptions.create({ name: 'chain' });
        const step2 = step1.withPath('/api');
        const step3 = step2.withDomain('example.com');

        expect(step1.path).toBe('/');
        expect(step1.domain).toBeUndefined();

        expect(step2.path).toBe('/api');
        expect(step2.domain).toBeUndefined();

        expect(step3.path).toBe('/api');
        expect(step3.domain).toBe('example.com');
      });
    });
  });

  // ===========================================================================
  // Serialization
  // ===========================================================================

  describe('toAttributeString', () => {
    it('should generate attribute string with secure defaults', () => {
      const options = CookieOptions.create({ name: 'test' });
      const attrString = options.toAttributeString();

      expect(attrString).toContain('path=/');
      expect(attrString).toContain('secure');
      expect(attrString).toContain('samesite=Strict');
      expect(attrString).not.toContain('expires=');
      expect(attrString).not.toContain('domain=');
    });

    it('should include expires when set', () => {
      const expiresDate = new Date('2025-12-31T23:59:59Z');
      const options = CookieOptions.create({ name: 'test', expires: expiresDate });
      const attrString = options.toAttributeString();

      expect(attrString).toContain(`expires=${expiresDate.toUTCString()}`);
    });

    it('should include domain when set', () => {
      const options = CookieOptions.create({ name: 'test', domain: 'example.com' });
      const attrString = options.toAttributeString();

      expect(attrString).toContain('domain=example.com');
    });

    it('should not include secure flag when secure=false', () => {
      const options = CookieOptions.create({ name: 'test', secure: false });
      const attrString = options.toAttributeString();

      expect(attrString).not.toContain('secure');
    });

    it('should include custom path', () => {
      const options = CookieOptions.create({ name: 'test', path: '/custom/path' });
      const attrString = options.toAttributeString();

      expect(attrString).toContain('path=/custom/path');
    });

    it('should include custom SameSite value', () => {
      const sameSiteValues: SameSiteValue[] = ['Strict', 'Lax', 'None'];

      for (const sameSite of sameSiteValues) {
        const options = CookieOptions.create({ name: 'test', sameSite });
        const attrString = options.toAttributeString();

        expect(attrString).toContain(`samesite=${sameSite}`);
      }
    });

    it('should generate complete attribute string with all options', () => {
      const expiresDate = new Date('2025-12-31T23:59:59Z');
      const options = CookieOptions.create({
        name: 'fullTest',
        expires: expiresDate,
        path: '/api',
        domain: 'example.com',
        secure: true,
        sameSite: 'Lax',
      });
      const attrString = options.toAttributeString();

      expect(attrString).toContain(`expires=${expiresDate.toUTCString()}`);
      expect(attrString).toContain('path=/api');
      expect(attrString).toContain('domain=example.com');
      expect(attrString).toContain('secure');
      expect(attrString).toContain('samesite=Lax');
    });

    it('should use semicolon-space separator between attributes', () => {
      const options = CookieOptions.create({
        name: 'test',
        path: '/api',
        domain: 'example.com',
      });
      const attrString = options.toAttributeString();

      // Check that attributes are separated by "; "
      const parts = attrString.split('; ');
      expect(parts.length).toBeGreaterThan(1);
    });
  });

  // ===========================================================================
  // Security Defaults
  // ===========================================================================

  describe('Security Defaults', () => {
    it('should have Secure=true by default (HTTPS only)', () => {
      const options = CookieOptions.session('secureTest');

      expect(options.secure).toBe(true);
    });

    it('should have SameSite=Strict by default (CSRF protection)', () => {
      const options = CookieOptions.session('sameSiteTest');

      expect(options.sameSite).toBe('Strict');
    });

    it('should require explicit opt-out for insecure cookies', () => {
      // Default is secure
      const defaultOptions = CookieOptions.create({ name: 'test' });
      expect(defaultOptions.secure).toBe(true);

      // Must explicitly set secure: false
      const insecureOptions = CookieOptions.create({ name: 'test', secure: false });
      expect(insecureOptions.secure).toBe(false);
    });

    it('should use root path by default for consistent cookie scope', () => {
      const options = CookieOptions.session('pathTest');

      expect(options.path).toBe('/');
    });
  });

  // ===========================================================================
  // Immutability
  // ===========================================================================

  describe('Immutability', () => {
    it('should have readonly properties', () => {
      const options = CookieOptions.create({ name: 'readonlyTest' });

      // TypeScript prevents direct assignment, but we can verify the property exists
      expect(options.name).toBe('readonlyTest');
      expect(options.path).toBe('/');
      expect(options.secure).toBe(true);
      expect(options.sameSite).toBe('Strict');
    });

    it('should create new instances when using with* methods', () => {
      const original = CookieOptions.create({ name: 'original' });
      const modified = original.withPath('/new');

      expect(original).not.toBe(modified);
      expect(original.path).toBe('/');
      expect(modified.path).toBe('/new');
    });

    it('should not share references between instances', () => {
      const expires1 = new Date('2025-01-01');
      const options1 = CookieOptions.create({ name: 'test', expires: expires1 });

      const expires2 = new Date('2026-01-01');
      const options2 = options1.withExpires(expires2);

      expect(options1.expires).toEqual(expires1);
      expect(options2.expires).toEqual(expires2);
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle cookie name at max length (256 chars)', () => {
      const maxName = 'a'.repeat(256);
      const options = CookieOptions.create({ name: maxName });

      expect(options.name).toBe(maxName);
      expect(options.name.length).toBe(256);
    });

    it('should reject empty path', () => {
      expect(() => CookieOptions.create({ name: 'test', path: '' })).toThrow('must start with /');
    });

    it('should handle special characters in domain', () => {
      const options = CookieOptions.create({
        name: 'test',
        domain: 'sub-domain.example-site.co.uk',
      });

      expect(options.domain).toBe('sub-domain.example-site.co.uk');
    });

    it('should handle underscore and hyphen in cookie name', () => {
      const options = CookieOptions.create({ name: 'my_cookie-name' });

      expect(options.name).toBe('my_cookie-name');
    });

    it('should handle numeric characters in cookie name', () => {
      const options = CookieOptions.create({ name: 'cookie123' });

      expect(options.name).toBe('cookie123');
    });

    it('should handle very large number of days for expiration', () => {
      vi.useFakeTimers();
      const now = new Date('2024-06-15T12:00:00Z');
      vi.setSystemTime(now);

      const options = CookieOptions.persistent('longLived', 365 * 10); // 10 years

      vi.useRealTimers();

      expect(options.expires).toBeInstanceOf(Date);
      const expectedTime = now.getTime() + 365 * 10 * 24 * 60 * 60 * 1000;
      expect(options.expires?.getTime()).toBe(expectedTime);
    });

    it('should handle Date object with past date', () => {
      const pastDate = new Date('2020-01-01T00:00:00Z');
      const options = CookieOptions.create({ name: 'pastCookie', expires: pastDate });

      expect(options.expires).toEqual(pastDate);
    });
  });
});
