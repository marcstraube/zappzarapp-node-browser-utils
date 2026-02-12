// noinspection JSUnusedGlobalSymbols - Example file with exported demo functions

/**
 * Form Validation Example - Real-time validation with UI feedback
 *
 * This example demonstrates:
 * - Declarative validation rules
 * - Built-in validators (required, email, minLength, etc.)
 * - Custom validation functions
 * - Real-time field validation (on blur/input)
 * - Form submission handling
 * - UI feedback patterns
 *
 * @packageDocumentation
 */

import { debounce, type CleanupFn } from '@zappzarapp/browser-utils/core';
import {
  FormValidator,
  FormSerializer,
  type FieldRules,
  type ValidationResult,
  type FieldValidationResult,
} from '@zappzarapp/browser-utils/form';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Registration form data structure.
 */
interface RegistrationForm {
  readonly username: string;
  readonly email: string;
  readonly password: string;
  readonly confirmPassword: string;
  readonly age: string;
  readonly website: string;
}

/**
 * Contact form data structure.
 */
interface ContactForm {
  readonly name: string;
  readonly email: string;
  readonly subject: string;
  readonly message: string;
}

// =============================================================================
// Basic Validation Rules
// =============================================================================

/**
 * Define validation rules for a registration form.
 */
const registrationRules: Record<keyof RegistrationForm, FieldRules> = {
  username: {
    required: true,
    minLength: 3,
    maxLength: 20,
    pattern: /^[a-zA-Z0-9_]+$/,
    messages: {
      required: 'Username is required',
      minLength: 'Username must be at least 3 characters',
      maxLength: 'Username cannot exceed 20 characters',
      pattern: 'Username can only contain letters, numbers, and underscores',
    },
  },

  email: {
    required: true,
    email: true,
    messages: {
      required: 'Email is required',
      email: 'Please enter a valid email address',
    },
  },

  password: {
    required: true,
    minLength: 8,
    maxLength: 128,
    custom: (value: string): boolean | string => {
      // Check for uppercase letter
      if (!/[A-Z]/.test(value)) {
        return 'Password must contain at least one uppercase letter';
      }
      // Check for lowercase letter
      if (!/[a-z]/.test(value)) {
        return 'Password must contain at least one lowercase letter';
      }
      // Check for number
      if (!/[0-9]/.test(value)) {
        return 'Password must contain at least one number';
      }
      // Check for special character
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
        return 'Password must contain at least one special character';
      }
      return true;
    },
    messages: {
      required: 'Password is required',
      minLength: 'Password must be at least 8 characters',
    },
  },

  confirmPassword: {
    required: true,
    matches: 'password',
    messages: {
      required: 'Please confirm your password',
      matches: 'Passwords do not match',
    },
  },

  age: {
    required: true,
    number: true,
    min: 18,
    max: 120,
    messages: {
      required: 'Age is required',
      number: 'Please enter a valid number',
      min: 'You must be at least 18 years old',
      max: 'Please enter a valid age',
    },
  },

  website: {
    url: true,
    messages: {
      url: 'Please enter a valid URL (e.g., https://example.com)',
    },
  },
};

// =============================================================================
// UI Feedback Functions
// =============================================================================

/**
 * Show validation error for a field.
 */
function showFieldError(fieldName: string, errors: string[]): void {
  const field = document.querySelector(`[name="${fieldName}"]`) as HTMLElement | null;
  const errorContainer = document.getElementById(`${fieldName}-error`);

  if (field !== null) {
    field.classList.add('is-invalid');
    field.classList.remove('is-valid');
    field.setAttribute('aria-invalid', 'true');
  }

  if (errorContainer !== null) {
    errorContainer.textContent = errors[0] ?? '';
    errorContainer.classList.remove('hidden');
    errorContainer.setAttribute('role', 'alert');
  }
}

/**
 * Show validation success for a field.
 */
