import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateUUID, CryptoError } from '../../src/core/index.js';

describe('generateUUID', () => {
  const originalCrypto = Object.getOwnPropertyDescriptor(globalThis, 'crypto');

  afterEach(() => {
    if (originalCrypto) {
      Object.defineProperty(globalThis, 'crypto', originalCrypto);
    }
    vi.restoreAllMocks();
  });

  describe('with crypto.randomUUID', () => {
    it('should use crypto.randomUUID when available', () => {
      const mockUUID = '550e8400-e29b-41d4-a716-446655440000';
      const mockRandomUUID = vi.fn().mockReturnValue(mockUUID);

      Object.defineProperty(globalThis, 'crypto', {
        value: {
          randomUUID: mockRandomUUID,
          getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto),
        },
        configurable: true,
      });

      const result = generateUUID();

      expect(result).toBe(mockUUID);
      expect(mockRandomUUID).toHaveBeenCalledTimes(1);
    });
  });

  describe('with crypto.getRandomValues fallback', () => {
    it('should fall back to getRandomValues when randomUUID is not available', () => {
      Object.defineProperty(globalThis, 'crypto', {
        value: {
          randomUUID: undefined,
          getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto),
        },
        configurable: true,
      });

      const result = generateUUID();

      // Should be a valid UUID v4 format
      expect(result).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
      );
    });

    it('should generate unique IDs', () => {
      Object.defineProperty(globalThis, 'crypto', {
        value: {
          randomUUID: undefined,
          getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto),
        },
        configurable: true,
      });

      const id1 = generateUUID();
      const id2 = generateUUID();
      const id3 = generateUUID();

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    it('should set correct version and variant bits', () => {
      Object.defineProperty(globalThis, 'crypto', {
        value: {
          randomUUID: undefined,
          getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto),
        },
        configurable: true,
      });

      for (let i = 0; i < 10; i++) {
        const uuid = generateUUID();
        // Version 4: 13th character should be '4'
        expect(uuid.charAt(14)).toBe('4');
        // Variant: 17th character should be 8, 9, a, or b
        expect(['8', '9', 'a', 'b']).toContain(uuid.charAt(19));
      }
    });
  });

  describe('error handling', () => {
    it('should throw CryptoError when crypto is not available', () => {
      Object.defineProperty(globalThis, 'crypto', {
        value: undefined,
        configurable: true,
      });

      expect(() => generateUUID()).toThrow(CryptoError);
      expect(() => generateUUID()).toThrow('Crypto API is not available');
    });

    it('should throw CryptoError when neither randomUUID nor getRandomValues is available', () => {
      Object.defineProperty(globalThis, 'crypto', {
        value: {},
        configurable: true,
      });

      expect(() => generateUUID()).toThrow(CryptoError);
    });

    it('should have correct error code', () => {
      Object.defineProperty(globalThis, 'crypto', {
        value: {},
        configurable: true,
      });

      try {
        generateUUID();
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(CryptoError);
        expect((e as CryptoError).code).toBe('CRYPTO_UNAVAILABLE');
      }
    });
  });
});

describe('CryptoError', () => {
  it('should create error with static factory method', () => {
    const error = CryptoError.unavailable();

    expect(error).toBeInstanceOf(CryptoError);
    expect(error.code).toBe('CRYPTO_UNAVAILABLE');
    expect(error.message).toContain('Crypto API is not available');
  });

  it('should be instance of Error', () => {
    const error = CryptoError.unavailable();

    expect(error).toBeInstanceOf(Error);
  });

  it('should have correct name', () => {
    const error = CryptoError.unavailable();

    expect(error.name).toBe('CryptoError');
  });
});
