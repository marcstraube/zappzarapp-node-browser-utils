/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  mutate: ['src/**/*.ts', '!src/**/index.ts'],
  testRunner: 'vitest',
  checkers: [],
  reporters: ['html', 'clear-text', 'progress'],
  htmlReporter: { fileName: 'reports/mutation/mutation.html' },
  vitest_comment: 'vitest runner auto-detects vitest.config.ts',
  disableTypeChecks: 'src/**/*.ts',
  ignoreStatic: true,
  thresholds: { high: 80, low: 60, break: null },
  tempDirName: '.stryker-tmp',
  // concurrency: default = cpus - 1
};
