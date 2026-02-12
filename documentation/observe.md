# Observer Wrappers

Simplified APIs for IntersectionObserver, ResizeObserver, and MutationObserver.

## Quick Start

```typescript
import {
  IntersectionObserverWrapper,
  ResizeObserverWrapper,
  MutationObserverWrapper,
} from '@zappzarapp/browser-utils/observe';

// Intersection observation
const cleanup = IntersectionObserverWrapper.observe(element, (entry) => {
  if (entry.isIntersecting) {
    console.log('Element is visible');
  }
});

// Resize observation
const cleanup = ResizeObserverWrapper.observe(element, (entry) => {
  console.log('New size:', entry.contentRect.width, entry.contentRect.height);
});

// Mutation observation
const { cleanup } = MutationObserverWrapper.observe(element, (mutations) => {
  console.log('DOM changed:', mutations);
});
```

## IntersectionObserverWrapper

### Methods

| Method                                         | Returns                              | Description                                |
| ---------------------------------------------- | ------------------------------------ | ------------------------------------------ |
| `isSupported()`                                | `boolean`                            | Check if IntersectionObserver is supported |
| `observe(element, callback, options?)`         | `CleanupFn`                          | Observe single element                     |
| `observeAll(elements, callback, options?)`     | `ObserveResult`                      | Observe multiple elements                  |
| `onceVisible(element, options?)`               | `Promise<IntersectionObserverEntry>` | Wait until visible                         |
| `lazyLoad(elements, loader, options?)`         | `CleanupFn`                          | Lazy load elements                         |
| `trackVisibility(element, callback, steps?)`   | `CleanupFn`                          | Track visibility percentage                |
| `infiniteScroll(sentinel, loadMore, options?)` | `CleanupFn`                          | Infinite scroll helper                     |

### Options

```typescript
interface IntersectionOptions {
  readonly root?: Element | Document | null; // Default: viewport
  readonly rootMargin?: string; // Default: '0px'
  readonly threshold?: number | number[]; // Default: 0
}
```

### Usage Examples

#### Lazy Loading Images

```typescript
const images = document.querySelectorAll('img[data-src]');

const cleanup = IntersectionObserverWrapper.lazyLoad(images, (img) => {
  img.src = img.dataset.src!;
  img.removeAttribute('data-src');
});
```

#### Infinite Scroll

```typescript
const sentinel = document.getElementById('load-more-trigger')!;

const cleanup = IntersectionObserverWrapper.infiniteScroll(
  sentinel,
  async () => {
    const newItems = await fetchMoreItems();
    appendItems(newItems);
  },
  { rootMargin: '200px' } // Start loading 200px before visible
);
```

#### Visibility Tracking

```typescript
const video = document.querySelector('video')!;

const cleanup = IntersectionObserverWrapper.trackVisibility(
  video,
  (ratio) => {
    if (ratio > 0.5) {
      video.play();
    } else {
      video.pause();
    }
  },
  10 // 10 threshold steps
);
```

#### Wait Until Visible

```typescript
// Animate element when it becomes visible
await IntersectionObserverWrapper.onceVisible(element, {
  threshold: 0.2,
});
element.classList.add('animate-in');
```

## ResizeObserverWrapper

### Methods

| Method                                                   | Returns             | Description                          |
| -------------------------------------------------------- | ------------------- | ------------------------------------ |
| `isSupported()`                                          | `boolean`           | Check if ResizeObserver is supported |
| `observe(element, callback, options?)`                   | `CleanupFn`         | Observe single element               |
| `observeAll(elements, callback, options?)`               | `ObserveResult`     | Observe multiple elements            |
| `onBreakpoint(element, breakpoints, callback, options?)` | `CleanupFn`         | Track breakpoints                    |
| `getSize(element, box?)`                                 | `{ width, height }` | Get current size                     |
| `onResize(element, callback, options?)`                  | `CleanupFn`         | Watch for size changes               |

### Options

```typescript
interface ResizeOptions {
  readonly box?: 'content-box' | 'border-box' | 'device-pixel-content-box';
  readonly debounce?: number; // Debounce delay in ms
}
```

### Usage Examples

#### Responsive Component

```typescript
const cleanup = ResizeObserverWrapper.onResize(
  container,
  (width, height) => {
    if (width < 400) {
      setCompactLayout();
    } else {
      setFullLayout();
    }
  },
  { debounce: 100 }
);
```

