# AI Tooling Rulebook

Canonical engineering policy for AI-assisted development in this repository.

## Scope

This file governs:
- code generation/edit behavior
- data integrity and concurrency rules
- migration and CI policy
- security and secret hygiene
- quality gates and documentation gate

If another project doc conflicts with this file, this file wins.

## Rule Inheritance

- Workspace baseline: `/Users/nominchuluun/dev/AI_GLOBAL_RULES.md`
- Project-specific execution policy: this file
- Conflict rule: stricter rule wins

This repository must remain self-contained. AI agents should rely on committed
project docs first (`docs/INDEX.md`), then optionally use workspace baseline.

## Canonical Ownership

- Rulebook and gates: `docs/AI_TOOLING_RULEBOOK.md`
- AI operating lifecycle: `docs/AI_OPERATING_MODEL.md`
- Runtime architecture boundaries: `docs/ARCHITECTURE.md`
- Developer patterns: `docs/DEVELOPER_GUIDE.md`
- Security controls: `docs/SECURITY.md`
- Messaging runbook: `docs/MESSAGING_CHANNELS.md`
- Migration operations runbook: `docs/RUNBOOK_SUPABASE_MIGRATIONS.md`
- Multi-role review artifact: `docs/MULTI_ROLE_REVIEW_TEMPLATE.md`

Avoid duplicating policy text across docs. Link to canonical sections.

## Always

- Keep migration SQL only in `supabase/migrations/`.
- Use unique migration versions (`YYYYMMDDHHMMSS_description.sql`).
- Use DB-enforced atomic operations for shared writes.
- Use idempotency keys/guards for retried async flows.
- Validate AI outputs with Zod before side effects.
- Verify webhook authenticity in production.
- Keep prompts centralized in AI prompt modules.
- Keep docs and implementation aligned in the same PR.

## Never

- Never use in-memory state as correctness source of truth.
- Never bypass signature checks in production paths.
- Never commit plaintext secrets or live private identifiers.
- Never merge behavior changes without doc impact review.
- Never ship CI steps that require interactive input.

## AI Delivery Policy

For all major changes, follow `docs/AI_OPERATING_MODEL.md`:
- Pass A audit
- Pass B fix
- Pass C re-audit (different role order)
- repeat until no Critical/High findings remain

Required report artifact:
- `docs/MULTI_ROLE_REVIEW_TEMPLATE.md`

## Concurrency And Data Integrity Rules

### Message ingestion
- Deduplication must be DB-backed.
- Replayed webhook payloads must be safe no-op.

### Reminder/event processing
- Use claim ownership or lock semantics for due-work execution.
- Guard concurrent event updates with conflict-safe strategy.

### Token and auth flows
- Consume one-time tokens atomically.
- Explicitly bound grace windows.
- Fail closed for security-critical checks.

## Quality Gates

Minimum required:
- `npm run lint`
- `npm run build`
- `npm test -- --run`

If schema/migration changed:
- verify migration naming rule
- verify CI workflow passes (`Supabase Migrations`)

## Migration And CI Rules

Primary runbook: `docs/RUNBOOK_SUPABASE_MIGRATIONS.md`

Required:
- new schema change => new migration file
- unique 14-digit version format
- CI uses non-interactive apply command
- no manual production SQL as normal process

## Security And Secret Hygiene

- Use placeholders in docs (`<token>`, `<project_ref>`, `<phone_id>`).
- Rotate exposed secrets immediately.
- Keep runtime secrets in environment stores (Vercel/GitHub Secrets), not files.
- Treat service-role and access tokens as high-risk credentials.

## Documentation Gate (Required)

For behavior changes in architecture/auth/security/data model/AI/CI:

- [ ] I evaluated documentation impact
- [ ] I updated impacted source-of-truth docs
- [ ] I updated `Last updated` dates
- [ ] I verified commands, model names, and file paths
- [ ] I marked planned behavior clearly as planned

## Merge Blocking Criteria

Block merge if any of the following is true:
- Critical/High finding unresolved
- migration policy violated
- CI quality gates failing
- security-sensitive behavior undocumented
- docs and implementation diverge

---

Last updated: 2026-02-08
