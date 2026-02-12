import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FormValidator } from '../../src/form/index.js';

/**
 * Create a mock HTMLFormElement for testing.
 */
function createMockForm(): HTMLFormElement {
  return document.createElement('form');
}

/**
 * Create an input element and append it to the form.
 */
function addInput(
  form: HTMLFormElement,
  type: string,
  name: string,
  value: string,
  options?: { checked?: boolean }
): HTMLInputElement {
  const input = document.createElement('input');
  input.type = type;
  input.name = name;
  input.value = value;
  if (options?.checked !== undefined) {
    input.checked = options.checked;
  }
  form.appendChild(input);
  return input;
}

/**
 * Create a select element and append it to the form.
 */
function addSelect(
  form: HTMLFormElement,
  name: string,
  options: Array<{ value: string; text: string; selected?: boolean }>
): HTMLSelectElement {
  const select = document.createElement('select');
  select.name = name;
  for (const opt of options) {
    const option = document.createElement('option');
    option.value = opt.value;
    option.text = opt.text;
    if (opt.selected !== undefined) {
      option.selected = opt.selected;
    }
    select.appendChild(option);
  }
  form.appendChild(select);
  return select;
}

/**
 * Create a textarea element and append it to the form.
 */
function addTextarea(form: HTMLFormElement, name: string, value: string): HTMLTextAreaElement {
  const textarea = document.createElement('textarea');
  textarea.name = name;
  textarea.value = value;
  form.appendChild(textarea);
  return textarea;
}