function showFieldSuccess(fieldName: string): void {
  const field = document.querySelector(`[name="${fieldName}"]`) as HTMLElement | null;
  const errorContainer = document.getElementById(`${fieldName}-error`);

  if (field !== null) {
    field.classList.remove('is-invalid');
    field.classList.add('is-valid');
    field.setAttribute('aria-invalid', 'false');
  }

  if (errorContainer !== null) {
    errorContainer.textContent = '';
    errorContainer.classList.add('hidden');
    errorContainer.removeAttribute('role');
  }
}

/**
 * Clear all validation states.
 */
function clearValidationState(form: HTMLFormElement): void {
  const fields = form.querySelectorAll('input, textarea, select');
  fields.forEach((field) => {
    field.classList.remove('is-valid', 'is-invalid');
    field.removeAttribute('aria-invalid');
  });

  const errors = form.querySelectorAll('[id$="-error"]');
  errors.forEach((error) => {
    error.textContent = '';
    error.classList.add('hidden');
  });
}

/**
 * Show form-level error message.
 */
function showFormError(message: string): void {
  const formError = document.getElementById('form-error');
  if (formError !== null) {
    formError.textContent = message;
    formError.classList.remove('hidden');
    formError.setAttribute('role', 'alert');
  }
}

/**
 * Hide form-level error message.
 */
function hideFormError(): void {
  const formError = document.getElementById('form-error');
  if (formError !== null) {
    formError.textContent = '';
    formError.classList.add('hidden');
  }
}

// =============================================================================
// Real-Time Validation Handler
// =============================================================================

/**
 * Handle field validation result and update UI.
 */
function handleFieldValidation(fieldName: string, result: FieldValidationResult): void {
  if (result.valid) {
    showFieldSuccess(fieldName);
  } else {
    showFieldError(fieldName, result.errors);
  }
}

/**
 * Set up real-time validation for a form.
 * Returns cleanup function to remove event listeners.
 */
function setupRealtimeValidation(form: HTMLFormElement, validator: FormValidator): CleanupFn {
  // Validate on blur (when user leaves a field)
  const blurCleanup = validator.onFieldChange(form, handleFieldValidation, { validateOn: 'blur' });

  // Also validate on input with debounce for better UX
  const debouncedValidate = debounce((event: Event) => {
    const target = event.target as HTMLInputElement | null;
    if (target?.name) {
      const result = validator.validateField(form, target.name);
      // Only show errors after user has typed enough
      if (target.value.length >= 2 || !result.valid) {
        handleFieldValidation(target.name, result);
      }
    }
  }, 300);

  form.addEventListener('input', debouncedValidate);

  // Return combined cleanup
  return (): void => {
    blurCleanup();
    form.removeEventListener('input', debouncedValidate);
  };
}

// =============================================================================
// Form Submission Handler
// =============================================================================

/**
 * Set up form submission with validation.
 */
function setupFormSubmission(
  form: HTMLFormElement,
  validator: FormValidator,
  onSuccess: (data: Record<string, unknown>) => void
): CleanupFn {
  return validator.onSubmit(form, (data, result: ValidationResult) => {
    hideFormError();

    if (result.valid) {
      // Form is valid, process submission
      console.log('Form submitted successfully:', data);
      onSuccess(data);
    } else {
      // Form has errors
      console.log('Validation failed:', result.errors);

      // Show all field errors
      for (const [fieldName, errors] of Object.entries(result.errors)) {
        showFieldError(fieldName, errors);
      }

      // Show form-level error
      const errorCount = Object.keys(result.errors).length;
      showFormError(`Please fix ${errorCount} error${errorCount > 1 ? 's' : ''} above.`);

      // Focus first invalid field
      if (result.firstError !== null) {
        const firstErrorField = Object.keys(result.errors)[0];
        if (firstErrorField !== undefined) {
          const field = form.querySelector(`[name="${firstErrorField}"]`) as HTMLElement | null;
          field?.focus();
        }
      }
    }
  });
}

