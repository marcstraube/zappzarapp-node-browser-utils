// noinspection JSUnusedGlobalSymbols,JSUnusedLocalSymbols - Example file

/**
 * Request Interceptor Example - Fetch Interceptor with Auth and Retry Middleware
 *
 * This example demonstrates:
 * - Creating a request interceptor with authentication
 * - Adding middleware for logging, retry, and error handling
 * - Token refresh middleware for JWT authentication
 * - Request timing and performance monitoring
 * - Error handling strategies
 *
 * @packageDocumentation
 */

import { type CleanupFn } from '@zappzarapp/browser-utils/core';
import {
  RequestInterceptor,
  RequestError,
  type RequestMiddleware,
  type MutableRequestConfig,
  type InterceptedResponse,
  type RequestConfig,
  type RequestInterceptorInstance,
  type AuthConfig,
} from '@zappzarapp/browser-utils/request';

// =============================================================================
// Types
// =============================================================================

/**
 * Token storage interface for authentication.
 */
interface TokenStorage {
  getAccessToken(): string | null;
  getRefreshToken(): string | null;
  setTokens(accessToken: string, refreshToken: string): void;
  clearTokens(): void;
}

/**
 * API response wrapper.
 */
interface ApiResponse<T> {
  readonly data: T;
  readonly status: number;
  readonly headers: Headers;
}

/**
 * Retry configuration.
 */
interface RetryConfig {
  readonly maxRetries: number;
  readonly retryDelay: number;
  readonly retryOn: readonly number[];
}

/**
 * Auth tokens response from refresh endpoint.
 */
interface AuthTokens {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresIn: number;
}

// =============================================================================
// Token Storage Implementation
// =============================================================================

/**
 * Simple in-memory token storage.
 * In production, consider using encrypted storage.
 */
function createTokenStorage(): TokenStorage {
  let accessToken: string | null = null;
  let refreshToken: string | null = null;

  return {
    getAccessToken: () => accessToken,
    getRefreshToken: () => refreshToken,
    setTokens: (access: string, refresh: string) => {
      accessToken = access;
      refreshToken = refresh;
    },
    clearTokens: () => {
      accessToken = null;
      refreshToken = null;
    },
  };
}

// =============================================================================
// Middleware: Request Logging
// =============================================================================

/**
 * Create a logging middleware for request/response tracking.
 */
function createLoggingMiddleware(prefix = '[API]'): RequestMiddleware {
  return {
    onRequest: (config: MutableRequestConfig) => {
      // Redact sensitive headers for logging
      const safeHeaders = RequestInterceptor.redactHeaders(config.headers);

      console.log(`${prefix} Request: ${config.method} ${config.url}`);
      console.log(`${prefix} Headers:`, safeHeaders);

      if (config.body !== null && config.body !== undefined) {
        console.log(`${prefix} Body:`, config.body);
      }

      return config;
    },

    onResponse: (response: InterceptedResponse) => {
      console.log(
        `${prefix} Response: ${response.status} ${response.statusText} (${Math.round(response.duration)}ms)`
      );

      return response;
    },

    onError: (error: RequestError, config: RequestConfig) => {
      console.error(`${prefix} Error: ${error.code} - ${error.message}`);
      console.error(`${prefix} URL: ${config.url}`);
    },
  };
}

// =============================================================================
// Middleware: Retry with Exponential Backoff
// =============================================================================

/**
 * Create a retry middleware for failed requests.
 * Note: This middleware must be used with a custom fetch wrapper for retry logic.
 */
function createRetryMiddleware(config: RetryConfig): RequestMiddleware {
  return {
    onRequest: (requestConfig: MutableRequestConfig) => {
      // Initialize retry count in metadata
      requestConfig.metadata = {
        ...requestConfig.metadata,
        retryCount: 0,
        maxRetries: config.maxRetries,
        retryDelay: config.retryDelay,
        retryOn: config.retryOn,
      };

      return requestConfig;
    },

    onError: async (_error: RequestError, requestConfig: RequestConfig) => {
      const metadata = requestConfig.metadata ?? {};
      const retryCount = (metadata.retryCount as number) ?? 0;
      const maxRetries = (metadata.maxRetries as number) ?? config.maxRetries;

      // Log retry status
      if (retryCount < maxRetries) {
        console.log(`[Retry] Request failed, will retry (${retryCount + 1}/${maxRetries})`);
      } else {
        console.log(`[Retry] Max retries reached for ${requestConfig.url}`);
      }
    },
  };
}

