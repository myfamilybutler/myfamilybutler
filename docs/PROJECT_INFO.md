# Project Info Snapshot

This document is a status snapshot, not a policy source of truth.

Policy/source docs:
- `docs/INDEX.md`
- `docs/AI_TOOLING_RULEBOOK.md`
- `docs/AI_OPERATING_MODEL.md`
- `docs/ARCHITECTURE.md`
- `docs/DEVELOPER_GUIDE.md`

## Current Stack Snapshot

- Framework: Next.js 16 (App Router)
- Backend: Supabase (Auth + Postgres)
- AI: Gemini (`gemini-3-flash-preview`) primary, OpenAI (`gpt-4o-mini`) fallback
- Channels: WhatsApp, Telegram, 360dialog
- Async jobs: Inngest
- Validation: Zod

## Current Delivery Model

- AI-assisted implementation with mandatory rulebook/gates
- Multi-role review loop required for major changes
- Schema changes handled by migration files plus GitHub Actions
- Non-interactive migration CI path enabled

## Current Operational Baseline

- Required migration workflow exists:
  - `.github/workflows/supabase-migrations.yml`
- Migration naming normalized to unique 14-digit versions
- GitHub secrets set for Supabase migration workflow

## What This File Is For

Use this file for:
- quick onboarding snapshot
- high-level project status communication

Do not use this file for:
- merge gates
- security policy
- migration policy
- role review process

---

Last updated: 2026-02-08
