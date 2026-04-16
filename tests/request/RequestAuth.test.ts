import { describe, it, expect } from 'vitest';
import {
  resolveValue,
  applyBearerAuth,
  applyApiKeyAuth,
  applyBasicAuth,
  applyCustomAuth,
  applyAuth,
} from '../../src/request/RequestAuth.js';

describe('RequestAuth', () => {
  describe('resolveValue', () => {
    it('should return empty string for undefined', async () => {
      expect(await resolveValue(undefined)).toBe('');
    });

    it('should return string value as-is', async () => {
      expect(await resolveValue('token123')).toBe('token123');
    });

    it('should call function and return result', async () => {
      expect(await resolveValue(() => 'dynamic-token')).toBe('dynamic-token');
    });

    it('should handle async function', async () => {
      expect(await resolveValue(async () => 'async-token')).toBe('async-token');
    });
  });

  describe('applyBearerAuth', () => {
    it('should set Authorization header with Bearer token', async () => {
      const headers = new Headers();
      await applyBearerAuth(headers, { type: 'bearer', token: 'mytoken' });

      expect(headers.get('Authorization')).toBe('Bearer mytoken');
    });

    it('should not set header for empty token', async () => {
      const headers = new Headers();
      await applyBearerAuth(headers, { type: 'bearer', token: '' });

      expect(headers.has('Authorization')).toBe(false);
    });

    it('should resolve token from function', async () => {
      const headers = new Headers();
      await applyBearerAuth(headers, { type: 'bearer', token: () => 'fn-token' });

      expect(headers.get('Authorization')).toBe('Bearer fn-token');
    });
  });

  describe('applyApiKeyAuth', () => {
    it('should set X-API-Key header by default', async () => {
      const headers = new Headers();
      await applyApiKeyAuth(headers, { type: 'api-key', apiKey: 'key123' });

      expect(headers.get('X-API-Key')).toBe('key123');
    });

    it('should use custom header name', async () => {
      const headers = new Headers();
      await applyApiKeyAuth(headers, {
        type: 'api-key',
        apiKey: 'key123',
        apiKeyHeader: 'X-Custom-Key',
      });

      expect(headers.get('X-Custom-Key')).toBe('key123');
    });

    it('should not set header for empty API key', async () => {
      const headers = new Headers();
      await applyApiKeyAuth(headers, { type: 'api-key', apiKey: '' });

      expect(headers.has('X-API-Key')).toBe(false);
    });
  });

  describe('applyBasicAuth', () => {
    it('should set Basic auth header', () => {
      const headers = new Headers();
      applyBasicAuth(headers, {
        type: 'basic',
        username: 'user',
        password: 'pass',
      });

      expect(headers.get('Authorization')).toBe(`Basic ${btoa('user:pass')}`);
    });

    it('should not set header when username is missing', () => {
      const headers = new Headers();
      applyBasicAuth(headers, { type: 'basic', password: 'pass' });

      expect(headers.has('Authorization')).toBe(false);
    });

    it('should not set header when password is missing', () => {
      const headers = new Headers();
      applyBasicAuth(headers, { type: 'basic', username: 'user' });

      expect(headers.has('Authorization')).toBe(false);
    });

    it('should not set header when username is empty', () => {
      const headers = new Headers();
      applyBasicAuth(headers, { type: 'basic', username: '', password: 'pass' });

      expect(headers.has('Authorization')).toBe(false);
    });

    it('should not set header when password is empty', () => {
      const headers = new Headers();
      applyBasicAuth(headers, { type: 'basic', username: 'user', password: '' });

      expect(headers.has('Authorization')).toBe(false);
    });
  });

  describe('applyCustomAuth', () => {
    it('should set custom header', async () => {
      const headers = new Headers();
      await applyCustomAuth(headers, {
        type: 'custom',
        customHeader: { name: 'X-Token', value: 'myval' },
      });

      expect(headers.get('X-Token')).toBe('myval');
    });

    it('should do nothing when customHeader is undefined', async () => {
      const headers = new Headers();
      await applyCustomAuth(headers, { type: 'custom' });

      expect([...headers.keys()]).toHaveLength(0);
    });
  });

  describe('applyAuth', () => {
    it('should do nothing for null auth', async () => {
      const headers = new Headers();
      await applyAuth(headers, null);

      expect([...headers.keys()]).toHaveLength(0);
    });

    it('should delegate to bearer auth', async () => {
      const headers = new Headers();
      await applyAuth(headers, { type: 'bearer', token: 'tok' });

      expect(headers.get('Authorization')).toContain('Bearer');
    });

    it('should delegate to api-key auth', async () => {
      const headers = new Headers();
      await applyAuth(headers, { type: 'api-key', apiKey: 'key' });

      expect(headers.has('X-API-Key')).toBe(true);
    });

    it('should delegate to basic auth', async () => {
      const headers = new Headers();
      await applyAuth(headers, { type: 'basic', username: 'u', password: 'p' });

      expect(headers.get('Authorization')).toContain('Basic');
    });

    it('should delegate to custom auth', async () => {
      const headers = new Headers();
      await applyAuth(headers, {
        type: 'custom',
        customHeader: { name: 'X-My', value: 'val' },
      });

      expect(headers.get('X-My')).toBe('val');
    });
  });
});