/**
 * Helper function to execute a request with retry logic.
 */
async function fetchWithRetry(
  api: RequestInterceptorInstance,
  url: string,
  options: RequestInit = {},
  retryConfig: RetryConfig = { maxRetries: 3, retryDelay: 1000, retryOn: [500, 502, 503, 504] }
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      const response = await api.fetch(url, options);

      // Check if we should retry based on status code
      if (retryConfig.retryOn.includes(response.status) && attempt < retryConfig.maxRetries) {
        const delay = retryConfig.retryDelay * Math.pow(2, attempt);
        console.log(`[Retry] Status ${response.status}, retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < retryConfig.maxRetries) {
        const delay = retryConfig.retryDelay * Math.pow(2, attempt);
        console.log(`[Retry] Request failed, retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError ?? new Error('Request failed after retries');
}

// =============================================================================
// Middleware: Token Refresh
// =============================================================================

/**
 * Create middleware that handles automatic token refresh.
 */
function createTokenRefreshMiddleware(
  tokenStorage: TokenStorage,
  refreshEndpoint: string,
  api: RequestInterceptorInstance
): RequestMiddleware {
  let refreshPromise: Promise<boolean> | null = null;

  /**
   * Refresh the access token using the refresh token.
   */
  async function refreshTokens(): Promise<boolean> {
    const refreshToken = tokenStorage.getRefreshToken();

    if (refreshToken === null) {
      console.log('[Auth] No refresh token available');
      return false;
    }

    try {
      console.log('[Auth] Refreshing access token...');

      // Temporarily clear auth to avoid infinite loop
      api.setAuth(null);

      const response = await api.post(refreshEndpoint, JSON.stringify({ refreshToken }), {
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        console.error('[Auth] Token refresh failed:', response.status);
        tokenStorage.clearTokens();
        return false;
      }

      const tokens: AuthTokens = await response.json();
      tokenStorage.setTokens(tokens.accessToken, tokens.refreshToken);

      // Restore auth with new token
      api.setAuth({
        type: 'bearer',
        token: () => tokenStorage.getAccessToken() ?? '',
      });

      console.log('[Auth] Token refreshed successfully');
      return true;
    } catch (error) {
      console.error('[Auth] Token refresh failed:', error);
      tokenStorage.clearTokens();
      return false;
    }
  }

  return {
    onResponse: async (response: InterceptedResponse) => {
      // Check for 401 Unauthorized
      if (response.status === 401) {
        console.log('[Auth] Received 401, attempting token refresh...');

        // Ensure only one refresh happens at a time
        if (refreshPromise === null) {
          refreshPromise = refreshTokens().finally(() => {
            refreshPromise = null;
          });
        }

        const success = await refreshPromise;

        if (!success) {
          // Emit event for app to handle (e.g., redirect to login)
          window.dispatchEvent(
            new CustomEvent('auth:logout', { detail: { reason: 'token_expired' } })
          );
        }
      }

      return response;
    },
  };
}

// =============================================================================
// Middleware: Request Timing
// =============================================================================

/**
 * Create middleware that tracks request timing for performance monitoring.
 */
function createTimingMiddleware(
  onTiming: (url: string, duration: number, status: number) => void
): RequestMiddleware {
  return {
    onResponse: (response: InterceptedResponse) => {
      onTiming(response.url, response.duration, response.status);
      return response;
    },
  };
}

// =============================================================================
// Middleware: Request ID
// =============================================================================

/**
 * Create middleware that adds a unique request ID to each request.
 */
function createRequestIdMiddleware(): RequestMiddleware {
  return {
    onRequest: (config: MutableRequestConfig) => {
      const requestId = crypto.randomUUID();
      config.headers.set('X-Request-ID', requestId);
      config.metadata = { ...config.metadata, requestId };

      return config;
    },
  };
}

// =============================================================================
// API Client Factory
// =============================================================================

/**
 * Create a configured API client with all middleware.
 */
function createApiClient(options: {
  baseUrl: string;
  tokenStorage: TokenStorage;
  onTiming?: (url: string, duration: number, status: number) => void;
}): {
  api: RequestInterceptorInstance;
  cleanup: () => void;
} {
  const { baseUrl, tokenStorage, onTiming } = options;
  const cleanups: CleanupFn[] = [];

  // Create the interceptor with base configuration
  const api = RequestInterceptor.create({
    baseUrl,
    timeout: 30000,
    throwOnError: false,
    defaultHeaders: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    auth: {
      type: 'bearer',
      token: () => tokenStorage.getAccessToken() ?? '',
    },
    // Security: Only allow HTTPS (except for localhost)
    allowedProtocols: ['https:'],
    validateCredentialOrigin: true,
  });

  // Add middleware in order (executed top to bottom for requests, bottom to top for responses)

  // 1. Request ID (first, so all logs include it)
  cleanups.push(api.use(createRequestIdMiddleware()));

  // 2. Logging
  cleanups.push(api.use(createLoggingMiddleware('[API]')));

  // 3. Token refresh (handles 401 responses)
  cleanups.push(api.use(createTokenRefreshMiddleware(tokenStorage, '/auth/refresh', api)));

  // 4. Timing (if callback provided)
  if (onTiming !== undefined) {
    cleanups.push(api.use(createTimingMiddleware(onTiming)));
  }

  // Add timing handler for detailed performance tracking
  // noinspection JSVoidFunctionReturnValueUsed - onTiming returns CleanupFn
  const timingCleanup: CleanupFn = api.onTiming((timing) => {
    if (timing.error !== undefined) {
      console.log(`[Timing] ${timing.method} ${timing.url}: ERROR - ${timing.error}`);
    } else {
      console.log(
        `[Timing] ${timing.method} ${timing.url}: ${Math.round(timing.duration)}ms (${timing.status})`
      );
    }
  });
  cleanups.push(timingCleanup);

  return {
    api,
    cleanup: () => {
      for (const fn of cleanups) {
        fn();
      }
      api.destroy();
    },
  };
}

// =============================================================================
// Example: REST API Wrapper
// =============================================================================

/**
 * Create a typed REST API wrapper.
 */
function createRestApi<T>(api: RequestInterceptorInstance, basePath: string) {
  /**
   * Parse response with error handling.
   */
  async function parseResponse<R>(response: Response): Promise<ApiResponse<R>> {
    if (!response.ok) {
      const error = await response.text().catch(() => response.statusText);
      throw new Error(`API Error (${response.status}): ${error}`);
    }

    const data: R = await response.json();

    return {
      data,
      status: response.status,
      headers: response.headers,
    };
  }

  return {
    /**
     * Get all items.
     */
    async getAll(): Promise<ApiResponse<T[]>> {
      const response = await api.get(basePath);
      return parseResponse<T[]>(response);
    },

    /**
     * Get item by ID.
     */
    async getById(id: string | number): Promise<ApiResponse<T>> {
      const response = await api.get(`${basePath}/${id}`);
      return parseResponse<T>(response);
    },

    /**
     * Create a new item.
     */
    async create(data: Partial<T>): Promise<ApiResponse<T>> {
      const response = await api.post(basePath, JSON.stringify(data));
      return parseResponse<T>(response);
    },

    /**
     * Update an item.
     */
    async update(id: string | number, data: Partial<T>): Promise<ApiResponse<T>> {
      const response = await api.put(`${basePath}/${id}`, JSON.stringify(data));
      return parseResponse<T>(response);
    },

    /**
     * Partially update an item.
     */
    async patch(id: string | number, data: Partial<T>): Promise<ApiResponse<T>> {
      const response = await api.patch(`${basePath}/${id}`, JSON.stringify(data));
      return parseResponse<T>(response);
    },

    /**
     * Delete an item.
     */
    async delete(id: string | number): Promise<void> {
      const response = await api.delete(`${basePath}/${id}`);
      if (!response.ok) {
        throw new Error(`Delete failed: ${response.status}`);
      }
    },
  };
}

// =============================================================================
// Example Usage
// =============================================================================

/**
 * Example: User interface for demo.
 */
interface User {
  readonly id: number;
  readonly name: string;
  readonly email: string;
  readonly role: 'admin' | 'user';
}

/**
 * Example: Setting up and using the API client.
 */
async function exampleUsage(): Promise<void> {
  console.log('=== Request Interceptor Example ===\n');

  // Create token storage
  const tokenStorage = createTokenStorage();

  // Simulate having tokens
  tokenStorage.setTokens('example-access-token', 'example-refresh-token');

  // Create API client
  const { api, cleanup } = createApiClient({
    baseUrl: 'https://jsonplaceholder.typicode.com',
    tokenStorage,
    onTiming: (url, duration, status) => {
      // Send to performance monitoring
      console.log(`[Monitor] ${url}: ${duration}ms (${status})`);
    },
  });

  try {
    // Create typed REST API for users
    const usersApi = createRestApi<User>(api, '/users');

    // Get all users
    console.log('\n--- Fetching Users ---');
    const allUsers = await usersApi.getAll();
    console.log(`Fetched ${allUsers.data.length} users`);

    // Get single user
    console.log('\n--- Fetching Single User ---');
    const user = await usersApi.getById(1);
    console.log('User:', user.data.name);

    // Example: Request with retry
    console.log('\n--- Request with Retry ---');
    const response = await fetchWithRetry(
      api,
      '/posts/1',
      {},
      {
        maxRetries: 3,
        retryDelay: 500,
        retryOn: [500, 502, 503],
      }
    );
    const post = await response.json();
    console.log('Post:', post.title);

    // Example: Parallel requests
    console.log('\n--- Parallel Requests ---');
    const [user1, user2, user3] = await Promise.all([
      usersApi.getById(1),
      usersApi.getById(2),
      usersApi.getById(3),
    ]);
    console.log('Users:', [user1.data.name, user2.data.name, user3.data.name].join(', '));

    // Example: Error handling
    console.log('\n--- Error Handling ---');
    try {
      await usersApi.getById(99999);
    } catch (error) {
      console.log('Expected error caught:', error instanceof Error ? error.message : error);
    }
  } finally {
    // Clean up
    cleanup();
    console.log('\n=== Example Complete ===');
  }
}

// =============================================================================
// Auth Configuration Examples
// =============================================================================

/**
 * Example: Different authentication configurations.
 */
function authExamples(): void {
  // Bearer token (most common for APIs)
  const bearerAuth: AuthConfig = {
    type: 'bearer',
    token: () => localStorage.getItem('token') ?? '',
  };

  // API key in header
  const apiKeyAuth: AuthConfig = {
    type: 'api-key',
    apiKey: 'your-api-key-here',
    apiKeyHeader: 'X-API-Key', // Default is X-API-Key
  };

  // Basic authentication
  const basicAuth: AuthConfig = {
    type: 'basic',
    username: 'user',
    password: 'pass',
  };

  // Custom header authentication
  const customAuth: AuthConfig = {
    type: 'custom',
    customHeader: {
      name: 'X-Custom-Auth',
      value: async () => {
        // Async token retrieval
        const token = await fetchTokenFromService();
        return `Custom ${token}`;
      },
    },
  };

  console.log('Auth configs:', { bearerAuth, apiKeyAuth, basicAuth, customAuth });
}

/**
 * Placeholder for async token fetching.
 */
async function fetchTokenFromService(): Promise<string> {
  return 'async-token';
}

// =============================================================================
// Exports
// =============================================================================

export {
  authExamples,
  createApiClient,
  createRestApi,
  createLoggingMiddleware,
  createRetryMiddleware,
  createTokenRefreshMiddleware,
  createTimingMiddleware,
  createRequestIdMiddleware,
  createTokenStorage,
  fetchWithRetry,
  type TokenStorage,
  type ApiResponse,
  type RetryConfig,
};

// Run example if this is the entry point
if (typeof window !== 'undefined') {
  void exampleUsage();
}
