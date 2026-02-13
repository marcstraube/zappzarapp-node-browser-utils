import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClipboardManager } from '../../src/clipboard/index.js';
import { ClipboardError, ValidationError, Result } from '../../src/core/index.js';

/**
 * Mock clipboard API for testing.
 */
interface MockClipboard {
  writeText: ReturnType<typeof vi.fn>;
  readText: ReturnType<typeof vi.fn>;
  write: ReturnType<typeof vi.fn>;
  read: ReturnType<typeof vi.fn>;
}

/**
 * Create a mock clipboard implementation.
 */
function createMockClipboard(): MockClipboard {
  return {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
    write: vi.fn().mockResolvedValue(undefined),
    read: vi.fn().mockResolvedValue([]),
  };
}

describe('ClipboardManager', () => {
  let mockClipboard: MockClipboard;
  let originalNavigator: PropertyDescriptor | undefined;
  let originalDocument: PropertyDescriptor | undefined;

  beforeEach(() => {
    mockClipboard = createMockClipboard();
    originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        clipboard: mockClipboard,
        permissions: {
          query: vi.fn(),
        },
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();

    if (originalNavigator) {
      Object.defineProperty(globalThis, 'navigator', originalNavigator);
    }
  });

  // ===========================================================================
  // Support Detection
  // ===========================================================================

  describe('isSupported', () => {
    it('should return true when navigator.clipboard is available', () => {
      expect(ClipboardManager.isSupported()).toBe(true);
    });

    it('should return false when navigator is undefined', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      expect(ClipboardManager.isSupported()).toBe(false);
    });

    it('should return false when navigator.clipboard is undefined', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      });

      expect(ClipboardManager.isSupported()).toBe(false);
    });
  });

  describe('isWriteSupported', () => {
    it('should return true when writeText function is available', () => {
      expect(ClipboardManager.isWriteSupported()).toBe(true);
    });

    it('should return false when clipboard is not supported', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      expect(ClipboardManager.isWriteSupported()).toBe(false);
    });

    it('should return false when writeText is not a function', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          clipboard: {
            writeText: 'not a function',
          },
        },
        writable: true,
        configurable: true,
      });

      expect(ClipboardManager.isWriteSupported()).toBe(false);
    });
  });

  describe('isReadSupported', () => {
    it('should return true when readText function is available', () => {
      expect(ClipboardManager.isReadSupported()).toBe(true);
    });

    it('should return false when clipboard is not supported', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      expect(ClipboardManager.isReadSupported()).toBe(false);
    });

    it('should return false when readText is not a function', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          clipboard: {
            readText: 'not a function',
          },
        },
        writable: true,
        configurable: true,
      });

      expect(ClipboardManager.isReadSupported()).toBe(false);
    });
  });

  // ===========================================================================
  // writeText
  // ===========================================================================

  describe('writeText', () => {
    it('should write text to clipboard successfully', async () => {
      const text = 'Hello, World!';

      const result = await ClipboardManager.writeText(text);

      expect(Result.isOk(result)).toBe(true);
      expect(mockClipboard.writeText).toHaveBeenCalledWith(text);
    });

    it('should return Ok with undefined value on success', async () => {
      const result = await ClipboardManager.writeText('test');

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toBeUndefined();
      }
    });

    it('should handle empty string', async () => {
      const result = await ClipboardManager.writeText('');

      expect(Result.isOk(result)).toBe(true);
      expect(mockClipboard.writeText).toHaveBeenCalledWith('');
    });

    it('should handle special characters', async () => {
      const text = 'Special: \n\t\r"\'\\unicode: \u{1F600}';

      const result = await ClipboardManager.writeText(text);

      expect(Result.isOk(result)).toBe(true);
      expect(mockClipboard.writeText).toHaveBeenCalledWith(text);
    });

    it('should return ValidationError when text exceeds maximum length', async () => {
      // Create text larger than 10MB limit
      const text = 'a'.repeat(10_000_001);

      const result = await ClipboardManager.writeText(text);

      expect(Result.isErr(result)).toBe(true);
      if (Result.isErr(result)) {
        expect(result.error).toBeInstanceOf(ValidationError);
      }
    });

    it('should return ClipboardError on permission denied', async () => {
      const error = new Error('Permission denied');
      error.name = 'NotAllowedError';
      mockClipboard.writeText.mockRejectedValue(error);

      const result = await ClipboardManager.writeText('test');

      expect(Result.isErr(result)).toBe(true);
      if (Result.isErr(result)) {
        expect(result.error).toBeInstanceOf(ClipboardError);
        expect((result.error as ClipboardError).code).toBe('CLIPBOARD_PERMISSION_DENIED');
      }
    });

    it('should return ClipboardError on generic failure', async () => {
      const error = new Error('Unknown error');
      mockClipboard.writeText.mockRejectedValue(error);

      const result = await ClipboardManager.writeText('test');

      expect(Result.isErr(result)).toBe(true);
      if (Result.isErr(result)) {
        expect(result.error).toBeInstanceOf(ClipboardError);
        expect((result.error as ClipboardError).code).toBe('CLIPBOARD_WRITE_FAILED');
      }
    });

    it('should fall back to execCommand when Clipboard API unavailable', async () => {
      // Setup: No clipboard API
      Object.defineProperty(globalThis, 'navigator', {
        value: { clipboard: undefined },
        writable: true,
        configurable: true,
      });

      // Mock document for fallback
      const mockTextarea = {
        value: '',
        style: {},
        focus: vi.fn(),
        select: vi.fn(),
      };

      const mockDocument = {
        createElement: vi.fn().mockReturnValue(mockTextarea),
        body: {
          appendChild: vi.fn(),
          removeChild: vi.fn(),
        },
        execCommand: vi.fn().mockReturnValue(true),
      };

      originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
      Object.defineProperty(globalThis, 'document', {
        value: mockDocument,
        writable: true,
        configurable: true,
      });

      const result = await ClipboardManager.writeText('test');

      expect(Result.isOk(result)).toBe(true);
      expect(mockDocument.execCommand).toHaveBeenCalledWith('copy');

      // Cleanup
      if (originalDocument) {
        Object.defineProperty(globalThis, 'document', originalDocument);
      }
    });
  });

  // ===========================================================================
  // write (ClipboardItem)
  // ===========================================================================

  describe('write', () => {
    it('should write ClipboardItem to clipboard', async () => {
      const blob = new Blob(['test'], { type: 'text/plain' });
      const item = new ClipboardItem({ 'text/plain': blob });

      const result = await ClipboardManager.write(item);

      expect(Result.isOk(result)).toBe(true);
      expect(mockClipboard.write).toHaveBeenCalledWith([item]);
    });

    it('should write array of ClipboardItems', async () => {
      const blob1 = new Blob(['test1'], { type: 'text/plain' });
      const blob2 = new Blob(['test2'], { type: 'text/plain' });
      const items = [
        new ClipboardItem({ 'text/plain': blob1 }),
        new ClipboardItem({ 'text/plain': blob2 }),
      ];

      const result = await ClipboardManager.write(items);

      expect(Result.isOk(result)).toBe(true);
      expect(mockClipboard.write).toHaveBeenCalledWith(items);
    });

    it('should return ClipboardError when write not supported', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { clipboard: undefined },
        writable: true,
        configurable: true,
      });

      const blob = new Blob(['test'], { type: 'text/plain' });
      const item = new ClipboardItem({ 'text/plain': blob });

      const result = await ClipboardManager.write(item);

      expect(Result.isErr(result)).toBe(true);
      if (Result.isErr(result)) {
        expect(result.error).toBeInstanceOf(ClipboardError);
        expect(result.error.code).toBe('CLIPBOARD_NOT_SUPPORTED');
      }
    });

    it('should return ClipboardError on permission denied', async () => {
      const error = new Error('Permission denied');
      error.name = 'NotAllowedError';
      mockClipboard.write.mockRejectedValue(error);

      const blob = new Blob(['test'], { type: 'text/plain' });
      const item = new ClipboardItem({ 'text/plain': blob });

      const result = await ClipboardManager.write(item);

      expect(Result.isErr(result)).toBe(true);
      if (Result.isErr(result)) {
        expect(result.error).toBeInstanceOf(ClipboardError);
        expect(result.error.code).toBe('CLIPBOARD_PERMISSION_DENIED');
      }
    });

    it('should return ClipboardError on write failure', async () => {
      const error = new Error('Write failed');
      mockClipboard.write.mockRejectedValue(error);

      const blob = new Blob(['test'], { type: 'text/plain' });
      const item = new ClipboardItem({ 'text/plain': blob });

      const result = await ClipboardManager.write(item);

      expect(Result.isErr(result)).toBe(true);
      if (Result.isErr(result)) {
        expect(result.error).toBeInstanceOf(ClipboardError);
        expect(result.error.code).toBe('CLIPBOARD_WRITE_FAILED');
      }
    });
  });

  // ===========================================================================
  // readText
  // ===========================================================================

  describe('readText', () => {
    it('should read text from clipboard successfully', async () => {
      const expectedText = 'Clipboard content';
      mockClipboard.readText.mockResolvedValue(expectedText);

      const result = await ClipboardManager.readText();

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toBe(expectedText);
      }
    });

    it('should handle empty clipboard', async () => {
      mockClipboard.readText.mockResolvedValue('');

      const result = await ClipboardManager.readText();

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toBe('');
      }
    });

    it('should return ClipboardError when read not supported', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { clipboard: undefined },
        writable: true,
        configurable: true,
      });

      const result = await ClipboardManager.readText();

      expect(Result.isErr(result)).toBe(true);
      if (Result.isErr(result)) {
        expect(result.error).toBeInstanceOf(ClipboardError);
        expect(result.error.code).toBe('CLIPBOARD_NOT_SUPPORTED');
      }
    });

    it('should return ClipboardError on permission denied', async () => {
      const error = new Error('Permission denied');
      error.name = 'NotAllowedError';
      mockClipboard.readText.mockRejectedValue(error);

      const result = await ClipboardManager.readText();

      expect(Result.isErr(result)).toBe(true);
      if (Result.isErr(result)) {
        expect(result.error).toBeInstanceOf(ClipboardError);
        expect(result.error.code).toBe('CLIPBOARD_PERMISSION_DENIED');
      }
    });

    it('should return ClipboardError on read failure', async () => {
      const error = new Error('Read failed');
      mockClipboard.readText.mockRejectedValue(error);

      const result = await ClipboardManager.readText();

      expect(Result.isErr(result)).toBe(true);
      if (Result.isErr(result)) {
        expect(result.error).toBeInstanceOf(ClipboardError);
        expect(result.error.code).toBe('CLIPBOARD_READ_FAILED');
      }
    });
  });

  // ===========================================================================
  // read (ClipboardItems)
  // ===========================================================================

  describe('read', () => {
    it('should read ClipboardItems from clipboard', async () => {
      const mockItems: ClipboardItems = [];
      mockClipboard.read.mockResolvedValue(mockItems);

      const result = await ClipboardManager.read();

      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.value).toBe(mockItems);
      }
    });

    it('should return ClipboardError when read not supported', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { clipboard: undefined },
        writable: true,
        configurable: true,
      });

      const result = await ClipboardManager.read();

      expect(Result.isErr(result)).toBe(true);
      if (Result.isErr(result)) {
        expect(result.error).toBeInstanceOf(ClipboardError);
        expect(result.error.code).toBe('CLIPBOARD_NOT_SUPPORTED');
      }
    });

    it('should return ClipboardError on permission denied', async () => {
      const error = new Error('Permission denied');
      error.name = 'NotAllowedError';
      mockClipboard.read.mockRejectedValue(error);

      const result = await ClipboardManager.read();

      expect(Result.isErr(result)).toBe(true);
      if (Result.isErr(result)) {
        expect(result.error).toBeInstanceOf(ClipboardError);
        expect(result.error.code).toBe('CLIPBOARD_PERMISSION_DENIED');
      }
    });

    it('should return ClipboardError on read failure', async () => {
      const error = new Error('Read failed');
      mockClipboard.read.mockRejectedValue(error);

      const result = await ClipboardManager.read();

      expect(Result.isErr(result)).toBe(true);
      if (Result.isErr(result)) {
        expect(result.error).toBeInstanceOf(ClipboardError);
        expect(result.error.code).toBe('CLIPBOARD_READ_FAILED');
      }
    });
  });

  // ===========================================================================
  // Permission Checking
  // ===========================================================================

  describe('checkWritePermission', () => {
    it('should return granted when permission is granted', async () => {
      const mockPermissions = {
        query: vi.fn().mockResolvedValue({ state: 'granted' }),
      };
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          clipboard: mockClipboard,
          permissions: mockPermissions,
        },
        writable: true,
        configurable: true,
      });

      const result = await ClipboardManager.checkWritePermission();

      expect(result).toBe('granted');
    });

    it('should return denied when permission is denied', async () => {
      const mockPermissions = {
        query: vi.fn().mockResolvedValue({ state: 'denied' }),
      };
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          clipboard: mockClipboard,
          permissions: mockPermissions,
        },
        writable: true,
        configurable: true,
      });

      const result = await ClipboardManager.checkWritePermission();

      expect(result).toBe('denied');
    });

    it('should return prompt when permission requires prompt', async () => {
      const mockPermissions = {
        query: vi.fn().mockResolvedValue({ state: 'prompt' }),
      };
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          clipboard: mockClipboard,
          permissions: mockPermissions,
        },
        writable: true,
        configurable: true,
      });

      const result = await ClipboardManager.checkWritePermission();

      expect(result).toBe('prompt');
    });

    it('should return unsupported when navigator is undefined', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const result = await ClipboardManager.checkWritePermission();

      expect(result).toBe('unsupported');
    });

    it('should return unsupported when permissions API is undefined', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { clipboard: mockClipboard },
        writable: true,
        configurable: true,
      });

      const result = await ClipboardManager.checkWritePermission();

      expect(result).toBe('unsupported');
    });

    it('should return unsupported when permissions query throws', async () => {
      const mockPermissions = {
        query: vi.fn().mockRejectedValue(new Error('Not supported')),
      };
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          clipboard: mockClipboard,
          permissions: mockPermissions,
        },
        writable: true,
        configurable: true,
      });

      const result = await ClipboardManager.checkWritePermission();

      expect(result).toBe('unsupported');
    });
  });

  describe('checkReadPermission', () => {
    it('should return granted when permission is granted', async () => {
      const mockPermissions = {
        query: vi.fn().mockResolvedValue({ state: 'granted' }),
      };
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          clipboard: mockClipboard,
          permissions: mockPermissions,
        },
        writable: true,
        configurable: true,
      });

      const result = await ClipboardManager.checkReadPermission();

      expect(result).toBe('granted');
    });

    it('should return denied when permission is denied', async () => {
      const mockPermissions = {
        query: vi.fn().mockResolvedValue({ state: 'denied' }),
      };
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          clipboard: mockClipboard,
          permissions: mockPermissions,
        },
        writable: true,
        configurable: true,
      });

      const result = await ClipboardManager.checkReadPermission();

      expect(result).toBe('denied');
    });

    it('should return prompt when permission requires prompt', async () => {
      const mockPermissions = {
        query: vi.fn().mockResolvedValue({ state: 'prompt' }),
      };
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          clipboard: mockClipboard,
          permissions: mockPermissions,
        },
        writable: true,
        configurable: true,
      });

      const result = await ClipboardManager.checkReadPermission();

      expect(result).toBe('prompt');
    });

    it('should return unsupported when navigator is undefined', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const result = await ClipboardManager.checkReadPermission();

      expect(result).toBe('unsupported');
    });

    it('should return unsupported when permissions API is undefined', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { clipboard: mockClipboard },
        writable: true,
        configurable: true,
      });

      const result = await ClipboardManager.checkReadPermission();

      expect(result).toBe('unsupported');
    });

    it('should return unsupported when permissions query throws', async () => {
      const mockPermissions = {
        query: vi.fn().mockRejectedValue(new Error('Not supported')),
      };
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          clipboard: mockClipboard,
          permissions: mockPermissions,
        },
        writable: true,
        configurable: true,
      });

      const result = await ClipboardManager.checkReadPermission();

      expect(result).toBe('unsupported');
    });
  });

  // ===========================================================================
  // writeTextFallback (execCommand)
  // ===========================================================================

  describe('writeTextFallback', () => {
    let mockTextarea: {
      value: string;
      style: Record<string, string>;
      focus: ReturnType<typeof vi.fn>;
      select: ReturnType<typeof vi.fn>;
    };
    let mockDocument: {
      createElement: ReturnType<typeof vi.fn>;
      body: {
        appendChild: ReturnType<typeof vi.fn>;
        removeChild: ReturnType<typeof vi.fn>;
      };
      execCommand: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      mockTextarea = {
        value: '',
        style: {},
        focus: vi.fn(),
        select: vi.fn(),
      };

      mockDocument = {
        createElement: vi.fn().mockReturnValue(mockTextarea),
        body: {
          appendChild: vi.fn(),
          removeChild: vi.fn(),
        },
        execCommand: vi.fn().mockReturnValue(true),
      };

      originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
      Object.defineProperty(globalThis, 'document', {
        value: mockDocument,
        writable: true,
        configurable: true,
      });
    });

    afterEach(() => {
      if (originalDocument) {
        Object.defineProperty(globalThis, 'document', originalDocument);
      }
    });

    it('should create textarea with correct value', () => {
      const text = 'Test content';

      ClipboardManager.writeTextFallback(text);

      expect(mockDocument.createElement).toHaveBeenCalledWith('textarea');
      expect(mockTextarea.value).toBe(text);
    });

    it('should style textarea to be invisible', () => {
      ClipboardManager.writeTextFallback('test');

      expect(mockTextarea.style.top).toBe('0');
      expect(mockTextarea.style.left).toBe('0');
      expect(mockTextarea.style.position).toBe('fixed');
      expect(mockTextarea.style.opacity).toBe('0');
      expect(mockTextarea.style.pointerEvents).toBe('none');
    });

    it('should append textarea to body, focus and select', () => {
      ClipboardManager.writeTextFallback('test');

      expect(mockDocument.body.appendChild).toHaveBeenCalledWith(mockTextarea);
      expect(mockTextarea.focus).toHaveBeenCalled();
      expect(mockTextarea.select).toHaveBeenCalled();
    });

    it('should execute copy command', () => {
      ClipboardManager.writeTextFallback('test');

      expect(mockDocument.execCommand).toHaveBeenCalledWith('copy');
    });

    it('should remove textarea after copy', () => {
      ClipboardManager.writeTextFallback('test');

      expect(mockDocument.body.removeChild).toHaveBeenCalledWith(mockTextarea);
    });

    it('should return Ok on successful copy', () => {
      mockDocument.execCommand.mockReturnValue(true);

      const result = ClipboardManager.writeTextFallback('test');

      expect(Result.isOk(result)).toBe(true);
    });

    it('should return ClipboardError when execCommand returns false', () => {
      mockDocument.execCommand.mockReturnValue(false);

      const result = ClipboardManager.writeTextFallback('test');

      expect(Result.isErr(result)).toBe(true);
      if (Result.isErr(result)) {
        expect(result.error).toBeInstanceOf(ClipboardError);
        expect(result.error.code).toBe('CLIPBOARD_WRITE_FAILED');
      }
    });

    it('should return ClipboardError when document is undefined', () => {
      Object.defineProperty(globalThis, 'document', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const result = ClipboardManager.writeTextFallback('test');

      expect(Result.isErr(result)).toBe(true);
      if (Result.isErr(result)) {
        expect(result.error).toBeInstanceOf(ClipboardError);
        expect(result.error.code).toBe('CLIPBOARD_NOT_SUPPORTED');
      }
    });

    it('should return ClipboardError when createElement throws', () => {
      mockDocument.createElement.mockImplementation(() => {
        throw new Error('createElement failed');
      });

      const result = ClipboardManager.writeTextFallback('test');

      expect(Result.isErr(result)).toBe(true);
      if (Result.isErr(result)) {
        expect(result.error).toBeInstanceOf(ClipboardError);
        expect(result.error.code).toBe('CLIPBOARD_WRITE_FAILED');
      }
    });

    it('should return ClipboardError when execCommand throws', () => {
      mockDocument.execCommand.mockImplementation(() => {
        throw new Error('execCommand failed');
      });

      const result = ClipboardManager.writeTextFallback('test');

      expect(Result.isErr(result)).toBe(true);
      if (Result.isErr(result)) {
        expect(result.error).toBeInstanceOf(ClipboardError);
        expect(result.error.code).toBe('CLIPBOARD_WRITE_FAILED');
      }
    });

    it('should remove textarea from DOM even when select() throws', () => {
      mockTextarea.select.mockImplementation(() => {
        throw new Error('select failed');
      });

      const result = ClipboardManager.writeTextFallback('test');

      expect(Result.isErr(result)).toBe(true);
      // Textarea should still be removed from DOM via try-finally
      expect(mockDocument.body.removeChild).toHaveBeenCalledWith(mockTextarea);
    });
  });

  // ===========================================================================
  // Validation
  // ===========================================================================

  describe('Validation', () => {
    it('should accept text at maximum length limit', async () => {
      const text = 'a'.repeat(10_000_000);

      const result = await ClipboardManager.writeText(text);

      expect(Result.isOk(result)).toBe(true);
    });

    it('should reject text exceeding maximum length', async () => {
      const text = 'a'.repeat(10_000_001);

      const result = await ClipboardManager.writeText(text);

      expect(Result.isErr(result)).toBe(true);
      if (Result.isErr(result)) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect((result.error as ValidationError).field).toBe('clipboardText');
      }
    });
  });

  // ===========================================================================
  // Integration Scenarios
  // ===========================================================================

  describe('Integration Scenarios', () => {
    it('should handle copy-paste workflow', async () => {
      const text = 'Copy this text';
      mockClipboard.readText.mockResolvedValue(text);

      // Write
      const writeResult = await ClipboardManager.writeText(text);
      expect(Result.isOk(writeResult)).toBe(true);

      // Read
      const readResult = await ClipboardManager.readText();
      expect(Result.isOk(readResult)).toBe(true);
      if (Result.isOk(readResult)) {
        expect(readResult.value).toBe(text);
      }
    });

    it('should gracefully handle unsupported environment', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const isSupported = ClipboardManager.isSupported();
      const isWriteSupported = ClipboardManager.isWriteSupported();
      const isReadSupported = ClipboardManager.isReadSupported();

      expect(isSupported).toBe(false);
      expect(isWriteSupported).toBe(false);
      expect(isReadSupported).toBe(false);
    });

    it('should allow checking permissions before operations', async () => {
      const mockPermissions = {
        query: vi.fn().mockResolvedValue({ state: 'granted' }),
      };
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          clipboard: mockClipboard,
          permissions: mockPermissions,
        },
        writable: true,
        configurable: true,
      });

      const writePermission = await ClipboardManager.checkWritePermission();
      const readPermission = await ClipboardManager.checkReadPermission();

      expect(writePermission).toBe('granted');
      expect(readPermission).toBe('granted');
    });
  });

  // ===========================================================================
  // Error Handling Edge Cases
  // ===========================================================================

  describe('Error Handling Edge Cases', () => {
    it('should handle non-Error exceptions in writeText', async () => {
      mockClipboard.writeText.mockRejectedValue('string error');

      const result = await ClipboardManager.writeText('test');

      expect(Result.isErr(result)).toBe(true);
      if (Result.isErr(result)) {
        expect(result.error).toBeInstanceOf(ClipboardError);
        expect(result.error.code).toBe('CLIPBOARD_WRITE_FAILED');
      }
    });

    it('should handle non-Error exceptions in readText', async () => {
      mockClipboard.readText.mockRejectedValue({ code: 123 });

      const result = await ClipboardManager.readText();

      expect(Result.isErr(result)).toBe(true);
      if (Result.isErr(result)) {
        expect(result.error).toBeInstanceOf(ClipboardError);
        expect(result.error.code).toBe('CLIPBOARD_READ_FAILED');
      }
    });

    it('should distinguish NotAllowedError from other errors', async () => {
      // NotAllowedError should be permission denied
      const notAllowedError = new Error('Not allowed');
      notAllowedError.name = 'NotAllowedError';
      mockClipboard.writeText.mockRejectedValue(notAllowedError);

      const result1 = await ClipboardManager.writeText('test');
      expect(Result.isErr(result1)).toBe(true);
      if (Result.isErr(result1)) {
        expect((result1.error as ClipboardError).code).toBe('CLIPBOARD_PERMISSION_DENIED');
      }

      // Other errors should be write failed
      const otherError = new Error('Other error');
      otherError.name = 'TypeError';
      mockClipboard.writeText.mockRejectedValue(otherError);

      const result2 = await ClipboardManager.writeText('test');
      expect(Result.isErr(result2)).toBe(true);
      if (Result.isErr(result2)) {
        expect((result2.error as ClipboardError).code).toBe('CLIPBOARD_WRITE_FAILED');
      }
    });
  });
});
