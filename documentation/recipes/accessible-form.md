# Recipe: Accessible Form in a Modal Dialog

Build a contact form inside a modal dialog with validation, focus management,
keyboard navigation, and screen reader support.

## Modules Used

| Module             | Purpose                          |
| ------------------ | -------------------------------- |
| `FormValidator`    | Field validation and error state |
| `FocusTrap`        | Constrain focus within the modal |
| `KeyboardShortcut` | Keyboard navigation and dismiss  |
| `LiveAnnouncer`    | Screen reader announcements      |
| `AriaUtils`        | ARIA attribute management        |

## Step 1: Set Up the Modal and Focus Trap

Create the modal container and trap focus inside it so keyboard users cannot tab
out into the background content.

```typescript
import { FocusTrap } from '@zappzarapp/browser-utils/focus';
import { AriaUtils } from '@zappzarapp/browser-utils/a11y';

const modal = document.getElementById('contact-modal')!;
const trigger = document.getElementById('open-contact')!;

// Mark the modal with the correct ARIA role and label
AriaUtils.setRole(modal, 'dialog');
AriaUtils.set(modal, 'modal', 'true');
AriaUtils.set(modal, 'labelledby', 'modal-title');

const trap = FocusTrap.create(modal, {
  initialFocus: '#contact-name',
  returnFocus: true,
  escapeDeactivates: true,
  onEscapeDeactivate: () => closeModal(),
});
```

## Step 2: Define Validation Rules

Configure the validator with rules for each field. Custom validators can handle
more complex logic.

```typescript
import { FormValidator } from '@zappzarapp/browser-utils/form';

const validator = FormValidator.create({
  name: { required: true, minLength: 2, maxLength: 100 },
  email: { required: true, email: true },
  subject: { required: true, minLength: 5, maxLength: 200 },
  message: { required: true, minLength: 10, maxLength: 2000 },
});
```

## Step 3: Wire Up Screen Reader Announcements

Use `LiveAnnouncer` to communicate validation errors and success states to
assistive technology.

```typescript
import { LiveAnnouncer } from '@zappzarapp/browser-utils/a11y';

const announcer = LiveAnnouncer.create();
```

## Step 4: Register Keyboard Shortcuts

Add shortcuts for common actions within the modal context.

```typescript
import {
  ShortcutManager,
  KeyboardShortcut,
} from '@zappzarapp/browser-utils/keyboard';

// Ctrl+Enter to submit from anywhere in the form
const cleanupSubmit = ShortcutManager.on(
  KeyboardShortcut.create({ key: 'Enter', ctrlKey: true }),
  () => submitForm()
);
```

## Step 5: Handle Validation Errors Accessibly

When validation fails, announce errors and move focus to the first invalid
field.

```typescript
import { FocusUtils } from '@zappzarapp/browser-utils/focus';

function displayErrors(
  form: HTMLFormElement,
  result: { valid: boolean; errors: Record<string, string[]> }
): void {
  // Clear previous error states
  for (const field of form.elements) {
    if (field instanceof HTMLElement) {
      AriaUtils.remove(field, 'invalid');
      AriaUtils.remove(field, 'describedby');
    }
  }

  if (result.valid) return;

  const errorMessages: string[] = [];

  for (const [fieldName, messages] of Object.entries(result.errors)) {
    const field = form.elements.namedItem(fieldName) as HTMLElement | null;
    const errorEl = document.getElementById(`${fieldName}-error`);

    if (field && errorEl) {
      AriaUtils.set(field, 'invalid', 'true');
      AriaUtils.set(field, 'describedby', errorEl.id);
      errorEl.textContent = messages[0];
      errorMessages.push(`${fieldName}: ${messages[0]}`);
    }
  }

  // Announce error summary to screen readers
  announcer.announce(
    `Form has ${errorMessages.length} error(s). ${errorMessages[0]}`,
    'assertive'
  );

  // Focus the first invalid field
  const firstInvalid = form.querySelector('[aria-invalid="true"]');
  if (firstInvalid instanceof HTMLElement) {
    firstInvalid.focus();
  }
}
```

## Complete Example

Bringing all modules together into a working contact form modal.

