// noinspection JSUnusedGlobalSymbols - Example file

/**
 * Clipboard Manager Example - Copy/paste with fallback support
 *
 * This example demonstrates:
 * - Checking clipboard API support
 * - Writing text to clipboard with modern API
 * - Fallback support for older browsers
 * - Reading text from clipboard (requires permission)
 * - Permission status checking
 * - Result-based error handling
 * - Writing arbitrary data (ClipboardItem)
 * - Building a "copy to clipboard" button
 *
 * @packageDocumentation
 */

import { Result } from '@zappzarapp/browser-utils/core';
import { ClipboardManager } from '@zappzarapp/browser-utils/clipboard';
import { Logger } from '@zappzarapp/browser-utils/logging';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Copy operation result for UI feedback.
 */
interface CopyResult {
  readonly success: boolean;
  readonly message: string;
  readonly usedFallback: boolean;
}

/**
 * Clipboard content with metadata.
 */
interface ClipboardContent {
  readonly text: string;
  readonly copiedAt: number;
  readonly source: 'clipboard-api' | 'fallback';
}

// =============================================================================
// Basic Usage
// =============================================================================

/**
 * Check clipboard API support.
 */
function checkClipboardSupport(): void {
  console.log('--- Clipboard Support Check ---');

  // Check if clipboard API is available
  const isSupported = ClipboardManager.isSupported();
  console.log(`Clipboard API supported: ${isSupported}`);

  // Check specific capabilities
  const canWrite = ClipboardManager.isWriteSupported();
  const canRead = ClipboardManager.isReadSupported();

  console.log(`Write support: ${canWrite}`);
  console.log(`Read support: ${canRead}`);

  // Even without modern API, write may work via fallback
  if (!canWrite) {
    console.log('Note: Will use execCommand fallback for writing');
  }
}

/**
 * Basic copy to clipboard example.
 */
async function basicCopyExample(): Promise<void> {
  console.log('\n--- Basic Copy to Clipboard ---');

  const textToCopy = 'Hello from clipboard example!';

  // Write text to clipboard
  const result = await ClipboardManager.writeText(textToCopy);

  if (Result.isOk(result)) {
    console.log('Text copied successfully!');
    console.log(`Copied: "${textToCopy}"`);
  } else {
    console.error('Copy failed:', result.error.message);
    console.error('Error code:', result.error.code);
  }
}

/**
 * Read from clipboard example.
 */
async function readClipboardExample(): Promise<void> {
  console.log('\n--- Read from Clipboard ---');

  // Check if read is supported
  if (!ClipboardManager.isReadSupported()) {
    console.log('Clipboard read is not supported in this browser');
    return;
  }

  // Read text from clipboard
  const result = await ClipboardManager.readText();

  if (Result.isOk(result)) {
    console.log('Clipboard content:');
    console.log(`"${result.value}"`);
  } else {
    console.error('Read failed:', result.error.message);

    // Handle specific errors
    if (result.error.code === 'CLIPBOARD_PERMISSION_DENIED') {
      console.log('User denied clipboard read permission');
      console.log('Tip: User must grant permission when prompted');
    }
  }
}

// =============================================================================
// Permission Handling
// =============================================================================

/**
 * Check clipboard permissions.
 */
async function checkPermissionsExample(): Promise<void> {
  console.log('\n--- Clipboard Permissions ---');

  // Check write permission
  const writePermission = await ClipboardManager.checkWritePermission();
  console.log(`Write permission: ${writePermission}`);

  // Check read permission
  const readPermission = await ClipboardManager.checkReadPermission();
  console.log(`Read permission: ${readPermission}`);

  // Explain permission states
  switch (readPermission) {
    case 'granted':
      console.log('Read: User has granted clipboard read access');
      break;
    case 'denied':
      console.log('Read: User has denied clipboard read access');
      console.log('       User must enable it in browser settings');
      break;
    case 'prompt':
      console.log('Read: Browser will prompt user for permission');
      break;
    case 'unsupported':
      console.log('Read: Permission API not supported');
      break;
  }
}

// =============================================================================
// Fallback Handling
// =============================================================================

/**
 * Copy with explicit fallback handling.
 */
async function copyWithFallbackExample(): Promise<CopyResult> {
  console.log('\n--- Copy with Fallback ---');

  const textToCopy = 'This text will be copied using the best available method';

  // Try modern API first
  if (ClipboardManager.isWriteSupported()) {
    const result = await ClipboardManager.writeText(textToCopy);

    if (Result.isOk(result)) {
      console.log('Copied using modern Clipboard API');
      return {
        success: true,
        message: 'Copied to clipboard!',
        usedFallback: false,
      };
    }

    // If modern API fails, the library automatically falls back
    console.log('Modern API failed, trying fallback...');
  }

  // Fallback is handled internally by writeText, but we can also call it directly
  const fallbackResult = ClipboardManager.writeTextFallback(textToCopy);

  if (Result.isOk(fallbackResult)) {
    console.log('Copied using execCommand fallback');
    return {
      success: true,
      message: 'Copied to clipboard!',
      usedFallback: true,
    };
  }

  console.error('All copy methods failed');
  return {
    success: false,
    message: 'Failed to copy to clipboard',
    usedFallback: true,
  };
}

