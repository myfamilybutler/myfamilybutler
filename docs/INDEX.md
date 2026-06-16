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
2. `.agents/README.md` — AI agent system overview and coordination rules
3. `.agents/INDEX.md` — Quick reference for all specialized agents
4. `docs/AI_TOOLING_RULEBOOK.md`
5. `docs/AI_OPERATING_MODEL.md`
6. `docs/ARCHITECTURE.md`
7. `docs/DEVELOPER_GUIDE.md`
8. Domain docs only if task requires them:
   - `docs/MESSAGING_CHANNELS.md`
   - `docs/SECURITY.md`
   - `docs/ONBOARDING.md`
   - `docs/WHATSAPP_SETUP.md`
   - `docs/TROUBLESHOOTING.md`
   - `docs/ROADMAP.md`
9. Agent-specific rules (when working in a domain):
   - `.agents/agents/frontend.md`
   - `.agents/agents/backend.md`
   - `.agents/agents/supabase.md`
   - `.agents/agents/ai-systems.md`
   - `.agents/agents/messaging.md`
   - `.agents/agents/uxui.md`
   - `.agents/agents/architecture.md`
   - `.agents/agents/security.md`
   - `.agents/agents/testing.md`
   - `.agents/agents/devops.md`

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
| `docs/TROUBLESHOOTING.md` | Common problems and resolutions | No |
| `docs/ROADMAP.md` | Planned features and priorities | No |
| `CHANGELOG.md` | Release history | No |

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

Last updated: 2026-06-16
