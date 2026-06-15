# Form Utilities

Form serialization, validation, and utility functions.

## Quick Start

```typescript
import {
  FormSerializer,
  FormValidator,
  FormUtils,
} from '@zappzarapp/browser-utils/form';

// Serialize form to object
const data = FormSerializer.toObject(form);

// Validate form
const validator = FormValidator.create({
  email: { required: true, email: true },
  password: { required: true, minLength: 8 },
});
const result = validator.validate(form);

// Check for unsaved changes
if (FormUtils.isDirty(form)) {
  alert('You have unsaved changes!');
}
```

## FormSerializer

### Serialization Methods

| Method                    | Returns                     | Description                           |
| ------------------------- | --------------------------- | ------------------------------------- |
| `toObject(form)`          | `Record<string, FormValue>` | Serialize to plain object             |
| `toFormData(form)`        | `FormData`                  | Serialize to FormData                 |
| `toQueryString(form)`     | `string`                    | Serialize to URL-encoded query string |
| `toURLSearchParams(form)` | `URLSearchParams`           | Serialize to URLSearchParams          |
| `toJSON(form)`            | `string`                    | Serialize to JSON string              |

### Population Methods

| Method                   | Returns | Description                  |
| ------------------------ | ------- | ---------------------------- |
| `fromObject(form, data)` | `void`  | Populate form from object    |
| `reset(form)`            | `void`  | Reset form to initial values |
| `clear(form)`            | `void`  | Clear all form values        |

### Types

```typescript
type FormValue = string | string[] | File | File[] | null;
```

## FormValidator

### Factory Method

```typescript
const validator = FormValidator.create({
  fieldName: {
    required: true,
    minLength: 3,
    maxLength: 50,
    // ... more rules
  },
});
```

### Validation Methods

| Method                             | Returns                          | Description                                |
| ---------------------------------- | -------------------------------- | ------------------------------------------ |
| `validate(form)`                   | `ValidationResult`               | Validate entire form (sync rules)          |
| `validateField(form, fieldName)`   | `FieldValidationResult`          | Validate single field (sync rules)         |
| `validateFieldAsync(field, opts?)` | `Promise<FieldValidationResult>` | Validate a field including its async rule  |
| `validateFormAsync(form)`          | `Promise<ValidationResult>`      | Validate entire form including async rules |
| `isValidating(fieldName)`          | `boolean`                        | Whether async validation is in flight      |

### Event Methods

| Method                                        | Returns     | Description                             |
| --------------------------------------------- | ----------- | --------------------------------------- |
| `onSubmit(form, handler)`                     | `CleanupFn` | Attach validation to submit event       |
| `onSubmitAsync(form, handler, options?)`      | `CleanupFn` | Attach async validation to submit event |
| `onFieldChange(form, handler, options?)`      | `CleanupFn` | Attach real-time field validation       |
| `onFieldChangeAsync(form, handler, options?)` | `CleanupFn` | Attach real-time async field validation |

### Validation Rules

| Rule              | Type                     | Description                           |
| ----------------- | ------------------------ | ------------------------------------- |
| `required`        | `boolean`                | Field must not be empty               |
| `minLength`       | `number`                 | Minimum string length                 |
| `maxLength`       | `number`                 | Maximum string length                 |
| `min`             | `number`                 | Minimum numeric value                 |
| `max`             | `number`                 | Maximum numeric value                 |
| `email`           | `boolean`                | Must be valid email format            |
| `url`             | `boolean`                | Must be valid URL                     |
| `number`          | `boolean`                | Must be numeric                       |
| `integer`         | `boolean`                | Must be integer                       |
| `pattern`         | `RegExp`                 | Must match pattern                    |
| `matches`         | `string`                 | Must match another field's value      |
| `custom`          | `CustomValidator`        | Custom validation function            |
| `asyncCustom`     | `AsyncValidator`         | Async validation function             |
| `asyncDebounceMs` | `number`                 | Debounce for async rule (default 300) |
| `messages`        | `Record<string, string>` | Custom error messages                 |