// =============================================================================
// Copy Button Component
// =============================================================================

/**
 * A reusable copy-to-clipboard button handler.
 */
class CopyButton {
  private readonly logger: ReturnType<typeof Logger.create>;
  private readonly feedbackDuration: number;

  constructor(options: { feedbackDuration?: number; debug?: boolean } = {}) {
    this.feedbackDuration = options.feedbackDuration ?? 2000;
    this.logger = Logger.create({
      prefix: '[CopyButton]',
      level: options.debug === true ? 0 : 3, // Debug or Error only
    });
  }

  /**
   * Copy text and return result for UI feedback.
   */
  async copy(text: string): Promise<CopyResult> {
    this.logger.debug(`Copying ${text.length} characters`);

    const result = await ClipboardManager.writeText(text);

    if (Result.isOk(result)) {
      this.logger.debug('Copy successful');
      return {
        success: true,
        message: 'Copied!',
        usedFallback: !ClipboardManager.isWriteSupported(),
      };
    }

    this.logger.error(`Copy failed: ${result.error.code}`);

    // Provide user-friendly error messages
    let message: string;
    switch (result.error.code) {
      case 'CLIPBOARD_PERMISSION_DENIED':
        message = 'Clipboard access denied. Please allow clipboard access.';
        break;
      case 'CLIPBOARD_NOT_SUPPORTED':
        message = 'Clipboard not supported in this browser.';
        break;
      case 'CLIPBOARD_WRITE_FAILED':
        message = 'Failed to copy. Please try again.';
        break;
      default:
        message = 'Copy failed. Please copy manually.';
    }

    return {
      success: false,
      message,
      usedFallback: false,
    };
  }

  /**
   * Attach copy functionality to a button element.
   */
  attachToButton(
    button: HTMLButtonElement,
    getText: () => string,
    options: {
      successText?: string;
      errorText?: string;
      originalText?: string;
    } = {}
  ): () => void {
    const originalText = options.originalText ?? button.textContent ?? 'Copy';
    const successText = options.successText ?? 'Copied!';
    const errorText = options.errorText ?? 'Failed';

    const handler = async (): Promise<void> => {
      // Disable button during copy
      button.disabled = true;

      const result = await this.copy(getText());

      // Update button text
      button.textContent = result.success ? successText : errorText;

      // Restore original text after delay
      setTimeout(() => {
        button.textContent = originalText;
        button.disabled = false;
      }, this.feedbackDuration);
    };

    button.addEventListener('click', handler);

    // Return cleanup function
    return () => {
      button.removeEventListener('click', handler);
    };
  }
}

/**
 * Example: Using CopyButton with UI elements.
 */
function copyButtonExample(): void {
  console.log('\n--- Copy Button Component ---');

  // Create a mock button for demonstration
  const mockButton = {
    textContent: 'Copy Code',
    disabled: false,
    listeners: [] as Array<() => void>,
    addEventListener(event: string, handler: () => void): void {
      if (event === 'click') {
        this.listeners.push(handler);
      }
    },
    removeEventListener(event: string, _handler: () => void): void {
      if (event === 'click') {
        this.listeners = [];
      }
    },
    click(): void {
      for (const listener of this.listeners) {
        listener();
      }
    },
  };

  const copyButton = new CopyButton({ debug: true });

  // Attach to button
  const cleanup = copyButton.attachToButton(
    mockButton as unknown as HTMLButtonElement,
    () => 'const greeting = "Hello, World!";',
    {
      successText: 'Copied!',
      errorText: 'Copy failed',
      originalText: 'Copy Code',
    }
  );

  console.log('Copy button attached. Simulating click...');

  // Simulate click (in real usage, user would click)
  mockButton.click();

  // Cleanup when done
  setTimeout(() => {
    cleanup();
    console.log('Copy button handler removed');
  }, 3000);
}

// =============================================================================
// Advanced: Rich Content Copying
// =============================================================================

/**
 * Copy rich content (HTML and plain text).
 */
async function copyRichContentExample(): Promise<void> {
  console.log('\n--- Rich Content Copying ---');

  if (!ClipboardManager.isWriteSupported()) {
    console.log('Rich content copy requires modern Clipboard API');
    return;
  }

  // Prepare content in multiple formats
  const plainText = 'Hello World';
  const htmlContent = '<strong>Hello</strong> <em>World</em>';

  // Create ClipboardItem with multiple formats
  // When user pastes, the application can choose the best format
  try {
    const item = new ClipboardItem({
      'text/plain': new Blob([plainText], { type: 'text/plain' }),
      'text/html': new Blob([htmlContent], { type: 'text/html' }),
    });

    const result = await ClipboardManager.write(item);

    if (Result.isOk(result)) {
      console.log('Rich content copied successfully!');
      console.log('Paste in a rich text editor to see formatted content');
      console.log('Paste in a plain text editor to see plain text');
    } else {
      console.error('Failed to copy rich content:', result.error.message);
    }
  } catch (error) {
    console.error('ClipboardItem not supported:', error);
  }
}

