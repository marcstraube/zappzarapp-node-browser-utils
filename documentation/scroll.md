# Scroll Utilities

Scroll management, locking, position tracking, and viewport detection.

## Quick Start

```typescript
import { ScrollUtils } from '@zappzarapp/browser-utils/scroll';

// Smooth scroll to element
ScrollUtils.scrollIntoView(element, { behavior: 'smooth' });

// Lock scroll for modal
const unlock = ScrollUtils.lock();
// ... modal open ...
unlock(); // Restore scrolling

// Check if element is visible
if (ScrollUtils.isInViewport(element)) {
  loadContent();
}
```

## API Reference

### Scroll Navigation

| Method                                | Returns   | Description                   |
| ------------------------------------- | --------- | ----------------------------- |
| `scrollTo(options)`                   | `void`    | Scroll to specific position   |
| `scrollToTop(options?)`               | `void`    | Scroll to top of page         |
| `scrollToBottom(options?)`            | `void`    | Scroll to bottom of page      |
| `scrollIntoView(element, options?)`   | `void`    | Scroll element into view      |
| `scrollToElement(selector, options?)` | `boolean` | Scroll to element by selector |

### Scroll Lock

| Method   | Returns     | Description                                  |
| -------- | ----------- | -------------------------------------------- |
| `lock()` | `CleanupFn` | Lock body scrolling, returns unlock function |

### Scroll Position

| Method                  | Returns                    | Description                               |
| ----------------------- | -------------------------- | ----------------------------------------- |
| `getScrollPosition()`   | `{ x: number, y: number }` | Get current scroll position               |
| `getScrollPercentage()` | `{ x: number, y: number }` | Get scroll position as percentage (0-100) |
| `getMaxScroll()`        | `{ x: number, y: number }` | Get maximum scroll values                 |

### Viewport Detection

| Method                              | Returns   | Description                        |
| ----------------------------------- | --------- | ---------------------------------- |
| `isInViewport(element, threshold?)` | `boolean` | Check if element is in viewport    |
| `isFullyInViewport(element)`        | `boolean` | Check if element is fully visible  |
| `isAboveViewport(element)`          | `boolean` | Check if element is above viewport |
| `isBelowViewport(element)`          | `boolean` | Check if element is below viewport |

### Scroll Events

| Method                                 | Returns     | Description                          |
| -------------------------------------- | ----------- | ------------------------------------ |
| `onScroll(handler, options?)`          | `CleanupFn` | Listen for scroll events (throttled) |
| `onScrollDirection(handler, options?)` | `CleanupFn` | Listen for scroll direction changes  |

## Types

```typescript
interface ScrollToOptions {
  behavior?: ScrollBehavior; // 'auto' | 'smooth'
  block?: ScrollLogicalPosition; // 'start' | 'center' | 'end' | 'nearest'
  inline?: ScrollLogicalPosition; // 'start' | 'center' | 'end' | 'nearest'
}

interface ScrollPosition {
  x: number;
  y: number;
}
```

## Usage Examples

### Modal Scroll Lock

```typescript
function openModal(modal: HTMLElement): () => void {
  // Lock scroll and save unlock function
  const unlock = ScrollUtils.lock();

  modal.classList.add('open');

  return () => {
    modal.classList.remove('open');
    unlock(); // Restore scroll position and enable scrolling
  };
}
```

### Smooth Scroll Navigation

```typescript
// Smooth scroll to anchor
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const selector = link.getAttribute('href')!;
    ScrollUtils.scrollToElement(selector, {
      behavior: 'smooth',
      block: 'start',
    });
  });
});
```

### Back to Top Button

```typescript
const backToTop = document.getElementById('back-to-top')!;

// Show/hide based on scroll position
const cleanup = ScrollUtils.onScroll(
  () => {
    const { y } = ScrollUtils.getScrollPercentage();
    backToTop.hidden = y < 20;
  },
  { throttle: 100 }
);

// Scroll to top on click
backToTop.addEventListener('click', () => {
  ScrollUtils.scrollToTop({ behavior: 'smooth' });
});
```

### Lazy Loading

```typescript
// Load content when element comes into view
function lazyLoad(element: HTMLElement, loader: () => void): void {
  const cleanup = ScrollUtils.onScroll(
    () => {
      if (ScrollUtils.isInViewport(element, 0.1)) {
        cleanup();
        loader();
      }
    },
    { throttle: 100, passive: true }
  );
}
```

### Hide Header on Scroll Down

```typescript
const header = document.querySelector('header')!;

const cleanup = ScrollUtils.onScrollDirection(
  (direction) => {
    if (direction === 'down') {
      header.classList.add('hidden');
    } else {
      header.classList.remove('hidden');
    }
  },
  { threshold: 20, throttle: 100 }
);
```

### Reading Progress Indicator

```typescript
const progressBar = document.getElementById('progress')!;

const cleanup = ScrollUtils.onScroll(
  () => {
    const { y } = ScrollUtils.getScrollPercentage();
    progressBar.style.width = `${y}%`;
  },
  { throttle: 50 }
);
```

### Scroll Position Preservation

```typescript
// Save scroll position before navigation
const savePosition = (): void => {
  const pos = ScrollUtils.getScrollPosition();
  sessionStorage.setItem('scrollPos', JSON.stringify(pos));
};

// Restore scroll position
const restorePosition = (): void => {
  const saved = sessionStorage.getItem('scrollPos');
  if (saved) {
    const { x, y } = JSON.parse(saved);
    ScrollUtils.scrollTo({ left: x, top: y });
    sessionStorage.removeItem('scrollPos');
  }
};
```

## Configuration

### onScroll Options

| Option     | Type      | Default | Description                    |
| ---------- | --------- | ------- | ------------------------------ |
| `throttle` | `number`  | `0`     | Throttle delay in milliseconds |
| `passive`  | `boolean` | `true`  | Use passive event listener     |

### onScrollDirection Options

| Option      | Type     | Default | Description                                 |
| ----------- | -------- | ------- | ------------------------------------------- |
| `threshold` | `number` | `10`    | Minimum scroll distance to detect direction |
| `throttle`  | `number` | `100`   | Throttle delay in milliseconds              |

## Performance Considerations

1. **Throttled Events** - Use throttle option to limit callback frequency
2. **Passive Listeners** - Enabled by default for better scroll performance
3. **Cleanup Functions** - Always call cleanup to remove event listeners
4. **Scroll Lock** - Properly handles scrollbar width compensation