// =============================================================================
// Complete Registration Form Example
// =============================================================================

/**
 * Initialize registration form with validation.
 */
function initRegistrationForm(): CleanupFn | null {
  const form = document.getElementById('registration-form') as HTMLFormElement | null;

  if (form === null) {
    console.warn('Registration form not found');
    return null;
  }

  // Create validator with rules
  const validator = FormValidator.create(registrationRules);

  // Set up real-time validation
  const realtimeCleanup = setupRealtimeValidation(form, validator);

  // Set up form submission
  const submitCleanup = setupFormSubmission(form, validator, (data) => {
    // Handle successful submission
    console.log('Registration data:', data);
    alert('Registration successful!');
    form.reset();
    clearValidationState(form);
  });

  // Return combined cleanup
  return (): void => {
    realtimeCleanup();
    submitCleanup();
  };
}

// =============================================================================
// Contact Form Example (Simpler)
// =============================================================================

/**
 * Simple contact form validation.
 */
const contactRules: Record<keyof ContactForm, FieldRules> = {
  name: {
    required: true,
    minLength: 2,
    maxLength: 100,
    messages: {
      required: 'Please enter your name',
    },
  },

  email: {
    required: true,
    email: true,
  },

  subject: {
    required: true,
    minLength: 5,
    maxLength: 200,
    messages: {
      required: 'Please enter a subject',
      minLength: 'Subject is too short',
    },
  },

  message: {
    required: true,
    minLength: 20,
    maxLength: 5000,
    messages: {
      required: 'Please enter your message',
      minLength: 'Message must be at least 20 characters',
      maxLength: 'Message is too long (max 5000 characters)',
    },
  },
};

/**
 * Initialize contact form with basic validation.
 */
function initContactForm(): CleanupFn | null {
  const form = document.getElementById('contact-form') as HTMLFormElement | null;

  if (form === null) {
    console.warn('Contact form not found');
    return null;
  }

  const validator = FormValidator.create(contactRules);

  // Simple submit-only validation
  return validator.onSubmit(form, (data, result) => {
    if (result.valid) {
      console.log('Contact form data:', data);
      // Send to server...
      form.reset();
    } else {
      // Show first error
      if (result.firstError !== null) {
        alert(result.firstError);
      }
    }
  });
}

// =============================================================================
// Custom Validators
// =============================================================================

/**
 * Custom validator: Check username availability (simulated async).
 */
export async function checkUsernameAvailability(username: string): Promise<boolean> {
  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Simulated taken usernames
  const takenUsernames = ['admin', 'user', 'test', 'root'];
  return !takenUsernames.includes(username.toLowerCase());
}

/**
 * Custom validator: Password strength scoring.
 */
function getPasswordStrength(password: string): 'weak' | 'medium' | 'strong' {
  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score < 3) return 'weak';
  if (score < 5) return 'medium';
  return 'strong';
}

/**
 * Update password strength indicator.
 */
export function updatePasswordStrength(password: string): void {
  const indicator = document.getElementById('password-strength');
  if (indicator === null) return;

  const strength = getPasswordStrength(password);

  indicator.className = `strength-indicator strength-${strength}`;
  indicator.textContent = `Password strength: ${strength}`;
}

// =============================================================================
// Form Serialization
// =============================================================================

/**
 * Demonstrate form serialization.
 */
export function serializeFormExample(): void {
  const form = document.getElementById('my-form') as HTMLFormElement | null;

  if (form === null) {
    console.warn('Form not found');
    return;
  }

  // Serialize to object
  const data = FormSerializer.toObject(form);
  console.log('Form data (object):', data);

  // Serialize to URL query string
  const queryString = FormSerializer.toQueryString(form);
  console.log('Form data (query string):', queryString);

  // Serialize to FormData
  const formData = FormSerializer.toFormData(form);
  console.log('Form data (FormData entries):');
  for (const [key, value] of formData.entries()) {
    console.log(`  ${key}: ${value}`);
  }
}