### Types

```typescript
type CustomValidator = (
  value: string,
  form: HTMLFormElement
) => boolean | string;

// Returns null when valid, or an error message string when invalid.
type AsyncValidator = (
  value: string,
  field: string,
  form: HTMLFormElement
) => Promise<string | null>;

interface FieldRules {
  readonly required?: boolean;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly min?: number;
  readonly max?: number;
  readonly email?: boolean;
  readonly url?: boolean;
  readonly number?: boolean;
  readonly integer?: boolean;
  readonly pattern?: RegExp;
  readonly matches?: string;
  readonly custom?: CustomValidator;
  readonly asyncCustom?: AsyncValidator;
  readonly asyncDebounceMs?: number;
  readonly messages?: Partial<Record<keyof FieldRules, string>>;
}

interface ValidationResult {
  readonly valid: boolean;
  readonly errors: Record<string, string[]>;
  readonly firstError: string | null;
}

interface FieldValidationResult {
  readonly valid: boolean;
  readonly errors: string[];
  readonly firstError: string | null;
}
```

## FormUtils

### Methods

| Method                             | Returns                            | Description                              |
| ---------------------------------- | ---------------------------------- | ---------------------------------------- |
| `isDirty(form)`                    | `boolean`                          | Check if form has been modified          |
| `disable(form)`                    | `void`                             | Disable all form elements                |
| `enable(form)`                     | `void`                             | Enable all form elements                 |
| `setLoading(form, submitButton?)`  | `CleanupFn`                        | Set loading state, returns restore fn    |
| `focusFirstInvalid(form)`          | `boolean`                          | Focus first invalid field                |
| `getFieldNames(form)`              | `string[]`                         | Get all field names                      |
| `getField(form, name)`             | `Element \| RadioNodeList \| null` | Get field by name                        |
| `setFieldValue(form, name, value)` | `void`                             | Set field value by name                  |
| `warnOnUnsavedChanges(form)`       | `CleanupFn`                        | Warn before leaving with unsaved changes |

## Usage Examples

### Form Submission with Validation

```typescript
const validator = FormValidator.create({
  username: {
    required: true,
    minLength: 3,
    maxLength: 20,
    pattern: /^[a-zA-Z0-9_]+$/,
    messages: {
      pattern: 'Username can only contain letters, numbers, and underscores',
    },
  },
  email: { required: true, email: true },
  password: {
    required: true,
    minLength: 8,
    custom: (value) =>
      (/[A-Z]/.test(value) && /[0-9]/.test(value)) ||
      'Password must contain uppercase letter and number',
  },
  confirmPassword: {
    required: true,
    matches: 'password',
    messages: {
      matches: 'Passwords do not match',
    },
  },
});

// Handle submission
const cleanup = validator.onSubmit(form, async (data, result) => {
  if (!result.valid) {
    FormUtils.focusFirstInvalid(form);
    showErrors(result.errors);
    return;
  }

  const restore = FormUtils.setLoading(form, submitButton);
  try {
    await submitData(data);
    showSuccess();
  } catch (error) {
    showError(error);
  } finally {
    restore();
  }
});
```

### Real-Time Validation

```typescript
const validator = FormValidator.create({
  email: { required: true, email: true },
});

// Validate on blur
const cleanup = validator.onFieldChange(
  form,
  (fieldName, result) => {
    const errorElement = form.querySelector(`[data-error="${fieldName}"]`);
    if (errorElement) {
      errorElement.textContent = result.firstError || '';
    }
  },
  { validateOn: 'blur' }
);
```

### Async Validation

Async rules (`asyncCustom`) cover checks that need a server round-trip, such as
username availability or email uniqueness. An async validator returns `null`
when valid or an error message string when invalid.

