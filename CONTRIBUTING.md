# Contributing to @zappzarapp/browser-utils

Thank you for your interest in contributing!

## Development Setup

```bash
git clone git@github.com:marcstraube/zappzarapp-node-browser-utils.git
cd zappzarapp-node-browser-utils
pnpm install
```

## Running Tests

```bash
pnpm run test              # Run all tests
pnpm run test:watch        # Run tests in watch mode
pnpm run test:coverage     # Run tests with coverage report
```

## Code Quality

All contributions must pass:

```bash
pnpm run lint              # ESLint (no warnings allowed)
pnpm run lint:fix          # Auto-fix lint issues
pnpm run typecheck         # TypeScript strict mode
pnpm run format:check      # Prettier formatting check
pnpm run format            # Auto-format code
pnpm run quality           # Run all quality checks
```

### Quality Requirements

- TypeScript strict mode with no errors
- ESLint with zero warnings (`--max-warnings=0`)
- 100% test coverage for new code
- Prettier formatting
- Minimum 85% mutation score (Stryker, enforced in CI)

## Commit Signing

**CRITICAL: All commits MUST be GPG-signed.**

This is enforced in CI/CD:

- GitHub Actions will fail on unsigned commits
- Pull requests with unsigned commits will be rejected

### Setup GPG Signing

```bash
# Generate GPG key
gpg --full-generate-key

# List keys
gpg --list-secret-keys --keyid-format=long

# Export public key
gpg --armor --export YOUR_KEY_ID

# Configure Git
git config --global user.signingkey YOUR_KEY_ID
git config --global commit.gpgsign true
git config --global tag.gpgSign true
```

### Add GPG key to GitHub

1. Go to <https://github.com/settings/keys>
2. Click "New GPG key"
3. Paste your public key

See
[GitHub's GPG documentation](https://docs.github.com/en/authentication/managing-commit-signature-verification)
for full setup instructions.

## Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat: add new feature` - minor version bump
- `fix: resolve bug` - patch version bump
- `security: fix vulnerability` - patch + Security section in CHANGELOG
- `feat!: breaking change` - major version bump
- `docs:`, `style:`, `refactor:`, `test:`, `chore:` - no version bump

Examples:

```text
feat(storage): add encryption support
fix(cookie): handle SameSite in older browsers
docs: update installation instructions
test(form): add validation edge cases
security: sanitize user input in download filename
```

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`feature/your-feature`)
3. Make your changes
4. Run `pnpm run quality` - all checks must pass
5. Push to your fork
6. Create a Pull Request

### PR Requirements

- [ ] All commits are GPG-signed
- [ ] All tests pass (`pnpm run test`)
- [ ] Code style is clean (`pnpm run lint`)
- [ ] TypeScript compiles (`pnpm run typecheck`)
- [ ] Formatting is correct (`pnpm run format:check`)
- [ ] New features have tests (100% coverage)
- [ ] Documentation is updated

## Security Requirements

This is a security-focused package. All contributions must:

- Use cryptographically secure functions (`crypto.getRandomValues()`)
- Avoid dangerous patterns (`eval`, `innerHTML`, `document.write`)
- Include security-focused test cases
- Validate all external input
- Document security implications

## Security Vulnerabilities

**Do not report security vulnerabilities via public issues.**

See [SECURITY.md](SECURITY.md) for responsible disclosure process.

## Questions?

Open a discussion on GitHub or reach out via <email@marcstraube.de>
