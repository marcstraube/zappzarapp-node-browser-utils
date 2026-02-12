# Event Utilities

Debounce, throttle, and common event handling patterns with automatic cleanup.

## Quick Start

```typescript
import { debounce, throttle } from '@zappzarapp/browser-utils/core';
import { EventUtils } from '@zappzarapp/browser-utils/events';

// Debounce search input
const debouncedSearch = debounce(search, 300);
input.addEventListener('input', debouncedSearch);

// Throttle scroll handler
const throttledScroll = throttle(onScroll, 100);
window.addEventListener('scroll', throttledScroll);

// Outside click detection
const cleanup = EventUtils.onOutsideClick(dropdown, () => {
  dropdown.classList.remove('open');
});
```

## Exports

| Export              | Description                                    |
| ------------------- | ---------------------------------------------- |
| `debounce`          | Delay function until after wait period         |
| `throttle`          | Limit function to at most once per wait period |
| `EventUtils`        | Common event handling patterns                 |
| `DebounceOptions`   | Options for debounce                           |
| `DebouncedFunction` | Debounced function type with control methods   |
| `ThrottleOptions`   | Options for throttle                           |
| `ThrottledFunction` | Throttled function type with control methods   |
| `CleanupFn`         | Cleanup function type                          |

## debounce

Delay function execution until after a wait period of inactivity.

### Basic Usage

```typescript
const debouncedSearch = debounce((query: string) => {
  fetchResults(query);
}, 300);

input.addEventListener('input', (e) => {
  debouncedSearch(e.target.value);
});
```

### Options

| Option     | Type      | Default | Description                                  |
| ---------- | --------- | ------- | -------------------------------------------- |
| `leading`  | `boolean` | `false` | Execute on leading edge (immediately)        |
| `trailing` | `boolean` | `true`  | Execute on trailing edge (after wait)        |
| `maxWait`  | `number`  | -       | Maximum time to wait before forced execution |

### Examples

```typescript
// Leading edge (fires immediately, then debounces)
const debouncedClick = debounce(handleClick, 300, { leading: true });

// Trailing only (default)
const debouncedInput = debounce(handleInput, 300, { trailing: true });

// Both edges
const debouncedBoth = debounce(handler, 300, { leading: true, trailing: true });

// With max wait (fires at most every 1000ms during continuous activity)
const debouncedScroll = debounce(onScroll, 100, { maxWait: 1000 });
```

### Control Methods

```typescript
const debounced = debounce(fn, 300);

// Cancel pending execution
debounced.cancel();

// Execute immediately if pending
debounced.flush();

// Check if execution is pending
if (debounced.pending()) {
  console.log('Waiting to execute...');
}
```

## throttle

Limit function execution to at most once per wait period.

### Basic Usage

```typescript
const throttledScroll = throttle(() => {
  updateScrollPosition();
}, 100);

window.addEventListener('scroll', throttledScroll);
```

### Options

| Option     | Type      | Default | Description                           |
| ---------- | --------- | ------- | ------------------------------------- |
| `leading`  | `boolean` | `true`  | Execute on leading edge (immediately) |
| `trailing` | `boolean` | `true`  | Execute on trailing edge (after wait) |

### Examples

```typescript
// Default (both edges)
const throttled = throttle(onResize, 200);

// Only leading edge (no trailing call)
const throttledClick = throttle(onClick, 1000, { trailing: false });

// Only trailing edge (no immediate call)
const throttledResize = throttle(onResize, 200, { leading: false });
```

### Control Methods

```typescript
const throttled = throttle(fn, 100);

// Cancel pending trailing execution
throttled.cancel();

// Execute immediately if pending
throttled.flush();

// Check if execution is pending
if (throttled.pending()) {
  console.log('Trailing call pending...');
}
```

## EventUtils

### EventUtils.once()

Add a one-time event listener:

```typescript
const cleanup = EventUtils.once(document, 'click', (event) => {
  console.log('First click!');
  // Automatically removed after first trigger
});

// Optional: remove before it triggers
cleanup();
```

