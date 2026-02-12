import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FormUtils } from '../../src/form/index.js';

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
    disabled?: boolean;
  }
): HTMLInputElement {
  const input = document.createElement('input');
  input.type = type;
  input.name = name;
  input.value = value;
  if (type !== 'checkbox' && type !== 'radio') {
    input.defaultValue = options?.defaultValue ?? value;
  }
  if (options?.checked !== undefined) {
    input.checked = options.checked;
  }
  if (options?.defaultChecked !== undefined) {
    input.defaultChecked = options.defaultChecked;
  }
  if (options?.disabled !== undefined) {
    input.disabled = options.disabled;
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
  selectOptions?: { disabled?: boolean }
): HTMLSelectElement {
  const select = document.createElement('select');
  select.name = name;
  if (selectOptions?.disabled !== undefined) {
    select.disabled = selectOptions.disabled;
  }
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
  options?: { defaultValue?: string; disabled?: boolean }
): HTMLTextAreaElement {
  const textarea = document.createElement('textarea');
  textarea.name = name;
  textarea.value = value;
  textarea.defaultValue = options?.defaultValue ?? value;
  if (options?.disabled !== undefined) {
    textarea.disabled = options.disabled;
  }
  form.appendChild(textarea);
  return textarea;
}

/**
 * Create a button element and append it to the form.
 */
function addButton(
  form: HTMLFormElement,
  type: 'submit' | 'button' | 'reset',
  text: string,
  options?: { disabled?: boolean }
): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = type;
  button.textContent = text;
  if (options?.disabled !== undefined) {
    button.disabled = options.disabled;
  }
  form.appendChild(button);
  return button;
}

