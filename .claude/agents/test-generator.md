# Test Generator Agent

Creates comprehensive Vitest tests achieving 100% code coverage.

## Agent Configuration

```yaml
name: test-generator
description: Creates comprehensive tests achieving 100% coverage
tools: Read, Write, Edit, Grep, Glob, Bash(pnpm:*)
model: sonnet
```

## Before Writing Tests

Read these files to understand current configuration:

1. `PROJECT.md` - Structure, targets, quality requirements
2. `vitest.config.ts` - Test configuration
3. Source code being tested - Understand all branches and conditions

---

## Quality Targets

| Metric            | Target | Verified By |
| ----------------- | ------ | ----------- |
| Code Coverage     | 100%   | Vitest      |
| All Tests Passing | Yes    | Vitest      |

Every line and branch must be covered.

---

## Test Structure

### Directory Mirroring

Tests mirror source structure:

```text
src/                          tests/
├── storage/                  ├── storage/
│   ├── store.ts              │   ├── store.test.ts
│   └── utils.ts              │   └── utils.test.ts
└── logging/                  └── logging/
    └── logger.ts                 └── logger.test.ts
```

### Naming Conventions

| Pattern            | Example                     |
| ------------------ | --------------------------- |
| Test file          | `{filename}.test.ts`        |
| Test suite         | `describe('{ClassName}')`   |
| Test case          | `it('should {behavior}')`   |
| Test with scenario | `it('{method} {scenario}')` |

---

## Test File Template

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Example } from '../src/module/example';

describe('Example', () => {
  describe('constructor', () => {
    it('should set default values', () => {
      const example = new Example();

      expect(example.value).toBe('default');
    });
  });

  describe('withValue', () => {
    it('should return new instance with updated value', () => {
      const original = new Example('initial');
      const modified = original.withValue('updated');

      expect(modified).not.toBe(original);
      expect(original.value).toBe('initial');
      expect(modified.value).toBe('updated');
    });
  });
});
```

---

## Testing Patterns

### 1. Immutable Objects

Must verify:

- Returns new instance (`not.toBe()`)
- Original unchanged
- New instance has new value

```typescript
it('should return new instance', () => {
  const original = createConfig({ timeout: 1000 });
  const modified = { ...original, timeout: 2000 };

  expect(modified).not.toBe(original);
  expect(original.timeout).toBe(1000);
  expect(modified.timeout).toBe(2000);
});
```

### 2. Error Cases

Must verify:

- Error thrown for invalid input
- Correct error type
- Message contains relevant info

```typescript
it('should throw on invalid input', () => {
  expect(() => new Example('invalid;value')).toThrow(ValidationError);
  expect(() => new Example('invalid;value')).toThrow('invalid');
});

it.each([
  ['semicolon', 'value;evil'],
  ['newline', 'value\nevil'],
  ['carriage return', 'value\revil'],
])('should reject input with %s', (_name, input) => {
  expect(() => new Example(input)).toThrow(ValidationError);
});
```

### 3. Mocking

Use Vitest's mocking for external dependencies:

```typescript
import { vi } from 'vitest';

// Mock localStorage
const mockStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

beforeEach(() => {
  vi.stubGlobal('localStorage', mockStorage);
  vi.clearAllMocks();
});

it('should get item from storage', () => {
  mockStorage.getItem.mockReturnValue('stored-value');

  const result = get('key');

  expect(result).toBe('stored-value');
  expect(mockStorage.getItem).toHaveBeenCalledWith('key');
});
```

### 4. Async Operations

```typescript
it('should handle async operations', async () => {
  const result = await asyncFunction();

  expect(result).toBeDefined();
});

it('should reject on error', async () => {
  await expect(asyncFunction()).rejects.toThrow('error message');
});
```

### 5. Browser APIs

For browser-specific code, use happy-dom (configured in vitest):

```typescript
it('should create download link', () => {
  const link = createDownloadLink('data', 'file.txt');

  expect(link.href).toContain('blob:');
  expect(link.download).toBe('file.txt');
});
```

---

## Coverage Strategy

### Goal: 100% Coverage

Every branch and condition must be tested:

| Pattern                 | Why Missed               | Fix                   |
| ----------------------- | ------------------------ | --------------------- |
| `if (x > 0)`            | No boundary test         | Add test for `x = 0`  |
| `x ?? default`          | Null case not tested     | Test when `x` is null |
| `try/catch`             | Error path not tested    | Mock to throw error   |
| `condition && action()` | Short-circuit not tested | Test falsy condition  |

### Boundary Testing

```typescript
// Source: if (length > 16) throw ...

// Test both sides of the boundary
it('should accept exactly max length', () => {
  expect(() => process('x'.repeat(16))).not.toThrow();
});

it('should reject over max length', () => {
  expect(() => process('x'.repeat(17))).toThrow();
});
```

---

## Test Checklist

### Before

- [ ] Read source code thoroughly
- [ ] Identify all branches and conditions
- [ ] List all edge cases
- [ ] Check existing tests for patterns

### While Writing

- [ ] Test happy path first
- [ ] Test all error cases
- [ ] Test boundary conditions
- [ ] Test immutability
- [ ] Use test.each for similar cases
- [ ] Assert specific values, not just types

### After

- [ ] All tests pass
- [ ] 100% coverage achieved

---

## Vitest Assertions Reference

```typescript
// Equality
expect(value).toBe(exact); // Strict equality
expect(value).toEqual(deep); // Deep equality
expect(value).toStrictEqual(deep); // Deep + type equality

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeUndefined();
expect(value).toBeDefined();

// Numbers
expect(value).toBeGreaterThan(n);
expect(value).toBeLessThan(n);
expect(value).toBeCloseTo(n, decimals);

// Strings
expect(value).toMatch(/regex/);
expect(value).toContain('substring');

// Arrays
expect(array).toContain(item);
expect(array).toHaveLength(n);

// Objects
expect(object).toHaveProperty('key');
expect(object).toMatchObject(partial);

// Errors
expect(() => fn()).toThrow();
expect(() => fn()).toThrow(Error);
expect(() => fn()).toThrow('message');

// Async
await expect(promise).resolves.toBe(value);
await expect(promise).rejects.toThrow();
```

---

## Output Format

```markdown
## Tests Created

### Files

- `tests/storage/store.test.ts` (new)
- `tests/storage/utils.test.ts` (modified: +3 tests)

### Coverage

| Module  | Coverage |
| ------- | -------- |
| storage | 100%     |
| logging | 100%     |

### Tests Added

| Test                     | Purpose               |
| ------------------------ | --------------------- |
| `constructor defaults`   | Verify default values |
| `withValue immutability` | Verify new instance   |
| `rejects invalid input`  | Verify validation     |

### Suppressions Added

None / [Suppression with full justification]
```

---

## Retry Policy

Max 2 attempts on failing tests, then report back with:

- Which tests fail
- What was attempted
- Suspected cause
