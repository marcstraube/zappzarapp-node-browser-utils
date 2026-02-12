# Fullscreen API

Cross-browser Fullscreen API wrapper with Promise-based interface.

## Quick Start

```typescript
import { Result } from '@zappzarapp/browser-utils/core';
import { Fullscreen } from '@zappzarapp/browser-utils/fullscreen';

// Enter fullscreen
const result = await Fullscreen.request(element);
if (Result.isErr(result)) {
  console.error('Failed:', result.error);
}

// Toggle fullscreen
await Fullscreen.toggle(element);

// Listen for changes
const cleanup = Fullscreen.onChange((isFullscreen) => {
  console.log(isFullscreen ? 'Entered fullscreen' : 'Exited fullscreen');
});
```

## API Reference

### Actions

| Method              | Returns                                  | Description            |
| ------------------- | ---------------------------------------- | ---------------------- |
| `request(element?)` | `Promise<Result<void, FullscreenError>>` | Enter fullscreen mode  |
| `exit()`            | `Promise<Result<void, FullscreenError>>` | Exit fullscreen mode   |
| `toggle(element?)`  | `Promise<Result<void, FullscreenError>>` | Toggle fullscreen mode |

### State

| Method           | Returns           | Description                          |
| ---------------- | ----------------- | ------------------------------------ |
| `isFullscreen()` | `boolean`         | Check if currently in fullscreen     |
| `element()`      | `Element \| null` | Get current fullscreen element       |
| `isSupported()`  | `boolean`         | Check if Fullscreen API is supported |

### Events

| Method              | Returns     | Description                   |
| ------------------- | ----------- | ----------------------------- |
| `onChange(handler)` | `CleanupFn` | Listen for fullscreen changes |
| `onError(handler)`  | `CleanupFn` | Listen for fullscreen errors  |

## Error Types

```typescript
// FullscreenError types
FullscreenError.notSupported(); // API not supported
FullscreenError.notActive(); // Not in fullscreen mode (for exit)
FullscreenError.requestFailed(e); // Request failed
FullscreenError.exitFailed(e); // Exit failed
```

## Usage Examples

### Video Player Fullscreen

```typescript
const videoContainer = document.getElementById('video-container')!;
const fullscreenButton = document.getElementById('fullscreen-btn')!;

fullscreenButton.addEventListener('click', async () => {
  const result = await Fullscreen.toggle(videoContainer);

  if (Result.isErr(result)) {
    if (result.error.code === 'NOT_SUPPORTED') {
      showMessage('Fullscreen not supported');
    } else {
      showMessage('Fullscreen failed');
    }
  }
});

// Update button icon
const cleanup = Fullscreen.onChange((isFullscreen) => {
  fullscreenButton.textContent = isFullscreen
    ? 'Exit Fullscreen'
    : 'Fullscreen';
  videoContainer.classList.toggle('is-fullscreen', isFullscreen);
});
```

### Image Gallery Fullscreen

```typescript
async function viewImageFullscreen(image: HTMLImageElement): Promise<void> {
  // Create fullscreen container
  const container = document.createElement('div');
  container.className = 'fullscreen-gallery';
  container.appendChild(image.cloneNode(true));
  document.body.appendChild(container);

  // Enter fullscreen
  const result = await Fullscreen.request(container);

  if (Result.isErr(result)) {
    container.remove();
    return;
  }

  // Exit on click or Escape
  const cleanup = Fullscreen.onChange((isFullscreen) => {
    if (!isFullscreen) {
      cleanup();
      container.remove();
    }
  });

  container.addEventListener('click', () => {
    void Fullscreen.exit();
  });
}
```

### Fullscreen Presentation Mode

```typescript
const presentation = document.getElementById('presentation')!;
const startButton = document.getElementById('start-presentation')!;

startButton.addEventListener('click', async () => {
  if (!Fullscreen.isSupported()) {
    showMessage('Fullscreen not supported in this browser');
    return;
  }

  const result = await Fullscreen.request(presentation);

  if (Result.isOk(result)) {
    startPresentationMode();
  }
});

// Handle fullscreen exit
const cleanup = Fullscreen.onChange((isFullscreen, element) => {
  if (!isFullscreen && element === presentation) {
    stopPresentationMode();
  }
});
```

### Fullscreen with Error Handling

```typescript
async function enterFullscreen(element: HTMLElement): Promise<boolean> {
  // Check support first
  if (!Fullscreen.isSupported()) {
    console.warn('Fullscreen API not supported');
    return false;
  }

  const result = await Fullscreen.request(element);

  if (Result.isErr(result)) {
    switch (result.error.code) {
      case 'NOT_SUPPORTED':
        showToast('Your browser does not support fullscreen');
        break;
      case 'REQUEST_FAILED':
        showToast('Could not enter fullscreen. User gesture required.');
        break;
      default:
        showToast('Fullscreen failed');
    }
    return false;
  }

  return true;
}
```

### Keyboard Shortcut for Fullscreen

```typescript
document.addEventListener('keydown', async (event) => {
  // F11 or Ctrl+Enter for fullscreen
  if (event.key === 'F11' || (event.ctrlKey && event.key === 'Enter')) {
    event.preventDefault();
    await Fullscreen.toggle();
  }
});
```

## Browser Compatibility

The Fullscreen module handles vendor prefixes automatically:

- Standard: `requestFullscreen`, `exitFullscreen`
- WebKit: `webkitRequestFullscreen`, `webkitExitFullscreen`
- Mozilla: `mozRequestFullScreen`, `mozCancelFullScreen`
- MS: `msRequestFullscreen`, `msExitFullscreen`

## Security Considerations

1. **User Gesture Required** - Fullscreen requests must be triggered by user
   interaction (click, keypress)
2. **Permission Prompts** - Some browsers show permission prompts for fullscreen
3. **Escape Key** - Users can always exit fullscreen with Escape key
4. **Cross-Origin Iframes** - Fullscreen may be restricted in cross-origin
   iframes
5. **Feature Policy** - Check if fullscreen is allowed by feature policy in
   iframes

## Notes

- If no element is provided to `request()`, `document.documentElement` is used
- The `onChange` handler receives both the fullscreen state and the current
  element
- Fullscreen mode persists until explicitly exited or user presses Escape
- Some browsers require the element to be visible before entering fullscreen