```typescript
import { FormValidator, FormSerializer } from '@zappzarapp/browser-utils/form';
import { FocusTrap, FocusUtils } from '@zappzarapp/browser-utils/focus';
import {
  ShortcutManager,
  KeyboardShortcut,
} from '@zappzarapp/browser-utils/keyboard';
import { AriaUtils, LiveAnnouncer } from '@zappzarapp/browser-utils/a11y';

// --- Elements ---
const modal = document.getElementById('contact-modal')!;
const form = modal.querySelector('form')! as HTMLFormElement;
const trigger = document.getElementById('open-contact')!;

// --- ARIA setup ---
AriaUtils.setRole(modal, 'dialog');
AriaUtils.set(modal, 'modal', 'true');
AriaUtils.set(modal, 'labelledby', 'modal-title');

// --- Modules ---
const announcer = LiveAnnouncer.create();

const validator = FormValidator.create({
  name: { required: true, minLength: 2, maxLength: 100 },
  email: { required: true, email: true },
  subject: { required: true, minLength: 5 },
  message: { required: true, minLength: 10, maxLength: 2000 },
});

const trap = FocusTrap.create(modal, {
  initialFocus: '#contact-name',
  returnFocus: true,
  escapeDeactivates: true,
  onEscapeDeactivate: () => closeModal(),
});

// --- Open / Close ---
function openModal(): void {
  modal.hidden = false;
  trap.activate();
  announcer.announce('Contact form opened.');
}

function closeModal(): void {
  trap.deactivate();
  modal.hidden = true;
  announcer.announce('Contact form closed.');
  cleanupSubmitShortcut();
}

trigger.addEventListener('click', openModal);

// --- Keyboard shortcut: Ctrl+Enter to submit ---
const cleanupSubmitShortcut = ShortcutManager.on(
  KeyboardShortcut.create({ key: 'Enter', ctrlKey: true }),
  () => submitForm()
);

// --- Real-time field validation ---
const cleanupFieldChange = validator.onFieldChange(
  form,
  (fieldName, result) => {
    const field = form.elements.namedItem(fieldName) as HTMLElement | null;
    const errorEl = document.getElementById(`${fieldName}-error`);

    if (!field || !errorEl) return;

    if (result.valid) {
      AriaUtils.remove(field, 'invalid');
      errorEl.textContent = '';
    } else {
      AriaUtils.set(field, 'invalid', 'true');
      AriaUtils.set(field, 'describedby', errorEl.id);
      errorEl.textContent = result.errors[0];
    }
  }
);

// --- Submit ---
async function submitForm(): Promise<void> {
  const result = validator.validate(form);

  if (!result.valid) {
    const count = Object.keys(result.errors).length;
    announcer.announce(
      `${count} validation error(s). Check the form.`,
      'assertive'
    );

    const firstInvalid = form.querySelector('[aria-invalid="true"]');
    if (firstInvalid instanceof HTMLElement) firstInvalid.focus();
    return;
  }

  const data = FormSerializer.toObject(form);
  announcer.announce('Submitting form...');

  try {
    await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    announcer.announce('Message sent successfully.');
    closeModal();
  } catch {
    announcer.announce(
      'Failed to send message. Please try again.',
      'assertive'
    );
  }
}

const cleanupSubmitHandler = validator.onSubmit(form, (result) => {
  if (result.valid) submitForm();
});

// --- Cleanup (call when component unmounts) ---
function destroy(): void {
  cleanupSubmitShortcut();
  cleanupFieldChange();
  cleanupSubmitHandler();
  announcer.destroy();
  trap.deactivate();
}
```

### Required HTML Structure

```html
<button id="open-contact">Contact Us</button>

<div id="contact-modal" hidden>
  <h2 id="modal-title">Contact Us</h2>
  <form>
    <label for="contact-name">Name</label>
    <input id="contact-name" name="name" type="text" />
    <span id="name-error" role="alert"></span>

    <label for="contact-email">Email</label>
    <input id="contact-email" name="email" type="email" />
    <span id="email-error" role="alert"></span>

    <label for="contact-subject">Subject</label>
    <input id="contact-subject" name="subject" type="text" />
    <span id="subject-error" role="alert"></span>

    <label for="contact-message">Message</label>
    <textarea id="contact-message" name="message" rows="5"></textarea>
    <span id="message-error" role="alert"></span>

    <button type="submit">Send Message</button>
  </form>
</div>
```

## Testing Tips

- **Keyboard-only navigation:** Tab through the entire form without a mouse.
  Verify that focus stays trapped inside the modal and returns to the trigger
  button when closed.
- **Screen reader:** Open the modal with VoiceOver, NVDA, or JAWS. Confirm that
  the dialog role, title, validation errors, and success/failure messages are
  announced.
- **Escape key:** Press Escape to close the modal. Verify focus returns to the
  trigger element.
- **Validation feedback:** Submit the form empty and confirm each field receives
  `aria-invalid="true"` and `aria-describedby` pointing to its error message.
  Verify the first invalid field receives focus.
- **axe / Lighthouse:** Run an automated audit with
  [axe-core](https://github.com/dequelabs/axe-core) or Lighthouse to catch
  missing labels, contrast issues, and ARIA misuse.
- **Ctrl+Enter:** Verify the keyboard shortcut submits the form from any focused
  field within the modal.
