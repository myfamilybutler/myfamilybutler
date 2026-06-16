# AI Agents Index — Quick Reference

One-page reference for all AI agents in this project.

## The Agents

| Agent | File | Domain | When to Use |
|---|---|---|---|
| **Orchestrator** | `orchestrator.md` | Project coordination | Task spans 3+ domains |
| **Frontend** | `agents/frontend.md` | React/Next.js/UI | New page, component, hook |
| **Backend** | `agents/backend.md` | API routes, Server Actions | New endpoint, mutation |
| **Supabase** | `agents/supabase.md` | DB, RLS, migrations | Schema change, query |
| **AI Systems** | `agents/ai-systems.md` | AI providers, prompts | Model change, prompt update |
| **Messaging** | `agents/messaging.md` | WhatsApp, Telegram | Channel integration |
| **UX/UI** | `agents/uxui.md` | Design, a11y, UX | Design review, a11y audit |
| **Architecture** | `agents/architecture.md` | System design | Coupling review, refactoring |
| **Security** | `agents/security.md` | Auth, webhooks | Security review |
| **Testing** | `agents/testing.md` | Tests, QA | Test coverage |
| **DevOps** | `agents/devops.md` | CI/CD, deploy | Pipeline change |

## Shared Rules

All agents inherit from `shared-rules.md`:
- Tech stack definitions
- Quality gates (`npm run lint`, `npm run build`, `npm test -- --run`)
- File naming conventions
- Logging policy (no raw `console.*`)
- Error handling
- Security baseline
- Performance rules
- i18n rules
- Documentation gate
- Merge blocking criteria

## Quick Handoff Guide

```
Need a new dashboard widget?
→ frontend (component) → backend (data API) → testing (coverage)

Need to add WhatsApp quick replies?
→ messaging (webhook) → backend (handler) → ai-systems (parse intent)

Need to add recurring events?
→ supabase (schema) → backend (API) → frontend (UI) → ai-systems (extract)
  → testing (coverage) → architecture (review coupling)

Security incident?
→ security (assess) → backend (fix) → devops (deploy)
```

## Reading Order for New Tasks

1. `shared-rules.md` — understand baseline
2. Relevant agent file(s) — understand domain rules
3. `orchestrator.md` — if task is complex
4. `docs/INDEX.md` — for project context

---

Last updated: 2026-05-14
