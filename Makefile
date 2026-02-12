.PHONY: help build check clean dev docs format format-check lint lint-fix lint-md lint-md-fix lint-secrets mutation quality sbom security size size-check test test-coverage test-watch typecheck

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

build: ## Build TypeScript
	pnpm run build

check: format-check lint typecheck test ## Run all checks

clean: ## Clean build artifacts
	rm -rf dist node_modules coverage .eslintcache docs/api

dev: ## Watch and rebuild on changes
	pnpm run dev

docs: ## Generate API documentation
	pnpm run docs

format: ## Fix code formatting (Prettier)
	pnpm run format

format-check: ## Check code formatting (Prettier)
	pnpm run format:check

install: ## Install dependencies
	pnpm install

lint: ## Run ESLint
	pnpm run lint

lint-fix: ## Fix ESLint issues
	pnpm run lint:fix

lint-md: ## Lint markdown files
	pnpm run lint:md

lint-md-fix: ## Fix markdown formatting
	pnpm run lint:md:fix

lint-secrets: ## Check for secrets in code
	pnpm run lint:secrets

mutation: ## Run Stryker mutation testing
	pnpm run mutation

quality: ## Run all quality checks
	pnpm run quality

sbom: ## Generate CycloneDX SBOM
	pnpm run sbom

security: ## Run security audit
	pnpm audit --audit-level=moderate

size: ## Check bundle size
	pnpm run size

size-check: ## Check bundle size against limits
	pnpm run size:check

test: ## Run tests
	pnpm run test

test-coverage: ## Run tests with coverage report
	pnpm run test:coverage

test-watch: ## Run tests in watch mode
	pnpm run test:watch

typecheck: ## Run TypeScript type checking
	pnpm run typecheck

.DEFAULT_GOAL := help
