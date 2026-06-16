# Contributing to MyFamilyButler 🏠

Thank you for your interest in contributing to MyFamilyButler! Community
contributions help make this project more reliable, fast, and accessible to busy
families worldwide.

Please read this guide and our [Code of Conduct](./CODE_OF_CONDUCT.md) before
participating.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Proposing Features](#proposing-features)
  - [Security Issues](#security-issues)
  - [Pull Requests](#pull-requests)
- [Development Setup](#development-setup)
- [Branch Naming](#branch-naming)
- [Commit Messages](#commit-messages)
- [Code Style](#code-style)
- [Testing](#testing)
- [Documentation](#documentation)
- [Release Notes](#release-notes)
- [Getting Help](#getting-help)

---

## Code of Conduct

By participating in this project, you agree to maintain a respectful, welcoming,
and collaborative environment for all contributors. See
[CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).

## How to Contribute

### Reporting Bugs

1. Search the existing
   [GitHub Issues](https://github.com/myfamilybutler/myfamilybutler/issues) to
   verify the bug has not already been reported.
2. If not, open a new issue using the **🐛 Bug Report** template.
3. Include:
   - A clear summary
   - Step-by-step reproduction instructions
   - Expected vs. actual behavior
   - Relevant logs, screenshots, or environment details

### Proposing Features

1. Search existing issues for similar proposals.
2. Open a new issue using the **✨ Feature Request** template.
3. Describe the problem, proposed solution, and any alternatives considered.

### Security Issues

Please **do not** open public issues for security vulnerabilities. Report them
privately via
[GitHub Security Advisories](https://github.com/myfamilybutler/myfamilybutler/security/advisories/new)
or email **myfamilybutler@gmail.com**.

See [docs/SECURITY.md](./docs/SECURITY.md) for our security controls and
incident response process.

### Pull Requests

1. **Fork the repository** to your personal GitHub account.
2. **Create a branch** following our [branch naming conventions](#branch-naming).
3. **Make focused changes.** Keep PRs small and single-purpose when possible.
4. **Commit** using clear [commit messages](#commit-messages).
5. **Run the quality gates** locally:
   ```bash
   npm run lint
   npm run build
   npm test -- --run
   ```
6. **Push the branch** to your fork:
   ```bash
   git push origin feat/your-feature-name
   ```
7. **Open a Pull Request** against the `main` branch of
   `myfamilybutler/myfamilybutler`.
8. **Fill out the PR template.** PRs must pass CI and maintainers' review before
   merging.

> If your change touches architecture, auth, security, data models, AI behavior,
> or CI/CD, a multi-role review may be required per
> [docs/AI_OPERATING_MODEL.md](./docs/AI_OPERATING_MODEL.md).

## Development Setup

See [README.md](./README.md#quick-start) for the minimal quick start, and
[docs/DEVELOPER_GUIDE.md](./docs/DEVELOPER_GUIDE.md) for the full setup.

Quick version:

```bash
git clone https://github.com/myfamilybutler/myfamilybutler.git
cd myfamilybutler
npm install
cp .env.local.example .env.local
npm run dev
```

Use Node.js 22+ (see [`.nvmrc`](./.nvmrc)).

## Branch Naming

Use descriptive prefixes so maintainers can quickly understand the intent:

| Prefix | Use for |
| ------ | ------- |
| `feat/` | New features or significant enhancements |
| `fix/` | Bug fixes |
| `docs/` | Documentation-only changes |
| `refactor/` | Code restructuring with no behavior change |
| `test/` | Adding or updating tests |
| `chore/` | Maintenance, dependency updates, tooling |
| `security/` | Security fixes or hardening |

Examples:

```bash
git checkout -b feat/weekly-digest
git checkout -b fix/whatsapp-image-parse
git checkout -b docs/update-onboarding
```

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/) to keep
the history readable and to enable automated changelog generation.

Format:

```
<type>(<scope>): <short summary>

<body>

<footer>
```

Common types:

| Type | Description |
| ---- | ----------- |
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation change |
| `style` | Code style change (formatting, no logic change) |
| `refactor` | Code refactoring |
| `test` | Adding or updating tests |
| `chore` | Maintenance or tooling |
| `security` | Security fix |

Examples:

```
feat(messaging): add weekly digest command for WhatsApp

fix(ai): validate Gemini response schema before saving event

docs(readme): update environment variable table
```

## Code Style

- We use **ESLint** with the Next.js config.
- Run `npm run lint` before pushing.
- Prefer TypeScript strictness.
- Follow the existing project structure and import paths.
- Keep UI strings in i18n dictionaries (`src/lib/locales/*.json`).
- Do not hardcode secrets, API keys, or private identifiers.

See [docs/AI_TOOLING_RULEBOOK.md](./docs/AI_TOOLING_RULEBOOK.md) for the full
engineering rules.

## Testing

- We use **Vitest** and **React Testing Library**.
- Place tests next to the code they cover: `*.test.ts` or `*.test.tsx`.
- Run all tests:
  ```bash
  npm test -- --run
  ```
- Run a single test file:
  ```bash
  npm test -- src/lib/ai/confirmation-resolver.test.ts
  ```
- New features should include corresponding tests when feasible.

## Documentation

If your change affects behavior, update the relevant source-of-truth docs in the
same PR:

- Data model or migrations → `docs/RUNBOOK_SUPABASE_MIGRATIONS.md`
- Auth, sessions, or security → `docs/SECURITY.md`
- AI providers, prompts, or fallback → `docs/ARCHITECTURE.md`,
  `docs/DEVELOPER_GUIDE.md`
- Messaging flows → `docs/MESSAGING_CHANNELS.md`
- Public API or webhooks → `docs/ARCHITECTURE.md`
- CI/CD or infrastructure → `docs/AI_TOOLING_RULEBOOK.md`,
  `.github/workflows/`

Also update `CHANGELOG.md` under the `[Unreleased]` section.

## Release Notes

The project maintains a [CHANGELOG.md](./CHANGELOG.md). Add a short entry for
user-facing changes under `[Unreleased]`.

## Getting Help

- **Documentation**: [docs/](./docs)
- **Discussions**: [GitHub Discussions](https://github.com/myfamilybutler/myfamilybutler/discussions)
- **Issues**: [GitHub Issues](https://github.com/myfamilybutler/myfamilybutler/issues)

First-time contributors are welcome. Look for issues labeled
[`good first issue`](https://github.com/myfamilybutler/myfamilybutler/labels/good%20first%20issue).

---

_Last updated: 2026-06-16_