### EventUtils.delegate()

Event delegation - listen on container for events from matching descendants:

```typescript
const cleanup = EventUtils.delegate(
  document.body,
  'button.action',
  'click',
  (event, target) => {
    console.log('Button clicked:', target);
  }
);
```

### EventUtils.onOutsideClick()

Detect clicks outside an element:

```typescript
const cleanup = EventUtils.onOutsideClick(dropdown, (event) => {
  dropdown.classList.remove('open');
});

// With touch support
const cleanup = EventUtils.onOutsideClick(modal, closeModal, {
  touch: true,
});

// Exclude specific elements
const cleanup = EventUtils.onOutsideClick(dropdown, close, {
  exclude: [triggerButton, secondaryPanel],
});
```

### EventUtils.onKey()

Listen for specific key press:

```typescript
const cleanup = EventUtils.onKey(document, 'Escape', (event) => {
  closeModal();
});

// With modifiers
const cleanup = EventUtils.onKey(document, 's', save, {
  ctrl: true,
  preventDefault: true,
});

// All options
const cleanup = EventUtils.onKey(input, 'Enter', submit, {
  capture: false,
  ctrl: false,
  shift: false,
  alt: false,
  meta: false,
  preventDefault: true,
});
```

### EventUtils.on()

Add same handler to multiple events:

```typescript
const cleanup = EventUtils.on(
  element,
  ['mouseenter', 'focus'],
  () => showTooltip(),
  { passive: true }
);
```

## Usage Examples

### Search Input

```typescript
const searchInput = document.getElementById('search');

const debouncedSearch = debounce(async (query: string) => {
  const results = await searchApi(query);
  renderResults(results);
}, 300);

searchInput.addEventListener('input', (e) => {
  debouncedSearch(e.target.value);
});

// Cancel on blur
searchInput.addEventListener('blur', () => {
  debouncedSearch.cancel();
});
```

### Scroll Handler with Throttle

```typescript
const throttledScroll = throttle(() => {
  const scrollY = window.scrollY;

  // Update sticky header
  header.classList.toggle('sticky', scrollY > 100);

  // Show/hide scroll-to-top button
  scrollTopBtn.classList.toggle('visible', scrollY > 500);
}, 100);

window.addEventListener('scroll', throttledScroll, { passive: true });
```

### Dropdown with Outside Click

```typescript
function openDropdown(dropdown: HTMLElement, trigger: HTMLElement): CleanupFn {
  dropdown.classList.add('open');

  return EventUtils.onOutsideClick(
    dropdown,
    () => {
      dropdown.classList.remove('open');
    },
    {
      exclude: [trigger],
    }
  );
}
```

### Modal with Keyboard Handler

```typescript
function openModal(modal: HTMLElement): CleanupFn {
  modal.classList.add('visible');

  const cleanupEscape = EventUtils.onKey(document, 'Escape', () => {
    closeModal(modal);
    cleanup();
  });

  const cleanupOutside = EventUtils.onOutsideClick(modal, () => {
    closeModal(modal);
    cleanup();
  });

  const cleanup = () => {
    cleanupEscape();
    cleanupOutside();
  };

  return cleanup;
}
```

### Window Resize Handler

```typescript
const throttledResize = throttle(
  () => {
    recalculateLayout();
  },
  100,
  { leading: false }
);

const debouncedResizeEnd = debounce(() => {
  // Only after resize stops
  animateLayout();
}, 200);

window.addEventListener('resize', () => {
  throttledResize();
  debouncedResizeEnd();
});
```

## Debounce vs Throttle

| Feature  | Debounce                        | Throttle                      |
| -------- | ------------------------------- | ----------------------------- |
| Use case | Wait for inactivity             | Limit rate of execution       |
| Example  | Search input, window resize end | Scroll handler, mouse move    |
| Behavior | Delays until quiet period       | Executes at regular intervals |
| Leading  | Optional (default: off)         | Optional (default: on)        |
| Trailing | Optional (default: on)          | Optional (default: on)        |
