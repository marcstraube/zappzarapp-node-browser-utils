/**
 * Request authentication helpers.
 * Internal module for managing authentication headers.
 */

import type { AuthConfig } from './RequestInterceptor.js';

/**
 * Resolve a value that can be a string or a function returning a string.
 */
export async function resolveValue(
  value: string | (() => string | Promise<string>) | undefined
): Promise<string> {
  if (value === undefined) return '';
  return typeof value === 'function' ? await value() : value;
}

/**
 * Apply Bearer token authentication.
 */
export async function applyBearerAuth(headers: Headers, auth: AuthConfig): Promise<void> {
  const token = await resolveValue(auth.token);
  // Only set header if token is non-empty (not a timing-sensitive comparison)
  if (token.length > 0) {
    headers.set('Authorization', `Bearer ${token}`);
  }
}

/**
 * Apply API key authentication.
 */
export async function applyApiKeyAuth(headers: Headers, auth: AuthConfig): Promise<void> {
  const apiKey = await resolveValue(auth.apiKey);
  // Only set header if API key is non-empty (not a timing-sensitive comparison)
  if (apiKey.length > 0) {
    const headerName = auth.apiKeyHeader ?? 'X-API-Key';
    headers.set(headerName, apiKey);
  }
}

/**
 * Apply Basic authentication.
 */
export function applyBasicAuth(headers: Headers, auth: AuthConfig): void {
  const username = auth.username;
  const password = auth.password;
  const hasCredentials =
    username !== undefined && username !== '' && password !== undefined && password !== '';
  if (hasCredentials) {
    const credentials = btoa(`${username}:${password}`);
    headers.set('Authorization', `Basic ${credentials}`);
  }
}

/**
 * Apply custom header authentication.
 */
export async function applyCustomAuth(headers: Headers, auth: AuthConfig): Promise<void> {
  const customHeader = auth.customHeader;
  if (customHeader !== undefined) {
    const value = await resolveValue(customHeader.value);
    headers.set(customHeader.name, value);
  }
}

/**
 * Apply authentication to headers based on auth config.
 */
export async function applyAuth(headers: Headers, auth: AuthConfig | null): Promise<void> {
  // eslint-disable-next-line security/detect-possible-timing-attacks -- Checking for null config object, not comparing secrets
  if (auth === null) return;

  switch (auth.type) {
    case 'bearer':
      await applyBearerAuth(headers, auth);
      break;
    case 'api-key':
      await applyApiKeyAuth(headers, auth);
      break;
    case 'basic':
      applyBasicAuth(headers, auth);
      break;
    case 'custom':
      await applyCustomAuth(headers, auth);
      break;
  }
}
