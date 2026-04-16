# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via GitHub's private vulnerability reporting:

1. Go to the
   [Security Advisories page](https://github.com/marcstraube/zappzarapp-node-browser-utils/security/advisories/new)
2. Click "Report a vulnerability"
3. Fill in the details

Alternatively, you can email security concerns to: **<security@marcstraube.de>**

### What to include in your report

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if available)

### Response Timeline

This is currently a solo-maintained project. I will respond as quickly as
possible, typically within a week. Critical vulnerabilities are prioritized.

### Disclosure Policy

- We follow coordinated vulnerability disclosure
- We will credit reporters (unless anonymity is requested)
- Security advisories will be published after fixes are released

## Security Practices

This library follows security-by-design principles:

### Cryptographic Randomness

All randomness uses `crypto.getRandomValues()` instead of `Math.random()`:

```typescript
// Correct - cryptographically secure
const buffer = new Uint32Array(1);
crypto.getRandomValues(buffer);
const secureRandom = buffer[0] / 0xffffffff;

// Avoided - predictable
const insecureRandom = Math.random();
```

### Input Validation

All external input is validated before processing:

- Storage keys: Validated format, control characters rejected
- Filenames: Path traversal characters rejected
- URLs: Validated structure, dangerous protocols blocked
- User content: Sanitized before DOM insertion

### Banned Patterns

The following patterns are never used:

| Pattern              | Risk           | Alternative             |
| -------------------- | -------------- | ----------------------- |
| `eval()`             | Code injection | Static code paths       |
| `new Function()`     | Code injection | Static code paths       |
| `innerHTML`          | XSS            | `textContent`, DOM APIs |
| `document.write()`   | XSS            | DOM APIs                |
| `setTimeout(string)` | Code injection | Function reference      |

### Secure Defaults

All APIs use secure defaults:

| API            | Default                | Reason                      |
| -------------- | ---------------------- | --------------------------- |
| Cookies        | `Secure`, `SameSite`   | Prevent interception        |
| Storage prefix | Required               | Prevent key collisions      |
| Logger         | Production-safe levels | No sensitive data leaked    |
| Network retry  | Limited attempts       | Prevent resource exhaustion |

### Content Security Policy Compatibility

This library is designed to work with strict CSP:

- No inline scripts or styles
- No dynamic code evaluation
- No external resource loading

### Dependency Security

- Minimal dependencies
- Regular security audits via `pnpm audit`
- Automated dependency updates

## Development Security

### Code Review Requirements

All changes require:

- Security impact assessment
- Review of input validation
- Test coverage for security cases

### CI/CD Security

- Automated security scanning (CodeQL)
- Dependency vulnerability checks
- Type checking catches type confusion attacks
- Test coverage prevents regressions
- Signed releases: GPG-signed tags and commits

## Known Limitations

### localStorage/sessionStorage

- Data is not encrypted at rest
- Subject to XSS if application has vulnerabilities
- Limited to same-origin access

Recommendation: Do not store sensitive data (tokens, PII) in client storage.

### Clipboard API

- Requires user gesture in some browsers
- Contents visible to other applications
- May be blocked by browser policies

### Notifications

- Can be blocked by user
- No delivery guarantee
- Content visible system-wide

## Changelog

Security-related changes are tagged with `security` in commit messages and
documented in CHANGELOG.md.
