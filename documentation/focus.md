# Focus Management

Focus trapping and utilities for accessible modal dialogs and overlays.

## Quick Start

```typescript
import { FocusTrap, FocusUtils } from '@zappzarapp/browser-utils/focus';

// Create and activate focus trap for modal
const trap = FocusTrap.create(modalElement, {
  initialFocus: modalElement.querySelector('input'),
  returnFocus: true,
  escapeDeactivates: true,
});

trap.activate();

// Later, when modal closes
trap.deactivate();
```

## FocusTrap

### Factory Method

```typescript
const trap = FocusTrap.create(container, {
  initialFocus: null, // Element or selector to focus initially
  returnFocus: true, // Return focus when deactivated
  escapeDeactivates: false, // Deactivate on Escape key
  onEscapeDeactivate: () => {}, // Callback when Escape deactivates
  allowOutsideClick: true, // Allow clicks outside container
});
```

### Methods

| Method         | Returns   | Description                 |
| -------------- | --------- | --------------------------- |
| `activate()`   | `void`    | Activate the focus trap     |
| `deactivate()` | `void`    | Deactivate the focus trap   |
| `pause()`      | `void`    | Temporarily pause trapping  |
| `unpause()`    | `void`    | Resume trapping after pause |
| `isActive()`   | `boolean` | Check if trap is active     |
| `isPaused()`   | `boolean` | Check if trap is paused     |

### Configuration Options

| Option               | Type                            | Default | Description                              |
| -------------------- | ------------------------------- | ------- | ---------------------------------------- |
| `initialFocus`       | `HTMLElement \| string \| null` | `null`  | Element or selector to focus on activate |
| `returnFocus`        | `boolean`                       | `true`  | Return focus to previous element         |
| `escapeDeactivates`  | `boolean`                       | `false` | Deactivate trap on Escape key            |
| `onEscapeDeactivate` | `() => void`                    | -       | Callback when Escape deactivates         |
| `allowOutsideClick`  | `boolean`                       | `true`  | Allow clicks outside the container       |

## FocusUtils

### Methods

| Method                                               | Returns               | Description                              |
| ---------------------------------------------------- | --------------------- | ---------------------------------------- |
| `getFocusableElements(container, includeContainer?)` | `HTMLElement[]`       | Get all focusable elements               |
| `getFirstFocusable(container)`                       | `HTMLElement \| null` | Get first focusable element              |
| `getLastFocusable(container)`                        | `HTMLElement \| null` | Get last focusable element               |
| `focusFirstFocusable(container)`                     | `boolean`             | Focus first focusable element            |
| `focusLastFocusable(container)`                      | `boolean`             | Focus last focusable element             |
| `isFocusable(element)`                               | `boolean`             | Check if element is focusable            |
| `isVisible(element)`                                 | `boolean`             | Check if element is visible              |
| `isTabbable(element)`                                | `boolean`             | Check if element is reachable via Tab    |
| `saveFocus()`                                        | `() => void`          | Save current focus, returns restore fn   |
| `focusNext(container?)`                              | `boolean`             | Move focus to next focusable element     |
| `focusPrevious(container?)`                          | `boolean`             | Move focus to previous focusable element |

### Focusable Elements

FocusUtils considers these elements as focusable:

- `a[href]`
- `area[href]`
- `button:not([disabled])`
- `input:not([disabled]):not([type="hidden"])`
- `select:not([disabled])`
- `textarea:not([disabled])`
- `[tabindex]:not([tabindex="-1"])`
- `[contenteditable="true"]`
- `audio[controls]`
- `video[controls]`
- `details > summary:first-of-type`

## Usage Examples

### Modal Dialog

```typescript
function openModal(modalElement: HTMLElement): () => void {
  const trap = FocusTrap.create(modalElement, {
    initialFocus: '[data-autofocus]',
    returnFocus: true,
    escapeDeactivates: true,
    onEscapeDeactivate: () => closeModal(),
  });

  modalElement.classList.add('open');
  trap.activate();

  return () => {
    trap.deactivate();
    modalElement.classList.remove('open');
  };
}
```

### Dropdown Menu

```typescript
function openDropdown(trigger: HTMLElement, menu: HTMLElement): void {
  const trap = FocusTrap.create(menu, {
    escapeDeactivates: true,
    onEscapeDeactivate: () => closeDropdown(),
  });

  menu.hidden = false;
  trap.activate();

  // Handle click outside
  const clickHandler = (e: MouseEvent): void => {
    if (!menu.contains(e.target as Node) && e.target !== trigger) {
      closeDropdown();
    }
  };

  document.addEventListener('click', clickHandler);
}
```

### Nested Modals

```typescript
const modalStack: FocusTrapInstance[] = [];

function openNestedModal(modalElement: HTMLElement): void {
  // Pause current trap
  const currentTrap = modalStack[modalStack.length - 1];
  if (currentTrap) {
    currentTrap.pause();
  }

  // Create new trap
  const trap = FocusTrap.create(modalElement, {
    escapeDeactivates: true,
    onEscapeDeactivate: () => closeNestedModal(),
  });

  modalStack.push(trap);
  trap.activate();
}

function closeNestedModal(): void {
  const trap = modalStack.pop();
  trap?.deactivate();

  // Unpause previous trap
  const previousTrap = modalStack[modalStack.length - 1];
  if (previousTrap) {
    previousTrap.unpause();
  }
}
```

### Custom Focus Navigation

```typescript
// Arrow key navigation in a list
listElement.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    FocusUtils.focusNext(listElement);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    FocusUtils.focusPrevious(listElement);
  }
});
```

### Save and Restore Focus

```typescript
// Save focus before temporary operation
const restoreFocus = FocusUtils.saveFocus();

// Do something that changes focus
searchInput.focus();

// Later, restore focus
restoreFocus();
```

## Accessibility Considerations

1. **WCAG Compliance** - Focus trapping is essential for modal dialogs (WCAG
   2.4.3)
2. **Keyboard Navigation** - All interactive elements remain accessible via Tab
3. **Focus Visible** - Ensure trapped elements have visible focus indicators
4. **Escape Key** - Enable `escapeDeactivates` for user control
5. **Return Focus** - Always return focus to trigger element when closing modals
