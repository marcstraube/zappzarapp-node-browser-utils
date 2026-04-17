import { describe, it, expect, vi } from 'vitest';
import { combineAbortSignals, validateContentType } from '../../src/request/index.js';
import { RequestError } from '../../src/request/index.js';

describe('combineAbortSignals', () => {
  it('should abort combined signal when signal1 aborts', () => {
    const controller1 = new AbortController();
    const controller2 = new AbortController();

    const combined = combineAbortSignals(controller1.signal, controller2.signal);

    expect(combined.aborted).toBe(false);

    controller1.abort();

    expect(combined.aborted).toBe(true);
  });

  it('should abort combined signal when signal2 aborts', () => {
    const controller1 = new AbortController();
    const controller2 = new AbortController();

    const combined = combineAbortSignals(controller1.signal, controller2.signal);

    expect(combined.aborted).toBe(false);

    controller2.abort();

    expect(combined.aborted).toBe(true);
  });

  it('should return already-aborted signal when signal1 is pre-aborted', () => {
    const controller1 = new AbortController();
    controller1.abort();
    const controller2 = new AbortController();

    const combined = combineAbortSignals(controller1.signal, controller2.signal);

    expect(combined.aborted).toBe(true);
  });

  it('should return already-aborted signal when signal2 is pre-aborted', () => {
    const controller1 = new AbortController();
    const controller2 = new AbortController();
    controller2.abort();

    const combined = combineAbortSignals(controller1.signal, controller2.signal);

    expect(combined.aborted).toBe(true);
  });

  it('should remove listener from signal2 when signal1 aborts', () => {
    const controller1 = new AbortController();
    const controller2 = new AbortController();

    const removeSpy = vi.spyOn(controller2.signal, 'removeEventListener');

    combineAbortSignals(controller1.signal, controller2.signal);

    controller1.abort();

    expect(removeSpy).toHaveBeenCalledWith('abort', expect.any(Function));

    removeSpy.mockRestore();
  });

  it('should remove listener from signal1 when signal2 aborts', () => {
    const controller1 = new AbortController();
    const controller2 = new AbortController();

    const removeSpy = vi.spyOn(controller1.signal, 'removeEventListener');

    combineAbortSignals(controller1.signal, controller2.signal);

    controller2.abort();

    expect(removeSpy).toHaveBeenCalledWith('abort', expect.any(Function));

    removeSpy.mockRestore();
  });

  it('should not add listeners when signal1 is pre-aborted', () => {
    const controller1 = new AbortController();
    controller1.abort();
    const controller2 = new AbortController();

    const addSpy = vi.spyOn(controller2.signal, 'addEventListener');

    combineAbortSignals(controller1.signal, controller2.signal);

    expect(addSpy).not.toHaveBeenCalled();

    addSpy.mockRestore();
  });
});

describe('validateContentType', () => {
  it('should pass when Content-Type matches exactly', () => {
    const headers = new Headers({ 'Content-Type': 'application/json' });
    expect(() => validateContentType(headers, 'application/json')).not.toThrow();
  });

  it('should pass when Content-Type matches with parameters stripped', () => {
    const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8' });
    expect(() => validateContentType(headers, 'application/json')).not.toThrow();
  });

  it('should be case-insensitive', () => {
    const headers = new Headers({ 'Content-Type': 'Application/JSON' });
    expect(() => validateContentType(headers, 'application/json')).not.toThrow();
  });

  it('should pass when Content-Type matches one of multiple expected types', () => {
    const headers = new Headers({ 'Content-Type': 'text/plain' });
    expect(() => validateContentType(headers, ['application/json', 'text/plain'])).not.toThrow();
  });

  it('should throw CONTENT_TYPE_MISMATCH on mismatch', () => {
    const headers = new Headers({ 'Content-Type': 'text/html' });
    expect(() => validateContentType(headers, 'application/json')).toThrow(RequestError);
    try {
      validateContentType(headers, 'application/json');
    } catch (e) {
      expect((e as RequestError).code).toBe('CONTENT_TYPE_MISMATCH');
    }
  });

  it('should throw when no Content-Type header is present (fail closed)', () => {
    const headers = new Headers();
    expect(() => validateContentType(headers, 'application/json')).toThrow(RequestError);
    try {
      validateContentType(headers, 'application/json');
    } catch (e) {
      expect((e as RequestError).code).toBe('CONTENT_TYPE_MISMATCH');
      expect((e as RequestError).message).toContain('(none)');
    }
  });

  it('should handle whitespace in Content-Type header', () => {
    const headers = new Headers({ 'Content-Type': '  application/json  ; charset=utf-8' });
    expect(() => validateContentType(headers, 'application/json')).not.toThrow();
  });

  it('should throw when Content-Type does not match any in array', () => {
    const headers = new Headers({ 'Content-Type': 'text/html' });
    expect(() => validateContentType(headers, ['application/json', 'text/plain'])).toThrow(
      RequestError
    );
  });

  it('should handle case-insensitive expected types', () => {
    const headers = new Headers({ 'Content-Type': 'application/json' });
    expect(() => validateContentType(headers, 'Application/JSON')).not.toThrow();
  });
});
