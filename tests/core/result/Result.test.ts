import { describe, it, expect, vi } from 'vitest';
import { Result } from '../../../src/core/index.js';

describe('Result', () => {
  describe('constructors', () => {
    describe('ok', () => {
      it('should create success result', () => {
        const result = Result.ok(42);

        expect(result._tag).toBe('Ok');
        expect(Result.isOk(result)).toBe(true);
        expect(Result.isErr(result)).toBe(false);
      });

      it('should store value', () => {
        const result = Result.ok({ foo: 'bar' });

        expect(Result.unwrap(result)).toEqual({ foo: 'bar' });
      });
    });

    describe('err', () => {
      it('should create failure result', () => {
        const result = Result.err('error message');

        expect(result._tag).toBe('Err');
        expect(Result.isOk(result)).toBe(false);
        expect(Result.isErr(result)).toBe(true);
      });

      it('should store error', () => {
        const error = new Error('test');
        const result = Result.err(error);

        expect(Result.unwrapErr(result)).toBe(error);
      });
    });
  });

  describe('type guards', () => {
    describe('isOk', () => {
      it('should return true for Ok', () => {
        expect(Result.isOk(Result.ok(1))).toBe(true);
      });

      it('should return false for Err', () => {
        expect(Result.isOk(Result.err('error'))).toBe(false);
      });
    });

    describe('isErr', () => {
      it('should return true for Err', () => {
        expect(Result.isErr(Result.err('error'))).toBe(true);
      });

      it('should return false for Ok', () => {
        expect(Result.isErr(Result.ok(1))).toBe(false);
      });
    });
  });

  describe('extractors', () => {
    describe('unwrap', () => {
      it('should return value for Ok', () => {
        expect(Result.unwrap(Result.ok(42))).toBe(42);
      });

      it('should throw error for Err', () => {
        const error = new Error('test error');

        expect(() => Result.unwrap(Result.err(error))).toThrow(error);
      });
    });

    describe('unwrapOr', () => {
      it('should return value for Ok', () => {
        expect(Result.unwrapOr(Result.ok(42), 0)).toBe(42);
      });

      it('should return default for Err', () => {
        expect(Result.unwrapOr(Result.err('error'), 0)).toBe(0);
      });
    });

    describe('unwrapOrElse', () => {
      it('should return value for Ok', () => {
        // noinspection JSVoidFunctionReturnValueUsed
        const fn = vi.fn(() => 0);

        expect(Result.unwrapOrElse(Result.ok(42), fn)).toBe(42);
        expect(fn).not.toHaveBeenCalled();
      });

      it('should call function for Err', () => {
        // noinspection JSVoidFunctionReturnValueUsed
        const fn = vi.fn((e: string) => e.length);

        expect(Result.unwrapOrElse(Result.err('error'), fn)).toBe(5);
        expect(fn).toHaveBeenCalledWith('error');
      });
    });

    describe('unwrapErr', () => {
      it('should return error for Err', () => {
        expect(Result.unwrapErr(Result.err('error'))).toBe('error');
      });

      it('should throw for Ok', () => {
        expect(() => Result.unwrapErr(Result.ok(42))).toThrow('Called unwrapErr on Ok value');
      });
    });
  });

  describe('transformers', () => {
    describe('map', () => {
      it('should transform Ok value', () => {
        const result = Result.map(Result.ok(2), (x) => x * 2);

        expect(Result.unwrap(result)).toBe(4);
      });

      it('should pass through Err', () => {
        const result = Result.map(Result.err('error'), (x: number) => x * 2);

        expect(Result.unwrapErr(result)).toBe('error');
      });
    });

    describe('mapErr', () => {
      it('should transform Err value', () => {
        const result = Result.mapErr(Result.err('error'), (e) => e.toUpperCase());

        expect(Result.unwrapErr(result)).toBe('ERROR');
      });

      it('should pass through Ok', () => {
        const result = Result.mapErr(Result.ok(42), (e: string) => e.toUpperCase());

        expect(Result.unwrap(result)).toBe(42);
      });
    });

    describe('flatMap', () => {
      it('should chain Ok results', () => {
        const result = Result.flatMap(Result.ok(2), (x) => Result.ok(x * 2));

        expect(Result.unwrap(result)).toBe(4);
      });

      it('should short-circuit on Err', () => {
        // noinspection JSVoidFunctionReturnValueUsed
        const fn = vi.fn(() => Result.ok(42));
        const result = Result.flatMap(Result.err('error'), fn);

        expect(Result.unwrapErr(result)).toBe('error');
        expect(fn).not.toHaveBeenCalled();
      });

      it('should propagate Err from chained function', () => {
        const result = Result.flatMap(Result.ok(2), () => Result.err('chained error'));

        expect(Result.unwrapErr(result)).toBe('chained error');
      });
    });
  });

  describe('utilities', () => {
    describe('fromTry', () => {
      it('should return Ok for successful function', () => {
        const result = Result.fromTry(() => JSON.parse('{"foo": 42}'));

        expect(Result.isOk(result)).toBe(true);
        expect(Result.unwrap(result)).toEqual({ foo: 42 });
      });

      it('should return Err for throwing function', () => {
        const result = Result.fromTry(() => JSON.parse('invalid'));

        expect(Result.isErr(result)).toBe(true);
      });

      it('should use custom error mapper', () => {
        const result = Result.fromTry(
          () => JSON.parse('invalid'),
          () => 'Parse failed'
        );

        expect(Result.unwrapErr(result)).toBe('Parse failed');
      });
    });

    describe('fromPromise', () => {
      it('should return Ok for resolved promise', async () => {
        const result = await Result.fromPromise(Promise.resolve(42));

        expect(Result.isOk(result)).toBe(true);
        expect(Result.unwrap(result)).toBe(42);
      });

      it('should return Err for rejected promise', async () => {
        const result = await Result.fromPromise(Promise.reject(new Error('failed')));

        expect(Result.isErr(result)).toBe(true);
      });

      it('should use custom error mapper', async () => {
        const result = await Result.fromPromise(
          Promise.reject(new Error('failed')),
          () => 'Mapped error'
        );

        expect(Result.unwrapErr(result)).toBe('Mapped error');
      });
    });

    describe('tap', () => {
      it('should call function for Ok and return same result', () => {
        // noinspection JSVoidFunctionReturnValueUsed
        const fn = vi.fn();
        const original = Result.ok(42);
        const result = Result.tap(original, fn);

        expect(fn).toHaveBeenCalledWith(42);
        expect(result).toBe(original);
      });

      it('should not call function for Err', () => {
        // noinspection JSVoidFunctionReturnValueUsed
        const fn = vi.fn();
        const original = Result.err('error');
        const result = Result.tap(original, fn);

        expect(fn).not.toHaveBeenCalled();
        expect(result).toBe(original);
      });
    });

    describe('tapErr', () => {
      it('should call function for Err and return same result', () => {
        // noinspection JSVoidFunctionReturnValueUsed
        const fn = vi.fn();
        const original = Result.err('error');
        const result = Result.tapErr(original, fn);

        expect(fn).toHaveBeenCalledWith('error');
        expect(result).toBe(original);
      });

      it('should not call function for Ok', () => {
        // noinspection JSVoidFunctionReturnValueUsed
        const fn = vi.fn();
        const original = Result.ok(42);
        const result = Result.tapErr(original, fn);

        expect(fn).not.toHaveBeenCalled();
        expect(result).toBe(original);
      });
    });

    describe('match', () => {
      it('should call ok handler for Ok', () => {
        const result = Result.match(Result.ok(42), {
          ok: (x) => `Value: ${x}`,
          err: (e) => `Error: ${e}`,
        });

        expect(result).toBe('Value: 42');
      });

      it('should call err handler for Err', () => {
        const result = Result.match(Result.err('oops'), {
          ok: (x) => `Value: ${x}`,
          err: (e) => `Error: ${e}`,
        });

        expect(result).toBe('Error: oops');
      });
    });
  });
});