```typescript
const validator = FormValidator.create({
  username: {
    required: true,
    minLength: 3,
    asyncCustom: async (value) => {
      const res = await fetch(
        `/api/username-available?u=${encodeURIComponent(value)}`
      );
      const { available } = await res.json();
      return available ? null : 'Username is already taken';
    },
    asyncDebounceMs: 400, // optional, defaults to 300
  },
});
```

The async validator runs **only when the field's synchronous rules pass**. A
value that is too short or malformed short-circuits before the async validator
is invoked, so no lookup is issued for an already-invalid value. Set the
threshold via the usual sync rules — e.g. `minLength: 3` means the availability
check fires only from the third character on. Combined with the built-in
debounce, this keeps backend load minimal.

`onFieldChangeAsync` wires this up to live input. It defaults to the `input`
event and exposes `onValidationStart` / `onValidationEnd` callbacks to drive a
per-field loading indicator; `isValidating(fieldName)` can be polled for the
same state. The callbacks fire once per validation cycle even when rapid typing
collapses several keystrokes into one debounced run.

```typescript
const cleanup = validator.onFieldChangeAsync(
  form,
  (fieldName, result) => {
    const errorElement = form.querySelector(`[data-error="${fieldName}"]`);
    if (errorElement) {
      errorElement.textContent = result.firstError ?? '';
    }
  },
  {
    onValidationStart: (fieldName) => toggleSpinner(fieldName, true),
    onValidationEnd: (fieldName) => toggleSpinner(fieldName, false),
  }
);

// Validate the whole form (including async rules) before submit:
const result = await validator.validateFormAsync(form);
if (result.valid) {
  // ...
}
```

For submit handling, `onSubmitAsync` validates the whole form (including async
rules) before the handler runs. Unlike the synchronous `onSubmit` — which lets a
valid form submit natively — `onSubmitAsync` **always** prevents the native
submit (the result is only known after an await), so the handler is responsible
for sending on success. The handler always runs and receives the result; check
`result.valid` to branch. Concurrent submits are ignored while a cycle is in
flight, so a double click cannot trigger overlapping submissions.

```typescript
const cleanup = validator.onSubmitAsync(
  form,
  async (data, result) => {
    if (!result.valid) {
      showErrors(result.errors);
      FormUtils.focusFirstInvalid(form);
      return;
    }
    await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },
  {
    onValidationStart: () => FormUtils.disable(form),
    onValidationEnd: () => FormUtils.enable(form),
  }
);
```

> **Security:** Async validators are UX, not an authority. A client-side
> availability/uniqueness check cannot close the time-of-check/time-of-use gap —
> enforce uniqueness server-side (e.g. a `UNIQUE` constraint) regardless.

### Form Serialization

```typescript
// Serialize for AJAX
const data = FormSerializer.toObject(form);
const response = await fetch('/api/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});

// Serialize for file upload
const formData = FormSerializer.toFormData(form);
await fetch('/api/upload', {
  method: 'POST',
  body: formData,
});

// Serialize for URL
const query = FormSerializer.toQueryString(form);
window.location.href = `/search?${query}`;
```

### Populate Form from Data

```typescript
// Load saved data
const savedData = await fetchUserProfile();
FormSerializer.fromObject(form, savedData);

// Track unsaved changes
const cleanup = FormUtils.warnOnUnsavedChanges(
  form,
  'You have unsaved changes. Leave anyway?'
);
```

### Loading State

```typescript
submitButton.addEventListener('click', async () => {
  const restore = FormUtils.setLoading(form, submitButton);

  try {
    await saveData(FormSerializer.toObject(form));
  } finally {
    restore();
  }
});
```

## Security Considerations

1. **File Input Restriction** - Cannot programmatically set file input values
   (browser security)
2. **Input Validation** - Always validate on server side; client validation is
   for UX only
3. **XSS Prevention** - Form data should be sanitized before display
4. **CSRF Protection** - Ensure forms include CSRF tokens when submitting
5. **Password Fields** - Never include passwords in `toQueryString()` or URLs