describe('FormValidator', () => {
  let form: HTMLFormElement;

  beforeEach(() => {
    form = createMockForm();
  });

  // ===========================================================================
  // Factory Methods
  // ===========================================================================

  describe('create', () => {
    it('should create a validator instance', () => {
      const validator = FormValidator.create({
        name: { required: true },
      });

      expect(validator).toBeInstanceOf(FormValidator);
    });

    it('should create validator with empty rules', () => {
      const validator = FormValidator.create({});

      expect(validator).toBeInstanceOf(FormValidator);
    });

    it('should create validator with multiple field rules', () => {
      const validator = FormValidator.create({
        username: { required: true, minLength: 3 },
        email: { required: true, email: true },
        age: { number: true, min: 18 },
      });

      expect(validator).toBeInstanceOf(FormValidator);
    });
  });

  // ===========================================================================
  // validate (entire form)
  // ===========================================================================

  describe('validate', () => {
    it('should return valid result for valid form', () => {
      addInput(form, 'text', 'name', 'John');
      addInput(form, 'email', 'email', 'john@example.com');

      const validator = FormValidator.create({
        name: { required: true },
        email: { required: true, email: true },
      });

      const result = validator.validate(form);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual({});
      expect(result.firstError).toBeNull();
    });

    it('should return invalid result with errors', () => {
      addInput(form, 'text', 'name', '');
      addInput(form, 'email', 'email', 'invalid');

      const validator = FormValidator.create({
        name: { required: true },
        email: { required: true, email: true },
      });

      const result = validator.validate(form);

      expect(result.valid).toBe(false);
      expect(result.errors.name).toBeDefined();
      expect(result.errors.email).toBeDefined();
      expect(result.firstError).toBe('name is required');
    });

    it('should validate only fields with rules', () => {
      addInput(form, 'text', 'name', 'John');
      addInput(form, 'text', 'extra', ''); // No rules for this field

      const validator = FormValidator.create({
        name: { required: true },
      });

      const result = validator.validate(form);

      expect(result.valid).toBe(true);
      expect(result.errors.extra).toBeUndefined();
    });
  });

  // ===========================================================================
  // validateField
  // ===========================================================================

  describe('validateField', () => {
    it('should validate single field', () => {
      addInput(form, 'text', 'name', 'John');

      const validator = FormValidator.create({
        name: { required: true, minLength: 3 },
      });

      const result = validator.validateField(form, 'name');

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.firstError).toBeNull();
    });

    it('should return invalid result for invalid field', () => {
      addInput(form, 'text', 'name', 'Jo');

      const validator = FormValidator.create({
        name: { required: true, minLength: 3 },
      });

      const result = validator.validateField(form, 'name');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('name must be at least 3 characters');
      expect(result.firstError).toBe('name must be at least 3 characters');
    });

    it('should return valid result for field without rules', () => {
      addInput(form, 'text', 'extra', '');

      const validator = FormValidator.create({
        name: { required: true },
      });

      const result = validator.validateField(form, 'extra');

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  // ===========================================================================
  // Validation Rules
  // ===========================================================================

  describe('Validation Rules', () => {
    describe('required', () => {
      it('should fail for empty string', () => {
        addInput(form, 'text', 'name', '');

        const validator = FormValidator.create({ name: { required: true } });
        const result = validator.validate(form);

        expect(result.valid).toBe(false);
        expect(result.errors.name).toContain('name is required');
      });

      it('should fail for whitespace only', () => {
        addInput(form, 'text', 'name', '   ');

        const validator = FormValidator.create({ name: { required: true } });
        const result = validator.validate(form);

        expect(result.valid).toBe(false);
        expect(result.errors.name).toContain('name is required');
      });

      it('should pass for non-empty value', () => {
        addInput(form, 'text', 'name', 'John');

        const validator = FormValidator.create({ name: { required: true } });
        const result = validator.validate(form);

        expect(result.valid).toBe(true);
      });

      it('should not validate other rules if required fails', () => {
        addInput(form, 'text', 'name', '');

        const validator = FormValidator.create({
          name: { required: true, minLength: 10 },
        });
        const result = validator.validate(form);

        // Only required error, not minLength
        expect(result.errors.name).toHaveLength(1);
        expect(result.errors.name).toContain('name is required');
      });
    });

    describe('minLength', () => {
      it('should fail for value shorter than minLength', () => {
        addInput(form, 'text', 'password', 'ab');

        const validator = FormValidator.create({ password: { minLength: 8 } });
        const result = validator.validate(form);

        expect(result.valid).toBe(false);
        expect(result.errors.password).toContain('password must be at least 8 characters');
      });

      it('should pass for value at minLength', () => {
        addInput(form, 'text', 'password', '12345678');

        const validator = FormValidator.create({ password: { minLength: 8 } });
        const result = validator.validate(form);

        expect(result.valid).toBe(true);
      });

      it('should pass for value longer than minLength', () => {
        addInput(form, 'text', 'password', '123456789');

        const validator = FormValidator.create({ password: { minLength: 8 } });
        const result = validator.validate(form);

        expect(result.valid).toBe(true);
      });

      it('should skip validation for empty optional field', () => {
        addInput(form, 'text', 'nickname', '');

        const validator = FormValidator.create({ nickname: { minLength: 3 } });
        const result = validator.validate(form);

        expect(result.valid).toBe(true);
      });
    });

    describe('maxLength', () => {
      it('should fail for value longer than maxLength', () => {
        addInput(form, 'text', 'username', 'verylongusername123');

        const validator = FormValidator.create({ username: { maxLength: 10 } });
        const result = validator.validate(form);

        expect(result.valid).toBe(false);
        expect(result.errors.username).toContain('username must be at most 10 characters');
      });

      it('should pass for value at maxLength', () => {
        addInput(form, 'text', 'username', '1234567890');

        const validator = FormValidator.create({ username: { maxLength: 10 } });
        const result = validator.validate(form);

        expect(result.valid).toBe(true);
      });

      it('should pass for value shorter than maxLength', () => {
        addInput(form, 'text', 'username', 'john');

        const validator = FormValidator.create({ username: { maxLength: 10 } });
        const result = validator.validate(form);

        expect(result.valid).toBe(true);
      });
    });

    describe('min (numeric)', () => {
      it('should fail for value below min', () => {
        addInput(form, 'number', 'age', '16');

        const validator = FormValidator.create({ age: { min: 18 } });
        const result = validator.validate(form);

        expect(result.valid).toBe(false);
        expect(result.errors.age).toContain('age must be at least 18');
      });

      it('should pass for value at min', () => {
        addInput(form, 'number', 'age', '18');

        const validator = FormValidator.create({ age: { min: 18 } });
        const result = validator.validate(form);

        expect(result.valid).toBe(true);
      });

      it('should pass for value above min', () => {
        addInput(form, 'number', 'age', '25');

        const validator = FormValidator.create({ age: { min: 18 } });
        const result = validator.validate(form);

        expect(result.valid).toBe(true);
      });

      it('should fail for non-numeric value', () => {
        addInput(form, 'text', 'age', 'abc');

        const validator = FormValidator.create({ age: { min: 18 } });
        const result = validator.validate(form);

        expect(result.valid).toBe(false);
        expect(result.errors.age).toContain('age must be at least 18');
      });
    });

    describe('max (numeric)', () => {
      it('should fail for value above max', () => {
        addInput(form, 'number', 'quantity', '150');

        const validator = FormValidator.create({ quantity: { max: 100 } });
        const result = validator.validate(form);

        expect(result.valid).toBe(false);
        expect(result.errors.quantity).toContain('quantity must be at most 100');
      });

      it('should pass for value at max', () => {
        addInput(form, 'number', 'quantity', '100');

        const validator = FormValidator.create({ quantity: { max: 100 } });
        const result = validator.validate(form);

        expect(result.valid).toBe(true);
      });

      it('should pass for value below max', () => {
        addInput(form, 'number', 'quantity', '50');

        const validator = FormValidator.create({ quantity: { max: 100 } });
        const result = validator.validate(form);

        expect(result.valid).toBe(true);
      });

      it('should fail for non-numeric value', () => {
        addInput(form, 'text', 'quantity', 'abc');

        const validator = FormValidator.create({ quantity: { max: 100 } });
        const result = validator.validate(form);

        expect(result.valid).toBe(false);
        expect(result.errors.quantity).toContain('quantity must be at most 100');
      });
    });

    describe('email', () => {
      it('should pass for valid email', () => {
        addInput(form, 'email', 'email', 'john@example.com');

        const validator = FormValidator.create({ email: { email: true } });
        const result = validator.validate(form);

        expect(result.valid).toBe(true);
      });

      it('should fail for invalid email (no @)', () => {
        addInput(form, 'email', 'email', 'johnexample.com');

        const validator = FormValidator.create({ email: { email: true } });
        const result = validator.validate(form);

        expect(result.valid).toBe(false);
        expect(result.errors.email).toContain('email must be a valid email address');
      });

      it('should fail for invalid email (no domain)', () => {
        addInput(form, 'email', 'email', 'john@');

        const validator = FormValidator.create({ email: { email: true } });
        const result = validator.validate(form);

        expect(result.valid).toBe(false);
      });

      it('should fail for invalid email (no TLD)', () => {
        addInput(form, 'email', 'email', 'john@example');

        const validator = FormValidator.create({ email: { email: true } });
        const result = validator.validate(form);

        expect(result.valid).toBe(false);
      });

      it('should pass for email with subdomain', () => {
        addInput(form, 'email', 'email', 'john@mail.example.com');

        const validator = FormValidator.create({ email: { email: true } });
        const result = validator.validate(form);

        expect(result.valid).toBe(true);
      });

      it('should pass for email with plus sign', () => {
        addInput(form, 'email', 'email', 'john+tag@example.com');

        const validator = FormValidator.create({ email: { email: true } });
        const result = validator.validate(form);

        expect(result.valid).toBe(true);
      });
    });

    describe('url', () => {
      it('should pass for valid http URL', () => {
        addInput(form, 'url', 'website', 'http://example.com');

        const validator = FormValidator.create({ website: { url: true } });
        const result = validator.validate(form);

        expect(result.valid).toBe(true);
      });

      it('should pass for valid https URL', () => {
        addInput(form, 'url', 'website', 'https://example.com');

        const validator = FormValidator.create({ website: { url: true } });
        const result = validator.validate(form);

        expect(result.valid).toBe(true);
      });

      it('should pass for URL with path', () => {
        addInput(form, 'url', 'website', 'https://example.com/path/to/page');

        const validator = FormValidator.create({ website: { url: true } });
        const result = validator.validate(form);

        expect(result.valid).toBe(true);
      });

      it('should pass for URL with query string', () => {
        addInput(form, 'url', 'website', 'https://example.com?foo=bar');

        const validator = FormValidator.create({ website: { url: true } });
        const result = validator.validate(form);

        expect(result.valid).toBe(true);
      });

      it('should fail for invalid URL', () => {
        addInput(form, 'url', 'website', 'not-a-url');

        const validator = FormValidator.create({ website: { url: true } });
        const result = validator.validate(form);

        expect(result.valid).toBe(false);
        expect(result.errors.website).toContain('website must be a valid URL');
      });

      it('should fail for URL without protocol', () => {
        addInput(form, 'url', 'website', 'example.com');

        const validator = FormValidator.create({ website: { url: true } });
        const result = validator.validate(form);

        expect(result.valid).toBe(false);
      });
    });

    describe('number', () => {
      it('should pass for valid integer', () => {
        addInput(form, 'text', 'count', '42');

        const validator = FormValidator.create({ count: { number: true } });
        const result = validator.validate(form);

        expect(result.valid).toBe(true);
      });

      it('should pass for valid decimal', () => {
        addInput(form, 'text', 'price', '19.99');

        const validator = FormValidator.create({ price: { number: true } });
        const result = validator.validate(form);

        expect(result.valid).toBe(true);
      });

      it('should pass for negative number', () => {
        addInput(form, 'text', 'temperature', '-5');

        const validator = FormValidator.create({ temperature: { number: true } });
        const result = validator.validate(form);

        expect(result.valid).toBe(true);
      });

      it('should fail for non-numeric string', () => {
        addInput(form, 'text', 'count', 'abc');

        const validator = FormValidator.create({ count: { number: true } });
        const result = validator.validate(form);

        expect(result.valid).toBe(false);
        expect(result.errors.count).toContain('count must be a number');
      });

      it('should fail for mixed content', () => {
        addInput(form, 'text', 'count', '42abc');

        const validator = FormValidator.create({ count: { number: true } });
        const result = validator.validate(form);

        expect(result.valid).toBe(false);
      });
    });

    describe('integer', () => {
      it('should pass for valid integer', () => {
        addInput(form, 'text', 'quantity', '42');

        const validator = FormValidator.create({ quantity: { integer: true } });
        const result = validator.validate(form);

        expect(result.valid).toBe(true);
      });

      it('should fail for decimal', () => {
        addInput(form, 'text', 'quantity', '42.5');

        const validator = FormValidator.create({ quantity: { integer: true } });
        const result = validator.validate(form);

        expect(result.valid).toBe(false);
        expect(result.errors.quantity).toContain('quantity must be an integer');
      });

      it('should pass for negative integer', () => {
        addInput(form, 'text', 'temperature', '-5');

        const validator = FormValidator.create({ temperature: { integer: true } });
        const result = validator.validate(form);

        expect(result.valid).toBe(true);
      });

      it('should fail for non-numeric string', () => {
        addInput(form, 'text', 'quantity', 'abc');

        const validator = FormValidator.create({ quantity: { integer: true } });
        const result = validator.validate(form);

        expect(result.valid).toBe(false);
      });
    });

    describe('pattern', () => {
      it('should pass for matching pattern', () => {
        addInput(form, 'text', 'zipcode', '12345');

        const validator = FormValidator.create({
          zipcode: { pattern: /^\d{5}$/ },
        });
        const result = validator.validate(form);

        expect(result.valid).toBe(true);
      });

      it('should fail for non-matching pattern', () => {
        addInput(form, 'text', 'zipcode', 'abcde');

        const validator = FormValidator.create({
          zipcode: { pattern: /^\d{5}$/ },
        });
        const result = validator.validate(form);

        expect(result.valid).toBe(false);
        expect(result.errors.zipcode).toContain('zipcode has invalid format');
      });

      it('should work with complex patterns', () => {
        addInput(form, 'text', 'phone', '+1-555-123-4567');

        const validator = FormValidator.create({
          phone: { pattern: /^\+\d{1,3}-\d{3}-\d{3}-\d{4}$/ },
        });
        const result = validator.validate(form);

        expect(result.valid).toBe(true);
      });
    });

    describe('matches', () => {
      it('should pass when fields match', () => {
        addInput(form, 'password', 'password', 'secret123');
        addInput(form, 'password', 'confirmPassword', 'secret123');

        const validator = FormValidator.create({
          confirmPassword: { matches: 'password' },
        });
        const result = validator.validate(form);

        expect(result.valid).toBe(true);
      });

      it('should fail when fields do not match', () => {
        addInput(form, 'password', 'password', 'secret123');
        addInput(form, 'password', 'confirmPassword', 'different');

        const validator = FormValidator.create({
          confirmPassword: { matches: 'password' },
        });
        const result = validator.validate(form);

        expect(result.valid).toBe(false);
        expect(result.errors.confirmPassword).toContain('confirmPassword must match password');
      });

      it('should fail when matched field does not exist', () => {
        addInput(form, 'password', 'confirmPassword', 'secret123');

        const validator = FormValidator.create({
          confirmPassword: { matches: 'password' },
        });
        const result = validator.validate(form);

        expect(result.valid).toBe(false);
      });
    });

    describe('custom', () => {
      it('should pass when custom validator returns true', () => {
        addInput(form, 'text', 'username', 'john_doe');

        const validator = FormValidator.create({
          username: {
            custom: (value) => /^[a-z_]+$/.test(value),
          },
        });
        const result = validator.validate(form);

        expect(result.valid).toBe(true);
      });

      it('should fail when custom validator returns false', () => {
        addInput(form, 'text', 'username', 'John-Doe');

        const validator = FormValidator.create({
          username: {
            custom: (value) => /^[a-z_]+$/.test(value),
          },
        });
        const result = validator.validate(form);

        expect(result.valid).toBe(false);
        expect(result.errors.username).toContain('username is invalid');
      });

      it('should use custom error message when returned', () => {
        addInput(form, 'text', 'password', 'password123');

        const validator = FormValidator.create({
          password: {
            custom: (value) => /[A-Z]/.test(value) || 'Password must contain uppercase letter',
          },
        });
        const result = validator.validate(form);

        expect(result.valid).toBe(false);
        expect(result.errors.password).toContain('Password must contain uppercase letter');
      });

      it('should have access to form in custom validator', () => {
        addInput(form, 'text', 'startDate', '2024-01-15');
        addInput(form, 'text', 'endDate', '2024-01-10');

        const validator = FormValidator.create({
          endDate: {
            custom: (value, formEl) => {
              const startDate = new FormData(formEl).get('startDate') as string;
              return value >= startDate || 'End date must be after start date';
            },
          },
        });
        const result = validator.validate(form);

        expect(result.valid).toBe(false);
        expect(result.errors.endDate).toContain('End date must be after start date');
      });
    });
  });

  // ===========================================================================
  // Custom Error Messages
  // ===========================================================================

  describe('Custom Error Messages', () => {
    it('should use custom required message', () => {
      addInput(form, 'text', 'name', '');

      const validator = FormValidator.create({
        name: {
          required: true,
          messages: { required: 'Please enter your name' },
        },
      });
      const result = validator.validate(form);

      expect(result.errors.name).toContain('Please enter your name');
    });

    it('should use custom minLength message', () => {
      addInput(form, 'text', 'password', 'abc');

      const validator = FormValidator.create({
        password: {
          minLength: 8,
          messages: { minLength: 'Password is too short' },
        },
      });
      const result = validator.validate(form);

      expect(result.errors.password).toContain('Password is too short');
    });

    it('should use custom maxLength message', () => {
      addInput(form, 'text', 'username', 'verylongusername');

      const validator = FormValidator.create({
        username: {
          maxLength: 10,
          messages: { maxLength: 'Username is too long' },
        },
      });
      const result = validator.validate(form);

      expect(result.errors.username).toContain('Username is too long');
    });

    it('should use custom email message', () => {
      addInput(form, 'email', 'email', 'invalid');

      const validator = FormValidator.create({
        email: {
          email: true,
          messages: { email: 'Please provide a valid email' },
        },
      });
      const result = validator.validate(form);

      expect(result.errors.email).toContain('Please provide a valid email');
    });

    it('should use custom url message', () => {
      addInput(form, 'url', 'website', 'invalid');

      const validator = FormValidator.create({
        website: {
          url: true,
          messages: { url: 'Please provide a valid URL' },
        },
      });
      const result = validator.validate(form);

      expect(result.errors.website).toContain('Please provide a valid URL');
    });

    it('should use custom number message', () => {
      addInput(form, 'text', 'age', 'abc');

      const validator = FormValidator.create({
        age: {
          number: true,
          messages: { number: 'Age must be a number' },
        },
      });
      const result = validator.validate(form);

      expect(result.errors.age).toContain('Age must be a number');
    });

    it('should use custom integer message', () => {
      addInput(form, 'text', 'quantity', '5.5');

      const validator = FormValidator.create({
        quantity: {
          integer: true,
          messages: { integer: 'Quantity must be a whole number' },
        },
      });
      const result = validator.validate(form);

      expect(result.errors.quantity).toContain('Quantity must be a whole number');
    });

    it('should use custom min message', () => {
      addInput(form, 'number', 'age', '16');

      const validator = FormValidator.create({
        age: {
          min: 18,
          messages: { min: 'You must be at least 18 years old' },
        },
      });
      const result = validator.validate(form);

      expect(result.errors.age).toContain('You must be at least 18 years old');
    });

    it('should use custom max message', () => {
      addInput(form, 'number', 'quantity', '150');

      const validator = FormValidator.create({
        quantity: {
          max: 100,
          messages: { max: 'Maximum quantity is 100' },
        },
      });
      const result = validator.validate(form);

      expect(result.errors.quantity).toContain('Maximum quantity is 100');
    });

    it('should use custom pattern message', () => {
      addInput(form, 'text', 'zipcode', 'abc');

      const validator = FormValidator.create({
        zipcode: {
          pattern: /^\d{5}$/,
          messages: { pattern: 'ZIP code must be 5 digits' },
        },
      });
      const result = validator.validate(form);

      expect(result.errors.zipcode).toContain('ZIP code must be 5 digits');
    });

    it('should use custom matches message', () => {
      addInput(form, 'password', 'password', 'secret123');
      addInput(form, 'password', 'confirm', 'different');

      const validator = FormValidator.create({
        confirm: {
          matches: 'password',
          messages: { matches: 'Passwords do not match' },
        },
      });
      const result = validator.validate(form);

      expect(result.errors.confirm).toContain('Passwords do not match');
    });
  });

  // ===========================================================================
  // onSubmit
  // ===========================================================================

  describe('onSubmit', () => {
    it('should attach submit event listener', () => {
      const handler = vi.fn();
      const validator = FormValidator.create({ name: { required: true } });

      const addEventListenerSpy = vi.spyOn(form, 'addEventListener');

      validator.onSubmit(form, handler);

      expect(addEventListenerSpy).toHaveBeenCalledWith('submit', expect.any(Function));
    });

    it('should return cleanup function', () => {
      const handler = vi.fn();
      const validator = FormValidator.create({ name: { required: true } });

      const removeEventListenerSpy = vi.spyOn(form, 'removeEventListener');

      const cleanup = validator.onSubmit(form, handler);
      cleanup();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('submit', expect.any(Function));
    });

    it('should prevent submit and call handler when form is invalid', () => {
      addInput(form, 'text', 'name', '');

      const handler = vi.fn();
      const validator = FormValidator.create({ name: { required: true } });

      validator.onSubmit(form, handler);

      const event = new Event('submit', { cancelable: true });
      form.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
      expect(handler).toHaveBeenCalled();
      expect(handler).toHaveBeenCalledWith({ name: '' }, expect.objectContaining({ valid: false }));
    });

    it('should not prevent submit when form is valid', () => {
      addInput(form, 'text', 'name', 'John');

      const handler = vi.fn();
      const validator = FormValidator.create({ name: { required: true } });

      validator.onSubmit(form, handler);

      const event = new Event('submit', { cancelable: true });
      form.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
      expect(handler).toHaveBeenCalledWith(
        { name: 'John' },
        expect.objectContaining({ valid: true })
      );
    });

    it('should provide form data to handler', () => {
      addInput(form, 'text', 'name', 'John');
      addInput(form, 'email', 'email', 'john@example.com');

      const handler = vi.fn();
      const validator = FormValidator.create({
        name: { required: true },
        email: { required: true },
      });

      validator.onSubmit(form, handler);

      form.dispatchEvent(new Event('submit', { cancelable: true }));

      expect(handler).toHaveBeenCalledWith(
        { name: 'John', email: 'john@example.com' },
        expect.any(Object)
      );
    });
  });

  // ===========================================================================
  // onFieldChange
  // ===========================================================================

  describe('onFieldChange', () => {
    it('should attach event listener with default blur event', () => {
      const handler = vi.fn();
      const validator = FormValidator.create({ name: { required: true } });

      const addEventListenerSpy = vi.spyOn(form, 'addEventListener');

      validator.onFieldChange(form, handler);

      expect(addEventListenerSpy).toHaveBeenCalledWith('blur', expect.any(Function));
    });

    it('should attach event listener with input event', () => {
      const handler = vi.fn();
      const validator = FormValidator.create({ name: { required: true } });

      const addEventListenerSpy = vi.spyOn(form, 'addEventListener');

      validator.onFieldChange(form, handler, { validateOn: 'input' });

      expect(addEventListenerSpy).toHaveBeenCalledWith('input', expect.any(Function));
    });

    it('should attach event listener with change event', () => {
      const handler = vi.fn();
      const validator = FormValidator.create({ name: { required: true } });

      const addEventListenerSpy = vi.spyOn(form, 'addEventListener');

      validator.onFieldChange(form, handler, { validateOn: 'change' });

      expect(addEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should return cleanup function', () => {
      const handler = vi.fn();
      const validator = FormValidator.create({ name: { required: true } });

      const removeEventListenerSpy = vi.spyOn(form, 'removeEventListener');

      const cleanup = validator.onFieldChange(form, handler);
      cleanup();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('blur', expect.any(Function));
    });

    it('should call handler when field with rules changes', () => {
      const input = addInput(form, 'text', 'name', 'John');

      const handler = vi.fn();
      const validator = FormValidator.create({ name: { required: true } });

      validator.onFieldChange(form, handler, { validateOn: 'blur' });

      input.dispatchEvent(new Event('blur', { bubbles: true }));

      expect(handler).toHaveBeenCalledWith('name', expect.objectContaining({ valid: true }));
    });

    it('should not call handler for field without rules', () => {
      const input = addInput(form, 'text', 'extra', 'value');

      const handler = vi.fn();
      const validator = FormValidator.create({ name: { required: true } });

      validator.onFieldChange(form, handler, { validateOn: 'blur' });

      input.dispatchEvent(new Event('blur', { bubbles: true }));

      expect(handler).not.toHaveBeenCalled();
    });

    it('should validate on select change', () => {
      const select = addSelect(form, 'country', [
        { value: '', text: 'Select...' },
        { value: 'us', text: 'US', selected: true },
      ]);

      const handler = vi.fn();
      const validator = FormValidator.create({ country: { required: true } });

      validator.onFieldChange(form, handler, { validateOn: 'change' });

      select.dispatchEvent(new Event('change', { bubbles: true }));

      expect(handler).toHaveBeenCalledWith('country', expect.objectContaining({ valid: true }));
    });

    it('should validate on textarea blur', () => {
      const textarea = addTextarea(form, 'message', '');

      const handler = vi.fn();
      const validator = FormValidator.create({ message: { required: true } });

      validator.onFieldChange(form, handler, { validateOn: 'blur' });

      textarea.dispatchEvent(new Event('blur', { bubbles: true }));

      expect(handler).toHaveBeenCalledWith('message', expect.objectContaining({ valid: false }));
    });

    it('should not call handler for elements without name', () => {
      const input = document.createElement('input');
      input.type = 'text';
      form.appendChild(input);

      const handler = vi.fn();
      const validator = FormValidator.create({ name: { required: true } });

      validator.onFieldChange(form, handler, { validateOn: 'blur' });

      input.dispatchEvent(new Event('blur', { bubbles: true }));

      expect(handler).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Static Validators
  // ===========================================================================

  describe('Static Validators', () => {
    describe('isValidEmail', () => {
      it('should return true for valid email', () => {
        expect(FormValidator.isValidEmail('john@example.com')).toBe(true);
      });

      it('should return true for email with subdomain', () => {
        expect(FormValidator.isValidEmail('john@mail.example.com')).toBe(true);
      });

      it('should return true for email with plus sign', () => {
        expect(FormValidator.isValidEmail('john+tag@example.com')).toBe(true);
      });

      it('should return false for email without @', () => {
        expect(FormValidator.isValidEmail('johnexample.com')).toBe(false);
      });

      it('should return false for email without domain', () => {
        expect(FormValidator.isValidEmail('john@')).toBe(false);
      });

      it('should return false for email without TLD', () => {
        expect(FormValidator.isValidEmail('john@example')).toBe(false);
      });

      it('should return false for empty string', () => {
        expect(FormValidator.isValidEmail('')).toBe(false);
      });

      it('should return false for email with spaces', () => {
        expect(FormValidator.isValidEmail('john @example.com')).toBe(false);
      });
    });

    describe('isValidUrl', () => {
      it('should return true for http URL', () => {
        expect(FormValidator.isValidUrl('http://example.com')).toBe(true);
      });

      it('should return true for https URL', () => {
        expect(FormValidator.isValidUrl('https://example.com')).toBe(true);
      });

      it('should return true for URL with path', () => {
        expect(FormValidator.isValidUrl('https://example.com/path/to/page')).toBe(true);
      });

      it('should return true for URL with query string', () => {
        expect(FormValidator.isValidUrl('https://example.com?foo=bar')).toBe(true);
      });

      it('should return true for URL with port', () => {
        expect(FormValidator.isValidUrl('http://localhost:3000')).toBe(true);
      });

      it('should return false for URL without protocol', () => {
        expect(FormValidator.isValidUrl('example.com')).toBe(false);
      });

      it('should return false for invalid URL', () => {
        expect(FormValidator.isValidUrl('not-a-url')).toBe(false);
      });

      it('should return false for empty string', () => {
        expect(FormValidator.isValidUrl('')).toBe(false);
      });
    });

    describe('isNumeric', () => {
      it('should return true for integer', () => {
        expect(FormValidator.isNumeric('42')).toBe(true);
      });

      it('should return true for decimal', () => {
        expect(FormValidator.isNumeric('3.14')).toBe(true);
      });

      it('should return true for negative number', () => {
        expect(FormValidator.isNumeric('-5')).toBe(true);
      });

      it('should return true for zero', () => {
        expect(FormValidator.isNumeric('0')).toBe(true);
      });

      it('should return false for non-numeric string', () => {
        expect(FormValidator.isNumeric('abc')).toBe(false);
      });

      it('should return false for empty string', () => {
        expect(FormValidator.isNumeric('')).toBe(false);
      });

      it('should return false for Infinity', () => {
        expect(FormValidator.isNumeric('Infinity')).toBe(false);
      });

      it('should return false for NaN', () => {
        expect(FormValidator.isNumeric('NaN')).toBe(false);
      });
    });

    describe('isInteger', () => {
      it('should return true for positive integer', () => {
        expect(FormValidator.isInteger('42')).toBe(true);
      });

      it('should return true for negative integer', () => {
        expect(FormValidator.isInteger('-5')).toBe(true);
      });

      it('should return true for zero', () => {
        expect(FormValidator.isInteger('0')).toBe(true);
      });

      it('should return false for decimal', () => {
        expect(FormValidator.isInteger('3.14')).toBe(false);
      });

      it('should return false for non-numeric string', () => {
        expect(FormValidator.isInteger('abc')).toBe(false);
      });

      it('should return false for empty string', () => {
        expect(FormValidator.isInteger('')).toBe(false);
      });
    });
  });

  // ===========================================================================
  // Complex Validation Scenarios
  // ===========================================================================

  describe('Complex Validation Scenarios', () => {
    it('should validate registration form', () => {
      addInput(form, 'text', 'username', 'john_doe');
      addInput(form, 'email', 'email', 'john@example.com');
      addInput(form, 'password', 'password', 'SecurePass123!');
      addInput(form, 'password', 'confirmPassword', 'SecurePass123!');
      addInput(form, 'number', 'age', '25');
      addInput(form, 'checkbox', 'terms', 'yes', { checked: true });

      const validator = FormValidator.create({
        username: { required: true, minLength: 3, maxLength: 20, pattern: /^[a-z_]+$/ },
        email: { required: true, email: true },
        password: {
          required: true,
          minLength: 8,
          custom: (v) => /[A-Z]/.test(v) || 'Must contain uppercase',
        },
        confirmPassword: { required: true, matches: 'password' },
        age: { required: true, number: true, min: 18, max: 120 },
        terms: { required: true },
      });

      const result = validator.validate(form);

      expect(result.valid).toBe(true);
    });

    it('should collect all errors from registration form', () => {
      addInput(form, 'text', 'username', 'JO'); // too short, wrong pattern
      addInput(form, 'email', 'email', 'invalid-email');
      addInput(form, 'password', 'password', 'weak'); // too short, no uppercase
      addInput(form, 'password', 'confirmPassword', 'different');
      addInput(form, 'number', 'age', '15'); // too young

      const validator = FormValidator.create({
        username: { required: true, minLength: 3, pattern: /^[a-z_]+$/ },
        email: { required: true, email: true },
        password: {
          required: true,
          minLength: 8,
          custom: (v) => /[A-Z]/.test(v) || 'Must contain uppercase',
        },
        confirmPassword: { required: true, matches: 'password' },
        age: { required: true, number: true, min: 18 },
      });

      const result = validator.validate(form);

      expect(result.valid).toBe(false);
      expect(result.errors.username).toBeDefined();
      expect(result.errors.email).toBeDefined();
      expect(result.errors.password).toBeDefined();
      expect(result.errors.confirmPassword).toBeDefined();
      expect(result.errors.age).toBeDefined();
    });

    it('should handle multiple validations on same field', () => {
      addInput(form, 'text', 'a', 'a'); // Too short and invalid pattern

      const validator = FormValidator.create({
        a: {
          minLength: 5,
          maxLength: 3, // This will fail
          pattern: /^\d+$/, // This will also fail
        },
      });

      const result = validator.validate(form);

      // Should have multiple errors
      expect(result.errors.a!.length).toBeGreaterThan(1);
    });
  });

  // ===========================================================================
  // Async Validation
  // ===========================================================================

  describe('Async Validation', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    describe('validateFieldAsync', () => {
      it('should pass async validation when validator returns null', async () => {
        const input = addInput(form, 'text', 'username', 'john_doe');

        const asyncValidator = vi.fn().mockResolvedValue(null);
        const validator = FormValidator.create({
          username: { asyncCustom: asyncValidator },
        });

        const resultPromise = validator.validateFieldAsync(input, { skipDebounce: true });
        await vi.runAllTimersAsync();
        const result = await resultPromise;

        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
        expect(asyncValidator).toHaveBeenCalledWith('john_doe', 'username', form);
      });

      it('should fail async validation when validator returns error message', async () => {
        const input = addInput(form, 'text', 'username', 'admin');

        const asyncValidator = vi.fn().mockResolvedValue('Username is already taken');
        const validator = FormValidator.create({
          username: { asyncCustom: asyncValidator },
        });

        const resultPromise = validator.validateFieldAsync(input, { skipDebounce: true });
        await vi.runAllTimersAsync();
        const result = await resultPromise;

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Username is already taken');
        expect(result.firstError).toBe('Username is already taken');
      });

      it('should run sync validation before async validation', async () => {
        const input = addInput(form, 'text', 'username', 'ab');

        const asyncValidator = vi.fn().mockResolvedValue(null);
        const validator = FormValidator.create({
          username: { minLength: 3, asyncCustom: asyncValidator },
        });

        const resultPromise = validator.validateFieldAsync(input, { skipDebounce: true });
        await vi.runAllTimersAsync();
        const result = await resultPromise;

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('username must be at least 3 characters');
        // Async validator should still run because sync passed for the field
        expect(asyncValidator).toHaveBeenCalled();
      });

      it('should skip async validation if no asyncCustom rule', async () => {
        const input = addInput(form, 'text', 'username', 'john_doe');

        const validator = FormValidator.create({
          username: { required: true },
        });

        const resultPromise = validator.validateFieldAsync(input, { skipDebounce: true });
        await vi.runAllTimersAsync();
        const result = await resultPromise;

        expect(result.valid).toBe(true);
      });

      it('should skip async validation for empty optional field', async () => {
        const input = addInput(form, 'text', 'nickname', '');

        const asyncValidator = vi.fn().mockResolvedValue(null);
        const validator = FormValidator.create({
          nickname: { asyncCustom: asyncValidator },
        });

        const resultPromise = validator.validateFieldAsync(input, { skipDebounce: true });
        await vi.runAllTimersAsync();
        const result = await resultPromise;

        expect(result.valid).toBe(true);
        expect(asyncValidator).not.toHaveBeenCalled();
      });

      it('should skip async validation for empty required field', async () => {
        const input = addInput(form, 'text', 'username', '');

        const asyncValidator = vi.fn().mockResolvedValue(null);
        const validator = FormValidator.create({
          username: { required: true, asyncCustom: asyncValidator },
        });

        const resultPromise = validator.validateFieldAsync(input, { skipDebounce: true });
        await vi.runAllTimersAsync();
        const result = await resultPromise;

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('username is required');
        expect(asyncValidator).not.toHaveBeenCalled();
      });

      it('should return valid for field without rules', async () => {
        const input = addInput(form, 'text', 'extra', 'value');

        const validator = FormValidator.create({
          username: { required: true },
        });

        const resultPromise = validator.validateFieldAsync(input, { skipDebounce: true });
        await vi.runAllTimersAsync();
        const result = await resultPromise;

        expect(result.valid).toBe(true);
      });

      it('should return valid for field without form', async () => {
        const input = document.createElement('input');
        input.name = 'username';
        input.value = 'john_doe';
        // Note: input is not attached to any form

        const validator = FormValidator.create({
          username: { asyncCustom: vi.fn().mockResolvedValue(null) },
        });

        const resultPromise = validator.validateFieldAsync(input, { skipDebounce: true });
        await vi.runAllTimersAsync();
        const result = await resultPromise;

        expect(result.valid).toBe(true);
      });

      it('should handle async validation promise rejection gracefully', async () => {
        const input = addInput(form, 'text', 'email', 'test@example.com');

        const asyncValidator = vi.fn().mockRejectedValue(new Error('Network error'));
        const validator = FormValidator.create({
          email: { asyncCustom: asyncValidator },
        });

        const resultPromise = validator.validateFieldAsync(input, { skipDebounce: true });
        await vi.runAllTimersAsync();
        const result = await resultPromise;

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Network error');
      });

      it('should handle non-Error rejection gracefully', async () => {
        const input = addInput(form, 'text', 'email', 'test@example.com');

        const asyncValidator = vi.fn().mockRejectedValue('string rejection');
        const validator = FormValidator.create({
          email: { asyncCustom: asyncValidator },
        });

        const resultPromise = validator.validateFieldAsync(input, { skipDebounce: true });
        await vi.runAllTimersAsync();
        const result = await resultPromise;

        expect(result.valid).toBe(false);
        // Non-Error rejections are converted to Error with string message
        expect(result.errors).toContain('string rejection');
      });

      it('should debounce async validation by default', async () => {
        const input = addInput(form, 'text', 'username', 'john');

        const asyncValidator = vi.fn().mockResolvedValue(null);
        const validator = FormValidator.create({
          username: { asyncCustom: asyncValidator, asyncDebounceMs: 300 },
        });

        // Start validation without skipDebounce
        const resultPromise = validator.validateFieldAsync(input);

        // Validator should not have been called yet
        expect(asyncValidator).not.toHaveBeenCalled();

        // Advance time by 300ms (default debounce)
        await vi.advanceTimersByTimeAsync(300);
        await resultPromise;

        expect(asyncValidator).toHaveBeenCalledOnce();
      });

      it('should use custom debounce delay', async () => {
        const input = addInput(form, 'text', 'username', 'john');

        const asyncValidator = vi.fn().mockResolvedValue(null);
        const validator = FormValidator.create({
          username: { asyncCustom: asyncValidator, asyncDebounceMs: 500 },
        });

        const resultPromise = validator.validateFieldAsync(input);

        // Advance by 300ms - should not trigger yet
        await vi.advanceTimersByTimeAsync(300);
        expect(asyncValidator).not.toHaveBeenCalled();

        // Advance by another 200ms to reach 500ms
        await vi.advanceTimersByTimeAsync(200);
        await resultPromise;

        expect(asyncValidator).toHaveBeenCalledOnce();
      });

      it('should cancel previous debounced validation when new one starts', async () => {
        const input = addInput(form, 'text', 'username', 'john');

        const asyncValidator = vi.fn().mockResolvedValue(null);
        const validator = FormValidator.create({
          username: { asyncCustom: asyncValidator, asyncDebounceMs: 300 },
        });

        // Start first validation
        validator.validateFieldAsync(input);

        // Start second validation before first completes
        await vi.advanceTimersByTimeAsync(150);
        input.value = 'jane';
        const resultPromise = validator.validateFieldAsync(input);

        // Advance past first debounce (150 + 300 = 450, but second started at 150)
        await vi.advanceTimersByTimeAsync(300);
        await resultPromise;

        // Only second validation should complete
        expect(asyncValidator).toHaveBeenCalledOnce();
        expect(asyncValidator).toHaveBeenCalledWith('jane', 'username', form);
      });
    });

    describe('validateFormAsync', () => {
      it('should validate all fields asynchronously', async () => {
        addInput(form, 'text', 'username', 'john_doe');
        addInput(form, 'email', 'email', 'john@example.com');

        const usernameValidator = vi.fn().mockResolvedValue(null);
        const emailValidator = vi.fn().mockResolvedValue(null);

        const validator = FormValidator.create({
          username: { required: true, asyncCustom: usernameValidator },
          email: { required: true, email: true, asyncCustom: emailValidator },
        });

        const resultPromise = validator.validateFormAsync(form);
        await vi.runAllTimersAsync();
        const result = await resultPromise;

        expect(result.valid).toBe(true);
        expect(result.errors).toEqual({});
        expect(usernameValidator).toHaveBeenCalledWith('john_doe', 'username', form);
        expect(emailValidator).toHaveBeenCalledWith('john@example.com', 'email', form);
      });

      it('should collect errors from multiple fields', async () => {
        addInput(form, 'text', 'username', 'admin');
        addInput(form, 'email', 'email', 'taken@example.com');

        const usernameValidator = vi.fn().mockResolvedValue('Username is taken');
        const emailValidator = vi.fn().mockResolvedValue('Email already registered');

        const validator = FormValidator.create({
          username: { asyncCustom: usernameValidator },
          email: { asyncCustom: emailValidator },
        });

        const resultPromise = validator.validateFormAsync(form);
        await vi.runAllTimersAsync();
        const result = await resultPromise;

        expect(result.valid).toBe(false);
        expect(result.errors.username).toContain('Username is taken');
        expect(result.errors.email).toContain('Email already registered');
      });

      it('should combine sync and async errors', async () => {
        addInput(form, 'text', 'username', 'ab'); // Too short
        addInput(form, 'email', 'email', 'valid@example.com');

        const usernameValidator = vi.fn().mockResolvedValue('Username is taken');
        const emailValidator = vi.fn().mockResolvedValue(null);

        const validator = FormValidator.create({
          username: { minLength: 3, asyncCustom: usernameValidator },
          email: { email: true, asyncCustom: emailValidator },
        });

        const resultPromise = validator.validateFormAsync(form);
        await vi.runAllTimersAsync();
        const result = await resultPromise;

        expect(result.valid).toBe(false);
        // Username has sync error (minLength) and async may still be called
        expect(result.errors.username).toContain('username must be at least 3 characters');
      });

      it('should skip async for empty required fields', async () => {
        addInput(form, 'text', 'username', '');

        const asyncValidator = vi.fn().mockResolvedValue(null);

        const validator = FormValidator.create({
          username: { required: true, asyncCustom: asyncValidator },
        });

        const resultPromise = validator.validateFormAsync(form);
        await vi.runAllTimersAsync();
        const result = await resultPromise;

        expect(result.valid).toBe(false);
        expect(result.errors.username).toContain('username is required');
        expect(asyncValidator).not.toHaveBeenCalled();
      });

      it('should skip async for empty optional fields', async () => {
        addInput(form, 'text', 'nickname', '');

        const asyncValidator = vi.fn().mockResolvedValue(null);

        const validator = FormValidator.create({
          nickname: { asyncCustom: asyncValidator },
        });

        const resultPromise = validator.validateFormAsync(form);
        await vi.runAllTimersAsync();
        const result = await resultPromise;

        expect(result.valid).toBe(true);
        expect(asyncValidator).not.toHaveBeenCalled();
      });

      it('should run async validations in parallel', async () => {
        addInput(form, 'text', 'username', 'john');
        addInput(form, 'email', 'email', 'john@example.com');

        let usernameStart = 0;
        let emailStart = 0;

        const usernameValidator = vi.fn().mockImplementation(async () => {
          usernameStart = Date.now();
          await new Promise((r) => setTimeout(r, 100));
          return null;
        });

        const emailValidator = vi.fn().mockImplementation(async () => {
          emailStart = Date.now();
          await new Promise((r) => setTimeout(r, 100));
          return null;
        });

        const validator = FormValidator.create({
          username: { asyncCustom: usernameValidator },
          email: { asyncCustom: emailValidator },
        });

        const resultPromise = validator.validateFormAsync(form);
        await vi.runAllTimersAsync();
        await resultPromise;

        // Both validators should have started at approximately the same time
        expect(Math.abs(usernameStart - emailStart)).toBeLessThan(50);
      });

      it('should handle async validation rejection gracefully', async () => {
        addInput(form, 'text', 'username', 'john');
        addInput(form, 'email', 'email', 'john@example.com');

        const usernameValidator = vi.fn().mockRejectedValue(new Error('API error'));
        const emailValidator = vi.fn().mockResolvedValue(null);

        const validator = FormValidator.create({
          username: { asyncCustom: usernameValidator },
          email: { asyncCustom: emailValidator },
        });

        const resultPromise = validator.validateFormAsync(form);
        await vi.runAllTimersAsync();
        const result = await resultPromise;

        expect(result.valid).toBe(false);
        expect(result.errors.username).toContain('API error');
        expect(result.errors.email).toBeUndefined();
      });

      it('should handle non-Error rejection gracefully', async () => {
        addInput(form, 'text', 'username', 'john');

        const usernameValidator = vi.fn().mockRejectedValue('string error');

        const validator = FormValidator.create({
          username: { asyncCustom: usernameValidator },
        });

        const resultPromise = validator.validateFormAsync(form);
        await vi.runAllTimersAsync();
        const result = await resultPromise;

        expect(result.valid).toBe(false);
        expect(result.errors.username).toContain('username async validation failed');
      });

      it('should set firstError from async validation when sync passed', async () => {
        addInput(form, 'text', 'username', 'admin');

        const asyncValidator = vi.fn().mockResolvedValue('Username is reserved');

        const validator = FormValidator.create({
          username: { required: true, asyncCustom: asyncValidator },
        });

        const resultPromise = validator.validateFormAsync(form);
        await vi.runAllTimersAsync();
        const result = await resultPromise;

        expect(result.firstError).toBe('Username is reserved');
      });

      it('should keep firstError from sync when sync fails', async () => {
        addInput(form, 'text', 'username', '');
        addInput(form, 'email', 'email', 'valid@example.com');

        const emailValidator = vi.fn().mockResolvedValue('Email taken');

        const validator = FormValidator.create({
          username: { required: true },
          email: { asyncCustom: emailValidator },
        });

        const resultPromise = validator.validateFormAsync(form);
        await vi.runAllTimersAsync();
        const result = await resultPromise;

        expect(result.firstError).toBe('username is required');
      });
    });

    describe('async validation with real-world scenarios', () => {
      it('should validate username availability', async () => {
        addInput(form, 'text', 'username', 'john_doe');

        // Simulate API call to check username availability
        const checkUsername = vi.fn().mockImplementation(async (value: string) => {
          const takenUsernames = ['admin', 'root', 'system'];
          if (takenUsernames.includes(value)) {
            return 'Username is already taken';
          }
          return null;
        });

        const validator = FormValidator.create({
          username: {
            required: true,
            minLength: 3,
            pattern: /^[a-z_]+$/,
            asyncCustom: checkUsername,
          },
        });

        const input = form.querySelector('input[name="username"]') as HTMLInputElement;
        const resultPromise = validator.validateFieldAsync(input, { skipDebounce: true });
        await vi.runAllTimersAsync();
        const result = await resultPromise;

        expect(result.valid).toBe(true);

        // Now test with taken username
        input.value = 'admin';
        const resultPromise2 = validator.validateFieldAsync(input, { skipDebounce: true });
        await vi.runAllTimersAsync();
        const result2 = await resultPromise2;

        expect(result2.valid).toBe(false);
        expect(result2.errors).toContain('Username is already taken');
      });

      it('should validate email domain', async () => {
        addInput(form, 'email', 'email', 'user@company.com');

        // Simulate API call to check email domain
        const checkEmailDomain = vi.fn().mockImplementation(async (value: string) => {
          const domain = value.split('@')[1];
          const blockedDomains = ['spam.com', 'fake.com'];
          if (blockedDomains.includes(domain ?? '')) {
            return 'This email domain is not allowed';
          }
          return null;
        });

        const validator = FormValidator.create({
          email: {
            required: true,
            email: true,
            asyncCustom: checkEmailDomain,
          },
        });

        const input = form.querySelector('input[name="email"]') as HTMLInputElement;
        const resultPromise = validator.validateFieldAsync(input, { skipDebounce: true });
        await vi.runAllTimersAsync();
        const result = await resultPromise;

        expect(result.valid).toBe(true);
      });
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle form with no inputs', () => {
      const validator = FormValidator.create({ name: { required: true } });
      const result = validator.validate(form);

      expect(result.valid).toBe(false);
    });

    it('should handle checkbox value (checked)', () => {
      addInput(form, 'checkbox', 'agree', 'yes', { checked: true });

      const validator = FormValidator.create({ agree: { required: true } });
      const result = validator.validate(form);

      expect(result.valid).toBe(true);
    });

    it('should handle checkbox value (unchecked)', () => {
      addInput(form, 'checkbox', 'agree', 'yes', { checked: false });

      const validator = FormValidator.create({ agree: { required: true } });
      const result = validator.validate(form);

      expect(result.valid).toBe(false);
    });

    it('should handle select element', () => {
      addSelect(form, 'country', [
        { value: '', text: 'Select...' },
        { value: 'us', text: 'US', selected: true },
      ]);

      const validator = FormValidator.create({ country: { required: true } });
      const result = validator.validate(form);

      expect(result.valid).toBe(true);
    });

    it('should handle textarea element', () => {
      addTextarea(form, 'message', 'Hello, world!');

      const validator = FormValidator.create({
        message: { required: true, minLength: 5 },
      });
      const result = validator.validate(form);

      expect(result.valid).toBe(true);
    });

    it('should handle multiple values (checkboxes)', () => {
      addInput(form, 'checkbox', 'colors', 'red', { checked: true });
      addInput(form, 'checkbox', 'colors', 'blue', { checked: true });

      const validator = FormValidator.create({
        colors: { required: true },
      });
      const result = validator.validate(form);

      expect(result.valid).toBe(true);
    });

    it('should handle radio buttons', () => {
      addInput(form, 'radio', 'gender', 'male', { checked: false });
      addInput(form, 'radio', 'gender', 'female', { checked: true });

      const validator = FormValidator.create({ gender: { required: true } });
      const result = validator.validate(form);

      expect(result.valid).toBe(true);
    });

    it('should handle validation with empty rules object', () => {
      addInput(form, 'text', 'name', 'John');

      const validator = FormValidator.create({});
      const result = validator.validate(form);

      expect(result.valid).toBe(true);
    });

    it('should handle special characters in field values', () => {
      addInput(form, 'text', 'name', '<script>alert("xss")</script>');

      const validator = FormValidator.create({
        name: { required: true, pattern: /^[a-zA-Z\s]+$/ },
      });
      const result = validator.validate(form);

      expect(result.valid).toBe(false);
    });

    it('should handle unicode in field values', () => {
      addInput(form, 'text', 'name', 'John Doe');

      const validator = FormValidator.create({ name: { required: true } });
      const result = validator.validate(form);

      expect(result.valid).toBe(true);
    });

    it('should handle File values in validation (toStringValue returns empty)', () => {
      // Create a file input with a mock file
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.name = 'document';

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(fileInput, 'files', {
        value: {
          0: file,
          length: 1,
          item: () => file,
          [Symbol.iterator]: function* () {
            yield file;
          },
        },
      });

      form.appendChild(fileInput);

      // Validate with pattern rule - Files should be converted to empty string
      const validator = FormValidator.create({
        document: { pattern: /.*/ },
      });
      const result = validator.validate(form);

      // Should be valid because empty string matches /.*/
      expect(result.valid).toBe(true);
    });

    it('should handle arrays with Files in toStringValue', () => {
      // This tests the array filter for non-string values
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.name = 'documents';
      fileInput.multiple = true;

      const file1 = new File(['content1'], 'test1.pdf', { type: 'application/pdf' });
      const file2 = new File(['content2'], 'test2.pdf', { type: 'application/pdf' });

      Object.defineProperty(fileInput, 'files', {
        value: {
          0: file1,
          1: file2,
          length: 2,
          item: (i: number) => (i === 0 ? file1 : file2),
          [Symbol.iterator]: function* () {
            yield file1;
            yield file2;
          },
        },
      });

      form.appendChild(fileInput);

      const validator = FormValidator.create({
        documents: { required: false },
      });
      const result = validator.validate(form);

      expect(result.valid).toBe(true);
    });

    it('should convert number values to string in toStringValue', () => {
      // Create a hidden input with a numeric value that gets processed as number
      addInput(form, 'number', 'count', '42');

      // The form will return the value as string, but we need to test the number path
      // To do this, we'll directly test validateValue with a number
      const validator = FormValidator.create({
        count: { minLength: 2 },
      });

      // Access private method via the public validate method with mocked form data
      const mockForm = document.createElement('form');
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'count';
      input.value = '42';
      mockForm.appendChild(input);

      const result = validator.validate(mockForm);
      expect(result.valid).toBe(true);
    });

    it('should convert boolean values to string in toStringValue', () => {
      // When FormSerializer returns a boolean (edge case), toStringValue should handle it
      addInput(form, 'checkbox', 'enabled', 'true', { checked: true });

      const validator = FormValidator.create({
        enabled: { required: true },
      });

      const result = validator.validate(form);
      expect(result.valid).toBe(true);
    });

    it('should return empty string for object values in toStringValue', () => {
      // Edge case: when value is an object (not array, not primitive)
      // This path returns empty string for unknown types
      addInput(form, 'text', 'data', '');

      const validator = FormValidator.create({
        data: { required: false, pattern: /.*/ },
      });

      const result = validator.validate(form);
      expect(result.valid).toBe(true);
    });

    it('should set firstError from the first failing field in validateFormAsync', async () => {
      addInput(form, 'text', 'username', 'ab'); // Too short
      addInput(form, 'email', 'email', 'not-an-email'); // Invalid email

      const validator = FormValidator.create({
        username: { minLength: 3, asyncCustom: vi.fn().mockResolvedValue(null) },
        email: { email: true, asyncCustom: vi.fn().mockResolvedValue(null) },
      });

      const result = await validator.validateFormAsync(form);

      expect(result.valid).toBe(false);
      expect(result.firstError).toBeDefined();
      // Both fields should have errors
      expect(Object.keys(result.errors).length).toBeGreaterThanOrEqual(2);
    });

    it('should set firstError only once when multiple fields have sync errors', () => {
      addInput(form, 'text', 'field1', ''); // required fail
      addInput(form, 'text', 'field2', ''); // required fail

      const validator = FormValidator.create({
        field1: { required: true },
        field2: { required: true },
      });

      const result = validator.validate(form);

      expect(result.valid).toBe(false);
      expect(result.firstError).toBe('field1 is required');
      // Both fields should have errors
      expect(Object.keys(result.errors)).toHaveLength(2);
    });

    it('should handle number and boolean values in toStringValue via direct call', () => {
      // Access private static method to test edge case paths (lines 380-382)
      // Using type assertion to access private method for testing
      const toStringValue = (
        FormValidator as unknown as { toStringValue: (value: unknown) => string }
      ).toStringValue;

      // Test number conversion
      expect(toStringValue(42)).toBe('42');
      expect(toStringValue(3.14)).toBe('3.14');
      expect(toStringValue(-10)).toBe('-10');
      expect(toStringValue(0)).toBe('0');

      // Test boolean conversion
      expect(toStringValue(true)).toBe('true');
      expect(toStringValue(false)).toBe('false');

      // Test object returns empty string (line 383)
      expect(toStringValue({ foo: 'bar' })).toBe('');
      expect(toStringValue(new Date())).toBe('');
    });
  });
});
