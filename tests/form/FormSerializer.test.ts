import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FormSerializer } from '../../src/form/index.js';

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
  options?: {
    checked?: boolean;
    defaultValue?: string;
    defaultChecked?: boolean;
    multiple?: boolean;
  }
): HTMLInputElement {
  const input = document.createElement('input');
  input.type = type;
  input.name = name;
  input.value = value;
  if (options?.checked !== undefined) {
    input.checked = options.checked;
  }
  if (options?.defaultValue !== undefined) {
    input.defaultValue = options.defaultValue;
  }
  if (options?.defaultChecked !== undefined) {
    input.defaultChecked = options.defaultChecked;
  }
  if (options?.multiple !== undefined) {
    input.multiple = options.multiple;
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
  options: Array<{ value: string; text: string; selected?: boolean; defaultSelected?: boolean }>,
  multiple = false
): HTMLSelectElement {
  const select = document.createElement('select');
  select.name = name;
  select.multiple = multiple;
  for (const opt of options) {
    const option = document.createElement('option');
    option.value = opt.value;
    option.text = opt.text;
    if (opt.selected !== undefined) {
      option.selected = opt.selected;
    }
    if (opt.defaultSelected !== undefined) {
      option.defaultSelected = opt.defaultSelected;
    }
    select.appendChild(option);
  }
  form.appendChild(select);
  return select;
}

/**
 * Create a textarea element and append it to the form.
 */
function addTextarea(
  form: HTMLFormElement,
  name: string,
  value: string,
  defaultValue?: string
): HTMLTextAreaElement {
  const textarea = document.createElement('textarea');
  textarea.name = name;
  textarea.value = value;
  if (defaultValue !== undefined) {
    textarea.defaultValue = defaultValue;
  }
  form.appendChild(textarea);
  return textarea;
}

describe('FormSerializer', () => {
  let form: HTMLFormElement;

  beforeEach(() => {
    form = createMockForm();
  });

  // ===========================================================================
  // toObject
  // ===========================================================================

  describe('toObject', () => {
    it('should serialize text inputs', () => {
      addInput(form, 'text', 'username', 'john');
      addInput(form, 'text', 'email', 'john@example.com');

      const result = FormSerializer.toObject(form);

      expect(result).toEqual({
        username: 'john',
        email: 'john@example.com',
      });
    });

    it('should serialize password inputs', () => {
      addInput(form, 'password', 'password', 'secret123');

      const result = FormSerializer.toObject(form);

      expect(result).toEqual({
        password: 'secret123',
      });
    });

    it('should serialize hidden inputs', () => {
      addInput(form, 'hidden', 'csrf', 'token123');

      const result = FormSerializer.toObject(form);

      expect(result).toEqual({
        csrf: 'token123',
      });
    });

    it('should serialize email inputs', () => {
      addInput(form, 'email', 'email', 'user@example.com');

      const result = FormSerializer.toObject(form);

      expect(result).toEqual({
        email: 'user@example.com',
      });
    });

    it('should serialize number inputs', () => {
      addInput(form, 'number', 'age', '25');

      const result = FormSerializer.toObject(form);

      expect(result).toEqual({
        age: '25',
      });
    });

    it('should serialize checkbox when checked', () => {
      addInput(form, 'checkbox', 'agree', 'yes', { checked: true });

      const result = FormSerializer.toObject(form);

      expect(result).toEqual({
        agree: 'yes',
      });
    });

    it('should not include unchecked checkbox', () => {
      addInput(form, 'checkbox', 'agree', 'yes', { checked: false });

      const result = FormSerializer.toObject(form);

      expect(result).toEqual({});
    });

    it('should serialize multiple checkboxes with same name as array', () => {
      addInput(form, 'checkbox', 'colors', 'red', { checked: true });
      addInput(form, 'checkbox', 'colors', 'blue', { checked: true });
      addInput(form, 'checkbox', 'colors', 'green', { checked: false });

      const result = FormSerializer.toObject(form);

      expect(result).toEqual({
        colors: ['red', 'blue'],
      });
    });

    it('should serialize radio buttons', () => {
      addInput(form, 'radio', 'gender', 'male', { checked: false });
      addInput(form, 'radio', 'gender', 'female', { checked: true });
      addInput(form, 'radio', 'gender', 'other', { checked: false });

      const result = FormSerializer.toObject(form);

      expect(result).toEqual({
        gender: 'female',
      });
    });

    it('should not include radio buttons when none selected', () => {
      addInput(form, 'radio', 'gender', 'male', { checked: false });
      addInput(form, 'radio', 'gender', 'female', { checked: false });

      const result = FormSerializer.toObject(form);

      expect(result).toEqual({});
    });

    it('should serialize select element', () => {
      addSelect(form, 'country', [
        { value: 'us', text: 'United States' },
        { value: 'uk', text: 'United Kingdom', selected: true },
        { value: 'de', text: 'Germany' },
      ]);

      const result = FormSerializer.toObject(form);

      expect(result).toEqual({
        country: 'uk',
      });
    });

    it('should serialize multi-select as array', () => {
      addSelect(
        form,
        'languages',
        [
          { value: 'en', text: 'English', selected: true },
          { value: 'de', text: 'German', selected: true },
          { value: 'fr', text: 'French', selected: false },
        ],
        true
      );

      const result = FormSerializer.toObject(form);

      expect(result).toEqual({
        languages: ['en', 'de'],
      });
    });

    it('should serialize textarea', () => {
      addTextarea(form, 'message', 'Hello, world!');

      const result = FormSerializer.toObject(form);

      expect(result).toEqual({
        message: 'Hello, world!',
      });
    });

    it('should serialize textarea with multiline content', () => {
      addTextarea(form, 'bio', 'Line 1\nLine 2\nLine 3');

      const result = FormSerializer.toObject(form);

      expect(result).toEqual({
        bio: 'Line 1\nLine 2\nLine 3',
      });
    });

    it('should serialize empty fields', () => {
      addInput(form, 'text', 'empty', '');

      const result = FormSerializer.toObject(form);

      expect(result).toEqual({
        empty: '',
      });
    });

    it('should handle form with no fields', () => {
      const result = FormSerializer.toObject(form);

      expect(result).toEqual({});
    });

    it('should serialize date input', () => {
      addInput(form, 'date', 'birthday', '2000-01-15');

      const result = FormSerializer.toObject(form);

      expect(result).toEqual({
        birthday: '2000-01-15',
      });
    });

    it('should serialize time input', () => {
      addInput(form, 'time', 'meeting', '14:30');

      const result = FormSerializer.toObject(form);

      expect(result).toEqual({
        meeting: '14:30',
      });
    });

    it('should serialize range input', () => {
      addInput(form, 'range', 'volume', '75');

      const result = FormSerializer.toObject(form);

      expect(result).toEqual({
        volume: '75',
      });
    });

    it('should serialize color input', () => {
      addInput(form, 'color', 'color', '#ff0000');

      const result = FormSerializer.toObject(form);

      expect(result).toEqual({
        color: '#ff0000',
      });
    });

    it('should not include submit buttons', () => {
      addInput(form, 'submit', 'submit', 'Submit');
      addInput(form, 'text', 'name', 'John');

      const result = FormSerializer.toObject(form);

      // Submit button is not included in FormData by default
      expect(result).toEqual({
        name: 'John',
      });
    });

    it('should handle mixed form elements', () => {
      addInput(form, 'text', 'name', 'John Doe');
      addInput(form, 'email', 'email', 'john@example.com');
      addInput(form, 'checkbox', 'newsletter', 'yes', { checked: true });
      addSelect(form, 'country', [{ value: 'us', text: 'US', selected: true }]);
      addTextarea(form, 'comments', 'Some comments');

      const result = FormSerializer.toObject(form);

      expect(result).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
        newsletter: 'yes',
        country: 'us',
        comments: 'Some comments',
      });
    });
  });

  // ===========================================================================
  // toFormData
  // ===========================================================================

  describe('toFormData', () => {
    it('should return FormData instance', () => {
      addInput(form, 'text', 'name', 'John');

      const result = FormSerializer.toFormData(form);

      expect(result).toBeInstanceOf(FormData);
    });

    it('should contain form values', () => {
      addInput(form, 'text', 'username', 'john');
      addInput(form, 'email', 'email', 'john@example.com');

      const result = FormSerializer.toFormData(form);

      expect(result.get('username')).toBe('john');
      expect(result.get('email')).toBe('john@example.com');
    });

    it('should handle multiple values with getAll', () => {
      addInput(form, 'checkbox', 'colors', 'red', { checked: true });
      addInput(form, 'checkbox', 'colors', 'blue', { checked: true });

      const result = FormSerializer.toFormData(form);

      expect(result.getAll('colors')).toEqual(['red', 'blue']);
    });
  });

  // ===========================================================================
  // toQueryString
  // ===========================================================================

  describe('toQueryString', () => {
    it('should serialize form to query string', () => {
      addInput(form, 'text', 'name', 'John');
      addInput(form, 'text', 'age', '30');

      const result = FormSerializer.toQueryString(form);

      expect(result).toBe('name=John&age=30');
    });

    it('should URL encode special characters', () => {
      addInput(form, 'text', 'name', 'John Doe');
      addInput(form, 'text', 'query', 'hello&world');

      const result = FormSerializer.toQueryString(form);

      expect(result).toContain('name=John+Doe');
      expect(result).toContain('query=hello%26world');
    });

    it('should handle multiple values with same name', () => {
      addInput(form, 'checkbox', 'colors', 'red', { checked: true });
      addInput(form, 'checkbox', 'colors', 'blue', { checked: true });

      const result = FormSerializer.toQueryString(form);

      expect(result).toBe('colors=red&colors=blue');
    });

    it('should return empty string for empty form', () => {
      const result = FormSerializer.toQueryString(form);

      expect(result).toBe('');
    });

    it('should handle null values (skip them)', () => {
      addInput(form, 'text', 'name', 'John');

      const result = FormSerializer.toQueryString(form);

      expect(result).toBe('name=John');
    });
  });

  // ===========================================================================
  // toURLSearchParams
  // ===========================================================================

  describe('toURLSearchParams', () => {
    it('should return URLSearchParams instance', () => {
      addInput(form, 'text', 'name', 'John');

      const result = FormSerializer.toURLSearchParams(form);

      expect(result).toBeInstanceOf(URLSearchParams);
    });

    it('should contain form values', () => {
      addInput(form, 'text', 'name', 'John');
      addInput(form, 'text', 'age', '30');

      const result = FormSerializer.toURLSearchParams(form);

      expect(result.get('name')).toBe('John');
      expect(result.get('age')).toBe('30');
    });
  });

  // ===========================================================================
  // toJSON
  // ===========================================================================

  describe('toJSON', () => {
    it('should serialize form to JSON string', () => {
      addInput(form, 'text', 'name', 'John');
      addInput(form, 'text', 'age', '30');

      const result = FormSerializer.toJSON(form);

      expect(JSON.parse(result)).toEqual({
        name: 'John',
        age: '30',
      });
    });

    it('should handle arrays', () => {
      addInput(form, 'checkbox', 'colors', 'red', { checked: true });
      addInput(form, 'checkbox', 'colors', 'blue', { checked: true });

      const result = FormSerializer.toJSON(form);

      expect(JSON.parse(result)).toEqual({
        colors: ['red', 'blue'],
      });
    });

    it('should return valid JSON for empty form', () => {
      const result = FormSerializer.toJSON(form);

      expect(JSON.parse(result)).toEqual({});
    });
  });

  // ===========================================================================
  // fromObject
  // ===========================================================================

  describe('fromObject', () => {
    it('should populate text input from object', () => {
      const input = addInput(form, 'text', 'name', '');

      FormSerializer.fromObject(form, { name: 'John Doe' });

      expect(input.value).toBe('John Doe');
    });

    it('should populate password input from object', () => {
      const input = addInput(form, 'password', 'password', '');

      FormSerializer.fromObject(form, { password: 'secret' });

      expect(input.value).toBe('secret');
    });

    it('should populate email input from object', () => {
      const input = addInput(form, 'email', 'email', '');

      FormSerializer.fromObject(form, { email: 'john@example.com' });

      expect(input.value).toBe('john@example.com');
    });

    it('should populate number input from object', () => {
      const input = addInput(form, 'number', 'age', '');

      FormSerializer.fromObject(form, { age: 25 });

      expect(input.value).toBe('25');
    });

    it('should set checkbox checked state from boolean', () => {
      const input = addInput(form, 'checkbox', 'agree', 'yes', { checked: false });

      FormSerializer.fromObject(form, { agree: true });

      expect(input.checked).toBe(true);
    });

    it('should unset checkbox from false', () => {
      const input = addInput(form, 'checkbox', 'agree', 'yes', { checked: true });

      FormSerializer.fromObject(form, { agree: false });

      expect(input.checked).toBe(false);
    });

    it('should set multiple checkboxes from array', () => {
      const checkbox1 = addInput(form, 'checkbox', 'colors', 'red', { checked: false });
      const checkbox2 = addInput(form, 'checkbox', 'colors', 'blue', { checked: false });
      const checkbox3 = addInput(form, 'checkbox', 'colors', 'green', { checked: false });

      FormSerializer.fromObject(form, { colors: ['red', 'green'] });

      expect(checkbox1.checked).toBe(true);
      expect(checkbox2.checked).toBe(false);
      expect(checkbox3.checked).toBe(true);
    });

    it('should set single checkbox from string value', () => {
      const checkbox1 = addInput(form, 'checkbox', 'colors', 'red', { checked: false });
      const checkbox2 = addInput(form, 'checkbox', 'colors', 'blue', { checked: false });

      FormSerializer.fromObject(form, { colors: 'blue' });

      expect(checkbox1.checked).toBe(false);
      expect(checkbox2.checked).toBe(true);
    });

    it('should set radio button from value', () => {
      const radio1 = addInput(form, 'radio', 'gender', 'male', { checked: false });
      const radio2 = addInput(form, 'radio', 'gender', 'female', { checked: false });

      FormSerializer.fromObject(form, { gender: 'female' });

      expect(radio1.checked).toBe(false);
      expect(radio2.checked).toBe(true);
    });

    it('should set select value', () => {
      const select = addSelect(form, 'country', [
        { value: 'us', text: 'US' },
        { value: 'uk', text: 'UK' },
      ]);

      FormSerializer.fromObject(form, { country: 'uk' });

      expect(select.value).toBe('uk');
    });

    it('should set multi-select from array', () => {
      const select = addSelect(
        form,
        'languages',
        [
          { value: 'en', text: 'English' },
          { value: 'de', text: 'German' },
          { value: 'fr', text: 'French' },
        ],
        true
      );

      FormSerializer.fromObject(form, { languages: ['en', 'fr'] });

      const selectedOptions = Array.from(select.selectedOptions).map((o) => o.value);
      expect(selectedOptions).toEqual(['en', 'fr']);
    });

    it('should set textarea value', () => {
      const textarea = addTextarea(form, 'message', '');

      FormSerializer.fromObject(form, { message: 'Hello, world!' });

      expect(textarea.value).toBe('Hello, world!');
    });

    it('should handle null and undefined values', () => {
      const input = addInput(form, 'text', 'name', 'initial');

      FormSerializer.fromObject(form, { name: null });

      expect(input.value).toBe('');
    });

    it('should skip non-existent fields', () => {
      addInput(form, 'text', 'name', 'John');

      // Should not throw
      expect(() =>
        FormSerializer.fromObject(form, {
          name: 'Jane',
          nonexistent: 'value',
        })
      ).not.toThrow();
    });

    it('should not set file input value (security)', () => {
      const input = addInput(form, 'file', 'document', '');

      FormSerializer.fromObject(form, { document: '/path/to/file.pdf' });

      // File inputs cannot be set programmatically
      expect(input.value).toBe('');
    });

    it('should handle boolean values for text inputs', () => {
      const input = addInput(form, 'text', 'active', '');

      FormSerializer.fromObject(form, { active: true });

      expect(input.value).toBe('true');
    });

    it('should handle number values for text inputs', () => {
      const input = addInput(form, 'text', 'count', '');

      FormSerializer.fromObject(form, { count: 42 });

      expect(input.value).toBe('42');
    });

    it('should populate multiple fields from object', () => {
      const nameInput = addInput(form, 'text', 'name', '');
      const emailInput = addInput(form, 'email', 'email', '');
      const ageInput = addInput(form, 'number', 'age', '');
      const agreeCheckbox = addInput(form, 'checkbox', 'agree', 'yes', { checked: false });
      const select = addSelect(form, 'country', [
        { value: 'us', text: 'US' },
        { value: 'uk', text: 'UK' },
      ]);

      FormSerializer.fromObject(form, {
        name: 'John',
        email: 'john@example.com',
        age: 30,
        agree: true,
        country: 'uk',
      });

      expect(nameInput.value).toBe('John');
      expect(emailInput.value).toBe('john@example.com');
      expect(ageInput.value).toBe('30');
      expect(agreeCheckbox.checked).toBe(true);
      expect(select.value).toBe('uk');
    });

    it('should handle single radio button as HTMLInputElement', () => {
      const radio = addInput(form, 'radio', 'option', 'single', { checked: false });

      // When there's only one radio, it's returned as HTMLInputElement not RadioNodeList
      FormSerializer.fromObject(form, { option: 'single' });

      expect(radio.checked).toBe(true);
    });

    it('should handle single checkbox matching its value', () => {
      const checkbox = addInput(form, 'checkbox', 'option', 'single', { checked: false });

      FormSerializer.fromObject(form, { option: 'single' });

      expect(checkbox.checked).toBe(true);
    });
  });

  // ===========================================================================
  // reset
  // ===========================================================================

  describe('reset', () => {
    it('should reset form to initial values', () => {
      const input = addInput(form, 'text', 'name', '', { defaultValue: 'Default' });
      input.value = 'Changed';

      FormSerializer.reset(form);

      expect(input.value).toBe('Default');
    });
  });

  // ===========================================================================
  // clear
  // ===========================================================================

  describe('clear', () => {
    it('should clear text input', () => {
      const input = addInput(form, 'text', 'name', 'John');

      FormSerializer.clear(form);

      expect(input.value).toBe('');
    });

    it('should clear password input', () => {
      const input = addInput(form, 'password', 'password', 'secret');

      FormSerializer.clear(form);

      expect(input.value).toBe('');
    });

    it('should uncheck checkbox', () => {
      const input = addInput(form, 'checkbox', 'agree', 'yes', { checked: true });

      FormSerializer.clear(form);

      expect(input.checked).toBe(false);
    });

    it('should uncheck radio button', () => {
      const input = addInput(form, 'radio', 'gender', 'male', { checked: true });

      FormSerializer.clear(form);

      expect(input.checked).toBe(false);
    });

    it('should clear select (set to no selection)', () => {
      const select = addSelect(form, 'country', [
        { value: 'us', text: 'US', selected: true },
        { value: 'uk', text: 'UK' },
      ]);

      FormSerializer.clear(form);

      expect(select.selectedIndex).toBe(-1);
    });

    it('should clear textarea', () => {
      const textarea = addTextarea(form, 'message', 'Some content');

      FormSerializer.clear(form);

      expect(textarea.value).toBe('');
    });

    it('should not clear submit button', () => {
      const submit = addInput(form, 'submit', 'submit', 'Submit');

      FormSerializer.clear(form);

      expect(submit.value).toBe('Submit');
    });

    it('should not clear button', () => {
      const button = addInput(form, 'button', 'action', 'Click');

      FormSerializer.clear(form);

      expect(button.value).toBe('Click');
    });

    it('should clear all fields in form', () => {
      const textInput = addInput(form, 'text', 'name', 'John');
      const checkbox = addInput(form, 'checkbox', 'agree', 'yes', { checked: true });
      const textarea = addTextarea(form, 'message', 'Content');

      FormSerializer.clear(form);

      expect(textInput.value).toBe('');
      expect(checkbox.checked).toBe(false);
      expect(textarea.value).toBe('');
    });
  });

  // ===========================================================================
  // valueToString (internal helper)
  // ===========================================================================

  describe('valueToString', () => {
    it('should return string as-is', () => {
      expect(FormSerializer.valueToString('hello')).toBe('hello');
    });

    it('should convert number to string', () => {
      expect(FormSerializer.valueToString(42)).toBe('42');
    });

    it('should convert boolean to string', () => {
      expect(FormSerializer.valueToString(true)).toBe('true');
      expect(FormSerializer.valueToString(false)).toBe('false');
    });

    it('should return empty string for null', () => {
      expect(FormSerializer.valueToString(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(FormSerializer.valueToString(undefined)).toBe('');
    });

    it('should return empty string for objects', () => {
      expect(FormSerializer.valueToString({ key: 'value' })).toBe('');
    });

    it('should return empty string for arrays', () => {
      expect(FormSerializer.valueToString([1, 2, 3])).toBe('');
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle form with only buttons', () => {
      addInput(form, 'submit', 'submit', 'Submit');
      addInput(form, 'button', 'cancel', 'Cancel');

      const result = FormSerializer.toObject(form);

      expect(result).toEqual({});
    });

    it('should handle special characters in field values', () => {
      addInput(form, 'text', 'query', '<script>alert("xss")</script>');

      const result = FormSerializer.toObject(form);

      expect(result.query).toBe('<script>alert("xss")</script>');
    });

    it('should handle unicode in field values', () => {
      addInput(form, 'text', 'name', 'John Doe');
      addTextarea(form, 'emoji', 'Hello World');

      const result = FormSerializer.toObject(form);

      expect(result.name).toBe('John Doe');
      expect(result.emoji).toBe('Hello World');
    });

    it('should handle very long values', () => {
      const longValue = 'a'.repeat(10000);
      addInput(form, 'text', 'long', longValue);

      const result = FormSerializer.toObject(form);

      expect(result.long).toBe(longValue);
    });

    it('should handle date input', () => {
      addInput(form, 'date', 'birthday', '1990-05-15');

      const result = FormSerializer.toObject(form);

      expect(result.birthday).toBe('1990-05-15');
    });

    it('should handle datetime-local input', () => {
      addInput(form, 'datetime-local', 'appointment', '2024-01-15T14:30');

      const result = FormSerializer.toObject(form);

      expect(result.appointment).toBe('2024-01-15T14:30');
    });

    it('should handle month input', () => {
      addInput(form, 'month', 'billing', '2024-01');

      const result = FormSerializer.toObject(form);

      expect(result.billing).toBe('2024-01');
    });

    it('should handle week input', () => {
      addInput(form, 'week', 'week', '2024-W01');

      const result = FormSerializer.toObject(form);

      expect(result.week).toBe('2024-W01');
    });

    it('should handle tel input', () => {
      addInput(form, 'tel', 'phone', '+1-555-123-4567');

      const result = FormSerializer.toObject(form);

      expect(result.phone).toBe('+1-555-123-4567');
    });

    it('should handle url input', () => {
      addInput(form, 'url', 'website', 'https://example.com');

      const result = FormSerializer.toObject(form);

      expect(result.website).toBe('https://example.com');
    });

    it('should handle search input', () => {
      addInput(form, 'search', 'search', 'search query');

      const result = FormSerializer.toObject(form);

      expect(result.search).toBe('search query');
    });

    it('should handle multiple file inputs as File array', () => {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.name = 'documents';
      fileInput.multiple = true;

      // Create mock FileList with multiple files
      const file1 = new File(['content1'], 'doc1.pdf', { type: 'application/pdf' });
      const file2 = new File(['content2'], 'doc2.pdf', { type: 'application/pdf' });

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

      const result = FormSerializer.toObject(form);

      expect(Array.isArray(result.documents)).toBe(true);
      expect((result.documents as File[]).length).toBe(2);
      expect((result.documents as File[])[0]).toBe(file1);
      expect((result.documents as File[])[1]).toBe(file2);
    });

    it('should handle multiple text inputs with same name in RadioNodeList', () => {
      // Create multiple text inputs with the same name (unusual but valid)
      addInput(form, 'text', 'tags', 'tag1');
      addInput(form, 'text', 'tags', 'tag2');

      // When setting values via fromObject, these are treated as RadioNodeList
      FormSerializer.fromObject(form, { tags: 'newvalue' });

      // Both should be set to the new value
      const inputs = form.querySelectorAll('input[name="tags"]');
      expect((inputs[0] as HTMLInputElement).value).toBe('newvalue');
      expect((inputs[1] as HTMLInputElement).value).toBe('newvalue');
    });

    it('should skip fields without name attribute', () => {
      const input = document.createElement('input');
      input.type = 'text';
      input.value = 'nameless';
      // No name attribute
      form.appendChild(input);

      const result = FormSerializer.toObject(form);

      expect(Object.keys(result).length).toBe(0);
    });

    it('should skip select without name attribute', () => {
      const select = document.createElement('select');
      const option = document.createElement('option');
      option.value = 'value';
      option.selected = true;
      select.appendChild(option);
      // No name attribute
      form.appendChild(select);

      const result = FormSerializer.toObject(form);

      expect(Object.keys(result).length).toBe(0);
    });

    it('should skip textarea without name attribute', () => {
      const textarea = document.createElement('textarea');
      textarea.value = 'content';
      // No name attribute
      form.appendChild(textarea);

      const result = FormSerializer.toObject(form);

      expect(Object.keys(result).length).toBe(0);
    });
  });

  describe('toQueryString - null and File handling', () => {
    it('should skip null values in toQueryString', () => {
      const spy = vi.spyOn(FormSerializer, 'toObject').mockReturnValue({
        name: 'John',
        empty: null,
        age: '30',
      });

      const result = FormSerializer.toQueryString(form);

      expect(result).toBe('name=John&age=30');
      expect(result).not.toContain('empty');

      spy.mockRestore();
    });
  });

  describe('toJSON - File filtering', () => {
    it('should skip File values in toJSON', () => {
      const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      const spy = vi.spyOn(FormSerializer, 'toObject').mockReturnValue({
        name: 'John',
        avatar: mockFile,
      });

      const result = FormSerializer.toJSON(form);
      const parsed = JSON.parse(result);

      expect(parsed).toEqual({ name: 'John' });
      expect(parsed).not.toHaveProperty('avatar');

      spy.mockRestore();
    });

    it('should skip array values containing Files in toJSON', () => {
      const mockFile = new File(['content'], 'doc.pdf', { type: 'application/pdf' });
      const spy = vi.spyOn(FormSerializer, 'toObject').mockReturnValue({
        name: 'John',
        documents: [mockFile],
      });

      const result = FormSerializer.toJSON(form);
      const parsed = JSON.parse(result);

      expect(parsed).toEqual({ name: 'John' });
      expect(parsed).not.toHaveProperty('documents');

      spy.mockRestore();
    });
  });
});
