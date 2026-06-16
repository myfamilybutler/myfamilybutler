# AI Agents System for MyFamilyButler

This directory contains specialized AI agent configurations for the MyFamilyButler project. Each agent has a focused domain of expertise, clear boundaries, and no overlapping responsibilities.

## Agent Philosophy

- **Single Responsibility**: Each agent owns exactly one domain
- **No Duplication**: Shared rules live in `shared-rules.md`; agents reference, not copy
- **Composability**: Agents can invoke each other via the orchestrator
- **Self-Documenting**: Every agent file contains its purpose, boundaries, and handoff triggers

## Directory Structure

```
.agents/
├── README.md                 # This file
├── INDEX.md                  # Quick reference for all agents
├── shared-rules.md           # Cross-cutting rules (tech stack, testing, quality gates)
├── orchestrator.md           # Project Manager / Orchestrator agent
├── agents/
│   ├── frontend.md           # React/Next.js/UI agent
│   ├── backend.md            # API routes/Server Actions agent
│   ├── supabase.md           # Database/RLS/Migrations agent
│   ├── ai-systems.md         # AI providers/Prompts/Schemas agent
│   ├── messaging.md          # WhatsApp/Telegram/360dialog agent
│   ├── uxui.md               # Design system/Accessibility/UX agent
│   ├── architecture.md       # System design/Data flow/Coupling agent
│   ├── security.md           # Auth/Webhooks/Secrets agent
│   ├── testing.md            # Test strategy/Vitest/QA agent
│   └── devops.md             # CI/CD/Deployments/Infrastructure agent
```

## How to Use

1. **For a task**: Identify the primary domain, load that agent's rules
2. **For cross-cutting changes**: Load the orchestrator + relevant agents
3. **For new features**: Start with architecture agent, then delegate to specialists

## Agent Handoff Triggers

| When this happens... | Hand off to... |
|---|---|
| Need to add a new page/component | `frontend.md` |
| Need to add an API endpoint | `backend.md` |
| Need to change database schema | `supabase.md` |
| Need to change AI behavior | `ai-systems.md` |
| Need to change messaging flow | `messaging.md` |
| Need design review or a11y check | `uxui.md` |
| Need to evaluate system coupling | `architecture.md` |
| Need auth/security review | `security.md` |
| Need test coverage | `testing.md` |
| Need CI/CD changes | `devops.md` |
| Task spans 3+ domains | `orchestrator.md` |

---

Last updated: 2026-05-14
