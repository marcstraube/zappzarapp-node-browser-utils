# Claude Instructions

Project-specific instructions for Claude Code.

## Quick Reference

| Resource       | Path                                |
| -------------- | ----------------------------------- |
| Project config | `./claude/PROJECT.md`               |
| Agents         | `./claude/agents/*.md`              |
| Quality config | `tsconfig.json`, `vitest.config.ts` |
| Linting        | `eslint.config.js`                  |

## Before Any Task

1. Read `PROJECT.md` for package info, structure, and targets
2. Read relevant agent file for task-specific guidelines
3. Read tool config files as needed

---

## Agents

| Agent             | Use For                           |
| ----------------- | --------------------------------- |
| `coding`          | TypeScript implementation         |
| `test-generator`  | Creating tests (100% coverage)    |
| `security-review` | Security audit                    |
| `architecture`    | Module structure and dependencies |
| `refactoring`     | Code modernization                |
| `documentation`   | README, TSDoc, examples           |

### Agent Selection

```text
New feature/code     --> coding + test-generator
Security-sensitive   --> coding + test-generator + security-review
Structure changes    --> architecture + coding
Code modernization   --> refactoring
Docs/examples        --> documentation
```

---

## Quality Gates

All must pass before merge (see `PROJECT.md` for commands):

- [ ] TypeScript (strict mode, no errors)
- [ ] ESLint (no warnings)
- [ ] Vitest (100% coverage)
- [ ] Build succeeds

---

## Core Principles

### Security First

- Cryptographic randomness only (`crypto.getRandomValues()`)
- Input validation for all external data
- No eval, Function constructor, or dynamic imports from user input
- Secure defaults, explicit opt-in for permissive

### Code Quality

- Immutable patterns (readonly, const assertions)
- Type safety (strict TypeScript, no `any`)
- Module boundaries (explicit exports)
- 100% test coverage

### No Suppressions

Suppressions are the last resort. If unavoidable:

- Document why no alternative exists
- Verify no security implication
- Add justification in code/config

---

## Commit Conventions

Format: `<type>(<scope>): <description>`

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `security`

GPG-signed commits are recommended but not required.

---

## Language

- **English always**: Code, documentation, commits, technical content
- **User's language**: Direct questions and confirmations only