// =============================================================================
// Static Validators
// =============================================================================

/**
 * Demonstrate static validator methods.
 */
function staticValidatorsExample(): void {
  console.log('--- Static Validators ---');

  // Email validation
  console.log('Valid email:', FormValidator.isValidEmail('user@example.com')); // true
  console.log('Invalid email:', FormValidator.isValidEmail('not-an-email')); // false

  // URL validation
  console.log('Valid URL:', FormValidator.isValidUrl('https://example.com')); // true
  console.log('Invalid URL:', FormValidator.isValidUrl('not-a-url')); // false

  // Numeric validation
  console.log('Is numeric (42):', FormValidator.isNumeric('42')); // true
  console.log('Is numeric (3.14):', FormValidator.isNumeric('3.14')); // true
  console.log('Is numeric (abc):', FormValidator.isNumeric('abc')); // false

  // Integer validation
  console.log('Is integer (42):', FormValidator.isInteger('42')); // true
  console.log('Is integer (3.14):', FormValidator.isInteger('3.14')); // false
}

// =============================================================================
// Example HTML Template
// =============================================================================

/**
 * Example HTML structure for the registration form.
 *
 * ```html
 * <form id="registration-form" novalidate>
 *   <div class="form-group">
 *     <label for="username">Username</label>
 *     <input type="text" id="username" name="username" required>
 *     <span id="username-error" class="error hidden"></span>
 *   </div>
 *
 *   <div class="form-group">
 *     <label for="email">Email</label>
 *     <input type="email" id="email" name="email" required>
 *     <span id="email-error" class="error hidden"></span>
 *   </div>
 *
 *   <div class="form-group">
 *     <label for="password">Password</label>
 *     <input type="password" id="password" name="password" required>
 *     <span id="password-error" class="error hidden"></span>
 *     <span id="password-strength" class="strength-indicator"></span>
 *   </div>
 *
 *   <div class="form-group">
 *     <label for="confirmPassword">Confirm Password</label>
 *     <input type="password" id="confirmPassword" name="confirmPassword" required>
 *     <span id="confirmPassword-error" class="error hidden"></span>
 *   </div>
 *
 *   <div class="form-group">
 *     <label for="age">Age</label>
 *     <input type="number" id="age" name="age" required>
 *     <span id="age-error" class="error hidden"></span>
 *   </div>
 *
 *   <div class="form-group">
 *     <label for="website">Website (optional)</label>
 *     <input type="url" id="website" name="website">
 *     <span id="website-error" class="error hidden"></span>
 *   </div>
 *
 *   <div id="form-error" class="form-error hidden"></div>
 *
 *   <button type="submit">Register</button>
 * </form>
 * ```
 *
 * CSS for validation states:
 *
 * ```css
 * .is-valid { border-color: green; }
 * .is-invalid { border-color: red; }
 * .error { color: red; font-size: 0.875rem; }
 * .hidden { display: none; }
 * .strength-weak { color: red; }
 * .strength-medium { color: orange; }
 * .strength-strong { color: green; }
 * ```
 */

// =============================================================================
// Run Examples
// =============================================================================

/**
 * Initialize all form validations.
 */
export function initForms(): { cleanup: () => void } {
  const cleanups: CleanupFn[] = [];

  const registrationCleanup = initRegistrationForm();
  if (registrationCleanup !== null) {
    cleanups.push(registrationCleanup);
  }

  const contactCleanup = initContactForm();
  if (contactCleanup !== null) {
    cleanups.push(contactCleanup);
  }

  return {
    cleanup: (): void => {
      for (const fn of cleanups) {
        fn();
      }
    },
  };
}

/**
 * Run demonstration of static validators.
 */
export function runValidatorDemo(): void {
  staticValidatorsExample();
}

// Uncomment to run on page load
// document.addEventListener('DOMContentLoaded', () => initForms());
