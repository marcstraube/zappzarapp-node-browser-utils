# Keyboard Shortcuts

Type-safe keyboard shortcut management with automatic cleanup.

## Quick Start

```typescript
import {
  ShortcutManager,
  KeyboardShortcut,
} from '@zappzarapp/browser-utils/keyboard';

// Register Ctrl+S shortcut
const cleanup = ShortcutManager.on(KeyboardShortcut.ctrlKey('s'), () =>
  saveDocument()
);

// Register Escape handler (auto-removes after trigger)
ShortcutManager.onEscape(() => closeModal());

// Cleanup when done
cleanup();
```

## Exports

| Export                   | Description                              |
| ------------------------ | ---------------------------------------- |
| `KeyboardShortcut`       | Immutable keyboard shortcut definition   |
| `ShortcutManager`        | Static methods for registering shortcuts |
| `ShortcutGroup`          | Group shortcuts for bulk management      |
| `ShortcutDefinition`     | Interface for shortcut configuration     |
| `ShortcutHandlerOptions` | Options for shortcut handlers            |
| `CleanupFn`              | Cleanup function type                    |

## KeyboardShortcut

### Factory Methods

```typescript
import { KeyboardShortcut } from '@zappzarapp/browser-utils/keyboard';

// Simple key (no modifiers)
const f1 = KeyboardShortcut.key('F1');

// Ctrl + Key
const ctrlS = KeyboardShortcut.ctrlKey('s');

// Ctrl + Shift + Key
const ctrlShiftP = KeyboardShortcut.ctrlShift('p');

// Alt + Key
const altH = KeyboardShortcut.altKey('h');

// Meta + Key (Cmd on Mac)
const metaK = KeyboardShortcut.metaKey('k');

// Common shortcuts
const escape = KeyboardShortcut.escape();
const enter = KeyboardShortcut.enter();

// Custom shortcut
const custom = KeyboardShortcut.create({
  key: 'k',
  ctrlKey: true,
  altKey: true,
});
```

### ShortcutDefinition

| Property   | Type      | Default  | Description                     |
| ---------- | --------- | -------- | ------------------------------- |
| `key`      | `string`  | Required | Key to match (case-insensitive) |
| `ctrlKey`  | `boolean` | `false`  | Require Ctrl key                |
| `shiftKey` | `boolean` | `false`  | Require Shift key               |
| `altKey`   | `boolean` | `false`  | Require Alt key                 |
| `metaKey`  | `boolean` | `false`  | Require Meta key (Cmd on Mac)   |

### Display Methods

```typescript
const shortcut = KeyboardShortcut.ctrlShift('s');

shortcut.toString(); // "Ctrl+Shift+S"
shortcut.toMacString(); // "⌃⇧S"
```

### Matching Events

```typescript
document.addEventListener('keydown', (event) => {
  if (shortcut.matches(event)) {
    handleShortcut();
  }
});
```

## ShortcutManager

### Handler Options

| Option                     | Type      | Default | Description                        |
| -------------------------- | --------- | ------- | ---------------------------------- |
| `preventDefault`           | `boolean` | `true`  | Prevent default browser behavior   |
| `stopPropagation`          | `boolean` | `false` | Stop event propagation             |
| `stopImmediatePropagation` | `boolean` | `false` | Stop immediate propagation         |
| `capture`                  | `boolean` | `false` | Use capture phase                  |
| `once`                     | `boolean` | `false` | Remove handler after first trigger |

### ShortcutManager.on()

Register a shortcut handler:

```typescript
const cleanup = ShortcutManager.on(
  KeyboardShortcut.ctrlKey('s'),
  () => save(),
  { preventDefault: true }
);

// Later: remove handler
cleanup();
```

### ShortcutManager.onEscape()

Special handler for Escape key (auto-removes, uses capture):

```typescript
const cleanup = ShortcutManager.onEscape(() => closeModal());
```

### ShortcutManager.onEnter()

Handler for Enter key:

```typescript
const cleanup = ShortcutManager.onEnter(() => submitForm(), {
  preventDefault: true,
});
```

## ShortcutGroup

Manage multiple shortcuts together:

```typescript
const group = ShortcutManager.createGroup();

group
  .add(KeyboardShortcut.escape(), () => closeModal())
  .add(KeyboardShortcut.ctrlKey('s'), () => save())
  .add(KeyboardShortcut.ctrlKey('z'), () => undo());

// Check active count
console.log(group.size); // 3

// Cleanup all at once
group.cleanup();
```

### Group Methods

```typescript
// Add shortcut
group.add(shortcut, handler, options);

// Add escape handler
group.addEscape(() => close());

// Remove all shortcuts
group.cleanup();

// Get active count
group.size;
```

## Usage Examples

### Modal Dialog Shortcuts

```typescript
function openModal(): void {
  showModal();

  const group = ShortcutManager.createGroup();

  group
    .addEscape(() => {
      hideModal();
      group.cleanup();
    })
    .add(KeyboardShortcut.enter(), () => {
      confirmAction();
      hideModal();
      group.cleanup();
    });
}
```

### Application Shortcuts

```typescript
// Global shortcuts
ShortcutManager.on(KeyboardShortcut.ctrlKey('s'), save);
ShortcutManager.on(KeyboardShortcut.ctrlKey('z'), undo);
ShortcutManager.on(KeyboardShortcut.ctrlShift('z'), redo);
ShortcutManager.on(KeyboardShortcut.key('F1'), showHelp);
```

### One-Time Shortcut

```typescript
ShortcutManager.on(KeyboardShortcut.escape(), () => dismissNotification(), {
  once: true,
});
```

### Using ShortcutDefinition Directly

```typescript
// Can pass definition object instead of KeyboardShortcut instance
ShortcutManager.on({ key: 's', ctrlKey: true }, () => save());
```
