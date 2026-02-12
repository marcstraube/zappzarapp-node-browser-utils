# Clipboard Manager

Modern Clipboard API wrapper with fallback support and permission handling.

## Quick Start

```typescript
import { Result } from '@zappzarapp/browser-utils/core';
import { ClipboardManager } from '@zappzarapp/browser-utils/clipboard';

// Copy text to clipboard
const result = await ClipboardManager.writeText('Hello, World!');
if (Result.isOk(result)) {
  console.log('Copied!');
}

// Read text from clipboard
const readResult = await ClipboardManager.readText();
if (Result.isOk(readResult)) {
  console.log('Clipboard:', readResult.value);
}
```

## Exports

| Export             | Description                             |
| ------------------ | --------------------------------------- |
| `ClipboardManager` | Static methods for clipboard operations |

## Methods

### Writing to Clipboard

#### ClipboardManager.writeText()

Write text to clipboard. Uses modern Clipboard API with execCommand fallback:

```typescript
const result = await ClipboardManager.writeText('Hello!');

if (Result.isOk(result)) {
  showNotification('Copied to clipboard!');
} else {
  showError(result.error.message);
}
```

#### ClipboardManager.write()

Write arbitrary data (ClipboardItems):

```typescript
const blob = new Blob(['Hello'], { type: 'text/plain' });
const item = new ClipboardItem({ 'text/plain': blob });

const result = await ClipboardManager.write(item);
```

### Reading from Clipboard

#### ClipboardManager.readText()

Read text from clipboard. Requires user permission:

```typescript
const result = await ClipboardManager.readText();

if (Result.isOk(result)) {
  console.log('Clipboard content:', result.value);
} else if (result.error.code === 'PERMISSION_DENIED') {
  console.log('Permission denied');
}
```

#### ClipboardManager.read()

Read arbitrary clipboard data:

```typescript
const result = await ClipboardManager.read();

if (Result.isOk(result)) {
  const items = result.value;
  for (const item of items) {
    for (const type of item.types) {
      const blob = await item.getType(type);
      // Process blob
    }
  }
}
```

### Support Detection

```typescript
// Check general support
if (ClipboardManager.isSupported()) {
  // Clipboard API is available
}

// Check write support
if (ClipboardManager.isWriteSupported()) {
  // Can write to clipboard
}

// Check read support
if (ClipboardManager.isReadSupported()) {
  // Can read from clipboard
}
```

### Permission Checking

```typescript
// Check write permission
const writeStatus = await ClipboardManager.checkWritePermission();
// 'granted' | 'denied' | 'prompt' | 'unsupported'

// Check read permission
const readStatus = await ClipboardManager.checkReadPermission();
```

## Usage Examples

### Copy Button

```typescript
async function copyToClipboard(text: string): Promise<boolean> {
  const result = await ClipboardManager.writeText(text);

  if (Result.isOk(result)) {
    showToast('Copied!');
    return true;
  }

  if (result.error.code === 'PERMISSION_DENIED') {
    showToast('Clipboard permission denied');
  } else {
    showToast('Failed to copy');
  }

  return false;
}
```

### Paste Button

```typescript
async function pasteFromClipboard(): Promise<string | null> {
  const result = await ClipboardManager.readText();

  if (Result.isOk(result)) {
    return result.value;
  }

  if (result.error.code === 'PERMISSION_DENIED') {
    showToast('Clipboard permission denied. Please paste manually.');
  }

  return null;
}
```

### Feature Detection

```typescript
function initClipboardFeatures(): void {
  const copyBtn = document.getElementById('copy-btn');
  const pasteBtn = document.getElementById('paste-btn');

  if (ClipboardManager.isWriteSupported()) {
    copyBtn?.classList.remove('hidden');
  }

  if (ClipboardManager.isReadSupported()) {
    pasteBtn?.classList.remove('hidden');
  }
}
```

### Copy with Permission Check

```typescript
async function smartCopy(text: string): Promise<void> {
  const permission = await ClipboardManager.checkWritePermission();

  if (permission === 'denied') {
    showManualCopyDialog(text);
    return;
  }

  const result = await ClipboardManager.writeText(text);
  if (Result.isErr(result)) {
    showManualCopyDialog(text);
  }
}
```

## Error Handling

The ClipboardManager returns `Result` types for all operations:

```typescript
import { Result, ClipboardError } from '@zappzarapp/browser-utils/core';

const result = await ClipboardManager.writeText(text);

if (Result.isErr(result)) {
  const error = result.error;

  switch (error.code) {
    case 'PERMISSION_DENIED':
      // User denied clipboard access
      break;
    case 'NOT_SUPPORTED':
      // Clipboard API not available
      break;
    case 'WRITE_FAILED':
      // Generic write failure
      break;
    case 'READ_FAILED':
      // Generic read failure
      break;
  }
}
```

## Security Considerations

1. **User Gesture Required** - Most browsers require clipboard operations to be
   triggered by user gestures (click, keypress)

2. **HTTPS Required** - Clipboard API only works in secure contexts (HTTPS)

3. **Permission Prompts** - Reading clipboard requires explicit user permission

4. **Text Length Validation** - Text is validated to prevent memory issues with
   extremely large content

5. **Fallback Security** - The execCommand fallback uses a hidden textarea,
   which is removed immediately after use