describe('FormUtils', () => {
  let form: HTMLFormElement;

  beforeEach(() => {
    form = createMockForm();
  });

  // ===========================================================================
  // isDirty
  // ===========================================================================

  describe('isDirty', () => {
    it('should return false for form with unchanged values', () => {
      addInput(form, 'text', 'name', 'John', { defaultValue: 'John' });

      expect(FormUtils.isDirty(form)).toBe(false);
    });

    it('should return true when text input value changed', () => {
      const input = addInput(form, 'text', 'name', 'John', { defaultValue: 'John' });
      input.value = 'Jane';

      expect(FormUtils.isDirty(form)).toBe(true);
    });

    it('should return true when password input value changed', () => {
      const input = addInput(form, 'password', 'password', 'secret', { defaultValue: 'secret' });
      input.value = 'newsecret';

      expect(FormUtils.isDirty(form)).toBe(true);
    });

    it('should return true when email input value changed', () => {
      const input = addInput(form, 'email', 'email', 'john@example.com', {
        defaultValue: 'john@example.com',
      });
      input.value = 'jane@example.com';

      expect(FormUtils.isDirty(form)).toBe(true);
    });

    it('should return true when checkbox checked state changed', () => {
      addInput(form, 'checkbox', 'agree', 'yes', {
        checked: true,
        defaultChecked: false,
      });
      // defaultChecked is false, checked is true
      expect(FormUtils.isDirty(form)).toBe(true);
    });

    it('should return false when checkbox unchanged', () => {
      addInput(form, 'checkbox', 'agree', 'yes', {
        checked: true,
        defaultChecked: true,
      });

      expect(FormUtils.isDirty(form)).toBe(false);
    });

    it('should return true when radio button selection changed', () => {
      addInput(form, 'radio', 'gender', 'male', {
        checked: false,
        defaultChecked: true,
      });
      addInput(form, 'radio', 'gender', 'female', {
        checked: true,
        defaultChecked: false,
      });

      // Radio state has changed from default
      expect(FormUtils.isDirty(form)).toBe(true);
    });

    it('should return false when radio buttons unchanged', () => {
      addInput(form, 'radio', 'gender', 'male', {
        checked: true,
        defaultChecked: true,
      });
      addInput(form, 'radio', 'gender', 'female', {
        checked: false,
        defaultChecked: false,
      });

      expect(FormUtils.isDirty(form)).toBe(false);
    });

    it('should return true when select value changed', () => {
      addSelect(form, 'country', [
        { value: 'us', text: 'US', selected: false, defaultSelected: true },
        { value: 'uk', text: 'UK', selected: true, defaultSelected: false },
      ]);

      expect(FormUtils.isDirty(form)).toBe(true);
    });

    it('should return false when select unchanged', () => {
      addSelect(form, 'country', [
        { value: 'us', text: 'US', selected: true, defaultSelected: true },
        { value: 'uk', text: 'UK', selected: false, defaultSelected: false },
      ]);

      expect(FormUtils.isDirty(form)).toBe(false);
    });

    it('should return true when textarea value changed', () => {
      const textarea = addTextarea(form, 'message', 'Hello', { defaultValue: 'Hello' });
      textarea.value = 'Goodbye';

      expect(FormUtils.isDirty(form)).toBe(true);
    });

    it('should return false when textarea unchanged', () => {
      addTextarea(form, 'message', 'Hello', { defaultValue: 'Hello' });

      expect(FormUtils.isDirty(form)).toBe(false);
    });

    it('should return false for empty form', () => {
      expect(FormUtils.isDirty(form)).toBe(false);
    });

    it('should ignore submit buttons', () => {
      addInput(form, 'submit', 'submit', 'Submit');

      expect(FormUtils.isDirty(form)).toBe(false);
    });

    it('should ignore regular buttons', () => {
      addInput(form, 'button', 'action', 'Click');

      expect(FormUtils.isDirty(form)).toBe(false);
    });

    it('should detect changes in multiple fields', () => {
      addInput(form, 'text', 'name', 'John', { defaultValue: 'John' });
      const email = addInput(form, 'email', 'email', 'john@example.com', {
        defaultValue: 'john@example.com',
      });

      // Only email changed
      email.value = 'jane@example.com';

      expect(FormUtils.isDirty(form)).toBe(true);
    });

    it('should return false when changes are reverted', () => {
      const input = addInput(form, 'text', 'name', 'John', { defaultValue: 'John' });
      input.value = 'Jane';
      input.value = 'John'; // Reverted

      expect(FormUtils.isDirty(form)).toBe(false);
    });
  });

  // ===========================================================================
  // disable
  // ===========================================================================

  describe('disable', () => {
    it('should disable text input', () => {
      const input = addInput(form, 'text', 'name', 'John');

      FormUtils.disable(form);

      expect(input.disabled).toBe(true);
    });

    it('should disable select', () => {
      const select = addSelect(form, 'country', [{ value: 'us', text: 'US' }]);

      FormUtils.disable(form);

      expect(select.disabled).toBe(true);
    });

    it('should disable textarea', () => {
      const textarea = addTextarea(form, 'message', 'Hello');

      FormUtils.disable(form);

      expect(textarea.disabled).toBe(true);
    });

    it('should disable button', () => {
      const button = addButton(form, 'submit', 'Submit');

      FormUtils.disable(form);

      expect(button.disabled).toBe(true);
    });

    it('should disable all form elements', () => {
      const input = addInput(form, 'text', 'name', 'John');
      const select = addSelect(form, 'country', [{ value: 'us', text: 'US' }]);
      const textarea = addTextarea(form, 'message', 'Hello');
      const button = addButton(form, 'submit', 'Submit');

      FormUtils.disable(form);

      expect(input.disabled).toBe(true);
      expect(select.disabled).toBe(true);
      expect(textarea.disabled).toBe(true);
      expect(button.disabled).toBe(true);
    });
  });

  // ===========================================================================
  // enable
  // ===========================================================================

  describe('enable', () => {
    it('should enable disabled text input', () => {
      const input = addInput(form, 'text', 'name', 'John', { disabled: true });

      FormUtils.enable(form);

      expect(input.disabled).toBe(false);
    });

    it('should enable disabled select', () => {
      const select = addSelect(form, 'country', [{ value: 'us', text: 'US' }], { disabled: true });

      FormUtils.enable(form);

      expect(select.disabled).toBe(false);
    });

    it('should enable disabled textarea', () => {
      const textarea = addTextarea(form, 'message', 'Hello', { disabled: true });

      FormUtils.enable(form);

      expect(textarea.disabled).toBe(false);
    });

    it('should enable disabled button', () => {
      const button = addButton(form, 'submit', 'Submit', { disabled: true });

      FormUtils.enable(form);

      expect(button.disabled).toBe(false);
    });

    it('should enable all form elements', () => {
      const input = addInput(form, 'text', 'name', 'John', { disabled: true });
      const select = addSelect(form, 'country', [{ value: 'us', text: 'US' }], { disabled: true });
      const textarea = addTextarea(form, 'message', 'Hello', { disabled: true });
      const button = addButton(form, 'submit', 'Submit', { disabled: true });

      FormUtils.enable(form);

      expect(input.disabled).toBe(false);
      expect(select.disabled).toBe(false);
      expect(textarea.disabled).toBe(false);
      expect(button.disabled).toBe(false);
    });
  });

  // ===========================================================================
  // setLoading
  // ===========================================================================

  describe('setLoading', () => {
    it('should disable all form elements', () => {
      const input = addInput(form, 'text', 'name', 'John');
      const button = addButton(form, 'submit', 'Submit');

      FormUtils.setLoading(form);

      expect(input.disabled).toBe(true);
      expect(button.disabled).toBe(true);
    });

    it('should change submit button text to Loading...', () => {
      const button = addButton(form, 'submit', 'Submit');

      FormUtils.setLoading(form, button);

      expect(button.textContent).toBe('Loading...');
    });

    it('should return cleanup function that restores state', () => {
      const input = addInput(form, 'text', 'name', 'John');
      const button = addButton(form, 'submit', 'Submit');

      const cleanup = FormUtils.setLoading(form, button);
      cleanup();

      expect(input.disabled).toBe(false);
      expect(button.disabled).toBe(false);
      expect(button.textContent).toBe('Submit');
    });

    it('should preserve original disabled state on cleanup', () => {
      const input = addInput(form, 'text', 'name', 'John', { disabled: true });
      const button = addButton(form, 'submit', 'Submit');

      const cleanup = FormUtils.setLoading(form, button);
      cleanup();

      expect(input.disabled).toBe(true); // Was already disabled
      expect(button.disabled).toBe(false);
    });

    it('should work without submit button', () => {
      const input = addInput(form, 'text', 'name', 'John');

      const cleanup = FormUtils.setLoading(form);

      expect(input.disabled).toBe(true);

      cleanup();

      expect(input.disabled).toBe(false);
    });
  });

  // ===========================================================================
  // focusFirstInvalid
  // ===========================================================================

  describe('focusFirstInvalid', () => {
    it('should return false when no invalid fields', () => {
      addInput(form, 'text', 'name', 'John');

      const result = FormUtils.focusFirstInvalid(form);

      expect(result).toBe(false);
    });

    it('should focus first invalid input and return true', () => {
      const input = addInput(form, 'text', 'name', '');
      input.required = true;

      const focusSpy = vi.spyOn(input, 'focus');

      const result = FormUtils.focusFirstInvalid(form);

      expect(result).toBe(true);
      expect(focusSpy).toHaveBeenCalled();
    });

    it('should focus first invalid select', () => {
      addInput(form, 'text', 'name', 'John');
      const select = addSelect(form, 'country', [{ value: '', text: 'Select...' }]);
      select.required = true;

      const focusSpy = vi.spyOn(select, 'focus');

      const result = FormUtils.focusFirstInvalid(form);

      expect(result).toBe(true);
      expect(focusSpy).toHaveBeenCalled();
    });

    it('should focus first invalid textarea', () => {
      addInput(form, 'text', 'name', 'John');
      const textarea = addTextarea(form, 'message', '');
      textarea.required = true;

      const focusSpy = vi.spyOn(textarea, 'focus');

      const result = FormUtils.focusFirstInvalid(form);

      expect(result).toBe(true);
      expect(focusSpy).toHaveBeenCalled();
    });

    it('should focus first invalid field when multiple are invalid', () => {
      const input1 = addInput(form, 'text', 'name', '');
      input1.required = true;
      const input2 = addInput(form, 'email', 'email', '');
      input2.required = true;

      const focusSpy1 = vi.spyOn(input1, 'focus');
      const focusSpy2 = vi.spyOn(input2, 'focus');

      FormUtils.focusFirstInvalid(form);

      expect(focusSpy1).toHaveBeenCalled();
      expect(focusSpy2).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // getFieldNames
  // ===========================================================================

  describe('getFieldNames', () => {
    it('should return empty array for empty form', () => {
      expect(FormUtils.getFieldNames(form)).toEqual([]);
    });

    it('should return all field names', () => {
      addInput(form, 'text', 'name', 'John');
      addInput(form, 'email', 'email', 'john@example.com');
      addSelect(form, 'country', [{ value: 'us', text: 'US' }]);
      addTextarea(form, 'message', 'Hello');

      const names = FormUtils.getFieldNames(form);

      expect(names).toContain('name');
      expect(names).toContain('email');
      expect(names).toContain('country');
      expect(names).toContain('message');
      expect(names).toHaveLength(4);
    });

    it('should not duplicate names for multiple elements with same name', () => {
      addInput(form, 'radio', 'gender', 'male');
      addInput(form, 'radio', 'gender', 'female');

      const names = FormUtils.getFieldNames(form);

      expect(names).toEqual(['gender']);
    });

    it('should not include elements without name', () => {
      const input = document.createElement('input');
      input.type = 'text';
      // No name attribute
      form.appendChild(input);

      expect(FormUtils.getFieldNames(form)).toEqual([]);
    });
  });

  // ===========================================================================
  // getField
  // ===========================================================================

  describe('getField', () => {
    it('should return input element by name', () => {
      const input = addInput(form, 'text', 'name', 'John');

      const result = FormUtils.getField(form, 'name');

      expect(result).toBe(input);
    });

    it('should return select element by name', () => {
      const select = addSelect(form, 'country', [{ value: 'us', text: 'US' }]);

      const result = FormUtils.getField(form, 'country');

      expect(result).toBe(select);
    });

    it('should return textarea element by name', () => {
      const textarea = addTextarea(form, 'message', 'Hello');

      const result = FormUtils.getField(form, 'message');

      expect(result).toBe(textarea);
    });

    it('should return RadioNodeList for multiple elements with same name', () => {
      addInput(form, 'radio', 'gender', 'male');
      addInput(form, 'radio', 'gender', 'female');

      const result = FormUtils.getField(form, 'gender');

      expect(result).toBeInstanceOf(RadioNodeList);
    });

    it('should return null for non-existent field', () => {
      expect(FormUtils.getField(form, 'nonexistent')).toBeNull();
    });
  });

  // ===========================================================================
  // setFieldValue
  // ===========================================================================

  describe('setFieldValue', () => {
    it('should set text input value', () => {
      const input = addInput(form, 'text', 'name', '');

      FormUtils.setFieldValue(form, 'name', 'John Doe');

      expect(input.value).toBe('John Doe');
    });

    it('should set number input value', () => {
      const input = addInput(form, 'number', 'age', '');

      FormUtils.setFieldValue(form, 'age', 25);

      expect(input.value).toBe('25');
    });

    it('should set checkbox checked state from boolean', () => {
      const input = addInput(form, 'checkbox', 'agree', 'yes', { checked: false });

      FormUtils.setFieldValue(form, 'agree', true);

      expect(input.checked).toBe(true);
    });

    it('should unset checkbox from false', () => {
      const input = addInput(form, 'checkbox', 'agree', 'yes', { checked: true });

      FormUtils.setFieldValue(form, 'agree', false);

      expect(input.checked).toBe(false);
    });

    it('should set radio button from value', () => {
      const radio1 = addInput(form, 'radio', 'gender', 'male', { checked: false });
      const radio2 = addInput(form, 'radio', 'gender', 'female', { checked: false });

      FormUtils.setFieldValue(form, 'gender', 'female');

      expect(radio1.checked).toBe(false);
      expect(radio2.checked).toBe(true);
    });

    it('should set multiple checkboxes from array', () => {
      const checkbox1 = addInput(form, 'checkbox', 'colors', 'red', { checked: false });
      const checkbox2 = addInput(form, 'checkbox', 'colors', 'blue', { checked: false });
      const checkbox3 = addInput(form, 'checkbox', 'colors', 'green', { checked: false });

      FormUtils.setFieldValue(form, 'colors', ['red', 'green']);

      expect(checkbox1.checked).toBe(true);
      expect(checkbox2.checked).toBe(false);
      expect(checkbox3.checked).toBe(true);
    });

    it('should set select value', () => {
      const select = addSelect(form, 'country', [
        { value: 'us', text: 'US' },
        { value: 'uk', text: 'UK' },
      ]);

      FormUtils.setFieldValue(form, 'country', 'uk');

      expect(select.value).toBe('uk');
    });

    it('should set textarea value', () => {
      const textarea = addTextarea(form, 'message', '');

      FormUtils.setFieldValue(form, 'message', 'Hello, world!');

      expect(textarea.value).toBe('Hello, world!');
    });

    it('should not throw for non-existent field', () => {
      expect(() => FormUtils.setFieldValue(form, 'nonexistent', 'value')).not.toThrow();
    });

    it('should not set file input value (security)', () => {
      const input = addInput(form, 'file', 'document', '');

      FormUtils.setFieldValue(form, 'document', '/path/to/file.pdf');

      expect(input.value).toBe('');
    });

    it('should handle null value', () => {
      const input = addInput(form, 'text', 'name', 'John');

      FormUtils.setFieldValue(form, 'name', null);

      expect(input.value).toBe('');
    });

    it('should handle undefined value', () => {
      const input = addInput(form, 'text', 'name', 'John');

      FormUtils.setFieldValue(form, 'name', undefined);

      expect(input.value).toBe('');
    });

    it('should set single checkbox matching value', () => {
      const checkbox1 = addInput(form, 'checkbox', 'colors', 'red', { checked: false });
      const checkbox2 = addInput(form, 'checkbox', 'colors', 'blue', { checked: false });

      FormUtils.setFieldValue(form, 'colors', 'blue');

      expect(checkbox1.checked).toBe(false);
      expect(checkbox2.checked).toBe(true);
    });
  });

  // ===========================================================================
  // valueToString (internal helper)
  // ===========================================================================

  describe('valueToString', () => {
    it('should return string as-is', () => {
      expect(FormUtils.valueToString('hello')).toBe('hello');
    });

    it('should convert number to string', () => {
      expect(FormUtils.valueToString(42)).toBe('42');
    });

    it('should convert boolean to string', () => {
      expect(FormUtils.valueToString(true)).toBe('true');
      expect(FormUtils.valueToString(false)).toBe('false');
    });

    it('should return empty string for null', () => {
      expect(FormUtils.valueToString(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(FormUtils.valueToString(undefined)).toBe('');
    });

    it('should return empty string for objects', () => {
      expect(FormUtils.valueToString({ key: 'value' })).toBe('');
    });

    it('should return empty string for arrays', () => {
      expect(FormUtils.valueToString([1, 2, 3])).toBe('');
    });
  });

  // ===========================================================================
  // warnOnUnsavedChanges
  // ===========================================================================

  describe('warnOnUnsavedChanges', () => {
    let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
    let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    });

    afterEach(() => {
      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });

    it('should add beforeunload event listener', () => {
      FormUtils.warnOnUnsavedChanges(form);

      expect(addEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    });

    it('should return cleanup function that removes listener', () => {
      const cleanup = FormUtils.warnOnUnsavedChanges(form);

      cleanup();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    });

    it('should not prevent navigation when form is clean', () => {
      addInput(form, 'text', 'name', 'John', { defaultValue: 'John' });

      FormUtils.warnOnUnsavedChanges(form);

      // Get the handler
      const handler = addEventListenerSpy.mock.calls[0]![1] as (event: BeforeUnloadEvent) => void;

      const event = new Event('beforeunload') as BeforeUnloadEvent;
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      const result = handler(event);

      expect(preventDefaultSpy).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should prevent navigation when form is dirty', () => {
      const input = addInput(form, 'text', 'name', 'John', { defaultValue: 'John' });
      input.value = 'Jane';

      FormUtils.warnOnUnsavedChanges(form);

      // Get the handler
      const handler = addEventListenerSpy.mock.calls[0]![1] as (event: BeforeUnloadEvent) => void;

      const event = new Event('beforeunload') as BeforeUnloadEvent;
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      handler(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle empty form for all operations', () => {
      expect(FormUtils.isDirty(form)).toBe(false);
      expect(FormUtils.getFieldNames(form)).toEqual([]);
      expect(FormUtils.focusFirstInvalid(form)).toBe(false);
      expect(() => FormUtils.disable(form)).not.toThrow();
      expect(() => FormUtils.enable(form)).not.toThrow();
    });

    it('should handle form with only buttons', () => {
      addButton(form, 'submit', 'Submit');
      addButton(form, 'button', 'Cancel');
      addButton(form, 'reset', 'Reset');

      expect(FormUtils.isDirty(form)).toBe(false);
      expect(FormUtils.getFieldNames(form)).toEqual([]);
    });

    it('should handle numeric values in setFieldValue', () => {
      const input = addInput(form, 'text', 'count', '');

      FormUtils.setFieldValue(form, 'count', 42);

      expect(input.value).toBe('42');
    });

    it('should handle boolean values in setFieldValue for text input', () => {
      const input = addInput(form, 'text', 'active', '');

      FormUtils.setFieldValue(form, 'active', true);

      expect(input.value).toBe('true');
    });

    it('should handle object values in setFieldValue (converts to empty string)', () => {
      const input = addInput(form, 'text', 'data', '');

      FormUtils.setFieldValue(form, 'data', { key: 'value' });

      expect(input.value).toBe('');
    });

    it('should handle hidden inputs in isDirty', () => {
      // Create hidden input via innerHTML to set proper defaultValue via attribute
      form.innerHTML = '<input type="hidden" name="csrf" value="originaltoken">';
      const input = form.querySelector('input') as HTMLInputElement;

      // Verify setup
      expect(input.type).toBe('hidden');

      // In happy-dom, defaultValue and value might sync, so we need to
      // manually set defaultValue after value to test the dirty check
      Object.defineProperty(input, 'defaultValue', {
        value: 'originaltoken',
        writable: true,
        configurable: true,
      });
      input.value = 'newtoken';

      // Now value !== defaultValue, so form should be dirty
      expect(input.value).toBe('newtoken');
      expect(input.defaultValue).toBe('originaltoken');
      expect(FormUtils.isDirty(form)).toBe(true);
    });

    it('should handle date inputs in isDirty', () => {
      const input = addInput(form, 'date', 'birthday', '2000-01-01', {
        defaultValue: '2000-01-01',
      });
      input.value = '2000-01-02';

      expect(FormUtils.isDirty(form)).toBe(true);
    });
  });
});
