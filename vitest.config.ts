import { coverageConfigDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test environment (browser simulation)
    environment: 'happy-dom',

    // Setup files (fake-indexeddb polyfill)
    setupFiles: ['./tests/setup.ts'],

    // Test file patterns
    include: ['tests/**/*.{test,spec}.ts'],
    exclude: ['**/node_modules/**', 'dist'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [...coverageConfigDefaults.exclude, 'src/**/index.ts', '**/*.test.ts'],
      // Coverage thresholds: High coverage with realistic browser API testing limits
      // Note: Some browser-specific APIs (getComputedStyle, scroll behavior, media queries)
      // don't fully work in jsdom/happy-dom, causing uncovered branches.
      // Function coverage is 99% because V8 counts internal lambda callbacks as separate
      // functions - these are covered by statement/line coverage.
      thresholds: {
        lines: 99,
        functions: 99,
        branches: 95,
        statements: 99,
      },
    },

    // Test output
    reporters: ['verbose'],

    // Performance
    globals: true,
    mockReset: true,
    restoreMocks: true,
    clearMocks: true,

    // Timeouts
    testTimeout: 5000,
    hookTimeout: 5000,

  },
});
