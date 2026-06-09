/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  mutate: ['src/**/*.ts', '!src/**/index.ts'],
  testRunner: 'vitest',
  // Explicit plugin list: Stryker 9.6.x auto-discovery fails to find plugins
  // under pnpm's symlinked node_modules ("no TestRunner plugins were loaded").
  plugins: ['@stryker-mutator/vitest-runner'],
  checkers: [],
  reporters: ['html', 'clear-text', 'progress'],
  htmlReporter: { fileName: 'reports/mutation/mutation.html' },
  vitest_comment: 'vitest runner auto-detects vitest.config.ts',
  disableTypeChecks: 'src/**/*.ts',
  ignoreStatic: true,
  thresholds: { high: 85, low: 70, break: 85 },
  tempDirName: '.stryker-tmp',
  // concurrency: default = cpus - 1
};