#### Breakpoint Detection

```typescript
const cleanup = ResizeObserverWrapper.onBreakpoint(
  container,
  [320, 640, 1024],
  (breakpoint, width) => {
    console.log(`Current breakpoint: ${breakpoint}px, width: ${width}px`);
    updateGridColumns(breakpoint);
  }
);
```

#### Chart Resizing

```typescript
const cleanup = ResizeObserverWrapper.observe(
  chartContainer,
  (entry) => {
    const { width, height } = entry.contentRect;
    chart.resize(width, height);
  },
  { debounce: 150 }
);
```

## MutationObserverWrapper

### Methods

| Method                                          | Returns         | Description                            |
| ----------------------------------------------- | --------------- | -------------------------------------- |
| `isSupported()`                                 | `boolean`       | Check if MutationObserver is supported |
| `observe(node, callback, options?)`             | `ObserveResult` | Observe mutations                      |
| `onAttributeChange(element, callback, filter?)` | `CleanupFn`     | Watch attribute changes                |
| `onChildChange(element, callback, subtree?)`    | `CleanupFn`     | Watch child changes                    |
| `onTextChange(node, callback, subtree?)`        | `CleanupFn`     | Watch text changes                     |
| `onClassChange(element, className, callback)`   | `CleanupFn`     | Watch specific class                   |
| `onElementAdded(parent, selector, callback)`    | `CleanupFn`     | Watch for element added                |
| `onElementRemoved(parent, selector, callback)`  | `CleanupFn`     | Watch for element removed              |

### Options

```typescript
interface MutationOptions {
  readonly attributes?: boolean;
  readonly childList?: boolean;
  readonly characterData?: boolean;
  readonly subtree?: boolean;
  readonly attributeOldValue?: boolean;
  readonly characterDataOldValue?: boolean;
  readonly attributeFilter?: readonly string[];
}
```

### Usage Examples

#### Attribute Changes

```typescript
const cleanup = MutationObserverWrapper.onAttributeChange(
  element,
  (name, newValue, oldValue) => {
    console.log(`${name} changed from "${oldValue}" to "${newValue}"`);
  },
  ['class', 'data-state'] // Only watch these attributes
);
```

#### Dynamic Content Loading

```typescript
// Watch for dynamically added elements
const cleanup = MutationObserverWrapper.onElementAdded(
  document.body,
  '.lazy-component',
  (element) => {
    initializeComponent(element);
  }
);
```

#### Class Toggle Detection

```typescript
const cleanup = MutationObserverWrapper.onClassChange(
  modal,
  'open',
  (hasClass) => {
    if (hasClass) {
      onModalOpen();
    } else {
      onModalClose();
    }
  }
);
```

#### Form Changes

```typescript
const cleanup = MutationObserverWrapper.onChildChange(
  formContainer,
  (added, removed) => {
    // Re-initialize validation for new fields
    added.forEach((node) => {
      if (node instanceof HTMLInputElement) {
        attachValidation(node);
      }
    });
  },
  true // Watch subtree
);
```

#### Text Content Changes

```typescript
const cleanup = MutationObserverWrapper.onTextChange(
  contentElement,
  (newValue, oldValue) => {
    console.log('Text changed:', { oldValue, newValue });
    saveContentDraft(newValue);
  }
);
```

## Types

### ObserveResult

```typescript
interface ObserveResult {
  readonly cleanup: CleanupFn;
  readonly observer: IntersectionObserver | ResizeObserver | MutationObserver;
  readonly takeRecords?: () => MutationRecord[]; // MutationObserver only
}
```

## Performance Considerations

1. **Cleanup** - Always call cleanup functions to prevent memory leaks
2. **Debouncing** - Use debounce option for ResizeObserver to limit callback
   frequency
3. **Threshold Steps** - Limit threshold steps in trackVisibility for
   performance
4. **Subtree Observation** - Avoid observing large subtrees unless necessary
5. **Attribute Filters** - Use attributeFilter to limit observed attributes
6. **Disconnect** - Observers are automatically disconnected when cleanup is
   called

## Fallback Behavior

All wrappers include fallbacks for unsupported browsers:

- **IntersectionObserver**: Assumes elements are visible immediately
- **ResizeObserver**: Returns current size once, no ongoing observation
- **MutationObserver**: No-op (no observation)

Check `isSupported()` to conditionally enable features or load polyfills.
