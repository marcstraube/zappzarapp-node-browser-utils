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

| Method                           | Returns                 | Description           |
| -------------------------------- | ----------------------- | --------------------- |
| `validate(form)`                 | `ValidationResult`      | Validate entire form  |
| `validateField(form, fieldName)` | `FieldValidationResult` | Validate single field |

### Event Methods

| Method                                   | Returns     | Description                       |
| ---------------------------------------- | ----------- | --------------------------------- |
| `onSubmit(form, handler)`                | `CleanupFn` | Attach validation to submit event |
| `onFieldChange(form, handler, options?)` | `CleanupFn` | Attach real-time field validation |

### Validation Rules

| Rule        | Type                     | Description                      |
| ----------- | ------------------------ | -------------------------------- |
| `required`  | `boolean`                | Field must not be empty          |
| `minLength` | `number`                 | Minimum string length            |
| `maxLength` | `number`                 | Maximum string length            |
| `min`       | `number`                 | Minimum numeric value            |
| `max`       | `number`                 | Maximum numeric value            |
| `email`     | `boolean`                | Must be valid email format       |
| `url`       | `boolean`                | Must be valid URL                |
| `number`    | `boolean`                | Must be numeric                  |
| `integer`   | `boolean`                | Must be integer                  |
| `pattern`   | `RegExp`                 | Must match pattern               |
| `matches`   | `string`                 | Must match another field's value |
| `custom`    | `CustomValidator`        | Custom validation function       |
| `messages`  | `Record<string, string>` | Custom error messages            |

### Types

```typescript
type CustomValidator = (
  value: string,
  form: HTMLFormElement
) => boolean | string;

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
