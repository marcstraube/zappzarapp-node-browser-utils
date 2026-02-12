/**
 * CspUtils Tests.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CspUtils } from '../../src/csp/index.js';
import { CryptoError } from '../../src/core/index.js';

describe('CspUtils', () => {
  describe('allowsInlineScript', () => {
    beforeEach(() => {
      CspUtils.clearCache();
    });

    it('should return false when document is undefined', () => {
      const originalDocument = globalThis.document;
      // @ts-expect-error - Testing undefined
      delete globalThis.document;

      const result = CspUtils.allowsInlineScript();

      expect(result).toBe(false);

      globalThis.document = originalDocument;
    });

    it('should return false and set cache when document is undefined (cache path)', () => {
      const originalDocument = globalThis.document;
      // @ts-expect-error - Testing undefined
      delete globalThis.document;

      // First call - should set cache
      const result1 = CspUtils.allowsInlineScript();
      expect(result1).toBe(false);

      // Second call - should use cached value
      const result2 = CspUtils.allowsInlineScript();
      expect(result2).toBe(false);

      globalThis.document = originalDocument;
    });

    it('should return false when inline script throws error', () => {
      // Mock document.createElement to throw
      const originalCreateElement = document.createElement;
      document.createElement = () => {
        throw new Error('CSP blocked');
      };

      const result = CspUtils.allowsInlineScript();

      expect(result).toBe(false);

      document.createElement = originalCreateElement;
    });

    it('should cache results', () => {
      // First call
      const result1 = CspUtils.allowsInlineScript();
      // Second call should use cache
      const result2 = CspUtils.allowsInlineScript();

      expect(result1).toBe(result2);
    });
  });

  describe('allowsEval', () => {
    beforeEach(() => {
      CspUtils.clearCache();
    });

    it('should return true when Function constructor works', () => {
      const result = CspUtils.allowsEval();

      // In test environment, eval should be allowed
      expect(result).toBe(true);
    });

    it('should cache results', () => {
      const result1 = CspUtils.allowsEval();
      const result2 = CspUtils.allowsEval();

      expect(result1).toBe(result2);
    });

    it('should return false when Function constructor throws', () => {
      // Mock Function constructor to throw
      const OriginalFunction = globalThis.Function;
      // @ts-expect-error - Mocking Function constructor
      globalThis.Function = function () {
        throw new Error('CSP blocked');
      };

      const result = CspUtils.allowsEval();

      expect(result).toBe(false);

      globalThis.Function = OriginalFunction;
    });
  });

  describe('allowsInlineStyle', () => {
    beforeEach(() => {
      CspUtils.clearCache();
    });

    it('should return false when document is undefined', () => {
      const originalDocument = globalThis.document;
      // @ts-expect-error - Testing undefined
      delete globalThis.document;

      const result = CspUtils.allowsInlineStyle();

      expect(result).toBe(false);

      globalThis.document = originalDocument;
    });

    it('should return false and set cache when document is undefined (cache path)', () => {
      const originalDocument = globalThis.document;
      // @ts-expect-error - Testing undefined
      delete globalThis.document;

      // First call - should set cache
      const result1 = CspUtils.allowsInlineStyle();
      expect(result1).toBe(false);

      // Second call - should use cached value
      const result2 = CspUtils.allowsInlineStyle();
      expect(result2).toBe(false);

      globalThis.document = originalDocument;
    });

    it('should return false when inline style throws error', () => {
      // Mock document.createElement to throw
      const originalCreateElement = document.createElement;
      document.createElement = () => {
        throw new Error('CSP blocked');
      };

      const result = CspUtils.allowsInlineStyle();

      expect(result).toBe(false);

      document.createElement = originalCreateElement;
    });

    it('should cache results', () => {
      const result1 = CspUtils.allowsInlineStyle();
      const result2 = CspUtils.allowsInlineStyle();

      expect(result1).toBe(result2);
    });
  });

  describe('clearCache', () => {
    it('should reset all cache values', () => {
      // First, populate the cache
      CspUtils.allowsEval();
      CspUtils.clearCache();

      // After clearing, allowsEval should run the check again
      // (we can't directly test cache state, but we can test it works)
      const result = CspUtils.allowsEval();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('generateNonce', () => {
    it('should generate a base64 string', () => {
      const nonce = CspUtils.generateNonce();

      expect(typeof nonce).toBe('string');
      expect(nonce.length).toBeGreaterThan(0);
    });

    it('should generate different nonces each time', () => {
      const nonce1 = CspUtils.generateNonce();
      const nonce2 = CspUtils.generateNonce();

      expect(nonce1).not.toBe(nonce2);
    });

    it('should accept custom length', () => {
      const nonce8 = CspUtils.generateNonce(8);
      const nonce32 = CspUtils.generateNonce(32);

      // Base64 encoding: 8 bytes = ~11 chars, 32 bytes = ~43 chars
      expect(nonce8.length).toBeLessThan(nonce32.length);
    });

    it('should throw CryptoError when crypto is not available', () => {
      const { crypto } = globalThis;
      try {
        // @ts-expect-error - Testing undefined
        delete globalThis.crypto;

        expect(() => CspUtils.generateNonce()).toThrow(CryptoError);
      } finally {
        globalThis.crypto = crypto;
      }
    });
  });

  describe('calculateHash', () => {
    it('should return sha256 hash for content', async () => {
      const hash = await CspUtils.calculateHash('console.log("test")');

      expect(hash).toBeDefined();
      expect(hash).toMatch(/^sha256-[A-Za-z0-9+/]+=*$/);
    });

    it('should return consistent hash for same content', async () => {
      const hash1 = await CspUtils.calculateHash('test content');
      const hash2 = await CspUtils.calculateHash('test content');

      expect(hash1).toBe(hash2);
    });

    it('should return different hashes for different content', async () => {
      const hash1 = await CspUtils.calculateHash('content1');
      const hash2 = await CspUtils.calculateHash('content2');

      expect(hash1).not.toBe(hash2);
    });

    it('should return undefined when crypto.subtle is not available', async () => {
      const originalCrypto = globalThis.crypto;
      // @ts-expect-error - Mock crypto without subtle
      globalThis.crypto = { getRandomValues: originalCrypto.getRandomValues };

      const hash = await CspUtils.calculateHash('test');

      expect(hash).toBeUndefined();

      globalThis.crypto = originalCrypto;
    });

    it('should return undefined when digest throws an error', async () => {
      const originalCrypto = globalThis.crypto;
      const mockSubtle = {
        digest: vi.fn().mockRejectedValue(new Error('Digest failed')),
      } as unknown as SubtleCrypto;
      globalThis.crypto = {
        getRandomValues: originalCrypto.getRandomValues.bind(originalCrypto),
        subtle: mockSubtle,
      } as Crypto;

      const hash = await CspUtils.calculateHash('test');

      expect(hash).toBeUndefined();

      globalThis.crypto = originalCrypto;
    });
  });

  describe('onViolation', () => {
    it('should return noop when document is undefined', () => {
      const originalDocument = globalThis.document;
      // @ts-expect-error - Testing undefined
      delete globalThis.document;

      const handler = vi.fn();
      const cleanup = CspUtils.onViolation(handler);

      expect(typeof cleanup).toBe('function');
      cleanup(); // Should not throw

      globalThis.document = originalDocument;
    });

    it('should register event listener', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
      const handler = vi.fn();

      CspUtils.onViolation(handler);

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'securitypolicyviolation',
        expect.any(Function)
      );

      addEventListenerSpy.mockRestore();
    });

    it('should return cleanup function that removes listener', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
      const handler = vi.fn();

      const cleanup = CspUtils.onViolation(handler);
      cleanup();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'securitypolicyviolation',
        expect.any(Function)
      );

      removeEventListenerSpy.mockRestore();
    });

    it('should call handler with violation details', () => {
      const handler = vi.fn();
      const cleanup = CspUtils.onViolation(handler);

      // Create a mock SecurityPolicyViolationEvent
      const mockEvent = new CustomEvent('securitypolicyviolation', {
        bubbles: true,
        cancelable: false,
      }) as unknown as SecurityPolicyViolationEvent;

      // Add the required properties to the event
      Object.defineProperties(mockEvent, {
        violatedDirective: { value: 'script-src', writable: false },
        effectiveDirective: { value: 'script-src', writable: false },
        blockedURI: { value: 'https://evil.com/script.js', writable: false },
        documentURI: { value: 'https://example.com/', writable: false },
        originalPolicy: { value: "script-src 'self'", writable: false },
        sample: { value: 'eval("code")', writable: false },
        lineNumber: { value: 42, writable: false },
        columnNumber: { value: 10, writable: false },
        sourceFile: { value: 'app.js', writable: false },
      });

      document.dispatchEvent(mockEvent as Event);

      expect(handler).toHaveBeenCalledWith({
        violatedDirective: 'script-src',
        effectiveDirective: 'script-src',
        blockedUri: 'https://evil.com/script.js',
        documentUri: 'https://example.com/',
        originalPolicy: "script-src 'self'",
        sample: 'eval("code")',
        lineNumber: 42,
        columnNumber: 10,
        sourceFile: 'app.js',
      });

      cleanup();
    });

    it('should convert empty strings to undefined for optional fields', () => {
      const handler = vi.fn();
      const cleanup = CspUtils.onViolation(handler);

      // Create a mock event with empty optional fields
      const mockEvent = new CustomEvent('securitypolicyviolation', {
        bubbles: true,
        cancelable: false,
      }) as unknown as SecurityPolicyViolationEvent;

      Object.defineProperties(mockEvent, {
        violatedDirective: { value: 'script-src', writable: false },
        effectiveDirective: { value: 'script-src', writable: false },
        blockedURI: { value: '', writable: false },
        documentURI: { value: 'https://example.com/', writable: false },
        originalPolicy: { value: "script-src 'self'", writable: false },
        sample: { value: '', writable: false },
        lineNumber: { value: 0, writable: false },
        columnNumber: { value: 0, writable: false },
        sourceFile: { value: '', writable: false },
      });

      document.dispatchEvent(mockEvent as Event);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          sample: undefined,
          lineNumber: undefined,
          columnNumber: undefined,
          sourceFile: undefined,
        })
      );

      cleanup();
    });
  });

  describe('isUrlAllowedByDirective', () => {
    const selfOrigin = 'https://example.com';

    describe("'none' directive", () => {
      it('should return false for any URL', () => {
        expect(CspUtils.isUrlAllowedByDirective('https://example.com', selfOrigin, "'none'")).toBe(
          false
        );
        expect(CspUtils.isUrlAllowedByDirective('https://other.com', selfOrigin, "'none'")).toBe(
          false
        );
      });
    });

    describe('* wildcard', () => {
      it('should allow any https URL', () => {
        expect(CspUtils.isUrlAllowedByDirective('https://any.com', selfOrigin, '*')).toBe(true);
      });

      it('should not allow data: URL unless explicitly included', () => {
        expect(CspUtils.isUrlAllowedByDirective('data:text/plain,test', selfOrigin, '*')).toBe(
          false
        );
        expect(
          CspUtils.isUrlAllowedByDirective('data:text/plain,test', selfOrigin, '* data:')
        ).toBe(true);
      });

      it('should not allow blob: URL unless explicitly included', () => {
        expect(
          CspUtils.isUrlAllowedByDirective('blob:https://example.com/id', selfOrigin, '*')
        ).toBe(false);
        expect(
          CspUtils.isUrlAllowedByDirective('blob:https://example.com/id', selfOrigin, '* blob:')
        ).toBe(true);
      });
    });

    describe("'self' keyword", () => {
      it('should allow same-origin URLs', () => {
        expect(
          CspUtils.isUrlAllowedByDirective('https://example.com/path', selfOrigin, "'self'")
        ).toBe(true);
      });

      it('should not allow different-origin URLs', () => {
        expect(CspUtils.isUrlAllowedByDirective('https://other.com', selfOrigin, "'self'")).toBe(
          false
        );
      });
    });

    describe('scheme-source', () => {
      it('should allow matching scheme', () => {
        expect(CspUtils.isUrlAllowedByDirective('https://any.com', selfOrigin, 'https:')).toBe(
          true
        );
      });

      it('should not allow different scheme', () => {
        // noinspection HttpUrlsUsage - Testing HTTP vs HTTPS scheme validation
        expect(CspUtils.isUrlAllowedByDirective('http://any.com', selfOrigin, 'https:')).toBe(
          false
        );
      });
    });

    describe('data: and blob: schemes', () => {
      it('should allow data: URLs when directive includes data:', () => {
        expect(CspUtils.isUrlAllowedByDirective('data:text/plain,test', selfOrigin, 'data:')).toBe(
          true
        );
      });

      it('should allow blob: URLs when directive includes blob:', () => {
        expect(
          CspUtils.isUrlAllowedByDirective('blob:https://example.com/id', selfOrigin, 'blob:')
        ).toBe(true);
      });
    });

    describe('host-source', () => {
      it('should allow exact hostname match', () => {
        expect(
          CspUtils.isUrlAllowedByDirective('https://cdn.example.com', selfOrigin, 'cdn.example.com')
        ).toBe(true);
      });

      it('should allow wildcard subdomain match', () => {
        expect(
          CspUtils.isUrlAllowedByDirective('https://api.example.com', selfOrigin, '*.example.com')
        ).toBe(true);
        expect(
          CspUtils.isUrlAllowedByDirective(
            'https://deep.api.example.com',
            selfOrigin,
            '*.example.com'
          )
        ).toBe(true);
      });

      it('should allow exact domain with wildcard prefix', () => {
        expect(
          CspUtils.isUrlAllowedByDirective('https://example.com', selfOrigin, '*.example.com')
        ).toBe(true);
      });

      it('should match path prefix', () => {
        expect(
          CspUtils.isUrlAllowedByDirective(
            'https://cdn.example.com/assets/script.js',
            selfOrigin,
            'cdn.example.com/assets/'
          )
        ).toBe(true);
      });

      it('should not match different path', () => {
        expect(
          CspUtils.isUrlAllowedByDirective(
            'https://cdn.example.com/other/script.js',
            selfOrigin,
            'cdn.example.com/assets/'
          )
        ).toBe(false);
      });
    });

    describe('multiple sources', () => {
      it('should allow if any source matches', () => {
        const directive = "'self' https://cdn.example.com";
        expect(CspUtils.isUrlAllowedByDirective('https://example.com', selfOrigin, directive)).toBe(
          true
        );
        expect(
          CspUtils.isUrlAllowedByDirective('https://cdn.example.com', selfOrigin, directive)
        ).toBe(true);
      });

      it('should not allow if no source matches', () => {
        const directive = "'self' https://cdn.example.com";
        expect(CspUtils.isUrlAllowedByDirective('https://other.com', selfOrigin, directive)).toBe(
          false
        );
      });
    });

    describe('edge cases', () => {
      it('should handle relative URLs resolved against selfOrigin', () => {
        // Relative URLs are resolved against the base, becoming same-origin
        expect(CspUtils.isUrlAllowedByDirective('/path/to/resource', selfOrigin, "'self'")).toBe(
          true
        );
      });

      it('should handle empty directive', () => {
        expect(CspUtils.isUrlAllowedByDirective('https://example.com', selfOrigin, '')).toBe(false);
      });

      it('should handle invalid URL in directive', () => {
        // Invalid source URL should not match (triggers catch in isHostSourceMatch)
        expect(
          CspUtils.isUrlAllowedByDirective('https://example.com', selfOrigin, '::invalid-url::')
        ).toBe(false);
      });

      it('should handle invalid host-source that fails URL parsing', () => {
        // noinspection HttpUrlsUsage -- intentionally testing invalid HTTP URL
        expect(
          CspUtils.isUrlAllowedByDirective(
            'https://example.com',
            selfOrigin,
            'http://[invalid-bracket'
          )
        ).toBe(false);
      });

      it('should return false for invalid URL to check', () => {
        // The URL constructor is quite permissive when given a base URL.
        // Using an invalid protocol that will fail URL parsing even with a base.
        expect(
          CspUtils.isUrlAllowedByDirective('https://example.com', 'not-a-valid-origin', "'self'")
        ).toBe(false);
      });
    });
  });
});
