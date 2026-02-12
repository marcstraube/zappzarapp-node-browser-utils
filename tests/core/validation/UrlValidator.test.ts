import { describe, it, expect } from 'vitest';
import { ValidationError, Result } from '../../../src/core/index.js';
import { UrlValidator } from '../../../src/core/validation';

describe('UrlValidator', () => {
  // ===========================================================================
  // Default Safe Protocols
  // ===========================================================================

  describe('DEFAULT_SAFE_PROTOCOLS', () => {
    it('should include http', () => {
      expect(UrlValidator.DEFAULT_SAFE_PROTOCOLS).toContain('http');
    });

    it('should include https', () => {
      expect(UrlValidator.DEFAULT_SAFE_PROTOCOLS).toContain('https');
    });

    it('should include ws', () => {
      expect(UrlValidator.DEFAULT_SAFE_PROTOCOLS).toContain('ws');
    });

    it('should include wss', () => {
      expect(UrlValidator.DEFAULT_SAFE_PROTOCOLS).toContain('wss');
    });

    it('should include mailto', () => {
      expect(UrlValidator.DEFAULT_SAFE_PROTOCOLS).toContain('mailto');
    });

    it('should include ftp', () => {
      expect(UrlValidator.DEFAULT_SAFE_PROTOCOLS).toContain('ftp');
    });

    it('should include ftps', () => {
      expect(UrlValidator.DEFAULT_SAFE_PROTOCOLS).toContain('ftps');
    });

    it('should be readonly array', () => {
      expect(Array.isArray(UrlValidator.DEFAULT_SAFE_PROTOCOLS)).toBe(true);
    });
  });

  // ===========================================================================
  // urlSafe - Throwing API
  // ===========================================================================

  describe('urlSafe', () => {
    describe('allowed protocols', () => {
      it('should accept http URL', () => {
        expect(() => UrlValidator.urlSafe('http://example.com')).not.toThrow();
      });

      it('should accept https URL', () => {
        expect(() => UrlValidator.urlSafe('https://example.com')).not.toThrow();
      });

      it('should accept ws URL', () => {
        expect(() => UrlValidator.urlSafe('ws://example.com/socket')).not.toThrow();
      });

      it('should accept wss URL', () => {
        expect(() => UrlValidator.urlSafe('wss://example.com/socket')).not.toThrow();
      });

      it('should accept mailto URL', () => {
        expect(() => UrlValidator.urlSafe('mailto:user@example.com')).not.toThrow();
      });

      it('should accept ftp URL', () => {
        expect(() => UrlValidator.urlSafe('ftp://ftp.example.com/file')).not.toThrow();
      });

      it('should accept ftps URL', () => {
        expect(() => UrlValidator.urlSafe('ftps://ftp.example.com/file')).not.toThrow();
      });
    });

    describe('blocked protocols', () => {
      it('should throw for javascript: protocol', () => {
        expect(() => UrlValidator.urlSafe('javascript:alert(1)')).toThrow(ValidationError);
      });

      it('should throw for data: protocol', () => {
        expect(() => UrlValidator.urlSafe('data:text/html,<script>alert(1)</script>')).toThrow(
          ValidationError
        );
      });

      it('should throw for vbscript: protocol', () => {
        expect(() => UrlValidator.urlSafe('vbscript:msgbox(1)')).toThrow(ValidationError);
      });

      it('should throw for file: protocol', () => {
        expect(() => UrlValidator.urlSafe('file:///etc/passwd')).toThrow(ValidationError);
      });

      it('should throw for unknown protocol', () => {
        expect(() => UrlValidator.urlSafe('custom://something')).toThrow(ValidationError);
      });
    });

    describe('case insensitivity', () => {
      it('should accept HTTPS in uppercase', () => {
        expect(() => UrlValidator.urlSafe('HTTPS://example.com')).not.toThrow();
      });

      it('should block JAVASCRIPT in uppercase', () => {
        expect(() => UrlValidator.urlSafe('JAVASCRIPT:alert(1)')).toThrow(ValidationError);
      });

      it('should block mixed case javascript', () => {
        expect(() => UrlValidator.urlSafe('JaVaScRiPt:alert(1)')).toThrow(ValidationError);
      });
    });

    describe('edge cases', () => {
      it('should throw for empty URL', () => {
        expect(() => UrlValidator.urlSafe('')).toThrow(ValidationError);
      });

      it('should accept relative URL without protocol', () => {
        expect(() => UrlValidator.urlSafe('/path/to/resource')).not.toThrow();
      });

      it('should accept URL with query string', () => {
        expect(() => UrlValidator.urlSafe('https://example.com?foo=bar')).not.toThrow();
      });

      it('should accept URL with hash', () => {
        expect(() => UrlValidator.urlSafe('https://example.com#section')).not.toThrow();
      });
    });

    describe('custom protocols via options', () => {
      it('should accept tel: with additionalProtocols', () => {
        expect(() =>
          UrlValidator.urlSafe('tel:+1234567890', { additionalProtocols: ['tel'] })
        ).not.toThrow();
      });

      it('should accept sms: with additionalProtocols', () => {
        expect(() =>
          UrlValidator.urlSafe('sms:+1234567890', { additionalProtocols: ['sms'] })
        ).not.toThrow();
      });

      it('should accept geo: with additionalProtocols', () => {
        expect(() =>
          UrlValidator.urlSafe('geo:37.7749,-122.4194', { additionalProtocols: ['geo'] })
        ).not.toThrow();
      });

      it('should still block javascript: even with additionalProtocols', () => {
        expect(() =>
          UrlValidator.urlSafe('javascript:alert(1)', { additionalProtocols: ['tel'] })
        ).toThrow(ValidationError);
      });

      it('should accept multiple additional protocols', () => {
        const options = { additionalProtocols: ['tel', 'sms', 'geo'] };

        expect(() => UrlValidator.urlSafe('tel:+1234567890', options)).not.toThrow();
        expect(() => UrlValidator.urlSafe('sms:+1234567890', options)).not.toThrow();
        expect(() => UrlValidator.urlSafe('geo:0,0', options)).not.toThrow();
      });

      it('should ignore invalid protocol format in additionalProtocols', () => {
        // Invalid protocol format should be ignored, not added
        expect(() =>
          UrlValidator.urlSafe('123invalid://test', { additionalProtocols: ['123invalid'] })
        ).toThrow(ValidationError);
      });
    });
  });

  // ===========================================================================
  // urlSafeResult - Result-based API
  // ===========================================================================

  describe('urlSafeResult', () => {
    describe('allowed protocols', () => {
      it('should return Ok for http URL', () => {
        const result = UrlValidator.urlSafeResult('http://example.com');

        expect(Result.isOk(result)).toBe(true);
        expect(Result.unwrap(result)).toBe('http://example.com');
      });

      it('should return Ok for https URL', () => {
        const result = UrlValidator.urlSafeResult('https://example.com');

        expect(Result.isOk(result)).toBe(true);
      });

      it('should return Ok for ws URL', () => {
        const result = UrlValidator.urlSafeResult('ws://example.com');

        expect(Result.isOk(result)).toBe(true);
      });

      it('should return Ok for wss URL', () => {
        const result = UrlValidator.urlSafeResult('wss://example.com');

        expect(Result.isOk(result)).toBe(true);
      });

      it('should return Ok for mailto URL', () => {
        const result = UrlValidator.urlSafeResult('mailto:test@example.com');

        expect(Result.isOk(result)).toBe(true);
      });

      it('should return Ok for ftp URL', () => {
        const result = UrlValidator.urlSafeResult('ftp://ftp.example.com');

        expect(Result.isOk(result)).toBe(true);
      });

      it('should return Ok for ftps URL', () => {
        const result = UrlValidator.urlSafeResult('ftps://ftp.example.com');

        expect(Result.isOk(result)).toBe(true);
      });
    });

    describe('blocked protocols', () => {
      it('should return Err for javascript: protocol', () => {
        const result = UrlValidator.urlSafeResult('javascript:void(0)');

        expect(Result.isErr(result)).toBe(true);
        expect(Result.unwrapErr(result).field).toBe('url');
      });

      it('should return Err for data: protocol', () => {
        const result = UrlValidator.urlSafeResult('data:text/plain,hello');

        expect(Result.isErr(result)).toBe(true);
      });

      it('should return Err for vbscript: protocol', () => {
        const result = UrlValidator.urlSafeResult('vbscript:execute');

        expect(Result.isErr(result)).toBe(true);
      });

      it('should return Err for file: protocol', () => {
        const result = UrlValidator.urlSafeResult('file:///home/user');

        expect(Result.isErr(result)).toBe(true);
      });

      it('should include allowed protocols in error message', () => {
        const result = UrlValidator.urlSafeResult('javascript:alert(1)');

        expect(Result.isErr(result)).toBe(true);
        const error = Result.unwrapErr(result);
        expect(error.message).toContain('allowed protocol');
        expect(error.message).toContain('http');
        expect(error.message).toContain('https');
      });
    });

    describe('edge cases', () => {
      it('should return Err for empty URL', () => {
        const result = UrlValidator.urlSafeResult('');

        expect(Result.isErr(result)).toBe(true);
        expect(Result.unwrapErr(result).field).toBe('url');
      });

      it('should return Ok for relative URL', () => {
        const result = UrlValidator.urlSafeResult('/api/users');

        expect(Result.isOk(result)).toBe(true);
        expect(Result.unwrap(result)).toBe('/api/users');
      });

      it('should return Ok for path without leading slash', () => {
        const result = UrlValidator.urlSafeResult('path/to/file');

        expect(Result.isOk(result)).toBe(true);
      });

      it('should handle URL with port', () => {
        const result = UrlValidator.urlSafeResult('https://example.com:8080/path');

        expect(Result.isOk(result)).toBe(true);
      });

      it('should handle URL with authentication', () => {
        const result = UrlValidator.urlSafeResult('https://user:pass@example.com');

        expect(Result.isOk(result)).toBe(true);
      });
    });

    describe('custom protocols via options', () => {
      it('should return Ok for tel: with additionalProtocols', () => {
        const result = UrlValidator.urlSafeResult('tel:+1234567890', {
          additionalProtocols: ['tel'],
        });

        expect(Result.isOk(result)).toBe(true);
        expect(Result.unwrap(result)).toBe('tel:+1234567890');
      });

      it('should return Ok for sms: with additionalProtocols', () => {
        const result = UrlValidator.urlSafeResult('sms:+1234567890?body=Hello', {
          additionalProtocols: ['sms'],
        });

        expect(Result.isOk(result)).toBe(true);
      });

      it('should include custom protocols in error message', () => {
        const result = UrlValidator.urlSafeResult('unknown://test', {
          additionalProtocols: ['tel', 'sms'],
        });

        expect(Result.isErr(result)).toBe(true);
        const error = Result.unwrapErr(result);
        expect(error.message).toContain('tel');
        expect(error.message).toContain('sms');
      });

      it('should still return Err for blocked protocols with options', () => {
        const result = UrlValidator.urlSafeResult('javascript:void(0)', {
          additionalProtocols: ['tel'],
        });

        expect(Result.isErr(result)).toBe(true);
      });

      it('should handle app-specific protocols', () => {
        const result = UrlValidator.urlSafeResult('myapp://open?id=123', {
          additionalProtocols: ['myapp'],
        });

        expect(Result.isOk(result)).toBe(true);
      });

      it('should handle protocol with plus sign', () => {
        // svn+ssh is a valid protocol format
        const result = UrlValidator.urlSafeResult('svn+ssh://example.com/repo', {
          additionalProtocols: ['svn+ssh'],
        });

        expect(Result.isOk(result)).toBe(true);
      });

      it('should handle protocol with dot', () => {
        // Some protocols use dots
        const result = UrlValidator.urlSafeResult('x.special://test', {
          additionalProtocols: ['x.special'],
        });

        expect(Result.isOk(result)).toBe(true);
      });

      it('should handle protocol with hyphen', () => {
        const result = UrlValidator.urlSafeResult('my-app://test', {
          additionalProtocols: ['my-app'],
        });

        expect(Result.isOk(result)).toBe(true);
      });
    });
  });
});
