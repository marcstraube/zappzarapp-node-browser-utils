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
| `ShortcutHandler`        | Handler function type                    |
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

// Ctrl OR Cmd + Key — one registration for cross-platform actions
const undo = KeyboardShortcut.cmdOrCtrl('z');
const redo = KeyboardShortcut.cmdOrCtrlShift('z');

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

| Property    | Type      | Default  | Description                                                |
| ----------- | --------- | -------- | ---------------------------------------------------------- |
| `key`       | `string`  | Required | Key to match (case-insensitive)                            |
| `ctrlKey`   | `boolean` | `false`  | Require Ctrl key                                           |
| `shiftKey`  | `boolean` | `false`  | Require Shift key                                          |
| `altKey`    | `boolean` | `false`  | Require Alt key                                            |
| `metaKey`   | `boolean` | `false`  | Require Meta key (Cmd on Mac)                              |
| `cmdOrCtrl` | `boolean` | `false`  | Match either Ctrl or Meta (supersedes `ctrlKey`/`metaKey`) |

Modifier matching is **exact**: `ctrlKey('z')` does not fire on `Ctrl+Shift+Z`.
With `cmdOrCtrl`, exactly one of Ctrl/Meta must be held (holding both does not
match), while `shiftKey`/`altKey` remain exact.

### Display Methods

```typescript
const shortcut = KeyboardShortcut.ctrlShift('s');

shortcut.toString(); // "Ctrl+Shift+S"
shortcut.toMacString(); // "⌃⇧S"

// cmdOrCtrl renders per platform flavor: Ctrl for toString, Cmd for toMacString.
// Pick the method by platform (e.g. via DeviceInfo) when displaying it.
const undo = KeyboardShortcut.cmdOrCtrl('z');
undo.toString(); // "Ctrl+Z"
undo.toMacString(); // "⌘Z"
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

| Option                     | Type      | Default | Description                                             |
| -------------------------- | --------- | ------- | ------------------------------------------------------- |
| `preventDefault`           | `boolean` | `true`  | Prevent default browser behavior                        |
| `stopPropagation`          | `boolean` | `false` | Stop event propagation                                  |
| `stopImmediatePropagation` | `boolean` | `false` | Stop immediate propagation                              |
| `capture`                  | `boolean` | `false` | Use capture phase                                       |
| `once`                     | `boolean` | `false` | Remove handler after first trigger                      |
| `ignoreEditableTargets`    | `boolean` | `false` | Skip the shortcut while focus is in an editable element |

### Handler Contract

A handler receives the originating `KeyboardEvent` and may return a value:

```typescript
type ShortcutHandler = (event: KeyboardEvent) => unknown;
```

The handler runs **before** `preventDefault`. Return `false` to **decline** the
key — the manager then skips `preventDefault`/`stopPropagation`, leaves the
event for other listeners, and (with `once`) keeps the handler registered. Any
other return value (including `undefined`) consumes the key per the options.
This makes conditional shortcuts first-class:

```typescript
// Rotate only when something is selected; otherwise let the key through.
ShortcutManager.on(KeyboardShortcut.key('r'), () => {
  if (!hasSelection()) return false; // decline — no preventDefault
  rotateSelection();
});
```

> Because the handler runs first, a handler that throws skips `preventDefault`
> and `once` cleanup.

### Editable-Target Skip

By default a `document`-bound shortcut fires regardless of focus. For app-wide
bare-key shortcuts (`R`, `Delete`) that must not fire while the user is typing,
enable `ignoreEditableTargets`. The shortcut is then skipped (no handler, no
`preventDefault`) when the event target is an `<input>`, `<textarea>`,
`<select>`, or an element inside a `[contenteditable]` host (nested elements
included; `contenteditable="false"` does not count):

```typescript
ShortcutManager.on(KeyboardShortcut.key('r'), rotate, {
  ignoreEditableTargets: true,
});
```

> Defaults to `false` to stay non-breaking and to keep modifier shortcuts like
> `Ctrl+S` and `Escape`-to-close working while focus is in a field. For an
> app-wide surface, enable it once via a group default (see below) rather than
> per shortcut.
>
> **Known limitation:** detection reads `event.target`, which the browser
> retargets to the shadow host for events crossing an open Shadow DOM boundary.
> A shortcut may therefore still fire while typing in an `<input>` nested inside
> a web component's shadow root.

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

### Group Default Options

Pass default options to `createGroup` to apply them to every shortcut added via
`add` (per-`add` options take precedence). Use this to opt an app-wide surface
into `ignoreEditableTargets` once instead of per shortcut:

```typescript
const group = ShortcutManager.createGroup({ ignoreEditableTargets: true });

group
  .add(KeyboardShortcut.key('r'), rotate) // skipped while typing
  .add(KeyboardShortcut.key('Delete'), deleteSelection); // skipped while typing
```

> `addEscape` is intentionally exempt from the group defaults, so `Escape` still
> fires while focus is in an input — the common "close modal while typing" case.

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

### App-Wide Editing Shortcuts

A `document`-bound surface for global editing shortcuts: bare keys are skipped
while typing, conditional handlers decline when there is nothing to act on, and
`cmdOrCtrl` covers undo/redo on every platform with one registration each.

```typescript
const shortcuts = ShortcutManager.createGroup({ ignoreEditableTargets: true });

shortcuts
  .add(KeyboardShortcut.cmdOrCtrl('z'), undo)
  .add(KeyboardShortcut.cmdOrCtrlShift('z'), redo)
  .add(KeyboardShortcut.key('Delete'), () => {
    if (!hasSelection()) return false; // decline — let the key through
    deleteSelection();
  })
  .add(KeyboardShortcut.key('r'), () => {
    if (!hasSelection()) return false;
    rotateSelection();
  });

// Escape stays active even while typing (not subject to the group default).
shortcuts.addEscape(cancelDrag);

// Tear down the whole surface at once.
shortcuts.cleanup();
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
