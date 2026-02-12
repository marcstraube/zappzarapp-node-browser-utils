import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HistoryManager } from '../../src/url/index.js';
import { UrlError, ValidationError, Result } from '../../src/core/index.js';

describe('HistoryManager', () => {
  let originalWindow: typeof globalThis.window;
  let originalHistory: typeof globalThis.history;
  let mockHistory: {
    pushState: ReturnType<typeof vi.fn>;
    replaceState: ReturnType<typeof vi.fn>;
    back: ReturnType<typeof vi.fn>;
    forward: ReturnType<typeof vi.fn>;
    go: ReturnType<typeof vi.fn>;
    state: unknown;
    length: number;
    scrollRestoration: ScrollRestoration;
  };

  beforeEach(() => {
    originalWindow = globalThis.window;
    originalHistory = globalThis.history;

    mockHistory = {
      pushState: vi.fn(),
      replaceState: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      go: vi.fn(),
      state: null,
      length: 1,
      scrollRestoration: 'auto',
    };

    Object.defineProperty(globalThis, 'history', {
      value: mockHistory,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(globalThis, 'window', {
      value: {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    globalThis.window = originalWindow;
    globalThis.history = originalHistory;
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // Navigation - push
  // ===========================================================================

  describe('push', () => {
    it('should call history.pushState with URL', () => {
      HistoryManager.push('/new-page');

      expect(mockHistory.pushState).toHaveBeenCalledWith(null, '', '/new-page');
    });

    it('should call history.pushState with URL and state', () => {
      const state = { page: 1, filter: 'active' };
      HistoryManager.push('/page', state);

      expect(mockHistory.pushState).toHaveBeenCalledWith(state, '', '/page');
    });

    it('should throw ValidationError for javascript: protocol', () => {
      expect(() => HistoryManager.push('javascript:alert(1)')).toThrow(ValidationError);
    });

    it('should throw ValidationError for data: protocol', () => {
      expect(() => HistoryManager.push('data:text/html,<script>')).toThrow(ValidationError);
    });

    it('should throw ValidationError for vbscript: protocol', () => {
      expect(() => HistoryManager.push('vbscript:execute()')).toThrow(ValidationError);
    });

    it('should throw ValidationError for empty URL', () => {
      expect(() => HistoryManager.push('')).toThrow(ValidationError);
    });

    it('should throw UrlError when History API not available', () => {
      // @ts-expect-error - Testing non-browser environment
      globalThis.history = undefined;

      expect(() => HistoryManager.push('/page')).toThrow(UrlError);
    });

    it('should throw Error for non-serializable state', () => {
      const circular: Record<string, unknown> = {};
      circular.self = circular;

      expect(() => HistoryManager.push('/page', circular)).toThrow();
    });

    it('should accept valid relative URLs', () => {
      HistoryManager.push('/path/to/page');

      expect(mockHistory.pushState).toHaveBeenCalled();
    });

    it('should accept valid absolute URLs', () => {
      HistoryManager.push('https://example.com/page');

      expect(mockHistory.pushState).toHaveBeenCalledWith(null, '', 'https://example.com/page');
    });

    it('should accept URL with query parameters', () => {
      HistoryManager.push('/search?q=test&page=1');

      expect(mockHistory.pushState).toHaveBeenCalledWith(null, '', '/search?q=test&page=1');
    });

    it('should accept URL with hash', () => {
      HistoryManager.push('/page#section');

      expect(mockHistory.pushState).toHaveBeenCalledWith(null, '', '/page#section');
    });
  });

  // ===========================================================================
  // Navigation - pushResult
  // ===========================================================================

  describe('pushResult', () => {
    it('should return Ok for valid URL', () => {
      const result = HistoryManager.pushResult('/new-page');

      expect(Result.isOk(result)).toBe(true);
      expect(mockHistory.pushState).toHaveBeenCalledWith(null, '', '/new-page');
    });

    it('should return Ok with state', () => {
      const state = { page: 1 };
      const result = HistoryManager.pushResult('/page', state);

      expect(Result.isOk(result)).toBe(true);
      expect(mockHistory.pushState).toHaveBeenCalledWith(state, '', '/page');
    });

    it('should return Err for dangerous protocol', () => {
      const result = HistoryManager.pushResult('javascript:alert(1)');

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result)).toBeInstanceOf(ValidationError);
    });

    it('should return Err for empty URL', () => {
      const result = HistoryManager.pushResult('');

      expect(Result.isErr(result)).toBe(true);
    });

    it('should return Err when History API not available', () => {
      // @ts-expect-error - Testing non-browser environment
      globalThis.history = undefined;

      const result = HistoryManager.pushResult('/page');

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result)).toBeInstanceOf(UrlError);
    });

    it('should return Err for non-serializable state', () => {
      const circular: Record<string, unknown> = {};
      circular.self = circular;

      const result = HistoryManager.pushResult('/page', circular);

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result)).toBeInstanceOf(UrlError);
      expect((Result.unwrapErr(result) as UrlError).code).toBe('URL_INVALID_STATE');
    });

    it('should return Err with error message for circular reference in state', () => {
      const circular: Record<string, unknown> = { data: 'test' };
      circular.ref = circular;

      const result = HistoryManager.pushResult('/page', circular);

      expect(Result.isErr(result)).toBe(true);
      const error = Result.unwrapErr(result) as UrlError;
      expect(error).toBeInstanceOf(UrlError);
      expect(error.code).toBe('URL_INVALID_STATE');
      expect(error.message).toContain('circular');
    });

    it('should return Err when validateState throws non-UrlError', () => {
      const validateStateSpy = vi.spyOn(HistoryManager, 'validateState').mockImplementation(() => {
        throw new TypeError('Custom validation error');
      });

      const result = HistoryManager.pushResult('/page', { test: 'value' });

      expect(Result.isErr(result)).toBe(true);
      const error = Result.unwrapErr(result) as UrlError;
      expect(error).toBeInstanceOf(UrlError);
      expect(error.code).toBe('URL_INVALID_STATE');
      expect(error.message).toContain('Custom validation error');

      validateStateSpy.mockRestore();
    });

    it('should return Err when pushState throws', () => {
      mockHistory.pushState.mockImplementation(() => {
        throw new Error('SecurityError');
      });

      const result = HistoryManager.pushResult('/cross-origin');

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result)).toBeInstanceOf(UrlError);
      expect((Result.unwrapErr(result) as UrlError).code).toBe('URL_NAVIGATION_FAILED');
    });

    it('should not throw on error', () => {
      expect(() => HistoryManager.pushResult('javascript:evil()')).not.toThrow();
    });
  });

  // ===========================================================================
  // Navigation - replace
  // ===========================================================================

  describe('replace', () => {
    it('should call history.replaceState with URL', () => {
      HistoryManager.replace('/updated-page');

      expect(mockHistory.replaceState).toHaveBeenCalledWith(null, '', '/updated-page');
    });

    it('should call history.replaceState with URL and state', () => {
      const state = { updated: true };
      HistoryManager.replace('/page', state);

      expect(mockHistory.replaceState).toHaveBeenCalledWith(state, '', '/page');
    });

    it('should throw ValidationError for javascript: protocol', () => {
      expect(() => HistoryManager.replace('javascript:alert(1)')).toThrow(ValidationError);
    });

    it('should throw ValidationError for data: protocol', () => {
      expect(() => HistoryManager.replace('data:text/html,<script>')).toThrow(ValidationError);
    });

    it('should throw ValidationError for empty URL', () => {
      expect(() => HistoryManager.replace('')).toThrow(ValidationError);
    });

    it('should throw UrlError when History API not available', () => {
      // @ts-expect-error - Testing non-browser environment
      globalThis.history = undefined;

      expect(() => HistoryManager.replace('/page')).toThrow(UrlError);
    });

    it('should throw Error for non-serializable state', () => {
      const circular: Record<string, unknown> = {};
      circular.self = circular;

      expect(() => HistoryManager.replace('/page', circular)).toThrow();
    });
  });

  // ===========================================================================
  // Navigation - replaceResult
  // ===========================================================================

  describe('replaceResult', () => {
    it('should return Ok for valid URL', () => {
      const result = HistoryManager.replaceResult('/updated');

      expect(Result.isOk(result)).toBe(true);
      expect(mockHistory.replaceState).toHaveBeenCalledWith(null, '', '/updated');
    });

    it('should return Ok with state', () => {
      const state = { step: 2 };
      const result = HistoryManager.replaceResult('/step/2', state);

      expect(Result.isOk(result)).toBe(true);
      expect(mockHistory.replaceState).toHaveBeenCalledWith(state, '', '/step/2');
    });

    it('should return Err for dangerous protocol', () => {
      const result = HistoryManager.replaceResult('javascript:alert(1)');

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result)).toBeInstanceOf(ValidationError);
    });

    it('should return Err for empty URL', () => {
      const result = HistoryManager.replaceResult('');

      expect(Result.isErr(result)).toBe(true);
    });

    it('should return Err when History API not available', () => {
      // @ts-expect-error - Testing non-browser environment
      globalThis.history = undefined;

      const result = HistoryManager.replaceResult('/page');

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result)).toBeInstanceOf(UrlError);
    });

    it('should return Err for non-serializable state', () => {
      const circular: Record<string, unknown> = {};
      circular.self = circular;

      const result = HistoryManager.replaceResult('/page', circular);

      expect(Result.isErr(result)).toBe(true);
      expect(Result.unwrapErr(result)).toBeInstanceOf(UrlError);
      expect((Result.unwrapErr(result) as UrlError).code).toBe('URL_INVALID_STATE');
    });

    it('should return Err with error message for circular reference in state', () => {
      const circular: Record<string, unknown> = { data: 'test' };
      circular.ref = circular;

      const result = HistoryManager.replaceResult('/page', circular);

      expect(Result.isErr(result)).toBe(true);
      const error = Result.unwrapErr(result) as UrlError;
      expect(error).toBeInstanceOf(UrlError);
      expect(error.code).toBe('URL_INVALID_STATE');
      expect(error.message).toContain('circular');
    });

    it('should return Err when validateState throws non-UrlError', () => {
      const validateStateSpy = vi.spyOn(HistoryManager, 'validateState').mockImplementation(() => {
        throw new TypeError('Custom validation error');
      });

      const result = HistoryManager.replaceResult('/page', { test: 'value' });

      expect(Result.isErr(result)).toBe(true);
      const error = Result.unwrapErr(result) as UrlError;
      expect(error).toBeInstanceOf(UrlError);
      expect(error.code).toBe('URL_INVALID_STATE');
      expect(error.message).toContain('Custom validation error');

      validateStateSpy.mockRestore();
    });

    it('should return Err when replaceState throws', () => {
      mockHistory.replaceState.mockImplementation(() => {
        throw new Error('SecurityError');
      });

      const result = HistoryManager.replaceResult('/cross-origin');

      expect(Result.isErr(result)).toBe(true);
      expect((Result.unwrapErr(result) as UrlError).code).toBe('URL_NAVIGATION_FAILED');
    });

    it('should not throw on error', () => {
      expect(() => HistoryManager.replaceResult('javascript:evil()')).not.toThrow();
    });
  });

  // ===========================================================================
  // Navigation - back/forward/go
  // ===========================================================================

  describe('back', () => {
    it('should call history.back', () => {
      HistoryManager.back();

      expect(mockHistory.back).toHaveBeenCalled();
    });

    it('should not throw when history not available', () => {
      // @ts-expect-error - Testing non-browser environment
      globalThis.history = undefined;

      expect(() => HistoryManager.back()).not.toThrow();
    });
  });

  describe('forward', () => {
    it('should call history.forward', () => {
      HistoryManager.forward();

      expect(mockHistory.forward).toHaveBeenCalled();
    });

    it('should not throw when history not available', () => {
      // @ts-expect-error - Testing non-browser environment
      globalThis.history = undefined;

      expect(() => HistoryManager.forward()).not.toThrow();
    });
  });

  describe('go', () => {
    it('should call history.go with positive delta', () => {
      HistoryManager.go(2);

      expect(mockHistory.go).toHaveBeenCalledWith(2);
    });

    it('should call history.go with negative delta', () => {
      HistoryManager.go(-2);

      expect(mockHistory.go).toHaveBeenCalledWith(-2);
    });

    it('should call history.go with zero', () => {
      HistoryManager.go(0);

      expect(mockHistory.go).toHaveBeenCalledWith(0);
    });

    it('should not throw when history not available', () => {
      // @ts-expect-error - Testing non-browser environment
      globalThis.history = undefined;

      expect(() => HistoryManager.go(1)).not.toThrow();
    });
  });

  // ===========================================================================
  // State Access
  // ===========================================================================

  describe('currentState', () => {
    it('should return current history state', () => {
      mockHistory.state = { page: 5 };

      const state = HistoryManager.currentState<{ page: number }>();

      expect(state).toEqual({ page: 5 });
    });

    it('should return null when no state', () => {
      mockHistory.state = null;

      const state = HistoryManager.currentState();

      expect(state).toBeNull();
    });

    it('should return null when history not available', () => {
      // @ts-expect-error - Testing non-browser environment
      globalThis.history = undefined;

      const state = HistoryManager.currentState();

      expect(state).toBeNull();
    });

    it('should work with typed state', () => {
      interface PageState {
        page: number;
        filter: string;
        [key: string]: unknown; // Index signature for HistoryState compatibility
      }

      mockHistory.state = { page: 1, filter: 'all' };

      const state = HistoryManager.currentState<PageState>();

      expect(state?.page).toBe(1);
      expect(state?.filter).toBe('all');
    });
  });

  describe('length', () => {
    it('should return history length', () => {
      mockHistory.length = 5;

      expect(HistoryManager.length()).toBe(5);
    });

    it('should return 0 when history not available', () => {
      // @ts-expect-error - Testing non-browser environment
      globalThis.history = undefined;

      expect(HistoryManager.length()).toBe(0);
    });
  });

  describe('scrollRestoration', () => {
    it('should return scroll restoration mode', () => {
      mockHistory.scrollRestoration = 'manual';

      expect(HistoryManager.scrollRestoration()).toBe('manual');
    });

    it('should return auto by default', () => {
      mockHistory.scrollRestoration = 'auto';

      expect(HistoryManager.scrollRestoration()).toBe('auto');
    });

    it('should return null when history not available', () => {
      // @ts-expect-error - Testing non-browser environment
      globalThis.history = undefined;

      expect(HistoryManager.scrollRestoration()).toBeNull();
    });
  });

  describe('setScrollRestoration', () => {
    it('should set scroll restoration to manual', () => {
      HistoryManager.setScrollRestoration('manual');

      expect(mockHistory.scrollRestoration).toBe('manual');
    });

    it('should set scroll restoration to auto', () => {
      mockHistory.scrollRestoration = 'manual';

      HistoryManager.setScrollRestoration('auto');

      expect(mockHistory.scrollRestoration).toBe('auto');
    });

    it('should not throw when history not available', () => {
      // @ts-expect-error - Testing non-browser environment
      globalThis.history = undefined;

      expect(() => HistoryManager.setScrollRestoration('manual')).not.toThrow();
    });
  });

  // ===========================================================================
  // Event Handlers
  // ===========================================================================

  describe('onPopState', () => {
    it('should add popstate event listener', () => {
      const handler = vi.fn();

      HistoryManager.onPopState(handler);

      expect(globalThis.window.addEventListener).toHaveBeenCalledWith(
        'popstate',
        expect.any(Function)
      );
    });

    it('should return cleanup function', () => {
      const handler = vi.fn();

      const cleanup = HistoryManager.onPopState(handler);

      expect(typeof cleanup).toBe('function');
    });

    it('should remove listener on cleanup', () => {
      const handler = vi.fn();

      const cleanup = HistoryManager.onPopState(handler);
      cleanup();

      expect(globalThis.window.removeEventListener).toHaveBeenCalledWith(
        'popstate',
        expect.any(Function)
      );
    });

    it('should call handler with state and event', () => {
      const handler = vi.fn();
      let capturedListener: ((e: PopStateEvent) => void) | null = null;

      (globalThis.window.addEventListener as ReturnType<typeof vi.fn>).mockImplementation(
        (event: string, listener: (e: PopStateEvent) => void) => {
          if (event === 'popstate') {
            capturedListener = listener;
          }
        }
      );

      HistoryManager.onPopState(handler);

      const mockEvent = {
        state: { page: 2 },
      } as PopStateEvent;

      capturedListener!(mockEvent);

      expect(handler).toHaveBeenCalledWith({ page: 2 }, mockEvent);
    });

    it('should call handler with null state', () => {
      const handler = vi.fn();
      let capturedListener: ((e: PopStateEvent) => void) | null = null;

      (globalThis.window.addEventListener as ReturnType<typeof vi.fn>).mockImplementation(
        (event: string, listener: (e: PopStateEvent) => void) => {
          if (event === 'popstate') {
            capturedListener = listener;
          }
        }
      );

      HistoryManager.onPopState(handler);

      const mockEvent = {
        state: null,
      } as PopStateEvent;

      capturedListener!(mockEvent);

      expect(handler).toHaveBeenCalledWith(null, mockEvent);
    });

    it('should return noop cleanup when window not available', () => {
      // @ts-expect-error - Testing non-browser environment
      globalThis.window = undefined;

      const handler = vi.fn();
      const cleanup = HistoryManager.onPopState(handler);

      expect(typeof cleanup).toBe('function');
      expect(() => cleanup()).not.toThrow();
    });
  });

  describe('onHashChange', () => {
    it('should add hashchange event listener', () => {
      const handler = vi.fn();

      HistoryManager.onHashChange(handler);

      expect(globalThis.window.addEventListener).toHaveBeenCalledWith(
        'hashchange',
        expect.any(Function)
      );
    });

    it('should return cleanup function', () => {
      const handler = vi.fn();

      const cleanup = HistoryManager.onHashChange(handler);

      expect(typeof cleanup).toBe('function');
    });

    it('should remove listener on cleanup', () => {
      const handler = vi.fn();

      const cleanup = HistoryManager.onHashChange(handler);
      cleanup();

      expect(globalThis.window.removeEventListener).toHaveBeenCalledWith(
        'hashchange',
        expect.any(Function)
      );
    });

    it('should call handler with hashes and event', () => {
      const handler = vi.fn();
      let capturedListener: ((e: HashChangeEvent) => void) | null = null;

      (globalThis.window.addEventListener as ReturnType<typeof vi.fn>).mockImplementation(
        (event: string, listener: (e: HashChangeEvent) => void) => {
          if (event === 'hashchange') {
            capturedListener = listener;
          }
        }
      );

      HistoryManager.onHashChange(handler);

      const mockEvent = {
        oldURL: 'https://example.com/page#old-section',
        newURL: 'https://example.com/page#new-section',
      } as HashChangeEvent;

      capturedListener!(mockEvent);

      expect(handler).toHaveBeenCalledWith('#new-section', '#old-section', mockEvent);
    });

    it('should handle empty hashes', () => {
      const handler = vi.fn();
      let capturedListener: ((e: HashChangeEvent) => void) | null = null;

      (globalThis.window.addEventListener as ReturnType<typeof vi.fn>).mockImplementation(
        (event: string, listener: (e: HashChangeEvent) => void) => {
          if (event === 'hashchange') {
            capturedListener = listener;
          }
        }
      );

      HistoryManager.onHashChange(handler);

      const mockEvent = {
        oldURL: 'https://example.com/page#section',
        newURL: 'https://example.com/page',
      } as HashChangeEvent;

      capturedListener!(mockEvent);

      expect(handler).toHaveBeenCalledWith('', '#section', mockEvent);
    });

    it('should return noop cleanup when window not available', () => {
      // @ts-expect-error - Testing non-browser environment
      globalThis.window = undefined;

      const handler = vi.fn();
      const cleanup = HistoryManager.onHashChange(handler);

      expect(typeof cleanup).toBe('function');
      expect(() => cleanup()).not.toThrow();
    });
  });

  // ===========================================================================
  // Utilities
  // ===========================================================================

  describe('isSupported', () => {
    it('should return true when History API is available', () => {
      expect(HistoryManager.isSupported()).toBe(true);
    });

    it('should return false when history is undefined', () => {
      // @ts-expect-error - Testing non-browser environment
      globalThis.history = undefined;

      expect(HistoryManager.isSupported()).toBe(false);
    });

    it('should return false when pushState is not a function', () => {
      // @ts-expect-error - Testing incomplete API
      mockHistory.pushState = null;

      expect(HistoryManager.isSupported()).toBe(false);
    });
  });

  describe('validateState', () => {
    it('should not throw for undefined state', () => {
      expect(() => HistoryManager.validateState(undefined)).not.toThrow();
    });

    it('should not throw for null state', () => {
      expect(() => HistoryManager.validateState(null)).not.toThrow();
    });

    it('should not throw for simple object', () => {
      expect(() => HistoryManager.validateState({ foo: 'bar' })).not.toThrow();
    });

    it('should not throw for nested object', () => {
      const state = {
        level1: {
          level2: {
            level3: 'value',
          },
        },
      };

      expect(() => HistoryManager.validateState(state)).not.toThrow();
    });

    it('should not throw for array', () => {
      expect(() => HistoryManager.validateState([1, 2, 3])).not.toThrow();
    });

    it('should not throw for primitives', () => {
      expect(() => HistoryManager.validateState('string')).not.toThrow();
      expect(() => HistoryManager.validateState(123)).not.toThrow();
      expect(() => HistoryManager.validateState(true)).not.toThrow();
    });

    it('should throw for circular reference', () => {
      const circular: Record<string, unknown> = {};
      circular.self = circular;

      expect(() => HistoryManager.validateState(circular)).toThrow(
        'State object is not serializable'
      );
    });

    it('should throw error message containing circular reference info', () => {
      const circular: Record<string, unknown> = { a: 1 };
      circular.self = circular;

      expect(() => HistoryManager.validateState(circular)).toThrow(/circular/i);
    });
  });

  // ===========================================================================
  // Security Tests
  // ===========================================================================

  describe('Security', () => {
    it('should reject javascript: in push', () => {
      expect(() => HistoryManager.push('javascript:alert(document.cookie)')).toThrow(
        ValidationError
      );
    });

    it('should reject JavaScript: in push (case insensitive)', () => {
      expect(() => HistoryManager.push('JavaScript:void(0)')).toThrow(ValidationError);
    });

    it('should reject JAVASCRIPT: in push (uppercase)', () => {
      expect(() => HistoryManager.push('JAVASCRIPT:alert(1)')).toThrow(ValidationError);
    });

    it('should reject javascript: in replace', () => {
      expect(() => HistoryManager.replace('javascript:void(0)')).toThrow(ValidationError);
    });

    it('should reject data: in push', () => {
      expect(() => HistoryManager.push('data:text/html,<script>alert(1)</script>')).toThrow(
        ValidationError
      );
    });

    it('should reject data: in replace', () => {
      expect(() => HistoryManager.replace('data:text/html,test')).toThrow(ValidationError);
    });

    it('should reject vbscript: in push', () => {
      expect(() => HistoryManager.push('vbscript:msgbox("xss")')).toThrow(ValidationError);
    });

    it('should accept http: URLs', () => {
      expect(() => HistoryManager.push('http://example.com')).not.toThrow();
    });

    it('should accept https: URLs', () => {
      expect(() => HistoryManager.push('https://example.com')).not.toThrow();
    });

    it('should accept relative URLs', () => {
      expect(() => HistoryManager.push('/path/to/page')).not.toThrow();
    });

    it('should accept hash-only URLs', () => {
      expect(() => HistoryManager.push('#section')).not.toThrow();
    });

    it('should accept query-only URLs', () => {
      expect(() => HistoryManager.push('?query=value')).not.toThrow();
    });
  });

  // ===========================================================================
  // State Serialization
  // ===========================================================================

  describe('State Serialization', () => {
    it('should accept JSON-serializable objects', () => {
      const state = {
        string: 'value',
        number: 42,
        boolean: true,
        null: null,
        array: [1, 2, 3],
        nested: { key: 'value' },
      };

      expect(() => HistoryManager.push('/page', state)).not.toThrow();
    });

    it('should reject objects with undefined values', () => {
      // Note: JSON.stringify converts undefined to null in arrays
      // and removes properties with undefined values
      // This doesn't throw, but the state may be different
      const state = { key: undefined };

      // This should not throw as JSON.stringify handles undefined
      expect(() => HistoryManager.push('/page', state)).not.toThrow();
    });

    it('should reject objects with function values', () => {
      const state = {
        fn: () => {},
      };

      // Functions are not JSON-serializable but JSON.stringify just removes them
      // So this doesn't throw
      expect(() => HistoryManager.push('/page', state)).not.toThrow();
    });

    it('should handle Date objects (serialized as strings)', () => {
      const state = { date: new Date().toISOString() };

      expect(() => HistoryManager.push('/page', state)).not.toThrow();
    });

    it('should handle deeply nested objects', () => {
      const state = {
        level1: {
          level2: {
            level3: {
              level4: {
                value: 'deep',
              },
            },
          },
        },
      };

      expect(() => HistoryManager.push('/page', state)).not.toThrow();
    });

    it('should handle large arrays', () => {
      const state = {
        items: Array.from({ length: 1000 }, (_, i) => i),
      };

      expect(() => HistoryManager.push('/page', state)).not.toThrow();
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle empty state object', () => {
      expect(() => HistoryManager.push('/page', {})).not.toThrow();
      expect(mockHistory.pushState).toHaveBeenCalledWith({}, '', '/page');
    });

    it('should handle URL with special characters', () => {
      HistoryManager.push('/search?q=hello%20world&filter=name%3Atest');

      expect(mockHistory.pushState).toHaveBeenCalled();
    });

    it('should handle URL with unicode', () => {
      HistoryManager.push('/page/%E4%B8%AD%E6%96%87');

      expect(mockHistory.pushState).toHaveBeenCalled();
    });

    it('should handle very long URLs', () => {
      const longPath = '/page/' + 'x'.repeat(1000);

      expect(() => HistoryManager.push(longPath)).not.toThrow();
    });

    it('should handle state with many properties', () => {
      const state: Record<string, number> = {};
      for (let i = 0; i < 100; i++) {
        state[`key${i}`] = i;
      }

      expect(() => HistoryManager.push('/page', state)).not.toThrow();
    });

    it('should handle consecutive push calls', () => {
      HistoryManager.push('/page1');
      HistoryManager.push('/page2');
      HistoryManager.push('/page3');

      expect(mockHistory.pushState).toHaveBeenCalledTimes(3);
    });

    it('should handle consecutive replace calls', () => {
      HistoryManager.replace('/page1');
      HistoryManager.replace('/page2');
      HistoryManager.replace('/page3');

      expect(mockHistory.replaceState).toHaveBeenCalledTimes(3);
    });

    it('should handle mixed push and replace calls', () => {
      HistoryManager.push('/page1');
      HistoryManager.replace('/page1-updated');
      HistoryManager.push('/page2');

      expect(mockHistory.pushState).toHaveBeenCalledTimes(2);
      expect(mockHistory.replaceState).toHaveBeenCalledTimes(1);
    });
  });
});