/**
 * Copy an image to clipboard.
 */
async function copyImageExample(): Promise<void> {
  console.log('\n--- Copy Image to Clipboard ---');

  if (!ClipboardManager.isWriteSupported()) {
    console.log('Image copy requires modern Clipboard API');
    return;
  }

  // Create a small PNG image (1x1 pixel, transparent)
  // In real usage, you would use an actual image Blob
  const pngHeader = new Uint8Array([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a, // PNG signature
    0x00,
    0x00,
    0x00,
    0x0d,
    0x49,
    0x48,
    0x44,
    0x52, // IHDR chunk
    0x00,
    0x00,
    0x00,
    0x01,
    0x00,
    0x00,
    0x00,
    0x01, // 1x1 dimensions
    0x08,
    0x06,
    0x00,
    0x00,
    0x00,
    0x1f,
    0x15,
    0xc4,
    0x89,
    0x00,
    0x00,
    0x00,
    0x0a,
    0x49,
    0x44,
    0x41,
    0x54,
    0x78,
    0x9c,
    0x63,
    0x00,
    0x01,
    0x00,
    0x00,
    0x05,
    0x00,
    0x01,
    0x0d,
    0x0a,
    0x2d,
    0xb4,
    0x00,
    0x00,
    0x00,
    0x00,
    0x49,
    0x45,
    0x4e,
    0x44,
    0xae,
    0x42,
    0x60,
    0x82,
  ]);

  const imageBlob = new Blob([pngHeader], { type: 'image/png' });

  try {
    const item = new ClipboardItem({
      'image/png': imageBlob,
    });

    const result = await ClipboardManager.write(item);

    if (Result.isOk(result)) {
      console.log('Image copied to clipboard!');
      console.log('Try pasting in an image editor');
    } else {
      console.error('Failed to copy image:', result.error.message);
    }
  } catch (error) {
    console.error('Image clipboard not supported:', error);
  }
}

// =============================================================================
// Clipboard History Manager
// =============================================================================

/**
 * A clipboard history tracker (tracks what you copy).
 */
class ClipboardHistory {
  private readonly history: ClipboardContent[] = [];
  private readonly maxSize: number;

  constructor(maxSize = 10) {
    this.maxSize = maxSize;
  }

  /**
   * Copy text and add to history.
   */
  async copy(text: string): Promise<boolean> {
    const result = await ClipboardManager.writeText(text);

    if (Result.isOk(result)) {
      this.addToHistory({
        text,
        copiedAt: Date.now(),
        source: ClipboardManager.isWriteSupported() ? 'clipboard-api' : 'fallback',
      });
      return true;
    }

    return false;
  }

  /**
   * Get copy history.
   */
  getHistory(): readonly ClipboardContent[] {
    return this.history;
  }

  /**
   * Get most recent copied item.
   */
  getRecent(): ClipboardContent | null {
    return this.history.length > 0 ? this.history[0]! : null;
  }

  /**
   * Clear history.
   */
  clear(): void {
    this.history.length = 0;
  }

  /**
   * Re-copy an item from history.
   */
  async recopy(index: number): Promise<boolean> {
    const item = this.history[index];
    if (item === undefined) {
      return false;
    }
    return this.copy(item.text);
  }

  private addToHistory(content: ClipboardContent): void {
    // Add to beginning
    this.history.unshift(content);

    // Remove duplicates
    const seen = new Set<string>();
    const unique: ClipboardContent[] = [];

    for (const item of this.history) {
      if (!seen.has(item.text)) {
        seen.add(item.text);
        unique.push(item);
      }
    }

    // Trim to max size
    this.history.length = 0;
    this.history.push(...unique.slice(0, this.maxSize));
  }
}

/**
 * Example: Using clipboard history.
 */
async function clipboardHistoryExample(): Promise<void> {
  console.log('\n--- Clipboard History ---');

  const history = new ClipboardHistory(5);

  // Copy some items
  await history.copy('First copied text');
  await history.copy('Second copied text');
  await history.copy('Third copied text');

  console.log('Copy history:');
  for (const item of history.getHistory()) {
    const time = new Date(item.copiedAt).toLocaleTimeString();
    console.log(`  [${time}] "${item.text}" (${item.source})`);
  }

  // Re-copy from history
  console.log('\nRe-copying first item...');
  await history.recopy(0);

  console.log('Most recent:', history.getRecent()?.text);
}

// =============================================================================
// Run All Examples
// =============================================================================

/**
 * Run all clipboard examples.
 */
export async function runClipboardExamples(): Promise<void> {
  console.log('=== Clipboard Manager Examples ===\n');

  checkClipboardSupport();
  await checkPermissionsExample();
  await basicCopyExample();
  await readClipboardExample();
  await copyWithFallbackExample();
  copyButtonExample();
  await copyRichContentExample();
  await copyImageExample();
  await clipboardHistoryExample();

  console.log('\n=== Clipboard Examples Complete ===');
}

// Export for module usage
export { CopyButton, ClipboardHistory, type CopyResult, type ClipboardContent };

// Uncomment to run directly
// runClipboardExamples().catch(console.error);
