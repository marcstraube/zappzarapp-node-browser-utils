import { fixupPluginRules } from '@eslint/compat';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import boundariesPlugin from 'eslint-plugin-boundaries';
import prettierConfig from 'eslint-config-prettier';
import jsdocPlugin from 'eslint-plugin-jsdoc';
import prettierPlugin from 'eslint-plugin-prettier';
import securityPlugin from 'eslint-plugin-security';
import sonarjsPlugin from 'eslint-plugin-sonarjs';

export default [
  // Ignore patterns
  {
    ignores: ['node_modules/**', 'dist/**', 'coverage/**', '*.config.js', '*.config.ts'],
  },

  // TypeScript files
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.json',
      },
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        console: 'readonly',
        URL: 'readonly',
        Blob: 'readonly',
        crypto: 'readonly',
        KeyboardEvent: 'readonly',
        Element: 'readonly',
        HTMLElement: 'readonly',
        HTMLAnchorElement: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      boundaries: boundariesPlugin,
      jsdoc: jsdocPlugin,
      prettier: prettierPlugin,
      security: fixupPluginRules(securityPlugin),
      sonarjs: fixupPluginRules(sonarjsPlugin),
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
        },
      },
      'boundaries/elements': [
        { type: 'entry', pattern: 'src/index.ts', mode: 'file' },
        { type: 'core', pattern: 'src/core' },
        { type: 'module', pattern: 'src/*', capture: ['family'] },
      ],
    },
    rules: {
      // TypeScript recommended rules
      ...tsPlugin.configs['recommended'].rules,
      ...tsPlugin.configs['recommended-requiring-type-checking'].rules,

      // Prettier integration
      'prettier/prettier': 'error',

      // Security rules
      'security/detect-bidi-characters': 'error',
      'security/detect-eval-with-expression': 'error',
      'security/detect-unsafe-regex': 'error',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-possible-timing-attacks': 'warn',
      'security/detect-object-injection': 'off',

      // SonarJS - Code quality
      'sonarjs/prefer-immediate-return': 'warn',
      'sonarjs/no-identical-functions': 'warn',
      'sonarjs/no-duplicated-branches': 'warn',
      'sonarjs/no-redundant-jump': 'warn',
      'sonarjs/no-useless-catch': 'warn',
      'sonarjs/no-small-switch': 'warn',
      'sonarjs/prefer-single-boolean-return': 'warn',
      'sonarjs/cognitive-complexity': ['warn', 15],

      // TypeScript specific rules
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'warn',

      // Redundant code detection
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
      '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'warn',
      '@typescript-eslint/no-redundant-type-constituents': 'warn',
      '@typescript-eslint/no-useless-empty-export': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'warn',

      // Relax unsafe rules for browser DOM APIs
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',

      // Code quality rules
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      curly: ['error', 'all'],

      // Prevent confusing patterns (PhpStorm warnings)
      'no-sequences': ['error', { allowInParentheses: false }], // Disallow comma expressions

      // Module boundary enforcement
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          rules: [
            // Entry point can import any module
            {
              from: { type: 'entry' },
              allow: [{ to: { type: 'core' } }, { to: { type: 'module' } }],
            },
            // Core can only import from core (internal)
            {
              from: { type: 'core' },
              allow: [{ to: { type: 'core' } }],
            },
            // Domain modules can import from core and from themselves (same family)
            {
              from: { type: 'module' },
              allow: [
                { to: { type: 'core' } },
                { to: { type: 'module', captured: { family: '{{ from.captured.family }}' } } },
              ],
            },
            // session extends BaseStorageManager from storage
            {
              from: { type: 'module', captured: { family: 'session' } },
              allow: [{ to: { type: 'module', captured: { family: 'storage' } } }],
            },
            // offline integrates indexeddb persistence with network status
            {
              from: { type: 'module', captured: { family: 'offline' } },
              allow: [
                { to: { type: 'module', captured: { family: 'indexeddb' } } },
                { to: { type: 'module', captured: { family: 'network' } } },
              ],
            },
          ],
        },
      ],

      // JSDoc validation
      'jsdoc/check-param-names': 'error', // @param names must match function parameters
      'jsdoc/check-tag-names': 'error', // Only valid JSDoc tags
      'jsdoc/no-types': 'error', // Don't use types in JSDoc (TypeScript handles this)
    },
  },

  // Test files - relax some rules
  {
    files: ['tests/**/*.ts', '**/*.test.ts', '**/*.spec.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.json',
      },
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        console: 'readonly',
        URL: 'readonly',
        Blob: 'readonly',
        KeyboardEvent: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      ...tsPlugin.configs['recommended'].rules,

      // Prettier integration
      'prettier/prettier': 'error',

      // Relax rules for tests
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-explicit-any': 'off',

      // Code quality
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  // Disable formatting rules that conflict with Prettier
  prettierConfig,
];
