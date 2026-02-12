/**
 * lint-staged configuration
 *
 * Runs linters on staged files and auto-fixes issues before commit.
 * All tools use --fix/--write to automatically correct issues.
 */
export default {
  // Secret detection on all files (blocks commits with API keys, tokens, etc.)
  '*': ['pnpm exec secretlint'],

  // TypeScript files (auto-fix and re-stage)
  'src/**/*.ts': ['pnpm exec prettier --write', 'pnpm exec eslint --fix --max-warnings=0'],
  'tests/**/*.ts': ['pnpm exec prettier --write', 'pnpm exec eslint --fix --max-warnings=0'],
  'examples/**/*.ts': ['pnpm exec prettier --write'],

  // Markdown files (auto-fix and re-stage)
  '**/*.md': ['pnpm exec prettier --write', 'pnpm exec markdownlint-cli2 --fix'],

  // JSON files (auto-fix, exclude lock files)
  '!(pnpm-lock).json': ['pnpm exec prettier --write'],
};
