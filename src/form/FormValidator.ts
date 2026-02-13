/**
 * Form Validator - Declarative form validation.
 *
 * Features:
 * - Built-in rules (required, email, min/max length, pattern, etc.)
 * - Custom validation functions
 * - Field-level and form-level validation
 * - Async validation support
 *
 * @example
 * ```TypeScript
 * const validator = FormValidator.create({
 *   username: { required: true, minLength: 3, maxLength: 20 },
 *   email: { required: true, email: true },
 *   age: { number: true, min: 18, max: 120 },
 *   password: {
 *     required: true,
 *     minLength: 8,
 *     custom: (v) => /[A-Z]/.test(v) || 'Must contain uppercase'
 *   }
 * });
 *
 * // Validate entire form
 * const result = validator.validate(form);
 * if (!result.valid) {
 *   console.log(result.errors);
 * }
 *
 * // Validate single field
 * const fieldResult = validator.validateField(form, 'email');
 * ```
 */
import { FormSerializer } from './FormSerializer.js';
import type { CleanupFn } from '../core/index.js';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Helper to safely convert form values to string.
 * Used by validation checkers and FormValidator.
 * @internal
 */
function toStringValueHelper(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string').join(',');
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

// ============================================================================
// Strategy Pattern: Validation Rule Checkers
// ============================================================================

interface ValidationRuleChecker {
  applies(rules: FieldRules): boolean;
  validate(
    value: string,
    rules: FieldRules,
    fieldName: string,
    form: HTMLFormElement
  ): string | null;
}

class RequiredRuleChecker implements ValidationRuleChecker {
  applies(rules: FieldRules): boolean {
    return rules.required === true;
  }

  validate(
    value: string,
    rules: FieldRules,
    fieldName: string,
    _form: HTMLFormElement
  ): string | null {
    if (!value.trim()) {
      return rules.messages?.required ?? `${fieldName} is required`;
    }
    return null;
  }
}

class MinLengthRuleChecker implements ValidationRuleChecker {
  applies(rules: FieldRules): boolean {
    return rules.minLength !== undefined;
  }

  validate(
    value: string,
    rules: FieldRules,
    fieldName: string,
    _form: HTMLFormElement
  ): string | null {
    if (rules.minLength !== undefined && value.length < rules.minLength) {
      return (
        rules.messages?.minLength ?? `${fieldName} must be at least ${rules.minLength} characters`
      );
    }
    return null;
  }
}

class MaxLengthRuleChecker implements ValidationRuleChecker {
  applies(rules: FieldRules): boolean {
    return rules.maxLength !== undefined;
  }

  validate(
    value: string,
    rules: FieldRules,
    fieldName: string,
    _form: HTMLFormElement
  ): string | null {
    if (rules.maxLength !== undefined && value.length > rules.maxLength) {
      return (
        rules.messages?.maxLength ?? `${fieldName} must be at most ${rules.maxLength} characters`
      );
    }
    return null;
  }
}

class EmailRuleChecker implements ValidationRuleChecker {
  applies(rules: FieldRules): boolean {
    return rules.email === true;
  }

  validate(
    value: string,
    rules: FieldRules,
    fieldName: string,
    _form: HTMLFormElement
  ): string | null {
    if (!FormValidator.isValidEmail(value)) {
      return rules.messages?.email ?? `${fieldName} must be a valid email address`;
    }
    return null;
  }
}

class UrlRuleChecker implements ValidationRuleChecker {
  applies(rules: FieldRules): boolean {
    return rules.url === true;
  }

  validate(
    value: string,
    rules: FieldRules,
    fieldName: string,
    _form: HTMLFormElement
  ): string | null {
    if (!FormValidator.isValidUrl(value)) {
      return rules.messages?.url ?? `${fieldName} must be a valid URL`;
    }
    return null;
  }
}

class NumberRuleChecker implements ValidationRuleChecker {
  applies(rules: FieldRules): boolean {
    return rules.number === true;
  }

  validate(
    value: string,
    rules: FieldRules,
    fieldName: string,
    _form: HTMLFormElement
  ): string | null {
    if (!FormValidator.isNumeric(value)) {
      return rules.messages?.number ?? `${fieldName} must be a number`;
    }
    return null;
  }
}

class IntegerRuleChecker implements ValidationRuleChecker {
  applies(rules: FieldRules): boolean {
    return rules.integer === true;
  }

  validate(
    value: string,
    rules: FieldRules,
    fieldName: string,
    _form: HTMLFormElement
  ): string | null {
    if (!FormValidator.isInteger(value)) {
      return rules.messages?.integer ?? `${fieldName} must be an integer`;
    }
    return null;
  }
}

class MinRuleChecker implements ValidationRuleChecker {
  applies(rules: FieldRules): boolean {
    return rules.min !== undefined;
  }

  validate(
    value: string,
    rules: FieldRules,
    fieldName: string,
    _form: HTMLFormElement
  ): string | null {
    if (rules.min !== undefined) {
      const num = parseFloat(value);
      if (isNaN(num) || num < rules.min) {
        return rules.messages?.min ?? `${fieldName} must be at least ${rules.min}`;
      }
    }
    return null;
  }
}

class MaxRuleChecker implements ValidationRuleChecker {
  applies(rules: FieldRules): boolean {
    return rules.max !== undefined;
  }

  validate(
    value: string,
    rules: FieldRules,
    fieldName: string,
    _form: HTMLFormElement
  ): string | null {
    if (rules.max !== undefined) {
      const num = parseFloat(value);
      if (isNaN(num) || num > rules.max) {
        return rules.messages?.max ?? `${fieldName} must be at most ${rules.max}`;
      }
    }
    return null;
  }
}

class PatternRuleChecker implements ValidationRuleChecker {
  applies(rules: FieldRules): boolean {
    return rules.pattern !== undefined;
  }

  validate(
    value: string,
    rules: FieldRules,
    fieldName: string,
    _form: HTMLFormElement
  ): string | null {
    if (rules.pattern !== undefined && !rules.pattern.test(value)) {
      return rules.messages?.pattern ?? `${fieldName} has invalid format`;
    }
    return null;
  }
}

class MatchesRuleChecker implements ValidationRuleChecker {
  applies(rules: FieldRules): boolean {
    return rules.matches !== undefined;
  }

  validate(
    value: string,
    rules: FieldRules,
    fieldName: string,
    form: HTMLFormElement
  ): string | null {
    if (rules.matches !== undefined) {
      const data = FormSerializer.toObject(form);
      const otherValue = data[rules.matches];
      // Use helper function to convert value to string
      const otherString = toStringValueHelper(otherValue);

      if (value !== otherString) {
        return rules.messages?.matches ?? `${fieldName} must match ${rules.matches}`;
      }
    }
    return null;
  }
}

class CustomRuleChecker implements ValidationRuleChecker {
  applies(rules: FieldRules): boolean {
    return rules.custom !== undefined;
  }

  validate(
    value: string,
    rules: FieldRules,
    fieldName: string,
    form: HTMLFormElement
  ): string | null {
    if (rules.custom !== undefined) {
      const result = rules.custom(value, form);
      if (result !== true) {
        return typeof result === 'string' ? result : `${fieldName} is invalid`;
      }
    }
    return null;
  }
}

export type CustomValidator = (value: string, form: HTMLFormElement) => boolean | string;

/**
 * Async validator function type.
 * Returns null for valid, or error message string for invalid.
 */
export type AsyncValidator = (
  value: string,
  field: string,
  form: HTMLFormElement
) => Promise<string | null>;

/** Default debounce delay for async validation in milliseconds */
const DEFAULT_ASYNC_DEBOUNCE_MS = 300;

export interface FieldRules {
  /** Field is required */
  readonly required?: boolean;
  /** Minimum length */
  readonly minLength?: number;
  /** Maximum length */
  readonly maxLength?: number;
  /** Minimum numeric value */
  readonly min?: number;
  /** Maximum numeric value */
  readonly max?: number;
  /** Must be a valid email */
  readonly email?: boolean;
  /** Must be a valid URL */
  readonly url?: boolean;
  /** Must be numeric */
  readonly number?: boolean;
  /** Must be an integer */
  readonly integer?: boolean;
  /** Must match pattern */
  readonly pattern?: RegExp;
  /** Must match another field */
  readonly matches?: string;
  /** Custom validation function */
  readonly custom?: CustomValidator;
  /** Async custom validation function */
  readonly asyncCustom?: AsyncValidator;
  /** Debounce delay for async validation in milliseconds (default: 300) */
  readonly asyncDebounceMs?: number;
  /** Custom error messages */
  readonly messages?: Partial<Record<keyof FieldRules, string>>;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: Record<string, string[]>;
  readonly firstError: string | null;
}

export interface FieldValidationResult {
  readonly valid: boolean;
  readonly errors: string[];
  readonly firstError: string | null;
}

export class FormValidator {
  private readonly rules: Record<string, FieldRules>;
  private readonly debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private readonly pendingValidations: Map<string, Promise<string | null>> = new Map();

  private constructor(rules: Record<string, FieldRules>) {
    this.rules = rules;
  }

  // =========================================================================
  // Factory Methods
  // =========================================================================

  /**
   * Create a form validator with the given rules.
   */
  static create(rules: Record<string, FieldRules>): FormValidator {
    return new FormValidator(rules);
  }

  // =========================================================================
  // Validation
  // =========================================================================

  /**
   * Validate an entire form.
   */
  validate(form: HTMLFormElement): ValidationResult {
    const data = FormSerializer.toObject(form);
    const errors: Record<string, string[]> = {};
    let firstError: string | null = null;

    for (const [fieldName, fieldRules] of Object.entries(this.rules)) {
      const value = data[fieldName];
      const stringValue = FormValidator.toStringValue(value);
      const fieldErrors = this.validateValue(stringValue, fieldRules, fieldName, form);

      if (fieldErrors.length > 0) {
        errors[fieldName] = fieldErrors;
        firstError ??= fieldErrors[0] ?? null;
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
      firstError,
    };
  }

  /**
   * Validate a single field.
   */
  validateField(form: HTMLFormElement, fieldName: string): FieldValidationResult {
    const rules = this.rules[fieldName];

    if (rules === undefined) {
      return { valid: true, errors: [], firstError: null };
    }

    const data = FormSerializer.toObject(form);
    const value = data[fieldName];
    const stringValue = FormValidator.toStringValue(value);
    const errors = this.validateValue(stringValue, rules, fieldName, form);

    return {
      valid: errors.length === 0,
      errors,
      firstError: errors[0] ?? null,
    };
  }

  /**
   * Validate a single value against rules (without form context).
   */
  validateValue(
    value: string,
    rules: FieldRules,
    fieldName: string,
    form: HTMLFormElement
  ): string[] {
    const errors: string[] = [];

    // Check required first - if it fails, return early
    const requiredChecker = new RequiredRuleChecker();
    if (requiredChecker.applies(rules)) {
      const requiredError = requiredChecker.validate(value, rules, fieldName, form);
      if (requiredError !== null) {
        errors.push(requiredError);
        return errors; // Don't validate further if empty and required
      }
    }

    // Skip other validations if empty and not required
    if (!value.trim()) {
      return errors;
    }

    // Apply all other validation rules
    const ruleCheckers: ValidationRuleChecker[] = [
      new MinLengthRuleChecker(),
      new MaxLengthRuleChecker(),
      new EmailRuleChecker(),
      new UrlRuleChecker(),
      new NumberRuleChecker(),
      new IntegerRuleChecker(),
      new MinRuleChecker(),
      new MaxRuleChecker(),
      new PatternRuleChecker(),
      new MatchesRuleChecker(),
      new CustomRuleChecker(),
    ];

    for (const checker of ruleCheckers) {
      if (checker.applies(rules)) {
        const error = checker.validate(value, rules, fieldName, form);
        if (error !== null) {
          errors.push(error);
        }
      }
    }

    return errors;
  }

  // =========================================================================
  // Async Validation
  // =========================================================================

  /**
   * Validate a single field asynchronously.
   * Runs sync validators first, then async validators.
   *
   * @param field - The form field element to validate
   * @param options - Optional configuration
   * @param options.skipDebounce - Skip debouncing for immediate validation
   * @returns Promise resolving to field validation result
   */
  async validateFieldAsync(
    field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
    options?: { skipDebounce?: boolean }
  ): Promise<FieldValidationResult> {
    const fieldName = field.name;
    const form = field.form;

    if (!form) {
      return { valid: true, errors: [], firstError: null };
    }

    const rules = this.rules[fieldName];
    if (rules === undefined) {
      return { valid: true, errors: [], firstError: null };
    }

    // Run sync validation first
    const syncResult = this.validateField(form, fieldName);
    const errors: string[] = [...syncResult.errors];

    // Skip async validation if sync validation failed for required field
    // or if there's no async validator
    if (rules.asyncCustom === undefined) {
      return syncResult;
    }

    // Skip async if required validation already failed (no value to validate)
    const data = FormSerializer.toObject(form);
    const value = data[fieldName];
    const stringValue = FormValidator.toStringValue(value);

    if (!stringValue.trim() && rules.required !== true) {
      return { valid: errors.length === 0, errors, firstError: errors[0] ?? null };
    }

    if (!stringValue.trim() && rules.required === true) {
      return { valid: false, errors, firstError: errors[0] ?? null };
    }

    // Run async validation with optional debouncing
    const skipDebounce = options?.skipDebounce ?? false;
    const debounceMs = rules.asyncDebounceMs ?? DEFAULT_ASYNC_DEBOUNCE_MS;

    try {
      const asyncError = await this.runAsyncValidator(
        fieldName,
        stringValue,
        form,
        rules.asyncCustom,
        skipDebounce ? 0 : debounceMs
      );

      if (asyncError !== null) {
        errors.push(asyncError);
      }
    } catch (error) {
      // Handle promise rejection gracefully
      const errorMessage =
        error instanceof Error ? error.message : `${fieldName} async validation failed`;
      errors.push(errorMessage);
    }

    return {
      valid: errors.length === 0,
      errors,
      firstError: errors[0] ?? null,
    };
  }

  /**
   * Validate an entire form asynchronously.
   * Runs all sync validators first, then all async validators in parallel.
   *
   * @param form - The form element to validate
   * @returns Promise resolving to validation result
   */
  async validateFormAsync(form: HTMLFormElement): Promise<ValidationResult> {
    const data = FormSerializer.toObject(form);
    const errors: Record<string, string[]> = {};
    let firstError: string | null = null;

    // Collect async validation promises
    const asyncValidations: Array<{
      fieldName: string;
      promise: Promise<string | null>;
    }> = [];

    for (const [fieldName, fieldRules] of Object.entries(this.rules)) {
      const value = data[fieldName];
      const stringValue = FormValidator.toStringValue(value);

      // Run sync validation
      const syncErrors = this.validateValue(stringValue, fieldRules, fieldName, form);

      if (syncErrors.length > 0) {
        errors[fieldName] = syncErrors;
        firstError ??= syncErrors[0] ?? null;
      }

      // Queue async validation if applicable
      if (fieldRules.asyncCustom !== undefined) {
        // Skip async if no value and not required
        if (!stringValue.trim() && fieldRules.required !== true) {
          continue;
        }

        // Skip async if required validation failed
        if (!stringValue.trim() && fieldRules.required === true) {
          continue;
        }

        asyncValidations.push({
          fieldName,
          promise: this.runAsyncValidatorDirect(
            stringValue,
            fieldName,
            form,
            fieldRules.asyncCustom
          ),
        });
      }
    }

    // Run all async validations in parallel
    const asyncResults = await Promise.allSettled(asyncValidations.map((v) => v.promise));

    // Process async results
    asyncResults.forEach((result, index) => {
      const { fieldName } = asyncValidations[index]!;

      if (result.status === 'fulfilled') {
        if (result.value !== null) {
          errors[fieldName] ??= [];
          errors[fieldName].push(result.value);
          firstError ??= result.value;
        }
      } else {
        // Handle rejection gracefully
        const errorMessage =
          result.reason instanceof Error
            ? result.reason.message
            : `${fieldName} async validation failed`;

        errors[fieldName] ??= [];
        errors[fieldName].push(errorMessage);
        firstError ??= errorMessage;
      }
    });

    return {
      valid: Object.keys(errors).length === 0,
      errors,
      firstError,
    };
  }

  /**
   * Run an async validator with debouncing.
   * @internal
   */
  private runAsyncValidator(
    fieldName: string,
    value: string,
    form: HTMLFormElement,
    validator: AsyncValidator,
    debounceMs: number
  ): Promise<string | null> {
    // Clear any existing timer for this field
    const existingTimer = this.debounceTimers.get(fieldName);
    if (existingTimer !== undefined) {
      clearTimeout(existingTimer);
    }

    // Cancel any pending validation
    this.pendingValidations.delete(fieldName);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.debounceTimers.delete(fieldName);

        const validationPromise = validator(value, fieldName, form);
        this.pendingValidations.set(fieldName, validationPromise);

        validationPromise
          .then((result) => {
            // Only resolve if this is still the pending validation
            if (this.pendingValidations.get(fieldName) === validationPromise) {
              this.pendingValidations.delete(fieldName);
              resolve(result);
            }
          })
          .catch((error: unknown) => {
            if (this.pendingValidations.get(fieldName) === validationPromise) {
              this.pendingValidations.delete(fieldName);
              reject(error instanceof Error ? error : new Error(String(error)));
            }
          });
      }, debounceMs);

      this.debounceTimers.set(fieldName, timer);
    });
  }

  /**
   * Run an async validator directly without debouncing.
   * Used for form-level async validation.
   * @internal
   */
  private async runAsyncValidatorDirect(
    value: string,
    fieldName: string,
    form: HTMLFormElement,
    validator: AsyncValidator
  ): Promise<string | null> {
    return validator(value, fieldName, form);
  }

  // =========================================================================
  // Event Handling
  // =========================================================================

  /**
   * Attach validation to form submit event.
   * Prevents submission if validation fails.
   * @returns Cleanup function
   */
  onSubmit(
    form: HTMLFormElement,
    handler: (data: Record<string, unknown>, result: ValidationResult) => void
  ): CleanupFn {
    const submitHandler = (event: SubmitEvent): void => {
      const result = this.validate(form);
      const data = FormSerializer.toObject(form);

      if (!result.valid) {
        event.preventDefault();
      }

      handler(data, result);
    };

    form.addEventListener('submit', submitHandler);

    return (): void => {
      form.removeEventListener('submit', submitHandler);
    };
  }

  /**
   * Attach real-time validation to form fields.
   * Validates on blur or input events.
   * @returns Cleanup function
   */
  onFieldChange(
    form: HTMLFormElement,
    handler: (fieldName: string, result: FieldValidationResult) => void,
    options?: { validateOn?: 'blur' | 'input' | 'change' }
  ): CleanupFn {
    const { validateOn = 'blur' } = options ?? {};

    const fieldHandler = (event: Event): void => {
      const target = event.target;

      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLTextAreaElement
      ) {
        const fieldName = target.name;

        if (fieldName && fieldName in this.rules) {
          const result = this.validateField(form, fieldName);
          handler(fieldName, result);
        }
      }
    };

    form.addEventListener(validateOn, fieldHandler);

    return () => {
      form.removeEventListener(validateOn, fieldHandler);
    };
  }

  // =========================================================================
  // Static Validators
  // =========================================================================

  /**
   * Check if value is a valid email.
   */
  static isValidEmail(value: string): boolean {
    // RFC 5322 compliant email regex (simplified)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  }

  /**
   * Check if value is a valid URL.
   */
  static isValidUrl(value: string): boolean {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if value is numeric.
   */
  static isNumeric(value: string): boolean {
    // Trim and check for empty string
    const trimmed = value.trim();
    if (trimmed === '') return false;

    // Use Number() which is stricter than parseFloat()
    // Number('42abc') returns NaN, while parseFloat('42abc') returns 42
    const num = Number(trimmed);
    return !isNaN(num) && isFinite(num);
  }

  /**
   * Check if value is an integer.
   */
  static isInteger(value: string): boolean {
    return FormValidator.isNumeric(value) && Number.isInteger(parseFloat(value));
  }

  /**
   * Safely convert a form value to string.
   * @internal
   */
  private static toStringValue(value: unknown): string {
    return toStringValueHelper(value);
  }
}
