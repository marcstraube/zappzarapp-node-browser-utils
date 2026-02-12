/**
 * Request middleware pipeline logic.
 * Internal module for managing middleware execution.
 */

import { RequestError } from './RequestInterceptor.js';
import type {
  MutableRequestConfig,
  InterceptedResponse,
  RequestMiddleware,
  RequestConfig,
  RequestTiming,
  TimingHandler,
} from './RequestInterceptor.js';

/**
 * Run request through middleware chain.
 */
export async function runRequestMiddleware(
  config: MutableRequestConfig,
  middlewares: readonly RequestMiddleware[]
): Promise<MutableRequestConfig> {
  let result = config;

  for (const middleware of middlewares) {
    if (middleware.onRequest) {
      try {
        result = await middleware.onRequest(result);
      } catch (e) {
        throw RequestError.middlewareError('request', e);
      }
    }
  }

  return result;
}

/**
 * Run response through middleware chain.
 */
export async function runResponseMiddleware(
  response: InterceptedResponse,
  middlewares: readonly RequestMiddleware[]
): Promise<InterceptedResponse> {
  let result = response;

  for (const middleware of middlewares) {
    if (middleware.onResponse) {
      try {
        result = await middleware.onResponse(result);
      } catch (e) {
        throw RequestError.middlewareError('response', e);
      }
    }
  }

  return result;
}

/**
 * Run error middleware.
 */
export async function runErrorMiddleware(
  error: RequestError,
  config: RequestConfig,
  middlewares: readonly RequestMiddleware[]
): Promise<void> {
  for (const middleware of middlewares) {
    if (middleware.onError) {
      try {
        await middleware.onError(error, config);
      } catch {
        // Ignore errors in error handlers
      }
    }
  }
}

/**
 * Emit timing event to all handlers.
 */
export function emitTiming(timing: RequestTiming, handlers: ReadonlySet<TimingHandler>): void {
  for (const handler of handlers) {
    try {
      handler(timing);
    } catch {
      // Ignore handler errors
    }
  }
}
