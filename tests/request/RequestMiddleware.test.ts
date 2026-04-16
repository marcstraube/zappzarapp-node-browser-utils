import { describe, it, expect, vi } from 'vitest';
import {
  runRequestMiddleware,
  runResponseMiddleware,
  runErrorMiddleware,
  emitTiming,
} from '../../src/request/RequestMiddleware.js';
import {
  RequestError,
  type InterceptedResponse,
  type RequestTiming,
} from '../../src/request/index.js';

describe('RequestMiddleware', () => {
  describe('runRequestMiddleware', () => {
    it('should pass config through middleware chain', async () => {
      const config = { url: '/api', method: 'GET' as const, headers: new Headers() };
      const middleware = {
        onRequest: vi.fn().mockImplementation((c) => ({ ...c, url: '/modified' })),
      };

      const result = await runRequestMiddleware(config, [middleware]);
      expect(result.url).toBe('/modified');
      expect(middleware.onRequest).toHaveBeenCalledWith(config);
    });

    it('should chain multiple middlewares', async () => {
      const config = { url: '/api', method: 'GET' as const, headers: new Headers() };
      const mw1 = { onRequest: vi.fn().mockImplementation((c) => ({ ...c, url: c.url + '/1' })) };
      const mw2 = { onRequest: vi.fn().mockImplementation((c) => ({ ...c, url: c.url + '/2' })) };

      const result = await runRequestMiddleware(config, [mw1, mw2]);
      expect(result.url).toBe('/api/1/2');
    });

    it('should skip middleware without onRequest', async () => {
      const config = { url: '/api', method: 'GET' as const, headers: new Headers() };
      const result = await runRequestMiddleware(config, [{}]);
      expect(result.url).toBe('/api');
    });

    it('should throw RequestError when middleware throws', async () => {
      const config = { url: '/api', method: 'GET' as const, headers: new Headers() };
      const middleware = {
        onRequest: vi.fn().mockRejectedValue(new Error('middleware failed')),
      };

      await expect(runRequestMiddleware(config, [middleware])).rejects.toThrow(RequestError);
    });
  });

  describe('runResponseMiddleware', () => {
    it('should pass response through middleware chain', async () => {
      const response: InterceptedResponse = {
        status: 200,
        statusText: 'OK',
        url: '/api',
        duration: 10,
        response: new Response(),
        headers: new Headers(),
      };
      const middleware = {
        onResponse: vi.fn().mockImplementation((r) => ({ ...r, url: '/modified' })),
      };

      const result = await runResponseMiddleware(response, [middleware]);
      expect(result.url).toBe('/modified');
    });

    it('should skip middleware without onResponse', async () => {
      const response: InterceptedResponse = {
        status: 200,
        statusText: 'OK',
        url: '/api',
        duration: 0,
        response: new Response(),
        headers: new Headers(),
      };
      const result = await runResponseMiddleware(response, [{}]);
      expect(result.status).toBe(200);
    });

    it('should throw RequestError when middleware throws', async () => {
      const response: InterceptedResponse = {
        status: 200,
        statusText: 'OK',
        url: '/api',
        duration: 0,
        response: new Response(),
        headers: new Headers(),
      };
      const middleware = {
        onResponse: vi.fn().mockRejectedValue(new Error('response failed')),
      };

      await expect(runResponseMiddleware(response, [middleware])).rejects.toThrow(RequestError);
    });
  });

  describe('runErrorMiddleware', () => {
    it('should call onError for each middleware', async () => {
      const error = new RequestError('REQUEST_FAILED', 'fail');
      const config = { url: '/api', method: 'GET' as const, headers: new Headers() };
      const mw1 = { onError: vi.fn() };
      const mw2 = { onError: vi.fn() };

      await runErrorMiddleware(error, config, [mw1, mw2]);
      expect(mw1.onError).toHaveBeenCalledWith(error, config);
      expect(mw2.onError).toHaveBeenCalledWith(error, config);
    });

    it('should skip middleware without onError', async () => {
      const error = new RequestError('REQUEST_FAILED', 'fail');
      const config = { url: '/api', method: 'GET' as const, headers: new Headers() };

      await expect(runErrorMiddleware(error, config, [{}])).resolves.toBeUndefined();
    });

    it('should ignore errors in error handlers', async () => {
      const error = new RequestError('REQUEST_FAILED', 'fail');
      const config = { url: '/api', method: 'GET' as const, headers: new Headers() };
      const middleware = {
        onError: vi.fn().mockRejectedValue(new Error('handler failed')),
      };

      await expect(runErrorMiddleware(error, config, [middleware])).resolves.toBeUndefined();
    });
  });

  describe('emitTiming', () => {
    it('should call all timing handlers', () => {
      const timing: RequestTiming = {
        url: '/api',
        method: 'GET',
        duration: 100,
        status: 200,
        startTime: 0,
        endTime: 100,
      };
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      emitTiming(timing, new Set([handler1, handler2]));
      expect(handler1).toHaveBeenCalledWith(timing);
      expect(handler2).toHaveBeenCalledWith(timing);
    });

    it('should ignore handler errors', () => {
      const timing: RequestTiming = {
        url: '/api',
        method: 'GET',
        duration: 100,
        startTime: 0,
        endTime: 100,
      };
      const badHandler = vi.fn().mockImplementation(() => {
        throw new Error('bad');
      });
      const goodHandler = vi.fn();

      emitTiming(timing, new Set([badHandler, goodHandler]));
      expect(goodHandler).toHaveBeenCalledWith(timing);
    });
  });
});
