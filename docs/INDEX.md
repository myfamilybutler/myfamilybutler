# Documentation Index (AI-First)

This file is the entrypoint for humans and AI agents.

## Rule Strategy

- Global rules (`/Users/nominchuluun/dev/AI_GLOBAL_RULES.md`) are a cross-project baseline.
- Project rules in this repository are the execution source of truth.
- Conflict policy: stricter rule wins.

Why this split:
- Global rules keep consistency across repositories.
- Project rules keep local reality accurate.
- AI agents need local, repository-committed rules to avoid parent-folder coupling.

## Required Reading Order For AI Agents

1. `docs/INDEX.md`
2. `docs/AI_TOOLING_RULEBOOK.md`
3. `docs/AI_OPERATING_MODEL.md`
4. `docs/ARCHITECTURE.md`
5. `docs/DEVELOPER_GUIDE.md`
6. Domain docs only if task requires them:
- `docs/MESSAGING_CHANNELS.md`
- `docs/SECURITY.md`
- `docs/ONBOARDING.md`
- `docs/WHATSAPP_SETUP.md`

## Source Of Truth Map

| Doc | Purpose | Source Of Truth |
| --- | --- | --- |
| `docs/AI_TOOLING_RULEBOOK.md` | Hard engineering rules, gates, migration policy | Yes |
| `docs/AI_OPERATING_MODEL.md` | AI-only delivery lifecycle and role loop | Yes |
| `docs/MULTI_ROLE_REVIEW_TEMPLATE.md` | Mandatory report format for major changes | Yes |
| `docs/ARCHITECTURE.md` | Runtime boundaries, data flow, ownership map | Yes |
| `docs/DEVELOPER_GUIDE.md` | Implementation patterns and commands | Yes |
| `docs/SECURITY.md` | Security controls and incident process | Yes |
| `docs/MESSAGING_CHANNELS.md` | Channel setup and behavior | Yes |
| `docs/PROJECT_INFO.md` | Snapshot/status summary | No |
| `docs/ONBOARDING.md` | Product design notes and rollout plan | No (Design/Planned) |
| `docs/WHATSAPP_SETUP.md` | Provider-specific setup runbook | No (Operational snapshot) |

## Documentation Update Policy

When behavior changes in:
- data model/migrations
- auth/session/security
- AI provider/prompt/fallback behavior
- public API/webhook flows
- infrastructure/CI workflows

You must update the corresponding source-of-truth docs in the same change.

## Documentation Quality Rules

- Prefer one canonical rule location per topic.
- Cross-link instead of duplicating policy text.
- Use exact file paths and exact command literals.
- Mark planned behavior as planned.
- Keep placeholders for sensitive values.

---

Last updated: 2026-02-08
