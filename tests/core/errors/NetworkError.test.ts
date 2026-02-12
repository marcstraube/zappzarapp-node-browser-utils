import { describe, it, expect } from 'vitest';
import { NetworkError, BrowserUtilsError } from '../../../src/core/index.js';

describe('NetworkError', () => {
  // ===========================================================================
  // Class Structure
  // ===========================================================================

  describe('Class Structure', () => {
    it('should extend BrowserUtilsError', () => {
      const error = NetworkError.offline();

      expect(error).toBeInstanceOf(BrowserUtilsError);
      expect(error).toBeInstanceOf(Error);
    });

    it('should have correct name property', () => {
      const error = NetworkError.offline();

      expect(error.name).toBe('NetworkError');
    });

    it('should have code property', () => {
      const error = NetworkError.offline();

      expect(error.code).toBe('NETWORK_OFFLINE');
    });

    it('should have message property', () => {
      const error = NetworkError.offline();

      expect(error.message).toBe('Network is offline');
    });
  });

  // ===========================================================================
  // Constructor
  // ===========================================================================

  describe('Constructor', () => {
    it('should create error with code and message', () => {
      const error = new NetworkError('NETWORK_OFFLINE', 'Custom message');

      expect(error.code).toBe('NETWORK_OFFLINE');
      expect(error.message).toBe('Custom message');
    });

    it('should create error with attempts', () => {
      const error = new NetworkError('NETWORK_MAX_RETRIES', 'Failed', 5);

      expect(error.attempts).toBe(5);
    });

    it('should create error with cause', () => {
      const cause = new Error('Original error');
      const error = new NetworkError('NETWORK_REQUEST_FAILED', 'Failed', undefined, cause);

      expect(error.cause).toBe(cause);
    });

    it('should create error with all parameters', () => {
      const cause = new Error('Original');
      const error = new NetworkError('NETWORK_MAX_RETRIES', 'Max retries', 3, cause);

      expect(error.code).toBe('NETWORK_MAX_RETRIES');
      expect(error.message).toBe('Max retries');
      expect(error.attempts).toBe(3);
      expect(error.cause).toBe(cause);
    });

    it('should have undefined attempts when not provided', () => {
      const error = new NetworkError('NETWORK_OFFLINE', 'Offline');

      expect(error.attempts).toBeUndefined();
    });

    it('should have undefined cause when not provided', () => {
      const error = new NetworkError('NETWORK_OFFLINE', 'Offline');

      expect(error.cause).toBeUndefined();
    });
  });

  // ===========================================================================
  // Factory Methods
  // ===========================================================================

  describe('Factory Methods', () => {
    describe('offline', () => {
      it('should create offline error', () => {
        const error = NetworkError.offline();

        expect(error.code).toBe('NETWORK_OFFLINE');
        expect(error.message).toBe('Network is offline');
      });

      it('should not have attempts', () => {
        const error = NetworkError.offline();

        expect(error.attempts).toBeUndefined();
      });

      it('should not have cause', () => {
        const error = NetworkError.offline();

        expect(error.cause).toBeUndefined();
      });
    });

    describe('timeout', () => {
      it('should create timeout error with duration', () => {
        const error = NetworkError.timeout(5000);

        expect(error.code).toBe('NETWORK_TIMEOUT');
        expect(error.message).toBe('Request timed out after 5000ms');
      });

      it('should include timeout duration in message', () => {
        const error = NetworkError.timeout(30000);

        expect(error.message).toContain('30000ms');
      });

      it('should handle zero timeout', () => {
        const error = NetworkError.timeout(0);

        expect(error.message).toBe('Request timed out after 0ms');
      });
    });

    describe('maxRetries', () => {
      it('should create max retries error', () => {
        const error = NetworkError.maxRetries(3);

        expect(error.code).toBe('NETWORK_MAX_RETRIES');
        expect(error.message).toBe('Maximum retry attempts (3) exceeded');
      });

      it('should include attempts count', () => {
        const error = NetworkError.maxRetries(5);

        expect(error.attempts).toBe(5);
      });

      it('should include cause when provided', () => {
        const cause = new Error('Original failure');
        const error = NetworkError.maxRetries(3, cause);

        expect(error.cause).toBe(cause);
      });

      it('should work without cause', () => {
        const error = NetworkError.maxRetries(3);

        expect(error.cause).toBeUndefined();
      });

      it('should include attempts in message', () => {
        const error = NetworkError.maxRetries(10);

        expect(error.message).toContain('10');
      });
    });

    describe('requestFailed', () => {
      it('should create request failed error', () => {
        const error = NetworkError.requestFailed();

        expect(error.code).toBe('NETWORK_REQUEST_FAILED');
        expect(error.message).toBe('Network request failed');
      });

      it('should include cause when provided', () => {
        const cause = new Error('Connection reset');
        const error = NetworkError.requestFailed(cause);

        expect(error.cause).toBe(cause);
      });

      it('should work without cause', () => {
        const error = NetworkError.requestFailed();

        expect(error.cause).toBeUndefined();
      });

      it('should not have attempts', () => {
        const error = NetworkError.requestFailed();

        expect(error.attempts).toBeUndefined();
      });
    });

    describe('aborted', () => {
      it('should create aborted error', () => {
        const error = NetworkError.aborted();

        expect(error.code).toBe('NETWORK_ABORTED');
        expect(error.message).toBe('Network request was aborted');
      });

      it('should not have attempts', () => {
        const error = NetworkError.aborted();

        expect(error.attempts).toBeUndefined();
      });

      it('should not have cause', () => {
        const error = NetworkError.aborted();

        expect(error.cause).toBeUndefined();
      });
    });
  });

  // ===========================================================================
  // Error Codes
  // ===========================================================================

  describe('Error Codes', () => {
    it('should have NETWORK_OFFLINE code for offline error', () => {
      const error = NetworkError.offline();

      expect(error.code).toBe('NETWORK_OFFLINE');
    });

    it('should have NETWORK_TIMEOUT code for timeout error', () => {
      const error = NetworkError.timeout(1000);

      expect(error.code).toBe('NETWORK_TIMEOUT');
    });

    it('should have NETWORK_MAX_RETRIES code for max retries error', () => {
      const error = NetworkError.maxRetries(3);

      expect(error.code).toBe('NETWORK_MAX_RETRIES');
    });

    it('should have NETWORK_REQUEST_FAILED code for request failed error', () => {
      const error = NetworkError.requestFailed();

      expect(error.code).toBe('NETWORK_REQUEST_FAILED');
    });

    it('should have NETWORK_ABORTED code for aborted error', () => {
      const error = NetworkError.aborted();

      expect(error.code).toBe('NETWORK_ABORTED');
    });
  });

  // ===========================================================================
  // Inherited Behavior
  // ===========================================================================

  describe('Inherited Behavior', () => {
    it('should support toFormattedString from BrowserUtilsError', () => {
      const error = NetworkError.offline();

      expect(error.toFormattedString()).toBe('[NETWORK_OFFLINE] Network is offline');
    });

    it('should format timeout error correctly', () => {
      const error = NetworkError.timeout(5000);

      expect(error.toFormattedString()).toBe('[NETWORK_TIMEOUT] Request timed out after 5000ms');
    });

    it('should format max retries error correctly', () => {
      const error = NetworkError.maxRetries(3);

      expect(error.toFormattedString()).toBe(
        '[NETWORK_MAX_RETRIES] Maximum retry attempts (3) exceeded'
      );
    });

    it('should have correct prototype chain for instanceof checks', () => {
      const error = NetworkError.offline();

      expect(error).toBeInstanceOf(NetworkError);
      expect(error).toBeInstanceOf(BrowserUtilsError);
      expect(error).toBeInstanceOf(Error);
    });

    it('should have stack trace', () => {
      const error = NetworkError.offline();

      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe('string');
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle non-Error cause', () => {
      const cause = { custom: 'error object' };
      const error = NetworkError.requestFailed(cause);

      expect(error.cause).toEqual({ custom: 'error object' });
    });

    it('should handle string cause', () => {
      const error = NetworkError.requestFailed('String error');

      expect(error.cause).toBe('String error');
    });

    it('should handle null cause', () => {
      const error = NetworkError.requestFailed(null);

      expect(error.cause).toBeNull();
    });

    it('should handle large attempt count', () => {
      const error = NetworkError.maxRetries(1000000);

      expect(error.attempts).toBe(1000000);
      expect(error.message).toContain('1000000');
    });

    it('should handle zero attempts', () => {
      const error = new NetworkError('NETWORK_MAX_RETRIES', 'Zero attempts', 0);

      expect(error.attempts).toBe(0);
    });

    it('should be throwable and catchable', () => {
      expect(() => {
        throw NetworkError.offline();
      }).toThrow(NetworkError);
    });

    it('should be catchable by Error type', () => {
      expect(() => {
        throw NetworkError.offline();
      }).toThrow(Error);
    });
  });

  // ===========================================================================
  // Type Guards
  // ===========================================================================

  describe('Type Guards', () => {
    it('should allow programmatic error handling by code', () => {
      const error = NetworkError.offline();

      switch (error.code) {
        case 'NETWORK_OFFLINE':
          expect(true).toBe(true);
          break;
        default:
          expect(true).toBe(false);
      }
    });

    it('should distinguish between different error types', () => {
      const offline = NetworkError.offline();
      const timeout = NetworkError.timeout(1000);
      const maxRetries = NetworkError.maxRetries(3);

      expect(offline.code).not.toBe(timeout.code);
      expect(timeout.code).not.toBe(maxRetries.code);
      expect(maxRetries.code).not.toBe(offline.code);
    });
  });
});
